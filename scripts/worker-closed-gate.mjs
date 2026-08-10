import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CLOSED_GATE_RETRY_INTERVAL_MS = 5_000;
export const CLOSED_GATE_WINDOW_MS = 60_000;
export const PUBLIC_WORKER_WINDOW_MS = 20 * 60_000;
export const EXPECTED_STATUS = 404;
export const EXPECTED_CACHE_CONTROL = "private, no-store";
export const EXPECTED_HSTS = "max-age=31536000; includeSubDomains";
export const EXPECTED_BODY = JSON.stringify({ message: "Recurso indisponível." });
export const EXPECTED_BODY_BYTES = new TextEncoder().encode(EXPECTED_BODY).byteLength;
export const EXPECTED_BODY_SHA256 = sha256(EXPECTED_BODY);

const CLOSED_PATHS = [
  { label: "missing-route", pathname: "/rota-inexistente-marco-6-3b" },
  { label: "favicon", pathname: "/favicon.svg" },
];

const TRANSIENT_DNS_CODES = new Set(["EAI_AGAIN", "ENOTFOUND"]);
const TRANSIENT_CONNECTION_CODES = new Set([
  "ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET",
]);
const TRANSIENT_TLS_CODES = new Set([
  "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "ERR_SSL_PROTOCOL_ERROR",
  "ERR_TLS_CERT_ALTNAME_INVALID", "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
]);

export function classifyClosedGatePair(pair) {
  if (!Array.isArray(pair) || pair.length !== 2) {
    return { state: "blocker", reason: "incomplete-pair", identical: false };
  }
  const individual = pair.map(classifyClosedGateObservation);
  if (individual.some((result) => result.state === "blocker")) {
    return { state: "blocker", reason: "blocking-observation", identical: false };
  }
  if (individual.some((result) => result.state === "transient")) {
    return { state: "transient", reason: "transient-observation", identical: false };
  }
  const identical = responsesAreIdentical(pair[0], pair[1]);
  return identical
    ? { state: "approved", reason: "closed-response-confirmed", identical: true }
    : { state: "blocker", reason: "responses-differ", identical: false };
}

export function classifyClosedGateObservation(observation) {
  if (observation.transportError) {
    return observation.transportError.transient
      ? { state: "transient", reason: observation.transportError.kind }
      : { state: "blocker", reason: "unexpected-transport-error" };
  }
  if (observation.status === 523) return { state: "transient", reason: "http-523" };
  if (observation.status !== EXPECTED_STATUS) {
    return { state: "blocker", reason: "unexpected-status" };
  }
  if (
    observation.bodyBytes !== EXPECTED_BODY_BYTES ||
    observation.bodySha256 !== EXPECTED_BODY_SHA256
  ) {
    return { state: "blocker", reason: "unexpected-body" };
  }
  if (normalizeHeaderValue(observation.cacheControl) !== EXPECTED_CACHE_CONTROL) {
    return { state: "blocker", reason: "unexpected-cache-control" };
  }
  if (!observation.hstsPresent) return { state: "blocker", reason: "missing-hsts" };
  return { state: "approved", reason: "expected-closed-response" };
}

export function assertActiveDeployment(controlPlane, expectedVersionId) {
  if (!controlPlane || !Array.isArray(controlPlane.versions)) {
    throw new ClosedGateBlockedError("deployment-status-invalid");
  }
  if (
    controlPlane.versions.length !== 1 ||
    controlPlane.versions[0]?.version_id !== expectedVersionId ||
    Number(controlPlane.versions[0]?.percentage) !== 100
  ) {
    throw new ClosedGateBlockedError("deployment-not-active-at-100-percent");
  }
  return true;
}

export function assertIsolatedWorkersDevOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new ClosedGateBlockedError("worker-origin-invalid");
  }
  if (
    origin.protocol !== "https:" ||
    !origin.hostname.endsWith(".workers.dev") ||
    origin.hostname === "workers.dev" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new ClosedGateBlockedError("worker-origin-not-isolated-workers-dev");
  }
  return origin.origin;
}

export async function executeClosedGate(options) {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((delay) => new Promise((done) => setTimeout(done, delay)));
  const fetchImpl = options.fetchImpl ?? fetch;
  const record = options.record ?? (() => {});
  const deployedAtMs = Number(options.deployedAtMs);
  const closedDeadlineMs = deployedAtMs + CLOSED_GATE_WINDOW_MS;
  const publicDeadlineMs = deployedAtMs + PUBLIC_WORKER_WINDOW_MS;
  const origin = assertIsolatedWorkersDevOrigin(options.origin);

  if (!Number.isSafeInteger(deployedAtMs) || deployedAtMs <= 0) {
    throw new ClosedGateBlockedError("deployment-time-invalid");
  }
  if (options.accessSecretPresent) {
    throw new ClosedGateBlockedError("access-secret-must-be-absent");
  }
  if (now() > Math.min(closedDeadlineMs, publicDeadlineMs)) {
    throw new ClosedGateBlockedError("closed-gate-window-expired");
  }

  const controlPlane = await options.readControlPlane();
  assertActiveDeployment(controlPlane, options.expectedVersionId);

  let attempt = 0;
  while (true) {
    if (now() > Math.min(closedDeadlineMs, publicDeadlineMs)) {
      return { state: "transient", reason: "closed-gate-window-expired", attempts: attempt };
    }
    attempt += 1;
    const observations = await Promise.all(CLOSED_PATHS.map((target) =>
      observeClosedURL({ fetchImpl, origin, target, attempt }),
    ));
    const classification = classifyClosedGatePair(observations);
    record({ attempt, classification, observations: observations.map(publicObservation) });
    if (classification.state !== "transient") {
      return { ...classification, attempts: attempt, observations };
    }
    if (now() + CLOSED_GATE_RETRY_INTERVAL_MS > closedDeadlineMs) {
      return { ...classification, attempts: attempt, observations };
    }
    await sleep(CLOSED_GATE_RETRY_INTERVAL_MS);
  }
}

export async function observeClosedURL({ fetchImpl, origin, target, attempt }) {
  const url = new URL(target.pathname, origin);
  url.searchParams.set("feita_closed_gate", `${attempt}-${randomUUID()}`);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
        "User-Agent": "Feita-Marco-6.3B-Closed-Gate",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(CLOSED_GATE_RETRY_INTERVAL_MS),
    });
    const body = new Uint8Array(await response.arrayBuffer());
    const cacheControl = response.headers.get("cache-control");
    const hsts = response.headers.get("strict-transport-security");
    return {
      label: target.label,
      status: response.status,
      bodyBytes: body.byteLength,
      bodySha256: sha256(body),
      cacheControl,
      cacheControlExpected: normalizeHeaderValue(cacheControl) === EXPECTED_CACHE_CONTROL,
      hsts,
      hstsPresent: Boolean(hsts),
    };
  } catch (error) {
    return { label: target.label, transportError: classifyTransportError(error) };
  }
}

export function classifyTransportError(error) {
  const code = transportErrorCode(error);
  if (error?.name === "TimeoutError") {
    return { kind: "connection", code: "ETIMEDOUT", transient: true };
  }
  if (TRANSIENT_DNS_CODES.has(code)) return { kind: "dns", code, transient: true };
  if (TRANSIENT_CONNECTION_CODES.has(code)) return { kind: "connection", code, transient: true };
  if (TRANSIENT_TLS_CODES.has(code)) return { kind: "tls", code, transient: true };
  return { kind: "other", code: code || "UNKNOWN", transient: false };
}

export function publicObservation(observation) {
  if (observation.transportError) {
    return { label: observation.label, transportError: observation.transportError };
  }
  return {
    label: observation.label,
    status: observation.status,
    bodyBytes: observation.bodyBytes,
    bodySha256: observation.bodySha256,
    cacheControl: observation.cacheControl,
    cacheControlExpected: observation.cacheControlExpected,
    hsts: observation.hsts,
    hstsPresent: observation.hstsPresent,
  };
}

function responsesAreIdentical(left, right) {
  return left.status === right.status &&
    left.bodyBytes === right.bodyBytes &&
    left.bodySha256 === right.bodySha256 &&
    normalizeHeaderValue(left.cacheControl) === normalizeHeaderValue(right.cacheControl) &&
    left.hsts === right.hsts;
}

function normalizeHeaderValue(value) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function transportErrorCode(error) {
  for (const candidate of [error, error?.cause, error?.cause?.cause]) {
    if (typeof candidate?.code === "string") return candidate.code;
  }
  return "";
}

function readWranglerDeploymentStatus(workerName) {
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(
    process.execPath,
    [wrangler, "deployments", "status", "--name", workerName, "--json"],
    { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) throw new ClosedGateBlockedError("deployment-status-unavailable");
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new ClosedGateBlockedError("deployment-status-invalid-json");
  }
}

export class ClosedGateBlockedError extends Error {
  constructor(code) {
    super(code);
    this.name = "ClosedGateBlockedError";
    this.code = code;
  }
}

async function main() {
  const origin = requiredEnvironment("MARCO_6_3B_WORKER_ORIGIN");
  const workerName = requiredEnvironment("MARCO_6_3B_WORKER_NAME");
  const expectedVersionId = requiredEnvironment("MARCO_6_3B_EXPECTED_VERSION_ID");
  const deployedAtMs = Number(requiredEnvironment("MARCO_6_3B_FIRST_DEPLOYED_AT_MS"));
  const attempts = [];
  try {
    const result = await executeClosedGate({
      origin,
      expectedVersionId,
      deployedAtMs,
      accessSecretPresent: Boolean(process.env.MARCO_6_3B_ACCESS_SECRET),
      readControlPlane: async () => readWranglerDeploymentStatus(workerName),
      record: (attemptResult) => attempts.push(attemptResult),
    });
    console.log(JSON.stringify({ state: result.state, reason: result.reason, attempts }, null, 2));
    process.exitCode = result.state === "approved" ? 0 : 2;
  } catch (error) {
    const reason = error instanceof ClosedGateBlockedError ? error.code : "executor-failure";
    console.log(JSON.stringify({ state: "blocker", reason, attempts }, null, 2));
    process.exitCode = 2;
  }
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new ClosedGateBlockedError(`missing-${name.toLowerCase()}`);
  return value;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

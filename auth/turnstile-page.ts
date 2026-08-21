import { getWorkerEnvironment } from "@/db";
import { headers } from "next/headers";
import {
  isLocalTurnstileURL,
  LOCAL_TURNSTILE_SITE_KEY,
  resolveTurnstileConfiguration,
  type TurnstileEnvironment,
} from "./turnstile";

export async function turnstileSiteKeyForPage(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:5173";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const requestURL = `${protocol}://${host}`;
  if (isLocalTurnstileURL(requestURL)) return LOCAL_TURNSTILE_SITE_KEY;

  const environment = (await getWorkerEnvironment()) as TurnstileEnvironment;

  return resolveTurnstileConfiguration(
    environment,
    requestURL,
  ).siteKey;
}

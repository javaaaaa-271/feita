import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { openLocalBindings } from "../scripts/local-bindings.mjs";
import {
  guardMarco63BRequest,
  MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES,
  MARCO_6_3B_MAX_UPLOAD_ATTEMPTS,
  MARCO_6_3B_MAX_UPLOAD_BYTES,
  MARCO_6_3B_SECRET_HEADER,
  reserveMarco63BUpload,
} from "../worker/marco-6-3b-guard";

const wranglerExecutable = resolve("node_modules/wrangler/bin/wrangler.js");
const trialSecret = "local-worker-trial-guard-secret-2026";
const uploadURL =
  "https://trial.example.test/api/painel/stores/store-a/products/product-a/image";

if (typeof crypto.subtle.timingSafeEqual !== "function") {
  Object.defineProperty(crypto.subtle, "timingSafeEqual", {
    configurable: true,
    value(left: BufferSource, right: BufferSource) {
      return timingSafeEqual(asBytes(left), asBytes(right));
    },
  });
}

function asBytes(value: BufferSource): Uint8Array<ArrayBuffer> {
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
    );
  }
  return new Uint8Array(value.slice(0));
}

function migrate(persistPath: string) {
  const result = spawnSync(
    process.execPath,
    [
      wranglerExecutable,
      "d1",
      "migrations",
      "apply",
      "feita-local",
      "--local",
      "--persist-to",
      persistPath,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

function request(body = new Uint8Array([1, 2, 3]), suppliedSecret = trialSecret) {
  return new Request(uploadURL, {
    method: "PUT",
    headers: { [MARCO_6_3B_SECRET_HEADER]: suppliedSecret },
    body,
  });
}

function fakeDatabase(result: object | null, calls: { prepare: number; binds: unknown[] }) {
  return {
    prepare() {
      calls.prepare += 1;
      const statement = {
        bind(...values: unknown[]) {
          calls.binds = values;
          return statement;
        },
        async first() {
          return result;
        },
      };
      return statement;
    },
  } as unknown as D1Database;
}

test("barreira do Marco 6.3B falha fechada antes do D1", async () => {
  for (const [configuredSecret, suppliedSecret] of [
    [trialSecret, undefined],
    [trialSecret, "segredo-incorreto"],
    [undefined, trialSecret],
  ] as const) {
    let databaseAccesses = 0;
    const environment = {
      MARCO_6_3B_ACCESS_SECRET: configuredSecret,
      get DB(): D1Database {
        databaseAccesses += 1;
        throw new Error("DB não deveria ser acessado");
      },
    };
    const guarded = await guardMarco63BRequest(
      new Request("https://trial.example.test/", {
        headers: suppliedSecret
          ? { [MARCO_6_3B_SECRET_HEADER]: suppliedSecret }
          : undefined,
      }),
      environment,
    );

    assert.equal(guarded.response?.status, 404);
    assert.equal(databaseAccesses, 0);
    assert.equal(guarded.response?.headers.get("cache-control"), "private, no-store");
  }
});

test("desenvolvimento local sem secret libera apenas endereços de loopback", async () => {
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    let databaseAccesses = 0;
    const original = new Request(`http://${hostname}:5173/`, {
      headers: { [MARCO_6_3B_SECRET_HEADER]: "não-deve-ser-repassado" },
    });
    const guarded = await guardMarco63BRequest(original, {
      get DB(): D1Database {
        databaseAccesses += 1;
        throw new Error("DB não deveria ser acessado");
      },
    });

    assert.equal(guarded.response, undefined);
    assert.equal(guarded.request?.headers.get(MARCO_6_3B_SECRET_HEADER), null);
    assert.equal(databaseAccesses, 0);
  }
});

test("loopback continua protegido quando o secret do ensaio está configurado", async () => {
  const guarded = await guardMarco63BRequest(
    new Request("http://localhost:5173/"),
    {
      MARCO_6_3B_ACCESS_SECRET: trialSecret,
      DB: {} as D1Database,
    },
  );

  assert.equal(guarded.response?.status, 404);
});

test("segredo correto libera rota comum sem consultar o D1 nem repassar o segredo", async () => {
  let databaseAccesses = 0;
  const original = new Request("https://trial.example.test/", {
    headers: { [MARCO_6_3B_SECRET_HEADER]: trialSecret },
  });
  const guarded = await guardMarco63BRequest(original, {
    MARCO_6_3B_ACCESS_SECRET: trialSecret,
    get DB(): D1Database {
      databaseAccesses += 1;
      throw new Error("DB não deveria ser acessado");
    },
  });

  assert.notEqual(guarded.request, original);
  assert.equal(guarded.request?.headers.get(MARCO_6_3B_SECRET_HEADER), null);
  assert.equal(databaseAccesses, 0);
});

test("upload individual acima de 8 MiB é recusado antes do D1", async () => {
  const declaredOversized = request(new Uint8Array([1]));
  declaredOversized.headers.set(
    "content-length",
    String(MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES + 1),
  );
  const actualOversized = request(
    new Uint8Array(MARCO_6_3B_MAX_SINGLE_UPLOAD_BYTES + 1),
  );

  for (const oversized of [declaredOversized, actualOversized]) {
    let databaseAccesses = 0;
    const guarded = await guardMarco63BRequest(oversized, {
      MARCO_6_3B_ACCESS_SECRET: trialSecret,
      get DB(): D1Database {
        databaseAccesses += 1;
        throw new Error("DB não deveria ser acessado");
      },
    });

    assert.equal(guarded.response?.status, 413);
    assert.equal(databaseAccesses, 0);
  }
});

test("stream acima de 8 MiB é cancelado cedo sem alcançar bindings", async () => {
  const accesses = { ASSETS: 0, DB: 0, STORE_IMAGES: 0, IMAGES: 0 };
  const chunk = new Uint8Array(3 * 1024 * 1024);
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls <= 8) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() {
      cancelled = true;
    },
  });
  const environment = {
    MARCO_6_3B_ACCESS_SECRET: trialSecret,
    get ASSETS() {
      accesses.ASSETS += 1;
      throw new Error("ASSETS não deveria ser acessado");
    },
    get DB(): D1Database {
      accesses.DB += 1;
      throw new Error("DB não deveria ser acessado");
    },
    get STORE_IMAGES() {
      accesses.STORE_IMAGES += 1;
      throw new Error("R2 não deveria ser acessado");
    },
    get IMAGES() {
      accesses.IMAGES += 1;
      throw new Error("Images não deveria ser acessado");
    },
  };
  const streamedRequest = new Request(uploadURL, {
    method: "PUT",
    headers: { [MARCO_6_3B_SECRET_HEADER]: trialSecret },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const guarded = await guardMarco63BRequest(streamedRequest, environment);

  assert.equal(guarded.response?.status, 413);
  assert.equal(cancelled, true);
  assert.ok(pulls < 8, `o stream solicitou ${pulls} chunks antes do cancelamento`);
  assert.deepEqual(accesses, { ASSETS: 0, DB: 0, STORE_IMAGES: 0, IMAGES: 0 });
});

test("upload permitido reserva o tamanho real e preserva o corpo", async () => {
  const calls = { prepare: 0, binds: [] as unknown[] };
  const originalBytes = new Uint8Array([4, 5, 6, 7]);
  const original = request(originalBytes);
  original.headers.set("content-length", "1");
  const guarded = await guardMarco63BRequest(original, {
    MARCO_6_3B_ACCESS_SECRET: trialSecret,
    DB: fakeDatabase({ upload_attempts: 1, upload_bytes: 4 }, calls),
  });

  assert.equal(calls.prepare, 1);
  assert.equal(calls.binds[1], originalBytes.byteLength);
  assert.equal(guarded.request?.headers.get("content-length"), "4");
  assert.equal(guarded.request?.headers.get(MARCO_6_3B_SECRET_HEADER), null);
  assert.deepEqual(
    new Uint8Array(await guarded.request?.arrayBuffer()),
    originalBytes,
  );
});

test("reserva negada encerra o upload depois de uma única operação atômica", async () => {
  const calls = { prepare: 0, binds: [] as unknown[] };
  const guarded = await guardMarco63BRequest(request(), {
    MARCO_6_3B_ACCESS_SECRET: trialSecret,
    DB: fakeDatabase(null, calls),
  });

  assert.equal(guarded.response?.status, 429);
  assert.equal(calls.prepare, 1);
});

test("limites de 25 tentativas e 200 MiB são atômicos no D1 local", async () => {
  const directory = await mkdtemp(join(tmpdir(), "feita-trial-budget-d1-"));
  migrate(directory);
  const platform = await openLocalBindings(join(directory, "v3"));
  const database = platform.database as unknown as D1Database;

  try {
    const reservations = await Promise.all(
      Array.from({ length: 40 }, () => reserveMarco63BUpload(database, 1, 1)),
    );
    assert.equal(reservations.filter(Boolean).length, MARCO_6_3B_MAX_UPLOAD_ATTEMPTS);
    assert.deepEqual(
      await database
        .prepare(
          "SELECT upload_attempts, upload_bytes FROM marco_6_3b_upload_budget WHERE scope = 'marco-6-3b'",
        )
        .first(),
      {
        upload_attempts: MARCO_6_3B_MAX_UPLOAD_ATTEMPTS,
        upload_bytes: MARCO_6_3B_MAX_UPLOAD_ATTEMPTS,
      },
    );

    await database
      .prepare(
        `UPDATE marco_6_3b_upload_budget
         SET upload_attempts = 1, upload_bytes = ?1
         WHERE scope = 'marco-6-3b'`,
      )
      .bind(MARCO_6_3B_MAX_UPLOAD_BYTES - 1)
      .run();
    assert.equal(await reserveMarco63BUpload(database, 2, 2), false);
    assert.deepEqual(
      await database
        .prepare(
          "SELECT upload_attempts, upload_bytes FROM marco_6_3b_upload_budget WHERE scope = 'marco-6-3b'",
        )
        .first(),
      {
        upload_attempts: 1,
        upload_bytes: MARCO_6_3B_MAX_UPLOAD_BYTES - 1,
      },
    );
  } finally {
    await platform.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_INVITATION_BODY_BYTES,
  POST,
  readJsonObjectBody,
} from "../app/api/invitations/accept/route";

test("convite aceita JSON de objeto até o limite exato", async () => {
  const prefix = '{"value":"';
  const suffix = '"}';
  const body = `${prefix}${"x".repeat(MAX_INVITATION_BODY_BYTES - prefix.length - suffix.length)}${suffix}`;
  assert.equal(new TextEncoder().encode(body).byteLength, MAX_INVITATION_BODY_BYTES);

  const result = await readJsonObjectBody(
    new Request("https://feita.example/api/invitations/accept", {
      method: "POST",
      body,
    }),
  );

  assert.deepEqual(result, { ok: true, value: { value: "x".repeat(MAX_INVITATION_BODY_BYTES - prefix.length - suffix.length) } });
});

test("convite limita o stream mesmo sem Content-Length e cancela após exceder", async () => {
  let cancelled = false;
  const request = new Request("https://feita.example/api/invitations/accept", {
    method: "POST",
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_INVITATION_BODY_BYTES));
        controller.enqueue(new Uint8Array([0]));
      },
      cancel() {
        cancelled = true;
      },
    }),
    // Node requires duplex for streaming request bodies.
    duplex: "half",
    } as RequestInit & { duplex: "half" });

  const result = await readJsonObjectBody(request);

  assert.deepEqual(result, { ok: false, status: 413 });
  assert.equal(cancelled, true);

  assert.deepEqual(
    await readJsonObjectBody(
      new Request("https://feita.example/api/invitations/accept", {
        method: "POST",
        headers: { "content-length": "1" },
        body: "x".repeat(MAX_INVITATION_BODY_BYTES + 1),
      }),
    ),
    { ok: false, status: 413 },
  );
});

test("convite rejeita Content-Length inválido ou acima do limite antes de ler", async () => {
  for (const contentLength of ["NaN", "-1", String(MAX_INVITATION_BODY_BYTES + 1)]) {
    const request = new Request("https://feita.example/api/invitations/accept", {
      method: "POST",
      headers: { "content-length": contentLength },
      body: new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new TextEncoder().encode("{}"));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    assert.deepEqual(await readJsonObjectBody(request), { ok: false, status: 413 });
    assert.equal(request.bodyUsed, false);
  }
});

test("convite exige JSON UTF-8 válido cujo valor raiz seja objeto", async () => {
  for (const body of ["", "{", "null", "[]", "1", '"texto"']) {
    assert.deepEqual(
      await readJsonObjectBody(
        new Request("https://feita.example/api/invitations/accept", {
          method: "POST",
          body,
        }),
      ),
      { ok: false, status: 400 },
    );
  }

  assert.deepEqual(
    await readJsonObjectBody(
      new Request("https://feita.example/api/invitations/accept", {
        method: "POST",
        body: new Uint8Array([0xc3, 0x28]),
      }),
    ),
    { ok: false, status: 400 },
  );
});

test("rota de convite responde 400 ou 413 antes de acessar bindings", async () => {
  const badJson = await POST(
    new Request("https://feita.example/api/invitations/accept", {
      method: "POST",
      body: "{",
    }),
  );
  const tooLarge = await POST(
    new Request("https://feita.example/api/invitations/accept", {
      method: "POST",
      body: "x".repeat(MAX_INVITATION_BODY_BYTES + 1),
    }),
  );

  assert.equal(badJson.status, 400);
  assert.equal(tooLarge.status, 413);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  generateFixtures,
  METADATA_MARKER,
} from "../spikes/images-binding/generate-fixtures.mjs";
import {
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  dimensionsWithinLimits,
  hasWebPSignature,
  inspectImageStructure,
  isAcceptedStaticRaster,
} from "../spikes/images-binding/src/inspection";
import worker, {
  readLimitedStream,
} from "../spikes/images-binding/src/worker";

const fakeWebP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);

function fakeImages(options: {
  info?: { format: string; fileSize: number; width: number; height: number };
  output?: Uint8Array;
} = {}) {
  let infoCalls = 0;
  let inputCalls = 0;
  return {
    binding: {
      async info() {
        infoCalls += 1;
        return options.info ?? {
          format: "image/jpeg",
          fileSize: 100,
          width: 64,
          height: 40,
        };
      },
      input() {
        inputCalls += 1;
        return {
          transform() {
            return {
              async output() {
                return {
                  response: () =>
                    new Response((options.output ?? fakeWebP).slice().buffer, {
                      headers: { "content-type": "image/webp" },
                    }),
                };
              },
            };
          },
        };
      },
    },
    calls: () => ({ infoCalls, inputCalls }),
  };
}

test("spike reconhece assinaturas reais e animações estruturais", async () => {
  const fixtures = new Map((await generateFixtures()).map((fixture) => [fixture.name, fixture]));
  for (const name of ["static-jpeg", "static-png", "static-webp"]) {
    const inspection = inspectImageStructure(fixtures.get(name)!.bytes);
    assert.equal(isAcceptedStaticRaster(inspection), true, name);
  }
  assert.deepEqual(inspectImageStructure(fixtures.get("animated-gif")!.bytes), {
    kind: "gif",
    animated: true,
    truncated: false,
  });
  assert.equal(inspectImageStructure(fixtures.get("animated-webp")!.bytes).animated, true);
  assert.equal(inspectImageStructure(fixtures.get("apng")!.bytes).animated, true);
  assert.equal(inspectImageStructure(fixtures.get("svg")!.bytes).kind, "svg");
  assert.equal(inspectImageStructure(fixtures.get("truncated")!.bytes).truncated, true);
  assert.equal(inspectImageStructure(fixtures.get("fake-image")!.bytes).kind, "unknown");
  assert.equal(
    fixtures.get("synthetic-metadata")!.bytes.includes(Buffer.from(METADATA_MARKER)),
    true,
  );
});

test("limites candidatos recusam bytes, dimensões e pixels excessivos", async () => {
  const oversized = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_INPUT_BYTES));
      controller.enqueue(new Uint8Array(1));
      controller.close();
    },
  });
  await assert.rejects(() => readLimitedStream(oversized, MAX_INPUT_BYTES));
  assert.equal(dimensionsWithinLimits(4096, 3906), true);
  assert.equal(dimensionsWithinLimits(4096, 4096), false);
  assert.equal(dimensionsWithinLimits(4097, 1), false);
  assert.equal(MAX_OUTPUT_BYTES, 4 * 1024 * 1024);
});

test("limites de entrada, pixels e saída falham fechados", async () => {
  const jpeg = (await generateFixtures()).find(({ name }) => name === "static-jpeg")!;

  const declaredTooLarge = fakeImages();
  const declaredResponse = await worker.fetch(
    new Request("http://spike.test/transform", {
      method: "POST",
      headers: { "content-length": String(MAX_INPUT_BYTES + 1) },
      body: jpeg.bytes,
    }),
    { IMAGES: declaredTooLarge.binding },
  );
  assert.equal(declaredResponse.status, 413);
  assert.deepEqual(declaredTooLarge.calls(), { infoCalls: 0, inputCalls: 0 });

  const tooManyPixels = fakeImages({
    info: {
      format: "image/jpeg",
      fileSize: jpeg.bytes.byteLength,
      width: 4096,
      height: 4096,
    },
  });
  const pixelsResponse = await worker.fetch(
    new Request("http://spike.test/transform", {
      method: "POST",
      body: jpeg.bytes,
    }),
    { IMAGES: tooManyPixels.binding },
  );
  assert.equal(pixelsResponse.status, 400);
  assert.deepEqual(tooManyPixels.calls(), { infoCalls: 1, inputCalls: 0 });

  const tooLargeOutput = fakeImages({
    output: new Uint8Array(MAX_OUTPUT_BYTES + 1),
  });
  const outputResponse = await worker.fetch(
    new Request("http://spike.test/transform", {
      method: "POST",
      body: jpeg.bytes,
    }),
    { IMAGES: tooLargeOutput.binding },
  );
  assert.equal(outputResponse.status, 413);
  assert.deepEqual(tooLargeOutput.calls(), { infoCalls: 1, inputCalls: 1 });
  assert.deepEqual(await outputResponse.json(), {
    ok: false,
    error: "Imagem rejeitada.",
  });
});

test("Content-Type declarado não decide o formato real", async () => {
  const jpeg = (await generateFixtures()).find(({ name }) => name === "static-jpeg")!;
  const images = fakeImages();
  const response = await worker.fetch(
    new Request("http://spike.test/transform", {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: jpeg.bytes,
    }),
    { IMAGES: images.binding },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(hasWebPSignature(new Uint8Array(await response.arrayBuffer())), true);
  assert.deepEqual(images.calls(), { infoCalls: 1, inputCalls: 1 });
});

test("rejeição preliminar não chama o Images binding e usa resposta genérica", async () => {
  const fixtures = new Map((await generateFixtures()).map((fixture) => [fixture.name, fixture]));
  const bodies: string[] = [];
  for (const name of ["svg", "animated-gif", "animated-webp", "apng", "truncated", "fake-image"]) {
    const images = fakeImages();
    const response = await worker.fetch(
      new Request("http://spike.test/transform", {
        method: "POST",
        body: fixtures.get(name)!.bytes,
      }),
      { IMAGES: images.binding },
    );
    assert.equal(response.status, 400, name);
    bodies.push(await response.text());
    assert.deepEqual(images.calls(), { infoCalls: 0, inputCalls: 0 }, name);
  }
  assert.equal(new Set(bodies).size, 1);
  assert.doesNotMatch(bodies[0], /svg|gif|webp|png|assinatura|frame/i);
});

test("configurações do spike contêm somente o binding Images", async () => {
  for (const file of ["wrangler.jsonc", "wrangler.remote-binding.jsonc"]) {
    const source = await readFile(resolve("spikes/images-binding", file), "utf8");
    assert.match(source, /"images"/);
    assert.match(source, /"binding": "IMAGES"/);
    assert.doesNotMatch(source, /d1_databases|r2_buckets|assets|secret|route|domain/i);
  }
});

test("Worker principal não importa nem empacota o spike", async () => {
  const productionSources = [
    await readFile(resolve("worker/index.ts"), "utf8"),
    await readFile(resolve("vite.config.ts"), "utf8"),
    await readFile(resolve("dist/server/index.js"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(productionSources, /spikes[\\/]images-binding/);
  assert.doesNotMatch(productionSources, /feita-images-binding-spike/);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrderMessage,
  buildWhatsAppUrl,
  formatMoney,
  isProductAvailable,
} from "../app/order.mjs";

const simpleItem = {
  productName: "Caderno Jardim",
  variation: "",
  quantity: 1,
  unitPrice: 54,
};

test("formats reais with cents and Brazilian separators", () => {
  assert.equal(formatMoney(54), "R$ 54,00");
  assert.equal(formatMoney(1234.56), "R$ 1.234,56");
});

test("builds a clear pickup order with one item", () => {
  const message = buildOrderMessage({
    items: [simpleItem],
    customerName: "Ana",
    fulfillment: "pickup",
    payment: "Pix",
  });

  assert.match(message, /Cliente: Ana/);
  assert.match(message, /• 1x Caderno Jardim/);
  assert.match(message, /R\$\s54,00 cada · R\$\s54,00/);
  assert.match(message, /\*Total: R\$\s54,00\*/);
  assert.match(message, /Recebimento: Retirada/);
  assert.match(message, /Pagamento: Pix/);
  assert.doesNotMatch(message, /Endereço:/);
});

test("includes quantities, variations, delivery address and notes", () => {
  const message = buildOrderMessage({
    items: [
      { ...simpleItem, variation: "Capa azul", quantity: 2 },
      {
        productName: "Cartão Presente",
        variation: "",
        quantity: 3,
        unitPrice: 18.5,
      },
    ],
    customerName: "  Júlia   D'Ávila  ",
    fulfillment: "delivery",
    address: " Quadra 10, Rua São João, nº 25 ",
    payment: "Cartão na entrega",
    notes: "Sem plástico.\n  Tocar a campainha, por favor. ",
  });

  assert.match(message, /Cliente: Júlia D'Ávila/);
  assert.match(message, /2x Caderno Jardim — Capa azul/);
  assert.match(message, /3x Cartão Presente/);
  assert.match(message, /\*Total: R\$\s163,50\*/);
  assert.match(message, /Recebimento: Entrega/);
  assert.match(message, /Endereço: Quadra 10, Rua São João, nº 25/);
  assert.match(message, /Sem plástico\.\nTocar a campainha, por favor\./);
});

test("rejects empty carts and missing required checkout data", () => {
  assert.throws(
    () =>
      buildOrderMessage({
        items: [],
        customerName: "Ana",
        fulfillment: "pickup",
        payment: "Pix",
      }),
    /pelo menos um item/,
  );
  assert.throws(
    () =>
      buildOrderMessage({
        items: [simpleItem],
        customerName: "",
        fulfillment: "pickup",
        payment: "Pix",
      }),
    /nome da cliente/,
  );
  assert.throws(
    () =>
      buildOrderMessage({
        items: [simpleItem],
        customerName: "Ana",
        fulfillment: "delivery",
        address: "",
        payment: "Pix",
      }),
    /endereço de entrega/,
  );
  assert.throws(
    () =>
      buildOrderMessage({
        items: [simpleItem],
        customerName: "Ana",
        fulfillment: "pickup",
        payment: "",
      }),
    /forma de pagamento/,
  );
});

test("encodes accents, spaces, line breaks and special characters for WhatsApp", () => {
  const message = "Olá! Pedido #1\nCaderno & cartão — R$ 72,50";
  const url = buildWhatsAppUrl(message);
  const parsed = new URL(url);

  assert.equal(parsed.origin, "https://wa.me");
  assert.equal(parsed.searchParams.get("text"), message);
  assert.match(url, /%0A/);
  assert.match(url, /%26/);
  assert.match(url, /%23/);
});

test("blocks unpublished and out-of-stock products", () => {
  assert.equal(isProductAvailable({ stock: 2, published: true }), true);
  assert.equal(isProductAvailable({ stock: 0, published: true }), false);
  assert.equal(isProductAvailable({ stock: 3, published: false }), false);
});

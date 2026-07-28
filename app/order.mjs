const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function singleLine(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function multiLine(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => singleLine(line))
    .filter(Boolean)
    .join("\n");
}

export function formatMoney(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError("O valor precisa ser um número finito.");
  }

  return brl.format(value);
}

export function isProductAvailable(product) {
  return product.published !== false && Number(product.stock) > 0;
}

export function buildOrderMessage({
  items,
  customerName,
  fulfillment,
  address,
  payment,
  notes,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Adicione pelo menos um item ao pedido.");
  }

  const normalizedName = singleLine(customerName);
  if (!normalizedName) {
    throw new Error("Informe o nome da cliente.");
  }

  if (fulfillment !== "delivery" && fulfillment !== "pickup") {
    throw new Error("Escolha entrega ou retirada.");
  }

  const normalizedAddress = singleLine(address);
  if (fulfillment === "delivery" && !normalizedAddress) {
    throw new Error("Informe o endereço de entrega.");
  }

  const normalizedPayment = singleLine(payment);
  if (!normalizedPayment) {
    throw new Error("Escolha a forma de pagamento.");
  }

  let total = 0;
  const itemLines = items.flatMap((item) => {
    const productName = singleLine(item.productName);
    const variation = singleLine(item.variation);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (
      !productName ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw new Error("Há um item inválido no pedido.");
    }

    const itemTotal = quantity * unitPrice;
    total += itemTotal;

    return [
      `• ${quantity}x ${productName}${variation ? ` — ${variation}` : ""}`,
      `  ${formatMoney(unitPrice)} cada · ${formatMoney(itemTotal)}`,
    ];
  });

  const message = [
    "*Novo pedido — Feita*",
    "",
    `Cliente: ${normalizedName}`,
    "",
    "*Itens:*",
    ...itemLines,
    "",
    `*Total: ${formatMoney(total)}*`,
    "",
    `Recebimento: ${fulfillment === "delivery" ? "Entrega" : "Retirada"}`,
    ...(fulfillment === "delivery"
      ? [`Endereço: ${normalizedAddress}`]
      : []),
    `Pagamento: ${normalizedPayment}`,
  ];

  const normalizedNotes = multiLine(notes);
  if (normalizedNotes) {
    message.push("", `Observações:\n${normalizedNotes}`);
  }

  return message.join("\n");
}

export function buildWhatsAppUrl(message) {
  const normalizedMessage = String(message ?? "").trim();
  if (!normalizedMessage) {
    throw new Error("A mensagem do pedido está vazia.");
  }

  return `https://wa.me/?text=${encodeURIComponent(normalizedMessage)}`;
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildOrderMessage, buildWhatsAppUrl } from "@/app/order.mjs";
import {
  cartStorageKey,
  parseStoredCart,
} from "@/app/storefront.mjs";
import type { PublicProduct, PublicStore } from "@/db/store-repository";
import styles from "./storefront.module.css";

type CartItem = {
  productId: string;
  variation: string;
  quantity: number;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function ProductImage({
  product,
  compact = false,
}: {
  product: PublicProduct;
  compact?: boolean;
}) {
  return product.imageUrl ? (
    // Images come from the same-origin R2 read route after tenant authorization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={compact ? styles.thumb : styles.productImage}
      src={product.imageUrl}
      alt=""
    />
  ) : (
    <div className={compact ? styles.thumbFallback : styles.productFallback}>
      {product.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function StorefrontClient({ store }: { store: PublicStore }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState("Tudo");
  const [variations, setVariations] = useState<Record<string, string>>({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = parseStoredCart(
        window.localStorage.getItem(cartStorageKey(store.slug)),
        store.products,
      );
      setCart(restored);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [store.products, store.slug]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(cartStorageKey(store.slug), JSON.stringify(cart));
    }
  }, [cart, hydrated, store.slug]);

  const categories = useMemo(
    () => Array.from(new Set(store.products.map((product) => product.category))),
    [store.products],
  );
  const visibleProducts =
    category === "Tudo"
      ? store.products
      : store.products.filter((product) => product.category === category);

  const cartLines = cart.flatMap((item) => {
    const product = store.products.find(
      (candidate) => candidate.id === item.productId,
    );
    return product ? [{ item, product }] : [];
  });
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = cartLines.reduce(
    (sum, { item, product }) => sum + item.quantity * product.priceCents,
    0,
  );

  function addProduct(product: PublicProduct) {
    if (!product.available || product.stock < 1) return;
    const variation = variations[product.id] ?? product.variations[0] ?? "";
    setCart((current) => {
      const index = current.findIndex(
        (item) => item.productId === product.id && item.variation === variation,
      );
      if (index === -1) {
        return [...current, { productId: product.id, variation, quantity: 1 }];
      }
      return current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
          : item,
      );
    });
  }

  function changeQuantity(item: CartItem, nextQuantity: number) {
    const product = store.products.find(
      (candidate) => candidate.id === item.productId,
    );
    setCart((current) =>
      nextQuantity < 1
        ? current.filter(
            (candidate) =>
              candidate.productId !== item.productId ||
              candidate.variation !== item.variation,
          )
        : current.map((candidate) =>
            candidate.productId === item.productId &&
            candidate.variation === item.variation
              ? {
                  ...candidate,
                  quantity: Math.min(nextQuantity, product?.stock ?? nextQuantity),
                }
              : candidate,
          ),
    );
  }

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fulfillment = data.get("fulfillment");
    try {
      const nextMessage = buildOrderMessage({
        items: cartLines.map(({ item, product }) => ({
          productName: product.name,
          variation: item.variation,
          quantity: item.quantity,
          unitPrice: product.priceCents / 100,
        })),
        customerName: data.get("customerName"),
        fulfillment,
        address: data.get("address"),
        payment: data.get("payment"),
        notes: data.get("notes"),
      });
      setMessage(nextMessage);
      setFormError("");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível revisar o pedido.",
      );
    }
  }

  return (
    <main className={styles.page} style={{ "--store-accent": store.accentColor } as React.CSSProperties}>
      <header className={styles.header}>
        <div className={styles.brand}>
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt="" />
          ) : (
            <span>{store.name.slice(0, 2).toUpperCase()}</span>
          )}
          <div>
            <strong>{store.name}</strong>
            {store.location && <small>{store.location}</small>}
          </div>
        </div>
        <button
          className={styles.cartButton}
          type="button"
          onClick={() => setOrderOpen(true)}
          disabled={quantity === 0}
        >
          Pedido <span>{quantity}</span>
        </button>
      </header>

      <section
        className={styles.hero}
        style={
          store.coverUrl
            ? { backgroundImage: `linear-gradient(90deg, rgba(25,25,23,.88), rgba(25,25,23,.35)), url("${store.coverUrl}")` }
            : undefined
        }
      >
        <p>Catálogo</p>
        <h1>{store.name}</h1>
        <span>{store.description}</span>
      </section>

      <section className={styles.content}>
        <div className={styles.details}>
          {store.purchaseInstructions && (
            <div>
              <strong>Como comprar</strong>
              <span>{store.purchaseInstructions}</span>
            </div>
          )}
          {store.paymentMethods.length > 0 && (
            <div>
              <strong>Pagamento</strong>
              <span>{store.paymentMethods.join(" · ")}</span>
            </div>
          )}
          {store.instagram && (
            <a
              href={`https://instagram.com/${store.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              {store.instagram.startsWith("@") ? store.instagram : `@${store.instagram}`}
            </a>
          )}
        </div>

        <nav className={styles.categories} aria-label="Categorias">
          {["Tudo", ...categories].map((candidate) => (
            <button
              key={candidate}
              type="button"
              className={candidate === category ? styles.activeCategory : ""}
              onClick={() => setCategory(candidate)}
            >
              {candidate}
            </button>
          ))}
        </nav>

        {store.products.length === 0 ? (
          <div className={styles.empty}>
            <h2>A vitrine está sendo preparada</h2>
            <p>Os produtos publicados aparecerão aqui.</p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className={styles.empty}>
            <h2>Nenhum produto nesta categoria</h2>
            <button type="button" onClick={() => setCategory("Tudo")}>
              Ver todos
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {visibleProducts.map((product) => (
              <article
                className={`${styles.product} ${product.available ? "" : styles.unavailable}`}
                key={product.id}
              >
                <ProductImage product={product} />
                <p>{product.category}</p>
                <h2>{product.name}</h2>
                {product.description && <span>{product.description}</span>}
                {product.variations.length > 0 && (
                  <label>
                    <span>Opção</span>
                    <select
                      value={variations[product.id] ?? product.variations[0]}
                      disabled={!product.available}
                      onChange={(event) =>
                        setVariations((current) => ({
                          ...current,
                          [product.id]: event.target.value,
                        }))
                      }
                    >
                      {product.variations.map((variation) => (
                        <option key={variation}>{variation}</option>
                      ))}
                    </select>
                  </label>
                )}
                <div className={styles.productAction}>
                  <div>
                    <strong>{money.format(product.priceCents / 100)}</strong>
                    <small>
                      {product.available
                        ? `${product.stock} em estoque`
                        : "Indisponível"}
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={!product.available}
                    onClick={() => addProduct(product)}
                    aria-label={`Adicionar ${product.name}`}
                  >
                    {product.available ? "+" : "—"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {quantity > 0 && (
        <div className={styles.cartDock}>
          <div>
            <span>{quantity} {quantity === 1 ? "item" : "itens"}</span>
            <strong>{money.format(totalCents / 100)}</strong>
          </div>
          <button type="button" onClick={() => setOrderOpen(true)}>
            Continuar pedido
          </button>
        </div>
      )}

      {orderOpen && (
        <div className={styles.overlay} onMouseDown={() => setOrderOpen(false)}>
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.drawerHeading}>
              <div>
                <h2 id="order-title">{message ? "Revise a mensagem" : "Seu pedido"}</h2>
                <span>Nada será enviado sem você abrir o WhatsApp.</span>
              </div>
              <button type="button" onClick={() => setOrderOpen(false)} aria-label="Fechar">×</button>
            </div>

            {message ? (
              <div className={styles.review}>
                <pre>{message}</pre>
                <button type="button" onClick={() => setMessage("")}>Voltar e editar</button>
                <a
                  href={buildWhatsAppUrl(message, store.whatsAppE164)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir WhatsApp
                </a>
              </div>
            ) : (
              <form onSubmit={reviewOrder}>
                <div className={styles.lines}>
                  {cartLines.map(({ item, product }) => (
                    <div className={styles.line} key={`${item.productId}-${item.variation}`}>
                      <ProductImage product={product} compact />
                      <div>
                        <strong>{product.name}</strong>
                        <span>{item.variation || "Sem variação"} · {money.format(product.priceCents / 100)}</span>
                      </div>
                      <div className={styles.quantity}>
                        <button type="button" onClick={() => changeQuantity(item, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" disabled={item.quantity >= product.stock} onClick={() => changeQuantity(item, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <label>Seu nome<input name="customerName" required /></label>
                <fieldset>
                  <legend>Recebimento</legend>
                  <label><input type="radio" name="fulfillment" value="pickup" defaultChecked /> Retirada</label>
                  <label><input type="radio" name="fulfillment" value="delivery" /> Entrega</label>
                </fieldset>
                <label>Endereço, se for entrega<input name="address" /></label>
                <label>
                  Pagamento
                  <select name="payment" required defaultValue="">
                    <option value="" disabled>Escolha</option>
                    {store.paymentMethods.map((payment) => <option key={payment}>{payment}</option>)}
                  </select>
                </label>
                <label>Observações<textarea name="notes" rows={3} /></label>
                {formError && <p className={styles.error} role="alert">{formError}</p>}
                <button className={styles.reviewButton} type="submit">Revisar mensagem</button>
              </form>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

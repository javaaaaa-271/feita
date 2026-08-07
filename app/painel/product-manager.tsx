"use client";

import { FormEvent, useState } from "react";
import type { CatalogProduct } from "@/catalog/products";
import { ProductImageEditor } from "./product-image-editor";
import styles from "./panel.module.css";

type ProductForm = {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  variations: string;
  published: boolean;
  available: boolean;
};

type ErrorPayload = {
  message?: string;
  fields?: Record<string, string>;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  category: "Outros",
  price: "",
  stock: "0",
  variations: "",
  published: false,
  available: true,
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductManager({
  initialProducts,
  storeId,
}: {
  initialProducts: CatalogProduct[];
  storeId: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const endpoint = `/api/painel/stores/${encodeURIComponent(storeId)}/products`;
  const editingProduct = editingId
    ? products.find((product) => product.id === editingId) ?? null
    : null;

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setNotice("");
    setFormOpen(true);
  }

  function startEdit(product: CatalogProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: centsToInput(product.priceCents),
      stock: String(product.stock),
      variations: product.variations.join("\n"),
      published: product.published,
      available: product.available,
    });
    setErrors({});
    setNotice("");
    setFormOpen(true);
  }

  function closeForm() {
    if (pendingAction) return;
    setFormOpen(false);
    setErrors({});
  }

  function updateProductImage(product: CatalogProduct) {
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? product : item)),
    );
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("save");
    setErrors({});
    setNotice("");
    const payload = {
      ...form,
      variations: form.variations
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const url = editingId
      ? `${endpoint}/${encodeURIComponent(editingId)}`
      : endpoint;

    try {
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ErrorPayload & {
        product?: CatalogProduct;
      };
      if (!response.ok || !result.product) {
        setErrors(
          result.fields ?? {
            _form: result.message ?? "Não foi possível salvar o produto.",
          },
        );
        return;
      }

      setProducts((current) =>
        editingId
          ? current.map((product) =>
              product.id === result.product?.id ? result.product : product,
            )
          : [...current, result.product as CatalogProduct].sort((a, b) =>
              a.name.localeCompare(b.name, "pt-BR"),
            ),
      );
      setNotice(editingId ? "Produto atualizado." : "Produto cadastrado.");
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch {
      setErrors({ _form: "Não foi possível salvar. Tente novamente." });
    } finally {
      setPendingAction(null);
    }
  }

  async function changeStatus(
    product: CatalogProduct,
    patch: { published?: boolean; available?: boolean },
  ) {
    const action = `${product.id}:${Object.keys(patch)[0]}`;
    setPendingAction(action);
    setErrors({});
    setNotice("");
    try {
      const response = await fetch(
        `${endpoint}/${encodeURIComponent(product.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const result = (await response.json()) as ErrorPayload & {
        product?: CatalogProduct;
      };
      if (!response.ok || !result.product) {
        setErrors({
          _form: result.message ?? "Não foi possível alterar o produto.",
        });
        return;
      }
      setProducts((current) =>
        current.map((item) =>
          item.id === result.product?.id ? result.product : item,
        ),
      );
      setNotice(
        patch.published === true
          ? "Produto publicado na vitrine."
          : patch.published === false
            ? "Produto removido da vitrine."
            : patch.available === true
              ? "Produto marcado como disponível."
              : "Produto marcado como indisponível.",
      );
    } catch {
      setErrors({ _form: "Não foi possível alterar. Tente novamente." });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={styles.productArea} aria-labelledby="catalog-title">
      <div className={styles.productToolbar}>
        <div>
          <h2 id="catalog-title">Catálogo</h2>
          <span>
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </span>
        </div>
        <button type="button" onClick={startCreate} disabled={Boolean(pendingAction)}>
          Cadastrar produto
        </button>
      </div>

      {notice && (
        <p className={styles.success} role="status">
          {notice}
        </p>
      )}
      {errors._form && (
        <p className={styles.formError} role="alert">
          {errors._form}
        </p>
      )}

      {products.length === 0 ? (
        <div className={styles.catalogEmpty}>
          <h2>Seu catálogo está vazio</h2>
          <p>Cadastre o primeiro produto. Ele só aparecerá na vitrine quando for publicado.</p>
          <button type="button" onClick={startCreate}>
            Cadastrar primeiro produto
          </button>
        </div>
      ) : (
        <div className={styles.productList}>
          {products.map((product) => {
            const publishing = pendingAction === `${product.id}:published`;
            const availability = pendingAction === `${product.id}:available`;
            return (
              <article className={styles.productRow} key={product.id}>
                <div className={styles.productIdentity}>
                  {product.imageUrl ? (
                    // Existing media is read-only in this milestone.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="" />
                  ) : (
                    <span aria-hidden="true">
                      {product.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <small>{product.category}</small>
                    <h3>{product.name}</h3>
                    <p>
                      {money.format(product.priceCents / 100)} · {product.stock} em estoque
                    </p>
                  </div>
                </div>
                <div className={styles.productState}>
                  <span className={product.published ? styles.live : styles.draft}>
                    {product.published ? "Na vitrine" : "Fora da vitrine"}
                  </span>
                  <span>{product.available ? "Disponível" : "Indisponível"}</span>
                </div>
                <div className={styles.productActions}>
                  <button
                    type="button"
                    onClick={() => startEdit(product)}
                    disabled={Boolean(pendingAction)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      changeStatus(product, { available: !product.available })
                    }
                    disabled={Boolean(pendingAction)}
                  >
                    {availability
                      ? "Salvando…"
                      : product.available
                        ? "Marcar indisponível"
                        : "Marcar disponível"}
                  </button>
                  <button
                    className={product.published ? styles.unpublish : styles.publish}
                    type="button"
                    onClick={() =>
                      changeStatus(product, { published: !product.published })
                    }
                    disabled={Boolean(pendingAction)}
                  >
                    {publishing
                      ? "Salvando…"
                      : product.published
                        ? "Remover da vitrine"
                        : "Publicar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className={styles.formOverlay} onMouseDown={closeForm}>
          <aside
            className={styles.productFormPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.formHeading}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Novo produto"}</p>
                <h2 id="product-form-title">
                  {editingId ? "Atualize o produto" : "Cadastre um produto"}
                </h2>
              </div>
              <button type="button" onClick={closeForm} aria-label="Fechar formulário">
                ×
              </button>
            </div>
            <form onSubmit={saveProduct} noValidate>
              {errors._form && (
                <p className={styles.formError} role="alert">
                  {errors._form}
                </p>
              )}
              <Field label="Nome" name="name" error={errors.name}>
                <input
                  id="name"
                  value={form.name}
                  maxLength={120}
                  required
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </Field>
              <Field label="Descrição" name="description" error={errors.description}>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  maxLength={1000}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "description-error" : undefined}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </Field>
              <div className={styles.formGrid}>
                <Field label="Categoria" name="category" error={errors.category}>
                  <input
                    id="category"
                    value={form.category}
                    maxLength={80}
                    required
                    aria-invalid={Boolean(errors.category)}
                    aria-describedby={errors.category ? "category-error" : undefined}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value })
                    }
                  />
                </Field>
                <Field label="Preço em reais" name="price" error={errors.price}>
                  <input
                    id="price"
                    value={form.price}
                    inputMode="decimal"
                    placeholder="Ex.: 29,90"
                    required
                    aria-invalid={Boolean(errors.price)}
                    aria-describedby={errors.price ? "price-error" : undefined}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                  />
                </Field>
                <Field label="Estoque" name="stock" error={errors.stock}>
                  <input
                    id="stock"
                    value={form.stock}
                    inputMode="numeric"
                    required
                    aria-invalid={Boolean(errors.stock)}
                    aria-describedby={errors.stock ? "stock-error" : undefined}
                    onChange={(event) => setForm({ ...form, stock: event.target.value })}
                  />
                </Field>
              </div>
              <Field
                label="Opções ou variações"
                name="variations"
                error={errors.variations}
                hint="Separe por linha ou vírgula. Máximo de 20 opções."
              >
                <textarea
                  id="variations"
                  rows={3}
                  value={form.variations}
                  aria-invalid={Boolean(errors.variations)}
                  aria-describedby={
                    errors.variations ? "variations-error" : "variations-hint"
                  }
                  onChange={(event) =>
                    setForm({ ...form, variations: event.target.value })
                  }
                />
              </Field>
              <div className={styles.checks}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(event) =>
                      setForm({ ...form, available: event.target.checked })
                    }
                  />
                  Produto disponível para compra
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(event) =>
                      setForm({ ...form, published: event.target.checked })
                    }
                  />
                  Mostrar na vitrine
                </label>
              </div>
              {editingProduct ? (
                <ProductImageEditor
                  product={editingProduct}
                  endpoint={`${endpoint}/${encodeURIComponent(editingProduct.id)}/image`}
                  disabled={Boolean(pendingAction)}
                  onBusyChange={(busy) =>
                    setPendingAction(busy ? "image" : null)
                  }
                  onProductChange={updateProductImage}
                />
              ) : (
                <p className={styles.imageNote}>
                  Salve o produto primeiro para adicionar a imagem.
                </p>
              )}
              <div className={styles.formButtons}>
                <button type="button" onClick={closeForm} disabled={Boolean(pendingAction)}>
                  Cancelar
                </button>
                <button type="submit" disabled={Boolean(pendingAction)}>
                  {pendingAction === "save" ? "Salvando…" : "Salvar produto"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={name}>{label}</label>
      {children}
      {hint && !error && (
        <small id={`${name}-hint`} className={styles.hint}>
          {hint}
        </small>
      )}
      {error && (
        <small id={`${name}-error`} className={styles.fieldError}>
          {error}
        </small>
      )}
    </div>
  );
}

function centsToInput(cents: number): string {
  const reais = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, "0");
  return `${reais},${decimals}`;
}

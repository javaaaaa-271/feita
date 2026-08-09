"use client";

import { ChangeEvent, useEffect, useState } from "react";
import type { CatalogProduct } from "@/catalog/products";
import styles from "./panel.module.css";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;

type ErrorPayload = {
  message?: string;
  product?: CatalogProduct;
};

export function ProductImageEditor({
  product,
  endpoint,
  disabled,
  onBusyChange,
  onProductChange,
}: {
  product: CatalogProduct;
  endpoint: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onProductChange: (product: CatalogProduct) => void;
}) {
  const [selection, setSelection] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    return () => {
      if (selection) URL.revokeObjectURL(selection.previewUrl);
    };
  }, [selection]);

  const file = selection?.file ?? null;
  const previewUrl = selection?.previewUrl ?? null;

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setError("");
    setNotice("");
    if (next && next.size > MAX_INPUT_BYTES) {
      event.target.value = "";
      setSelection(null);
      setError("Escolha uma imagem de até 8 MB.");
      return;
    }
    setSelection(
      next ? { file: next, previewUrl: URL.createObjectURL(next) } : null,
    );
  }

  async function upload() {
    if (!file) return;
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, { method: "PUT", body: file });
      const result = (await response.json()) as ErrorPayload;
      if (!response.ok || !result.product) {
        setError(result.message ?? "Não foi possível salvar a imagem.");
        return;
      }
      onProductChange(result.product);
      setSelection(null);
      setNotice(product.imageUrl ? "Imagem substituída." : "Imagem adicionada.");
    } catch {
      setError("Não foi possível salvar a imagem. Tente novamente.");
    } finally {
      onBusyChange(false);
    }
  }

  async function remove() {
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = (await response.json()) as ErrorPayload;
      if (!response.ok || !result.product) {
        setError(result.message ?? "Não foi possível remover a imagem.");
        return;
      }
      onProductChange(result.product);
      setSelection(null);
      setNotice("Imagem removida.");
    } catch {
      setError("Não foi possível remover a imagem. Tente novamente.");
    } finally {
      onBusyChange(false);
    }
  }

  const visibleImage = previewUrl ?? product.imageUrl;

  return (
    <section className={styles.imageEditor} aria-labelledby="product-image-title">
      <div className={styles.imageEditorHeading}>
        <div>
          <h3 id="product-image-title">Imagem do produto</h3>
          <p>JPEG, PNG ou WebP estático, com até 8 MB.</p>
        </div>
        <div className={styles.imagePreview}>
          {visibleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visibleImage} alt={`Prévia de ${product.name}`} />
          ) : (
            <span aria-hidden="true">{product.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      </div>

      <label className={styles.imagePicker}>
        <span>{file ? file.name : "Escolher imagem"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseFile}
          disabled={disabled}
        />
      </label>

      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={styles.imageSuccess} role="status">
          {notice}
        </p>
      )}

      <div className={styles.imageActions}>
        <button type="button" onClick={upload} disabled={disabled || !file}>
          {product.imageUrl ? "Substituir imagem" : "Adicionar imagem"}
        </button>
        {product.imageUrl && (
          <button
            type="button"
            className={styles.removeImage}
            onClick={remove}
            disabled={disabled}
          >
            Remover imagem
          </button>
        )}
      </div>
    </section>
  );
}

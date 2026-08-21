import type { Metadata } from "next";
import { getD1Database, MissingLocalBindingError } from "@/db";
import { findPublicStoreBySlug } from "@/db/store-repository";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { normalizeSlug } from "@/app/storefront.mjs";
import StorefrontClient from "./storefront-client";
import styles from "./storefront.module.css";

export const dynamic = "force-dynamic";

const loadStore = cache(async (slug: string) => {
  try {
    normalizeSlug(slug);
  } catch {
    return { store: null, bindingMissing: false };
  }
  try {
    return {
      store: await findPublicStoreBySlug(await getD1Database(), slug),
      bindingMissing: false,
    };
  } catch (error) {
    if (error instanceof MissingLocalBindingError) {
      return { store: null, bindingMissing: true };
    }
    throw error;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadStore(slug);
  if (!result.store) {
    return {
      title: "Loja não encontrada — Feita",
      description: "Esta vitrine não está disponível.",
      openGraph: { title: "Loja não encontrada — Feita", description: "Esta vitrine não está disponível.", images: [] },
      twitter: { title: "Loja não encontrada — Feita", description: "Esta vitrine não está disponível.", images: [] },
    };
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = `${result.store.name} — Feita`;
  const description = result.store.description || `Conheça os produtos de ${result.store.name} e monte seu pedido.`;
  const relativeImage = result.store.coverUrl ?? result.store.products.find((product) => product.imageUrl)?.imageUrl ?? result.store.logoUrl;
  const image = relativeImage ? new URL(relativeImage, origin).toString() : null;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: image ? [{ url: image }] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : [] },
  };
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadStore(slug);

  if (result.bindingMissing) {
    return (
      <main className={styles.statusPage}>
        <div>
          <span>Ambiente local</span>
          <h1>A vitrine ainda não foi preparada neste computador.</h1>
          <p>
            Aplique as migrações locais e importe uma loja de teste. Nenhum
            recurso remoto é necessário.
          </p>
        </div>
      </main>
    );
  }
  if (!result.store) notFound();
  return <StorefrontClient store={result.store} />;
}

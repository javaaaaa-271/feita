import { getD1Database, MissingLocalBindingError } from "@/db";
import { findPublicStoreBySlug } from "@/db/store-repository";
import { notFound } from "next/navigation";
import { normalizeSlug } from "@/app/storefront.mjs";
import StorefrontClient from "./storefront-client";
import styles from "./storefront.module.css";

export const dynamic = "force-dynamic";

async function loadStore(slug: string) {
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

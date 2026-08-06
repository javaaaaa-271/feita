import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  listStoreMemberships,
  requireSession,
  requireStoreMembership,
  StoreMembershipRequiredError,
} from "@/auth/authorization";
import { authRuntimeForRequest } from "@/auth/runtime";
import { createFeitaAuth } from "@/auth/server";
import { listCatalogProducts } from "@/catalog/products";
import { LogoutButton } from "../../../logout-button";
import { ProductManager } from "../../../product-manager";
import styles from "../../../panel.module.css";

export const metadata: Metadata = { title: "Produtos — Feita" };
export const dynamic = "force-dynamic";

export default async function StoreProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const request = new Request(
    `${protocol}://${host}/painel/lojas/${encodeURIComponent(storeId)}/produtos`,
    { headers: requestHeaders },
  );
  const runtime = await authRuntimeForRequest(request);
  const auth = createFeitaAuth(runtime);

  let session;
  try {
    session = await requireSession(auth, requestHeaders);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/entrar");
    throw error;
  }

  let membership;
  try {
    membership = await requireStoreMembership(
      runtime.database,
      session.user.id,
      storeId,
    );
  } catch (error) {
    if (error instanceof StoreMembershipRequiredError) forbidden();
    throw error;
  }

  const [products, memberships] = await Promise.all([
    listCatalogProducts(
      runtime.database,
      membership.storeId,
      membership.storeSlug,
    ),
    listStoreMemberships(runtime.database, session.user.id),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.catalogShell}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/painel">
            <span className={styles.mark} aria-hidden="true">
              F
            </span>
            Feita
          </Link>
          <LogoutButton />
        </header>
        <div className={styles.catalogHeading}>
          <div>
            <p className={styles.eyebrow}>Produtos</p>
            <h1>{membership.storeName}</h1>
            <p className={styles.description}>
              Cadastre, atualize e escolha o que aparece na sua vitrine.
            </p>
          </div>
          <div className={styles.headingLinks}>
            {memberships.length > 1 && (
              <Link href="/painel">Trocar de loja</Link>
            )}
            <Link href={`/loja/${membership.storeSlug}`} target="_blank">
              Ver vitrine
            </Link>
          </div>
        </div>
        <ProductManager
          initialProducts={products}
          storeId={membership.storeId}
        />
      </div>
    </main>
  );
}

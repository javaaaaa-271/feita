import type { Metadata } from "next";
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
import { PanelShell } from "../../../panel-shell";
import { ProductManager } from "../../../product-manager";
import styles from "../../../panel.module.css";

export const metadata: Metadata = { title: "Produtos — Feita" };
export const dynamic = "force-dynamic";

export default async function StoreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { storeId } = await params;
  const { novo } = await searchParams;
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
    <PanelShell
      active="produtos"
      email={session.user.email}
      membership={membership}
      memberships={memberships}
    >
      <div className={styles.catalogHeading}>
        <div>
          <p className={styles.eyebrow}>Catálogo</p>
          <h1>Produtos</h1>
          <p className={styles.description}>
            Cadastre, atualize e escolha o que aparece na sua vitrine.
          </p>
        </div>
      </div>
      <ProductManager
        initialCreateOpen={novo === "1"}
        initialProducts={products}
        storeId={membership.storeId}
      />
    </PanelShell>
  );
}

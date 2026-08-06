import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  listStoreMemberships,
  requireSession,
  resolveStoreSelection,
} from "@/auth/authorization";
import { authRuntimeForRequest } from "@/auth/runtime";
import { createFeitaAuth } from "@/auth/server";
import { LogoutButton } from "./logout-button";
import styles from "./panel.module.css";

export const metadata: Metadata = { title: "Painel — Feita" };
export const dynamic = "force-dynamic";

export default async function ProtectedPanelPage() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const request = new Request(`${protocol}://${host}/painel`, {
    headers: requestHeaders,
  });
  const runtime = await authRuntimeForRequest(request);
  const auth = createFeitaAuth(runtime);

  let session;
  try {
    session = await requireSession(auth, requestHeaders);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/entrar");
    throw error;
  }

  const memberships = await listStoreMemberships(
    runtime.database,
    session.user.id,
  );
  const selection = resolveStoreSelection(memberships);

  if (selection.kind === "forbidden") forbidden();
  if (selection.kind === "selected") {
    redirect(
      `/painel/lojas/${encodeURIComponent(selection.membership.storeId)}/produtos`,
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/">
            <span className={styles.mark} aria-hidden="true">
              F
            </span>
            Feita
          </Link>
          <LogoutButton />
        </header>
        <section className={styles.main}>
          <p className={styles.eyebrow}>Catálogo</p>
          <h1>Escolha a loja que deseja administrar.</h1>
          <p className={styles.description}>
            Cada catálogo permanece separado. A loja escolhida será validada
            novamente em todas as consultas e alterações.
          </p>
          <div className={styles.account}>
            <span>Conta autenticada</span>
            <strong>{session.user.email}</strong>
          </div>
          <section className={styles.stores} aria-labelledby="stores-title">
            <h2 id="stores-title">Suas lojas</h2>
            <ul className={styles.list}>
              {memberships.map((membership) => (
                <li className={styles.store} key={membership.storeId}>
                  <div>
                    <strong>{membership.storeName}</strong>
                    <span>
                      {membership.role === "store_owner"
                        ? "Responsável pela loja"
                        : "Administração da plataforma"}
                    </span>
                  </div>
                  <Link
                    className={styles.storeLink}
                    href={`/painel/lojas/${encodeURIComponent(membership.storeId)}/produtos`}
                  >
                    Abrir catálogo
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </div>
    </main>
  );
}

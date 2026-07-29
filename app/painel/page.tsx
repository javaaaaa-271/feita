import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  listStoreMemberships,
  requireSession,
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
          <p className={styles.eyebrow}>Área protegida</p>
          <h1>Seu acesso está funcionando.</h1>
          <p className={styles.description}>
            Este painel mínimo prova a sessão e o vínculo entre sua conta e as
            lojas permitidas. A edição do catálogo continua fora deste marco.
          </p>
          <div className={styles.account}>
            <span>Conta autenticada</span>
            <strong>{session.user.email}</strong>
          </div>
          <section className={styles.stores} aria-labelledby="stores-title">
            <h2 id="stores-title">Lojas permitidas</h2>
            {memberships.length > 0 ? (
              <ul className={styles.list}>
                {memberships.map((membership) => (
                  <li className={styles.store} key={membership.storeId}>
                    <strong>{membership.storeName}</strong>
                    <span>
                      {membership.role === "store_owner"
                        ? "Responsável pela loja"
                        : "Administração da plataforma"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>
                Sua conta está ativa, mas ainda não possui vínculo com uma
                loja. O acesso administrativo permanece negado.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

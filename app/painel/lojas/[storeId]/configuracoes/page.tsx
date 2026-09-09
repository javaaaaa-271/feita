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
import { readStoreSettings } from "@/store-settings/repository";
import { PanelShell } from "../../../panel-shell";
import { StoreSettingsForm } from "../../../store-settings-form";
import styles from "../../../panel.module.css";

export const metadata: Metadata = { title: "Vitrine e configurações — Feita" };
export const dynamic = "force-dynamic";

export default async function StoreSettingsPage({
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
    `${protocol}://${host}/painel/lojas/${encodeURIComponent(storeId)}/configuracoes`,
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

  const [store, memberships] = await Promise.all([
    readStoreSettings(runtime.database, membership),
    listStoreMemberships(runtime.database, session.user.id),
  ]);

  return (
    <PanelShell
      active="vitrine"
      email={session.user.email}
      membership={membership}
      memberships={memberships}
    >
      <div className={styles.dashboardHeading}>
        <div>
          <p className={styles.eyebrow}>Vitrine</p>
          <h1>Do seu jeito</h1>
          <p className={styles.description}>
            Ajuste o nome, o contato e a cor da sua loja.
          </p>
        </div>
      </div>
      <StoreSettingsForm key={membership.storeId} initialStore={store} storeId={membership.storeId} />
    </PanelShell>
  );
}

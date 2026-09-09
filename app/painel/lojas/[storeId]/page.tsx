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
import { summarizeDashboard } from "../../dashboard-summary";
import { PanelShell } from "../../panel-shell";
import styles from "../../panel.module.css";

export const metadata: Metadata = { title: "Início — Feita" };
export const dynamic = "force-dynamic";

export default async function StoreDashboardPage({
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
    `${protocol}://${host}/painel/lojas/${encodeURIComponent(storeId)}`,
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

  const [products, memberships, store] = await Promise.all([
    listCatalogProducts(
      runtime.database,
      membership.storeId,
      membership.storeSlug,
    ),
    listStoreMemberships(runtime.database, session.user.id),
    runtime.database
      .prepare(
        `SELECT published, accent_color
         FROM stores
         WHERE id = ?1
         LIMIT 1`,
      )
      .bind(membership.storeId)
      .first<{ published: number; accent_color: string }>(),
  ]);
  if (!store) forbidden();

  const summary = summarizeDashboard(products);
  const productsHref = `/painel/lojas/${encodeURIComponent(
    membership.storeId,
  )}/produtos`;
  const nextAction = {
    "create-product": {
      href: `${productsHref}?novo=1`,
      label: "Cadastrar primeiro produto",
      title: "Comece pelo seu primeiro produto",
      description: "Nome, preço, estoque e foto já são suficientes para começar.",
    },
    "add-image": {
      href: productsHref,
      label: "Adicionar uma foto",
      title: "Dê uma imagem ao seu catálogo",
      description: "Escolha um produto e adicione uma foto principal.",
    },
    "publish-product": {
      href: productsHref,
      label: "Revisar produtos",
      title: "Escolha o que vai para a vitrine",
      description: "Revise estoque e disponibilidade antes de publicar.",
    },
    "review-store": {
      href: `/painel/lojas/${encodeURIComponent(membership.storeId)}/configuracoes`,
      label: "Revisar vitrine",
      title: "Seu catálogo está tomando forma",
      description: "Confira o estado da vitrine antes de compartilhar.",
    },
  }[summary.nextAction];
  const progress = Math.round((summary.completedSteps / summary.steps.length) * 100);

  return (
    <PanelShell
      active="inicio"
      email={session.user.email}
      membership={membership}
      memberships={memberships}
    >
      <header className={styles.dashboardHeading}>
        <div>
          <p className={styles.eyebrow}>Início</p>
          <h1>Visão geral</h1>
          <p className={styles.description}>
            Acompanhe o catálogo e continue preparando sua vitrine.
          </p>
        </div>
        <Link className={styles.primaryAction} href={nextAction.href}>
          {nextAction.label}
        </Link>
      </header>

      <section className={styles.metrics} aria-label="Resumo do catálogo">
        <div>
          <span>Produtos</span>
          <strong>{summary.totalProducts}</strong>
          <small>cadastrados</small>
        </div>
        <div>
          <span>Na vitrine</span>
          <strong>{summary.publishedProducts}</strong>
          <small>publicados</small>
        </div>
        <div>
          <span>Indisponíveis</span>
          <strong>{summary.unavailableProducts}</strong>
          <small>sem estoque ou pausados</small>
        </div>
      </section>

      <div className={styles.dashboardGrid}>
        <section className={styles.nextStep} aria-labelledby="next-step-title">
          <p className={styles.sectionLabel}>Próximo passo</p>
          <h2 id="next-step-title">{nextAction.title}</h2>
          <p>{nextAction.description}</p>
        </section>

        <section className={styles.setupChecklist} aria-labelledby="checklist-title">
          <div className={styles.checklistHeading}>
            <div>
              <p className={styles.sectionLabel}>Comece por aqui</p>
              <h2 id="checklist-title">Deixe sua vitrine pronta</h2>
            </div>
            <strong>
              {summary.completedSteps}/{summary.steps.length}
            </strong>
          </div>
          <div className={styles.progressTrack} aria-label={`${progress}% concluído`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol className={styles.checklist}>
            {summary.steps.map((step) => (
              <li className={step.complete ? styles.stepComplete : undefined} key={step.label}>
                <span aria-hidden="true">{step.complete ? "✓" : ""}</span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className={styles.storefrontSummary} id="vitrine" aria-labelledby="storefront-title">
        <div>
          <p className={styles.sectionLabel}>Vitrine</p>
          <h2 id="storefront-title">Sua loja pública</h2>
          <p>
            Organize o catálogo e revise a identidade antes de compartilhar o link.
          </p>
        </div>
        <div className={styles.storefrontDetails}>
          <span
            className={store.published ? styles.statusPublished : styles.statusDraft}
          >
            {store.published ? "Publicada" : "Em preparação"}
          </span>
          <div className={styles.storefrontAddress}>
            <span>Endereço</span>
            <strong>/loja/{membership.storeSlug}</strong>
          </div>
          <div className={styles.storeColor}>
            <span style={{ backgroundColor: store.accent_color }} aria-hidden="true" />
            <small>Cor atual</small>
          </div>
          <Link href={`/painel/lojas/${encodeURIComponent(membership.storeId)}/configuracoes`}>
            Configurar vitrine
          </Link>
          {store.published ? (
            <Link href={`/loja/${membership.storeSlug}`} target="_blank">
              Abrir vitrine
            </Link>
          ) : (
            <small>A loja ainda está em preparação.</small>
          )}
        </div>
      </section>
    </PanelShell>
  );
}

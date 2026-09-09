import Link from "next/link";
import type { ReactNode } from "react";
import type { StoreMembership } from "@/auth/authorization";
import { LogoutButton } from "./logout-button";
import styles from "./panel.module.css";

type PanelSection = "inicio" | "produtos" | "vitrine";

export function PanelShell({
  active,
  children,
  email,
  membership,
  memberships,
}: {
  active: PanelSection;
  children: ReactNode;
  email: string;
  membership: StoreMembership;
  memberships: StoreMembership[];
}) {
  const storeRoot = `/painel/lojas/${encodeURIComponent(membership.storeId)}`;
  const navigation = [
    { id: "inicio" as const, href: storeRoot, label: "Início" },
    {
      id: "produtos" as const,
      href: `${storeRoot}/produtos`,
      label: "Produtos",
    },
    { id: "vitrine" as const, href: `${storeRoot}/configuracoes`, label: "Vitrine" },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.appShell}>
        <aside className={styles.sidebar}>
          <Link className={styles.brand} href={storeRoot}>
            <span className={styles.mark} aria-hidden="true">
              F
            </span>
            Feita
          </Link>
          <nav className={styles.sideNavigation} aria-label="Navegação do painel">
            {navigation.map((item) => (
              <Link
                className={active === item.id ? styles.navigationActive : undefined}
                href={item.href}
                key={item.id}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.sidebarNote}>
            <span>Seu negócio, em ordem.</span>
            <p>Catálogo, vitrine e pedidos no mesmo lugar.</p>
          </div>
        </aside>

        <section className={styles.appBody}>
          <header className={styles.appTopbar}>
            <Link className={`${styles.brand} ${styles.mobileBrand}`} href={storeRoot}>
              <span className={styles.mark} aria-hidden="true">
                F
              </span>
              Feita
            </Link>
            <details className={styles.storeMenu}>
              <summary aria-label={`Abrir menu da loja ${membership.storeName}`}>
                <span className={styles.storeInitial} aria-hidden="true">
                  {membership.storeName.slice(0, 1).toUpperCase()}
                </span>
                <span className={styles.storeMenuIdentity}>
                  <strong>{membership.storeName}</strong>
                  <small>
                    {membership.role === "store_owner" ? "Sua loja" : "Administração"}
                  </small>
                </span>
                <span className={styles.storeMenuChevron} aria-hidden="true">
                  ⌄
                </span>
              </summary>
              <div className={styles.storeMenuPopover}>
                <div className={styles.storeMenuAccount}>
                  <span>Conta conectada</span>
                  <strong>{email}</strong>
                </div>
                <Link href={`${storeRoot}/configuracoes`}>Vitrine e configurações</Link>
                {memberships.length > 1 && <Link href="/painel">Trocar de loja</Link>}
                <LogoutButton appearance="menu" />
              </div>
            </details>
          </header>
          <div className={styles.appContent}>{children}</div>
        </section>
      </div>

      <nav className={styles.mobileNavigation} aria-label="Navegação do painel no celular">
        {navigation.map((item) => (
          <Link
            className={active === item.id ? styles.navigationActive : undefined}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

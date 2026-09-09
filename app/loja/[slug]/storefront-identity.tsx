import type { ReactNode } from "react";
import type { PublicStore } from "@/db/store-repository";
import styles from "./storefront.module.css";

type Identity = Pick<PublicStore, "name" | "location" | "description" | "logoUrl" | "coverUrl">;

export function StorefrontIdentity({ store, action, preview = false }: {
  store: Identity; action?: ReactNode; preview?: boolean;
}) {
  const Heading = preview ? "h3" : "h1";
  return <>
    <header className={styles.header}>
      <div className={styles.brand}>
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="" />
        ) : <span>{store.name.slice(0, 2).toUpperCase()}</span>}
        <div><strong>{store.name}</strong>{store.location && <small>{store.location}</small>}</div>
      </div>
      {action}
    </header>
    <section className={styles.hero} style={store.coverUrl ? {
      backgroundImage: `linear-gradient(90deg, rgba(25,25,23,.88), rgba(25,25,23,.35)), url("${store.coverUrl}")`,
    } : undefined}>
      <p>Catálogo</p>
      <Heading>{store.name}</Heading>
      {store.description && <span>{store.description}</span>}
    </section>
  </>;
}

export function StorefrontIdentityPreview({ store }: { store: Identity & { accentColor: string } }) {
  return <div className={styles.identityPreview} style={{ "--store-accent": store.accentColor } as React.CSSProperties}>
    <StorefrontIdentity store={store} preview />
    <div className={styles.previewCategory}><span>Tudo</span><small>Os produtos publicados aparecem abaixo.</small></div>
  </div>;
}

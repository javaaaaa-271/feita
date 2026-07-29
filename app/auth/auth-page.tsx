import Link from "next/link";
import styles from "./auth-shell.module.css";

type AuthPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
  children: React.ReactNode;
};

export function AuthPage({
  eyebrow,
  title,
  description,
  cardTitle,
  cardDescription,
  children,
}: AuthPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <Link className={styles.brand} href="/" aria-label="Feita, página inicial">
          <span className={styles.mark} aria-hidden="true">
            F
          </span>
          Feita
        </Link>
        <div className={styles.content}>
          <section className={styles.intro}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </section>
          <section className={styles.card} aria-labelledby="auth-card-title">
            <header className={styles.cardHeader}>
              <h2 id="auth-card-title">{cardTitle}</h2>
              <p>{cardDescription}</p>
            </header>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

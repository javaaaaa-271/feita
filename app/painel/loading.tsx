import styles from "./panel.module.css";

export default function PanelLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.loading} role="status">
        Carregando seu catálogo…
      </div>
    </main>
  );
}

import Link from "next/link";
import styles from "./panel.module.css";

export default function PanelForbidden() {
  return (
    <main className={styles.page}>
      <div className={styles.accessDenied}>
        <p className={styles.eyebrow}>Acesso não autorizado</p>
        <h1>Esta loja não está disponível para sua conta.</h1>
        <p>
          Volte ao painel para escolher uma loja permitida ou peça ao responsável
          pela Feita para conferir seu convite.
        </p>
        <Link href="/painel">Voltar ao painel</Link>
      </div>
    </main>
  );
}

import styles from "./storefront.module.css";

export default function StoreNotFound() {
  return (
    <main className={styles.statusPage}>
      <div>
        <span>Feita</span>
        <h1>Esta loja não está disponível.</h1>
        <p>Confira o endereço ou peça o link atualizado para a vendedora.</p>
      </div>
    </main>
  );
}

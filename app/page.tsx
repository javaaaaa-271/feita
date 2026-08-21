import Link from "next/link";
import styles from "./landing.module.css";

const steps = [
  ["01", "Cadastre seus produtos", "Preço, estoque, variações e fotos ficam reunidos em um catálogo simples."],
  ["02", "Compartilhe sua vitrine", "Cada negócio recebe um endereço próprio para mandar no WhatsApp e nas redes."],
  ["03", "Receba pedidos claros", "A cliente escolhe os itens e a Feita prepara a conversa para fechar no WhatsApp."],
] as const;

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Feita, página inicial">
          <span aria-hidden="true">f.</span>
          feita
        </Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          <Link href="/demonstracao">Ver demonstração</Link>
          <Link href="/entrar">Entrar</Link>
          <Link className={styles.navCta} href="/cadastro">Criar minha loja</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Sua vitrine. Seus pedidos. Tudo no lugar.</p>
          <h1>Venda pelo WhatsApp sem se perder no WhatsApp.</h1>
          <p className={styles.lead}>
            A Feita organiza seus produtos em uma vitrine bonita e transforma a
            escolha da cliente em um pedido fácil de conferir.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/cadastro">Criar minha loja</Link>
            <Link className={styles.secondary} href="/demonstracao">Ver demonstração</Link>
          </div>
          <p className={styles.assurance}>Comece grátis para testar. Sem cartão agora.</p>
        </div>

        <div className={styles.preview} aria-label="Exemplo de pedido organizado na Feita">
          <div className={styles.previewTop}>
            <div><span>EM</span><strong>Estúdio Manacá</strong></div>
            <small>Pedido 04</small>
          </div>
          <div className={styles.product}>
            <div className={styles.productArt}>CA</div>
            <div><strong>Caderno Aurora</strong><span>Terracota · 2 unidades</span></div>
            <b>R$ 118,80</b>
          </div>
          <div className={styles.product}>
            <div className={`${styles.productArt} ${styles.green}`}>BS</div>
            <div><strong>Bloco Semanal</strong><span>Verde oliva · 1 unidade</span></div>
            <b>R$ 28,00</b>
          </div>
          <div className={styles.total}><span>Total do pedido</span><strong>R$ 146,80</strong></div>
          <div className={styles.whatsapp}>Continuar pelo WhatsApp <span>→</span></div>
        </div>
      </section>

      <section className={styles.how} aria-labelledby="how-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Do catálogo ao pedido</p>
          <h2 id="how-title">Você cuida do que faz. A Feita organiza o caminho da venda.</h2>
        </div>
        <div className={styles.steps}>
          {steps.map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>Seu negócio merece clareza</p>
          <h2>Abra sua primeira vitrine em poucos minutos.</h2>
        </div>
        <Link className={styles.primary} href="/cadastro">Começar agora</Link>
      </section>

      <footer className={styles.footer}>
        <span>feita</span>
        <p>Seu negócio, em ordem.</p>
        <Link href="/entrar">Já tenho acesso</Link>
      </footer>
    </main>
  );
}

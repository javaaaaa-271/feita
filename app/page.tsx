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
          <p className={styles.eyebrow}>Feita para quem vende pelo WhatsApp</p>
          <h1>Organize seus produtos. Receba pedidos sem bagunça.</h1>
          <p className={styles.lead}>
            Sua cliente escolhe pela vitrine. Você recebe o pedido pronto para
            conferir e continuar a conversa no WhatsApp.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/cadastro">Criar minha vitrine</Link>
            <Link className={styles.secondary} href="/demonstracao">
              Explorar demonstração <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className={styles.assurance}>Comece grátis para testar. Sem cartão agora.</p>
        </div>

        <div className={styles.previewShell} aria-label="Exemplo de pedido organizado na Feita">
          <div className={styles.previewHeading}>
            <div>
              <span className={styles.statusDot} aria-hidden="true" />
              <strong>Pedido pronto</strong>
            </div>
            <span>Hoje, 14:32</span>
          </div>
          <div className={styles.preview}>
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
          <p className={styles.previewNote}>A cliente montou este pedido pela sua vitrine.</p>
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
        <div className={styles.footerBrand}>
          <span>feita</span>
          <p>Seu negócio, em ordem.</p>
        </div>
        <nav className={styles.footerLinks} aria-label="Transparência e informações legais">
          <Link href="/transparencia#privacidade">Privacidade</Link>
          <Link href="/transparencia#termos">Termos de uso</Link>
          <Link href="/transparencia#cookies">Cookies</Link>
          <Link href="/transparencia#seguranca">Segurança</Link>
          <Link href="/transparencia#direitos">Seus direitos</Link>
        </nav>
        <div className={styles.footerAccess}>
          <span>Versão privada de validação</span>
          <Link href="/entrar">Já tenho acesso</Link>
        </div>
      </footer>
    </main>
  );
}

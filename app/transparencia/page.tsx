import type { Metadata } from "next";
import Link from "next/link";
import styles from "./transparencia.module.css";

export const metadata: Metadata = {
  title: "Transparência e privacidade — Feita",
  description: "Saiba como a Feita trata dados, utiliza cookies e protege sua operação.",
};

const sections = [
  ["privacidade", "Privacidade"],
  ["termos", "Termos de uso"],
  ["cookies", "Cookies"],
  ["seguranca", "Segurança"],
  ["direitos", "Seus direitos"],
] as const;

export default function TransparencyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Feita, página inicial">
          <span aria-hidden="true">f.</span>
          feita
        </Link>
        <Link className={styles.back} href="/">Voltar para o início</Link>
      </header>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>Transparência</p>
        <h1>Como a Feita cuida dos dados.</h1>
        <p>
          Esta página descreve o funcionamento atual da versão privada de validação.
          Ela será atualizada sempre que a Feita passar a coletar novos dados ou mudar
          a forma de tratá-los.
        </p>
        <div className={styles.draftNotice}>
          <strong>Documento em evolução</strong>
          <span>
            Razão social, CNPJ, domínio e canal oficial de privacidade serão incluídos
            antes da abertura pública. Este texto não substitui a revisão jurídica final.
          </span>
        </div>
      </section>

      <div className={styles.content}>
        <aside className={styles.index} aria-label="Nesta página">
          <span>Nesta página</span>
          <nav>
            {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        </aside>

        <article className={styles.document}>
          <section id="privacidade">
            <p className={styles.sectionNumber}>01</p>
            <h2>Privacidade</h2>
            <p>
              A Feita utiliza somente os dados necessários para criar uma conta, proteger
              o acesso, publicar a vitrine e manter o catálogo da lojista.
            </p>
            <h3>O que é tratado hoje</h3>
            <ul>
              <li><strong>Conta:</strong> nome, e-mail, credencial protegida, verificação de e-mail e sessões.</li>
              <li><strong>Segurança:</strong> endereço IP, navegador, limites de tentativas e eventos de auditoria.</li>
              <li><strong>Negócio:</strong> nome e endereço da vitrine, WhatsApp, apresentação, produtos, preços, estoque e imagens.</li>
              <li><strong>Vitrine:</strong> os itens do carrinho ficam no próprio navegador da cliente e são separados por loja.</li>
            </ul>
            <h3>O que ainda não é armazenado</h3>
            <p>
              A versão atual não grava pedidos nem cadastros de clientes no servidor. Nome,
              endereço, pagamento e observações são usados no navegador apenas para montar a
              mensagem revisada pela cliente. Os dados seguem para o WhatsApp somente quando
              ela escolhe abrir o aplicativo.
            </p>
            <h3>Com quem os dados podem circular</h3>
            <p>
              A infraestrutura utiliza Cloudflare para hospedagem, banco, arquivos e proteção
              contra abuso, e Resend para os e-mails transacionais. Ao abrir a mensagem de
              pedido, a cliente passa a utilizar o WhatsApp, sujeito às regras próprias desse
              serviço. A Feita não vende dados pessoais para publicidade.
            </p>
            <p>
              As finalidades, bases legais, papéis entre Feita e lojista e prazos exatos de
              retenção serão formalizados no contrato e na versão jurídica definitiva antes
              do uso público.
            </p>
          </section>

          <section id="termos">
            <p className={styles.sectionNumber}>02</p>
            <h2>Termos de uso</h2>
            <p>
              A Feita está em validação privada. O serviço organiza catálogo e pedidos, mas
              não processa pagamentos, não confirma recebimentos e não envia mensagens pela
              lojista automaticamente.
            </p>
            <ul>
              <li>A lojista responde pela veracidade dos produtos, preços, estoque e condições de venda.</li>
              <li>Não é permitido usar a plataforma para atividade ilegal, fraude, abuso ou conteúdo que viole direitos de terceiros.</li>
              <li>Dados sensíveis ou de crianças não devem ser cadastrados na fase atual.</li>
              <li>A conta deve ser protegida com senha forte e acesso restrito às pessoas autorizadas.</li>
              <li>Recursos podem mudar durante a validação, sempre com cuidado para preservar segurança e dados.</li>
            </ul>
            <p>
              Condições comerciais, suporte, cancelamento, responsabilidade e disponibilidade
              receberão redação contratual completa antes da contratação pública.
            </p>
          </section>

          <section id="cookies">
            <p className={styles.sectionNumber}>03</p>
            <h2>Cookies e armazenamento no navegador</h2>
            <p>
              A Feita usa cookies necessários para autenticação, continuidade da sessão e
              segurança. Eles não são usados para anúncios ou criação de perfil publicitário.
            </p>
            <p>
              Na vitrine, o navegador guarda localmente apenas os identificadores dos produtos,
              variações e quantidades do carrinho. Isso permite continuar a escolha depois de
              recarregar a página. A cliente pode apagar esse conteúdo limpando os dados do site
              no navegador.
            </p>
            <p>
              Hoje não há cookies opcionais de analytics ou publicidade. Caso sejam adicionados,
              esta página será atualizada e os controles de consentimento serão apresentados antes
              da ativação dessas tecnologias.
            </p>
          </section>

          <section id="seguranca">
            <p className={styles.sectionNumber}>04</p>
            <h2>Segurança</h2>
            <p>
              Segurança é uma prática contínua, não um selo. A Feita adota autenticação com
              e-mail verificado, cookies de sessão protegidos, limitação de tentativas, separação
              entre lojas, validação de imagens e comunicação criptografada por HTTPS.
            </p>
            <p>
              Operações do painel conferem a sessão e o vínculo com a loja no servidor. Testes
              automatizados usam duas lojas distintas para impedir que uma acesse os dados da outra.
              Nenhum sistema é invulnerável; incidentes relevantes serão tratados e comunicados
              conforme a legislação aplicável.
            </p>
            <p>
              A Feita não anuncia certificação, homologação ou “selo oficial LGPD”. A ANPD informa
              que não credencia empresas privadas para garantir a conformidade de aplicativos.
              Consulte a <a href="https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-esclarece-duvidas-sobre-a-atuacao-do-encarregado-e-a-emissao-de-selos-de-conformidade-com-a-lgpd" target="_blank" rel="noreferrer">orientação oficial da ANPD</a>.
            </p>
          </section>

          <section id="direitos">
            <p className={styles.sectionNumber}>05</p>
            <h2>Seus direitos</h2>
            <p>
              Titulares podem pedir confirmação de tratamento, acesso, correção, informação sobre
              compartilhamentos, oposição quando aplicável e eliminação ou portabilidade nos casos
              previstos pela LGPD. A identidade de quem solicita poderá ser conferida para impedir
              que dados sejam entregues à pessoa errada.
            </p>
            <div className={styles.channel}>
              <strong>Canal de privacidade</strong>
              <p>
                O endereço oficial será publicado aqui antes da abertura ao público. Durante a
                validação privada, as solicitações são tratadas diretamente com as participantes do piloto.
              </p>
            </div>
          </section>
        </article>
      </div>

      <footer className={styles.footer}>
        <span>Última atualização: 21 de agosto de 2026</span>
        <Link href="/">feita — seu negócio, em ordem</Link>
      </footer>
    </main>
  );
}

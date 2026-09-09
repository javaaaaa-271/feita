# Decisões de produto e design

Este arquivo registra decisões que não devem ser rediscutidas por acidente.
Elas podem mudar, mas a mudança precisa ser consciente.

## D-001 — Código e identidade próprios

A Feita pode estudar problemas, fluxos e modelos de negócio já existentes, mas
não copiará código, marca, textos, imagens ou identidade visual de concorrentes.

## D-002 — Um núcleo, várias verticais

O produto será construído sobre um núcleo multiempresa com módulos ativáveis.
Confeitaria, artesanato, papelaria e revenda podem receber linguagem e
configurações específicas sem virar sistemas independentes.

## D-003 — Sem integração bancária no MVP

O primeiro Pix gera QR Code e código copia e cola com o valor do pedido. A
cliente paga no aplicativo do banco e a empreendedora confirma manualmente.

Confirmação automática exigiria PSP ou banco, webhook, conciliação e operação
financeira adicional. Isso só entra depois de validação.

## D-004 — Ferramenta de trabalho, não template de IA

A interface evita:

- cards dentro de cards;
- modais sobre modais;
- frases decorativas em telas operacionais;
- serifas enormes usadas apenas para parecer sofisticado;
- excesso de bege, gradientes e elementos sem função;
- informações concorrendo pela mesma prioridade;
- componentes diferentes para a mesma ação.

Cada tela deve ter uma ação dominante e uma hierarquia verificável.

## D-005 — Design system antes da multiplicação de telas

Botões, campos, gavetas, tabelas, estados vazios, alertas e navegação serão
componentes consistentes. Novos módulos não devem parecer pedidos separados
feitos a uma IA.

## D-006 — Vitrine e painel têm papéis diferentes

O painel parece uma ferramenta confiável de operação. A vitrine parece a marca
da própria cliente. A estrutura da Feita permanece estável, enquanto logo,
cores, banner e apresentação dos produtos podem variar por negócio.

## D-007 — "Feita" é o nome escolhido

O nome `Feita` foi confirmado pelo proprietário em 1º de setembro de 2026 após
a primeira rodada de conversa com uma usuária real. A frase "Seu negócio, em
ordem" continua sendo a assinatura do produto. Pesquisa de marca, domínio e
registro continuam obrigatórias antes de investimento público na identidade.

## D-008 — A primeira usuária de pesquisa é real

A mãe do Lorenzo, usuária pagante da solução de referência, será convidada a
executar fluxos sem explicação. Dificuldades observadas valem mais do que
opiniões abstratas sobre beleza.

## D-009 — Não construir dez produtos antes de vender um

Primeiro será validado o núcleo catálogo → pedido → pagamento manual →
WhatsApp. Calculadoras, agenda, rotina, IA e outras verticais só entram depois
de uso ou demanda comprovada.

## D-010 — Receita precisa sustentar uso contínuo

Evitar promessa de acesso vitalício quando há custos permanentes de
infraestrutura, armazenamento e suporte. A hipótese comercial inicial passa a
ser implantação assistida quando houver trabalho manual e uma assinatura de
**R$ 120 por ano**, apresentada como equivalente a R$ 10 por mês, mas cobrada
anualmente. Esse valor é hipótese de validação, não preço definitivo: suporte,
armazenamento, limites do plano e disposição real de pagamento ainda precisam
ser medidos antes da cobrança.

## D-011 — Better Auth, D1 e R2 na primeira fatia real

A primeira implementação de contas e persistência usará Better Auth no servidor,
Cloudflare D1 para autenticação e dados estruturados e R2 para imagens.

A decisão preserva a infraestrutura atual e atende a exigência de sessão
revogável em cookie `HttpOnly`. A ausência de RLS no D1 exige autorização
server-side centralizada, `tenant_id` em todas as tabelas de negócio e testes
IDOR com duas lojas antes de dados reais.

Contexto, alternativas, riscos e condições de implementação estão em
[`ADR-001-AUTENTICACAO-E-PERSISTENCIA.md`](ADR-001-AUTENTICACAO-E-PERSISTENCIA.md).

## D-012 — Contas somente por convite (substituída pelo Marco 7)

O signup público do Better Auth permanece fechado. Um convite já contém e-mail,
loja e papel definidos pelo servidor; seu código é armazenado somente como
digest, expira e tem uso único.

Provedores sociais futuros podem autenticar uma identidade, mas nunca criarão
automaticamente loja ou `store_memberships`. Depois da autenticação o servidor
continuará exigindo usuário existente, convite quando aplicável e vínculo
explícito com a loja.

Esta foi a barreira segura do Marco 5. O Marco 7 altera conscientemente apenas
o bootstrap da primeira loja conforme D-013; convites continuam válidos para
acesso a lojas já existentes.

## D-013 — Cadastro público verificado para a primeira loja

Uma pessoa pode criar uma conta pública com nome, e-mail e senha, mas não recebe
sessão nem pode criar loja antes de confirmar um OTP de seis dígitos enviado ao
e-mail. O código expira em dez minutos, é armazenado com hash, gira a cada novo
envio e aceita no máximo três tentativas.

Depois da verificação, o servidor deriva o usuário exclusivamente da sessão e
cria, em um único lote D1, uma loja inicialmente não publicada, o vínculo
`store_owner`, a reivindicação única de bootstrap e o evento de auditoria. Uma
conta pública pode usar esse bootstrap uma única vez; vínculos futuros continuam
sendo adicionados por convite. Slugs são únicos no banco e lojas não viram
branches de Git: todas compartilham o mesmo código e permanecem isoladas por
dados, sessão e membership.

Antes de publicar esse fluxo serão obrigatórios remetente e domínio verificados
no Resend, secrets de produção, validação server-side do Turnstile, prova em
caixa de e-mail controlada e repetição da matriz IDOR.

## D-014 — O painel orienta sem condução invasiva

O painel autenticado deve começar por uma visão geral da loja, não por uma lista
vazia de produtos. A primeira entrada mostra uma ação dominante, resumo do
catálogo, estado da vitrine e um checklist curto derivado dos dados reais.

A navegação permanece lateral no desktop e compacta no celular. Tutoriais com
balões em sequência não são o padrão: explicações aparecem no contexto e o
checklist pode desaparecer quando concluído sem retirar o acesso à ajuda.

## D-015 — A vitrine tem personalização controlada

A lojista poderá ajustar cor principal, logo, capa, apresentação e organização
dos produtos, incluindo ordem e destaques. A Feita não abrirá tipografias,
layouts arbitrários ou temas incompatíveis entre si na primeira versão.

Essa restrição mantém a vitrine reconhecível, responsiva e operável, sem apagar
a identidade da cliente. Galeria com várias imagens por produto é parte do
catálogo comercial e exige evolução própria do modelo de mídia.


## D-016 — Configurações salvam identidade sem publicar a loja

Nome, WhatsApp e cor são editados na seção Vitrine e persistidos na loja
autorizada. O nome não altera o link existente e salvar não muda o estado de
publicação. A prévia reutiliza a identidade da vitrine pública. A cor livre
precisa manter contraste mínimo de 4,5:1 com o fundo claro atual; a validação
ocorre também no servidor e cores sugeridas atendem à mesma regra.

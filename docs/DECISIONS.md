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

## D-007 — "Feita" é nome provisório

O nome e a frase "Seu negócio, em ordem" têm boa direção, mas não estão
definitivamente aprovados. Pesquisa de marca, domínio e registro ficam para uma
etapa posterior.

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
infraestrutura, armazenamento e suporte. A hipótese inicial é implantação mais
assinatura mensal ou anual.

## D-011 — Better Auth, D1 e R2 na primeira fatia real

A primeira implementação de contas e persistência usará Better Auth no servidor,
Cloudflare D1 para autenticação e dados estruturados e R2 para imagens.

A decisão preserva a infraestrutura atual e atende a exigência de sessão
revogável em cookie `HttpOnly`. A ausência de RLS no D1 exige autorização
server-side centralizada, `tenant_id` em todas as tabelas de negócio e testes
IDOR com duas lojas antes de dados reais.

Contexto, alternativas, riscos e condições de implementação estão em
[`ADR-001-AUTENTICACAO-E-PERSISTENCIA.md`](ADR-001-AUTENTICACAO-E-PERSISTENCIA.md).

## D-012 — Contas somente por convite

O signup público do Better Auth permanece fechado. Um convite já contém e-mail,
loja e papel definidos pelo servidor; seu código é armazenado somente como
digest, expira e tem uso único.

Provedores sociais futuros podem autenticar uma identidade, mas nunca criarão
automaticamente loja ou `store_memberships`. Depois da autenticação o servidor
continuará exigindo usuário existente, convite quando aplicável e vínculo
explícito com a loja.

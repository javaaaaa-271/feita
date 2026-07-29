# Feita

> Seu negócio, em ordem.

Feita é o nome provisório de um produto para pequenas empreendedoras que hoje
organizam catálogo, pedidos, clientes, estoque e recebimentos entre WhatsApp,
caderno e planilhas.

Este repositório guarda o código, as decisões e o caminho de evolução do
produto. A referência inicial foi o problema resolvido pelo Ordena PRO — não sua
marca, identidade, interface ou código.

## Estado atual

O primeiro corte navegável já entrega:

- painel com prioridades do dia;
- lista de produtos;
- cadastro de produto em uma gaveta lateral;
- upload e prévia de foto;
- vitrine da loja;
- carrinho com variações, quantidade e total;
- checkout local com entrega, retirada, pagamento e observações;
- revisão e abertura da mensagem estruturada no WhatsApp;
- experiência responsiva para celular e desktop;
- direção visual própria.

O Marco 4 está integrado e publicado como checkpoint controlado:

- vitrine pública em `/loja/[slug]`;
- D1 e R2 reais provisionados pelo projeto Sites existente;
- migration versionada aplicada, com o banco hospedado ainda vazio;
- imagens servidas do R2 somente após filtro por loja;
- identidade, formas de pagamento e WhatsApp configuráveis por importação
  controlada;
- carrinho da cliente persistido no navegador e separado por loja.

O protótipo está disponível em:

https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site

### Limites do site publicado

- o painel em `/` ainda guarda seus dados apenas na sessão atual e recarregar a
  página restaura os produtos de demonstração;
- D1/R2 estão ativos para `/loja/[slug]`, mas nenhuma loja real foi carregada;
- ainda não há login ou administração hospedada;
- pedidos ainda não são persistidos;
- a vitrine persistida usa o WhatsApp configurado para a loja, mas a mensagem
  nunca é enviada automaticamente;
- Pix é somente uma forma de pagamento informada no pedido; ainda não há QR
  Code ou código copia e cola;
- "Feita" ainda é um nome de trabalho.

O site publicado inclui a infraestrutura do Marco 4, mas nenhuma loja foi
importada no D1 hospedado. O painel em `/` continua sendo o sandbox de sessão
do Marco 3 e ainda não administra o catálogo persistido. Consulte o runbook
antes de preparar a primeira loja.

## Fluxo central do produto

1. A empreendedora cadastra um produto.
2. Compartilha o link da loja.
3. A cliente monta o pedido.
4. O sistema organiza valores, entrega e forma de pagamento.
5. A empreendedora recebe e acompanha o pedido.
6. O pagamento é conferido manualmente no MVP.

Toda funcionalidade nova deve simplificar esse fluxo ou ficar subordinada a
ele.

## Documentos do projeto

- [Handoff atual](docs/HANDOFF.md)
- [Visão e escopo](docs/VISION.md)
- [Decisões de produto e design](docs/DECISIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Requisitos mapeados](docs/REQUIREMENTS.md)
- [Segurança](docs/SECURITY.md)
- [ADR de autenticação e persistência](docs/ADR-001-AUTENTICACAO-E-PERSISTENCIA.md)
- [Roteiro do Marco 3 para uso real](docs/MARCO_3_USO_REAL.md)
- [Marco 4 — primeira loja compartilhável](docs/MARCO_4_LOJA_COMPARTILHAVEL.md)

## Estrutura do código

- `app/page.tsx`: produto navegável e estado do protótipo;
- `app/globals.css`: identidade visual e comportamento responsivo;
- `app/loja/[slug]/`: vitrine pública persistida;
- `db/`: schema, bindings e consultas isoladas por loja;
- `drizzle/`: migrations versionadas;
- `scripts/import-store.mjs`: importação administrativa local e validada;
- `tests/`: validações da aplicação renderizada;
- `.openai/hosting.json`: vínculo desta fonte com o site publicado.

## Desenvolvimento

Requisitos:

- Node.js 22.13 ou superior;
- npm.

Comandos principais:

```bash
npm install
npm run db:migrate:local
npm run store:import -- data/first-store.example.json
npm run dev
```

Validações:

```bash
npm run lint
npm test
```

## Regra do projeto

A IA pode acelerar implementação, mas não decide o produto sozinha. Navegação,
hierarquia, linguagem, componentes e comportamento responsivo precisam ser
coerentes entre todas as telas e testados com usuárias reais.

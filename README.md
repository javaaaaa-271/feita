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

O protótipo está disponível em:

https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site

### Limites deste corte

- os dados ficam apenas na sessão atual;
- recarregar a página restaura os produtos de demonstração;
- ainda não há login, banco de dados ou múltiplas lojas;
- pedidos ainda não são persistidos;
- o WhatsApp recebe uma mensagem pronta, mas o número da loja ainda não é
  configurável e a mensagem não é enviada automaticamente;
- Pix é somente uma forma de pagamento informada no pedido; ainda não há QR
  Code ou código copia e cola;
- "Feita" ainda é um nome de trabalho.

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

## Estrutura do código

- `app/page.tsx`: produto navegável e estado do protótipo;
- `app/globals.css`: identidade visual e comportamento responsivo;
- `db/`: base preparada para a futura persistência;
- `tests/`: validações da aplicação renderizada;
- `.openai/hosting.json`: vínculo desta fonte com o site publicado.

## Desenvolvimento

Requisitos:

- Node.js 22.13 ou superior;
- npm.

Comandos principais:

```bash
npm install
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

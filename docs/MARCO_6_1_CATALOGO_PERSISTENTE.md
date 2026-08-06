# Marco 6.1 — catálogo persistente autenticado

Status: **implementado e validado localmente; não publicado**

Este marco liga o painel autenticado ao catálogo D1 já lido pela vitrine
pública. Ele não muda o schema, não cria migration e não altera recursos
remotos.

## Fluxo de autorização

1. A Better Auth valida a sessão em cookie no servidor.
2. O servidor obtém o usuário da sessão.
3. `/painel` lista somente os memberships desse usuário.
4. O ID da loja escolhido no caminho serve apenas como seletor.
5. Cada rota valida novamente o membership do usuário para essa loja.
6. Criações recebem `tenant_id` do membership validado.
7. Leituras e edições combinam o ID do produto com o ID da loja autorizada.

Não existe tratamento privilegiado implícito para `platform_admin`. Sem vínculo
explícito, a operação é negada.

### Zero, um e múltiplos memberships

- zero: a conta permanece autenticada, mas a API operacional responde 403;
- um: o painel abre diretamente a única loja autorizada;
- múltiplos: o painel exige escolha explícita e nunca usa silenciosamente o
  primeiro registro.

Conhecer ou alterar um ID não concede acesso. Um produto de outra loja e um
produto inexistente produzem a mesma resposta 404.

## Campos operáveis

- nome: obrigatório, até 120 caracteres;
- descrição: opcional, até 1.000 caracteres;
- categoria: obrigatória, até 80 caracteres;
- preço: reais digitados na convenção brasileira, persistidos em centavos;
- estoque: inteiro entre zero e 1.000.000;
- variações: até 20 itens, 80 caracteres por item e 1.000 no total;
- publicação e disponibilidade: booleanos explícitos.

O payload JSON tem limite de 16 KiB. Campos desconhecidos são recusados. A
validação do navegador melhora a experiência, mas a decisão final sempre é do
servidor.

## Preço em centavos

O parser aceita valores como `12`, `12,3`, `12,34` e `1.234,56`. Pontos só
podem representar agrupamento de milhar e a vírgula representa os centavos.
Valores negativos, exponenciais, não numéricos, ambíguos, acima de duas casas
ou superiores ao limite são recusados. A conversão separa reais e centavos como
inteiros e não usa `float` para persistência.

## Publicação, disponibilidade e estoque

- `published = false` remove o produto da vitrine sem apagar o registro;
- `published = true` permite sua leitura pública na loja correta;
- `available = false` mantém o produto visível, mas indisponível para compra;
- estoque zero também impede a inclusão no carrinho;
- editar um produto não altera `image_media_id` nem qualquer objeto no R2.

## Rotas

- `GET /api/painel/stores/:storeId/products` — lista da loja autorizada;
- `POST /api/painel/stores/:storeId/products` — criação;
- `GET /api/painel/stores/:storeId/products/:productId` — leitura isolada;
- `PATCH /api/painel/stores/:storeId/products/:productId` — edição, publicação
  e disponibilidade.

Não há rota `DELETE`. Mutações exigem origem permitida, sessão válida e
membership. O corpo não aceita identificadores de usuário ou tenant.

## Fora do escopo

- upload, substituição ou remoção de imagens — pendente para o Marco 6.2;
- pedidos e histórico de vendas;
- financeiro e relatórios;
- exclusão física de produtos;
- mudanças de schema, migrations, bindings, secrets ou produção;
- criação de contas, lojas ou dados reais das pilotos.

## Evidência local

A suíte do Marco 6.1 usa lojas e contas fictícias para provar listagem separada,
criação tenant-scoped, tentativas de injeção, IDOR, ausência de mutação cruzada,
401/403/404, seleção explícita, persistência, reflexo na vitrine, parsing exato,
limites de estoque e payload e bloqueio de origem hostil. A suíte anterior,
incluindo autenticação, convite, carrinho e checkout para WhatsApp, permanece
como regressão obrigatória.

Validação local: 53 testes passaram (24 gerais e 29 provas TypeScript de
autenticação e catálogo), além de lint sem erros, TypeScript, build Sites e
`git diff --check`. Os dois avisos históricos de `<img>` no painel demonstrativo
permanecem fora deste escopo.

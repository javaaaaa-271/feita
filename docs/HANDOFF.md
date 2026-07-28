# Handoff atual

Atualizado em: **28 de julho de 2026**

Este é o primeiro documento que uma nova sessão deve ler depois do `README`.

## Onde estamos

O Marco 3 de preparação para o primeiro uso real foi concluído localmente na
branch `codex/marco-3-uso-real`. Existe um protótipo navegável e responsivo com:

- painel;
- catálogo;
- cadastro de produto em gaveta lateral;
- upload e prévia local de foto;
- vitrine pública simulada;
- carrinho com variação, quantidade e total;
- checkout com nome da cliente, entrega ou retirada, endereço, pagamento e
  observações;
- mensagem estruturada e URL codificada para abrir o WhatsApp;
- edição, busca, filtros, disponibilidade e estoque do catálogo;
- roteiro não técnico para a rodada com a primeira comerciante.

Os dados ainda vivem apenas no estado do navegador e desaparecem quando a
página recarrega. A produção começa com catálogo vazio. Dados fictícios só
podem ser carregados por uma ação explícita no ambiente de desenvolvimento.

## Marco 3 — preparação para uso real

Concluído em 28 de julho de 2026, sem deploy.

### O que foi implementado

- cadastro e edição preservam descrição, publicação, estoque e opções separadas
  por vírgula;
- produto não publicado não aparece na vitrine;
- produto sem estoque aparece indisponível e não entra no carrinho;
- carrinho consolida o mesmo produto e variação, permite ajustar quantidades e
  respeita o estoque;
- checkout diferencia entrega e retirada, exige endereço para entrega e coleta
  forma de pagamento e observações;
- a etapa de revisão mostra o texto completo antes de oferecer
  **Abrir WhatsApp**;
- a URL `wa.me` usa `encodeURIComponent`, sem enviar a mensagem
  automaticamente;
- busca, filtros por disponibilidade/estoque, categorias da vitrine e cópia do
  link passaram a funcionar;
- os números fictícios de venda e pedido foram removidos do painel;
- metadados do starter foram substituídos pelos da Feita e o idioma do HTML
  passou para `pt-BR`;
- declarações mínimas do runtime Cloudflare foram adicionadas localmente para
  que o TypeScript valide Worker e D1 sem ativar bindings;
- `docs/MARCO_3_USO_REAL.md` contém preparação, cinco roteiros, observação,
  severidade e tabela de ocorrências.

### Testes executados

- baseline antes das alterações: lint com dois avisos preexistentes de `<img>`,
  build e 5 testes passando;
- `npm test`: build Sites validado e 11 de 11 testes passando;
- `npx tsc --noEmit`: passou; antes da declaração local, o comando expunha os
  tipos ausentes de `cloudflare:workers`, `Fetcher` e `D1Database`;
- testes unitários cobrem reais, pedido simples, vários itens, variação,
  entrega, retirada, observação, obrigatórios, carrinho vazio,
  indisponibilidade e codificação da URL;
- teste manual no navegador local cobriu edição, busca, variação, múltiplos
  itens, estoque zero, link copiado, entrega, pagamento, observação, mensagem
  copiada e URL do WhatsApp;
- viewport de 390 × 844 sem rolagem horizontal no checkout ou na vitrine;
- nenhum erro ou aviso foi registrado no console do navegador durante o fluxo;
- `git diff --check`: passou.

### Riscos e bloqueios

- **P0 para compartilhamento externo:** o catálogo é estado local; copiar o link
  não transfere produtos para outro navegador ou aparelho;
- recarregar a página apaga catálogo e carrinho;
- a URL do WhatsApp não contém o número da loja, então a cliente ainda precisa
  escolher o contato;
- fotos usam URL local temporária e não sobrevivem ao recarregamento;
- não existe pedido persistido ou histórico;
- os dois avisos preexistentes de `<img>` permanecem; trocar por `next/image`
  depende de decidir o pipeline definitivo de imagens.

### Próxima ação concreta

Lorenzo deve seguir `docs/MARCO_3_USO_REAL.md` com a primeira comerciante, sem
recarregar a página, executar os cinco pedidos e registrar toda ocorrência P0,
P1 ou P2. Só depois da rodada deve-se decidir se a próxima menor fatia é
persistência do catálogo, configuração do número da loja ou correção de
clareza observada.

O `main` do GitHub foi reorganizado no commit
`9c8b89e66de93e9a572662abb25c5d1568bebd0f`
(`Restore project directory structure`).

O marco de dependências, headers e testes foi consolidado no commit
`13958d35656127cb0a7fb52470368803eb6b70fb`
(`Harden production dependencies and HTTP responses`) e enviado para
`origin/main`.

## Arquitetura atual

- Next.js 16 + React 19;
- Vinext/Vite;
- hospedagem Sites sobre Cloudflare;
- `app/page.tsx` concentra a fatia navegável;
- `app/globals.css` concentra o sistema visual atual;
- `db/schema.ts` está vazio;
- `.openai/hosting.json` mantém o vínculo com o site já existente;
- `app/chatgpt-auth.ts` pertence à proteção do protótipo no ambiente hospedado,
  não à autenticação das clientes da Feita.

## Auditoria de segurança inicial

O protótipo ainda não possui API própria, autenticação de clientes, JWT, queries
SQL ou respostas com dados pessoais. Portanto, rate limit, enumeração de e-mail,
SQL injection e IDOR ainda não têm uma superfície de negócio implementada.

Constatações atuais:

- CORS não refletiu uma origem arbitrária no teste inicial;
- métodos mutáveis na rota principal retornaram `405`;
- headers de segurança contra clickjacking e endurecimento do navegador foram
  adicionados e cobertos por testes automatizados;
- existem alertas de dependências que devem ser reavaliados e corrigidos antes
  da autenticação;
- o upload atual tem apenas validação do navegador, insuficiente para produção.

Detalhes e critérios obrigatórios estão em `docs/SECURITY.md`.

## Dependências reauditas

A primeira ação da fundação segura da Fase 2 foi concluída em 28 de julho de
2026:

- Next.js, React, React DOM, React Server Components, Vite, Wrangler e os
  plugins de Vite/Cloudflare foram atualizados para versões corrigidas;
- `postcss` e `sharp` receberam versões mínimas seguras por `overrides`, porque
  o Next.js 16.2.12 ainda fixa versões transitivas afetadas;
- `npm audit --omit=dev` passou com zero vulnerabilidades;
- a auditoria completa ainda aponta alertas somente em ferramentas de
  desenvolvimento: a cadeia de lint baseada em `brace-expansion` e o
  `drizzle-kit` legado baseado em `esbuild`;
- não foi usado `npm audit fix --force`: as correções propostas trocam versões
  de forma incompatível e precisam aguardar atualização dos pacotes de origem.

Validações executadas:

- `npm run lint`: passou com dois avisos preexistentes de `<img>`;
- `npm test`: passou, incluindo build Vinext, validação do artefato Sites e 1
  teste de HTML;
- `git diff --check`: passou em uma cópia temporária autenticada do repositório
  de origem do Sites, usada porque a pasta de trabalho recebida não contém
  metadados `.git`.

O clone oficial foi restaurado nesta pasta antes do marco seguinte. O remoto
`origin` aponta para `javaaaaa-271/feita`, a branch é `main` e as quatro
alterações deste marco de dependências foram preservadas sem staging.

## Headers de segurança

A segunda ação da fundação segura da Fase 2 foi concluída em 28 de julho de
2026, sem iniciar autenticação:

- o Worker aplica headers de segurança a todas as respostas da aplicação,
  inclusive erros `405` e a rota de otimização de imagens;
- a CSP bloqueia framing, objetos, bases e formulários externos e restringe
  scripts, estilos, imagens, fontes, conexões e workers;
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP e CORP complementam o endurecimento;
- HSTS é enviado somente quando a requisição usa HTTPS;
- CORS usa uma origem de produção fixa, inclui `Vary: Origin` e não reflete
  origens arbitrárias nem habilita credenciais.

Validações executadas:

- `npm run lint`: passou com os dois avisos preexistentes de `<img>`;
- `npm test`: passou com build Vinext, validação do artefato Sites e 5 testes;
- `git diff --check`: passou.

Risco conhecido: o HTML gerado pelo Vinext usa scripts e estilos inline para
hidratação, então a CSP ainda contém `unsafe-inline`. A política deve migrar
para nonces antes de tratar conteúdo não confiável ou ampliar integrações.

## Objetivo arquitetural futuro

Esta sequência permanece aprovada, mas não é a próxima ação. Ela só começa
depois que o uso com a primeira comerciante validar o ciclo local e houver
decisão explícita de avançar para a segunda e a terceira loja.

Ordem proposta:

1. ~~atualizar e reauditar dependências~~ — concluído;
2. ~~adicionar headers de segurança e testes~~ — concluído;
3. ~~registrar a decisão de autenticação e banco~~ — concluído;
4. implementar cadastro, login e sessão persistente;
5. implementar “esqueci minha senha” e redefinição por e-mail;
6. ligar cada usuária à própria loja;
7. provar isolamento com duas contas e duas lojas;
8. só então persistir produtos e imagens.

## Decisão de autenticação e persistência

O `ADR-001-AUTENTICACAO-E-PERSISTENCIA.md` recomenda Better Auth + Cloudflare
D1 + R2 para o primeiro MVP real.

Motivos determinantes:

- a alternativa usa a preparação atual de Worker, Sites, D1 e Drizzle;
- Better Auth mantém sessões revogáveis em cookies `HttpOnly` e processa
  senhas com uma biblioteca dedicada;
- recuperação pode usar OTP digitado, sem token em URL;
- Supabase/PostgreSQL tem a vantagem forte de RLS, mas o caminho SSR
  documentado pressupõe tokens acessíveis ao navegador e exigiria uma camada
  BFF adicional para cumprir a regra `HttpOnly` da Feita;
- manter Supabase Auth com D1 perderia RLS e criaria dois planos operacionais.

Risco principal: D1 não oferece RLS. Toda autorização precisa ocorrer no
servidor, sempre combinando o recurso com o `tenant_id` derivado da sessão.
Testes com duas usuárias e duas lojas continuam sendo critério de parada.

D1 e R2 permanecem `null`; nenhuma dependência, rota, schema ou autenticação foi
adicionada neste marco.

## Dependências para a implementação futura

Quando a autenticação for autorizada, ela exigirá escolhas ou recursos do
usuário:

1. escolher e criar a conta do provedor de e-mail transacional;
2. definir domínio/subdomínio e remetente;
3. disponibilizar as credenciais somente pelo runtime do Sites;
4. autorizar a ativação do binding D1 no projeto existente.

Depois da autorização futura, a primeira ação exata será implementar somente o
Marco A do ADR:
schema mínimo, cadastro com verificação por OTP, login, logout, cookie seguro,
rate limit por IP/e-mail e testes de sessão. Recuperação, loja e produtos ficam
em commits posteriores.

## Validação do marco arquitetural

Executado depois da documentação da decisão:

- `npm run build`: passou e validou o artefato Sites;
- `npm test`: passou com 5 de 5 testes, incluindo a regressão dos headers;
- `npm run lint`: passou sem erros e manteve somente os dois avisos
  preexistentes de `<img>`;
- `npm audit --omit=dev`: zero vulnerabilidades;
- `git diff --check`: passou;
- revisão do diff e busca por segredos: somente documentação do marco, sem
  credenciais ou valores sensíveis.

Não houve novo deploy do Sites: este marco não altera o runtime e a
autenticação incompleta não deve ser publicada.

## Critério do futuro marco de contas

Duas usuárias conseguem:

- criar conta;
- entrar e sair;
- solicitar redefinição de senha sem revelar se o e-mail existe;
- acessar somente a própria loja;
- manter a sessão de forma segura;
- falhar de modo previsível sob tentativas repetidas.

O marco só termina com testes automatizados de headers, autenticação e
isolamento entre lojas.

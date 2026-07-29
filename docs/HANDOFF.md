# Handoff atual

Atualizado em: **29 de julho de 2026**

Este é o primeiro documento que uma nova sessão deve ler depois do `README`.

## Auditoria técnica e transferência de conhecimento

Em 29 de julho de 2026, o estado foi confirmado novamente a partir do Git,
código integrado, configuração Sites em modo somente leitura e validações
locais. `main` e `origin/main` estavam sincronizadas em `bc61719`, sem mudanças
iniciais. O projeto Sites continuava ativo na versão 7, na mesma URL e com
acesso `custom` somente para Lorenzo.

Foi criado `docs/GUIA_TECNICO_FEITA.md` com mapa do sistema, fluxo
slug → D1 → R2, comandos locais, diagnóstico, recuperação sem perda de dados e
três exercícios operacionais. `data/local/` passou a ser ignorado pelo Git para
receber somente fixtures de trabalho locais.

Esta auditoria corrigiu textos antigos que ainda descreviam D1/R2 hospedados
como inexistentes ou desligados. Não houve defeito de runtime no Marco 4:
lint passou sem erros e manteve dois avisos conhecidos de `<img>` no sandbox,
TypeScript passou, 22/22 testes passaram, build/artefato Sites passaram e
`git diff --check` passou. Nenhum dado real foi importado, nenhum recurso,
acesso ou versão Sites foi alterado e não houve deploy ou push.

## Onde estamos

O Marco 4 foi validado, enviado na branch
`codex/marco-4-loja-compartilhavel`, registrado no PR
`https://github.com/javaaaaa-271/feita/pull/1` e integrado por fast-forward à
`main` no commit `6b26557`. As branches dos Marcos 3 e 4 foram preservadas.

O projeto Sites existente publicou a versão 7 com status final `succeeded` em:

https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site

A política `custom` continua permitindo somente Lorenzo, sem grupos. O fluxo
oficial do Sites conectou D1 e R2 pelos bindings `DB` e `STORE_IMAGES` e recebeu
a migration em `dist/.openai/drizzle`. Nenhuma fixture, dado real ou catálogo
foi importado no ambiente hospedado; o checkpoint contém somente código,
schema e recursos vazios. Além do protótipo navegável, agora existe:

- painel;
- catálogo;
- cadastro de produto em gaveta lateral;
- upload e prévia local de foto;
- vitrine pública persistida em `/loja/[slug]`;
- carrinho com variação, quantidade e total;
- checkout com nome da cliente, entrega ou retirada, endereço, pagamento e
  observações;
- mensagem estruturada e URL codificada para o WhatsApp configurado;
- edição, busca, filtros, disponibilidade e estoque do catálogo;
- D1 e R2 locais e hospedados com migration versionada;
- identidade, catálogo, estoque, variações e imagens duráveis;
- carrinho persistido por navegador e separado por slug;
- importador local validado, com dry-run e sem sobrescrita;
- leitura pública isolada por loja e nenhuma API pública de escrita.

O painel em `/` continua sendo o sandbox de sessão do Marco 3 e não administra
o novo catálogo persistido. Autenticação, dados da comerciante, painel
administrativo, persistência de pedidos e importação hospedada não foram
implementados.

## Marco 4 — primeira loja compartilhável

### Decisões

- D1 é a fonte autoritativa de loja/produtos e R2 guarda imagens.
- Preço é inteiro em centavos e todo registro de negócio possui `tenant_id`.
- A rota pública deriva o tenant do slug publicado; IDs enviados pelo cliente
  nunca escolhem outra loja.
- Imagens são validadas, decodificadas, redimensionadas, convertidas para WebP
  e recebem chave aleatória.
- O carrinho pode ficar em `localStorage` porque pertence à cliente; catálogo e
  configuração nunca ficam ali.
- Sem autenticação, a única mutação é o importador local operado por Lorenzo.
- Better Auth permanece a recomendação para autonomia futura da comerciante.

### Testes executados

- migration D1 em estado temporário limpo;
- reabertura de D1/R2 confirmou persistência;
- duas lojas confirmaram ausência de vazamento em catálogo e mídia;
- slug inexistente/loja oculta/produto oculto retornaram estados seguros;
- carrinho descartou produto oculto/sem estoque e limitou quantidade;
- telefone brasileiro, destino direto e texto acentuado foram validados;
- imagem falsa e maior que 10 MB foram recusadas;
- imagem válida virou WebP de até 1800 px sem EXIF/ICC;
- inspeção confirmou que as rotas públicas exportam somente `GET`;
- `npm run lint`: sem erros, com os mesmos dois avisos de `<img>` do Marco 3;
- `npx tsc --noEmit`: passou;
- `npm test`: 22/22 passaram, incluindo build e testes antigos/novos;
- `git diff --check`: passou.

O servidor local respondeu `200` e renderizou a loja fictícia persistida.
Desktop e 390 × 844 foram inspecionados visualmente sem rolagem horizontal.
Catálogo, variação, estoque, carrinho, recarga, checkout, revisão e URL do
WhatsApp passaram sem abrir o WhatsApp. In-app Browser e Chrome viram o mesmo
slug e a imagem R2 persistida, mantendo carrinhos independentes. Não houve erro
da aplicação no console.

### Riscos e próxima ação concreta

- não houve teste em aparelho real;
- o painel de sessão e a vitrine persistida ainda são superfícies separadas;
- pedidos continuam sem persistência, deliberadamente;
- o importador é local e não escreve no D1 hospedado;
- a ferramenta Sites não expôs uma consulta SQL remota para contagem
  independente; a ausência de dados hospedados foi preservada porque o
  checkpoint provisionou recursos novos e executou somente migrations;
- a verificação automatizada do Sites registrou `404` apenas para fontes sob o
  caminho interno `/workspace/sites/...`; não houve exceção do Worker, mas
  Lorenzo deve confirmar tipografia no navegador dele.

Próxima ação: Lorenzo deve abrir a URL publicada no navegador dele, confirmar
acesso, tipografia e navegação e então reunir conscientemente os dados listados
em `data/first-store.template.json`. Uma execução separada deverá preparar o
arquivo ignorado, fazer dry-run, implementar/autorizar o procedimento
administrativo hospedado e só então importar e testar em dois celulares.

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

### Próxima ação registrada no Marco 3 (superada)

Lorenzo deve seguir `docs/MARCO_3_USO_REAL.md` com a primeira comerciante, sem
recarregar a página, executar os cinco pedidos e registrar toda ocorrência P0,
P1 ou P2. Só depois da rodada deve-se decidir se a próxima menor fatia é
persistência do catálogo, configuração do número da loja ou correção de
clareza observada. O Marco 4 local executou a fatia de persistência; a rodada
com a comerciante e qualquer publicação continuam pendentes.

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
- `app/page.tsx` mantém o sandbox operacional do Marco 3;
- `app/loja/[slug]` implementa a vitrine pública persistida;
- `app/globals.css` e o CSS module da vitrine contêm os sistemas visuais;
- `db/schema.ts` define lojas, produtos e mídia;
- D1/R2 estão ativos na emulação local e conectados ao checkpoint hospedado;
  o ambiente hospedado continua sem dados comerciais;
- `.openai/hosting.json` mantém o vínculo com o site já existente;
- a política `custom` do Sites é a proteção efetiva do checkpoint hospedado;
  `app/chatgpt-auth.ts` contém helpers de identidade, mas não é importado pelas
  rotas atuais e não é autenticação das clientes da Feita.

## Auditoria de segurança inicial

O produto ainda não possui autenticação de clientes, JWT ou dados pessoais.
Existe uma API própria somente de leitura para imagens e existem queries D1
parametrizadas. Rate limit e enumeração de e-mail seguem sem superfície porque
não há login; IDOR de leitura foi coberto localmente com duas lojas, enquanto
qualquer mutação autenticada permanece bloqueada.

Constatações atuais:

- CORS não refletiu uma origem arbitrária no teste inicial;
- métodos mutáveis na rota principal retornaram `405`;
- headers de segurança contra clickjacking e endurecimento do navegador foram
  adicionados e cobertos por testes automatizados;
- existem alertas de dependências que devem ser reavaliados e corrigidos antes
  da autenticação;
- o importador local valida e reprocessa imagens no servidor; um futuro upload
  remoto ainda exigirá autenticação e rate limit.

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
8. ligar os adaptadores locais de produtos e imagens aos recursos reais somente
   depois dessas barreiras.

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

Os nomes lógicos `DB` e `STORE_IMAGES`, o schema, a migration e a rota pública
foram adicionados no Marco 4. O projeto Sites conectou os recursos hospedados
no checkpoint controlado, enquanto o importador continua exclusivamente local
e nenhuma loja real foi carregada. Autenticação não foi adicionada.

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

# Handoff atual

Atualizado em: **28 de julho de 2026**

Este é o primeiro documento que uma nova sessão deve ler depois do `README`.

## Onde estamos

A Fase 0 está concluída. Existe um protótipo navegável e responsivo com:

- painel;
- catálogo;
- cadastro de produto em gaveta lateral;
- upload e prévia local de foto;
- vitrine pública simulada;
- carrinho com quantidade e total.

Os dados ainda vivem apenas no estado do navegador e voltam à demonstração
quando a página recarrega.

O `main` do GitHub foi reorganizado no commit
`9c8b89e66de93e9a572662abb25c5d1568bebd0f`
(`Restore project directory structure`).

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

## Próximo objetivo

Transformar a Fase 2 em uma primeira fatia segura, sem tentar construir todos os
módulos de uma vez.

Ordem proposta:

1. ~~atualizar e reauditar dependências~~ — concluído;
2. ~~adicionar headers de segurança e testes~~ — concluído;
3. registrar a decisão de autenticação e banco — próxima ação;
4. implementar cadastro, login e sessão persistente;
5. implementar “esqueci minha senha” e redefinição por e-mail;
6. ligar cada usuária à própria loja;
7. provar isolamento com duas contas e duas lojas;
8. só então persistir produtos e imagens.

## Decisão ainda aberta

O scaffold atual oferece Cloudflare D1, mas a hipótese discutida para o produto
é autenticação gerenciada com PostgreSQL, provavelmente usando Supabase.

Não misturar as duas arquiteturas por acidente. Antes de implementar login,
registrar uma decisão explícita que compare:

- Supabase Auth + PostgreSQL;
- autenticação gerenciada compatível com D1;
- custos, recuperação por e-mail, isolamento multiempresa, operação local,
  implantação no Sites e portabilidade.

Não criar autenticação de senha caseira.

## Critério do próximo marco

Duas usuárias conseguem:

- criar conta;
- entrar e sair;
- solicitar redefinição de senha sem revelar se o e-mail existe;
- acessar somente a própria loja;
- manter a sessão de forma segura;
- falhar de modo previsível sob tentativas repetidas.

O marco só termina com testes automatizados de headers, autenticação e
isolamento entre lojas.

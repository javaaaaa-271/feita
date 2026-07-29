# ADR-001 — Autenticação e persistência do MVP

- Status: **aceita para implementação**
- Data: **28 de julho de 2026**
- Escopo: primeira fatia real da Fase 2

## Contexto

A Feita precisa sair de um protótipo com estado local para um SaaS
multiempresa. O primeiro marco real deve oferecer cadastro, login, logout,
recuperação de acesso, sessão segura e isolamento entre duas lojas antes de
persistir produtos ou imagens.

A arquitetura existente determina parte importante da decisão:

- a aplicação usa Next.js 16, React 19 e Vinext/Vite;
- a entrada final é um Cloudflare Worker;
- o projeto Sites existente já oferece bindings lógicos para D1 e R2;
- `.openai/hosting.json` mantém ambos desligados (`null`);
- `db/index.ts`, `db/schema.ts`, Drizzle e as migrações estão preparados para
  SQLite/D1, mas ainda não existe schema de negócio;
- `app/page.tsx` é cliente e mantém os dados somente em `useState`;
- `app/chatgpt-auth.ts` identifica a pessoa que acessa o protótipo hospedado,
  mas não atende clientes públicas da Feita;
- não existem API de negócio, contas da Feita ou dados reais a migrar.

O fluxo de venda é catálogo → pedido → pagamento manual → WhatsApp. A solução
de identidade e dados precisa proteger esse fluxo sem criar uma segunda
plataforma operacional desnecessária para o MVP.

## Requisitos de decisão

A alternativa escolhida precisa permitir:

- cadastro com verificação de e-mail;
- login e logout com mensagens genéricas;
- recuperação de senha sem token em URL;
- sessão em cookie `HttpOnly`, `Secure` em HTTPS e `SameSite`;
- revogação efetiva da sessão no logout e após recuperação;
- rate limit por IP confiável e por e-mail normalizado;
- nenhuma implementação própria de hash ou verificação de senha;
- nenhuma sessão, credencial ou token em `localStorage`;
- queries parametrizadas;
- `tenant_id` derivado da sessão e autorização, nunca aceito do cliente;
- isolamento entre lojas em toda leitura e mutação;
- upload validado, reprocessado e isolado por loja;
- segredos somente na configuração de runtime;
- começo barato e operação compreensível;
- caminho de migração se o produto superar o banco inicial.

## Alternativas consideradas

### 1. Supabase Auth + PostgreSQL + RLS

#### Pontos favoráveis

- autenticação e banco são gerenciados pelo mesmo fornecedor;
- senhas, sessões, confirmação e recuperação ficam fora do código da Feita;
- PostgreSQL oferece Row Level Security, uma segunda barreira para isolamento
  multiempresa além da autorização no servidor;
- RLS pode aplicar políticas a `SELECT`, `INSERT`, `UPDATE` e `DELETE` usando a
  identidade autenticada;
- o produto inclui banco, Auth e Storage e oferece um plano gratuito para
  validação;
- PostgreSQL é uma base forte para relatórios, integrações e operação mais
  complexa no futuro.

#### Pontos desfavoráveis

- cria um segundo plano de infraestrutura fora do Sites/Cloudflare e deixa sem
  uso a preparação atual de D1;
- cada requisição server-side ao banco ou Auth cruza fornecedores;
- o fluxo SSR documentado pelo Supabase mantém access token e refresh token em
  cookies que também precisam ser acessíveis ao código do navegador. A própria
  documentação não recomenda `HttpOnly` nesse modelo;
- cumprir a regra obrigatória da Feita exigiria um BFF server-only e uma camada
  de sessão diferente do caminho SSR padrão, reduzindo a vantagem de
  simplicidade;
- o plano gratuito pode pausar após uma semana sem atividade; o plano Pro parte
  de US$ 25/mês;
- e-mail transacional de produção continua exigindo SMTP próprio. O remetente
  padrão é limitado e destinado apenas a demonstrações;
- migrações, segredos e observabilidade passam a existir em dois ambientes.

#### Quando reconsiderar

Reavaliar Supabase/PostgreSQL se a Feita precisar de consultas e relatórios que
ultrapassem SQLite/D1, acesso direto controlado por clientes, integrações que
dependam de PostgreSQL ou se os testes mostrarem que a ausência de RLS torna a
autorização do produto difícil de sustentar.

### 2. Better Auth + Cloudflare D1 + R2

Esta alternativa usa uma biblioteca de autenticação, não uma implementação de
senha feita pela Feita. Better Auth gerencia hashes, contas, verificações e
sessões; D1 armazena autenticação e dados de negócio; R2 armazena as imagens.

#### Pontos favoráveis

- encaixa no Worker, no binding D1, no Drizzle e no pipeline de migrações já
  presentes;
- mantém autenticação e dados no mesmo limite operacional do site;
- Better Auth oferece integração com Next.js, SQLite/Drizzle e Cloudflare D1;
- senhas são tratadas pela biblioteca com `scrypt`, sem hash ou verificação
  próprios;
- cookies são `HttpOnly` e `Secure` em produção e podem receber atributos
  explícitos;
- as sessões ficam registradas no banco, permitindo logout e revogação reais;
- o plugin de e-mail OTP permite recuperação por código curto digitado pela
  usuária, sem token de recuperação em URL;
- o limitador pode usar `cf-connecting-ip` e persistir contadores no banco;
- D1 escala a zero, tem cota gratuita de prototipação e não cobra egress do
  próprio banco;
- a aplicação continua sendo a única interface para o banco; nenhum cliente
  recebe credencial de acesso direto.

#### Pontos desfavoráveis

- a Feita passa a operar a biblioteca e suas migrações, embora não implemente
  criptografia de senha;
- e-mail transacional ainda depende de um provedor externo, domínio,
  remetente e credenciais;
- D1 usa semântica SQLite e não oferece a RLS do PostgreSQL. O isolamento por
  loja precisa ser garantido em toda consulta no servidor;
- o rate limit padrão da biblioteca é por IP. O requisito adicional por e-mail
  normalizado exige uma chave durável complementar;
- o plugin de OTP armazena o código em texto simples por padrão e precisa ser
  configurado explicitamente para armazená-lo com hash;
- uma migração futura para PostgreSQL exigirá adaptar o dialeto, as migrações e
  testar a transferência das tabelas de autenticação.

### 3. Autenticação própria do zero

Rejeitada. Armazenar ou verificar senhas, criar tokens e manter recuperação
sem uma biblioteca madura aumentaria risco sem criar valor para o fluxo central
da Feita.

### 4. Supabase Auth com D1 para os dados

Rejeitada para o MVP. A combinação manteria dois fornecedores e dois modelos de
identidade, mas abriria mão da principal vantagem do Supabase/PostgreSQL, que é
RLS junto dos dados de negócio.

## Decisão

Adotar **Better Auth + Cloudflare D1 + R2** para a primeira fatia real do MVP.

Esta decisão não ativa nenhum serviço neste marco. A implementação só começa
depois da escolha do provedor de e-mail e da disponibilidade de domínio,
remetente e segredos de runtime.

O desenho obrigatório será:

1. Better Auth executado somente no servidor, exposto por rotas same-origin.
2. D1 como banco único inicial para contas, sessões, lojas, vínculos e dados de
   negócio.
3. R2 para bytes de imagens e D1 para metadados, posse e estado de
   processamento.
4. Drizzle e migrations versionadas para todo schema.
5. Nenhum acesso direto do navegador a D1 ou R2.
6. Toda operação de negócio recebe um contexto autenticado construído no
   servidor.
7. Toda tabela de negócio contém `tenant_id` obrigatório e indexado.
8. Toda consulta combina o identificador do recurso com o `tenant_id` derivado
   da sessão.
9. Nenhuma rota aceita `tenant_id`, `store_id` ou `user_id` do corpo, da query
   ou de cabeçalho como autorização.

## Perfil de segurança obrigatório

### Cadastro e login

- Better Auth faz hash e verificação de senha; a Feita não substitui nem
  personaliza esse algoritmo no primeiro marco.
- Cadastro usa `autoSignIn: false` e exige verificação de e-mail para que a
  resposta não revele conta já existente.
- A interface traduz falha de credencial, conta ausente e e-mail não verificado
  para uma mensagem genérica.
- O e-mail é normalizado no servidor antes de rate limit ou comparação.

### Sessão

- cookie de sessão com `HttpOnly`, `Secure` em produção, `SameSite=Lax`,
  `Path=/` e sem `Domain`;
- token de sessão nunca aparece em URL, JSON de resposta, log ou storage do
  navegador;
- sessão validada no servidor em toda página, action e rota protegida;
- logout exclui/revoga a sessão no banco antes de limpar o cookie;
- respostas autenticadas e de refresh usam `Cache-Control: private, no-store`;
- presença do cookie pode orientar redirecionamento, mas nunca substituir a
  validação server-side.

### Recuperação

- usar o plugin Email OTP no modo `forget-password`;
- enviar código de uso único, sem link que carregue token;
- armazenar somente hash do OTP;
- expiração curta, rotação no reenvio e limite pequeno de tentativas;
- retornar a mesma mensagem para e-mail existente ou inexistente;
- revogar todas as sessões ao concluir a redefinição;
- não aguardar o envio de e-mail na resposta quando isso criar diferença de
  tempo explorável; usar a execução em background suportada pelo Worker.

### Rate limit

- usar somente `cf-connecting-ip` fornecido pelo perímetro Cloudflare como
  identidade de rede;
- persistir o limite no D1, nunca somente na memória do Worker;
- aplicar limites específicos a cadastro, login, envio e verificação de OTP e
  redefinição;
- complementar o limite por IP com chave derivada de
  `HMAC-SHA-256(lowercase(trim(email)))`, usando uma chave exclusiva de runtime
  e sem guardar o e-mail cru na tabela de contadores;
- responder `429` de forma genérica e sem revelar qual chave atingiu o limite.

### Multiempresa e IDOR

O modelo mínimo será:

- `users`: identidade da biblioteca;
- `sessions`, `accounts`, `verifications` e `rate_limits`: autenticação;
- `tenants`: loja/empresa;
- `tenant_memberships`: vínculo entre pessoa, loja e papel;
- tabelas de negócio com `tenant_id` obrigatório.

O servidor resolve `user_id` pela sessão e `tenant_id` por um vínculo ativo.
Uma camada de repositório recebe esse contexto e não expõe operações sem
tenant. O primeiro teste de integração cria duas usuárias, duas lojas e dois
registros e tenta ler, alterar e excluir o registro alheio por rota, ID, corpo,
query e cabeçalho.

Sem RLS, uma falha nessa camada tem impacto maior. Portanto, qualquer API de
negócio sem teste cruzado entre duas lojas bloqueia deploy de dados reais.

### Upload

- ativar R2 somente no marco de imagens;
- limitar tamanho antes e durante a leitura;
- detectar tipo real, decodificar e reprocessar no servidor;
- remover metadados e gerar chave aleatória controlada pelo servidor;
- guardar no D1 o `tenant_id`, MIME final, tamanho e chave R2;
- servir a imagem somente por rota que valide posse ou por URL pública
  deliberadamente separada para a vitrine;
- nunca confiar em nome, MIME, caminho ou `tenant_id` enviados pelo navegador.

## Consequências

- O primeiro schema real continuará no dialeto SQLite já configurado.
- A ausência de RLS será compensada por um banco inacessível ao cliente,
  autorização server-side centralizada e testes IDOR obrigatórios.
- O provedor de e-mail vira dependência externa mesmo sem um provedor externo
  de banco.
- D1 e R2 permanecem desligados até o início explícito da implementação.
- Não será criada abstração genérica para alternar fornecedores em runtime.
  Interfaces pequenas de sessão, autorização e repositório manterão o domínio
  separado da biblioteca, o que é suficiente para uma migração futura.

## Plano de implementação

### Marco A — conta e sessão

1. Escolher provedor de e-mail, domínio e remetente.
2. Fixar uma versão estável e auditada do Better Auth.
3. Ativar o binding D1 no projeto Sites existente.
4. Criar e revisar migrations de autenticação, `tenants`,
   `tenant_memberships` e rate limit.
5. Montar as rotas same-origin e configurar cookies.
6. Implementar cadastro, verificação OTP, login e logout.
7. Cobrir enumeração, flags de cookie, revogação e rate limit.

### Marco B — recuperação

1. Configurar Email OTP com armazenamento por hash.
2. Implementar solicitação, verificação e nova senha sem token em URL.
3. Revogar todas as sessões após redefinição.
4. Testar expiração, uso único, limite de tentativas e respostas genéricas.

### Marco C — primeira loja

1. Criar loja e vínculo no cadastro verificado.
2. Introduzir `AuthContext`/`TenantContext` server-side.
3. Criar a primeira rota de negócio com query parametrizada e tenant.
4. Executar a suíte IDOR com duas contas e duas lojas.

### Marco D — produtos e imagens

1. Persistir produtos somente depois de A–C aprovados.
2. Ativar R2 e implementar o pipeline seguro de imagem.
3. Separar imagem pública de conteúdo administrativo.
4. Testar arquivo grande, conteúdo inválido, MIME falso e acesso entre lojas.

## Dependências de conta ou escolha do usuário

A implementação deve parar até existirem decisões explícitas para:

- provedor de e-mail transacional;
- domínio e subdomínio usados pela aplicação e pelos e-mails;
- endereço e nome do remetente;
- criação da conta e política de custo do provedor de e-mail;
- segredo do Better Auth gerado e armazenado pelo runtime;
- chave de HMAC do rate limit gerada e armazenada pelo runtime;
- ativação dos bindings D1 e, mais tarde, R2 no projeto Sites existente;
- política de retenção e exclusão de contas e dados.

Nenhuma dessas credenciais deve ser adicionada ao Git. Valores hospedados devem
ser configurados pelo Sites.

## Evidências e fontes

Código local consultado:

- `.openai/hosting.json`;
- `vite.config.ts`;
- `worker/index.ts`;
- `db/index.ts`;
- `db/schema.ts`;
- `drizzle.config.ts`;
- `app/page.tsx`;
- `app/chatgpt-auth.ts`;
- `package.json`.

Documentação oficial consultada em 28 de julho de 2026:

- [Supabase Auth](https://supabase.com/docs/guides/auth);
- [Supabase SSR avançado e cookies](https://supabase.com/docs/guides/auth/server-side/advanced-guide);
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security);
- [Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits);
- [Supabase SMTP para produção](https://supabase.com/docs/guides/auth/auth-smtp);
- [Preços do Supabase](https://supabase.com/pricing);
- [Cloudflare D1](https://developers.cloudflare.com/d1/);
- [Cloudflare D1: prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/);
- [Cloudflare D1: preços](https://developers.cloudflare.com/d1/platform/pricing/);
- [Cloudflare D1: limites](https://developers.cloudflare.com/d1/platform/limits/);
- [Better Auth com Next.js](https://better-auth.com/docs/integrations/next);
- [Better Auth: cookies](https://better-auth.com/docs/concepts/cookies);
- [Better Auth: sessões](https://better-auth.com/docs/concepts/session-management);
- [Better Auth: e-mail e senha](https://better-auth.com/docs/authentication/email-password);
- [Better Auth: Email OTP](https://better-auth.com/docs/plugins/email-otp);
- [Better Auth: rate limit](https://better-auth.com/docs/concepts/rate-limit);
- [Better Auth: adapter Drizzle](https://better-auth.com/docs/adapters/drizzle).

A conclusão de que D1 não acrescenta uma camada equivalente à RLS é uma
inferência arquitetural: a documentação do D1 define semântica SQLite, enquanto
a RLS considerada na alternativa Supabase é um recurso explícito do PostgreSQL.

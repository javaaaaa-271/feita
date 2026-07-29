# Segurança

Este documento transforma a auditoria inicial em critérios de implementação.
Ele não afirma que uma defesa existe antes de haver teste automatizado que a
comprove.

## Estado atual

O painel demonstrativo em `/` continua sendo uma interface com estado local. A
vitrine em `/loja/[slug]` lê loja e produtos do D1 por queries parametrizadas,
e a rota
pública de mídia autoriza no D1 antes de ler os bytes do R2. Ainda não existem
dados persistentes de clientes ou pedidos, administração de catálogo ou
mutações públicas.

Na branch local do Marco 5, Better Auth foi integrado ao D1/Drizzle. Existem
login, logout, recuperação por OTP, convite com digest, sessão revogável,
`store_memberships`, rate limit persistente e `/painel` mínimo. Esse código e a
migration ainda não foram publicados.

O checkpoint hospedado está atrás da política `custom` do Sites, restrita a
Lorenzo. `app/chatgpt-auth.ts` oferece helpers para headers da identidade do
Sites, mas não é importado pelas rotas atuais; não deve ser confundido com
autenticação ou autorização próprias da Feita.

Situação das correções anteriores à primeira autenticação:

- a auditoria após Better Auth aponta quatro alertas moderados no `esbuild`
  antigo puxado pelo `drizzle-kit`; o npm o associa ao grafo de produção por um
  peer opcional do Better Auth, mas esse kit não entra no bundle do Worker;
- a auditoria completa também aponta alertas altos em dependências transitivas
  do lint. As correções automáticas propostas fazem downgrades ou upgrades
  incompatíveis de `drizzle-kit`, ESLint e `eslint-config-next`, por isso não
  foram aplicadas sem uma atualização coordenada das ferramentas;
- headers de endurecimento do navegador foram adicionados na camada final do
  Worker e possuem testes automatizados;
- a arquitetura de autenticação e persistência foi registrada no
  `ADR-001-AUTENTICACAO-E-PERSISTENCIA.md`;
- o importador local valida e reprocessa imagens no servidor; não existe upload
  público.

## Arquitetura aprovada e implementada localmente

A infraestrutura do Marco 4 já usa D1 para a leitura pública de loja/produtos e
R2 para imagens, com recursos hospedados ainda sem dados comerciais. O Marco 5
amplia o D1 local para contas e sessões e monta `/api/auth/*`, mas a produção
continua no checkpoint anterior.

Controles adicionais definidos pela decisão:

- cadastro sem sessão automática e com verificação de e-mail;
- recuperação por OTP digitado, nunca por token em URL;
- OTP armazenado somente com hash, com expiração, rotação e tentativas
  limitadas;
- sessão persistida e revogável em cookie `HttpOnly`, `Secure` em HTTPS,
  `SameSite=Lax`, `Path=/` e sem `Domain`;
- rate limit durável por `cf-connecting-ip` e por HMAC do e-mail normalizado;
- respostas de login, cadastro e recuperação sem enumeração de e-mail;
- `tenant_id` obrigatório e indexado em todas as tabelas de negócio;
- autorização server-side em toda operação e teste IDOR com duas lojas;
- D1 e R2 inacessíveis diretamente ao navegador.

Como D1 não oferece a RLS do PostgreSQL, o teste cruzado entre lojas é uma
barreira de publicação, não uma verificação opcional.

## Controles obrigatórios para autenticação

### Rate limit

- limitar tentativas por IP;
- limitar também por e-mail normalizado ou identidade equivalente;
- aplicar política específica em login, cadastro, recuperação e redefinição;
- responder sem indicar qual dos limites foi atingido de forma explorável.

### Sessões e tokens

- usar cookies `HttpOnly`, `Secure` e `SameSite`;
- não armazenar tokens de sessão em `localStorage`;
- não transportar JWT ou token de sessão em URL;
- não transportar token de recuperação em URL;
- usar tokens de recuperação curtos, de uso único e com expiração;
- revogar sessão e refresh token no logout;
- não registrar tokens completos em logs.

### Enumeração de usuários

Login e recuperação devem responder de forma genérica. O tempo e o formato da
resposta não devem revelar de maneira óbvia se o e-mail existe.

### Dados em respostas

- retornar somente campos necessários;
- nunca retornar hash de senha;
- não retornar tokens internos, segredos, dados de outra loja ou metadados de
  autorização;
- revisar logs e mensagens de erro para evitar PII desnecessária.

## Controles HTTP

- CORS com allowlist explícita;
- `Content-Security-Policy` com `frame-ancestors 'none'`;
- `X-Frame-Options: DENY` como compatibilidade;
- `X-Content-Type-Options: nosniff`;
- política de referência restritiva;
- `Permissions-Policy` mínima;
- HSTS apenas no ambiente HTTPS correto;
- métodos não suportados devem falhar.

### Estado implementado

O Worker aplica os controles a todas as respostas da aplicação, inclusive
erros de método e a rota de otimização de imagens:

- CSP com `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` e
  restrições explícitas para os demais tipos de recurso;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` negando câmera, geolocalização, microfone, pagamentos e
  USB;
- COOP e CORP em `same-origin`;
- HSTS somente em requisições HTTPS;
- CORS restrito à origem de produção fixa, sem credenciais e com
  `Vary: Origin`.

Limitação conhecida: o Vinext injeta scripts e estilos inline durante a
renderização e hidratação. Por compatibilidade, a CSP ainda permite
`unsafe-inline` em `script-src` e `style-src`. A próxima revisão de CSP deve
adotar nonces antes que a aplicação aceite conteúdo não confiável ou novas
integrações externas.

## Banco e multiempresa

- usar queries parametrizadas;
- derivar usuária e loja da sessão validada;
- não confiar em `tenant_id`, `store_id` ou `user_id` enviados pelo cliente;
- aplicar isolamento também no banco quando a tecnologia escolhida permitir;
- usar identificadores não sequenciais sem tratá-los como autorização;
- negar por padrão quando não houver vínculo explícito.

### Teste de parada de linha: IDOR

Criar duas usuárias, duas lojas e registros distintos. A usuária A não pode ler,
alterar ou excluir recursos da loja B:

- pela interface;
- chamando diretamente a rota;
- trocando IDs;
- reutilizando uma URL conhecida;
- alterando corpo, query string ou cabeçalhos.

Qualquer falha nesse conjunto bloqueia publicação.

## Upload de imagens

- limitar tamanho antes e durante a leitura;
- detectar o tipo real do arquivo no servidor;
- permitir somente formatos necessários;
- decodificar e reprocessar a imagem;
- gerar nome controlado pelo servidor;
- impedir execução e entrega com MIME incorreto;
- remover metadados desnecessários;
- isolar arquivos por loja sem confiar no caminho enviado pelo cliente.

## Testes mínimos antes de dados reais

- [x] headers de segurança;
- [x] CORS com origem permitida e origem rejeitada;
- [x] rate limit;
- [x] mensagem genérica de login e recuperação;
- [x] expiração e uso único do token de redefinição;
- [x] logout invalidando sessão;
- [ ] query malformada não alterando a consulta;
- [x] IDOR de leitura/autorização com duas sessões e duas lojas;
- [ ] upload inválido, grande e com MIME falso;
- [x] respostas sem PII ou credenciais desnecessárias nos fluxos de autenticação.

### Evidência local do Marco 4

O Marco 4 adiciona testes locais para query parametrizada e leitura cruzada com
duas lojas, mídia vinculada ao tenant, upload inválido/acima de 10 MB,
reprocessamento WebP sem metadados e ausência de métodos mutáveis nas rotas
públicas. Esses testes reduzem risco, mas não marcam os controles acima como
concluídos para uma operação com dados reais: ainda faltam autenticação,
mutações autorizadas e o teste IDOR completo com duas sessões autenticadas.

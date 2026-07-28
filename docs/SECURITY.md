# Segurança

Este documento transforma a auditoria inicial em critérios de implementação.
Ele não afirma que uma defesa existe antes de haver teste automatizado que a
comprove.

## Estado atual

O protótipo é essencialmente uma interface com estado local. Ainda não existem
endpoints próprios de login, dados persistentes de clientes, queries SQL ou
autorização multiempresa.

Situação das correções anteriores à primeira autenticação:

- as dependências de produção foram atualizadas e
  `npm audit --omit=dev` não aponta vulnerabilidades;
- a auditoria completa ainda aponta alertas em dependências transitivas de
  ferramentas locais (`eslint-config-next` e `drizzle-kit`), sem correção
  compatível oferecida pelos pacotes de origem;
- headers de endurecimento do navegador foram adicionados na camada final do
  Worker e possuem testes automatizados;
- a arquitetura de autenticação e persistência foi registrada no
  `ADR-001-AUTENTICACAO-E-PERSISTENCIA.md`;
- validação de upload limitada ao cliente.

## Arquitetura aprovada, ainda não implementada

A primeira fatia real usará Better Auth no servidor, D1 para contas, sessões e
dados estruturados e R2 para imagens. D1 e R2 continuam desligados e nenhuma
rota de autenticação foi criada neste checkpoint.

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
- [ ] rate limit;
- [ ] mensagem genérica de login e recuperação;
- [ ] expiração e uso único do token de redefinição;
- [ ] logout invalidando sessão;
- [ ] query malformada não alterando a consulta;
- [ ] IDOR com duas lojas;
- [ ] upload inválido, grande e com MIME falso;
- [ ] respostas sem PII ou credenciais desnecessárias.

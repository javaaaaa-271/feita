# Segurança

Este documento transforma a auditoria inicial em critérios de implementação.
Ele não afirma que uma defesa existe antes de haver teste automatizado que a
comprove.

## Estado atual

O protótipo é essencialmente uma interface com estado local. Ainda não existem
endpoints próprios de login, dados persistentes de clientes, queries SQL ou
autorização multiempresa.

Já devem ser corrigidos antes da primeira autenticação:

- dependências com alertas de segurança;
- ausência de headers de endurecimento do navegador;
- validação de upload limitada ao cliente.

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

- headers de segurança;
- CORS com origem permitida e origem rejeitada;
- rate limit;
- mensagem genérica de login e recuperação;
- expiração e uso único do token de redefinição;
- logout invalidando sessão;
- query malformada não alterando a consulta;
- IDOR com duas lojas;
- upload inválido, grande e com MIME falso;
- respostas sem PII ou credenciais desnecessárias.


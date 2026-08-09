# Marco 6.3B — plano do primeiro ensaio remoto

## Estado

**Planejado e bloqueado.** Este documento não autoriza deploy, migration,
criação de recurso, configuração de secret ou qualquer outra operação remota.

O Marco 6.3B existe para provar, com dados exclusivamente sintéticos, que o
artefato preparado no Marco 6.3A funciona em um Cloudflare Worker real. O
ensaio será publicado somente em um endereço isolado de `workers.dev`; não
substituirá o checkpoint Sites, não receberá domínio próprio e não usará dados
de nenhuma loja real.

## Resultado esperado

Ao final do marco, deve existir evidência reproduzível de que o mesmo pacote
revisado localmente consegue operar remotamente com:

- `ASSETS` servindo o build Vinext;
- `DB` ligado a um D1 de ensaio;
- `STORE_IMAGES` ligado a um R2 de ensaio;
- `IMAGES` inspecionando e transformando uploads;
- Better Auth usando secrets de runtime e cookies seguros;
- duas usuárias sintéticas administrando lojas distintas sem acesso cruzado;
- catálogo, imagem e vitrine pública funcionando ponta a ponta.

Passar no Marco 6.3B não autoriza domínio de produção, dados reais ou
substituição do Sites. Essas decisões pertencem a um marco posterior.

## Limites fixos

O ensaio deve obedecer a todos estes limites:

1. usar um Worker de ensaio sem rota ou domínio de produção;
2. preservar integralmente o checkpoint Sites existente;
3. usar somente lojas, produtos, imagens, e-mails e números fictícios;
4. não presumir que os recursos físicos gerenciados pelo Sites são acessíveis
   pela conta Cloudflare do proprietário;
5. preferir D1 e R2 exclusivos do ensaio quando não houver prova inequívoca de
   que um recurso existente é vazio, acessível e seguro para esse uso;
6. manter nomes, IDs de recursos, account IDs e valores de secrets fora do Git;
7. limitar a 25 transformações remotas de imagem em toda a execução;
8. não executar limpeza destrutiva sem autorização própria, salvo contenção de
   emergência previamente autorizada para o Worker exato do ensaio.

## Topologia do ensaio

| Componente | Marco 6.3B | Produção atual |
| --- | --- | --- |
| Aplicação | Worker separado em `workers.dev` | checkpoint Sites preservado |
| D1 | recurso de ensaio com migration e fixtures sintéticas | recurso do Sites sem dados reais e sem alteração |
| R2 | bucket de ensaio com imagens sintéticas | recurso do Sites sem alteração |
| Images | binding do Worker de ensaio | nenhuma mudança no Sites |
| Domínio | somente endereço isolado de `workers.dev` | URL atual permanece igual |
| Usuárias | duas identidades controladas de teste | nenhuma conta ou convite real |

Antes de criar qualquer recurso, o inventário deve resolver a propriedade e a
acessibilidade reais de D1 e R2. Igualdade de nome lógico (`DB` ou
`STORE_IMAGES`) não prova que dois bindings apontam para o mesmo recurso
físico.

## Configuração de runtime

Os bindings lógicos permanecem exatamente os quatro validados no Marco 6.3A.
A configuração remota específica do ensaio deve ser gerada localmente em
arquivo temporário ou ignorado, revisada antes do uso e removida ao final. Ela
não pode substituir silenciosamente `wrangler.jsonc` nem entrar em commit.

| Nome | Tipo | Regra |
| --- | --- | --- |
| `ASSETS` | binding | deve apontar somente para `dist/client` do commit aprovado |
| `DB` | binding D1 | deve apontar somente para o banco sintético inventariado |
| `STORE_IMAGES` | binding R2 | deve apontar somente para o bucket sintético inventariado |
| `IMAGES` | binding | deve estar disponível antes do primeiro upload |
| `BETTER_AUTH_SECRET` | secret | gerar valor forte e exclusivo para o ensaio |
| `RATE_LIMIT_HMAC_SECRET` | secret | gerar valor forte e diferente do secret de autenticação |
| `RESEND_API_KEY` | secret condicional | obrigatório para aprovar recuperação de senha por e-mail |
| `BETTER_AUTH_URL` | variável | origem HTTPS exata do Worker de ensaio |
| `AUTH_TRUSTED_ORIGINS` | variável | allowlist exata, sem curinga, contendo a origem do ensaio |
| `RESEND_FROM` | variável condicional | remetente previamente verificado |

Valores de secret nunca devem aparecer em comando versionado, captura,
relatório, log ou resposta. A ausência dos dois secrets obrigatórios fora de
loopback deve continuar falhando de modo fechado.

## Autorizações separadas

O marco será executado por portões. Uma autorização não libera o portão
seguinte.

### A0 — inventário somente leitura

Autoriza confirmar conta, subdomínio, disponibilidade do nome do Worker,
recursos D1/R2 existentes, bindings possíveis, estado de billing e ausência de
rota de produção. Não autoriza criar, editar ou excluir nada.

### A1 — recursos isolados

Autoriza criar, somente se necessários, o Worker nominal, um D1 e um R2
exclusivos do ensaio. Qualquer pedido inesperado de plano pago, Images Storage,
domínio, rota ou recurso adicional interrompe a execução.

### A2 — configuração e ensaio

Autoriza configurar os secrets e variáveis do Worker exato, aplicar migrations
somente no D1 de ensaio, carregar fixtures sintéticas, publicar o commit
aprovado nesse Worker e executar a matriz de testes. A autorização deve incluir
um procedimento de contenção do Worker de ensaio caso uma falha de segurança o
deixe exposto.

### A3 — limpeza

Autoriza remover exclusivamente Worker, D1, R2, secrets e fixtures criados para
o ensaio, depois de conferir seus nomes e provar que não contêm dados reais.
Sem essa autorização, a execução apenas registra o estado e não apaga recursos.

## Sequência de execução

### Etapa 0 — congelar o candidato

1. confirmar `main` limpa e sincronizada com o repositório oficial;
2. registrar o commit exato cujo código será enviado;
3. repetir lint, TypeScript, testes, build, dry-run e `git diff --check`;
4. comparar o artefato do dry-run com o artefato candidato ao envio;
5. interromper se qualquer arquivo de runtime mudar depois da validação.

O commit documental deste plano pode ficar à frente do commit técnico, desde
que a comparação prove que os bytes do runtime permaneceram iguais.

### Etapa 1 — inventariar sem mutação

1. confirmar a conta Cloudflare autenticada sem registrar identificadores;
2. confirmar que `workers.dev` permanece disponível;
3. verificar se o nome pretendido para o Worker está livre ou pertence
   inequivocamente a este ensaio;
4. listar D1 e R2 sem alterar recursos;
5. determinar se os recursos do Sites são externos à conta ou reutilizáveis;
6. confirmar disponibilidade de `ASSETS` e `IMAGES` no ambiente escolhido;
7. registrar apenas nomes lógicos, estado e decisão, nunca credenciais ou IDs.

Resultado do portão: inventário aprovado ou interrupção sem mutação.

### Etapa 2 — preparar recursos e configuração

1. obter a autorização A1;
2. criar somente os recursos de ensaio que o inventário considerou necessários;
3. gerar a configuração local não versionada com os quatro bindings;
4. revisar o destino de cada binding antes de qualquer migration ou upload;
5. gerar secrets exclusivos e configurar as variáveis da origem de ensaio;
6. confirmar por inspeção que nenhum valor secreto entrou no repositório.

Se o provedor de e-mail ainda não estiver pronto, convite e login podem ser
testados com token sintético administrado localmente, mas a recuperação de
senha não pode ser marcada como aprovada. O marco permanece incompleto até a
entrega real do OTP em uma caixa de teste controlada.

### Etapa 3 — migrar e semear dados sintéticos

1. aplicar todas as migrations versionadas somente no D1 de ensaio;
2. confirmar tabelas e índices esperados sem imprimir dados sensíveis;
3. criar duas lojas fictícias, A e B, com produtos e slugs distintos;
4. gerar dois convites de uso único com tokens fora do Git;
5. aceitar os convites pela própria aplicação para que a Better Auth crie as
   credenciais; nunca inserir ou fabricar hash de senha manualmente;
6. manter o R2 vazio até o teste autenticado de upload.

Qualquer ambiguidade sobre o D1 de destino é falha de parada de linha.

### Etapa 4 — publicar e testar

1. obter a autorização A2;
2. executar um novo dry-run e revisar nome, entrypoint e bindings;
3. publicar somente o Worker de ensaio em `workers.dev`;
4. confirmar que nenhuma rota ou domínio foi criado;
5. executar a matriz abaixo com as duas sessões independentes;
6. interromper no primeiro problema de segurança ou isolamento;
7. registrar evidências sem tokens, cookies, e-mails pessoais ou IDs opacos.

### Etapa 5 — encerrar

1. classificar o ensaio como aprovado, reprovado ou bloqueado;
2. confirmar novamente que o checkpoint Sites não mudou;
3. decidir separadamente entre preservar temporariamente ou limpar os recursos;
4. executar a limpeza somente com A3;
5. atualizar o handoff com resultados, custos observados e próxima ação.

## Matriz obrigatória de validação

| Área | Prova mínima | Aprovação |
| --- | --- | --- |
| Empacotamento | entrypoint e quatro bindings iguais ao dry-run | nenhuma diferença |
| HTTP | HTTPS, HSTS e headers de endurecimento | presentes nas respostas aplicáveis |
| Cookies | sessão `HttpOnly`, `Secure`, `SameSite=Lax`, sem `Domain` | todos os atributos corretos |
| Login | senha correta entra; senha errada retorna mensagem genérica | sem enumeração |
| Logout | sessão anterior deixa de autorizar imediatamente | revogação confirmada |
| Recuperação | OTP chega à caixa controlada, expira e não pode ser reutilizado | fluxo completo aprovado |
| Membership | zero, uma e múltiplas lojas seguem as regras implementadas | nenhuma seleção implícita indevida |
| IDOR A → B | A tenta listar, criar, editar e enviar imagem usando IDs de B | todas as tentativas negadas |
| IDOR B → A | repetição inversa com sessão de B | todas as tentativas negadas |
| Catálogo | criar e editar preço, estoque, disponibilidade e publicação | persistência após recarga |
| Upload | JPEG, PNG e WebP estáticos válidos | saída WebP segura e pública somente quando vinculada |
| Rejeição | SVG, GIF/WebP/APNG animado, arquivo falso, truncado e excessivo | falha fechada antes do R2 público |
| Substituição | trocar imagem e consultar a URL antiga | ponteiro novo válido e mídia antiga não pública |
| Remoção | remover imagem e repetir a leitura pública | 404 genérico sem reversão insegura |
| Rate limit | exceder limite controladamente | 429 sem revelar identidade |
| Vitrine | slug público mostra apenas produtos publicados da própria loja | nenhum dado cruzado |
| Persistência | reiniciar sessão e consultar D1/R2 novamente | dados sintéticos permanecem consistentes |

Os testes IDOR devem chamar rotas diretamente, trocar IDs, alterar corpo e
reutilizar URLs conhecidas. Testar apenas a interface não é suficiente.

## Critérios de aprovação

O Marco 6.3B só é aprovado quando:

- todas as provas obrigatórias passam no mesmo commit e no mesmo Worker;
- nenhuma loja real, domínio de produção ou recurso não inventariado foi usado;
- os quatro bindings apontam para os destinos aprovados;
- autenticação, logout, cookies, rate limit e recuperação passaram remotamente;
- o teste cruzado entre duas lojas não encontrou leitura nem mutação indevida;
- upload, substituição, remoção e leitura pública passaram dentro do orçamento;
- o checkpoint Sites permaneceu byte a byte e operacionalmente inalterado;
- existe decisão explícita sobre limpeza dos recursos de ensaio.

## Critérios de interrupção

Interromper imediatamente diante de:

- cobrança, upgrade ou aceite de termos não previstos;
- dúvida sobre conta, Worker, D1, R2 ou binding de destino;
- tentativa de criar rota, domínio ou modificar o projeto Sites;
- secret ausente, reutilizado, impresso ou incluído em arquivo versionado;
- migration apontando para banco diferente do inventariado;
- diferença entre o artefato validado e o artefato enviado;
- resposta de autenticação que enumere e-mail ou cookie inseguro;
- qualquer indício de IDOR entre as duas lojas;
- upload inválido aceito, mídia antiga ainda pública ou isolamento incorreto no R2;
- uso de dado real;
- vigésima quinta transformação remota já consumida;
- falha inesperada cuja contenção exija ampliar o escopo autorizado.

Uma interrupção não deve ser contornada com force, novo domínio, recurso
adicional, relaxamento de segurança ou alteração improvisada em produção.

## Reversão e contenção

O principal mecanismo de reversão é arquitetural: o ensaio não recebe o
tráfego do site atual. O checkpoint Sites continua sendo a experiência
publicada e não depende do sucesso do novo Worker.

Se o Worker de ensaio apresentar falha de segurança, a autorização A2 deve
permitir conter exclusivamente esse Worker, sem tocar em D1, R2 ou Sites. A
remoção definitiva dos recursos permanece no portão A3. Antes de qualquer
exclusão, é obrigatório confirmar nomes, escopo, ausência de dados reais e
preservação das evidências não sensíveis.

## Evidências e handoff

O relatório final deve registrar:

- commit técnico e hash do artefato enviado;
- versões de Node, Wrangler, Vinext e workerd usadas;
- nomes lógicos dos quatro bindings e classificação dos recursos;
- comandos mutáveis autorizados, sem argumentos sensíveis;
- resultado de cada linha da matriz;
- quantidade de transformações de imagem consumidas;
- falhas, interrupções e contenções;
- confirmação de ausência de domínio, rota, dados reais e alteração no Sites;
- estado final do Worker, D1 e R2 de ensaio;
- recomendação de avançar, corrigir ou abandonar o caminho direto.

O Marco 6.3B começa somente quando a autorização A0 for dada explicitamente.

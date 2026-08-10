# Marco 6.3B — plano do ensaio remoto isolado

## Estado

**Blindagem e portão fechado determinístico implementados localmente; execução
remota bloqueada.** Este documento não autoriza deploy, migration, criação de
recurso, configuração de secret ou qualquer outra operação remota.

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
9. exigir um segredo exclusivo do ensaio em toda requisição antes de consultar
   `ASSETS`, `DB`, `STORE_IMAGES` ou `IMAGES`;
10. limitar cada upload a 8 MiB e reservar atomicamente no D1, antes de entrar
    na aplicação, no máximo 25 tentativas elegíveis e 200 MiB acumulados;
11. manter o otimizador genérico `/_vinext/image` indisponível no ensaio para
    impedir transformações fora do orçamento de uploads autenticados;
12. limitar a existência pública do Worker a 20 minutos desde o primeiro deploy;
13. limitar o portão fechado a 60 segundos desde o deploy, com novas consultas
    somente depois de resultado transitório e a cada 5 segundos.

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
| `ASSETS` | binding | deve apontar somente para `dist/client` do commit aprovado; `assets.run_worker_first` deve ser `true` na fonte e no artefato gerado |
| `DB` | binding D1 | deve apontar somente para o banco sintético inventariado |
| `STORE_IMAGES` | binding R2 | deve apontar somente para o bucket sintético inventariado |
| `IMAGES` | binding | deve estar disponível antes do primeiro upload |
| `BETTER_AUTH_SECRET` | secret | gerar valor forte e exclusivo para o ensaio |
| `RATE_LIMIT_HMAC_SECRET` | secret | gerar valor forte e diferente do secret de autenticação |
| `MARCO_6_3B_ACCESS_SECRET` | secret | valor exclusivo de ao menos 32 bytes; obrigatório no header `x-feita-ensaio-secret` de toda requisição |
| `RESEND_API_KEY` | secret condicional | obrigatório para aprovar recuperação de senha por e-mail |
| `BETTER_AUTH_URL` | variável | origem HTTPS exata do Worker de ensaio |
| `AUTH_TRUSTED_ORIGINS` | variável | allowlist exata, sem curinga, contendo a origem do ensaio |
| `RESEND_FROM` | variável condicional | remetente previamente verificado |

Valores de secret nunca devem aparecer em comando versionado, captura,
relatório, log ou resposta. A ausência dos dois secrets obrigatórios fora de
loopback deve continuar falhando de modo fechado.

O segredo de acesso do ensaio também falha fechado quando está ausente, curto
ou incorreto. O Worker compara dois digests SHA-256 de tamanho fixo com
`crypto.subtle.timingSafeEqual()` e remove o header antes de encaminhar a
requisição à aplicação ou a `ASSETS.fetch()`. Como `assets.run_worker_first` é
obrigatoriamente `true`, a mesma barreira também precede arquivos que existem
em `dist/client`. Requisições recusadas não leem o corpo e não acessam nenhum
dos quatro bindings.

Uploads que passam pelo segredo têm o tamanho real lido com limite rígido de
8 MiB. Somente então uma única instrução `INSERT ... ON CONFLICT DO UPDATE ...
RETURNING` reserva simultaneamente a tentativa e seus bytes na tabela
`marco_6_3b_upload_budget`. Reserva negada encerra a requisição sem entrar no
roteador da aplicação: ela usa apenas essa operação D1 de controle e não alcança
consultas funcionais, Assets, R2 ou Images. Corpos acima de 8 MiB são negados
antes até mesmo dessa reserva.

## Portão fechado determinístico

O executor local `npm run worker:closed-gate` deve ser usado antes de migrations,
fixtures, secrets ou fluxos funcionais. Imediatamente depois do primeiro deploy,
e antes de qualquer consulta HTTP, ele consulta o plano de controle com
`wrangler deployments status --json` e exige que a versão recém-criada seja a
única versão do deployment ativo, com exatamente 100% do tráfego. Divergência de
versão, divisão de tráfego ou resposta inválida do plano de controle é
bloqueadora e impede as consultas.

Cada tentativa consulta, sem segredo, uma rota inexistente e `/favicon.svg`.
O executor recusa qualquer origem que não seja a raiz HTTPS isolada em
`workers.dev`. As duas URLs recebem um nonce não cacheável e headers explícitos
de bypass de cache. O registro omite URL, corpo, nome do Worker e identificadores
e contém somente, para cada resposta:

- categoria e código sanitizado de eventual erro de transporte ou DNS;
- status HTTP;
- tamanho em bytes e hash SHA-256 do corpo;
- valor de `Cache-Control` e se ele é exatamente `private, no-store`;
- valor e presença de HSTS;
- igualdade entre status, tamanho, hash e headers das duas respostas.

O resultado segue uma máquina de estados fechada:

- **aprovado:** ambas as URLs retornam exatamente o 404 genérico esperado,
  `Cache-Control: private, no-store`, HSTS e respostas idênticas;
- **transitório:** exclusivamente erro reconhecido de DNS, conexão ou TLS, ou
  HTTP 523; permite outra tentativa depois de 5 segundos, sem iniciar tentativa
  que ultrapasse 60 segundos contados do deploy;
- **bloqueador:** qualquer 200, resposta funcional, corpo inesperado, outro
  status, header divergente, erro de transporte não reconhecido ou falha do
  plano de controle; não permite repetição e exige reversão imediata.

Como a barreira secreta falha antes do roteador e
`assets.run_worker_first = true`, essas consultas não alcançam `ASSETS`, D1,
R2 ou Images. O D1 e o bucket podem existir vazios porque seus bindings são
necessários ao deploy, mas nenhuma migration ou escrita é permitida antes de o
estado ser **aprovado**.

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
2. criar somente um D1 e um bucket R2 vazios, quando necessários aos bindings;
3. gerar a configuração local não versionada com os quatro bindings;
4. revisar o destino de cada binding antes de qualquer migration ou upload;
5. confirmar que nenhuma migration, fixture, secret ou variável funcional foi
   aplicada antes do portão fechado;
6. confirmar por inspeção que nenhum identificador ou valor secreto entrou no
   repositório.

Se o provedor de e-mail ainda não estiver pronto, convite e login podem ser
testados com token sintético administrado localmente, mas a recuperação de
senha não pode ser marcada como aprovada. O marco permanece incompleto até a
entrega real do OTP em uma caixa de teste controlada.

### Etapa 3 — publicar fechado e aprovar o portão

1. obter a autorização A2;
2. executar um novo dry-run e revisar nome, entrypoint e bindings;
3. publicar somente o Worker de ensaio em `workers.dev`, sem o secret de acesso,
   e iniciar os relógios de 60 segundos e 20 minutos no primeiro deploy;
4. confirmar no plano de controle a versão recém-criada sozinha em 100% do
   tráfego;
5. executar o portão fechado determinístico sem segredo;
6. aprovar somente os dois 404 genéricos idênticos; repetir apenas resultado
   transitório e reverter imediatamente qualquer resultado bloqueador;
7. confirmar que nenhuma rota ou domínio foi criado e que D1 e R2 continuam
   vazios e sem migrations.

Qualquer ambiguidade sobre o D1 de destino é falha de parada de linha.

### Etapa 4 — configurar, migrar, semear e testar

1. continuar somente depois de o portão fechado ser aprovado;
2. gerar secrets exclusivos, configurar as variáveis e instalar o secret de
   acesso sem gravá-lo ou imprimi-lo;
3. como `wrangler secret put` publica nova versão, confirmar novamente no plano
   de controle a nova versão sozinha em 100% e repetir imediatamente as provas
   sem segredo antes de qualquer fluxo funcional;
4. aplicar todas as migrations versionadas somente no D1 de ensaio e confirmar
   tabelas e índices sem imprimir dados sensíveis;
5. criar duas lojas fictícias, A e B, com produtos e slugs distintos;
6. gerar dois convites de uso único com tokens fora do Git e aceitá-los pela
   própria aplicação; nunca inserir ou fabricar hash de senha manualmente;
7. manter o R2 vazio até o teste autenticado de upload;
8. executar a matriz abaixo com as duas sessões independentes;
9. interromper no primeiro problema de segurança, isolamento ou orçamento;
10. registrar evidências sem tokens, cookies, e-mails pessoais ou IDs opacos.

### Etapa 5 — encerrar

1. classificar o ensaio como aprovado, reprovado ou bloqueado;
2. confirmar novamente que o checkpoint Sites não mudou;
3. decidir separadamente entre preservar temporariamente ou limpar os recursos;
4. executar a limpeza somente com A3;
5. atualizar o handoff com resultados, custos observados e próxima ação.

## Matriz obrigatória de validação

| Área | Prova mínima | Aprovação |
| --- | --- | --- |
| Portão fechado | confirmar versão ativa em 100%; consultar rota inexistente e `/favicon.svg` sem segredo | dois 404 genéricos idênticos, `private, no-store` e HSTS, sem acesso a bindings |
| Empacotamento | entrypoint e quatro bindings iguais ao dry-run | nenhuma diferença |
| Barreira secreta | secret ausente, curto ou incorreto em rota comum e upload | 404 genérico antes de qualquer binding |
| Static Assets | solicitar um arquivo real sem secret e repetir com secret válido | sem secret: 404 genérico e `private, no-store`; com secret: arquivo íntegro, sem repassar o header a `ASSETS.fetch()` |
| Orçamento | concorrência acima de 25 tentativas, mais de 200 MiB acumulados e corpo acima de 8 MiB | reserva atômica; nenhuma passagem para Assets, R2 ou Images |
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
- a barreira secreta e o orçamento atômico passam antes das provas funcionais;
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
- barreira secreta ausente ou tentativa de contornar os limites de 25 uploads,
  200 MiB acumulados ou 8 MiB individuais;
- migration apontando para banco diferente do inventariado;
- diferença entre o artefato validado e o artefato enviado;
- deployment diferente da versão esperada ou não direcionado integralmente a ela;
- resultado bloqueador do portão fechado ou expiração de sua janela de 60 segundos;
- janela pública total de 20 minutos atingida;
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

Se o Worker de ensaio apresentar falha de segurança, resultado bloqueador,
perda de controle do orçamento ou atingir 20 minutos desde o primeiro deploy, a
reversão é imediata. Primeiro o Worker é removido e sua ausência é confirmada,
encerrando o acesso público. Depois são registradas apenas contagens não
sensíveis de objetos, bytes, tentativas e transformações; por último, com A3,
são removidos exclusivamente o bucket R2 e o D1 do ensaio. Antes de qualquer
exclusão, é obrigatório confirmar nomes, escopo, ausência de dados reais e
preservação das evidências não sensíveis. Sites, domínio, DNS e produção nunca
participam da reversão.

## Evidências e handoff

O relatório final deve registrar:

- commit técnico e hash do artefato enviado;
- versões de Node, Wrangler, Vinext e workerd usadas;
- nomes lógicos dos quatro bindings e classificação dos recursos;
- comandos mutáveis autorizados, sem argumentos sensíveis;
- resultado de cada linha da matriz;
- quantidade de transformações de imagem consumidas;
- falhas, interrupções e contenções;
- para o portão fechado, estado, número de tentativas, campos sanitizados de
  transporte/HTTP, tamanho e hash dos corpos, headers esperados e igualdade das
  respostas, sem URLs, corpos ou identificadores;
- confirmação de ausência de domínio, rota, dados reais e alteração no Sites;
- estado final do Worker, D1 e R2 de ensaio;
- recomendação de avançar, corrigir ou abandonar o caminho direto.

Uma nova tentativa remota do Marco 6.3B começa somente com autorização explícita
e deve seguir esta versão do plano.

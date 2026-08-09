# Marco 6.3A — pacote local para Worker direto

## Resultado

O Marco 6.3A prepara e valida localmente o artefato Vinext para uma futura
implantação direta em Cloudflare Worker. O pacote reconhece exatamente quatro
bindings:

- `ASSETS`, para os arquivos estáticos gerados pelo Vinext;
- `DB`, para o D1 já previsto pela aplicação;
- `STORE_IMAGES`, para os objetos no R2;
- `IMAGES`, para inspeção e transformação segura das imagens.

O marco não publica o Worker, não cria ou altera recursos Cloudflare e não
modifica dados. Seu resultado é somente código, configuração, testes e um
`wrangler deploy --dry-run` local.

## Arquitetura

### Wrangler como fonte dos bindings

`wrangler.jsonc` é a fonte única da configuração local do Worker. Ele preserva
o entrypoint-fonte `worker/index.ts`, a data e as flags de compatibilidade e os
bindings locais de D1 e R2, e acrescenta:

- `assets.binding = ASSETS`, com `dist/client` como diretório produzido pelo
  build;
- `images.binding = IMAGES`.

O Cloudflare Vite Plugin lê esse arquivo pelo `configPath`. A configuração
inline antiga foi removida para que Vite e Wrangler não voltem a somar cópias
de `DB` e `STORE_IMAGES` no manifesto gerado.

O build Vinext continua partindo de `worker/index.ts` e produz o Worker ESM em
`dist/server/index.js`. O manifesto gerado em `dist/server/wrangler.json`
reaponta `main` para `index.js`, serve os assets de `../client` e conserva uma
única declaração de cada binding.

### Worker direto e checkpoint Sites

O Worker direto é um caminho futuro de implantação fora do fluxo Sites. Nele,
o Wrangler empacota o artefato Vinext e os quatro bindings necessários ao
runtime principal, inclusive `IMAGES`.

O checkpoint Sites atual continua separado e preservado. O plugin `sites()` e
`.openai/hosting.json` permanecem no build, incluindo o vínculo existente e os
bindings lógicos `DB` e `STORE_IMAGES`. O build e a validação do artefato Sites
continuam sendo executados para garantir que esse checkpoint permaneça como
recuperação. Este marco não cria outro projeto Sites, não publica uma nova
versão e não altera o projeto existente.

## Dry-run local

`npm run worker:dry-run` executa a seguinte sequência:

1. constrói o Vinext pelo fluxo validado do projeto;
2. exige `dist/server/index.js` como entrypoint direto;
3. executa Wrangler somente com `deploy --dry-run`;
4. grava bundle, relatório e metadados em um diretório temporário;
5. confirma no resultado real do Wrangler que `ASSETS`, `DB`, `STORE_IMAGES` e
   `IMAGES` aparecem exatamente uma vez e que não há binding adicional;
6. confirma pelo metafile que o único entrypoint empacotado foi
   `dist/server/index.js`;
7. remove o diretório temporário ao terminar, inclusive em caso de falha.

O comando não usa `wrangler deploy` sem `--dry-run`, não autentica, não envia
o bundle e não acessa recursos hospedados.

## Testes de regressão

`tests/worker-deployment.test.mjs` valida:

- a presença estrutural e única dos quatro bindings em `wrangler.jsonc`;
- o entrypoint-fonte e o diretório de assets esperados;
- o consumo explícito de `wrangler.jsonc` pelo Vite sem `localBindingConfig`,
  `d1_databases` ou `r2_buckets` inline;
- o manifesto efetivamente gerado pelo Vinext, com um binding de cada tipo,
  `main = index.js` e assets relativos a `dist/server`;
- o comportamento do dry-run, incluindo entrada e bindings validados.

Os scripts dos testes TypeScript usam `node --import tsx --test`, preservando
os mesmos arquivos e a mesma cobertura sem atualizar dependências.

## Validação local

O fechamento exige, sobre o mesmo estado:

- `npm run lint`;
- `npx tsc --noEmit`;
- `npm test`;
- `npm run worker:dry-run`;
- `npm run build`;
- `git diff --check`.

O build Sites continua sendo parte de `npm run build` e de `npm test`. Nenhuma
migration é executada por esses comandos.

## Ausência de operação remota

Neste marco não houve:

- deploy ou upload de Worker;
- criação de Worker, D1, R2, Images Storage, secret, rota ou domínio;
- migration local ou remota;
- leitura ou escrita de dados hospedados;
- publicação, alteração ou recriação do projeto Sites;
- push ou pull request.

## Portões para o Marco 6.3B

O Marco 6.3B permanece bloqueado até uma autorização explícita e um plano
remoto separado. Antes de qualquer implantação, ele precisa:

1. confirmar a conta e o Worker de destino sem colocar identificadores ou
   credenciais no repositório;
2. mapear `DB` e `STORE_IMAGES` somente para os recursos existentes e confirmar
   a disponibilidade de `IMAGES` e `ASSETS` no ambiente escolhido;
3. provisionar secrets pelo runtime, incluindo autenticação, rate limit e
   e-mail, sem registrar seus valores;
4. definir origem pública, cookies, CORS e URLs da autenticação para o domínio
   real antes de aceitar tráfego;
5. registrar o checkpoint Sites e um procedimento de reversão testável;
6. obter autorização específica para qualquer comando remoto mutável;
7. fazer primeiro um ensaio em `workers.dev` com dados exclusivamente
   sintéticos, cobrindo login, isolamento entre duas lojas, catálogo, upload,
   leitura pública e remoção;
8. parar diante de falha de binding, autenticação, billing, IDOR ou diferença
   entre o pacote revisado e o que seria enviado.

Nenhuma loja real deve ser carregada e nenhum domínio de produção deve ser
movido no mesmo passo do primeiro ensaio.

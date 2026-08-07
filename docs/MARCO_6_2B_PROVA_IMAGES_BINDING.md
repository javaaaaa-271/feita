# Marco 6.2B — prova isolada do Images binding

Data da prova: **6 de agosto de 2026**

## Conclusão

O resultado é **prova remota pendente; não aprovado para integração**.

Atualização do Marco 6.2C: após autorização explícita para registrar o
subdomínio `workers.dev`, as modalidades de binding remoto e preview remoto
executaram as mesmas 14 fixtures sintéticas. Ambas aceitaram 5 transformações
únicas, normalizaram a orientação EXIF, removeram metadata e produziram WebP
válida; os casos proibidos falharam fechados. A classificação atual é **prova
remota aprovada; integração do Images liberada para o próximo marco**. O
registro completo está em `docs/MARCO_6_2C_PROVA_REMOTA_IMAGES.md`.

O spike comprova que a configuração e o fluxo mínimo funcionam na simulação
offline do Wrangler instalado. Essa simulação, porém, não tem fidelidade
suficiente para validar orientação EXIF, remoção de metadata ou o serviço que
será executado na Cloudflare. A inspeção somente leitura do Wrangler informou
que não há uma sessão autenticada. Nenhum login foi iniciado, nenhuma
credencial foi solicitada e nenhuma conta temporária foi usada. Por isso, o
binding remoto e a execução remota do Worker não foram iniciados.

O Marco 6.2 não deve usar esse resultado como autorização para implementar o
upload. A conclusão poderá mudar para “aprovado com restrições” somente depois
da prova remota controlada descrita ao final deste documento.

## Hipótese e arquitetura isolada

A hipótese é que um Worker mínimo consegue receber bytes sintéticos, limitar a
leitura, recusar formatos e animações fora do escopo, usar `IMAGES.info()` para
confirmar a decodificação e dimensões, usar `IMAGES.input()` para transformar
o raster estático e devolver um WebP realmente válido.

O spike fica em `spikes/images-binding/` e possui entrypoint e configurações
Wrangler próprios. Ele não importa código do Feita e não é importado pelo
Worker principal. As configurações contêm apenas `main`,
`compatibility_date` e o binding `IMAGES`; não contêm D1, R2, Assets, secrets,
rotas, domínios ou identificadores de conta. `.openai/hosting.json` não foi
alterado.

As duas rotas de prova são intencionalmente mínimas:

- `POST /info` limita a leitura e registra apenas a inspeção estrutural e o
  resultado normalizado de `IMAGES.info()`;
- `POST /transform` limita a leitura, recusa estrutura proibida, consulta
  `IMAGES.info()`, valida formato e dimensões, transforma com
  `IMAGES.input()`, exige resposta `image/webp`, limita a saída e valida a
  assinatura RIFF/WEBP.

Falhas retornam somente `Imagem rejeitada.`. O spike não persiste bytes nem
registra o conteúdo recebido.

## Runtime e configuração

Versões resolvidas no lockfile e instaladas:

- Wrangler `4.114.0`;
- Miniflare `4.20260722.0`;
- workerd `1.20260722.1`.

O schema incluído nessa versão aceita `images: { binding, remote? }`. Foram
criadas duas configurações sem dados de conta:

- `wrangler.jsonc`: `IMAGES` local, com `remote: false`;
- `wrangler.remote-binding.jsonc`: código local com o binding remoto, usando
  `remote: true`.

A data inicialmente alinhada ao dia da prova, `2026-08-06`, foi recusada pelo
workerd instalado porque a data máxima suportada é `2026-07-29`. As duas
configurações do spike usam `2026-07-29`. O ajuste é local ao spike e não
altera a compatibilidade do Worker do Feita.

Segundo a documentação oficial, `wrangler dev` fornece uma implementação
offline de baixa fidelidade e suporta somente largura, altura, rotação e
formato. Um binding com `remote: true` mantém o código local e envia somente a
operação do binding à Cloudflare; `wrangler dev --remote` executa o Worker e
seus bindings remotamente.

## Limites candidatos

Os limites continuam provisórios e não foram alterados silenciosamente:

- entrada bruta: 8 MiB;
- largura: 4096 px;
- altura: 4096 px;
- área: 16.000.000 pixels;
- saída WebP: 4 MiB;
- formatos: JPEG, PNG e WebP estáticos;
- maior dimensão de saída: 1800 px, preservando a proporção.

O limite bruto é aplicado durante a leitura do stream, além da verificação
antecipada de `Content-Length`. O limite de pixels é aplicado depois da
decodificação por `.info()` e antes de `IMAGES.input()`. A saída também é lida
com limite. A documentação da Cloudflare permite até 20 MB por imagem no
binding; os 8 MiB do Feita são, portanto, um limite de produto mais restrito.

## Fixtures sintéticas

O gerador local cria 14 fixtures sem dados reais:

1. JPEG, PNG e WebP estáticos válidos;
2. JPEG 40 × 20 com orientação EXIF 6;
3. JPEG com marcador EXIF sintético identificável;
4. SVG;
5. GIF válido com dois frames;
6. WebP válido com dois frames;
7. PNG válido com chunks APNG `acTL` e `fcTL`;
8. JPEG truncado;
9. bytes que não representam imagem, declarados como PNG;
10. JPEG declarado pelo cliente como PNG;
11. PNG 4096 × 4096, acima de 16 megapixels;
12. fluxo de 8 MiB mais um byte.

As fixtures e os resultados gerados ficam em diretórios específicos ignorados
por Git. `sharp` é usado somente pelo gerador e pelo verificador Node; não é
importado pelo Worker-prova nem pelo artefato de produção.

## Resultado da simulação local

Comando de servidor: `wrangler dev --local`, usando a configuração isolada.
Todas as 14 fixtures foram exercitadas. Houve 6 requisições aceitas que
representam 5 transformações únicas, pois a prova de `Content-Type` reutiliza
os mesmos bytes do JPEG estático. A simulação local do Images não tem cobrança.

| Fixture | `.info()` offline | Estrutura | Transformação | Evidência da saída |
| --- | --- | --- | --- | --- |
| JPEG estático | `image/jpeg`, 64 × 40 | estático | aceita | WebP, RIFF/WEBP, 80 B, 64 × 40 |
| PNG estático | `image/png`, 64 × 40 | estático | aceita | WebP, RIFF/WEBP, 80 B, 64 × 40 |
| WebP estático | `image/webp`, 64 × 40 | estático | aceita | WebP, RIFF/WEBP, 84 B, 64 × 40 |
| JPEG EXIF 6 | `image/jpeg`, 40 × 20 | estático | aceita | WebP 40 × 20; orientação não normalizada offline |
| JPEG com metadata | `image/jpeg`, 48 × 32 | estático | aceita | WebP 78 B; marcador, EXIF, ICC e XMP ausentes |
| SVG | `image/svg+xml`, sem dimensões | SVG | rejeitada antes de `input()` | erro genérico |
| GIF animado | `image/gif`, 1 × 1 | 2 frames | rejeitada antes de `info()` no fluxo final | erro genérico |
| WebP animado | `image/webp`, 1 × 1 | chunks `ANIM`/`ANMF` | rejeitada antes de `info()` no fluxo final | erro genérico |
| APNG | `image/png`, 64 × 40 | chunk `acTL` | rejeitada antes de `info()` no fluxo final | erro genérico |
| JPEG truncado | erro genérico | truncado | rejeitada antes de `input()` | sem saída |
| conteúdo falso | erro genérico | desconhecido | rejeitada antes de `input()` | sem saída |
| JPEG declarado PNG | `image/jpeg`, 64 × 40 | JPEG real | aceita | WebP válido; header do cliente ignorado |
| 4096 × 4096 | `image/png`, 4096 × 4096 | estático | rejeitada após `info()`, antes de `input()` | sem saída |
| 8 MiB + 1 byte | não consultado | limite excedido | 413 antes do binding | erro genérico |

O endpoint de diagnóstico `/info` foi chamado separadamente para observar o
binding. Na simulação, `.info()` informou formato e dimensões de GIF, WebP e
PNG animados, mas não informou que havia animação. Logo, a decisão de segurança
não depende de `.info()`: o spike conta frames GIF e procura chunks
`ANIM`/`ANMF` em WebP e `acTL` em PNG, sempre com leitura já limitada.

A saída estática foi validada para além do status HTTP: `Content-Type`, bytes
RIFF/WEBP, dimensões, número de páginas, tamanho e ausência de metadata foram
inspecionados com um decoder independente. O JPEG de metadata continha o
marcador antes da transformação e não o continha depois.

A orientação EXIF **não foi normalizada no modo offline**: a saída permaneceu
40 × 20, em vez dos 20 × 40 visualmente orientados. Essa divergência é a prova
concreta de que o modo local não valida o comportamento de alta fidelidade.

## Modos remotos

| Modalidade | Onde roda o código | Binding | Resultado | Transformações remotas |
| --- | --- | --- | --- | ---: |
| simulação local | máquina local | simulado | executada, baixa fidelidade | 0 |
| binding remoto | máquina local | serviço Cloudflare | não executado: Wrangler sem autenticação | 0 |
| Worker remoto | Cloudflare | serviço Cloudflare | não executado: Wrangler sem autenticação | 0 |

Antes de qualquer tentativa remota, `wrangler whoami` foi executado em modo
somente leitura e informou que não havia autenticação. A disponibilidade do
Images na conta e o plano associado permanecem desconhecidos. De acordo com os
portões do marco, o trabalho parou aí: não houve login, token, conta temporária,
ativação de Images, método de pagamento, Worker temporário ou transformação
remota.

## Garantias documentadas e evidências empíricas

Garantias documentadas pela Cloudflare:

- o binding recebe bytes com `env.IMAGES.input(stream)` e aceita entrada de
  até 20 MB;
- `env.IMAGES.info(stream)` retorna formato, tamanho do arquivo, largura e
  altura, e chamadas de `info()` são gratuitas;
- WebP é um formato de saída suportado;
- o modo offline é uma aproximação de baixa fidelidade;
- metadata é descartada nas saídas WebP e PNG do serviço de transformação, e
  perfis de cor e rotação EXIF são aplicados durante o processamento;
- GIF/WebP animados e SVG estão entre os formatos de entrada aceitos pelo
  serviço em geral, o que não atende sozinho à política mais restrita do Feita.

Evidências empíricas desta prova local:

- JPEG, PNG e WebP estáticos foram decodificados e produziram WebP válido;
- arquivo falso e JPEG truncado falharam;
- `.info()` offline não expôs animação nas fixtures GIF, WebP e APNG;
- a detecção estrutural recusou animações e SVG antes da transformação;
- o `Content-Type` declarado não decidiu o formato;
- o limite bruto, o limite de pixels e o limite de saída falharam fechados;
- a metadata sintética foi removida offline;
- a orientação EXIF não foi normalizada offline.

Ainda não foram comprovados no runtime remoto: decodificação de todas as
fixtures, normalização EXIF, remoção de metadata, assinatura/tamanho WebP,
respostas de erro, disponibilidade do binding na conta e aderência do plano.

## Cobrança e recursos remotos

A documentação atual informa um plano Images Free padrão com até 5.000
transformações únicas por mês; ao excedê-lo, novas transformações falham com o
erro 9422 e não geram cobrança. No plano pago, as primeiras 5.000 estão
incluídas e o excedente custa US$ 0,50 por mil transformações únicas. Chamadas
de `.info()` são gratuitas. Contas com billing legado podem receber o erro
9432 e exigir atualização de plano; essa atualização não está autorizada.

Esta prova executou **0 transformações remotas**, portanto não consumiu cota
remota do Images. Nenhum recurso remoto foi criado, alterado ou removido.
D1, R2, Sites, bindings existentes, secrets, rotas, domínios e produção não
foram tocados.

## Validação local final

- `npm run lint`: passou sem erros, mantendo apenas os dois avisos antigos de
  `<img>` em `app/page.tsx`;
- `npx tsc --noEmit`: passou;
- `npm test`: passou com 24 testes gerais e 47 provas TypeScript, totalizando
  71 testes e preservando os 64 anteriores;
- `npm run build`: passou e validou o artefato Sites existente;
- `npm run test:images-spike`: passou com 7 de 7 testes;
- `git diff --check`: passou;
- a busca no artefato e nas fontes de produção não encontrou import ou nome do
  spike.

## Requisitos para o Marco 6.2C

Uma continuação controlada deve receber autorização explícita para usar uma
sessão Wrangler já autenticada, sem compartilhar credenciais. Antes de
transformar qualquer fixture, deve confirmar em modo somente leitura:

1. a conta correta e a disponibilidade prévia do Images Free ou de um plano já
   ativo, sem ativar billing;
2. que o binding remoto isolado não conecta D1, R2, Assets ou secrets;
3. que `wrangler dev --remote` não cria deployment, rota ou Worker permanente
   nessa versão do Wrangler;
4. que nenhum erro exige plano pago, método de pagamento ou migração de
   billing.

Se os portões passarem, deve executar as mesmas 14 fixtures no binding remoto
com código local e na execução remota, mantendo no máximo 25 transformações
únicas por modalidade. A prova precisa comparar `.info()`, animação,
decodificação, orientação EXIF, remoção do marcador, RIFF/WEBP, Content-Type,
dimensões e tamanho. Ao final, deve confirmar por inspeção somente leitura que
não ficou recurso persistente.

Qualquer exigência de ativação de plano, método de pagamento, criação manual de
Worker, deployment permanente ou alteração da conta interrompe a prova e
exige nova autorização.

## Fontes oficiais

- [Images binding](https://developers.cloudflare.com/images/optimization/binding/)
- [Formatos e limites](https://developers.cloudflare.com/images/get-started/limits/)
- [Bindings locais e remotos](https://developers.cloudflare.com/workers/local-development/bindings-per-env/)
- [Desenvolvimento local e execução remota](https://developers.cloudflare.com/workers/local-development/)
- [Configuração do Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Funcionalidades de transformação](https://developers.cloudflare.com/images/optimization/features/)
- [Preço do Cloudflare Images](https://developers.cloudflare.com/images/pricing/)
- [Erros e billing legado](https://developers.cloudflare.com/images/reference/troubleshooting/)

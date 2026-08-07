# Marco 6.2C — prova remota controlada do Images binding

Data da conclusão: **7 de agosto de 2026**

## Classificação

O resultado é **prova remota aprovada; integração do Images liberada para o
próximo marco**.

A tentativa inicial de 6 de agosto parou corretamente antes de qualquer chamada
remota porque a conta ainda não possuía um subdomínio `workers.dev`. Depois de
autorização explícita do proprietário, o subdomínio foi registrado e as duas
modalidades previstas foram executadas com fixtures sintéticas.

A aprovação comprova o comportamento remoto do Images binding para a política
de entrada e transformação do spike. Ela não publica o Feita e não integra, por
si só, upload, substituição ou remoção de imagens ao código de produção.

## Estado e isolamento

A prova partiu da branch
`codex/marco-6-2c-prova-remota-images`, com HEAD
`abbb773b2cb3574aace3566c0671ef59ef7bd148` e árvore limpa.

Versões efetivas:

- Wrangler `4.114.0`;
- Miniflare `4.20260722.0`;
- workerd `1.20260722.1`.

O Worker-prova `feita-images-binding-spike` contém somente o entrypoint
isolado e o binding `IMAGES`. Não possui D1, R2, Assets, secrets, service
bindings, filas, rotas, domínio de produção ou identificadores de conta. O
spike não é importado pelo Worker principal e `.openai/hosting.json` não foi
alterado.

Nenhuma fixture contém dado comercial ou pessoal. Os relatórios brutos ficam
em `spikes/images-binding/.results/`, ignorados pelo Git.

## Limites de plano e execução

A prova usou apenas transformações de imagens externas disponíveis no Images
Free. Não houve ativação de Images Paid, método de pagamento, upgrade,
assinatura ou Images Storage.

Foram autorizadas no máximo 25 transformações que alcançassem
`IMAGES.input().transform().output()`. O roteiro registrou 5 transformações
únicas aceitas em cada modalidade, total operacional de 10.

## Modalidade A — binding remoto com código local

Comando executado:

```text
npx wrangler dev --config spikes/images-binding/wrangler.remote-binding.jsonc --port 8792
```

O Worker permaneceu local em `127.0.0.1:8792` e somente o binding
`IMAGES`, configurado com `remote: true`, foi resolvido pela Cloudflare.

Resultado:

- 14 fixtures transmitidas;
- 5 transformações únicas aceitas;
- orientação EXIF normalizada;
- metadata sintética removida;
- saída WebP válida com uma página;
- nenhuma divergência em relação à política esperada.

## Modalidade B — preview remoto temporário

Comando executado:

```text
npx wrangler dev --remote --config spikes/images-binding/wrangler.jsonc --port 8792
```

O Wrangler informou que esse modo foi substituído pelo modelo mais novo de
bindings remotos, mas iniciou o preview temporário normalmente. A sessão foi
encerrada com `Ctrl + C` depois da bateria. Não houve `wrangler deploy`.

Resultado:

- 14 fixtures transmitidas;
- 5 transformações únicas aceitas;
- orientação EXIF normalizada;
- metadata sintética removida;
- saída WebP válida com uma página;
- matriz idêntica à modalidade A.

## Matriz remota consolidada

| Fixture | Binding remoto | Preview remoto | Evidência |
| --- | --- | --- | --- |
| JPEG estático | aceita | aceita | `image/jpeg`, 64×40, WebP válida |
| PNG estático | aceita | aceita | `image/png`, 64×40, WebP válida |
| WebP estático | aceita | aceita | `image/webp`, 64×40, WebP válida |
| JPEG com orientação EXIF | aceita | aceita | orientação normalizada para 20×40 |
| imagem com metadata sintética | aceita | aceita | metadata removida |
| SVG | rejeitada (400) | rejeitada (400) | formato vetorial proibido |
| GIF animado | rejeitada (400) | rejeitada (400) | animação proibida |
| WebP animado | rejeitada (400) | rejeitada (400) | animação proibida |
| APNG | rejeitada (400) | rejeitada (400) | animação proibida |
| JPEG truncado | rejeitada (400) | rejeitada (400) | conteúdo inválido |
| conteúdo falso | rejeitada (400) | rejeitada (400) | bytes não formam imagem |
| bytes JPEG com Content-Type divergente | aceita | aceita | conteúdo real identificado pelos bytes |
| excesso de pixels | rejeitada (400) | rejeitada (400) | limite dimensional aplicado |
| 8 MiB + 1 byte | rejeitada (413) | rejeitada (413) | limite de corpo aplicado |

O caso de `Content-Type` divergente reutiliza bytes JPEG válidos e não cria uma
sexta transformação única no resumo do roteiro. Isso confirma que a decisão é
baseada no conteúdo efetivo, não apenas no cabeçalho declarado.

## Conclusão técnica

A execução remota corrige a lacuna observada na simulação offline do Marco
6.2B: a orientação EXIF foi normalizada e a metadata foi removida. Os dois modos
remotos apresentaram o mesmo comportamento para todas as 14 fixtures.

Ficam comprovados para o próximo marco:

- inspeção do conteúdo real antes da transformação;
- aceitação somente de JPEG, PNG e WebP estáticos;
- rejeição de formatos animados, vetoriais, corrompidos ou excessivos;
- normalização de orientação EXIF;
- remoção de metadata;
- saída WebP válida com uma página.

## Recursos e produção

O preview remoto temporário foi encerrado. Não houve comando de deploy
permanente, publicação do Feita, migration, alteração de D1/R2/Sites, rota de
produção, secret, binding persistente do app ou uso de Images Storage.

O subdomínio `workers.dev` permanece como configuração técnica da conta,
separada do domínio futuro do produto.

## Próximo marco

A prova libera a implementação controlada do fluxo autenticado:

1. receber a imagem no painel;
2. aplicar os limites comprovados antes da persistência;
3. transformar a saída para WebP pelo binding `IMAGES`;
4. gravar no R2 sob chave derivada no servidor;
5. atualizar `image_media_id` dentro do tenant autorizado;
6. preservar substituição e remoção seguras;
7. cobrir IDOR, falhas parciais e limpeza do objeto anterior.

Esse trabalho deve ocorrer em uma única branch funcional nova depois que os
marcos comprovados forem integrados à `main`. A publicação, bindings de
produção, migrations e dados reais continuam exigindo autorização própria.

## Fontes oficiais

- [Preço do Cloudflare Images](https://developers.cloudflare.com/images/pricing/)
- [Images binding](https://developers.cloudflare.com/images/optimization/binding/)
- [Bindings por modo de desenvolvimento](https://developers.cloudflare.com/workers/local-development/bindings-per-env/)
- [Desenvolvimento local e remoto](https://developers.cloudflare.com/workers/local-development/)
- [Erros do Cloudflare Images](https://developers.cloudflare.com/images/reference/troubleshooting/)

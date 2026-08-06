# Marco 6.2C — prova remota controlada do Images binding

Data da tentativa: **6 de agosto de 2026**

## Classificação

O resultado é **prova remota bloqueada; integração bloqueada**.

A sessão Wrangler estava autenticada, mas a conta ainda não possuía o
subdomínio `workers.dev` exigido para iniciar o ambiente de desenvolvimento
remoto. O Wrangler ofereceu registrar esse subdomínio. Como isso altera a
configuração da conta e não estava autorizado, a prova parou antes de iniciar
qualquer servidor, enviar fixture ou chamar o Images binding.

Não houve tentativa de contornar o portão com login, conta temporária,
deployment, criação de Worker, ativação de plano ou alteração de billing.

## Estado inicial e isolamento

A tentativa partiu do commit aprovado do Marco 6.2B,
`c3c3fe9bdaf77438ba1e06bbccf8b184bb307d30`, com árvore limpa. A branch do
marco é `codex/marco-6-2c-prova-remota-images`.

Versões efetivas:

- Wrangler `4.114.0`;
- Miniflare `4.20260722.0`;
- workerd `1.20260722.1`.

O schema instalado confirma que o objeto `images` aceita somente `binding` e
o booleano opcional `remote`; `binding` é obrigatório. A configuração
`wrangler.remote-binding.jsonc` contém apenas o entrypoint isolado, a
`compatibility_date` já comprovada e `IMAGES` com `remote: true`. Não contém
D1, R2, Assets, secrets, service bindings, filas, rotas, domínios ou
identificadores de conta.

O nome do Worker-prova foi consultado em modo somente leitura antes da
conclusão: não havia deployment nem histórico de versões com esse nome. O
spike continua sem importação pelo Worker principal, e
`.openai/hosting.json` não foi alterado.

## Portões de plano e cobrança

A documentação oficial vigente informa que todas as contas ficam, por padrão,
no Images Free e que transformações de imagens externas estão disponíveis no
Free. O plano inclui até 5.000 transformações únicas por mês. Ao ultrapassar o
limite, novas transformações falham com o erro 9422 e não há cobrança
automática. Chamadas de `IMAGES.info()` não são cobradas.

Cloudflare Images Storage é uma capacidade do plano Paid e não foi usado. Não
houve ativação de Images Paid, método de pagamento, upgrade, mudança de
assinatura ou acesso a storage.

O erro 9432 documentado para billing legado não ocorreu. A prova foi bloqueada
antes pela ausência do subdomínio de desenvolvimento Workers.

## Modalidade A — binding remoto com código local

Configuração selecionada:

```json
{
  "name": "feita-images-binding-spike",
  "main": "src/worker.ts",
  "compatibility_date": "2026-07-29",
  "images": {
    "binding": "IMAGES",
    "remote": true
  }
}
```

Essa modalidade manteria o Worker local e encaminharia somente operações do
binding marcado com `remote: true` para a Cloudflare. Ao iniciar a sessão, o
Wrangler interrompeu antes do estado `Ready` e exigiu o registro prévio de um
subdomínio `workers.dev`. A opção oferecida pela CLI apontava para onboarding
da conta, portanto não foi aceita.

Consequências:

- nenhum endpoint local ficou disponível;
- nenhuma fixture foi enviada;
- `IMAGES.info()` não foi chamado remotamente;
- `IMAGES.input().transform().output()` não foi chamado;
- o processo terminou com falha e não permaneceu em execução.

## Modalidade B — Worker remoto

Não foi iniciada. A documentação do Wrangler informa que
`wrangler dev --remote` envia o código a um ambiente temporário de preview na
Cloudflare e conecta todos os bindings remotamente. Essa modalidade depende do
mesmo ambiente Workers que a CLI acabara de bloquear por ausência do
subdomínio. Iniciá-la novamente só repetiria o portão ou ofereceria a mesma
alteração de conta proibida.

Não houve upload de código, sessão temporária de preview, prompt aceito,
deployment ou servidor remoto.

## Matriz da tentativa

| Fixture | Binding remoto, código local | Worker remoto |
| --- | --- | --- |
| JPEG estático | não executada: sessão bloqueada | não executada: portão compartilhado |
| PNG estático | não executada: sessão bloqueada | não executada: portão compartilhado |
| WebP estático | não executada: sessão bloqueada | não executada: portão compartilhado |
| JPEG com orientação EXIF | não executada: sessão bloqueada | não executada: portão compartilhado |
| imagem com metadata sintética | não executada: sessão bloqueada | não executada: portão compartilhado |
| SVG | não executada: sessão bloqueada | não executada: portão compartilhado |
| GIF animado | não executada: sessão bloqueada | não executada: portão compartilhado |
| WebP animado | não executada: sessão bloqueada | não executada: portão compartilhado |
| APNG | não executada: sessão bloqueada | não executada: portão compartilhado |
| JPEG truncado | não executada: sessão bloqueada | não executada: portão compartilhado |
| conteúdo falso | não executada: sessão bloqueada | não executada: portão compartilhado |
| bytes divergentes do Content-Type | não executada: sessão bloqueada | não executada: portão compartilhado |
| excesso de pixels | não executada: sessão bloqueada | não executada: portão compartilhado |
| 8 MiB + 1 byte | não executada: sessão bloqueada | não executada: portão compartilhado |

Total de tentativas que alcançaram a transformação remota: **0 de 25**.
Total de fixtures transmitidas: **0**.

Por isso, o Marco 6.2C não produz nova evidência empírica sobre `.info()`,
decodificação, orientação EXIF, remoção de metadata, saída WebP ou equivalência
entre as modalidades. Permanecem válidas somente as evidências offline do
Marco 6.2B.

## Inspeção posterior e recursos temporários

Depois da falha, consultas somente leitura de deployments e versões para o
nome isolado retornaram ausência de Worker ou histórico. Como nenhum Worker
existia, não havia rota, domínio, versão de produção ou binding persistente
associado ao spike. O código e a configuração também não possuem operação de
Cloudflare Images Storage.

O Wrangler gerou apenas seu log diagnóstico local fora do repositório. Ele não
foi commitado e seu caminho, conteúdo operacional e identificadores não são
reproduzidos neste documento. Não foi executada limpeza destrutiva.

Nenhum recurso foi criado, alterado ou removido em D1, R2, Sites, Images
Storage ou produção. Nenhuma migration, versão Sites, deployment, rota,
domínio, secret ou binding persistente foi criado.

## Validação local final

- `npm run lint`: passou sem erros e manteve somente os dois avisos antigos de
  `<img>` em `app/page.tsx`;
- `npx tsc --noEmit`: passou;
- `npm test`: passou com 24 testes gerais e 47 provas TypeScript, totalizando
  71 testes;
- `npm run build`: passou e validou o artefato Sites existente;
- `npm run test:images-spike`: passou com 7 de 7 testes;
- `git diff --check`: passou;
- o artefato principal continua sem referência ao spike.

## Próximo portão

Para repetir a prova, o proprietário precisa autorizar explicitamente uma das
duas condições abaixo, sem fornecer credenciais ao código ou à documentação:

1. registrar o subdomínio `workers.dev` na conta já autenticada; ou
2. executar o spike em outra conta previamente preparada para desenvolvimento
   Workers e com Images Free disponível.

Essa autorização deve ser tratada como alteração de conta separada. Depois que
o portão existir, a prova deve recomeçar confirmando branch, HEAD, árvore,
autenticação, plano e ausência do Worker-prova. As duas modalidades devem usar
as mesmas 14 fixtures e manter o teto agregado de 25 chamadas que realmente
alcancem `IMAGES.input().transform().output()`.

Até essa prova passar, continuam bloqueados: integração do Images ao Feita,
upload, migração de hospedagem, uso de D1/R2 pelo spike e qualquer deploy de
preview ou produção.

## Fontes oficiais

- [Preço do Cloudflare Images](https://developers.cloudflare.com/images/pricing/)
- [Images binding](https://developers.cloudflare.com/images/optimization/binding/)
- [Bindings por modo de desenvolvimento](https://developers.cloudflare.com/workers/local-development/bindings-per-env/)
- [Desenvolvimento local e remoto](https://developers.cloudflare.com/workers/local-development/)
- [Erros do Cloudflare Images](https://developers.cloudflare.com/images/reference/troubleshooting/)

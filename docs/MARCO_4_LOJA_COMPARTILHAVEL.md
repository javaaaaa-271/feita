# Marco 4 — primeira loja compartilhável

Status: **checkpoint controlado publicado na versão Sites 7; recursos
hospedados vazios e acesso restrito a Lorenzo**.

Este marco cria a menor fatia em que uma vitrine é identificada por slug e seu
catálogo deixa de depender da sessão do painel. Nada neste documento autoriza
criação de recursos Cloudflare, bindings remotos, autenticação externa,
importação de dados reais ou deploy.

## Arquitetura

- `/` continua sendo o protótipo operacional do Marco 3, com estado de sessão.
- `/loja/[slug]` é a nova vitrine pública autoritativa, renderizada no servidor.
- D1 guarda loja, catálogo e metadados de imagens.
- R2 guarda somente os bytes de imagens já reprocessadas.
- `/api/public/stores/[slug]/media/[mediaId]` é uma rota `GET` que confirma
  slug, publicação e vínculo de tenant antes de ler o R2.
- Não existe API pública de escrita. A primeira carga é feita pelo importador
  local controlado.
- O carrinho é estado da cliente e usa `localStorage` separado por slug. Ele
  não substitui D1 para catálogo ou configuração.
- Pedidos continuam sem persistência: a cliente revisa a mensagem e decide
  abrir o WhatsApp.

Toda consulta pública parametriza valores. Produtos são sempre buscados pelo
`tenant_id` obtido da linha da loja encontrada pelo slug. Uma URL de mídia só
funciona quando mídia e loja pertencem ao mesmo tenant.

## Modelo de dados

### `stores`

`id`, `slug` único, nome, descrição, localização, cor de destaque, WhatsApp
normalizado em E.164, Instagram, instruções, formas de pagamento em JSON,
referências opcionais de logo/capa, publicação e timestamps.

### `products`

`id`, `tenant_id`, nome, descrição, categoria, preço inteiro em centavos,
estoque, variações em JSON, imagem opcional, publicação, disponibilidade,
ordem e timestamps.

### `media`

`id`, `tenant_id`, chave R2 gerada pelo servidor, MIME, tamanho e timestamp.

Não há clientes, pedidos, recebimentos, senhas ou tokens. Variações continuam
como lista simples e podem evoluir depois para grupos nomeados, sem um motor de
personalização neste marco.

## Migrations e bindings

A migration versionada está em `drizzle/0000_nostalgic_nextwave.sql`. Os
bindings lógicos são:

- `DB`: D1;
- `STORE_IMAGES`: R2.

`.openai/hosting.json` declara somente os nomes lógicos e preserva o
`project_id` existente. `wrangler.jsonc` usa `feita-local` como nome e
identificador exclusivamente local para que Wrangler e Miniflare compartilhem
o mesmo arquivo D1; nenhum UUID remoto fictício, secret ou credencial foi
incluído. O schema atual das
ferramentas Sites aceita nomes lógicos para R2 e não exige que o binding se
chame `BUCKET`, portanto `STORE_IMAGES` permanece coerente em manifest,
runtime, tipos, testes e documentação.

### Ambientes

- **Local:** Wrangler/Vite + Miniflare, estado ignorado em
  `.wrangler/state/v3`. É o único ambiente em que o importador administrativo
  pode escrever.
- **Preview/produção:** o projeto Sites existente provisionou e conectou
  `DB`/`STORE_IMAGES`, recebeu a migration versionada e publicou a versão 7.
  Nenhuma fixture ou loja real foi importada. A política `custom` permaneceu
  restrita a Lorenzo.

Quando um binding obrigatório falta, a vitrine mostra um estado local
compreensível ou a rota de imagem responde `503`, sem expor stack ou segredo.

## Executar localmente

No Windows desta estação, o script de build/lint precisa do Git Bash no `PATH`:

```powershell
$env:Path = 'C:\Program Files\Git\bin;' + $env:Path
npm install
npm run db:migrate:local
npm run dev
```

Em um shell com Bash já disponível:

```bash
npm install
npm run db:migrate:local
npm run dev
```

A migration usa `--local`; nunca acrescente `--remote` sem nova autorização.

## Preparar e importar a primeira loja

1. Copie `data/first-store.template.json`, que é vazio, não publicado e não
   contém dados fictícios, para um arquivo ignorado por Git.
2. Preencha conscientemente os campos com os dados fornecidos pela
   comerciante.
3. Use preços em centavos (`5900` representa R$ 59,00).
4. Referencie imagens JPEG, PNG, WebP ou AVIF por caminho relativo ao JSON.
5. Valide sem gravar:

```bash
npm run store:import -- caminho/loja.json
```

6. Leia o resumo e só então grave no D1/R2 local:

```bash
npm run store:import -- caminho/loja.json --apply
```

O importador recusa slug ou telefone inválido, preço/estoque fora do formato,
mais de 200 produtos, imagem acima de 10 MB e arquivo que não decodifica como
imagem permitida. Toda imagem é rotacionada, limitada a 1800 × 1800,
reprocessada em WebP (máximo de 5 MB), tem metadados removidos e recebe chave
R2 aleatória sob o ID da loja.

O comando não sobrescreve slug existente. Se a gravação D1 falhar, objetos R2
enviados naquela tentativa são removidos. O exemplo é fictício e não é
importado por build, aplicação ou deploy.

O pacote vazio exige: slug, nome, descrição, localização, cor principal da
identidade visual, WhatsApp, Instagram, formas de pagamento, instruções de
compra, caminhos de logo e capa e, para cada produto, nome, descrição,
categoria, preço em centavos, estoque, variações, fotografia e decisões
explícitas de publicação/disponibilidade. Enquanto esses campos não forem
preenchidos, o dry-run falha de forma segura; mesmo preenchido, nada é gravado
sem `--apply`. O importador atual continua deliberadamente local e não contém
credenciais ou um atalho de escrita para o D1 hospedado.

## WhatsApp

O importador aceita telefone brasileiro com pontuação, nacional com DDD ou
internacional começando em `55`, normaliza para apenas dígitos e valida DDD e
comprimento. A vitrine cria:

```text
https://wa.me/55DDDNÚMERO?text=MENSAGEM_CODIFICADA
```

O link só aparece depois da revisão. A aplicação nunca envia a mensagem
automaticamente. Não clique no link durante testes que não devam alcançar uma
conta real.

## Testar em dois navegadores

1. Importe uma fixture local.
2. Abra `http://localhost:3000/loja/SLUG` em dois perfis ou navegadores.
3. Confirme que identidade e catálogo são iguais.
4. Adicione itens no navegador A e recarregue: o carrinho deve permanecer.
5. Confirme que o navegador B começa com carrinho próprio.
6. Abra a revisão, verifique número e texto do `href`, mas não navegue para o
   WhatsApp.
7. Repita em largura de 390 px e confirme ausência de rolagem horizontal.

Dois navegadores locais provam sessões separadas, não dois aparelhos reais.

## Limpar somente dados locais

Pare o servidor e remova apenas a pasta ignorada:

```powershell
Remove-Item -LiteralPath 'C:\Users\USUARIO\Documents\feita\.wrangler' -Recurse
```

Confirme o caminho absoluto antes. Isso apaga D1/R2 e logs locais; não toca em
Cloudflare nem em arquivos versionados. Reaplique a migration depois.

## Administração: risco e opções

Uma API de escrita sem autenticação permitiria trocar catálogo, preços,
telefone e imagens. Por isso, este marco oferece somente importação local
operada por Lorenzo.

| Opção | Segurança | Esforço/dependências | Experiência | Evolução |
| --- | --- | --- | --- | --- |
| Importador local controlado | Alta para o piloto: zero escrita pública | Baixo; acesso ao repositório local | Lorenzo prepara a loja; comerciante não edita | Temporário |
| Better Auth + D1 | Melhor encaixe com o ADR; sessão revogável em cookie | Alto; e-mail, secret, tabelas, rate limit e testes | Painel próprio | Recomendado para SaaS |
| Cloudflare Access | Bom perímetro para poucas pessoas | Serviço e política externos; separar `/admin` público/privado | Login gerenciado, menos integrado | Útil no piloto, não substitui autorização de tenant |
| Proteção ChatGPT/SIWC existente | Segura somente no contexto hospedado e autorizado | Depende de conta ChatGPT e allowlist | Inadequada à cliente geral | Não é login do produto |

Recomendação para a primeira comerciante: manter o importador controlado no
primeiro teste compartilhável. Antes de dar autonomia de edição, decidir e
autorizar Better Auth conforme o ADR. Cloudflare Access pode ser uma ponte
somente se Lorenzo aceitar a dependência externa e a experiência de acesso.

## Passos externos futuros

Concluídos neste checkpoint: D1/R2 do projeto Sites, bindings
`DB`/`STORE_IMAGES`, migration, validação local em dois navegadores, push,
PR, integração e deployment restrito.

Próximos passos, somente após nova autorização:

1. Lorenzo revisar a URL publicada no navegador dele;
2. preencher uma cópia ignorada de `data/first-store.template.json`;
3. executar o dry-run local e corrigir todos os erros;
4. definir e autorizar um procedimento administrativo hospedado sem API
   anônima;
5. importar somente os dados consentidos da primeira loja;
6. validar a mesma loja em dois celulares, incluindo carrinhos separados,
   imagens e URL do WhatsApp sem envio;
7. antes de dar autonomia à comerciante, escolher e implementar autenticação
   conforme o ADR, com testes de duas identidades e duas lojas.

## Rollback futuro

Antes do deploy, exportar D1 e inventariar objetos R2. Para rollback de código,
redeployar a versão Sites anterior. Para dados, migrations devem ser
forward-only: corrigir com nova migration; não apagar tabelas automaticamente.
Se a primeira publicação falhar, retirar a rota/versão nova, preservar D1/R2
para diagnóstico e bloquear o importador remoto. Restaurar dados só do backup
validado e nunca sobrescrever produção com fixture local.

## Fora do marco

Autenticação, recuperação de senha, painel público de administração, pedidos
persistidos, mini-CRM, clientes, frete automático, pagamentos reais, Pix real,
Instagram integrado, envio automático de WhatsApp, planos, cobrança,
analytics, múltiplas lojas operacionais e dados reais da primeira comerciante.

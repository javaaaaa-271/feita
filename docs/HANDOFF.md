# Handoff atual

Atualizado em: **21 de agosto de 2026**

Este é o primeiro documento que uma nova sessão deve ler depois do `README`.

## E-mails transacionais com identidade visual

Em **21 de agosto de 2026**, confirmação de cadastro, recuperação de senha e
convite passaram a compartilhar um template próprio da Feita. O Resend recebe
HTML responsivo e fallback em texto simples na mesma requisição. O desenho usa
uma coluna, fundo creme, terracota, wordmark textual, código como ação dominante
e aviso de segurança discreto, sem imagens externas, botões decorativos ou
tokens em links.

O conteúdo dinâmico é escapado antes de entrar no HTML. Códigos de seis dígitos
mantêm o valor contínuo para não prejudicar cópia e digitação, usando apenas
espaçamento visual. Os textos informam validade, uso único e o que fazer quando
a solicitação não veio da destinatária. O convite recebeu o mesmo sistema para
evitar um terceiro padrão inconsistente.

Foram adicionados quatro testes específicos para HTML responsivo, fallback,
ausência de URLs com token, textos de segurança, escape contra injeção e payload
completo enviado ao Resend. A suíte total passou com **120 testes** (45 JS + 75
TS), o lint terminou com zero erros e somente os dois avisos históricos de
`<img>`, e o TypeScript passou sem emissão.

Uma recuperação real foi enviada ao iCloud controlado, apareceu com o novo
preheader e renderizou o HTML na caixa. O único código criado para essa prova
visual foi invalidado no D1 local logo após a conferência, sem trocar novamente
a senha da conta. O remetente continua sendo o endereço de testes do Resend;
domínio e remetente próprios permanecem obrigatórios antes da publicação.

## Prova local real de OTP e primeira loja

Em **21 de agosto de 2026**, a integração local com o Resend foi configurada e
provada em uma caixa controlada. Foi criada uma chave exclusiva com permissão
somente de envio; ela, o remetente de teste e novos secrets locais de sessão e
rate limit ficaram apenas em `.dev.vars`, que permanece ignorado pelo Git.
Nenhum valor de credencial, OTP ou endereço de e-mail foi registrado na fonte,
no handoff ou em logs da aplicação.

O cadastro público local enviou o assunto `Confirme seu e-mail na Feita` por
`Feita <onboarding@resend.dev>`. O painel do Resend marcou a mensagem como
`Delivered`, e o código recebido foi digitado diretamente pela pessoa na tela
da Feita. A confirmação abriu a etapa da primeira loja sem expor o código ao
Codex.

A loja sintética `Vitrine de Teste Feita`, slug
`vitrine-teste-feita-20260821`, foi criada no D1 local e abriu o catálogo
autenticado vazio. A inspeção do banco confirmou `published = false`, e-mail
verificado, uma sessão, role `store_owner`, uma reivindicação única de criação,
um evento de auditoria e zero produtos. O console da aplicação permaneceu
limpo; os avisos observados pertenciam exclusivamente a uma extensão do Chrome.

A recuperação de senha também foi provada de ponta a ponta na mesma caixa. A
primeira tentativa falhou porque o e-mail digitado no formulário não coincidia
exatamente com o cadastro, e não porque o código estivesse expirado: o D1 ainda
mostrava o OTP válido, com zero tentativas consumidas. Cinco requisições com o
e-mail divergente acionaram corretamente o rate limit. Um código que apareceu
em uma captura de diagnóstico foi imediatamente rotacionado e nunca reutilizado;
o código novo recebido no iCloud foi usado pela própria pessoa para definir a
senha final.

O endpoint de redefinição respondeu `200`, a interface confirmou a atualização
e a inspeção final do D1 encontrou zero sessões anteriores, zero registros
pendentes de recuperação e uma credencial de senha válida. Portanto, o código
foi consumido e as sessões abertas antes da troca foram efetivamente revogadas.

Esta prova ainda **não libera publicação**. O único domínio cadastrado no
Resend está com verificação falha, e `onboarding@resend.dev` serve somente para
testes destinados à própria conta. Antes de publicar continuam obrigatórios um
domínio próprio verificado, remetente da Feita, Turnstile validado no servidor,
secrets hospedados e nova matriz remota de autenticação e IDOR.

A conta e a loja de teste devem ser mantidas para as próximas provas locais;
qualquer remoção continua exigindo autorização explícita.

## Revisão visual local do Marco 7

Em **21 de agosto de 2026**, a aplicação local foi retomada sem credenciais
externas e revisada em viewport móvel de 390 × 844. Landing, cadastro, login,
demonstração e a vitrine sintética `/loja/atelie-aurora` renderizaram com a
hierarquia, os estados e as ações principais esperadas. A vitrine completou o
fluxo Caderno Aurora → carrinho → retirada → Pix → revisão da mensagem; o link
do WhatsApp não foi aberto e nenhuma mensagem foi enviada. O navegador não
registrou erros nem avisos novos.

Nenhuma conta de teste foi criada nessa revisão para não poluir o D1 local. O
arquivo `.dev.vars` ainda não existe, portanto a prova de OTP com entrega real
continua pendente. O servidor de desenvolvimento foi iniciado somente no
ambiente local e nenhum recurso remoto, Sites, Worker, D1 ou R2 hospedado foi
alterado.

Passaram `npm run lint` com zero erros e somente os dois avisos históricos de
`<img>`, `npm test` com **116 testes** (45 JS + 71 TS) e
`git diff --check`, que exibiu apenas os avisos conhecidos de LF/CRLF no
Windows. Como os scripts npm dependem de Bash, lint e testes foram executados
pelo Git Bash já instalado depois de o PowerShell não encontrar `bash` no
`PATH`.

A próxima ação concreta continua sendo configurar `RESEND_API_KEY` e
`RESEND_FROM` em `.dev.vars`, com domínio e remetente verificados, e provar o
cadastro em uma caixa de e-mail controlada. Publicação, migrations remotas e
secrets hospedados continuam fora de escopo até nova autorização explícita.

## Marco 7 — cadastro público local e primeira loja

Em **18 de agosto de 2026**, foi autorizado e implementado somente no ambiente
local o primeiro onboarding público da Feita. Nenhum recurso hospedado, domínio,
Sites, Worker, D1 ou R2 remoto foi criado, migrado ou publicado.

- `/` agora apresenta a proposta da Feita, os três passos do fluxo e chamadas
  para criar uma loja; o protótipo operacional anterior foi preservado em
  `/demonstracao`;
- `/cadastro` conduz conta com senha → OTP de seis dígitos → dados da primeira
  loja; a confirmação cria a sessão e a loja nasce não publicada;
- Better Auth exige e-mail verificado para login, armazena o OTP com hash, usa
  validade de dez minutos, rotação e três tentativas, além de rate limit por IP
  e digest do e-mail para signup, envio e confirmação;
- o adaptador Resend passou a enviar o código de verificação quando
  `RESEND_API_KEY` e `RESEND_FROM` existem; sem ambos, o desenvolvimento não faz
  requisição de rede nem registra código em log;
- a criação deriva o usuário exclusivamente da sessão verificada e grava loja,
  `store_owner`, `store_creation_claims` e auditoria em um único lote D1. A
  reivindicação única impede duas primeiras lojas concorrentes sem proibir
  memberships futuras por convite;
- slugs são normalizados e únicos, o WhatsApp é normalizado para E.164 e
  conflitos não sobrescrevem outra loja;
- a migration `0003_awesome_galactus.sql` foi gerada, inspecionada e aplicada
  somente ao D1 local;
- a landing recebeu uma imagem social própria em `public/og.png`; vitrines
  compartilháveis geram metadados próprios e não herdam essa imagem quando não
  possuem mídia.

A mudança consciente de cadastro por convite para bootstrap público verificado
está em D-013. Convites continuam sendo o mecanismo para entrar em lojas já
existentes. A compatibilidade de recuperação de convite usa uma instância de
Better Auth restrita ao servidor para provar a senha de contas parciais; esse
handler nunca é exposto como rota pública.

Evidência concluída: TypeScript passou; o lint terminou sem erros e preservou
somente os dois avisos históricos de `<img>` na demonstração; os 19 testes de
autenticação cobriram signup → OTP → sessão e uso único do código; os seis
testes de onboarding provaram lote completo, loja fechada, normalização,
conflito de slug, segunda loja negada e concorrência sem registro órfão; e
`npm test` aprovou o build Sites e os **116 testes** completos (45 JS + 71 TS).
`git diff --check` passou, exibindo apenas avisos de conversão LF/CRLF do Git no
Windows. As quatro rotas locais `/`, `/cadastro`, `/demonstracao` e `/entrar`
responderam 200. A vitrine sintética em `/loja/atelie-aurora` emitiu título e
descrição próprios e não herdou `og.png`; a landing emitiu a imagem social com
URL absoluta local.

Bloqueios antes de qualquer publicação: verificar domínio e remetente no
Resend, configurar secrets reais, adicionar e validar Turnstile no servidor,
provar entrega em caixa controlada e repetir a matriz remota de autenticação e
IDOR. A próxima ação concreta é o usuário configurar o Resend em `.dev.vars`,
executar o fluxo em uma caixa própria e autorizar separadamente um novo portão
de publicação quando essa prova estiver concluída.

## Execução local restaurada no PowerShell

Em **18 de agosto de 2026**, o caminho local foi preparado e provado depois do
encerramento do A3, sem recriar nem alterar Worker, D1, R2 ou Sites remotos.

- `npm run dev` usa `vinext dev` na porta 5173 e `npm run start` deixou de usar
  atribuição de variável no formato POSIX, que o PowerShell não reconhece; o
  próprio `vite.config.ts` já configura o log do Wrangler de modo
  multiplataforma;
- no modo de desenvolvimento, os assets passam primeiro pelo Vite para que CSS,
  módulos do navegador e HMR sejam servidos; build e produção continuam com
  `run_worker_first=true`, preservando a barreira do Worker sobre Static Assets;
- sem `MARCO_6_3B_ACCESS_SECRET`, o portão do ensaio libera somente URLs de
  loopback (`localhost`, `127.0.0.1` e `::1`); qualquer endereço não local
  continua falhando fechado com 404, e configurar o secret volta a exigi-lo
  também no loopback;
- o lint passou a ignorar `.wrangler`, que contém apenas estado e bundles
  gerados, mantendo todo o código-fonte sob análise;
- as três migrations foram aplicadas no D1 local e a fixture sintética
  `Ateliê Aurora` foi importada em `/loja/atelie-aurora` com dois produtos.

As rotas `/`, `/loja/atelie-aurora` e `/entrar` responderam 200 em
`http://localhost:5173`; a mesma raiz no endereço da rede local respondeu 404.
Uma primeira execução com Vite direto entregava o HTML, mas deixava
`/app/globals.css`, `@vite/client` e o módulo virtual do RSC em 404. Depois da
correção, esses assets responderam 200, as três abas renderizaram o design
completo, não produziram novos erros no console e a navegação para Produtos
funcionou por hidratação.
Passaram `npm run lint` (zero erros e os dois avisos históricos de `<img>`),
`npx tsc --noEmit`, `npm test` (build validado e 110 testes), além do teste
focado do portão com nove casos. `git diff --check` deve ser repetido depois
do registro final deste handoff.

O demo e a vitrine estão prontos para uso local sem credenciais externas. O
painel autenticado ainda exige convite/conta e o fluxo de OTP real continua
dependente de um provedor de e-mail configurado; nenhuma credencial deve ser
gravada no repositório. A próxima ação concreta é abrir as duas URLs locais,
validar o fluxo visual e só então escolher entre aprimorar a experiência local
de convite ou iniciar um novo A0 para outra prova remota.

## Marco 6.3B — A3 concluído e recursos removidos

Em **18 de agosto de 2026**, o A3 foi executado depois de uma nova prova
somente leitura dos alvos. O D1 continha exclusivamente duas identidades com
e-mails sintéticos, duas lojas marcadas como fixtures, três produtos, dois
convites, duas memberships e o contador do ensaio. Não havia identidade ou
loja fora da fixture, nem linha de mídia. O bucket R2 tinha zero objetos e zero
bytes. O Worker tinha somente os três secrets do ensaio, a versão aprovada em
100% e nenhum domínio ou rota de produção.

A limpeza respeitou a ordem de contenção do plano:

1. o Worker `feita-ensaio-6-3b-20260818` foi removido sem `force`; consultas
   posteriores de deployment e secrets confirmaram sua ausência;
2. o bucket vazio `feita-ensaio-6-3b-images-20260818` foi removido e deixou de
   aparecer no inventário R2;
3. o D1 sintético `feita-ensaio-6-3b-db-20260818` foi removido e deixou de
   aparecer no inventário D1;
4. a configuração local, a credencial criptografada, os tokens/fixtures e os
   executores temporários do ensaio foram apagados da pasta ignorada.

Restam localmente apenas bundles de dry-run ignorados e sem secrets, tokens ou
fixtures. Eles não apontam mais para recursos existentes e não fazem parte do
Git. O checkpoint Sites, `.openai/hosting.json`, domínio e DNS permaneceram
inalterados durante todo o A3.

O estado remoto final do Marco 6.3B é: **Worker ausente, secrets ausentes, D1
ausente e R2 ausente**. A limpeza é irreversível e as fixtures não precisam ser
preservadas. O resultado técnico do A2 continua incompleto pelas provas de OTP,
WebP estático e limite remoto de 200 MiB descritas abaixo; uma nova tentativa
exige novos A0, A1 e A2, provedor de e-mail funcional e orçamento remoto novo.

## Marco 6.3B — A2 executado, protegido e ainda incompleto

Em **18 de agosto de 2026**, o A2 autorizado foi executado no Worker, D1 e R2
isolados criados no A1. O candidato corresponde à `main` em `b655601`, cujo
único avanço sobre o commit técnico `aad4dcc` é documental. O Worker enviado
foi o bundle reproduzível do dry-run, com SHA-256
`982d63b7ed6f6790d4aa86a848535d00d46879b98dd52a2f088629f14119a50d`.
O checkpoint Sites e `.openai/hosting.json` permaneceram inalterados.

Antes do deploy, TypeScript, build, dry-run, `git diff --check` e os 107 testes
passaram. O lint limitado ao código rastreado passou com zero erros e os dois
avisos históricos de `<img>`. O comando padrão voltou a percorrer bundles
ignorados sob `.wrangler` e relatou os mesmos erros de código gerado já
documentados; isso não alterou o artefato nem o repositório.

O primeiro deploy foi feito sem o segredo de acesso e com exatamente
`ASSETS`, `DB`, `STORE_IMAGES` e `IMAGES`. O portão fechado passou na primeira
tentativa: uma única versão recebeu 100% do tráfego e a rota ausente e o
favicon devolveram o mesmo 404 genérico de 36 bytes, com SHA-256
`3ce449faa21ba126b9f71ee6821129fb64cbbcde364ca4a2f84ce5e96302fcce`,
`Cache-Control: private, no-store` e HSTS. Nenhum binding foi alcançado. Depois
foram instalados três secrets exclusivos e duas origens exatas; o deploy
protegido continuou em versão única a 100% e o mesmo portão sem segredo passou
novamente na primeira tentativa.

As três migrations versionadas foram aplicadas somente no D1 inventariado.
Foram criadas duas lojas, dois convites, duas identidades e dois produtos
iniciais exclusivamente sintéticos. Os dois convites foram aceitos pela
aplicação; nenhum hash de senha foi inserido manualmente. A matriz remota
aprovou:

- barreira ausente ou incorreta e Static Assets protegido;
- login sem enumeração, cookie `HttpOnly`, `Secure`, `SameSite=Lax` e sem
  `Domain`, origem hostil recusada, cadastro público fechado e logout com
  revogação efetiva;
- memberships com zero, uma e múltiplas lojas, sem seleção implícita;
- catálogo criado, editado e relido com persistência;
- IDOR A → B e B → A para lista, leitura, mutação e upload;
- JPEG e PNG estáticos transformados em WebP, mídia pública somente vinculada,
  substituição com revogação da URL anterior e remoção com 404 posterior;
- SVG, GIF/WebP/APNG animados, arquivo falso, truncado, pixels excessivos e
  corpo acima de 8 MiB recusados;
- limite concorrente encerrado em exatamente 25 reservas e a tentativa seguinte
  recusada com 429; o D1 terminou com 25 tentativas e 235.102 bytes;
- rate limit remoto em 429 e vitrine contendo somente o produto da loja certa.

O R2 terminou novamente vazio, com zero objetos e zero bytes, e não restou
linha de mídia vinculada. Foram produzidas duas transformações remotas válidas.
O D1 preserva somente fixtures sintéticas: duas lojas, duas identidades, três
produtos e duas memberships finais usadas para provar os estados zero e
múltiplo. Nenhum dado real, domínio, rota, DNS ou recurso Sites foi usado.

O resultado do A2 é **incompleto, não uma reprovação de isolamento**. A resposta
de recuperação permaneceu genérica para e-mail existente ou ausente, mas não
há provedor `RESEND` configurado e nenhum OTP foi entregue a uma caixa
controlada. O WebP estático válido e o limite acumulado de 200 MiB também não
foram repetidos remotamente depois que o orçamento inviolável de 25 tentativas
foi atingido; ambos continuam cobertos apenas pela matriz local. Por isso o
Marco 6.3B não pode ser marcado como aprovado.

O portão fechado nunca falhou, portanto a autorização condicional de remoção
do Worker não foi acionada durante o A2. Naquele encerramento, Worker, D1, R2,
secrets e fixtures foram preservados atrás da barreira até a autorização A3.
Nenhum valor de credencial foi registrado no Git ou neste handoff. O estado
posterior e definitivo desses recursos está registrado na seção A3 acima.

## Marco 6.3B — A0 revalidado e A1 concluído

Em **18 de agosto de 2026**, o inventário A0 foi repetido em modo somente
leitura antes de qualquer criação. A `main` estava limpa e sincronizada em
`aad4dccaecf064b7b9c2daf5c59b2a05d4917696`; `workers.dev` continuava
configurado; o nome datado do Worker estava livre; e a conta não continha
Worker, projeto Pages, D1, bucket R2, domínio, zona ou rota de produção. Os
recursos físicos do checkpoint Sites continuaram externos e intocáveis para o
ensaio.

O estado de custo também foi revalidado sem alteração: `Workers Free` e
`R2 Paid` estavam ativos, havia uma forma de pagamento principal cadastrada e
o painel não mostrava uso faturável no período. Images permanecia no plano
gratuito, com 5 de 5.000 transformações únicas usadas. Nenhum detalhe de conta,
pagamento, credencial ou identificador remoto foi registrado no repositório.

Depois da autorização A1, foram criados exclusivamente o D1
`feita-ensaio-6-3b-db-20260818` e o bucket R2 Standard
`feita-ensaio-6-3b-images-20260818`, ambos na região ENAM. O D1 terminou com
zero tabelas de aplicação. O R2 terminou com zero objetos e zero bytes. A
configuração local não versionada ficou em
`.wrangler/marco-6-3b-20260818/wrangler.generated.jsonc` e contém exatamente
`ASSETS`, `DB`, `STORE_IMAGES` e `IMAGES`, com Static Assets passando primeiro
pelo Worker. Nenhuma variável funcional ou secret foi configurado.

Não foi criado nem publicado Worker. Não houve migration, fixture, identidade,
loja, produto, upload, transformação, requisição funcional, rota, domínio ou
alteração no checkpoint Sites. Os recursos vazios permanecem isolados na conta;
qualquer limpeza deles continua dependente da autorização A3.

Antes do A1, TypeScript, build, dry-run e os 107 testes passaram novamente. O
lint do código rastreado passou sem erros e preservou os dois avisos históricos
de `<img>` ao excluir `.wrangler`; o comando padrão continua percorrendo o
bundle remoto ignorado e preexistente nessa pasta, conforme a ressalva já
registrada. A árvore versionada permaneceu limpa até o registro deste handoff.

A próxima ação concreta é obter autorização A2 separada para publicar o Worker
fechado, confirmar a versão ativa em 100% e aprovar o portão determinístico
antes de instalar secrets, aplicar migrations ou carregar fixtures. Essa
autorização precisa incluir a remoção imediata somente do Worker de ensaio se o
portão for bloqueador; D1 e R2 continuam sob o portão A3.

## Marco 6.3B — inventário A0 concluído

Em **9 de agosto de 2026**, o inventário A0 foi concluído em modo somente
leitura na conta Cloudflare autorizada. O subdomínio `workers.dev` permanece
disponível, não há Worker ou projeto Pages implantado nessa conta e o nome
configurado localmente para o Worker não corresponde a um recurso remoto
existente. Também não há D1 acessível na conta. O R2 não está habilitado e a
consulta autorizada foi recusada pelo provedor com o estado próprio de serviço
não ativado; nenhum bucket foi criado e nenhuma tentativa de habilitação foi
feita.

Os recursos físicos administrados pelo checkpoint Sites não aparecem no
inventário da conta Cloudflare do proprietário e continuam tratados como
externos e intocáveis para este ensaio. Não há zona, rota de Worker, domínio
customizado ou projeto remoto ao qual o ensaio possa se ligar acidentalmente.

O estado remoto dos bindings foi registrado explicitamente: `ASSETS` está
ausente porque não existe Worker implantado, e `IMAGES` também está ausente e
sem associação remota. Ambos existem somente como declarações locais no pacote
validado do Marco 6.3A. O catálogo de planos mostra uma oferta de Images &
Stream a partir de USD 0/mês, com 5.000 transformações únicas mensais incluídas,
mas a conta não possui assinatura Images/Stream ativa. A tela de transformações
mostra uso zero e informa que a capacidade não pode ser habilitada sem uma zona;
nenhuma zona ou capacidade foi adicionada.

Na cobrança, a única assinatura listada é `Workers Free`, ativa, e não existe
método de pagamento cadastrado. Assim, o A0 está concluído, mas a criação do R2
e qualquer ativação de Images permanecem sob um portão de custo: antes de
prosseguir, a execução precisa provar por mecanismo autorizado que o ensaio não
exigirá cobrança, método de pagamento, upgrade ou aceite fora do escopo. O
checkpoint Sites, o Git remoto e todos os recursos Cloudflare permaneceram
inalterados durante o A0.

### Portão de custo do A1 — bloqueado antes de qualquer criação

Depois da autorização para executar o Marco 6.3B, a página oficial de planos
do R2 foi consultada novamente sem mutação. Embora o total imediato exibido
seja USD 0 e o nível gratuito inclua 10 GB, 1 milhão de operações Classe A e
10 milhões de operações Classe B por mês, habilitar o serviço exige a ação
`Adicionar assinatura do R2 à minha conta`. O aceite cria uma assinatura com
renovação automática, cobrança por uso acima das franquias e possibilidade de
pré-autorização da forma de pagamento.

Como a autorização determinou interromper antes de qualquer ação que pudesse
gerar cobrança, exigir método de pagamento ou ampliar o escopo, a execução
parou antes desse aceite. Não foram criados Worker, D1 ou R2; não foram
configurados secrets ou variáveis; nenhuma migration, fixture, transformação,
publicação ou teste remoto foi executado. A reversão terminou como operação
nula, pois não havia recurso de ensaio para excluir ou configuração para
restaurar. O checkpoint Sites permaneceu intacto.

Antes do bloqueio, o candidato `a164a12` passou novamente por lint sem erros e
com os dois avisos históricos de `<img>`, TypeScript, 84 testes, build, dry-run
com `ASSETS`, `DB`, `STORE_IMAGES` e `IMAGES`, e `git diff --check`. O
entrypoint validado foi `dist/server/index.js`, com SHA-256
`3ffe6fcd8d9758177e85f248e368ecadb08341261e5b874ba4b1d0c6328d51fb`. Foram
usados Node 24.14.0, Wrangler 4.114.0, Vinext 0.0.50 e workerd
1.20260722.1. Nenhum arquivo de runtime mudou em relação ao commit técnico do
Marco 6.3A.

Uma nova autorização específica para aderir à assinatura do R2 e aceitar a
possibilidade de cobrança por uso foi recebida. O checkout oficial foi aberto,
mas a ativação exige cartão e endereço de cobrança que não estavam cadastrados
na conta. Nenhum dado de pagamento foi inferido ou preenchido pelo agente.

Depois de o proprietário informar que o R2 estava ativo, o estado foi
revalidado antes de criar recursos. A API continuou respondendo com o código
`10042`, que identifica R2 não habilitado, e a cobrança continuou listando
somente `Workers Free`, sem assinatura R2 ou método de pagamento. O checkout
ainda exibia a etapa `Ativar R2`, com os campos de cobrança não preenchidos.
Assim, a ativação não foi concluída nesta conta, o R2 permanece inativo e
nenhum recurso de ensaio foi criado. A próxima ação concreta é o proprietário
concluir o checkout na mesma conta e verificar que R2 aparece como assinatura
ativa; até lá, A1, A2 e A3 permanecem bloqueados.

### Interrupção e reversão do ensaio remoto

Em **9 de agosto de 2026**, uma nova verificação confirmou que o R2 estava
ativo. Foram então criados exclusivamente para o Marco 6.3B o Worker
`feita-ensaio-6-3b-20260809`, o D1 `feita-ensaio-6-3b-db-20260809` e o bucket
R2 `feita-ensaio-6-3b-images-20260809`. As duas migrations locais foram
aplicadas ao D1 vazio, dois secrets gerados apenas em memória foram associados
ao Worker e o candidato validado foi publicado somente no subdomínio isolado
`workers.dev`. Não houve rota customizada, domínio, DNS, dado real ou operação
no checkpoint Sites.

O proprietário interrompeu a execução antes do início da prova. Nenhuma
fixture, identidade, loja ou produto sintético chegou a ser inserido; nenhuma
requisição funcional foi enviada ao Worker; e nenhuma chamada ao binding R2 ou
ao binding Images foi executada. O uso do bucket de ensaio terminou em **zero
objetos** e zero bytes armazenados, e o uso de Images em **zero
transformações**. No R2 ocorreram apenas as chamadas administrativas necessárias
para criar, listar e excluir o bucket; o contador faturável da conta não foi
consultado depois da interrupção.

A reversão autorizada foi aplicada imediatamente. Primeiro o Worker foi
excluído, desativando seu acesso público; depois foram excluídos somente o D1 e
o bucket R2 citados acima. A verificação final confirmou que o Worker não
existe e que as listas remotas de D1 e R2 não contêm os recursos de ensaio.
Consequentemente, `ASSETS`, `DB`, `STORE_IMAGES` e `IMAGES` não permanecem
vinculados a nenhum Worker do Marco 6.3B. A assinatura R2 da conta não foi
alterada.

O Marco 6.3B está interrompido e nenhuma etapa da prova deve ser retomada sem
nova autorização explícita. Sites, domínio, DNS e produção permaneceram
integralmente fora do ensaio.

### Blindagem local antes de qualquer novo ensaio

Em **10 de agosto de 2026**, foi implementada somente no checkout local uma
barreira obrigatória para o Worker direto do Marco 6.3B. Toda requisição agora
precisa apresentar o secret exclusivo `MARCO_6_3B_ACCESS_SECRET`, com ao menos
32 bytes, no header `x-feita-ensaio-secret`. Secret ausente, curto ou incorreto
recebe 404 genérico antes da leitura do corpo e antes de qualquer acesso a
`ASSETS`, `DB`, `STORE_IMAGES` ou `IMAGES`. `assets.run_worker_first = true`
permanece explícito tanto no `wrangler.jsonc` quanto na configuração gerada,
obrigando inclusive arquivos estáticos reais a atravessar primeiro o Worker.
Depois de calcular dois digests SHA-256 de tamanho fixo, a comparação usa
`crypto.subtle.timingSafeEqual()`; o header é removido antes de a aplicação ou
`ASSETS.fetch()` receber a requisição.

O endpoint genérico `/_vinext/image` permanece indisponível durante o ensaio,
impedindo transformações fora do fluxo autenticado de produto. Uploads de
produto têm limite individual de 8 MiB aferido pelo corpo real, sem confiar no
`Content-Length`. Corpos excessivos são recusados antes do D1. Para os demais
uploads elegíveis, uma única instrução atômica no D1 reserva no máximo 25
tentativas e 200 MiB acumulados na tabela
`marco_6_3b_upload_budget`. Quando a reserva é negada, somente essa operação D1
de controle ocorre: o roteador da aplicação, as demais consultas D1, Assets,
R2 e Images não são alcançados.

A migration `drizzle/0002_flaky_skreet.sql` foi gerada e aplicada apenas em D1
local temporário. Testes concorrentes dispararam 40 reservas simultâneas e
confirmaram exatamente 25 aceitações; o limite acumulado preservou os contadores
sem alteração ao negar a tentativa excedente. As provas do Worker instrumentam
os quatro bindings e confirmam zero acesso sem secret, zero acesso a Assets, R2
e Images após orçamento esgotado e zero acesso ao otimizador Vinext bloqueado.
Uma prova adicional passa pelo roteamento local real de Static Assets:
`/favicon.svg` sem secret retorna 404 genérico com `private, no-store`, enquanto
o mesmo arquivo com secret válido continua sendo servido byte a byte; outra
prova confirma que o header não chega a `ASSETS.fetch()`. Um stream com oito
chunks planejados ultrapassa 8 MiB, registra cancelamento antes de consumir a
fonte completa e não alcança nenhum binding.

Validação local: lint passou sem erros e manteve os dois avisos históricos de
`<img>`; TypeScript passou; build Vinext e artefato Sites passaram; os 84 testes
anteriores e 12 novas provas passaram, totalizando 96; o dry-run local do Worker
validou o entrypoint e os quatro bindings; `git diff --check` passou. Nenhum
secret real foi gravado: `.env.example` contém somente o nome vazio da variável.
`.openai/hosting.json` e `package-lock.json` permanecem inalterados.

Não houve consulta ou mutação na Cloudflare, criação de recurso, migration
remota, deploy, commit ou push. A modificação documental anterior deste handoff
foi preservada. A próxima ação concreta é revisar integralmente o diff local e
decidir separadamente se a blindagem pode ser registrada; qualquer nova prova
remota continua bloqueada até autorização explícita.

### Segunda prova interrompida e portão fechado determinístico

Uma segunda tentativa usou exclusivamente o candidato publicado
`cca9442c3c7d52e5fc4c3007d1639134de670a28`, depois de repetir TypeScript, lint,
96 testes, build, dry-run e `git diff --check`. O inventário inicial não encontrou
recurso inesperado relacionado ao ensaio. Foram criados somente um D1 e um
bucket R2 isolados; as três migrations foram aplicadas ao D1 ainda vazio antes
do primeiro deploy, conforme a ordem então registrada no plano.

O Worker foi publicado somente em `workers.dev`, sem rota, domínio ou o secret
de acesso. A primeira prova composta do estado fechado não separou com precisão
erro de transporte, status, corpo e headers e, portanto, não forneceu evidência
determinística para avançar. Nenhum secret foi instalado e não houve fixture,
identidade, loja, produto, upload, transformação ou teste funcional. A reversão
foi imediata: primeiro o Worker foi removido, após 27 segundos de existência
pública; depois foram registrados zero objetos e zero bytes no R2, zero
tentativas e bytes no D1 e zero transformações; por último, somente o bucket e o
D1 isolados foram excluídos. O inventário final não encontrou Worker, D1, bucket,
binding ou objeto remanescente do ensaio. Sites, domínio, DNS, produção e a
assinatura R2 permaneceram inalterados.

Em **10 de agosto de 2026**, a correção subsequente permaneceu exclusivamente
local. O novo executor `npm run worker:closed-gate` consulta primeiro o plano de
controle e exige que a versão recém-criada seja a única ativa, com 100% do
tráfego. Ele recusa qualquer origem que não seja a raiz HTTPS isolada em
`workers.dev`; só então consulta, sem segredo e com nonce não cacheável, uma
rota inexistente e `/favicon.svg`. Ele registra somente categoria e código
sanitizados de transporte, status HTTP, tamanho e hash SHA-256 do corpo,
`Cache-Control`, presença de HSTS e igualdade entre as respostas.

A máquina de estados aprova apenas dois 404 genéricos idênticos com
`private, no-store` e HSTS. Somente DNS, conexão, TLS ou HTTP 523 são
transitórios e permitem nova tentativa depois de 5 segundos, sem ultrapassar 60
segundos desde o deploy. Qualquer 200, resposta funcional, corpo inesperado,
outro status, header divergente, erro não reconhecido ou diferença no plano de
controle é bloqueador, não é repetido e exige reversão. Na próxima tentativa, o
D1 e o bucket poderão existir vazios por causa dos bindings, mas migrations,
fixtures e secrets ficarão adiados até a aprovação do portão. A janela pública
total continua limitada a 20 minutos, com remoção do Worker antes do
armazenamento.

Foram adicionadas provas locais de aprovação, HTTP 523, DNS/conexão/TLS, asset
200, resposta inesperada, versão ativa em 100%, retry de 5 segundos e limite de
60 segundos. TypeScript, build e dry-run passaram; os 44 testes JavaScript e 63
testes TypeScript passaram, totalizando 107. O lint do código rastreado passou
sem erros e manteve os dois avisos históricos de `<img>` ao excluir explicitamente
`.wrangler`; sem essa exclusão adicional, o comando também percorre um bundle
remoto ignorado e preexistente em `.wrangler/` e falha em código gerado. Não
houve consulta ou mutação na Cloudflare, deploy, migration remota, commit ou push
nesta correção. A próxima ação concreta é revisar o diff e os resultados locais;
qualquer nova prova remota continua bloqueada até autorização explícita.

## Marco 6.3B — ensaio remoto planejado e bloqueado

O plano operacional do ensaio remoto isolado foi registrado em
`docs/MARCO_6_3B_ENSAIO_REMOTO.md`. O Worker candidato será validado somente
em um endereço isolado de `workers.dev`, com D1, R2, duas lojas e duas
identidades, todos exclusivamente sintéticos. O checkpoint Sites continuará
inalterado e não haverá domínio, rota ou dado real no ensaio.

A execução foi dividida em quatro autorizações independentes: A0 para
inventário somente leitura; A1 para recursos isolados; A2 para secrets,
migrations, fixtures, deploy e testes; e A3 para eventual limpeza destrutiva.
Cada portão precisa de autorização explícita e não libera automaticamente o
seguinte. Billing inesperado, destino ambíguo, diferença no artefato, secret
exposto, falha de autenticação, IDOR ou vigésima quinta transformação de imagem
interrompem o marco.

Na etapa original de planejamento, somente a documentação no Git foi alterada.
Não houve naquele momento deploy, migration, criação de recurso, configuração
de secret, rota, domínio, dado remoto ou operação mutável na Cloudflare. O
Marco 6.3B continua bloqueado depois das tentativas revertidas descritas acima.

A próxima ação concreta permanece revisar o executor e o plano determinísticos;
uma nova tentativa remota exige autorização separada e deve reiniciar pelo
inventário somente leitura.

## Marco 6.3A — pacote para Worker direto encerrado

O Marco 6.3A foi preparado a partir de `origin/main` no commit `116edb8`, na
branch `codex/marco-6-3a-worker-direto`, e depois integrado exclusivamente por
fast-forward. O commit técnico
`57a93202e912190e600a86deff64eb3a7b9cde88` (`feat(infra): preparar
implantação direta do Worker`) e o commit documental
`52772619563285968231a83044c865ff49ae0395` (`docs(infra): registrar o Marco
6.3A`) preservaram seus hashes e pais originais. Após a integração, `main` e
`origin/main` chegaram a `52772619563285968231a83044c865ff49ae0395`.

`wrangler.jsonc` agora é a fonte única dos bindings do Worker e declara
exatamente `ASSETS`, `DB`, `STORE_IMAGES` e `IMAGES`. O Cloudflare Vite Plugin
consome esse arquivo diretamente; a configuração inline que duplicava D1 e R2
foi removida. O build Vinext preserva `worker/index.ts` como fonte e produz o
entrypoint implantável `dist/server/index.js`, acompanhado de um manifesto com
uma única declaração de cada binding.

`npm run worker:dry-run` constrói o artefato, executa somente
`wrangler deploy --dry-run`, verifica os quatro bindings na saída real, prova
pelo metafile que o entrypoint é `dist/server/index.js` e remove os arquivos
temporários ao encerrar. Quatro novos testes impedem ausência ou duplicação de
bindings, retorno de `localBindingConfig`, divergência no manifesto Vinext e
dry-run sobre o entrypoint incorreto. Os testes TypeScript passaram a usar
`node --import tsx --test`, sem mudança de versões ou cobertura.

A validação final local, concluída antes da integração, passou com
`npm run lint`, `npx tsc --noEmit`, `npm test` com 84 testes aprovados,
`npm run worker:dry-run`, `npm run build` e `git diff --check`. O lint manteve
somente os dois avisos antigos de `<img>`; o Vinext manteve o aviso conhecido
de que a classificação estática ainda não identifica todas as rotas dinâmicas.
No Windows desta execução, o diretório do Git Bash precisou ser acrescentado ao
`PATH` do processo para que os scripts `bash` existentes fossem encontrados;
os scripts do repositório não foram alterados para contornar o ambiente.

A integração passou por `git diff --check` antes e depois dos fast-forwards.
Lint, TypeScript, testes, build e dry-run não foram repetidos nessa etapa porque
os dois commits permaneceram byte a byte inalterados. A publicação ocorreu
somente no Git: não houve pull request, merge commit, deploy, migration,
validação remota do Worker ou operação na Cloudflare. O checkpoint Sites
existente permanece preservado.

A limpeza final auditou a branch `codex/marco-6-3a-worker-direto` e comprovou
que ela não possuía commits exclusivos. A referência remota foi removida por
push normal, sem force. A primeira execução de `git fetch --prune origin` após
a exclusão foi interrompida porque a configuração local ainda continha um
refspec específico para a branch já apagada. Somente esse refspec obsoleto foi
removido; o refspec da `main` e todos os demais valores legítimos foram
preservados. Depois da correção, `git fetch --prune origin` passou e a branch
local foi removida com `git branch -d`.

A branch `codex/marco-6-3a-worker-direto` não existe mais local nem
remotamente. Os commits `57a9320` e `5277261` continuam preservados e
alcançáveis pela `main`; antes desta atualização documental, `main` e
`origin/main` estavam em `e6060dc`. Nenhum código, dependência ou configuração
de hospedagem foi alterado. Não houve deploy, migration, pull request, merge,
rebase, validação remota do Worker ou operação na Cloudflare. O checkpoint
Sites permanece preservado e o Marco 6.3A está encerrado.

O desenho completo do pacote local está em
`docs/MARCO_6_3A_WORKER_DIRETO.md`; o plano remoto seguinte está em
`docs/MARCO_6_3B_ENSAIO_REMOTO.md`. O Marco 6.3A permanece encerrado e o
Marco 6.3B permanece bloqueado até a autorização A0.

## Marco 6.2 — upload autenticado de imagens concluído localmente

O Marco 6.2 foi desenvolvido a partir do commit aprovado do Marco 6.2C
(`9b7d2c7`) na branch `codex/marco-6-2-upload-imagens`. O painel protegido
agora adiciona, substitui e remove a imagem de um produto persistido, sempre
refazendo no servidor a cadeia sessão → usuária → membership → loja → produto.
O ID da loja presente na rota continua sendo somente contexto e não concede
acesso.

O upload lê no máximo 8 MiB, identifica JPEG, PNG ou WebP estático pelos bytes,
recusa animação e arquivo truncado, confirma formato e dimensões com
`IMAGES.info()`, limita a 4096 × 4096 e 16 megapixels e reprocessa a saída para
WebP de até 1800 px. A saída também possui leitura limitada a 4 MiB e validação
de MIME e assinatura antes de chegar ao R2. IDs e chaves são gerados pelo
servidor e isolados por loja.

Na substituição, o novo objeto é gravado antes de um único `D1.batch()` criar a
mídia e trocar o ponteiro do produto por comparação com o valor anterior. A
mídia antiga só é limpa depois que o novo ponteiro está confirmado. Na
remoção, o produto é desvinculado no D1 antes da tentativa de apagar o objeto.
Falha de limpeza pode deixar mídia órfã para reconciliação posterior, mas ela
não permanece pública e não reverte o ponteiro seguro. As mutações possuem
limite persistente de 10 operações por minuto por usuária e loja.

A interface do painel mostra prévia local, bloqueia arquivos acima do limite e
mantém feedback de adição, substituição e remoção. Os testes cobrem duas lojas,
IDOR antes da transformação, sessão e origem hostil, formatos proibidos,
limites, falha de gravação, ordem segura de substituição/remoção e rate limit.

Validação final local: build Vinext e artefato Sites passaram; TypeScript
passou; lint passou sem erros e com os dois avisos antigos de `<img>`; 80 testes
passaram (24 JavaScript e 56 TypeScript); `git diff --check` passou. Nenhum
deploy, migration, transformação remota, dado real, secret ou operação nos D1
e R2 hospedados foi executado.

A integração no código está pronta, mas a publicação permanece bloqueada: o
Sites atual não expõe de forma documentada o binding customizado `IMAGES` para
o aplicativo principal. A próxima ação concreta é hospedar o Vinext diretamente
em um Cloudflare Worker controlado pelo proprietário, preservar o site atual
como ponto de recuperação e então executar um ensaio remoto ponta a ponta com
dados sintéticos antes de qualquer loja real.

## Marco 6.2C — prova remota aprovada

Em **7 de agosto de 2026**, o subdomínio `workers.dev` foi registrado com
autorização explícita do proprietário e o spike isolado do Images binding foi
executado nas duas modalidades previstas. Não foram usados D1, R2, Assets,
secrets, dados reais ou o Worker principal do Feita.

Na modalidade A, o código permaneceu local e somente o binding `IMAGES` foi
resolvido remotamente com `remote: true`. Na modalidade B, o Wrangler iniciou
um preview remoto temporário, posteriormente encerrado com `Ctrl + C`. Não
houve `wrangler deploy`, publicação do Feita, migration, rota, domínio de
produção ou Images Storage.

Cada modalidade recebeu as mesmas 14 fixtures sintéticas. JPEG, PNG e WebP
estáticos foram transformados; orientação EXIF foi normalizada; metadata
sintética foi removida; e a saída foi WebP válida com uma página. SVG, GIF e
WebP animados, APNG, arquivo truncado, conteúdo falso, excesso de pixels e corpo
acima do limite falharam de modo fechado. O caso com `Content-Type` divergente
foi aceito de acordo com os bytes JPEG reais, sem confiar no cabeçalho.

Os dois modos produziram a mesma matriz: 14 fixtures e 5 transformações únicas
aceitas por execução, total operacional de 10 dentro do teto autorizado de 25.
O resultado é **prova remota aprovada; integração do Images liberada para o
próximo marco**, ainda sem integrar upload ao código de produção.

Os relatórios JSON permaneceram locais em
`spikes/images-binding/.results/`, conforme o `.gitignore`, e não contêm
evidência necessária ao histórico versionado. O registro consolidado está em
`docs/MARCO_6_2C_PROVA_REMOTA_IMAGES.md`.

## Marco 6.2B — prova isolada do Images binding

O Marco 6.2B foi desenvolvido localmente a partir do commit aprovado do Marco
6.1.1 (`31cd65fa`) na branch
`codex/marco-6-2b-prova-images-binding`. O resultado é **prova remota
pendente; não aprovado para integração**.

Um Worker-prova isolado, sem D1, R2, Assets, secrets ou identificadores de
conta, validou as 14 fixtures sintéticas no Images simulado pelo Wrangler. A
leitura de entrada e saída é limitada, `.info()` confirma formato e dimensões,
JPEG/PNG/WebP estáticos produzem WebP validado por assinatura e decoder, e SVG,
GIF animado, WebP animado, APNG, arquivo truncado, conteúdo falso e excesso de
pixels falham fechados. A inspeção estrutural é necessária porque `.info()`
offline não informou animação.

O modo offline removeu a metadata sintética, mas não normalizou a orientação
EXIF. Isso confirma que a simulação de baixa fidelidade não substitui o teste
remoto. A inspeção somente leitura mostrou que o Wrangler não está autenticado;
por isso, binding remoto e `wrangler dev --remote` não foram iniciados. Não
houve login, transformação remota, criação de recurso, migration, deploy ou
mudança em D1, R2, Sites e produção.

A validação final passou com 71 testes (os 64 anteriores e 7 novos), TypeScript,
build Sites, testes próprios do spike e `git diff --check`. O lint permaneceu
sem erros e somente com os dois avisos antigos de `<img>`.

Os detalhes, a matriz completa e os portões para uma continuação controlada
estão em `docs/MARCO_6_2B_PROVA_IMAGES_BINDING.md`. A próxima ação concreta é
executar o Marco 6.2C somente após autorização explícita e com uma sessão
Wrangler já autenticada, mantendo os limites de 25 transformações sintéticas
por modalidade e parando diante de qualquer exigência de billing.

## Marco 6.1.1 — mídia pública vinculada ao produto publicado

O Marco 6.1.1 foi desenvolvido localmente a partir do commit `83e74caf` na
branch `codex/marco-6-1-1-media-publica`, sem schema, migration ou operação
remota. A rota pública deixou de tratar o ID ou a chave de uma mídia do tenant
como autorização suficiente.

Antes de consultar o R2, uma única query parametrizada no D1 agora precisa
comprovar o grafo:

`slug da loja → tenant → produto publicado → products.image_media_id → mídia → objeto R2`

A loja deve estar publicada; produto e mídia devem pertencer ao mesmo tenant;
e o ponteiro atual do produto deve apontar exatamente para a mídia solicitada.
Mídia órfã, de produto despublicado, de outra loja, com associação cruzada ou
substituída responde como recurso inexistente. A negação ocorre antes de
`R2.get`, e os headers e a política de cache da resposta autorizada foram
preservados.

`available = false` continua exibindo produto e imagem na vitrine; somente a
compra fica indisponível conforme a semântica atual. Produto sem mídia mantém o
fallback existente. Catálogo administrativo, carrinho e checkout para WhatsApp
não foram alterados.

Os testes locais usam apenas dados fictícios e cobrem loja não publicada,
duas lojas, associação entre tenants, mídia órfã, produto despublicado,
indisponibilidade comercial, fallback sem imagem, troca do ponteiro, tentativa
direta por chave, respostas 404 equivalentes e ausência de chamada ao R2 após
negação no D1. A validação final passou com 24 testes gerais e 40 provas
TypeScript, totalizando 64 testes. Lint passou com somente os dois avisos
antigos de `<img>`; TypeScript, build Sites e `git diff --check` também
passaram. O hash do commit fica registrado no fechamento da branch.

## Marco 6.1 — catálogo persistente autenticado

O Marco 6.1 foi desenvolvido localmente a partir do commit aprovado do Marco
6.0 (`677bb5f`) na branch `codex/marco-6-1-catalogo-persistente`. O painel
protegido agora administra produtos persistidos no D1, sem alterar `/`, sem
migration e sem qualquer operação remota.

A área `/painel` resolve a loja assim: zero memberships nega a operação; um
membership abre diretamente sua loja; dois ou mais exibem uma seleção
explícita. A rota escolhida contém o ID apenas como contexto. Toda listagem,
criação ou edição refaz no servidor a cadeia sessão → usuário → membership →
loja. O tenant de criação vem do vínculo, nunca do corpo, e recursos são lidos
ou atualizados pela combinação `product.id + tenant_id`. Um produto de outra
loja responde como inexistente.

São operáveis nome, descrição, categoria, preço, estoque, variações,
publicação e disponibilidade. Preços digitados na convenção brasileira são
convertidos exatamente para centavos inteiros; estoque aceita somente inteiro
não negativo até o limite documentado no código. Textos, lista de variações,
flags e tamanho total do payload possuem limites server-side. Campos
desconhecidos — inclusive `storeId`, `tenantId` e `userId` — são recusados.

“Remover da vitrine” apenas define `published = false`: nenhum produto é
excluído. A mídia associada é preservada e permanece somente leitura. Upload,
substituição e remoção de imagens ficam para o Marco 6.2. Pedidos, financeiro e
relatórios continuam fora do escopo. A vitrine pública mantém o carrinho e o
checkout para WhatsApp existentes e passa a refletir as alterações do mesmo D1.

Os testes usam somente dados fictícios e cobrem duas lojas e sessões reais,
IDOR de leitura e mutação, 401/403/404, seleção múltipla, persistência,
publicação, preço, estoque, payload excessivo e origem hostil. A validação final
passou com 24 testes gerais e 29 provas TypeScript de autenticação e catálogo,
totalizando 53 testes. Lint passou com somente os dois avisos antigos de
`<img>`; TypeScript, build Sites e `git diff --check` também passaram. O hash do
commit fica registrado no fechamento da branch.

## Marco 6.0 — portão de segurança da autenticação e dos convites

Em 6 de agosto de 2026, o Marco 5 já estava integrado em `main` e
`origin/main` no commit `ab39089`, com a árvore limpa e 38 testes passando. O
Marco 6.0 foi desenvolvido localmente na branch
`codex/marco-6-0-portao-seguranca`, sem migration nova e sem operação remota.

Os defaults conhecidos de desenvolvimento para `BETTER_AUTH_SECRET` e
`RATE_LIMIT_HMAC_SECRET` agora só podem ser usados quando a origem da requisição
e o `BETTER_AUTH_URL` efetivo são loopback: `localhost`, `127.0.0.1` ou `[::1]`,
com porta local opcional. Produção, preview, alias, domínio alternativo, host
arbitrário e IP não loopback exigem os dois secrets no runtime e falham de
forma fechada quando eles não existem. Enquanto qualquer default local estiver
ativo, `AUTH_TRUSTED_ORIGINS` também aceita somente origens loopback.

A aceitação de convite passou a ser recuperável em duas fases. A criação da
conta continua sob responsabilidade da Better Auth e não participa da mesma
transação da finalização do convite. Se a conta já existir — inclusive depois
de uma tentativa parcial — a mesma submissão precisa provar e-mail e senha pela
Better Auth; possuir somente o código não concede vínculo. A sessão técnica
criada para essa prova é removida antes da finalização. Membership, marcação do
e-mail como verificado, consumo do convite e auditoria são executados no mesmo
`D1.batch()`. Falhas tratadas liberam a reivindicação imediatamente; uma
interrupção abrupta deixa uma lease que pode ser retomada depois de cinco
minutos. Convite consumido continua recusado e a restrição única impede
membership duplicado.

Validação do marco: lint passou com os dois avisos antigos de `<img>` e nenhum
erro; TypeScript passou; `npm test` passou com 24 testes gerais mais 19 provas
de autenticação; o build Sites passou separadamente; `git diff --check` passou.
A revisão final não encontrou bypass de signup, distinção de resposta por
existência de conta, reutilização de convite ou valor de secret em resposta,
log ou documentação. Nenhuma migration foi criada ou aplicada e nenhuma ação
remota ocorreu.

Riscos restantes: secrets hospedados e Resend continuam não configurados; a
emissão de convite ainda não possui superfície de `platform_admin`; uma queda
abrupta durante a prova de credenciais pode deixar uma sessão técnica sem token
exposto até ela expirar; e a publicação do Marco 5/6.0 continua bloqueada até
autorização e ensaio próprios. A próxima ação de código é o primeiro incremento
tenant-scoped do catálogo, sem misturá-lo a este portão.

## Auditoria técnica e transferência de conhecimento

Em 29 de julho de 2026, o estado foi confirmado novamente a partir do Git,
código integrado, configuração Sites em modo somente leitura e validações
locais. `main` e `origin/main` estavam sincronizadas em `bc61719`, sem mudanças
iniciais. O projeto Sites continuava ativo na versão 7, na mesma URL e com
acesso `custom` somente para Lorenzo.

Foi criado `docs/GUIA_TECNICO_FEITA.md` com mapa do sistema, fluxo
slug → D1 → R2, comandos locais, diagnóstico, recuperação sem perda de dados e
três exercícios operacionais. `data/local/` passou a ser ignorado pelo Git para
receber somente fixtures de trabalho locais.

Esta auditoria corrigiu textos antigos que ainda descreviam D1/R2 hospedados
como inexistentes ou desligados. Não houve defeito de runtime no Marco 4:
lint passou sem erros e manteve dois avisos conhecidos de `<img>` no sandbox,
TypeScript passou, 22/22 testes passaram, build/artefato Sites passaram e
`git diff --check` passou. Nenhum dado real foi importado, nenhum recurso,
acesso ou versão Sites foi alterado e não houve deploy ou push.

## Marco 5 — autenticação e isolamento (integrado; não publicado)

Em 29 de julho de 2026 foi criada a branch
`codex/marco-5-autenticacao` a partir do `main` limpo, que estava um commit
documental à frente de `origin/main`. O fetch foi somente leitura.

O trabalho foi posteriormente integrado em `main` e `origin/main` no commit
`ab39089`. A integração no Git não publicou a autenticação nem aplicou a
migration em ambiente hospedado.

O marco implementa Better Auth `1.6.25` sobre D1/Drizzle, login, logout,
recuperação por OTP, convites de uso único, `store_memberships`, auditoria,
rate limit persistente, entrega local sem rede, adaptador Resend e `/painel`
protegido. As interfaces `/entrar`, `/esqueci-minha-senha`,
`/redefinir-senha` e `/aceitar-convite` são mobile-first, acessíveis e não
exibem provedores ainda inexistentes.

O signup público do Better Auth é recusado. Uma loja e um papel só entram pela
abstração server-side de convite. Toda autorização administrativa segue
sessão → usuário → membership → loja; nenhum identificador vindo do navegador
concede acesso.

A migration `drizzle/0001_shallow_robbie_robertson.sql` foi gerada e aplicada
somente em bancos Miniflare temporários. A suíte automatizada cobre login,
logout, sessão expirada/revogada, duas contas/lojas, 403 sem vínculo,
recuperação genérica, OTP expirado/reutilizado, revogação após redefinição,
rate limit 429, CSRF/origem, cookie seguro, segredo ausente do bundle, signup
fechado, D1 limpo e regressão do Marco 4.

Validação final: lint passou com zero erros e os dois avisos antigos de `<img>`;
TypeScript passou; `npm test` passou com 24 testes gerais mais 14 provas do
Marco 5; o build Sites passou separadamente; `git diff --check` passou. O audit
registrou quatro alertas moderados ligados ao `drizzle-kit` e alertas altos na
cadeia local de lint, sem correção automática compatível; nenhum desses pacotes
de ferramenta foi encontrado no bundle do Worker.

Portões restantes: secrets de produção, domínio/remetente Resend, autorização
para migration hospedada e operação autenticada de emissão de convites. O
Marco 6.0 resolveu localmente o retry seguro para conta já existente, mas
nenhum dos demais itens foi configurado ou executado.

## Onde estamos

O Marco 4 foi validado, enviado na branch
`codex/marco-4-loja-compartilhavel`, registrado no PR
`https://github.com/javaaaaa-271/feita/pull/1` e integrado por fast-forward à
`main` no commit `6b26557`. As branches dos Marcos 3 e 4 foram preservadas.

O projeto Sites existente publicou a versão 7 com status final `succeeded` em:

https://projeto-vitrine-mvp.javaaaa-237.chatgpt.site

A política `custom` continua permitindo somente Lorenzo, sem grupos. O fluxo
oficial do Sites conectou D1 e R2 pelos bindings `DB` e `STORE_IMAGES` e recebeu
a migration em `dist/.openai/drizzle`. Nenhuma fixture, dado real ou catálogo
foi importado no ambiente hospedado; o checkpoint contém somente código,
schema e recursos vazios. Além do protótipo navegável, agora existe:

- painel;
- catálogo;
- cadastro de produto em gaveta lateral;
- upload e prévia local de foto;
- vitrine pública persistida em `/loja/[slug]`;
- carrinho com variação, quantidade e total;
- checkout com nome da cliente, entrega ou retirada, endereço, pagamento e
  observações;
- mensagem estruturada e URL codificada para o WhatsApp configurado;
- edição, busca, filtros, disponibilidade e estoque do catálogo;
- D1 e R2 locais e hospedados com migration versionada;
- identidade, catálogo, estoque, variações e imagens duráveis;
- carrinho persistido por navegador e separado por slug;
- importador local validado, com dry-run e sem sobrescrita;
- leitura pública isolada por loja e nenhuma API pública de escrita;
- fundação de contas por convite integrada na `main`, ainda não publicada;
- painel mínimo protegido que mostra somente os vínculos permitidos.

O painel em `/` continua sendo o sandbox de sessão do Marco 3 e não administra
o novo catálogo persistido. A autenticação e o painel mínimo estão integrados
na `main`, mas não foram publicados; CRUD administrativo, persistência de
pedidos e importação hospedada continuam não implementados.

## Marco 4 — primeira loja compartilhável

### Decisões

- D1 é a fonte autoritativa de loja/produtos e R2 guarda imagens.
- Preço é inteiro em centavos e todo registro de negócio possui `tenant_id`.
- A rota pública deriva o tenant do slug publicado; IDs enviados pelo cliente
  nunca escolhem outra loja.
- Imagens são validadas, decodificadas, redimensionadas, convertidas para WebP
  e recebem chave aleatória.
- O carrinho pode ficar em `localStorage` porque pertence à cliente; catálogo e
  configuração nunca ficam ali.
- Sem autenticação, a única mutação é o importador local operado por Lorenzo.
- Better Auth permanece a recomendação para autonomia futura da comerciante.

### Testes executados

- migration D1 em estado temporário limpo;
- reabertura de D1/R2 confirmou persistência;
- duas lojas confirmaram ausência de vazamento em catálogo e mídia;
- slug inexistente/loja oculta/produto oculto retornaram estados seguros;
- carrinho descartou produto oculto/sem estoque e limitou quantidade;
- telefone brasileiro, destino direto e texto acentuado foram validados;
- imagem falsa e maior que 10 MB foram recusadas;
- imagem válida virou WebP de até 1800 px sem EXIF/ICC;
- inspeção confirmou que as rotas públicas exportam somente `GET`;
- `npm run lint`: sem erros, com os mesmos dois avisos de `<img>` do Marco 3;
- `npx tsc --noEmit`: passou;
- `npm test`: 22/22 passaram, incluindo build e testes antigos/novos;
- `git diff --check`: passou.

O servidor local respondeu `200` e renderizou a loja fictícia persistida.
Desktop e 390 × 844 foram inspecionados visualmente sem rolagem horizontal.
Catálogo, variação, estoque, carrinho, recarga, checkout, revisão e URL do
WhatsApp passaram sem abrir o WhatsApp. In-app Browser e Chrome viram o mesmo
slug e a imagem R2 persistida, mantendo carrinhos independentes. Não houve erro
da aplicação no console.

### Riscos e próxima ação concreta

- não houve teste em aparelho real;
- o painel de sessão e a vitrine persistida ainda são superfícies separadas;
- pedidos continuam sem persistência, deliberadamente;
- o importador é local e não escreve no D1 hospedado;
- a ferramenta Sites não expôs uma consulta SQL remota para contagem
  independente; a ausência de dados hospedados foi preservada porque o
  checkpoint provisionou recursos novos e executou somente migrations;
- a verificação automatizada do Sites registrou `404` apenas para fontes sob o
  caminho interno `/workspace/sites/...`; não houve exceção do Worker, mas
  Lorenzo deve confirmar tipografia no navegador dele.

Próxima ação: Lorenzo deve abrir a URL publicada no navegador dele, confirmar
acesso, tipografia e navegação e então reunir conscientemente os dados listados
em `data/first-store.template.json`. Uma execução separada deverá preparar o
arquivo ignorado, fazer dry-run, implementar/autorizar o procedimento
administrativo hospedado e só então importar e testar em dois celulares.

## Marco 3 — preparação para uso real

Concluído em 28 de julho de 2026, sem deploy.

### O que foi implementado

- cadastro e edição preservam descrição, publicação, estoque e opções separadas
  por vírgula;
- produto não publicado não aparece na vitrine;
- produto sem estoque aparece indisponível e não entra no carrinho;
- carrinho consolida o mesmo produto e variação, permite ajustar quantidades e
  respeita o estoque;
- checkout diferencia entrega e retirada, exige endereço para entrega e coleta
  forma de pagamento e observações;
- a etapa de revisão mostra o texto completo antes de oferecer
  **Abrir WhatsApp**;
- a URL `wa.me` usa `encodeURIComponent`, sem enviar a mensagem
  automaticamente;
- busca, filtros por disponibilidade/estoque, categorias da vitrine e cópia do
  link passaram a funcionar;
- os números fictícios de venda e pedido foram removidos do painel;
- metadados do starter foram substituídos pelos da Feita e o idioma do HTML
  passou para `pt-BR`;
- declarações mínimas do runtime Cloudflare foram adicionadas localmente para
  que o TypeScript valide Worker e D1 sem ativar bindings;
- `docs/MARCO_3_USO_REAL.md` contém preparação, cinco roteiros, observação,
  severidade e tabela de ocorrências.

### Testes executados

- baseline antes das alterações: lint com dois avisos preexistentes de `<img>`,
  build e 5 testes passando;
- `npm test`: build Sites validado e 11 de 11 testes passando;
- `npx tsc --noEmit`: passou; antes da declaração local, o comando expunha os
  tipos ausentes de `cloudflare:workers`, `Fetcher` e `D1Database`;
- testes unitários cobrem reais, pedido simples, vários itens, variação,
  entrega, retirada, observação, obrigatórios, carrinho vazio,
  indisponibilidade e codificação da URL;
- teste manual no navegador local cobriu edição, busca, variação, múltiplos
  itens, estoque zero, link copiado, entrega, pagamento, observação, mensagem
  copiada e URL do WhatsApp;
- viewport de 390 × 844 sem rolagem horizontal no checkout ou na vitrine;
- nenhum erro ou aviso foi registrado no console do navegador durante o fluxo;
- `git diff --check`: passou.

### Riscos e bloqueios

- **P0 para compartilhamento externo:** o catálogo é estado local; copiar o link
  não transfere produtos para outro navegador ou aparelho;
- recarregar a página apaga catálogo e carrinho;
- a URL do WhatsApp não contém o número da loja, então a cliente ainda precisa
  escolher o contato;
- fotos usam URL local temporária e não sobrevivem ao recarregamento;
- não existe pedido persistido ou histórico;
- os dois avisos preexistentes de `<img>` permanecem; trocar por `next/image`
  depende de decidir o pipeline definitivo de imagens.

### Próxima ação registrada no Marco 3 (superada)

Lorenzo deve seguir `docs/MARCO_3_USO_REAL.md` com a primeira comerciante, sem
recarregar a página, executar os cinco pedidos e registrar toda ocorrência P0,
P1 ou P2. Só depois da rodada deve-se decidir se a próxima menor fatia é
persistência do catálogo, configuração do número da loja ou correção de
clareza observada. O Marco 4 local executou a fatia de persistência; a rodada
com a comerciante e qualquer publicação continuam pendentes.

O `main` do GitHub foi reorganizado no commit
`9c8b89e66de93e9a572662abb25c5d1568bebd0f`
(`Restore project directory structure`).

O marco de dependências, headers e testes foi consolidado no commit
`13958d35656127cb0a7fb52470368803eb6b70fb`
(`Harden production dependencies and HTTP responses`) e enviado para
`origin/main`.

## Arquitetura atual

- Next.js 16 + React 19;
- Vinext/Vite;
- hospedagem Sites sobre Cloudflare;
- `app/page.tsx` mantém o sandbox operacional do Marco 3;
- `app/loja/[slug]` implementa a vitrine pública persistida;
- `app/globals.css` e o CSS module da vitrine contêm os sistemas visuais;
- `db/schema.ts` define lojas, produtos e mídia;
- D1/R2 estão ativos na emulação local e conectados ao checkpoint hospedado;
  o ambiente hospedado continua sem dados comerciais;
- `.openai/hosting.json` mantém o vínculo com o site já existente;
- a política `custom` do Sites é a proteção efetiva do checkpoint hospedado;
  `app/chatgpt-auth.ts` contém helpers de identidade, mas não é importado pelas
  rotas atuais e não é autenticação das clientes da Feita.

## Auditoria de segurança inicial

O produto ainda não possui autenticação de clientes, JWT ou dados pessoais.
Existe uma API própria somente de leitura para imagens e existem queries D1
parametrizadas. Rate limit e enumeração de e-mail seguem sem superfície porque
não há login; IDOR de leitura foi coberto localmente com duas lojas, enquanto
qualquer mutação autenticada permanece bloqueada.

Constatações atuais:

- CORS não refletiu uma origem arbitrária no teste inicial;
- métodos mutáveis na rota principal retornaram `405`;
- headers de segurança contra clickjacking e endurecimento do navegador foram
  adicionados e cobertos por testes automatizados;
- existem alertas de dependências que devem ser reavaliados e corrigidos antes
  da autenticação;
- o importador local valida e reprocessa imagens no servidor; um futuro upload
  remoto ainda exigirá autenticação e rate limit.

Detalhes e critérios obrigatórios estão em `docs/SECURITY.md`.

## Dependências reauditas

A primeira ação da fundação segura da Fase 2 foi concluída em 28 de julho de
2026:

- Next.js, React, React DOM, React Server Components, Vite, Wrangler e os
  plugins de Vite/Cloudflare foram atualizados para versões corrigidas;
- `postcss` e `sharp` receberam versões mínimas seguras por `overrides`, porque
  o Next.js 16.2.12 ainda fixa versões transitivas afetadas;
- `npm audit --omit=dev` passou com zero vulnerabilidades;
- a auditoria completa ainda aponta alertas somente em ferramentas de
  desenvolvimento: a cadeia de lint baseada em `brace-expansion` e o
  `drizzle-kit` legado baseado em `esbuild`;
- não foi usado `npm audit fix --force`: as correções propostas trocam versões
  de forma incompatível e precisam aguardar atualização dos pacotes de origem.

Validações executadas:

- `npm run lint`: passou com dois avisos preexistentes de `<img>`;
- `npm test`: passou, incluindo build Vinext, validação do artefato Sites e 1
  teste de HTML;
- `git diff --check`: passou em uma cópia temporária autenticada do repositório
  de origem do Sites, usada porque a pasta de trabalho recebida não contém
  metadados `.git`.

O clone oficial foi restaurado nesta pasta antes do marco seguinte. O remoto
`origin` aponta para `javaaaaa-271/feita`, a branch é `main` e as quatro
alterações deste marco de dependências foram preservadas sem staging.

## Headers de segurança

A segunda ação da fundação segura da Fase 2 foi concluída em 28 de julho de
2026, sem iniciar autenticação:

- o Worker aplica headers de segurança a todas as respostas da aplicação,
  inclusive erros `405` e a rota de otimização de imagens;
- a CSP bloqueia framing, objetos, bases e formulários externos e restringe
  scripts, estilos, imagens, fontes, conexões e workers;
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, COOP e CORP complementam o endurecimento;
- HSTS é enviado somente quando a requisição usa HTTPS;
- CORS usa uma origem de produção fixa, inclui `Vary: Origin` e não reflete
  origens arbitrárias nem habilita credenciais.

Validações executadas:

- `npm run lint`: passou com os dois avisos preexistentes de `<img>`;
- `npm test`: passou com build Vinext, validação do artefato Sites e 5 testes;
- `git diff --check`: passou.

Risco conhecido: o HTML gerado pelo Vinext usa scripts e estilos inline para
hidratação, então a CSP ainda contém `unsafe-inline`. A política deve migrar
para nonces antes de tratar conteúdo não confiável ou ampliar integrações.

## Objetivo arquitetural futuro

Esta sequência permanece aprovada, mas não é a próxima ação. Ela só começa
depois que o uso com a primeira comerciante validar o ciclo local e houver
decisão explícita de avançar para a segunda e a terceira loja.

Ordem proposta:

1. ~~atualizar e reauditar dependências~~ — concluído;
2. ~~adicionar headers de segurança e testes~~ — concluído;
3. ~~registrar a decisão de autenticação e banco~~ — concluído;
4. implementar cadastro, login e sessão persistente;
5. implementar “esqueci minha senha” e redefinição por e-mail;
6. ligar cada usuária à própria loja;
7. provar isolamento com duas contas e duas lojas;
8. ligar os adaptadores locais de produtos e imagens aos recursos reais somente
   depois dessas barreiras.

## Decisão de autenticação e persistência

O `ADR-001-AUTENTICACAO-E-PERSISTENCIA.md` recomenda Better Auth + Cloudflare
D1 + R2 para o primeiro MVP real.

Motivos determinantes:

- a alternativa usa a preparação atual de Worker, Sites, D1 e Drizzle;
- Better Auth mantém sessões revogáveis em cookies `HttpOnly` e processa
  senhas com uma biblioteca dedicada;
- recuperação pode usar OTP digitado, sem token em URL;
- Supabase/PostgreSQL tem a vantagem forte de RLS, mas o caminho SSR
  documentado pressupõe tokens acessíveis ao navegador e exigiria uma camada
  BFF adicional para cumprir a regra `HttpOnly` da Feita;
- manter Supabase Auth com D1 perderia RLS e criaria dois planos operacionais.

Risco principal: D1 não oferece RLS. Toda autorização precisa ocorrer no
servidor, sempre combinando o recurso com o `tenant_id` derivado da sessão.
Testes com duas usuárias e duas lojas continuam sendo critério de parada.

Os nomes lógicos `DB` e `STORE_IMAGES`, o schema, a migration e a rota pública
foram adicionados no Marco 4. O projeto Sites conectou os recursos hospedados
no checkpoint controlado, enquanto o importador continua exclusivamente local
e nenhuma loja real foi carregada. Autenticação não foi adicionada.

## Dependências para a implementação futura

Quando a autenticação for autorizada, ela exigirá escolhas ou recursos do
usuário:

1. escolher e criar a conta do provedor de e-mail transacional;
2. definir domínio/subdomínio e remetente;
3. disponibilizar as credenciais somente pelo runtime do Sites;
4. autorizar a ativação do binding D1 no projeto existente.

Depois da autorização futura, a primeira ação exata será implementar somente o
Marco A do ADR:
schema mínimo, cadastro com verificação por OTP, login, logout, cookie seguro,
rate limit por IP/e-mail e testes de sessão. Recuperação, loja e produtos ficam
em commits posteriores.

## Validação do marco arquitetural

Executado depois da documentação da decisão:

- `npm run build`: passou e validou o artefato Sites;
- `npm test`: passou com 5 de 5 testes, incluindo a regressão dos headers;
- `npm run lint`: passou sem erros e manteve somente os dois avisos
  preexistentes de `<img>`;
- `npm audit --omit=dev`: zero vulnerabilidades;
- `git diff --check`: passou;
- revisão do diff e busca por segredos: somente documentação do marco, sem
  credenciais ou valores sensíveis.

Não houve novo deploy do Sites: este marco não altera o runtime e a
autenticação incompleta não deve ser publicada.

## Critério do futuro marco de contas

Duas usuárias conseguem:

- criar conta;
- entrar e sair;
- solicitar redefinição de senha sem revelar se o e-mail existe;
- acessar somente a própria loja;
- manter a sessão de forma segura;
- falhar de modo previsível sob tentativas repetidas.

O marco só termina com testes automatizados de headers, autenticação e
isolamento entre lojas.

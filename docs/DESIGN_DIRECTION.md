# Direção de design da Feita

> Exploração local para revisão. Este documento não autoriza publicação,
> alteração de marca definitiva nem compra/licenciamento de ativos.

Atualizado em: **1º de setembro de 2026**

## Tese

A Feita deve parecer **humana na marca e precisa na operação**. A landing e a
vitrine podem carregar calor, ritmo editorial e uma imagem memorável. O painel
deve transmitir o mesmo caráter com menos espetáculo: informação estável,
ações claras e respostas rápidas.

A frase que guia a linguagem visual é:

> Feito à mão. Organizado pela Feita.

Ela é uma direção de trabalho, não texto aprovado para publicação.

## O que as referências realmente ensinam

| Referência | Aproveitar | Não transportar para a Feita |
| --- | --- | --- |
| [Razorpay Sprint 2026](https://razorpay.com/sprint/26) | capítulos legíveis, continuidade entre blocos, rolagem que explica e sensação de resposta | densidade futurista, escala de lançamento corporativo e movimento constante no painel |
| [Awwwards — UI](https://www.awwwards.com/websites/ui-design/) | contraste, tipografia, composição, microinterações e cuidado com transições | tratar prêmio visual como objetivo maior que usabilidade |
| [Awwwards — Scrolling](https://www.awwwards.com/websites/scrolling/) | progressão narrativa na landing e revelação de contexto | scroll sequestrado, parallax em excesso e conteúdo que se move enquanto a usuária tenta lê-lo |
| [Recent — Websites](https://recent.design/websites) | repertório contemporâneo de web, interface, marca e tipografia | misturar tendências incompatíveis numa única identidade |
| [Recent — App icons](https://recent.design/app-icons) | simplicidade de silhueta, leitura em tamanho pequeno e acabamento | copiar símbolo, paleta ou efeito de outro produto |
| Product Hunt | densidade informativa e descoberta de produtos | aparência de feed, votação ou comunidade que a Feita não possui |

## Diagnóstico e mudança proposta

| Antes | Depois | Por quê |
| --- | --- | --- |
| `f.` dentro de um quadrado marrom | símbolo proprietário acompanhado do nome `Feita` | o marcador atual funciona como provisório, mas não cria memória de marca |
| hero com texto e cartão estático de pedido | demonstração curta do caminho produto → vitrine → pedido → WhatsApp | a primeira dobra passa a provar o valor, não apenas descrevê-lo |
| todas as seções com peso visual parecido | ritmo editorial com uma imagem dominante, capítulos e pausas | cria primeira impressão sem adicionar mais texto |
| painel quase todo branco | papel quente, superfícies claras, bordas firmes e profundidade discreta | separa áreas sem transformar tudo em cards |
| navegação lateral larga e passiva | coluna compacta, estado ativo claro e resposta curta ao clique | libera espaço e deixa o painel mais intencional |
| serifas ausentes ou usadas sem sistema | serifa apenas em mensagens e títulos expressivos; sans em operação | personalidade na marca sem prejudicar leitura de dados |
| movimento como possibilidade genérica | movimento com função, duração curta e redução de movimento | a interface parece viva sem ficar lenta ou cansativa |

## Fundação visual proposta

### Personalidade

- acolhedora, competente e direta;
- artesanal sem parecer rústica;
- contemporânea sem parecer uma fintech genérica;
- feminina por sensibilidade e contexto, não por estereótipos visuais;
- brasileira no tom e na proximidade, sem folclore decorativo.

### Cor

- **papel quente** para a base;
- **tinta escura** para texto e estrutura;
- **terracota/vinho** como assinatura e ação principal;
- **verde profundo** para confirmação, disponibilidade e WhatsApp;
- cores da loja aparecem na vitrine, não devem dominar o painel da Feita.

Antes de publicar, todas as combinações precisam passar por contraste WCAG e
teste em celular sob brilho baixo.

### Tipografia

- uma sans clara e compacta para navegação, campos, tabelas e valores;
- uma serif display com licença adequada apenas para hero, frases-chave e
  títulos de alto nível;
- números operacionais permanecem na sans, com alinhamento e leitura rápidos;
- nenhuma fonte nova entra no runtime antes da escolha e conferência de licença,
  peso, acentos em português e custo de carregamento.

### Superfícies

- usar borda antes de sombra;
- sombra apenas para elementos elevados ou clicáveis;
- fundo levemente tingido para distinguir regiões;
- raio consistente: pequeno em controles, médio em painéis, circular somente
  para estado, avatar e elementos naturalmente redondos;
- evitar bento grid decorativo e uma tela formada inteiramente por cards.

## Landing page

### Primeira dobra

1. Marca e navegação compactas.
2. Uma promessa direta: organizar produtos e receber pedidos claros.
3. Uma ação dominante para criar a vitrine e uma secundária para explorar.
4. Uma demonstração visual realista do produto, não uma ilustração genérica.
5. Prova honesta de estágio: teste sem cartão, sem estatísticas inventadas.

### Hero proposto

O painel de demonstração do hero terá três estados controlados pela rolagem ou
por toque:

1. uma empreendedora publica um produto;
2. a cliente adiciona esse produto ao pedido;
3. o pedido chega organizado e segue para o WhatsApp.

No desktop, o exemplo visual pode permanecer fixo por um trecho curto enquanto
o texto muda. No celular, os três estados viram uma sequência vertical simples;
o conteúdo nunca depende de arrastar, passar o mouse ou assistir à animação.

### Ritmo da página

- hero de prova do produto;
- seção curta “como funciona”, numerada em três capítulos;
- vitrine realista com produtos e múltiplas imagens quando esse marco existir;
- bloco de confiança com privacidade, controle dos dados e simplicidade;
- preço anual apresentado com equivalente mensal somente como explicação;
- chamada final curta.

Não entram agora: depoimentos inventados, logotipos de clientes inexistentes,
contadores sem dados, vídeo de fundo, 3D e rolagem horizontal obrigatória.

## Painel

### Já aplicado localmente

- lateral reduzida de 232 para 196 pixels;
- bordas mais presentes;
- fundo e superfícies com níveis diferentes;
- título de visão geral com caráter editorial;
- estado ativo da navegação mais claro;
- feedback de pressão, hover e abertura de menu;
- `prefers-reduced-motion` para retirar movimento desnecessário.

### Próxima revisão proposta

1. Substituir letras e símbolos improvisados por um conjunto pequeno de ícones
   coerentes, somente onde acelerarem reconhecimento.
2. Dar hierarquia real a vazio, carregando, erro, sucesso e indisponibilidade.
3. Transformar o checklist em orientação contextual, sem balões repetidos.
4. Acrescentar métricas somente quando houver pedidos e dados confiáveis.
5. Criar um editor simples da vitrine: cor, ordenação de produtos, destaque e
   prévia; sem construtor livre de páginas.
6. Reservar animações mais ricas para primeira entrada, conclusão de uma etapa
   ou publicação da vitrine.

## Símbolo e ícone

O símbolo precisa funcionar em 16 pixels, favicon, avatar, cabeçalho e uma cor.
Três territórios devem ser prototipados antes de escolher:

1. **Marca de quem fez:** um selo simples, irregularidade controlada e presença
   de assinatura; comunica autoria.
2. **Laço que conclui:** uma linha contínua forma discretamente um `f` e um gesto
   de conclusão; comunica processo organizado.
3. **Etiqueta dobrada:** referência a produto, catálogo e algo preparado para
   venda; comunica vitrine sem usar sacola ou carrinho genéricos.

Evitar: check isolado, sacola, carrinho, caixa, raio, estrela de IA, gradiente
roxo/azul e qualquer aproximação do símbolo do WhatsApp.

Os três territórios devem ser comparados primeiro em preto e branco. Cor,
textura e volume só entram depois que a silhueta funcionar.

## Movimento

| Situação | Função | Tratamento |
| --- | --- | --- |
| botão pressionado | feedback | escala sutil, 100–160 ms |
| menu da loja | origem espacial | opacidade e pequena translação, 150–200 ms |
| progresso do checklist | mudança de estado | transformação curta, sem contagem teatral |
| primeira entrada no painel | orientação | revelação única e discreta |
| hero da landing | explicação | sequência mais longa, controlável e não bloqueante |
| navegação frequente | velocidade | quase instantânea; sem transição de página decorativa |

Toda animação precisa manter interação disponível, usar preferencialmente
`transform` e `opacity`, respeitar `prefers-reduced-motion` e funcionar sem
hover no celular.

## Ordem de decisão quando o proprietário voltar

1. Aprovar ou rejeitar a tese “humana na marca, precisa na operação”.
2. Escolher um dos três territórios de símbolo para protótipo.
3. Aprovar o hero em três estados antes de escrever animação.
4. Revisar o painel atual em desktop e celular.
5. Implementar apenas a opção aprovada e validar desempenho/acessibilidade.
6. Publicar somente com autorização explícita e no projeto Sites existente.

## Critério de pronto da próxima camada

- a marca é reconhecível sem depender do quadrado com `F`;
- a primeira dobra explica o produto em menos de dez segundos;
- a ação principal é inequívoca;
- a landing continua utilizável com movimento reduzido e JavaScript lento;
- o painel permanece mais rápido e calmo que a landing;
- celular não recebe uma versão empobrecida ou dependente de hover;
- nenhum ativo ou padrão de concorrente é copiado;
- build, testes, lint, contraste e revisão visual passam antes de publicar.

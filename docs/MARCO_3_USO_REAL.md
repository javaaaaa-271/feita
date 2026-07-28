# Marco 3 — teste de uso real

Este guia ajuda Lorenzo e a primeira comerciante a verificar se a Feita organiza
um pedido do catálogo até a mensagem do WhatsApp.

## 1. Objetivo do teste

O teste deve responder a uma pergunta simples:

> A comerciante consegue cadastrar os produtos e entender, sem adivinhar,
> exatamente o que a cliente pediu?

Neste marco, o pedido é montado e revisado no navegador. Nada é enviado
automaticamente. A pessoa só sai da Feita quando decide abrir o WhatsApp.

## Limite importante antes de começar

Os produtos ainda ficam somente na sessão aberta. Recarregar a página apaga o
catálogo cadastrado. Um link aberto em outro aparelho também não leva os
produtos desta sessão.

Por isso, esta rodada valida o cadastro e os cinco pedidos **no mesmo navegador,
sem recarregar a página**. Ela ainda não valida uma vitrine pública
personalizada em outro celular. Resolver isso exige a persistência que foi
deliberadamente deixada para um marco futuro.

## 2. Preparação do catálogo

Antes da visita da comerciante:

1. Reserve de 45 a 60 minutos sem interrupções.
2. Use um celular que ela já conheça.
3. Separe as fotos e as informações dos produtos reais.
4. Tenha papel ou este documento aberto para anotar dificuldades.
5. Abra a Feita e não recarregue a página durante a rodada.
6. Não clique em **Carregar dados fictícios de teste**. Esse botão serve apenas
   para testes técnicos locais.

Para cada produto, separe:

- nome;
- categoria;
- preço;
- quantidade disponível;
- opções que a cliente precisa escolher, como cor, tamanho ou sabor;
- descrição curta;
- foto em JPG, PNG ou WebP com até 5 MB;
- decisão de mostrar ou não o produto na vitrine.

Não invente informações para preencher campos. Quando um dado real não existir,
deixe o campo opcional vazio.

## 3. Como cadastrar os produtos reais

1. Entre em **Produtos**.
2. Toque em **Novo produto**.
3. Preencha nome, categoria, preço e estoque.
4. Se houver escolhas, escreva cada opção separada por vírgula. Exemplo:
   `Azul, Verde, Rosa`.
5. Adicione a descrição e a foto quando existirem.
6. Mantenha **Publicar na vitrine** ligado somente para itens que podem ser
   pedidos.
7. Toque em **Salvar produto**.
8. Use **Editar** para corrigir preço, estoque, descrição, opções ou
   disponibilidade.
9. Repita até terminar o catálogo que será usado nos cinco pedidos.

Um item com estoque zero continua visível como indisponível, mas não pode ser
adicionado ao pedido. Um item não publicado não aparece na vitrine.

## 4. Checklist antes de abrir a vitrine

- [ ] Todos os nomes correspondem aos produtos reais.
- [ ] Todos os preços estão em reais e com os centavos corretos.
- [ ] As categorias ajudam a encontrar os itens.
- [ ] As opções estão separadas por vírgula e sem duplicatas.
- [ ] O estoque representa o que pode ser vendido agora.
- [ ] Itens que não podem ser vendidos estão sem estoque ou não publicados.
- [ ] As fotos pertencem à comerciante e mostram o produto correto.
- [ ] As descrições não prometem prazo ou condição que não possa ser cumprida.
- [ ] A busca e os filtros da lista foram testados.
- [ ] A vitrine foi aberta e revisada no celular.

## 5. Cinco roteiros de pedido

Use produtos reais do catálogo. Não envie a mensagem durante o ensaio: pare na
tela **Revise a mensagem**.

### Pedido 1 — simples para retirada

1. Adicione uma unidade de um produto simples.
2. Abra o pedido.
3. Informe o nome da cliente.
4. Escolha **Retirada** e **Pix**.
5. Revise a mensagem.

Confirme se aparecem produto, quantidade, preço, total, retirada e pagamento.

### Pedido 2 — vários itens e quantidades

1. Adicione dois produtos diferentes.
2. Adicione duas ou mais unidades de pelo menos um deles.
3. Abra o pedido e ajuste uma quantidade com os botões `−` e `+`.
4. Escolha **Retirada** e **Dinheiro**.
5. Revise a mensagem.

Some os valores à mão e compare com o total da Feita.

### Pedido 3 — produto com opção

1. Escolha um produto que tenha cor, tamanho, sabor ou outra opção.
2. Selecione uma opção diferente da primeira.
3. Adicione o produto.
4. Escolha **Retirada** e **Cartão na entrega ou retirada**.
5. Revise a mensagem.

Confirme se a opção escolhida aparece na mesma linha do produto.

### Pedido 4 — entrega

1. Monte um pedido com um ou mais produtos.
2. Escolha **Entrega**.
3. Tente continuar sem endereço e observe o bloqueio.
4. Informe rua, número, complemento e bairro.
5. Escolha uma forma de pagamento e revise.

Confirme se a mensagem diferencia entrega de retirada e mostra o endereço
completo.

### Pedido 5 — observação e caracteres especiais

1. Monte um pedido.
2. Use um nome e uma observação reais que contenham acento, espaço ou pontuação.
3. Escreva uma observação em duas linhas.
4. Revise a mensagem.
5. Use **Copiar mensagem** e cole em um bloco de notas.

Confirme se os acentos, as quebras de linha, os valores e a pontuação continuam
corretos. Não abra o WhatsApp durante este ensaio.

## 6. O que observar

Durante o uso, não explique o próximo passo imediatamente. Anote:

- onde a comerciante hesita;
- palavras que ela não entende;
- campos que ela procura e não encontra;
- dados que ela preenche de forma diferente do esperado;
- produtos que não cabem no modelo atual;
- opções ou regras que tornam o pedido ambíguo;
- dificuldade para corrigir um produto;
- dificuldade para identificar item indisponível;
- erro de quantidade, valor ou total;
- dificuldade para distinguir entrega e retirada;
- informação que falta na mensagem final;
- necessidade de ajuda no celular.

Uma preferência visual sem impacto no pedido não deve interromper a rodada.

## 7. Como registrar um bloqueio

1. Não apague o estado que causou o problema.
2. Anote a etapa e a ação exata.
3. Registre o que era esperado e o que aconteceu.
4. Tire uma foto ou captura de tela sem expor dados pessoais desnecessários.
5. Classifique a severidade.
6. Se for P0, pare aquele roteiro e tente outro independente.

| Data | Pessoa | Dispositivo | Etapa | Ação tentada | Resultado esperado | Resultado obtido | Severidade | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |

## 8. Severidade

- **P0 — bloqueia o pedido:** não é possível cadastrar o item necessário,
  montar o carrinho, revisar ou obter a mensagem.
- **P1 — pedido incorreto ou incompreensível:** produto, opção, quantidade,
  valor, total, entrega, pagamento ou observação aparece errado ou não aparece.
- **P2 — atrito relevante:** o pedido termina corretamente, mas exige ajuda,
  repetição ou um caminho confuso.
- **P3 — melhoria:** detalhe visual, preferência ou ideia que não prejudica o
  pedido desta rodada.

## 9. Quando considerar o ciclo aprovado

O ciclo local está aprovado quando:

- a comerciante cadastra e corrige produtos sem ajuda direta;
- item sem estoque não entra no carrinho;
- os cinco roteiros chegam à revisão da mensagem;
- produtos, opções, quantidades e valores conferem;
- entrega, endereço, pagamento e observações aparecem quando necessários;
- o total em reais confere com a soma manual;
- a mensagem copiada mantém acentos e quebras de linha;
- não existe P0 ou P1 aberto;
- as ocorrências P2 têm evidência e próxima ação definida.

A vitrine pública compartilhada só estará aprovada quando o catálogo persistir e
o mesmo conteúdo abrir corretamente em outro aparelho. Esse critério não pode
ser comprovado neste marco local.

## 10. Fora deste marco

Ficaram deliberadamente de fora:

- login, cadastro de conta e recuperação de senha;
- Better Auth;
- Cloudflare D1 e R2;
- persistência de produtos, pedidos ou imagens;
- configuração de domínio;
- e-mail transacional;
- envio automático de WhatsApp;
- número fixo de WhatsApp da loja;
- configuração do nome, identidade e informações públicas da loja;
- pedido salvo e painel de pedidos;
- Pix copia e cola ou QR Code;
- pagamento automático;
- frete calculado, cupom e status do pedido;
- vitrine personalizada compartilhada entre aparelhos.

# Roadmap

O roadmap é organizado por provas de risco, não por quantidade de telas.

## Fase 0 — Provar a direção

Status: **concluída**

- [x] painel navegável;
- [x] catálogo;
- [x] cadastro de produto;
- [x] upload e prévia de foto;
- [x] vitrine;
- [x] carrinho;
- [x] primeira direção responsiva;
- [x] fonte organizada em Git;
- [x] documentação do produto.

Resultado: existe uma fatia funcional suficiente para avaliar conceito, fluxo e
identidade.

## Fase 1 — Validar clareza

Objetivo: provar que uma usuária entende o produto sem treinamento.

- [ ] Lorenzo faz crítica visual completa;
- [ ] teste sem explicação com a primeira usuária;
- [ ] registrar onde ela hesita, erra ou procura ajuda;
- [ ] ajustar painel, cadastro e vitrine;
- [ ] testar celular pequeno, celular comum e desktop;
- [ ] decidir se "Feita" continua como nome de trabalho.

Critério de saída: a usuária cadastra um produto, encontra a vitrine e monta um
pedido sem ajuda.

## Fase 2 — Tornar os dados reais

Objetivo: deixar de ser demonstração e virar sistema utilizável.

- [x] decisão de autenticação e persistência registrada;
- [ ] autenticação;
- [ ] empresas e usuários;
- [ ] banco de dados;
- [ ] armazenamento de imagens;
- [ ] produtos e categorias persistentes;
- [ ] slug público da loja;
- [ ] isolamento entre lojas;
- [ ] permissões básicas;
- [ ] estados vazios, erros e carregamento.

Critério de saída: duas lojas diferentes conseguem usar o sistema sem acessar
os dados uma da outra, e nada desaparece ao recarregar.

## Fase 3 — Fechar o ciclo da venda

Objetivo: transformar visita na vitrine em pedido administrável.

- [ ] dados da cliente;
- [ ] entrega, retirada e frete combinado;
- [ ] observações;
- [ ] cupom;
- [ ] pedido persistido;
- [ ] status do pedido;
- [ ] Pix copia e cola e QR Code;
- [ ] sinal opcional;
- [ ] confirmação manual de pagamento;
- [ ] mensagem estruturada para WhatsApp;
- [ ] painel de pedidos.

Critério de saída: uma cliente externa monta o pedido e a empreendedora consegue
receber, confirmar, preparar e concluir a venda.

## Fase 4 — Operação

Objetivo: reduzir trabalho administrativo recorrente.

- [ ] clientes;
- [ ] estoque atual e mínimo;
- [ ] pronta-entrega e encomenda;
- [ ] variações;
- [ ] receitas e despesas;
- [ ] parcelas e valores a receber;
- [ ] mensagens prontas;
- [ ] relatórios básicos;
- [ ] exportação.

Critério de saída: a usuária consegue abandonar ao menos uma planilha ou
controle manual.

## Fase 5 — Distribuição e monetização

Objetivo: provar aquisição e receita repetíveis.

- [ ] escolher nicho inicial;
- [ ] entrevistar 10 usuárias;
- [ ] acompanhar 3 operações piloto;
- [ ] testar implantação assistida;
- [ ] definir limites dos planos;
- [ ] testar parceria com agência;
- [ ] medir ativação, pedido criado e retenção;
- [ ] preparar cobrança recorrente.

Critério de saída: clientes reais usam o fluxo principal e ao menos algumas
aceitam pagar de forma recorrente.

## Próxima ação recomendada

Avançar em duas trilhas curtas, sem misturá-las:

1. observar o uso real da Fase 1 e registrar problemas de clareza;
2. preparar a fundação segura da Fase 2 com dependências atualizadas, headers e
   decisão explícita de autenticação/banco — concluído;
3. escolher provedor de e-mail, domínio e remetente para então implementar
   conta e sessão com Better Auth + D1, sem persistir produtos antes dos testes
   de isolamento.

O estado operacional e a sequência detalhada ficam em `docs/HANDOFF.md`.

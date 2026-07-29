# Feita — guia para o Codex

Este repositório é a fonte da Feita, um SaaS em validação para pequenas
empreendedoras organizarem produtos, pedidos, clientes e recebimentos.

## Antes de alterar código

1. Leia `README.md`.
2. Leia `docs/HANDOFF.md` para saber exatamente onde o trabalho parou.
3. Leia `docs/DECISIONS.md`, `docs/ROADMAP.md` e `docs/SECURITY.md`.
4. Confira `git status` e preserve mudanças que já existirem.
5. Leia `.openai/hosting.json` antes de qualquer trabalho de publicação.

## Estado técnico resumido

- O protótipo atual está concentrado em `app/page.tsx` e usa estado local.
- A vitrine em `/loja/[slug]` lê D1 e R2; o painel demonstrativo em `/` ainda
  não administra esses dados.
- O Marco 5 implementa localmente Better Auth, convites, recuperação,
  memberships e `/painel`; ainda não foi publicado.
- `app/chatgpt-auth.ts` contém helpers da identidade do Sites, mas não está
  ligado às rotas e não substitui a autenticação da Feita.
- `db/schema.ts` contém catálogo, mídia, tabelas do Better Auth, memberships,
  convites, auditoria e rate limit.
- O site publicado está vinculado ao projeto existente em
  `.openai/hosting.json`; nunca crie outro site para esta fonte.
- O repositório oficial do usuário é `javaaaaa-271/feita`.

## Regras de produto e design

- Não copiar código, marca, textos, imagens ou identidade de concorrentes.
- IA acelera implementação; decisões de produto e design continuam humanas.
- Evitar aparência genérica de SaaS gerado por IA: cards excessivos, frases
  decorativas, modais sobre modais, hierarquia inconsistente e componentes
  diferentes para a mesma ação.
- O painel é uma ferramenta operacional; a vitrine representa a marca da
  cliente.
- Cada tela deve ter uma ação dominante e funcionar de verdade no celular.
- Não ampliar escopo sem ligação clara com o fluxo catálogo → pedido →
  pagamento manual → WhatsApp.

## Regras de segurança

- Não implementar armazenamento ou verificação de senha por conta própria.
- Nunca colocar token de sessão, recuperação ou credencial em URL, log,
  resposta desnecessária ou `localStorage`.
- Sessões devem usar cookies `HttpOnly`, `Secure` e `SameSite`, com revogação
  efetiva no logout.
- Login e recuperação devem usar mensagens genéricas para impedir enumeração
  de e-mail.
- Aplicar rate limit por IP e identidade normalizada nos pontos sensíveis.
- CORS deve usar allowlist explícita; nunca refletir `Origin`.
- Queries devem ser parametrizadas.
- O identificador da loja deve vir da sessão/autorização, nunca ser confiado a
  partir do corpo ou da URL da requisição.
- IDOR entre lojas é falha de parada de linha: testes com duas lojas são
  obrigatórios antes de publicar dados reais.
- Upload deve validar tamanho e conteúdo no servidor e reprocessar imagens.

## Validação obrigatória

Após mudanças de código, execute:

```bash
npm run lint
npm test
git diff --check
```

Adicione testes específicos para comportamento novo. Não declare conclusão com
testes falhando ou sem registrar a limitação.

## Handoff

Depois de um marco relevante, atualize `docs/HANDOFF.md` com:

- o que foi concluído;
- decisões tomadas;
- testes executados;
- riscos ou bloqueios;
- próxima ação concreta.

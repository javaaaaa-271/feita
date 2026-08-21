import assert from "node:assert/strict";
import test from "node:test";
import {
  renderTransactionalEmail,
  ResendTransactionalEmailSender,
  type TransactionalEmail,
} from "../auth/email";

const messages: TransactionalEmail[] = [
  {
    kind: "email-verification",
    to: "cadastro@example.test",
    code: "755141",
    expiresInMinutes: 10,
  },
  {
    kind: "password-reset",
    to: "recuperacao@example.test",
    code: "204863",
    expiresInMinutes: 10,
  },
  {
    kind: "invitation",
    to: "convite@example.test",
    code: "convite-seguro-2026",
    expiresInMinutes: 30,
  },
];

test("templates transacionais têm HTML responsivo e fallback em texto", () => {
  for (const message of messages) {
    const rendered = renderTransactionalEmail(message);

    assert.match(rendered.html, /<!doctype html>/i);
    assert.match(rendered.html, /<html lang="pt-BR">/);
    assert.match(rendered.html, /@media only screen and \(max-width: 620px\)/);
    assert.match(rendered.html, /Seu negócio, em ordem\./);
    assert.match(rendered.html, new RegExp(message.code));
    assert.match(rendered.text, new RegExp(message.code));
    assert.match(rendered.text, new RegExp(`${message.expiresInMinutes} minutos`));
    assert.doesNotMatch(rendered.html, /href\s*=/i);
    assert.doesNotMatch(rendered.text, /https?:\/\//i);
  }
});

test("confirmação e recuperação explicam a ação e a alternativa segura", () => {
  const verification = renderTransactionalEmail(messages[0]);
  const passwordReset = renderTransactionalEmail(messages[1]);

  assert.match(verification.subject, /Confirme seu e-mail/);
  assert.match(verification.text, /continuar a criação da sua loja/);
  assert.match(verification.text, /não criou uma conta/);
  assert.match(passwordReset.subject, /redefinir sua senha/);
  assert.match(passwordReset.text, /Sua senha continuará igual/);
  assert.match(passwordReset.text, /só pode ser usado uma vez/);
});

test("conteúdo dinâmico é escapado antes de entrar no HTML", () => {
  const rendered = renderTransactionalEmail({
    kind: "invitation",
    to: "seguranca@example.test",
    code: "<script>alert('x')</script>",
    expiresInMinutes: 10,
  });

  assert.doesNotMatch(rendered.html, /<script>alert/);
  assert.match(rendered.html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
});

test("Resend recebe assunto, texto e HTML sem expor a chave", async () => {
  let requestURL = "";
  let requestInit: RequestInit | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    requestURL = String(input);
    requestInit = init;
    return new Response(null, { status: 200 });
  };
  const sender = new ResendTransactionalEmailSender(
    "chave-secreta-de-teste",
    "Feita <conta@example.test>",
    fetcher,
  );

  await sender.send(messages[1]);

  assert.equal(requestURL, "https://api.resend.com/emails");
  const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
  assert.equal(body.subject, "Código para redefinir sua senha");
  assert.match(String(body.text), /204863/);
  assert.match(String(body.html), /204863/);
  assert.doesNotMatch(String(requestInit?.body), /chave-secreta-de-teste/);
});

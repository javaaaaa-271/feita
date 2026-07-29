"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient, configuredSocialProviders } from "@/auth/client";
import { PasswordInput } from "./password-input";
import styles from "./auth-shell.module.css";

const GENERIC_LOGIN_ERROR =
  "Não foi possível entrar. Confira os dados ou recupere sua senha.";
const GENERIC_RECOVERY_MESSAGE =
  "Se o e-mail estiver cadastrado, você receberá um código em alguns minutos.";

export function SignInForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const { error } = await authClient.signIn.email({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        callbackURL: "/painel",
      });
      if (error) {
        setMessage(GENERIC_LOGIN_ERROR);
        return;
      }
      window.location.assign("/painel");
    } catch {
      setMessage(GENERIC_LOGIN_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        className={styles.form}
        onSubmit={submit}
        aria-busy={pending}
      >
        <EmailField />
        <PasswordInput
          id="password"
          name="password"
          label="Senha"
          autoComplete="current-password"
          minLength={12}
          maxLength={128}
          required
        />
        {message ? (
          <p className={`${styles.message} ${styles.error}`} role="alert">
            {message}
          </p>
        ) : null}
        <button className={styles.primary} type="submit" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </button>
        <Link className={styles.link} href="/esqueci-minha-senha">
          Esqueci minha senha
        </Link>
      </form>
      <p className={styles.inviteNotice}>
        O acesso à Feita é criado somente por convite. Se você recebeu um
        código, use a página de{" "}
        <Link className={styles.link} href="/aceitar-convite">
          aceitação de convite
        </Link>
        .
      </p>
      {configuredSocialProviders.length > 0 ? (
        <div aria-label="Provedores sociais configurados" />
      ) : null}
    </>
  );
}

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    try {
      await authClient.emailOtp.requestPasswordReset({
        email: String(form.get("email") ?? ""),
      });
      setSuccess(true);
    } catch {
      setSuccess(false);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <EmailField />
      {success ? (
        <p className={`${styles.message} ${styles.success}`} role="status">
          {GENERIC_RECOVERY_MESSAGE}
        </p>
      ) : null}
      {error ? (
        <p className={`${styles.message} ${styles.error}`} role="alert">
          Não foi possível concluir agora. Tente novamente.
        </p>
      ) : null}
      <button className={styles.primary} type="submit" disabled={pending}>
        {pending ? "Solicitando…" : "Enviar código"}
      </button>
      <Link className={styles.link} href="/redefinir-senha">
        Já tenho o código
      </Link>
      <Link className={styles.link} href="/entrar">
        Voltar para entrar
      </Link>
    </form>
  );
}

export function ResetPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("password-confirmation") ?? "")) {
      setMessage("As senhas precisam ser iguais.");
      return;
    }
    setPending(true);
    try {
      const { error } = await authClient.emailOtp.resetPassword({
        email: String(form.get("email") ?? ""),
        otp: String(form.get("otp") ?? ""),
        password,
      });
      if (error) {
        setMessage(
          "Não foi possível redefinir a senha. Solicite um novo código.",
        );
        return;
      }
      setSuccess(true);
    } catch {
      setMessage("Não foi possível redefinir a senha. Solicite um novo código.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <EmailField />
      <div className={styles.field}>
        <label htmlFor="otp">Código de 6 dígitos</label>
        <input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </div>
      <PasswordInput
        id="new-password"
        name="password"
        label="Nova senha"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        hint="Use pelo menos 12 caracteres. Frases longas são bem-vindas."
        required
      />
      <PasswordInput
        id="password-confirmation"
        name="password-confirmation"
        label="Repita a nova senha"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
      />
      {message ? (
        <p className={`${styles.message} ${styles.error}`} role="alert">
          {message}
        </p>
      ) : null}
      {success ? (
        <p className={`${styles.message} ${styles.success}`} role="status">
          Senha atualizada. Suas sessões anteriores foram encerradas.
        </p>
      ) : null}
      <button className={styles.primary} type="submit" disabled={pending}>
        {pending ? "Redefinindo…" : "Redefinir senha"}
      </button>
      <Link className={styles.link} href="/entrar">
        Voltar para entrar
      </Link>
    </form>
  );
}

export function AcceptInvitationForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage(null);
    setSuccess(false);
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("password-confirmation") ?? "")) {
      setMessage("As senhas precisam ser iguais.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: String(form.get("token") ?? ""),
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password,
        }),
      });
      if (!response.ok) {
        setMessage(
          "Não foi possível aceitar o convite. Confira os dados e tente novamente.",
        );
        return;
      }
      setSuccess(true);
      formElement.reset();
    } catch {
      setMessage(
        "Não foi possível aceitar o convite. Confira os dados e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-busy={pending}>
      <div className={styles.field}>
        <label htmlFor="token">Código do convite</label>
        <input
          id="token"
          name="token"
          type="text"
          autoComplete="one-time-code"
          spellCheck={false}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="name">Seu nome</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
      </div>
      <EmailField />
      <PasswordInput
        id="invite-password"
        name="password"
        label="Crie uma senha"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        hint="Use pelo menos 12 caracteres. Você pode colar uma senha do seu gerenciador."
        required
      />
      <PasswordInput
        id="invite-password-confirmation"
        name="password-confirmation"
        label="Repita a senha"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
      />
      {message ? (
        <p className={`${styles.message} ${styles.error}`} role="alert">
          {message}
        </p>
      ) : null}
      {success ? (
        <p className={`${styles.message} ${styles.success}`} role="status">
          Convite aceito. Agora você já pode entrar.
        </p>
      ) : null}
      <button className={styles.primary} type="submit" disabled={pending}>
        {pending ? "Criando acesso…" : "Aceitar convite"}
      </button>
      <Link className={styles.link} href="/entrar">
        Já tenho acesso
      </Link>
    </form>
  );
}

function EmailField() {
  return (
    <div className={styles.field}>
      <label htmlFor="email">E-mail</label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
    </div>
  );
}

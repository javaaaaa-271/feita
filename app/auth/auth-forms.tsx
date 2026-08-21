"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient, configuredSocialProviders } from "@/auth/client";
import { PasswordInput } from "./password-input";
import styles from "./auth-shell.module.css";
import { slugifyStoreName } from "@/onboarding/store-input";

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
        Ainda não tem uma loja? <Link className={styles.link} href="/cadastro">Crie seu acesso</Link>.
        Se você recebeu um convite de outra loja, use a página de{" "}
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

type SignUpStep = "account" | "verification" | "store";

export function SignUpForm() {
  const [step, setStep] = useState<SignUpStep>("account");
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextEmail = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("password-confirmation") ?? "")) {
      setMessage("As senhas precisam ser iguais.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const { error } = await authClient.signUp.email({
        email: nextEmail,
        name: String(form.get("name") ?? "").trim(),
        password,
      });
      if (error?.status === 429) {
        setMessage("Muitas tentativas. Aguarde um minuto e tente novamente.");
        return;
      }
      setEmail(nextEmail);
      setStep("verification");
    } catch {
      setMessage("Não foi possível enviar o código agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp: String(form.get("otp") ?? ""),
      });
      if (error) {
        setMessage("Código inválido ou vencido. Confira ou peça outro código.");
        return;
      }
      setStep("store");
    } catch {
      setMessage("Código inválido ou vencido. Confira ou peça outro código.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    setPending(true);
    setMessage(null);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      setMessage(
        error
          ? "Não foi possível reenviar agora. Aguarde e tente novamente."
          : "Se o e-mail puder receber o código, uma nova mensagem chegará em alguns minutos.",
      );
    } catch {
      setMessage("Não foi possível reenviar agora. Aguarde e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/onboarding/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("store-name") ?? ""),
          slug: String(form.get("slug") ?? ""),
          location: String(form.get("location") ?? ""),
          whatsapp: String(form.get("whatsapp") ?? ""),
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        store?: { panelPath?: string };
      };
      if (!response.ok || !result.store?.panelPath) {
        setMessage(result.message ?? "Não foi possível criar a loja agora.");
        return;
      }
      window.location.assign(result.store.panelPath);
    } catch {
      setMessage("Não foi possível criar a loja agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ol className={styles.progress} aria-label="Etapas do cadastro">
        <li className={step === "account" ? styles.current : ""}>1. Conta</li>
        <li className={step === "verification" ? styles.current : ""}>2. Código</li>
        <li className={step === "store" ? styles.current : ""}>3. Loja</li>
      </ol>

      {step === "account" ? (
        <form className={styles.form} onSubmit={createAccount} aria-busy={pending}>
          <div className={styles.field}>
            <label htmlFor="signup-name">Seu nome</label>
            <input id="signup-name" name="name" autoComplete="name" minLength={2} maxLength={80} required />
          </div>
          <EmailField id="signup-email" />
          <PasswordInput id="signup-password" name="password" label="Crie uma senha" autoComplete="new-password" minLength={12} maxLength={128} hint="Use pelo menos 12 caracteres. Uma frase longa funciona bem." required />
          <PasswordInput id="signup-password-confirmation" name="password-confirmation" label="Repita a senha" autoComplete="new-password" minLength={12} maxLength={128} required />
          <FormMessage message={message} />
          <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Enviando código…" : "Continuar"}</button>
          <Link className={styles.link} href="/entrar">Já tenho acesso</Link>
        </form>
      ) : null}

      {step === "verification" ? (
        <form className={styles.form} onSubmit={verifyEmail} aria-busy={pending}>
          <p className={styles.stepCopy}>Enviamos um código de 6 dígitos para <strong>{email}</strong>. Ele vale por 10 minutos.</p>
          <div className={styles.field}>
            <label htmlFor="signup-otp">Código de confirmação</label>
            <input id="signup-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus />
          </div>
          <FormMessage message={message} neutral={message?.startsWith("Se o e-mail")} />
          <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Confirmando…" : "Confirmar e-mail"}</button>
          <button className={styles.textButton} type="button" disabled={pending} onClick={resendCode}>Reenviar código</button>
        </form>
      ) : null}

      {step === "store" ? (
        <form className={styles.form} onSubmit={createStore} aria-busy={pending}>
          <p className={styles.stepCopy}>E-mail confirmado. Agora dê um nome e um endereço para sua primeira vitrine.</p>
          <div className={styles.field}>
            <label htmlFor="store-name">Nome da loja</label>
            <input id="store-name" name="store-name" value={storeName} minLength={2} maxLength={80} onChange={(event) => {
              const value = event.target.value;
              setStoreName(value);
              if (!slugEdited) setSlug(slugifyStoreName(value));
            }} required />
          </div>
          <div className={styles.field}>
            <label htmlFor="store-slug">Endereço da vitrine</label>
            <div className={styles.slugField}><span>/loja/</span><input id="store-slug" name="slug" value={slug} minLength={3} maxLength={48} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" onChange={(event) => { setSlugEdited(true); setSlug(slugifyStoreName(event.target.value)); }} required /></div>
          </div>
          <div className={styles.field}>
            <label htmlFor="store-location">Cidade e estado <span className={styles.optional}>(opcional)</span></label>
            <input id="store-location" name="location" maxLength={100} placeholder="Palmas, TO" />
          </div>
          <div className={styles.field}>
            <label htmlFor="store-whatsapp">WhatsApp com DDD</label>
            <input id="store-whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(63) 99999-9999" minLength={10} maxLength={24} required />
          </div>
          <p className={styles.fieldHint}>Sua loja nasce fechada. Você revisa os produtos antes de publicar o link.</p>
          <FormMessage message={message} />
          <button className={styles.primary} type="submit" disabled={pending}>{pending ? "Criando loja…" : "Criar minha loja"}</button>
        </form>
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

function FormMessage({ message, neutral = false }: { message: string | null; neutral?: boolean }) {
  if (!message) return null;
  return <p className={`${styles.message} ${neutral ? styles.success : styles.error}`} role={neutral ? "status" : "alert"}>{message}</p>;
}

function EmailField({ id = "email" }: { id?: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>E-mail</label>
      <input
        id={id}
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

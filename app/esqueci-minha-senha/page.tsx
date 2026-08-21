import type { Metadata } from "next";
import { AuthPage } from "@/app/auth/auth-page";
import { ForgotPasswordForm } from "@/app/auth/auth-forms";
import { turnstileSiteKeyForPage } from "@/auth/turnstile-page";

export const metadata: Metadata = { title: "Recuperar acesso — Feita" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const turnstileSiteKey = await turnstileSiteKeyForPage();

  return (
    <AuthPage
      eyebrow="Recuperação de acesso"
      title="Vamos recuperar seu acesso."
      description="Você receberá um código curto por e-mail. A resposta é sempre a mesma para proteger as contas cadastradas."
      cardTitle="Esqueci minha senha"
      cardDescription="Informe o e-mail usado na sua conta."
    >
      <ForgotPasswordForm turnstileSiteKey={turnstileSiteKey} />
    </AuthPage>
  );
}

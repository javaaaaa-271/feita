import type { Metadata } from "next";
import { AuthPage } from "@/app/auth/auth-page";
import { ForgotPasswordForm } from "@/app/auth/auth-forms";

export const metadata: Metadata = { title: "Recuperar acesso — Feita" };

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      eyebrow="Recuperação de acesso"
      title="Vamos recuperar seu acesso."
      description="Você receberá um código curto por e-mail. A resposta é sempre a mesma para proteger as contas cadastradas."
      cardTitle="Esqueci minha senha"
      cardDescription="Informe o e-mail usado no seu convite."
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}

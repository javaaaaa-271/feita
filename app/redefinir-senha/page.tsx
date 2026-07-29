import type { Metadata } from "next";
import { AuthPage } from "@/app/auth/auth-page";
import { ResetPasswordForm } from "@/app/auth/auth-forms";

export const metadata: Metadata = { title: "Redefinir senha — Feita" };

export default function ResetPasswordPage() {
  return (
    <AuthPage
      eyebrow="Nova senha"
      title="Escolha uma nova senha."
      description="O código expira rapidamente e só pode ser usado uma vez. Ao concluir, as sessões anteriores serão revogadas."
      cardTitle="Redefinir senha"
      cardDescription="Digite o e-mail, o código recebido e sua nova senha."
    >
      <ResetPasswordForm />
    </AuthPage>
  );
}

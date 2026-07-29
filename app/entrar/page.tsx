import type { Metadata } from "next";
import { AuthPage } from "@/app/auth/auth-page";
import { SignInForm } from "@/app/auth/auth-forms";

export const metadata: Metadata = { title: "Entrar — Feita" };

export default function SignInPage() {
  return (
    <AuthPage
      eyebrow="Acesso da comerciante"
      title="Seu negócio continua daqui."
      description="Entre para consultar as lojas ligadas à sua conta. Clientes da vitrine não precisam criar acesso."
      cardTitle="Entrar na Feita"
      cardDescription="Use o e-mail e a senha definidos ao aceitar seu convite."
    >
      <SignInForm />
    </AuthPage>
  );
}

import type { Metadata } from "next";
import { AuthPage } from "@/app/auth/auth-page";
import { AcceptInvitationForm } from "@/app/auth/auth-forms";

export const metadata: Metadata = { title: "Aceitar convite — Feita" };

export default function AcceptInvitationPage() {
  return (
    <AuthPage
      eyebrow="Convite para a Feita"
      title="Crie seu acesso com segurança."
      description="A loja e o papel já foram definidos antes do convite. O formulário nunca permite escolher ou trocar a loja."
      cardTitle="Aceitar convite"
      cardDescription="Use exatamente o e-mail que recebeu o código."
    >
      <AcceptInvitationForm />
    </AuthPage>
  );
}

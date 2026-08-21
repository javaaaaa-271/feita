import type { Metadata } from "next";
import { AuthPage } from "@/app/auth/auth-page";
import { SignUpForm } from "@/app/auth/auth-forms";
import { turnstileSiteKeyForPage } from "@/auth/turnstile-page";

export const metadata: Metadata = { title: "Criar sua loja — Feita" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const turnstileSiteKey = await turnstileSiteKeyForPage();

  return (
    <AuthPage
      eyebrow="Sua primeira vitrine"
      title="Comece pelo que você já vende."
      description="Crie seu acesso, confirme o e-mail e abra uma loja separada e protegida para o seu negócio."
      cardTitle="Criar minha loja"
      cardDescription="O código no e-mail protege sua conta antes de qualquer loja ser criada."
    >
      <SignUpForm turnstileSiteKey={turnstileSiteKey} />
    </AuthPage>
  );
}

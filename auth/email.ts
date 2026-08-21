export type TransactionalEmail =
  | {
      kind: "email-verification";
      to: string;
      code: string;
      expiresInMinutes: number;
    }
  | {
      kind: "password-reset";
      to: string;
      code: string;
      expiresInMinutes: number;
    }
  | {
      kind: "invitation";
      to: string;
      code: string;
      expiresInMinutes: number;
    };

export interface TransactionalEmailSender {
  send(message: TransactionalEmail): Promise<void>;
}
export type LocalEmailCapture = (message: TransactionalEmail) => void;

export type RenderedTransactionalEmail = {
  subject: string;
  text: string;
  html: string;
};

export class LocalTransactionalEmailSender
  implements TransactionalEmailSender
{
  constructor(private readonly capture?: LocalEmailCapture) {}

  async send(message: TransactionalEmail): Promise<void> {
    // Local/test delivery deliberately performs no network request and emits no
    // logs. Tests may inject a capture callback to inspect the code in memory.
    this.capture?.(structuredClone(message));
  }
}

export class ResendTransactionalEmailSender
  implements TransactionalEmailSender
{
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(message: TransactionalEmail): Promise<void> {
    const rendered = renderTransactionalEmail(message);
    const response = await this.fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Transactional email provider failed (${response.status})`);
    }
  }
}

type EmailCopy = {
  subject: string;
  eyebrow: string;
  title: string;
  introduction: string;
  codeLabel: string;
  instruction: string;
  safetyNote: string;
};

function emailCopy(message: TransactionalEmail): EmailCopy {
  const validity = `Ele vale por ${message.expiresInMinutes} minutos e só pode ser usado uma vez.`;

  if (message.kind === "invitation") {
    return {
      subject: "Seu convite para a Feita",
      eyebrow: "Convite",
      title: "Tem um lugar esperando por você",
      introduction:
        "Você recebeu um convite para participar de uma loja na Feita.",
      codeLabel: "Código do convite",
      instruction: `Digite este código na tela de convite. ${validity}`,
      safetyNote:
        "Se você não esperava este convite, pode ignorar esta mensagem.",
    };
  }

  if (message.kind === "email-verification") {
    return {
      subject: "Confirme seu e-mail na Feita",
      eyebrow: "Confirmação de e-mail",
      title: "Só falta confirmar que é você",
      introduction:
        "Use o código abaixo para continuar a criação da sua loja na Feita.",
      codeLabel: "Seu código de confirmação",
      instruction: `Digite este código na tela da Feita. ${validity}`,
      safetyNote:
        "Se você não criou uma conta, pode ignorar esta mensagem.",
    };
  }

  return {
    subject: "Código para redefinir sua senha",
    eyebrow: "Segurança da conta",
    title: "Crie uma nova senha",
    introduction:
      "Recebemos um pedido para redefinir a senha da sua conta na Feita.",
    codeLabel: "Código para redefinir sua senha",
    instruction: `Digite este código na tela da Feita. ${validity}`,
    safetyNote:
      "Se não foi você, ignore esta mensagem. Sua senha continuará igual.",
  };
}

export function renderTransactionalEmail(
  message: TransactionalEmail,
): RenderedTransactionalEmail {
  const copy = emailCopy(message);
  const code = escapeHtml(message.code);
  const compactCode = /^\d{6}$/.test(message.code);
  const preheader = `${copy.codeLabel}: ${message.code}. Válido por ${message.expiresInMinutes} minutos.`;
  const text = [
    "FEITA — Seu negócio, em ordem.",
    "",
    copy.title,
    "",
    copy.introduction,
    "",
    copy.codeLabel.toUpperCase(),
    message.code,
    "",
    copy.instruction,
    "",
    copy.safetyNote,
    "",
    "Feita",
    "Organize produtos, pedidos e recebimentos em um só lugar.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(copy.subject)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { padding: 20px 12px !important; }
        .email-card { padding: 30px 22px !important; }
        .email-title { font-size: 27px !important; line-height: 34px !important; }
        .email-code { font-size: 31px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f4efe7; color:#2b211c; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f4efe7;">
      <tr>
        <td class="email-shell" align="center" style="padding:38px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:580px;">
            <tr>
              <td style="padding:0 4px 18px;">
                <span style="font-family:Georgia, 'Times New Roman', serif; font-size:27px; line-height:32px; font-weight:700; color:#9b402d;">Feita</span>
                <span style="display:block; padding-top:3px; font-size:12px; line-height:18px; color:#76665c;">Seu negócio, em ordem.</span>
              </td>
            </tr>
            <tr>
              <td class="email-card" style="padding:42px 44px; background:#fffdfa; border:1px solid #ddcfc2; border-top:5px solid #9b402d; border-radius:12px;">
                <p style="margin:0 0 13px; font-size:12px; line-height:18px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:#9b402d;">${escapeHtml(copy.eyebrow)}</p>
                <h1 class="email-title" style="margin:0 0 16px; font-family:Georgia, 'Times New Roman', serif; font-size:31px; line-height:39px; font-weight:700; color:#2b211c;">${escapeHtml(copy.title)}</h1>
                <p style="margin:0 0 28px; font-size:16px; line-height:25px; color:#594c44;">${escapeHtml(copy.introduction)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin:0 0 24px;">
                  <tr>
                    <td style="padding:20px 18px; text-align:center; background:#f6e9df; border:1px solid #e5cabb; border-radius:10px;">
                      <span style="display:block; margin-bottom:8px; font-size:12px; line-height:18px; font-weight:700; color:#765549;">${escapeHtml(copy.codeLabel)}</span>
                      <span class="email-code" style="display:block; font-family:'Courier New', Courier, monospace; font-size:${compactCode ? "35px" : "24px"}; line-height:42px; font-weight:700; letter-spacing:${compactCode ? "0.16em" : "0.03em"}; color:#7f3425; overflow-wrap:anywhere;">${code}</span>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 22px; font-size:15px; line-height:24px; color:#3f342e;">${escapeHtml(copy.instruction)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
                  <tr>
                    <td style="padding:15px 16px; background:#edf3ea; border-left:3px solid #71836a; border-radius:6px;">
                      <p style="margin:0; font-size:13px; line-height:20px; color:#43523e;">${escapeHtml(copy.safetyNote)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 5px 0; font-size:12px; line-height:19px; color:#806f64;">
                <strong style="color:#66564c;">Feita</strong><br>
                Organize produtos, pedidos e recebimentos em um só lugar.<br>
                Esta é uma mensagem automática sobre a segurança da sua conta.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: copy.subject, text, html };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function createTransactionalEmailSender(options: {
  resendApiKey?: string;
  resendFrom?: string;
  localCapture?: LocalEmailCapture;
}): TransactionalEmailSender {
  if (options.resendApiKey && options.resendFrom) {
    return new ResendTransactionalEmailSender(
      options.resendApiKey,
      options.resendFrom,
    );
  }

  return new LocalTransactionalEmailSender(options.localCapture);
}

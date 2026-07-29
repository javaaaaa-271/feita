export type TransactionalEmail =
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
  ) {}

  async send(message: TransactionalEmail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject:
          message.kind === "invitation"
            ? "Seu convite para a Feita"
            : "Código para redefinir sua senha",
        text:
          message.kind === "invitation"
            ? `Use o código ${message.code} para aceitar seu convite. Ele expira em ${message.expiresInMinutes} minutos.`
            : `Use o código ${message.code} para redefinir sua senha. Ele expira em ${message.expiresInMinutes} minutos.`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Transactional email provider failed (${response.status})`);
    }
  }
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

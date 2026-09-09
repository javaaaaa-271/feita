import { normalizeAccentColor, normalizeBrazilianWhatsApp } from "@/app/storefront.mjs";

export type StoreSettingsInput = { name: string; whatsAppE164: string; accentColor: string };
export const SETTINGS_PAYLOAD_BYTES = 2048;

export class StoreSettingsValidationError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super("Confira os campos destacados.");
  }
}

function luminance(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function isReadableStoreColor(color: string): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return false;
  // The storefront uses white button labels and accent text on warm paper.
  return (luminance("#f4f1e9") + 0.05) / (luminance(color) + 0.05) >= 4.5;
}

export function parseStoreSettings(value: unknown): StoreSettingsInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StoreSettingsValidationError({ _form: "Solicitação inválida." });
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["name", "whatsAppE164", "accentColor"].includes(key))) {
    throw new StoreSettingsValidationError({ _form: "A solicitação contém campos não permitidos." });
  }
  const fields: Record<string, string> = {};
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/u.test(name)) {
    fields.name = "Informe um nome de até 120 caracteres.";
  }
  let whatsAppE164 = "";
  try {
    if (typeof input.whatsAppE164 !== "string" || input.whatsAppE164.length > 32 ||
        !/^\+?[\d\s().-]+$/.test(input.whatsAppE164.trim())) throw new Error();
    whatsAppE164 = normalizeBrazilianWhatsApp(input.whatsAppE164);
  } catch {
    fields.whatsAppE164 = "Informe um WhatsApp brasileiro com DDD, como (63) 99999-0000.";
  }
  let accentColor = "";
  try {
    if (typeof input.accentColor !== "string") throw new Error();
    accentColor = normalizeAccentColor(input.accentColor);
    if (!isReadableStoreColor(accentColor)) {
      fields.accentColor = "Escolha uma cor mais escura para manter a vitrine legível.";
    }
  } catch {
    fields.accentColor = "Informe uma cor com seis dígitos, como #8a3f2d.";
  }
  if (Object.keys(fields).length) throw new StoreSettingsValidationError(fields);
  return { name, whatsAppE164, accentColor };
}

export type FirstStoreInput = {
  name: string;
  slug: string;
  location: string;
  whatsapp: string;
};

export class FirstStoreValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "FirstStoreValidationError";
  }
}

export function slugifyStoreName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function normalizeWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "");
  const withCountry =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (withCountry.length < 10 || withCountry.length > 15) {
    throw new FirstStoreValidationError("Informe um WhatsApp válido com DDD.");
  }
  return `+${withCountry}`;
}

export function validateFirstStoreInput(input: FirstStoreInput): {
  name: string;
  slug: string;
  location: string;
  whatsappE164: string;
} {
  const name = input.name.trim().replace(/\s+/g, " ");
  const requestedSlug = input.slug.trim() || name;
  const slug = slugifyStoreName(requestedSlug);
  const location = input.location.trim().replace(/\s+/g, " ");

  if (name.length < 2 || name.length > 80) {
    throw new FirstStoreValidationError("O nome da loja deve ter entre 2 e 80 caracteres.");
  }
  if (slug.length < 3 || slug.length > 48) {
    throw new FirstStoreValidationError("O endereço da loja deve ter entre 3 e 48 caracteres.");
  }
  if (location.length > 100) {
    throw new FirstStoreValidationError("A localização deve ter no máximo 100 caracteres.");
  }

  return { name, slug, location, whatsappE164: normalizeWhatsApp(input.whatsapp) };
}

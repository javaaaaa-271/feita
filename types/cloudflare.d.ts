interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface SubtleCrypto {
  timingSafeEqual(left: BufferSource, right: BufferSource): boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<T>;
  all<T = Record<string, unknown>>(): Promise<T>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec(query: string): Promise<unknown>;
  dump(): Promise<ArrayBuffer>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    STORE_IMAGES?: {
      get(key: string): Promise<{ body: ReadableStream } | null>;
    };
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    AUTH_TRUSTED_ORIGINS?: string;
    RATE_LIMIT_HMAC_SECRET?: string;
    FEITA_PRIVATE_PREVIEW_USER_ID?: string;
    MARCO_6_3B_ACCESS_SECRET?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM?: string;
  };
  export const ctx: {
    waitUntil(promise: Promise<unknown>): void;
  };
}

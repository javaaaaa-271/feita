"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./auth-shell.module.css";

type TurnstileAPI = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "light";
      size: "flexible";
      appearance: "always";
      retry: "auto";
      "refresh-expired": "auto";
      callback(token: string): void;
      "expired-callback"(): void;
      "error-callback"(): void;
    },
  ): string;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

let scriptPromise: Promise<TurnstileAPI> | null = null;

export function TurnstileWidget({
  siteKey,
  action,
  onToken,
}: {
  siteKey: string;
  action: string;
  onToken(token: string | null): void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Verificando que você é uma pessoa…");

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    onToken(null);

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: "light",
          size: "flexible",
          appearance: "always",
          retry: "auto",
          "refresh-expired": "auto",
          callback(token) {
            if (cancelled) return;
            onToken(token);
            setStatus("Proteção concluída.");
          },
          "expired-callback"() {
            if (cancelled) return;
            onToken(null);
            setStatus("A proteção venceu e está sendo renovada…");
          },
          "error-callback"() {
            if (cancelled) return;
            onToken(null);
            setStatus("Não foi possível concluir a proteção. Tente novamente.");
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        onToken(null);
        setStatus("Não foi possível carregar a proteção. Recarregue a página.");
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [action, onToken, siteKey]);

  return (
    <div className={styles.turnstileBox}>
      <div ref={containerRef} className={styles.turnstileWidget} />
      <p className={styles.turnstileStatus} role="status">
        {status}
      </p>
    </div>
  );
}

function loadTurnstile(): Promise<TurnstileAPI> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileAPI>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-feita-turnstile="true"]',
    );
    const script = existing ?? document.createElement("script");

    const complete = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile API unavailable"));
    };
    script.addEventListener("load", complete, { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile script failed")), {
      once: true,
    });

    if (!existing) {
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.feitaTurnstile = "true";
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

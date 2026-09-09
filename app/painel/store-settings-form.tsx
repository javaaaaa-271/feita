"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreSettings } from "@/store-settings/repository";
import { isReadableStoreColor, parseStoreSettings, StoreSettingsValidationError } from "@/store-settings/validation";
import { StorefrontIdentityPreview } from "@/app/loja/[slug]/storefront-identity";
import styles from "./panel.module.css";

const colors = [
  ["Terracota", "#8a3f2d"], ["Vinho", "#7e3328"], ["Verde", "#365749"],
  ["Azul", "#315575"], ["Ameixa", "#684263"], ["Grafite", "#363632"],
];
const editable = (store: StoreSettings) => ({ name: store.name, whatsAppE164: store.whatsAppE164, accentColor: store.accentColor });

export function StoreSettingsForm({ storeId, initialStore }: { storeId: string; initialStore: StoreSettings }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialStore);
  const [draft, setDraft] = useState(editable(initialStore));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const busy = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(editable(saved));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFields((current) => ({ ...current, [field]: "", _form: "" }));
    setMessage("");
  }

  function showErrors(errors: Record<string, string>) {
    setFields(errors);
    const first = ["name", "whatsAppE164", "accentColor"].find((key) => errors[key]);
    if (first) (formRef.current?.elements.namedItem(first) as HTMLInputElement | null)?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setMessage("");
    let input;
    try { input = parseStoreSettings(draft); }
    catch (error) {
      if (error instanceof StoreSettingsValidationError) showErrors(error.fields);
      return;
    }
    busy.current = true;
    setPending(true);
    setFields({});
    try {
      const response = await fetch(`/api/painel/stores/${encodeURIComponent(storeId)}/settings`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) {
        showErrors(result.fields ?? { _form: response.status === 401
          ? "Sua sessão terminou. Entre novamente para salvar as configurações."
          : result.message ?? "Não foi possível salvar. Tente novamente." });
        return;
      }
      setSaved(result.store);
      setDraft(editable(result.store));
      setMessage("Configurações salvas.");
      router.refresh();
    } catch {
      setFields({ _form: "Não foi possível salvar. Confira sua conexão e tente novamente." });
    } finally { setPending(false); busy.current = false; }
  }

  const previewColor = isReadableStoreColor(draft.accentColor) ? draft.accentColor : saved.accentColor;
  return <div className={styles.settingsLayout}>
    <form ref={formRef} className={styles.settingsForm} onSubmit={submit} noValidate aria-busy={pending}>
      <fieldset disabled={pending}>
        <legend>Identidade e contato</legend>
        <div className={styles.field}>
          <label htmlFor="store-name">Nome da loja</label>
          <input id="store-name" name="name" value={draft.name} maxLength={120} autoComplete="organization"
            aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? "name-error" : undefined}
            onChange={(event) => change("name", event.target.value)} />
          {fields.name && <span id="name-error" className={styles.fieldError}>{fields.name}</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor="store-whatsapp">WhatsApp dos pedidos</label>
          <input id="store-whatsapp" name="whatsAppE164" type="tel" autoComplete="tel" maxLength={32}
            value={draft.whatsAppE164} placeholder="(63) 99999-0000"
            aria-invalid={Boolean(fields.whatsAppE164)} aria-describedby="whatsapp-help whatsapp-error"
            onChange={(event) => change("whatsAppE164", event.target.value)} />
          <small id="whatsapp-help">Número brasileiro com DDD. Os pedidos da vitrine serão direcionados para ele.</small>
          <span id="whatsapp-error" className={styles.fieldError}>{fields.whatsAppE164}</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="store-color">Cor da vitrine</label>
          <div className={styles.colorChoices} role="group" aria-label="Cores sugeridas">
            {colors.map(([label, color]) => <button key={color} type="button" title={label}
              aria-label={label} aria-pressed={draft.accentColor.toLowerCase() === color}
              style={{ backgroundColor: color }} onClick={() => change("accentColor", color)}>
              {draft.accentColor.toLowerCase() === color && <span aria-hidden="true">✓</span>}
            </button>)}
          </div>
          <div className={styles.customColor}>
            <input type="color" aria-label="Escolher cor personalizada" value={/^#[0-9a-f]{6}$/i.test(draft.accentColor) ? draft.accentColor : saved.accentColor}
              onChange={(event) => change("accentColor", event.target.value)} />
            <input id="store-color" name="accentColor" value={draft.accentColor} maxLength={7} spellCheck={false}
              aria-invalid={Boolean(fields.accentColor)} aria-describedby="color-help color-error"
              onChange={(event) => change("accentColor", event.target.value)} />
          </div>
          <small id="color-help">Use uma cor escura para manter textos e botões legíveis.</small>
          <span id="color-error" className={styles.fieldError}>{fields.accentColor}</span>
        </div>
      </fieldset>
      <div className={styles.settingsFeedback}>
        {fields._form && <p className={styles.fieldError} role="alert">{fields._form}</p>}
        <p role="status">{message || (dirty ? "Você tem alterações para salvar." : "")}</p>
      </div>
      <div className={styles.settingsActions}>
        <button className={styles.primaryAction} disabled={pending || !dirty} type="submit">
          {pending ? "Salvando…" : "Salvar configurações"}
        </button>
        {dirty && <button type="button" className={styles.textButton} disabled={pending} onClick={() => {
          setDraft(editable(saved)); setFields({}); setMessage("");
        }}>Desfazer alterações</button>}
      </div>
    </form>
    <aside className={styles.settingsPreview} aria-labelledby="preview-title">
      <div className={styles.previewHeading}><h2 id="preview-title">Prévia da identidade</h2><span>Antes de salvar</span></div>
      <StorefrontIdentityPreview store={{ ...saved, name: draft.name.trim() || "Nome da sua loja", accentColor: previewColor, logoUrl: null, coverUrl: null }} />
      {!isReadableStoreColor(draft.accentColor) && <p>A prévia mantém a última cor salva até você escolher uma cor legível.</p>}
      <p className={styles.settingsAddress}>/loja/{saved.slug}</p>
      <p>{saved.published ? "Ao salvar, as alterações aparecem na vitrine publicada." : "Sua vitrine está em preparação. Salvar não publica a loja."}</p>
    </aside>
  </div>;
}

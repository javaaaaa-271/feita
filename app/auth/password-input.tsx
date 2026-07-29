"use client";

import { useState } from "react";
import styles from "./auth-shell.module.css";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  hint?: string;
};

export function PasswordInput({
  id,
  label,
  hint,
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const hintId = hint && id ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordField}>
        <input
          {...inputProps}
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={hintId}
        />
        <button
          className={styles.passwordToggle}
          type="button"
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {hint ? (
        <p className={styles.fieldHint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

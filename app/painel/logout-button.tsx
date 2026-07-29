"use client";

import { useState } from "react";
import { authClient } from "@/auth/client";
import styles from "./panel.module.css";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await authClient.signOut();
    window.location.assign("/entrar");
  }

  return (
    <button
      className={styles.logout}
      type="button"
      onClick={logout}
      disabled={pending}
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}

"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});

// Future providers must be added explicitly on both server and client. A
// provider authenticates an identity only; authorization still requires a
// pre-existing user and store_memberships record on the server.
export const configuredSocialProviders: readonly string[] = [];

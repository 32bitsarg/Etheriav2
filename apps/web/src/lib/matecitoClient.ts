"use client";

import { createClient } from "matecitodb";

const url = process.env.NEXT_PUBLIC_MATECITO_URL!;
const anonKey = process.env.NEXT_PUBLIC_MATECITO_ANON_KEY!;

if (!url || !anonKey) {
  // Fail fast in dev; Next will surface this clearly.
  throw new Error("Missing NEXT_PUBLIC_MATECITO_URL or NEXT_PUBLIC_MATECITO_ANON_KEY");
}

export const matecito = createClient({ url, apiKey: anonKey, apiVersion: "v2" });


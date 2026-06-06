"use client";

// Stub — MatecitoDB replaced by the Hono API's cookie-based auth.
// Auth state is written here by useMatecitoAuth so useCity.ts can read it.

let _token: string | null = null;
let _user: { id: string; email?: string; name?: string } | null = null;

export const matecito = {
  auth: {
    get token() { return _token; },
    get user() { return _user; },
    _set(token: string | null, user: { id: string; email?: string; name?: string } | null) {
      _token = token;
      _user = user;
    },
  },
};

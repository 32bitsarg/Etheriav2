"use client";

import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  // Guarantee interval polling pauses when the Capacitor webview is backgrounded.
  // React Query v5 already handles visibilitychange by default; this makes it explicit
  // so it's observable and works across all Android versions.
  useEffect(() => {
    const onVis = () => focusManager.setFocused(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

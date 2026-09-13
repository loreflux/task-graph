"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: reuse existing client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

import { useEffect } from "react";
import { useSettingsStore, applyFontSizeToDOM } from "@/stores/settings-store";
import { useUIStore } from "@/stores/ui-store";

function SettingsInitializer() {
  const { settings } = useSettingsStore();
  const { setCurrentView } = useUIStore();

  useEffect(() => {
    applyFontSizeToDOM(settings.fontSize, settings.customFontSizePx);
  }, [settings.fontSize, settings.customFontSizePx]);

  useEffect(() => {
    if (settings.defaultView) {
      setCurrentView(settings.defaultView);
    }
  }, [settings.defaultView, setCurrentView]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsInitializer />
      {children}
      <Toaster theme="dark" position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

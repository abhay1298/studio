"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider storageKey="robot-maestro-theme">
      {children}
      <Toaster />
    </ThemeProvider>
  );
}

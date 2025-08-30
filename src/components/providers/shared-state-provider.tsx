
"use client";

import { ExecutionProvider } from "@/contexts/execution-context";

// This provider component will wrap parts of the app that need access to shared state.
// For now, it only includes the ExecutionProvider, but more could be added here.

export function SharedStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <ExecutionProvider>
      {children}
    </ExecutionProvider>
  );
}

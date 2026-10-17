"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

export type ToastKind = "info" | "good" | "error";
interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {});
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: ToastKind = "info") => {
    const id = nextId++;
    setToasts((list) => [...list.slice(-3), { id, text, kind }]);
    setTimeout(
      () => setToasts((list) => list.filter((t) => t.id !== id)),
      kind === "error" ? 4200 : 3200,
    );
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.kind}`}>
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

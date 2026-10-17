"use client";

import { useEffect, useState } from "react";

/** Milliseconds left, ticking down every second from the server-provided value. */
export function useCountdown(initialMs: number): number {
  const [left, setLeft] = useState(initialMs);
  useEffect(() => {
    setLeft(initialMs);
    if (initialMs <= 0) return;
    const start = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, initialMs - (Date.now() - start))), 1000);
    return () => clearInterval(id);
  }, [initialMs]);
  return left;
}

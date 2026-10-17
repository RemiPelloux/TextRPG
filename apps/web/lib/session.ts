import "server-only";

import { getDb } from "@textrpg/db";
import {
  resolveSession,
  SESSION_COOKIE,
  SESSION_DAYS,
  type Session,
  startGuestSession,
} from "@textrpg/server";
import { cookies, headers } from "next/headers";

import { LOCALE_COOKIE, type Locale, pickLocale } from "./i18n";

export async function currentSession() {
  const store = await cookies();
  return resolveSession(getDb(), store.get(SESSION_COOKIE)?.value);
}

export async function writeSessionCookie(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

/** The current session, creating a guest account on first visit (only callable from actions). */
export async function ensureSession() {
  const existing = await currentSession();
  if (existing) return existing;
  const session = await startGuestSession(getDb());
  await writeSessionCookie(session);
  return { userId: session.userId, email: null, guest: true };
}

export async function currentLocale(): Promise<Locale> {
  const store = await cookies();
  const list = await headers();
  return pickLocale(store.get(LOCALE_COOKIE)?.value, list.get("accept-language"));
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

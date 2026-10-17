"use server";

import { deleteHero, deletePushSubscription, getDb, savePushSubscription } from "@textrpg/db";
import {
  act,
  type ActResult,
  AuthError,
  claimAccount,
  createHero,
  login,
  logout,
  SESSION_COOKIE,
  ServiceError,
} from "@textrpg/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { currentSession, ensureSession, sessionToken, writeSessionCookie } from "@/lib/session";

export type FormResult = { ok: true } | { ok: false; error: string };

/** First visit or new hero: no sign-up wall, a guest account is created on the fly. */
export async function createHeroAction(input: {
  name: string;
  tzOffset: number;
}): Promise<FormResult & { heroId?: string }> {
  const session = await ensureSession();
  try {
    const heroId = await createHero(getDb(), session.userId, {
      name: input.name,
      tzOffset: Number(input.tzOffset),
    });
    return { ok: true, heroId };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.code };
    throw error;
  }
}

export async function gameAction(heroId: string, action: unknown): Promise<ActResult> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "noSession" };
  try {
    return await act(getDb(), session.userId, String(heroId), action);
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.code };
    console.error(error);
    return { ok: false, error: "server" };
  }
}

export async function deleteHeroAction(heroId: string): Promise<void> {
  const session = await currentSession();
  if (session) await deleteHero(getDb(), session.userId, String(heroId));
  redirect("/");
}

function authError(error: unknown): FormResult {
  if (error instanceof AuthError) return { ok: false, error: error.code };
  throw error;
}

export async function claimAction(input: { email: string; password: string }): Promise<FormResult> {
  const session = await ensureSession();
  try {
    await claimAccount(getDb(), session.userId, input);
    return { ok: true };
  } catch (error) {
    return authError(error);
  }
}

export async function loginAction(input: { email: string; password: string }): Promise<FormResult> {
  const session = await currentSession();
  try {
    const next = await login(getDb(), session?.userId, input);
    await writeSessionCookie(next);
    return { ok: true };
  } catch (error) {
    return authError(error);
  }
}

export async function logoutAction(): Promise<void> {
  const token = await sessionToken();
  if (token) await logout(getDb(), token);
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 86_400,
    sameSite: "lax",
  });
}

export async function savePushAction(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  heroId: string | null;
}): Promise<FormResult> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "noSession" };
  if (!/^https:\/\//.test(input.endpoint)) return { ok: false, error: "invalid" };
  await savePushSubscription(getDb(), session.userId, input.heroId, input.endpoint, input.keys);
  return { ok: true };
}

export async function deletePushAction(endpoint: string): Promise<void> {
  await deletePushSubscription(getDb(), String(endpoint));
}

/**
 * Accounts without friction: every visitor gets a guest account and plays immediately. Claiming
 * it with an email and password keeps everything; logging in elsewhere merges the guest's heroes.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import {
  createSession,
  createUser,
  type Db,
  deleteSession,
  findUserByEmail,
  getSessionUser,
  getUser,
  mergeGuestInto,
  setCredentials,
  touchUser,
} from "@textrpg/db";
import { z } from "zod";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_DAYS = 180;
export const SESSION_COOKIE = "textrpg_session";

export class AuthError extends Error {
  constructor(readonly code: "invalidEmail" | "weakPassword" | "emailTaken" | "badCredentials" | "alreadyClaimed") {
    super(code);
  }
}

export const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
  password: z.string().min(8).max(200),
});

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

function parseCredentials(input: unknown) {
  const result = Credentials.safeParse(input);
  if (result.success) return result.data;
  const field = result.error.issues[0]?.path[0];
  throw new AuthError(field === "password" ? "weakPassword" : "invalidEmail");
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: Date;
}

async function openSession(db: Db, userId: string): Promise<Session> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await createSession(db, userId, hashToken(token), expiresAt);
  return { token, userId, expiresAt };
}

export async function startGuestSession(db: Db): Promise<Session> {
  return openSession(db, await createUser(db));
}

export async function resolveSession(db: Db, token: string | undefined) {
  if (!token) return undefined;
  const row = await getSessionUser(db, hashToken(token));
  if (!row) return undefined;
  void touchUser(db, row.userId).catch(() => {});
  return { userId: row.userId, email: row.email, guest: row.email === null };
}

/** Turn the current guest account into a real one. */
export async function claimAccount(db: Db, userId: string, input: unknown): Promise<void> {
  const { email, password } = parseCredentials(input);
  const user = await getUser(db, userId);
  if (!user) throw new AuthError("badCredentials");
  if (user.email) throw new AuthError("alreadyClaimed");
  if (await findUserByEmail(db, email)) throw new AuthError("emailTaken");
  await setCredentials(db, userId, email, await hashPassword(password));
}

/** Log into an existing account. Heroes made as a guest on this device come along. */
export async function login(db: Db, currentUserId: string | undefined, input: unknown): Promise<Session> {
  const { email, password } = parseCredentials(input);
  const user = await findUserByEmail(db, email);
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError("badCredentials");
  }
  if (currentUserId && currentUserId !== user.id) {
    const current = await getUser(db, currentUserId);
    if (current && !current.email) await mergeGuestInto(db, current.id, user.id);
  }
  return openSession(db, user.id);
}

export async function logout(db: Db, token: string): Promise<void> {
  await deleteSession(db, hashToken(token));
}

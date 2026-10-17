import type { Metadata } from "next";
import Link from "next/link";

import { logoutAction } from "@/app/actions";
import { translator } from "@/lib/i18n";
import { currentLocale, currentSession } from "@/lib/session";

import { AccountForms } from "./AccountForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function Account() {
  const t = translator(await currentLocale());
  const session = await currentSession();
  return (
    <div className="title-screen">
      <div className="title-card" style={{ textAlign: "left" }}>
        <Link href="/">← TextRPG</Link>
        <h1>{t("account.title")}</h1>
        {session && !session.guest ? (
          <section className="panel stack">
            <p>{t("account.signedInAs", { email: session.email ?? "" })}</p>
            <form action={logoutAction}>
              <button className="btn" type="submit">
                {t("account.signOut")}
              </button>
            </form>
          </section>
        ) : (
          <AccountForms guest={Boolean(session)} />
        )}
      </div>
    </div>
  );
}

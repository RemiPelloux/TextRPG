import { getDb, markNotified } from "@textrpg/db";
import { energyFullTargets } from "@textrpg/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";

/** Called by a scheduler (e.g. Vercel Cron every 30 min): "your energy is full" pushes, opt-in only. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_SUBJECT: subject,
  } = process.env;
  if (!publicKey || !privateKey) return Response.json({ sent: 0, reason: "push not configured" });
  webpush.setVapidDetails(subject ?? "mailto:admin@example.com", publicKey, privateKey);

  const db = getDb();
  let sent = 0;
  for (const target of await energyFullTargets(db)) {
    try {
      await webpush.sendNotification(
        { endpoint: target.endpoint, keys: target.keys },
        JSON.stringify({
          title: "TextRPG",
          body: "⚡ Ton énergie est pleine. Le monde t'attend.",
          url: target.heroId ? `/play/${target.heroId}` : "/",
        }),
      );
      await markNotified(db, target.endpoint);
      sent += 1;
    } catch {
      /* expired subscriptions are ignored; the user can re-enable notifications */
    }
  }
  return Response.json({ sent });
}

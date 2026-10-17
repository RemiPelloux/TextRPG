import { getDb } from "@textrpg/db";
import { runMaintenance } from "@textrpg/server";

export const dynamic = "force-dynamic";

/** Called once a day by the scheduler (Vercel Cron): prunes old action logs and expired sessions. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runMaintenance(getDb()));
}

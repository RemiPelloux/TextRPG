import { getDb } from "@textrpg/db";
import { getView, ServiceError } from "@textrpg/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Shell } from "@/components/game/Shell";
import { GameProvider } from "@/lib/game";
import { currentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PlayLayout({ children, params }: { children: ReactNode; params: Promise<{ heroId: string }> }) {
  const { heroId } = await params;
  const session = await currentSession();
  if (!session) redirect("/");
  let view;
  try {
    view = await getView(getDb(), session.userId, heroId);
  } catch (error) {
    if (error instanceof ServiceError) redirect("/");
    throw error;
  }
  return (
    <GameProvider heroId={heroId} initialView={view}>
      <Shell>{children}</Shell>
    </GameProvider>
  );
}

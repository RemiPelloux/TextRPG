/** Runtime validation of player actions: everything coming from the browser is untrusted. */
import { CLASS_IDS, DIFFICULTY_IDS, SLOTS } from "@textrpg/content";
import { type Action, PARAGON_STATS } from "@textrpg/engine";
import { z } from "zod";

const id = z.string().min(1).max(64);
const index = z.number().int().min(0).max(10);
const simple = <T extends string>(type: T) => z.object({ type: z.literal(type) });

export const ActionSchema = z.discriminatedUnion("type", [
  simple("sync"),
  simple("rest"),
  z.object({ type: z.literal("hunt.start"), difficulty: z.enum(DIFFICULTY_IDS) }),
  simple("weekly.start"),
  simple("combat.attack"),
  z.object({ type: z.literal("combat.skill"), skillId: id }),
  z.object({ type: z.literal("combat.potion"), uid: id.optional() }),
  simple("combat.guard"),
  simple("combat.flee"),
  simple("combat.auto"),
  z.object({ type: z.literal("item.equip"), uid: id }),
  z.object({ type: z.literal("item.unequip"), slot: z.enum(SLOTS) }),
  z.object({ type: z.literal("item.use"), uid: id }),
  z.object({ type: z.literal("item.sell"), uid: id }),
  simple("item.sellJunk"),
  z.object({ type: z.literal("item.lock"), uid: id }),
  z.object({ type: z.literal("item.identify"), uid: id }),
  simple("item.identifyAll"),
  z.object({ type: z.literal("forge.upgrade"), uid: id }),
  z.object({ type: z.literal("forge.salvage"), uid: id }),
  z.object({ type: z.literal("forge.reroll"), uid: id, affixIndex: index }),
  z.object({ type: z.literal("alchemy.brew"), recipeId: id }),
  z.object({ type: z.literal("building.upgrade"), buildingId: z.enum(["forge", "satchel", "market", "alchemist"]) }),
  z.object({ type: z.literal("market.buy"), offerUid: id }),
  z.object({ type: z.literal("market.buyStock"), itemId: id }),
  z.object({ type: z.literal("quest.accept"), uid: id }),
  z.object({ type: z.literal("quest.abandon"), uid: id }),
  z.object({ type: z.literal("quest.turnIn"), uid: id }),
  z.object({ type: z.literal("class.choose"), classId: z.enum(CLASS_IDS) }),
  z.object({ type: z.literal("talent.learn"), talentId: id }),
  simple("talent.reset"),
  z.object({ type: z.literal("paragon.spend"), stat: z.enum(PARAGON_STATS) }),
  simple("dungeon.enter"),
  z.object({ type: z.literal("dungeon.door"), index }),
  z.object({ type: z.literal("dungeon.choice"), index }),
  simple("dungeon.descend"),
  simple("dungeon.leave"),
  simple("fish.cast"),
  z.object({ type: z.literal("fish.reel"), move: z.enum(["pull", "steady", "slack"]) }),
  simple("challenge.start"),
  simple("challenge.next"),
]);

// Compile-time check: the schema and the engine's Action type describe the same thing.
type Parsed = z.infer<typeof ActionSchema>;
const _sameShape: [Parsed extends Action ? true : false, Action extends Parsed ? true : false] = [true, true];
void _sameShape;

export function parseAction(input: unknown): Action | undefined {
  const result = ActionSchema.safeParse(input);
  return result.success ? (result.data as Action) : undefined;
}

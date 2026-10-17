/**
 * A bot that plays the game the way a reasonable player would: a few sessions a day, spending
 * its energy on hunts, wearing its best gear, turning in quests, using the cube, choosing a
 * class. It only talks to the engine through `apply`, exactly like the server does.
 */
import type { ClassId, Content, DifficultyId } from "@textrpg/content";
import {
  type Action,
  apply,
  computeStats,
  createGame,
  type GameEvent,
  GameError,
  type GameState,
  huntEnergy,
  type Item,
  powerScore,
} from "@textrpg/engine";

const HOUR = 3_600_000;

export interface BotProfile {
  id: string;
  /** Local hours at which the player opens the game. */
  sessions: number[];
  /** Win rate a difficulty needs before the bot plays it regularly. */
  ambition: number;
  classId: ClassId;
  usesCube: boolean;
}

export const PROFILES: BotProfile[] = [
  { id: "casual", sessions: [12, 21], ambition: 0.9, classId: "warrior", usesCube: false },
  { id: "regular", sessions: [8, 12, 18, 22], ambition: 0.8, classId: "ranger", usesCube: true },
  {
    id: "hardcore",
    sessions: [7, 10, 13, 16, 19, 22],
    ambition: 0.7,
    classId: "occultist",
    usesCube: true,
  },
];

export interface Milestones {
  /** Day (1-based, fractional) at which each level was reached. */
  levels: Record<number, number>;
  firstSigilBonus?: number;
  firstLegendary?: number;
  firstSet?: number;
  firstCraft?: number;
  firstTorment?: number;
  fights: number;
  defeats: number;
  /** Defeats per level bracket, to spot difficulty walls. */
  defeatsByLevel: Record<number, number>;
  difficultyShare: Record<DifficultyId, number>;
  finalLevel: number;
  paragon: number;
  torment: number;
  gold: number;
  power: number;
}

const DIFFICULTIES: DifficultyId[] = ["easy", "normal", "hard", "hell"];

export class Bot {
  state: GameState;
  now: number;
  readonly start: number;
  private readonly winRate: Record<DifficultyId, number> = {
    easy: 1,
    normal: 0.9,
    hard: 0.5,
    hell: 0.1,
  };
  readonly m: Milestones = {
    levels: { 1: 0 },
    fights: 0,
    defeats: 0,
    defeatsByLevel: {},
    difficultyShare: { easy: 0, normal: 0, hard: 0, hell: 0 },
    finalLevel: 1,
    paragon: 0,
    torment: 0,
    gold: 0,
    power: 0,
  };

  constructor(
    readonly profile: BotProfile,
    readonly content: Content,
    seed: string,
  ) {
    this.start = Date.UTC(2026, 0, 5, 0);
    this.now = this.start;
    this.state = createGame({ name: "Bot", seed, now: this.now, tzOffset: 0, content });
  }

  get day(): number {
    return (this.now - this.start) / (24 * HOUR);
  }

  /** Run one action; rule violations are ignored (the bot tries things), anything else throws. */
  private act(action: Action): GameEvent[] | undefined {
    try {
      const result = apply(this.state, action, { now: this.now, content: this.content });
      this.state = result.state;
      this.observe(result.events);
      return result.events;
    } catch (error) {
      if (error instanceof GameError) return undefined;
      throw error;
    }
  }

  private observe(events: GameEvent[]): void {
    const day = Math.round(this.day * 100) / 100;
    for (const e of events) {
      if (e.type === "levelUp") this.m.levels[e.level] ??= day;
      if (e.type === "loot" && !e.lost) {
        if (e.item.rarity === "legendary") this.m.firstLegendary ??= day;
        if (e.item.rarity === "set") this.m.firstSet ??= day;
      }
      if (e.type === "transmuted" || e.type === "enchanted") this.m.firstCraft ??= day;
      if (e.type === "defeat") {
        this.m.defeats += 1;
        const bracket = Math.floor(this.state.hero.level / 5) * 5;
        this.m.defeatsByLevel[bracket] = (this.m.defeatsByLevel[bracket] ?? 0) + 1;
      }
    }
  }

  private score(state: GameState): number {
    return powerScore(computeStats(state, this.content));
  }

  private isGear(item: Item): boolean {
    return this.content.items.get(item.baseId)?.kind === "equipment";
  }

  /** Try each piece of gear in the bag; keep whatever raises the power score. */
  private equipBest(): void {
    let improved = true;
    for (let pass = 0; improved && pass < 3; pass++) {
      improved = false;
      const current = this.score(this.state);
      let best: { uid: string; score: number } | undefined;
      for (const item of this.state.hero.bag) {
        if (!this.isGear(item) || !item.identified) continue;
        try {
          const next = apply(
            this.state,
            { type: "item.equip", uid: item.uid },
            { now: this.now, content: this.content },
          ).state;
          let score = this.score(next);
          // The tooltip shows "Wolf 1/2": players happily start a sigil with a slightly weaker piece.
          if (item.sigil && !this.sigilBonusActive() && !this.wears(item.sigil)) score *= 1.05;
          if (score > (best?.score ?? current * 1.001)) best = { uid: item.uid, score };
        } catch (error) {
          if (!(error instanceof GameError)) throw error;
        }
      }
      if (best) {
        this.act({ type: "item.equip", uid: best.uid });
        improved = true;
      }
    }
  }

  private manage(): void {
    const hero = this.state.hero;
    this.act({ type: "item.identifyAll" });
    this.equipBest();
    if (!hero.classId && hero.level >= 5)
      this.act({ type: "class.choose", classId: this.profile.classId });
    if (this.state.hero.classId) {
      const talents = this.content.classes.get(this.state.hero.classId)!.talents;
      for (let i = 0; i < talents.length * 3; i++) {
        if (!this.act({ type: "talent.learn", talentId: talents[i % talents.length]!.id }))
          continue;
      }
    }
    for (let i = 0; i < 5; i++) this.act({ type: "paragon.spend", stat: "damagePct" });
    for (const quest of [...this.state.quests]) this.act({ type: "quest.turnIn", uid: quest.uid });
    for (const offer of [...this.state.board.offers])
      this.act({ type: "quest.accept", uid: offer.uid });
    if (this.profile.usesCube) this.craft();
    this.act({ type: "item.sellJunk" });
    // Keep a few potions around.
    const potions = this.state.hero.bag.find((i) => i.baseId === "potion")?.quantity ?? 0;
    for (let i = potions; i < 3; i++) this.act({ type: "market.buyStock", itemId: "potion" });
    for (const id of ["satchel", "forge"] as const)
      this.act({ type: "building.upgrade", buildingId: id });

    if (this.state.hero.level >= 20) {
      const before = this.state.hero.torment;
      // Climb torments while hell stays comfortable, step back on a losing streak.
      const next =
        this.winRate.hell > 0.75 ? before + 1 : this.winRate.hell < 0.4 ? before - 1 : before;
      if (next !== before && next >= 0 && this.act({ type: "torment.set", level: next })) {
        this.winRate.hell = 0.6;
        if (next > 0) this.m.firstTorment ??= Math.round(this.day * 100) / 100;
      }
    }
    if (this.sigilBonusActive()) this.m.firstSigilBonus ??= Math.round(this.day * 100) / 100;
  }

  private wears(sigil: string): boolean {
    return Object.values(this.state.hero.equipment).some((i) => i?.sigil === sigil);
  }

  private sigilBonusActive(): boolean {
    const counts = new Map<string, number>();
    for (const item of Object.values(this.state.hero.equipment)) {
      if (item?.sigil && item.identified) counts.set(item.sigil, (counts.get(item.sigil) ?? 0) + 1);
    }
    return [...counts.values()].some((c) => c >= 2);
  }

  /** Transmute spare gear three by three, enchant the weapon once. */
  private craft(): void {
    for (const rarity of ["common", "magic", "rare"] as const) {
      const spare = this.state.hero.bag.filter(
        (i) => this.isGear(i) && i.identified && !i.locked && i.rarity === rarity,
      );
      if (spare.length >= 3) {
        const [a, b, c] = spare;
        this.act({ type: "cube.transmute", uids: [a!.uid, b!.uid, c!.uid] });
        this.equipBest();
      }
    }
    const weapon = this.state.hero.equipment.weapon;
    if (weapon && !weapon.enchant && weapon.rarity !== "common") {
      if (this.act({ type: "cube.enchant", uid: weapon.uid })) {
        const options = this.state.cube.offer?.options ?? [];
        const scores = options.map((_, index) => {
          try {
            return this.score(
              apply(
                this.state,
                { type: "cube.enchantPick", index },
                { now: this.now, content: this.content },
              ).state,
            );
          } catch {
            return 0;
          }
        });
        this.act({ type: "cube.enchantPick", index: scores.indexOf(Math.max(...scores)) });
      }
    }
  }

  private pickDifficulty(): DifficultyId {
    const affordable = DIFFICULTIES.filter((d) => this.state.hero.energy >= this.energyOf(d));
    let choice: DifficultyId | undefined;
    for (const d of affordable) if (this.winRate[d] >= this.profile.ambition) choice = d;
    // Now and then, try the next difficulty up: that's how players find out they're ready.
    const next = DIFFICULTIES[DIFFICULTIES.indexOf(choice ?? "easy") + 1];
    const fresh = this.state.hero.health >= computeStats(this.state, this.content).maxHealth * 0.9;
    if (next && fresh && affordable.includes(next) && this.m.fights % 6 === 5) choice = next;
    return choice ?? affordable[0] ?? "easy";
  }

  private energyOf(d: DifficultyId): number {
    return huntEnergy(this.state.hero, this.content.difficulties.get(d)!);
  }

  private fight(difficulty: DifficultyId): void {
    if (!this.act({ type: "hunt.start", difficulty })) return;
    this.m.fights += 1;
    this.m.difficultyShare[difficulty] += 1;
    let won = false;
    for (let round = 0; round < 100 && this.state.combat; round++) {
      const combat = this.state.combat;
      const low = combat.hero.hp < combat.hero.maxHp * 0.3;
      const events =
        (low && this.act({ type: "combat.potion" })) ||
        this.act({ type: "combat.auto" }) ||
        this.act({ type: "combat.attack" });
      if (!events) this.act({ type: "combat.flee" });
      if (events?.some((e) => e.type === "victory")) won = true;
    }
    this.winRate[difficulty] = this.winRate[difficulty] * 0.85 + (won ? 0.15 : 0);
  }

  /** One play session: rest once a day, then hunt until out of energy or health. */
  private session(): void {
    this.act({ type: "sync" });
    this.manage();
    for (let i = 0; i < 60; i++) {
      const stats = computeStats(this.state, this.content);
      if (this.state.hero.health < stats.maxHealth * 0.45) {
        const potion = this.state.hero.bag.find((it) => it.baseId === "potion");
        // Rest (once a day) when out of potions, otherwise come back later.
        if (
          !(potion && this.act({ type: "item.use", uid: potion.uid })) &&
          !this.act({ type: "rest" })
        )
          break;
      }
      if (this.state.hero.energy < this.energyOf("easy")) break;
      this.fight(this.pickDifficulty());
      this.now += 2 * 60_000; // a fight takes a couple of minutes
      if (i % 5 === 4) this.manage();
    }
    this.manage();
  }

  play(days: number): Milestones {
    for (let d = 0; d < days; d++) {
      const dayStart = this.start + d * 24 * HOUR;
      for (const hour of this.profile.sessions) {
        this.now = Math.max(this.now, dayStart + hour * HOUR);
        this.session();
      }
    }
    const hero = this.state.hero;
    Object.assign(this.m, {
      finalLevel: hero.level,
      paragon: hero.paragon,
      torment: hero.torment,
      gold: hero.gold,
      power: Math.round(this.score(this.state)),
    });
    return this.m;
  }
}

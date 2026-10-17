import type { Content } from "@textrpg/content";

import type { Rng } from "./rng";
import type { GameEvent, GameState } from "./types";

/** A rule violation the player can be told about ("not enough energy"...). */
export class GameError extends Error {
  constructor(
    readonly code: string,
    readonly params: Record<string, string | number> = {},
  ) {
    super(code);
  }
}

/** Everything a system needs while resolving one action. Systems mutate `state` in place. */
export class Ctx {
  readonly events: GameEvent[] = [];

  constructor(
    readonly state: GameState,
    readonly content: Content,
    readonly rng: Rng,
    readonly now: number,
  ) {}

  get hero() {
    return this.state.hero;
  }

  emit(event: GameEvent): void {
    this.events.push(event);
  }

  uid(prefix = "i"): string {
    return `${prefix}${this.state.nextUid++}`;
  }

  fail(code: string, params?: Record<string, string | number>): never {
    throw new GameError(code, params);
  }
}

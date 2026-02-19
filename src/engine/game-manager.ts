import { BlackjackEngine } from "./engine.js";
import type { EngineOptions } from "./engine.js";
import { Inventory } from "./inventory.js";
import { Shop } from "./shop.js";
import { SeededRng } from "./rng.js";
import type { GameState, PlayerAction } from "./types.js";
import type { Item } from "./item.js";

export type MetaPhase = "playing" | "shop" | "game_over";

export interface MetaGameState {
  handsPlayed: number;
  stage: number;
  handsPerStage: number;
  stageMoneyThreshold: number;
  metaPhase: MetaPhase;
}

const HANDS_PER_STAGE = 5;
const STAGE_MONEY_MULTIPLIER = 500;

export class GameManager {
  private readonly engine: BlackjackEngine;
  private readonly inventory: Inventory;
  private readonly shop: Shop;
  private readonly metaRng: SeededRng;

  private handsPlayed: number = 0;
  private stage: number = 0;
  private metaPhase: MetaPhase = "playing";

  constructor(options: EngineOptions = {}) {
    this.engine = new BlackjackEngine(options);
    this.inventory = new Inventory();
    this.shop = new Shop();
    const metaSeed = options.seed !== undefined ? `${options.seed}-meta` : `${Date.now()}-meta`;
    this.metaRng = new SeededRng(metaSeed);
  }

  public getEngine(): BlackjackEngine {
    return this.engine;
  }

  public getInventory(): Inventory {
    return this.inventory;
  }

  public getShop(): Shop {
    return this.shop;
  }

  public getMetaState(): MetaGameState {
    return {
      handsPlayed: this.handsPlayed,
      stage: this.stage,
      handsPerStage: HANDS_PER_STAGE,
      stageMoneyThreshold: this.stage * STAGE_MONEY_MULTIPLIER,
      metaPhase: this.metaPhase,
    };
  }

  public getGameState(): GameState {
    return this.engine.getState();
  }

  public startRound(wager: number): void {
    if (this.metaPhase !== "playing") {
      throw new Error("Cannot start a round outside of the playing phase.");
    }
    this.engine.startRound(wager);
  }

  public performAction(action: PlayerAction): void {
    this.engine.performAction(action);

    const state = this.engine.getState();
    if (state.phase === "round_settled" || state.phase === "game_over") {
      this.handsPlayed += 1;
      this.checkStageProgression();
    }
  }

  /** After a round settles without a player action (e.g. natural blackjack), call this. */
  public acknowledgeRoundSettled(): void {
    const state = this.engine.getState();
    if (state.phase === "round_settled" || state.phase === "game_over") {
      this.handsPlayed += 1;
      this.checkStageProgression();
    }
  }

  public purchaseShopItem(index: number): Item | null {
    if (this.metaPhase !== "shop") {
      return null;
    }
    const state = this.engine.getState();
    const result = this.shop.purchase(index, state.bankroll);
    if (!result) {
      return null;
    }
    this.engine.adjustBankroll(-result.cost);
    this.inventory.addItem(result.item);
    return result.item;
  }

  public leaveShop(): void {
    if (this.metaPhase !== "shop") {
      return;
    }
    this.metaPhase = "playing";
  }

  private checkStageProgression(): void {
    const state = this.engine.getState();

    if (state.phase === "game_over") {
      this.metaPhase = "game_over";
      return;
    }

    if (this.handsPlayed > 0 && this.handsPlayed % HANDS_PER_STAGE === 0) {
      this.stage += 1;
      const threshold = this.stage * STAGE_MONEY_MULTIPLIER;

      if (state.bankroll < threshold) {
        this.metaPhase = "game_over";
        return;
      }

      this.shop.generateOfferings(this.metaRng);
      this.metaPhase = "shop";
    }
  }
}

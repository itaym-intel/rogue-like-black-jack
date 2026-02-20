import { BlackjackEngine } from "./engine.js";
import type { EngineOptions } from "./engine.js";
import { Inventory } from "./inventory.js";
import { SeededRng } from "./rng.js";
import type { Card, GameState, PlayerAction } from "./types.js";
import type { Item, ItemEffectContext, ItemEffectTrigger } from "./item.js";
import { rollItemReward } from "./item-reward.js";
import type { ItemRewardResult } from "./item-reward.js";

export type MetaPhase = "playing" | "game_over";

export interface MetaGameState {
  handsPlayed: number;
  stage: number;
  handsPerStage: number;
  stageMoneyThreshold: number;
  metaPhase: MetaPhase;
}

/** An on-demand item action the player can trigger during their turn. */
export interface AvailableItemAction {
  itemName: string;
  actionId: string;
}

const HANDS_PER_STAGE = 1;
const STAGE_MONEY_MULTIPLIER = 0;

export class GameManager {
  private readonly engine: BlackjackEngine;
  private readonly inventory: Inventory;
  private readonly metaRng: SeededRng;

  private handsPlayed: number = 0;
  private stage: number = 1;
  private metaPhase: MetaPhase = "playing";

  /** The wager % of the most recent hand (0–100). */
  private lastWagerPercent: number = 0;
  /** The item rewarded after the most recent stage clear, if any. */
  private lastRewardedItem: ItemRewardResult | null = null;

  constructor(options: EngineOptions = {}) {
    this.engine = new BlackjackEngine(options);
    this.inventory = new Inventory();
    const metaSeed = options.seed !== undefined ? `${options.seed}-meta` : `${Date.now()}-meta`;
    this.metaRng = new SeededRng(metaSeed);
  }

  public getEngine(): BlackjackEngine {
    return this.engine;
  }

  public getInventory(): Inventory {
    return this.inventory;
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
    // Compute and store wager % before the engine deducts it from bankroll.
    // bankroll at this point still includes the wager amount.
    const totalBankroll = this.engine.getState().bankroll;
    this.lastWagerPercent = totalBankroll > 0 ? (wager / totalBankroll) * 100 : 0;
    this.lastRewardedItem = null;

    this.engine.startRound(wager);
    // Fire on_hand_start after cards are dealt so items can inspect the initial state.
    this.fireItemEffects("on_hand_start");
  }

  /** Returns the item rewarded after the most recent stage clear, or null. */
  public getLastRewardedItem(): ItemRewardResult | null {
    return this.lastRewardedItem;
  }

  public performAction(action: PlayerAction): void {
    this.engine.performAction(action);

    const state = this.engine.getState();
    if (state.phase === "round_settled" || state.phase === "game_over") {
      this.fireItemEffects("on_hand_end");
      this.handsPlayed += 1;
      this.checkStageProgression();
    }
  }

  /** After a round settles without a player action (e.g. natural blackjack), call this. */
  public acknowledgeRoundSettled(): void {
    const state = this.engine.getState();
    if (state.phase === "round_settled" || state.phase === "game_over") {
      this.fireItemEffects("on_hand_end");
      this.handsPlayed += 1;
      this.checkStageProgression();
    }
  }

  /**
   * Adds a rewarded item to inventory, applies passive modifiers,
   * and fires on_purchase effects.
   */
  private addRewardedItem(item: Item): void {
    this.inventory.addItem(item);

    // Apply passive modifiers immediately so they take effect from the next round onward.
    for (const effect of item.effects) {
      if (effect.trigger === "passive" && effect.modifier) {
        this.engine.addModifier(effect.modifier);
      }
    }

    // Fire the on_purchase effect (e.g. an item that grants a one-time bonus on buy).
    this.fireItemEffectsForItem(item, "on_purchase");
  }

  // ── In-hand item actions ────────────────────────────────────────────────────

  /**
   * Returns item actions that the player can trigger right now (during player_turn).
   * Only populated when metaPhase === "playing" and phase === "player_turn".
   */
  public getAvailableItemActions(): AvailableItemAction[] {
    if (this.engine.getState().phase !== "player_turn") return [];
    const actions: AvailableItemAction[] = [];
    for (const item of this.inventory.getItems()) {
      if (item.onDemandActionId && item.isActionAvailable?.()) {
        actions.push({ itemName: item.itemName, actionId: item.onDemandActionId });
      }
    }
    return actions;
  }

  /**
   * Returns the cards in the currently active player hand — the valid VR Goggles targets.
   */
  public getVrGogglesTargets(): Card[] {
    return this.engine.getActiveHandCards();
  }

  /**
   * Activate the VR Goggles ability: boosts the value of `cardId` by 1.
   * If `permanent` is false, the boost is removed automatically at the end of the hand.
   */
  public useVrGoggles(cardId: string, permanent: boolean): void {
    if (this.engine.getState().phase !== "player_turn") {
      throw new Error("VR Goggles can only be used during the player's turn.");
    }
    const item = [...this.inventory.getItems()].find(
      (i) => i.onDemandActionId === "vr_goggles_boost",
    );
    if (!item || !item.isActionAvailable?.() || !item.executeAction) {
      throw new Error("VR Goggles are not available.");
    }
    item.executeAction({
      targetCardId: cardId,
      permanent,
      addModifier: (m) => this.engine.addModifier(m),
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private fireItemEffects(trigger: ItemEffectTrigger): void {
    for (const item of this.inventory.getItems()) {
      this.fireItemEffectsForItem(item, trigger);
    }
  }

  private fireItemEffectsForItem(item: Item, trigger: ItemEffectTrigger): void {
    const effectsForTrigger = item.effects.filter(
      (e) => e.trigger === trigger && typeof e.apply === "function",
    );
    if (effectsForTrigger.length === 0) return;

    const state = this.engine.getState();
    const meta = this.getMetaState();
    const ctx: ItemEffectContext = {
      bankroll: state.bankroll,
      handsPlayed: meta.handsPlayed,
      stage: meta.stage,
      rng: this.metaRng,
      adjustBankroll: (amount) => this.engine.adjustBankroll(amount),
      lastRoundSummary: state.lastRoundSummary,
      addModifier: (m) => this.engine.addModifier(m),
      removeModifier: (m) => this.engine.removeModifier(m),
    };

    for (const effect of effectsForTrigger) {
      effect.apply!(ctx);
    }
  }

  private checkStageProgression(): void {
    const state = this.engine.getState();

    if (state.phase === "game_over") {
      this.metaPhase = "game_over";
      return;
    }

    if (this.handsPlayed > 0 && this.handsPlayed % HANDS_PER_STAGE === 0) {
      const threshold = this.stage * STAGE_MONEY_MULTIPLIER;

      if (state.bankroll < threshold) {
        this.fireItemEffects("on_stage_end");
        this.metaPhase = "game_over";
        return;
      }

      this.fireItemEffects("on_stage_end");
      this.stage += 1;

      // Roll an item reward based on the wager % of the hand that completed the stage.
      const reward = rollItemReward(this.lastWagerPercent, this.metaRng);
      if (reward) {
        this.lastRewardedItem = reward;
        this.addRewardedItem(reward.item);
      }
      // Meta phase stays "playing" — no shop transition.
    }
  }
}


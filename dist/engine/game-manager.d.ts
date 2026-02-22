import { BlackjackEngine } from "./engine.js";
import type { EngineOptions } from "./engine.js";
import { Inventory } from "./inventory.js";
import { Shop } from "./shop.js";
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
export declare class GameManager {
    private readonly engine;
    private readonly inventory;
    private readonly shop;
    private readonly metaRng;
    private handsPlayed;
    private stage;
    private metaPhase;
    constructor(options?: EngineOptions);
    getEngine(): BlackjackEngine;
    getInventory(): Inventory;
    getShop(): Shop;
    getMetaState(): MetaGameState;
    getGameState(): GameState;
    startRound(wager: number): void;
    performAction(action: PlayerAction): void;
    /** After a round settles without a player action (e.g. natural blackjack), call this. */
    acknowledgeRoundSettled(): void;
    purchaseShopItem(index: number): Item | null;
    leaveShop(): void;
    private checkStageProgression;
}

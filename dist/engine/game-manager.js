import { BlackjackEngine } from "./engine.js";
import { Inventory } from "./inventory.js";
import { Shop } from "./shop.js";
import { SeededRng } from "./rng.js";
const HANDS_PER_STAGE = 5;
const STAGE_MONEY_MULTIPLIER = 500;
export class GameManager {
    engine;
    inventory;
    shop;
    metaRng;
    handsPlayed = 0;
    stage = 0;
    metaPhase = "playing";
    constructor(options = {}) {
        this.engine = new BlackjackEngine(options);
        this.inventory = new Inventory();
        this.shop = new Shop();
        const metaSeed = options.seed !== undefined ? `${options.seed}-meta` : `${Date.now()}-meta`;
        this.metaRng = new SeededRng(metaSeed);
    }
    getEngine() {
        return this.engine;
    }
    getInventory() {
        return this.inventory;
    }
    getShop() {
        return this.shop;
    }
    getMetaState() {
        return {
            handsPlayed: this.handsPlayed,
            stage: this.stage,
            handsPerStage: HANDS_PER_STAGE,
            stageMoneyThreshold: this.stage * STAGE_MONEY_MULTIPLIER,
            metaPhase: this.metaPhase,
        };
    }
    getGameState() {
        return this.engine.getState();
    }
    startRound(wager) {
        if (this.metaPhase !== "playing") {
            throw new Error("Cannot start a round outside of the playing phase.");
        }
        this.engine.startRound(wager);
    }
    performAction(action) {
        this.engine.performAction(action);
        const state = this.engine.getState();
        if (state.phase === "round_settled" || state.phase === "game_over") {
            this.handsPlayed += 1;
            this.checkStageProgression();
        }
    }
    /** After a round settles without a player action (e.g. natural blackjack), call this. */
    acknowledgeRoundSettled() {
        const state = this.engine.getState();
        if (state.phase === "round_settled" || state.phase === "game_over") {
            this.handsPlayed += 1;
            this.checkStageProgression();
        }
    }
    purchaseShopItem(index) {
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
    leaveShop() {
        if (this.metaPhase !== "shop") {
            return;
        }
        this.metaPhase = "playing";
    }
    checkStageProgression() {
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
//# sourceMappingURL=game-manager.js.map
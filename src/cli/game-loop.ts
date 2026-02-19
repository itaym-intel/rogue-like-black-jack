import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { GameManager } from "../engine/game-manager.js";
import type {
  GameState,
  PlayerAction,
  RoundSummary,
  SettledHandResult,
} from "../engine/types.js";
import type { MetaGameState } from "../engine/game-manager.js";
import type { Item } from "../engine/item.js";
import type { ShopOffering } from "../engine/shop.js";

export interface CliGameOptions {
  seed?: number | string;
  startingBankroll?: number;
}

const ACTION_ALIASES: Record<string, PlayerAction> = {
  h: "hit",
  hit: "hit",
  s: "stand",
  stand: "stand",
  d: "double",
  double: "double",
  p: "split",
  split: "split",
};

export async function runCliGame(options: CliGameOptions = {}): Promise<void> {
  const manager = new GameManager({
    seed: options.seed,
    startingBankroll: options.startingBankroll,
  });
  const engine = manager.getEngine();

  const rl = createInterface({ input, output });
  console.log("Rogue-Like Blackjack (Text Mode)");
  console.log(`Seed: ${engine.getState().seed}`);
  console.log("Payouts: win returns 2x wager, blackjack returns 2.5x wager.");
  console.log("Dealer stands on soft 17.");
  console.log("Type q at prompts to quit. Type i to view inventory.");

  try {
    while (true) {
      const state = engine.getState();
      const meta = manager.getMetaState();

      if (meta.metaPhase === "game_over" || state.phase === "game_over") {
        if (state.lastRoundSummary) {
          printRoundSummary(state.lastRoundSummary);
        }
        printStageFailure(meta);
        console.log(`Game over. Final bankroll: ${formatMoney(state.bankroll)}`);
        console.log(`Hands played: ${meta.handsPlayed} | Stage reached: ${meta.stage}`);
        break;
      }

      if (meta.metaPhase === "shop") {
        await runShopPhase(rl, manager);
        continue;
      }

      if (state.phase === "awaiting_bet" || state.phase === "round_settled") {
        if (state.phase === "round_settled" && state.lastRoundSummary) {
          printRoundSummary(state.lastRoundSummary);
        }

        printMetaStatus(meta, state.bankroll);

        const answer = (
          await rl.question(
            `Bankroll ${formatMoney(state.bankroll)}. Enter wager (min ${engine.getMinimumBet()}) or q: `,
          )
        )
          .trim()
          .toLowerCase();

        if (isQuit(answer)) {
          break;
        }
        if (answer === "i") {
          printInventory(manager);
          continue;
        }

        const wager = Number(answer);
        if (!Number.isFinite(wager)) {
          console.log("Please enter a valid number.");
          continue;
        }

        try {
          manager.startRound(wager);
          // Check if the round immediately settled (natural blackjack)
          const afterState = engine.getState();
          if (afterState.phase === "round_settled" || afterState.phase === "game_over") {
            manager.acknowledgeRoundSettled();
          }
        } catch (error) {
          console.log(formatError(error));
        }
        continue;
      }

      if (state.phase === "player_turn") {
        printActiveRound(engine, state, meta);
        const availableActions = engine.getAvailableActions();
        const itemActions = manager.getAvailableItemActions();
        const hasVrGoggles = itemActions.some((a) => a.actionId === "vr_goggles_boost");

        const actionHints = availableActions.join("/");
        const itemHints = hasVrGoggles ? "/vg" : "";
        const prompt = `Action [${actionHints}${itemHints}] (h/s/d/p${hasVrGoggles ? "/vg" : ""}) or q: `;
        const answer = (await rl.question(prompt)).trim().toLowerCase();

        if (isQuit(answer)) {
          break;
        }
        if (answer === "i") {
          printInventory(manager);
          continue;
        }

        // VR Goggles on-demand action
        if (answer === "vg" || answer === "vrgoggles") {
          if (!hasVrGoggles) {
            console.log("VR Goggles are not available right now.");
            continue;
          }
          const targets = manager.getVrGogglesTargets();
          if (targets.length === 0) {
            console.log("No cards available to boost.");
            continue;
          }

          console.log("Select a card to boost by 1:");
          targets.forEach((card, idx) => {
            console.log(`  ${idx + 1}. ${formatCard(card)}`);
          });

          const cardAnswer = (await rl.question("Card number: ")).trim();
          const cardIndex = Number(cardAnswer) - 1;
          if (!Number.isFinite(cardIndex) || cardIndex < 0 || cardIndex >= targets.length) {
            console.log("Invalid selection.");
            continue;
          }
          const selectedCard = targets[cardIndex];

          const permAnswer = (
            await rl.question("Make permanent? (y = yes, n = this hand only): ")
          )
            .trim()
            .toLowerCase();
          const permanent = permAnswer === "y" || permAnswer === "yes";

          try {
            manager.useVrGoggles(selectedCard.id, permanent);
            console.log(
              `Boosted ${formatCard(selectedCard)} by 1.${permanent ? " (permanent)" : " (this hand only)"}`,
            );
          } catch (error) {
            console.log(formatError(error));
          }
          continue;
        }

        const action = ACTION_ALIASES[answer];
        if (!action || !availableActions.includes(action)) {
          console.log("That action is not available right now.");
          continue;
        }

        try {
          manager.performAction(action);
        } catch (error) {
          console.log(formatError(error));
        }
        continue;
      }
    }
  } finally {
    rl.close();
  }
}

async function runShopPhase(
  rl: ReturnType<typeof createInterface>,
  manager: GameManager,
): Promise<void> {
  const meta = manager.getMetaState();
  const state = manager.getGameState();
  console.log("");
  console.log("=".repeat(40));
  console.log(`  STAGE ${meta.stage} COMPLETE — SHOP`);
  console.log("=".repeat(40));
  console.log(`Bankroll: ${formatMoney(state.bankroll)}`);
  console.log("");

  while (true) {
    const offerings = manager.getShop().getOfferings();
    if (offerings.length === 0) {
      console.log("Shop is empty.");
      manager.leaveShop();
      return;
    }

    printShopOfferings(offerings, manager.getGameState().bankroll);

    const answer = (
      await rl.question("Enter item number to buy, (i)nventory, or (l)eave shop: ")
    )
      .trim()
      .toLowerCase();

    if (isQuit(answer)) {
      manager.leaveShop();
      return;
    }
    if (answer === "l" || answer === "leave") {
      manager.leaveShop();
      console.log("Leaving shop...");
      return;
    }
    if (answer === "i") {
      printInventory(manager);
      continue;
    }

    const index = Number(answer) - 1;
    if (!Number.isFinite(index) || index < 0 || index >= offerings.length) {
      console.log("Invalid selection.");
      continue;
    }

    const item = manager.purchaseShopItem(index);
    if (item) {
      console.log(`Purchased "${item.itemName}"!`);
      console.log(`Bankroll: ${formatMoney(manager.getGameState().bankroll)}`);
    } else {
      console.log("Cannot afford that item.");
    }
  }
}

function printShopOfferings(offerings: ReadonlyArray<ShopOffering>, bankroll: number): void {
  console.log("Items for sale:");
  offerings.forEach((offering, index) => {
    const affordable = bankroll >= offering.price ? "" : " (can't afford)";
    console.log(
      `  ${index + 1}. [${offering.item.itemRarity.toUpperCase()}] ${offering.item.itemName} — ${formatMoney(offering.price)}${affordable}`,
    );
    console.log(`     ${offering.item.itemDescription}`);
  });
  console.log("");
}

function printInventory(manager: GameManager): void {
  const inventory = manager.getInventory();
  console.log("");
  if (inventory.isEmpty()) {
    console.log("Inventory: (empty)");
  } else {
    console.log("Inventory:");
    inventory.getItems().forEach((item: Item, index: number) => {
      console.log(
        `  ${index + 1}. [${item.itemRarity.toUpperCase()}] ${item.itemName} — ${item.itemDescription}`,
      );
    });
  }
  console.log("");
}

function printMetaStatus(meta: MetaGameState, bankroll: number): void {
  const handsInStage = meta.handsPlayed % meta.handsPerStage;
  const handsRemaining = meta.handsPerStage - handsInStage;
  console.log(
    `Hands: ${meta.handsPlayed} | Stage: ${meta.stage} | Hands until next stage: ${handsRemaining} | Need ${formatMoney(meta.stageMoneyThreshold)} to clear Stage ${meta.stage}`,
  );
}

function printActiveRound(
  engine: ReturnType<typeof GameManager.prototype.getEngine>,
  state: GameState,
  meta: MetaGameState,
): void {
  console.log("");
  console.log(`Round ${state.roundNumber} | Hands: ${meta.handsPlayed} | Stage: ${meta.stage}`);
  console.log(`Bankroll: ${formatMoney(state.bankroll)} | Deck: ${state.deckRemaining}`);
  const visibleDealer = state.dealerHand[0] ? formatCard(state.dealerHand[0]) : "--";
  console.log(`Dealer: ${visibleDealer} ??`);

  state.playerHands.forEach((hand, index) => {
    const isActive = state.activeHandIndex === index ? ">" : " ";
    const score = engine.getPlayerHandScore(index);
    const cards = hand.cards.map(formatCard).join(" ");
    const status = hand.isBusted ? " BUST" : hand.isStanding ? " STAND" : "";
    console.log(
      `${isActive} Hand ${index + 1} | Bet ${formatMoney(hand.wager)} | Score ${score} | ${cards}${status}`,
    );
  });
}

function printRoundSummary(summary: RoundSummary): void {
  console.log("");
  console.log(`Round ${summary.roundNumber} resolved`);
  console.log(
    `Bankroll: ${formatMoney(summary.bankrollBeforeRound)} -> ${formatMoney(summary.bankrollAfterRound)}`,
  );
  console.log(
    `Dealer: ${summary.dealerCards.map(formatCard).join(" ")} | Score ${summary.dealerScore}${summary.dealerBusted ? " (BUST)" : ""}`,
  );

  summary.handResults.forEach((result: SettledHandResult, index) => {
    console.log(
      `Hand ${index + 1}: ${result.outcome.toUpperCase()} | Score ${result.score} | Bet ${formatMoney(result.wager)} | Returned ${formatMoney(result.payoutReturned)} | ${result.cards.map(formatCard).join(" ")}`,
    );
  });
}

function printStageFailure(meta: MetaGameState): void {
  if (meta.stageMoneyThreshold > 0) {
    console.log(
      `Failed to meet Stage ${meta.stage} requirement of ${formatMoney(meta.stageMoneyThreshold)}.`,
    );
  }
}

function formatCard(card: { rank: string; suit: string }): string {
  return `${card.rank}${card.suit}`;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function isQuit(value: string): boolean {
  return value === "q" || value === "quit";
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

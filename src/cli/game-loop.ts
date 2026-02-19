import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { BlackjackEngine } from "../engine/engine.js";
import type {
  GameState,
  PlayerAction,
  RoundSummary,
  SettledHandResult,
} from "../engine/types.js";

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
  const engine = new BlackjackEngine({
    seed: options.seed,
    startingBankroll: options.startingBankroll,
  });

  const rl = createInterface({ input, output });
  console.log("Rogue-Like Blackjack (Text Mode)");
  console.log(`Seed: ${engine.getState().seed}`);
  console.log("Payouts: win returns 2x wager, blackjack returns 2.5x wager.");
  console.log("Dealer stands on soft 17.");
  console.log("Type q at prompts to quit.");

  try {
    while (true) {
      const state = engine.getState();

      if (state.phase === "game_over") {
        if (state.lastRoundSummary) {
          printRoundSummary(state.lastRoundSummary);
        }
        console.log(`Game over. Final bankroll: ${formatMoney(state.bankroll)}`);
        break;
      }

      if (state.phase === "awaiting_bet" || state.phase === "round_settled") {
        if (state.phase === "round_settled" && state.lastRoundSummary) {
          printRoundSummary(state.lastRoundSummary);
        }

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

        const wager = Number(answer);
        if (!Number.isFinite(wager)) {
          console.log("Please enter a valid number.");
          continue;
        }

        try {
          engine.startRound(wager);
        } catch (error) {
          console.log(formatError(error));
        }
        continue;
      }

      if (state.phase === "player_turn") {
        printActiveRound(engine, state);
        const availableActions = engine.getAvailableActions();
        const prompt = `Action [${availableActions.join("/")}] (h/s/d/p) or q: `;
        const answer = (await rl.question(prompt)).trim().toLowerCase();

        if (isQuit(answer)) {
          break;
        }

        const action = ACTION_ALIASES[answer];
        if (!action || !availableActions.includes(action)) {
          console.log("That action is not available right now.");
          continue;
        }

        try {
          engine.performAction(action);
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

function printActiveRound(engine: BlackjackEngine, state: GameState): void {
  console.log("");
  console.log(`Round ${state.roundNumber}`);
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

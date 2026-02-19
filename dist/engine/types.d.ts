export type Suit = "H" | "D" | "C" | "S";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export interface Card {
    rank: Rank;
    suit: Suit;
    id: string;
}
export type GamePhase = "awaiting_bet" | "player_turn" | "dealer_turn" | "round_settled" | "game_over";
export type PlayerAction = "hit" | "stand" | "double" | "split";
export type HandOutcome = "win" | "lose" | "push" | "blackjack";
export interface HandState {
    id: number;
    cards: Card[];
    wager: number;
    hasActed: boolean;
    isStanding: boolean;
    isBusted: boolean;
    isDoubled: boolean;
    isFromSplit: boolean;
}
export interface SettledHandResult {
    handId: number;
    cards: Card[];
    score: number;
    wager: number;
    outcome: HandOutcome;
    payoutReturned: number;
}
export interface RoundSummary {
    roundNumber: number;
    bankrollBeforeRound: number;
    bankrollAfterRound: number;
    dealerCards: Card[];
    dealerScore: number;
    dealerBusted: boolean;
    handResults: SettledHandResult[];
}
export interface EngineRules {
    targetScore: number;
    dealerStandsOnSoft17: boolean;
    winPayoutMultiplier: number;
    blackjackPayoutMultiplier: number;
    maxSplitHands: number;
    minBet: number;
}
export interface GameState {
    seed: number | string;
    phase: GamePhase;
    roundNumber: number;
    bankroll: number;
    targetScore: number;
    dealerHand: Card[];
    playerHands: HandState[];
    activeHandIndex: number | null;
    currentWager: number | null;
    deckRemaining: number;
    lastRoundSummary: RoundSummary | null;
}

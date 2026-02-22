import type { Card, GameState, HandState } from "./types.js";
export interface RoundContext {
    state: Readonly<GameState>;
    roundNumber: number;
    bankroll: number;
    targetScore: number;
}
export interface CardValueContext {
    state: Readonly<GameState>;
    owner: "player" | "dealer";
    hand: ReadonlyArray<Card>;
    card: Card;
    targetScore: number;
}
export interface HandScoreContext {
    state: Readonly<GameState>;
    owner: "player" | "dealer";
    hand: ReadonlyArray<Card>;
    targetScore: number;
}
export interface SplitRuleContext {
    state: Readonly<GameState>;
    hand: Readonly<HandState>;
    bankroll: number;
}
export interface DoubleRuleContext {
    state: Readonly<GameState>;
    hand: Readonly<HandState>;
    bankroll: number;
}
export interface PayoutContext {
    state: Readonly<GameState>;
    hand: Readonly<HandState>;
    dealerHand: ReadonlyArray<Card>;
    targetScore: number;
}
export interface BlackjackModifier {
    modifyDeck?(deck: ReadonlyArray<Card>, context: RoundContext): Card[];
    modifyTargetScore?(baseTargetScore: number, context: RoundContext): number;
    modifyCardValue?(baseValue: number, context: CardValueContext): number;
    modifyHandScore?(baseScore: number, context: HandScoreContext): number;
    modifyCanSplit?(defaultCanSplit: boolean, context: SplitRuleContext): boolean;
    modifyCanDouble?(defaultCanDouble: boolean, context: DoubleRuleContext): boolean;
    modifyWinPayoutMultiplier?(baseMultiplier: number, context: PayoutContext): number;
    modifyBlackjackPayoutMultiplier?(baseMultiplier: number, context: PayoutContext): number;
}

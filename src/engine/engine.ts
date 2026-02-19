import {
  baseCardValue,
  buildStandardDeck,
  isTenValueCard,
  shuffleDeck,
} from "./deck.js";
import type {
  Card,
  EngineRules,
  GameState,
  HandOutcome,
  HandState,
  PlayerAction,
  RoundSummary,
  SettledHandResult,
} from "./types.js";
import type {
  BlackjackModifier,
  CardValueContext,
  DoubleRuleContext,
  HandScoreContext,
  PayoutContext,
  RoundContext,
  SplitRuleContext,
} from "./modifiers.js";
import { SeededRng } from "./rng.js";

interface HandEvaluation {
  score: number;
  isSoft: boolean;
}

export interface EngineOptions {
  seed?: number | string;
  startingBankroll?: number;
  rules?: Partial<EngineRules>;
  modifiers?: BlackjackModifier[];
}

const DEFAULT_RULES: EngineRules = {
  targetScore: 21,
  dealerStandsOnSoft17: true,
  winPayoutMultiplier: 2,
  blackjackPayoutMultiplier: 2.5,
  maxSplitHands: 4,
  minBet: 1,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export class BlackjackEngine {
  private readonly rng: SeededRng;
  private readonly rules: EngineRules;
  private readonly modifiers: BlackjackModifier[];

  private readonly seed: number | string;
  private deck: Card[] = [];
  private nextHandId = 1;
  private bankrollBeforeRound = 0;

  private state: GameState;

  constructor(options: EngineOptions = {}) {
    this.seed = options.seed ?? Date.now();
    this.rng = new SeededRng(this.seed);
    this.rules = {
      ...DEFAULT_RULES,
      ...(options.rules ?? {}),
    };
    this.modifiers = [...(options.modifiers ?? [])];

    const startingBankroll = roundMoney(options.startingBankroll ?? 100);
    this.state = {
      seed: this.seed,
      phase: startingBankroll >= this.rules.minBet ? "awaiting_bet" : "game_over",
      roundNumber: 0,
      bankroll: startingBankroll,
      targetScore: this.rules.targetScore,
      dealerHand: [],
      playerHands: [],
      activeHandIndex: null,
      currentWager: null,
      deckRemaining: 0,
      lastRoundSummary: null,
    };

    this.rebuildDeck();
    this.syncDeckRemaining();
  }

  public getState(): GameState {
    return {
      ...this.state,
      dealerHand: this.cloneCards(this.state.dealerHand),
      playerHands: this.cloneHands(this.state.playerHands),
      lastRoundSummary: this.cloneRoundSummary(this.state.lastRoundSummary),
    };
  }

  public getMinimumBet(): number {
    return this.rules.minBet;
  }

  public adjustBankroll(amount: number): void {
    this.state.bankroll = roundMoney(this.state.bankroll + amount);
  }

  public getAvailableActions(): PlayerAction[] {
    if (this.state.phase !== "player_turn") {
      return [];
    }

    const hand = this.getActiveHand();
    if (!hand || this.isHandTerminal(hand)) {
      return [];
    }

    const actions: PlayerAction[] = ["hit", "stand"];
    if (this.canDouble(hand)) {
      actions.push("double");
    }
    if (this.canSplit(hand)) {
      actions.push("split");
    }
    return actions;
  }

  public startRound(wager: number): void {
    if (this.state.phase === "player_turn" || this.state.phase === "dealer_turn") {
      throw new Error("Cannot start a new round during an active round.");
    }
    if (this.state.bankroll < this.rules.minBet) {
      this.state.phase = "game_over";
      throw new Error("Not enough money to continue.");
    }
    if (!Number.isFinite(wager) || wager <= 0) {
      throw new Error("Wager must be a positive number.");
    }
    if (wager < this.rules.minBet) {
      throw new Error(`Minimum wager is ${this.rules.minBet}.`);
    }
    if (wager > this.state.bankroll) {
      throw new Error("Wager cannot be larger than current bankroll.");
    }

    this.state.roundNumber += 1;
    this.state.lastRoundSummary = null;
    this.state.currentWager = roundMoney(wager);
    this.state.dealerHand = [];
    this.state.playerHands = [];
    this.state.activeHandIndex = 0;
    this.state.targetScore = this.applyTargetScore(this.rules.targetScore);
    this.state.phase = "player_turn";
    this.bankrollBeforeRound = this.state.bankroll;

    this.state.bankroll = roundMoney(this.state.bankroll - this.state.currentWager);
    const firstHand = this.createHand([], this.state.currentWager, false);
    this.state.playerHands = [firstHand];

    this.ensureDeck(16);
    firstHand.cards.push(this.drawCard());
    this.state.dealerHand.push(this.drawCard());
    firstHand.cards.push(this.drawCard());
    this.state.dealerHand.push(this.drawCard());

    const playerNatural = this.isNaturalBlackjack(firstHand);
    const dealerNatural = this.isNaturalDealerBlackjack();
    if (playerNatural || dealerNatural) {
      firstHand.isStanding = true;
      this.beginDealerTurn(false);
      return;
    }

    this.updateHandTerminalState(firstHand);
    if (this.isHandTerminal(firstHand)) {
      this.advanceAfterPlayerAction();
    }
  }

  public performAction(action: PlayerAction): void {
    switch (action) {
      case "hit":
        this.hit();
        return;
      case "stand":
        this.stand();
        return;
      case "double":
        this.doubleDown();
        return;
      case "split":
        this.split();
        return;
      default:
        throw new Error(`Unsupported action: ${action satisfies never}`);
    }
  }

  public getDealerScore(): number {
    return this.evaluateHand(this.state.dealerHand, "dealer").score;
  }

  public getPlayerHandScore(handIndex: number): number {
    const hand = this.state.playerHands[handIndex];
    if (!hand) {
      throw new Error("Hand index is out of range.");
    }
    return this.evaluateHand(hand.cards, "player").score;
  }

  private hit(): void {
    const hand = this.getActivePlayableHand();
    hand.cards.push(this.drawCard());
    hand.hasActed = true;
    this.updateHandTerminalState(hand);
    this.advanceAfterPlayerAction();
  }

  private stand(): void {
    const hand = this.getActivePlayableHand();
    hand.hasActed = true;
    hand.isStanding = true;
    this.advanceAfterPlayerAction();
  }

  private doubleDown(): void {
    const hand = this.getActivePlayableHand();
    if (!this.canDouble(hand)) {
      throw new Error("Double is not available right now.");
    }

    this.state.bankroll = roundMoney(this.state.bankroll - hand.wager);
    hand.wager = roundMoney(hand.wager * 2);
    hand.isDoubled = true;
    hand.hasActed = true;
    hand.cards.push(this.drawCard());
    this.updateHandTerminalState(hand);
    hand.isStanding = true;
    this.advanceAfterPlayerAction();
  }

  private split(): void {
    const hand = this.getActivePlayableHand();
    if (!this.canSplit(hand)) {
      throw new Error("Split is not available right now.");
    }

    this.state.bankroll = roundMoney(this.state.bankroll - hand.wager);
    const [firstCard, secondCard] = hand.cards;
    const firstHand = this.createHand([firstCard], hand.wager, true);
    const secondHand = this.createHand([secondCard], hand.wager, true);

    firstHand.cards.push(this.drawCard());
    secondHand.cards.push(this.drawCard());

    const activeIndex = this.state.activeHandIndex ?? 0;
    this.state.playerHands.splice(activeIndex, 1, firstHand, secondHand);
    this.state.activeHandIndex = activeIndex;

    this.updateHandTerminalState(firstHand);
    this.updateHandTerminalState(secondHand);

    if (this.isHandTerminal(firstHand)) {
      this.advanceAfterPlayerAction();
    }
  }

  private getActivePlayableHand(): HandState {
    if (this.state.phase !== "player_turn") {
      throw new Error("Player actions are only allowed during the player turn.");
    }
    const hand = this.getActiveHand();
    if (!hand || this.isHandTerminal(hand)) {
      throw new Error("No active player hand available for this action.");
    }
    return hand;
  }

  private getActiveHand(): HandState | null {
    const activeIndex = this.state.activeHandIndex;
    if (activeIndex === null) {
      return null;
    }
    return this.state.playerHands[activeIndex] ?? null;
  }

  private advanceAfterPlayerAction(): void {
    const currentIndex = this.state.activeHandIndex;
    if (currentIndex === null) {
      return;
    }

    const currentHand = this.state.playerHands[currentIndex];
    if (currentHand && !this.isHandTerminal(currentHand)) {
      return;
    }

    for (let index = currentIndex + 1; index < this.state.playerHands.length; index += 1) {
      if (!this.isHandTerminal(this.state.playerHands[index])) {
        this.state.activeHandIndex = index;
        return;
      }
    }

    this.beginDealerTurn(true);
  }

  private beginDealerTurn(playDealerHand: boolean): void {
    this.state.phase = "dealer_turn";
    this.state.activeHandIndex = null;

    if (playDealerHand) {
      while (this.dealerShouldHit()) {
        this.state.dealerHand.push(this.drawCard());
      }
    }

    this.settleRound();
  }

  private settleRound(): void {
    const dealerEvaluation = this.evaluateHand(this.state.dealerHand, "dealer");
    const dealerScore = dealerEvaluation.score;
    const dealerBusted = dealerScore > this.state.targetScore;
    const dealerNatural = this.isNaturalCards(this.state.dealerHand, "dealer", false);

    const handResults: SettledHandResult[] = [];
    for (const hand of this.state.playerHands) {
      const playerScore = this.evaluateHand(hand.cards, "player").score;
      const playerNatural = this.isNaturalBlackjack(hand);

      const outcome = this.resolveOutcome({
        hand,
        playerScore,
        playerNatural,
        dealerScore,
        dealerNatural,
        dealerBusted,
      });

      const payoutReturned = this.resolvePayoutReturned(hand, outcome);
      this.state.bankroll = roundMoney(this.state.bankroll + payoutReturned);

      handResults.push({
        handId: hand.id,
        cards: this.cloneCards(hand.cards),
        score: playerScore,
        wager: hand.wager,
        outcome,
        payoutReturned,
      });
    }

    this.state.lastRoundSummary = {
      roundNumber: this.state.roundNumber,
      bankrollBeforeRound: this.bankrollBeforeRound,
      bankrollAfterRound: this.state.bankroll,
      dealerCards: this.cloneCards(this.state.dealerHand),
      dealerScore,
      dealerBusted,
      handResults,
    };

    this.state.dealerHand = [];
    this.state.playerHands = [];
    this.state.activeHandIndex = null;
    this.state.currentWager = null;
    this.state.targetScore = this.rules.targetScore;
    this.state.phase =
      this.state.bankroll >= this.rules.minBet ? "round_settled" : "game_over";
    this.syncDeckRemaining();
  }

  private resolveOutcome(input: {
    hand: HandState;
    playerScore: number;
    playerNatural: boolean;
    dealerScore: number;
    dealerNatural: boolean;
    dealerBusted: boolean;
  }): HandOutcome {
    const {
      hand,
      playerScore,
      playerNatural,
      dealerScore,
      dealerNatural,
      dealerBusted,
    } = input;

    if (hand.isBusted || playerScore > this.state.targetScore) {
      return "lose";
    }
    if (playerNatural && dealerNatural) {
      return "push";
    }
    if (playerNatural && !dealerNatural) {
      return "blackjack";
    }
    if (dealerNatural && !playerNatural) {
      return "lose";
    }
    if (dealerBusted) {
      return "win";
    }
    if (playerScore > dealerScore) {
      return "win";
    }
    if (playerScore < dealerScore) {
      return "lose";
    }
    return "push";
  }

  private resolvePayoutReturned(hand: HandState, outcome: HandOutcome): number {
    if (outcome === "lose") {
      return 0;
    }
    if (outcome === "push") {
      return hand.wager;
    }
    if (outcome === "blackjack") {
      return roundMoney(hand.wager * this.getBlackjackPayoutMultiplier(hand));
    }
    return roundMoney(hand.wager * this.getWinPayoutMultiplier(hand));
  }

  private dealerShouldHit(): boolean {
    const dealerEvaluation = this.evaluateHand(this.state.dealerHand, "dealer");
    if (dealerEvaluation.score > this.state.targetScore) {
      return false;
    }
    if (dealerEvaluation.score < 17) {
      return true;
    }
    if (
      dealerEvaluation.score === 17 &&
      dealerEvaluation.isSoft &&
      !this.rules.dealerStandsOnSoft17
    ) {
      return true;
    }
    return false;
  }

  private canSplit(hand: HandState): boolean {
    const [firstCard, secondCard] = hand.cards;
    const defaultCanSplit =
      hand.cards.length === 2 &&
      firstCard.rank === secondCard.rank &&
      this.state.bankroll >= hand.wager &&
      this.state.playerHands.length < this.rules.maxSplitHands;

    const context: SplitRuleContext = {
      state: this.getState(),
      hand: this.cloneHand(hand),
      bankroll: this.state.bankroll,
    };

    let canSplit = defaultCanSplit;
    for (const modifier of this.modifiers) {
      if (modifier.modifyCanSplit) {
        canSplit = modifier.modifyCanSplit(canSplit, context);
      }
    }
    return canSplit;
  }

  private canDouble(hand: HandState): boolean {
    const defaultCanDouble =
      hand.cards.length === 2 &&
      !hand.hasActed &&
      this.state.bankroll >= hand.wager;

    const context: DoubleRuleContext = {
      state: this.getState(),
      hand: this.cloneHand(hand),
      bankroll: this.state.bankroll,
    };

    let canDouble = defaultCanDouble;
    for (const modifier of this.modifiers) {
      if (modifier.modifyCanDouble) {
        canDouble = modifier.modifyCanDouble(canDouble, context);
      }
    }
    return canDouble;
  }

  private getWinPayoutMultiplier(hand: HandState): number {
    const context: PayoutContext = {
      state: this.getState(),
      hand: this.cloneHand(hand),
      dealerHand: this.cloneCards(this.state.dealerHand),
      targetScore: this.state.targetScore,
    };

    let multiplier = this.rules.winPayoutMultiplier;
    for (const modifier of this.modifiers) {
      if (modifier.modifyWinPayoutMultiplier) {
        multiplier = modifier.modifyWinPayoutMultiplier(multiplier, context);
      }
    }
    return Math.max(0, multiplier);
  }

  private getBlackjackPayoutMultiplier(hand: HandState): number {
    const context: PayoutContext = {
      state: this.getState(),
      hand: this.cloneHand(hand),
      dealerHand: this.cloneCards(this.state.dealerHand),
      targetScore: this.state.targetScore,
    };

    let multiplier = this.rules.blackjackPayoutMultiplier;
    for (const modifier of this.modifiers) {
      if (modifier.modifyBlackjackPayoutMultiplier) {
        multiplier = modifier.modifyBlackjackPayoutMultiplier(multiplier, context);
      }
    }
    return Math.max(0, multiplier);
  }

  private applyTargetScore(baseTargetScore: number): number {
    const context: RoundContext = this.createRoundContext(baseTargetScore);
    let targetScore = baseTargetScore;
    for (const modifier of this.modifiers) {
      if (modifier.modifyTargetScore) {
        targetScore = modifier.modifyTargetScore(targetScore, context);
      }
    }
    return Math.max(1, Math.round(targetScore));
  }

  private evaluateHand(cards: ReadonlyArray<Card>, owner: "player" | "dealer"): HandEvaluation {
    const targetScore = this.state.targetScore;
    let total = 0;
    let softAceCount = 0;

    for (const card of cards) {
      const cardValue = this.applyCardValueModifiers(baseCardValue(card.rank), {
        state: this.getState(),
        owner,
        hand: this.cloneCards(cards),
        card: { ...card },
        targetScore,
      });
      total += cardValue;
      if (card.rank === "A" && cardValue === 11) {
        softAceCount += 1;
      }
    }

    while (total > targetScore && softAceCount > 0) {
      total -= 10;
      softAceCount -= 1;
    }

    total = this.applyHandScoreModifiers(total, {
      state: this.getState(),
      owner,
      hand: this.cloneCards(cards),
      targetScore,
    });

    return {
      score: total,
      isSoft: softAceCount > 0,
    };
  }

  private applyCardValueModifiers(baseValue: number, context: CardValueContext): number {
    let modifiedValue = baseValue;
    for (const modifier of this.modifiers) {
      if (modifier.modifyCardValue) {
        modifiedValue = modifier.modifyCardValue(modifiedValue, context);
      }
    }
    if (!Number.isFinite(modifiedValue)) {
      return baseValue;
    }
    return modifiedValue;
  }

  private applyHandScoreModifiers(baseScore: number, context: HandScoreContext): number {
    let modifiedScore = baseScore;
    for (const modifier of this.modifiers) {
      if (modifier.modifyHandScore) {
        modifiedScore = modifier.modifyHandScore(modifiedScore, context);
      }
    }
    if (!Number.isFinite(modifiedScore)) {
      return baseScore;
    }
    return modifiedScore;
  }

  private createRoundContext(targetScore: number): RoundContext {
    return {
      state: this.getState(),
      roundNumber: this.state.roundNumber,
      bankroll: this.state.bankroll,
      targetScore,
    };
  }

  private updateHandTerminalState(hand: HandState): void {
    const score = this.evaluateHand(hand.cards, "player").score;
    if (score > this.state.targetScore) {
      hand.isBusted = true;
      hand.isStanding = true;
      return;
    }
    if (score >= this.state.targetScore) {
      hand.isStanding = true;
    }
  }

  private isHandTerminal(hand: HandState): boolean {
    return hand.isBusted || hand.isStanding;
  }

  private isNaturalBlackjack(hand: HandState): boolean {
    if (hand.isFromSplit) {
      return false;
    }
    return this.isNaturalCards(hand.cards, "player", true);
  }

  private isNaturalDealerBlackjack(): boolean {
    return this.isNaturalCards(this.state.dealerHand, "dealer", false);
  }

  private isNaturalCards(
    cards: ReadonlyArray<Card>,
    owner: "player" | "dealer",
    allowTenValueCard: boolean,
  ): boolean {
    if (cards.length !== 2) {
      return false;
    }
    const hasAce = cards.some((card) => card.rank === "A");
    const hasTenValue = allowTenValueCard
      ? cards.some((card) => isTenValueCard(card.rank))
      : cards.some((card) => card.rank === "J" || card.rank === "Q" || card.rank === "K");
    const score = this.evaluateHand(cards, owner).score;
    return hasAce && hasTenValue && score === this.state.targetScore;
  }

  private ensureDeck(minCardsNeeded: number): void {
    if (this.deck.length >= minCardsNeeded) {
      return;
    }
    this.rebuildDeck();
    this.syncDeckRemaining();
  }

  private rebuildDeck(): void {
    const context = this.createRoundContext(this.state.targetScore);
    let deck = buildStandardDeck();
    for (const modifier of this.modifiers) {
      if (modifier.modifyDeck) {
        deck = modifier.modifyDeck(deck, context);
      }
    }
    this.deck = shuffleDeck(deck, this.rng);
  }

  private drawCard(): Card {
    this.ensureDeck(1);
    const card = this.deck.pop();
    if (!card) {
      throw new Error("Deck is empty.");
    }
    this.syncDeckRemaining();
    return { ...card };
  }

  private createHand(cards: Card[], wager: number, isFromSplit: boolean): HandState {
    const hand: HandState = {
      id: this.nextHandId,
      cards: this.cloneCards(cards),
      wager: roundMoney(wager),
      hasActed: false,
      isStanding: false,
      isBusted: false,
      isDoubled: false,
      isFromSplit,
    };
    this.nextHandId += 1;
    return hand;
  }

  private syncDeckRemaining(): void {
    this.state.deckRemaining = this.deck.length;
  }

  private cloneCards(cards: ReadonlyArray<Card>): Card[] {
    return cards.map((card) => ({ ...card }));
  }

  private cloneHand(hand: Readonly<HandState>): HandState {
    return {
      ...hand,
      cards: this.cloneCards(hand.cards),
    };
  }

  private cloneHands(hands: ReadonlyArray<HandState>): HandState[] {
    return hands.map((hand) => this.cloneHand(hand));
  }

  private cloneRoundSummary(summary: RoundSummary | null): RoundSummary | null {
    if (!summary) {
      return null;
    }
    return {
      ...summary,
      dealerCards: this.cloneCards(summary.dealerCards),
      handResults: summary.handResults.map((result) => ({
        ...result,
        cards: this.cloneCards(result.cards),
      })),
    };
  }
}

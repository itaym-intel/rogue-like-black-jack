// ── Card types ──

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Hand {
  cards: Card[];
}

export interface HandScore {
  value: number;
  soft: boolean;
  busted: boolean;
  isBlackjack: boolean;
}

// ── Equipment types ──

export type EquipmentSlot = 'weapon' | 'helm' | 'armor' | 'boots' | 'trinket';
export type EquipmentTier = 'cloth' | 'bronze' | 'iron';

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  tier: EquipmentTier;
  description: string;
  cost: number;
  modifier: Modifier;
}

// ── Consumable types ──

export type ConsumableType = 'health_potion' | 'damage_potion' | 'strength_potion' | 'poison_potion';

export interface ConsumableEffect {
  type: ConsumableType;
  value: number;
  duration?: number;
}

export interface Consumable {
  id: string;
  name: string;
  type: ConsumableType;
  description: string;
  cost: number;
  effect: ConsumableEffect;
}

// ── Wish / Genie types ──

export interface Wish {
  blessingText: string;
  blessing: string | null;
  curse: Modifier | null;
  bossName: string;
}

// ── Combatant types ──

export interface CombatantData {
  name: string;
  maxHp: number;
  isBoss: boolean;
  equipment: Equipment[];
  description: string;
  curse?: Modifier;
}

// ── Player / Enemy state ──

export interface ActiveEffect {
  id: string;
  name: string;
  remainingHands: number;
  modifier: Modifier;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  gold: number;
  equipment: Map<EquipmentSlot, Equipment | null>;
  consumables: Consumable[];
  wishes: Wish[];
  activeEffects: ActiveEffect[];
}

export interface EnemyState {
  data: CombatantData;
  hp: number;
}

// ── Game phases and actions ──

export type GamePhase =
  | 'pre_hand'
  | 'player_turn'
  | 'dealer_turn'
  | 'hand_result'
  | 'battle_result'
  | 'shop'
  | 'genie'
  | 'game_over'
  | 'victory';

export type PlayerAction =
  | { type: 'hit' }
  | { type: 'stand' }
  | { type: 'double_down' }
  | { type: 'use_consumable'; itemIndex: number }
  | { type: 'buy_item'; itemIndex: number }
  | { type: 'skip_shop' }
  | { type: 'enter_wish'; text: string }
  | { type: 'continue' };

export interface ActionResult {
  success: boolean;
  message: string;
  newPhase: GamePhase;
}

export interface HandResult {
  playerScore: HandScore;
  dealerScore: HandScore;
  winner: 'player' | 'dealer' | 'push';
  damageDealt: number;
  damageTarget: 'player' | 'dealer' | 'none';
  dodged: boolean;
  damageBreakdown: string;
}

// ── Shop types ──

export interface ShopItem {
  index: number;
  item: Equipment | Consumable;
  type: 'equipment' | 'consumable';
  affordable: boolean;
}

// ── Game Rules ──

export interface GameRules {
  scoring: {
    bustThreshold: number;
    blackjackTarget: number;
    additionalBlackjackValues: number[];
    bustSaveThreshold: number | null;
    aceHighValue: number;
    aceLowValue: number;
    faceCardValue: number;
  };
  turnOrder: {
    playerGoesFirst: boolean;
    initialPlayerCards: number;
    initialDealerCards: number;
  };
  dealer: {
    standsOn: number;
    standsOnSoft17: boolean;
    peeksForBlackjack: boolean;
  };
  winConditions: {
    tieResolution: 'push' | 'player' | 'dealer';
    doubleBustResolution: 'push' | 'player' | 'dealer';
    naturalBlackjackBonus: number;
    blackjackPayoutMultiplier: number;
  };
  damage: {
    baseMultiplier: number;
    minimumDamage: number;
    maximumDamage: number | null;
    flatBonusDamage: number;
    percentBonusDamage: number;
    flatDamageReduction: number;
    percentDamageReduction: number;
  };
  actions: {
    canDoubleDown: boolean;
    canSplit: boolean;
    canSurrender: boolean;
    doubleDownMultiplier: number;
  };
  deck: {
    numberOfDecks: number;
    reshuffleBetweenHands: boolean;
  };
  economy: {
    goldPerBattle: number;
    goldPerBoss: number;
    shopPriceMultiplier: number;
  };
  health: {
    playerMaxHp: number;
    playerStartHp: number;
    healthRegenPerBattle: number;
    resetHpAfterBoss: boolean;
  };
  progression: {
    battlesPerStage: number;
    totalStages: number;
  };
}

// ── Modifier system ──

export interface ModifierContext {
  playerHand: Hand;
  dealerHand: Hand;
  playerScore: HandScore;
  dealerScore: HandScore;
  playerState: PlayerState;
  enemyState: EnemyState;
  rules: GameRules;
  rng: { next(): number; nextInt(min: number, max: number): number };
  stage: number;
  battle: number;
  handNumber: number;
}

export interface Modifier {
  id: string;
  name: string;
  description: string;
  source: 'equipment' | 'consumable' | 'enemy' | 'wish_blessing' | 'wish_curse';

  modifyRules?(rules: GameRules): GameRules;
  modifyDamageDealt?(damage: number, context: ModifierContext): number;
  modifyDamageReceived?(damage: number, context: ModifierContext): number;
  modifyBust?(hand: Hand, score: number, context: ModifierContext): { busted: boolean; effectiveScore: number } | null;
  dodgeCheck?(context: ModifierContext): boolean;
  onHandStart?(context: ModifierContext): void;
  onHandEnd?(context: ModifierContext): void;
  onBattleStart?(context: ModifierContext): void;
  onBattleEnd?(context: ModifierContext): void;
  modifyGoldEarned?(gold: number, context: ModifierContext): number;
}

// ── Serialization and Replay ──

export interface SerializedGameState {
  rngState: { seed: string | number; callCount: number };
  playerState: {
    hp: number;
    maxHp: number;
    gold: number;
    equipment: [EquipmentSlot, string | null][];
    consumables: string[];
    wishes: Wish[];
    activeEffects: ActiveEffect[];
  };
  stage: number;
  battle: number;
  handNumber: number;
  phase: GamePhase;
  enemyName: string | null;
  enemyHp: number | null;
  actionLog: PlayerAction[];
}

export interface GameReplay {
  seed: string;
  actions: PlayerAction[];
}

// ── Genie encounter ──

export interface GenieEncounter {
  bossName: string;
  curseModifier: Modifier;
  blessingText: string | null;
}

// ── Game View ──

export interface GameView {
  phase: GamePhase;
  seed: string;
  stage: number;
  battle: number;
  handNumber: number;

  player: {
    hp: number;
    maxHp: number;
    gold: number;
    equipment: Record<EquipmentSlot, Equipment | null>;
    consumables: Consumable[];
    wishes: Wish[];
    activeEffects: ActiveEffect[];
    hand: Card[] | null;
    handScore: HandScore | null;
  };

  enemy: {
    name: string;
    hp: number;
    maxHp: number;
    isBoss: boolean;
    description: string;
    modifierDescriptions: string[];
    visibleCards: (Card | null)[];
    visibleScore: number | null;
    allRevealed: boolean;
  } | null;

  shop: { items: ShopItem[] } | null;
  genie: { bossName: string; curseDescription: string; blessingEntered: boolean } | null;
  lastHandResult: HandResult | null;
  availableActions: PlayerAction[];
  log: string[];
}

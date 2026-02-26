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

export type ConsumableType =
  | 'health_potion'
  | 'damage_potion'
  | 'strength_potion'
  | 'poison_potion'
  | 'armor_elixir'
  | 'dodge_brew'
  | 'regen_draught'
  | 'battle_trance'
  | 'fortune_vessel'
  | 'wrath_elixir';

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
  blessing: Modifier | null;
  curse: Modifier | null;
  bossName: string;
}

// ── Blessing system types ──

export type BlessingEffectType =
  // Card & Deck Manipulation
  | 'flexible_rank'
  | 'change_face_card_value'
  | 'change_ace_high_value'
  | 'suit_card_value_bonus'
  | 'rank_value_override'
  | 'remove_rank_from_deck'
  | 'remove_suit_from_deck'
  | 'force_deck_ranks'
  | 'extra_copies_of_rank'
  | 'no_reshuffle'
  | 'multiple_decks'
  // Scoring & Bust Manipulation
  | 'bust_threshold_bonus'
  | 'additional_blackjack_value'
  | 'bust_save'
  | 'bust_card_value_halved'
  | 'ignore_card_on_bust'
  | 'five_card_charlie'
  | 'soft_hand_bonus'
  | 'exact_target_bonus'
  // Player Actions (Interactive)
  | 'enable_remove_card'
  | 'enable_peek'
  | 'enable_surrender'
  | 'enable_split'
  | 'extra_starting_cards'
  | 'fewer_starting_cards'
  | 'double_down_any_time'
  | 'hit_after_double'
  // Dealer Manipulation
  | 'dealer_stands_on'
  | 'dealer_hits_soft_17'
  | 'ties_favor_player'
  | 'double_bust_favors_player'
  | 'dealer_reveals_cards'
  | 'dealer_extra_starting_card'
  | 'dealer_fewer_starting_cards'
  // Damage Bonuses
  | 'flat_damage_bonus'
  | 'percent_damage_bonus'
  | 'damage_multiplier'
  | 'suit_damage_bonus'
  | 'face_card_damage_bonus'
  | 'ace_damage_bonus'
  | 'even_card_bonus'
  | 'odd_card_bonus'
  | 'low_card_bonus'
  | 'high_card_bonus'
  | 'blackjack_bonus_damage'
  | 'blackjack_damage_multiplier'
  | 'damage_on_push'
  | 'damage_per_card_in_hand'
  | 'overkill_carry'
  | 'scaling_damage_per_win'
  | 'double_down_multiplier'
  // Damage Reduction & Defense
  | 'flat_damage_reduction'
  | 'percent_damage_reduction'
  | 'dodge_chance'
  | 'thorns'
  | 'damage_shield'
  | 'damage_cap'
  | 'suit_damage_reduction'
  | 'reduce_bust_damage'
  // Healing
  | 'max_hp_bonus'
  | 'heal_per_hand'
  | 'heal_on_win'
  | 'heal_on_blackjack'
  | 'heal_on_dodge'
  | 'lifesteal'
  | 'heal_per_battle'
  | 'heal_on_push'
  // Damage Over Time / Passive
  | 'damage_per_hand'
  | 'poison'
  | 'damage_on_enemy_bust'
  // Economy
  | 'flat_gold_bonus'
  | 'percent_gold_bonus'
  | 'gold_per_hand_won'
  | 'gold_per_blackjack'
  | 'shop_discount'
  // ── Universal Effect Types (equipment, consumables, enemies, curses) ──
  // Damage
  | 'conditional_flat_damage'
  | 'dealer_hand_size_bonus_damage'
  | 'bonus_damage_on_opponent_bust'
  | 'bonus_damage_on_score_win'
  | 'consecutive_loss_damage_bonus'
  | 'color_card_damage_bonus'
  | 'own_hand_color_damage_bonus'
  | 'first_hand_damage_multiplier'
  | 'percent_damage_penalty'
  // Defense
  | 'conditional_damage_reduction'
  | 'random_suit_damage_reduction'
  | 'suit_in_attacker_hand_damage_reduction'
  // Healing
  | 'heal_on_bust'
  | 'heal_on_opponent_bust'
  | 'heal_on_opponent_near_blackjack'
  // DoT / Direct
  | 'dot_to_opponent'
  | 'self_damage_on_bust'
  // Economy
  | 'gold_if_hands_won_gte'
  // Instant (consumable-only)
  | 'instant_heal'
  | 'instant_damage'
  | 'instant_gold'
  // Curse-specific
  | 'extra_damage_on_dealer_blackjack';

export type BlessingConditionType =
  | 'when_player_draws_rank'
  | 'when_player_draws_suit'
  | 'when_dealer_draws_rank'
  | 'when_dealer_draws_suit'
  | 'hand_contains_pair'
  | 'hand_is_flush'
  | 'hand_all_same_color'
  | 'hand_size_equals'
  | 'hand_size_gte'
  | 'hand_contains_rank'
  | 'hand_contains_suit'
  | 'score_exactly'
  | 'score_gte'
  | 'on_blackjack'
  | 'on_bust'
  | 'on_soft_hand'
  | 'on_win'
  | 'on_loss'
  | 'on_push'
  | 'on_dodge'
  | 'on_enemy_bust'
  | 'on_win_no_damage_taken'
  | 'hp_below_percent'
  | 'hp_above_percent'
  | 'enemy_hp_below_percent'
  | 'gold_above'
  | 'consecutive_wins'
  | 'consecutive_losses'
  | 'first_hand_of_battle'
  | 'same_score_as_previous'
  | 'enemy_killed_by_dot'
  | 'enemy_killed_by_blackjack'
  // Universal condition types
  | 'hand_size_lte'
  | 'dealer_hand_size_gte';

export interface BlessingCondition {
  type: BlessingConditionType;
  value?: number;
  rank?: Rank;
  suit?: Suit;
}

export interface BlessingEffect {
  type: BlessingEffectType;
  value: number;
  suit?: Suit;
  rank?: Rank;
  ranks?: Rank[];
  condition?: BlessingCondition;
}

export interface BlessingDefinition {
  name: string;
  description: string;
  effects: BlessingEffect[];
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
  | { type: 'enter_wish'; text: string; blessing?: BlessingDefinition }
  | { type: 'remove_card'; cardIndex: number }
  | { type: 'peek' }
  | { type: 'surrender' }
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
    flexibleRanks: Rank[];
    rankValueOverrides: Partial<Record<Rank, number>>;
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
    thornsPercent: number;
    damageShield: number;
    damageCap: number | null;
    overkillCarryPercent: number;
  };
  actions: {
    canDoubleDown: boolean;
    canSplit: boolean;
    canSurrender: boolean;
    doubleDownMultiplier: number;
    canRemoveCard: boolean;
    cardRemovesPerHand: number;
    canPeek: boolean;
    canDoubleDownAnyTime: boolean;
    canHitAfterDouble: boolean;
  };
  deck: {
    numberOfDecks: number;
    reshuffleBetweenHands: boolean;
    removedRanks: Rank[];
    removedSuits: Suit[];
    forcedRanks: Rank[] | null;
    extraCopies: { rank: Rank; count: number }[];
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
  lastDamageDealt: number;
  lastDamageTaken: number;
  handsWonThisBattle: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  previousHandScore: number | null;
  peekedCard: Card | null;
  cardRemovesUsed: number;
  killCause: 'hand_damage' | 'dot' | null;
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
  modifyDeck?(deck: Card[], rules: GameRules): Card[];
  modifyCardValue?(card: Card, baseValue: number, context: ModifierContext): number;
  onPush?(context: ModifierContext): void;
  onDodge?(context: ModifierContext): void;
  onEnemyBust?(context: ModifierContext): void;
  onCardDrawn?(card: Card, drawer: 'player' | 'dealer', context: ModifierContext): void;
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
  genie: { bossName: string; curseDescription: string; blessingEntered: boolean; blessingName: string | null; blessingDescription: string | null } | null;
  lastHandResult: HandResult | null;
  availableActions: PlayerAction[];
  log: string[];
}

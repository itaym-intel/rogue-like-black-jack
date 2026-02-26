// Effect type metadata for the editor UI
// Mirrors UNIVERSAL_EFFECT_BOUNDS from src/engine/effects.ts

export interface EffectTypeMeta {
  type: string;
  label: string;
  category: string;
  min: number;
  max: number;
  needsSuit?: boolean;
  needsRank?: boolean;
  needsRanks?: boolean;
  needsColor?: boolean;
  needsCondition?: boolean;
  needsBonusValue?: boolean;
  needsThreshold?: boolean;
  needsMax?: boolean;
  needsMinScore?: boolean;
  needsMaxScore?: boolean;
  needsDuration?: boolean;
  boolean?: boolean;
}

export const EFFECT_TYPE_CATEGORIES = [
  'Card & Deck',
  'Scoring & Bust',
  'Player Actions',
  'Dealer',
  'Damage',
  'Defense',
  'Healing',
  'DoT',
  'Economy',
  'Instant',
  'Curse',
] as const;

export const EFFECT_TYPES: EffectTypeMeta[] = [
  // Card & Deck
  { type: 'flexible_rank', label: 'Flexible Rank', category: 'Card & Deck', min: 1, max: 1, boolean: true, needsRank: true },
  { type: 'change_face_card_value', label: 'Change Face Card Value', category: 'Card & Deck', min: 5, max: 15 },
  { type: 'change_ace_high_value', label: 'Change Ace High Value', category: 'Card & Deck', min: 8, max: 15 },
  { type: 'suit_card_value_bonus', label: 'Suit Card Value Bonus', category: 'Card & Deck', min: 1, max: 5, needsSuit: true },
  { type: 'rank_value_override', label: 'Rank Value Override', category: 'Card & Deck', min: 0, max: 15, needsRank: true },
  { type: 'remove_rank_from_deck', label: 'Remove Rank from Deck', category: 'Card & Deck', min: 1, max: 1, boolean: true, needsRank: true },
  { type: 'remove_suit_from_deck', label: 'Remove Suit from Deck', category: 'Card & Deck', min: 1, max: 1, boolean: true, needsSuit: true },
  { type: 'force_deck_ranks', label: 'Force Deck Ranks', category: 'Card & Deck', min: 1, max: 1, boolean: true, needsRanks: true },
  { type: 'extra_copies_of_rank', label: 'Extra Copies of Rank', category: 'Card & Deck', min: 1, max: 4, needsRank: true },
  { type: 'no_reshuffle', label: 'No Reshuffle', category: 'Card & Deck', min: 1, max: 1, boolean: true },
  { type: 'multiple_decks', label: 'Multiple Decks', category: 'Card & Deck', min: 2, max: 4 },
  // Scoring & Bust
  { type: 'bust_threshold_bonus', label: 'Bust Threshold Bonus', category: 'Scoring & Bust', min: 1, max: 5 },
  { type: 'additional_blackjack_value', label: 'Additional Blackjack Value', category: 'Scoring & Bust', min: 22, max: 25 },
  { type: 'bust_save', label: 'Bust Save', category: 'Scoring & Bust', min: 8, max: 18 },
  { type: 'bust_card_value_halved', label: 'Bust Card Value Halved', category: 'Scoring & Bust', min: 1, max: 1, boolean: true },
  { type: 'ignore_card_on_bust', label: 'Ignore Card on Bust', category: 'Scoring & Bust', min: 1, max: 1, boolean: true },
  { type: 'five_card_charlie', label: 'Five Card Charlie', category: 'Scoring & Bust', min: 5, max: 30 },
  { type: 'soft_hand_bonus', label: 'Soft Hand Bonus', category: 'Scoring & Bust', min: 2, max: 15 },
  { type: 'exact_target_bonus', label: 'Exact Target Bonus', category: 'Scoring & Bust', min: 3, max: 20 },
  // Player Actions
  { type: 'enable_remove_card', label: 'Enable Remove Card', category: 'Player Actions', min: 1, max: 3 },
  { type: 'enable_peek', label: 'Enable Peek', category: 'Player Actions', min: 1, max: 1, boolean: true },
  { type: 'enable_surrender', label: 'Enable Surrender', category: 'Player Actions', min: 1, max: 1, boolean: true },
  { type: 'enable_split', label: 'Enable Split', category: 'Player Actions', min: 1, max: 1, boolean: true },
  { type: 'extra_starting_cards', label: 'Extra Starting Cards', category: 'Player Actions', min: 1, max: 3 },
  { type: 'fewer_starting_cards', label: 'Fewer Starting Cards', category: 'Player Actions', min: 1, max: 1 },
  { type: 'double_down_any_time', label: 'Double Down Any Time', category: 'Player Actions', min: 1, max: 1, boolean: true },
  { type: 'hit_after_double', label: 'Hit After Double', category: 'Player Actions', min: 1, max: 1, boolean: true },
  // Dealer
  { type: 'dealer_stands_on', label: 'Dealer Stands On', category: 'Dealer', min: 14, max: 19 },
  { type: 'dealer_hits_soft_17', label: 'Dealer Hits Soft 17', category: 'Dealer', min: 1, max: 1, boolean: true },
  { type: 'ties_favor_player', label: 'Ties Favor Player', category: 'Dealer', min: 1, max: 1, boolean: true },
  { type: 'double_bust_favors_player', label: 'Double Bust Favors Player', category: 'Dealer', min: 1, max: 1, boolean: true },
  { type: 'dealer_reveals_cards', label: 'Dealer Reveals Cards', category: 'Dealer', min: 1, max: 1, boolean: true },
  { type: 'dealer_extra_starting_card', label: 'Dealer Extra Starting Card', category: 'Dealer', min: 1, max: 2 },
  { type: 'dealer_fewer_starting_cards', label: 'Dealer Fewer Starting Cards', category: 'Dealer', min: 1, max: 1 },
  // Damage
  { type: 'flat_damage_bonus', label: 'Flat Damage Bonus', category: 'Damage', min: 1, max: 25 },
  { type: 'percent_damage_bonus', label: '% Damage Bonus', category: 'Damage', min: 0.1, max: 1.0 },
  { type: 'damage_multiplier', label: 'Damage Multiplier', category: 'Damage', min: 1.5, max: 3.0 },
  { type: 'suit_damage_bonus', label: 'Suit Damage Bonus', category: 'Damage', min: 1, max: 10, needsSuit: true },
  { type: 'face_card_damage_bonus', label: 'Face Card Damage Bonus', category: 'Damage', min: 1, max: 8 },
  { type: 'ace_damage_bonus', label: 'Ace Damage Bonus', category: 'Damage', min: 2, max: 15 },
  { type: 'even_card_bonus', label: 'Even Card Bonus', category: 'Damage', min: 1, max: 8 },
  { type: 'odd_card_bonus', label: 'Odd Card Bonus', category: 'Damage', min: 1, max: 8 },
  { type: 'low_card_bonus', label: 'Low Card Bonus', category: 'Damage', min: 1, max: 8 },
  { type: 'high_card_bonus', label: 'High Card Bonus', category: 'Damage', min: 1, max: 8 },
  { type: 'blackjack_bonus_damage', label: 'Blackjack Bonus Damage', category: 'Damage', min: 3, max: 25 },
  { type: 'blackjack_damage_multiplier', label: 'Blackjack Damage Multiplier', category: 'Damage', min: 1.5, max: 3.0 },
  { type: 'damage_on_push', label: 'Damage on Push', category: 'Damage', min: 2, max: 15 },
  { type: 'damage_per_card_in_hand', label: 'Damage per Card in Hand', category: 'Damage', min: 1, max: 5 },
  { type: 'overkill_carry', label: 'Overkill Carry', category: 'Damage', min: 0.25, max: 1.0 },
  { type: 'scaling_damage_per_win', label: 'Scaling Damage per Win', category: 'Damage', min: 1, max: 5 },
  { type: 'double_down_multiplier', label: 'Double Down Multiplier', category: 'Damage', min: 2, max: 5 },
  { type: 'conditional_flat_damage', label: 'Conditional Flat Damage', category: 'Damage', min: 1, max: 25, needsCondition: true, needsBonusValue: true },
  { type: 'dealer_hand_size_bonus_damage', label: 'Dealer Hand Size Bonus', category: 'Damage', min: 1, max: 25, needsThreshold: true },
  { type: 'bonus_damage_on_opponent_bust', label: 'Bonus on Opponent Bust', category: 'Damage', min: 1, max: 15 },
  { type: 'bonus_damage_on_score_win', label: 'Bonus on Score Win', category: 'Damage', min: 1, max: 15 },
  { type: 'consecutive_loss_damage_bonus', label: 'Consecutive Loss Bonus', category: 'Damage', min: 1, max: 5, needsMax: true },
  { type: 'color_card_damage_bonus', label: 'Color Card Damage Bonus', category: 'Damage', min: 1, max: 5, needsColor: true },
  { type: 'own_hand_color_damage_bonus', label: 'Own Hand Color Bonus', category: 'Damage', min: 1, max: 5, needsColor: true },
  { type: 'first_hand_damage_multiplier', label: 'First Hand Multiplier', category: 'Damage', min: 1.5, max: 3.0 },
  { type: 'percent_damage_penalty', label: '% Damage Penalty', category: 'Damage', min: 0.1, max: 0.5 },
  // Defense
  { type: 'flat_damage_reduction', label: 'Flat Damage Reduction', category: 'Defense', min: 1, max: 15 },
  { type: 'percent_damage_reduction', label: '% Damage Reduction', category: 'Defense', min: 0.05, max: 0.8 },
  { type: 'dodge_chance', label: 'Dodge Chance', category: 'Defense', min: 0.05, max: 0.50 },
  { type: 'thorns', label: 'Thorns', category: 'Defense', min: 0.1, max: 0.5 },
  { type: 'damage_shield', label: 'Damage Shield', category: 'Defense', min: 5, max: 30 },
  { type: 'damage_cap', label: 'Damage Cap', category: 'Defense', min: 5, max: 25 },
  { type: 'suit_damage_reduction', label: 'Suit Damage Reduction', category: 'Defense', min: 0.1, max: 0.4, needsSuit: true },
  { type: 'reduce_bust_damage', label: 'Reduce Bust Damage', category: 'Defense', min: 0.2, max: 0.8 },
  { type: 'conditional_damage_reduction', label: 'Conditional Damage Reduction', category: 'Defense', min: 0.05, max: 0.5, needsCondition: true },
  { type: 'random_suit_damage_reduction', label: 'Random Suit Reduction', category: 'Defense', min: 0.05, max: 0.5 },
  { type: 'suit_in_attacker_hand_damage_reduction', label: 'Suit in Attacker Hand Reduction', category: 'Defense', min: 0.1, max: 0.5, needsSuit: true },
  // Healing
  { type: 'max_hp_bonus', label: 'Max HP Bonus', category: 'Healing', min: 5, max: 30 },
  { type: 'heal_per_hand', label: 'Heal per Hand', category: 'Healing', min: 1, max: 5 },
  { type: 'heal_on_win', label: 'Heal on Win', category: 'Healing', min: 1, max: 10 },
  { type: 'heal_on_blackjack', label: 'Heal on Blackjack', category: 'Healing', min: 3, max: 15 },
  { type: 'heal_on_dodge', label: 'Heal on Dodge', category: 'Healing', min: 2, max: 10 },
  { type: 'lifesteal', label: 'Lifesteal', category: 'Healing', min: 0.1, max: 0.5 },
  { type: 'heal_per_battle', label: 'Heal per Battle', category: 'Healing', min: 3, max: 15 },
  { type: 'heal_on_push', label: 'Heal on Push', category: 'Healing', min: 1, max: 8 },
  { type: 'heal_on_bust', label: 'Heal on Bust', category: 'Healing', min: 1, max: 10 },
  { type: 'heal_on_opponent_bust', label: 'Heal on Opponent Bust', category: 'Healing', min: 1, max: 15 },
  { type: 'heal_on_opponent_near_blackjack', label: 'Heal on Near-Blackjack', category: 'Healing', min: 1, max: 10, needsMinScore: true, needsMaxScore: true },
  // DoT
  { type: 'damage_per_hand', label: 'Damage per Hand', category: 'DoT', min: 1, max: 5 },
  { type: 'poison', label: 'Poison', category: 'DoT', min: 1, max: 3 },
  { type: 'damage_on_enemy_bust', label: 'Damage on Enemy Bust', category: 'DoT', min: 3, max: 15 },
  { type: 'dot_to_opponent', label: 'DoT to Opponent', category: 'DoT', min: 1, max: 5 },
  { type: 'self_damage_on_bust', label: 'Self Damage on Bust', category: 'DoT', min: 1, max: 10 },
  // Economy
  { type: 'flat_gold_bonus', label: 'Flat Gold Bonus', category: 'Economy', min: 2, max: 30 },
  { type: 'percent_gold_bonus', label: '% Gold Bonus', category: 'Economy', min: 0.1, max: 1.0 },
  { type: 'gold_per_hand_won', label: 'Gold per Hand Won', category: 'Economy', min: 1, max: 5 },
  { type: 'gold_per_blackjack', label: 'Gold per Blackjack', category: 'Economy', min: 3, max: 15 },
  { type: 'shop_discount', label: 'Shop Discount', category: 'Economy', min: 0.1, max: 0.5 },
  { type: 'gold_if_hands_won_gte', label: 'Gold if Hands Won >=', category: 'Economy', min: 1, max: 30, needsThreshold: true },
  // Instant
  { type: 'instant_heal', label: 'Instant Heal', category: 'Instant', min: 1, max: 50 },
  { type: 'instant_damage', label: 'Instant Damage', category: 'Instant', min: 1, max: 50 },
  { type: 'instant_gold', label: 'Instant Gold', category: 'Instant', min: 1, max: 100 },
  // Curse
  { type: 'extra_damage_on_dealer_blackjack', label: 'Extra Damage on Dealer BJ', category: 'Curse', min: 1, max: 15 },
];

export const EFFECT_TYPE_MAP = new Map(EFFECT_TYPES.map(e => [e.type, e]));

export function getEffectMeta(type: string): EffectTypeMeta | undefined {
  return EFFECT_TYPE_MAP.get(type);
}

// Condition types for the condition editor
export const CONDITION_TYPES = [
  { type: 'hand_contains_pair', label: 'Hand Contains Pair' },
  { type: 'hand_is_flush', label: 'Hand is Flush' },
  { type: 'hand_all_same_color', label: 'Hand All Same Color' },
  { type: 'hand_size_equals', label: 'Hand Size Equals', needsValue: true },
  { type: 'hand_size_gte', label: 'Hand Size >=', needsValue: true },
  { type: 'hand_size_lte', label: 'Hand Size <=', needsValue: true },
  { type: 'hand_contains_rank', label: 'Hand Contains Rank', needsRank: true },
  { type: 'hand_contains_suit', label: 'Hand Contains Suit', needsSuit: true },
  { type: 'score_equals', label: 'Score Equals', needsValue: true },
  { type: 'score_gte', label: 'Score >=', needsValue: true },
  { type: 'score_lte', label: 'Score <=', needsValue: true },
  { type: 'is_blackjack', label: 'Is Blackjack' },
  { type: 'is_bust', label: 'Is Bust' },
  { type: 'enemy_score_gte', label: 'Enemy Score >=', needsValue: true },
  { type: 'enemy_score_lte', label: 'Enemy Score <=', needsValue: true },
  { type: 'battle_number_equals', label: 'Battle # Equals', needsValue: true },
  { type: 'battle_number_gte', label: 'Battle # >=', needsValue: true },
  { type: 'hand_number_equals', label: 'Hand # Equals', needsValue: true },
  { type: 'hand_number_gte', label: 'Hand # >=', needsValue: true },
  { type: 'stage_equals', label: 'Stage Equals', needsValue: true },
  { type: 'hp_below_percent', label: 'HP Below %', needsValue: true },
  { type: 'hp_above_percent', label: 'HP Above %', needsValue: true },
  { type: 'gold_gte', label: 'Gold >=', needsValue: true },
  { type: 'enemy_is_boss', label: 'Enemy is Boss' },
  { type: 'enemy_hp_below_percent', label: 'Enemy HP Below %', needsValue: true },
  { type: 'won_previous_hand', label: 'Won Previous Hand' },
  { type: 'lost_previous_hand', label: 'Lost Previous Hand' },
  { type: 'win_streak_gte', label: 'Win Streak >=', needsValue: true },
  { type: 'loss_streak_gte', label: 'Loss Streak >=', needsValue: true },
  { type: 'has_soft_hand', label: 'Has Soft Hand' },
  { type: 'dealer_hand_size_gte', label: 'Dealer Hand Size >=', needsValue: true },
] as const;

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export const EQUIPMENT_SLOTS = ['weapon', 'helm', 'armor', 'boots', 'trinket'] as const;
export const EQUIPMENT_TIERS = ['cloth', 'bronze', 'iron'] as const;

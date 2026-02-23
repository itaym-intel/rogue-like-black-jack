# Implement the Wish Blessing System with LLM-Generated Modifiers

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This document must be maintained in accordance with `PLANS.md` at the repository root.


## Purpose / Big Picture

After this change, when a player defeats a boss and visits the Genie, typing a wish (up to 40 characters) into the textbox will produce a real, mechanically meaningful blessing powered by an LLM (Claude Haiku 4.5). Today the Genie encounter stores the player's wish text as flavor with no gameplay effect — only the curse half works. After this change, both halves of the Wish system are live: the player types a creative wish ("I wish for the power of flame"), the LLM interprets it using the player's current situation and a comprehensive API reference of 70+ modifier effects the game supports, and a unique blessing modifier is generated and applied for the rest of the run.

The blessing API surface is intentionally massive — inspired by Slay the Spire boss relics and Balatro jokers. Effects span card value manipulation, deck composition, new interactive player actions (removing cards from hand, peeking at the next card, surrendering), dealer behavior changes, damage bonuses by card rank/suit/hand composition, healing, damage over time, economy, and scoring rule changes. Some blessings are passive (stat boosts, rule changes), while others are **interactive** — they add new buttons to the player's turn (like "Remove Card" or "Peek") that mirror the hit/stand buttons but appear above the dealer's area.

The blessing's effects are drawn from the same modifier pipeline that powers equipment, consumables, and curses, extended with new hooks for deck manipulation, card value overrides, push/dodge triggers, and interactive actions. They stack and interact naturally with every other game system.

Example wishes and their blessings:
- "make me lucky" → **Luck**: Double blackjack odds, halve enemy blackjack odds
- "defense" → **Tank**: If a card would bust you, its value is halved
- "make me super strong" → **Overkill**: 22 counts as blackjack
- "make tens like aces" → **Double Standards**: 10s become flexible (1 or 10)
- "remove a card from hand" → **Sleight of Hand**: New "Remove Card" button during your turn
- "make all my cards jacks and aces" → **Meta Planning**: Deck only contains kings and aces

To see it working: run `npm run dev -- --seed=42`, play through Stage 1 until you defeat the Ancient Strix boss, type a wish at the Genie prompt (40 char max), and observe a named blessing with a description and real mechanical effects appear in your status panel. In the GUI (`npm run dev:gui`), the GenieScreen will show a loading state while the LLM generates the blessing, then display the result before you continue. Interactive blessings will add new action buttons during `player_turn` that mirror the hit/stand UI but appear above the dealer area. In tests, `npm run test` will pass with new tests covering the blessing builder, LLM prompt construction, modifier application, interactive actions, and full integration through the engine.


## Progress

- [ ] Milestone 1: BlessingDefinition types, builder function, validation, and unit tests.
- [ ] Milestone 2: LLM integration module — Anthropic SDK, prompt construction, response parsing.
- [ ] Milestone 3: Engine integration — wire blessings into the game state machine and modifier pipeline.
- [ ] Milestone 4: CLI and GUI integration — async LLM calls in both UI layers.
- [ ] Milestone 5: Full integration tests and polish.


## Surprises & Discoveries

(none yet)


## Decision Log

- Decision: Keep the LLM call outside the engine, in the UI layer.
  Rationale: The engine is a deterministic state machine with no I/O. The LLM call is an async network request. Placing it in the UI layer preserves engine purity. The UI calls the LLM, gets a structured BlessingDefinition, and passes it to the engine as part of the `enter_wish` action. The engine never imports the Anthropic SDK. This also means replays work: the action log records the BlessingDefinition, so replaying actions reproduces the same blessing without calling the LLM again.
  Date/Author: 2026-02-21

- Decision: Use a structured BlessingDefinition schema instead of LLM-generated code.
  Rationale: Having the LLM output executable code would be a security risk and fragile. Instead, we define a fixed set of effect types (about 18) that cover every modifier hook in the game. The LLM fills in a structured JSON object with effect type + parameters. A builder function in the engine converts this to a real Modifier object. The LLM is given the effect catalog as a tool schema, and responds with tool_use calls. This is safe, validatable, and deterministic given the same definition.
  Date/Author: 2026-02-21

- Decision: Use Claude's tool_use feature with a single `create_blessing` tool.
  Rationale: The DESIGN.md says the LLM is given an "API reference it can request with parameters." Tool use is the perfect fit: the tool schema documents every available effect type with parameter constraints, the LLM calls the tool with its choices, and we parse the structured tool_use response. This avoids any free-text JSON parsing. The single-tool approach (one `create_blessing` tool with an `effects` array) is simpler than multiple tools and lets the LLM compose multiple effects into one blessing naturally.
  Date/Author: 2026-02-21

- Decision: Add `blessing` field to the `enter_wish` action instead of a new action type.
  Rationale: The current `{ type: 'enter_wish'; text: string }` action is the only Genie action. Adding an optional `blessing?: BlessingDefinition` field to it is backward-compatible: existing tests and autoplay helpers that omit the field still work (the blessing is simply null, preserving current behavior). No new game phase or action type needed. The UI layer is responsible for populating `blessing` before sending the action.
  Date/Author: 2026-02-21

- Decision: Clamp all LLM-generated effect values to safe ranges.
  Rationale: The LLM might generate extreme values ("+1000% damage", "bust threshold of 99"). Every effect type has min/max bounds defined in the builder, and values are clamped silently. This keeps blessings powerful but not game-breaking. The bounds are documented in the effect catalog below.
  Date/Author: 2026-02-21


- Decision: Expand the BlessingEffectType API from 18 to 70+ effects, covering card/deck manipulation, scoring, interactive actions, dealer behavior, per-card-type damage bonuses, defense, healing, DoT, and economy.
  Rationale: The original 18 effects were too narrow for an LLM-powered wish system where the user can type anything in a free-text box. With 70+ effects, the LLM can map virtually any wish to meaningful mechanics. Inspired by Balatro jokers and Slay the Spire boss relics. Effects are all clamped to safe ranges, so the explosion in breadth doesn't compromise balance.
  Date/Author: 2026-02-22

- Decision: Add a conditional system (BlessingCondition) that can be attached to any effect.
  Rationale: Players will wish for conditional blessings ("when the dealer draws a 3", "if I win without taking damage", "if I kill with poison"). Without conditionals, these wishes would have to be approximated as always-on effects or fall back to generic blessings. The conditional system adds a `condition?: BlessingCondition` field to BlessingEffect with 30+ condition types covering card events, hand composition, scoring state, outcomes, game state, and kill conditions. This requires new engine tracking (consecutiveWins, previousHandScore, killCause) and a new `onCardDrawn` hook.
  Date/Author: 2026-02-22

- Decision: Add interactive blessing actions (remove_card, peek, surrender) as new PlayerAction types rather than Modifier hooks.
  Rationale: Interactive blessings like "remove a card from your hand" require new UI elements and new engine action handling. Implementing these as new PlayerAction types with corresponding GameRules flags (canRemoveCard, canPeek) keeps them in the existing action/rules pattern. The modifyRules hook on the blessing enables the rule, the engine checks it in getAvailableActions, and the UI renders the buttons. This is cleaner than trying to encode player agency in modifier hooks.
  Date/Author: 2026-02-22

- Decision: Limit wish text to 40 characters.
  Rationale: Forces concise, punchy wishes that are easy for the LLM to interpret and display. Prevents token-wasting prompts. The UI shows a character counter. The engine truncates silently if the limit is exceeded.
  Date/Author: 2026-02-22

- Decision: Position interactive blessing buttons above the dealer area, mirroring the player's hit/stand buttons.
  Rationale: Visually separates standard actions (below player's cards) from blessing-granted actions (above dealer's cards). Creates a clear hierarchy where blessing actions are "reaching across" to the opponent's side. Keeps the player's action area uncluttered.
  Date/Author: 2026-02-22

## Outcomes & Retrospective

(to be filled as milestones complete)


## Context and Orientation

This section describes the current state of the repository relevant to this work. Read this if you have no prior context.

**Repository root:** The project is a TypeScript game called Geniejack, a rogue-like blackjack game. It uses Vite for the GUI, tsx for CLI execution, and Vitest for testing. All source code is in `src/`, tests in `tests/`. The `package.json` is at the repository root.

**Engine (`src/engine/`):** All game logic lives here. The engine is a deterministic state machine. Key files:

- `src/engine/types.ts` — Every TypeScript interface and type in the game. The single source of truth for all types. This file defines `Card`, `Hand`, `HandScore`, `Equipment`, `Consumable`, `Wish`, `PlayerState`, `EnemyState`, `GamePhase`, `PlayerAction`, `ActionResult`, `GameView`, `GameRules`, `ModifierContext`, `Modifier`, `GenieEncounter`, and serialization types. **All new types for this work go here.**

- `src/engine/modifiers.ts` — The modifier pipeline. Exports `getDefaultRules()` (returns a fresh `GameRules` with all defaults), `applyModifierPipeline(modifiers, rules)` (applies all `modifyRules` hooks), `collectModifiers(playerState, enemyState)` (gathers modifiers from player equipment, active effects, wish curses, and enemy equipment), and `applyDamageModifiers(baseDamage, attackerMods, defenderMods, context)` (runs damage hooks + dodge checks). **The `collectModifiers` function must be updated to also collect wish blessing modifiers.**

- `src/engine/genie.ts` — Current half-implementation. Exports `createGenieEncounter(boss)` (creates a `GenieEncounter` from boss data, extracting the curse modifier) and `storeBlessingWish(encounter, text)` (stores wish text and returns a `Wish` with the text and curse but no blessing modifier). **This file must be updated to accept a BlessingDefinition and build a blessing modifier.**

- `src/engine/game.ts` — The `GameEngine` class. A state machine that processes `PlayerAction` inputs and advances through game phases. The `handleGenie` method currently calls `storeBlessingWish` with just the wish text. **This method must be updated to also pass the BlessingDefinition from the action and store the resulting blessing modifier in the Wish.**

- `src/engine/equipment.ts` — 15 equipment items built using helper functions (`createWeapon`, `createHelm`, `createArmor`, `createBoots`, plus hand-crafted trinkets). Each item has a `modifier: Modifier` that plugs into the pipeline. The patterns used here are the templates for blessing effects.

- `src/engine/combatants.ts` — 9 enemies and 3 bosses. Each boss has a `curse?: Modifier` property. The 3 existing curses use `modifyDamageReceived` (Strix: +5 on blackjack), `onHandStart` (Djinn: 3 damage per hand), and `modifyRules` (Sultan: ties favor dealer). Blessings will use the same modifier hooks.

- `src/engine/consumables.ts` — 4 consumable types. Demonstrates the `ActiveEffect` pattern (temporary modifiers with `remainingHands`). Blessings are permanent (no duration), but the modifier construction patterns are similar.

**The Modifier interface** (from `src/engine/types.ts`) is the contract that blessings must satisfy:

    interface Modifier {
      id: string;
      name: string;
      description: string;
      source: 'equipment' | 'consumable' | 'enemy' | 'wish_blessing' | 'wish_curse';

      modifyRules?(rules: GameRules): GameRules;
      modifyDamageDealt?(damage: number, context: ModifierContext): number;
      modifyDamageReceived?(damage: number, context: ModifierContext): number;
      modifyBust?(hand: Hand, score: number, context: ModifierContext):
        { busted: boolean; effectiveScore: number } | null;
      dodgeCheck?(context: ModifierContext): boolean;
      onHandStart?(context: ModifierContext): void;
      onHandEnd?(context: ModifierContext): void;
      onBattleStart?(context: ModifierContext): void;
      onBattleEnd?(context: ModifierContext): void;
      modifyGoldEarned?(gold: number, context: ModifierContext): number;
    }

The `source` field already has `'wish_blessing'` as a valid value, indicating this was always planned.

**GameRules** (from `src/engine/types.ts`) defines every tunable game parameter, grouped into `scoring`, `turnOrder`, `dealer`, `winConditions`, `damage`, `actions`, `deck`, `economy`, `health`, and `progression` sections. Blessings that modify rules use the `modifyRules` hook.

**The Wish type** (from `src/engine/types.ts`):

    interface Wish {
      blessingText: string;
      curse: Modifier | null;
      bossName: string;
    }

This must be extended to include an optional `blessing: Modifier | null` field.

**PlayerAction for genie** (from `src/engine/types.ts`):

    | { type: 'enter_wish'; text: string }

This must be extended to include an optional `blessing?: BlessingDefinition` field.

**UI layers:**

- `src/cli/index.ts` — Main CLI loop. Calls `game.performAction(action)` synchronously. The genie phase reads free text and sends it as `enter_wish`. Must be updated to call the LLM after reading text and before sending the action.

- `src/cli/input.ts` — Input handler. The genie case returns `{ type: 'enter_wish', text: input }` for any non-empty input.

- `src/cli/display.ts` — Renders `GameView` to text. The genie section shows curse info and prompts for wish text. Must be updated to show blessing info.

- `src/gui/screens/GenieScreen.tsx` — React component. Has a textarea for wish input and a "Grant Wish" button. Must be updated with a loading state, LLM call, and blessing result display.

**Tests:**

- `tests/genie.test.ts` — 5 tests covering encounter creation, curse extraction, wish text storage, and confirming blessings have no mechanical effect. That last test must be updated or replaced.

- `tests/full-game.test.ts` — Integration tests with an `autoPlay` helper that sends `{ type: 'enter_wish', text: 'I wish for strength' }` at the genie phase. This is backward-compatible since the `blessing` field is optional.

**Dependencies:** Currently zero runtime dependencies besides React. This work adds the `@anthropic-ai/sdk` package for LLM calls.

**Environment:** The Anthropic API key is provided via the `ANTHROPIC_API_KEY` environment variable. The model to use is `claude-haiku-4-5-20251001`.


## Plan of Work


### Milestone 1: BlessingDefinition Schema, Builder, and Validation

This milestone creates the data types and pure functions that convert a structured blessing definition into a real game Modifier. At the end of this milestone, the builder can be tested in isolation with hand-crafted definitions — no LLM is involved yet. Run `npm run test` and observe the new `tests/blessings.test.ts` tests pass.

**New types in `src/engine/types.ts`:**

Add these types after the existing `Wish` interface. The effect types are organized into categories:

    type BlessingEffectType =
      // ── Card & Deck Manipulation ──
      | 'flexible_rank'              // Make a rank behave like aces (1 or its value). Param: rank. E.g. tens become 1 or 10.
      | 'change_face_card_value'     // Face cards are worth value instead of 10
      | 'change_ace_high_value'      // Ace high value becomes value (default 11)
      | 'suit_card_value_bonus'      // Cards of param suit count as +value more in scoring
      | 'rank_value_override'        // Cards of param rank are worth value. E.g. 5s become 0.
      | 'remove_rank_from_deck'      // Remove all cards of param rank from deck
      | 'remove_suit_from_deck'      // Remove all cards of param suit from deck
      | 'force_deck_ranks'           // Deck only contains param ranks (e.g. ['K', 'A'])
      | 'extra_copies_of_rank'       // Add value extra copies (all 4 suits) of param rank to deck
      | 'no_reshuffle'              // Don't reshuffle between hands (card counting!)
      | 'multiple_decks'            // Use value decks

      // ── Scoring & Bust Manipulation ──
      | 'bust_threshold_bonus'       // Increase bust threshold by value (bust at 22, 23...)
      | 'additional_blackjack_value' // Score of value also counts as blackjack (e.g. 22)
      | 'bust_save'                  // On bust, count hand as score of value
      | 'bust_card_value_halved'     // If a drawn card would cause bust, halve its effective value
      | 'ignore_card_on_bust'        // On bust, the highest non-ace card is ignored (value 0)
      | 'five_card_charlie'          // 5+ cards without bust = automatic win + value bonus damage
      | 'soft_hand_bonus'            // +value damage when hand is soft
      | 'exact_target_bonus'         // +value damage for hitting exactly the bust threshold (21)

      // ── Player Actions (Interactive) ──
      | 'enable_remove_card'         // Player may remove value cards from hand per hand (new button)
      | 'enable_peek'                // Player can see next card before deciding (new button)
      | 'enable_surrender'           // Player can surrender for half damage (new button)
      | 'enable_split'               // Player can split pairs (new button)
      | 'extra_starting_cards'       // Player starts with value extra cards per hand
      | 'fewer_starting_cards'       // Player starts with value fewer cards (min 1)
      | 'double_down_any_time'       // Can double down at any point, not just first action
      | 'hit_after_double'           // Can continue hitting after double down

      // ── Dealer Manipulation ──
      | 'dealer_stands_on'           // Dealer stands on value instead of 17
      | 'dealer_hits_soft_17'        // Force dealer to hit on soft 17 (value ignored, boolean effect)
      | 'ties_favor_player'          // Ties resolved in player's favor (value ignored, boolean)
      | 'double_bust_favors_player'  // Both bust = player wins (value ignored, boolean)
      | 'dealer_reveals_cards'       // All dealer cards face-up (value ignored, boolean)
      | 'dealer_extra_starting_card' // Dealer starts with value extra cards (more likely to bust)
      | 'dealer_fewer_starting_cards'// Dealer starts with value fewer cards (min 1)

      // ── Damage Bonuses ──
      | 'flat_damage_bonus'          // +value damage on all attacks
      | 'percent_damage_bonus'       // +value% damage (0.3 = 30% more)
      | 'damage_multiplier'          // xvalue damage multiplier (2.0 = double damage)
      | 'suit_damage_bonus'          // +value damage per card of param suit in hand
      | 'face_card_damage_bonus'     // +value damage per face card (J/Q/K) in hand
      | 'ace_damage_bonus'           // +value damage per ace in hand
      | 'even_card_bonus'            // +value damage per even-ranked card (2,4,6,8,10)
      | 'odd_card_bonus'             // +value damage per odd-ranked card (3,5,7,9,A)
      | 'low_card_bonus'             // +value damage per card ranked 2-6
      | 'high_card_bonus'            // +value damage per card ranked 7-10
      | 'blackjack_bonus_damage'     // +value extra damage on blackjack
      | 'blackjack_damage_multiplier'// xvalue multiplier on blackjack specifically
      | 'damage_on_push'             // Deal value damage to enemy on tie/push
      | 'damage_per_card_in_hand'    // +value damage per card in final hand (reward hitting)
      | 'overkill_carry'             // value% of excess damage carries to next hand
      | 'scaling_damage_per_win'     // +value damage per hand won this battle (resets per battle)
      | 'double_down_multiplier'     // Set double down multiplier to value

      // ── Damage Reduction & Defense ──
      | 'flat_damage_reduction'      // Reduce incoming damage by value
      | 'percent_damage_reduction'   // Reduce incoming by value% (0.2 = 20% less)
      | 'dodge_chance'               // value% chance to dodge entirely
      | 'thorns'                     // Reflect value% of damage taken back to attacker
      | 'damage_shield'              // Absorb first value damage per battle
      | 'damage_cap'                 // Max incoming damage per hand capped at value
      | 'suit_damage_reduction'      // -value% damage if hand has 2+ cards of param suit
      | 'reduce_bust_damage'         // -value% damage specifically when you bust

      // ── Healing ──
      | 'max_hp_bonus'               // +value max HP (and current HP)
      | 'heal_per_hand'              // Heal value at start of each hand
      | 'heal_on_win'                // Heal value when winning a hand
      | 'heal_on_blackjack'          // Heal value on blackjack
      | 'heal_on_dodge'              // Heal value when dodging damage
      | 'lifesteal'                  // Heal value% of damage dealt
      | 'heal_per_battle'            // Heal value between battles (health regen)
      | 'heal_on_push'               // Heal value on tie/push

      // ── Damage Over Time / Passive ──
      | 'damage_per_hand'            // Deal value damage to enemy at start of each hand
      | 'poison'                     // Deal value damage per hand, value increases by 1 each hand
      | 'damage_on_enemy_bust'       // +value extra damage when enemy busts

      // ── Economy ──
      | 'flat_gold_bonus'            // +value gold per battle
      | 'percent_gold_bonus'         // +value% gold (0.5 = 50% more)
      | 'gold_per_hand_won'          // +value gold per hand won in battle
      | 'gold_per_blackjack'         // +value gold per blackjack
      | 'shop_discount';             // Shop prices reduced by value% (0.2 = 20% off)

    interface BlessingEffect {
      type: BlessingEffectType;
      value: number;
      suit?: Suit;    // used for suit-based effects
      rank?: Rank;    // used for rank-based effects (flexible_rank, rank_value_override, etc.)
      ranks?: Rank[]; // used for force_deck_ranks (array of allowed ranks)
    }

    interface BlessingDefinition {
      name: string;
      description: string;
      effects: BlessingEffect[];
    }

    // ── Conditional System ──
    // Any BlessingEffect can have an optional condition. When present, the effect
    // only activates when the condition is met. This enables wishes like "when the
    // dealer draws a 3, deal 10 damage" or "if you win without taking damage, heal 5".

    type BlessingConditionType =
      // Card draw events — require new onCardDrawn hook
      | 'when_player_draws_rank'       // When player draws a card of specific rank
      | 'when_player_draws_suit'       // When player draws a card of specific suit
      | 'when_dealer_draws_rank'       // When dealer draws a card of specific rank
      | 'when_dealer_draws_suit'       // When dealer draws a card of specific suit

      // Hand composition — checked at hand resolution
      | 'hand_contains_pair'           // Hand has 2+ cards of same rank
      | 'hand_is_flush'                // All cards in hand are same suit
      | 'hand_all_same_color'          // All cards same color (red/black)
      | 'hand_size_equals'             // Hand has exactly value cards
      | 'hand_size_gte'                // Hand has value+ cards
      | 'hand_contains_rank'           // Hand contains at least one card of rank
      | 'hand_contains_suit'           // Hand contains at least one card of suit

      // Scoring conditions — checked during damage calculation
      | 'score_exactly'                // Player score is exactly value
      | 'score_gte'                    // Player score >= value
      | 'on_blackjack'                 // Player has blackjack
      | 'on_bust'                      // Player busted (for defensive effects)
      | 'on_soft_hand'                 // Player hand is soft

      // Outcome triggers — checked at hand resolution
      | 'on_win'                       // Player wins hand
      | 'on_loss'                      // Player loses hand
      | 'on_push'                      // Tie
      | 'on_dodge'                     // Damage dodged
      | 'on_enemy_bust'               // Enemy busted
      | 'on_win_no_damage_taken'       // Player won and took 0 damage this hand

      // Game state conditions — checked dynamically
      | 'hp_below_percent'             // Player HP below value% of maxHp
      | 'hp_above_percent'             // Player HP above value% of maxHp
      | 'enemy_hp_below_percent'       // Enemy HP below value% of maxHp
      | 'gold_above'                   // Player gold > value
      | 'consecutive_wins'             // Player won value+ hands in a row
      | 'consecutive_losses'           // Player lost value+ hands in a row
      | 'first_hand_of_battle'         // First hand of current battle
      | 'same_score_as_previous'       // Same hand score as previous hand

      // Kill conditions — checked when enemy dies
      | 'enemy_killed_by_dot'          // Enemy killed by poison/damage_per_hand (not hand damage)
      | 'enemy_killed_by_blackjack'    // Enemy killed on a blackjack hand
      ;

    interface BlessingCondition {
      type: BlessingConditionType;
      value?: number;   // For conditions that need a numeric param (score_exactly, hp_below_percent, etc.)
      rank?: Rank;      // For rank-based conditions (when_player_draws_rank, hand_contains_rank)
      suit?: Suit;      // For suit-based conditions (when_dealer_draws_suit, hand_contains_suit)
    }

The `BlessingEffect` interface gains an optional `condition` field:

    interface BlessingEffect {
      type: BlessingEffectType;
      value: number;
      suit?: Suit;
      rank?: Rank;
      ranks?: Rank[];
      condition?: BlessingCondition;  // If set, effect only fires when condition is met
    }

Extend the `Wish` interface:

    interface Wish {
      blessingText: string;
      blessing: Modifier | null;    // <-- new field
      curse: Modifier | null;
      bossName: string;
    }

Extend the `enter_wish` action in the `PlayerAction` union:

    | { type: 'enter_wish'; text: string; blessing?: BlessingDefinition }

Add new interactive action types to the `PlayerAction` union (enabled by blessings):

    | { type: 'remove_card'; cardIndex: number }   // Remove a card from hand (blessing: enable_remove_card)
    | { type: 'peek' }                              // Peek at the next card (blessing: enable_peek)
    | { type: 'surrender' }                         // Surrender for half damage (blessing: enable_surrender)

**Wish text limit:** The `enter_wish` action must enforce a 40-character maximum on the `text` field. The engine truncates silently; the UI prevents input beyond 40 characters. The textarea shows a character counter.

Add `BlessingDefinition` to the `GameView`'s genie property so the UI can display blessing info after it's applied:

    genie: {
      bossName: string;
      curseDescription: string;
      blessingEntered: boolean;
      blessingName: string | null;          // <-- new
      blessingDescription: string | null;   // <-- new
    } | null;

**New GameRules fields** (add to `src/engine/types.ts` `GameRules` interface):

The following new fields enable blessings that change game rules via `modifyRules`. Each has a safe default that preserves current behavior:

    scoring: {
      // ... existing fields ...
      flexibleRanks: Rank[];          // default: []. Ranks that behave like aces (flexible high/low value).
                                      // A rank in this list uses its face value as "high" and 1 as "low".
                                      // E.g., if '10' is flexible, 10s can count as 1 or 10.
      rankValueOverrides: Partial<Record<Rank, number>>;  // default: {}. Override specific rank values.
    };
    actions: {
      // ... existing fields ...
      canRemoveCard: boolean;          // default: false. If true, player can remove cards from hand.
      cardRemovesPerHand: number;      // default: 0. How many cards can be removed per hand.
      canPeek: boolean;                // default: false. If true, player can peek at next card.
      canSurrender: boolean;           // already exists, default false
      canSplit: boolean;               // already exists, default false
      canDoubleDownAnyTime: boolean;   // default: false. Double down not just first action.
      canHitAfterDouble: boolean;      // default: false. Continue hitting after double down.
    };
    deck: {
      // ... existing fields ...
      removedRanks: Rank[];            // default: []. Ranks removed from deck.
      removedSuits: Suit[];            // default: []. Suits removed from deck.
      forcedRanks: Rank[] | null;      // default: null. If set, deck ONLY contains these ranks.
      extraCopies: { rank: Rank; count: number }[]; // default: []. Extra copies of specific ranks.
    };
    damage: {
      // ... existing fields ...
      thornsPercent: number;           // default: 0. Reflect this % of damage back.
      damageShield: number;            // default: 0. Absorb first N damage per battle.
      damageCap: number | null;        // default: null. Max incoming damage per hand.
      overkillCarryPercent: number;    // default: 0. % of excess damage carried to next hand.
    };
    health: {
      // ... existing fields ...
      healthRegenPerBattle: number;    // already exists
    };
    economy: {
      // ... existing fields ...
      shopPriceMultiplier: number;     // already exists, blessing can reduce it
    };

**New Modifier hooks** (add to `src/engine/types.ts` `Modifier` interface):

    interface Modifier {
      // ... existing hooks ...
      modifyDeck?(deck: Card[], rules: GameRules): Card[];
          // Called before deck is shuffled for each hand. Allows adding/removing cards.
          // Used by: remove_rank_from_deck, remove_suit_from_deck, force_deck_ranks, extra_copies_of_rank
      modifyCardValue?(card: Card, baseValue: number, context: ModifierContext): number;
          // Called during scoring for each card. Returns modified value.
          // Used by: suit_card_value_bonus, rank_value_override
          // Note: flexible_rank is handled via GameRules.scoring.flexibleRanks in scoreHand()
      onPush?(context: ModifierContext): void;
          // Called when a hand results in a push/tie.
          // Used by: damage_on_push, heal_on_push
      onDodge?(context: ModifierContext): void;
          // Called when damage is successfully dodged.
          // Used by: heal_on_dodge
      onEnemyBust?(context: ModifierContext): void;
          // Called when the enemy/dealer busts.
          // Used by: damage_on_enemy_bust
      onCardDrawn?(card: Card, drawer: 'player' | 'dealer', context: ModifierContext): void;
          // Called when any card is drawn/dealt (by player hit, initial deal, or dealer play).
          // Used by: conditional effects with when_player_draws_rank, when_dealer_draws_suit, etc.
          // The hook fires immediately when the card is drawn, enabling reactive effects.
    }

**Updated ModifierContext** (add to `src/engine/types.ts`):

    interface ModifierContext {
      // ... existing fields ...
      lastDamageDealt: number;         // Damage dealt in the most recent hand (for lifesteal, overkill)
      lastDamageTaken: number;         // Damage taken in the most recent hand (for on_win_no_damage_taken)
      handsWonThisBattle: number;      // Count of hands won (for scaling_damage_per_win)
      consecutiveWins: number;         // Consecutive hands won in a row (resets on loss/push)
      consecutiveLosses: number;       // Consecutive hands lost in a row (resets on win/push)
      previousHandScore: number | null;// Score of player's previous hand (for same_score_as_previous)
      peekedCard: Card | null;         // The next card in deck (revealed by peek action)
      cardRemovesUsed: number;         // How many card removes used this hand
      killCause: 'hand_damage' | 'dot' | null; // What killed the enemy, if dead (for enemy_killed_by_dot)
    }

**New file `src/engine/blessings.ts`:**

This file exports two functions:

1. `validateBlessingDefinition(def: BlessingDefinition): BlessingDefinition` — Returns a copy with all effect values clamped to safe ranges. The clamping bounds are organized by category:

    **Card & Deck Manipulation:**
    - `flexible_rank`: rank must be valid Rank, value ignored (boolean effect)
    - `change_face_card_value`: value clamped to [5, 15]
    - `change_ace_high_value`: value clamped to [8, 15]
    - `suit_card_value_bonus`: value clamped to [1, 5], suit defaults to 'hearts'
    - `rank_value_override`: value clamped to [0, 15], rank must be valid
    - `remove_rank_from_deck`: rank must be valid, value ignored
    - `remove_suit_from_deck`: suit must be valid, value ignored
    - `force_deck_ranks`: ranks must be valid array with 1-4 entries, value ignored
    - `extra_copies_of_rank`: value clamped to [1, 4], rank must be valid
    - `no_reshuffle`: value ignored (boolean effect)
    - `multiple_decks`: value clamped to [2, 4]

    **Scoring & Bust Manipulation:**
    - `bust_threshold_bonus`: value clamped to [1, 5]
    - `additional_blackjack_value`: value clamped to [22, 25]
    - `bust_save`: value clamped to [8, 18] (effective score when busting)
    - `bust_card_value_halved`: value ignored (boolean effect)
    - `ignore_card_on_bust`: value ignored (boolean effect)
    - `five_card_charlie`: value clamped to [5, 30] (bonus damage)
    - `soft_hand_bonus`: value clamped to [2, 15]
    - `exact_target_bonus`: value clamped to [3, 20]

    **Player Actions (Interactive):**
    - `enable_remove_card`: value clamped to [1, 3] (removes per hand)
    - `enable_peek`: value ignored (boolean effect)
    - `enable_surrender`: value ignored (boolean effect)
    - `enable_split`: value ignored (boolean effect)
    - `extra_starting_cards`: value clamped to [1, 3]
    - `fewer_starting_cards`: value clamped to [1, 1] (min 1 card remaining)
    - `double_down_any_time`: value ignored (boolean effect)
    - `hit_after_double`: value ignored (boolean effect)

    **Dealer Manipulation:**
    - `dealer_stands_on`: value clamped to [14, 19]
    - `dealer_hits_soft_17`: value ignored (boolean effect)
    - `ties_favor_player`: value ignored (boolean effect)
    - `double_bust_favors_player`: value ignored (boolean effect)
    - `dealer_reveals_cards`: value ignored (boolean effect)
    - `dealer_extra_starting_card`: value clamped to [1, 2]
    - `dealer_fewer_starting_cards`: value clamped to [1, 1]

    **Damage Bonuses:**
    - `flat_damage_bonus`: value clamped to [1, 25]
    - `percent_damage_bonus`: value clamped to [0.1, 1.0]
    - `damage_multiplier`: value clamped to [1.5, 3.0]
    - `suit_damage_bonus`: value clamped to [1, 10], suit defaults to 'hearts'
    - `face_card_damage_bonus`: value clamped to [1, 8]
    - `ace_damage_bonus`: value clamped to [2, 15]
    - `even_card_bonus`: value clamped to [1, 8]
    - `odd_card_bonus`: value clamped to [1, 8]
    - `low_card_bonus`: value clamped to [1, 8]
    - `high_card_bonus`: value clamped to [1, 8]
    - `blackjack_bonus_damage`: value clamped to [3, 25]
    - `blackjack_damage_multiplier`: value clamped to [1.5, 3.0]
    - `damage_on_push`: value clamped to [2, 15]
    - `damage_per_card_in_hand`: value clamped to [1, 5]
    - `overkill_carry`: value clamped to [0.25, 1.0] (25%-100%)
    - `scaling_damage_per_win`: value clamped to [1, 5]
    - `double_down_multiplier`: value clamped to [2, 5]

    **Damage Reduction & Defense:**
    - `flat_damage_reduction`: value clamped to [1, 15]
    - `percent_damage_reduction`: value clamped to [0.05, 0.5]
    - `dodge_chance`: value clamped to [0.05, 0.35]
    - `thorns`: value clamped to [0.1, 0.5] (10%-50%)
    - `damage_shield`: value clamped to [5, 30]
    - `damage_cap`: value clamped to [5, 25]
    - `suit_damage_reduction`: value clamped to [0.1, 0.4], suit defaults to 'spades'
    - `reduce_bust_damage`: value clamped to [0.2, 0.8]

    **Healing:**
    - `max_hp_bonus`: value clamped to [5, 30]
    - `heal_per_hand`: value clamped to [1, 5]
    - `heal_on_win`: value clamped to [1, 10]
    - `heal_on_blackjack`: value clamped to [3, 15]
    - `heal_on_dodge`: value clamped to [2, 10]
    - `lifesteal`: value clamped to [0.1, 0.5]
    - `heal_per_battle`: value clamped to [3, 15]
    - `heal_on_push`: value clamped to [1, 8]

    **Damage Over Time / Passive:**
    - `damage_per_hand`: value clamped to [1, 5]
    - `poison`: value clamped to [1, 3] (starting damage, grows each hand)
    - `damage_on_enemy_bust`: value clamped to [3, 15]

    **Economy:**
    - `flat_gold_bonus`: value clamped to [2, 20]
    - `percent_gold_bonus`: value clamped to [0.1, 1.0]
    - `gold_per_hand_won`: value clamped to [1, 5]
    - `gold_per_blackjack`: value clamped to [3, 15]
    - `shop_discount`: value clamped to [0.1, 0.5]

    Additionally, if the `effects` array has more than 3 entries, only the first 3 are kept (blessings should be strong but focused). If `name` or `description` is longer than 60 characters, it is truncated. If the `effects` array is empty, a fallback effect of `{ type: 'flat_damage_bonus', value: 5 }` is added. For effects that use `rank`, `suit`, or `ranks` parameters, invalid values are corrected to safe defaults.

2. `buildBlessingModifier(def: BlessingDefinition): Modifier` — Takes a validated BlessingDefinition and returns a `Modifier` object with the appropriate hooks wired up. The modifier's `id` is `'wish_blessing_' + def.name.toLowerCase().replace(/\s+/g, '_')`, its `source` is `'wish_blessing'`, and its hooks are composed from the effects.

    The builder constructs the modifier by iterating over the effects array and composing hook functions. When multiple effects target the same hook, the builder composes them: each function calls the previous and adds its own effect via closure chain.

    **Effect → Hook mapping by category:**

    **Card & Deck Manipulation:**
    - `flexible_rank` → `modifyRules`: adds rank to `scoring.flexibleRanks`
    - `change_face_card_value` → `modifyRules`: sets `scoring.faceCardValue = value`
    - `change_ace_high_value` → `modifyRules`: sets `scoring.aceHighValue = value`
    - `suit_card_value_bonus` → `modifyCardValue`: if card suit matches, returns `baseValue + value`
    - `rank_value_override` → `modifyRules`: sets `scoring.rankValueOverrides[rank] = value`
    - `remove_rank_from_deck` → `modifyDeck`: filters out cards matching rank
    - `remove_suit_from_deck` → `modifyDeck`: filters out cards matching suit
    - `force_deck_ranks` → `modifyDeck`: keeps only cards whose rank is in the `ranks` array
    - `extra_copies_of_rank` → `modifyDeck`: adds `value` copies of rank (all 4 suits) to deck
    - `no_reshuffle` → `modifyRules`: sets `deck.reshuffleBetweenHands = false`
    - `multiple_decks` → `modifyRules`: sets `deck.numberOfDecks = value`

    **Scoring & Bust Manipulation:**
    - `bust_threshold_bonus` → `modifyRules`: `scoring.bustThreshold += value`
    - `additional_blackjack_value` → `modifyRules`: pushes value into `scoring.additionalBlackjackValues`
    - `bust_save` → `modifyBust`: returns `{ busted: false, effectiveScore: value }`
    - `bust_card_value_halved` → `modifyBust`: recalculates with last card halved; if ≤ bustThreshold, saves
    - `ignore_card_on_bust` → `modifyBust`: recalculates without highest non-ace card; if ≤ bustThreshold, saves
    - `five_card_charlie` → `modifyDamageDealt`: if 5+ cards and not busted, `damage + value`
    - `soft_hand_bonus` → `modifyDamageDealt`: if soft hand, `damage + value`
    - `exact_target_bonus` → `modifyDamageDealt`: if score == bustThreshold, `damage + value`

    **Player Actions (Interactive):**
    - `enable_remove_card` → `modifyRules`: `actions.canRemoveCard = true`, `actions.cardRemovesPerHand = value`
    - `enable_peek` → `modifyRules`: `actions.canPeek = true`
    - `enable_surrender` → `modifyRules`: `actions.canSurrender = true`
    - `enable_split` → `modifyRules`: `actions.canSplit = true`
    - `extra_starting_cards` → `modifyRules`: `turnOrder.initialPlayerCards += value`
    - `fewer_starting_cards` → `modifyRules`: `turnOrder.initialPlayerCards = max(1, current - value)`
    - `double_down_any_time` → `modifyRules`: `actions.canDoubleDownAnyTime = true`
    - `hit_after_double` → `modifyRules`: `actions.canHitAfterDouble = true`

    **Dealer Manipulation:**
    - `dealer_stands_on` → `modifyRules`: `dealer.standsOn = value`
    - `dealer_hits_soft_17` → `modifyRules`: `dealer.standsOnSoft17 = false`
    - `ties_favor_player` → `modifyRules`: `winConditions.tieResolution = 'player'`
    - `double_bust_favors_player` → `modifyRules`: `winConditions.doubleBustResolution = 'player'`
    - `dealer_reveals_cards` → `modifyRules`: dealer cards all face-up (new flag or repurpose peeksForBlackjack)
    - `dealer_extra_starting_card` → `modifyRules`: `turnOrder.initialDealerCards += value`
    - `dealer_fewer_starting_cards` → `modifyRules`: `turnOrder.initialDealerCards = max(1, current - value)`

    **Damage Bonuses:**
    - `flat_damage_bonus` → `modifyDamageDealt`: `damage + value`
    - `percent_damage_bonus` → `modifyDamageDealt`: `Math.floor(damage * (1 + value))`
    - `damage_multiplier` → `modifyDamageDealt`: `Math.floor(damage * value)`
    - `suit_damage_bonus` → `modifyDamageDealt`: `damage + (cards of suit) * value`
    - `face_card_damage_bonus` → `modifyDamageDealt`: `damage + (J/Q/K count) * value`
    - `ace_damage_bonus` → `modifyDamageDealt`: `damage + (ace count) * value`
    - `even_card_bonus` → `modifyDamageDealt`: `damage + (even cards) * value`
    - `odd_card_bonus` → `modifyDamageDealt`: `damage + (odd cards) * value`
    - `low_card_bonus` → `modifyDamageDealt`: `damage + (2-6 cards) * value`
    - `high_card_bonus` → `modifyDamageDealt`: `damage + (7-10 cards) * value`
    - `blackjack_bonus_damage` → `modifyDamageDealt`: if blackjack, `damage + value`
    - `blackjack_damage_multiplier` → `modifyDamageDealt`: if blackjack, `Math.floor(damage * value)`
    - `damage_on_push` → `onPush`: deals `value` damage to enemy
    - `damage_per_card_in_hand` → `modifyDamageDealt`: `damage + hand.cards.length * value`
    - `overkill_carry` → `modifyRules`: `damage.overkillCarryPercent = value`, engine handles carry
    - `scaling_damage_per_win` → `modifyDamageDealt`: `damage + context.handsWonThisBattle * value`
    - `double_down_multiplier` → `modifyRules`: `actions.doubleDownMultiplier = value`

    **Damage Reduction & Defense:**
    - `flat_damage_reduction` → `modifyDamageReceived`: `Math.max(0, damage - value)`
    - `percent_damage_reduction` → `modifyDamageReceived`: `Math.floor(damage * (1 - value))`
    - `dodge_chance` → `dodgeCheck`: `context.rng.next() < value`
    - `thorns` → `modifyRules`: `damage.thornsPercent = value`, engine applies after damage
    - `damage_shield` → `modifyRules`: `damage.damageShield = value`, engine tracks per battle
    - `damage_cap` → `modifyRules`: `damage.damageCap = value`
    - `suit_damage_reduction` → `modifyDamageReceived`: if 2+ cards of suit, `Math.floor(damage * (1 - value))`
    - `reduce_bust_damage` → `modifyDamageReceived`: if busted, `Math.floor(damage * (1 - value))`

    **Healing:**
    - `max_hp_bonus` → `onBattleStart`: `playerState.maxHp += value`, `playerState.hp += value` (once, closure flag)
    - `heal_per_hand` → `onHandStart`: heals by `value`, capped at maxHp
    - `heal_on_win` → `onHandEnd`: if player won, heals by `value`
    - `heal_on_blackjack` → `onHandEnd`: if blackjack, heals by `value`
    - `heal_on_dodge` → `onDodge`: heals by `value`
    - `lifesteal` → `onHandEnd`: heals `Math.floor(context.lastDamageDealt * value)`
    - `heal_per_battle` → `modifyRules`: `health.healthRegenPerBattle += value`
    - `heal_on_push` → `onPush`: heals by `value`

    **Damage Over Time / Passive:**
    - `damage_per_hand` → `onHandStart`: deals `value` damage to enemy
    - `poison` → `onHandStart`: deals escalating damage (starts at `value`, +1 per hand, closure counter)
    - `damage_on_enemy_bust` → `onEnemyBust`: deals `value` extra damage

    **Economy:**
    - `flat_gold_bonus` → `modifyGoldEarned`: `gold + value`
    - `percent_gold_bonus` → `modifyGoldEarned`: `Math.floor(gold * (1 + value))`
    - `gold_per_hand_won` → `modifyGoldEarned`: `gold + context.handsWonThisBattle * value`
    - `gold_per_blackjack` → closure counter in `onHandEnd`, applied in `modifyGoldEarned`
    - `shop_discount` → `modifyRules`: `economy.shopPriceMultiplier *= (1 - value)`

3. `checkCondition(condition: BlessingCondition, context: ModifierContext): boolean` — Pure function that evaluates a condition against the current game state. Used by the builder to wrap effects in condition checks. Returns `true` if the condition is met.

    - `when_player_draws_rank` / `when_dealer_draws_rank` — These are **event-driven** conditions, not state conditions. They are handled differently: the `onCardDrawn` hook fires when a card is drawn, and the builder stores a "triggered" flag that the effect hook reads. The flag resets at hand start.
    - `hand_contains_pair` — Checks if any rank appears 2+ times in `context.playerHand.cards`.
    - `hand_is_flush` — Checks if all cards share the same suit.
    - `hand_all_same_color` — Hearts/diamonds = red, clubs/spades = black. All same.
    - `hand_size_equals` / `hand_size_gte` — Compare `context.playerHand.cards.length`.
    - `score_exactly` / `score_gte` — Compare `context.playerScore.value`.
    - `on_blackjack` — `context.playerScore.isBlackjack`.
    - `on_bust` — `context.playerScore.busted`.
    - `on_soft_hand` — `context.playerScore.soft`.
    - `on_win` / `on_loss` / `on_push` — Compare `playerScore` vs `dealerScore` using `compareHands`.
    - `on_dodge` — Set by the engine when a dodge occurs (flag in context).
    - `on_enemy_bust` — `context.dealerScore.busted`.
    - `on_win_no_damage_taken` — Player won AND `context.lastDamageTaken === 0`.
    - `hp_below_percent` / `hp_above_percent` — `playerState.hp / playerState.maxHp` vs `condition.value / 100`.
    - `enemy_hp_below_percent` — `enemyState.hp / enemyState.data.maxHp` vs `condition.value / 100`.
    - `gold_above` — `playerState.gold > condition.value`.
    - `consecutive_wins` / `consecutive_losses` — Compare against `context.consecutiveWins` / `context.consecutiveLosses`.
    - `first_hand_of_battle` — `context.handNumber === 1`.
    - `same_score_as_previous` — `context.playerScore.value === context.previousHandScore`.
    - `enemy_killed_by_dot` — `context.killCause === 'dot'`.
    - `enemy_killed_by_blackjack` — Enemy died and `context.playerScore.isBlackjack`.

    **How the builder composes conditional effects:**

    For state-based conditions (most of them), the builder wraps the effect's hook in a condition check:

        // Example: flat_damage_bonus with condition on_blackjack
        const originalHook = modifier.modifyDamageDealt;
        modifier.modifyDamageDealt = (damage, ctx) => {
          const base = originalHook ? originalHook(damage, ctx) : damage;
          if (checkCondition(effect.condition, ctx)) {
            return base + value;
          }
          return base;
        };

    For event-driven conditions (`when_player_draws_rank`, `when_dealer_draws_suit`, etc.), the builder adds an `onCardDrawn` hook that sets a per-hand closure flag when the event occurs, and the effect hook checks this flag:

        let triggered = false;
        // Add onCardDrawn hook
        const prevOnCardDrawn = modifier.onCardDrawn;
        modifier.onCardDrawn = (card, drawer, ctx) => {
          if (prevOnCardDrawn) prevOnCardDrawn(card, drawer, ctx);
          if (drawer === 'dealer' && card.rank === condition.rank) {
            triggered = true;
          }
        };
        // Add onHandStart to reset flag
        const prevOnHandStart = modifier.onHandStart;
        modifier.onHandStart = (ctx) => {
          if (prevOnHandStart) prevOnHandStart(ctx);
          triggered = false;
        };
        // Wrap the effect hook
        modifier.modifyDamageDealt = (damage, ctx) => {
          return triggered ? damage + value : damage;
        };

    **Implementation notes:**
    - Boolean effects use `value: 1` but the builder ignores the value.
    - `modifyDeck` hook is called in `createDeck()` after base generation, before shuffle.
    - `modifyCardValue` hook is called in `scoreHand()` per card.
    - `flexibleRanks` is handled in `scoreHand()` like aces: flexible ranks use face value as "high" and 1 as "low" with automatic demotion.
    - `onPush`, `onDodge`, `onEnemyBust` hooks fire from `resolveHand()` / `finishHand()`.
    - Interactive actions handled as new cases in `handlePlayerTurn()`.
    - `max_hp_bonus` uses a closure `applied: boolean` — permanent, never re-applied.

**New test file `tests/blessings.test.ts`:**

Tests for the builder and validation, organized by effect category. Use the `makeContext()` test helper pattern from `tests/equipment.test.ts` — construct a `ModifierContext` by hand with controlled values and call modifier hooks directly. Use `SeededRNG` for deterministic tests.

**Validation tests:**
- `validateBlessingDefinition` clamps out-of-range values (test several categories)
- `validateBlessingDefinition` caps effects array at 3
- `validateBlessingDefinition` adds fallback effect for empty array
- `validateBlessingDefinition` corrects invalid rank/suit parameters to defaults
- `validateBlessingDefinition` truncates name/description at 60 chars

**Basic builder tests:**
- `buildBlessingModifier` creates a modifier with correct id and source
- `buildBlessingModifier` with multiple effects on the same hook: both compose in order

**Card & Deck Manipulation tests:**
- `flexible_rank` with '10': modifyRules adds '10' to flexibleRanks
- `remove_rank_from_deck`: modifyDeck removes all cards of the rank
- `force_deck_ranks` with ['K', 'A']: modifyDeck keeps only kings and aces
- `extra_copies_of_rank`: modifyDeck adds correct number of cards
- `change_face_card_value`: modifyRules changes faceCardValue

**Scoring & Bust Manipulation tests:**
- `bust_save`: modifyBust returns `{ busted: false, effectiveScore: value }`
- `bust_threshold_bonus`: modifyRules increases bustThreshold
- `additional_blackjack_value` with 22: modifyRules adds 22 to additionalBlackjackValues
- `bust_card_value_halved`: modifyBust recalculates with halved last card, saves if under threshold
- `ignore_card_on_bust`: modifyBust recalculates without highest non-ace card
- `five_card_charlie`: modifyDamageDealt adds bonus when hand has 5+ cards

**Player Actions tests:**
- `enable_remove_card`: modifyRules sets canRemoveCard=true and cardRemovesPerHand
- `enable_peek`: modifyRules sets canPeek=true
- `extra_starting_cards`: modifyRules increases initialPlayerCards

**Dealer Manipulation tests:**
- `dealer_stands_on`: modifyRules sets dealer.standsOn
- `ties_favor_player`: modifyRules sets tieResolution='player'
- `dealer_hits_soft_17`: modifyRules sets standsOnSoft17=false

**Damage tests:**
- `flat_damage_bonus`: modifyDamageDealt returns damage + value
- `suit_damage_bonus`: modifyDamageDealt returns damage + (suit count * value)
- `face_card_damage_bonus`: damage increases by face card count * value
- `even_card_bonus`: damage increases by even card count * value
- `blackjack_bonus_damage`: adds value only when isBlackjack
- `damage_on_push`: onPush deals value damage to enemy
- `damage_per_card_in_hand`: damage scales with hand size
- `scaling_damage_per_win`: damage scales with handsWonThisBattle

**Defense tests:**
- `dodge_chance`: dodgeCheck over 1000 iterations returns true ~value*100% (±5%)
- `flat_damage_reduction`: modifyDamageReceived reduces damage
- `damage_cap`: modifyRules sets damageCap
- `thorns`: modifyRules sets thornsPercent
- `suit_damage_reduction`: reduces damage when 2+ cards of suit present

**Healing tests:**
- `heal_per_hand`: onHandStart increases player HP
- `heal_on_win`: onHandEnd heals when player won
- `heal_on_blackjack`: onHandEnd heals on blackjack
- `heal_on_dodge`: onDodge heals player
- `lifesteal`: onHandEnd heals % of lastDamageDealt
- `max_hp_bonus`: onBattleStart increases maxHp once, second call does not double

**DoT tests:**
- `damage_per_hand`: onHandStart decreases enemy HP
- `poison`: onHandStart deals escalating damage (value, value+1, value+2...)
- `damage_on_enemy_bust`: onEnemyBust deals value damage

**Economy tests:**
- `flat_gold_bonus`: modifyGoldEarned adds value
- `shop_discount`: modifyRules reduces shopPriceMultiplier
- `gold_per_hand_won`: modifyGoldEarned scales with handsWonThisBattle


### Milestone 2: LLM Integration Module

This milestone adds the Anthropic SDK dependency and creates the module that calls Claude Haiku 4.5 to generate blessings. At the end of this milestone, a standalone test can call the LLM with a wish and get back a valid BlessingDefinition. The module lives outside the engine directory since it performs I/O.

**Install dependency:**

Run `npm install @anthropic-ai/sdk` from the repository root. This adds the Anthropic TypeScript SDK, which provides the `Anthropic` client class for calling the Claude API.

**New file `src/llm/wish-generator.ts`:**

This file exports one function:

    export async function generateBlessing(
      wishText: string,
      context: WishContext,
      options?: { apiKey?: string; model?: string }
    ): Promise<BlessingDefinition>

Where `WishContext` is a plain object summarizing the player's current state (not the full `GameView`, to avoid coupling the LLM module to the engine's view type):

    interface WishContext {
      playerHp: number;
      playerMaxHp: number;
      playerGold: number;
      equippedItems: string[];        // names of equipped items
      consumables: string[];           // names of consumables in bag
      currentStage: number;
      bossDefeated: string;            // name of boss just defeated
      existingBlessings: string[];     // descriptions of prior blessings
      existingCurses: string[];        // descriptions of active curses
    }

The function does the following:

1. Creates an `Anthropic` client using `options?.apiKey ?? process.env.ANTHROPIC_API_KEY`.
2. Builds a system prompt that establishes the Genie persona, explains the game context, and instructs the LLM to use the `create_blessing` tool.
3. Builds a user message containing the player's context and wish text.
4. Calls `client.messages.create()` with model `options?.model ?? 'claude-haiku-4-5-20251001'`, the system prompt, user message, `max_tokens: 1024`, and the `create_blessing` tool definition.
5. Parses the tool_use response to extract the BlessingDefinition.
6. Validates the definition using `validateBlessingDefinition`.
7. Returns the validated definition.

If the LLM does not call the tool, or the API call fails, the function returns a sensible fallback blessing:

    { name: 'Minor Boon', description: 'A small gift from the Genie', effects: [{ type: 'flat_damage_bonus', value: 3 }] }

**The system prompt** (embedded as a string constant in the file):

    You are the Genie in a rogue-like blackjack game called Geniejack. A player has defeated a
    powerful boss and earned a Wish. Your role is to interpret their wish creatively and grant a
    blessing — a set of gameplay effects that last for the rest of the run.

    You must respond by calling the create_blessing tool exactly once. Choose effects that are
    thematically connected to the player's wish. Be creative but fair — blessings should be
    meaningful and fun but not game-breaking. Consider the player's current situation when
    choosing effects.

    Guidelines:
    - Choose 1 to 3 effects that thematically fit the wish.
    - Give the blessing a short, evocative name (under 40 characters).
    - Write a one-sentence description of what the blessing does.
    - If the wish is vague, interpret it generously but not overpoweringly.
    - If the wish references something not in the game, find the closest thematic match.
    - Scale effect values based on the stage (early = weaker, late = stronger).

**The `create_blessing` tool definition:**

The tool schema is large because it documents all 70+ effect types with descriptions so the LLM can choose appropriately. The schema is stored as a constant in the module, not hardcoded inline.

    {
      name: 'create_blessing',
      description: 'Grant a blessing to the player based on their wish. Choose 1-3 effects from the comprehensive API.',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Short evocative name for the blessing, under 40 characters.'
          },
          description: {
            type: 'string',
            description: 'One-sentence player-facing description of what the blessing does.'
          },
          effects: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    // Card & Deck
                    'flexible_rank', 'change_face_card_value', 'change_ace_high_value',
                    'suit_card_value_bonus', 'rank_value_override',
                    'remove_rank_from_deck', 'remove_suit_from_deck', 'force_deck_ranks',
                    'extra_copies_of_rank', 'no_reshuffle', 'multiple_decks',
                    // Scoring & Bust
                    'bust_threshold_bonus', 'additional_blackjack_value', 'bust_save',
                    'bust_card_value_halved', 'ignore_card_on_bust',
                    'five_card_charlie', 'soft_hand_bonus', 'exact_target_bonus',
                    // Player Actions
                    'enable_remove_card', 'enable_peek', 'enable_surrender', 'enable_split',
                    'extra_starting_cards', 'fewer_starting_cards',
                    'double_down_any_time', 'hit_after_double',
                    // Dealer
                    'dealer_stands_on', 'dealer_hits_soft_17', 'ties_favor_player',
                    'double_bust_favors_player', 'dealer_reveals_cards',
                    'dealer_extra_starting_card', 'dealer_fewer_starting_cards',
                    // Damage
                    'flat_damage_bonus', 'percent_damage_bonus', 'damage_multiplier',
                    'suit_damage_bonus', 'face_card_damage_bonus', 'ace_damage_bonus',
                    'even_card_bonus', 'odd_card_bonus', 'low_card_bonus', 'high_card_bonus',
                    'blackjack_bonus_damage', 'blackjack_damage_multiplier',
                    'damage_on_push', 'damage_per_card_in_hand',
                    'overkill_carry', 'scaling_damage_per_win', 'double_down_multiplier',
                    // Defense
                    'flat_damage_reduction', 'percent_damage_reduction', 'dodge_chance',
                    'thorns', 'damage_shield', 'damage_cap',
                    'suit_damage_reduction', 'reduce_bust_damage',
                    // Healing
                    'max_hp_bonus', 'heal_per_hand', 'heal_on_win', 'heal_on_blackjack',
                    'heal_on_dodge', 'lifesteal', 'heal_per_battle', 'heal_on_push',
                    // DoT
                    'damage_per_hand', 'poison', 'damage_on_enemy_bust',
                    // Economy
                    'flat_gold_bonus', 'percent_gold_bonus',
                    'gold_per_hand_won', 'gold_per_blackjack', 'shop_discount'
                  ],
                  description: `The type of effect. CARD & DECK: flexible_rank — make a rank flexible like aces (1 or face value), requires rank param; change_face_card_value — set face card value; change_ace_high_value — set ace high value; suit_card_value_bonus — cards of a suit worth +value more, requires suit; rank_value_override — cards of a rank worth value instead, requires rank; remove_rank_from_deck — remove all cards of rank from deck, requires rank; remove_suit_from_deck — remove all cards of suit, requires suit; force_deck_ranks — deck only contains these ranks, requires ranks array; extra_copies_of_rank — add value extra copies of rank to deck, requires rank; no_reshuffle — no reshuffling between hands (card counting); multiple_decks — use value decks. SCORING: bust_threshold_bonus — bust at 21+value instead of 21; additional_blackjack_value — score of value also counts as blackjack (e.g. 22); bust_save — on bust count hand as this score; bust_card_value_halved — if a card would bust you its value is halved; ignore_card_on_bust — on bust ignore highest non-ace card; five_card_charlie — 5+ cards without bust = bonus value damage; soft_hand_bonus — +value damage when hand is soft; exact_target_bonus — +value when hitting exactly 21. ACTIONS: enable_remove_card — new button to remove value cards per hand; enable_peek — new button to see next card; enable_surrender — surrender for half damage; enable_split — split pairs; extra_starting_cards — +value starting cards; fewer_starting_cards — -value starting cards; double_down_any_time — double down anytime; hit_after_double — keep hitting after double. DEALER: dealer_stands_on — dealer stands on value; dealer_hits_soft_17 — force dealer to hit soft 17; ties_favor_player — ties = player wins; double_bust_favors_player — both bust = player wins; dealer_reveals_cards — all dealer cards visible; dealer_extra_starting_card — dealer gets +value cards; dealer_fewer_starting_cards — dealer gets -value cards. DAMAGE: flat_damage_bonus — +value damage; percent_damage_bonus — +value% damage (0.3=30%); damage_multiplier — xvalue damage; suit_damage_bonus — +value per card of suit; face_card_damage_bonus — +value per face card; ace_damage_bonus — +value per ace; even_card_bonus — +value per even card; odd_card_bonus — +value per odd card; low_card_bonus — +value per 2-6 card; high_card_bonus — +value per 7-10 card; blackjack_bonus_damage — +value on blackjack; blackjack_damage_multiplier — xvalue on blackjack; damage_on_push — deal value on tie; damage_per_card_in_hand — +value per card in hand; overkill_carry — value% excess damage carries; scaling_damage_per_win — +value per hand won; double_down_multiplier — set DD multiplier. DEFENSE: flat_damage_reduction — -value incoming; percent_damage_reduction — -value% incoming; dodge_chance — value% dodge; thorns — reflect value% back; damage_shield — absorb first value damage per battle; damage_cap — max value damage per hand; suit_damage_reduction — -value% if 2+ cards of suit; reduce_bust_damage — -value% bust damage. HEALING: max_hp_bonus — +value max HP; heal_per_hand — heal value per hand; heal_on_win — heal value on win; heal_on_blackjack — heal value on BJ; heal_on_dodge — heal value on dodge; lifesteal — heal value% of damage; heal_per_battle — heal value between battles; heal_on_push — heal value on tie. DOT: damage_per_hand — value damage to enemy per hand; poison — escalating damage starting at value; damage_on_enemy_bust — +value when enemy busts. ECONOMY: flat_gold_bonus — +value gold; percent_gold_bonus — +value% gold; gold_per_hand_won — +value per hand won; gold_per_blackjack — +value per BJ; shop_discount — value% off shop.`
                },
                value: {
                  type: 'number',
                  description: 'The numeric value for the effect. Use 1 for boolean effects (no_reshuffle, enable_peek, etc.). Ranges vary by type — values are clamped to safe ranges server-side.'
                },
                suit: {
                  type: 'string',
                  enum: ['hearts', 'diamonds', 'clubs', 'spades'],
                  description: 'Required for suit-based effects: suit_damage_bonus, suit_card_value_bonus, suit_damage_reduction, remove_suit_from_deck.'
                },
                rank: {
                  type: 'string',
                  enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
                  description: 'Required for rank-based effects: flexible_rank, rank_value_override, remove_rank_from_deck, extra_copies_of_rank.'
                },
                ranks: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
                  },
                  description: 'Required for force_deck_ranks. Array of ranks the deck should contain.'
                },
                condition: {
                  type: 'object',
                  description: 'Optional condition. If set, the effect only activates when the condition is met. Enables wishes like "when the dealer draws a 3, deal 10 damage" or "if you win without taking damage, heal 5".',
                  properties: {
                    type: {
                      type: 'string',
                      enum: [
                        'when_player_draws_rank', 'when_player_draws_suit',
                        'when_dealer_draws_rank', 'when_dealer_draws_suit',
                        'hand_contains_pair', 'hand_is_flush', 'hand_all_same_color',
                        'hand_size_equals', 'hand_size_gte', 'hand_contains_rank', 'hand_contains_suit',
                        'score_exactly', 'score_gte', 'on_blackjack', 'on_bust', 'on_soft_hand',
                        'on_win', 'on_loss', 'on_push', 'on_dodge', 'on_enemy_bust', 'on_win_no_damage_taken',
                        'hp_below_percent', 'hp_above_percent', 'enemy_hp_below_percent',
                        'gold_above', 'consecutive_wins', 'consecutive_losses',
                        'first_hand_of_battle', 'same_score_as_previous',
                        'enemy_killed_by_dot', 'enemy_killed_by_blackjack'
                      ],
                      description: 'The condition type. when_player/dealer_draws_rank/suit: triggers when that card is drawn. hand_contains_pair: hand has 2+ same rank. hand_is_flush: all same suit. hand_all_same_color: all red or all black. hand_size_equals/gte: hand card count. hand_contains_rank/suit: hand has card of rank/suit. score_exactly/gte: player score check. on_blackjack/bust/soft_hand: scoring state. on_win/loss/push/dodge/enemy_bust: outcome. on_win_no_damage_taken: won and took 0 damage. hp_below/above_percent: HP threshold (value is percent, e.g. 50 = 50%). enemy_hp_below_percent: enemy HP check. gold_above: gold threshold. consecutive_wins/losses: streak check. first_hand_of_battle: hand #1. same_score_as_previous: same score as last hand. enemy_killed_by_dot: kill via poison/damage_per_hand. enemy_killed_by_blackjack: kill on BJ hand.'
                    },
                    value: {
                      type: 'number',
                      description: 'Numeric param for conditions that need it (score_exactly, hp_below_percent as 0-100, consecutive_wins count, hand_size value, gold_above amount).'
                    },
                    rank: {
                      type: 'string',
                      enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
                      description: 'For rank-based conditions (when_player/dealer_draws_rank, hand_contains_rank).'
                    },
                    suit: {
                      type: 'string',
                      enum: ['hearts', 'diamonds', 'clubs', 'spades'],
                      description: 'For suit-based conditions (when_player/dealer_draws_suit, hand_contains_suit).'
                    }
                  },
                  required: ['type']
                }
              },
              required: ['type', 'value']
            }
          }
        },
        required: ['name', 'description', 'effects']
      }
    }

**The user message** is constructed from the `WishContext`:

    The player says: "{wishText}"

    Current situation:
    - HP: {playerHp}/{playerMaxHp}
    - Gold: {playerGold}
    - Equipment: {equippedItems joined by ', ' or 'none'}
    - Consumables: {consumables joined by ', ' or 'none'}
    - Stage: {currentStage} (just defeated {bossDefeated})
    - Existing blessings: {existingBlessings joined by ', ' or 'none'}
    - Active curses: {existingCurses joined by ', ' or 'none'}

**Helper function `buildWishContext(view: GameView): WishContext`** — also exported from this file. Converts a `GameView` (which both CLI and GUI have access to) into the simpler `WishContext` structure. This extracts equipment names from `view.player.equipment`, consumable names from `view.player.consumables`, blessing descriptions from `view.player.wishes`, and curse names from `view.player.wishes`.

**Testing the LLM module**: Create `tests/wish-generator.test.ts`. Since unit tests should not make real API calls, test the non-API parts:

- `buildWishContext` correctly extracts data from a mock GameView
- The fallback blessing is returned on API error (mock the Anthropic client to throw)
- A valid tool_use response is correctly parsed into a BlessingDefinition

For the mock test, construct a fake API response object that matches the shape of `client.messages.create()` output with a `tool_use` content block, and verify the parsing logic extracts the correct definition. Use dependency injection: the `generateBlessing` function accepts an optional `client` parameter (or the Anthropic class is instantiated internally, and we mock the module for testing).

Alternatively, since the function has a fallback path, testing that the function handles malformed responses gracefully (missing tool_use, wrong tool name, missing fields) covers the important safety paths.


### Milestone 3: Engine Integration

This milestone wires the blessing system into the game engine, including new modifier hooks, new player actions for interactive blessings, and new game rules. At the end, passing a `BlessingDefinition` in the `enter_wish` action produces a real Modifier that affects gameplay. Interactive blessings add new action buttons during `player_turn`. Run `npm run test` and observe all existing tests still pass plus new engine-level blessing tests.

**Changes to `src/engine/types.ts`:**

The type changes described in Milestone 1 are applied here: `BlessingEffectType`, `BlessingEffect`, `BlessingDefinition` types added; `Wish` gains `blessing: Modifier | null`; `enter_wish` action gains optional `blessing?: BlessingDefinition`; `genie` view gains `blessingName` and `blessingDescription`; new player action types (`remove_card`, `peek`, `surrender`); new `Modifier` hooks (`modifyDeck`, `modifyCardValue`, `onPush`, `onDodge`, `onEnemyBust`); new `GameRules` fields (scoring.flexibleRanks, scoring.rankValueOverrides, actions.canRemoveCard, actions.cardRemovesPerHand, actions.canPeek, actions.canDoubleDownAnyTime, actions.canHitAfterDouble, deck.removedRanks, deck.removedSuits, deck.forcedRanks, deck.extraCopies, damage.thornsPercent, damage.damageShield, damage.damageCap, damage.overkillCarryPercent); new `ModifierContext` fields (lastDamageDealt, handsWonThisBattle, peekedCard, cardRemovesUsed); 40-character limit on wish text.

**Changes to `src/engine/genie.ts`:**

Import `BlessingDefinition` from types and `validateBlessingDefinition`, `buildBlessingModifier` from blessings. Update `storeBlessingWish`:

    export function storeBlessingWish(
      encounter: GenieEncounter,
      text: string,
      blessingDef?: BlessingDefinition
    ): Wish {
      encounter.blessingText = text;
      let blessing: Modifier | null = null;
      if (blessingDef) {
        const validated = validateBlessingDefinition(blessingDef);
        blessing = buildBlessingModifier(validated);
      }
      return {
        blessingText: text,
        blessing,
        curse: encounter.curseModifier,
        bossName: encounter.bossName,
      };
    }

**Changes to `src/engine/modifiers.ts`:**

In the `collectModifiers` function, after the section that collects wish curses, add a parallel section that collects wish blessings:

    // Player wish blessings (blessings are positive modifiers for the player)
    for (const wish of playerState.wishes) {
      if (wish.blessing) {
        playerModifiers.push(wish.blessing);
      }
    }

This is placed alongside the curse collection loop, not inside it, for clarity.

**Changes to `src/engine/game.ts`:**

In the `handleGenie` method, pass the blessing definition from the action:

    private handleGenie(action: PlayerAction): ActionResult {
      if (action.type !== 'enter_wish' || !this.genieEncounter) {
        return { success: false, message: 'Enter your wish', newPhase: 'genie' };
      }

      const wish = storeBlessingWish(this.genieEncounter, action.text, action.blessing);
      this.playerState.wishes.push(wish);
      this.log.push(`Blessing: "${wish.blessing?.name ?? 'none'}"`);
      this.log.push(`Curse: ${wish.curse?.name ?? 'none'}`);

      // ... rest is unchanged (HP reset, stage advance, etc.)
    }

In the `getView` method, update the genie view to include blessing info:

    genie: this.phase === 'genie' && this.genieEncounter ? {
      bossName: this.genieEncounter.bossName,
      curseDescription: this.genieEncounter.curseModifier.description,
      blessingEntered: this.genieEncounter.blessingText !== null,
      blessingName: null,
      blessingDescription: null,
    } : null,

The `blessingName` and `blessingDescription` fields will be null during the genie phase because the blessing hasn't been applied yet. After the wish is entered and the phase advances, the blessing info is available in `view.player.wishes`.

**Changes to `src/engine/cards.ts`:**

Update `createDeck()` to accept modifiers and apply `modifyDeck` hooks:

    export function createDeck(rng: SeededRNG, rules: GameRules, modifiers?: Modifier[]): Card[] {
      let cards: Card[] = [];
      // Apply deck rules (removedRanks, removedSuits, forcedRanks, extraCopies)
      for (let d = 0; d < rules.deck.numberOfDecks; d++) {
        for (const suit of SUITS) {
          if (rules.deck.removedSuits.includes(suit)) continue;
          for (const rank of RANKS) {
            if (rules.deck.removedRanks.includes(rank)) continue;
            if (rules.deck.forcedRanks && !rules.deck.forcedRanks.includes(rank)) continue;
            cards.push({ suit, rank });
          }
        }
      }
      // Extra copies
      for (const { rank, count } of rules.deck.extraCopies) {
        for (let i = 0; i < count; i++) {
          for (const suit of SUITS) cards.push({ suit, rank });
        }
      }
      // Apply modifier hooks
      if (modifiers) {
        for (const mod of modifiers) {
          if (mod.modifyDeck) cards = mod.modifyDeck(cards, rules);
        }
      }
      return rng.shuffle(cards);
    }

**Changes to `src/engine/scoring.ts`:**

Update `scoreHand()` to handle `flexibleRanks` and `rankValueOverrides`:

    // In the card value loop:
    for (const card of cards) {
      // Check rank value override first
      if (rules.scoring.rankValueOverrides[card.rank] !== undefined) {
        total += rules.scoring.rankValueOverrides[card.rank];
        continue;
      }
      // Check if rank is flexible (like aces)
      if (rules.scoring.flexibleRanks.includes(card.rank)) {
        const faceValue = ['J','Q','K'].includes(card.rank) ? rules.scoring.faceCardValue : parseInt(card.rank, 10);
        total += faceValue;  // Start high
        flexibles++;         // Track for demotion
        continue;
      }
      // Normal scoring
      ...
    }
    // Demote flexible ranks (same pattern as aces) when over bustThreshold

Also update `scoreHand()` to call `modifyCardValue` hooks on each card if provided.

**Changes to `src/engine/combat.ts`:**

Update `resolveHand()` to call new hooks:

    // After comparing hands:
    if (winner === 'push') {
      // Fire onPush hooks
      for (const mod of playerMods) {
        if (mod.onPush) mod.onPush(context);
      }
      // ... return push result
    }

    // After dealer busts:
    if (dealerScore.busted) {
      for (const mod of playerMods) {
        if (mod.onEnemyBust) mod.onEnemyBust(context);
      }
    }

    // After dodge check succeeds:
    if (dodged) {
      for (const mod of defenderMods) {
        if (mod.onDodge) mod.onDodge(context);
      }
    }

    // After applying damage to player — apply thorns:
    if (rules.damage.thornsPercent > 0 && result.damageTarget === 'player' && result.damageDealt > 0) {
      const thornsDamage = Math.floor(result.damageDealt * rules.damage.thornsPercent);
      enemyState.hp -= thornsDamage;
    }

    // Apply damage shield:
    if (rules.damage.damageShield > 0 && result.damageTarget === 'player') {
      // Track remaining shield per battle (stored on engine)
      damage = Math.max(0, damage - remainingShield);
      remainingShield -= (originalDamage - damage);
    }

    // Apply damage cap:
    if (rules.damage.damageCap !== null && result.damageTarget === 'player') {
      damage = Math.min(damage, rules.damage.damageCap);
    }

**Changes to `src/engine/game.ts` — Interactive Actions:**

Add new cases to `handlePlayerTurn()` for interactive blessing actions:

    // Remove card action
    if (action.type === 'remove_card') {
      const rules = this.getModifiedRules();
      if (!rules.actions.canRemoveCard) {
        return { success: false, message: 'Cannot remove cards', newPhase: this.phase };
      }
      if (this.cardRemovesUsed >= rules.actions.cardRemovesPerHand) {
        return { success: false, message: 'No removes remaining', newPhase: this.phase };
      }
      if (action.cardIndex < 0 || action.cardIndex >= this.combatState.playerHand.cards.length) {
        return { success: false, message: 'Invalid card index', newPhase: this.phase };
      }
      if (this.combatState.playerHand.cards.length <= 1) {
        return { success: false, message: 'Cannot remove last card', newPhase: this.phase };
      }
      this.combatState.playerHand.cards.splice(action.cardIndex, 1);
      this.cardRemovesUsed++;
      this.log.push(`Removed a card from hand`);
      return { success: true, message: 'Card removed', newPhase: 'player_turn' };
    }

    // Peek action
    if (action.type === 'peek') {
      const rules = this.getModifiedRules();
      if (!rules.actions.canPeek || this.hasPeeked) {
        return { success: false, message: 'Cannot peek', newPhase: this.phase };
      }
      const nextCard = this.combatState.deck[this.combatState.deckIndex];
      this.hasPeeked = true;
      this.peekedCard = nextCard;
      this.log.push(`Peeked: ${cardToString(nextCard)}`);
      return { success: true, message: `Next card: ${cardToString(nextCard)}`, newPhase: 'player_turn' };
    }

    // Surrender action
    if (action.type === 'surrender') {
      const rules = this.getModifiedRules();
      if (!rules.actions.canSurrender) {
        return { success: false, message: 'Cannot surrender', newPhase: this.phase };
      }
      // Player takes half of dealer's potential damage, hand ends
      // ... implementation: auto-lose but take half damage
      return this.finishHandWithSurrender();
    }

Update `getAvailableActions()` in the `player_turn` case to include new actions when enabled:

    case 'player_turn':
      actions.push({ type: 'hit' });
      actions.push({ type: 'stand' });
      if (rules.actions.canDoubleDown && (this.firstActionInHand || rules.actions.canDoubleDownAnyTime) && !this.combatState?.doubledDown) {
        actions.push({ type: 'double_down' });
      }
      if (rules.actions.canRemoveCard && this.cardRemovesUsed < rules.actions.cardRemovesPerHand && this.combatState && this.combatState.playerHand.cards.length > 1) {
        actions.push({ type: 'remove_card', cardIndex: -1 }); // -1 = placeholder, UI shows per-card buttons
      }
      if (rules.actions.canPeek && !this.hasPeeked) {
        actions.push({ type: 'peek' });
      }
      if (rules.actions.canSurrender && this.firstActionInHand) {
        actions.push({ type: 'surrender' });
      }
      break;

Add new instance variables to `GameEngine`:

    private cardRemovesUsed: number = 0;    // Reset per hand
    private hasPeeked: boolean = false;      // Reset per hand
    private peekedCard: Card | null = null;  // Reset per hand
    private handsWonThisBattle: number = 0;  // Reset per battle
    private lastDamageDealt: number = 0;     // Set after each hand
    private remainingDamageShield: number = 0; // Reset per battle

These are reset at the appropriate lifecycle points (hand start, battle start).

Update `makeContext()` to include the new fields:

    private makeContext(): ModifierContext {
      return {
        ...existing fields...,
        lastDamageDealt: this.lastDamageDealt,
        handsWonThisBattle: this.handsWonThisBattle,
        peekedCard: this.peekedCard,
        cardRemovesUsed: this.cardRemovesUsed,
      };
    }

Also update `handlePlayerTurn` for `hit_after_double` — if the rule is enabled and the player has doubled down, allow hitting instead of auto-finishing.

Update the `getModifiedRules` call in `initCombat` to pass modifiers to `createDeck` for deck manipulation hooks.

**Changes to `src/engine/combat.ts` — onCardDrawn hook:**

Every place a card is drawn must fire `onCardDrawn` hooks. Update `playerHit`, `dealInitialCards`, and `dealerPlay` to accept modifiers and fire the hook:

    // In playerHit:
    export function playerHit(combat: CombatState, modifiers?: Modifier[], context?: ModifierContext): CombatState {
      const result = { ...combat, playerHand: { cards: [...combat.playerHand.cards] } };
      const card = drawCard(result);
      result.playerHand.cards.push(card);
      // Fire onCardDrawn for player modifiers
      if (modifiers && context) {
        for (const mod of modifiers) {
          if (mod.onCardDrawn) mod.onCardDrawn(card, 'player', context);
        }
      }
      return result;
    }

    // Similarly in dealInitialCards for both player and dealer cards,
    // and in dealerPlay for each dealer card drawn.

This is a significant refactoring of combat.ts — every draw function gains optional modifier/context params. The game.ts calls must be updated to pass these through.

**Conditional tracking in `GameEngine`:**

Add tracking variables:

    private consecutiveWins: number = 0;
    private consecutiveLosses: number = 0;
    private previousHandScore: number | null = null;
    private lastDamageTaken: number = 0;
    private killCause: 'hand_damage' | 'dot' | null = null;

Update at appropriate lifecycle points:
- `finishHand()`: After resolving, update `consecutiveWins`/`consecutiveLosses` based on winner. Store `previousHandScore`. Track `lastDamageTaken`. Set `killCause` based on how enemy died (hand damage vs DoT from `tickActiveEffects`).
- `handlePreHand()`: Reset per-hand trackers (`cardRemovesUsed`, `hasPeeked`, `peekedCard`).
- `endBattle()`: Reset per-battle trackers (`consecutiveWins`, `consecutiveLosses`, `handsWonThisBattle`, `remainingDamageShield`, `previousHandScore`, `killCause`).

**Changes to `src/engine/modifiers.ts`:**

Update `deepCloneRules` to handle new array/object fields:

    function deepCloneRules(rules: GameRules): GameRules {
      return {
        scoring: {
          ...rules.scoring,
          additionalBlackjackValues: [...rules.scoring.additionalBlackjackValues],
          flexibleRanks: [...rules.scoring.flexibleRanks],
          rankValueOverrides: { ...rules.scoring.rankValueOverrides },
        },
        // ... other sections with new array fields
        deck: {
          ...rules.deck,
          removedRanks: [...rules.deck.removedRanks],
          removedSuits: [...rules.deck.removedSuits],
          forcedRanks: rules.deck.forcedRanks ? [...rules.deck.forcedRanks] : null,
          extraCopies: rules.deck.extraCopies.map(e => ({ ...e })),
        },
        // ... rest unchanged
      };
    }

Update `getDefaultRules` to include default values for all new fields.

**Serialization considerations:**

The `SerializedGameState` stores `wishes: Wish[]` which already includes the full `Wish` object. Since `Modifier` objects contain functions (hooks), they cannot be serialized to JSON directly. However, the existing serialization approach uses the replay system: `fromSerialized` replays from seed + action log. Since the `enter_wish` action now includes the `BlessingDefinition` (which is pure data, no functions), the replay system reconstructs blessings correctly. The new action types (`remove_card`, `peek`, `surrender`) are also pure data and replay correctly. No changes needed to serialization.

**Test updates:**

Update `tests/genie.test.ts`:
- Update the "blessing has no mechanical effect" test to instead test that passing a BlessingDefinition creates a blessing modifier.
- Add tests for `storeBlessingWish` with a BlessingDefinition.
- Add test for 40-character wish text truncation.

Update `tests/full-game.test.ts`:
- Add a test that plays through a genie encounter with a BlessingDefinition and verifies the blessing modifier is collected and affects damage.
- Add a test for interactive blessings: enable_remove_card grants the action, removing a card reduces hand size.
- Add a test for deck manipulation: force_deck_ranks restricts the deck, verifying only allowed cards appear.


### Milestone 4: CLI and GUI Integration

This milestone wires the LLM call into both UI layers AND adds interactive blessing UI elements (remove card, peek, surrender buttons). At the end, both `npm run dev` and `npm run dev:gui` support the full wish flow with LLM-generated blessings, and interactive blessings show new action buttons during `player_turn`.

**CLI changes (`src/cli/index.ts`):**

The main game loop must become async-aware for the genie phase. Currently, the loop calls `game.performAction(action)` synchronously. For the genie phase:

1. The input handler returns `{ type: 'enter_wish', text: '...' }` as before.
2. Before sending the action to the engine, the CLI calls `generateBlessing()` from `src/llm/wish-generator.ts`.
3. The CLI displays "The Genie ponders your wish..." while waiting.
4. When the blessing is returned, the CLI adds it to the action: `action.blessing = blessingDef`.
5. The CLI displays the blessing name and description.
6. The action is sent to the engine.

The change is localized: after `const action = await input.promptAction(...)`, if the action is `enter_wish`, intercept it, call the LLM, attach the result, then proceed. Pseudocode:

    const action = await input.promptAction(view.availableActions, view.phase);

    if (action.type === 'enter_wish') {
      console.log('The Genie ponders your wish...');
      const wishContext = buildWishContext(view);
      const blessingDef = await generateBlessing(action.text, wishContext);
      action.blessing = blessingDef;
      console.log(`Blessing granted: ${blessingDef.name} — ${blessingDef.description}`);
    }

    game.performAction(action);

If the `ANTHROPIC_API_KEY` environment variable is not set, `generateBlessing` returns the fallback blessing. The CLI should note this: "No API key set — using default blessing."

**CLI display changes (`src/cli/display.ts`):**

In the Wishes section, add blessing display. Currently the display shows curses only:

    if (view.player.wishes.length > 0) {
      const curses = view.player.wishes.filter(w => w.curse).map(w => w.curse!.name).join(', ');
      if (curses) lines.push(`Curses: ${curses}`);
    }

Add blessings display:

    if (view.player.wishes.length > 0) {
      const blessings = view.player.wishes
        .filter(w => w.blessing)
        .map(w => w.blessing!.name)
        .join(', ');
      if (blessings) lines.push(`Blessings: ${blessings}`);
      const curses = view.player.wishes
        .filter(w => w.curse)
        .map(w => w.curse!.name)
        .join(', ');
      if (curses) lines.push(`Curses: ${curses}`);
    }

**GenieScreen wish text limit:** The textarea enforces a 40-character max. Add `maxLength={40}` to the textarea element and show a character counter (`${wishText.length}/40`).

**GUI changes (`src/gui/screens/GenieScreen.tsx`):**

The GenieScreen needs three states:

1. **Entering** — The textarea (40 char max) and "Grant Wish" button (current behavior).
2. **Loading** — A loading indicator while the LLM generates the blessing. The "Grant Wish" button is disabled and shows "Granting..." or similar.
3. **Result** — The blessing name and description are displayed, with a "Continue" button to advance.

Add local state:

    const [loading, setLoading] = useState(false);
    const [blessingResult, setBlessingResult] = useState<BlessingDefinition | null>(null);

On "Grant Wish" click:

    async function handleGrantWish() {
      setLoading(true);
      const wishContext = buildWishContext(view);
      const blessingDef = await generateBlessing(wishText, wishContext);
      setBlessingResult(blessingDef);
      setLoading(false);
    }

On "Continue" click (after blessing is shown):

    function handleContinue() {
      onAction({ type: 'enter_wish', text: wishText, blessing: blessingResult ?? undefined });
    }

The render logic:

- If `loading`: show a spinner or "The Genie ponders your wish..." text, disable the textarea and button.
- If `blessingResult`: show the blessing name, description, and list of effects in a panel. Show the "Continue" button.
- Otherwise: show the textarea and "Grant Wish" button (current behavior).

**API key for the GUI:**

The GUI runs in the browser via Vite. The Anthropic SDK cannot be used directly in the browser (it requires a server-side proxy or the API key would be exposed). Two approaches:

1. **Vite proxy approach:** Add a simple Vite middleware that proxies `/api/wish` requests to the Anthropic API. The `vite.config.ts` configures a server plugin that intercepts POST requests to `/api/wish`, reads the `ANTHROPIC_API_KEY` from `process.env`, and forwards the request to the Anthropic API.

2. **Direct fetch approach:** Use `fetch` with the Anthropic REST API directly from the browser. This exposes the API key in the browser, but since this is a local development game (not deployed), this is acceptable for prototyping. The API key is injected via Vite's `define` config from `process.env.ANTHROPIC_API_KEY`.

The plan uses approach 1 (Vite proxy) because it keeps the API key server-side and is the correct practice. The proxy is a small addition to `vite.config.ts`.

**New file `src/llm/wish-api.ts`:**

A thin wrapper used by the GUI to call the blessing generation endpoint:

    export async function fetchBlessing(
      wishText: string,
      context: WishContext
    ): Promise<BlessingDefinition> {
      const response = await fetch('/api/wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishText, context }),
      });
      if (!response.ok) {
        return { name: 'Minor Boon', description: 'A small gift', effects: [{ type: 'flat_damage_bonus', value: 3 }] };
      }
      return response.json();
    }

**Changes to `vite.config.ts`:**

Add a server plugin that handles `/api/wish` POST requests. The plugin reads the request body, calls `generateBlessing` from `src/llm/wish-generator.ts` (which runs server-side in the Vite dev server's Node process), and returns the BlessingDefinition as JSON. This requires that `@anthropic-ai/sdk` is importable in the Vite server context, which it is because it's a Node dependency.

    // In vite.config.ts, add to plugins array:
    {
      name: 'wish-api',
      configureServer(server) {
        server.middlewares.use('/api/wish', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { wishText, context } = JSON.parse(body);
              const { generateBlessing } = await import('./src/llm/wish-generator.js');
              const blessing = await generateBlessing(wishText, context);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(blessing));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to generate blessing' }));
            }
          });
        });
      },
    }


**Interactive Blessing Buttons in Combat UI (`src/gui/screens/BattleScreen.tsx`):**

When blessings grant interactive actions (remove_card, peek, surrender), new buttons appear during `player_turn`. These buttons are positioned **above the dealer's card area**, mirroring the hit/stand/double_down buttons from the player's perspective. This creates a visual hierarchy:

    ┌──────────────────────────────────────────┐
    │        [Remove Card] [Peek] [Surrender]  │  ← Blessing actions (above dealer)
    │                                          │
    │            Dealer's Cards                │
    │           [?] [K♠] [7♥]                  │
    │                                          │
    │         ─── versus ───                   │
    │                                          │
    │           Player's Cards                 │
    │         [A♥] [J♦] [3♣]                   │
    │                                          │
    │          [Hit] [Stand] [DD]              │  ← Standard actions (below player)
    └──────────────────────────────────────────┘

The blessing action buttons:
- Have a distinct visual style (golden/amber border, slightly different shape) to differentiate from standard actions.
- Only appear when the corresponding blessing is active (the engine includes them in `availableActions`).
- "Remove Card" needs special handling: when clicked, it enters a "select card" mode where the player taps a card in their hand to remove it. Show a tooltip "Select a card to remove" and highlight cards as clickable.
- "Peek" shows the next card as a tooltip or overlay for a few seconds, then hides it.
- "Surrender" shows a confirmation dialog since it ends the hand.

**CLI interactive actions (`src/cli/display.ts` and `src/cli/input.ts`):**

The CLI displays blessing actions alongside standard actions. For remove_card, the CLI prompts "Which card to remove? (1-N):" and the player enters a number. For peek, the CLI displays the peeked card. For surrender, a simple confirmation.

### Milestone 5: Full Integration Testing and Polish

This milestone ensures everything works end-to-end and handles edge cases. Given the scope of the refactoring (new hooks, new actions, conditionals, deck manipulation), this milestone is critical.

**Integration tests (add to `tests/full-game.test.ts`):**

- "Blessing modifier affects damage in combat": Create a game, reach genie, submit `enter_wish` with a `flat_damage_bonus` blessing definition, then play a hand and verify the damage dealt is increased by the blessing amount. This test uses a controlled seed and manual actions, not autoPlay, so we can inspect intermediate state.

- "Blessing persists across battles": After receiving a blessing, play several battles and verify the modifier continues to apply.

- "Blessing and curse stack correctly": Create a wish with both a blessing (flat damage bonus) and a curse (Strix: +5 incoming on BJ), and verify both are collected by `collectModifiers` and both affect the outcome.

- "Interactive blessing — remove card": Grant `enable_remove_card` blessing, verify the `remove_card` action appears in `availableActions`, use it, verify hand size decreases.

- "Interactive blessing — peek": Grant `enable_peek` blessing, use peek action, verify peeked card info is returned, verify can't peek twice.

- "Interactive blessing — surrender": Grant `enable_surrender` blessing, use surrender, verify hand ends with reduced damage.

- "Deck manipulation — force_deck_ranks": Grant blessing with `force_deck_ranks: ['K', 'A']`, verify all dealt cards are only kings and aces.

- "Deck manipulation — remove_rank_from_deck": Grant blessing removing '5', verify no 5s appear in dealt hands.

- "Scoring — additional_blackjack_value 22": Grant blessing where 22 = blackjack, get a hand totaling 22, verify it's blackjack not bust.

- "Scoring — flexible_rank": Grant blessing making 10s flexible, verify 10s can be counted as 1 or 10 in scoring.

- "Scoring — bust_card_value_halved": Grant blessing, draw a card that would bust, verify the card's value is halved and bust is prevented.

- "Conditional — on_blackjack damage bonus": Grant `flat_damage_bonus` with condition `on_blackjack`, verify bonus only applies on blackjack hands.

- "Conditional — when_dealer_draws_rank": Grant effect with condition `when_dealer_draws_rank` for rank '3', verify effect triggers when dealer gets a 3.

- "Conditional — consecutive_wins": Grant effect with condition `consecutive_wins: 3`, verify it activates only after 3+ wins in a row.

- "Conditional — hp_below_percent": Grant effect with condition `hp_below_percent: 50`, verify it activates when HP drops below 50%.

- "onCardDrawn hook fires correctly": Grant a conditional blessing, verify `onCardDrawn` fires for both player hits and dealer plays.

- "autoPlay with blessings terminates": Update the existing autoPlay helper to optionally include a BlessingDefinition in the genie action, and verify games still terminate.

- "Replay with blessing is deterministic": Play a game with a blessing, get the replay, replay it, and verify the final state is identical.

- "Replay with interactive blessing is deterministic": Play a game using remove_card/peek actions, replay, verify identical state.

**Edge cases:**

- What if `ANTHROPIC_API_KEY` is not set? The `generateBlessing` function returns the fallback. Test this path.
- What if the LLM returns an empty effects array? The validator adds a fallback effect.
- What if the LLM returns nonsensical values? The validator clamps them.
- What if the LLM doesn't call the tool? The function returns the fallback.
- What if the API times out? The function catches the error and returns the fallback.
- What if a conditional blessing has an invalid condition type? Validator strips it, effect becomes unconditional.
- What if force_deck_ranks removes all cards? Validator ensures at least 2 ranks remain.
- What if remove_card is used on last card? Engine prevents it (min 1 card).
- What if multiple blessings grant conflicting rules (e.g., two different dealer_stands_on values)? Last one wins (modifier pipeline applies in order).
- What if a conditional effect's event never fires? Effect simply never activates (harmless).

**GenieScreen CSS updates (`src/gui/screens/GenieScreen.module.css`):**

Add styles for:
- `.loading` — a pulsing animation for the "pondering" state
- `.blessingResult` — a golden-bordered panel showing the blessing name and description
- `.effectList` — a list of individual effects with appropriate styling
- `.charCounter` — character counter for the 40-char wish text limit

**BattleScreen CSS updates (`src/gui/screens/BattleScreen.module.css`):**

Add styles for:
- `.blessingActions` — container for interactive blessing buttons, positioned above dealer area
- `.blessingButton` — golden/amber styled button for blessing actions
- `.cardSelectMode` — overlay/highlight when player is selecting a card to remove
- `.peekedCard` — tooltip/overlay showing the peeked next card

**PlayerStatus component (`src/gui/components/PlayerStatus.tsx`):**

Update to show blessings alongside curses. Currently, curses are displayed as a list. Add a "Blessings" section that lists wish blessings with their names and descriptions, using a green/gold color instead of the red used for curses. Show conditional blessings with their trigger description (e.g., "Solar Fury: +8 damage (when blackjack)").


## Refactoring Scope

This feature requires significant refactoring of the engine. The following files require changes:

**Core engine files that need refactoring:**
- `src/engine/types.ts` — New types (BlessingEffectType, BlessingConditionType, BlessingEffect, BlessingCondition, BlessingDefinition), extended Wish, extended PlayerAction (3 new action types), extended Modifier (5 new hooks), extended ModifierContext (8 new fields), extended GameRules (15+ new fields across scoring, actions, deck, damage).
- `src/engine/game.ts` — New instance variables (10+), new action handlers (remove_card, peek, surrender), new tracking logic (consecutiveWins, killCause, previousHandScore, etc.), lifecycle resets, modifier passing to combat functions.
- `src/engine/combat.ts` — All draw functions gain modifier/context params for `onCardDrawn` hook. `resolveHand` gains `onPush`, `onDodge`, `onEnemyBust` hook calls. Thorns, damage shield, damage cap logic.
- `src/engine/cards.ts` — `createDeck` gains rules-based filtering (removedRanks, removedSuits, forcedRanks, extraCopies) and `modifyDeck` hook support.
- `src/engine/scoring.ts` — `scoreHand` gains `flexibleRanks` support (demotion like aces), `rankValueOverrides` support, and optional `modifyCardValue` hook calls.
- `src/engine/modifiers.ts` — `getDefaultRules` gains all new default fields. `deepCloneRules` handles new array/object fields. `collectModifiers` collects blessing modifiers.
- `src/engine/genie.ts` — Updated `storeBlessingWish` to accept and build BlessingDefinition.

**New files:**
- `src/engine/blessings.ts` — `validateBlessingDefinition`, `buildBlessingModifier`, `checkCondition` (450+ lines)
- `src/llm/wish-generator.ts` — LLM integration, tool schema, prompt construction
- `src/llm/wish-api.ts` — GUI fetch wrapper
- `tests/blessings.test.ts` — Comprehensive blessing tests (80+ test cases)
- `tests/wish-generator.test.ts` — LLM module tests

**UI files:**
- `src/gui/screens/GenieScreen.tsx` — Loading state, result display, 40-char limit
- `src/gui/screens/BattleScreen.tsx` — Interactive blessing buttons above dealer
- `src/gui/components/PlayerStatus.tsx` — Blessing display
- `src/cli/index.ts` — LLM call, interactive action handling
- `src/cli/display.ts` — Blessing display, interactive action prompts
- `src/cli/input.ts` — New action types
- `vite.config.ts` — API proxy


## Concrete Steps

All commands are run from the repository root: `D:\rogue-like-black-jack`.

**Milestone 1:**

1. Edit `src/engine/types.ts` to add `BlessingEffectType` (70+ values), `BlessingConditionType` (30+ values), `BlessingEffect`, `BlessingCondition`, `BlessingDefinition` types, extend `Wish` with `blessing: Modifier | null`, extend the `enter_wish` action with `blessing?: BlessingDefinition` and 40-char text limit, add new PlayerAction types (`remove_card`, `peek`, `surrender`), add new Modifier hooks (`modifyDeck`, `modifyCardValue`, `onPush`, `onDodge`, `onEnemyBust`, `onCardDrawn`), extend `GameRules` with all new fields, extend `ModifierContext` with tracking fields. Update `GameView` genie property.
2. Create `src/engine/blessings.ts` with `validateBlessingDefinition`, `buildBlessingModifier`, and `checkCondition`.
3. Create `tests/blessings.test.ts` with comprehensive tests (80+ cases covering all categories).
4. Run `npm run test` from the repo root. The `Wish` type change requires updating `storeBlessingWish` in `src/engine/genie.ts` to add `blessing: null`. The new `GameRules` fields require updating `getDefaultRules` in `src/engine/modifiers.ts` and `deepCloneRules`.

Expected output:

    $ npm run test
    ...
    ✓ tests/blessings.test.ts (N tests)
    ...
    Test Files  15 passed
    Tests       XX passed

**Milestone 2:**

1. Run `npm install @anthropic-ai/sdk` from the repo root.
2. Create `src/llm/wish-generator.ts` with `generateBlessing`, `buildWishContext`, and the tool definition.
3. Create `tests/wish-generator.test.ts` with tests for `buildWishContext` and error handling.
4. Run `npm run test`. New tests pass.
5. Optionally, test with a real API call from the command line (not part of automated tests):

    $ ANTHROPIC_API_KEY=sk-ant-... npx tsx -e "
      import { generateBlessing } from './src/llm/wish-generator.js';
      const result = await generateBlessing('I wish for fire power', {
        playerHp: 45, playerMaxHp: 50, playerGold: 30,
        equippedItems: ['Flint Spear'], consumables: ['Health Potion'],
        currentStage: 2, bossDefeated: 'Ancient Strix',
        existingBlessings: [], existingCurses: ['Night Fang Curse'],
      });
      console.log(JSON.stringify(result, null, 2));
    "

    Expected: A JSON object with name, description, and 1-3 effects.

**Milestone 3:** (Significant refactoring milestone)

1. Apply all type changes to `src/engine/types.ts` — new types, new hooks, new GameRules fields, new ModifierContext fields, new PlayerAction types.
2. Update `src/engine/modifiers.ts` — `getDefaultRules` with all new fields, `deepCloneRules` with new arrays/objects, `collectModifiers` to collect blessings.
3. Update `src/engine/cards.ts` — `createDeck` with deck manipulation (removedRanks, removedSuits, forcedRanks, extraCopies, modifyDeck hook).
4. Update `src/engine/scoring.ts` — `scoreHand` with flexibleRanks, rankValueOverrides, modifyCardValue hook.
5. Update `src/engine/combat.ts` — `onCardDrawn` hook in all draw functions, `onPush`/`onDodge`/`onEnemyBust` in resolveHand, thorns/damageShield/damageCap logic.
6. Update `src/engine/genie.ts` — accept and build blessings via BlessingDefinition.
7. Update `src/engine/game.ts` — 10+ new instance variables, `handlePlayerTurn` for remove_card/peek/surrender, `getAvailableActions` for interactive blessings, `handleGenie` with blessing, `getView` with blessing info, lifecycle resets, modifier passing to combat, `makeContext` with new fields.
8. Update `tests/genie.test.ts` for new behavior.
9. Run `npm run test`. All tests pass.

**Milestone 4:**

1. Update `src/cli/index.ts` with LLM call, 40-char wish limit, interactive action handling.
2. Update `src/cli/display.ts` with blessing display and interactive action prompts.
3. Update `src/cli/input.ts` with new action types.
4. Create `src/llm/wish-api.ts` for GUI fetch wrapper.
5. Update `src/gui/screens/GenieScreen.tsx` with loading/result states and 40-char limit.
6. Update `src/gui/screens/BattleScreen.tsx` with interactive blessing buttons above dealer area.
7. Update `vite.config.ts` with API proxy.
8. Update `src/gui/components/PlayerStatus.tsx` to show blessings with conditional descriptions.
9. Test CLI: `ANTHROPIC_API_KEY=sk-ant-... npm run dev -- --seed=42`, play to genie, type a wish, observe blessing.
10. Test GUI: `ANTHROPIC_API_KEY=sk-ant-... npm run dev:gui`, play to genie, type a wish, observe loading then blessing.
11. Test interactive blessing in GUI: grant `enable_remove_card`, observe new button above dealer, test the card selection flow.

**Milestone 5:**

1. Add integration tests to `tests/full-game.test.ts` (20+ new tests covering blessings, interactivity, deck manipulation, conditionals, replays).
2. Add CSS styles for interactive buttons and blessing display.
3. Run `npm run test`. All tests pass.
4. Manual end-to-end verification via CLI and GUI, testing:
   - Passive blessings (damage, healing, defense)
   - Interactive blessings (remove card, peek, surrender)
   - Deck manipulation blessings (force ranks, remove suits)
   - Scoring blessings (bust threshold, additional blackjack, flexible ranks)
   - Conditional blessings (on_blackjack, when_dealer_draws_rank, hp_below_percent)
   - Dealer manipulation blessings (ties_favor_player, reveals_cards)


## Validation and Acceptance

**Engine-level acceptance** (verifiable via tests):
- Run `npm run test` and all tests pass, including the new `blessings.test.ts` (80+ tests) and `wish-generator.test.ts` files and updated `genie.test.ts` and `full-game.test.ts` (20+ new integration tests).
- The test "Blessing modifier affects damage in combat" demonstrates that a wish blessing changes actual damage dealt during a hand.
- The test "Replay with blessing is deterministic" demonstrates that replaying a game with blessings produces identical state.
- The test "Interactive blessing — remove card" demonstrates interactive blessings create new actions.
- The test "Deck manipulation — force_deck_ranks" demonstrates deck composition changes.
- The test "Conditional — on_blackjack damage bonus" demonstrates conditional effects.
- The test "Conditional — when_dealer_draws_rank" demonstrates event-driven conditionals.

**CLI acceptance** (verifiable by running the game):
- Run `ANTHROPIC_API_KEY=<key> npm run dev -- --seed=42`.
- Play through Stage 1 (3 regular enemies + Ancient Strix boss).
- At the Genie encounter, type a wish (max 40 chars) like "make me lucky".
- Observe: "The Genie ponders your wish..." followed by a blessing name and description.
- In the next battle, observe the blessing listed in the status display (e.g., "Blessings: Luck").
- The blessing's effects are visible in combat (increased damage, dodge, healing, etc. depending on what the LLM generated).
- If the blessing grants an interactive action (e.g., "remove a card"), the action appears in the action menu during player_turn.

**GUI acceptance** (verifiable by running the dev server):
- Run `ANTHROPIC_API_KEY=<key> npm run dev:gui`.
- Play to the Genie encounter.
- Type a wish (40 char limit, character counter shown) and click "Grant Wish".
- Observe: A loading state ("The Genie ponders...") replaces the input area.
- After 1-3 seconds, the blessing result appears with a name and description.
- Click "Continue" to advance.
- In the PlayerStatus panel, the blessing appears alongside curses.
- If the blessing grants interactive actions, golden buttons appear above the dealer's cards during player_turn.
- Test "Remove Card": button appears, clicking enters card selection mode, selecting a card removes it.
- Test "Peek": button appears, clicking shows the next card briefly.

**Fallback acceptance** (verifiable without an API key):
- Run `npm run dev -- --seed=42` (no API key).
- At the Genie, type a wish.
- Observe: "No API key — using default blessing" or similar, and the fallback "Minor Boon" blessing is applied.
- The game continues normally with the fallback blessing providing +3 flat damage.


## Idempotence and Recovery

All steps can be run multiple times safely:
- `npm install @anthropic-ai/sdk` is idempotent — reinstalling does nothing if already installed.
- File edits overwrite to the correct state.
- Tests are deterministic (seeded RNG, no real API calls in automated tests).
- The Vite proxy is stateless.
- If the LLM call fails mid-flow, the fallback blessing ensures the game can always continue.

If a milestone is interrupted partway through, pick up from the last test run. The test suite is the source of truth for what's working.


## Artifacts and Notes

**Example wishes and what the LLM should generate:**

"make me lucky" → **Luck**:

    {
      "name": "Luck",
      "description": "Fortune smiles upon you, doubling your blackjack odds.",
      "effects": [
        { "type": "additional_blackjack_value", "value": 22 },
        { "type": "bust_threshold_bonus", "value": 1 }
      ]
    }

"defense" → **Tank**:

    {
      "name": "Tank",
      "description": "Cards that would bust you have their value halved.",
      "effects": [
        { "type": "bust_card_value_halved", "value": 1 },
        { "type": "flat_damage_reduction", "value": 5 }
      ]
    }

"make me super strong" → **Overkill**:

    {
      "name": "Overkill",
      "description": "Hand value of 22 counts as blackjack. Unlimited power.",
      "effects": [
        { "type": "additional_blackjack_value", "value": 22 },
        { "type": "blackjack_damage_multiplier", "value": 2.5 }
      ]
    }

"make tens like aces" → **Double Standards**:

    {
      "name": "Double Standards",
      "description": "Tens are flexible like aces — count as 1 or 10.",
      "effects": [
        { "type": "flexible_rank", "value": 1, "rank": "10" }
      ]
    }

"remove a card from hand" → **Sleight of Hand** (interactive!):

    {
      "name": "Sleight of Hand",
      "description": "Remove one card from your hand each turn.",
      "effects": [
        { "type": "enable_remove_card", "value": 1 }
      ]
    }

"only kings and aces" → **Meta Planning** (deck manipulation):

    {
      "name": "Meta Planning",
      "description": "Your deck contains only kings and aces.",
      "effects": [
        { "type": "force_deck_ranks", "value": 1, "ranks": ["K", "A"] }
      ]
    }

"damage when dealer draws 3" → **Unlucky Three** (conditional):

    {
      "name": "Unlucky Three",
      "description": "When the dealer draws a 3, deal 10 bonus damage.",
      "effects": [
        { "type": "flat_damage_bonus", "value": 10, "condition": { "type": "when_dealer_draws_rank", "rank": "3" } }
      ]
    }

"heal when I win clean" → **Clean Victory** (conditional):

    {
      "name": "Clean Victory",
      "description": "Heal 8 HP when you win a hand without taking damage.",
      "effects": [
        { "type": "heal_on_win", "value": 8, "condition": { "type": "on_win_no_damage_taken" } }
      ]
    }

"I wish for fire power" → **Infernal Might**:

    {
      "name": "Infernal Might",
      "description": "Your attacks burn with the fury of desert flames.",
      "effects": [
        { "type": "flat_damage_bonus", "value": 8 },
        { "type": "suit_damage_bonus", "value": 3, "suit": "hearts" },
        { "type": "damage_per_hand", "value": 2 }
      ]
    }

This would produce a Modifier with:
- `modifyDamageDealt` returning `damage + 8 + (hearts count * 3)`
- `onHandStart` dealing 2 damage to the enemy

**Example BlessingDefinition (fallback when no API key):**

    {
      "name": "Minor Boon",
      "description": "A small gift from the Genie.",
      "effects": [
        { "type": "flat_damage_bonus", "value": 3 }
      ]
    }

**Modifier hook composition example** — when a blessing has two effects that both target `modifyDamageDealt`:

    // After processing flat_damage_bonus(8):
    let modifyDamageDealt = (damage, ctx) => damage + 8;

    // After processing suit_damage_bonus(3, 'hearts'):
    const prev = modifyDamageDealt;
    modifyDamageDealt = (damage, ctx) => {
      const d = prev(damage, ctx);
      const hearts = ctx.playerHand.cards.filter(c => c.suit === 'hearts').length;
      return d + hearts * 3;
    };

**Conditional composition example** — flat_damage_bonus that only applies on blackjack:

    // Builder creates:
    modifier.modifyDamageDealt = (damage, ctx) => {
      if (checkCondition({ type: 'on_blackjack' }, ctx)) {
        return damage + 10;
      }
      return damage;
    };

**Event-driven conditional example** — damage bonus when dealer draws a 3:

    let dealerDrew3 = false;
    modifier.onCardDrawn = (card, drawer, ctx) => {
      if (drawer === 'dealer' && card.rank === '3') dealerDrew3 = true;
    };
    modifier.onHandStart = (ctx) => { dealerDrew3 = false; };
    modifier.modifyDamageDealt = (damage, ctx) => {
      return dealerDrew3 ? damage + 10 : damage;
    };


## Interfaces and Dependencies

**External dependency:** `@anthropic-ai/sdk` — the official Anthropic TypeScript SDK. Provides the `Anthropic` class for calling the Messages API. Used only in `src/llm/wish-generator.ts`.

**Environment variable:** `ANTHROPIC_API_KEY` — required for LLM calls. When absent, the fallback blessing is used.

**Model:** `claude-haiku-4-5-20251001` — the LLM used for blessing generation. Fast and cost-effective for structured tool_use responses.

**New types in `src/engine/types.ts`:**

    // 70+ effect types organized by category (see Milestone 1 for full list)
    export type BlessingEffectType = 'flexible_rank' | 'change_face_card_value' | ... | 'shop_discount';

    // 30+ condition types for conditional effects
    export type BlessingConditionType = 'when_player_draws_rank' | ... | 'enemy_killed_by_blackjack';

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

    // Updated Wish:
    export interface Wish {
      blessingText: string;
      blessing: Modifier | null;
      curse: Modifier | null;
      bossName: string;
    }

    // Updated PlayerAction union (new members):
    | { type: 'enter_wish'; text: string; blessing?: BlessingDefinition }  // text max 40 chars
    | { type: 'remove_card'; cardIndex: number }
    | { type: 'peek' }
    | { type: 'surrender' }

    // New Modifier hooks (added to existing interface):
    modifyDeck?(deck: Card[], rules: GameRules): Card[];
    modifyCardValue?(card: Card, baseValue: number, context: ModifierContext): number;
    onPush?(context: ModifierContext): void;
    onDodge?(context: ModifierContext): void;
    onEnemyBust?(context: ModifierContext): void;
    onCardDrawn?(card: Card, drawer: 'player' | 'dealer', context: ModifierContext): void;

    // New ModifierContext fields:
    lastDamageDealt: number;
    lastDamageTaken: number;
    handsWonThisBattle: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    previousHandScore: number | null;
    peekedCard: Card | null;
    cardRemovesUsed: number;
    killCause: 'hand_damage' | 'dot' | null;

    // New GameRules fields (15+ across all sections — see Milestone 1 for details):
    scoring.flexibleRanks: Rank[];
    scoring.rankValueOverrides: Partial<Record<Rank, number>>;
    actions.canRemoveCard: boolean;
    actions.cardRemovesPerHand: number;
    actions.canPeek: boolean;
    actions.canDoubleDownAnyTime: boolean;
    actions.canHitAfterDouble: boolean;
    deck.removedRanks: Rank[];
    deck.removedSuits: Suit[];
    deck.forcedRanks: Rank[] | null;
    deck.extraCopies: { rank: Rank; count: number }[];
    damage.thornsPercent: number;
    damage.damageShield: number;
    damage.damageCap: number | null;
    damage.overkillCarryPercent: number;

**New exports from `src/engine/blessings.ts`:**

    export function validateBlessingDefinition(def: BlessingDefinition): BlessingDefinition;
    export function buildBlessingModifier(def: BlessingDefinition): Modifier;
    export function checkCondition(condition: BlessingCondition, context: ModifierContext): boolean;

**New exports from `src/llm/wish-generator.ts`:**

    export interface WishContext {
      playerHp: number;
      playerMaxHp: number;
      playerGold: number;
      equippedItems: string[];
      consumables: string[];
      currentStage: number;
      bossDefeated: string;
      existingBlessings: string[];
      existingCurses: string[];
    }

    export function buildWishContext(view: GameView): WishContext;
    export function generateBlessing(
      wishText: string,
      context: WishContext,
      options?: { apiKey?: string; model?: string }
    ): Promise<BlessingDefinition>;

**New exports from `src/llm/wish-api.ts`:**

    export function fetchBlessing(
      wishText: string,
      context: WishContext
    ): Promise<BlessingDefinition>;

**Updated export from `src/engine/genie.ts`:**

    export function storeBlessingWish(
      encounter: GenieEncounter,
      text: string,
      blessingDef?: BlessingDefinition
    ): Wish;

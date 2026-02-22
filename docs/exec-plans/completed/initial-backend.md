# Initial Backend & CLI Implementation for Geniejack

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This document must be maintained in accordance with `PLANS.md` at the repository root.


## Purpose / Big Picture

After this work is complete, a player (or a Claude agent) can launch a command-line program and play a full run of Geniejack — a rogue-like blackjack game — from start to finish. They will fight enemies across three stages of increasing difficulty, buy equipment and consumables between battles, defeat bosses, receive curses and store wish text from a Genie, and either die (rogue-like reset) or clear all three stages to win. Every outcome is fully deterministic: providing the same seed and the same sequence of inputs always produces the identical game. The CLI displays all game information in a compact, token-efficient format suitable for an AI agent to read and respond to.

To see it working, run `npm run dev -- --seed=42` from the repository root. The CLI will present the game state each turn, accept single-character commands, and advance through battles, shops, and genie encounters. Providing the same seed and the same inputs will always produce the same game.

The backend is implemented entirely in TypeScript with no game logic in the CLI layer. The CLI is a thin view-and-input shell that reads a GameView object from the engine and renders it. A future React frontend can consume the same engine interface with zero changes to game logic.

The Wish/Blessing system is intentionally half-implemented. The Genie appears after boss fights, the player can type a blessing wish into a text box, and that text is stored, but no LLM call or blessing effect is applied. Curses (which come from defeated bosses) are fully implemented. The modifier system is designed to expose every mechanical knob in the game — scoring thresholds, bust behavior, turn order, tie resolution, damage formulas, deck composition, and many more — so that a future Blessing implementation can compose arbitrary game-modifying effects by calling these same modifier hooks.


## Progress

- [x] Milestone 1: Project scaffolding, core types, seeded RNG, and card system.
- [x] Milestone 2: Scoring, modifier pipeline, equipment and consumable definitions.
- [x] Milestone 3: Combat resolution, combatant data, shop system, and genie system.
- [x] Milestone 4: Game controller, stage progression, and full game loop.
- [x] Milestone 5: CLI interface — token-efficient, fully playable.
- [x] Milestone 6: Comprehensive unit tests for every modifier and game mechanic.
- [x] Milestone 7: Documentation — CLI guide in `docs/product-specs/`.


## Surprises & Discoveries

(None yet — this section will be updated as implementation proceeds.)


## Decision Log

- Decision: Use Vitest as the test framework.
  Rationale: Vitest has native TypeScript support, fast execution, and a familiar Jest-compatible API. It avoids the need for ts-jest configuration and works out of the box with ESM.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Use a custom seeded RNG based on the mulberry32 algorithm rather than importing a library like `seedrandom`.
  Rationale: Mulberry32 is a well-known 32-bit PRNG that is simple to implement (roughly 10 lines), has no dependencies, and produces good-quality pseudo-random output. Keeping it in-house means zero external dependency for the core determinism guarantee. The algorithm takes a 32-bit integer seed and produces a sequence of floats in [0, 1). We will hash string seeds into 32-bit integers using a simple hash function.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Damage calculation when one side busts uses the winner's full hand value, not the difference.
  Rationale: DESIGN.md examples show "dealer 25, player 16, dealer takes 16 damage." If both are non-bust, damage is the difference ("dealer 21, player 18, player takes 3 damage"). This implies: when a bust occurs the bust side's effective score is treated as 0, so the damage equals winner_score minus 0, which is just the winner's score. When neither busts, damage is the difference. This interpretation is consistent with both examples.
  Date/Author: 2026-02-21 / Plan Author

- Decision: A battle consists of multiple blackjack hands played until one combatant reaches 0 HP. The deck is reshuffled between hands within a battle.
  Rationale: DESIGN.md describes health points and ongoing battles. Reshuffling between hands simplifies card counting concerns and keeps each hand independent. Reshuffling behavior is exposed as a modifier for future customization.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Three stages, three regular battles per stage, one boss per stage.
  Rationale: DESIGN.md says "after an arbitrary number of battles, the player visits a boss." Three battles provides a meaningful run length without excessive repetition. This count is exposed as a modifier (`progression.battlesPerStage`).
  Date/Author: 2026-02-21 / Plan Author

- Decision: Player starts with 50 HP. HP resets to max after each boss fight.
  Rationale: Matches DESIGN.md ("Health points are reset after every boss fight") and the boss example (50 HP boss suggests player has comparable health). Starting HP and max HP are exposed as modifiers.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Double bust is a push (0 damage to both sides) by default.
  Rationale: DESIGN.md does not specify this case. A push is the most neutral default and matches standard blackjack conventions. Exposed as a modifier for future customization.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Consumables can be used before each hand begins (pre-deal phase), not during a hand.
  Rationale: Keeps the hand resolution clean. The player sees their HP and available consumables before each hand and can choose to use items. This creates a simple decision point without complicating the hit/stand flow.
  Date/Author: 2026-02-21 / Plan Author

- Decision: The game engine exposes a state-machine interface where the frontend calls `getAvailableActions()` and `performAction(action)`. No game logic exists outside the engine.
  Rationale: Directly implements the Backend Sovereignty principle from `docs/design-docs/core-beliefs.md`. Both the CLI and a future React frontend consume the same interface.
  Date/Author: 2026-02-21 / Plan Author


## Outcomes & Retrospective

(To be written at completion.)


## Context and Orientation

This is a greenfield implementation. The repository currently contains only documentation files — no source code, no `package.json`, no `tsconfig.json`. The following files exist and are relevant:

- `CLAUDE.md` (repo root): Project overview, architecture constraints, documentation structure guidance. States that backend/UI separation, full determinism, and extreme modularity are non-negotiable.
- `PLANS.md` (repo root): Defines how to write and maintain ExecPlans. This document follows that specification.
- `DESIGN.md` (repo root): The game design document for Geniejack. Describes the core loop, combat system, equipment, consumables, wishes, and progression. This plan implements every system described in DESIGN.md.
- `docs/design-docs/core-beliefs.md`: Non-negotiable architectural pillar — Backend Sovereignty & Determinism. Requires seeded RNG, interface-driven access, and strict backend/frontend separation.
- `docs/product-specs/`: Currently empty. This plan will create a CLI guide here.
- `docs/exec-plans/active/`: Where this plan lives.

Key terms used throughout this plan:

- **Hand**: A single round of blackjack — cards are dealt, the player and dealer take turns, and a winner is determined. Damage is dealt based on the hand outcome.
- **Battle**: A sequence of hands against one enemy. The battle ends when either the player or the enemy reaches 0 HP.
- **Stage**: A group of battles followed by a boss fight. There are three stages in a full run.
- **Modifier**: A function or object that changes a game rule or hooks into a game event. Equipment, consumables, enemy abilities, and wishes all produce modifiers.
- **GameRules**: A plain object holding every configurable game parameter (bust threshold, damage formula, dealer behavior, etc.). Modifiers transform this object.
- **GameView**: A read-only snapshot of the game state that the frontend reads to render the display. Contains no methods, only data.
- **Action**: A command the player issues (hit, stand, buy item, etc.). The engine validates actions and advances the game state.
- **Seed**: A string or number that initializes the random number generator. Same seed + same actions = identical game.


## Plan of Work

The work is divided into seven milestones. Each milestone produces independently verifiable output. The milestones must be completed in order because each builds on the previous one.


### Milestone 1: Project Scaffolding, Core Types, Seeded RNG, and Card System

This milestone creates the TypeScript project from scratch, defines all core type definitions, implements the seeded random number generator, and builds the card/deck/hand system. At the end of this milestone, you can run a test that creates a seeded deck, draws cards, and verifies that the same seed produces the same sequence of cards every time.

**Project structure to create:**

    rogue-like-black-jack/
      package.json
      tsconfig.json
      vitest.config.ts
      src/
        engine/
          types.ts
          rng.ts
          cards.ts
        cli/
          (empty, created in Milestone 5)
      tests/
        rng.test.ts
        cards.test.ts

**package.json** must include:
- `"type": "module"` for ESM
- Dependencies: `typescript` (dev), `vitest` (dev), `tsx` (dev, for running TypeScript directly)
- Scripts: `"dev": "tsx src/cli/index.ts"`, `"test": "vitest run"`, `"test:watch": "vitest"`

**tsconfig.json** must target ES2022 with module NodeNext, strict mode enabled, outDir `dist/`, rootDir `.`, and include `src/**/*`.

**vitest.config.ts** is minimal — just imports `defineConfig` from vitest and exports default config.

**src/engine/types.ts** defines all type definitions used throughout the engine. This is the single source of truth for types. The following types must be defined here (full signatures are in the Interfaces and Dependencies section at the end of this plan):

- `Suit`: `'hearts' | 'diamonds' | 'clubs' | 'spades'`
- `Rank`: `'2' | '3' | ... | '10' | 'J' | 'Q' | 'K' | 'A'`
- `Card`: `{ suit: Suit; rank: Rank }`
- `Hand`: `{ cards: Card[] }`
- `HandScore`: `{ value: number; soft: boolean; busted: boolean; isBlackjack: boolean }`
- `EquipmentSlot`: `'weapon' | 'helm' | 'armor' | 'boots' | 'trinket'`
- `EquipmentTier`: `'cloth' | 'bronze' | 'iron'`
- `Equipment`: `{ id: string; name: string; slot: EquipmentSlot; tier: EquipmentTier; description: string; cost: number; modifier: Modifier }`
- `ConsumableType`: `'health_potion' | 'damage_potion' | 'strength_potion' | 'poison_potion'`
- `Consumable`: `{ id: string; name: string; type: ConsumableType; description: string; cost: number; effect: ConsumableEffect }`
- `ConsumableEffect`: `{ type: ConsumableType; value: number; duration?: number }` (duration in hands, for poison)
- `Wish`: `{ blessingText: string; curse: Modifier | null; bossName: string }`
- `CombatantData`: `{ name: string; maxHp: number; isBoss: boolean; equipment: Equipment[]; description: string; curse?: Modifier }`
- `PlayerState`: `{ hp: number; maxHp: number; gold: number; equipment: Map<EquipmentSlot, Equipment | null>; consumables: Consumable[]; wishes: Wish[]; activeEffects: ActiveEffect[] }`
- `ActiveEffect`: `{ id: string; name: string; remainingHands: number; modifier: Modifier }`
- `EnemyState`: `{ data: CombatantData; hp: number }`
- `GamePhase`: `'pre_hand' | 'player_turn' | 'dealer_turn' | 'hand_result' | 'battle_result' | 'shop' | 'genie' | 'game_over' | 'victory'`
- `PlayerAction`: a discriminated union with types: `'hit'`, `'stand'`, `'double_down'`, `'use_consumable'` (with `itemIndex: number`), `'buy_item'` (with `itemIndex: number`), `'skip_shop'`, `'enter_wish'` (with `text: string`), `'continue'`
- `ActionResult`: `{ success: boolean; message: string; newPhase: GamePhase }`
- `HandResult`: `{ playerScore: HandScore; dealerScore: HandScore; winner: 'player' | 'dealer' | 'push'; damageDealt: number; damageTarget: 'player' | 'dealer' | 'none'; dodged: boolean; damageBreakdown: string }`
- `GameView`: the read-only state snapshot the frontend reads (full definition in Interfaces section)
- `ShopItem`: `{ index: number; item: Equipment | Consumable; type: 'equipment' | 'consumable'; affordable: boolean }`
- `GameRules`: the master configuration object (full definition below)
- `Modifier`: the modifier interface (full definition below)
- `ModifierContext`: context passed to modifier hooks
- `SerializedGameState`: the serialization format for save/load
- `GameReplay`: `{ seed: string; actions: PlayerAction[] }` for deterministic replay

**src/engine/rng.ts** implements the seeded random number generator. It exports a class `SeededRNG` with these methods:

- `constructor(seed: string | number)`: Initializes the RNG. If the seed is a string, hash it to a 32-bit integer using a simple hash (sum of char codes multiplied by primes, then bitwise-AND to 32 bits). Store the seed string/number for serialization.
- `next(): number`: Returns a float in [0, 1) using the mulberry32 algorithm. Each call advances the internal state.
- `nextInt(min: number, max: number): number`: Returns an integer in [min, max] inclusive.
- `shuffle<T>(array: T[]): T[]`: Returns a new array with elements shuffled using Fisher-Yates. Does not mutate the input.
- `getState(): { seed: string | number; callCount: number }`: Returns serializable state for save/load.
- `static fromState(state: { seed: string | number; callCount: number }): SeededRNG`: Recreates the RNG at the exact same position by replaying `callCount` calls.

The mulberry32 algorithm works as follows. Maintain a single 32-bit state variable. On each call to `next()`: increment state by 0x6D2B79F5, then perform three xorshift-multiply steps: `t = (state ^ (state >>> 15)) * (state | 1)`, then `t ^= t + (t ^ (t >>> 7)) * (t | 61)`, then return `((t ^ (t >>> 14)) >>> 0) / 0x100000000`. This produces a float in [0, 1).

**src/engine/cards.ts** implements the card and deck system:

- `createDeck(rng: SeededRNG, numberOfDecks?: number): Card[]`: Creates and shuffles a standard 52-card deck (or multiple decks). Each deck has 4 suits and 13 ranks.
- `cardValue(card: Card): number[]`: Returns possible values for a card. Number cards return their face value. J/Q/K return 10. Ace returns [1, 11].
- `cardToString(card: Card): string`: Returns a compact string like "A♠", "K♥", "10♦", "3♣". Uses Unicode suit symbols for compactness.
- `handToString(hand: Hand): string`: Returns cards as a bracket-delimited list like "[A♠ 5♥ 3♣]".

Verification for Milestone 1: Run `npx vitest run`. Tests in `tests/rng.test.ts` must confirm: (a) same seed produces identical sequence of numbers, (b) different seeds produce different sequences, (c) shuffle is deterministic with same seed, (d) `fromState` correctly restores position. Tests in `tests/cards.test.ts` must confirm: (a) a deck has 52 cards, (b) same seed produces same deck order, (c) card values are correct for all ranks.


### Milestone 2: Scoring, Modifier Pipeline, Equipment and Consumables

This milestone implements hand evaluation (scoring a blackjack hand), the modifier system that makes every game rule adjustable, and all equipment and consumable definitions from DESIGN.md. At the end, you can run tests that score hands correctly, apply equipment modifiers, and verify that modifier stacking works.

**src/engine/scoring.ts** implements hand evaluation:

- `scoreHand(hand: Hand, rules: GameRules): HandScore`: Calculates the best score for a hand. Aces are 11 unless that would cause a bust (exceed `rules.scoring.bustThreshold`, default 21), in which case they count as 1. A hand is "soft" if it contains an ace counted as 11. A hand is a "blackjack" if it has exactly 2 cards and the score equals `rules.scoring.blackjackTarget` (default 21) or is in `rules.scoring.additionalBlackjackValues`. A hand is "busted" if the score exceeds `rules.scoring.bustThreshold`.
- `compareHands(playerScore: HandScore, dealerScore: HandScore, rules: GameRules): 'player' | 'dealer' | 'push'`: Determines the winner. If both bust, check `rules.winConditions.doubleBustResolution`. If one busts, the other wins. If neither busts, higher score wins. On tie, check `rules.winConditions.tieResolution`.
- `calculateBaseDamage(winnerScore: HandScore, loserScore: HandScore, rules: GameRules): number`: If the loser busted, damage equals the winner's score. If neither busted, damage equals the difference. Apply `rules.damage.baseMultiplier`. Clamp to `rules.damage.minimumDamage` and `rules.damage.maximumDamage` (if set). Add `rules.damage.flatBonusDamage`. Apply `rules.damage.percentBonusDamage` as a multiplier (1 + percent). If the winner got a natural blackjack, add `rules.winConditions.naturalBlackjackBonus`.

**src/engine/modifiers.ts** defines the modifier system. This is the core extensibility mechanism.

The `GameRules` object holds every configurable parameter. The default rules represent standard blackjack with the Geniejack combat layer. Here are all the fields with their defaults:

    scoring:
      bustThreshold: 21
      blackjackTarget: 21
      additionalBlackjackValues: []
      bustSaveThreshold: null        // if set, busts at or below this value are "saved" (not busted)
      aceHighValue: 11
      aceLowValue: 1
      faceCardValue: 10

    turnOrder:
      playerGoesFirst: true
      initialPlayerCards: 2
      initialDealerCards: 2

    dealer:
      standsOn: 17
      standsOnSoft17: true           // dealer stands on soft 17
      peeksForBlackjack: false       // dealer checks for blackjack before player acts

    winConditions:
      tieResolution: 'push'          // 'push' | 'player' | 'dealer'
      doubleBustResolution: 'push'   // 'push' | 'player' | 'dealer'
      naturalBlackjackBonus: 0       // flat extra damage for natural blackjack
      blackjackPayoutMultiplier: 1.5 // damage multiplier for blackjack wins

    damage:
      baseMultiplier: 1
      minimumDamage: 0
      maximumDamage: null            // null = no cap
      flatBonusDamage: 0
      percentBonusDamage: 0          // e.g., 0.3 means +30%
      flatDamageReduction: 0
      percentDamageReduction: 0      // e.g., 0.2 means -20%

    actions:
      canDoubleDown: true
      canSplit: false                // not implemented in this plan
      canSurrender: false            // not implemented in this plan
      doubleDownMultiplier: 2        // damage multiplier when doubling down

    deck:
      numberOfDecks: 1
      reshuffleBetweenHands: true

    economy:
      goldPerBattle: 10
      goldPerBoss: 25
      shopPriceMultiplier: 1

    health:
      playerMaxHp: 50
      playerStartHp: 50
      healthRegenPerBattle: 0
      resetHpAfterBoss: true

    progression:
      battlesPerStage: 3
      totalStages: 3

The `Modifier` interface defines how equipment, consumables, enemy abilities, and wishes modify the game:

    interface Modifier {
      id: string;
      name: string;
      description: string;
      source: 'equipment' | 'consumable' | 'enemy' | 'wish_blessing' | 'wish_curse';

      // Rule-level modifications — applied once before combat begins each hand.
      // Receives the current rules and returns a modified copy. Must not mutate the input.
      modifyRules?(rules: GameRules): GameRules;

      // Damage dealt by the modifier's owner. Called after base damage is calculated.
      modifyDamageDealt?(damage: number, context: ModifierContext): number;

      // Damage received by the modifier's owner. Called after base damage is calculated.
      modifyDamageReceived?(damage: number, context: ModifierContext): number;

      // Called when the owner busts. Can override whether the bust counts.
      // Return null to let the default behavior apply.
      modifyBust?(hand: Hand, score: number, context: ModifierContext): { busted: boolean; effectiveScore: number } | null;

      // Called to check if damage is dodged. Return true to dodge.
      dodgeCheck?(context: ModifierContext): boolean;

      // Called when a hand starts (before dealing).
      onHandStart?(context: ModifierContext): void;

      // Called when a hand ends (after damage is applied).
      onHandEnd?(context: ModifierContext): void;

      // Called when a battle starts.
      onBattleStart?(context: ModifierContext): void;

      // Called when a battle ends.
      onBattleEnd?(context: ModifierContext): void;

      // Called to modify gold earned. Returns modified gold amount.
      modifyGoldEarned?(gold: number, context: ModifierContext): number;
    }

The `ModifierContext` is passed to every hook and includes:

    interface ModifierContext {
      playerHand: Hand;
      dealerHand: Hand;
      playerState: PlayerState;
      enemyState: EnemyState;
      rules: GameRules;
      rng: SeededRNG;
      stage: number;
      battle: number;
      handNumber: number;
      winnerHandSuits: Suit[];  // suits present in the winning hand, for suit-based modifiers
    }

The modifier pipeline works as follows. The engine collects all active modifiers from the player's equipment, active consumable effects, enemy equipment, and active wishes. To resolve a hand:

1. Start with the default GameRules.
2. Call `modifyRules` on every active modifier in order (player equipment first, then wishes, then enemy modifiers). Each receives the output of the previous one.
3. Score hands and determine winner using the final modified rules.
4. Calculate base damage.
5. Run `modifyDamageDealt` on the winner's modifiers (stacks multiplicatively).
6. Run `modifyDamageReceived` on the loser's modifiers (stacks multiplicatively).
7. Apply flat damage reduction, then clamp to minimum 0.
8. Run `dodgeCheck` on the loser's modifiers. If any returns true, damage is 0.
9. Apply damage.
10. Run `onHandEnd` on all modifiers.

The function `applyModifierPipeline(modifiers: Modifier[], rules: GameRules): GameRules` chains all `modifyRules` calls and returns the final rules. The function `collectModifiers(playerState: PlayerState, enemyState: EnemyState): { playerModifiers: Modifier[]; enemyModifiers: Modifier[] }` gathers all active modifiers from equipment, active effects, and wishes for each side.

**src/engine/equipment.ts** defines all equipment from DESIGN.md as `Equipment` objects with associated modifiers:

Weapons (slot: 'weapon'):
- Flint Spear (cloth tier, cost 30): Modifier adds +5 to `flatBonusDamage` via `modifyDamageDealt`.
- Bronze Saif (bronze tier, cost 60): Modifier adds +10 via `modifyDamageDealt`.
- Iron Scimitar (iron tier, cost 100): Modifier adds +25 via `modifyDamageDealt`.

Helms (slot: 'helm'):
- Cloth Helm (cloth tier, cost 20): Modifier reduces incoming damage by 30% but only when the player busted. The `modifyDamageReceived` hook checks `context.playerHand` — if the player's hand busted, multiply damage by 0.7.
- Bronze Helm (bronze tier, cost 45): Same but 50% reduction (multiply by 0.5).
- Iron Helm (iron tier, cost 80): Same but 80% reduction (multiply by 0.2).

Armors (slot: 'armor'):
- Cloth Armor (cloth tier, cost 25): Modifier reduces all incoming damage by 20% via `modifyDamageReceived` returning `damage * 0.8`.
- Bronze Armor (bronze tier, cost 55): Same but 40% (damage * 0.6).
- Iron Armor (iron tier, cost 90): Same but 60% (damage * 0.4).

Boots (slot: 'boots'):
- Cloth Boots (cloth tier, cost 20): Modifier gives 10% dodge. `dodgeCheck` returns `context.rng.next() < 0.10`.
- Bronze Boots (bronze tier, cost 50): Same but 25% (`rng.next() < 0.25`).
- Iron Boots (iron tier, cost 85): Same but 40% (`rng.next() < 0.40`).

Trinkets (slot: 'trinket'):
- Cloth Trinket (cloth tier, cost 15): +10 gold per battle. `modifyGoldEarned` returns `gold + 10`.
- Bronze Trinket (bronze tier, cost 40): 25% less damage from a random suit, changes each battle. On `onBattleStart`, use `context.rng` to pick a random suit and store it. On `modifyDamageReceived`, if the winning hand contains a card of that suit, multiply damage by 0.75. The random suit is stored as a local variable within the modifier closure.
- Iron Trinket (iron tier, cost 75): Player bust counts as a score of 10. The `modifyBust` hook returns `{ busted: false, effectiveScore: 10 }`.

Export a function `getAllEquipment(): Equipment[]` that returns all 15 equipment items, and `getEquipmentById(id: string): Equipment` for lookup.

**src/engine/consumables.ts** defines all consumables from DESIGN.md:

- Health Potion (cost 10): When used, immediately restores 5 HP to the player (capped at maxHp).
- Damage Potion (cost 15): When used, immediately deals 5 damage to the current enemy.
- Strength Potion (cost 20): When used, adds an `ActiveEffect` lasting 1 hand that adds +30% to damage dealt via `modifyDamageDealt` returning `Math.floor(damage * 1.3)`.
- Poison Potion (cost 20): When used, adds an `ActiveEffect` lasting 3 hands. At `onHandEnd`, deals 3 damage to the enemy. This damage is applied after core combat damage.

Export `getAllConsumables(): Consumable[]` and `applyConsumable(consumable: Consumable, playerState: PlayerState, enemyState: EnemyState): string` which applies the immediate effect and returns a description of what happened.

Verification for Milestone 2: Run `npx vitest run`. Tests must confirm: (a) hand scoring is correct for normal hands, soft hands, hard hands, blackjack, and busts; (b) the modifier pipeline correctly chains `modifyRules` calls; (c) each equipment modifier produces the expected effect (e.g., Flint Spear adds exactly 5 damage); (d) consumable effects apply correctly (health potion heals, poison potion deals damage over 3 turns); (e) the Iron Trinket's bust-save modifier correctly turns a bust into a score of 10.


### Milestone 3: Combat Resolution, Combatant Data, Shop, and Genie

This milestone implements the combat loop (playing blackjack hands until one side dies), defines all enemies and bosses for three stages, builds the shop system, and creates the genie/wish system. At the end, you can run tests that simulate full battles and verify combat, shopping, and wish storage work correctly.

**src/engine/combat.ts** implements the combat system:

- `CombatState`: tracks the current hand's state during combat — the deck, player hand, dealer hand, phase (dealing, player_turn, dealer_turn, resolving), and doubled-down status.
- `initCombat(rng: SeededRNG, rules: GameRules): CombatState`: Creates a new shuffled deck and empty hands.
- `dealInitialCards(combat: CombatState, rules: GameRules): CombatState`: Deals `initialPlayerCards` to the player and `initialDealerCards` to the dealer. The dealer's first card is face-down (tracked by a `faceDown` boolean on the combat state).
- `playerHit(combat: CombatState): CombatState`: Draws a card from the deck and adds it to the player's hand.
- `playerStand(combat: CombatState): CombatState`: Moves to dealer's turn.
- `playerDoubleDown(combat: CombatState): CombatState`: Draws exactly one card, doubles the damage multiplier for this hand, and moves to dealer's turn.
- `dealerPlay(combat: CombatState, rules: GameRules): CombatState`: The dealer reveals the face-down card, then hits until the hand value is at least `rules.dealer.standsOn`. If `rules.dealer.standsOnSoft17` is true, the dealer stands on soft 17; otherwise, the dealer hits on soft 17.
- `resolveHand(combat: CombatState, playerModifiers: Modifier[], enemyModifiers: Modifier[], rules: GameRules, context: ModifierContext): HandResult`: Scores both hands, determines winner, calculates damage through the full modifier pipeline, checks for dodge, and returns the result.

**src/engine/combatants.ts** defines all enemies and bosses. Each combatant is a `CombatantData` object.

Stage 1 — Desert Outskirts:
- Vampire Bat: 15 HP. Trinket modifier: takes 50% less damage when the winning hand contains at least one spade card. Description: "A leathery winged creature that thrives in darkness."
- Sand Scorpion: 18 HP. No equipment. Description: "A large scorpion with a venomous stinger."
- Desert Jackal: 20 HP. Trinket modifier: +3 flat damage dealt. Description: "A cunning predator of the dunes."
- Boss — Ancient Strix: 50 HP, isBoss: true. Weapon modifier: deals 10 extra damage on blackjack (in `modifyDamageDealt`, check if `context.dealerHand` is a natural blackjack and add 10). Trinket modifier: takes +2 damage for each red-suited card (hearts, diamonds) in the player's winning hand. Curse (transfers to player after defeat): enemy deals +5 extra damage on blackjack for the rest of the run. Description: "An ancient owl-like demon of the desert night."

Stage 2 — Oasis Ruins:
- Dust Wraith: 25 HP. Trinket modifier: 15% dodge chance. Description: "A swirling phantom of desert sand."
- Tomb Guardian: 28 HP. Armor modifier: takes 25% less damage from all sources. Description: "An animated stone sentinel guarding forgotten tombs."
- Sand Serpent: 22 HP. Weapon modifier: +5 flat damage dealt. Description: "A massive viper that strikes from beneath the dunes."
- Boss — Djinn Warden: 75 HP, isBoss: true. Weapon modifier: +8 flat damage dealt. Trinket modifier: on dealer blackjack, heals the Djinn for 10 HP (`onHandEnd` hook — if dealer got blackjack, increase enemy HP by 10, capped at max). Curse: player takes 3 damage at the start of each hand for the rest of the run (a permanent poison-like effect). Description: "A bound djinn forced to guard the oasis for eternity."

Stage 3 — Sultan's Palace:
- Obsidian Golem: 35 HP. Armor modifier: takes 40% less damage. Description: "A hulking construct of volcanic glass."
- Shadow Assassin: 30 HP. Weapon modifier: +10 flat damage dealt. Boots modifier: 20% dodge chance. Description: "A silent killer wreathed in magical darkness."
- Fire Dancer: 32 HP. Trinket modifier: deals +3 damage for each red card in the dealer's hand. Description: "A performer whose flames are anything but theatrical."
- Boss — Crimson Sultan: 100 HP, isBoss: true. Weapon modifier: +15 flat damage dealt. Armor modifier: takes 30% less damage. Trinket modifier: on any push (tie), deals 5 damage to the player. Curse: all ties are resolved in the dealer's favor for the rest of the run (modifies `rules.winConditions.tieResolution` to `'dealer'`). Description: "The tyrannical ruler of the palace, wielding forbidden magic."

Export `getEnemiesForStage(stage: number): CombatantData[]` returning the three regular enemies for the given stage (1-indexed), and `getBossForStage(stage: number): CombatantData` returning the boss.

**src/engine/shop.ts** implements the shop:

- `generateShopInventory(stage: number, playerState: PlayerState, rng: SeededRNG): ShopItem[]`: Generates a list of items available for purchase. The shop offers equipment that the player does not already own (or that is a higher tier than what the player has in that slot) and a selection of consumables. Use the RNG to select a subset of available items (3-5 equipment items and 2-4 consumables). Apply `rules.economy.shopPriceMultiplier` to all costs.
- `purchaseItem(item: ShopItem, playerState: PlayerState): { success: boolean; message: string; playerState: PlayerState }`: Deducts gold, adds the item to inventory. If it is equipment, it replaces the item in that slot (if any). If a consumable, it is added to the consumables list.

**src/engine/genie.ts** implements the genie system:

- `GenieEncounter`: `{ bossName: string; curseModifier: Modifier; blessingText: string | null }`
- `createGenieEncounter(boss: CombatantData): GenieEncounter`: Creates the encounter after defeating a boss. The curse is taken from `boss.curse`. The blessing text is null until the player enters it.
- `storeBlessingWish(encounter: GenieEncounter, text: string): Wish`: Creates a Wish object with the blessing text stored and the curse applied. The blessing does nothing mechanically — it simply stores the text. Future implementation will parse this text and generate modifier effects via LLM. Returns a `Wish` that gets added to the player's wishes list.

The half-implementation of blessings is intentional. The modifier system is designed so that a future LLM integration can generate a `Modifier` object with any combination of `modifyRules`, `modifyDamageDealt`, `modifyDamageReceived`, `modifyBust`, `dodgeCheck`, `modifyGoldEarned`, `onHandStart`, `onHandEnd`, `onBattleStart`, and `onBattleEnd` hooks. The full GameRules object with its many fields (bust thresholds, additional blackjack values, tie resolution, bust save, turn order, dealer behavior, damage formula, etc.) serves as the "API reference" that the LLM will use. The modifier interface is the "function signature" the LLM will implement. This is why we expose so many knobs — each one is a lever the LLM can pull when granting a blessing.

Verification for Milestone 3: Tests must confirm: (a) a full combat simulation runs to completion with deterministic results; (b) enemy modifiers apply correctly (Vampire Bat takes 50% less damage from spade hands); (c) the shop generates appropriate items and purchase/rejection works correctly; (d) the genie stores blessing text and applies curses; (e) boss curses produce the expected modifier effects.


### Milestone 4: Game Controller and Stage Progression

This milestone builds the main game controller that ties everything together — the state machine that progresses through battles, shops, bosses, and genie encounters across three stages. At the end, you can programmatically play a full game from start to finish by calling `performAction` repeatedly.

**src/engine/game.ts** implements the game controller:

The `GameEngine` class is the single entry point for all game interaction. It maintains the full game state internally and exposes it through `getView(): GameView` (a read-only snapshot) and `getAvailableActions(): PlayerAction[]` (what the player can do right now). The player advances the game by calling `performAction(action: PlayerAction): ActionResult`.

Constructor: `new GameEngine(seed?: string)`. If no seed is provided, generate one from `Date.now().toString()`. Initialize the SeededRNG, set stage=1, battle=1, create the player with starting HP and empty inventory, load the first enemy, and set phase to `'pre_hand'`.

The game state machine progresses through these phases:

1. **pre_hand**: The player can use consumables or press continue to deal cards. Available actions: `use_consumable` (if player has consumables), `continue`.
2. **player_turn**: Cards have been dealt. The player can hit, stand, or double down (if allowed by rules and this is the first action). Available actions: `hit`, `stand`, `double_down` (if allowed).
3. **dealer_turn**: Automatically resolved — the dealer plays according to rules. This phase is transient; after the dealer plays, it immediately transitions to `hand_result`.
4. **hand_result**: Shows the result of the hand (who won, damage dealt). Available actions: `continue` (to go to next hand or end of battle).
5. **battle_result**: The enemy reached 0 HP. Shows victory summary and gold earned. Available actions: `continue` (to go to shop, genie, or next battle).
6. **shop**: Display available items. Available actions: `buy_item` (with index), `skip_shop`.
7. **genie**: After boss defeat. Display curse received and prompt for blessing text. Available actions: `enter_wish` (with text).
8. **game_over**: Player reached 0 HP. Available actions: none (game is over). Display final stats.
9. **victory**: All three stages cleared. Available actions: none. Display congratulations and run summary.

The `performAction` method validates that the action is in `getAvailableActions()`, applies it, and returns an `ActionResult` with a success flag, a human-readable message, and the new phase.

Stage progression logic: After each battle victory, if `battle < battlesPerStage`, go to shop then increment battle. If `battle == battlesPerStage`, the next battle is the boss. After the boss is defeated, go to genie, reset HP, increment stage, reset battle to 1. If stage > totalStages, the player wins.

The `getView(): GameView` method returns a complete snapshot of the game state that the CLI (or any frontend) can render. It includes:

    {
      phase, seed, stage, battle, handNumber,
      player: { hp, maxHp, gold, equipment (as map), consumables (as array),
                wishes (as array), activeEffects (as array),
                hand (cards, only during combat), handScore (only during combat) },
      enemy: { name, hp, maxHp, isBoss, description, modifierDescriptions (string[]),
               hand (visible cards only — face-down card shown as null), handScore (of visible cards),
               allRevealed (boolean, true after dealer plays) },
      shop: { items: ShopItem[] } (only during shop phase),
      genie: { bossName, curseDescription, blessingEntered } (only during genie phase),
      lastHandResult: HandResult | null,
      availableActions: PlayerAction[],
      log: string[] (last 5 game events)
    }

Serialization: `serialize(): SerializedGameState` returns a JSON-serializable object containing the RNG state, player state, current stage/battle/hand, current enemy state, and current combat state. `static fromSerialized(data: SerializedGameState): GameEngine` restores the game.

Replay: The engine maintains an internal `actionLog: PlayerAction[]`. After a game, `getReplay(): GameReplay` returns `{ seed, actions: actionLog }`. `static fromReplay(replay: GameReplay): GameEngine` replays all actions from the beginning to restore the exact game state.

Verification for Milestone 4: Tests must confirm: (a) a full game can be played programmatically by issuing actions; (b) the same seed and actions produce the identical game state; (c) serialization round-trips correctly (serialize then deserialize produces the same state); (d) replay from seed and action log produces the same final state; (e) stage progression follows the correct sequence (3 battles, shop, boss, genie, repeat).


### Milestone 5: CLI Interface

This milestone builds the command-line interface. The CLI is a thin wrapper around the GameEngine that renders `GameView` as compact text and reads single-character commands from stdin. At the end of this milestone, you can run `npm run dev -- --seed=42` and play a full game in the terminal.

**src/cli/index.ts** is the entry point:

- Parse command-line arguments: `--seed=<value>` sets the seed. If omitted, a random seed is used.
- Create a `GameEngine` with the seed.
- Enter the main loop: render the current view, show available actions, read input, call `performAction`, repeat.
- On game over or victory, display the final screen and exit.

**src/cli/display.ts** renders the `GameView` as compact text:

The display format is designed to be token-efficient for Claude to read. Every render clears the screen and prints the current state. Here is the format for each phase:

During combat (pre_hand, player_turn, hand_result):

    === S1 B2 H3 === Seed:abc123
    ENEMY: Desert Jackal HP:12/20 [+3dmg]
    YOU: HP:45/50 Gold:30
    Eq: Wpn:Flint Spear | Hlm:- | Arm:Cloth | Bts:- | Trk:-
    Bag: HealthPot x1, DmgPot x1
    FX: Poison(2h left)
    ───
    You: [A♠ 5♥]=16  Dealer: [?? 7♦]=?
    > (h)it (s)tand (d)ouble (u)se-item (enter=continue)

Where S=stage, B=battle, H=hand number. The equipment line uses short abbreviations. "FX" shows active effects with remaining duration. The hand display uses `cardToString` and shows the score. The dealer's face-down card shows as "??".

After hand resolution:

    You: [A♠ 5♥ 5♣]=21  Dealer: [K♠ 7♦]=17
    WIN! Dmg:4 (base:4 +wpn:5 =9 -armor:0 =9) → Jackal HP:3/20
    > (enter=continue)

If the player lost:

    You: [A♠ 5♥ K♣]=26 BUST  Dealer: [K♠ 7♦]=17
    LOSS! Dmg:17 → You HP:28/50
    > (enter=continue)

Battle result:

    ═══ VICTORY! Desert Jackal defeated! ═══
    Gold: +10 (total: 40)
    > (enter=continue to shop)

Shop:

    ═══ SHOP ═══ Gold: 40
    1) Bronze Saif [Weapon] +10dmg              60g
    2) Cloth Armor [Armor] 20%↓dmg              25g ✓
    3) Health Potion +5hp                       10g ✓
    4) Damage Potion 5dmg                       15g ✓
    ✓=affordable  > (1-4 to buy, s=skip)

Items marked with ✓ are affordable. After buying, the shop re-renders with updated gold and inventory.

Genie:

    ═══ GENIE ═══
    You defeated Ancient Strix!
    CURSE: Night Fang — enemies deal +5 dmg on blackjack
    Your curses: Night Fang
    ───
    The Genie offers you a Wish. Type your blessing:
    >

After entering text:

    Blessing stored: "I wish for fire resistance"
    (Blessings are not yet implemented — text saved for future use)
    HP restored to 50/50
    > (enter=continue to next stage)

Game over:

    ═══ GAME OVER ═══
    Defeated by Sand Serpent at Stage 2, Battle 2
    Final stats: Gold:85, Wishes:1
    Seed: abc123

Victory:

    ═══ VICTORY! ═══
    You conquered the Sultan's Palace!
    Stages cleared: 3 | Battles won: 12
    Wishes earned: 3 | Final gold: 150
    Seed: abc123

**src/cli/input.ts** handles reading from stdin:

- `async promptAction(availableActions: PlayerAction[]): Promise<PlayerAction>`: Reads a line from stdin. Maps single characters to actions: 'h' → hit, 's' → stand, 'd' → double_down, 'u' → use consumable (then prompts for index), a number → buy_item (in shop phase), 's' in shop → skip_shop, free text in genie → enter_wish, empty line/enter → continue. If the input does not match any available action, print "Invalid action" and re-prompt.

Use Node's `readline` module with `createInterface` for input.

Verification for Milestone 5: Run `npm run dev -- --seed=42`. Play through at least one full battle. Verify: (a) the display renders correctly with all game state visible; (b) hitting 'h' draws a card and updates the display; (c) buying an item in the shop deducts gold and equips the item; (d) the genie prompts for wish text and stores it; (e) running the same seed with the same inputs produces the same game. To verify programmatically, the milestone 6 tests include an integration test that simulates CLI input.


### Milestone 6: Comprehensive Unit Tests

This milestone writes thorough unit tests for every modifier, equipment piece, consumable, combatant ability, and core game mechanic. At the end, running `npx vitest run` must show all tests passing.

**Test files to create** (all in `tests/` directory):

`tests/rng.test.ts` — Seeded RNG tests:
- Same seed produces identical sequence (100 calls)
- Different seeds produce different sequences
- `shuffle` is deterministic with same seed
- `nextInt` produces values within range
- `fromState` restores exact position

`tests/cards.test.ts` — Card and deck tests:
- Deck has 52 cards (4 suits x 13 ranks)
- No duplicate cards in a deck
- Same seed produces same deck order
- `cardValue` returns correct values for each rank
- `cardToString` formats correctly

`tests/scoring.test.ts` — Hand scoring tests:
- Hard hand scoring (no aces): 2+3=5, 10+K=20, 7+8+9=24 (bust)
- Soft hand scoring (with aces): A+5=16 (soft), A+K=21 (blackjack), A+5+7=13 (hard, ace demoted)
- Blackjack detection: A+10=blackjack, A+5+6=21 but not blackjack (3 cards)
- Bust detection with default threshold (21)
- Custom bust threshold via rules (e.g., threshold=25, hand of 23 is not a bust)
- Additional blackjack values (e.g., if 17 is also blackjack)
- Bust save threshold (e.g., bust at 22 is saved if threshold is 22)
- `compareHands` with all tie resolution modes
- `compareHands` with double bust and all resolution modes
- `calculateBaseDamage` for normal wins, bust wins, and with damage modifiers

`tests/modifiers.test.ts` — Modifier pipeline tests:
- Single modifier applies correctly
- Multiple modifiers chain in order
- `modifyRules` creates a new object (does not mutate)
- `modifyDamageDealt` stacking
- `modifyDamageReceived` stacking
- `dodgeCheck` works correctly
- `modifyBust` override works
- `modifyGoldEarned` stacking

`tests/equipment.test.ts` — Individual equipment tests:
- Flint Spear: adds exactly 5 to damage dealt
- Bronze Saif: adds exactly 10 to damage dealt
- Iron Scimitar: adds exactly 25 to damage dealt
- Cloth Helm: reduces bust-damage by 30% (and does NOT reduce non-bust damage)
- Bronze Helm: reduces bust-damage by 50%
- Iron Helm: reduces bust-damage by 80%
- Cloth Armor: reduces all damage by 20%
- Bronze Armor: reduces all damage by 40%
- Iron Armor: reduces all damage by 60%
- Cloth Boots: 10% dodge (test with fixed RNG value)
- Bronze Boots: 25% dodge
- Iron Boots: 40% dodge
- Cloth Trinket: +10 gold earned
- Bronze Trinket: 25% less damage from a randomly chosen suit (deterministic with seed)
- Iron Trinket: bust becomes score of 10

`tests/consumables.test.ts` — Consumable tests:
- Health potion heals 5 HP
- Health potion does not exceed maxHp
- Damage potion deals 5 damage to enemy
- Damage potion does not reduce enemy below 0
- Strength potion increases damage by 30% for 1 hand
- Strength potion effect expires after 1 hand
- Poison potion deals 3 damage per hand for 3 hands
- Poison potion damage is dealt after combat resolution
- Poison potion expires after 3 hands

`tests/combat.test.ts` — Combat system tests:
- Initial deal gives correct number of cards
- Player hit draws one card
- Player stand transitions to dealer turn
- Dealer hits below standsOn value
- Dealer stands at or above standsOn value
- Dealer soft 17 behavior (stands vs hits based on rules)
- Double down draws one card and increases damage multiplier
- Full hand resolution produces correct HandResult
- Bust detection and damage calculation
- Enemy modifiers apply during combat (Vampire Bat spade resistance)

`tests/combatants.test.ts` — Combatant ability tests:
- Vampire Bat: 50% damage reduction from spade-containing hands
- Desert Jackal: +3 flat damage
- Ancient Strix: +10 damage on blackjack, +2 per red card
- Ancient Strix curse: +5 enemy damage on blackjack
- Dust Wraith: 15% dodge
- Tomb Guardian: 25% damage reduction
- Sand Serpent: +5 flat damage
- Djinn Warden: heals 10 on blackjack, +8 flat damage
- Djinn Warden curse: 3 damage per hand to player
- Obsidian Golem: 40% damage reduction
- Shadow Assassin: +10 damage, 20% dodge
- Fire Dancer: +3 per red card in dealer hand
- Crimson Sultan: +15 damage, 30% reduction, 5 damage on push
- Crimson Sultan curse: ties favor dealer

`tests/shop.test.ts` — Shop tests:
- Shop generates items
- Shop respects player equipment (does not offer same tier or lower)
- Purchase deducts gold
- Purchase with insufficient gold fails
- Equipment replaces slot correctly
- Consumable adds to inventory
- Shop price multiplier applies

`tests/genie.test.ts` — Genie tests:
- Genie encounter created from boss data
- Curse modifier is extracted from boss
- Blessing text is stored
- Wish is added to player state
- Blessing does not produce any mechanical effect

`tests/game.test.ts` — Integration tests:
- New game initializes correctly
- Full game simulation with predetermined actions
- Stage progression: 3 battles → shop → boss → genie → next stage
- Game over when player HP reaches 0
- Victory when all stages cleared
- HP resets after boss fight
- Gold persists across stages
- Equipment persists across stages
- Wishes accumulate across stages

`tests/determinism.test.ts` — Determinism verification:
- Two games with same seed and same actions produce identical final states
- Serialization round-trip preserves state exactly
- Replay from seed + action log matches original game
- Different seeds produce different games
- State is fully determined by seed (no external randomness)

Verification for Milestone 6: Run `npx vitest run`. All tests must pass. There should be at minimum 80 individual test cases covering every modifier, every equipment piece, every consumable, every combatant ability, every curse, and core game mechanics.


### Milestone 7: CLI Documentation

This milestone creates documentation in `docs/product-specs/` explaining how to play Geniejack through the CLI.

**docs/product-specs/cli-guide.md**: A complete guide for playing the game via CLI. Must include:

- How to start a game (`npm run dev`, `npm run dev -- --seed=42`)
- How to read the display (what each section means)
- All available commands and when they apply
- A walkthrough of a typical game session
- How to interpret combat results
- How to use the shop
- How to interact with the genie
- Equipment and consumable reference tables
- Enemy reference (all enemies and bosses with their abilities)
- How determinism works (same seed = same game)
- How to run tests (`npx vitest run`)

This file serves as the product specification for the CLI interface and as a verification guide for the next Claude agent.

Verification for Milestone 7: The documentation file exists and accurately describes the game as implemented.


## Concrete Steps

These are the exact commands to run at each milestone. Working directory for all commands is the repository root: `D:\rouguelike-blackjack\rogue-like-black-jack`.

**Milestone 1 — Project Setup:**

    npm init -y
    npm install --save-dev typescript vitest tsx
    npx tsc --init

Then create/edit the generated files as described in the Plan of Work. After creating source files and tests:

    npx vitest run tests/rng.test.ts tests/cards.test.ts

Expected output: all tests pass, 0 failures.

**Milestone 2 — Scoring & Modifiers:**

After creating source files and tests:

    npx vitest run tests/scoring.test.ts tests/modifiers.test.ts tests/equipment.test.ts tests/consumables.test.ts

Expected output: all tests pass.

**Milestone 3 — Combat & Systems:**

    npx vitest run tests/combat.test.ts tests/combatants.test.ts tests/shop.test.ts tests/genie.test.ts

Expected output: all tests pass.

**Milestone 4 — Game Controller:**

    npx vitest run tests/game.test.ts tests/determinism.test.ts

Expected output: all tests pass.

**Milestone 5 — CLI:**

    npm run dev -- --seed=42

Expected: The game launches in the terminal, displays the initial game state, and waits for input. The player can complete a full game session.

**Milestone 6 — All Tests:**

    npx vitest run

Expected: ALL tests pass. Minimum 80 test cases.

**Milestone 7 — Documentation:**

Verify the file `docs/product-specs/cli-guide.md` exists and is comprehensive.

**Final verification command:**

    npx vitest run && echo "All tests passed"

Expected output: all tests pass followed by "All tests passed".


## Validation and Acceptance

The implementation is considered complete when all of the following are true:

1. Running `npx vitest run` from the repository root passes all tests with 0 failures. There must be at minimum 80 individual test cases.

2. Running `npm run dev -- --seed=42` starts the CLI game. A player (or Claude agent) can:
   - Play through a full battle (multiple hands of blackjack)
   - Visit the shop and buy/skip items
   - Defeat a boss and interact with the genie
   - Progress through all three stages to victory, OR die and see the game over screen
   - The display updates correctly after every action
   - All game information is visible in the compact CLI display

3. Running the same seed with the same inputs produces the identical game outcome. This is verified by the determinism tests.

4. Every equipment modifier produces the correct effect, verified by individual unit tests:
   - Weapons add the correct flat damage
   - Helms reduce damage only on bust
   - Armors reduce all damage
   - Boots provide the correct dodge chance
   - Trinkets have their unique effects (gold bonus, suit resistance, bust-as-10)

5. Every consumable works correctly:
   - Health potion heals (capped at max)
   - Damage potion deals damage
   - Strength potion boosts damage for 1 hand then expires
   - Poison potion deals damage over 3 hands then expires

6. Every enemy and boss ability works:
   - Suit-based damage reduction (Vampire Bat)
   - Flat damage bonuses (Desert Jackal, Sand Serpent, Shadow Assassin, Crimson Sultan)
   - Dodge chances (Dust Wraith, Shadow Assassin)
   - Damage reduction (Tomb Guardian, Obsidian Golem, Crimson Sultan)
   - Conditional effects (Ancient Strix blackjack bonus, Djinn Warden heal, Fire Dancer red-card bonus, Crimson Sultan push damage)

7. All three boss curses work:
   - Ancient Strix curse: enemies deal +5 on blackjack
   - Djinn Warden curse: player takes 3 damage per hand
   - Crimson Sultan curse: ties favor the dealer

8. The genie stores blessing text without producing any mechanical effect.

9. The `docs/product-specs/cli-guide.md` file exists and accurately documents all of the above.


## Idempotence and Recovery

All commands are safe to run multiple times:

- `npm install` is idempotent — running it again reinstalls the same versions.
- `npx vitest run` is a read-only operation that does not modify files.
- `npm run dev` starts a new game session each time.
- Creating files with the Write tool overwrites any previous version.

If a milestone fails partway through:

- Read the test output to identify which tests fail.
- Fix the source files and re-run the failing tests.
- Do not delete test files or skip tests. Every test must pass before proceeding.

If `npm install` fails, check that Node.js (v18+) is installed and accessible. If `npx tsc` fails, check the tsconfig.json settings.

The project has no database, no external services, and no persistent state beyond files on disk. Starting over means deleting `node_modules/`, `dist/`, and any generated files, then running `npm install` again.


## Artifacts and Notes

Example of a seeded RNG producing deterministic output:

    const rng1 = new SeededRNG('test-seed');
    const rng2 = new SeededRNG('test-seed');
    console.log(rng1.next()); // 0.7890...
    console.log(rng2.next()); // 0.7890... (identical)

Example of the modifier pipeline in action:

    // Player has Flint Spear (+5 dmg) and Cloth Armor (20% reduction)
    // Enemy deals 10 base damage to player
    // Pipeline: 10 * 0.8 (armor) = 8 damage received
    // Player deals 5 base damage to enemy
    // Pipeline: 5 + 5 (spear) = 10 damage dealt

Example of deterministic replay:

    const game1 = new GameEngine('seed-42');
    game1.performAction({ type: 'continue' }); // deal cards
    game1.performAction({ type: 'hit' });
    game1.performAction({ type: 'stand' });
    const state1 = game1.getView();

    const replay = game1.getReplay();
    const game2 = GameEngine.fromReplay(replay);
    const state2 = game2.getView();
    // state1 and state2 are identical


## Interfaces and Dependencies

**External dependencies** (installed via npm):
- `typescript` ^5.x (dev): TypeScript compiler
- `vitest` ^2.x (dev): Test framework
- `tsx` ^4.x (dev): TypeScript execution without compilation step

No runtime dependencies. The game engine has zero external dependencies at runtime.

**File locations and key exports:**

In `src/engine/types.ts`, export all type definitions listed in Milestone 1. This is the single source of truth for types. Every other file imports from here.

In `src/engine/rng.ts`, export:

    export class SeededRNG {
      constructor(seed: string | number);
      next(): number;
      nextInt(min: number, max: number): number;
      shuffle<T>(array: T[]): T[];
      getState(): { seed: string | number; callCount: number };
      static fromState(state: { seed: string | number; callCount: number }): SeededRNG;
    }

In `src/engine/cards.ts`, export:

    export function createDeck(rng: SeededRNG, numberOfDecks?: number): Card[];
    export function cardValue(card: Card): number[];
    export function cardToString(card: Card): string;
    export function handToString(hand: Hand): string;

In `src/engine/scoring.ts`, export:

    export function scoreHand(hand: Hand, rules: GameRules): HandScore;
    export function compareHands(playerScore: HandScore, dealerScore: HandScore, rules: GameRules): 'player' | 'dealer' | 'push';
    export function calculateBaseDamage(winnerScore: HandScore, loserScore: HandScore, rules: GameRules): number;

In `src/engine/modifiers.ts`, export:

    export function getDefaultRules(): GameRules;
    export function applyModifierPipeline(modifiers: Modifier[], rules: GameRules): GameRules;
    export function collectModifiers(playerState: PlayerState, enemyState: EnemyState): { playerModifiers: Modifier[]; enemyModifiers: Modifier[] };
    export function applyDamageModifiers(baseDamage: number, attackerModifiers: Modifier[], defenderModifiers: Modifier[], context: ModifierContext): { finalDamage: number; dodged: boolean; breakdown: string };

In `src/engine/equipment.ts`, export:

    export function getAllEquipment(): Equipment[];
    export function getEquipmentById(id: string): Equipment;
    export function getEquipmentBySlotAndTier(slot: EquipmentSlot, tier: EquipmentTier): Equipment;

In `src/engine/consumables.ts`, export:

    export function getAllConsumables(): Consumable[];
    export function applyConsumable(consumable: Consumable, playerState: PlayerState, enemyState: EnemyState): string;
    export function tickActiveEffects(playerState: PlayerState, enemyState: EnemyState, context: ModifierContext): string[];

In `src/engine/combatants.ts`, export:

    export function getEnemiesForStage(stage: number): CombatantData[];
    export function getBossForStage(stage: number): CombatantData;

In `src/engine/combat.ts`, export:

    export interface CombatState {
      deck: Card[];
      deckIndex: number;
      playerHand: Hand;
      dealerHand: Hand;
      dealerFaceDown: boolean;
      doubledDown: boolean;
    }
    export function initCombat(rng: SeededRNG, rules: GameRules): CombatState;
    export function dealInitialCards(combat: CombatState, deck: Card[], rules: GameRules): CombatState;
    export function playerHit(combat: CombatState): CombatState;
    export function playerStand(combat: CombatState): CombatState;
    export function playerDoubleDown(combat: CombatState): CombatState;
    export function dealerPlay(combat: CombatState, rules: GameRules): CombatState;
    export function resolveHand(combat: CombatState, playerMods: Modifier[], enemyMods: Modifier[], rules: GameRules, context: ModifierContext): HandResult;

In `src/engine/shop.ts`, export:

    export function generateShopInventory(stage: number, playerState: PlayerState, rng: SeededRNG): ShopItem[];
    export function purchaseItem(item: ShopItem, playerState: PlayerState): { success: boolean; message: string };

In `src/engine/genie.ts`, export:

    export function createGenieEncounter(boss: CombatantData): GenieEncounter;
    export function storeBlessingWish(encounter: GenieEncounter, text: string): Wish;

In `src/engine/game.ts`, export:

    export class GameEngine {
      constructor(seed?: string);
      getView(): GameView;
      getAvailableActions(): PlayerAction[];
      performAction(action: PlayerAction): ActionResult;
      serialize(): SerializedGameState;
      static fromSerialized(data: SerializedGameState): GameEngine;
      getReplay(): GameReplay;
      static fromReplay(replay: GameReplay): GameEngine;
    }

In `src/cli/display.ts`, export:

    export function renderView(view: GameView): string;

In `src/cli/input.ts`, export:

    export function createInputHandler(): { promptAction(availableActions: PlayerAction[], phase: GamePhase): Promise<PlayerAction>; close(): void };

In `src/cli/index.ts`:

    // Entry point. Parses --seed argument, creates GameEngine, runs main loop.
    // No exports — this file runs on import.

**Full GameRules type definition** (for `src/engine/types.ts`):

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

**Full Modifier interface** (for `src/engine/types.ts`):

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

    export interface ModifierContext {
      playerHand: Hand;
      dealerHand: Hand;
      playerScore: HandScore;
      dealerScore: HandScore;
      playerState: PlayerState;
      enemyState: EnemyState;
      rules: GameRules;
      rng: SeededRNG;
      stage: number;
      battle: number;
      handNumber: number;
    }

**Full GameView interface** (for `src/engine/types.ts`):

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


---

*Revision log:*

- 2026-02-21: Initial plan created. Covers full backend implementation with CLI, comprehensive modifier system, all equipment/consumables/enemies from DESIGN.md, half-implemented wishes, full determinism, and thorough unit tests.

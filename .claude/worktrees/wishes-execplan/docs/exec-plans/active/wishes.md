# Implement the Wish Blessing System with LLM-Generated Modifiers

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This document must be maintained in accordance with `PLANS.md` at the repository root.


## Purpose / Big Picture

After this change, when a player defeats a boss and visits the Genie, typing a wish into the textbox will produce a real, mechanically meaningful blessing powered by an LLM (Claude Haiku 4.5). Today the Genie encounter stores the player's wish text as flavor with no gameplay effect — only the curse half works. After this change, both halves of the Wish system are live: the player types a creative wish ("I wish for the power of flame"), the LLM interprets it using the player's current situation and an API reference of every modifier effect the game supports, and a unique blessing modifier is generated and applied for the rest of the run. The blessing's effects are drawn from the same modifier pipeline that powers equipment, consumables, and curses, so they stack and interact naturally with every other game system.

To see it working: run `npm run dev -- --seed=42`, play through Stage 1 until you defeat the Ancient Strix boss, type a wish at the Genie prompt, and observe a named blessing with a description and real mechanical effects appear in your status panel. In the GUI (`npm run dev:gui`), the GenieScreen will show a loading state while the LLM generates the blessing, then display the result before you continue. In tests, `npm run test` will pass with new tests covering the blessing builder, LLM prompt construction, modifier application, and full integration through the engine.


## Progress

- [x] Milestone 1: BlessingDefinition types, builder function, validation, and unit tests.
- [x] Milestone 2: LLM integration module — Anthropic SDK, prompt construction, response parsing.
- [x] Milestone 3: Engine integration — wire blessings into the game state machine and modifier pipeline.
- [x] Milestone 4: CLI and GUI integration — async LLM calls in both UI layers.
- [x] Milestone 5: Full integration tests and polish.


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


## Outcomes & Retrospective

All 5 milestones completed. 123 tests passing (1 pre-existing Djinn test failure unrelated to this work).

**Files created:**
- `src/engine/blessings.ts` — validateBlessingDefinition + buildBlessingModifier (18 effect types)
- `src/llm/wish-generator.ts` — generateBlessing, buildWishContext, Anthropic tool_use integration
- `src/llm/wish-api.ts` — GUI fetch wrapper for /api/wish proxy
- `tests/blessings.test.ts` — 27 tests for builder and validation
- `tests/wish-generator.test.ts` — 8 tests for context building and fallback

**Files modified:**
- `src/engine/types.ts` — Added BlessingEffectType, BlessingEffect, BlessingDefinition; extended Wish, enter_wish action, GameView genie
- `src/engine/genie.ts` — storeBlessingWish now accepts optional BlessingDefinition
- `src/engine/modifiers.ts` — collectModifiers now collects wish blessings
- `src/engine/game.ts` — handleGenie passes blessing from action; getView includes blessing fields
- `src/cli/index.ts` — LLM call before enter_wish action
- `src/cli/display.ts` — Shows blessings alongside curses
- `src/gui/screens/GenieScreen.tsx` — Loading/result states for LLM blessing generation
- `src/gui/screens/GenieScreen.module.css` — Styles for loading, blessing result, effects
- `src/gui/components/PlayerStatus.tsx` — Blessings section in player status
- `src/gui/components/PlayerStatus.module.css` — Blessing style (gold color)
- `vite.config.ts` — /api/wish proxy plugin
- `tests/genie.test.ts` — Updated for blessing field; added test for BlessingDefinition flow
- `tests/full-game.test.ts` — 4 new integration tests (collect, stack, autoplay, replay)
- `package.json` / `package-lock.json` — Added @anthropic-ai/sdk dependency


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

Add these types after the existing `Wish` interface:

    type BlessingEffectType =
      | 'flat_damage_bonus'
      | 'percent_damage_bonus'
      | 'flat_damage_reduction'
      | 'percent_damage_reduction'
      | 'dodge_chance'
      | 'bust_save'
      | 'max_hp_bonus'
      | 'heal_per_hand'
      | 'heal_on_win'
      | 'lifesteal'
      | 'bust_threshold_bonus'
      | 'dealer_stands_on'
      | 'double_down_multiplier'
      | 'flat_gold_bonus'
      | 'percent_gold_bonus'
      | 'damage_per_hand'
      | 'blackjack_bonus_damage'
      | 'suit_damage_bonus';

    interface BlessingEffect {
      type: BlessingEffectType;
      value: number;
      suit?: Suit;   // only used for 'suit_damage_bonus'
    }

    interface BlessingDefinition {
      name: string;
      description: string;
      effects: BlessingEffect[];
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

Add `BlessingDefinition` to the `GameView`'s genie property so the UI can display blessing info after it's applied:

    genie: {
      bossName: string;
      curseDescription: string;
      blessingEntered: boolean;
      blessingName: string | null;          // <-- new
      blessingDescription: string | null;   // <-- new
    } | null;

**New file `src/engine/blessings.ts`:**

This file exports two functions:

1. `validateBlessingDefinition(def: BlessingDefinition): BlessingDefinition` — Returns a copy with all effect values clamped to safe ranges. The clamping bounds for each effect type are:

    - `flat_damage_bonus`: value clamped to [1, 25]
    - `percent_damage_bonus`: value clamped to [0.1, 1.0] (10% to 100%)
    - `flat_damage_reduction`: value clamped to [1, 15]
    - `percent_damage_reduction`: value clamped to [0.05, 0.5] (5% to 50%)
    - `dodge_chance`: value clamped to [0.05, 0.35] (5% to 35%)
    - `bust_save`: value clamped to [8, 15] (effective score when busting)
    - `max_hp_bonus`: value clamped to [5, 30]
    - `heal_per_hand`: value clamped to [1, 5]
    - `heal_on_win`: value clamped to [1, 10]
    - `lifesteal`: value clamped to [0.1, 0.5] (10% to 50%)
    - `bust_threshold_bonus`: value clamped to [1, 4] (added to bust threshold)
    - `dealer_stands_on`: value clamped to [15, 19]
    - `double_down_multiplier`: value clamped to [2, 4]
    - `flat_gold_bonus`: value clamped to [2, 20]
    - `percent_gold_bonus`: value clamped to [0.1, 1.0] (10% to 100%)
    - `damage_per_hand`: value clamped to [1, 5]
    - `blackjack_bonus_damage`: value clamped to [3, 20]
    - `suit_damage_bonus`: value clamped to [1, 10], suit defaults to 'hearts' if invalid

    Additionally, if the `effects` array has more than 3 entries, only the first 3 are kept (blessings should be strong but focused). If `name` or `description` is longer than 60 characters, it is truncated. If the `effects` array is empty, a fallback effect of `{ type: 'flat_damage_bonus', value: 5 }` is added.

2. `buildBlessingModifier(def: BlessingDefinition): Modifier` — Takes a validated BlessingDefinition and returns a `Modifier` object with the appropriate hooks wired up. The modifier's `id` is `'wish_blessing_' + def.name.toLowerCase().replace(/\s+/g, '_')`, its `source` is `'wish_blessing'`, and its hooks are composed from the effects.

    The builder constructs the modifier by iterating over the effects array and composing hook functions. Each effect type maps to a specific hook as follows:

    - `flat_damage_bonus` → `modifyDamageDealt`: returns `damage + value`
    - `percent_damage_bonus` → `modifyDamageDealt`: returns `Math.floor(damage * (1 + value))`
    - `flat_damage_reduction` → `modifyDamageReceived`: returns `Math.max(0, damage - value)`
    - `percent_damage_reduction` → `modifyDamageReceived`: returns `Math.floor(damage * (1 - value))`
    - `dodge_chance` → `dodgeCheck`: returns `context.rng.next() < value`
    - `bust_save` → `modifyBust`: returns `{ busted: false, effectiveScore: value }`
    - `max_hp_bonus` → `onBattleStart`: sets `context.playerState.maxHp += value` and `context.playerState.hp += value` (only once per battle, using a closure flag reset on battle start)
    - `heal_per_hand` → `onHandStart`: heals player by `value`, capped at maxHp
    - `heal_on_win` → `onHandEnd`: if player won the hand (playerScore > dealerScore and neither busted, or dealer busted and player didn't), heals by `value`
    - `lifesteal` → `onHandEnd`: if player dealt damage, heals by `Math.floor(damageDealt * value)` — requires checking context
    - `bust_threshold_bonus` → `modifyRules`: returns rules with `scoring.bustThreshold += value`
    - `dealer_stands_on` → `modifyRules`: returns rules with `dealer.standsOn = value`
    - `double_down_multiplier` → `modifyRules`: returns rules with `actions.doubleDownMultiplier = value`
    - `flat_gold_bonus` → `modifyGoldEarned`: returns `gold + value`
    - `percent_gold_bonus` → `modifyGoldEarned`: returns `Math.floor(gold * (1 + value))`
    - `damage_per_hand` → `onHandStart`: deals `value` damage to enemy
    - `blackjack_bonus_damage` → `modifyDamageDealt`: returns `damage + value` only if `context.playerScore.isBlackjack`
    - `suit_damage_bonus` → `modifyDamageDealt`: returns `damage + (count of cards matching suit) * value`

    When multiple effects target the same hook (for example, two effects both use `modifyDamageDealt`), the builder composes them: each function calls the previous and adds its own effect. This is done by keeping a "current" function reference for each hook and wrapping it in a closure chain.

    **Note on `lifesteal`**: The `onHandEnd` hook does not receive the damage dealt directly. However, the `ModifierContext` contains both hand scores. Lifesteal can be approximated by checking if the player won (player score > dealer score, dealer busted, etc.) and using the score difference as the base damage amount. This is an approximation but sufficient for a blessing effect.

    **Note on `max_hp_bonus`**: This effect permanently raises the player's max HP. Since `onBattleStart` fires at the start of each battle, we must track whether the bonus was already applied. The builder uses a closure variable `applied: boolean` that is set to `true` on first application. The `onBattleStart` hook checks this flag and only applies the bonus once.

**New test file `tests/blessings.test.ts`:**

Tests for the builder and validation. At minimum:

- `validateBlessingDefinition` clamps out-of-range values
- `validateBlessingDefinition` caps effects array at 3
- `validateBlessingDefinition` adds fallback effect for empty array
- `buildBlessingModifier` creates a modifier with correct id and source
- `buildBlessingModifier` with `flat_damage_bonus` effect: calling `modifyDamageDealt(10, context)` returns `10 + value`
- `buildBlessingModifier` with `percent_damage_reduction` effect: calling `modifyDamageReceived(20, context)` returns `Math.floor(20 * (1 - value))`
- `buildBlessingModifier` with `dodge_chance` effect: calling `dodgeCheck` over 1000 iterations returns true approximately `value * 100` percent of the time (tolerance of 5%)
- `buildBlessingModifier` with `bust_save` effect: calling `modifyBust` returns `{ busted: false, effectiveScore: value }`
- `buildBlessingModifier` with `bust_threshold_bonus`: calling `modifyRules` increases bust threshold
- `buildBlessingModifier` with `heal_per_hand`: calling `onHandStart` increases player HP
- `buildBlessingModifier` with `damage_per_hand`: calling `onHandStart` decreases enemy HP
- `buildBlessingModifier` with `suit_damage_bonus`: damage increases by `value * (matching cards count)`
- `buildBlessingModifier` with multiple effects on the same hook: both apply in order
- `buildBlessingModifier` with `max_hp_bonus`: onBattleStart increases maxHp once, second call does not double it

Use the `makeContext()` test helper pattern from `tests/equipment.test.ts` — construct a `ModifierContext` by hand with controlled values and call modifier hooks directly. Use `SeededRNG` for deterministic dodge tests.


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

    {
      name: 'create_blessing',
      description: 'Grant a blessing to the player based on their wish. Choose 1-3 effects.',
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
                    'flat_damage_bonus', 'percent_damage_bonus',
                    'flat_damage_reduction', 'percent_damage_reduction',
                    'dodge_chance', 'bust_save',
                    'max_hp_bonus', 'heal_per_hand', 'heal_on_win', 'lifesteal',
                    'bust_threshold_bonus', 'dealer_stands_on', 'double_down_multiplier',
                    'flat_gold_bonus', 'percent_gold_bonus',
                    'damage_per_hand', 'blackjack_bonus_damage', 'suit_damage_bonus'
                  ],
                  description: 'The type of effect. flat_damage_bonus: adds flat damage to all attacks. percent_damage_bonus: multiplies damage dealt (0.1 = +10%). flat_damage_reduction: reduces incoming damage by flat amount. percent_damage_reduction: reduces incoming damage by percentage (0.2 = 20% less). dodge_chance: probability to dodge damage (0.15 = 15%). bust_save: if player busts, count hand as this score instead. max_hp_bonus: permanently increase max HP. heal_per_hand: heal this much at the start of each hand. heal_on_win: heal when winning a hand. lifesteal: heal for a percentage of damage dealt (0.3 = 30%). bust_threshold_bonus: raise bust threshold (1 = bust at 22 instead of 21). dealer_stands_on: set what the dealer stands on (lower = harder for dealer). double_down_multiplier: set double down damage multiplier. flat_gold_bonus: extra gold per battle. percent_gold_bonus: percentage more gold (0.5 = 50% more). damage_per_hand: deal this damage to enemy at start of each hand. blackjack_bonus_damage: extra damage when you hit blackjack. suit_damage_bonus: extra damage per card of a specific suit in your hand.'
                },
                value: {
                  type: 'number',
                  description: 'The numeric value for the effect. Ranges vary by type.'
                },
                suit: {
                  type: 'string',
                  enum: ['hearts', 'diamonds', 'clubs', 'spades'],
                  description: 'Only used for suit_damage_bonus. Which suit triggers the bonus.'
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

This milestone wires the blessing system into the game engine. At the end, passing a `BlessingDefinition` in the `enter_wish` action produces a real Modifier that affects gameplay. Run `npm run test` and observe all existing tests still pass plus new engine-level blessing tests.

**Changes to `src/engine/types.ts`:**

The type changes described in Milestone 1 are applied here: `BlessingEffectType`, `BlessingEffect`, `BlessingDefinition` types added; `Wish` gains `blessing: Modifier | null`; `enter_wish` action gains optional `blessing?: BlessingDefinition`; `genie` view gains `blessingName` and `blessingDescription`.

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

**Serialization considerations:**

The `SerializedGameState` stores `wishes: Wish[]` which already includes the full `Wish` object. Since `Modifier` objects contain functions (hooks), they cannot be serialized to JSON directly. However, the existing serialization approach uses the replay system: `fromSerialized` replays from seed + action log. Since the `enter_wish` action now includes the `BlessingDefinition` (which is pure data, no functions), the replay system reconstructs blessings correctly. No changes needed to serialization.

**Test updates:**

Update `tests/genie.test.ts`:
- Update the "blessing has no mechanical effect" test to instead test that passing a BlessingDefinition creates a blessing modifier.
- Add tests for `storeBlessingWish` with a BlessingDefinition.

Update `tests/full-game.test.ts`:
- Add a test that plays through a genie encounter with a BlessingDefinition and verifies the blessing modifier is collected and affects damage.


### Milestone 4: CLI and GUI Integration

This milestone wires the LLM call into both UI layers. At the end, both `npm run dev` and `npm run dev:gui` support the full wish flow with LLM-generated blessings.

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

**GUI changes (`src/gui/screens/GenieScreen.tsx`):**

The GenieScreen needs three states:

1. **Entering** — The textarea and "Grant Wish" button (current behavior).
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


### Milestone 5: Full Integration Testing and Polish

This milestone ensures everything works end-to-end and handles edge cases.

**Integration tests (add to `tests/full-game.test.ts`):**

- "Blessing modifier affects damage in combat": Create a game, reach genie, submit `enter_wish` with a `flat_damage_bonus` blessing definition, then play a hand and verify the damage dealt is increased by the blessing amount. This test uses a controlled seed and manual actions, not autoPlay, so we can inspect intermediate state.

- "Blessing persists across battles": After receiving a blessing, play several battles and verify the modifier continues to apply.

- "Blessing and curse stack correctly": Create a wish with both a blessing (flat damage bonus) and a curse (Strix: +5 incoming on BJ), and verify both are collected by `collectModifiers` and both affect the outcome.

- "autoPlay with blessings terminates": Update the existing autoPlay helper to optionally include a BlessingDefinition in the genie action, and verify games still terminate.

- "Replay with blessing is deterministic": Play a game with a blessing, get the replay, replay it, and verify the final state is identical.

**Edge cases:**

- What if `ANTHROPIC_API_KEY` is not set? The `generateBlessing` function returns the fallback. Test this path.
- What if the LLM returns an empty effects array? The validator adds a fallback effect.
- What if the LLM returns nonsensical values? The validator clamps them.
- What if the LLM doesn't call the tool? The function returns the fallback.
- What if the API times out? The function catches the error and returns the fallback.

**GenieScreen CSS updates (`src/gui/screens/GenieScreen.module.css`):**

Add styles for:
- `.loading` — a pulsing animation for the "pondering" state
- `.blessingResult` — a golden-bordered panel showing the blessing name and description
- `.effectList` — a list of individual effects with appropriate styling

**PlayerStatus component (`src/gui/components/PlayerStatus.tsx`):**

Update to show blessings alongside curses. Currently, curses are displayed as a list. Add a "Blessings" section that lists wish blessings with their names and descriptions, using a green/gold color instead of the red used for curses.


## Concrete Steps

All commands are run from the repository root: `/mnt/d/rogue-like-black-jack`.

**Milestone 1:**

1. Edit `src/engine/types.ts` to add `BlessingEffectType`, `BlessingEffect`, `BlessingDefinition` types, extend `Wish` with `blessing: Modifier | null`, and extend the `enter_wish` action. Update the `genie` property in `GameView`.
2. Create `src/engine/blessings.ts` with `validateBlessingDefinition` and `buildBlessingModifier`.
3. Create `tests/blessings.test.ts` with comprehensive tests.
4. Run `npm run test` from the repo root. Expect all existing tests to pass (the `Wish` type change requires updating any place that constructs a `Wish` literal — specifically `storeBlessingWish` in `src/engine/genie.ts` must add `blessing: null`). The new blessings tests should pass.

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

**Milestone 3:**

1. Apply type changes to `src/engine/types.ts` (if not done in M1).
2. Update `src/engine/genie.ts` to accept and build blessings.
3. Update `src/engine/modifiers.ts` to collect blessing modifiers.
4. Update `src/engine/game.ts` `handleGenie` and `getView`.
5. Update `tests/genie.test.ts` for new behavior.
6. Run `npm run test`. All tests pass.

**Milestone 4:**

1. Update `src/cli/index.ts` with LLM call.
2. Update `src/cli/display.ts` with blessing display.
3. Create `src/llm/wish-api.ts` for GUI fetch wrapper.
4. Update `src/gui/screens/GenieScreen.tsx` with loading/result states.
5. Update `vite.config.ts` with API proxy.
6. Update `src/gui/components/PlayerStatus.tsx` to show blessings.
7. Test CLI: `ANTHROPIC_API_KEY=sk-ant-... npm run dev -- --seed=42`, play to genie, type a wish, observe blessing.
8. Test GUI: `ANTHROPIC_API_KEY=sk-ant-... npm run dev:gui`, play to genie, type a wish, observe loading then blessing.

**Milestone 5:**

1. Add integration tests to `tests/full-game.test.ts`.
2. Add CSS styles.
3. Run `npm run test`. All tests pass.
4. Manual end-to-end verification via CLI and GUI.


## Validation and Acceptance

**Engine-level acceptance** (verifiable via tests):
- Run `npm run test` and all tests pass, including the new `blessings.test.ts` and `wish-generator.test.ts` files and updated `genie.test.ts` and `full-game.test.ts`.
- The test "Blessing modifier affects damage in combat" demonstrates that a wish blessing changes actual damage dealt during a hand.
- The test "Replay with blessing is deterministic" demonstrates that replaying a game with blessings produces identical state.

**CLI acceptance** (verifiable by running the game):
- Run `ANTHROPIC_API_KEY=<key> npm run dev -- --seed=42`.
- Play through Stage 1 (3 regular enemies + Ancient Strix boss).
- At the Genie encounter, type a wish like "I wish for the strength of a thousand suns".
- Observe: "The Genie ponders your wish..." followed by a blessing name and description.
- In the next battle, observe the blessing listed in the status display (e.g., "Blessings: Solar Fury").
- The blessing's effects are visible in combat (increased damage, dodge, healing, etc. depending on what the LLM generated).

**GUI acceptance** (verifiable by running the dev server):
- Run `ANTHROPIC_API_KEY=<key> npm run dev:gui`.
- Play to the Genie encounter.
- Type a wish and click "Grant Wish".
- Observe: A loading state ("The Genie ponders...") replaces the input area.
- After 1-3 seconds, the blessing result appears with a name and description.
- Click "Continue" to advance.
- In the PlayerStatus panel, the blessing appears alongside curses.

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

**Example BlessingDefinition (what the LLM might generate for "I wish for fire power"):**

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


## Interfaces and Dependencies

**External dependency:** `@anthropic-ai/sdk` — the official Anthropic TypeScript SDK. Provides the `Anthropic` class for calling the Messages API. Used only in `src/llm/wish-generator.ts`.

**Environment variable:** `ANTHROPIC_API_KEY` — required for LLM calls. When absent, the fallback blessing is used.

**Model:** `claude-haiku-4-5-20251001` — the LLM used for blessing generation. Fast and cost-effective for structured tool_use responses.

**New types in `src/engine/types.ts`:**

    export type BlessingEffectType =
      | 'flat_damage_bonus' | 'percent_damage_bonus'
      | 'flat_damage_reduction' | 'percent_damage_reduction'
      | 'dodge_chance' | 'bust_save'
      | 'max_hp_bonus' | 'heal_per_hand' | 'heal_on_win' | 'lifesteal'
      | 'bust_threshold_bonus' | 'dealer_stands_on' | 'double_down_multiplier'
      | 'flat_gold_bonus' | 'percent_gold_bonus'
      | 'damage_per_hand' | 'blackjack_bonus_damage' | 'suit_damage_bonus';

    export interface BlessingEffect {
      type: BlessingEffectType;
      value: number;
      suit?: Suit;
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

    // Updated PlayerAction union member:
    | { type: 'enter_wish'; text: string; blessing?: BlessingDefinition }

**New exports from `src/engine/blessings.ts`:**

    export function validateBlessingDefinition(def: BlessingDefinition): BlessingDefinition;
    export function buildBlessingModifier(def: BlessingDefinition): Modifier;

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

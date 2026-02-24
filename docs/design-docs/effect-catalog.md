# Effect Catalog

A comprehensive reference for every effect in the game: how it works, what parameters it accepts, which modifier hook implements it, and how it interacts with conditions and stacking.

---

## Overview

Effects are implemented as methods on the `Modifier` interface (`src/engine/types.ts`). Every game system that changes behavior — equipment, consumables, enemy abilities, wishes, and curses — uses the same pipeline. When multiple modifiers apply the same hook, they are chained in collection order: each modifier wraps the previous result.

**Effect sources:**

| Source tag | Meaning |
|---|---|
| `equipment` | Player gear (weapon, helm, armor, boots, trinket) |
| `consumable` | Duration-based active effects (potions) |
| `enemy` | Enemy modifiers (applied from the enemy's perspective) |
| `wish_blessing` | LLM-generated blessing from a Genie wish |
| `wish_curse` | Permanent debuff from accepting a Genie wish after a boss |

**Notation used in this document:**

- `[min–max]` — the clamped range enforced by `validateBlessingDefinition` in `blessings.ts`
- *Conditional* — the effect checks a `BlessingCondition` before firing (via `shouldApply`)
- *Not conditional* — the effect always fires; conditions in `BlessingEffect.condition` are ignored or inapplicable at the hook level
- *Built-in condition* — the effect has its own hardcoded trigger (e.g. "on blackjack") and does not use the `shouldApply` system
- **Stacking** — describes what happens when the same effect type appears on multiple modifiers simultaneously

---

## Modifier Hooks Quick Reference

| Hook | When it fires | Who can set it |
|---|---|---|
| `modifyRules` | Once per hand start (rule collection phase) | All sources |
| `modifyDeck` | Once per hand start (deck construction phase) | Blessings only |
| `modifyCardValue` | Each time a card value is computed during scoring | Blessings only |
| `modifyDamageDealt` | After hand resolution, on winning hands | All sources |
| `modifyDamageReceived` | After hand resolution, on incoming damage | All sources |
| `modifyBust` | When a hand score exceeds the bust threshold | Blessings only |
| `dodgeCheck` | Before damage is applied; if true, damage is zeroed | Equipment, enemies, blessings |
| `onHandStart` | At the beginning of each hand, before cards are dealt | All sources |
| `onHandEnd` | After hand resolution, before damage application | All sources |
| `onBattleStart` | When a new battle begins | Blessings only |
| `onBattleEnd` | When a battle ends (enemy defeated or player dies) | Blessings only |
| `modifyGoldEarned` | When gold is awarded after a battle | All sources |
| `onPush` | When the hand resolves as a tie | Blessings only |
| `onDodge` | When a dodge occurs | Blessings only |
| `onEnemyBust` | When the dealer's hand busts | Blessings only |
| `onCardDrawn` | Each time a card is dealt to player or dealer | Blessings (event conditions) |

---

## Equipment & Consumable Effects (Hardcoded)

These effects are defined statically in `equipment.ts` and `consumables.ts`. They do not use the `BlessingEffectType` system and cannot be conditional.

### Bleed
- **Source:** Certain weapons (Cavalry Saber, Iron Scimitar, Iron Javelin, Viper's Bite)
- **What it does:** Deals `X` damage to the enemy at the start of each hand for `X` hands total. After each hand, `X` decrements by 1. At `X = 0` the effect expires.
- **Hook:** `onHandStart` — subtracts the current bleed value from `context.enemyState.hp`; then decrements the remaining counter.
- **Stacking:** Additive. Two applications of Bleed 2 = 4 damage/hand, lasting 4 hands (each ticking down independently).
- **ActiveEffect lifecycle:** Stored in `playerState.activeEffects` with a `remainingHands` counter. The engine ticks `remainingHands` down and removes the effect at 0.

### Poison (from Poison Potion)
- **Source:** Poison Potion consumable
- **What it does:** Deals `X` damage to the enemy per hand for `N` hands (fixed duration from the consumable's `effect.duration`).
- **Hook:** `onHandStart` — constant damage per tick, unlike the equipment-level Poison blessing effect (see §Damage Over Time below).
- **Stacking:** Additive. Two Poison Potions stack their damage.

### Strength (from Strength Potion)
- **Source:** Strength Potion consumable
- **What it does:** Increases all outgoing damage by 30% for 1 hand.
- **Hook:** `modifyDamageDealt` — multiplies by 1.3 while the active effect is live.
- **Duration:** `remainingHands: 1` — expires after the next hand result.
- **Stacking:** Multiplicative stacking if multiple Strength Potions are active simultaneously.

### Damage (from Damage Potion)
- **Source:** Damage Potion consumable
- **What it does:** Instantly deals 5 damage to the enemy when used.
- **Applied:** Directly to `enemyState.hp` in `consumables.ts` at use time. Does not use a modifier hook — it's an imperative action.

### Health (from Health Potion)
- **Source:** Health Potion consumable
- **What it does:** Instantly restores 5 HP to the player when used.
- **Applied:** Directly to `playerState.hp` in `consumables.ts` at use time.

---

## Blessing Effects

All effects below are parameterized and generated by the LLM wish system. They are implemented in `blessings.ts` via `buildBlessingModifier`. A single blessing can have up to 3 effects combined into one `Modifier` object. All values are clamped to `[min–max]` by `validateBlessingDefinition` before the modifier is built.

Blessings support **optional conditions** on effects that use the `shouldApply` check (marked *Conditional: Yes*). Effects using `modifyRules` or `modifyDeck` run at rule-collection time and cannot be conditional (marked *Conditional: No*).

---

### Card & Deck Manipulation

These effects alter the deck composition or card values. They run via `modifyDeck` or `modifyRules`/`modifyCardValue` and are **not conditional** (they apply to every hand for the entire battle).

---

#### `flexible_rank`
- **What it does:** Makes a specific rank "flexible" — it can count as 1 or its face value, like an Ace. The player can choose the interpretation at scoring time.
- **Hook:** `modifyRules` — appends the rank to `rules.scoring.flexibleRanks`.
- **Parameters:** `rank` (required). `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Additive — multiple blessings can add different ranks to `flexibleRanks`.
- **Notes:** Only meaningful on non-Ace ranks. If applied to an Ace, it has no additional effect.

#### `change_face_card_value`
- **What it does:** Changes the point value of all face cards (J, Q, K) from the default of 10.
- **Hook:** `modifyRules` — sets `rules.scoring.faceCardValue = value`.
- **Parameters:** `value` [5–15].
- **Conditional:** No.
- **Stacking:** Last writer wins — if two blessings set this, the one applied last takes effect.

#### `change_ace_high_value`
- **What it does:** Changes the high value of an Ace from the default of 11.
- **Hook:** `modifyRules` — sets `rules.scoring.aceHighValue = value`.
- **Parameters:** `value` [8–15].
- **Conditional:** No.
- **Stacking:** Last writer wins.
- **Notes:** Ace low value (1) is unaffected. If `aceHighValue` is lowered enough that 1 becomes preferred, the engine naturally picks 1.

#### `suit_card_value_bonus`
- **What it does:** Adds `value` points to every card of the specified suit during scoring.
- **Hook:** `modifyCardValue` — checks `card.suit === effect.suit`; if true, returns `baseValue + value`.
- **Parameters:** `value` [1–5]; `suit` (required).
- **Conditional:** No (fires for each card evaluated, independent of hand state).
- **Stacking:** Additive — two blessings with the same suit stack.

#### `rank_value_override`
- **What it does:** Sets the point value of a specific rank to an exact number, overriding its default.
- **Hook:** `modifyRules` — writes `rules.scoring.rankValueOverrides[rank] = value`.
- **Parameters:** `value` [0–15]; `rank` (required).
- **Conditional:** No.
- **Stacking:** Last writer wins per rank key.
- **Notes:** Setting a rank to 0 effectively makes it a dead card.

#### `remove_rank_from_deck`
- **What it does:** Removes all cards of the specified rank from the deck before each hand.
- **Hook:** `modifyDeck` — filters out cards where `card.rank === effect.rank`.
- **Parameters:** `rank` (required). `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Multiple removals of different ranks compound (each filters independently).
- **Notes:** Can dramatically thin the deck. If combined with `no_reshuffle`, cards already dealt are gone permanently.

#### `remove_suit_from_deck`
- **What it does:** Removes all cards of the specified suit from the deck before each hand.
- **Hook:** `modifyDeck` — filters out cards where `card.suit === effect.suit`.
- **Parameters:** `suit` (required). `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Multiple removals of different suits compound.

#### `force_deck_ranks`
- **What it does:** Reduces the deck to only cards whose rank appears in `effect.ranks`. All other cards are removed.
- **Hook:** `modifyDeck` — filters to `allowedRanks.includes(c.rank)`.
- **Parameters:** `ranks` (required, 1–4 ranks). `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Two `force_deck_ranks` blessings each filter independently — the resulting deck contains only ranks that survive both filters.
- **Notes:** Extremely powerful. Restricting to [K, A] gives a high-value deck with natural blackjack potential.

#### `extra_copies_of_rank`
- **What it does:** Adds `value` extra full sets (one per suit = 4 cards each) of the specified rank to the deck.
- **Hook:** `modifyDeck` — appends `value × 4` cards (one per suit) with the given rank.
- **Parameters:** `value` [1–4]; `rank` (required).
- **Conditional:** No.
- **Stacking:** Multiple applications add cumulatively.
- **Notes:** With `value = 4`, the deck gains 16 extra copies of the rank.

#### `no_reshuffle`
- **What it does:** Disables deck reshuffling between hands. Cards dealt in previous hands are gone for the duration of the battle.
- **Hook:** `modifyRules` — sets `rules.deck.reshuffleBetweenHands = false`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** One application is sufficient; subsequent applications have no additional effect.

#### `multiple_decks`
- **What it does:** Sets the number of standard 52-card decks merged into the draw pile.
- **Hook:** `modifyRules` — sets `rules.deck.numberOfDecks = value`.
- **Parameters:** `value` [2–4].
- **Conditional:** No.
- **Stacking:** Last writer wins.
- **Notes:** Increases deck size, reducing the impact of specific card removals and making `no_reshuffle` less punishing.

---

### Scoring & Bust Manipulation

These effects change how hands are scored or how busts are resolved.

---

#### `bust_threshold_bonus`
- **What it does:** Raises the bust threshold above 21. With `value = 3`, the player busts at 25 instead.
- **Hook:** `modifyRules` — adds `value` to `rules.scoring.bustThreshold`.
- **Parameters:** `value` [1–5].
- **Conditional:** No.
- **Stacking:** Additive — multiple blessings add to the threshold cumulatively.

#### `additional_blackjack_value`
- **What it does:** Declares a second score that counts as blackjack (e.g., 22 becomes "blackjack" in addition to the natural 21).
- **Hook:** `modifyRules` — appends `value` to `rules.scoring.additionalBlackjackValues` (if not already present).
- **Parameters:** `value` [22–25].
- **Conditional:** No.
- **Stacking:** Each blessing can add a different additional value; duplicates are ignored.

#### `bust_save`
- **What it does:** When the player busts, saves the hand and sets the effective score to `value` instead of busting.
- **Hook:** `modifyBust` — if the hand is over the bust threshold, returns `{ busted: false, effectiveScore: value }`.
- **Parameters:** `value` [8–18].
- **Conditional:** No (always fires on bust, regardless of `effect.condition`).
- **Stacking:** The first `modifyBust` in the chain that returns a non-bust result wins. The engine stops at the first save.

#### `bust_card_value_halved`
- **What it does:** When the player busts, halves the value of the last card drawn and re-evaluates. If the adjusted score is within threshold, the hand is saved.
- **Hook:** `modifyBust` — computes `lastCardValue / 2` (floor), subtracts the difference from `score`, and returns a save if `newScore <= bustThreshold`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No (always evaluated on bust).
- **Stacking:** Runs after `bust_save` in chain order; if a previous modifier already saved the hand, this is skipped.
- **Notes:** Depends on the current `faceCardValue` and `aceHighValue` rules when computing the last card's value.

#### `ignore_card_on_bust`
- **What it does:** When the player busts, removes the highest non-Ace card's value from the score. If the adjusted score is within threshold, the hand is saved.
- **Hook:** `modifyBust` — finds the highest value among non-Ace cards, subtracts it from `score`, and returns a save if `newScore <= bustThreshold`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No (always evaluated on bust).
- **Stacking:** Runs in chain order; skipped if a prior modifier already saved the hand.

#### `five_card_charlie`
- **What it does:** Grants bonus damage when the player holds 5 or more cards without busting.
- **Hook:** `modifyDamageDealt` — checks `context.playerHand.cards.length >= 5 && !context.playerScore.busted`; if true, adds `value`.
- **Parameters:** `value` [5–30].
- **Conditional:** Yes.
- **Stacking:** Additive — multiple blessings each add their own bonus.

#### `soft_hand_bonus`
- **What it does:** Grants bonus damage when the player's hand is soft (contains an Ace counted as 11).
- **Hook:** `modifyDamageDealt` — checks `context.playerScore.soft`; if true, adds `value`.
- **Parameters:** `value` [2–15].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `exact_target_bonus`
- **What it does:** Grants bonus damage when the player scores exactly at the bust threshold (i.e., hits exactly 21 in base rules).
- **Hook:** `modifyDamageDealt` — checks `context.playerScore.value === context.rules.scoring.bustThreshold`; if true, adds `value`.
- **Parameters:** `value` [3–20].
- **Conditional:** Yes.
- **Stacking:** Additive.
- **Notes:** Respects modified bust thresholds. If `bust_threshold_bonus` raises the threshold to 24, this fires at 24.

---

### Player Action Unlocks

These effects enable new player actions during `player_turn` phase. All are implemented via `modifyRules` and are **not conditional**.

---

#### `enable_remove_card`
- **What it does:** Enables the "Remove Card" action, allowing the player to discard one card from their hand per hand (up to `value` times).
- **Hook:** `modifyRules` — sets `rules.actions.canRemoveCard = true` and `rules.actions.cardRemovesPerHand = value`.
- **Parameters:** `value` [1–3].
- **Conditional:** No.
- **Stacking:** Last writer wins on `cardRemovesPerHand`; `canRemoveCard` is a boolean that stays true once set.
- **Notes:** The engine tracks `cardRemovesUsed` in `ModifierContext` to enforce the per-hand limit.

#### `enable_peek`
- **What it does:** Enables the "Peek" action, revealing the top card of the deck without drawing it.
- **Hook:** `modifyRules` — sets `rules.actions.canPeek = true`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent once set.

#### `enable_surrender`
- **What it does:** Enables the "Surrender" action. Player forfeits the hand and takes half the normal incoming damage instead.
- **Hook:** `modifyRules` — sets `rules.actions.canSurrender = true`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

#### `enable_split`
- **What it does:** Enables the "Split" action when the player holds two cards of the same rank.
- **Hook:** `modifyRules` — sets `rules.actions.canSplit = true`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

#### `extra_starting_cards`
- **What it does:** Deals `value` additional cards to the player at the start of each hand.
- **Hook:** `modifyRules` — adds `value` to `rules.turnOrder.initialPlayerCards`.
- **Parameters:** `value` [1–3].
- **Conditional:** No.
- **Stacking:** Additive on `initialPlayerCards`.
- **Notes:** Starting with more cards can immediately bust if unlucky. Pairs well with `bust_save`.

#### `fewer_starting_cards`
- **What it does:** Deals `value` fewer cards to the player at the start of each hand (minimum 1).
- **Hook:** `modifyRules` — subtracts `value` from `initialPlayerCards`, clamped at 1.
- **Parameters:** `value` [1–1] (always 1).
- **Conditional:** No.
- **Stacking:** Additive reduction; multiple applications further reduce starting cards.

#### `double_down_any_time`
- **What it does:** Removes the restriction that Double Down can only be used before drawing any additional cards.
- **Hook:** `modifyRules` — sets `rules.actions.canDoubleDownAnyTime = true`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

#### `hit_after_double`
- **What it does:** Allows the player to continue hitting after doubling down (normally the player stands immediately after doubling).
- **Hook:** `modifyRules` — sets `rules.actions.canHitAfterDouble = true`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

---

### Dealer Behavior

These effects alter the dealer's rules. All are implemented via `modifyRules` and are **not conditional**.

---

#### `dealer_stands_on`
- **What it does:** Changes the score at which the dealer stands. Default is 17; lowering it makes the dealer stop earlier (less aggressive).
- **Hook:** `modifyRules` — sets `rules.dealer.standsOn = value`.
- **Parameters:** `value` [14–19].
- **Conditional:** No.
- **Stacking:** Last writer wins.

#### `dealer_hits_soft_17`
- **What it does:** Forces the dealer to hit on soft 17 (an Ace counted as 11 with total = 17). Makes the dealer more aggressive.
- **Hook:** `modifyRules` — sets `rules.dealer.standsOnSoft17 = false`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

#### `ties_favor_player`
- **What it does:** Pushes (ties) are awarded to the player instead of being a draw. The player wins on a tie.
- **Hook:** `modifyRules` — sets `rules.winConditions.tieResolution = 'player'`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent. Directly counters the Crimson Curse if both are active; last writer wins.

#### `double_bust_favors_player`
- **What it does:** When both the player and dealer bust in the same hand, the player wins instead of losing.
- **Hook:** `modifyRules` — sets `rules.winConditions.doubleBustResolution = 'player'`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

#### `dealer_reveals_cards`
- **What it does:** The dealer's hole card is revealed before the player acts (equivalent to "dealer peeks for blackjack" with full transparency).
- **Hook:** `modifyRules` — sets `rules.dealer.peeksForBlackjack = true`.
- **Parameters:** `value` is always 1 (boolean flag).
- **Conditional:** No.
- **Stacking:** Idempotent.

#### `dealer_extra_starting_card`
- **What it does:** Deals `value` additional cards to the dealer at the start of each hand.
- **Hook:** `modifyRules` — adds `value` to `rules.turnOrder.initialDealerCards`.
- **Parameters:** `value` [1–2].
- **Conditional:** No.
- **Stacking:** Additive on `initialDealerCards`.
- **Notes:** More starting cards increases the dealer's bust probability.

#### `dealer_fewer_starting_cards`
- **What it does:** Deals `value` fewer cards to the dealer at the start of each hand (minimum 1).
- **Hook:** `modifyRules` — subtracts `value` from `initialDealerCards`, clamped at 1.
- **Parameters:** `value` [1–1] (always 1).
- **Conditional:** No.
- **Stacking:** Additive reduction.

---

### Damage Bonuses

These effects increase the damage the player deals when winning a hand. All use `modifyDamageDealt` and support optional conditions.

---

#### `flat_damage_bonus`
- **What it does:** Adds `value` flat damage to every winning hand.
- **Parameters:** `value` [1–25].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `percent_damage_bonus`
- **What it does:** Increases damage by `value × 100`%. Applied as `floor(base × (1 + value))`.
- **Parameters:** `value` [0.1–1.0] (10%–100%).
- **Conditional:** Yes.
- **Stacking:** Additive on the multiplier (two 50% bonuses = +100%, not ×1.5 × ×1.5).

#### `damage_multiplier`
- **What it does:** Multiplies base damage by `value`. Applied as `floor(base × value)`.
- **Parameters:** `value` [1.5–3.0].
- **Conditional:** Yes.
- **Stacking:** Applied sequentially via chaining — effectively multiplicative if both fire.

#### `suit_damage_bonus`
- **What it does:** Adds `value` damage per card of the specified suit in the player's hand.
- **Parameters:** `value` [1–10]; `suit` (required).
- **Conditional:** Yes.
- **Stacking:** Additive.
- **Notes:** With 2 heart cards and `value = 5`, adds 10 damage.

#### `face_card_damage_bonus`
- **What it does:** Adds `value` damage per face card (J, Q, K) in the player's hand.
- **Parameters:** `value` [1–8].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `ace_damage_bonus`
- **What it does:** Adds `value` damage per Ace in the player's hand.
- **Parameters:** `value` [2–15].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `even_card_bonus`
- **What it does:** Adds `value` damage per even-ranked card (2, 4, 6, 8, 10) in the player's hand.
- **Parameters:** `value` [1–8].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `odd_card_bonus`
- **What it does:** Adds `value` damage per odd-ranked card (3, 5, 7, 9, A) in the player's hand.
- **Parameters:** `value` [1–8].
- **Conditional:** Yes.
- **Stacking:** Additive.
- **Notes:** Ace (A) is considered odd for this purpose.

#### `low_card_bonus`
- **What it does:** Adds `value` damage per low-ranked card (2–6) in the player's hand.
- **Parameters:** `value` [1–8].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `high_card_bonus`
- **What it does:** Adds `value` damage per high-ranked card (7–10) in the player's hand.
- **Parameters:** `value` [1–8].
- **Conditional:** Yes.
- **Stacking:** Additive.
- **Notes:** "High" is 7–10; face cards (J/Q/K) use `face_card_damage_bonus` instead.

#### `blackjack_bonus_damage`
- **What it does:** Adds `value` flat damage when the player hits blackjack.
- **Hook:** `modifyDamageDealt` — checks `context.playerScore.isBlackjack`.
- **Parameters:** `value` [3–25].
- **Conditional:** Yes (but the built-in blackjack check takes precedence over any user condition).
- **Stacking:** Additive.

#### `blackjack_damage_multiplier`
- **What it does:** Multiplies total damage by `value` when the player hits blackjack. Applied as `floor(base × value)`.
- **Hook:** `modifyDamageDealt` — checks `context.playerScore.isBlackjack`.
- **Parameters:** `value` [1.5–3.0].
- **Conditional:** Yes.
- **Stacking:** Sequential chaining — effectively multiplicative with other multipliers.

#### `damage_on_push`
- **What it does:** Deals `value` damage directly to the enemy whenever a hand ties (push).
- **Hook:** `onPush` — directly sets `context.enemyState.hp = Math.max(0, hp - value)`.
- **Parameters:** `value` [2–15].
- **Conditional:** Yes (shouldApply checked in onPush).
- **Stacking:** Additive — each blessing applies its own damage.

#### `damage_per_card_in_hand`
- **What it does:** Adds `value` damage per card in the player's hand.
- **Parameters:** `value` [1–5].
- **Conditional:** Yes.
- **Stacking:** Additive.
- **Notes:** Synergizes strongly with `extra_starting_cards` and `five_card_charlie`.

#### `overkill_carry`
- **What it does:** When the killing blow exceeds the enemy's remaining HP, carries `value × 100`% of the excess damage to the player's HP pool (heals the player for overkill).
- **Hook:** `modifyRules` — sets `rules.damage.overkillCarryPercent = value`.
- **Parameters:** `value` [0.25–1.0] (25%–100% of overkill).
- **Conditional:** No (rule-level).
- **Stacking:** Last writer wins.

#### `scaling_damage_per_win`
- **What it does:** Adds `value` flat damage per hand won so far this battle. Scales up over a long fight.
- **Parameters:** `value` [1–5].
- **Conditional:** Yes.
- **Stacking:** Additive across multiple blessings.
- **Notes:** Reads `context.handsWonThisBattle`.

#### `double_down_multiplier`
- **What it does:** Changes the damage multiplier applied when the player doubles down.
- **Hook:** `modifyRules` — sets `rules.actions.doubleDownMultiplier = value`.
- **Parameters:** `value` [2–5].
- **Conditional:** No (rule-level).
- **Stacking:** Last writer wins.

---

### Damage Reduction & Defense

These effects reduce incoming damage or provide other defensive benefits. Most use `modifyDamageReceived`.

---

#### `flat_damage_reduction`
- **What it does:** Subtracts `value` from all incoming damage (floored at 0).
- **Parameters:** `value` [1–15].
- **Conditional:** Yes.
- **Stacking:** Additive — two reductions of 5 subtract 10 total.

#### `percent_damage_reduction`
- **What it does:** Reduces all incoming damage by `value × 100`%. Applied as `floor(base × (1 - value))`.
- **Parameters:** `value` [0.05–0.5] (5%–50%).
- **Conditional:** Yes.
- **Stacking:** Additive on the reduction factor (two 25% reductions = 50% total reduction).

#### `dodge_chance`
- **What it does:** Adds a `value × 100`% chance to dodge all damage from a hand.
- **Hook:** `dodgeCheck` — returns `rng.next() < value`.
- **Parameters:** `value` [0.05–0.35] (5%–35%).
- **Conditional:** No (dodge is binary — the roll fires unconditionally; conditions are not checked inside dodgeCheck).
- **Stacking:** Additive chance — the dodge system checks multiple `dodgeCheck` modifiers in sequence; any one returning true triggers a dodge.

#### `thorns`
- **What it does:** When the player takes damage, reflects `value × 100`% of that damage back to the enemy.
- **Hook:** `modifyRules` — sets `rules.damage.thornsPercent = value`.
- **Parameters:** `value` [0.1–0.5] (10%–50%).
- **Conditional:** No (rule-level).
- **Stacking:** Last writer wins on `thornsPercent`.
- **Notes:** Applied by the engine after damage resolution. If the player dodges, no thorns fire.

#### `damage_shield`
- **What it does:** Absorbs up to `value` damage per hand before the player's HP is reduced.
- **Hook:** `modifyRules` — sets `rules.damage.damageShield = value`.
- **Parameters:** `value` [5–30].
- **Conditional:** No (rule-level).
- **Stacking:** Last writer wins.
- **Notes:** Shield resets each hand (it's a per-hand absorb, not a permanent pool).

#### `damage_cap`
- **What it does:** No single hand can deal more than `value` damage to the player.
- **Hook:** `modifyRules` — sets `rules.damage.damageCap = value`.
- **Parameters:** `value` [5–25].
- **Conditional:** No (rule-level).
- **Stacking:** Last writer wins (lower cap is the binding constraint).

#### `suit_damage_reduction`
- **What it does:** If the player holds 2 or more cards of the specified suit, reduces incoming damage by `value × 100`%.
- **Hook:** `modifyDamageReceived` — counts `playerHand.cards` with `suit === effect.suit`; if `count >= 2`, applies reduction.
- **Parameters:** `value` [0.1–0.4] (10%–40%); `suit` (required).
- **Conditional:** Yes.
- **Stacking:** Additive reductions.
- **Notes:** This is a *player-hand* check, distinct from the Bronze Trinket's suit resistance which checks the dealer's scoring cards.

#### `reduce_bust_damage`
- **What it does:** Reduces incoming damage by `value × 100`% when the player busts. (The player still takes damage on a bust, but less.)
- **Hook:** `modifyDamageReceived` — checks `context.playerScore.busted`; if true, reduces damage.
- **Parameters:** `value` [0.2–0.8] (20%–80%).
- **Conditional:** Yes.
- **Stacking:** Additive reduction on bust.
- **Notes:** This is the blessing-system version of the Helm equipment effect; they stack additively.

---

### Healing

These effects restore the player's HP. Most have built-in conditions and do **not** use the `shouldApply` system.

---

#### `max_hp_bonus`
- **What it does:** Permanently increases the player's max HP and current HP by `value`.
- **Hook:** `onBattleStart` — fires once when a new battle begins. Applies `maxHp += value; hp += value`.
- **Parameters:** `value` [5–30].
- **Conditional:** No (fires once per battle unconditionally; only runs if not yet applied for this battle).
- **Stacking:** Additive. Each blessing permanently adds to max HP.

#### `heal_per_hand`
- **What it does:** Heals the player for `value` HP at the start of every hand.
- **Hook:** `onHandStart` — fires before cards are dealt, no condition check.
- **Parameters:** `value` [1–5].
- **Conditional:** No (fires every hand unconditionally).
- **Stacking:** Additive.

#### `heal_on_win`
- **What it does:** Heals `value` HP when the player wins a hand (not a push, not a bust-win).
- **Hook:** `onHandEnd` — checks `!playerScore.busted && (dealerScore.busted || playerScore.value > dealerScore.value)`.
- **Parameters:** `value` [1–10].
- **Conditional:** Built-in (win check); `shouldApply` not used.
- **Stacking:** Additive.

#### `heal_on_blackjack`
- **What it does:** Heals `value` HP when the player hits blackjack.
- **Hook:** `onHandEnd` — checks `context.playerScore.isBlackjack`.
- **Parameters:** `value` [3–15].
- **Conditional:** Built-in (blackjack check).
- **Stacking:** Additive.

#### `heal_on_dodge`
- **What it does:** Heals `value` HP each time the player successfully dodges incoming damage.
- **Hook:** `onDodge` — fires when the engine triggers a dodge event.
- **Parameters:** `value` [2–10].
- **Conditional:** No (always fires on dodge).
- **Stacking:** Additive.

#### `lifesteal`
- **What it does:** At the end of each hand where damage was dealt to the enemy, heals the player for `value × 100`% of the damage dealt.
- **Hook:** `onHandEnd` — checks `context.lastDamageDealt > 0`; heals `floor(lastDamageDealt × value)`.
- **Parameters:** `value` [0.1–0.5] (10%–50%).
- **Conditional:** Built-in (damage dealt check).
- **Stacking:** Additive on the lifesteal fraction.

#### `heal_per_battle`
- **What it does:** Heals the player for `value` HP at the start of each battle (after the previous battle ends).
- **Hook:** `modifyRules` — adds `value` to `rules.health.healthRegenPerBattle`.
- **Parameters:** `value` [3–15].
- **Conditional:** No (rule-level regen applied by the engine on battle start).
- **Stacking:** Additive on `healthRegenPerBattle`.

#### `heal_on_push`
- **What it does:** Heals `value` HP whenever a hand ties (push).
- **Hook:** `onPush` — adds HP directly to player state.
- **Parameters:** `value` [1–8].
- **Conditional:** No (always fires on push).
- **Stacking:** Additive.

---

### Damage Over Time

These effects deal ongoing damage to the enemy each hand, independent of winning or losing.

---

#### `damage_per_hand`
- **What it does:** Deals `value` damage to the enemy at the start of every hand, regardless of the outcome.
- **Hook:** `onHandStart` — fires before cards are dealt.
- **Parameters:** `value` [1–5].
- **Conditional:** Yes (shouldApply checked in onHandStart).
- **Stacking:** Additive. Multiple blessings each deal their own damage.

#### `poison`
- **What it does:** Deals escalating damage to the enemy at the start of each hand: `value` on the first hand, `value + 1` on the second, `value + 2` on the third, etc. Increases indefinitely as long as the blessing is active.
- **Hook:** `onHandStart` — uses a closure counter `poisonCounter` that increments each hand.
- **Parameters:** `value` [1–3] (initial damage per hand).
- **Conditional:** Yes.
- **Stacking:** Each blessing instance has its own counter; they stack additively.
- **Notes:** This is the **blessing** version of poison — it escalates each hand. The **consumable** Poison Potion deals flat damage for a fixed duration and does not escalate.

#### `damage_on_enemy_bust`
- **What it does:** Deals `value` bonus damage to the enemy when the dealer's hand busts.
- **Hook:** `onEnemyBust` — fires when the dealer exceeds the bust threshold.
- **Parameters:** `value` [3–15].
- **Conditional:** Yes (shouldApply checked).
- **Stacking:** Additive.

---

### Economy

These effects modify gold earned from battles or shop prices.

---

#### `flat_gold_bonus`
- **What it does:** Adds `value` gold to the reward at the end of each battle.
- **Hook:** `modifyGoldEarned` — adds `value` to the gold total.
- **Parameters:** `value` [2–20].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `percent_gold_bonus`
- **What it does:** Increases gold earned by `value × 100`% per battle. Applied as `floor(base × (1 + value))`.
- **Parameters:** `value` [0.1–1.0] (10%–100%).
- **Conditional:** Yes.
- **Stacking:** Additive on the multiplier.

#### `gold_per_hand_won`
- **What it does:** Adds `value` gold to the end-of-battle reward for each hand won during that battle.
- **Hook:** `modifyGoldEarned` — adds `context.handsWonThisBattle × value`.
- **Parameters:** `value` [1–5].
- **Conditional:** Yes.
- **Stacking:** Additive.

#### `gold_per_blackjack`
- **What it does:** Adds `value` gold for each blackjack the player hit during the battle, awarded at end-of-battle.
- **Hook:** `onHandEnd` tracks blackjack count; `modifyGoldEarned` converts count to gold bonus, then resets the counter.
- **Parameters:** `value` [3–15].
- **Conditional:** Built-in (blackjack count tracking).
- **Stacking:** Each blessing instance tracks its own count independently.

#### `shop_discount`
- **What it does:** Reduces all shop prices by `value × 100`%.
- **Hook:** `modifyRules` — multiplies `rules.economy.shopPriceMultiplier` by `(1 - value)`.
- **Parameters:** `value` [0.1–0.5] (10%–50%).
- **Conditional:** No (rule-level).
- **Stacking:** Multiplicative — two 25% discounts yield `0.75 × 0.75 = 56.25%` of original price.

---

## Conditions Reference

Conditions are optional on `BlessingEffect`. When present, the effect's `shouldApply` check evaluates the condition against the current `ModifierContext` and only fires if it returns `true`.

**Important:** Conditions only work on effects that call `shouldApply`. Rule-level effects (`modifyRules`, `modifyDeck`) ignore conditions entirely — see individual entries above for which effects support conditions.

### State Conditions

Evaluated at the moment the effect hook fires.

| Condition type | Fires when… | Required params |
|---|---|---|
| `hand_contains_pair` | Player's hand has at least two cards of the same rank | — |
| `hand_is_flush` | All cards in player's hand share the same suit | — |
| `hand_all_same_color` | All cards in player's hand are the same color (all red or all black) | — |
| `hand_size_equals` | Player's hand contains exactly `value` cards | `value` |
| `hand_size_gte` | Player's hand contains `value` or more cards | `value` |
| `hand_contains_rank` | Player's hand contains at least one card of the specified `rank` | `rank` |
| `hand_contains_suit` | Player's hand contains at least one card of the specified `suit` | `suit` |
| `score_exactly` | Player's hand score equals exactly `value` | `value` |
| `score_gte` | Player's hand score is `value` or higher | `value` |
| `on_blackjack` | Player hit blackjack this hand | — |
| `on_bust` | Player busted this hand | — |
| `on_soft_hand` | Player's hand is soft (Ace counted as 11) | — |
| `on_win` | Player won this hand (not busted, dealer busted or player scored higher) | — |
| `on_loss` | Player lost this hand (busted, or dealer scored higher without busting) | — |
| `on_push` | This hand was a tie | — |
| `on_dodge` | A dodge occurred this hand | — |
| `on_enemy_bust` | The dealer busted this hand | — |
| `on_win_no_damage_taken` | Player won this hand and `lastDamageTaken === 0` | — |
| `hp_below_percent` | Player's current HP is below `value`% of their max HP | `value` (0–100) |
| `hp_above_percent` | Player's current HP is above `value`% of their max HP | `value` (0–100) |
| `enemy_hp_below_percent` | Enemy's current HP is below `value`% of their max HP | `value` (0–100) |
| `gold_above` | Player currently holds more than `value` gold | `value` |
| `consecutive_wins` | Player has won `value` or more consecutive hands in this battle | `value` |
| `consecutive_losses` | Player has lost `value` or more consecutive hands in this battle | `value` |
| `first_hand_of_battle` | This is hand number 1 of the current battle | — |
| `same_score_as_previous` | Player's score exactly matches their score from the previous hand | — |
| `enemy_killed_by_dot` | Enemy HP dropped to 0 from a DoT effect (not hand damage) | — |
| `enemy_killed_by_blackjack` | Enemy died and player had blackjack this hand | — |

### Event-Driven Conditions

These conditions are set via `onCardDrawn` and use a per-hand `triggered` flag. The `onHandStart` hook resets the flag at the beginning of each hand. **These only work on `modifyDamageDealt` and `modifyDamageReceived` hooks** (effects that fire after `onCardDrawn` has run).

| Condition type | Fires when… | Required params |
|---|---|---|
| `when_player_draws_rank` | The player drew a card of the specified `rank` this hand | `rank` |
| `when_player_draws_suit` | The player drew a card of the specified `suit` this hand | `suit` |
| `when_dealer_draws_rank` | The dealer drew a card of the specified `rank` this hand | `rank` |
| `when_dealer_draws_suit` | The dealer drew a card of the specified `suit` this hand | `suit` |

---

## Persistent Effects (Curses)

Curses are permanent debuffs applied to the player after choosing a wish at the Genie encounter. They are `Modifier` objects with `source: 'wish_curse'` added permanently to the player's modifier stack.

### Night Fang Curse (`curse_strix`)
- **Applied by:** Ancient Strix (Stage 1 boss)
- **Effect:** +5 incoming damage whenever the dealer hits blackjack.
- **Hook:** `modifyDamageReceived` — checks `context.dealerScore.isBlackjack`.
- **Notes:** Stacks additively with other incoming damage modifiers. Since every Stage 2 and 3 boss attempts blackjack, this curse becomes increasingly threatening.

### Warden Curse (`curse_djinn`)
- **Applied by:** Djinn Warden (Stage 2 boss)
- **Effect:** Player loses 3 HP at the start of every hand.
- **Hook:** `onHandStart` — unconditional `playerState.hp -= 3` (floored at 0).
- **Notes:** Pressure effect that scales with battle length. At 3 HP/hand, a 10-hand battle costs 30 HP. Does not interact with healing — both fire in the same phase but healing is applied first if `heal_per_hand` is also active.

### Crimson Curse (`curse_sultan`)
- **Applied by:** Crimson Sultan (Stage 3 boss)
- **Effect:** Tie resolution is permanently set to `'dealer'` — pushes award the hand to the dealer.
- **Hook:** `modifyRules` — sets `rules.winConditions.tieResolution = 'dealer'`.
- **Notes:** This is a rule-level change, not a per-hand effect. The `ties_favor_player` blessing directly counteracts this if applied after the curse (last writer wins on `tieResolution`).

---

## Equipment Effects (Static Reference)

These effects are defined directly in `equipment.ts` and use the same modifier hooks. They are not parameterized by the blessing system.

| Equipment | Slot | Hook | Effect |
|---|---|---|---|
| Cloth Helm | helm | `modifyDamageReceived` | 30% reduction on bust |
| Bronze Helm | helm | `modifyDamageReceived` | 50% reduction on bust |
| Iron Helm | helm | `modifyDamageReceived` | 80% reduction on bust |
| Cloth Armor | armor | `modifyDamageReceived` | 20% flat reduction |
| Bronze Armor | armor | `modifyDamageReceived` | 40% flat reduction |
| Iron Armor | armor | `modifyDamageReceived` | 60% flat reduction |
| Cloth Boots | boots | `dodgeCheck` | 10% dodge |
| Bronze Boots | boots | `dodgeCheck` | 25% dodge |
| Iron Boots | boots | `dodgeCheck` | 40% dodge |
| Cloth Trinket | trinket | `modifyGoldEarned` | +10 gold per battle |
| Bronze Trinket | trinket | `modifyDamageReceived` | 25% reduction when hand vs. a randomly drawn suit each battle |
| Iron Trinket | trinket | `modifyBust` | Bust counts as score 10 (player never actually busts) |

> **Bronze Trinket note:** The suit is randomized once per battle via `rng.nextInt`. The damage reduction applies when the *dealer's* scoring cards include the chosen suit — this is distinct from the `suit_damage_reduction` blessing, which checks the *player's* hand for ≥2 cards of the suit.

# User Interface Wiki

All data a UI layer displays comes from the `GameView` interface returned by `GameEngine.getView()`. Every field referenced below maps directly to a property on `GameView` (`src/engine/types.ts:282-318`). Player actions are dispatched via `GameEngine.performAction(action)` (`src/engine/game.ts`).

Valid actions for the current phase are always available at `GameView.availableActions`.

---

## Table of Contents

- [Persistent Modules](#persistent-modules)
- [Screen: Pre-Hand](#screen-pre-hand)
- [Screen: Player Turn](#screen-player-turn)
- [Screen: Hand Result](#screen-hand-result)
- [Screen: Battle Result](#screen-battle-result)
- [Screen: Shop](#screen-shop)
- [Screen: Genie Encounter](#screen-genie-encounter)
- [Screen: Game Over](#screen-game-over)
- [Screen: Victory](#screen-victory)

---

## Persistent Modules

These modules are displayed across multiple screens. They sit beneath the phase-specific content and provide ongoing context to the player.

### Module: Header Bar

Shown on every screen. Gives the player their run context at a glance.

| Field | Source | Description |
|-------|--------|-------------|
| Stage number | `view.stage` | Current stage (1-3) |
| Battle number | `view.battle` | Current battle within stage (1-4) |
| Hand number | `view.handNumber` | Hand counter within the current battle |
| Boss indicator | `view.enemy.isBoss` | Whether the current enemy is a boss |
| Seed | `view.seed` | RNG seed for the run (for replay/sharing) |

### Module: Enemy Status

Shown whenever `view.enemy` is not null (all combat and combat-adjacent phases: `pre_hand`, `player_turn`, `hand_result`, `battle_result`).

| Field | Source | Description |
|-------|--------|-------------|
| Name | `view.enemy.name` | Enemy display name (e.g. "Desert Jackal", "Ancient Strix") |
| Current HP | `view.enemy.hp` | Current health points |
| Max HP | `view.enemy.maxHp` | Maximum health points |
| Boss flag | `view.enemy.isBoss` | Whether this is a boss encounter |
| Description | `view.enemy.description` | Lore/flavor text |
| Ability descriptions | `view.enemy.modifierDescriptions` | Array of strings describing active enemy abilities |

### Module: Player Status

Shown on every screen.

| Field | Source | Description |
|-------|--------|-------------|
| Current HP | `view.player.hp` | Player's current health |
| Max HP | `view.player.maxHp` | Player's maximum health (default 50) |
| Gold | `view.player.gold` | Currency for shopping |

### Module: Equipment Display

Shown on every screen. Displays the player's 5 equipment slots.

| Field | Source | Description |
|-------|--------|-------------|
| Weapon | `view.player.equipment.weapon` | Equipped weapon or null |
| Helm | `view.player.equipment.helm` | Equipped helm or null |
| Armor | `view.player.equipment.armor` | Equipped armor or null |
| Boots | `view.player.equipment.boots` | Equipped boots or null |
| Trinket | `view.player.equipment.trinket` | Equipped trinket or null |

Each equipment item (`Equipment` type, `src/engine/types.ts:27-35`) exposes:
- `name` — Display name (e.g. "Flint Spear")
- `slot` — Which slot it occupies
- `tier` — `cloth`, `bronze`, or `iron`
- `description` — Effect description text
- `cost` — Purchase price in gold

### Module: Consumable Inventory

Shown when `view.player.consumables.length > 0`. Multiple copies of the same consumable should be grouped with a count.

| Field | Source | Description |
|-------|--------|-------------|
| Consumable list | `view.player.consumables` | Array of `Consumable` items in inventory |

Each consumable (`Consumable` type, `src/engine/types.ts:47-54`) exposes:
- `name` — Display name (e.g. "Health Potion")
- `type` — `health_potion`, `damage_potion`, `strength_potion`, `poison_potion`
- `description` — Effect description text
- `cost` — Purchase price in gold

### Module: Active Effects

Shown when `view.player.activeEffects.length > 0`. These are temporary buffs/debuffs from consumables.

| Field | Source | Description |
|-------|--------|-------------|
| Effect list | `view.player.activeEffects` | Array of `ActiveEffect` objects |

Each active effect (`ActiveEffect` type, `src/engine/types.ts:77-82`) exposes:
- `name` — Effect display name (e.g. "Strength", "Poison")
- `remainingHands` — Number of hands this effect persists

### Module: Curse List

Shown when the player has any wishes with curses (`view.player.wishes` where `wish.curse` is not null).

| Field | Source | Description |
|-------|--------|-------------|
| Curse names | `view.player.wishes[].curse.name` | Name of each active curse |

Curses are permanent for the rest of the run. Each `Wish` object (`src/engine/types.ts:58-62`) contains:
- `blessingText` — The blessing the player typed
- `curse` — The `Modifier` applied as a curse (or null)
- `bossName` — Name of the boss that granted the curse

### Module: Event Log

Shown when `view.log.length > 0`. Displays the most recent game events (last 5 entries).

| Field | Source | Description |
|-------|--------|-------------|
| Log entries | `view.log` | Array of recent event description strings |

---

## Screen: Pre-Hand

**Phase**: `view.phase === 'pre_hand'`

The preparation phase before cards are dealt for a new hand. The player may use consumables or continue to start the hand.

### Module: Card Table (preview)

Shown if `view.player.hand` and `view.enemy` are both non-null (cards have been dealt but hand hasn't started yet).

| Field | Source | Description |
|-------|--------|-------------|
| Player cards | `view.player.hand` | Array of `Card` objects in player's hand |
| Player score | `view.player.handScore.value` | Numeric hand value |
| Player soft flag | `view.player.handScore.soft` | Whether the hand is soft (ace counted as 11) |
| Dealer visible cards | `view.enemy.visibleCards` | Array of `Card | null` (null = face-down card) |
| Dealer visible score | `view.enemy.visibleScore` | Score of visible cards only, or null |

Each card (`Card` type, `src/engine/types.ts:6-9`) has:
- `suit` — `hearts`, `diamonds`, `clubs`, `spades`
- `rank` — `2` through `10`, `J`, `Q`, `K`, `A`

Card display strings are produced by `cardToString()` (`src/engine/cards.ts`), e.g. `A♠`, `K♥`, `10♦`.

### Available Actions

| Action | Type | Condition |
|--------|------|-----------|
| Use consumable | `{ type: 'use_consumable', itemIndex: number }` | Player has consumables in inventory. `itemIndex` is 0-based index into `view.player.consumables`. |
| Continue | `{ type: 'continue' }` | Always available. Deals cards and starts the hand. |

---

## Screen: Player Turn

**Phase**: `view.phase === 'player_turn'`

The active blackjack hand. The player decides whether to hit, stand, or double down.

### Module: Card Table (active)

The primary game display during a hand.

| Field | Source | Description |
|-------|--------|-------------|
| Player cards | `view.player.hand` | Full array of player's current cards |
| Player score | `view.player.handScore.value` | Current hand value |
| Player soft flag | `view.player.handScore.soft` | Whether an ace is counted as 11 |
| Player busted | `view.player.handScore.busted` | Whether the hand exceeds bust threshold |
| Player blackjack | `view.player.handScore.isBlackjack` | Whether the hand is a natural blackjack (2 cards at 21) |
| Dealer visible cards | `view.enemy.visibleCards` | Dealer's cards — one is null (face-down) |
| Dealer visible score | `view.enemy.visibleScore` | Score of the visible card only |
| Dealer all revealed | `view.enemy.allRevealed` | `false` during player turn |

### Available Actions

| Action | Type | Condition |
|--------|------|-----------|
| Hit | `{ type: 'hit' }` | Always available during player turn |
| Stand | `{ type: 'stand' }` | Always available during player turn |
| Double down | `{ type: 'double_down' }` | Only on first action of the hand, when `rules.actions.canDoubleDown` is true. Check `view.availableActions` for presence. |

---

## Screen: Hand Result

**Phase**: `view.phase === 'hand_result'`

Displays the outcome of the completed hand after the dealer has played.

### Module: Card Table (resolved)

Both hands are fully revealed.

| Field | Source | Description |
|-------|--------|-------------|
| Player cards | `view.player.hand` | Final player hand |
| Player score | `view.player.handScore` | Final scored value |
| Dealer cards | `view.enemy.visibleCards` | All cards visible (no nulls) |
| Dealer score | `view.enemy.visibleScore` | Dealer's final score |
| Dealer all revealed | `view.enemy.allRevealed` | `true` — all cards face up |

### Module: Hand Result Overlay

Overlays the card table with the outcome of the hand. Data comes from `view.lastHandResult` (`HandResult` type, `src/engine/types.ts:128-136`).

| Field | Source | Description |
|-------|--------|-------------|
| Winner | `view.lastHandResult.winner` | `'player'`, `'dealer'`, or `'push'` |
| Player score | `view.lastHandResult.playerScore` | Full `HandScore` object for the player |
| Dealer score | `view.lastHandResult.dealerScore` | Full `HandScore` object for the dealer |
| Damage dealt | `view.lastHandResult.damageDealt` | Numeric damage inflicted |
| Damage target | `view.lastHandResult.damageTarget` | `'player'`, `'dealer'`, or `'none'` |
| Dodged | `view.lastHandResult.dodged` | Whether the damage was completely dodged |
| Damage breakdown | `view.lastHandResult.damageBreakdown` | Human-readable breakdown string (e.g. `"base:5 +Flint Spear:5 -Cloth Armor:2 = 8"`) |

Updated HP values are reflected in the persistent Player Status and Enemy Status modules.

### Available Actions

| Action | Type | Condition |
|--------|------|-----------|
| Continue | `{ type: 'continue' }` | Always available. Proceeds to next hand or battle result. |

---

## Screen: Battle Result

**Phase**: `view.phase === 'battle_result'`

Shown when an enemy reaches 0 HP. Displays victory information and gold earned.

### Module: Victory Banner

| Field | Source | Description |
|-------|--------|-------------|
| Defeated enemy name | `view.enemy.name` | Name of the enemy that was defeated |
| Player gold | `view.player.gold` | Updated gold total (includes battle reward) |

Gold reward amounts are determined by `rules.economy.goldPerBattle` (regular) or `rules.economy.goldPerBoss` (boss), modified by any `modifyGoldEarned` modifiers in the pipeline (e.g. Cloth Trinket adds +10).

### Available Actions

| Action | Type | Condition |
|--------|------|-----------|
| Continue | `{ type: 'continue' }` | Always available. Routes to shop (regular battles) or genie encounter (boss battles). |

---

## Screen: Shop

**Phase**: `view.phase === 'shop'`

Post-battle shop where the player can buy equipment and consumables. Only appears after regular battles (not after bosses).

### Module: Shop Inventory

Data comes from `view.shop.items` (`ShopItem[]`, available when `view.shop` is not null).

| Field | Source | Description |
|-------|--------|-------------|
| Item list | `view.shop.items` | Array of available shop items |

Each `ShopItem` (`src/engine/types.ts:140-145`) exposes:

| Field | Source | Description |
|-------|--------|-------------|
| Index | `shopItem.index` | 0-based index for purchase action |
| Item data | `shopItem.item` | The `Equipment` or `Consumable` object |
| Item type | `shopItem.type` | `'equipment'` or `'consumable'` |
| Affordable | `shopItem.affordable` | Whether the player can afford this item |

For equipment items, additionally display:
- `item.slot` — Which equipment slot it fills (`weapon`, `helm`, `armor`, `boots`, `trinket`)
- `item.tier` — Item tier (`cloth`, `bronze`, `iron`)
- `item.name` — Display name
- `item.description` — Effect description
- `item.cost` — Price in gold

For consumable items:
- `item.name` — Display name
- `item.description` — Effect description
- `item.cost` — Price in gold

The player's current gold is shown in the persistent Player Status module for comparison.

Shop inventory generation logic is in `src/engine/shop.ts`. The shop only offers equipment tiers higher than what the player currently has in each slot.

### Available Actions

| Action | Type | Condition |
|--------|------|-----------|
| Buy item | `{ type: 'buy_item', itemIndex: number }` | `itemIndex` matches `shopItem.index`. Item must be affordable. |
| Skip shop | `{ type: 'skip_shop' }` | Always available. Advances to next battle. |

---

## Screen: Genie Encounter

**Phase**: `view.phase === 'genie'`

Appears after defeating a boss. The player receives a curse and enters a blessing wish as free text.

### Module: Genie Dialogue

Data comes from `view.genie` (available when `view.genie` is not null, `src/engine/types.ts:314`).

| Field | Source | Description |
|-------|--------|-------------|
| Boss name | `view.genie.bossName` | Name of the boss just defeated |
| Curse description | `view.genie.curseDescription` | Text describing the permanent curse being applied |
| Blessing entered | `view.genie.blessingEntered` | Whether the player has already submitted their wish text |

### Module: Accumulated Curses

Shows all curses the player has accumulated so far, including the new one.

| Field | Source | Description |
|-------|--------|-------------|
| Previous curses | `view.player.wishes[].curse.name` | Names of all curses from previous bosses |

### Available Actions

| Action | Type | Condition |
|--------|------|-----------|
| Enter wish | `{ type: 'enter_wish', text: string }` | Player types free-form blessing text. Available when `view.genie.blessingEntered` is false. |

After the wish is entered:
- The curse is applied to the player permanently.
- Player HP resets to `maxHp`.
- The game advances to the next stage.

Blessing text is stored in `view.player.wishes[].blessingText` but has no mechanical effect in the current implementation. The modifier system (`src/engine/modifiers.ts`) is designed to support future LLM-generated effects from blessing text.

---

## Screen: Game Over

**Phase**: `view.phase === 'game_over'`

Terminal screen shown when the player's HP reaches 0.

### Module: Game Over Summary

| Field | Source | Description |
|-------|--------|-------------|
| Stage reached | `view.stage` | The stage the player died on |
| Battle reached | `view.battle` | The battle the player died on |
| Final gold | `view.player.gold` | Gold accumulated during the run |
| Wishes earned | `view.player.wishes.length` | Number of bosses defeated (wishes collected) |
| Seed | `view.seed` | RNG seed for replaying the run |

### Available Actions

None. This is a terminal state. No actions in `view.availableActions`.

---

## Screen: Victory

**Phase**: `view.phase === 'victory'`

Terminal screen shown when all 3 stages are cleared.

### Module: Victory Summary

| Field | Source | Description |
|-------|--------|-------------|
| Wishes earned | `view.player.wishes.length` | Total wishes earned (max 3, one per boss) |
| Final gold | `view.player.gold` | Gold accumulated during the run |
| Seed | `view.seed` | RNG seed for replaying the run |

### Available Actions

None. This is a terminal state. No actions in `view.availableActions`.

---

## Appendix: Action Prompt Reference

Summary of all input actions by phase, for implementing input handling.

| Phase | Actions | Notes |
|-------|---------|-------|
| `pre_hand` | `use_consumable`, `continue` | Consumable use requires `itemIndex` (0-based) |
| `player_turn` | `hit`, `stand`, `double_down` | Double down only on first action of hand |
| `hand_result` | `continue` | |
| `battle_result` | `continue` | |
| `shop` | `buy_item`, `skip_shop` | Buy requires `itemIndex` matching `ShopItem.index` |
| `genie` | `enter_wish` | Requires `text` string from player |
| `game_over` | (none) | Terminal |
| `victory` | (none) | Terminal |

## Appendix: Data Type Quick Reference

All types defined in `src/engine/types.ts`.

| Type | Key Fields | Used In |
|------|------------|---------|
| `Card` | `suit`, `rank` | Card Table modules |
| `HandScore` | `value`, `soft`, `busted`, `isBlackjack` | Card Table, Hand Result |
| `Equipment` | `name`, `slot`, `tier`, `description`, `cost` | Equipment Display, Shop |
| `Consumable` | `name`, `type`, `description`, `cost` | Consumable Inventory, Shop, Pre-Hand |
| `ActiveEffect` | `name`, `remainingHands` | Active Effects module |
| `Wish` | `blessingText`, `curse`, `bossName` | Curse List, Genie, Victory/Game Over |
| `ShopItem` | `index`, `item`, `type`, `affordable` | Shop Inventory |
| `HandResult` | `winner`, `damageDealt`, `damageTarget`, `dodged`, `damageBreakdown` | Hand Result Overlay |
| `GameView` | (all above composed) | Every screen |

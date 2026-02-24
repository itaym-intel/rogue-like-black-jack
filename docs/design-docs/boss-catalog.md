# Boss Catalog

A reference for all boss combatants encountered at the end of each stage. For regular enemies, see `combatant-catalog.md`.

---

## How Bosses Work

Bosses are `CombatantData` objects with `isBoss: true`. They differ from regular enemies in two ways:

1. **More equipment** — bosses carry multiple modifier pieces that combine into a cohesive threat.
2. **A curse** — after defeating a boss, the player visits the Genie and can make a wish. Accepting the wish applies a permanent player debuff (`source: 'wish_curse'`) that lasts the rest of the run.

> **Modifier hook orientation:** Boss `modifyDamageDealt` increases what the player takes. Boss `modifyDamageReceived` reduces what the boss takes (i.e., it resists player damage). Symmetrical with the player modifier pipeline.

---

## Stage 1 Boss — Ancient Strix

| Stat | Value |
|---|---|
| Max HP | 50 |
| Description | An ancient owl-like demon of the desert night. |

**Equipment:**

- **Night Fang** (weapon)
  - *+8 damage when the dealer hits blackjack.*
  - Hook: `modifyDamageDealt` — checks `context.dealerScore.isBlackjack`; if true, adds 10.

- **Red Bane** (trinket)
  - *+2 damage per red card (hearts or diamonds) in the player's hand.*
  - Hook: `modifyDamageReceived` — counts cards in `context.playerHand.cards` where `suit === 'hearts' || suit === 'diamonds'`; adds `count × 2` to incoming damage (player takes more).

**Curse — Night Fang Curse** (`curse_strix`)

| Curse Property | Value |
|---|---|
| Display name | Night Fang Curse |
| Trigger | `modifyDamageReceived` on the player |
| Effect | +5 to all incoming damage when the dealer hits blackjack |
| Source tag | `wish_curse` |

*Implementation:* Installs `modifyDamageReceived` on the player's modifier stack. Checks `context.dealerScore.isBlackjack`; if true, adds 5 to the damage value before returning it. Stacks additively with other incoming damage modifiers. The Strix's own Night Fang equipment is stripped when it dies — the curse is a separate modifier applied to the player.

*Scope:* Applies to all remaining enemy encounters for the entire run.

---

## Stage 2 Boss — Djinn Warden

| Stat | Value |
|---|---|
| Max HP | 75 |
| Description | A bound djinn forced to guard the oasis for eternity. |

**Equipment:**

- **Warden Blade** (weapon)
  - *+8 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 8.

- **Oasis Heart** (trinket)
  - *Heals the Djinn Warden for 10 HP whenever the dealer hits blackjack.*
  - Hook: `onHandEnd` — checks `context.dealerScore.isBlackjack`; if true, sets `context.enemyState.hp = Math.min(hp + 10, maxHp)`.
  - *Note:* This can meaningfully extend the fight. If the player cannot avoid the Djinn hitting blackjack, the boss partially regenerates.

**Curse — Warden Curse** (`curse_djinn`)

| Curse Property | Value |
|---|---|
| Display name | Warden Curse |
| Trigger | `onHandStart` on the player |
| Effect | Player loses 3 HP whenever the player hits blackjack |
| Source tag | `wish_curse` |

*Implementation:* Installs `onHandStart` on the player's modifier stack. Executes `context.playerState.hp = Math.max(0, context.playerState.hp - 3)` unconditionally at the start of each hand, before cards are dealt.

*Scope:* Applies to all remaining enemy encounters for the entire run. At 3 damage per hand, this is a significant pressure effect in long battles.

---

## Stage 3 Boss — Crimson Sultan

| Stat | Value |
|---|---|
| Max HP | 100 |
| Description | The tyrannical ruler of the palace, wielding forbidden magic. |

**Equipment:**

- **Crimson Blade** (weapon)
  - *+15 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 15.

- **Royal Guard** (armor)
  - *30% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.7`, rounded with `Math.round`.

- **Tyrant Crown** (trinket)
  - *Deals 5 damage directly to the player on any push (tie).*
  - Hook: `onHandEnd` — checks `!context.playerScore.busted && !context.dealerScore.busted && context.playerScore.value === context.dealerScore.value`; if true, executes `context.playerState.hp = Math.max(0, context.playerState.hp - 5)`.
  - *Note:* This punishes the player even on neutral outcomes, eliminating "safe" plays.

**Curse — Curse of the Crown** (`curse_sultan`)

| Curse Property | Value |
|---|---|
| Display name | Crimson Curse |
| Trigger | `modifyRules` |
| Effect | Ties resolve as dealer wins; player receives 5 damage instead of a push |
| Source tag | `wish_curse` |

*Implementation:* Installs `modifyRules` on the player's modifier stack. Sets `rules.winConditions.tieResolution = 'dealer'`. This is a rule-level change — the engine reads `tieResolution` during hand result calculation and awards the hand to the dealer on any push. The player takes dealer damage on what would otherwise be a draw.

*Scope:* Applies to all remaining encounters for the entire run. This is the most strategically impactful curse — it completely eliminates the push outcome.

---

## Boss Summary

| Stage | Boss | HP | Equipment | Curse Effect |
|---|---|---|---|---|
| 1 | Ancient Strix | 50 | +10 on dealer BJ · +2/red card in player hand | +5 incoming damage on dealer BJ |
| 2 | Djinn Warden | 75 | +8 flat damage · heals 10 on dealer BJ | 3 damage to player at hand start |
| 3 | Crimson Sultan | 100 | +15 flat damage · 30% DR · 5 damage on push | Ties resolve as dealer wins |

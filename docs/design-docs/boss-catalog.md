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
  - *+10 damage when the dealer hits blackjack.*
  - Hook: `modifyDamageDealt` — checks `context.dealerScore.isBlackjack`; if true, adds 10.

- **Red Bane** (trinket)
  - *+2 damage per red card (hearts or diamonds) in the player's hand.*
  - Hook: `modifyDamageReceived` — counts cards in `context.playerHand.cards` where `suit === 'hearts' || suit === 'diamonds'`; adds `count * 2` to incoming damage (player takes more).

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

## Stage 2 Boss — Murad the Brass Ifrit

| Stat | Value |
|---|---|
| Max HP | 75 |
| Description | A fire spirit bound in brass rings, enforcer of the Shadow King across the Oasis Ruins. |

**Equipment:**

- **Murad's Ember** (weapon)
  - *+8 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 8.

- **Brass Shackle** (armor)
  - *20% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.8`, rounded with `Math.round`.

- **Sihr Amulet** (trinket)
  - *Heals the boss for 8 HP whenever the player busts.*
  - Hook: `onHandEnd` — checks `context.playerScore.busted`; if true, sets `context.enemyState.hp = Math.min(hp + 8, maxHp)`.

**Curse — Murad's Brand** (`curse_murad`)

| Curse Property | Value |
|---|---|
| Display name | Murad's Brand |
| Trigger | `onHandEnd` on the player |
| Effect | Player takes 4 damage whenever they bust |
| Source tag | `wish_curse` |

*Implementation:* Installs `onHandEnd` on the player's modifier stack. Checks `context.playerScore.busted`; if true, executes `context.playerState.hp = Math.max(0, context.playerState.hp - 4)`.

*Scope:* Applies to all remaining enemy encounters for the entire run. Punishes risky play and combos with the Sihr Amulet's self-heal during the boss fight.

---

## Stage 3 Boss — Zahhak the Mirror King

| Stat | Value |
|---|---|
| Max HP | 100 |
| Description | The sorcerer-tyrant who enslaved the jinn and stole their power. Master of illusions and stolen magic. |

**Equipment:**

- **Serpent Fang** (weapon)
  - *+12 base damage, plus +4 per face card (J/Q/K) in the player's hand.*
  - Hook: `modifyDamageDealt` — adds 12 + (face card count * 4).

- **Mirror Aegis** (armor)
  - *35% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.65`, rounded with `Math.round`.

- **Crown of Stolen Souls** (trinket)
  - *Heals the boss for 6 HP when the player scores 19-21 without blackjack.*
  - Hook: `onHandEnd` — checks `!busted && !isBlackjack && score >= 19 && score <= 21`; if true, heals 6 HP.
  - *Note:* Punishes strong but non-blackjack hands. The player must either score blackjack or accept the boss healing.

**Curse — Curse of the Serpent King** (`curse_zahhak`)

| Curse Property | Value |
|---|---|
| Display name | Curse of the Serpent King |
| Trigger | `modifyDamageDealt` on the player |
| Effect | Player's damage output is permanently reduced by 20% |
| Source tag | `wish_curse` |

*Implementation:* Installs `modifyDamageDealt` on the player's modifier stack. Returns `Math.floor(damage * 0.8)`.

*Scope:* Applies to all remaining encounters for the entire run. This is a flat multiplicative reduction on all player damage, making every subsequent fight harder.

---

## Boss Summary

| Stage | Boss | HP | Equipment | Curse Effect |
|---|---|---|---|---|
| 1 | Ancient Strix | 50 | +10 on dealer BJ · +2/red card in player hand | +5 incoming damage on dealer BJ |
| 2 | Murad the Brass Ifrit | 75 | +8 flat damage · 20% DR · heals 8 on player bust | 4 damage to player on bust |
| 3 | Zahhak the Mirror King | 100 | +12 +4/face card · 35% DR · heals 6 on player 19-21 | Player damage reduced 20% |

# Combatant Catalog

A reference for all regular (non-boss) enemies encountered across the three stages of a run. For bosses, see `boss-catalog.md`.

---

## How Enemies Work

Each enemy is a `CombatantData` object that acts as the dealer in every blackjack hand within its battle.

| Property | Description |
|---|---|
| `maxHp` | Total health. Reduced by player damage when the player wins a hand. |
| `equipment` | A list of `Modifier` objects that run through the same pipeline as player modifiers, but from the enemy side (`source: 'enemy'`). |

> **Enemy Pool:** Each stage has a pool of **6 enemies**. At the start of a run, **3 are randomly selected** per stage using the seeded RNG, ensuring variety across runs while maintaining full determinism.

> **Modifier hook orientation:** Enemy `modifyDamageDealt` increases what the player takes. Enemy `modifyDamageReceived` reduces what the enemy takes (i.e., it resists player damage). This is symmetrical with the player modifier pipeline.

---

## Stage 1 — Desert Outskirts

### Vampire Bat

| Stat | Value |
|---|---|
| Max HP | 15 |
| Description | A leathery winged creature that thrives in darkness. |

**Equipment:**

- **Shadow Cloak** (trinket)
  - *50% damage reduction when the player holds any spade card.*
  - Hook: `modifyDamageReceived` — if any card in `context.playerHand.cards` has `suit === 'spades'`, multiplies incoming damage (player's attack) by `0.5`. Round with `Math.round`.

---

### Sand Scorpion

| Stat | Value |
|---|---|
| Max HP | 18 |
| Description | A large scorpion with a venomous stinger. |

**Equipment:** None.

> The simplest encounter — base blackjack rules with no modifiers. Exists to let players learn the loop before abilities are introduced.

---

### Desert Jackal

| Stat | Value |
|---|---|
| Max HP | 20 |
| Description | A cunning predator of the dunes. |

**Equipment:**

- **Predator Fangs** (trinket)
  - *+3 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 3.

---

### Qarin

| Stat | Value |
|---|---|
| Max HP | 18 |
| Description | A personal shadow demon that mirrors the player's every fear. |

**Equipment:**

- **Spirit Veil** (boots)
  - *20% chance to dodge the player's damage entirely each hand.*
  - Hook: `dodgeCheck` — returns `context.rng.next() < 0.20`.

---

### Roc Hatchling

| Stat | Value |
|---|---|
| Max HP | 22 |
| Description | A young roc, its iron beak already capable of shattering bone. |

**Equipment:**

- **Razor Beak** (weapon)
  - *+3 damage, +3 more if the player has 3 or more cards in hand.*
  - Hook: `modifyDamageDealt` — adds 3 + (3 if `context.playerHand.cards.length >= 3`).

---

### Ghul

| Stat | Value |
|---|---|
| Max HP | 25 |
| Description | A carrion-eating desert ghoul that feasts on the misfortune of others. |

**Equipment:**

- **Carrion Hunger** (trinket)
  - *+5 damage when the player busts.*
  - Hook: `modifyDamageDealt` — checks `context.playerScore.busted`; if true, adds 5.

---

## Stage 2 — Oasis Ruins

### Dust Wraith

| Stat | Value |
|---|---|
| Max HP | 25 |
| Description | A swirling phantom of desert sand. |

**Equipment:**

- **Phantom Step** (boots)
  - *15% chance to dodge the player's damage entirely each hand.*
  - Hook: `dodgeCheck` — returns `context.rng.next() < 0.15`.

---

### Tomb Guardian

| Stat | Value |
|---|---|
| Max HP | 28 |
| Description | An animated stone sentinel guarding forgotten tombs. |

**Equipment:**

- **Stone Shell** (armor)
  - *25% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.75`, rounded with `Math.round`.

---

### Sand Serpent

| Stat | Value |
|---|---|
| Max HP | 22 |
| Description | A massive viper that strikes from beneath the dunes. |

**Equipment:**

- **Venom Fangs** (weapon)
  - *+5 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 5.

---

### Salamander

| Stat | Value |
|---|---|
| Max HP | 22 |
| Description | A fire elemental spirit that feeds on the heat of the oasis sands. |

**Equipment:**

- **Ember Scales** (trinket)
  - *+3 damage per red card (hearts/diamonds) in the dealer's hand.*
  - Hook: `modifyDamageDealt` — counts red cards in `context.dealerHand.cards`; adds `count * 3`.

---

### Brass Sentinel

| Stat | Value |
|---|---|
| Max HP | 30 |
| Description | An ancient brass automaton guardian, still dutifully protecting its long-dead master's tomb. |

**Equipment:**

- **Brass Casing** (armor)
  - *30% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.7`, rounded with `Math.round`.

---

### Shadhavar

| Stat | Value |
|---|---|
| Max HP | 28 |
| Description | A mythical one-horned beast whose hollow horn emits a melody that weakens all who hear it. |

**Equipment:**

- **Hollow Horn** (weapon)
  - *+4 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 4.

- **Eerie Melody** (trinket)
  - *Player takes 2 damage at the start of each hand.*
  - Hook: `onHandStart` — executes `context.playerState.hp = Math.max(0, context.playerState.hp - 2)`.

---

## Stage 3 — Sultan's Palace

### Obsidian Golem

| Stat | Value |
|---|---|
| Max HP | 35 |
| Description | A hulking construct of volcanic glass. |

**Equipment:**

- **Obsidian Plates** (armor)
  - *40% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.6`, rounded with `Math.round`.

---

### Shadow Assassin

| Stat | Value |
|---|---|
| Max HP | 30 |
| Description | A silent killer wreathed in magical darkness. |

**Equipment:**

- **Shadow Blade** (weapon)
  - *+10 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 10.

- **Shadow Step** (boots)
  - *20% chance to dodge the player's damage entirely each hand.*
  - Hook: `dodgeCheck` — returns `context.rng.next() < 0.20`.

---

### Fire Dancer

| Stat | Value |
|---|---|
| Max HP | 32 |
| Description | A performer whose flames are anything but theatrical. |

**Equipment:**

- **Flame Veil** (trinket)
  - *+3 damage per red card in the dealer's hand, on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — counts cards in `context.dealerHand.cards` where `suit === 'hearts' || suit === 'diamonds'`; adds `count * 3`.

---

### Palace Guard

| Stat | Value |
|---|---|
| Max HP | 35 |
| Description | An elite warrior of the Sultan's palace, armored in layered iron and trained to kill. |

**Equipment:**

- **Palace Halberd** (weapon)
  - *+8 flat damage to the player on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — unconditionally adds 8.

- **Tower Shield** (armor)
  - *20% damage reduction on all incoming hits.*
  - Hook: `modifyDamageReceived` — multiplies incoming damage by `0.8`, rounded with `Math.round`.

---

### Jinn Inquisitor

| Stat | Value |
|---|---|
| Max HP | 30 |
| Description | A bound jinn tasked with judging souls. It strikes hardest when victory is closest. |

**Equipment:**

- **Eye of Judgment** (trinket)
  - *+6 damage when the dealer wins with a higher score than the player (non-bust loss).*
  - Hook: `modifyDamageDealt` — checks `!playerScore.busted && !dealerScore.busted && dealerScore.value > playerScore.value`; if true, adds 6.

---

### Cursed Vizier

| Stat | Value |
|---|---|
| Max HP | 38 |
| Description | A disgraced palace official whose soul was bound here as punishment. His suffering feeds on yours. |

**Equipment:**

- **Ledger of Debt** (trinket)
  - *+2 damage per consecutive player loss (max +8).*
  - Hook: `modifyDamageDealt` — adds `Math.min(context.consecutiveLosses * 2, 8)`.
  - *Note:* Consecutive losses reset when the player wins. The cap prevents infinite scaling.

---

## Summary Table

| Stage | Enemy | HP | Key Mechanic |
|---|---|---|---|
| 1 | Vampire Bat | 15 | 50% damage resist vs. spade hands |
| 1 | Sand Scorpion | 18 | None |
| 1 | Desert Jackal | 20 | +3 flat outgoing damage |
| 1 | Qarin | 18 | 20% dodge |
| 1 | Roc Hatchling | 22 | +3 damage, +3 more with 3+ cards |
| 1 | Ghul | 25 | +5 damage on player bust |
| 2 | Dust Wraith | 25 | 15% dodge |
| 2 | Tomb Guardian | 28 | 25% damage reduction |
| 2 | Sand Serpent | 22 | +5 flat outgoing damage |
| 2 | Salamander | 22 | +3/red card in dealer hand |
| 2 | Brass Sentinel | 30 | 30% damage reduction |
| 2 | Shadhavar | 28 | +4 flat damage + 2 DOT/hand |
| 3 | Obsidian Golem | 35 | 40% damage reduction |
| 3 | Shadow Assassin | 30 | +10 flat damage + 20% dodge |
| 3 | Fire Dancer | 32 | +3/red card in dealer hand |
| 3 | Palace Guard | 35 | +8 flat damage + 20% DR |
| 3 | Jinn Inquisitor | 30 | +6 damage on non-bust dealer win |
| 3 | Cursed Vizier | 38 | +2/consecutive loss (max +8) |

---

## Equipment Slot Usage by Enemies

Enemies use the same five equipment slots as the player (`weapon`, `helm`, `armor`, `boots`, `trinket`), but only for semantic grouping — there are no slot restriction rules for enemies.

| Slot | Typical Effect Role |
|---|---|
| weapon | Flat or conditional `modifyDamageDealt` bonus |
| armor | `modifyDamageReceived` reduction (enemy resists player damage) |
| boots | `dodgeCheck` (enemy dodges player attacks) |
| trinket | Conditional or per-event effects (`onHandEnd`, `modifyDamageReceived` vs. suit, etc.) |
| helm | Unused by current enemies |

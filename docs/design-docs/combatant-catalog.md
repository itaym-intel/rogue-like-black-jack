# Combatant Catalog

A reference for all regular (non-boss) enemies encountered across the three stages of a run. For bosses, see `boss-catalog.md`.

---

## How Enemies Work

Each enemy is a `CombatantData` object that acts as the dealer in every blackjack hand within its battle.

| Property | Description |
|---|---|
| `maxHp` | Total health. Reduced by player damage when the player wins a hand. |
| `equipment` | A list of `Modifier` objects that run through the same pipeline as player modifiers, but from the enemy side (`source: 'enemy'`). |

Each stage contains exactly **three regular enemies** (encountered in order) followed by **one boss fight**.

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

## Stage 2 — Oasis Ruins

### Dust Wraith

| Stat | Value |
|---|---|
| Max HP | 25 |
| Description | A swirling phantom of desert sand. |

**Equipment:**

- **Phantom Step** (boots)
  - *15% chance to dodge the player's damage entirely each hand.*
  - Hook: `dodgeCheck` — returns `context.rng.next() < 0.15`. If true, the hand's full damage is negated (player wins but deals 0).

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

> The only regular enemy with two equipment pieces. High dodge + high flat damage makes this one of the most threatening standard encounters.

---

### Fire Dancer

| Stat | Value |
|---|---|
| Max HP | 32 |
| Description | A performer whose flames are anything but theatrical. |

**Equipment:**

- **Flame Veil** (trinket)
  - *+3 damage per red card in the dealer's hand, on every hand the enemy wins.*
  - Hook: `modifyDamageDealt` — counts cards in `context.dealerHand.cards` where `suit === 'hearts' || suit === 'diamonds'`; adds `count × 3`.
  - *Note:* Scales with the dealer's hand composition. Two red cards = +6; a full red hand is punishing.

---

## Summary Table

| Stage | Enemy | HP | Key Mechanic |
|---|---|---|---|
| 1 | Vampire Bat | 15 | 50% damage resist vs. spade hands |
| 1 | Sand Scorpion | 18 | None |
| 1 | Desert Jackal | 20 | +3 flat outgoing damage |
| 2 | Dust Wraith | 25 | 15% dodge |
| 2 | Tomb Guardian | 28 | 25% damage reduction |
| 2 | Sand Serpent | 22 | +5 flat outgoing damage |
| 3 | Obsidian Golem | 35 | 40% damage reduction |
| 3 | Shadow Assassin | 30 | +10 flat damage · 20% dodge |
| 3 | Fire Dancer | 32 | +3/red card in dealer hand |

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

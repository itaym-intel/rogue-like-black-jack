# Geniejack CLI Guide

## Starting a Game

```bash
npm run dev                   # Random seed
npm run dev -- --seed=42      # Deterministic seed
```

Same seed + same inputs = identical game every time.

## Display Format

The CLI shows a compact view each turn:

```
=== S1 B2 H3 === Seed:abc123
ENEMY: Desert Jackal HP:12/20 [+3dmg]
YOU: HP:45/50 Gold:30
Eq: Wpn:Flint Spear | Hlm:- | Arm:Cloth Armor | Bts:- | Trk:-
Bag: Health Potion x1, Damage Potion x1
FX: Poison(2h left)
Curses: Night Fang Curse
───
You: [A♠ 5♥]=16s  Dealer: [?? 7♦]=?
> (h)it (s)tand (d)ouble
```

- **S/B/H**: Stage, Battle, Hand number
- **Eq**: Equipment slots (Weapon, Helm, Armor, Boots, Trinket)
- **Bag**: Consumables in inventory
- **FX**: Active temporary effects with remaining duration
- **Curses**: Permanent curse effects from boss fights
- **s** after score = soft hand (ace counted as 11)
- **??** = dealer's face-down card

## Commands

| Input | Phase | Action |
|-------|-------|--------|
| `h` | Player turn | Hit (draw a card) |
| `s` | Player turn | Stand (end your turn) |
| `d` | Player turn | Double down (one card, 2x damage) |
| `u` | Pre-hand | Use a consumable |
| Enter | Pre-hand / Results | Continue to next phase |
| `1-9` | Shop | Buy item by number |
| `s` | Shop | Skip shop |
| Free text | Genie | Enter blessing wish text |

## Game Flow

1. **Pre-hand**: Use consumables or press Enter to deal cards
2. **Player turn**: Hit, stand, or double down
3. **Dealer turn**: Automatic (dealer hits below 17, stands on 17+)
4. **Hand result**: See who won and damage dealt
5. Repeat hands until one side reaches 0 HP

After a battle victory:
- **Shop** (after regular battles): Buy equipment/consumables
- **Boss battle** (after 3 regular battles per stage)
- **Genie** (after boss): Receive curse, enter blessing wish

## Combat

Blackjack rules apply. Damage is calculated as:
- **Neither busts**: Damage = winner's score - loser's score
- **One side busts**: Damage = winner's full hand value
- **Both bust**: Push (0 damage), unless modified

Modifiers from equipment, enemy abilities, and curses affect damage.

## Equipment Reference

### Weapons (flat damage bonus)
| Name | Tier | Cost | Effect |
|------|------|------|--------|
| Flint Spear | Cloth | 30g | +5 damage |
| Bronze Saif | Bronze | 60g | +10 damage |
| Iron Scimitar | Iron | 100g | +25 damage |

### Helms (bust damage reduction)
| Name | Tier | Cost | Effect |
|------|------|------|--------|
| Cloth Helm | Cloth | 20g | 30% less bust damage |
| Bronze Helm | Bronze | 45g | 50% less bust damage |
| Iron Helm | Iron | 80g | 80% less bust damage |

### Armor (all damage reduction)
| Name | Tier | Cost | Effect |
|------|------|------|--------|
| Cloth Armor | Cloth | 25g | 20% less damage |
| Bronze Armor | Bronze | 55g | 40% less damage |
| Iron Armor | Iron | 90g | 60% less damage |

### Boots (dodge chance)
| Name | Tier | Cost | Effect |
|------|------|------|--------|
| Cloth Boots | Cloth | 20g | 10% dodge |
| Bronze Boots | Bronze | 50g | 25% dodge |
| Iron Boots | Iron | 85g | 40% dodge |

### Trinkets (special abilities)
| Name | Tier | Cost | Effect |
|------|------|------|--------|
| Cloth Trinket | Cloth | 15g | +10 gold per battle |
| Bronze Trinket | Bronze | 40g | 25% less damage from random suit |
| Iron Trinket | Iron | 75g | Bust counts as score of 10 |

## Consumables

| Name | Cost | Effect |
|------|------|--------|
| Health Potion | 10g | Restore 5 HP |
| Damage Potion | 15g | Deal 5 damage to enemy |
| Strength Potion | 20g | +30% damage for 1 hand |
| Poison Potion | 20g | 3 damage/hand for 3 hands |

## Enemy Reference

### Stage 1: Desert Outskirts
| Enemy | HP | Abilities |
|-------|------|-----------|
| Vampire Bat | 15 | 50% less damage from spade hands |
| Sand Scorpion | 18 | None |
| Desert Jackal | 20 | +3 flat damage |
| **Ancient Strix** (Boss) | 50 | +10 damage on blackjack; +2 dmg per red card |

### Stage 2: Oasis Ruins
| Enemy | HP | Abilities |
|-------|------|-----------|
| Dust Wraith | 25 | 15% dodge |
| Tomb Guardian | 28 | 25% damage reduction |
| Sand Serpent | 22 | +5 flat damage |
| **Djinn Warden** (Boss) | 75 | +8 flat damage; heals 10 on blackjack |

### Stage 3: Sultan's Palace
| Enemy | HP | Abilities |
|-------|------|-----------|
| Obsidian Golem | 35 | 40% damage reduction |
| Shadow Assassin | 30 | +10 damage; 20% dodge |
| Fire Dancer | 32 | +3 damage per red card in dealer hand |
| **Crimson Sultan** (Boss) | 100 | +15 damage; 30% reduction; 5 dmg on push |

## Boss Curses

After defeating a boss, you receive a permanent curse:
- **Ancient Strix**: Enemies deal +5 extra damage on blackjack
- **Djinn Warden**: Take 3 damage at the start of each hand
- **Crimson Sultan**: All ties are resolved in the dealer's favor

## Wishes (Blessings)

After each boss, the Genie lets you type a blessing wish. The text is stored but blessings are **not yet mechanically implemented**. Future versions will use an LLM to generate modifier effects from the wish text.

## Determinism

The game uses a seeded pseudo-random number generator (mulberry32). Given the same seed and the same sequence of player inputs, the game produces identical results. This enables:
- Reproducible games for debugging
- Replay from seed + action log
- AI agent testing with known outcomes

## Running Tests

```bash
npx vitest run          # Run all tests once
npx vitest              # Watch mode
```

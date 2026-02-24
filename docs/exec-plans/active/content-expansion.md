# Arabian Fantasy Content Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand boss, enemy, equipment, and consumable pools with Aladdin-inspired Arabian mythology theming; replace Stage 2 & 3 bosses; add 9 new regular enemies; expand equipment from 15 to ~39 items; expand consumables from 4 to 10.

**Architecture:** All changes are additive data entries in existing engine files. The one structural addition is a pool-based random enemy selection in `combatants.ts` + minimal wiring in `game.ts`, using the existing `SeededRNG` to stay fully deterministic. No new engine systems, no new hooks, no UI changes.

**Tech Stack:** TypeScript · Vitest · existing modifier hooks (`modifyDamageDealt`, `modifyDamageReceived`, `dodgeCheck`, `onHandStart`, `onHandEnd`, `modifyGoldEarned`, `modifyBust`)

---

## Content Reference

### New Bosses

**Stage 2 — Murad the Brass Ifrit** (75 HP)
*An ancient fire spirit bound in brass rings by Zahhak, serving as his enforcer across the Oasis Ruins.*
- **Murad's Ember** (weapon): +8 flat damage
- **Brass Shackle** (armor): 20% damage reduction (`* 0.8`)
- **Sihr Amulet** (trinket): heals enemy 8 HP when player busts (`onHandEnd`)
- **Curse** `curse_murad` — "Murad's Brand": player takes 4 damage whenever they bust (`onHandEnd`)

**Stage 3 — Zahhak the Mirror King** (100 HP)
*The sorcerer-tyrant who enslaved the jinn and stole their power. Master of illusions.*
- **Serpent Fang** (weapon): +12 flat damage +4 per face card in player's hand
- **Mirror Aegis** (armor): 35% damage reduction (`* 0.65`)
- **Crown of Stolen Souls** (trinket): heals enemy 6 HP when player scores 19-21 without blackjack (`onHandEnd`)
- **Curse** `curse_zahhak` — "Curse of the Serpent King": player's damage output permanently reduced by 20% (`modifyDamageDealt * 0.8`)

---

### New Regular Enemies

| # | Stage | Name | HP | Archetype | Equipment |
|---|---|---|---|---|---|
| 1 | 1 | Qarin | 18 | Shadow Spirit | "Spirit Veil" (boots): 20% dodge |
| 2 | 1 | Roc Hatchling | 22 | Desert Predator | "Razor Beak" (weapon): +3 dmg, +3 if player has ≥3 cards |
| 3 | 1 | Ghul | 25 | Cursed Wanderer | "Carrion Hunger" (trinket): +5 dmg when player busts |
| 4 | 2 | Salamander | 22 | Elemental Being | "Ember Scales" (trinket): +3 dmg per red card in dealer hand |
| 5 | 2 | Brass Sentinel | 30 | Guardian Construct | "Brass Casing" (armor): 30% damage reduction |
| 6 | 2 | Shadhavar | 28 | Corrupted Servant | "Hollow Horn" (weapon): +4 flat; "Eerie Melody" (trinket): player takes 2 dmg at hand start |
| 7 | 3 | Palace Guard | 35 | Elite Warrior | "Palace Halberd" (weapon): +8 flat; "Tower Shield" (armor): 20% DR |
| 8 | 3 | Jinn Inquisitor | 30 | Dark Sorcerer | "Eye of Judgment" (trinket): +6 dmg if dealer wins without busting with higher score |
| 9 | 3 | Cursed Vizier | 38 | Cursed Nobility | "Ledger of Debt" (trinket): +2 dmg per consecutive player loss, max +8 |

---

### New Equipment

#### Cloth (T1) — new items (~28-32g)
| ID | Name | Slot | Cost | Effect |
|---|---|---|---|---|
| `weapon_cloth_2` | Copper Khanjar | weapon | 28 | +4 flat dmg; +4 more if player ≤2 cards in hand |
| `weapon_cloth_3` | Bone Club | weapon | 30 | +3 flat dmg on win; deals 2 dmg to enemy via `onHandEnd` every hand |
| `helm_cloth_2` | Keffiyeh of Warding | helm | 24 | 20% less dmg when player has ≤2 cards in hand |
| `armor_cloth_2` | Hardened Linen | armor | 22 | 15% less incoming damage |
| `boots_cloth_2` | Whirling Sandals | boots | 22 | 12% dodge chance |
| `trinket_cloth_2` | Copper Coin Ring | trinket | 18 | +8 gold per battle |
| `trinket_cloth_3` | Wanderer's Pouch | trinket | 22 | +3 gold per hand won this battle |
| `trinket_cloth_4` | Lucky Knucklebone | trinket | 25 | +15 gold per battle if player won ≥2 hands |

#### Bronze (T2) — new items (~48-65g)
| ID | Name | Slot | Cost | Effect |
|---|---|---|---|---|
| `weapon_bronze_2` | Oasis Blade | weapon | 55 | +9 flat dmg; +6 more if player score ≥18 |
| `weapon_bronze_3` | Twin Fangs | weapon | 65 | +8 flat dmg; +8 more if player hand contains an Ace |
| `helm_bronze_2` | Vizier's Headpiece | helm | 48 | 40% bust dmg reduction; heal player 3 HP on bust |
| `armor_bronze_2` | Silk-Wrapped Mail | armor | 52 | 30% less incoming damage |
| `boots_bronze_2` | Quickstep Shoes | boots | 48 | 20% dodge chance |
| `trinket_bronze_2` | Merchant's Medallion | trinket | 45 | +18 gold per battle |
| `trinket_bronze_3` | Serpent Amulet | trinket | 50 | +8 gold per battle; +5 gold per blackjack scored |
| `trinket_bronze_4` | Desert Eye | trinket | 42 | 15% less dmg from randomly chosen suit per battle |

#### Iron (T3) — new items (~85-108g)
| ID | Name | Slot | Cost | Effect |
|---|---|---|---|---|
| `weapon_iron_2` | Golden Scimitar | weapon | 95 | +22 flat dmg; +10 more on player blackjack |
| `weapon_iron_3` | Sunfire Lance | weapon | 108 | +20 flat dmg; +8 more if dealer hand has ≥4 cards |
| `helm_iron_2` | Sultan's Crown | helm | 85 | 75% bust dmg reduction; heal player 4 HP on bust |
| `armor_iron_2` | Lamellar Armor | armor | 92 | 55% less incoming damage |
| `boots_iron_2` | Winged Sandals | boots | 88 | 35% dodge chance |
| `trinket_iron_2` | Lamp of Fortune | trinket | 80 | +30 gold per battle |
| `trinket_iron_3` | Ring of Solomon | trinket | 90 | 15% less all incoming damage |
| `trinket_iron_4` | Seal of the Caliph | trinket | 85 | First hand of each battle deals 2× damage |

---

### New Consumables

New `ConsumableType` entries needed in `types.ts`:
`'armor_elixir' | 'dodge_brew' | 'regen_draught' | 'battle_trance' | 'fortune_vessel' | 'wrath_elixir'`

| ID | Name | Cost | Effect |
|---|---|---|---|
| `armor_elixir` | Elixir of Iron Skin | 20 | −30% damage received for 2 hands (duration modifier) |
| `dodge_brew` | Sand Dancer's Brew | 18 | 25% dodge for 1 hand (duration modifier) |
| `regen_draught` | Phoenix Draught | 22 | Heal 2 HP per hand for 3 hands (duration modifier) |
| `battle_trance` | Battle Trance | 25 | +40% damage dealt AND −20% damage received for 2 hands |
| `fortune_vessel` | Fortune's Vessel | 20 | Instantly gain 20 gold |
| `wrath_elixir` | Wrath Elixir | 28 | +80% damage for 1 hand |

---

## Task 1: Replace Stage 2 & 3 Bosses in combatants.ts

**Files:**
- Modify: `src/engine/combatants.ts`

**Step 1: Write failing tests**

In `src/engine/__tests__/combatants.test.ts` (or existing test file), add:

```typescript
import { getBossForStage } from '../combatants.js';

describe('new bosses', () => {
  it('stage 2 boss is Murad the Brass Ifrit with 75 HP', () => {
    const boss = getBossForStage(2);
    expect(boss.name).toBe('Murad the Brass Ifrit');
    expect(boss.maxHp).toBe(75);
    expect(boss.isBoss).toBe(true);
  });

  it('stage 2 boss curse damages player on bust', () => {
    const boss = getBossForStage(2);
    const ctx = makeContext();
    ctx.playerScore = { value: 24, soft: false, busted: true, isBlackjack: false };
    const before = ctx.playerState.hp;
    boss.curse!.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(before - 4);
  });

  it('stage 2 boss curse does NOT fire when player wins', () => {
    const boss = getBossForStage(2);
    const ctx = makeContext();
    ctx.playerScore = { value: 20, soft: false, busted: false, isBlackjack: false };
    const before = ctx.playerState.hp;
    boss.curse!.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(before);
  });

  it('stage 3 boss is Zahhak the Mirror King with 100 HP', () => {
    const boss = getBossForStage(3);
    expect(boss.name).toBe('Zahhak the Mirror King');
    expect(boss.maxHp).toBe(100);
  });

  it('stage 3 boss curse reduces player damage by 20%', () => {
    const boss = getBossForStage(3);
    const ctx = makeContext();
    const result = boss.curse!.modifyDamageDealt!(100, ctx);
    expect(result).toBe(80);
  });
});
```

**Step 2: Run tests to verify they fail**
```bash
npm test -- --reporter=verbose 2>&1 | grep -A2 "new bosses"
```
Expected: `FAIL` — `Murad` not found.

**Step 3: Replace djinnWarden with Murad the Brass Ifrit**

In `src/engine/combatants.ts`, replace the `djinnWarden` constant:

```typescript
const muradTheBrassIfrit: CombatantData = {
  name: 'Murad the Brass Ifrit',
  maxHp: 75,
  isBoss: true,
  description: 'A fire spirit bound in brass rings, enforcer of the Shadow King across the Oasis Ruins.',
  equipment: [
    enemyEquip('murad_weapon', "Murad's Ember", 'weapon', {
      id: 'mod_murad_dmg', name: "Murad's Ember",
      description: '+8 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 8; },
    }),
    enemyEquip('murad_armor', 'Brass Shackle', 'armor', {
      id: 'mod_murad_armor', name: 'Brass Shackle',
      description: '20% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.8); },
    }),
    enemyEquip('murad_trinket', 'Sihr Amulet', 'trinket', {
      id: 'mod_murad_heal', name: 'Sihr Amulet',
      description: 'Heals 8 HP when player busts', source: 'enemy',
      onHandEnd(context) {
        if (context.playerScore.busted) {
          context.enemyState.hp = Math.min(
            context.enemyState.hp + 8,
            context.enemyState.data.maxHp
          );
        }
      },
    }),
  ],
  curse: {
    id: 'curse_murad', name: "Murad's Brand",
    description: 'Take 4 damage whenever you bust', source: 'wish_curse',
    onHandEnd(context) {
      if (context.playerScore.busted) {
        context.playerState.hp = Math.max(0, context.playerState.hp - 4);
      }
    },
  },
};
```

**Step 4: Replace crimsonSultan with Zahhak the Mirror King**

In `src/engine/combatants.ts`, replace the `crimsonSultan` constant:

```typescript
const zahhakTheMirrorKing: CombatantData = {
  name: 'Zahhak the Mirror King',
  maxHp: 100,
  isBoss: true,
  description: 'The sorcerer-tyrant who enslaved the jinn and stole their power. Master of illusions and stolen magic.',
  equipment: [
    enemyEquip('zahhak_weapon', 'Serpent Fang', 'weapon', {
      id: 'mod_zahhak_dmg', name: 'Serpent Fang',
      description: '+12 damage, +4 per face card in player hand', source: 'enemy',
      modifyDamageDealt(damage, context) {
        const faces = context.playerHand.cards.filter(
          c => c.rank === 'J' || c.rank === 'Q' || c.rank === 'K'
        ).length;
        return damage + 12 + faces * 4;
      },
    }),
    enemyEquip('zahhak_armor', 'Mirror Aegis', 'armor', {
      id: 'mod_zahhak_armor', name: 'Mirror Aegis',
      description: '35% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.65); },
    }),
    enemyEquip('zahhak_trinket', 'Crown of Stolen Souls', 'trinket', {
      id: 'mod_zahhak_steal', name: 'Crown of Stolen Souls',
      description: 'Heals 6 HP when player scores 19-21 without blackjack', source: 'enemy',
      onHandEnd(context) {
        const score = context.playerScore.value;
        if (!context.playerScore.busted && !context.playerScore.isBlackjack
            && score >= 19 && score <= 21) {
          context.enemyState.hp = Math.min(
            context.enemyState.hp + 6,
            context.enemyState.data.maxHp
          );
        }
      },
    }),
  ],
  curse: {
    id: 'curse_zahhak', name: 'Curse of the Serpent King',
    description: 'Your damage output is permanently reduced by 20%', source: 'wish_curse',
    modifyDamageDealt(damage) { return Math.floor(damage * 0.8); },
  },
};
```

**Step 5: Update BOSSES array**

```typescript
const BOSSES: CombatantData[] = [ancientStrix, muradTheBrassIfrit, zahhakTheMirrorKing];
```

**Step 6: Run tests**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|new bosses)"
```
Expected: all `new bosses` tests PASS.

**Step 7: Commit**
```bash
git add src/engine/combatants.ts
git commit -m "feat: replace stage 2&3 bosses with Murad the Brass Ifrit and Zahhak the Mirror King"
```

---

## Task 2: Add 9 New Regular Enemies to combatants.ts

**Files:**
- Modify: `src/engine/combatants.ts`

**Step 1: Write failing tests**

```typescript
import { getEnemiesForStage } from '../combatants.js';

describe('expanded enemy pool', () => {
  it('stage 1 pool has exactly 6 enemies', () => {
    expect(STAGE_POOLS[0].length).toBe(6);
  });
  it('stage 2 pool has exactly 6 enemies', () => {
    expect(STAGE_POOLS[1].length).toBe(6);
  });
  it('stage 3 pool has exactly 6 enemies', () => {
    expect(STAGE_POOLS[2].length).toBe(6);
  });
  it('Ghul Carrion Hunger deals bonus damage when player busts', () => {
    const ghul = STAGE_POOLS[0].find(e => e.name === 'Ghul')!;
    const ctx = makeContext();
    ctx.playerScore = { value: 25, soft: false, busted: true, isBlackjack: false };
    const result = ghul.equipment[0].modifier.modifyDamageDealt!(10, ctx);
    expect(result).toBe(15); // 10 + 5
  });
  it('Cursed Vizier Ledger of Debt scales with consecutive losses', () => {
    const vizier = STAGE_POOLS[2].find(e => e.name === 'Cursed Vizier')!;
    const ctx = makeContext();
    ctx.consecutiveLosses = 3;
    const result = vizier.equipment[0].modifier.modifyDamageDealt!(10, ctx);
    expect(result).toBe(16); // 10 + min(3*2, 8)
  });
});
```

> Note: `STAGE_POOLS` must be exported from combatants.ts for these tests. Add `export const STAGE_POOLS` in Step 3.

**Step 2: Run tests to verify they fail**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|expanded enemy)"
```

**Step 3: Add Stage 1 new enemies before the STAGES array**

```typescript
// ── Stage 1: New enemies ──

const qarin: CombatantData = {
  name: 'Qarin',
  maxHp: 18,
  isBoss: false,
  description: 'A personal shadow demon that mirrors the player\'s every fear.',
  equipment: [
    enemyEquip('qarin_boots', 'Spirit Veil', 'boots', {
      id: 'mod_qarin_dodge', name: 'Spirit Veil',
      description: '20% dodge', source: 'enemy',
      dodgeCheck(context) { return context.rng.next() < 0.20; },
    }),
  ],
};

const rocHatchling: CombatantData = {
  name: 'Roc Hatchling',
  maxHp: 22,
  isBoss: false,
  description: 'A young roc, its iron beak already capable of shattering bone.',
  equipment: [
    enemyEquip('roc_weapon', 'Razor Beak', 'weapon', {
      id: 'mod_roc_dmg', name: 'Razor Beak',
      description: '+3 damage, +3 more if player has 3+ cards', source: 'enemy',
      modifyDamageDealt(damage, context) {
        return damage + 3 + (context.playerHand.cards.length >= 3 ? 3 : 0);
      },
    }),
  ],
};

const ghul: CombatantData = {
  name: 'Ghul',
  maxHp: 25,
  isBoss: false,
  description: 'A carrion-eating desert ghoul that feasts on the misfortune of others.',
  equipment: [
    enemyEquip('ghul_trinket', 'Carrion Hunger', 'trinket', {
      id: 'mod_ghul_bust', name: 'Carrion Hunger',
      description: '+5 damage when player busts', source: 'enemy',
      modifyDamageDealt(damage, context) {
        return context.playerScore.busted ? damage + 5 : damage;
      },
    }),
  ],
};
```

**Step 4: Add Stage 2 new enemies**

```typescript
// ── Stage 2: New enemies ──

const salamander: CombatantData = {
  name: 'Salamander',
  maxHp: 22,
  isBoss: false,
  description: 'A fire elemental spirit that feeds on the heat of the oasis sands.',
  equipment: [
    enemyEquip('salamander_trinket', 'Ember Scales', 'trinket', {
      id: 'mod_salamander_red', name: 'Ember Scales',
      description: '+3 damage per red card in dealer hand', source: 'enemy',
      modifyDamageDealt(damage, context) {
        const reds = context.dealerHand.cards.filter(
          c => c.suit === 'hearts' || c.suit === 'diamonds'
        ).length;
        return damage + reds * 3;
      },
    }),
  ],
};

const brassSentinel: CombatantData = {
  name: 'Brass Sentinel',
  maxHp: 30,
  isBoss: false,
  description: 'An ancient brass automaton guardian, still dutifully protecting its long-dead master\'s tomb.',
  equipment: [
    enemyEquip('brass_sentinel_armor', 'Brass Casing', 'armor', {
      id: 'mod_brass_sentinel_armor', name: 'Brass Casing',
      description: '30% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.7); },
    }),
  ],
};

const shadhavar: CombatantData = {
  name: 'Shadhavar',
  maxHp: 28,
  isBoss: false,
  description: 'A mythical one-horned beast whose hollow horn emits a melody that weakens all who hear it.',
  equipment: [
    enemyEquip('shadhavar_weapon', 'Hollow Horn', 'weapon', {
      id: 'mod_shadhavar_dmg', name: 'Hollow Horn',
      description: '+4 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 4; },
    }),
    enemyEquip('shadhavar_trinket', 'Eerie Melody', 'trinket', {
      id: 'mod_shadhavar_dot', name: 'Eerie Melody',
      description: 'Player takes 2 damage at the start of each hand', source: 'enemy',
      onHandStart(context) {
        context.playerState.hp = Math.max(0, context.playerState.hp - 2);
      },
    }),
  ],
};
```

**Step 5: Add Stage 3 new enemies**

```typescript
// ── Stage 3: New enemies ──

const palaceGuard: CombatantData = {
  name: 'Palace Guard',
  maxHp: 35,
  isBoss: false,
  description: 'An elite warrior of the Sultan\'s palace, armored in layered iron and trained to kill.',
  equipment: [
    enemyEquip('palace_guard_weapon', 'Palace Halberd', 'weapon', {
      id: 'mod_palace_guard_dmg', name: 'Palace Halberd',
      description: '+8 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 8; },
    }),
    enemyEquip('palace_guard_armor', 'Tower Shield', 'armor', {
      id: 'mod_palace_guard_armor', name: 'Tower Shield',
      description: '20% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.8); },
    }),
  ],
};

const jinnInquisitor: CombatantData = {
  name: 'Jinn Inquisitor',
  maxHp: 30,
  isBoss: false,
  description: 'A bound jinn tasked with judging souls. It strikes hardest when victory is closest.',
  equipment: [
    enemyEquip('inquisitor_trinket', 'Eye of Judgment', 'trinket', {
      id: 'mod_inquisitor_judge', name: 'Eye of Judgment',
      description: '+6 damage when dealer wins with higher score than player (non-bust loss)', source: 'enemy',
      modifyDamageDealt(damage, context) {
        if (!context.playerScore.busted && !context.dealerScore.busted
            && context.dealerScore.value > context.playerScore.value) {
          return damage + 6;
        }
        return damage;
      },
    }),
  ],
};

const cursedVizier: CombatantData = {
  name: 'Cursed Vizier',
  maxHp: 38,
  isBoss: false,
  description: 'A disgraced palace official whose soul was bound here as punishment. His suffering feeds on yours.',
  equipment: [
    enemyEquip('vizier_trinket', 'Ledger of Debt', 'trinket', {
      id: 'mod_vizier_debt', name: 'Ledger of Debt',
      description: '+2 damage per consecutive loss (max +8)', source: 'enemy',
      modifyDamageDealt(damage, context) {
        return damage + Math.min(context.consecutiveLosses * 2, 8);
      },
    }),
  ],
};
```

**Step 6: Replace STAGES with STAGE_POOLS and update exports**

Replace the STAGES constant and add the pool export:

```typescript
// ── Stage data ──

export const STAGE_POOLS: CombatantData[][] = [
  [vampireBat, sandScorpion, desertJackal, qarin, rocHatchling, ghul],
  [dustWraith, tombGuardian, sandSerpent, salamander, brassSentinel, shadhavar],
  [obsidianGolem, shadowAssassin, fireDancer, palaceGuard, jinnInquisitor, cursedVizier],
];

const BOSSES: CombatantData[] = [ancientStrix, muradTheBrassIfrit, zahhakTheMirrorKing];

export function getEnemiesForStage(stage: number): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  // Returns first 3 for backward compat (tests, serialization)
  return STAGE_POOLS[stage - 1].slice(0, 3);
}

export function sampleEnemiesForStage(
  stage: number,
  rng: { nextInt(min: number, max: number): number }
): CombatantData[] {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  const pool = [...STAGE_POOLS[stage - 1]];
  // Fisher-Yates shuffle using seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function getBossForStage(stage: number): CombatantData {
  if (stage < 1 || stage > 3) throw new Error(`Invalid stage: ${stage}`);
  return BOSSES[stage - 1];
}
```

**Step 7: Run tests**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|expanded enemy)"
```
Expected: all pass.

**Step 8: Commit**
```bash
git add src/engine/combatants.ts
git commit -m "feat: expand each stage to 6-enemy pool with 9 new Arabian mythology enemies"
```

---

## Task 3: Wire Random Enemy Selection in game.ts

**Files:**
- Modify: `src/engine/game.ts`

**Step 1: Write a determinism test**

In `src/engine/__tests__/game.test.ts` or similar:

```typescript
it('same seed produces same enemy sequence across all stages', () => {
  const g1 = new GameEngine('test-seed-pool');
  const g2 = new GameEngine('test-seed-pool');
  // autoPlay through enough actions to see enemy names differ from g3
  // (just check that both engines see same enemies for same seed)
  const view1 = g1.getView();
  const view2 = g2.getView();
  expect(view1.enemy?.name).toBe(view2.enemy?.name);
});
```

**Step 2: Run test to verify it passes (determinism baseline)**
```bash
npm test -- --reporter=verbose 2>&1 | grep "same seed"
```

**Step 3: Add sampledStageEnemies field to GameEngine**

In `game.ts`, inside the class body after the existing private fields:

```typescript
private sampledStageEnemies: Map<number, CombatantData[]> = new Map();
```

Also add the import:
```typescript
import { getEnemiesForStage, getBossForStage, sampleEnemiesForStage } from './combatants.js';
```
(Replace the existing `getEnemiesForStage, getBossForStage` import line.)

**Step 4: Add helper method to GameEngine**

Add this private method to the `GameEngine` class:

```typescript
private getEnemiesForCurrentStage(): CombatantData[] {
  if (!this.sampledStageEnemies.has(this.stage)) {
    this.sampledStageEnemies.set(this.stage, sampleEnemiesForStage(this.stage, this.rng));
  }
  return this.sampledStageEnemies.get(this.stage)!;
}
```

**Step 5: Update loadEnemy() to use sampled enemies**

Find this line in `loadEnemy()`:
```typescript
const enemies = getEnemiesForStage(this.stage);
```

Replace with:
```typescript
const enemies = this.getEnemiesForCurrentStage();
```

**Step 6: Run all tests**
```bash
npm test
```
Expected: all existing tests pass (determinism preserved because RNG is called consistently).

**Step 7: Commit**
```bash
git add src/engine/game.ts
git commit -m "feat: wire seeded random enemy pool selection per stage in GameEngine"
```

---

## Task 4: Expand Equipment — Cloth Tier

**Files:**
- Modify: `src/engine/equipment.ts`

**Step 1: Write failing tests**

```typescript
import { getAllEquipment, getEquipmentById } from '../equipment.js';

describe('cloth tier expansion', () => {
  it('Copper Khanjar is registered', () => {
    expect(() => getEquipmentById('weapon_cloth_2')).not.toThrow();
  });
  it('Copper Khanjar gives +4 bonus when player has 2 or fewer cards', () => {
    const eq = getEquipmentById('weapon_cloth_2');
    const ctx = makeContext();
    ctx.playerHand = { cards: [{ suit: 'hearts', rank: '10' }, { suit: 'spades', rank: '8' }] };
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(18); // 10 + 4 + 4
  });
  it('Copper Khanjar gives only +4 when player has 3+ cards', () => {
    const eq = getEquipmentById('weapon_cloth_2');
    const ctx = makeContext();
    ctx.playerHand = { cards: [
      { suit: 'hearts', rank: '5' }, { suit: 'spades', rank: '6' }, { suit: 'clubs', rank: '7' }
    ]};
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(14); // 10 + 4 only
  });
  it('Lucky Knucklebone gives +15 gold when player won 2+ hands', () => {
    const eq = getEquipmentById('trinket_cloth_4');
    const ctx = makeContext();
    ctx.handsWonThisBattle = 3;
    expect(eq.modifier.modifyGoldEarned!(0, ctx)).toBe(15);
  });
  it('Lucky Knucklebone gives 0 gold when player won fewer than 2 hands', () => {
    const eq = getEquipmentById('trinket_cloth_4');
    const ctx = makeContext();
    ctx.handsWonThisBattle = 1;
    expect(eq.modifier.modifyGoldEarned!(0, ctx)).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|cloth tier)"
```

**Step 3: Add new cloth equipment to ALL_EQUIPMENT**

In `equipment.ts`, after the existing cloth items, add:

```typescript
  // ── Cloth Weapons (new) ──
  {
    id: 'weapon_cloth_2', name: 'Copper Khanjar',
    slot: 'weapon' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+4 damage; +4 more if player has 2 or fewer cards', cost: 28,
    modifier: {
      id: 'mod_weapon_cloth_2', name: 'Copper Khanjar',
      description: '+4 damage; +4 more if player has 2 or fewer cards', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 4 + (context.playerHand.cards.length <= 2 ? 4 : 0);
      },
    },
  },
  {
    id: 'weapon_cloth_3', name: 'Bone Club',
    slot: 'weapon' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+3 damage on win; deals 2 damage to enemy each hand', cost: 30,
    modifier: {
      id: 'mod_weapon_cloth_3', name: 'Bone Club',
      description: '+3 damage on win; deals 2 damage to enemy each hand', source: 'equipment',
      modifyDamageDealt(damage) { return damage + 3; },
      onHandEnd(context) {
        context.enemyState.hp = Math.max(0, context.enemyState.hp - 2);
      },
    },
  },
  // ── Cloth Helm (new) ──
  {
    id: 'helm_cloth_2', name: 'Keffiyeh of Warding',
    slot: 'helm' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '20% less damage when player has 2 or fewer cards in hand', cost: 24,
    modifier: {
      id: 'mod_helm_cloth_2', name: 'Keffiyeh of Warding',
      description: '20% less damage when player has 2 or fewer cards in hand', source: 'equipment',
      modifyDamageReceived(damage, context) {
        return context.playerHand.cards.length <= 2 ? Math.round(damage * 0.8) : damage;
      },
    },
  },
  // ── Cloth Armor (new) ──
  createArmor('armor_cloth_2', 'Hardened Linen', 'cloth', 22, 0.15, '15% less incoming damage'),
  // ── Cloth Boots (new) ──
  createBoots('boots_cloth_2', 'Whirling Sandals', 'cloth', 22, 0.12, '12% dodge chance'),
  // ── Cloth Trinkets (new) ──
  {
    id: 'trinket_cloth_2', name: 'Copper Coin Ring',
    slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+8 gold per battle', cost: 18,
    modifier: {
      id: 'mod_trinket_cloth_2', name: 'Copper Coin Ring',
      description: '+8 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 8; },
    },
  },
  {
    id: 'trinket_cloth_3', name: "Wanderer's Pouch",
    slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+3 gold per hand won this battle', cost: 22,
    modifier: {
      id: 'mod_trinket_cloth_3', name: "Wanderer's Pouch",
      description: '+3 gold per hand won this battle', source: 'equipment',
      modifyGoldEarned(gold, context) { return gold + context.handsWonThisBattle * 3; },
    },
  },
  {
    id: 'trinket_cloth_4', name: 'Lucky Knucklebone',
    slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
    description: '+15 gold per battle if player won 2 or more hands', cost: 25,
    modifier: {
      id: 'mod_trinket_cloth_4', name: 'Lucky Knucklebone',
      description: '+15 gold per battle if player won 2 or more hands', source: 'equipment',
      modifyGoldEarned(gold, context) {
        return gold + (context.handsWonThisBattle >= 2 ? 15 : 0);
      },
    },
  },
```

**Step 4: Run tests**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|cloth tier)"
```
Expected: all pass.

**Step 5: Commit**
```bash
git add src/engine/equipment.ts
git commit -m "feat: add 8 new cloth-tier equipment items (Arabian theme)"
```

---

## Task 5: Expand Equipment — Bronze Tier

**Files:**
- Modify: `src/engine/equipment.ts`

**Step 1: Write failing tests**

```typescript
describe('bronze tier expansion', () => {
  it('Oasis Blade gives +6 bonus when player score >= 18', () => {
    const eq = getEquipmentById('weapon_bronze_2');
    const ctx = makeContext();
    ctx.playerScore = { value: 20, soft: false, busted: false, isBlackjack: false };
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(25); // 10 + 9 + 6
  });
  it('Twin Fangs gives +8 bonus when player has Ace', () => {
    const eq = getEquipmentById('weapon_bronze_3');
    const ctx = makeContext();
    ctx.playerHand = { cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'clubs', rank: '7' }] };
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(26); // 10 + 8 + 8
  });
  it("Vizier's Headpiece heals player on bust", () => {
    const eq = getEquipmentById('helm_bronze_2');
    const ctx = makeContext();
    ctx.playerScore = { value: 25, soft: false, busted: true, isBlackjack: false };
    ctx.playerState.hp = 20;
    ctx.playerState.maxHp = 30;
    eq.modifier.onHandEnd!(ctx);
    expect(ctx.playerState.hp).toBe(23);
  });
  it('Serpent Amulet tracks blackjacks and adds gold', () => {
    const eq = getEquipmentById('trinket_bronze_3');
    const ctx = makeContext();
    ctx.playerScore = { value: 21, soft: false, busted: false, isBlackjack: true };
    eq.modifier.onHandEnd!(ctx);
    expect(eq.modifier.modifyGoldEarned!(8, ctx)).toBe(21); // 8 + 8 base + 5 for 1 BJ, counter resets
  });
});
```

**Step 2: Run tests to verify they fail**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|bronze tier)"
```

**Step 3: Add new bronze equipment to ALL_EQUIPMENT**

```typescript
  // ── Bronze Weapons (new) ──
  {
    id: 'weapon_bronze_2', name: 'Oasis Blade',
    slot: 'weapon' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+9 flat damage; +6 more if player score is 18 or higher', cost: 55,
    modifier: {
      id: 'mod_weapon_bronze_2', name: 'Oasis Blade',
      description: '+9 damage; +6 more at score 18+', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 9 + (!context.playerScore.busted && context.playerScore.value >= 18 ? 6 : 0);
      },
    },
  },
  {
    id: 'weapon_bronze_3', name: 'Twin Fangs',
    slot: 'weapon' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+8 flat damage; +8 more if player holds an Ace', cost: 65,
    modifier: {
      id: 'mod_weapon_bronze_3', name: 'Twin Fangs',
      description: '+8 damage; +8 more with an Ace in hand', source: 'equipment',
      modifyDamageDealt(damage, context) {
        const hasAce = context.playerHand.cards.some(c => c.rank === 'A');
        return damage + 8 + (hasAce ? 8 : 0);
      },
    },
  },
  // ── Bronze Helm (new) ──
  {
    id: 'helm_bronze_2', name: "Vizier's Headpiece",
    slot: 'helm' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '40% less bust damage; heal 3 HP on bust', cost: 48,
    modifier: {
      id: 'mod_helm_bronze_2', name: "Vizier's Headpiece",
      description: '40% less bust damage; heal 3 HP on bust', source: 'equipment',
      modifyDamageReceived(damage, context) {
        return context.playerScore.busted ? Math.round(damage * 0.6) : damage;
      },
      onHandEnd(context) {
        if (context.playerScore.busted) {
          context.playerState.hp = Math.min(context.playerState.hp + 3, context.playerState.maxHp);
        }
      },
    },
  },
  // ── Bronze Armor (new) ──
  createArmor('armor_bronze_2', 'Silk-Wrapped Mail', 'bronze', 52, 0.30, '30% less incoming damage'),
  // ── Bronze Boots (new) ──
  createBoots('boots_bronze_2', 'Quickstep Shoes', 'bronze', 48, 0.20, '20% dodge chance'),
  // ── Bronze Trinkets (new) ──
  {
    id: 'trinket_bronze_2', name: "Merchant's Medallion",
    slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+18 gold per battle', cost: 45,
    modifier: {
      id: 'mod_trinket_bronze_2', name: "Merchant's Medallion",
      description: '+18 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 18; },
    },
  },
  {
    id: 'trinket_bronze_3', name: 'Serpent Amulet',
    slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '+8 gold per battle; +5 gold per blackjack scored', cost: 50,
    modifier: (() => {
      let bjCount = 0;
      const mod: Modifier = {
        id: 'mod_trinket_bronze_3', name: 'Serpent Amulet',
        description: '+8 gold per battle; +5 gold per blackjack', source: 'equipment',
        onHandEnd(context) {
          if (context.playerScore.isBlackjack) bjCount++;
        },
        modifyGoldEarned(gold) {
          const bonus = bjCount * 5;
          bjCount = 0;
          return gold + 8 + bonus;
        },
      };
      return mod;
    })(),
  },
  {
    id: 'trinket_bronze_4', name: 'Desert Eye',
    slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
    description: '15% less damage from a randomly chosen suit each battle', cost: 42,
    modifier: (() => {
      let activeSuit: Suit | null = null;
      const mod: Modifier = {
        id: 'mod_trinket_bronze_4', name: 'Desert Eye',
        description: '15% less damage from a random suit', source: 'equipment',
        onBattleStart(context) {
          const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
          activeSuit = suits[context.rng.nextInt(0, 3)];
        },
        modifyDamageReceived(damage, context) {
          if (!activeSuit) return damage;
          const hasSuit = context.dealerHand.cards.some(c => c.suit === activeSuit);
          return hasSuit ? Math.floor(damage * 0.85) : damage;
        },
      };
      return mod;
    })(),
  },
```

**Step 4: Run tests**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|bronze tier)"
```

**Step 5: Commit**
```bash
git add src/engine/equipment.ts
git commit -m "feat: add 8 new bronze-tier equipment items (Arabian theme)"
```

---

## Task 6: Expand Equipment — Iron Tier

**Files:**
- Modify: `src/engine/equipment.ts`

**Step 1: Write failing tests**

```typescript
describe('iron tier expansion', () => {
  it('Golden Scimitar deals +10 on blackjack', () => {
    const eq = getEquipmentById('weapon_iron_2');
    const ctx = makeContext();
    ctx.playerScore = { value: 21, soft: false, busted: false, isBlackjack: true };
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(42); // 10 + 22 + 10
  });
  it('Sunfire Lance deals +8 when dealer has 4+ cards', () => {
    const eq = getEquipmentById('weapon_iron_3');
    const ctx = makeContext();
    ctx.dealerHand = { cards: [
      { suit: 'hearts', rank: '2' }, { suit: 'clubs', rank: '3' },
      { suit: 'spades', rank: '4' }, { suit: 'diamonds', rank: '5' }
    ]};
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(38); // 10 + 20 + 8
  });
  it('Seal of the Caliph doubles damage on hand 1', () => {
    const eq = getEquipmentById('trinket_iron_4');
    const ctx = makeContext();
    ctx.handNumber = 1;
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(20);
  });
  it('Seal of the Caliph deals normal damage after hand 1', () => {
    const eq = getEquipmentById('trinket_iron_4');
    const ctx = makeContext();
    ctx.handNumber = 2;
    expect(eq.modifier.modifyDamageDealt!(10, ctx)).toBe(10);
  });
});
```

**Step 2: Run to verify they fail**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|iron tier)"
```

**Step 3: Add new iron equipment to ALL_EQUIPMENT**

```typescript
  // ── Iron Weapons (new) ──
  {
    id: 'weapon_iron_2', name: 'Golden Scimitar',
    slot: 'weapon' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '+22 flat damage; +10 on blackjack', cost: 95,
    modifier: {
      id: 'mod_weapon_iron_2', name: 'Golden Scimitar',
      description: '+22 damage; +10 on blackjack', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 22 + (context.playerScore.isBlackjack ? 10 : 0);
      },
    },
  },
  {
    id: 'weapon_iron_3', name: 'Sunfire Lance',
    slot: 'weapon' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '+20 flat damage; +8 if dealer drew 4 or more cards', cost: 108,
    modifier: {
      id: 'mod_weapon_iron_3', name: 'Sunfire Lance',
      description: '+20 damage; +8 if dealer has 4+ cards', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return damage + 20 + (context.dealerHand.cards.length >= 4 ? 8 : 0);
      },
    },
  },
  // ── Iron Helm (new) ──
  {
    id: 'helm_iron_2', name: "Sultan's Crown",
    slot: 'helm' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '75% less bust damage; heal 4 HP on bust', cost: 85,
    modifier: {
      id: 'mod_helm_iron_2', name: "Sultan's Crown",
      description: '75% less bust damage; heal 4 HP on bust', source: 'equipment',
      modifyDamageReceived(damage, context) {
        return context.playerScore.busted ? Math.round(damage * 0.25) : damage;
      },
      onHandEnd(context) {
        if (context.playerScore.busted) {
          context.playerState.hp = Math.min(context.playerState.hp + 4, context.playerState.maxHp);
        }
      },
    },
  },
  // ── Iron Armor (new) ──
  createArmor('armor_iron_2', 'Lamellar Armor', 'iron', 92, 0.55, '55% less incoming damage'),
  // ── Iron Boots (new) ──
  createBoots('boots_iron_2', 'Winged Sandals', 'iron', 88, 0.35, '35% dodge chance'),
  // ── Iron Trinkets (new) ──
  {
    id: 'trinket_iron_2', name: 'Lamp of Fortune',
    slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '+30 gold per battle', cost: 80,
    modifier: {
      id: 'mod_trinket_iron_2', name: 'Lamp of Fortune',
      description: '+30 gold per battle', source: 'equipment',
      modifyGoldEarned(gold) { return gold + 30; },
    },
  },
  {
    id: 'trinket_iron_3', name: 'Ring of Solomon',
    slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: '15% less incoming damage from all sources', cost: 90,
    modifier: {
      id: 'mod_trinket_iron_3', name: 'Ring of Solomon',
      description: '15% less all incoming damage', source: 'equipment',
      modifyDamageReceived(damage) { return Math.floor(damage * 0.85); },
    },
  },
  {
    id: 'trinket_iron_4', name: 'Seal of the Caliph',
    slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
    description: 'First hand of each battle deals double damage', cost: 85,
    modifier: {
      id: 'mod_trinket_iron_4', name: 'Seal of the Caliph',
      description: 'First hand of each battle deals double damage', source: 'equipment',
      modifyDamageDealt(damage, context) {
        return context.handNumber === 1 ? damage * 2 : damage;
      },
    },
  },
```

**Step 4: Run tests**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|iron tier)"
```

**Step 5: Commit**
```bash
git add src/engine/equipment.ts
git commit -m "feat: add 8 new iron-tier equipment items (Arabian theme)"
```

---

## Task 7: Expand Consumables

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/consumables.ts`

**Step 1: Write failing tests**

```typescript
import { getAllConsumables, applyConsumable } from '../consumables.js';

describe('new consumables', () => {
  it('has 10 total consumables', () => {
    expect(getAllConsumables().length).toBe(10);
  });

  it('armor_elixir applies 30% damage reduction for 2 hands', () => {
    const cons = getAllConsumables().find(c => c.id === 'armor_elixir')!;
    const player = makePlayerState();
    const enemy = makeEnemyState();
    applyConsumable(cons, player, enemy);
    expect(player.activeEffects).toHaveLength(1);
    const effect = player.activeEffects[0];
    expect(effect.remainingHands).toBe(2);
    expect(effect.modifier.modifyDamageReceived!(100, makeContext())).toBe(70);
  });

  it('fortune_vessel instantly adds 20 gold', () => {
    const cons = getAllConsumables().find(c => c.id === 'fortune_vessel')!;
    const player = makePlayerState();
    player.gold = 10;
    applyConsumable(cons, player, makeEnemyState());
    expect(player.gold).toBe(30);
  });

  it('wrath_elixir applies +80% damage for 1 hand', () => {
    const cons = getAllConsumables().find(c => c.id === 'wrath_elixir')!;
    const player = makePlayerState();
    applyConsumable(cons, player, makeEnemyState());
    expect(player.activeEffects[0].remainingHands).toBe(1);
    expect(player.activeEffects[0].modifier.modifyDamageDealt!(100, makeContext())).toBe(180);
  });
});
```

**Step 2: Run to verify they fail**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|new consumables)"
```

**Step 3: Add new ConsumableTypes to types.ts**

Find `ConsumableType` in `src/engine/types.ts`:
```typescript
export type ConsumableType = 'health_potion' | 'damage_potion' | 'strength_potion' | 'poison_potion';
```

Replace with:
```typescript
export type ConsumableType =
  | 'health_potion'
  | 'damage_potion'
  | 'strength_potion'
  | 'poison_potion'
  | 'armor_elixir'
  | 'dodge_brew'
  | 'regen_draught'
  | 'battle_trance'
  | 'fortune_vessel'
  | 'wrath_elixir';
```

**Step 4: Add new consumable definitions to CONSUMABLE_DEFS**

In `consumables.ts`, add to the `CONSUMABLE_DEFS` array:

```typescript
  {
    id: 'armor_elixir', name: 'Elixir of Iron Skin', type: 'armor_elixir',
    description: '−30% damage received for 2 hands', cost: 20,
    effect: { type: 'armor_elixir', value: 0.30, duration: 2 },
  },
  {
    id: 'dodge_brew', name: "Sand Dancer's Brew", type: 'dodge_brew',
    description: '25% dodge chance for 1 hand', cost: 18,
    effect: { type: 'dodge_brew', value: 0.25, duration: 1 },
  },
  {
    id: 'regen_draught', name: 'Phoenix Draught', type: 'regen_draught',
    description: 'Heal 2 HP per hand for 3 hands', cost: 22,
    effect: { type: 'regen_draught', value: 2, duration: 3 },
  },
  {
    id: 'battle_trance', name: 'Battle Trance', type: 'battle_trance',
    description: '+40% damage dealt and −20% damage received for 2 hands', cost: 25,
    effect: { type: 'battle_trance', value: 0.40, duration: 2 },
  },
  {
    id: 'fortune_vessel', name: "Fortune's Vessel", type: 'fortune_vessel',
    description: 'Instantly gain 20 gold', cost: 20,
    effect: { type: 'fortune_vessel', value: 20 },
  },
  {
    id: 'wrath_elixir', name: 'Wrath Elixir', type: 'wrath_elixir',
    description: '+80% damage for 1 hand', cost: 28,
    effect: { type: 'wrath_elixir', value: 0.80, duration: 1 },
  },
```

**Step 5: Handle new types in applyConsumable**

In the `switch (consumable.effect.type)` block, add before `default`:

```typescript
    case 'armor_elixir': {
      const effect: ActiveEffect = {
        id: 'armor_elixir_effect', name: 'Iron Skin',
        remainingHands: consumable.effect.duration ?? 2,
        modifier: {
          id: 'mod_armor_elixir', name: 'Iron Skin',
          description: `−${Math.round(consumable.effect.value * 100)}% damage received`,
          source: 'consumable',
          modifyDamageReceived(damage) {
            return Math.round(damage * (1 - consumable.effect.value));
          },
        },
      };
      playerState.activeEffects.push(effect);
      return `Iron Skin active: −${Math.round(consumable.effect.value * 100)}% damage for ${effect.remainingHands} hand(s)`;
    }
    case 'dodge_brew': {
      const effect: ActiveEffect = {
        id: 'dodge_brew_effect', name: 'Evasion',
        remainingHands: consumable.effect.duration ?? 1,
        modifier: {
          id: 'mod_dodge_brew', name: 'Evasion',
          description: `${Math.round(consumable.effect.value * 100)}% dodge`,
          source: 'consumable',
          dodgeCheck(context) { return context.rng.next() < consumable.effect.value; },
        },
      };
      playerState.activeEffects.push(effect);
      return `Evasion active: ${Math.round(consumable.effect.value * 100)}% dodge for ${effect.remainingHands} hand(s)`;
    }
    case 'regen_draught': {
      const effect: ActiveEffect = {
        id: 'regen_effect', name: 'Regeneration',
        remainingHands: consumable.effect.duration ?? 3,
        modifier: {
          id: 'mod_regen_draught', name: 'Regeneration',
          description: `Heal ${consumable.effect.value} HP per hand`,
          source: 'consumable',
          onHandStart(context) {
            context.playerState.hp = Math.min(
              context.playerState.hp + consumable.effect.value,
              context.playerState.maxHp
            );
          },
        },
      };
      playerState.activeEffects.push(effect);
      return `Regeneration active: heal ${consumable.effect.value} HP/hand for ${effect.remainingHands} hands`;
    }
    case 'battle_trance': {
      const effect: ActiveEffect = {
        id: 'battle_trance_effect', name: 'Battle Trance',
        remainingHands: consumable.effect.duration ?? 2,
        modifier: {
          id: 'mod_battle_trance', name: 'Battle Trance',
          description: `+${Math.round(consumable.effect.value * 100)}% damage dealt, −20% damage received`,
          source: 'consumable',
          modifyDamageDealt(damage) { return Math.floor(damage * (1 + consumable.effect.value)); },
          modifyDamageReceived(damage) { return Math.round(damage * 0.8); },
        },
      };
      playerState.activeEffects.push(effect);
      return `Battle Trance active for ${effect.remainingHands} hand(s)`;
    }
    case 'fortune_vessel': {
      playerState.gold += consumable.effect.value;
      return `Gained ${consumable.effect.value} gold (${playerState.gold} total)`;
    }
    case 'wrath_elixir': {
      const effect: ActiveEffect = {
        id: 'wrath_effect', name: 'Wrath',
        remainingHands: consumable.effect.duration ?? 1,
        modifier: {
          id: 'mod_wrath_elixir', name: 'Wrath',
          description: `+${Math.round(consumable.effect.value * 100)}% damage`,
          source: 'consumable',
          modifyDamageDealt(damage) { return Math.floor(damage * (1 + consumable.effect.value)); },
        },
      };
      playerState.activeEffects.push(effect);
      return `Wrath active: +${Math.round(consumable.effect.value * 100)}% damage for ${effect.remainingHands} hand(s)`;
    }
```

**Step 6: Run tests**
```bash
npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|new consumables)"
```

**Step 7: Commit**
```bash
git add src/engine/types.ts src/engine/consumables.ts
git commit -m "feat: add 6 new consumables — Iron Skin, Sand Dancer's Brew, Phoenix Draught, Battle Trance, Fortune's Vessel, Wrath Elixir"
```

---

## Task 8: Update Documentation Catalogs

**Files:**
- Modify: `docs/design-docs/boss-catalog.md`
- Modify: `docs/design-docs/combatant-catalog.md`
- Modify: `docs/design-docs/item-catalog.md`

**Step 1: Update boss-catalog.md**

Replace Stage 2 (Djinn Warden) and Stage 3 (Crimson Sultan) entries with Murad the Brass Ifrit and Zahhak the Mirror King respectively, matching the exact stats and hook descriptions written in Task 1. Update the Boss Summary table at the bottom.

**Step 2: Update combatant-catalog.md**

- Add "Enemy Pool" note at top: *Each stage has a pool of 6 enemies; 3 are randomly selected per run.*
- Add the 3 new enemies per stage (Qarin, Roc Hatchling, Ghul for Stage 1; Salamander, Brass Sentinel, Shadhavar for Stage 2; Palace Guard, Jinn Inquisitor, Cursed Vizier for Stage 3) following the same format as existing entries.
- Update the Summary Table to show all 6 per stage.

**Step 3: Update item-catalog.md**

- Add all 24 new equipment items under their respective slot sections, following existing format: `Name (Tier) (Cost) — description`
- Add 6 new consumables to the Consumables section.

**Step 4: Commit**
```bash
git add docs/design-docs/boss-catalog.md docs/design-docs/combatant-catalog.md docs/design-docs/item-catalog.md
git commit -m "docs: update all catalogs to reflect Arabian fantasy content expansion"
```

---

## Task 9: Full Test Suite Verification

**Step 1: Run full test suite**
```bash
npm test
```
Expected: all tests pass (287+ tests, no regressions).

**Step 2: Verify balance spot-checks manually**

Run the CLI and check:
```bash
npm run dev -- --seed=12345
```
- Stage 1 enemies should vary between runs with different seeds
- New bosses should appear in Stage 2 and 3
- New equipment should appear in shops
- New consumables should appear in shops

**Step 3: Run simulation to check win rate isn't dramatically affected**
```bash
npm run sim
```
Expected: win rate stays in the same approximate range as before (0-10% is expected per existing sim findings).

**Step 4: Final commit**
```bash
git add -A
git commit -m "feat: complete Arabian fantasy content expansion — 2 new bosses, 9 new enemies, 24 new equipment, 6 new consumables"
```

---

## Success Criteria Checklist

- [ ] `getBossForStage(2).name === 'Murad the Brass Ifrit'`
- [ ] `getBossForStage(3).name === 'Zahhak the Mirror King'`
- [ ] `STAGE_POOLS[0].length === 6` (Stage 1 has 6 enemies)
- [ ] `STAGE_POOLS[1].length === 6` (Stage 2 has 6 enemies)
- [ ] `STAGE_POOLS[2].length === 6` (Stage 3 has 6 enemies)
- [ ] `getAllEquipment().length >= 39`
- [ ] `getAllConsumables().length === 10`
- [ ] Same seed → same enemy selection (determinism preserved)
- [ ] All new modifier hooks use only existing `ModifierContext` fields
- [ ] Full test suite passes with no regressions
- [ ] All catalog docs updated

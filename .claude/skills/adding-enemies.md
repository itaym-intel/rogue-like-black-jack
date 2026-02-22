# Adding Enemies and Bosses

File: `src/engine/combatants.ts`
Tests: `tests/combatants.test.ts`

## Quick Reference

- Regular enemies go in a stage section, added to the `STAGES` array
- Bosses go after their stage's enemies, added to the `BOSSES` array
- All enemies use the `enemyEquip()` helper to attach modifiers
- Boss must have a `curse` property (used by the genie system)
- Update `getEnemiesForStage`/`getBossForStage` range checks if adding stages

## The `enemyEquip` Helper

All enemy modifiers are attached as equipment using this helper:

```ts
function enemyEquip(id: string, name: string, slot: EquipmentSlot, modifier: Modifier): Equipment {
  return { id, name, slot, tier: 'cloth' as EquipmentTier, description: modifier.description, cost: 0, modifier };
}
```

- `id`: unique string, pattern `{enemyPrefix}_{slot}` e.g. `'vbat_trinket'`
- `name`: flavor name for the ability e.g. `'Shadow Cloak'`
- `slot`: any EquipmentSlot — used for organization, not gameplay
- `modifier`: the actual Modifier object with hooks

## ID Naming Conventions

- Enemy equip IDs: `{shortname}_{slot}` e.g. `'jackal_trinket'`, `'strix_weapon'`
- Modifier IDs: `mod_{shortname}_{effect}` e.g. `'mod_vbat_spade_resist'`, `'mod_strix_bj_dmg'`
- Curse IDs: `curse_{shortname}` e.g. `'curse_strix'`

## Templates

### No-modifier enemy (simplest)

```ts
const sandScorpion: CombatantData = {
  name: 'Sand Scorpion',
  maxHp: 18,
  isBoss: false,
  description: 'A large scorpion with a venomous stinger.',
  equipment: [],
};
```

### Single-modifier enemy: flat damage bonus

```ts
const desertJackal: CombatantData = {
  name: 'Desert Jackal',
  maxHp: 20,
  isBoss: false,
  description: 'A cunning predator of the dunes.',
  equipment: [
    enemyEquip('jackal_trinket', 'Predator Fangs', 'trinket', {
      id: 'mod_jackal_dmg', name: 'Predator Fangs',
      description: '+3 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 3; },
    }),
  ],
};
```

### Single-modifier enemy: suit-based damage reduction

```ts
const vampireBat: CombatantData = {
  name: 'Vampire Bat',
  maxHp: 15,
  isBoss: false,
  description: 'A leathery winged creature that thrives in darkness.',
  equipment: [
    enemyEquip('vbat_trinket', 'Shadow Cloak', 'trinket', {
      id: 'mod_vbat_spade_resist', name: 'Shadow Cloak',
      description: '50% less damage from spade hands', source: 'enemy',
      modifyDamageReceived(damage, context) {
        const hasSpade = context.playerHand.cards.some(c => c.suit === 'spades');
        return hasSpade ? Math.round(damage * 0.5) : damage;
      },
    }),
  ],
};
```

### Single-modifier enemy: dodge chance

```ts
const dustWraith: CombatantData = {
  name: 'Dust Wraith',
  maxHp: 25,
  isBoss: false,
  description: 'A swirling phantom of desert sand.',
  equipment: [
    enemyEquip('wraith_boots', 'Phantom Step', 'boots', {
      id: 'mod_wraith_dodge', name: 'Phantom Step',
      description: '15% dodge', source: 'enemy',
      dodgeCheck(context) { return context.rng.next() < 0.15; },
    }),
  ],
};
```

### Single-modifier enemy: percent damage reduction

```ts
const tombGuardian: CombatantData = {
  name: 'Tomb Guardian',
  maxHp: 28,
  isBoss: false,
  description: 'An animated stone sentinel guarding forgotten tombs.',
  equipment: [
    enemyEquip('guardian_armor', 'Stone Shell', 'armor', {
      id: 'mod_guardian_armor', name: 'Stone Shell',
      description: '25% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.75); },
    }),
  ],
};
```

### Multi-modifier enemy: damage + dodge

```ts
const shadowAssassin: CombatantData = {
  name: 'Shadow Assassin',
  maxHp: 30,
  isBoss: false,
  description: 'A silent killer wreathed in magical darkness.',
  equipment: [
    enemyEquip('assassin_weapon', 'Shadow Blade', 'weapon', {
      id: 'mod_assassin_dmg', name: 'Shadow Blade',
      description: '+10 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 10; },
    }),
    enemyEquip('assassin_boots', 'Shadow Step', 'boots', {
      id: 'mod_assassin_dodge', name: 'Shadow Step',
      description: '20% dodge', source: 'enemy',
      dodgeCheck(context) { return context.rng.next() < 0.20; },
    }),
  ],
};
```

### Multi-modifier enemy: suit-counting damage bonus (dealer hand)

```ts
const fireDancer: CombatantData = {
  name: 'Fire Dancer',
  maxHp: 32,
  isBoss: false,
  description: 'A performer whose flames are anything but theatrical.',
  equipment: [
    enemyEquip('dancer_trinket', 'Flame Veil', 'trinket', {
      id: 'mod_dancer_red', name: 'Flame Veil',
      description: '+3 damage per red card in dealer hand', source: 'enemy',
      modifyDamageDealt(damage, context) {
        const redCards = context.dealerHand.cards.filter(
          c => c.suit === 'hearts' || c.suit === 'diamonds'
        ).length;
        return damage + redCards * 3;
      },
    }),
  ],
};
```

## Boss Templates

Bosses have `isBoss: true`, higher `maxHp`, multiple equipment, and a `curse` property.

### Boss with damage-modifier curse

```ts
const ancientStrix: CombatantData = {
  name: 'Ancient Strix',
  maxHp: 50,
  isBoss: true,
  description: 'An ancient owl-like demon of the desert night.',
  equipment: [
    enemyEquip('strix_weapon', 'Night Fang', 'weapon', {
      id: 'mod_strix_bj_dmg', name: 'Night Fang',
      description: '+10 damage on blackjack', source: 'enemy',
      modifyDamageDealt(damage, context) {
        if (context.dealerScore.isBlackjack) return damage + 10;
        return damage;
      },
    }),
    enemyEquip('strix_trinket', 'Red Bane', 'trinket', {
      id: 'mod_strix_red_vuln', name: 'Red Bane',
      description: '+2 damage per red card in player hand', source: 'enemy',
      modifyDamageReceived(damage, context) {
        const redCards = context.playerHand.cards.filter(
          c => c.suit === 'hearts' || c.suit === 'diamonds'
        ).length;
        return damage + redCards * 2;
      },
    }),
  ],
  curse: {
    id: 'curse_strix', name: 'Night Fang Curse',
    description: 'Enemies deal +5 damage on blackjack', source: 'wish_curse',
    modifyDamageReceived(damage, context) {
      if (context.dealerScore.isBlackjack) return damage + 5;
      return damage;
    },
  },
};
```

### Boss with hand-start curse (damage-over-time)

```ts
const djinnWarden: CombatantData = {
  name: 'Djinn Warden',
  maxHp: 75,
  isBoss: true,
  description: 'A bound djinn forced to guard the oasis for eternity.',
  equipment: [
    enemyEquip('djinn_weapon', 'Warden Blade', 'weapon', {
      id: 'mod_djinn_dmg', name: 'Warden Blade',
      description: '+8 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 8; },
    }),
    enemyEquip('djinn_trinket', 'Oasis Heart', 'trinket', {
      id: 'mod_djinn_heal', name: 'Oasis Heart',
      description: 'Heals 10 on blackjack', source: 'enemy',
      onHandEnd(context) {
        if (context.dealerScore.isBlackjack) {
          context.enemyState.hp = Math.min(
            context.enemyState.hp + 10,
            context.enemyState.data.maxHp
          );
        }
      },
    }),
  ],
  curse: {
    id: 'curse_djinn', name: 'Warden Curse',
    description: 'Take 3 damage at the start of each hand', source: 'wish_curse',
    onHandStart(context) {
      context.playerState.hp = Math.max(0, context.playerState.hp - 3);
    },
  },
};
```

### Boss with rule-modifier curse

```ts
const crimsonSultan: CombatantData = {
  name: 'Crimson Sultan',
  maxHp: 100,
  isBoss: true,
  description: 'The tyrannical ruler of the palace, wielding forbidden magic.',
  equipment: [
    enemyEquip('sultan_weapon', 'Crimson Blade', 'weapon', {
      id: 'mod_sultan_dmg', name: 'Crimson Blade',
      description: '+15 flat damage', source: 'enemy',
      modifyDamageDealt(damage) { return damage + 15; },
    }),
    enemyEquip('sultan_armor', 'Royal Guard', 'armor', {
      id: 'mod_sultan_armor', name: 'Royal Guard',
      description: '30% less damage', source: 'enemy',
      modifyDamageReceived(damage) { return Math.round(damage * 0.7); },
    }),
    enemyEquip('sultan_trinket', 'Tyrant Crown', 'trinket', {
      id: 'mod_sultan_push', name: 'Tyrant Crown',
      description: '5 damage to player on push', source: 'enemy',
      onHandEnd(context) {
        if (!context.playerScore.busted && !context.dealerScore.busted &&
            context.playerScore.value === context.dealerScore.value) {
          context.playerState.hp = Math.max(0, context.playerState.hp - 5);
        }
      },
    }),
  ],
  curse: {
    id: 'curse_sultan', name: 'Crimson Curse',
    description: 'Ties favor the dealer', source: 'wish_curse',
    modifyRules(rules) {
      return {
        ...rules,
        winConditions: { ...rules.winConditions, tieResolution: 'dealer' as const },
      };
    },
  },
};
```

## All Modifier Hook Patterns Used by Enemies

### `modifyDamageDealt(damage, context)` — enemy deals more damage

```ts
modifyDamageDealt(damage) { return damage + 3; }                    // flat bonus
modifyDamageDealt(damage, context) {                                // conditional
  if (context.dealerScore.isBlackjack) return damage + 10;
  return damage;
}
modifyDamageDealt(damage, context) {                                // suit-counting
  const redCards = context.dealerHand.cards.filter(
    c => c.suit === 'hearts' || c.suit === 'diamonds'
  ).length;
  return damage + redCards * 3;
}
```

### `modifyDamageReceived(damage, context)` — enemy takes less damage

```ts
modifyDamageReceived(damage) { return Math.round(damage * 0.75); }  // flat % reduction
modifyDamageReceived(damage, context) {                              // suit-conditional
  const hasSpade = context.playerHand.cards.some(c => c.suit === 'spades');
  return hasSpade ? Math.round(damage * 0.5) : damage;
}
modifyDamageReceived(damage, context) {                              // suit-counting (player hand)
  const redCards = context.playerHand.cards.filter(
    c => c.suit === 'hearts' || c.suit === 'diamonds'
  ).length;
  return damage + redCards * 2;
}
```

### `dodgeCheck(context)` — chance to avoid damage entirely

```ts
dodgeCheck(context) { return context.rng.next() < 0.15; }          // 15% dodge
dodgeCheck(context) { return context.rng.next() < 0.20; }          // 20% dodge
```

Always use `context.rng.next()` (returns 0-1) for determinism.

### `onHandEnd(context)` — trigger effect after hand resolves

```ts
onHandEnd(context) {                                                 // heal on blackjack
  if (context.dealerScore.isBlackjack) {
    context.enemyState.hp = Math.min(
      context.enemyState.hp + 10,
      context.enemyState.data.maxHp
    );
  }
}
onHandEnd(context) {                                                 // damage on push
  if (!context.playerScore.busted && !context.dealerScore.busted &&
      context.playerScore.value === context.dealerScore.value) {
    context.playerState.hp = Math.max(0, context.playerState.hp - 5);
  }
}
```

### `onHandStart(context)` — trigger effect before hand plays

```ts
onHandStart(context) {                                               // DOT to player
  context.playerState.hp = Math.max(0, context.playerState.hp - 3);
}
```

## Boss Curse Patterns

Curses are `Modifier` objects on the boss's `curse` property. Source is always `'wish_curse'`. Three established patterns:

### 1. Damage modifier curse

```ts
curse: {
  id: 'curse_strix', name: 'Night Fang Curse',
  description: 'Enemies deal +5 damage on blackjack', source: 'wish_curse',
  modifyDamageReceived(damage, context) {
    if (context.dealerScore.isBlackjack) return damage + 5;
    return damage;
  },
},
```

### 2. Rule modifier curse

```ts
curse: {
  id: 'curse_sultan', name: 'Crimson Curse',
  description: 'Ties favor the dealer', source: 'wish_curse',
  modifyRules(rules) {
    return {
      ...rules,
      winConditions: { ...rules.winConditions, tieResolution: 'dealer' as const },
    };
  },
},
```

### 3. Hand-start effect curse

```ts
curse: {
  id: 'curse_djinn', name: 'Warden Curse',
  description: 'Take 3 damage at the start of each hand', source: 'wish_curse',
  onHandStart(context) {
    context.playerState.hp = Math.max(0, context.playerState.hp - 3);
  },
},
```

## Wiring: Stage and Boss Arrays

At the bottom of `combatants.ts`:

```ts
const STAGES: CombatantData[][] = [
  [vampireBat, sandScorpion, desertJackal],       // Stage 1
  [dustWraith, tombGuardian, sandSerpent],         // Stage 2
  [obsidianGolem, shadowAssassin, fireDancer],     // Stage 3
];

const BOSSES: CombatantData[] = [ancientStrix, djinnWarden, crimsonSultan];
```

To add enemies to an existing stage: add the const, then append to the appropriate `STAGES[n]` array.

To add a new stage: add a new array to `STAGES`, a new boss to `BOSSES`, and update the range checks in `getEnemiesForStage` and `getBossForStage` (currently `stage < 1 || stage > 3`).

## Test Patterns

File: `tests/combatants.test.ts`

### The `makeContext` helper

```ts
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { ModifierContext } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] }, dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 50, isBoss: false, equipment: [], description: '' }, hp: 50 },
    rules: getDefaultRules(),
    rng: new SeededRNG('combatant-test'),
    stage: 1, battle: 1, handNumber: 1,
    ...overrides,
  };
}
```

### Testing `modifyDamageDealt`

```ts
it('+3 flat damage', () => {
  const jackal = enemies[2];
  const mod = jackal.equipment[0].modifier;
  expect(mod.modifyDamageDealt!(10, makeContext())).toBe(13);
});
```

### Testing conditional `modifyDamageDealt` (blackjack check)

```ts
it('+10 damage on blackjack', () => {
  const weaponMod = boss.equipment[0].modifier;
  const ctx = makeContext({
    dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
  });
  expect(weaponMod.modifyDamageDealt!(10, ctx)).toBe(20);
});
```

### Testing `modifyDamageReceived` with suit check

```ts
it('50% damage reduction from spade hands', () => {
  const mod = bat.equipment[0].modifier;
  const ctxWithSpade = makeContext({
    playerHand: { cards: [{ suit: 'spades', rank: 'K' }, { suit: 'hearts', rank: '8' }] },
  });
  expect(mod.modifyDamageReceived!(10, ctxWithSpade)).toBe(5);
  const ctxNoSpade = makeContext({
    playerHand: { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '8' }] },
  });
  expect(mod.modifyDamageReceived!(10, ctxNoSpade)).toBe(10);
});
```

### Testing `modifyDamageReceived` with card counting

```ts
it('+2 per red card in player hand', () => {
  const trinketMod = boss.equipment[1].modifier;
  const ctx = makeContext({
    playerHand: {
      cards: [
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: '5' },
        { suit: 'spades', rank: '3' },
      ],
    },
  });
  expect(trinketMod.modifyDamageReceived!(10, ctx)).toBe(14); // 10 + 2*2
});
```

### Testing dodge (1000-iteration probability loop)

```ts
it('15% dodge', () => {
  const mod = wraith.equipment[0].modifier;
  let dodges = 0;
  for (let i = 0; i < 1000; i++) {
    if (mod.dodgeCheck!(makeContext({ rng: new SeededRNG(`wraith-${i}`) }))) dodges++;
  }
  expect(dodges).toBeGreaterThan(100);
  expect(dodges).toBeLessThan(200);
});
```

Use unique seed per iteration. For X% dodge, expect range roughly `(X-5)% * 1000` to `(X+5)% * 1000`.

### Testing `onHandEnd` (state mutation)

```ts
it('heals 10 on blackjack', () => {
  const es = { data: boss, hp: 50 };
  const ctx = makeContext({
    enemyState: es,
    dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
  });
  boss.equipment[1].modifier.onHandEnd!(ctx);
  expect(es.hp).toBe(60);
});
```

### Testing `onHandStart` (curse DOT)

```ts
it('curse: 3 damage per hand to player', () => {
  const curse = boss.curse!;
  const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
  const ctx = makeContext({ playerState: ps as any });
  curse.onHandStart!(ctx);
  expect(ps.hp).toBe(47);
});
```

### Testing `modifyRules` (curse rule change)

```ts
it('curse: ties favor dealer', () => {
  const curse = boss.curse!;
  const rules = getDefaultRules();
  const modified = curse.modifyRules!(rules);
  expect(modified.winConditions.tieResolution).toBe('dealer');
});
```

## Checklist

1. Define the `CombatantData` const with unique name, appropriate `maxHp`, and `isBoss`
2. Attach modifiers via `enemyEquip()` with unique IDs
3. If boss: add `curse` property with `source: 'wish_curse'`
4. Add to the appropriate `STAGES[n]` array (or `BOSSES` array for bosses)
5. If adding a new stage: update range checks in `getEnemiesForStage` and `getBossForStage`
6. Add tests for every modifier hook and the curse
7. Run verification commands

## Verification

```bash
npx vitest run tests/combatants.test.ts
npx vitest run
```

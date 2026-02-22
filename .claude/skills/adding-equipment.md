# Adding Equipment

File: `src/engine/equipment.ts`
Tests: `tests/equipment.test.ts`

## Quick Reference

- 4 helper functions for standard slots: `createWeapon`, `createHelm`, `createArmor`, `createBoots`
- Trinkets are defined as raw `Equipment` objects (no helper)
- All items go in the `ALL_EQUIPMENT` array
- 3 tiers: `'cloth'` (cheap), `'bronze'` (mid), `'iron'` (expensive)
- After adding items, update the item count assertion in tests

## The 4 Helper Functions

### `createWeapon` — flat damage bonus via `modifyDamageDealt`

```ts
function createWeapon(id: string, name: string, tier: EquipmentTier, cost: number, flatDamage: number, desc: string): Equipment {
  return {
    id, name, slot: 'weapon', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `+${flatDamage} damage`, source: 'equipment',
      modifyDamageDealt(damage) { return damage + flatDamage; },
    },
  };
}
```

Usage:
```ts
createWeapon('weapon_cloth', 'Flint Spear', 'cloth', 30, 5, '+5 flat damage'),
createWeapon('weapon_bronze', 'Bronze Saif', 'bronze', 60, 10, '+10 flat damage'),
createWeapon('weapon_iron', 'Iron Scimitar', 'iron', 100, 25, '+25 flat damage'),
```

### `createHelm` — bust-only damage reduction via `modifyDamageReceived`

```ts
function createHelm(id: string, name: string, tier: EquipmentTier, cost: number, reduction: number, desc: string): Equipment {
  const pct = Math.round(reduction * 100);
  return {
    id, name, slot: 'helm', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `${pct}% less bust damage`, source: 'equipment',
      modifyDamageReceived(damage, context) {
        if (context.playerScore.busted) {
          return Math.round(damage * (1 - reduction));
        }
        return damage;
      },
    },
  };
}
```

Usage:
```ts
createHelm('helm_cloth', 'Cloth Helm', 'cloth', 20, 0.3, '30% less damage on bust'),
createHelm('helm_bronze', 'Bronze Helm', 'bronze', 45, 0.5, '50% less damage on bust'),
createHelm('helm_iron', 'Iron Helm', 'iron', 80, 0.8, '80% less damage on bust'),
```

### `createArmor` — all-damage reduction via `modifyDamageReceived`

```ts
function createArmor(id: string, name: string, tier: EquipmentTier, cost: number, reduction: number, desc: string): Equipment {
  const pct = Math.round(reduction * 100);
  return {
    id, name, slot: 'armor', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `${pct}% less damage`, source: 'equipment',
      modifyDamageReceived(damage) {
        return Math.round(damage * (1 - reduction));
      },
    },
  };
}
```

Usage:
```ts
createArmor('armor_cloth', 'Cloth Armor', 'cloth', 25, 0.2, '20% less incoming damage'),
createArmor('armor_bronze', 'Bronze Armor', 'bronze', 55, 0.4, '40% less incoming damage'),
createArmor('armor_iron', 'Iron Armor', 'iron', 90, 0.6, '60% less incoming damage'),
```

### `createBoots` — dodge chance via `dodgeCheck`

```ts
function createBoots(id: string, name: string, tier: EquipmentTier, cost: number, dodgeChance: number, desc: string): Equipment {
  const pct = Math.round(dodgeChance * 100);
  return {
    id, name, slot: 'boots', tier, description: desc, cost,
    modifier: {
      id: `mod_${id}`, name, description: `${pct}% dodge`, source: 'equipment',
      dodgeCheck(context) { return context.rng.next() < dodgeChance; },
    },
  };
}
```

Usage:
```ts
createBoots('boots_cloth', 'Cloth Boots', 'cloth', 20, 0.10, '10% dodge chance'),
createBoots('boots_bronze', 'Bronze Boots', 'bronze', 50, 0.25, '25% dodge chance'),
createBoots('boots_iron', 'Iron Boots', 'iron', 85, 0.40, '40% dodge chance'),
```

## Trinket Patterns

Trinkets don't use a helper — they're raw `Equipment` objects with custom modifiers. Three established patterns:

### Simple hook trinket

```ts
{
  id: 'trinket_cloth', name: 'Cloth Trinket', slot: 'trinket' as EquipmentSlot, tier: 'cloth' as EquipmentTier,
  description: '+10 gold per battle', cost: 15,
  modifier: {
    id: 'mod_trinket_cloth', name: 'Cloth Trinket', description: '+10 gold per battle', source: 'equipment',
    modifyGoldEarned(gold) { return gold + 10; },
  },
},
```

### Stateful IIFE trinket (closure for mutable state)

Used when the modifier needs state across hands/battles (e.g. tracking a randomly chosen suit):

```ts
{
  id: 'trinket_bronze', name: 'Bronze Trinket', slot: 'trinket' as EquipmentSlot, tier: 'bronze' as EquipmentTier,
  description: '25% less damage from random suit', cost: 40,
  modifier: (() => {
    let activeSuit: Suit | null = null;
    const mod: Modifier = {
      id: 'mod_trinket_bronze', name: 'Bronze Trinket',
      description: '25% less damage from a random suit', source: 'equipment',
      onBattleStart(context) {
        const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
        activeSuit = suits[context.rng.nextInt(0, 3)];
      },
      modifyDamageReceived(damage, context) {
        if (!activeSuit) return damage;
        const winnerHand = context.dealerHand;
        const hasSuit = winnerHand.cards.some(c => c.suit === activeSuit);
        if (hasSuit) {
          return Math.floor(damage * 0.75);
        }
        return damage;
      },
    };
    return mod;
  })(),
},
```

Key: wrap the modifier in an IIFE `(() => { ... })()` so closure variables persist across hook calls.

### Bust override trinket

```ts
{
  id: 'trinket_iron', name: 'Iron Trinket', slot: 'trinket' as EquipmentSlot, tier: 'iron' as EquipmentTier,
  description: 'Bust counts as score of 10', cost: 75,
  modifier: {
    id: 'mod_trinket_iron', name: 'Iron Trinket',
    description: 'Bust counts as score of 10', source: 'equipment',
    modifyBust(_hand, _score, _context) {
      return { busted: false, effectiveScore: 10 };
    },
  },
},
```

## Tier and Cost Conventions

| Tier   | Weapon | Helm | Armor | Boots | Trinket |
|--------|--------|------|-------|-------|---------|
| cloth  | 30     | 20   | 25    | 20    | 15      |
| bronze | 60     | 45   | 55    | 50    | 40      |
| iron   | 100    | 80   | 90    | 85    | 75      |

General rule: higher tier = stronger effect and higher cost.

## ID Naming Conventions

- Equipment IDs: `{slot}_{tier}` e.g. `'weapon_cloth'`, `'boots_iron'`
- Modifier IDs: `mod_{equipment_id}` e.g. `'mod_weapon_cloth'`, `'mod_trinket_iron'`

If adding a second item in the same slot/tier, use a suffix: `'weapon_cloth_2'`.

## Wiring: The `ALL_EQUIPMENT` Array

All equipment goes in the `ALL_EQUIPMENT` array:

```ts
const ALL_EQUIPMENT: Equipment[] = [
  // Weapons
  createWeapon('weapon_cloth', 'Flint Spear', 'cloth', 30, 5, '+5 flat damage'),
  createWeapon('weapon_bronze', 'Bronze Saif', 'bronze', 60, 10, '+10 flat damage'),
  createWeapon('weapon_iron', 'Iron Scimitar', 'iron', 100, 25, '+25 flat damage'),
  // Helms
  createHelm('helm_cloth', 'Cloth Helm', 'cloth', 20, 0.3, '30% less damage on bust'),
  // ... etc
  // Trinkets
  { id: 'trinket_cloth', ... },
  // ... etc
];
```

Add new items to the appropriate section. The exported functions `getAllEquipment()`, `getEquipmentById()`, and `getEquipmentBySlotAndTier()` all read from this array.

## Test Patterns

File: `tests/equipment.test.ts`

### The `makeContext` helper

```ts
function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] },
    enemyState: { data: { name: 'Test', maxHp: 20, isBoss: false, equipment: [], description: '' }, hp: 20 },
    rules: getDefaultRules(),
    rng: new SeededRNG('equip-test'),
    stage: 1, battle: 1, handNumber: 1,
    ...overrides,
  };
}
```

### Testing weapon damage

```ts
it('Flint Spear adds 5 damage', () => {
  const spear = getEquipmentById('weapon_cloth');
  expect(spear.modifier.modifyDamageDealt!(10, makeContext())).toBe(15);
});
```

### Testing helm bust reduction

```ts
it('Cloth Helm reduces bust damage by 30%', () => {
  const helm = getEquipmentById('helm_cloth');
  const ctx = makeContext({ playerScore: { value: 25, soft: false, busted: true, isBlackjack: false } });
  expect(helm.modifier.modifyDamageReceived!(10, ctx)).toBe(7);
});

it('Cloth Helm does NOT reduce non-bust damage', () => {
  const helm = getEquipmentById('helm_cloth');
  const ctx = makeContext({ playerScore: { value: 18, soft: false, busted: false, isBlackjack: false } });
  expect(helm.modifier.modifyDamageReceived!(10, ctx)).toBe(10);
});
```

### Testing armor reduction

```ts
it('Cloth Armor reduces all damage by 20%', () => {
  const armor = getEquipmentById('armor_cloth');
  expect(armor.modifier.modifyDamageReceived!(10, makeContext())).toBe(8);
});
```

### Testing boots dodge (1000-iteration loop)

```ts
it('Cloth Boots 10% dodge', () => {
  const boots = getEquipmentById('boots_cloth');
  let dodges = 0;
  for (let i = 0; i < 1000; i++) {
    const testRng = new SeededRNG(`dodge-cloth-${i}`);
    if (boots.modifier.dodgeCheck!(makeContext({ rng: testRng }))) dodges++;
  }
  expect(dodges).toBeGreaterThan(50);
  expect(dodges).toBeLessThan(150);
});
```

### Testing trinket gold bonus

```ts
it('Cloth Trinket adds 10 gold', () => {
  const trinket = getEquipmentById('trinket_cloth');
  expect(trinket.modifier.modifyGoldEarned!(10, makeContext())).toBe(20);
});
```

### Testing trinket bust override

```ts
it('Iron Trinket converts bust to score of 10', () => {
  const trinket = getEquipmentById('trinket_iron');
  const result = trinket.modifier.modifyBust!(
    { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' }, { suit: 'hearts', rank: '9' }] },
    24,
    makeContext()
  );
  expect(result).toEqual({ busted: false, effectiveScore: 10 });
});
```

### Testing item count (update this when adding items!)

```ts
it('getAllEquipment returns 15 items', () => {
  expect(getAllEquipment()).toHaveLength(15);
});
```

**Important**: When you add new equipment, update the `15` in this assertion to match the new total.

## Checklist

1. Choose the appropriate slot and tier
2. Use the helper function for standard slots, or raw object for trinkets
3. Use unique IDs following the naming convention
4. Set cost following the tier conventions
5. Add to the `ALL_EQUIPMENT` array in the correct section
6. Write tests for the modifier hooks
7. **Update the `getAllEquipment` length assertion** in `tests/equipment.test.ts`
8. Run verification commands

## Verification

```bash
npx vitest run tests/equipment.test.ts
npx vitest run
```

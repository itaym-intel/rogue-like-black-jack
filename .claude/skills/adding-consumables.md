# Adding Consumables

Files:
- Definitions: `src/engine/consumables.ts`
- Types: `src/engine/types.ts` (for `ConsumableType` union)
- Tests: `tests/consumables.test.ts`

## Quick Reference

- Add the type to `ConsumableType` union in `types.ts`
- Add the definition to `CONSUMABLE_DEFS` in `consumables.ts`
- Add the `case` to the `applyConsumable` switch in `consumables.ts`
- If duration-based: also add handling in `tickActiveEffects`
- Update the item count assertion in tests

## Two Consumable Patterns

### 1. Instant Effect (no duration)

Applied immediately when used. Examples: health potion, damage potion.

### 2. Duration Effect (uses ActiveEffect)

Creates an `ActiveEffect` on the player that lasts N hands. The effect's `modifier` hooks run each hand. Examples: strength potion, poison potion.

## Step 1: Update `ConsumableType` in `types.ts`

```ts
// In src/engine/types.ts
export type ConsumableType = 'health_potion' | 'damage_potion' | 'strength_potion' | 'poison_potion' | 'YOUR_NEW_TYPE';
```

## Step 2: Add to `CONSUMABLE_DEFS` in `consumables.ts`

### Instant effect definition

```ts
{
  id: 'health_potion', name: 'Health Potion', type: 'health_potion',
  description: 'Restores 5 HP', cost: 10,
  effect: { type: 'health_potion', value: 5 },
},
```

### Duration effect definition

```ts
{
  id: 'strength_potion', name: 'Strength Potion', type: 'strength_potion',
  description: '+30% damage for 1 hand', cost: 20,
  effect: { type: 'strength_potion', value: 0.3, duration: 1 },
},
```

Note: `duration` is optional in the type but required for duration-based effects.

## Step 3: Add `case` to `applyConsumable`

### Instant effect: heal player

```ts
case 'health_potion': {
  const heal = consumable.effect.value;
  const before = playerState.hp;
  playerState.hp = Math.min(playerState.hp + heal, playerState.maxHp);
  const actual = playerState.hp - before;
  return `Healed ${actual} HP (${playerState.hp}/${playerState.maxHp})`;
}
```

### Instant effect: damage enemy

```ts
case 'damage_potion': {
  const dmg = consumable.effect.value;
  enemyState.hp = Math.max(0, enemyState.hp - dmg);
  return `Dealt ${dmg} damage to ${enemyState.data.name} (${enemyState.hp}/${enemyState.data.maxHp})`;
}
```

### Duration effect: damage buff

```ts
case 'strength_potion': {
  const effect: ActiveEffect = {
    id: 'strength_effect',
    name: 'Strength',
    remainingHands: consumable.effect.duration ?? 1,
    modifier: {
      id: 'mod_strength_potion',
      name: 'Strength',
      description: '+30% damage for 1 hand',
      source: 'consumable',
      modifyDamageDealt(damage) {
        return Math.floor(damage * (1 + consumable.effect.value));
      },
    },
  };
  playerState.activeEffects.push(effect);
  return `Strength increased by ${Math.round(consumable.effect.value * 100)}% for ${effect.remainingHands} hand(s)`;
}
```

### Duration effect: damage-over-time to enemy

```ts
case 'poison_potion': {
  const effect: ActiveEffect = {
    id: 'poison_effect',
    name: 'Poison',
    remainingHands: consumable.effect.duration ?? 3,
    modifier: {
      id: 'mod_poison_potion',
      name: 'Poison',
      description: `${consumable.effect.value} damage/hand`,
      source: 'consumable',
      onHandEnd(_context) {
        // Poison damage is applied in tickActiveEffects
      },
    },
  };
  playerState.activeEffects.push(effect);
  return `Poisoned enemy for ${consumable.effect.value} damage/hand for ${effect.remainingHands} hands`;
}
```

## Step 4 (Duration effects only): Update `tickActiveEffects`

The `tickActiveEffects` function runs after each hand. It processes active effects by ID:

```ts
export function tickActiveEffects(
  playerState: PlayerState,
  enemyState: EnemyState,
  _context: ModifierContext
): string[] {
  const messages: string[] = [];

  for (const effect of playerState.activeEffects) {
    // Apply poison damage
    if (effect.id === 'poison_effect') {
      const poisonDmg = 3;
      enemyState.hp = Math.max(0, enemyState.hp - poisonDmg);
      messages.push(`Poison dealt ${poisonDmg} to ${enemyState.data.name} (${enemyState.hp}/${enemyState.data.maxHp})`);
    }

    // ADD YOUR NEW EFFECT HERE:
    // if (effect.id === 'your_new_effect') { ... }

    effect.remainingHands--;
  }

  // Remove expired effects
  playerState.activeEffects = playerState.activeEffects.filter(e => e.remainingHands > 0);

  return messages;
}
```

For duration effects that use `modifyDamageDealt` or other modifier hooks (like the strength potion), no `tickActiveEffects` change is needed — the modifier hooks fire automatically. Only add a case here if the effect needs to do something *on tick* (like poison dealing damage).

## The `ActiveEffect` Interface

```ts
export interface ActiveEffect {
  id: string;                    // unique effect ID e.g. 'strength_effect'
  name: string;                  // display name e.g. 'Strength'
  remainingHands: number;        // counts down each hand
  modifier: Modifier;            // the actual hooks that run
}
```

## Test Patterns

File: `tests/consumables.test.ts`

### Test helpers

```ts
function makePlayerState(overrides?: Partial<PlayerState>): PlayerState {
  return {
    hp: 40, maxHp: 50, gold: 100,
    equipment: new Map(),
    consumables: [], wishes: [], activeEffects: [],
    ...overrides,
  };
}

function makeEnemyState(): EnemyState {
  return {
    data: { name: 'TestEnemy', maxHp: 20, isBoss: false, equipment: [], description: '' },
    hp: 20,
  };
}

function makeContext(ps: PlayerState, es: EnemyState): ModifierContext {
  return {
    playerHand: { cards: [] }, dealerHand: { cards: [] },
    playerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 0, soft: false, busted: false, isBlackjack: false },
    playerState: ps, enemyState: es,
    rules: getDefaultRules(), rng: new SeededRNG('consumable-test'),
    stage: 1, battle: 1, handNumber: 1,
  };
}
```

### Testing instant heal

```ts
it('heals 5 HP', () => {
  const ps = makePlayerState({ hp: 40 });
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('health_potion'), ps, es);
  expect(ps.hp).toBe(45);
});

it('does not exceed maxHp', () => {
  const ps = makePlayerState({ hp: 48, maxHp: 50 });
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('health_potion'), ps, es);
  expect(ps.hp).toBe(50);
});
```

### Testing instant damage

```ts
it('deals 5 damage to enemy', () => {
  const ps = makePlayerState();
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('damage_potion'), ps, es);
  expect(es.hp).toBe(15);
});

it('does not reduce enemy below 0', () => {
  const ps = makePlayerState();
  const es = makeEnemyState();
  es.hp = 3;
  applyConsumable(getConsumableByType('damage_potion'), ps, es);
  expect(es.hp).toBe(0);
});
```

### Testing duration effect creation

```ts
it('creates active effect lasting 1 hand', () => {
  const ps = makePlayerState();
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('strength_potion'), ps, es);
  expect(ps.activeEffects).toHaveLength(1);
  expect(ps.activeEffects[0].remainingHands).toBe(1);
});
```

### Testing duration effect modifier

```ts
it('modifier increases damage by 30%', () => {
  const ps = makePlayerState();
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('strength_potion'), ps, es);
  const mod = ps.activeEffects[0].modifier;
  expect(mod.modifyDamageDealt!(10, makeContext(ps, es))).toBe(13);
});
```

### Testing effect expiry

```ts
it('effect expires after 1 hand tick', () => {
  const ps = makePlayerState();
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('strength_potion'), ps, es);
  tickActiveEffects(ps, es, makeContext(ps, es));
  expect(ps.activeEffects).toHaveLength(0);
});
```

### Testing multi-tick duration effect

```ts
it('expires after 3 ticks', () => {
  const ps = makePlayerState();
  const es = makeEnemyState();
  applyConsumable(getConsumableByType('poison_potion'), ps, es);
  for (let i = 0; i < 3; i++) {
    tickActiveEffects(ps, es, makeContext(ps, es));
  }
  expect(ps.activeEffects).toHaveLength(0);
  expect(es.hp).toBe(11); // 20 - 3*3 = 11
});
```

### Testing item count (update this when adding items!)

```ts
it('getAllConsumables returns 4 items', () => {
  expect(getAllConsumables()).toHaveLength(4);
});
```

**Important**: Update the `4` when you add new consumables.

## Checklist

1. Add the new type to `ConsumableType` union in `src/engine/types.ts`
2. Add the definition to `CONSUMABLE_DEFS` in `src/engine/consumables.ts`
3. Add the `case` to `applyConsumable` switch
4. If duration-based: add tick handling in `tickActiveEffects` (only if it does something on tick beyond modifier hooks)
5. Write tests: basic effect, edge cases, and if duration-based: effect creation, modifier behavior, expiry
6. **Update the `getAllConsumables` length assertion** in `tests/consumables.test.ts`
7. Run verification commands

## Verification

```bash
npx vitest run tests/consumables.test.ts
npx vitest run
```

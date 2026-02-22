# Writing Tests

Test framework: Vitest
Config: `vitest.config.ts`

## Quick Reference

- Tests live in `tests/` directory, named `*.test.ts`
- Import `{ describe, it, expect }` from `vitest`
- Each test file has its own `makeContext` helper
- Test modifiers in isolation — call hooks directly, don't go through the game engine
- Use `SeededRNG` for deterministic randomness
- Use the `autoPlay` helper for full game simulations

## The `makeContext` Helper

Every test file that tests modifiers needs a `makeContext` function. This is the canonical version:

```ts
import { describe, it, expect } from 'vitest';
import { getDefaultRules } from '../src/engine/modifiers.js';
import { SeededRNG } from '../src/engine/rng.js';
import type { ModifierContext } from '../src/engine/types.js';

function makeContext(overrides?: Partial<ModifierContext>): ModifierContext {
  return {
    playerHand: { cards: [] },
    dealerHand: { cards: [] },
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    playerState: {
      hp: 50, maxHp: 50, gold: 0,
      equipment: new Map(),
      consumables: [], wishes: [], activeEffects: [],
    },
    enemyState: {
      data: { name: 'Test', maxHp: 50, isBoss: false, equipment: [], description: '' },
      hp: 50,
    },
    rules: getDefaultRules(),
    rng: new SeededRNG('test-seed'),
    stage: 1, battle: 1, handNumber: 1,
    ...overrides,
  };
}
```

Override any field by passing an object: `makeContext({ dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true } })`.

The consumables test file uses a variant with separate `makePlayerState`, `makeEnemyState`, and `makeContext(ps, es)`:

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

## Testing Modifiers in Isolation

The key principle: call modifier hooks directly on the modifier object. Do NOT run them through the game engine.

```ts
// Get the modifier
const mod = enemy.equipment[0].modifier;

// Call the hook directly with a context
const result = mod.modifyDamageDealt!(10, makeContext());
expect(result).toBe(15);
```

The `!` non-null assertion is needed because all modifier hooks are optional in the `Modifier` interface.

## Testing `modifyDamageDealt`

### Flat damage bonus

```ts
it('+5 flat damage', () => {
  const mod = enemy.equipment[0].modifier;
  expect(mod.modifyDamageDealt!(10, makeContext())).toBe(15);
});
```

### Conditional damage bonus (blackjack)

```ts
it('+10 damage on blackjack', () => {
  const mod = boss.equipment[0].modifier;
  const ctx = makeContext({
    dealerScore: { value: 21, soft: false, busted: false, isBlackjack: true },
  });
  expect(mod.modifyDamageDealt!(10, ctx)).toBe(20);
});
```

### Suit-counting damage bonus

```ts
it('+3 per red card in dealer hand', () => {
  const mod = enemy.equipment[0].modifier;
  const ctx = makeContext({
    dealerHand: {
      cards: [
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: '5' },
        { suit: 'spades', rank: '3' },
      ],
    },
  });
  expect(mod.modifyDamageDealt!(10, ctx)).toBe(16); // 10 + 2*3
});
```

## Testing `modifyDamageReceived`

### Flat percent reduction

```ts
it('25% damage reduction', () => {
  expect(mod.modifyDamageReceived!(20, makeContext())).toBe(15);
});
```

### Conditional reduction (bust only)

```ts
it('reduces bust damage by 30%', () => {
  const ctx = makeContext({
    playerScore: { value: 25, soft: false, busted: true, isBlackjack: false },
  });
  expect(mod.modifyDamageReceived!(10, ctx)).toBe(7);
});

it('does NOT reduce non-bust damage', () => {
  const ctx = makeContext({
    playerScore: { value: 18, soft: false, busted: false, isBlackjack: false },
  });
  expect(mod.modifyDamageReceived!(10, ctx)).toBe(10);
});
```

### Suit-based conditional

Test both matching and non-matching cases:

```ts
it('50% less damage from spade hands', () => {
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

### Suit-counting (player hand)

```ts
it('+2 per red card in player hand', () => {
  const ctx = makeContext({
    playerHand: {
      cards: [
        { suit: 'hearts', rank: 'K' },
        { suit: 'diamonds', rank: '5' },
        { suit: 'spades', rank: '3' },
      ],
    },
  });
  expect(mod.modifyDamageReceived!(10, ctx)).toBe(14); // 10 + 2*2
});
```

## Testing `dodgeCheck` (Probability Loop)

Dodge is probabilistic, so test with 1000 iterations using different seeds:

```ts
it('15% dodge', () => {
  const mod = enemy.equipment[0].modifier;
  let dodges = 0;
  for (let i = 0; i < 1000; i++) {
    if (mod.dodgeCheck!(makeContext({ rng: new SeededRNG(`dodge-${i}`) }))) dodges++;
  }
  // 15% of 1000 = 150, allow wide margin
  expect(dodges).toBeGreaterThan(100);
  expect(dodges).toBeLessThan(200);
});
```

For X% dodge chance, use range: `((X - 5) / 100) * 1000` to `((X + 5) / 100) * 1000`.

Key: each iteration uses a **unique seed** (`new SeededRNG(\`prefix-${i}\`)`) to ensure different RNG values.

## Testing `onHandEnd` (State Mutation)

Create a mutable state object, pass it in context, call the hook, assert the mutation:

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

```ts
it('5 damage on push', () => {
  const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
  const ctx = makeContext({
    playerState: ps as any,
    playerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
    dealerScore: { value: 20, soft: false, busted: false, isBlackjack: false },
  });
  boss.equipment[2].modifier.onHandEnd!(ctx);
  expect(ps.hp).toBe(45);
});
```

## Testing `onHandStart` (State Mutation)

```ts
it('curse: 3 damage per hand to player', () => {
  const curse = boss.curse!;
  const ps = { hp: 50, maxHp: 50, gold: 0, equipment: new Map(), consumables: [], wishes: [], activeEffects: [] };
  const ctx = makeContext({ playerState: ps as any });
  curse.onHandStart!(ctx);
  expect(ps.hp).toBe(47);
});
```

## Testing `modifyRules`

```ts
it('curse: ties favor dealer', () => {
  const curse = boss.curse!;
  const rules = getDefaultRules();
  const modified = curse.modifyRules!(rules);
  expect(modified.winConditions.tieResolution).toBe('dealer');
});
```

Always pass fresh `getDefaultRules()` and assert on the specific field changed.

## Testing `modifyBust`

```ts
it('converts bust to score of 10', () => {
  const result = mod.modifyBust!(
    { cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'hearts', rank: '5' }, { suit: 'hearts', rank: '9' }] },
    24,
    makeContext()
  );
  expect(result).toEqual({ busted: false, effectiveScore: 10 });
});
```

## Testing `modifyGoldEarned`

```ts
it('adds 10 gold', () => {
  expect(mod.modifyGoldEarned!(10, makeContext())).toBe(20);
});
```

## Testing ActiveEffect Lifecycle

### Effect creation

```ts
it('creates active effect lasting N hands', () => {
  applyConsumable(getConsumableByType('strength_potion'), ps, es);
  expect(ps.activeEffects).toHaveLength(1);
  expect(ps.activeEffects[0].remainingHands).toBe(1);
});
```

### Effect modifier behavior

```ts
it('modifier increases damage by 30%', () => {
  applyConsumable(getConsumableByType('strength_potion'), ps, es);
  const mod = ps.activeEffects[0].modifier;
  expect(mod.modifyDamageDealt!(10, makeContext(ps, es))).toBe(13);
});
```

### Effect expiry (single tick)

```ts
it('effect expires after 1 hand tick', () => {
  applyConsumable(getConsumableByType('strength_potion'), ps, es);
  tickActiveEffects(ps, es, makeContext(ps, es));
  expect(ps.activeEffects).toHaveLength(0);
});
```

### Effect expiry (multi-tick)

```ts
it('expires after 3 ticks', () => {
  applyConsumable(getConsumableByType('poison_potion'), ps, es);
  for (let i = 0; i < 3; i++) {
    tickActiveEffects(ps, es, makeContext(ps, es));
  }
  expect(ps.activeEffects).toHaveLength(0);
  expect(es.hp).toBe(11); // 20 - 3*3
});
```

## Full Game Simulation with `autoPlay`

For integration-level tests, use the `autoPlay` helper from `tests/full-game.test.ts`:

```ts
import { GameEngine } from '../src/engine/game.js';
import type { PlayerAction, GamePhase } from '../src/engine/types.js';

function autoPlay(seed: string, maxActions = 1000): ReturnType<GameEngine['getView']> {
  const game = new GameEngine(seed);
  let count = 0;
  while (count++ < maxActions) {
    const view = game.getView();
    if (view.phase === 'game_over' || view.phase === 'victory') return view;

    let action: PlayerAction;
    switch (view.phase) {
      case 'pre_hand': action = { type: 'continue' }; break;
      case 'player_turn':
        if (view.player.handScore && view.player.handScore.value >= 17) {
          action = { type: 'stand' };
        } else {
          action = { type: 'hit' };
        }
        break;
      case 'hand_result': action = { type: 'continue' }; break;
      case 'battle_result': action = { type: 'continue' }; break;
      case 'shop': action = { type: 'skip_shop' }; break;
      case 'genie': action = { type: 'enter_wish', text: 'I wish for strength' }; break;
      default: return view;
    }
    game.performAction(action);
  }
  return game.getView();
}
```

Usage:

```ts
it('game terminates with seed 42', () => {
  const view = autoPlay('42');
  expect(['game_over', 'victory'].includes(view.phase)).toBe(true);
});
```

## Determinism Testing

Same seed + same actions = same outcome. Test by running twice:

```ts
it('deterministic with same seed', () => {
  const view1 = autoPlay('determinism-test');
  const view2 = autoPlay('determinism-test');
  expect(view1.phase).toBe(view2.phase);
  expect(view1.player.hp).toBe(view2.player.hp);
});
```

## Run Commands

```bash
# Run all tests
npx vitest run

# Run specific test file
npx vitest run tests/combatants.test.ts
npx vitest run tests/equipment.test.ts
npx vitest run tests/consumables.test.ts
npx vitest run tests/full-game.test.ts

# Run tests in watch mode
npx vitest

# Run tests matching a name pattern
npx vitest run -t "Vampire Bat"
```

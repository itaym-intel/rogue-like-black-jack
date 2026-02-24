# Using the Seed Finder

CLI: `npm run seed-find -- [options]`
Source: `src/sim/seed-finder.ts`, `src/sim/seed-finder-cli.ts`
Tests: `tests/sim/seed-finder.test.ts`
Types: `src/sim/types.ts` (bottom section: `HandTrace`, `ShopTrace`, `BattleTrace`, `GameTrace`, etc.)

## What It Does

The seed finder searches game seeds, simulates each with a strategy, captures a rich `GameTrace`, then filters and ranks results. Use it to find seeds with specific RNG outcomes (blackjacks, shop items, enemy matchups, etc.) for testing, debugging, or content verification.

## Quick Reference — CLI

```bash
# Find victory seeds, ranked by blackjack count
npm run seed-find -- --count=5000 --filter=victory --sort=blackjacks

# Find seeds that reach stage 2 with high HP
npm run seed-find -- --count=10000 --filter=min_stage:2 --sort=final_hp

# Find seeds with a specific item in the shop
npm run seed-find -- --count=5000 --filter=shop_has:leather_helm

# Find seeds where player gets an Ace of hearts first
npm run seed-find -- --count=5000 --filter=first_card:A:hearts

# Find seeds with no player busts, sorted by fewest hands
npm run seed-find -- --filter=no_busts --filter=victory --sort=fewest_hands

# Verbose output — shows battles, shops, and blackjack details
npm run seed-find -- --count=1000 --filter=victory --sort=blackjacks --verbose
```

## CLI Options

| Option | Default | Description |
|---|---|---|
| `--count=N` | 10000 | Number of seeds to search |
| `--seed-prefix=STR` | `find` | Seeds generated as `{prefix}-{0..N}` |
| `--strategy=NAME` | `basicStrategy` | Strategy to use (see `ALL_STRATEGIES`) |
| `--top=N` | 10 | Number of top results to show |
| `--filter=EXPR` | none | Repeatable, AND-composed |
| `--sort=EXPR` | `constant` | Scorer for ranking |
| `--verbose` | off | Show detailed traces per match |

## Filter Expressions

Format: `--filter=name:arg1:arg2`

| Expression | Description |
|---|---|
| `victory` | Game ended in victory |
| `game_over` | Game ended in game over |
| `min_stage:N` | Reached at least stage N |
| `min_blackjacks:N` | Player got at least N blackjacks |
| `max_dealer_blackjacks:N` | Dealer got at most N blackjacks |
| `no_busts` | Player never busted |
| `all_blackjacks` | Every hand was a player blackjack |
| `blackjack_on:stage:battle:hand` | Blackjack on specific hand |
| `card_dealt:rank[:suit][:stage:battle:hand]` | Specific card dealt to player |
| `first_card:rank[:suit]` | First card of first hand |
| `shop_has:itemId[:stage:battle]` | Shop inventory contains item |
| `shop_has_slot:slot[:tier:stage:battle]` | Shop has item in slot |
| `enemy_at:Enemy_Name[:stage:battle]` | Enemy at specific battle (underscores for spaces) |
| `death_to:Enemy_Name` | Died to specific enemy |
| `min_hp:N` | Final HP at least N |
| `no_dodges` | No dodges occurred |
| `min_dodges:N` | At least N dodges |
| `hand_winner:player\|dealer\|push:stage:battle:hand` | Specific hand winner |

## Sort Expressions

| Expression | Description |
|---|---|
| `blackjacks` | Most player blackjacks |
| `blackjack_rate` | Highest blackjack percentage |
| `final_hp` | Highest final HP |
| `fewest_hands` | Fewest hands played |
| `total_damage` | Most damage dealt to enemies |
| `least_damage` | Least damage received |
| `gold` | Most gold at end |
| `constant` | No ranking (all equal) |

## When the CLI Is Not Enough — Programmatic Use

The CLI's scorers only work on final game state. For intermediate queries (e.g., "best HP after stage 1 boss" or "most damage on hand 3"), write a custom script using `traceGame()` directly.

### Example: Find seed that beats stage 1 boss most easily

```ts
import { traceGame } from './seed-finder.js';
import { basicStrategy } from './strategies.js';

const results: { seed: string; bossHpAfter: number; bossHands: number }[] = [];

for (let i = 0; i < 2000; i++) {
  const seed = `find-${i}`;
  const trace = traceGame(seed, basicStrategy);

  // Find the boss battle (battle 4 in stage 1)
  const bossBattle = trace.battles.find(b => b.isBoss && b.stage === 1);
  if (!bossBattle) continue;

  results.push({
    seed,
    bossHpAfter: bossBattle.playerHpAfter,
    bossHands: bossBattle.handsPlayed,
  });
}

results.sort((a, b) => b.bossHpAfter - a.bossHpAfter || a.bossHands - b.bossHands);
console.log(results.slice(0, 10));
```

### Why programmatic > CLI for this case

The CLI's `--sort=final_hp` sorts by HP at game end. If the player died in stage 2, finalHp is 0 — useless for comparing stage 1 performance. The `GameTrace` has all the data; you just need a custom scorer.

### Key programmatic APIs

```ts
import { traceGame, findSeeds, filters, scorers } from './seed-finder.js';

// Trace a single seed
const trace = traceGame('my-seed', basicStrategy);

// Search with custom filter/scorer
const result = findSeeds({
  count: 5000,
  seedPrefix: 'custom',
  strategy: basicStrategy,
  filters: [
    filters.victory(),
    filters.custom(t => t.battles.some(b => b.isBoss && b.playerHpAfter > 40)),
  ],
  scorer: scorers.custom(t => {
    const bossBattle = t.battles.find(b => b.isBoss && b.stage === 1);
    return bossBattle ? bossBattle.playerHpAfter : -1;
  }),
  topN: 5,
});
```

## Understanding the GameTrace

The `GameTrace` captures three data streams:

### `trace.hands[]` — every hand played
- `playerCards`, `dealerCards` — actual cards dealt
- `playerScore`, `dealerScore` — final scores
- `playerBlackjack`, `dealerBlackjack`, `playerBusted`, `dealerBusted`
- `winner` — `'player'` | `'dealer'` | `'push'`
- `damageDealt`, `damageTarget`, `dodged`
- `playerHp`, `enemyHp` — HP after this hand
- `stage`, `battle`, `handNumber` — position in the run

### `trace.shops[]` — every shop visited
- `inventory[]` — full item list (`id`, `name`, `type`, `slot`, `tier`, `cost`)
- `purchased[]` — item IDs the strategy bought

### `trace.battles[]` — every battle completed
- `enemyName`, `enemyMaxHp`, `isBoss`
- `handsPlayed` — hands in this battle
- `playerHpAfter` — HP after battle ends

### Top-level fields
- `outcome` — `'victory'` | `'game_over'`
- `finalStage`, `finalBattle`, `finalHp`, `finalGold`
- `totalHandsPlayed`
- `deathEnemy` — enemy name if died, null if victory

## Known Limitations

1. **Killing-blow hands are invisible**: The engine's `endBattle()` clears `lastHandResult` before the tracer can capture it. The hand that kills an enemy won't appear in `trace.hands`. The `trace.battles` entry still records the battle as won, but the final hand's cards/score are lost. This affects both `traceGame` and the older `runGame`.

2. **CLI scorers are final-state only**: `--sort=final_hp` uses HP at game end, not at any intermediate point. For intermediate queries, use the programmatic API.

3. **Seed format**: The CLI generates seeds as `{prefix}-{index}` (e.g., `find-0`, `find-1`). You can't search a specific seed by name via CLI — use `traceGame()` directly for that.

## Strategies

Available strategies (pass to `--strategy=`):
- `basicStrategy` — hits below 17, stands at 17+
- `standOn17` — always stands at 17+
- `standOn15` — stands at 15+
- `standOn13` — stands at 13+
- `alwaysHit` — hits until bust
- `alwaysStand` — stands on anything

All strategies auto-handle non-blackjack phases (continue through battles, skip shops, etc.).

## Checklist — Adding New Filters or Scorers

1. Add the factory function to `filters` or `scorers` in `src/sim/seed-finder.ts`
2. Add CLI expression parsing in `parseFilter()` or `parseScorer()` in `src/sim/seed-finder-cli.ts`
3. Add the expression to `printHelp()` documentation
4. Add a test in `tests/sim/seed-finder.test.ts`
5. Run `npx vitest run tests/sim/seed-finder.test.ts`

## Verification

```bash
# Run seed finder tests
npx vitest run tests/sim/seed-finder.test.ts

# Quick CLI smoke test
npm run seed-find -- --count=100 --filter=victory --sort=blackjacks --verbose

# Full test suite
npx vitest run
```

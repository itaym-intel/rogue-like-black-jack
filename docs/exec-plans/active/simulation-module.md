# Simulation Module and Analytics Dashboard

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. This document must be maintained in accordance with `PLANS.md` at the repository root.


## Purpose / Big Picture

After this work is complete, a developer can run `npm run sim` from the repository root and watch as thousands of Geniejack games play themselves out with different strategies and seeds. When the simulation finishes, the results are saved as JSON files in `sim-data/current/`. The developer can then run `npm run sim:dash` to open a separate React website — a minimalist analytics dashboard — that loads these JSON files and renders charts showing win rates by strategy, equipment purchase frequency and impact, enemy difficulty rankings, optimal item purchase orders, stage completion funnels, and more.

The simulation uses the exact same `GameEngine` from `src/engine/game.ts` that both the CLI and GUI use. No game logic is duplicated. Instead, the sim wraps the engine with an instrumented runner that records every meaningful event during a game (hand results, purchases, damage dealt, HP changes) and then aggregates those events across thousands of runs.

During a running simulation, progress is written to `sim-data/progress.json` so both the CLI and the dashboard can show live completion percentage, estimated time remaining, and partial results.


## Progress

- [x] Milestone 1: Core sim module — types, strategies, instrumented runner, aggregator, CLI entry point.
- [x] Milestone 2: Verification — sim tests that prove correctness and determinism.
- [x] Milestone 3: Data persistence — sim-data directory structure, JSON output, archival.
- [x] Milestone 4: Analytics dashboard — separate React app with charts, progress monitoring.
- [x] Milestone 5: Integration polish — npm scripts, progress monitoring, final validation.


## Surprises & Discoveries

- The game is extremely hard. In testing with 2000 games (1000 seeds x 2 strategies), no strategy achieved any wins. All games end in stage 1-2. This means the dashboard charts for win rate show 0% across all strategies, but other metrics (stage progression, enemy deaths, damage distribution, equipment purchases) still provide meaningful comparison data.
- The pre-existing test "Djinn curse: onHandStart fires through engine and reduces player HP" fails because the seed 'djinn-curse-test' never reaches the genie encounter. This is a pre-existing issue on main, not introduced by this work.


## Decision Log

- Decision: Use recharts for the dashboard charting library.
  Rationale: recharts is the most popular React charting library, lightweight, composable, and works well with Vite. It renders SVG charts that look clean with minimal styling. It avoids the weight of chart.js while providing bar charts, line charts, pie charts, and area charts out of the box.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Store sim results as plain JSON files in `sim-data/` rather than a database.
  Rationale: The game is a local development project. JSON files are human-readable, versionable, and trivially loadable by a React app via fetch or import. No server process is needed. The dashboard reads them directly. This matches the project's zero-infrastructure philosophy.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Use a separate Vite config (`vite.sim.config.ts`) for the dashboard rather than sharing the game GUI's Vite config.
  Rationale: The game GUI runs on port 3000 via `npm run dev:gui`. The sim dashboard is an entirely separate React application with its own entry point, dependencies (recharts), and purpose. Sharing a Vite config would create coupling. A separate config keeps both apps independently startable on different ports (dashboard on port 3001).
  Date/Author: 2026-02-21 / Plan Author

- Decision: Progress monitoring uses a `sim-data/progress.json` file that the runner updates after each completed game, rather than WebSockets.
  Rationale: File-based progress is the simplest approach that works for both CLI (read the file) and dashboard (poll with fetch). No WebSocket server, no additional dependencies. The dashboard polls every 2 seconds during an active sim. The CLI prints progress to stdout directly but also writes the file for the dashboard.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Run simulations synchronously in a single thread using `tsx`.
  Rationale: The game engine is pure synchronous TypeScript. Each game takes ~1-5ms. Running 10,000 games takes ~10-50 seconds, which is fast enough for a dev tool. Worker threads would add complexity for marginal gain. If performance becomes an issue, the runner's architecture (process seeds in batches, aggregate at the end) makes it straightforward to parallelize later.
  Date/Author: 2026-02-21 / Plan Author

- Decision: Define four play strategies (stand threshold variations) and three shop strategies (skip, buy-cheapest, priority-weapon) as the initial strategy set.
  Rationale: This covers the most important axes of player behavior. The stand threshold (when the player stops hitting) is the most impactful decision in blackjack. The shop strategy determines equipment progression. More strategies can be added later by implementing the `Strategy` interface. Starting with a focused set produces meaningful data without an overwhelming matrix.
  Date/Author: 2026-02-21 / Plan Author


## Outcomes & Retrospective

All 5 milestones completed. The simulation module runs correctly with `npm run sim` and the dashboard starts with `npm run sim:dash`. 35 new tests were added and all pass. All pre-existing tests continue to pass (1 pre-existing failure unrelated to this work). The game's difficulty means 0% win rates across all strategies, which is a valid finding — the game balance may need adjustment in a future iteration.


## Context and Orientation

This section describes the current state of the repository and the modules you will interact with. Read it carefully — it contains everything you need to navigate the codebase.

The repository root is `/mnt/d/rogue-like-black-jack/`. The project uses TypeScript with `tsx` for running TS files directly and Vite for the React frontends. Tests use Vitest. The package type is ESM (`"type": "module"` in `package.json`).

The game engine lives in `src/engine/`. It is a deterministic state machine. The core class is `GameEngine` in `src/engine/game.ts`. You create a game with `new GameEngine(seed)`, read state with `engine.getView()`, and advance the game with `engine.performAction(action)`. The engine accepts a string seed; two games with the same seed and same sequence of actions produce identical outcomes. All randomness flows through `SeededRNG` in `src/engine/rng.ts` (Mulberry32 algorithm).

A complete game consists of 3 stages. Each stage has 3 regular battles followed by 1 boss battle (4 battles per stage, 12 total). After each regular battle, the player visits a shop. After each boss, the player meets a genie who applies a curse. If the player survives all 3 bosses, they win. If their HP reaches 0, they lose. The game phases are: `pre_hand`, `player_turn`, `dealer_turn`, `hand_result`, `battle_result`, `shop`, `genie`, `game_over`, `victory`.

During `player_turn`, the player can `hit` (draw a card), `stand` (stop drawing), or `double_down` (double damage, draw one card, auto-stand). The dealer then plays automatically (hits until reaching the "stands on" threshold, default 17). Hand resolution compares scores, applies damage modifiers from equipment and curses, checks dodge rolls, and applies the result.

The player actions are defined as a union type `PlayerAction` in `src/engine/types.ts`:
- `{ type: 'hit' }` — draw a card
- `{ type: 'stand' }` — stop drawing
- `{ type: 'double_down' }` — double down
- `{ type: 'use_consumable', itemIndex: number }` — use a consumable (pre_hand only)
- `{ type: 'buy_item', itemIndex: number }` — buy from shop
- `{ type: 'skip_shop' }` — leave shop
- `{ type: 'enter_wish', text: string }` — enter blessing text at genie
- `{ type: 'continue' }` — advance through pre_hand, hand_result, battle_result

Equipment has 5 slots (weapon, helm, armor, boots, trinket), 3 tiers (cloth, bronze, iron). There are 15 total equipment items defined in `src/engine/equipment.ts`. Consumables include health potion (heal 5 HP), damage potion (5 damage to enemy), strength potion (+30% damage for 1 hand), and poison potion (3 damage/hand for 3 hands), defined in `src/engine/consumables.ts`.

The `GameView` interface (in `src/engine/types.ts`) is what the engine exposes to any consumer. It contains all visible state: phase, player HP/gold/equipment/consumables/wishes, enemy info, shop items, hand scores, available actions, and a message log.

The test file `tests/full-game.test.ts` contains an `autoPlay` function that demonstrates how to play a game automatically. The sim module will use a similar approach but with configurable strategies and detailed data collection.

The game GUI lives in `src/gui/` and uses Vite with `vite.config.ts` (port 3000). The sim dashboard will be a separate React app under `src/sim-dash/` with its own Vite config.

Current npm scripts in `package.json`:
- `dev` — run CLI via tsx
- `dev:gui` — run game GUI via Vite
- `test` — run all tests via Vitest
- `test:watch` — watch mode tests


## Plan of Work

The work proceeds in five milestones. Each milestone produces independently verifiable results.


### Milestone 1: Core Simulation Module

This milestone creates the `src/sim/` directory with all the code needed to run a batch of simulated games and produce aggregate statistics. At the end, running `npx tsx src/sim/cli.ts --count=100 --seed-prefix=test` from the repository root will simulate 100 games and print a summary table to the terminal showing win rates per strategy.

The sim module has these files:

**`src/sim/types.ts`** — All type definitions for the simulation. This includes:

`Strategy` — An object that defines how the simulated player behaves. It has a `name` (human-readable label like "Stand on 17 / Buy Cheapest"), a `decideAction` function that receives a `GameView` and returns a `PlayerAction`, and a `description` string. The `decideAction` function is called at every game phase where the engine expects player input. It must handle every phase: `pre_hand`, `player_turn`, `hand_result`, `battle_result`, `shop`, and `genie`.

`RunEvent` — A discriminated union representing a single noteworthy event during a game. Event types include:
- `hand_result` — records the hand's winner, player score, dealer score, damage dealt, damage target, dodged boolean, player HP after, enemy HP after, hand number, battle number, stage, player busted, dealer busted, player blackjack, dealer blackjack
- `battle_end` — records the defeated enemy name, stage, battle number, hands played in this battle, player HP remaining, gold earned
- `shop_purchase` — records the item purchased (id, name, type, slot if equipment, tier if equipment, cost), gold remaining after purchase, stage, battle number
- `consumable_use` — records the consumable type, stage, battle number, hand number
- `player_death` — records the killing enemy name, stage, battle number, player HP (0), hands played total
- `victory` — records final HP, gold, total hands played, equipment worn at end, curses accumulated

`RunResult` — The complete record of a single game. Contains: seed, strategy name, outcome ('victory' or 'game_over'), final stage reached, final battle reached, total hands played, total gold earned, total gold spent, total damage dealt, total damage received, total dodges by player, total dodges by enemy, events (array of RunEvent), equipment purchased in order (array of item ids), consumables used count by type, final equipment loadout (map of slot to item id or null), death enemy (string or null), duration in milliseconds.

`SimConfig` — Configuration for a simulation batch. Contains: count (number of games to simulate), seedPrefix (string prepended to numeric seed for each game, e.g., "sim" produces seeds "sim-0", "sim-1", ...), strategies (array of Strategy objects to test — each strategy runs against all seeds).

`SimProgress` — Written to `sim-data/progress.json` during a running sim. Contains: totalGames (total games across all strategies × seeds), completedGames, currentStrategy (name of strategy being simulated), currentSeed, startTime (ISO timestamp), estimatedEndTime (ISO timestamp or null), partialResults (array of per-strategy { name, completed, winCount, lossCount }).

`AggregateStats` — The final output of a simulation batch. Contains:
- `meta` — { timestamp, totalGames, seedPrefix, seedCount, strategies (list of names), durationMs }
- `byStrategy` — array of objects, one per strategy: { name, winRate, avgStageReached, avgBattleReached, avgHandsPlayed, avgGoldEarned, avgGoldSpent, avgDamageDealt, avgDamageReceived, avgPlayerDodges, avgEnemyDodges, medianHp at various checkpoints }
- `equipmentStats` — array of objects, one per equipment item: { id, name, slot, tier, purchaseCount, purchaseRate (fraction of runs that bought it), winRateWhenPurchased, winRateWhenNotPurchased, avgPurchaseBattle (average battle number when purchased), avgPurchaseStage }
- `consumableStats` — array of objects, one per consumable type: { type, name, totalUsed, avgPerRun, usedInWinningRuns, usedInLosingRuns }
- `enemyStats` — array of objects, one per enemy/boss: { name, isBoss, stage, deathsTo (number of runs that ended at this enemy), avgHandsToDefeat, avgDamageDealtTo, avgDamageReceivedFrom }
- `stageCompletionFunnel` — { reachedStage1, reachedStage2, reachedStage3, completed (won the game) } with both counts and percentages
- `purchaseOrderStats` — For each equipment slot, the distribution of which tier was purchased first, second, third. For example: "Of runs that bought any weapon, 80% bought cloth first, 15% bought bronze first, 5% bought iron first."
- `handOutcomeDistribution` — { playerWins, dealerWins, pushes } as counts and percentages across all hands in all runs
- `damageDistribution` — histogram of damage dealt per hand (buckets: 0, 1-5, 6-10, 11-15, 16-20, 21+) for both player-dealt and dealer-dealt damage
- `hpOverTime` — average player HP at the start of each battle (indexed as battle 1-12 across all 3 stages), per strategy

**`src/sim/strategies.ts`** — Defines the built-in strategies. Each strategy is an object implementing the `Strategy` type. The module exports an array `ALL_STRATEGIES` and also exports each strategy individually for testing.

Play strategies (hit/stand logic):
1. `standOn17` — Stand when hand score >= 17, otherwise hit. This mirrors basic blackjack strategy. At the shop, buy the cheapest affordable equipment item, then skip. Use health potions when HP < 20 in pre_hand. Use damage/poison/strength potions at start of boss battles.
2. `standOn15` — Stand when hand score >= 15. More conservative, avoids busting. Same shop/consumable logic as standOn17.
3. `standOn19` — Stand when hand score >= 19. Aggressive, draws more cards. Same shop/consumable logic as standOn17.
4. `basicStrategy` — Uses a simplified version of real blackjack basic strategy: considers the dealer's visible card value. If dealer shows 2-6 (weak), stand on 12+. If dealer shows 7-A (strong), stand on 17+. This models a smarter player. Same shop/consumable logic as standOn17.

Shop strategy variations (applied as wrappers around the base play strategies):
5. `standOn17_skipShop` — Same as standOn17 but always skips the shop. Tests whether equipment matters.
6. `standOn17_priorityWeapon` — Same as standOn17 but prioritizes buying weapons over other slots (buys the highest-tier affordable weapon first, then other equipment).
7. `standOn17_priorityArmor` — Same as standOn17 but prioritizes armor purchases.
8. `standOn17_priorityBoots` — Same as standOn17 but prioritizes boots (dodge) purchases.

Each strategy's `decideAction` function handles all phases:
- `pre_hand`: Use health potion if HP < 20 and player has one; use damage/poison/strength potions at start of boss fights (battle 4, hand 1); otherwise continue.
- `player_turn`: Apply the hit/stand logic described above.
- `hand_result`, `battle_result`: Continue.
- `shop`: Apply the shop logic described above. After buying desired items, skip.
- `genie`: Enter wish text "I wish for victory" (the text is flavor only; the curse is applied regardless).
- `game_over`, `victory`: No action needed (game is terminal).

**`src/sim/runner.ts`** — The instrumented game runner. Exports a function `runGame(seed: string, strategy: Strategy): RunResult`. This function:
1. Creates a `new GameEngine(seed)`.
2. Records `Date.now()` as start time.
3. Enters a loop: calls `engine.getView()`, checks for terminal phase, calls `strategy.decideAction(view)` to get the next action, calls `engine.performAction(action)`.
4. Between each action, inspects the view for events to record. Specifically:
   - After any `hand_result` phase: record a `hand_result` event from `view.lastHandResult` plus current HP/enemy HP.
   - After `battle_result` phase: record a `battle_end` event.
   - After a successful `buy_item` action: record a `shop_purchase` event (compare gold before and after).
   - After a successful `use_consumable` action: record a `consumable_use` event.
   - When `game_over` phase reached: record a `player_death` event.
   - When `victory` phase reached: record a `victory` event.
5. Tracks running totals: total hands, total gold earned, total gold spent, total damage dealt/received, dodge counts.
6. Caps at 5000 actions to prevent infinite loops (a game should never exceed ~500 actions; 5000 is a safety margin).
7. Returns the `RunResult`.

The runner does not modify the engine or use any private APIs. It only calls `getView()` and `performAction()` — the same public interface the CLI and GUI use.

**`src/sim/aggregator.ts`** — Takes an array of `RunResult` objects and produces `AggregateStats`. Exports `aggregateResults(results: RunResult[], config: SimConfig): AggregateStats`. This function:
1. Groups results by strategy name.
2. For each strategy group, computes averages and percentages for all the fields described in the `AggregateStats` type.
3. Computes cross-strategy stats (equipment purchase rates, enemy death counts, stage funnel, etc.) from all results combined but also broken down by strategy where relevant.
4. Returns the `AggregateStats` object.

**`src/sim/cli.ts`** — The CLI entry point. When run, it:
1. Parses command-line arguments: `--count=N` (default 1000), `--seed-prefix=S` (default "sim"), `--strategies=name1,name2` (default: all), `--output-dir=path` (default "sim-data").
2. Builds a `SimConfig`.
3. For each strategy, for each seed index (0 to count-1), calls `runGame(seedPrefix + "-" + i, strategy)`.
4. After each game, updates progress: prints a progress line to stdout (e.g., `[standOn17] 42/1000 (4.2%) — 38% win rate so far`) and writes `sim-data/progress.json`.
5. After all games complete, calls `aggregateResults` and writes the output.
6. Prints a summary table showing win rate, avg stage, avg HP for each strategy.

Running:
    npx tsx src/sim/cli.ts --count=100

Expected output (approximate):

    Geniejack Simulator v1.0
    Running 800 games (100 seeds × 8 strategies)...

    [standOn17]              100/100  ██████████████████████████████ 100%  Win: 23%
    [standOn15]              100/100  ██████████████████████████████ 100%  Win: 18%
    [standOn19]              100/100  ██████████████████████████████ 100%  Win: 15%
    [basicStrategy]          100/100  ██████████████████████████████ 100%  Win: 26%
    [standOn17_skipShop]     100/100  ██████████████████████████████ 100%  Win: 8%
    [standOn17_priorityWpn]  100/100  ██████████████████████████████ 100%  Win: 25%
    [standOn17_priorityArmr] 100/100  ██████████████████████████████ 100%  Win: 22%
    [standOn17_priorityBts]  100/100  ██████████████████████████████ 100%  Win: 21%

    Done in 12.4s. Results saved to sim-data/current/

    ╔═══════════════════════════╦══════════╦═══════════╦══════════╗
    ║ Strategy                  ║ Win Rate ║ Avg Stage ║ Avg HP   ║
    ╠═══════════════════════════╬══════════╬═══════════╬══════════╣
    ║ basicStrategy             ║ 26.0%    ║ 2.4       ║ 18.2     ║
    ║ standOn17_priorityWpn     ║ 25.0%    ║ 2.3       ║ 16.8     ║
    ║ standOn17                 ║ 23.0%    ║ 2.2       ║ 15.5     ║
    ║ standOn17_priorityArmr    ║ 22.0%    ║ 2.2       ║ 19.1     ║
    ║ standOn17_priorityBts     ║ 21.0%    ║ 2.1       ║ 17.3     ║
    ║ standOn15                 ║ 18.0%    ║ 1.9       ║ 14.2     ║
    ║ standOn19                 ║ 15.0%    ║ 1.8       ║ 12.1     ║
    ║ standOn17_skipShop        ║ 8.0%     ║ 1.5       ║ 8.3      ║
    ╚═══════════════════════════╩══════════╩═══════════╩══════════╝

(The actual numbers will differ; this is an illustration of the output format.)


### Milestone 2: Verification

This milestone adds tests that prove the simulation module works correctly. At the end, running `npx vitest run tests/sim/` from the repository root will execute all sim tests and they will pass.

Create `tests/sim/` directory with these test files:

**`tests/sim/strategies.test.ts`** — Tests that each strategy produces valid actions for every game phase. For each strategy:
- Create a GameEngine, get the view at each phase, call `strategy.decideAction(view)`, and verify the returned action is in `view.availableActions`.
- Test the stand-on-N strategies: mock a view with `player.handScore.value` at various values and verify hit vs stand decisions.
- Test shop strategies: mock a view with shop items and verify the correct purchase priority.

**`tests/sim/runner.test.ts`** — Tests the instrumented runner:
- Run a game with a known seed and verify the `RunResult` has the expected structure.
- Verify determinism: running the same seed + strategy twice produces identical results (same outcome, same events, same final HP).
- Verify events are recorded: a completed game should have at least 1 `battle_end` event and either a `player_death` or `victory` event.
- Verify the action cap: a runner should never exceed 5000 actions (test with a normal seed, verify actionCount < 5000).

**`tests/sim/aggregator.test.ts`** — Tests the aggregator:
- Create a small set of known RunResults and verify the aggregated stats are correct (win rates, averages, etc.).
- Test edge cases: all wins, all losses, zero games.

**`tests/sim/determinism.test.ts`** — Critical test: runs the same 10 seeds with the same strategy twice and verifies every `RunResult` field matches. This proves the sim is deterministic.

Running:
    npx vitest run tests/sim/

Expected output: All tests pass, 0 failures.


### Milestone 3: Data Persistence

This milestone adds file I/O to the simulation. At the end, running `npx tsx src/sim/cli.ts --count=10` will produce JSON files in `sim-data/current/`.

**`src/sim/persistence.ts`** — Handles reading and writing sim data. Exports:
- `writeSimResults(stats: AggregateStats, rawResults: RunResult[], outputDir: string): void` — Writes two files to `outputDir/current/`: `aggregate.json` (the AggregateStats object) and `runs.json` (the array of RunResult objects, but with the `events` array stripped to reduce file size — only the summary fields are kept). Creates the directory if it does not exist.
- `archiveCurrentResults(outputDir: string): void` — Moves files from `outputDir/current/` to `outputDir/archive/YYYY-MM-DD_HH-MM-SS/`. This preserves historical sim data.
- `writeProgress(progress: SimProgress, outputDir: string): void` — Writes `outputDir/progress.json`.
- `clearProgress(outputDir: string): void` — Deletes `outputDir/progress.json`.
- `readAggregateStats(dir: string): AggregateStats | null` — Reads and parses `aggregate.json` from the given directory. Returns null if file does not exist.

The `cli.ts` module is updated to:
1. Call `archiveCurrentResults` at the start (move any existing `current/` to `archive/`).
2. Call `writeProgress` after each completed game.
3. Call `writeSimResults` after all games complete.
4. Call `clearProgress` after writing results.

Directory structure after a sim run:

    sim-data/
    ├── current/
    │   ├── aggregate.json      (AggregateStats)
    │   └── runs.json           (RunResult[] without events)
    ├── archive/
    │   └── 2026-02-21_14-30-00/
    │       ├── aggregate.json
    │       └── runs.json
    └── progress.json           (only exists during a running sim)

Running:
    npx tsx src/sim/cli.ts --count=10

Verify:
    ls sim-data/current/
    # Should show aggregate.json and runs.json

    cat sim-data/current/aggregate.json | head -5
    # Should show valid JSON with meta, byStrategy, etc.


### Milestone 4: Analytics Dashboard

This milestone creates a separate React application that visualizes sim results. At the end, running `npm run sim:dash` opens a browser showing charts and tables from the latest sim data.

**Dashboard file structure:**

    src/sim-dash/
    ├── index.html          (HTML entry point)
    ├── main.tsx            (React entry point)
    ├── App.tsx             (Main app component)
    ├── components/
    │   ├── WinRateChart.tsx       (Bar chart: win rate per strategy)
    │   ├── StageFunnel.tsx        (Funnel/bar chart: stage completion rates)
    │   ├── EquipmentTable.tsx     (Table: equipment purchase rates and impact)
    │   ├── EnemyDifficulty.tsx    (Bar chart: deaths per enemy)
    │   ├── HpTimeline.tsx         (Line chart: avg HP over battles by strategy)
    │   ├── DamageHistogram.tsx    (Bar chart: damage distribution)
    │   ├── ConsumableUsage.tsx    (Bar chart: consumable usage stats)
    │   ├── PurchaseOrder.tsx      (Stacked bar: equipment tier purchase order)
    │   ├── SimProgress.tsx        (Progress indicator during running sim)
    │   └── MetaSummary.tsx        (Text summary: total games, duration, best strategy)
    ├── hooks/
    │   └── useSimData.ts          (Hook to load and poll sim data)
    └── styles/
        ├── theme.css              (CSS variables for dashboard theme)
        └── global.css             (Base styles)

**`vite.sim.config.ts`** at the repository root — Vite config for the dashboard. Points to `src/sim-dash/index.html` as the entry point. Runs on port 3001. Uses the same React plugin as the game GUI.

**`src/sim-dash/index.html`** — Standard HTML shell that loads `main.tsx`.

**`src/sim-dash/main.tsx`** — Renders `<App />` into the root div.

**`src/sim-dash/App.tsx`** — The main dashboard layout. Uses a single-page design with a grid of chart panels. At the top: a `MetaSummary` showing when the sim was run, how many games, and the best-performing strategy. Below that: a responsive grid of chart panels. At the bottom: the `SimProgress` component which shows progress when a sim is running (polls `sim-data/progress.json` every 2 seconds; if the file 404s, it shows "No sim running").

**`src/sim-dash/hooks/useSimData.ts`** — Custom hook that:
1. On mount, fetches `/sim-data/current/aggregate.json` and parses it.
2. Returns `{ data: AggregateStats | null, loading: boolean, error: string | null }`.
3. Also fetches `/sim-data/progress.json` every 2 seconds and exposes `progress: SimProgress | null`.
4. When progress changes from non-null to null (sim finished), re-fetches aggregate data.

The dashboard must serve `sim-data/` as a static directory. The Vite config uses `server.proxy` or `publicDir` configuration to make `sim-data/` accessible at `/sim-data/` in the dev server. Alternatively, a Vite plugin can serve the directory. The simplest approach: in `vite.sim.config.ts`, configure a custom middleware or set the `server.fs.allow` to include the project root so fetches to `/sim-data/aggregate.json` resolve correctly. The recommended approach is to add a simple Vite plugin that serves `sim-data/` as a static directory:

    // In vite.sim.config.ts
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';
    import path from 'path';
    import fs from 'fs';

    function serveSimData() {
      return {
        name: 'serve-sim-data',
        configureServer(server) {
          server.middlewares.use('/sim-data', (req, res, next) => {
            const filePath = path.join(process.cwd(), 'sim-data', req.url);
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'application/json');
              fs.createReadStream(filePath).pipe(res);
            } else {
              res.statusCode = 404;
              res.end('Not found');
            }
          });
        },
      };
    }

    export default defineConfig({
      plugins: [react(), serveSimData()],
      root: 'src/sim-dash',
      build: { outDir: '../../dist-sim-dash' },
      server: { port: 3001 },
    });

**Visual Design:** The dashboard is visually minimalistic. Dark background (#1a1a2e), white text, accent colors from a muted palette (teal #16a085, coral #e74c3c, gold #f39c12, blue #3498db). No borders or shadows. Charts use the recharts default styling with custom colors. Font: system monospace. Each chart panel is a simple div with a title and the chart below it. No animations except the progress bar.

**Chart Components:**

`WinRateChart` — Horizontal bar chart. X axis: win rate percentage (0-100%). Y axis: strategy names. Bars colored by win rate (gradient from red at 0% to green at 50%+). Shows exact percentage as a label on each bar.

`StageFunnel` — Vertical bar chart showing how many runs reached each stage. Four bars: "Stage 1" (100%), "Stage 2" (X%), "Stage 3" (Y%), "Victory" (Z%). Each bar shows the count and percentage.

`EquipmentTable` — An HTML table (not a chart) with columns: Item Name, Slot, Tier, Purchase Rate, Win Rate (w/ item), Win Rate (w/o item), Avg Purchase Battle. Sorted by purchase rate descending. Rows highlighted in green if the item improves win rate, red if it hurts.

`EnemyDifficulty` — Horizontal bar chart. Y axis: enemy names (sorted by death count). X axis: number of runs that died to this enemy. Bosses are colored differently from regular enemies.

`HpTimeline` — Line chart. X axis: battle number (1-12). Y axis: average player HP. One line per strategy, each a different color. Shows how HP degrades across the run.

`DamageHistogram` — Grouped bar chart. X axis: damage buckets (0, 1-5, 6-10, 11-15, 16-20, 21+). Y axis: frequency. Two groups: player-dealt (blue) and enemy-dealt (red).

`ConsumableUsage` — Bar chart showing total uses of each consumable type across all runs. Stacked by "used in winning runs" vs "used in losing runs".

`PurchaseOrder` — For each equipment slot, a stacked bar showing what percentage of first purchases were cloth/bronze/iron tier.

`SimProgress` — When a sim is running: shows a progress bar, current strategy being simulated, games completed / total, and estimated time remaining. When no sim is running: shows "No simulation in progress" with last sim timestamp.

`MetaSummary` — Text panel: "Last sim: 2026-02-21 14:30 | 8,000 games (1,000 seeds × 8 strategies) | Duration: 42s | Best: basicStrategy (26% win rate)"


### Milestone 5: Integration Polish

This milestone ties everything together with npm scripts, documentation in the plan, and a final validation.

Add to `package.json` scripts:
- `"sim"`: `"tsx src/sim/cli.ts"` — Run the simulator with default settings.
- `"sim:dash"`: `"vite --config vite.sim.config.ts"` — Start the analytics dashboard.

Install `recharts` as a dependency:
    npm install recharts

Verify the complete workflow:
1. `npm run sim -- --count=100` — Runs 800 games (100 per strategy), takes ~10-30 seconds, prints progress and summary table, writes `sim-data/current/`.
2. `npm run sim:dash` — Opens browser at localhost:3001, shows all charts populated with data from step 1.
3. Run sim again: `npm run sim -- --count=50` — Previous results archived to `sim-data/archive/`, new results in `sim-data/current/`.
4. Refresh dashboard — shows new data.
5. Open dashboard, then start a new sim in another terminal — dashboard shows live progress.

Final test run:
    npm test

All existing tests (engine, GUI) still pass. All new sim tests pass.


## Concrete Steps

All commands should be run from the repository root: `/mnt/d/rogue-like-black-jack/`.

Step 1 — Create `src/sim/types.ts` with all type definitions described in Milestone 1.

Step 2 — Create `src/sim/strategies.ts` with the 8 strategies described in Milestone 1.

Step 3 — Create `src/sim/runner.ts` with the instrumented `runGame` function.

Step 4 — Create `src/sim/aggregator.ts` with the `aggregateResults` function.

Step 5 — Create `src/sim/cli.ts` with the CLI entry point.

Step 6 — Test manually:
    npx tsx src/sim/cli.ts --count=10 --seed-prefix=test
This should print progress and a summary table. If it crashes, fix the issue before proceeding.

Step 7 — Create test files in `tests/sim/`:
    tests/sim/strategies.test.ts
    tests/sim/runner.test.ts
    tests/sim/aggregator.test.ts
    tests/sim/determinism.test.ts

Step 8 — Run tests:
    npx vitest run tests/sim/
Fix any failures.

Step 9 — Create `src/sim/persistence.ts` with file I/O functions.

Step 10 — Update `src/sim/cli.ts` to use persistence (archive, write results, write progress, clear progress).

Step 11 — Test persistence:
    npx tsx src/sim/cli.ts --count=10
    ls sim-data/current/
    # Verify aggregate.json and runs.json exist

Step 12 — Install recharts:
    npm install recharts

Step 13 — Create `vite.sim.config.ts` at the repository root.

Step 14 — Create `src/sim-dash/index.html`.

Step 15 — Create `src/sim-dash/main.tsx` and `src/sim-dash/App.tsx`.

Step 16 — Create `src/sim-dash/styles/theme.css` and `src/sim-dash/styles/global.css`.

Step 17 — Create `src/sim-dash/hooks/useSimData.ts`.

Step 18 — Create all chart components in `src/sim-dash/components/`.

Step 19 — Add npm scripts to `package.json`:
    "sim": "tsx src/sim/cli.ts",
    "sim:dash": "vite --config vite.sim.config.ts"

Step 20 — Test the dashboard:
    npm run sim -- --count=50
    npm run sim:dash
Open browser at localhost:3001 and verify charts display correctly.

Step 21 — Run all tests to verify nothing is broken:
    npm test
All tests should pass.


## Validation and Acceptance

**CLI verification (Milestone 1-3):**
Run `npm run sim -- --count=100`. Expected behavior:
- Progress bars appear for each strategy.
- After completion, a summary table prints showing win rates.
- Files exist at `sim-data/current/aggregate.json` and `sim-data/current/runs.json`.
- Running `npm run sim -- --count=10` again moves previous results to `sim-data/archive/` and creates new files in `sim-data/current/`.

**Determinism verification (Milestone 2):**
Run `npx vitest run tests/sim/determinism.test.ts`. This test runs the same seeds twice and asserts identical results. It must pass.

**Dashboard verification (Milestone 4):**
1. Run `npm run sim -- --count=200` to generate sufficient data.
2. Run `npm run sim:dash` and open localhost:3001.
3. Verify the following are visible:
   - Meta summary at top showing game count and best strategy.
   - Win rate bar chart with all 8 strategies.
   - Stage funnel showing dropoff across stages.
   - Equipment table with purchase rates and win rate impact.
   - Enemy difficulty chart showing which enemies kill the most players.
   - HP timeline showing HP degradation per strategy.
   - Damage histogram showing damage distribution.
4. Open the dashboard, then in another terminal run `npm run sim -- --count=50`. The dashboard should show a progress indicator within 2-4 seconds.

**Test verification:**
Run `npm test`. All tests pass, including the new sim tests and all existing engine/GUI tests.


## Idempotence and Recovery

All steps can be repeated safely. The sim writes to `sim-data/` which is outside `src/`. Running the sim multiple times archives previous results automatically. The CLI overwrites `sim-data/progress.json` each time. If a sim crashes mid-run, `progress.json` may be stale; the next sim run will overwrite it. The `sim-data/current/` directory is replaced on each run, so partial results from a crashed run are cleaned up.

Add `sim-data/` to `.gitignore` so simulation output is not committed to the repository. The sim module source code (`src/sim/` and `src/sim-dash/`) is committed; the data it produces is not.

If the dashboard fails to load data (e.g., no sim has been run yet), it should show a friendly message: "No simulation data found. Run `npm run sim` to generate data."


## Artifacts and Notes

Example `aggregate.json` structure (abbreviated):

    {
      "meta": {
        "timestamp": "2026-02-21T14:30:00.000Z",
        "totalGames": 8000,
        "seedPrefix": "sim",
        "seedCount": 1000,
        "strategies": ["standOn17", "standOn15", ...],
        "durationMs": 42000
      },
      "byStrategy": [
        {
          "name": "standOn17",
          "winRate": 0.23,
          "avgStageReached": 2.2,
          ...
        }
      ],
      "equipmentStats": [...],
      "enemyStats": [...],
      "stageCompletionFunnel": { ... },
      ...
    }

Example `progress.json` during a running sim:

    {
      "totalGames": 8000,
      "completedGames": 342,
      "currentStrategy": "standOn17",
      "currentSeed": "sim-342",
      "startTime": "2026-02-21T14:30:00.000Z",
      "estimatedEndTime": "2026-02-21T14:30:42.000Z",
      "partialResults": [
        { "name": "standOn17", "completed": 342, "winCount": 79, "lossCount": 263 }
      ]
    }


## Interfaces and Dependencies

**New dependency:**
- `recharts` (npm package) — React charting library, used by the dashboard.

**No new engine dependencies.** The sim module imports only from `src/engine/` (which has zero external dependencies).

**Key interfaces that must exist after all milestones:**

In `src/sim/types.ts`:

    export interface Strategy {
      name: string;
      description: string;
      decideAction(view: GameView): PlayerAction;
    }

    export interface RunResult {
      seed: string;
      strategyName: string;
      outcome: 'victory' | 'game_over';
      finalStage: number;
      finalBattle: number;
      totalHandsPlayed: number;
      totalGoldEarned: number;
      totalGoldSpent: number;
      totalDamageDealt: number;
      totalDamageReceived: number;
      totalPlayerDodges: number;
      totalEnemyDodges: number;
      events: RunEvent[];
      equipmentPurchaseOrder: string[];
      consumablesUsedByType: Record<string, number>;
      finalEquipment: Record<string, string | null>;
      deathEnemy: string | null;
      durationMs: number;
    }

    export interface SimConfig {
      count: number;
      seedPrefix: string;
      strategies: Strategy[];
    }

    export interface SimProgress {
      totalGames: number;
      completedGames: number;
      currentStrategy: string;
      currentSeed: string;
      startTime: string;
      estimatedEndTime: string | null;
      partialResults: Array<{
        name: string;
        completed: number;
        winCount: number;
        lossCount: number;
      }>;
    }

    export interface AggregateStats {
      meta: { timestamp: string; totalGames: number; seedPrefix: string; seedCount: number; strategies: string[]; durationMs: number };
      byStrategy: StrategyStats[];
      equipmentStats: EquipmentStat[];
      consumableStats: ConsumableStat[];
      enemyStats: EnemyStat[];
      stageCompletionFunnel: { reachedStage1: number; reachedStage2: number; reachedStage3: number; completed: number; total: number };
      purchaseOrderStats: Record<string, Record<string, number>>;
      handOutcomeDistribution: { playerWins: number; dealerWins: number; pushes: number; total: number };
      damageDistribution: { playerDealt: Record<string, number>; enemyDealt: Record<string, number> };
      hpOverTime: Record<string, number[]>;
    }

In `src/sim/strategies.ts`:

    export const standOn17: Strategy;
    export const standOn15: Strategy;
    export const standOn19: Strategy;
    export const basicStrategy: Strategy;
    export const standOn17_skipShop: Strategy;
    export const standOn17_priorityWeapon: Strategy;
    export const standOn17_priorityArmor: Strategy;
    export const standOn17_priorityBoots: Strategy;
    export const ALL_STRATEGIES: Strategy[];

In `src/sim/runner.ts`:

    export function runGame(seed: string, strategy: Strategy): RunResult;

In `src/sim/aggregator.ts`:

    export function aggregateResults(results: RunResult[], config: SimConfig): AggregateStats;

In `src/sim/persistence.ts`:

    export function writeSimResults(stats: AggregateStats, rawResults: RunResult[], outputDir: string): void;
    export function archiveCurrentResults(outputDir: string): void;
    export function writeProgress(progress: SimProgress, outputDir: string): void;
    export function clearProgress(outputDir: string): void;
    export function readAggregateStats(dir: string): AggregateStats | null;

In `src/sim-dash/hooks/useSimData.ts`:

    export function useSimData(): {
      data: AggregateStats | null;
      progress: SimProgress | null;
      loading: boolean;
      error: string | null;
    };

In `vite.sim.config.ts`:

    // Vite config for sim dashboard
    // Port: 3001
    // Root: src/sim-dash
    // Serves sim-data/ directory via custom plugin

In `package.json` (new scripts):

    "sim": "tsx src/sim/cli.ts",
    "sim:dash": "vite --config vite.sim.config.ts"

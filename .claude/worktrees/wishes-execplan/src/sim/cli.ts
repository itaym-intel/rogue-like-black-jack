import { ALL_STRATEGIES } from './strategies.js';
import { runGame } from './runner.js';
import { aggregateResults } from './aggregator.js';
import type { RunResult, SimConfig, SimProgress, Strategy } from './types.js';

// ── Argument parsing ──

function parseArgs(): { count: number; seedPrefix: string; strategies: Strategy[]; outputDir: string } {
  const args = process.argv.slice(2);
  let count = 1000;
  let seedPrefix = 'sim';
  let strategyNames: string[] | null = null;
  let outputDir = 'sim-data';

  for (const arg of args) {
    if (arg.startsWith('--count=')) count = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--seed-prefix=')) seedPrefix = arg.split('=')[1];
    else if (arg.startsWith('--strategies=')) strategyNames = arg.split('=')[1].split(',');
    else if (arg.startsWith('--output-dir=')) outputDir = arg.split('=')[1];
  }

  let strategies = ALL_STRATEGIES;
  if (strategyNames) {
    strategies = ALL_STRATEGIES.filter(s => strategyNames!.includes(s.name));
    if (strategies.length === 0) {
      console.error(`No matching strategies found. Available: ${ALL_STRATEGIES.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
  }

  return { count, seedPrefix, strategies, outputDir };
}

// ── Progress bar ──

function progressBar(completed: number, total: number, width = 30): string {
  const pct = total > 0 ? completed / total : 0;
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── Main ──

async function main() {
  const { count, seedPrefix, strategies, outputDir } = parseArgs();
  const totalGames = count * strategies.length;

  console.log(`\nGeniejack Simulator v1.0`);
  console.log(`Running ${totalGames} games (${count} seeds × ${strategies.length} strategies)...\n`);

  // Try to load persistence module (optional — works without it)
  let persistence: {
    archiveCurrentResults: (dir: string) => void;
    writeSimResults: (stats: any, results: RunResult[], dir: string) => void;
    writeProgress: (progress: SimProgress, dir: string) => void;
    clearProgress: (dir: string) => void;
  } | null = null;

  try {
    persistence = await import('./persistence.js');
    persistence.archiveCurrentResults(outputDir);
  } catch {
    // persistence module not yet created — that's fine for milestone 1
  }

  const allResults: RunResult[] = [];
  const partialResults: SimProgress['partialResults'] = strategies.map(s => ({
    name: s.name,
    completed: 0,
    winCount: 0,
    lossCount: 0,
  }));

  const simStartTime = Date.now();
  let completedGames = 0;

  for (let si = 0; si < strategies.length; si++) {
    const strategy = strategies[si];
    const partial = partialResults[si];

    for (let i = 0; i < count; i++) {
      const seed = `${seedPrefix}-${i}`;
      const result = runGame(seed, strategy);
      allResults.push(result);

      partial.completed++;
      if (result.outcome === 'victory') partial.winCount++;
      else partial.lossCount++;
      completedGames++;

      // Write progress
      if (persistence) {
        const elapsed = Date.now() - simStartTime;
        const rate = completedGames / elapsed;
        const remaining = totalGames - completedGames;
        const estimatedEnd = new Date(Date.now() + remaining / rate).toISOString();

        const progress: SimProgress = {
          totalGames,
          completedGames,
          currentStrategy: strategy.name,
          currentSeed: seed,
          startTime: new Date(simStartTime).toISOString(),
          estimatedEndTime: estimatedEnd,
          partialResults: [...partialResults],
        };
        try {
          persistence.writeProgress(progress, outputDir);
        } catch {
          // ignore write errors
        }
      }
    }

    const winRate = partial.completed > 0 ? ((partial.winCount / partial.completed) * 100).toFixed(0) : '0';
    const nameStr = `[${strategy.name}]`.padEnd(28);
    const countStr = `${partial.completed}/${count}`;
    const bar = progressBar(partial.completed, count);
    process.stdout.write(`  ${nameStr} ${countStr.padStart(10)}  ${bar} 100%  Win: ${winRate}%\n`);
  }

  const elapsed = Date.now() - simStartTime;

  // Aggregate
  const config: SimConfig = { count, seedPrefix, strategies };
  const stats = aggregateResults(allResults, config);
  stats.meta.durationMs = elapsed;

  // Write results
  if (persistence) {
    try {
      persistence.writeSimResults(stats, allResults, outputDir);
      persistence.clearProgress(outputDir);
    } catch {
      // ignore
    }
  }

  console.log(`\nDone in ${(elapsed / 1000).toFixed(1)}s.${persistence ? ` Results saved to ${outputDir}/current/` : ''}\n`);

  // Summary table
  const sorted = [...stats.byStrategy].sort((a, b) => b.winRate - a.winRate);
  const divider = '═'.repeat(27) + '╦' + '═'.repeat(10) + '╦' + '═'.repeat(11) + '╦' + '═'.repeat(10);
  console.log(`╔${divider}╗`);
  console.log(`║ ${'Strategy'.padEnd(25)} ║ ${'Win Rate'.padEnd(8)} ║ ${'Avg Stage'.padEnd(9)} ║ ${'Avg HP'.padEnd(8)} ║`);
  console.log(`╠${'═'.repeat(27)}╬${'═'.repeat(10)}╬${'═'.repeat(11)}╬${'═'.repeat(10)}╣`);

  for (const s of sorted) {
    const winPct = `${(s.winRate * 100).toFixed(1)}%`.padEnd(8);
    const avgStage = s.avgStageReached.toFixed(1).padEnd(9);
    // HP: we don't have avg final HP in StrategyStats, so use avgDamageReceived as proxy
    // Actually let's compute it from results
    const stratResults = allResults.filter(r => r.strategyName === s.name);
    const avgHp = stratResults.length > 0
      ? (stratResults.reduce((sum, r) => {
          const view = r.events.find(e => e.type === 'victory' || e.type === 'player_death');
          if (view?.type === 'victory') return sum + view.finalHp;
          return sum;
        }, 0) / stratResults.filter(r => r.outcome === 'victory').length || 0).toFixed(1)
      : '0.0';
    console.log(`║ ${s.name.padEnd(25)} ║ ${winPct} ║ ${avgStage} ║ ${avgHp.toString().padEnd(8)} ║`);
  }

  console.log(`╚${'═'.repeat(27)}╩${'═'.repeat(10)}╩${'═'.repeat(11)}╩${'═'.repeat(10)}╝`);
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});

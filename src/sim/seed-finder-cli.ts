import { ALL_STRATEGIES } from './strategies.js';
import { findSeeds, filters, scorers } from './seed-finder.js';
import type { Strategy, SeedFilter, SeedScorer, SeedFinderConfig } from './types.js';
import type { Rank, Suit } from '../engine/types.js';

// ── Argument parsing ──

const VALID_RANKS = new Set(['2','3','4','5','6','7','8','9','10','J','Q','K','A']);
const VALID_SUITS = new Set(['hearts','diamonds','clubs','spades']);

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 10000;
  let seedPrefix = 'find';
  let strategyName = 'basicStrategy';
  let topN = 10;
  let verbose = false;
  const filterExprs: string[] = [];
  let sortExpr = 'constant';

  for (const arg of args) {
    if (arg.startsWith('--count=')) count = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--seed-prefix=')) seedPrefix = arg.split('=')[1];
    else if (arg.startsWith('--strategy=')) strategyName = arg.split('=')[1];
    else if (arg.startsWith('--top=')) topN = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--filter=')) filterExprs.push(arg.split('=').slice(1).join('='));
    else if (arg.startsWith('--sort=')) sortExpr = arg.split('=')[1];
    else if (arg === '--verbose') verbose = true;
    else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
  }

  const strategy = ALL_STRATEGIES.find(s => s.name === strategyName);
  if (!strategy) {
    console.error(`Unknown strategy '${strategyName}'. Available: ${ALL_STRATEGIES.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  return { count, seedPrefix, strategy: strategy!, topN, filterExprs, sortExpr, verbose };
}

// ── Filter expression parser ──

function parseFilter(expr: string): SeedFilter {
  const parts = expr.split(':');
  const name = parts[0];

  switch (name) {
    case 'victory':
      return filters.victory();
    case 'game_over':
      return filters.gameOver();
    case 'min_stage':
      return filters.minStage(parseInt(parts[1], 10));
    case 'min_blackjacks':
      return filters.minBlackjacks(parseInt(parts[1], 10));
    case 'max_dealer_blackjacks':
      return filters.maxDealerBlackjacks(parseInt(parts[1], 10));
    case 'no_busts':
      return filters.noBusts();
    case 'all_blackjacks':
      return filters.allBlackjacks();
    case 'blackjack_on':
      return filters.blackjackOnHand(
        parseInt(parts[1], 10),
        parseInt(parts[2], 10),
        parseInt(parts[3], 10),
      );
    case 'card_dealt': {
      const rank = parts[1] as Rank;
      if (!VALID_RANKS.has(rank)) { console.error(`Invalid rank: ${rank}`); process.exit(1); }
      const suit = parts[2] && VALID_SUITS.has(parts[2]) ? parts[2] as Suit : undefined;
      const offset = suit ? 3 : 2;
      const stage = parts[offset] ? parseInt(parts[offset], 10) : undefined;
      const battle = parts[offset + 1] ? parseInt(parts[offset + 1], 10) : undefined;
      const hand = parts[offset + 2] ? parseInt(parts[offset + 2], 10) : undefined;
      return filters.cardDealtToPlayer(rank, suit, stage, battle, hand);
    }
    case 'first_card': {
      const rank = parts[1] as Rank;
      if (!VALID_RANKS.has(rank)) { console.error(`Invalid rank: ${rank}`); process.exit(1); }
      const suit = parts[2] && VALID_SUITS.has(parts[2]) ? parts[2] as Suit : undefined;
      return filters.firstPlayerCard(rank, suit);
    }
    case 'shop_has':
      return filters.shopContains(
        parts[1],
        parts[2] ? parseInt(parts[2], 10) : undefined,
        parts[3] ? parseInt(parts[3], 10) : undefined,
      );
    case 'shop_has_slot': {
      const slot = parts[1];
      const tier = parts[2] || undefined;
      const stage = parts[3] ? parseInt(parts[3], 10) : undefined;
      const battle = parts[4] ? parseInt(parts[4], 10) : undefined;
      return filters.shopContainsSlot(slot, tier, stage, battle);
    }
    case 'enemy_at': {
      const enemyName = parts[1].replace(/_/g, ' ');
      const stage = parts[2] ? parseInt(parts[2], 10) : undefined;
      const battle = parts[3] ? parseInt(parts[3], 10) : undefined;
      return filters.enemyAtBattle(enemyName, stage, battle);
    }
    case 'death_to':
      return filters.deathTo(parts[1].replace(/_/g, ' '));
    case 'min_hp':
      return filters.minFinalHp(parseInt(parts[1], 10));
    case 'no_dodges':
      return filters.noDodges();
    case 'min_dodges':
      return filters.minDodges(parseInt(parts[1], 10));
    case 'hand_winner':
      return filters.handWinner(
        parts[1] as 'player' | 'dealer' | 'push',
        parseInt(parts[2], 10),
        parseInt(parts[3], 10),
        parseInt(parts[4], 10),
      );
    default:
      console.error(`Unknown filter: '${name}'`);
      process.exit(1);
  }
}

// ── Scorer expression parser ──

function parseScorer(expr: string): SeedScorer {
  switch (expr) {
    case 'blackjacks': return scorers.blackjackCount();
    case 'blackjack_rate': return scorers.blackjackRate();
    case 'final_hp': return scorers.finalHp();
    case 'fewest_hands': return scorers.fewestHands();
    case 'total_damage': return scorers.totalDamage();
    case 'least_damage': return scorers.leastDamage();
    case 'gold': return scorers.goldEarned();
    case 'constant': return scorers.constant();
    default:
      console.error(`Unknown scorer: '${expr}'`);
      process.exit(1);
  }
}

// ── Help ──

function printHelp() {
  console.log(`
Geniejack Seed Finder v1.0

Usage: npm run seed-find -- [options]

Options:
  --count=N           Seeds to search (default: 10000)
  --seed-prefix=STR   Seed prefix (default: 'find')
  --strategy=NAME     Strategy name (default: 'basicStrategy')
  --top=N             Results to show (default: 10)
  --filter=EXPR       Repeatable, AND logic
  --sort=EXPR         Scorer (default: 'constant')
  --verbose           Show detailed trace per match

Filter expressions (--filter=name:arg1:arg2):
  victory, game_over
  min_stage:N
  min_blackjacks:N, max_dealer_blackjacks:N
  no_busts, all_blackjacks
  blackjack_on:stage:battle:hand
  card_dealt:rank:suit:stage:battle:hand  (suit/stage/battle/hand optional)
  first_card:rank:suit                    (suit optional)
  shop_has:itemId:stage:battle            (stage/battle optional)
  shop_has_slot:slot:tier:stage:battle    (tier/stage/battle optional)
  enemy_at:Enemy_Name:stage:battle        (underscores for spaces)
  death_to:Enemy_Name
  min_hp:N
  no_dodges, min_dodges:N
  hand_winner:player|dealer|push:stage:battle:hand

Sort expressions (--sort=name):
  blackjacks, blackjack_rate, final_hp, fewest_hands
  total_damage, least_damage, gold, constant

Available strategies:
  ${ALL_STRATEGIES.map(s => s.name).join(', ')}
`);
}

// ── Progress bar ──

function progressBar(completed: number, total: number, width = 30): string {
  const pct = total > 0 ? completed / total : 0;
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── Main ──

function main() {
  const { count, seedPrefix, strategy, topN, filterExprs, sortExpr, verbose } = parseArgs();

  const parsedFilters = filterExprs.map(parseFilter);
  const scorer = parseScorer(sortExpr);

  const config: SeedFinderConfig = {
    count,
    seedPrefix,
    strategy,
    filters: parsedFilters,
    scorer,
    topN,
  };

  console.log(`\nGeniejack Seed Finder v1.0`);
  console.log(`Searching ${count} seeds with '${strategy.name}'...`);
  if (filterExprs.length > 0) {
    console.log(`Filters: ${filterExprs.join(', ')}`);
  }
  console.log(`Sort: ${sortExpr}${sortExpr !== 'constant' ? ' (desc)' : ''}`);
  console.log();

  const result = findSeeds(config);
  const pct = count > 0 ? ((result.totalMatched / count) * 100).toFixed(1) : '0.0';

  console.log(`Found ${result.totalMatched} matching seeds (${pct}%) in ${(result.durationMs / 1000).toFixed(1)}s`);
  console.log();

  if (result.matches.length === 0) {
    console.log('No matches found.');
    return;
  }

  // Table header
  const header = ` #  ${'Seed'.padEnd(16)} ${'Score'.padEnd(7)} ${'Outcome'.padEnd(10)} ${'Stage'.padEnd(6)} ${'Hands'.padEnd(7)} ${'HP'.padEnd(5)} BJs`;
  console.log(header);
  console.log('─'.repeat(header.length));

  for (let i = 0; i < result.matches.length; i++) {
    const m = result.matches[i];
    const t = m.trace;
    const bjs = t.hands.filter(h => h.playerBlackjack).length;
    const idx = `${i + 1}`.padStart(2);
    const seedStr = m.seed.padEnd(16);
    const scoreStr = (sortExpr === 'blackjack_rate' ? m.score.toFixed(3) : String(m.score)).padEnd(7);
    const outcomeStr = t.outcome.padEnd(10);
    const stageStr = String(t.finalStage).padEnd(6);
    const handsStr = String(t.totalHandsPlayed).padEnd(7);
    const hpStr = String(t.finalHp).padEnd(5);

    console.log(`${idx}  ${seedStr} ${scoreStr} ${outcomeStr} ${stageStr} ${handsStr} ${hpStr} ${bjs}`);
  }

  if (verbose) {
    console.log('\n── Detailed Traces ──\n');
    for (const m of result.matches) {
      const t = m.trace;
      console.log(`=== ${m.seed} (score: ${m.score}) ===`);
      console.log(`  Outcome: ${t.outcome} | Stage ${t.finalStage}, Battle ${t.finalBattle} | HP: ${t.finalHp} | Gold: ${t.finalGold}`);

      if (t.battles.length > 0) {
        console.log('  Battles:');
        for (const b of t.battles) {
          console.log(`    S${b.stage}B${b.battle}: ${b.enemyName}${b.isBoss ? ' (BOSS)' : ''} — ${b.handsPlayed} hands, HP after: ${b.playerHpAfter}`);
        }
      }

      if (t.shops.length > 0) {
        console.log('  Shops:');
        for (const s of t.shops) {
          const items = s.inventory.map(i => `${i.name}($${i.cost})`).join(', ');
          const bought = s.purchased.length > 0 ? ` | Bought: ${s.purchased.join(', ')}` : '';
          console.log(`    S${s.stage}B${s.battle}: [${items}]${bought}`);
        }
      }

      const bjs = t.hands.filter(h => h.playerBlackjack);
      if (bjs.length > 0) {
        console.log(`  Blackjacks (${bjs.length}):`);
        for (const h of bjs) {
          const cards = h.playerCards.map(c => `${c.rank}${c.suit[0]}`).join(',');
          console.log(`    S${h.stage}B${h.battle}H${h.handNumber}: [${cards}] = ${h.playerScore}`);
        }
      }
      console.log();
    }
  }
}

main();

import { traceGame } from './seed-finder.js';
import { standOn14 } from './strategies.js';

const results: { seed: string; hpAfterBoss: number; bossHands: number; bossName: string }[] = [];

for (let i = 0; i < 5000; i++) {
  const seed = `s14-${i}`;
  const trace = traceGame(seed, standOn14);

  const bossBattle = trace.battles.find(b => b.isBoss && b.stage === 1);
  if (!bossBattle) continue;

  results.push({
    seed,
    hpAfterBoss: bossBattle.playerHpAfter,
    bossHands: bossBattle.handsPlayed,
    bossName: bossBattle.enemyName,
  });
}

results.sort((a, b) => b.hpAfterBoss - a.hpAfterBoss || a.bossHands - b.bossHands);

console.log(`\nTop 10 seeds (standOn14, skip shop):\n`);
console.log('Seed'.padEnd(14), 'HP After Boss'.padEnd(15), 'Boss Hands'.padEnd(12), 'Boss');
console.log('─'.repeat(55));
for (const r of results.slice(0, 10)) {
  console.log(r.seed.padEnd(14), String(r.hpAfterBoss).padEnd(15), String(r.bossHands).padEnd(12), r.bossName);
}

// Show detailed trace for the best seed
const best = results[0];
console.log(`\n── Best seed: ${best.seed} ──\n`);
const trace = traceGame(best.seed, standOn14);

console.log('Battles:');
for (const b of trace.battles) {
  console.log(`  S${b.stage}B${b.battle}: ${b.enemyName}${b.isBoss ? ' (BOSS)' : ''} — ${b.handsPlayed} hands, HP after: ${b.playerHpAfter}`);
}

console.log('\nHands:');
for (const h of trace.hands) {
  const pCards = h.playerCards.map(c => `${c.rank}${c.suit[0]}`).join(',');
  const dCards = h.dealerCards.map(c => `${c.rank}${c.suit[0]}`).join(',');
  const bj = h.playerBlackjack ? ' BJ!' : '';
  const bust = h.playerBusted ? ' BUST' : '';
  const dBust = h.dealerBusted ? ' (dealer bust)' : '';
  console.log(`  S${h.stage}B${h.battle}H${h.handNumber}: [${pCards}]=${h.playerScore}${bj}${bust} vs [${dCards}]=${h.dealerScore}${dBust} → ${h.winner} dmg=${h.damageDealt} to ${h.damageTarget} | HP: p${h.playerHp} e${h.enemyHp}`);
}

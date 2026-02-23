import type { GameView, Card, Equipment, EquipmentSlot, ShopItem } from '../engine/types.js';
import { cardToString } from '../engine/cards.js';

function formatCard(card: Card | null): string {
  return card ? cardToString(card) : '??';
}

function formatEquipSlot(eq: Equipment | null, label: string): string {
  return eq ? eq.name : '-';
}

export function renderView(view: GameView): string {
  const lines: string[] = [];

  // Header
  const bossTag = view.enemy?.isBoss ? ' BOSS' : '';
  lines.push(`=== S${view.stage} B${view.battle} H${view.handNumber}${bossTag} === Seed:${view.seed}`);

  // Enemy info
  if (view.enemy) {
    const mods = view.enemy.modifierDescriptions.length > 0
      ? ` [${view.enemy.modifierDescriptions.join(', ')}]`
      : '';
    lines.push(`ENEMY: ${view.enemy.name} HP:${view.enemy.hp}/${view.enemy.maxHp}${mods}`);
  }

  // Player info
  lines.push(`YOU: HP:${view.player.hp}/${view.player.maxHp} Gold:${view.player.gold}`);

  // Equipment
  const eq = view.player.equipment;
  lines.push(`Eq: Wpn:${formatEquipSlot(eq.weapon, 'Wpn')} | Hlm:${formatEquipSlot(eq.helm, 'Hlm')} | Arm:${formatEquipSlot(eq.armor, 'Arm')} | Bts:${formatEquipSlot(eq.boots, 'Bts')} | Trk:${formatEquipSlot(eq.trinket, 'Trk')}`);

  // Consumables
  if (view.player.consumables.length > 0) {
    const counts = new Map<string, number>();
    for (const c of view.player.consumables) {
      counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
    }
    const bag = Array.from(counts.entries()).map(([n, c]) => `${n} x${c}`).join(', ');
    lines.push(`Bag: ${bag}`);
  }

  // Active effects
  if (view.player.activeEffects.length > 0) {
    const fx = view.player.activeEffects.map(e => `${e.name}(${e.remainingHands}h left)`).join(', ');
    lines.push(`FX: ${fx}`);
  }

  // Wishes
  if (view.player.wishes.length > 0) {
    const blessings = view.player.wishes
      .filter(w => w.blessing)
      .map(w => w.blessing!.name)
      .join(', ');
    if (blessings) lines.push(`Blessings: ${blessings}`);
    const curses = view.player.wishes
      .filter(w => w.curse)
      .map(w => w.curse!.name)
      .join(', ');
    if (curses) lines.push(`Curses: ${curses}`);
  }

  // Combat display
  if (view.phase === 'player_turn' || view.phase === 'hand_result' || view.phase === 'pre_hand') {
    if (view.player.hand && view.enemy) {
      lines.push('\u2500\u2500\u2500');
      const playerCards = view.player.hand.map(c => cardToString(c)).join(' ');
      const playerScore = view.player.handScore ? `=${view.player.handScore.value}${view.player.handScore.soft ? 's' : ''}` : '';
      const dealerCards = view.enemy.visibleCards.map(formatCard).join(' ');
      const dealerScore = view.enemy.allRevealed && view.enemy.visibleScore != null ? `=${view.enemy.visibleScore}` : (view.enemy.visibleScore != null ? `=?` : '');

      lines.push(`You: [${playerCards}]${playerScore}  Dealer: [${dealerCards}]${dealerScore}`);
    }
  }

  // Hand result
  if (view.phase === 'hand_result' && view.lastHandResult) {
    const r = view.lastHandResult;
    if (r.winner === 'player') {
      lines.push(`WIN! Dmg:${r.damageDealt} (${r.damageBreakdown})${r.dodged ? ' DODGED' : ''} \u2192 ${view.enemy?.name} HP:${view.enemy?.hp}/${view.enemy?.maxHp}`);
    } else if (r.winner === 'dealer') {
      lines.push(`LOSS! Dmg:${r.damageDealt} (${r.damageBreakdown})${r.dodged ? ' DODGED' : ''} \u2192 You HP:${view.player.hp}/${view.player.maxHp}`);
    } else {
      lines.push('PUSH! No damage dealt.');
    }
  }

  // Battle result
  if (view.phase === 'battle_result') {
    lines.push(`\u2550\u2550\u2550 VICTORY! ${view.enemy?.name ?? 'Enemy'} defeated! \u2550\u2550\u2550`);
    lines.push(`Gold: ${view.player.gold}`);
  }

  // Shop
  if (view.phase === 'shop' && view.shop) {
    lines.push(`\u2550\u2550\u2550 SHOP \u2550\u2550\u2550 Gold: ${view.player.gold}`);
    for (const item of view.shop.items) {
      const aff = item.affordable ? ' \u2713' : '';
      const eq = item.type === 'equipment' ? (item.item as Equipment) : null;
      const slotLabel = eq ? ` [${eq.slot}]` : '';
      lines.push(`${item.index + 1}) ${item.item.name}${slotLabel} ${item.item.description} ${item.item.cost}g${aff}`);
    }
    lines.push(`\u2713=affordable  > (1-${view.shop.items.length} to buy, s=skip)`);
  }

  // Genie
  if (view.phase === 'genie' && view.genie) {
    lines.push(`\u2550\u2550\u2550 GENIE \u2550\u2550\u2550`);
    lines.push(`You defeated ${view.genie.bossName}!`);
    lines.push(`CURSE: ${view.genie.curseDescription}`);
    if (view.player.wishes.length > 0) {
      const curseNames = view.player.wishes.filter(w => w.curse).map(w => w.curse!.name).join(', ');
      if (curseNames) lines.push(`Your curses: ${curseNames}`);
    }
    lines.push('\u2500\u2500\u2500');
    lines.push('The Genie offers you a Wish. Type your blessing:');
  }

  // Game Over
  if (view.phase === 'game_over') {
    lines.push(`\u2550\u2550\u2550 GAME OVER \u2550\u2550\u2550`);
    lines.push(`Defeated at Stage ${view.stage}, Battle ${view.battle}`);
    lines.push(`Final stats: Gold:${view.player.gold}, Wishes:${view.player.wishes.length}`);
    lines.push(`Seed: ${view.seed}`);
  }

  // Victory
  if (view.phase === 'victory') {
    lines.push(`\u2550\u2550\u2550 VICTORY! \u2550\u2550\u2550`);
    lines.push("You conquered the Sultan's Palace!");
    lines.push(`Wishes earned: ${view.player.wishes.length} | Final gold: ${view.player.gold}`);
    lines.push(`Seed: ${view.seed}`);
  }

  // Action prompt
  if (view.phase === 'player_turn') {
    const parts = ['(h)it', '(s)tand'];
    if (view.availableActions.some(a => a.type === 'double_down')) parts.push('(d)ouble');
    if (view.availableActions.some(a => a.type === 'remove_card')) parts.push('(r)emove');
    if (view.availableActions.some(a => a.type === 'peek')) parts.push('(p)eek');
    if (view.availableActions.some(a => a.type === 'surrender')) parts.push('su(rr)ender');
    lines.push(`> ${parts.join(' ')}`);
  } else if (view.phase === 'pre_hand') {
    const parts: string[] = [];
    if (view.player.consumables.length > 0) parts.push('(u)se-item');
    parts.push('(enter=continue)');
    lines.push(`> ${parts.join(' ')}`);
  } else if (view.phase === 'hand_result' || view.phase === 'battle_result') {
    lines.push('> (enter=continue)');
  }

  // Log
  if (view.log.length > 0) {
    lines.push('');
    for (const entry of view.log) {
      lines.push(`  ${entry}`);
    }
  }

  return lines.join('\n');
}

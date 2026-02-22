import type { Hand, HandScore, GameRules } from './types.js';
import { cardValue } from './cards.js';

export function scoreHand(hand: Hand, rules: GameRules): HandScore {
  const cards = hand.cards;
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const values = cardValue(card);
    if (values.length === 2) {
      // Ace
      total += rules.scoring.aceHighValue;
      aces++;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += rules.scoring.faceCardValue;
    } else {
      total += values[0];
    }
  }

  // Demote aces from high to low if over bust threshold
  while (total > rules.scoring.bustThreshold && aces > 0) {
    total -= (rules.scoring.aceHighValue - rules.scoring.aceLowValue);
    aces--;
  }

  const soft = aces > 0; // at least one ace still counted as high
  let busted = total > rules.scoring.bustThreshold;

  // Bust save threshold
  if (busted && rules.scoring.bustSaveThreshold !== null && total <= rules.scoring.bustSaveThreshold) {
    busted = false;
  }

  const isBlackjack =
    cards.length === 2 &&
    (total === rules.scoring.blackjackTarget ||
      rules.scoring.additionalBlackjackValues.includes(total));

  return { value: total, soft, busted, isBlackjack };
}

export function compareHands(
  playerScore: HandScore,
  dealerScore: HandScore,
  rules: GameRules
): 'player' | 'dealer' | 'push' {
  const playerBusted = playerScore.busted;
  const dealerBusted = dealerScore.busted;

  if (playerBusted && dealerBusted) {
    return rules.winConditions.doubleBustResolution;
  }
  if (playerBusted) return 'dealer';
  if (dealerBusted) return 'player';

  if (playerScore.value > dealerScore.value) return 'player';
  if (dealerScore.value > playerScore.value) return 'dealer';

  // Tie
  return rules.winConditions.tieResolution;
}

export function calculateBaseDamage(
  winnerScore: HandScore,
  loserScore: HandScore,
  rules: GameRules
): number {
  let damage: number;

  if (loserScore.busted) {
    // Winner gets their full score as damage
    damage = winnerScore.value;
  } else {
    // Neither busted — difference
    damage = winnerScore.value - loserScore.value;
  }

  // Base multiplier
  damage = Math.floor(damage * rules.damage.baseMultiplier);

  // Clamp to minimum
  damage = Math.max(damage, rules.damage.minimumDamage);

  // Clamp to maximum
  if (rules.damage.maximumDamage !== null) {
    damage = Math.min(damage, rules.damage.maximumDamage);
  }

  // Flat bonus
  damage += rules.damage.flatBonusDamage;

  // Percent bonus
  damage = Math.floor(damage * (1 + rules.damage.percentBonusDamage));

  // Natural blackjack bonus
  if (winnerScore.isBlackjack) {
    damage += rules.winConditions.naturalBlackjackBonus;
    damage = Math.floor(damage * rules.winConditions.blackjackPayoutMultiplier);
  }

  return Math.max(0, damage);
}

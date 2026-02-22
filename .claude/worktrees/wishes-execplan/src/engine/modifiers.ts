import type {
  GameRules,
  Modifier,
  ModifierContext,
  PlayerState,
  EnemyState,
  Hand,
} from './types.js';

export function getDefaultRules(): GameRules {
  return {
    scoring: {
      bustThreshold: 21,
      blackjackTarget: 21,
      additionalBlackjackValues: [],
      bustSaveThreshold: null,
      aceHighValue: 11,
      aceLowValue: 1,
      faceCardValue: 10,
    },
    turnOrder: {
      playerGoesFirst: true,
      initialPlayerCards: 2,
      initialDealerCards: 2,
    },
    dealer: {
      standsOn: 17,
      standsOnSoft17: true,
      peeksForBlackjack: false,
    },
    winConditions: {
      tieResolution: 'push',
      doubleBustResolution: 'push',
      naturalBlackjackBonus: 0,
      blackjackPayoutMultiplier: 1.5,
    },
    damage: {
      baseMultiplier: 1,
      minimumDamage: 0,
      maximumDamage: null,
      flatBonusDamage: 0,
      percentBonusDamage: 0,
      flatDamageReduction: 0,
      percentDamageReduction: 0,
    },
    actions: {
      canDoubleDown: true,
      canSplit: false,
      canSurrender: false,
      doubleDownMultiplier: 2,
    },
    deck: {
      numberOfDecks: 1,
      reshuffleBetweenHands: true,
    },
    economy: {
      goldPerBattle: 10,
      goldPerBoss: 25,
      shopPriceMultiplier: 1,
    },
    health: {
      playerMaxHp: 50,
      playerStartHp: 50,
      healthRegenPerBattle: 0,
      resetHpAfterBoss: true,
    },
    progression: {
      battlesPerStage: 3,
      totalStages: 3,
    },
  };
}

function deepCloneRules(rules: GameRules): GameRules {
  return {
    scoring: { ...rules.scoring, additionalBlackjackValues: [...rules.scoring.additionalBlackjackValues] },
    turnOrder: { ...rules.turnOrder },
    dealer: { ...rules.dealer },
    winConditions: { ...rules.winConditions },
    damage: { ...rules.damage },
    actions: { ...rules.actions },
    deck: { ...rules.deck },
    economy: { ...rules.economy },
    health: { ...rules.health },
    progression: { ...rules.progression },
  };
}

export function applyModifierPipeline(modifiers: Modifier[], rules: GameRules): GameRules {
  let currentRules = deepCloneRules(rules);
  for (const mod of modifiers) {
    if (mod.modifyRules) {
      currentRules = mod.modifyRules(deepCloneRules(currentRules));
    }
  }
  return currentRules;
}

export function collectModifiers(
  playerState: PlayerState,
  enemyState: EnemyState
): { playerModifiers: Modifier[]; enemyModifiers: Modifier[] } {
  const playerModifiers: Modifier[] = [];
  const enemyModifiers: Modifier[] = [];

  // Player equipment modifiers
  for (const [, equip] of playerState.equipment) {
    if (equip) {
      playerModifiers.push(equip.modifier);
    }
  }

  // Player active effects
  for (const effect of playerState.activeEffects) {
    playerModifiers.push(effect.modifier);
  }

  // Player wish blessings
  for (const wish of playerState.wishes) {
    if (wish.blessing) {
      playerModifiers.push(wish.blessing);
    }
  }

  // Player wish curses (curses affect the player negatively, so they go in enemy modifiers
  // or player modifiers depending on the curse — actually curses are stored as player modifiers
  // because they modify the rules from the player's perspective)
  for (const wish of playerState.wishes) {
    if (wish.curse) {
      playerModifiers.push(wish.curse);
    }
  }

  // Enemy equipment modifiers
  for (const equip of enemyState.data.equipment) {
    enemyModifiers.push(equip.modifier);
  }

  return { playerModifiers, enemyModifiers };
}

export function applyDamageModifiers(
  baseDamage: number,
  attackerModifiers: Modifier[],
  defenderModifiers: Modifier[],
  context: ModifierContext
): { finalDamage: number; dodged: boolean; breakdown: string } {
  let damage = baseDamage;
  const parts: string[] = [`base:${baseDamage}`];

  // Attacker modifyDamageDealt
  for (const mod of attackerModifiers) {
    if (mod.modifyDamageDealt) {
      const before = damage;
      damage = mod.modifyDamageDealt(damage, context);
      if (damage !== before) {
        parts.push(`+${mod.name}:${damage - before}`);
      }
    }
  }

  // Defender modifyDamageReceived
  for (const mod of defenderModifiers) {
    if (mod.modifyDamageReceived) {
      const before = damage;
      damage = mod.modifyDamageReceived(damage, context);
      if (damage !== before) {
        parts.push(`${mod.name}:${damage - before}`);
      }
    }
  }

  // Flat damage reduction from rules
  damage -= context.rules.damage.flatDamageReduction;
  damage = Math.max(0, damage);

  // Percent damage reduction from rules
  if (context.rules.damage.percentDamageReduction > 0) {
    damage = Math.floor(damage * (1 - context.rules.damage.percentDamageReduction));
  }

  damage = Math.max(0, damage);

  // Dodge check
  let dodged = false;
  for (const mod of defenderModifiers) {
    if (mod.dodgeCheck && mod.dodgeCheck(context)) {
      dodged = true;
      break;
    }
  }

  if (dodged) {
    return { finalDamage: 0, dodged: true, breakdown: parts.join(' ') + ' DODGED' };
  }

  return { finalDamage: damage, dodged: false, breakdown: parts.join(' ') };
}

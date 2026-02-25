import type {
  GamePhase, PlayerAction, ActionResult, GameView, GameRules,
  PlayerState, EnemyState, HandResult, ShopItem, Equipment, Consumable,
  EquipmentSlot, Card, ModifierContext, Modifier, SerializedGameState, GameReplay,
  ActiveEffect, HandScore, CombatantData,
} from './types.js';
import { SeededRNG } from './rng.js';
import { getDefaultRules, applyModifierPipeline, collectModifiers, applyDamageModifiers } from './modifiers.js';
import { initCombat, dealInitialCards, playerHit, playerStand, playerDoubleDown, dealerPlay, resolveHand, CombatState } from './combat.js';
import { scoreHand } from './scoring.js';
import { cardToString } from './cards.js';
import { getEnemiesForStage, getBossForStage, sampleEnemiesForStage } from './combatants.js';
import { generateShopInventory, purchaseItem } from './shop.js';
import { createGenieEncounter, storeBlessingWish } from './genie.js';
import { applyConsumable, tickActiveEffects } from './consumables.js';
import { getEquipmentById } from './equipment.js';
import { getConsumableByType } from './consumables.js';
import type { GenieEncounter } from './types.js';

export class GameEngine {
  private rng: SeededRNG;
  private seed: string;
  private phase: GamePhase;
  private stage: number;
  private battle: number;
  private handNumber: number;
  private playerState: PlayerState;
  private enemyState: EnemyState | null;
  private combatState: CombatState | null;
  private lastHandResult: HandResult | null;
  private shopItems: ShopItem[];
  private genieEncounter: GenieEncounter | null;
  private log: string[];
  private actionLog: PlayerAction[];
  private rules: GameRules;
  private isBossBattle: boolean;
  private firstActionInHand: boolean;
  private cardRemovesUsed: number;
  private hasPeeked: boolean;
  private peekedCard: Card | null;
  private handsWonThisBattle: number;
  private lastDamageDealt: number;
  private lastDamageTaken: number;
  private consecutiveWins: number;
  private consecutiveLosses: number;
  private previousHandScore: number | null;
  private killCause: 'hand_damage' | 'dot' | null;
  private remainingDamageShield: number;
  private sampledStageEnemies: Map<number, CombatantData[]> = new Map();

  constructor(seed?: string) {
    this.seed = seed ?? Date.now().toString();
    this.rng = new SeededRNG(this.seed);
    this.rules = getDefaultRules();
    this.phase = 'pre_hand';
    this.stage = 1;
    this.battle = 1;
    this.handNumber = 1;
    this.isBossBattle = false;
    this.firstActionInHand = true;
    this.cardRemovesUsed = 0;
    this.hasPeeked = false;
    this.peekedCard = null;
    this.handsWonThisBattle = 0;
    this.lastDamageDealt = 0;
    this.lastDamageTaken = 0;
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.previousHandScore = null;
    this.killCause = null;
    this.remainingDamageShield = 0;

    this.playerState = {
      hp: this.rules.health.playerStartHp,
      maxHp: this.rules.health.playerMaxHp,
      gold: 0,
      equipment: new Map<EquipmentSlot, Equipment | null>([
        ['weapon', null], ['helm', null], ['armor', null], ['boots', null], ['trinket', null],
      ]),
      consumables: [],
      wishes: [],
      activeEffects: [],
    };

    this.combatState = null;
    this.lastHandResult = null;
    this.shopItems = [];
    this.genieEncounter = null;
    this.log = [];
    this.actionLog = [];
    this.enemyState = null;

    this.loadEnemy();
  }

  private getEnemiesForCurrentStage(): CombatantData[] {
    if (!this.sampledStageEnemies.has(this.stage)) {
      this.sampledStageEnemies.set(this.stage, sampleEnemiesForStage(this.stage, this.rng));
    }
    return this.sampledStageEnemies.get(this.stage)!;
  }

  private loadEnemy(): void {
    const rules = this.getModifiedRules();
    if (this.battle <= rules.progression.battlesPerStage) {
      const enemies = this.getEnemiesForCurrentStage();
      const enemyIndex = (this.battle - 1) % enemies.length;
      const data = enemies[enemyIndex];
      this.enemyState = { data, hp: data.maxHp };
      this.isBossBattle = false;
    }
  }

  private loadBoss(): void {
    const data = getBossForStage(this.stage);
    this.enemyState = { data, hp: data.maxHp };
    this.isBossBattle = true;
  }

  private getModifiedRules(): GameRules {
    if (!this.enemyState) return this.rules;
    const { playerModifiers, enemyModifiers } = collectModifiers(this.playerState, this.enemyState);
    return applyModifierPipeline([...playerModifiers, ...enemyModifiers], this.rules);
  }

  private makeContext(): ModifierContext {
    return {
      playerHand: this.combatState?.playerHand ?? { cards: [] },
      dealerHand: this.combatState?.dealerHand ?? { cards: [] },
      playerScore: this.combatState ? scoreHand(this.combatState.playerHand, this.getModifiedRules()) : { value: 0, soft: false, busted: false, isBlackjack: false },
      dealerScore: this.combatState ? scoreHand(this.combatState.dealerHand, this.getModifiedRules()) : { value: 0, soft: false, busted: false, isBlackjack: false },
      playerState: this.playerState,
      enemyState: this.enemyState!,
      rules: this.getModifiedRules(),
      rng: this.rng,
      stage: this.stage,
      battle: this.battle,
      handNumber: this.handNumber,
      lastDamageDealt: this.lastDamageDealt,
      lastDamageTaken: this.lastDamageTaken,
      handsWonThisBattle: this.handsWonThisBattle,
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses,
      previousHandScore: this.previousHandScore,
      peekedCard: this.peekedCard,
      cardRemovesUsed: this.cardRemovesUsed,
      killCause: this.killCause,
    };
  }

  getView(): GameView {
    const rules = this.getModifiedRules();
    const playerHand = this.combatState?.playerHand ?? null;
    const playerScore = playerHand ? scoreHand(playerHand, rules) : null;

    let enemyView: GameView['enemy'] = null;
    if (this.enemyState) {
      const dealerHand = this.combatState?.dealerHand ?? null;
      let visibleCards: (Card | null)[] = [];
      let visibleScore: number | null = null;
      let allRevealed = false;

      if (dealerHand && dealerHand.cards.length > 0) {
        if (this.combatState?.dealerFaceDown) {
          visibleCards = dealerHand.cards.map((c, i) => i === 0 ? null : c);
          // Score of visible cards only
          const visibleHand = { cards: dealerHand.cards.slice(1) };
          visibleScore = scoreHand(visibleHand, rules).value;
        } else {
          visibleCards = [...dealerHand.cards];
          visibleScore = scoreHand(dealerHand, rules).value;
          allRevealed = true;
        }
      }

      enemyView = {
        name: this.enemyState.data.name,
        hp: this.enemyState.hp,
        maxHp: this.enemyState.data.maxHp,
        isBoss: this.enemyState.data.isBoss,
        description: this.enemyState.data.description,
        modifierDescriptions: this.enemyState.data.equipment.map(e => e.modifier.description),
        visibleCards,
        visibleScore,
        allRevealed,
      };
    }

    return {
      phase: this.phase,
      seed: this.seed,
      stage: this.stage,
      battle: this.battle,
      handNumber: this.handNumber,
      player: {
        hp: this.playerState.hp,
        maxHp: this.playerState.maxHp,
        gold: this.playerState.gold,
        equipment: {
          weapon: this.playerState.equipment.get('weapon') ?? null,
          helm: this.playerState.equipment.get('helm') ?? null,
          armor: this.playerState.equipment.get('armor') ?? null,
          boots: this.playerState.equipment.get('boots') ?? null,
          trinket: this.playerState.equipment.get('trinket') ?? null,
        },
        consumables: [...this.playerState.consumables],
        wishes: [...this.playerState.wishes],
        activeEffects: [...this.playerState.activeEffects],
        hand: playerHand?.cards ? [...playerHand.cards] : null,
        handScore: playerScore,
      },
      enemy: enemyView,
      shop: this.phase === 'shop' ? { items: this.shopItems } : null,
      genie: this.phase === 'genie' && this.genieEncounter ? {
        bossName: this.genieEncounter.bossName,
        curseDescription: this.genieEncounter.curseModifier.description,
        blessingEntered: this.genieEncounter.blessingText !== null,
        blessingName: null,
        blessingDescription: null,
      } : null,
      lastHandResult: this.lastHandResult,
      availableActions: this.getAvailableActions(),
      log: this.log.slice(-5),
    };
  }

  getAvailableActions(): PlayerAction[] {
    const actions: PlayerAction[] = [];
    const rules = this.getModifiedRules();

    switch (this.phase) {
      case 'pre_hand':
        if (this.playerState.consumables.length > 0) {
          for (let i = 0; i < this.playerState.consumables.length; i++) {
            actions.push({ type: 'use_consumable', itemIndex: i });
          }
        }
        actions.push({ type: 'continue' });
        break;

      case 'player_turn':
        actions.push({ type: 'hit' });
        actions.push({ type: 'stand' });
        if (rules.actions.canDoubleDown && (this.firstActionInHand || rules.actions.canDoubleDownAnyTime) && this.combatState && !this.combatState.doubledDown) {
          actions.push({ type: 'double_down' });
        }
        if (rules.actions.canRemoveCard && this.cardRemovesUsed < rules.actions.cardRemovesPerHand && this.combatState && this.combatState.playerHand.cards.length > 1) {
          actions.push({ type: 'remove_card', cardIndex: -1 });
        }
        if (rules.actions.canPeek && !this.hasPeeked) {
          actions.push({ type: 'peek' });
        }
        if (rules.actions.canSurrender && this.firstActionInHand) {
          actions.push({ type: 'surrender' });
        }
        break;

      case 'hand_result':
      case 'battle_result':
        actions.push({ type: 'continue' });
        break;

      case 'shop':
        for (let i = 0; i < this.shopItems.length; i++) {
          actions.push({ type: 'buy_item', itemIndex: i });
        }
        actions.push({ type: 'skip_shop' });
        break;

      case 'genie':
        actions.push({ type: 'enter_wish', text: '' });
        break;

      case 'game_over':
      case 'victory':
        // No actions
        break;
    }

    return actions;
  }

  performAction(action: PlayerAction): ActionResult {
    this.actionLog.push(action);

    switch (this.phase) {
      case 'pre_hand':
        return this.handlePreHand(action);
      case 'player_turn':
        return this.handlePlayerTurn(action);
      case 'hand_result':
        return this.handleHandResult(action);
      case 'battle_result':
        return this.handleBattleResult(action);
      case 'shop':
        return this.handleShop(action);
      case 'genie':
        return this.handleGenie(action);
      default:
        return { success: false, message: 'No actions available', newPhase: this.phase };
    }
  }

  private handlePreHand(action: PlayerAction): ActionResult {
    if (action.type === 'use_consumable') {
      if (action.itemIndex < 0 || action.itemIndex >= this.playerState.consumables.length) {
        return { success: false, message: 'Invalid consumable index', newPhase: this.phase };
      }
      const consumable = this.playerState.consumables[action.itemIndex];
      this.playerState.consumables.splice(action.itemIndex, 1);
      const msg = applyConsumable(consumable, this.playerState, this.enemyState!);
      this.log.push(msg);

      // Check if enemy died from damage potion
      if (this.enemyState!.hp <= 0) {
        return this.endBattle();
      }

      return { success: true, message: msg, newPhase: 'pre_hand' };
    }

    if (action.type === 'continue') {
      // Reset per-hand trackers
      this.cardRemovesUsed = 0;
      this.hasPeeked = false;
      this.peekedCard = null;
      this.killCause = null;

      // Apply curse hand-start effects
      const ctx = this.makeContext();
      const { playerModifiers } = collectModifiers(this.playerState, this.enemyState!);
      for (const mod of playerModifiers) {
        if (mod.onHandStart) mod.onHandStart(ctx);
      }
      // Check for death from curse damage
      if (this.playerState.hp <= 0) {
        this.phase = 'game_over';
        this.log.push('You have been defeated!');
        return { success: true, message: 'Defeated by curse damage', newPhase: 'game_over' };
      }

      // Deal cards
      const rules = this.getModifiedRules();
      this.combatState = initCombat(this.rng, rules);
      this.combatState = dealInitialCards(this.combatState, rules);
      this.firstActionInHand = true;
      this.phase = 'player_turn';

      // Check for player blackjack — auto-stand
      const playerScore = scoreHand(this.combatState.playerHand, rules);
      if (playerScore.isBlackjack) {
        return this.finishHand();
      }

      return { success: true, message: 'Cards dealt', newPhase: 'player_turn' };
    }

    return { success: false, message: 'Invalid action', newPhase: this.phase };
  }

  private handlePlayerTurn(action: PlayerAction): ActionResult {
    if (!this.combatState) return { success: false, message: 'No active combat', newPhase: this.phase };
    const rules = this.getModifiedRules();

    if (action.type === 'hit') {
      this.firstActionInHand = false;
      this.combatState = playerHit(this.combatState);
      const score = scoreHand(this.combatState.playerHand, rules);

      // Check bust modifier
      if (score.busted) {
        const { playerModifiers } = collectModifiers(this.playerState, this.enemyState!);
        let saved = false;
        for (const mod of playerModifiers) {
          if (mod.modifyBust) {
            const result = mod.modifyBust(this.combatState.playerHand, score.value, this.makeContext());
            if (result && !result.busted) {
              saved = true;
              break;
            }
          }
        }
        if (!saved) {
          return this.finishHand();
        }
      }

      if (score.value === rules.scoring.bustThreshold) {
        // Auto-stand at exactly 21
        return this.finishHand();
      }

      return { success: true, message: 'Hit', newPhase: 'player_turn' };
    }

    if (action.type === 'stand') {
      this.combatState = playerStand(this.combatState);
      return this.finishHand();
    }

    if (action.type === 'double_down') {
      if (!rules.actions.canDoubleDown || (!this.firstActionInHand && !rules.actions.canDoubleDownAnyTime)) {
        return { success: false, message: 'Cannot double down', newPhase: this.phase };
      }
      this.combatState = playerDoubleDown(this.combatState);
      if (rules.actions.canHitAfterDouble) {
        return { success: true, message: 'Doubled down', newPhase: 'player_turn' };
      }
      return this.finishHand();
    }

    if (action.type === 'remove_card') {
      if (!rules.actions.canRemoveCard) {
        return { success: false, message: 'Cannot remove cards', newPhase: this.phase };
      }
      if (this.cardRemovesUsed >= rules.actions.cardRemovesPerHand) {
        return { success: false, message: 'No removes remaining', newPhase: this.phase };
      }
      if (action.cardIndex < 0 || action.cardIndex >= this.combatState.playerHand.cards.length) {
        return { success: false, message: 'Invalid card index', newPhase: this.phase };
      }
      if (this.combatState.playerHand.cards.length <= 1) {
        return { success: false, message: 'Cannot remove last card', newPhase: this.phase };
      }
      this.combatState = {
        ...this.combatState,
        playerHand: { cards: [...this.combatState.playerHand.cards] },
      };
      this.combatState.playerHand.cards.splice(action.cardIndex, 1);
      this.cardRemovesUsed++;
      this.log.push('Removed a card from hand');
      return { success: true, message: 'Card removed', newPhase: 'player_turn' };
    }

    if (action.type === 'peek') {
      if (!rules.actions.canPeek || this.hasPeeked) {
        return { success: false, message: 'Cannot peek', newPhase: this.phase };
      }
      const nextCard = this.combatState.deck[this.combatState.deckIndex];
      this.hasPeeked = true;
      this.peekedCard = nextCard ?? null;
      if (nextCard) {
        this.log.push(`Peeked: ${cardToString(nextCard)}`);
        return { success: true, message: `Next card: ${cardToString(nextCard)}`, newPhase: 'player_turn' };
      }
      return { success: true, message: 'No more cards', newPhase: 'player_turn' };
    }

    if (action.type === 'surrender') {
      if (!rules.actions.canSurrender) {
        return { success: false, message: 'Cannot surrender', newPhase: this.phase };
      }
      return this.finishHandWithSurrender();
    }

    return { success: false, message: 'Invalid action', newPhase: this.phase };
  }

  private finishHand(): ActionResult {
    if (!this.combatState || !this.enemyState) {
      return { success: false, message: 'No active combat', newPhase: this.phase };
    }

    const rules = this.getModifiedRules();

    // Dealer plays
    this.combatState = dealerPlay(this.combatState, rules);

    const { playerModifiers, enemyModifiers } = collectModifiers(this.playerState, this.enemyState);
    const ctx = this.makeContext();
    const result = resolveHand(this.combatState, playerModifiers, enemyModifiers, rules, ctx);
    this.lastHandResult = result;

    // Apply damage
    this.lastDamageDealt = 0;
    this.lastDamageTaken = 0;
    if (result.damageTarget === 'player' && result.damageDealt > 0) {
      this.playerState.hp = Math.max(0, this.playerState.hp - result.damageDealt);
      this.lastDamageTaken = result.damageDealt;
    } else if (result.damageTarget === 'dealer' && result.damageDealt > 0) {
      this.enemyState.hp = Math.max(0, this.enemyState.hp - result.damageDealt);
      this.lastDamageDealt = result.damageDealt;
    }

    // Track previous hand score
    this.previousHandScore = result.playerScore.value;

    // Track consecutive wins/losses
    if (result.winner === 'player') {
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
      this.handsWonThisBattle++;
    } else if (result.winner === 'dealer') {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
    } else {
      this.consecutiveWins = 0;
      this.consecutiveLosses = 0;
    }

    // Track kill cause
    if (this.enemyState.hp <= 0) {
      this.killCause = 'hand_damage';
    }

    // Fire onPush hooks
    if (result.winner === 'push') {
      for (const mod of playerModifiers) {
        if (mod.onPush) mod.onPush(ctx);
      }
    }

    // Fire onEnemyBust hooks
    if (result.dealerScore.busted) {
      for (const mod of playerModifiers) {
        if (mod.onEnemyBust) mod.onEnemyBust(ctx);
      }
    }

    // Fire onDodge hooks
    if (result.dodged && result.damageTarget === 'player') {
      for (const mod of playerModifiers) {
        if (mod.onDodge) mod.onDodge(ctx);
      }
    }

    // Run onHandEnd for all modifiers
    const allMods = [...playerModifiers, ...enemyModifiers];
    const endCtx = this.makeContext();
    for (const mod of allMods) {
      if (mod.onHandEnd) mod.onHandEnd(endCtx);
    }

    // Tick active effects (poison, etc.)
    const effectMsgs = tickActiveEffects(this.playerState, this.enemyState, endCtx);
    for (const msg of effectMsgs) this.log.push(msg);

    // Check if enemy died from DoT
    if (this.enemyState.hp <= 0 && this.killCause !== 'hand_damage') {
      this.killCause = 'dot';
    }

    // Log result
    const winnerLabel = result.winner === 'player' ? 'WIN' : result.winner === 'dealer' ? 'LOSS' : 'PUSH';
    this.log.push(`${winnerLabel}! ${result.damageBreakdown} → ${result.damageDealt}dmg`);

    // Check for death
    if (this.playerState.hp <= 0) {
      this.phase = 'game_over';
      this.log.push(`Defeated by ${this.enemyState.data.name}!`);
      return { success: true, message: `Game Over — defeated by ${this.enemyState.data.name}`, newPhase: 'game_over' };
    }

    if (this.enemyState.hp <= 0) {
      return this.endBattle();
    }

    // Next hand
    this.phase = 'hand_result';
    this.handNumber++;
    return { success: true, message: `${winnerLabel}`, newPhase: 'hand_result' };
  }

  private finishHandWithSurrender(): ActionResult {
    if (!this.combatState || !this.enemyState) {
      return { success: false, message: 'No active combat', newPhase: this.phase };
    }

    // Player surrenders — takes half of what damage the dealer would deal
    const rules = this.getModifiedRules();
    const dealerScore = scoreHand(this.combatState.dealerHand, rules);
    const halfDamage = Math.floor(dealerScore.value / 2);
    this.playerState.hp = Math.max(0, this.playerState.hp - halfDamage);
    this.lastDamageTaken = halfDamage;
    this.lastDamageDealt = 0;
    this.consecutiveLosses++;
    this.consecutiveWins = 0;

    this.log.push(`Surrendered! Took ${halfDamage} damage`);

    if (this.playerState.hp <= 0) {
      this.phase = 'game_over';
      this.log.push(`Defeated by ${this.enemyState.data.name}!`);
      return { success: true, message: 'Defeated', newPhase: 'game_over' };
    }

    this.phase = 'hand_result';
    this.handNumber++;
    this.lastHandResult = null;
    return { success: true, message: 'Surrendered', newPhase: 'hand_result' };
  }

  private endBattle(): ActionResult {
    if (!this.enemyState) return { success: false, message: 'No enemy', newPhase: this.phase };

    const rules = this.getModifiedRules();
    let gold = this.isBossBattle ? rules.economy.goldPerBoss : rules.economy.goldPerBattle;

    // Apply gold modifiers
    const { playerModifiers } = collectModifiers(this.playerState, this.enemyState);
    for (const mod of playerModifiers) {
      if (mod.modifyGoldEarned) gold = mod.modifyGoldEarned(gold, this.makeContext());
    }

    this.playerState.gold += gold;
    this.log.push(`${this.enemyState.data.name} defeated! +${gold} gold`);

    // Health regen
    if (rules.health.healthRegenPerBattle > 0) {
      this.playerState.hp = Math.min(
        this.playerState.hp + rules.health.healthRegenPerBattle,
        this.playerState.maxHp
      );
    }

    this.phase = 'battle_result';
    this.combatState = null;
    this.lastHandResult = null;
    this.handNumber = 1;
    this.handsWonThisBattle = 0;
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.previousHandScore = null;
    this.remainingDamageShield = 0;
    this.killCause = null;

    return { success: true, message: `Victory! +${gold} gold`, newPhase: 'battle_result' };
  }

  private handleHandResult(action: PlayerAction): ActionResult {
    if (action.type !== 'continue') {
      return { success: false, message: 'Press continue', newPhase: this.phase };
    }

    this.phase = 'pre_hand';
    this.combatState = null;
    return { success: true, message: 'Next hand', newPhase: 'pre_hand' };
  }

  private handleBattleResult(action: PlayerAction): ActionResult {
    if (action.type !== 'continue') {
      return { success: false, message: 'Press continue', newPhase: this.phase };
    }

    const rules = this.getModifiedRules();

    if (this.isBossBattle) {
      // Go to genie
      const boss = this.enemyState!.data;
      this.genieEncounter = createGenieEncounter(boss);
      this.phase = 'genie';
      return { success: true, message: 'The Genie appears!', newPhase: 'genie' };
    }

    // Regular battle — go to shop
    if (this.battle < rules.progression.battlesPerStage) {
      this.shopItems = generateShopInventory(this.stage, this.playerState, this.rng);
      this.phase = 'shop';
      return { success: true, message: 'Welcome to the shop', newPhase: 'shop' };
    }

    // Last regular battle done — boss next
    this.shopItems = generateShopInventory(this.stage, this.playerState, this.rng);
    this.phase = 'shop';
    return { success: true, message: 'Welcome to the shop', newPhase: 'shop' };
  }

  private handleShop(action: PlayerAction): ActionResult {
    if (action.type === 'buy_item') {
      if (action.itemIndex < 0 || action.itemIndex >= this.shopItems.length) {
        return { success: false, message: 'Invalid item index', newPhase: 'shop' };
      }
      const item = this.shopItems[action.itemIndex];
      const result = purchaseItem(item, this.playerState);
      if (result.success) {
        this.log.push(result.message);
        // Update affordability
        for (const si of this.shopItems) {
          si.affordable = this.playerState.gold >= si.item.cost;
        }
      }
      return { success: result.success, message: result.message, newPhase: 'shop' };
    }

    if (action.type === 'skip_shop') {
      return this.advanceAfterShop();
    }

    return { success: false, message: 'Invalid action', newPhase: 'shop' };
  }

  private advanceAfterShop(): ActionResult {
    const rules = this.getModifiedRules();

    if (this.battle < rules.progression.battlesPerStage) {
      // Next regular battle
      this.battle++;
      this.loadEnemy();
      this.phase = 'pre_hand';
      this.log.push(`Battle ${this.battle} begins — ${this.enemyState!.data.name}`);
      return { success: true, message: `Next battle: ${this.enemyState!.data.name}`, newPhase: 'pre_hand' };
    }

    // Boss battle
    this.battle++;
    this.loadBoss();
    this.phase = 'pre_hand';
    this.log.push(`Boss battle! ${this.enemyState!.data.name}`);
    return { success: true, message: `Boss: ${this.enemyState!.data.name}!`, newPhase: 'pre_hand' };
  }

  private handleGenie(action: PlayerAction): ActionResult {
    if (action.type !== 'enter_wish' || !this.genieEncounter) {
      return { success: false, message: 'Enter your wish', newPhase: 'genie' };
    }

    const wish = storeBlessingWish(this.genieEncounter, action.text, action.blessing);
    this.playerState.wishes.push(wish);
    this.log.push(`Blessing: "${wish.blessing?.name ?? 'none'}"`);
    this.log.push(`Curse received: ${wish.curse?.name ?? 'none'}`);

    // Reset HP after boss
    const rules = this.getModifiedRules();
    if (rules.health.resetHpAfterBoss) {
      this.playerState.hp = this.playerState.maxHp;
    }

    // Advance to next stage
    this.stage++;
    this.battle = 1;
    this.genieEncounter = null;

    if (this.stage > rules.progression.totalStages) {
      this.phase = 'victory';
      this.log.push('You conquered the Sultan\'s Palace!');
      return { success: true, message: 'Victory!', newPhase: 'victory' };
    }

    this.loadEnemy();
    this.phase = 'pre_hand';
    this.log.push(`Stage ${this.stage} begins!`);
    return { success: true, message: `Stage ${this.stage}`, newPhase: 'pre_hand' };
  }

  // ── Serialization ──

  serialize(): SerializedGameState {
    return {
      rngState: this.rng.getState(),
      playerState: {
        hp: this.playerState.hp,
        maxHp: this.playerState.maxHp,
        gold: this.playerState.gold,
        equipment: Array.from(this.playerState.equipment.entries()).map(([slot, eq]) => [slot, eq?.id ?? null]),
        consumables: this.playerState.consumables.map(c => c.id),
        wishes: this.playerState.wishes,
        activeEffects: this.playerState.activeEffects,
      },
      stage: this.stage,
      battle: this.battle,
      handNumber: this.handNumber,
      phase: this.phase,
      enemyName: this.enemyState?.data.name ?? null,
      enemyHp: this.enemyState?.hp ?? null,
      actionLog: [...this.actionLog],
    };
  }

  static fromSerialized(data: SerializedGameState): GameEngine {
    // Replay from seed + action log is the most reliable way
    const replay: GameReplay = {
      seed: data.rngState.seed.toString(),
      actions: data.actionLog,
    };
    return GameEngine.fromReplay(replay);
  }

  getReplay(): GameReplay {
    return {
      seed: this.seed,
      actions: [...this.actionLog],
    };
  }

  static fromReplay(replay: GameReplay): GameEngine {
    const engine = new GameEngine(replay.seed);
    for (const action of replay.actions) {
      engine.performAction(action);
    }
    return engine;
  }
}

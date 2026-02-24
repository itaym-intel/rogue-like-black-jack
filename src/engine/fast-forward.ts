import type { GameView, PlayerAction } from './types.js';
import { GameEngine } from './game.js';

const MAX_ACTIONS = 5000;
const MAX_SEED_RETRIES = 50;

/**
 * Auto-play a GameEngine until it reaches the genie phase.
 * Uses a simple stand-on-17 strategy, skips shops.
 * Mutates the engine in place.
 */
export function fastForwardToGenie(engine: GameEngine): void {
  let actions = 0;

  while (actions < MAX_ACTIONS) {
    const view = engine.getView();

    if (view.phase === 'genie') return;
    if (view.phase === 'game_over' || view.phase === 'victory') {
      throw new Error(`Game ended (${view.phase}) before reaching genie`);
    }

    engine.performAction(pickAction(view));
    actions++;
  }

  throw new Error(`Fast-forward exceeded ${MAX_ACTIONS} actions without reaching genie`);
}

/**
 * Create a GameEngine that's already at the genie phase.
 * If seed is provided, uses that exact seed (throws if it dies before genie).
 * If no seed, tries random seeds until one survives to genie.
 */
export function createEngineAtGenie(seed?: string): GameEngine {
  if (seed) {
    const engine = new GameEngine(seed);
    fastForwardToGenie(engine);
    return engine;
  }

  for (let i = 0; i < MAX_SEED_RETRIES; i++) {
    const engine = new GameEngine();
    try {
      fastForwardToGenie(engine);
      return engine;
    } catch {
      // seed didn't survive, try another
    }
  }

  throw new Error(`Could not find a seed that reaches genie after ${MAX_SEED_RETRIES} attempts`);
}

function pickAction(view: GameView): PlayerAction {
  switch (view.phase) {
    case 'player_turn': {
      const score = view.player.handScore;
      if (score && score.value >= 17) return { type: 'stand' };
      return { type: 'hit' };
    }
    case 'shop':
      return { type: 'skip_shop' };
    default:
      return { type: 'continue' };
  }
}

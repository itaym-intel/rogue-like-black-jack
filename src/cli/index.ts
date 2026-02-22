import { GameEngine } from '../engine/game.js';
import { renderView } from './display.js';
import { createInputHandler } from './input.js';

function parseSeed(args: string[]): string | undefined {
  for (const arg of args) {
    if (arg.startsWith('--seed=')) {
      return arg.slice('--seed='.length);
    }
  }
  return undefined;
}

async function main() {
  const seed = parseSeed(process.argv.slice(2));
  const game = new GameEngine(seed);
  const input = createInputHandler();

  console.clear();
  console.log('=== GENIEJACK ===');
  console.log(seed ? `Seed: ${seed}` : `Random seed: ${game.getView().seed}`);
  console.log('');

  while (true) {
    const view = game.getView();

    console.clear();
    console.log(renderView(view));

    if (view.phase === 'game_over' || view.phase === 'victory') {
      input.close();
      break;
    }

    const action = await input.promptAction(view.availableActions, view.phase);
    game.performAction(action);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

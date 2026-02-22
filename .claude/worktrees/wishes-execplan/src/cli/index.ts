import { GameEngine } from '../engine/game.js';
import { renderView } from './display.js';
import { createInputHandler } from './input.js';
import { generateBlessing, buildWishContext } from '../llm/wish-generator.js';

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

    if (action.type === 'enter_wish') {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.log('No API key set — using default blessing.');
      } else {
        console.log('The Genie ponders your wish...');
      }
      const wishContext = buildWishContext(view);
      const blessingDef = await generateBlessing(action.text, wishContext);
      action.blessing = blessingDef;
      console.log(`Blessing granted: ${blessingDef.name} — ${blessingDef.description}`);
    }

    game.performAction(action);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

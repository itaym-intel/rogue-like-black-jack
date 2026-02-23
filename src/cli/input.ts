import * as readline from 'node:readline';
import type { PlayerAction, GamePhase } from '../engine/types.js';

export function createInputHandler(): {
  promptAction(availableActions: PlayerAction[], phase: GamePhase): Promise<PlayerAction>;
  close(): void;
} {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function prompt(query: string): Promise<string> {
    return new Promise(resolve => {
      rl.question(query, answer => resolve(answer.trim()));
    });
  }

  async function promptAction(availableActions: PlayerAction[], phase: GamePhase): Promise<PlayerAction> {
    while (true) {
      const input = await prompt('> ');

      // Empty input = continue
      if (input === '') {
        if (availableActions.some(a => a.type === 'continue')) {
          return { type: 'continue' };
        }
      }

      // Single char commands
      if (input === 'h' && availableActions.some(a => a.type === 'hit')) {
        return { type: 'hit' };
      }
      if (input === 's') {
        if (phase === 'shop' && availableActions.some(a => a.type === 'skip_shop')) {
          return { type: 'skip_shop' };
        }
        if (availableActions.some(a => a.type === 'stand')) {
          return { type: 'stand' };
        }
      }
      if (input === 'd' && availableActions.some(a => a.type === 'double_down')) {
        return { type: 'double_down' };
      }

      // Remove card
      if (input === 'r' && availableActions.some(a => a.type === 'remove_card')) {
        const idxStr = await prompt('Card to remove (1-based): ');
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx) && idx >= 1) {
          return { type: 'remove_card', cardIndex: idx - 1 };
        }
        console.log('Invalid index');
        continue;
      }

      // Peek
      if (input === 'p' && availableActions.some(a => a.type === 'peek')) {
        return { type: 'peek' };
      }

      // Surrender
      if ((input === 'rr' || input === 'surrender') && availableActions.some(a => a.type === 'surrender')) {
        return { type: 'surrender' };
      }

      // Use consumable
      if (input === 'u' && availableActions.some(a => a.type === 'use_consumable')) {
        const idxStr = await prompt('Item index (0-based): ');
        const idx = parseInt(idxStr, 10);
        if (!isNaN(idx)) {
          return { type: 'use_consumable', itemIndex: idx };
        }
        console.log('Invalid index');
        continue;
      }

      // Shop: numeric input
      if (phase === 'shop') {
        const num = parseInt(input, 10);
        if (!isNaN(num) && num >= 1) {
          const itemIndex = num - 1;
          if (availableActions.some(a => a.type === 'buy_item' && a.itemIndex === itemIndex)) {
            return { type: 'buy_item', itemIndex };
          }
        }
      }

      // Genie: free text
      if (phase === 'genie' && input.length > 0) {
        return { type: 'enter_wish', text: input };
      }

      console.log('Invalid action. Try again.');
    }
  }

  return {
    promptAction,
    close() { rl.close(); },
  };
}

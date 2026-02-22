import Anthropic from '@anthropic-ai/sdk';
import type { GameView, BlessingDefinition } from '../engine/types.js';
import { validateBlessingDefinition } from '../engine/blessings.js';

export interface WishContext {
  playerHp: number;
  playerMaxHp: number;
  playerGold: number;
  equippedItems: string[];
  consumables: string[];
  currentStage: number;
  bossDefeated: string;
  existingBlessings: string[];
  existingCurses: string[];
}

const FALLBACK_BLESSING: BlessingDefinition = {
  name: 'Minor Boon',
  description: 'A small gift from the Genie.',
  effects: [{ type: 'flat_damage_bonus', value: 3 }],
};

const SYSTEM_PROMPT = `You are the Genie in a rogue-like blackjack game called Geniejack. A player has defeated a powerful boss and earned a Wish. Your role is to interpret their wish creatively and grant a blessing — a set of gameplay effects that last for the rest of the run.

You must respond by calling the create_blessing tool exactly once. Choose effects that are thematically connected to the player's wish. Be creative but fair — blessings should be meaningful and fun but not game-breaking. Consider the player's current situation when choosing effects.

Guidelines:
- Choose 1 to 3 effects that thematically fit the wish.
- Give the blessing a short, evocative name (under 40 characters).
- Write a one-sentence description of what the blessing does.
- If the wish is vague, interpret it generously but not overpoweringly.
- If the wish references something not in the game, find the closest thematic match.
- Scale effect values based on the stage (early = weaker, late = stronger).`;

const CREATE_BLESSING_TOOL: Anthropic.Messages.Tool = {
  name: 'create_blessing',
  description: 'Grant a blessing to the player based on their wish. Choose 1-3 effects.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Short evocative name for the blessing, under 40 characters.',
      },
      description: {
        type: 'string',
        description: 'One-sentence player-facing description of what the blessing does.',
      },
      effects: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'flat_damage_bonus', 'percent_damage_bonus',
                'flat_damage_reduction', 'percent_damage_reduction',
                'dodge_chance', 'bust_save',
                'max_hp_bonus', 'heal_per_hand', 'heal_on_win', 'lifesteal',
                'bust_threshold_bonus', 'dealer_stands_on', 'double_down_multiplier',
                'flat_gold_bonus', 'percent_gold_bonus',
                'damage_per_hand', 'blackjack_bonus_damage', 'suit_damage_bonus',
              ],
              description: 'The type of effect. flat_damage_bonus: adds flat damage to all attacks. percent_damage_bonus: multiplies damage dealt (0.1 = +10%). flat_damage_reduction: reduces incoming damage by flat amount. percent_damage_reduction: reduces incoming damage by percentage (0.2 = 20% less). dodge_chance: probability to dodge damage (0.15 = 15%). bust_save: if player busts, count hand as this score instead. max_hp_bonus: permanently increase max HP. heal_per_hand: heal this much at the start of each hand. heal_on_win: heal when winning a hand. lifesteal: heal for a percentage of damage dealt (0.3 = 30%). bust_threshold_bonus: raise bust threshold (1 = bust at 22 instead of 21). dealer_stands_on: set what the dealer stands on (lower = harder for dealer). double_down_multiplier: set double down damage multiplier. flat_gold_bonus: extra gold per battle. percent_gold_bonus: percentage more gold (0.5 = 50% more). damage_per_hand: deal this damage to enemy at start of each hand. blackjack_bonus_damage: extra damage when you hit blackjack. suit_damage_bonus: extra damage per card of a specific suit in your hand.',
            },
            value: {
              type: 'number',
              description: 'The numeric value for the effect. Ranges vary by type.',
            },
            suit: {
              type: 'string',
              enum: ['hearts', 'diamonds', 'clubs', 'spades'],
              description: 'Only used for suit_damage_bonus. Which suit triggers the bonus.',
            },
          },
          required: ['type', 'value'],
        },
      },
    },
    required: ['name', 'description', 'effects'],
  },
};

function buildUserMessage(wishText: string, context: WishContext): string {
  return `The player says: "${wishText}"

Current situation:
- HP: ${context.playerHp}/${context.playerMaxHp}
- Gold: ${context.playerGold}
- Equipment: ${context.equippedItems.length > 0 ? context.equippedItems.join(', ') : 'none'}
- Consumables: ${context.consumables.length > 0 ? context.consumables.join(', ') : 'none'}
- Stage: ${context.currentStage} (just defeated ${context.bossDefeated})
- Existing blessings: ${context.existingBlessings.length > 0 ? context.existingBlessings.join(', ') : 'none'}
- Active curses: ${context.existingCurses.length > 0 ? context.existingCurses.join(', ') : 'none'}`;
}

export function buildWishContext(view: GameView): WishContext {
  const equippedItems: string[] = [];
  for (const slot of ['weapon', 'helm', 'armor', 'boots', 'trinket'] as const) {
    const eq = view.player.equipment[slot];
    if (eq) equippedItems.push(eq.name);
  }

  const consumables = view.player.consumables.map(c => c.name);

  const existingBlessings: string[] = [];
  const existingCurses: string[] = [];
  for (const wish of view.player.wishes) {
    if (wish.blessing) existingBlessings.push(wish.blessing.description);
    if (wish.curse) existingCurses.push(wish.curse.name);
  }

  return {
    playerHp: view.player.hp,
    playerMaxHp: view.player.maxHp,
    playerGold: view.player.gold,
    equippedItems,
    consumables,
    currentStage: view.stage,
    bossDefeated: view.genie?.bossName ?? 'Unknown',
    existingBlessings,
    existingCurses,
  };
}

export async function generateBlessing(
  wishText: string,
  context: WishContext,
  options?: { apiKey?: string; model?: string }
): Promise<BlessingDefinition> {
  const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return FALLBACK_BLESSING;
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: options?.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(wishText, context) }],
      tools: [CREATE_BLESSING_TOOL],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse || toolUse.name !== 'create_blessing') {
      return FALLBACK_BLESSING;
    }

    const input = toolUse.input as Record<string, unknown>;
    const def: BlessingDefinition = {
      name: (input.name as string) ?? 'Minor Boon',
      description: (input.description as string) ?? 'A small gift',
      effects: (input.effects as BlessingDefinition['effects']) ?? [],
    };

    return validateBlessingDefinition(def);
  } catch {
    return FALLBACK_BLESSING;
  }
}

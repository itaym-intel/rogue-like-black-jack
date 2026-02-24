import Anthropic from '@anthropic-ai/sdk';
import type { BlessingDefinition, GameView } from '../engine/types.js';
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
  description: 'A small gift from the Genie',
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

const TOOL_DEFINITION: Anthropic.Tool = {
  name: 'create_blessing',
  description: 'Grant a blessing to the player based on their wish. Choose 1-3 effects from the comprehensive API.',
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
                'flexible_rank', 'change_face_card_value', 'change_ace_high_value',
                'suit_card_value_bonus', 'rank_value_override',
                'remove_rank_from_deck', 'remove_suit_from_deck', 'force_deck_ranks',
                'extra_copies_of_rank', 'no_reshuffle', 'multiple_decks',
                'bust_threshold_bonus', 'additional_blackjack_value', 'bust_save',
                'bust_card_value_halved', 'ignore_card_on_bust',
                'five_card_charlie', 'soft_hand_bonus', 'exact_target_bonus',
                'enable_remove_card', 'enable_peek', 'enable_surrender', 'enable_split',
                'extra_starting_cards', 'fewer_starting_cards',
                'double_down_any_time', 'hit_after_double',
                'dealer_stands_on', 'dealer_hits_soft_17', 'ties_favor_player',
                'double_bust_favors_player', 'dealer_reveals_cards',
                'dealer_extra_starting_card', 'dealer_fewer_starting_cards',
                'flat_damage_bonus', 'percent_damage_bonus', 'damage_multiplier',
                'suit_damage_bonus', 'face_card_damage_bonus', 'ace_damage_bonus',
                'even_card_bonus', 'odd_card_bonus', 'low_card_bonus', 'high_card_bonus',
                'blackjack_bonus_damage', 'blackjack_damage_multiplier',
                'damage_on_push', 'damage_per_card_in_hand',
                'overkill_carry', 'scaling_damage_per_win', 'double_down_multiplier',
                'flat_damage_reduction', 'percent_damage_reduction', 'dodge_chance',
                'thorns', 'damage_shield', 'damage_cap',
                'suit_damage_reduction', 'reduce_bust_damage',
                'max_hp_bonus', 'heal_per_hand', 'heal_on_win', 'heal_on_blackjack',
                'heal_on_dodge', 'lifesteal', 'heal_per_battle', 'heal_on_push',
                'damage_per_hand', 'poison', 'damage_on_enemy_bust',
                'flat_gold_bonus', 'percent_gold_bonus',
                'gold_per_hand_won', 'gold_per_blackjack', 'shop_discount',
              ],
              description: 'The effect type. See tool description for full reference.',
            },
            value: {
              type: 'number',
              description: 'The numeric value. Use 1 for boolean effects. Values are clamped server-side.',
            },
            suit: {
              type: 'string',
              enum: ['hearts', 'diamonds', 'clubs', 'spades'],
              description: 'Required for suit-based effects.',
            },
            rank: {
              type: 'string',
              enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
              description: 'Required for rank-based effects.',
            },
            ranks: {
              type: 'array',
              items: { type: 'string', enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] },
              description: 'Required for force_deck_ranks.',
            },
            condition: {
              type: 'object',
              description: 'Optional condition for the effect to activate.',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'when_player_draws_rank', 'when_player_draws_suit',
                    'when_dealer_draws_rank', 'when_dealer_draws_suit',
                    'hand_contains_pair', 'hand_is_flush', 'hand_all_same_color',
                    'hand_size_equals', 'hand_size_gte', 'hand_contains_rank', 'hand_contains_suit',
                    'score_exactly', 'score_gte', 'on_blackjack', 'on_bust', 'on_soft_hand',
                    'on_win', 'on_loss', 'on_push', 'on_dodge', 'on_enemy_bust', 'on_win_no_damage_taken',
                    'hp_below_percent', 'hp_above_percent', 'enemy_hp_below_percent',
                    'gold_above', 'consecutive_wins', 'consecutive_losses',
                    'first_hand_of_battle', 'same_score_as_previous',
                    'enemy_killed_by_dot', 'enemy_killed_by_blackjack',
                  ],
                },
                value: { type: 'number' },
                rank: { type: 'string', enum: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] },
                suit: { type: 'string', enum: ['hearts', 'diamonds', 'clubs', 'spades'] },
              },
              required: ['type'],
            },
          },
          required: ['type', 'value'],
        },
      },
    },
    required: ['name', 'description', 'effects'],
  },
};

export function buildWishContext(view: GameView): WishContext {
  const equippedItems: string[] = [];
  for (const [, eq] of Object.entries(view.player.equipment)) {
    if (eq) equippedItems.push(eq.name);
  }

  return {
    playerHp: view.player.hp,
    playerMaxHp: view.player.maxHp,
    playerGold: view.player.gold,
    equippedItems,
    consumables: view.player.consumables.map(c => c.name),
    currentStage: view.stage,
    bossDefeated: view.genie?.bossName ?? 'Unknown',
    existingBlessings: view.player.wishes
      .filter(w => w.blessing)
      .map(w => w.blessing!.description),
    existingCurses: view.player.wishes
      .filter(w => w.curse)
      .map(w => w.curse!.name),
  };
}

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
      tools: [TOOL_DEFINITION],
      tool_choice: { type: 'tool', name: 'create_blessing' },
    });

    // Find tool_use block
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse || toolUse.name !== 'create_blessing') {
      return FALLBACK_BLESSING;
    }

    const input = toolUse.input as Record<string, unknown>;
    const def: BlessingDefinition = {
      name: String(input.name || 'Blessing'),
      description: String(input.description || 'A magical blessing'),
      effects: Array.isArray(input.effects) ? input.effects : [],
    };

    return validateBlessingDefinition(def);
  } catch {
    return FALLBACK_BLESSING;
  }
}

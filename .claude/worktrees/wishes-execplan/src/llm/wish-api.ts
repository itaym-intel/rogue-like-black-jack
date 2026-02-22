import type { BlessingDefinition } from '../engine/types.js';
import type { WishContext } from './wish-generator.js';

export async function fetchBlessing(
  wishText: string,
  context: WishContext
): Promise<BlessingDefinition> {
  try {
    const response = await fetch('/api/wish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wishText, context }),
    });
    if (!response.ok) {
      return { name: 'Minor Boon', description: 'A small gift from the Genie.', effects: [{ type: 'flat_damage_bonus', value: 3 }] };
    }
    return response.json();
  } catch {
    return { name: 'Minor Boon', description: 'A small gift from the Genie.', effects: [{ type: 'flat_damage_bonus', value: 3 }] };
  }
}

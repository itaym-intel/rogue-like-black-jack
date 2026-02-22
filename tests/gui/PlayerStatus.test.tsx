// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlayerStatus } from '../../src/gui/components/PlayerStatus';
import type { GameView } from '../../src/engine/types';

afterEach(cleanup);

function makeView(overrides: Partial<GameView['player']> = {}): GameView {
  return {
    phase: 'player_turn',
    seed: 'test',
    stage: 1,
    battle: 1,
    handNumber: 1,
    player: {
      hp: 35,
      maxHp: 50,
      gold: 120,
      equipment: {
        weapon: { id: 'w1', name: 'Bronze Scimitar', slot: 'weapon', tier: 'bronze', description: '+5 dmg', cost: 30, modifier: { id: 'm1', name: 'Test', description: '+5 dmg', source: 'equipment' } },
        helm: null,
        armor: null,
        boots: null,
        trinket: null,
      },
      consumables: [
        { id: 'c1', name: 'Health Potion', type: 'health_potion', description: 'Restore 10 HP', cost: 15, effect: { type: 'health_potion', value: 10 } },
        { id: 'c2', name: 'Health Potion', type: 'health_potion', description: 'Restore 10 HP', cost: 15, effect: { type: 'health_potion', value: 10 } },
      ],
      wishes: [
        { blessingText: 'power', curse: { id: 'curse1', name: 'Night Fang', description: 'Lose 2 HP per hand', source: 'wish_curse' }, bossName: 'Ancient Strix' },
      ],
      activeEffects: [
        { id: 'e1', name: 'Strength', remainingHands: 3, modifier: { id: 'm2', name: 'Strength', description: '+3 dmg', source: 'consumable' } },
      ],
      hand: null,
      handScore: null,
      ...overrides,
    },
    enemy: null,
    shop: null,
    genie: null,
    lastHandResult: null,
    availableActions: [],
    log: [],
  };
}

describe('PlayerStatus', () => {
  test('renders HP correctly', () => {
    render(<PlayerStatus view={makeView()} />);
    expect(screen.getByText('35/50')).toBeInTheDocument();
  });

  test('shows gold amount', () => {
    render(<PlayerStatus view={makeView()} />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  test('lists equipment with name or dash for empty', () => {
    render(<PlayerStatus view={makeView()} />);
    expect(screen.getByText('Bronze Scimitar')).toBeInTheDocument();
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(4);
  });

  test('shows consumables grouped with counts', () => {
    render(<PlayerStatus view={makeView()} />);
    expect(screen.getByText('Health Potion x2')).toBeInTheDocument();
  });

  test('shows active effects with remaining hands', () => {
    render(<PlayerStatus view={makeView()} />);
    expect(screen.getByText('Strength (3 hands)')).toBeInTheDocument();
  });

  test('shows curses from wishes', () => {
    render(<PlayerStatus view={makeView()} />);
    expect(screen.getByText('Night Fang')).toBeInTheDocument();
  });

  test('hides consumable section when empty', () => {
    render(<PlayerStatus view={makeView({ consumables: [] })} />);
    expect(screen.queryByText('Health Potion')).not.toBeInTheDocument();
  });

  test('hides effects section when empty', () => {
    render(<PlayerStatus view={makeView({ activeEffects: [] })} />);
    expect(screen.queryByText(/Strength/)).not.toBeInTheDocument();
  });
});

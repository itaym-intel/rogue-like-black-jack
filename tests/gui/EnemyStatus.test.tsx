// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EnemyStatus } from '../../src/gui/components/EnemyStatus';
import type { GameView } from '../../src/engine/types';

afterEach(cleanup);

function makeView(enemyOverrides: Partial<NonNullable<GameView['enemy']>> = {}): GameView {
  return {
    phase: 'player_turn',
    seed: 'test',
    stage: 1,
    battle: 1,
    handNumber: 1,
    player: {
      hp: 50, maxHp: 50, gold: 0,
      equipment: { weapon: null, helm: null, armor: null, boots: null, trinket: null },
      consumables: [], wishes: [], activeEffects: [],
      hand: null, handScore: null,
    },
    enemy: {
      name: 'Vampire Bat',
      hp: 10,
      maxHp: 15,
      isBoss: false,
      description: 'A leathery winged creature.',
      modifierDescriptions: ['50% less damage from spade hands'],
      visibleCards: [],
      visibleScore: null,
      allRevealed: false,
      ...enemyOverrides,
    },
    shop: null,
    genie: null,
    lastHandResult: null,
    availableActions: [],
    log: [],
  };
}

describe('EnemyStatus', () => {
  test('renders enemy name and HP', () => {
    render(<EnemyStatus view={makeView()} />);
    expect(screen.getByText('Vampire Bat')).toBeInTheDocument();
    expect(screen.getByText('10/15')).toBeInTheDocument();
  });

  test('shows BOSS badge for boss enemies', () => {
    render(<EnemyStatus view={makeView({ isBoss: true, name: 'Ancient Strix' })} />);
    expect(screen.getByText('BOSS')).toBeInTheDocument();
    expect(screen.getByText('Ancient Strix')).toBeInTheDocument();
  });

  test('does not show BOSS badge for regular enemies', () => {
    render(<EnemyStatus view={makeView({ isBoss: false })} />);
    expect(screen.queryByText('BOSS')).not.toBeInTheDocument();
  });

  test('lists modifier descriptions', () => {
    render(<EnemyStatus view={makeView()} />);
    expect(screen.getByText('50% less damage from spade hands')).toBeInTheDocument();
  });

  test('shows description text', () => {
    render(<EnemyStatus view={makeView()} />);
    expect(screen.getByText('A leathery winged creature.')).toBeInTheDocument();
  });

  test('returns null when enemy is null', () => {
    const view = makeView();
    view.enemy = null;
    const { container } = render(<EnemyStatus view={view} />);
    expect(container.innerHTML).toBe('');
  });
});

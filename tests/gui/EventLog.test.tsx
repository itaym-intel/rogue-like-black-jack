// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EventLog } from '../../src/gui/components/EventLog';
import type { GameView } from '../../src/engine/types';

afterEach(cleanup);

function makeView(log: string[]): GameView {
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
    enemy: null,
    shop: null,
    genie: null,
    lastHandResult: null,
    availableActions: [],
    log,
  };
}

describe('EventLog', () => {
  test('renders log entries', () => {
    render(<EventLog view={makeView(['WIN! base:5', 'LOSS! base:2'])} />);
    expect(screen.getByText('WIN! base:5')).toBeInTheDocument();
    expect(screen.getByText('LOSS! base:2')).toBeInTheDocument();
  });

  test('shows most recent entries first', () => {
    const { container } = render(<EventLog view={makeView(['First', 'Second', 'Third'])} />);
    const items = container.querySelectorAll('li');
    expect(items[0].textContent).toBe('Third');
    expect(items[1].textContent).toBe('Second');
    expect(items[2].textContent).toBe('First');
  });

  test('handles empty log', () => {
    render(<EventLog view={makeView([])} />);
    expect(screen.getByText('No events yet...')).toBeInTheDocument();
  });

  test('renders the Event Log heading', () => {
    render(<EventLog view={makeView([])} />);
    expect(screen.getByRole('heading', { name: 'Event Log' })).toBeInTheDocument();
  });
});

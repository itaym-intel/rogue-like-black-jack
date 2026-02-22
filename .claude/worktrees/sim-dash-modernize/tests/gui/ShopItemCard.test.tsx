// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShopItemCard } from '../../src/gui/components/ShopItemCard';
import type { ShopItem } from '../../src/engine/types';

afterEach(cleanup);

function makeEquipmentItem(affordable: boolean): ShopItem {
  return {
    index: 0,
    item: {
      id: 'e1',
      name: 'Bronze Scimitar',
      slot: 'weapon',
      tier: 'bronze',
      description: '+5 Dmg, Weapon',
      cost: 30,
      modifier: { id: 'm1', name: 'Test', description: '+5 dmg', source: 'equipment' },
    },
    type: 'equipment',
    affordable,
  };
}

function makeConsumableItem(affordable: boolean): ShopItem {
  return {
    index: 1,
    item: {
      id: 'c1',
      name: 'Health Potion',
      type: 'health_potion',
      description: 'Restore 10 HP',
      cost: 15,
      effect: { type: 'health_potion', value: 10 },
    },
    type: 'consumable',
    affordable,
  };
}

describe('ShopItemCard', () => {
  test('renders item name, description, and cost', () => {
    render(<ShopItemCard shopItem={makeEquipmentItem(true)} onBuy={() => {}} />);
    expect(screen.getByText('Bronze Scimitar')).toBeInTheDocument();
    expect(screen.getByText('(+5 Dmg, Weapon)')).toBeInTheDocument();
    expect(screen.getByText('30 Gold')).toBeInTheDocument();
  });

  test('BUY button is enabled when affordable', () => {
    render(<ShopItemCard shopItem={makeEquipmentItem(true)} onBuy={() => {}} />);
    const btn = screen.getByRole('button', { name: /buy/i });
    expect(btn).not.toBeDisabled();
  });

  test('BUY button is disabled when not affordable', () => {
    render(<ShopItemCard shopItem={makeEquipmentItem(false)} onBuy={() => {}} />);
    const btn = screen.getByRole('button', { name: /buy/i });
    expect(btn).toBeDisabled();
  });

  test('calls onBuy with correct index when clicked', () => {
    const onBuy = vi.fn();
    render(<ShopItemCard shopItem={makeEquipmentItem(true)} onBuy={onBuy} />);
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));
    expect(onBuy).toHaveBeenCalledWith(0);
  });

  test('renders consumable items', () => {
    render(<ShopItemCard shopItem={makeConsumableItem(true)} onBuy={() => {}} />);
    expect(screen.getByText('Health Potion')).toBeInTheDocument();
    expect(screen.getByText('15 Gold')).toBeInTheDocument();
  });

  test('does not call onBuy when disabled button is clicked', () => {
    const onBuy = vi.fn();
    render(<ShopItemCard shopItem={makeEquipmentItem(false)} onBuy={onBuy} />);
    fireEvent.click(screen.getByRole('button', { name: /buy/i }));
    expect(onBuy).not.toHaveBeenCalled();
  });
});

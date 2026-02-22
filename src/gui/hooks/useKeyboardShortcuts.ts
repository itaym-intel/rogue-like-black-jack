import { useEffect, useState, useCallback } from 'react';
import type { GameView, PlayerAction } from '../../engine/types';

export function useKeyboardShortcuts(
  view: GameView | null,
  onAction: (action: PlayerAction) => void,
  onStartGame: () => void,
  onResetGame: () => void
) {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleKey = useCallback((e: KeyboardEvent) => {
    // Tab toggles the overlay
    if (e.key === 'Tab') {
      e.preventDefault();
      setShowOverlay(prev => !prev);
      return;
    }

    // Don't intercept if typing in an input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Start screen: Enter or N starts game
    if (!view) {
      if (e.key === 'Enter' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onStartGame();
      }
      return;
    }

    // Game Over / Victory: N starts new game
    if (view.phase === 'game_over' || view.phase === 'victory') {
      if (e.key === 'n' || e.key === 'N' || e.key === 'Enter') {
        e.preventDefault();
        onResetGame();
      }
      return;
    }

    const actions = view.availableActions;
    const hasAction = (type: string) => actions.some(a => a.type === type);

    // Continue: Space or Enter
    if ((e.key === ' ' || e.key === 'Enter') && hasAction('continue')) {
      e.preventDefault();
      onAction({ type: 'continue' });
      return;
    }

    // Combat actions
    if ((e.key === 'h' || e.key === 'H' || e.key === '1') && hasAction('hit')) {
      e.preventDefault();
      onAction({ type: 'hit' });
      return;
    }

    if ((e.key === 's' || e.key === 'S' || e.key === '2') && hasAction('stand')) {
      e.preventDefault();
      onAction({ type: 'stand' });
      return;
    }

    if ((e.key === 'd' || e.key === 'D' || e.key === '3') && hasAction('double_down')) {
      e.preventDefault();
      onAction({ type: 'double_down' });
      return;
    }

    // Shop: number keys 1-9 to buy items, Escape/Q to skip
    if (view.phase === 'shop') {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9 && view.shop?.items) {
        const item = view.shop.items[num - 1];
        if (item && item.cost <= view.player.gold) {
          e.preventDefault();
          onAction({ type: 'buy_item', itemIndex: item.index });
        }
        return;
      }
      if ((e.key === 'Escape' || e.key === 'q' || e.key === 'Q' || e.key === ' ') && hasAction('skip_shop')) {
        e.preventDefault();
        onAction({ type: 'skip_shop' });
        return;
      }
    }

    // Genie: Enter submits wish (handled by textarea)
  }, [view, onAction, onStartGame, onResetGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return { showOverlay, setShowOverlay };
}

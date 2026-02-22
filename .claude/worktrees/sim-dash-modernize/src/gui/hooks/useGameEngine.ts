import { useState, useCallback, useRef } from 'react';
import { GameEngine } from '../../engine/game.js';
import type { GameView, PlayerAction, ActionResult } from '../../engine/types.js';

export function useGameEngine() {
  const engineRef = useRef<GameEngine | null>(null);
  const [view, setView] = useState<GameView | null>(null);

  const startGame = useCallback((seed?: string) => {
    const engine = new GameEngine(seed || undefined);
    engineRef.current = engine;
    setView(engine.getView());
  }, []);

  const performAction = useCallback((action: PlayerAction): ActionResult | undefined => {
    if (!engineRef.current) return;
    const result = engineRef.current.performAction(action);
    setView(engineRef.current.getView());
    return result;
  }, []);

  const resetGame = useCallback(() => {
    engineRef.current = null;
    setView(null);
  }, []);

  return { view, startGame, performAction, resetGame };
}

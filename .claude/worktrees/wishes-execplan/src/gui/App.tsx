import { useGameEngine } from './hooks/useGameEngine';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { StartScreen } from './screens/StartScreen';
import { PreHandScreen } from './screens/PreHandScreen';
import { PlayerTurnScreen } from './screens/PlayerTurnScreen';
import { HandResultScreen } from './screens/HandResultScreen';
import { BattleResultScreen } from './screens/BattleResultScreen';
import { ShopScreen } from './screens/ShopScreen';
import { GenieScreen } from './screens/GenieScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { VictoryScreen } from './screens/VictoryScreen';
import { GameLayout } from './components/GameLayout';
import { KeybindOverlay } from './components/KeybindOverlay';
import type { GameView, PlayerAction } from '../engine/types';

export function App() {
  const { view, startGame, performAction, resetGame } = useGameEngine();

  const onAction = (action: PlayerAction) => performAction(action);
  const onStartGame = () => startGame();
  const onResetGame = () => resetGame();

  const { showOverlay, setShowOverlay } = useKeyboardShortcuts(
    view,
    onAction,
    onStartGame,
    onResetGame
  );

  return (
    <>
      {showOverlay && (
        <KeybindOverlay view={view} onClose={() => setShowOverlay(false)} />
      )}
      {renderScreen()}
    </>
  );

  function renderScreen() {
    if (!view) {
      return <StartScreen onStart={(seed) => startGame(seed)} />;
    }

    switch (view.phase) {
      case 'shop':
        return <ShopScreen view={view} onAction={onAction} />;
      case 'genie':
        return <GenieScreen view={view} onAction={onAction} />;
      case 'game_over':
        return <GameOverScreen view={view} onNewGame={onResetGame} />;
      case 'victory':
        return <VictoryScreen view={view} onNewGame={onResetGame} />;
      default:
        return (
          <GameLayout view={view} onAction={onAction}>
            {renderCombatScreen(view, onAction)}
          </GameLayout>
        );
    }
  }
}

function renderCombatScreen(view: GameView, onAction: (a: PlayerAction) => void) {
  switch (view.phase) {
    case 'pre_hand':
      return <PreHandScreen view={view} onAction={onAction} />;
    case 'player_turn':
      return <PlayerTurnScreen view={view} onAction={onAction} />;
    case 'hand_result':
      return <HandResultScreen view={view} onAction={onAction} />;
    case 'battle_result':
      return <BattleResultScreen view={view} onAction={onAction} />;
    default:
      return null;
  }
}

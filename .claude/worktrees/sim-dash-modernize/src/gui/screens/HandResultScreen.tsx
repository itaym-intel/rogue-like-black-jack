import type { GameView, PlayerAction } from '../../engine/types';
import { CardTable } from '../components/CardTable';
import { ActionButtons } from '../components/ActionButtons';

interface ScreenProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
}

export function HandResultScreen({ view, onAction }: ScreenProps) {
  return (
    <>
      <CardTable
        playerCards={view.player.hand}
        playerScore={view.player.handScore}
        dealerCards={view.enemy?.visibleCards ?? []}
        dealerScore={view.enemy?.visibleScore ?? null}
        dealerAllRevealed={view.enemy?.allRevealed ?? false}
        handResult={view.lastHandResult}
        phase={view.phase}
      />
      <ActionButtons view={view} onAction={onAction} />
    </>
  );
}

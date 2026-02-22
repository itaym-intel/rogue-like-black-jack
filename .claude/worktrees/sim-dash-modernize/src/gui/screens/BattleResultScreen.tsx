import type { GameView, PlayerAction } from '../../engine/types';
import { ActionButtons } from '../components/ActionButtons';
import styles from './BattleResultScreen.module.css';

interface ScreenProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
}

export function BattleResultScreen({ view, onAction }: ScreenProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.banner}>
        {view.enemy?.name ?? 'Enemy'} Defeated!
      </h2>
      <p className={styles.gold}>Gold Earned: +{view.player.gold}</p>
      <ActionButtons view={view} onAction={onAction} />
    </div>
  );
}

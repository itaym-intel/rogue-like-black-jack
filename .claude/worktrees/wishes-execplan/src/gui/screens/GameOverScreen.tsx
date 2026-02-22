import type { GameView } from '../../engine/types';
import styles from './GameOverScreen.module.css';

interface GameOverScreenProps {
  view: GameView;
  onNewGame: () => void;
}

export function GameOverScreen({ view, onNewGame }: GameOverScreenProps) {
  return (
    <div className={styles.container}>
      <div className={styles.overlay}>
        <h1 className={styles.title}>Game Over</h1>
        <div className={styles.stats}>
          <p>Defeated at Stage {view.stage}, Battle {view.battle}</p>
          <p>Final Gold: {view.player.gold}</p>
          <p>Wishes Earned: {view.player.wishes.length}</p>
          <p className={styles.seed}>Seed: {view.seed}</p>
        </div>
        <button className={styles.btn} onClick={onNewGame}>New Game</button>
      </div>
    </div>
  );
}

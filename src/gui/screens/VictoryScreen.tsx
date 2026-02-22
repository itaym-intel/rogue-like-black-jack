import type { GameView } from '../../engine/types';
import styles from './VictoryScreen.module.css';

interface VictoryScreenProps {
  view: GameView;
  onNewGame: () => void;
}

export function VictoryScreen({ view, onNewGame }: VictoryScreenProps) {
  return (
    <div className={styles.container}>
      <div className={styles.overlay}>
        <h1 className={styles.title}>Victory!</h1>
        <p className={styles.subtitle}>You conquered the Sultan's Palace!</p>
        <div className={styles.stats}>
          <p>Wishes Earned: {view.player.wishes.length}</p>
          <p>Final Gold: {view.player.gold}</p>
          <p className={styles.seed}>Seed: {view.seed}</p>
        </div>
        <button className={styles.btn} onClick={onNewGame}>New Game</button>
      </div>
    </div>
  );
}

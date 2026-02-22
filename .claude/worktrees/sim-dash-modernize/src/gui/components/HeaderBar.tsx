import type { GameView } from '../../engine/types';
import styles from './HeaderBar.module.css';

interface HeaderBarProps {
  view: GameView;
}

export function HeaderBar({ view }: HeaderBarProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Geniejack</h1>
      <div className={styles.info}>
        <span>Stage {view.stage}</span>
        <span className={styles.separator}>|</span>
        <span>Battle {view.battle}</span>
        <span className={styles.separator}>|</span>
        <span>Hand {view.handNumber}</span>
        {view.enemy?.isBoss && <span className={styles.boss}>BOSS</span>}
      </div>
      <span className={styles.seed}>Seed: {view.seed}</span>
    </header>
  );
}

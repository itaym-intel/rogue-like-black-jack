import type { GameView } from '../../engine/types';
import styles from './EventLog.module.css';

interface EventLogProps {
  view: GameView;
}

export function EventLog({ view }: EventLogProps) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.panelHeader}>Event Log</h2>
      <ul className={styles.list}>
        {[...view.log].reverse().map((entry, i) => (
          <li key={i} className={styles.entry}>{entry}</li>
        ))}
        {view.log.length === 0 && (
          <li className={styles.empty}>No events yet...</li>
        )}
      </ul>
    </div>
  );
}

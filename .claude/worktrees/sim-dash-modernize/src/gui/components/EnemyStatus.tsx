import type { GameView } from '../../engine/types';
import { HpBar } from './HpBar';
import styles from './EnemyStatus.module.css';

interface EnemyStatusProps {
  view: GameView;
}

export function EnemyStatus({ view }: EnemyStatusProps) {
  const enemy = view.enemy;
  if (!enemy) return null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelHeader}>Enemy Status</h2>
      <div className={styles.nameRow}>
        {enemy.isBoss && <span className={styles.boss}>BOSS</span>}
        <span className={styles.name}>{enemy.name}</span>
      </div>
      <div className={styles.section}>
        <span className={styles.label}>HP</span>
        <HpBar current={enemy.hp} max={enemy.maxHp} />
      </div>
      <p className={styles.description}>{enemy.description}</p>
      {enemy.modifierDescriptions.length > 0 && (
        <div className={styles.section}>
          <span className={styles.label}>Abilities</span>
          <ul className={styles.list}>
            {enemy.modifierDescriptions.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

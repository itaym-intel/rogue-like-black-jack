import type { Consumable } from '../../engine/types';
import styles from './ConsumablePanel.module.css';

interface ConsumablePanelProps {
  consumables: Consumable[];
  onUse: (index: number) => void;
  onClose: () => void;
}

export function ConsumablePanel({ consumables, onUse, onClose }: ConsumablePanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Use Consumable</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
      <ul className={styles.list}>
        {consumables.map((c, i) => (
          <li key={i} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.name}>{c.name}</span>
              <span className={styles.desc}>{c.description}</span>
            </div>
            <button onClick={() => onUse(i)}>Use</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

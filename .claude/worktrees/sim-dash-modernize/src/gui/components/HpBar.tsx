import styles from './HpBar.module.css';

interface HpBarProps {
  current: number;
  max: number;
}

export function HpBar({ current, max }: HpBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = pct > 60 ? 'var(--color-hp-high)' : pct > 30 ? 'var(--color-hp-mid)' : 'var(--color-hp-low)';

  return (
    <div className={styles.container}>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className={styles.text}>{current}/{max}</span>
    </div>
  );
}

import type { GameView } from '../../engine/types';
import { HpBar } from './HpBar';
import styles from './PlayerStatus.module.css';

const SLOT_ICONS: Record<string, string> = {
  weapon: '\u2694',
  helm: '\u26D1',
  armor: '\uD83D\uDEE1',
  boots: '\uD83D\uDC62',
  trinket: '\uD83D\uDC8E',
};

interface PlayerStatusProps {
  view: GameView;
  onInventory?: () => void;
}

export function PlayerStatus({ view, onInventory }: PlayerStatusProps) {
  const { player } = view;

  const consumableGroups = new Map<string, number>();
  for (const c of player.consumables) {
    consumableGroups.set(c.name, (consumableGroups.get(c.name) ?? 0) + 1);
  }

  const curses = player.wishes.filter(w => w.curse !== null);

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelHeader}>Player Status</h2>

      <div className={styles.section}>
        <span className={styles.label}>HP</span>
        <HpBar current={player.hp} max={player.maxHp} />
      </div>

      <div className={styles.section}>
        <span className={styles.label}>Gold</span>
        <span className={styles.gold}>
          <span className={styles.goldIcon}>●</span> {player.gold}
        </span>
      </div>

      {onInventory && (
        <button className={styles.inventoryBtn} onClick={onInventory} aria-label="Open inventory">
          <span className={styles.inventoryIcon}>⚔</span>
        </button>
      )}

      <div className={styles.section}>
        <span className={styles.label}>Equipment</span>
        <ul className={styles.list}>
          {(['weapon', 'helm', 'armor', 'boots', 'trinket'] as const).map(slot => {
            const eq = player.equipment[slot];
            return (
              <li key={slot} className={styles.equipSlot}>
                <span className={styles.slotIcon}>{SLOT_ICONS[slot]}</span>
                {eq ? <span>{eq.name}</span> : <span className={styles.empty}>—</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {player.consumables.length > 0 && (
        <div className={styles.section}>
          <span className={styles.label}>Consumables</span>
          <ul className={styles.list}>
            {[...consumableGroups.entries()].map(([name, count]) => (
              <li key={name}>{name}{count > 1 ? ` x${count}` : ''}</li>
            ))}
          </ul>
        </div>
      )}

      {player.activeEffects.length > 0 && (
        <div className={styles.section}>
          <span className={styles.label}>Effects</span>
          <ul className={styles.list}>
            {player.activeEffects.map(e => (
              <li key={e.id}>{e.name} ({e.remainingHands} hand{e.remainingHands !== 1 ? 's' : ''})</li>
            ))}
          </ul>
        </div>
      )}

      {curses.length > 0 && (
        <div className={styles.section}>
          <span className={styles.label}>Curses</span>
          <ul className={styles.list}>
            {curses.map((w, i) => (
              <li key={i} className={styles.curse}>{w.curse!.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

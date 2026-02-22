import type { GameView } from '../../engine/types';
import styles from './InventoryOverlay.module.css';

const SLOT_ICONS: Record<string, string> = {
  weapon: '\u2694',
  helm: '\u26D1',
  armor: '\uD83D\uDEE1',
  boots: '\uD83D\uDC62',
  trinket: '\uD83D\uDC8E',
};

interface InventoryOverlayProps {
  view: GameView;
  onClose: () => void;
}

export function InventoryOverlay({ view, onClose }: InventoryOverlayProps) {
  const { player } = view;

  const consumableGroups = new Map<string, number>();
  for (const c of player.consumables) {
    consumableGroups.set(c.name, (consumableGroups.get(c.name) ?? 0) + 1);
  }

  const curses = player.wishes.filter(w => w.curse !== null);
  const blessings = player.wishes.filter(w => w.blessing !== null);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Inventory</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.section}>
          <span className={styles.label}>Equipment</span>
          <ul className={styles.list}>
            {(['weapon', 'helm', 'armor', 'boots', 'trinket'] as const).map(slot => {
              const eq = player.equipment[slot];
              return (
                <li key={slot} className={styles.equipSlot}>
                  <span className={styles.slotIcon}>{SLOT_ICONS[slot]}</span>
                  {eq ? (
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{eq.name}</span>
                      <span className={styles.itemDesc}>{eq.description}</span>
                    </div>
                  ) : (
                    <span className={styles.empty}>Empty</span>
                  )}
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

        {blessings.length > 0 && (
          <div className={styles.section}>
            <span className={styles.label}>Wishes</span>
            <ul className={styles.list}>
              {blessings.map((w, i) => (
                <li key={i} className={styles.blessing}>{w.blessing!.name}</li>
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

        {player.activeEffects.length > 0 && (
          <div className={styles.section}>
            <span className={styles.label}>Active Effects</span>
            <ul className={styles.list}>
              {player.activeEffects.map(e => (
                <li key={e.id}>{e.name} ({e.remainingHands} hand{e.remainingHands !== 1 ? 's' : ''})</li>
              ))}
            </ul>
          </div>
        )}

        {player.consumables.length === 0 && blessings.length === 0 && curses.length === 0 && player.activeEffects.length === 0 && (
          <p className={styles.emptyNote}>No items, wishes, or effects yet.</p>
        )}
      </div>
    </div>
  );
}

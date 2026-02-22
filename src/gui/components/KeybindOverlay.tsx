import type { GameView } from '../../engine/types';
import styles from './KeybindOverlay.module.css';

interface KeybindOverlayProps {
  view: GameView | null;
  onClose: () => void;
}

interface Keybind {
  key: string;
  label: string;
  active: boolean;
}

export function KeybindOverlay({ view, onClose }: KeybindOverlayProps) {
  const binds: Keybind[] = [];

  const hasAction = (type: string) =>
    view?.availableActions.some(a => a.type === type) ?? false;

  if (!view) {
    binds.push({ key: 'Enter', label: 'New Game', active: true });
  } else if (view.phase === 'game_over' || view.phase === 'victory') {
    binds.push({ key: 'N', label: 'New Game', active: true });
  } else if (view.phase === 'shop') {
    binds.push({ key: '1-9', label: 'Buy Item', active: true });
    binds.push({ key: 'Space / Q', label: 'Skip Shop', active: true });
  } else {
    binds.push({ key: 'H / 1', label: 'Hit', active: hasAction('hit') });
    binds.push({ key: 'S / 2', label: 'Stand', active: hasAction('stand') });
    binds.push({ key: 'D / 3', label: 'Double Down', active: hasAction('double_down') });
    binds.push({ key: 'Space', label: 'Continue', active: hasAction('continue') });
  }

  binds.push({ key: 'Tab', label: 'Toggle Keys', active: true });

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Keyboard Shortcuts</h3>
        <div className={styles.grid}>
          {binds.map(b => (
            <div key={b.key} className={`${styles.row} ${b.active ? '' : styles.disabled}`}>
              <kbd className={styles.key}>{b.key}</kbd>
              <span className={styles.label}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

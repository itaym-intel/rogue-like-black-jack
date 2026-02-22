import { useState } from 'react';
import type { GameView, PlayerAction } from '../../engine/types';
import { ConsumablePanel } from './ConsumablePanel';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
}

export function ActionButtons({ view, onAction }: ActionButtonsProps) {
  const [showConsumables, setShowConsumables] = useState(false);
  const actions = view.availableActions;
  const hasHit = actions.some(a => a.type === 'hit');
  const hasStand = actions.some(a => a.type === 'stand');
  const hasDoubleDown = actions.some(a => a.type === 'double_down');
  const hasContinue = actions.some(a => a.type === 'continue');
  const hasConsumables = actions.some(a => a.type === 'use_consumable');

  return (
    <div className={styles.container}>
      {showConsumables && (
        <ConsumablePanel
          consumables={view.player.consumables}
          onUse={(idx) => {
            onAction({ type: 'use_consumable', itemIndex: idx });
            setShowConsumables(false);
          }}
          onClose={() => setShowConsumables(false)}
        />
      )}
      <div className={styles.buttons}>
        {hasHit && (
          <button onClick={() => onAction({ type: 'hit' })}>
            <span className={styles.hint}>H</span> Hit
          </button>
        )}
        {hasStand && (
          <button onClick={() => onAction({ type: 'stand' })}>
            <span className={styles.hint}>S</span> Stand
          </button>
        )}
        {hasDoubleDown && (
          <button onClick={() => onAction({ type: 'double_down' })}>
            <span className={styles.hint}>D</span> Double Down
          </button>
        )}
        {hasConsumables && view.phase === 'pre_hand' && (
          <button onClick={() => setShowConsumables(!showConsumables)}>
            <span className={styles.hint}>I</span> Use Item
          </button>
        )}
        {hasContinue && (
          <button onClick={() => onAction({ type: 'continue' })}>
            <span className={styles.hint}>&#9251;</span> Continue
          </button>
        )}
      </div>
    </div>
  );
}

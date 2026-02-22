import { useState, type ReactNode } from 'react';
import type { GameView, PlayerAction } from '../../engine/types';
import { HeaderBar } from './HeaderBar';
import { PlayerStatus } from './PlayerStatus';
import { EnemyStatus } from './EnemyStatus';
import { EventLog } from './EventLog';
import { InventoryOverlay } from './InventoryOverlay';
import styles from './GameLayout.module.css';

interface GameLayoutProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
  children: ReactNode;
}

export function GameLayout({ view, children }: GameLayoutProps) {
  const [showInventory, setShowInventory] = useState(false);

  return (
    <div className={styles.layout}>
      <HeaderBar view={view} />
      <div className={styles.content}>
        <aside className={styles.left}>
          <PlayerStatus view={view} onInventory={() => setShowInventory(true)} />
        </aside>
        <main className={styles.center}>
          {children}
        </main>
        <aside className={styles.right}>
          <EnemyStatus view={view} />
          <EventLog view={view} />
        </aside>
      </div>
      {showInventory && (
        <InventoryOverlay view={view} onClose={() => setShowInventory(false)} />
      )}
    </div>
  );
}

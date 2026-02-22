import { useState } from 'react';
import type { GameView, PlayerAction } from '../../engine/types';
import { HeaderBar } from '../components/HeaderBar';
import styles from './GenieScreen.module.css';

interface ScreenProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
}

export function GenieScreen({ view, onAction }: ScreenProps) {
  const [wishText, setWishText] = useState('');
  const genie = view.genie;
  if (!genie) return null;

  const curses = view.player.wishes.filter(w => w.curse !== null);

  return (
    <div className={styles.layout}>
      <HeaderBar view={view} />
      <div className={styles.content}>
        <aside className={styles.left}>
          <div className={styles.panel}>
            <h2 className={styles.panelHeader}>Genie Encounter</h2>
            <div className={styles.section}>
              <span className={styles.label}>Boss Defeated:</span>
              <span className={styles.bossName}>{genie.bossName}</span>
            </div>
            <div className={styles.section}>
              <span className={styles.label}>New Curse:</span>
              <span className={styles.curse}>{genie.curseDescription}</span>
            </div>
            {curses.length > 0 && (
              <div className={styles.section}>
                <span className={styles.label}>Accumulated Curses:</span>
                <ul className={styles.curseList}>
                  {curses.map((w, i) => (
                    <li key={i} className={styles.curse}>{w.curse!.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <div className={styles.center}>
          <div className={styles.genie}>
            <div className={styles.genieBody} />
            <div className={styles.lamp} />
          </div>
        </div>

        <aside className={styles.right}>
          <div className={styles.panel}>
            <h2 className={styles.panelHeader}>Enter Your Wish:</h2>
            {!genie.blessingEntered ? (
              <>
                <textarea
                  className={styles.wishInput}
                  placeholder="I wish for..."
                  value={wishText}
                  onChange={(e) => setWishText(e.target.value)}
                  rows={4}
                  aria-label="Wish input"
                />
                <button
                  disabled={wishText.trim().length === 0}
                  onClick={() => onAction({ type: 'enter_wish', text: wishText })}
                >
                  Grant Wish
                </button>
              </>
            ) : (
              <>
                <p className={styles.confirmed}>Your wish has been recorded.</p>
                <button onClick={() => onAction({ type: 'continue' })}>Continue</button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

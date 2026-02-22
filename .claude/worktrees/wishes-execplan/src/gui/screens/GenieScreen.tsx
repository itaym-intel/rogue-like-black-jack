import { useState } from 'react';
import type { GameView, PlayerAction, BlessingDefinition } from '../../engine/types';
import { HeaderBar } from '../components/HeaderBar';
import { fetchBlessing } from '../../llm/wish-api';
import { buildWishContext } from '../../llm/wish-generator';
import styles from './GenieScreen.module.css';

interface ScreenProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
}

export function GenieScreen({ view, onAction }: ScreenProps) {
  const [wishText, setWishText] = useState('');
  const [loading, setLoading] = useState(false);
  const [blessingResult, setBlessingResult] = useState<BlessingDefinition | null>(null);
  const genie = view.genie;
  if (!genie) return null;

  const curses = view.player.wishes.filter(w => w.curse !== null);

  async function handleGrantWish() {
    setLoading(true);
    const wishContext = buildWishContext(view);
    const blessingDef = await fetchBlessing(wishText, wishContext);
    setBlessingResult(blessingDef);
    setLoading(false);
  }

  function handleContinue() {
    onAction({ type: 'enter_wish', text: wishText, blessing: blessingResult ?? undefined });
  }

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
            {loading ? (
              <div className={styles.loading}>
                <p>The Genie ponders your wish...</p>
              </div>
            ) : blessingResult ? (
              <div className={styles.blessingResult}>
                <h3 className={styles.blessingName}>{blessingResult.name}</h3>
                <p className={styles.blessingDesc}>{blessingResult.description}</p>
                <ul className={styles.effectList}>
                  {blessingResult.effects.map((e, i) => (
                    <li key={i}>{e.type.replace(/_/g, ' ')}: {e.value}{e.suit ? ` (${e.suit})` : ''}</li>
                  ))}
                </ul>
                <button onClick={handleContinue}>Continue</button>
              </div>
            ) : (
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
                  onClick={handleGrantWish}
                >
                  Grant Wish
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

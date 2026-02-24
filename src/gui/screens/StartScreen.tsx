import { useState } from 'react';
import styles from './StartScreen.module.css';

interface StartScreenProps {
  onStart: (seed?: string) => void;
  onStartAtGenie?: (seed?: string) => void;
}

export function StartScreen({ onStart, onStartAtGenie }: StartScreenProps) {
  const [seed, setSeed] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.frame}>
        <h1 className={styles.title}>Geniejack</h1>
        <p className={styles.subtitle}>A Rogue-Like Blackjack Adventure</p>
        <div className={styles.form}>
          <input
            className={styles.seedInput}
            type="text"
            placeholder="Enter seed or leave blank"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            aria-label="Game seed"
          />
          <button
            className={styles.startBtn}
            onClick={() => onStart(seed || undefined)}
          >
            New Game
          </button>
          {onStartAtGenie && (
            <button
              className={styles.devBtn}
              onClick={() => onStartAtGenie(seed || undefined)}
            >
              Skip to Genie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

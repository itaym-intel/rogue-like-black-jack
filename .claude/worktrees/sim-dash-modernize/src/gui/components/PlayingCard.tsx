import type { Card } from '../../engine/types';
import styles from './PlayingCard.module.css';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

interface PlayingCardProps {
  card: Card | null;
}

export function PlayingCard({ card }: PlayingCardProps) {
  if (!card) {
    return <div className={`${styles.card} ${styles.faceDown}`} aria-label="Face-down card" />;
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <div className={`${styles.card} ${styles.faceUp}`} aria-label={`${card.rank} of ${card.suit}`}>
      <span className={`${styles.corner} ${styles.topLeft} ${isRed ? styles.red : styles.black}`}>
        {card.rank}<br />{symbol}
      </span>
      <span className={`${styles.center} ${isRed ? styles.red : styles.black}`}>
        {symbol}
      </span>
      <span className={`${styles.corner} ${styles.bottomRight} ${isRed ? styles.red : styles.black}`}>
        {card.rank}<br />{symbol}
      </span>
    </div>
  );
}

import type { Card, HandScore, HandResult, GamePhase } from '../../engine/types';
import { PlayingCard } from './PlayingCard';
import styles from './CardTable.module.css';

interface CardTableProps {
  playerCards: Card[] | null;
  playerScore: HandScore | null;
  dealerCards: (Card | null)[];
  dealerScore: number | null;
  dealerAllRevealed: boolean;
  handResult: HandResult | null;
  phase: GamePhase;
}

export function CardTable({ playerCards, playerScore, dealerCards, dealerScore, dealerAllRevealed, handResult, phase }: CardTableProps) {
  const showResult = phase === 'hand_result' && handResult;

  return (
    <div className={styles.table}>
      <div className={styles.dealerSection}>
        <span className={styles.label}>DEALER</span>
        <div className={styles.cardRow}>
          {dealerCards.map((c, i) => <PlayingCard key={i} card={c} />)}
        </div>
        <span className={styles.score}>
          SCORE: {dealerAllRevealed && dealerScore != null ? dealerScore : dealerScore != null ? `${dealerScore} + ?` : '—'}
        </span>
      </div>

      {showResult ? (
        <div className={styles.resultOverlay}>
          <span className={`${styles.resultWinner} ${handResult.winner === 'player' ? styles.win : handResult.winner === 'dealer' ? styles.loss : styles.push}`}>
            {handResult.winner === 'player' ? 'WIN!' : handResult.winner === 'dealer' ? 'LOSS!' : 'PUSH'}
          </span>
          {handResult.damageDealt > 0 && (
            <span className={styles.resultDamage}>
              {handResult.damageDealt} damage {handResult.dodged ? '(DODGED!)' : `to ${handResult.damageTarget}`}
            </span>
          )}
          <span className={styles.resultBreakdown}>{handResult.damageBreakdown}</span>
        </div>
      ) : (
        <div className={styles.divider} />
      )}

      <div className={styles.playerSection}>
        <span className={styles.label}>PLAYER</span>
        <div className={styles.cardRow}>
          {playerCards?.map((c, i) => <PlayingCard key={i} card={c} />) ?? null}
        </div>
        <span className={styles.score}>
          SCORE: {playerScore ? (
            playerScore.isBlackjack ? 'BLACKJACK!' :
            playerScore.busted ? 'BUST' :
            `${playerScore.value}${playerScore.soft ? ' (soft)' : ''}`
          ) : '—'}
        </span>
      </div>
    </div>
  );
}

import "./Scoreboard.css";

interface ScoreboardProps {
  bankroll: number;
  roundNumber: number;
  deckRemaining: number;
  previousBankroll?: number;
}

export function Scoreboard({ bankroll, roundNumber, deckRemaining, previousBankroll }: ScoreboardProps) {
  const delta = previousBankroll !== undefined ? bankroll - previousBankroll : 0;

  return (
    <div className="scoreboard">
      <div className="scoreboard__item">
        <span className="scoreboard__label">Bankroll</span>
        <span className={`scoreboard__value ${delta > 0 ? "scoreboard__value--up" : delta < 0 ? "scoreboard__value--down" : ""}`}>
          ${bankroll.toFixed(2)}
        </span>
      </div>
      <div className="scoreboard__item">
        <span className="scoreboard__label">Round</span>
        <span className="scoreboard__value">{roundNumber}</span>
      </div>
      <div className="scoreboard__item">
        <span className="scoreboard__label">Deck</span>
        <span className="scoreboard__value">{deckRemaining}</span>
      </div>
    </div>
  );
}

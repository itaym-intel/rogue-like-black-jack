import "./GameOver.css";

interface GameOverProps {
  bankroll: number;
  roundsPlayed: number;
  onNewGame: () => void;
}

export function GameOver({ bankroll, roundsPlayed, onNewGame }: GameOverProps) {
  return (
    <div className="game-over">
      <div className="game-over__card">
        <h1 className="game-over__title">Game Over</h1>
        <div className="game-over__stats">
          <p>Final Bankroll: <strong>${bankroll.toFixed(2)}</strong></p>
          <p>Rounds Played: <strong>{roundsPlayed}</strong></p>
        </div>
        <button className="game-over__btn" onClick={onNewGame}>
          New Game
        </button>
      </div>
    </div>
  );
}

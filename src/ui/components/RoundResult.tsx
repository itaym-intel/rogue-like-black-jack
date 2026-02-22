import type { RoundSummary } from "@engine/types";
import "./RoundResult.css";

interface RoundResultProps {
  summary: RoundSummary;
  onNextRound: () => void;
}

const OUTCOME_LABELS: Record<string, string> = {
  win: "WIN",
  lose: "LOSE",
  push: "PUSH",
  blackjack: "BLACKJACK!",
};

export function RoundResult({ summary, onNextRound }: RoundResultProps) {
  const delta = summary.bankrollAfterRound - summary.bankrollBeforeRound;
  const primaryOutcome = summary.handResults[0]?.outcome ?? "push";

  return (
    <div className="result-overlay">
      <div className={`result-overlay__card result-overlay__card--${primaryOutcome}`}>
        {summary.handResults.map((hr) => (
          <div key={hr.handId} className="result-overlay__hand">
            <span className={`result-overlay__outcome result-overlay__outcome--${hr.outcome}`}>
              {OUTCOME_LABELS[hr.outcome]}
            </span>
            <span className="result-overlay__detail">
              Score: {hr.score} | Wager: ${hr.wager.toFixed(2)} | Returned: ${hr.payoutReturned.toFixed(2)}
            </span>
          </div>
        ))}

        <div className="result-overlay__dealer">
          Dealer: {summary.dealerScore}{summary.dealerBusted ? " (BUST)" : ""}
        </div>

        <div className={`result-overlay__delta ${delta >= 0 ? "result-overlay__delta--positive" : "result-overlay__delta--negative"}`}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
        </div>

        <button className="result-overlay__next" onClick={onNextRound}>
          Next Round
        </button>
      </div>
    </div>
  );
}

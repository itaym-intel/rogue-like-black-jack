import { useState } from "react";
import "./BettingControls.css";

interface BettingControlsProps {
  bankroll: number;
  minBet: number;
  onPlaceBet: (wager: number) => void;
}

const CHIP_PRESETS = [1, 5, 10, 25];

export function BettingControls({ bankroll, minBet, onPlaceBet }: BettingControlsProps) {
  const [wager, setWager] = useState(minBet);

  const addChip = (amount: number) => {
    setWager((prev) => Math.min(prev + amount, bankroll));
  };

  const allIn = () => {
    setWager(bankroll);
  };

  const deal = () => {
    if (wager >= minBet && wager <= bankroll) {
      onPlaceBet(wager);
    }
  };

  const canDeal = wager >= minBet && wager <= bankroll;

  return (
    <div className="betting">
      <div className="betting__wager">
        <span className="betting__label">Wager</span>
        <input
          className="betting__input"
          type="number"
          min={minBet}
          max={bankroll}
          value={wager}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (!Number.isNaN(val)) setWager(val);
          }}
        />
      </div>
      <div className="betting__chips">
        {CHIP_PRESETS.map((amount) => (
          <button
            key={amount}
            className={`betting__chip betting__chip--${amount}`}
            onClick={() => addChip(amount)}
            disabled={wager + amount > bankroll}
          >
            +{amount}
          </button>
        ))}
        <button className="betting__chip betting__chip--allin" onClick={allIn}>
          All In
        </button>
      </div>
      <button className="betting__deal" onClick={deal} disabled={!canDeal}>
        Deal
      </button>
    </div>
  );
}

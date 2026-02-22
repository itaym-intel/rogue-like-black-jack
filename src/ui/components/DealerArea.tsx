import type { Card as CardType } from "@engine/types";
import type { GamePhase } from "@engine/types";
import { Hand } from "./Hand";
import "./DealerArea.css";

interface DealerAreaProps {
  cards: CardType[];
  score: number;
  phase: GamePhase;
}

export function DealerArea({ cards, score, phase }: DealerAreaProps) {
  const hideHoleCard = phase === "player_turn" && cards.length >= 2;

  return (
    <div className="dealer-area">
      <Hand
        cards={cards}
        score={score}
        label="Dealer"
        faceDownIndices={hideHoleCard ? [1] : []}
      />
    </div>
  );
}

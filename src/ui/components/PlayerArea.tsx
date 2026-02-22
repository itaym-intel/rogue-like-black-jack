import type { HandState } from "@engine/types";
import { Hand } from "./Hand";
import "./PlayerArea.css";

interface PlayerAreaProps {
  hands: HandState[];
  activeHandIndex: number | null;
  getHandScore: (index: number) => number;
}

export function PlayerArea({ hands, activeHandIndex, getHandScore }: PlayerAreaProps) {
  return (
    <div className="player-area">
      {hands.map((hand, i) => (
        <Hand
          key={hand.id}
          cards={hand.cards}
          score={getHandScore(i)}
          label={hands.length > 1 ? `Hand ${i + 1}` : "Player"}
          isActive={activeHandIndex === i}
          isBusted={hand.isBusted}
        />
      ))}
    </div>
  );
}

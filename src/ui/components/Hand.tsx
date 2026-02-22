import type { Card as CardType } from "@engine/types";
import { Card } from "./Card";
import "./Hand.css";

interface HandProps {
  cards: CardType[];
  score: number;
  label?: string;
  faceDownIndices?: number[];
  isActive?: boolean;
  isBusted?: boolean;
}

export function Hand({
  cards,
  score,
  label,
  faceDownIndices = [],
  isActive = false,
  isBusted = false,
}: HandProps) {
  return (
    <div className={`hand ${isActive ? "hand--active" : ""}`}>
      {label && <span className="hand__label">{label}</span>}
      <div className="hand__cards">
        {cards.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            faceDown={faceDownIndices.includes(i)}
            animationDelay={i * 120}
          />
        ))}
      </div>
      <span className={`hand__score ${isBusted ? "hand__score--bust" : ""}`}>
        {faceDownIndices.length > 0 ? "?" : score}
        {isBusted && " BUST"}
      </span>
    </div>
  );
}

import type { Card as CardType } from "@engine/types";
import { SUIT_SYMBOLS, isRedSuit, displayRank } from "../utils/card-display";
import "./Card.css";

interface CardProps {
  card: CardType;
  faceDown?: boolean;
  animationDelay?: number;
}

export function Card({ card, faceDown = false, animationDelay = 0 }: CardProps) {
  const red = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];
  const rank = displayRank(card.rank);

  return (
    <div
      className={`card ${faceDown ? "card--flipped" : ""}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="card__inner">
        <div className={`card__front ${red ? "card__front--red" : "card__front--black"}`}>
          <span className="card__corner card__corner--top">
            {rank}
            <br />
            {symbol}
          </span>
          <span className="card__center">{symbol}</span>
          <span className="card__corner card__corner--bottom">
            {rank}
            <br />
            {symbol}
          </span>
        </div>
        <div className="card__back" />
      </div>
    </div>
  );
}

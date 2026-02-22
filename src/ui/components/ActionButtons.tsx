import type { PlayerAction } from "@engine/types";
import "./ActionButtons.css";

interface ActionButtonsProps {
  availableActions: PlayerAction[];
  onAction: (action: PlayerAction) => void;
}

const ACTION_LABELS: Record<PlayerAction, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
};

const ACTION_ORDER: PlayerAction[] = ["hit", "stand", "double", "split"];

export function ActionButtons({ availableActions, onAction }: ActionButtonsProps) {
  return (
    <div className="actions">
      {ACTION_ORDER.filter((a) => availableActions.includes(a)).map((action) => (
        <button
          key={action}
          className={`actions__btn actions__btn--${action}`}
          onClick={() => onAction(action)}
        >
          {ACTION_LABELS[action]}
        </button>
      ))}
    </div>
  );
}

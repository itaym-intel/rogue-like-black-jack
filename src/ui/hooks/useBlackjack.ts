import { useCallback, useRef, useState } from "react";
import { BlackjackEngine } from "@engine/engine";
import type { GameState, PlayerAction } from "@engine/types";

export function useBlackjack(startingBankroll = 100) {
  const engineRef = useRef<BlackjackEngine>(new BlackjackEngine({ startingBankroll }));
  const [state, setState] = useState<GameState>(() => engineRef.current.getState());
  const [availableActions, setAvailableActions] = useState<PlayerAction[]>([]);
  const [dealerScore, setDealerScore] = useState(0);

  const sync = useCallback(() => {
    const s = engineRef.current.getState();
    setState(s);
    setAvailableActions(engineRef.current.getAvailableActions());
    setDealerScore(s.dealerHand.length > 0 ? engineRef.current.getDealerScore() : 0);
  }, []);

  const placeBet = useCallback(
    (wager: number) => {
      engineRef.current.startRound(wager);
      sync();
    },
    [sync],
  );

  const performAction = useCallback(
    (action: PlayerAction) => {
      engineRef.current.performAction(action);
      sync();
    },
    [sync],
  );

  const newGame = useCallback(
    (bankroll = 100) => {
      engineRef.current = new BlackjackEngine({ startingBankroll: bankroll });
      sync();
    },
    [sync],
  );

  const getHandScore = useCallback((handIndex: number) => {
    return engineRef.current.getPlayerHandScore(handIndex);
  }, []);

  return {
    state,
    availableActions,
    placeBet,
    performAction,
    newGame,
    dealerScore,
    getHandScore,
  };
}

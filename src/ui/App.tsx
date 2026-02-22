import { useState } from "react";
import { useBlackjack } from "./hooks/useBlackjack";
import { Table } from "./components/Table";
import { DealerArea } from "./components/DealerArea";
import { PlayerArea } from "./components/PlayerArea";
import { Scoreboard } from "./components/Scoreboard";
import { BettingControls } from "./components/BettingControls";
import { ActionButtons } from "./components/ActionButtons";
import { RoundResult } from "./components/RoundResult";
import { GameOver } from "./components/GameOver";

export function App() {
  const {
    state,
    availableActions,
    placeBet,
    performAction,
    newGame,
    dealerScore,
    getHandScore,
  } = useBlackjack();

  const [showResult, setShowResult] = useState(false);
  const summary = state.lastRoundSummary;

  // After a round settles, show the result overlay
  // When the user started from round_settled phase and result hasn't been dismissed
  const isSettled = state.phase === "round_settled";

  if (state.phase === "game_over") {
    return (
      <div className="app">
        <GameOver
          bankroll={state.bankroll}
          roundsPlayed={state.roundNumber}
          onNewGame={() => newGame()}
        />
      </div>
    );
  }

  const previousBankroll = summary?.bankrollBeforeRound;

  // During player_turn, show live hands from state
  if (state.phase === "player_turn") {
    return (
      <div className="app">
        <Scoreboard
          bankroll={state.bankroll}
          roundNumber={state.roundNumber}
          deckRemaining={state.deckRemaining}
          previousBankroll={previousBankroll}
        />
        <Table>
          <DealerArea
            cards={state.dealerHand}
            score={dealerScore}
            phase={state.phase}
          />
          <PlayerArea
            hands={state.playerHands}
            activeHandIndex={state.activeHandIndex}
            getHandScore={getHandScore}
          />
          <ActionButtons
            availableActions={availableActions}
            onAction={(action) => {
              performAction(action);
              setShowResult(true);
            }}
          />
        </Table>
      </div>
    );
  }

  // During round_settled, show last round's data from summary + result overlay
  if (isSettled && summary && showResult) {
    return (
      <div className="app">
        <Scoreboard
          bankroll={state.bankroll}
          roundNumber={state.roundNumber}
          deckRemaining={state.deckRemaining}
          previousBankroll={summary.bankrollBeforeRound}
        />
        <Table>
          <DealerArea
            cards={summary.dealerCards}
            score={summary.dealerScore}
            phase="round_settled"
          />
          <PlayerArea
            hands={summary.handResults.map((hr) => ({
              id: hr.handId,
              cards: hr.cards,
              wager: hr.wager,
              hasActed: true,
              isStanding: true,
              isBusted: hr.score > 21,
              isDoubled: false,
              isFromSplit: false,
            }))}
            activeHandIndex={null}
            getHandScore={(_i) => summary.handResults[_i]?.score ?? 0}
          />
          <RoundResult
            summary={summary}
            onNextRound={() => setShowResult(false)}
          />
        </Table>
      </div>
    );
  }

  // awaiting_bet or round_settled with result dismissed
  return (
    <div className="app">
      <Scoreboard
        bankroll={state.bankroll}
        roundNumber={state.roundNumber}
        deckRemaining={state.deckRemaining}
        previousBankroll={previousBankroll}
      />
      <Table>
        <div />
        <BettingControls
          bankroll={state.bankroll}
          minBet={1}
          onPlaceBet={(wager) => {
            placeBet(wager);
            setShowResult(true);
          }}
        />
        <div />
      </Table>
    </div>
  );
}

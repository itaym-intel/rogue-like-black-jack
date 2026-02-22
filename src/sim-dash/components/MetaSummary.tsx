import React from 'react';
import type { AggregateStats } from '../../sim/types.js';

export function MetaSummary({ data }: { data: AggregateStats }) {
  const best = [...data.byStrategy].sort((a, b) => b.winRate - a.winRate)[0];
  const bestStage = [...data.byStrategy].sort((a, b) => b.avgStageReached - a.avgStageReached)[0];
  const date = new Date(data.meta.timestamp).toLocaleString();
  const duration = (data.meta.durationMs / 1000).toFixed(1);

  return (
    <div className="meta-summary">
      Last sim: {date} | {data.meta.totalGames.toLocaleString()} games
      ({data.meta.seedCount} seeds x {data.meta.strategies.length} strategies)
      | Duration: {duration}s
      | Best win rate: {best?.name} ({(best?.winRate * 100).toFixed(1)}%)
      | Best progression: {bestStage?.name} (avg stage {bestStage?.avgStageReached.toFixed(2)})
    </div>
  );
}

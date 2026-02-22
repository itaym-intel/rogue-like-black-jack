import React from 'react';
import type { AggregateStats } from '../../sim/types.js';

export function MetaSummary({ data }: { data: AggregateStats }) {
  const best = [...data.byStrategy].sort((a, b) => b.winRate - a.winRate)[0];
  const bestStage = [...data.byStrategy].sort((a, b) => b.avgStageReached - a.avgStageReached)[0];
  const date = new Date(data.meta.timestamp).toLocaleString();
  const duration = (data.meta.durationMs / 1000).toFixed(1);

  return (
    <div className="meta-summary">
      <div>
        <span className="label">Last Sim</span>{' '}
        <span className="value">{date}</span>
      </div>
      <div>
        <span className="label">Games</span>{' '}
        <span className="value">
          {data.meta.totalGames.toLocaleString()} ({data.meta.seedCount} seeds x {data.meta.strategies.length} strategies)
        </span>
      </div>
      <div>
        <span className="label">Duration</span>{' '}
        <span className="value">{duration}s</span>
      </div>
      <div>
        <span className="label">Best Win Rate</span>{' '}
        <span className="value">{best?.name} ({(best?.winRate * 100).toFixed(1)}%)</span>
      </div>
      <div>
        <span className="label">Best Progression</span>{' '}
        <span className="value">{bestStage?.name} (avg stage {bestStage?.avgStageReached.toFixed(2)})</span>
      </div>
    </div>
  );
}

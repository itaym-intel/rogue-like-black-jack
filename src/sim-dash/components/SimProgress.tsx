import React from 'react';
import type { SimProgress as SimProgressType } from '../../sim/types.js';

export function SimProgress({ progress }: { progress: SimProgressType | null }) {
  if (!progress) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 12, color: 'var(--text-muted)' }}>
        No simulation in progress
      </div>
    );
  }

  const pct = progress.totalGames > 0
    ? Math.round((progress.completedGames / progress.totalGames) * 100)
    : 0;
  const barWidth = `${pct}%`;

  const eta = progress.estimatedEndTime
    ? new Date(progress.estimatedEndTime).toLocaleTimeString()
    : '...';

  return (
    <div className="panel">
      <div className="panel-title">Simulation In Progress</div>
      <div style={{ marginBottom: 8, fontSize: 13 }}>
        Strategy: <strong>{progress.currentStrategy}</strong> | {progress.completedGames}/{progress.totalGames} games | ETA: {eta}
      </div>
      <div style={{ background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', height: 20 }}>
        <div style={{
          width: barWidth,
          height: '100%',
          background: 'var(--accent-teal)',
          transition: 'width 0.5s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: '#fff',
          minWidth: 30,
        }}>
          {pct}%
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        {progress.partialResults.map(p => (
          <span key={p.name} style={{ marginRight: 12 }}>
            {p.name}: {p.completed > 0 ? Math.round(p.winCount / p.completed * 100) : 0}% win
          </span>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import type { EnemyStat } from '../../sim/types.js';

const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 12, color: '#e8dcc8' };

export function EnemyDifficulty({ stats }: { stats: EnemyStat[] }) {
  const sorted = [...stats]
    .filter(e => e.deathsTo > 0)
    .sort((a, b) => b.deathsTo - a.deathsTo);

  if (sorted.length === 0) {
    return (
      <div className="panel">
        <div className="panel-title">Enemy Difficulty (Deaths)</div>
        <div style={{ color: 'var(--text-muted)', padding: 20 }}>No death data recorded</div>
      </div>
    );
  }

  const data = sorted.map(e => ({
    name: e.name,
    deaths: e.deathsTo,
    isBoss: e.isBoss,
  }));

  return (
    <div className="panel">
      <div className="panel-title">Enemy Difficulty (Deaths)</div>
      <BarChart width={500} height={Math.max(200, data.length * 35)} data={data} layout="vertical" margin={{ left: 120, right: 40 }}>
        <XAxis type="number" tick={{ fill: '#b8b0a0', fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#e8dcc8', fontSize: 11 }} width={110} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="deaths" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isBoss ? '#8b0000' : '#3a7cbd'} />
          ))}
          <LabelList dataKey="deaths" position="right" fill="#b8b0a0" fontSize={11} />
        </Bar>
      </BarChart>
    </div>
  );
}

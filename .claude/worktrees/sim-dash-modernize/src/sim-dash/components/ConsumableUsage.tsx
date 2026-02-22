import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { ConsumableStat } from '../../sim/types.js';

const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 12, color: '#e8dcc8' };

export function ConsumableUsage({ stats }: { stats: ConsumableStat[] }) {
  const data = stats.map(c => ({
    name: c.name,
    winningRuns: c.usedInWinningRuns,
    losingRuns: c.usedInLosingRuns,
    total: c.totalUsed,
  }));

  return (
    <div className="panel">
      <div className="panel-title">Consumable Usage</div>
      <BarChart width={500} height={250} data={data} margin={{ right: 20 }}>
        <XAxis dataKey="name" tick={{ fill: '#b8b0a0', fontSize: 11 }} />
        <YAxis tick={{ fill: '#b8b0a0', fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="winningRuns" name="In Winning Runs" stackId="a" fill="#27ae60" />
        <Bar dataKey="losingRuns" name="In Losing Runs" stackId="a" fill="#c0392b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  );
}

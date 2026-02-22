import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { ConsumableStat } from '../../sim/types.js';

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
        <XAxis dataKey="name" tick={{ fill: '#a0a0b0', fontSize: 11 }} />
        <YAxis tick={{ fill: '#a0a0b0', fontSize: 11 }} />
        <Tooltip contentStyle={{ background: '#16213e', border: 'none', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="winningRuns" name="In Winning Runs" stackId="a" fill="#2ecc71" />
        <Bar dataKey="losingRuns" name="In Losing Runs" stackId="a" fill="#e74c3c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  );
}

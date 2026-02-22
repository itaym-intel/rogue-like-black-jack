import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

const COLORS = ['#d4af37', '#3a7cbd', '#c0392b', '#27ae60', '#8a6abf', '#d4882a', '#c9a84c', '#5b8a72'];

const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 11, color: '#e8dcc8' };

export function HpTimeline({ hpOverTime }: { hpOverTime: AggregateStats['hpOverTime'] }) {
  const strategies = Object.keys(hpOverTime);

  // Build data for 12 battles
  const data = Array.from({ length: 12 }, (_, i) => {
    const point: Record<string, any> = { battle: i + 1 };
    for (const strat of strategies) {
      point[strat] = Math.round(hpOverTime[strat][i] * 10) / 10;
    }
    return point;
  });

  return (
    <div className="panel">
      <div className="panel-title">Average HP Over Battles</div>
      <LineChart width={500} height={300} data={data} margin={{ right: 20 }}>
        <XAxis dataKey="battle" tick={{ fill: '#b8b0a0', fontSize: 11 }} label={{ value: 'Battle', fill: '#7a7060', fontSize: 11, position: 'bottom' }} />
        <YAxis tick={{ fill: '#b8b0a0', fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {strategies.map((strat, i) => (
          <Line key={strat} type="monotone" dataKey={strat} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </div>
  );
}

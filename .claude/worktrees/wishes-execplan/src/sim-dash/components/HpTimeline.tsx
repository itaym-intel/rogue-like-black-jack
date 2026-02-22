import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

const COLORS = ['#16a085', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#2ecc71', '#e67e22', '#e84393'];

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
        <XAxis dataKey="battle" tick={{ fill: '#a0a0b0', fontSize: 11 }} label={{ value: 'Battle', fill: '#606080', fontSize: 11, position: 'bottom' }} />
        <YAxis tick={{ fill: '#a0a0b0', fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip contentStyle={{ background: '#16213e', border: 'none', fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {strategies.map((strat, i) => (
          <Line key={strat} type="monotone" dataKey={strat} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
        ))}
      </LineChart>
    </div>
  );
}

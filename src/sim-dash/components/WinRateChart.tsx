import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import type { StrategyStats } from '../../sim/types.js';

function winRateColor(rate: number): string {
  if (rate >= 0.3) return '#27ae60';
  if (rate >= 0.15) return '#d4af37';
  return '#c0392b';
}

const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 12, color: '#e8dcc8' };

export function WinRateChart({ strategies }: { strategies: StrategyStats[] }) {
  const sorted = [...strategies].sort((a, b) => b.winRate - a.winRate);
  const chartData = sorted.map(s => ({
    name: s.name,
    winRate: Math.round(s.winRate * 1000) / 10,
  }));

  return (
    <div className="panel">
      <div className="panel-title">Win Rate by Strategy</div>
      <BarChart width={500} height={300} data={chartData} layout="vertical" margin={{ left: 140, right: 40 }}>
        <XAxis type="number" domain={[0, Math.max(50, ...chartData.map(d => d.winRate + 5))]} tick={{ fill: '#b8b0a0', fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fill: '#e8dcc8', fontSize: 11 }} width={130} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number) => [`${v}%`, 'Win Rate']}
        />
        <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={winRateColor(entry.winRate / 100)} />
          ))}
          <LabelList dataKey="winRate" position="right" fill="#e8dcc8" fontSize={11} formatter={(v: number) => `${v}%`} />
        </Bar>
      </BarChart>
    </div>
  );
}

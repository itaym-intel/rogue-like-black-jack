import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import type { StrategyStats } from '../../sim/types.js';

const COLORS = ['#16a085', '#3498db', '#9b59b6', '#e67e22', '#2ecc71', '#e84393', '#f39c12', '#e74c3c'];

function winRateColor(rate: number): string {
  if (rate >= 0.3) return '#2ecc71';
  if (rate >= 0.15) return '#f39c12';
  return '#e74c3c';
}

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
        <XAxis type="number" domain={[0, Math.max(50, ...chartData.map(d => d.winRate + 5))]} tick={{ fill: '#a0a0b0', fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fill: '#e0e0e0', fontSize: 11 }} width={130} />
        <Tooltip
          contentStyle={{ background: '#16213e', border: 'none', fontSize: 12 }}
          formatter={(v: number) => [`${v}%`, 'Win Rate']}
        />
        <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={winRateColor(entry.winRate / 100)} />
          ))}
          <LabelList dataKey="winRate" position="right" fill="#e0e0e0" fontSize={11} formatter={(v: number) => `${v}%`} />
        </Bar>
      </BarChart>
    </div>
  );
}

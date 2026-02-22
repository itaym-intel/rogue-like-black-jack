import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

export function StageFunnel({ funnel }: { funnel: AggregateStats['stageCompletionFunnel'] }) {
  const total = funnel.total || 1;
  const data = [
    { name: 'Stage 1', count: funnel.reachedStage1, pct: Math.round(funnel.reachedStage1 / total * 100) },
    { name: 'Stage 2', count: funnel.reachedStage2, pct: Math.round(funnel.reachedStage2 / total * 100) },
    { name: 'Stage 3', count: funnel.reachedStage3, pct: Math.round(funnel.reachedStage3 / total * 100) },
    { name: 'Victory', count: funnel.completed, pct: Math.round(funnel.completed / total * 100) },
  ];

  const COLORS = ['#3498db', '#2ecc71', '#f39c12', '#16a085'];

  return (
    <div className="panel">
      <div className="panel-title">Stage Completion Funnel</div>
      <BarChart width={500} height={250} data={data} margin={{ top: 10, right: 40 }}>
        <XAxis dataKey="name" tick={{ fill: '#e0e0e0', fontSize: 11 }} />
        <YAxis tick={{ fill: '#a0a0b0', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#16213e', border: 'none', fontSize: 12 }}
          formatter={(v: number, _: string, props: any) => [`${v} (${props.payload.pct}%)`, 'Runs']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <rect key={i} fill={COLORS[i]} />
          ))}
          <LabelList dataKey="pct" position="top" fill="#a0a0b0" fontSize={11} formatter={(v: number) => `${v}%`} />
        </Bar>
      </BarChart>
    </div>
  );
}

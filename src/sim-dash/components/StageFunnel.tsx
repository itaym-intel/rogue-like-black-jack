import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

const STAGE_COLORS = ['#3a7cbd', '#d4af37', '#c9a84c', '#27ae60'];
const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 12, color: '#e8dcc8' };

export function StageFunnel({ funnel }: { funnel: AggregateStats['stageCompletionFunnel'] }) {
  const total = funnel.total || 1;
  const data = [
    { name: 'Stage 1', count: funnel.reachedStage1, pct: Math.round(funnel.reachedStage1 / total * 100) },
    { name: 'Stage 2', count: funnel.reachedStage2, pct: Math.round(funnel.reachedStage2 / total * 100) },
    { name: 'Stage 3', count: funnel.reachedStage3, pct: Math.round(funnel.reachedStage3 / total * 100) },
    { name: 'Victory', count: funnel.completed, pct: Math.round(funnel.completed / total * 100) },
  ];

  return (
    <div className="panel">
      <div className="panel-title">Stage Completion Funnel</div>
      <BarChart width={500} height={250} data={data} margin={{ top: 10, right: 40 }}>
        <XAxis dataKey="name" tick={{ fill: '#e8dcc8', fontSize: 11 }} />
        <YAxis tick={{ fill: '#b8b0a0', fontSize: 11 }} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v: number, _: string, props: any) => [`${v} (${props.payload.pct}%)`, 'Runs']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={STAGE_COLORS[i]} />
          ))}
          <LabelList dataKey="pct" position="top" fill="#b8b0a0" fontSize={11} formatter={(v: number) => `${v}%`} />
        </Bar>
      </BarChart>
    </div>
  );
}

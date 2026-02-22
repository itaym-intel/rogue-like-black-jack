import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

const TIER_COLORS = {
  cloth: '#b8b0a0',
  bronze: '#d4882a',
  iron: '#8a9aad',
};

const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 12, color: '#e8dcc8' };

export function PurchaseOrder({ stats }: { stats: AggregateStats['purchaseOrderStats'] }) {
  const slots = Object.keys(stats);
  const data = slots.map(slot => {
    const tiers = stats[slot];
    const total = (tiers.cloth ?? 0) + (tiers.bronze ?? 0) + (tiers.iron ?? 0);
    return {
      slot,
      cloth: total > 0 ? Math.round(((tiers.cloth ?? 0) / total) * 100) : 0,
      bronze: total > 0 ? Math.round(((tiers.bronze ?? 0) / total) * 100) : 0,
      iron: total > 0 ? Math.round(((tiers.iron ?? 0) / total) * 100) : 0,
    };
  });

  return (
    <div className="panel">
      <div className="panel-title">First Purchase Tier by Slot</div>
      <BarChart width={500} height={250} data={data} margin={{ right: 20 }}>
        <XAxis dataKey="slot" tick={{ fill: '#b8b0a0', fontSize: 11 }} />
        <YAxis tick={{ fill: '#b8b0a0', fontSize: 11 }} unit="%" />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="cloth" name="Cloth" stackId="a" fill={TIER_COLORS.cloth} />
        <Bar dataKey="bronze" name="Bronze" stackId="a" fill={TIER_COLORS.bronze} />
        <Bar dataKey="iron" name="Iron" stackId="a" fill={TIER_COLORS.iron} radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  );
}

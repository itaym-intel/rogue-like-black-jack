import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

const BUCKETS = ['0', '1-5', '6-10', '11-15', '16-20', '21+'];

export function DamageHistogram({ distribution }: { distribution: AggregateStats['damageDistribution'] }) {
  const data = BUCKETS.map(bucket => ({
    bucket,
    playerDealt: distribution.playerDealt[bucket] ?? 0,
    enemyDealt: distribution.enemyDealt[bucket] ?? 0,
  }));

  return (
    <div className="panel">
      <div className="panel-title">Damage Distribution</div>
      <BarChart width={500} height={250} data={data} margin={{ right: 20 }}>
        <XAxis dataKey="bucket" tick={{ fill: '#a0a0b0', fontSize: 11 }} />
        <YAxis tick={{ fill: '#a0a0b0', fontSize: 11 }} />
        <Tooltip contentStyle={{ background: '#16213e', border: 'none', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="playerDealt" name="Player Dealt" fill="#3498db" radius={[4, 4, 0, 0]} />
        <Bar dataKey="enemyDealt" name="Enemy Dealt" fill="#e74c3c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </div>
  );
}

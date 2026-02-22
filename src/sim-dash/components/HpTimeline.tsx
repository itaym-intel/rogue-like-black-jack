import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine } from 'recharts';
import type { AggregateStats } from '../../sim/types.js';

const COLORS = ['#d4af37', '#3a7cbd', '#c0392b', '#27ae60', '#8a6abf', '#d4882a', '#c9a84c', '#5b8a72'];

const TOOLTIP_STYLE = { background: '#1a2744', border: '1px solid rgba(201,168,76,0.3)', fontSize: 11, color: '#e8dcc8' };

interface Props {
  hpOverTime: AggregateStats['hpOverTime'];
  hpOverTimeSampleSize?: AggregateStats['hpOverTimeSampleSize'];
  totalRuns?: number;
}

function CustomTooltip({ active, payload, label, sampleSizes, totalRuns }: any) {
  if (!active || !payload?.length) return null;
  const battleIdx = (label as number) - 1;
  return (
    <div style={TOOLTIP_STYLE as React.CSSProperties}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Battle {label}</div>
      {payload.map((entry: any) => {
        const n = sampleSizes?.[entry.name]?.[battleIdx];
        const pct = totalRuns && n != null ? Math.round((n / totalRuns) * 100) : null;
        return (
          <div key={entry.name} style={{ color: entry.color, marginBottom: 2 }}>
            {entry.name}: {entry.value} HP
            {n != null && <span style={{ color: '#7a7060' }}> ({n} runs{pct != null ? `, ${pct}%` : ''})</span>}
          </div>
        );
      })}
    </div>
  );
}

export function HpTimeline({ hpOverTime, hpOverTimeSampleSize, totalRuns }: Props) {
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
      <LineChart width={500} height={300} data={data} margin={{ right: 20, bottom: 5 }}>
        <XAxis
          dataKey="battle"
          tick={{ fill: '#b8b0a0', fontSize: 11 }}
          label={{ value: 'Battle', fill: '#7a7060', fontSize: 11, position: 'bottom' }}
        />
        <YAxis tick={{ fill: '#b8b0a0', fontSize: 11 }} domain={[0, 'auto']} />
        <Tooltip content={<CustomTooltip sampleSizes={hpOverTimeSampleSize} totalRuns={totalRuns} />} />
        <Legend wrapperStyle={{ fontSize: 10 }} />

        {/* Stage cutoff lines */}
        <ReferenceLine x={4} stroke="#d4af37" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Stage 2', fill: '#d4af37', fontSize: 10, position: 'top' }} />
        <ReferenceLine x={8} stroke="#d4af37" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Stage 3', fill: '#d4af37', fontSize: 10, position: 'top' }} />

        {strategies.map((strat, i) => (
          <Line
            key={strat}
            type="monotone"
            dataKey={strat}
            stroke={COLORS[i % COLORS.length]}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </div>
  );
}

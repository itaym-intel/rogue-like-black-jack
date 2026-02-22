import React from 'react';
import type { EquipmentStat } from '../../sim/types.js';

export function EquipmentTable({ stats }: { stats: EquipmentStat[] }) {
  const sorted = [...stats].sort((a, b) => b.purchaseRate - a.purchaseRate);

  return (
    <div className="panel">
      <div className="panel-title">Equipment Purchase Rates & Impact</div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Slot</th>
              <th>Tier</th>
              <th>Purchase Rate</th>
              <th>Win% (w/)</th>
              <th>Win% (w/o)</th>
              <th>Avg Battle</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(eq => {
              const impact = eq.winRateWhenPurchased - eq.winRateWhenNotPurchased;
              return (
                <tr key={eq.id}>
                  <td>{eq.name}</td>
                  <td>{eq.slot}</td>
                  <td>{eq.tier}</td>
                  <td>{(eq.purchaseRate * 100).toFixed(1)}%</td>
                  <td className={impact > 0 ? 'positive' : impact < 0 ? 'negative' : ''}>
                    {(eq.winRateWhenPurchased * 100).toFixed(1)}%
                  </td>
                  <td>{(eq.winRateWhenNotPurchased * 100).toFixed(1)}%</td>
                  <td>{eq.avgPurchaseBattle > 0 ? eq.avgPurchaseBattle.toFixed(1) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

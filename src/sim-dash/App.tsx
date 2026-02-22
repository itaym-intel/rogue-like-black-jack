import React from 'react';
import { useSimData } from './hooks/useSimData.js';
import { MetaSummary } from './components/MetaSummary.js';
import { WinRateChart } from './components/WinRateChart.js';
import { StageFunnel } from './components/StageFunnel.js';
import { EquipmentTable } from './components/EquipmentTable.js';
import { EnemyDifficulty } from './components/EnemyDifficulty.js';
import { HpTimeline } from './components/HpTimeline.js';
import { DamageHistogram } from './components/DamageHistogram.js';
import { ConsumableUsage } from './components/ConsumableUsage.js';
import { PurchaseOrder } from './components/PurchaseOrder.js';
import { SimProgress } from './components/SimProgress.js';

export function App() {
  const { data, progress, loading, error } = useSimData();

  if (loading) {
    return (
      <div>
        <header className="header-bar">
          <h1>Geniejack</h1>
          <span className="subtitle">Simulation Dashboard</span>
        </header>
        <div className="no-data">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <header className="header-bar">
          <h1>Geniejack</h1>
          <span className="subtitle">Simulation Dashboard</span>
        </header>
        <SimProgress progress={progress} />
        <div className="no-data">
          No simulation data found.<br />
          Run <code>npm run sim</code> to generate data.
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="header-bar">
        <h1>Geniejack</h1>
        <span className="subtitle">Simulation Dashboard</span>
      </header>
      <MetaSummary data={data} />
      <SimProgress progress={progress} />
      <div className="dashboard-grid">
        <WinRateChart strategies={data.byStrategy} />
        <StageFunnel funnel={data.stageCompletionFunnel} />
        <EnemyDifficulty stats={data.enemyStats} />
        <HpTimeline hpOverTime={data.hpOverTime} hpOverTimeSampleSize={data.hpOverTimeSampleSize} totalRuns={data.meta.seedCount} />
        <DamageHistogram distribution={data.damageDistribution} />
        <ConsumableUsage stats={data.consumableStats} />
        <PurchaseOrder stats={data.purchaseOrderStats} />
      </div>
      <div style={{ marginTop: 16 }}>
        <EquipmentTable stats={data.equipmentStats} />
      </div>
    </div>
  );
}

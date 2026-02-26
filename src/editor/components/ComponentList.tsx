import React from 'react';
import type { ComponentDefinition } from '../hooks/useComponents.js';

interface Props {
  components: ComponentDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  categoryLabel: string;
}

export function ComponentList({ components, selectedId, onSelect, categoryLabel }: Props) {
  return (
    <div className="component-list-panel">
      <div className="component-list-header">
        <h2>{categoryLabel}</h2>
        <span className="sidebar-count">{components.length}</span>
      </div>

      {components.length === 0 ? (
        <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
          No components found
        </div>
      ) : (
        components.map(comp => (
          <div
            key={comp.id}
            className={`component-list-item ${selectedId === comp.id ? 'active' : ''}`}
            onClick={() => onSelect(comp.id)}
          >
            <div className="item-name">{comp.name}</div>
            <div className="item-meta">
              {comp.equipment && (
                <span className={`tag-chip tier-${comp.equipment.tier}`}>
                  {comp.equipment.tier}
                </span>
              )}
              {comp.equipment && (
                <span className="tag-chip">{comp.equipment.slot}</span>
              )}
              {comp.equipment && (
                <span className="tag-chip">{comp.equipment.cost}g</span>
              )}
              {comp.consumable && (
                <span className="tag-chip">{comp.consumable.cost}g</span>
              )}
              {comp.combatant && (
                <span className="tag-chip">{comp.combatant.maxHp} HP</span>
              )}
              {comp.combatant?.isBoss && (
                <span className="tag-chip" style={{ color: 'var(--accent-red)', borderColor: 'rgba(192,57,43,0.3)' }}>
                  boss
                </span>
              )}
              {comp.effects.length > 0 && (
                <span className="tag-chip">{comp.effects[0].type}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

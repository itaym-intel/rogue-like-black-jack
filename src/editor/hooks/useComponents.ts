import { useState, useEffect, useCallback } from 'react';

export interface ComponentEffect {
  type: string;
  value: number;
  suit?: string;
  rank?: string;
  ranks?: string[];
  color?: 'red' | 'black';
  condition?: { type: string; value?: number; suit?: string; rank?: string };
  bonusValue?: number;
  threshold?: number;
  max?: number;
  minScore?: number;
  maxScore?: number;
  duration?: number;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  tags: string[];
  effects: ComponentEffect[];
  equipment?: {
    slot: string;
    tier: string;
    cost: number;
  };
  consumable?: {
    cost: number;
    instant: boolean;
    duration?: number;
  };
  combatant?: {
    maxHp: number;
    isBoss: boolean;
    stagePool?: number;
    equipmentIds: string[];
    curseId?: string;
  };
  rulesOverride?: Record<string, number | boolean | string | null>;
  _meta?: {
    author?: string;
    createdAt?: string;
    updatedAt?: string;
    notes?: string;
  };
}

export function useComponents() {
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/components');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComponents(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const save = useCallback(async (comp: ComponentDefinition) => {
    const res = await fetch('/api/components', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comp),
    });
    if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
    setComponents(prev => {
      const idx = prev.findIndex(c => c.id === comp.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = comp;
        return next;
      }
      return [...prev, comp];
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await fetch('/api/components', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`Delete failed: HTTP ${res.status}`);
    setComponents(prev => prev.filter(c => c.id !== id));
  }, []);

  return { components, loading, error, loadAll, save, remove };
}

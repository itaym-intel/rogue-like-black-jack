import React, { useState, useMemo, useCallback } from 'react';
import { useComponents, type ComponentDefinition } from '../hooks/useComponents.js';
import { CategorySidebar, type CategoryKey } from './CategorySidebar.js';
import { ComponentList } from './ComponentList.js';
import { ComponentForm } from './ComponentForm.js';

export function EditorApp() {
  const { components, loading, error, save, remove } = useComponents();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter components by category
  const filteredComponents = useMemo(() => {
    let filtered = components;

    if (selectedCategory !== 'all') {
      const tagFilters = CATEGORY_TAG_MAP[selectedCategory];
      if (tagFilters) {
        filtered = filtered.filter(c =>
          tagFilters.every(tag => c.tags.includes(tag))
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [components, selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: components.length };
    for (const [key, tags] of Object.entries(CATEGORY_TAG_MAP)) {
      if (tags) {
        counts[key] = components.filter(c => tags.every(t => c.tags.includes(t))).length;
      }
    }
    return counts;
  }, [components]);

  const selectedComponent = useMemo(
    () => components.find(c => c.id === selectedId) ?? null,
    [components, selectedId]
  );

  const handleSave = useCallback(async (comp: ComponentDefinition) => {
    await save(comp);
  }, [save]);

  const handleDelete = useCallback(async (id: string) => {
    await remove(id);
    setSelectedId(null);
  }, [remove]);

  const handleNew = useCallback(() => {
    const newComp: ComponentDefinition = {
      id: `new_${Date.now()}`,
      name: 'New Component',
      description: '',
      tags: categoryToDefaultTags(selectedCategory),
      effects: [],
    };
    // Add appropriate section based on category
    const tags = newComp.tags;
    if (tags.includes('equipment')) {
      newComp.equipment = { slot: 'weapon', tier: 'cloth', cost: 10 };
    } else if (tags.includes('consumable')) {
      newComp.consumable = { cost: 10, instant: true };
    } else if (tags.includes('enemy') || tags.includes('boss')) {
      newComp.combatant = { maxHp: 20, isBoss: tags.includes('boss'), equipmentIds: [] };
    }
    save(newComp).then(() => setSelectedId(newComp.id));
  }, [save, selectedCategory]);

  if (loading) {
    return (
      <>
        <header className="editor-header">
          <h1>Geniejack</h1>
          <span className="subtitle">Component Editor</span>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: 'var(--text-muted)' }}>
          Loading components...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <header className="editor-header">
          <h1>Geniejack</h1>
          <span className="subtitle">Component Editor</span>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80, color: 'var(--accent-red)' }}>
          Error: {error}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="editor-header">
        <h1>Geniejack</h1>
        <span className="subtitle">Component Editor</span>
        <div className="header-search">
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleNew}>+ New</button>
        </div>
      </header>
      <div className="editor-layout">
        <CategorySidebar
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          counts={categoryCounts}
        />
        <ComponentList
          components={filteredComponents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          categoryLabel={CATEGORY_LABELS[selectedCategory] ?? 'All'}
        />
        <div className="detail-panel">
          {selectedComponent ? (
            <ComponentForm
              key={selectedComponent.id}
              component={selectedComponent}
              allComponents={components}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ) : (
            <div className="detail-empty">
              Select a component to edit
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const CATEGORY_TAG_MAP: Record<string, string[] | null> = {
  all: null,
  weapons: ['equipment', 'weapon'],
  helms: ['equipment', 'helm'],
  armor: ['equipment', 'armor'],
  boots: ['equipment', 'boots'],
  trinkets: ['equipment', 'trinket'],
  consumables: ['consumable'],
  'stage-1-enemies': ['enemy', 'stage_1'],
  'stage-2-enemies': ['enemy', 'stage_2'],
  'stage-3-enemies': ['enemy', 'stage_3'],
  bosses: ['boss'],
  curses: ['curse'],
  rules: ['rules_override'],
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Components',
  weapons: 'Weapons',
  helms: 'Helms',
  armor: 'Armor',
  boots: 'Boots',
  trinkets: 'Trinkets',
  consumables: 'Consumables',
  'stage-1-enemies': 'Stage 1 Enemies',
  'stage-2-enemies': 'Stage 2 Enemies',
  'stage-3-enemies': 'Stage 3 Enemies',
  bosses: 'Bosses',
  curses: 'Curses',
  rules: 'Rules',
};

function categoryToDefaultTags(category: CategoryKey): string[] {
  const map: Record<string, string[]> = {
    all: [],
    weapons: ['equipment', 'weapon', 'cloth', 'damage'],
    helms: ['equipment', 'helm', 'cloth', 'defense'],
    armor: ['equipment', 'armor', 'cloth', 'defense'],
    boots: ['equipment', 'boots', 'cloth', 'utility'],
    trinkets: ['equipment', 'trinket', 'cloth', 'utility'],
    consumables: ['consumable', 'instant'],
    'stage-1-enemies': ['enemy', 'stage_1'],
    'stage-2-enemies': ['enemy', 'stage_2'],
    'stage-3-enemies': ['enemy', 'stage_3'],
    bosses: ['boss'],
    curses: ['curse'],
    rules: ['rules_override'],
  };
  return map[category] ?? [];
}

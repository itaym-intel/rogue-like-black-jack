import React from 'react';

export type CategoryKey =
  | 'all'
  | 'weapons' | 'helms' | 'armor' | 'boots' | 'trinkets'
  | 'consumables'
  | 'stage-1-enemies' | 'stage-2-enemies' | 'stage-3-enemies'
  | 'bosses' | 'curses' | 'rules';

interface SidebarSection {
  title: string;
  items: { key: CategoryKey; label: string }[];
}

const SECTIONS: SidebarSection[] = [
  {
    title: 'Equipment',
    items: [
      { key: 'weapons', label: 'Weapons' },
      { key: 'helms', label: 'Helms' },
      { key: 'armor', label: 'Armor' },
      { key: 'boots', label: 'Boots' },
      { key: 'trinkets', label: 'Trinkets' },
    ],
  },
  {
    title: 'Items',
    items: [
      { key: 'consumables', label: 'Consumables' },
    ],
  },
  {
    title: 'Enemies',
    items: [
      { key: 'stage-1-enemies', label: 'Stage 1' },
      { key: 'stage-2-enemies', label: 'Stage 2' },
      { key: 'stage-3-enemies', label: 'Stage 3' },
      { key: 'bosses', label: 'Bosses' },
    ],
  },
  {
    title: 'Other',
    items: [
      { key: 'curses', label: 'Curses' },
      { key: 'rules', label: 'Rules' },
    ],
  },
];

interface Props {
  selected: CategoryKey;
  onSelect: (key: CategoryKey) => void;
  counts: Record<string, number>;
}

export function CategorySidebar({ selected, onSelect, counts }: Props) {
  return (
    <nav className="editor-sidebar">
      <div className="sidebar-item"
        role="button"
        tabIndex={0}
        className={`sidebar-item ${selected === 'all' ? 'active' : ''}`}
        onClick={() => onSelect('all')}
        onKeyDown={e => e.key === 'Enter' && onSelect('all')}
        style={{ paddingLeft: 16 }}
      >
        <span>All</span>
        <span className="sidebar-count">{counts.all ?? 0}</span>
      </div>

      {SECTIONS.map(section => (
        <div className="sidebar-section" key={section.title}>
          <div className="sidebar-section-title">{section.title}</div>
          {section.items.map(item => (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              className={`sidebar-item ${selected === item.key ? 'active' : ''}`}
              onClick={() => onSelect(item.key)}
              onKeyDown={e => e.key === 'Enter' && onSelect(item.key)}
            >
              <span>{item.label}</span>
              <span className="sidebar-count">{counts[item.key] ?? 0}</span>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

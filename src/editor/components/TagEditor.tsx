import React, { useState, useCallback } from 'react';

const KNOWN_TAGS = [
  'equipment', 'consumable', 'enemy', 'boss', 'curse', 'blessing_template', 'rules_override',
  'weapon', 'helm', 'armor', 'boots', 'trinket',
  'cloth', 'bronze', 'iron',
  'stage_1', 'stage_2', 'stage_3',
  'damage', 'defense', 'healing', 'economy', 'utility', 'dot',
  'instant', 'duration',
];

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagEditor({ tags, onChange }: Props) {
  const [input, setInput] = useState('');

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  }, [tags, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter(t => t !== tag));
  }, [tags, onChange]);

  const unusedKnownTags = KNOWN_TAGS.filter(t => !tags.includes(t));

  return (
    <div>
      <div className="tags-container">
        {tags.map(tag => (
          <span key={tag} className="tag-editable">
            {tag}
            <span className="tag-remove" onClick={() => removeTag(tag)} title="Remove tag">x</span>
          </span>
        ))}
      </div>
      <div className="form-row" style={{ marginTop: 8 }}>
        <div className="form-field narrow">
          <select
            className="form-select"
            value=""
            onChange={e => {
              if (e.target.value) addTag(e.target.value);
            }}
          >
            <option value="">Add known tag...</option>
            {unusedKnownTags.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-field narrow">
          <input
            className="form-input"
            placeholder="Custom tag..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(input);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

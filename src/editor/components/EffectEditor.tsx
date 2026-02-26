import React, { useCallback } from 'react';
import type { ComponentEffect } from '../hooks/useComponents.js';
import {
  EFFECT_TYPES, EFFECT_TYPE_CATEGORIES, EFFECT_TYPE_MAP,
  CONDITION_TYPES, SUITS, RANKS,
} from '../hooks/effectTypes.js';

interface Props {
  effect: ComponentEffect;
  onChange: (effect: ComponentEffect) => void;
  onRemove: () => void;
}

export function EffectEditor({ effect, onChange, onRemove }: Props) {
  const meta = EFFECT_TYPE_MAP.get(effect.type);

  const updateField = useCallback(<K extends keyof ComponentEffect>(key: K, value: ComponentEffect[K]) => {
    onChange({ ...effect, [key]: value });
  }, [effect, onChange]);

  const isOutOfBounds = meta && (effect.value < meta.min || effect.value > meta.max);

  // Group effect types by category
  const groupedTypes = EFFECT_TYPE_CATEGORIES.map(cat => ({
    label: cat,
    types: EFFECT_TYPES.filter(t => t.category === cat),
  })).filter(g => g.types.length > 0);

  return (
    <div className="effect-row">
      <div className="effect-fields">
        {/* Effect type dropdown */}
        <div className="form-field effect-type-field">
          <label className="form-label">Effect Type</label>
          <select
            className="form-select"
            value={effect.type}
            onChange={e => {
              const newMeta = EFFECT_TYPE_MAP.get(e.target.value);
              onChange({
                type: e.target.value,
                value: newMeta?.min ?? 1,
              });
            }}
          >
            {groupedTypes.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.types.map(t => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Value */}
        <div className="form-field narrow">
          <label className="form-label">
            Value {meta ? `(${meta.min}–${meta.max})` : ''}
          </label>
          <input
            type="number"
            className={`form-input ${isOutOfBounds ? 'invalid' : ''}`}
            value={effect.value}
            step={meta && meta.max <= 1 ? 0.05 : 1}
            onChange={e => updateField('value', Number(e.target.value))}
          />
        </div>

        {/* Suit */}
        {meta?.needsSuit && (
          <div className="form-field narrow">
            <label className="form-label">Suit</label>
            <select
              className="form-select"
              value={effect.suit ?? 'hearts'}
              onChange={e => updateField('suit', e.target.value)}
            >
              {SUITS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Rank */}
        {meta?.needsRank && (
          <div className="form-field narrow">
            <label className="form-label">Rank</label>
            <select
              className="form-select"
              value={effect.rank ?? 'A'}
              onChange={e => updateField('rank', e.target.value)}
            >
              {RANKS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Ranks (multi) */}
        {meta?.needsRanks && (
          <div className="form-field">
            <label className="form-label">Ranks (comma-separated)</label>
            <input
              className="form-input"
              value={(effect.ranks ?? []).join(', ')}
              onChange={e => updateField(
                'ranks',
                e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              )}
            />
          </div>
        )}

        {/* Color */}
        {meta?.needsColor && (
          <div className="form-field narrow">
            <label className="form-label">Color</label>
            <select
              className="form-select"
              value={effect.color ?? 'red'}
              onChange={e => updateField('color', e.target.value as 'red' | 'black')}
            >
              <option value="red">Red</option>
              <option value="black">Black</option>
            </select>
          </div>
        )}

        {/* Bonus Value */}
        {meta?.needsBonusValue && (
          <div className="form-field narrow">
            <label className="form-label">Bonus Value</label>
            <input
              type="number"
              className="form-input"
              value={effect.bonusValue ?? 0}
              onChange={e => updateField('bonusValue', Number(e.target.value))}
            />
          </div>
        )}

        {/* Threshold */}
        {meta?.needsThreshold && (
          <div className="form-field narrow">
            <label className="form-label">Threshold</label>
            <input
              type="number"
              className="form-input"
              value={effect.threshold ?? 0}
              onChange={e => updateField('threshold', Number(e.target.value))}
            />
          </div>
        )}

        {/* Max */}
        {meta?.needsMax && (
          <div className="form-field narrow">
            <label className="form-label">Max</label>
            <input
              type="number"
              className="form-input"
              value={effect.max ?? 0}
              onChange={e => updateField('max', Number(e.target.value))}
            />
          </div>
        )}

        {/* Min/Max Score */}
        {meta?.needsMinScore && (
          <div className="form-field narrow">
            <label className="form-label">Min Score</label>
            <input
              type="number"
              className="form-input"
              value={effect.minScore ?? 0}
              onChange={e => updateField('minScore', Number(e.target.value))}
            />
          </div>
        )}
        {meta?.needsMaxScore && (
          <div className="form-field narrow">
            <label className="form-label">Max Score</label>
            <input
              type="number"
              className="form-input"
              value={effect.maxScore ?? 0}
              onChange={e => updateField('maxScore', Number(e.target.value))}
            />
          </div>
        )}

        {/* Condition */}
        {meta?.needsCondition && (
          <ConditionEditor
            condition={effect.condition}
            onChange={c => updateField('condition', c)}
          />
        )}
      </div>

      <button className="effect-remove-btn" onClick={onRemove} title="Remove effect">
        X
      </button>
    </div>
  );
}

// ── Inline Condition Editor ──

function ConditionEditor({ condition, onChange }: {
  condition?: { type: string; value?: number; suit?: string; rank?: string };
  onChange: (c: { type: string; value?: number; suit?: string; rank?: string }) => void;
}) {
  const condType = condition?.type ?? 'hand_size_lte';
  const condMeta = CONDITION_TYPES.find(c => c.type === condType);

  return (
    <>
      <div className="form-field" style={{ minWidth: 180 }}>
        <label className="form-label">Condition</label>
        <select
          className="form-select"
          value={condType}
          onChange={e => onChange({ type: e.target.value })}
        >
          {CONDITION_TYPES.map(c => (
            <option key={c.type} value={c.type}>{c.label}</option>
          ))}
        </select>
      </div>
      {'needsValue' in (condMeta ?? {}) && (condMeta as any)?.needsValue && (
        <div className="form-field narrow">
          <label className="form-label">Cond. Value</label>
          <input
            type="number"
            className="form-input"
            value={condition?.value ?? 0}
            onChange={e => onChange({ ...condition!, type: condType, value: Number(e.target.value) })}
          />
        </div>
      )}
      {'needsSuit' in (condMeta ?? {}) && (condMeta as any)?.needsSuit && (
        <div className="form-field narrow">
          <label className="form-label">Cond. Suit</label>
          <select
            className="form-select"
            value={condition?.suit ?? 'hearts'}
            onChange={e => onChange({ ...condition!, type: condType, suit: e.target.value })}
          >
            {SUITS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      {'needsRank' in (condMeta ?? {}) && (condMeta as any)?.needsRank && (
        <div className="form-field narrow">
          <label className="form-label">Cond. Rank</label>
          <select
            className="form-select"
            value={condition?.rank ?? 'A'}
            onChange={e => onChange({ ...condition!, type: condType, rank: e.target.value })}
          >
            {RANKS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

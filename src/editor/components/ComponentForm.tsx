import React, { useState, useCallback } from 'react';
import type { ComponentDefinition, ComponentEffect } from '../hooks/useComponents.js';
import { EffectEditor } from './EffectEditor.js';
import { TagEditor } from './TagEditor.js';
import { EQUIPMENT_SLOTS, EQUIPMENT_TIERS } from '../hooks/effectTypes.js';

interface Props {
  component: ComponentDefinition;
  allComponents: ComponentDefinition[];
  onSave: (comp: ComponentDefinition) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ComponentForm({ component, allComponents, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<ComponentDefinition>(() => structuredClone(component));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(component);

  const update = useCallback(<K extends keyof ComponentDefinition>(key: K, value: ComponentDefinition[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  const handleRevert = useCallback(() => {
    setDraft(structuredClone(component));
    setConfirmDelete(false);
  }, [component]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(draft.id);
  }, [confirmDelete, draft.id, onDelete]);

  // Effect CRUD
  const addEffect = useCallback(() => {
    setDraft(prev => ({
      ...prev,
      effects: [...prev.effects, { type: 'flat_damage_bonus', value: 1 }],
    }));
  }, []);

  const updateEffect = useCallback((index: number, effect: ComponentEffect) => {
    setDraft(prev => {
      const next = [...prev.effects];
      next[index] = effect;
      return { ...prev, effects: next };
    });
  }, []);

  const removeEffect = useCallback((index: number) => {
    setDraft(prev => ({
      ...prev,
      effects: prev.effects.filter((_, i) => i !== index),
    }));
  }, []);

  // Equipment section helpers
  const updateEquipment = useCallback((field: string, value: string | number) => {
    setDraft(prev => ({
      ...prev,
      equipment: { ...prev.equipment!, [field]: value },
    }));
  }, []);

  const updateConsumable = useCallback((field: string, value: string | number | boolean) => {
    setDraft(prev => ({
      ...prev,
      consumable: { ...prev.consumable!, [field]: value },
    }));
  }, []);

  const updateCombatant = useCallback((field: string, value: any) => {
    setDraft(prev => ({
      ...prev,
      combatant: { ...prev.combatant!, [field]: value },
    }));
  }, []);

  const hasEquipment = draft.tags.includes('equipment');
  const hasConsumable = draft.tags.includes('consumable');
  const hasCombatant = draft.tags.includes('enemy') || draft.tags.includes('boss');

  return (
    <div>
      {/* Identity */}
      <div className="form-section">
        <div className="form-section-title">Identity</div>
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">ID</label>
            <input
              className="form-input"
              value={draft.id}
              onChange={e => update('id', e.target.value)}
            />
          </div>
          <div className="form-field wide">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={draft.name}
              onChange={e => update('name', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={draft.description}
              onChange={e => update('description', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="form-section">
        <div className="form-section-title">Tags</div>
        <TagEditor
          tags={draft.tags}
          onChange={tags => update('tags', tags)}
        />
      </div>

      {/* Equipment Properties */}
      {hasEquipment && draft.equipment && (
        <div className="form-section">
          <div className="form-section-title">Equipment Properties</div>
          <div className="form-row">
            <div className="form-field narrow">
              <label className="form-label">Slot</label>
              <select
                className="form-select"
                value={draft.equipment.slot}
                onChange={e => updateEquipment('slot', e.target.value)}
              >
                {EQUIPMENT_SLOTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-field narrow">
              <label className="form-label">Tier</label>
              <select
                className="form-select"
                value={draft.equipment.tier}
                onChange={e => updateEquipment('tier', e.target.value)}
              >
                {EQUIPMENT_TIERS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-field narrow">
              <label className="form-label">Cost</label>
              <input
                type="number"
                className="form-input"
                value={draft.equipment.cost}
                onChange={e => updateEquipment('cost', Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Consumable Properties */}
      {hasConsumable && draft.consumable && (
        <div className="form-section">
          <div className="form-section-title">Consumable Properties</div>
          <div className="form-row">
            <div className="form-field narrow">
              <label className="form-label">Cost</label>
              <input
                type="number"
                className="form-input"
                value={draft.consumable.cost}
                onChange={e => updateConsumable('cost', Number(e.target.value))}
              />
            </div>
            <div className="form-field narrow">
              <label className="form-label">Duration</label>
              <input
                type="number"
                className="form-input"
                value={draft.consumable.duration ?? 0}
                onChange={e => updateConsumable('duration', Number(e.target.value) || undefined as any)}
              />
            </div>
          </div>
          <div className="form-checkbox-row">
            <input
              type="checkbox"
              id="instant-check"
              checked={draft.consumable.instant}
              onChange={e => updateConsumable('instant', e.target.checked)}
            />
            <label htmlFor="instant-check">Instant effect</label>
          </div>
        </div>
      )}

      {/* Combatant Properties */}
      {hasCombatant && draft.combatant && (
        <div className="form-section">
          <div className="form-section-title">Combatant Properties</div>
          <div className="form-row">
            <div className="form-field narrow">
              <label className="form-label">Max HP</label>
              <input
                type="number"
                className="form-input"
                value={draft.combatant.maxHp}
                onChange={e => updateCombatant('maxHp', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-checkbox-row">
            <input
              type="checkbox"
              id="boss-check"
              checked={draft.combatant.isBoss}
              onChange={e => updateCombatant('isBoss', e.target.checked)}
            />
            <label htmlFor="boss-check">Is Boss</label>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Equipment IDs (comma-separated)</label>
              <input
                className="form-input"
                value={draft.combatant.equipmentIds.join(', ')}
                onChange={e => updateCombatant(
                  'equipmentIds',
                  e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                )}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Curse ID</label>
              <select
                className="form-select"
                value={draft.combatant.curseId ?? ''}
                onChange={e => updateCombatant('curseId', e.target.value || undefined)}
              >
                <option value="">None</option>
                {allComponents
                  .filter(c => c.tags.includes('curse'))
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Effects */}
      <div className="form-section">
        <div className="form-section-title">Effects</div>
        {draft.effects.map((effect, idx) => (
          <EffectEditor
            key={idx}
            effect={effect}
            onChange={e => updateEffect(idx, e)}
            onRemove={() => removeEffect(idx)}
          />
        ))}
        <button className="btn btn-small btn-add-effect" onClick={addEffect}>
          + Add Effect
        </button>
      </div>

      {/* Actions */}
      <div className="form-actions">
        <button
          className="btn btn-primary"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="btn"
          disabled={!isDirty}
          onClick={handleRevert}
        >
          Revert
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDelete}
        >
          {confirmDelete ? 'Confirm Delete' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ComponentDefinition } from '../src/engine/component-schema.js';
import { getAllEquipment } from '../src/engine/equipment.js';
import { getAllConsumables } from '../src/engine/consumables.js';
import { STAGE_POOLS, getBossForStage } from '../src/engine/combatants.js';
import { UNIVERSAL_EFFECT_BOUNDS } from '../src/engine/effects.js';

const DATA_ROOT = join(__dirname, '..', 'data', 'components');

function loadJsonFile(relativePath: string): ComponentDefinition[] {
  const raw = readFileSync(join(DATA_ROOT, relativePath), 'utf-8');
  return JSON.parse(raw);
}

function loadAllComponents(): ComponentDefinition[] {
  const files = [
    'equipment/weapons.json',
    'equipment/helms.json',
    'equipment/armor.json',
    'equipment/boots.json',
    'equipment/trinkets.json',
    'consumables/consumables.json',
    'enemies/stage-1.json',
    'enemies/stage-2.json',
    'enemies/stage-3.json',
    'bosses/ancient-strix.json',
    'bosses/murad.json',
    'bosses/zahhak.json',
    'rules/defaults.json',
  ];
  const all: ComponentDefinition[] = [];
  for (const f of files) {
    all.push(...loadJsonFile(f));
  }
  return all;
}

describe('Component JSON Schema Validation', () => {
  const allComponents = loadAllComponents();

  it('every component has required fields', () => {
    for (const comp of allComponents) {
      expect(comp.id).toBeTruthy();
      expect(typeof comp.id).toBe('string');
      expect(comp.name).toBeTruthy();
      expect(typeof comp.name).toBe('string');
      expect(typeof comp.description).toBe('string');
      expect(Array.isArray(comp.tags)).toBe(true);
      expect(comp.tags.length).toBeGreaterThan(0);
      expect(Array.isArray(comp.effects)).toBe(true);
    }
  });

  it('all IDs are unique', () => {
    const ids = allComponents.map(c => c.id);
    const unique = new Set(ids);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
    expect(unique.size).toBe(ids.length);
  });

  it('every effect type is a valid universal effect type', () => {
    for (const comp of allComponents) {
      for (const effect of comp.effects) {
        expect(
          UNIVERSAL_EFFECT_BOUNDS,
          `Unknown effect type '${effect.type}' in component '${comp.id}'`
        ).toHaveProperty(effect.type);
      }
    }
  });

  it('effect values are within bounds', () => {
    for (const comp of allComponents) {
      for (const effect of comp.effects) {
        const bounds = UNIVERSAL_EFFECT_BOUNDS[effect.type];
        if (!bounds) continue;
        if (bounds.boolean) continue;
        expect(
          effect.value,
          `Effect '${effect.type}' value ${effect.value} out of bounds [${bounds.min}, ${bounds.max}] in '${comp.id}'`
        ).toBeGreaterThanOrEqual(bounds.min);
        expect(
          effect.value,
          `Effect '${effect.type}' value ${effect.value} out of bounds [${bounds.min}, ${bounds.max}] in '${comp.id}'`
        ).toBeLessThanOrEqual(bounds.max);
      }
    }
  });

  describe('Equipment coverage', () => {
    const equipmentComponents = allComponents.filter(
      c => c.tags.includes('equipment') && !c.tags.includes('enemy') && c.equipment
    );
    const currentEquipment = getAllEquipment();

    it('JSON equipment count matches current registry', () => {
      expect(equipmentComponents.length).toBe(currentEquipment.length);
    });

    it('every current equipment item has a JSON counterpart', () => {
      for (const equip of currentEquipment) {
        const found = equipmentComponents.find(c => c.id === equip.id);
        expect(found, `Missing JSON for equipment '${equip.id}' (${equip.name})`).toBeTruthy();
      }
    });

    it('JSON equipment names match current registry', () => {
      for (const equip of currentEquipment) {
        const found = equipmentComponents.find(c => c.id === equip.id);
        if (found) {
          expect(found.name).toBe(equip.name);
        }
      }
    });

    it('JSON equipment slots and tiers match', () => {
      for (const equip of currentEquipment) {
        const found = equipmentComponents.find(c => c.id === equip.id);
        if (found && found.equipment) {
          expect(found.equipment.slot).toBe(equip.slot);
          expect(found.equipment.tier).toBe(equip.tier);
          expect(found.equipment.cost).toBe(equip.cost);
        }
      }
    });
  });

  describe('Consumable coverage', () => {
    const consumableComponents = allComponents.filter(c => c.tags.includes('consumable'));
    const currentConsumables = getAllConsumables();

    it('JSON consumable count matches current registry', () => {
      expect(consumableComponents.length).toBe(currentConsumables.length);
    });

    it('every current consumable has a JSON counterpart', () => {
      for (const cons of currentConsumables) {
        const found = consumableComponents.find(c => c.id === cons.id);
        expect(found, `Missing JSON for consumable '${cons.id}' (${cons.name})`).toBeTruthy();
      }
    });

    it('JSON consumable names and costs match', () => {
      for (const cons of currentConsumables) {
        const found = consumableComponents.find(c => c.id === cons.id);
        if (found) {
          expect(found.name).toBe(cons.name);
          expect(found.consumable?.cost).toBe(cons.cost);
        }
      }
    });
  });

  describe('Enemy coverage', () => {
    const enemyComponents = allComponents.filter(
      c => (c.tags.includes('enemy') || c.tags.includes('boss')) && c.combatant
    );

    it('every stage 1 enemy has a JSON counterpart', () => {
      for (const enemy of STAGE_POOLS[0]) {
        const found = enemyComponents.find(c => c.name === enemy.name);
        expect(found, `Missing JSON for stage 1 enemy '${enemy.name}'`).toBeTruthy();
        if (found && found.combatant) {
          expect(found.combatant.maxHp).toBe(enemy.maxHp);
          expect(found.combatant.isBoss).toBe(enemy.isBoss);
        }
      }
    });

    it('every stage 2 enemy has a JSON counterpart', () => {
      for (const enemy of STAGE_POOLS[1]) {
        const found = enemyComponents.find(c => c.name === enemy.name);
        expect(found, `Missing JSON for stage 2 enemy '${enemy.name}'`).toBeTruthy();
        if (found && found.combatant) {
          expect(found.combatant.maxHp).toBe(enemy.maxHp);
          expect(found.combatant.isBoss).toBe(enemy.isBoss);
        }
      }
    });

    it('every stage 3 enemy has a JSON counterpart', () => {
      for (const enemy of STAGE_POOLS[2]) {
        const found = enemyComponents.find(c => c.name === enemy.name);
        expect(found, `Missing JSON for stage 3 enemy '${enemy.name}'`).toBeTruthy();
        if (found && found.combatant) {
          expect(found.combatant.maxHp).toBe(enemy.maxHp);
          expect(found.combatant.isBoss).toBe(enemy.isBoss);
        }
      }
    });

    it('every boss has a JSON counterpart', () => {
      for (let stage = 1; stage <= 3; stage++) {
        const boss = getBossForStage(stage);
        const found = enemyComponents.find(c => c.name === boss.name);
        expect(found, `Missing JSON for boss '${boss.name}'`).toBeTruthy();
        if (found && found.combatant) {
          expect(found.combatant.maxHp).toBe(boss.maxHp);
          expect(found.combatant.isBoss).toBe(true);
        }
      }
    });

    it('total enemy + boss count matches', () => {
      const totalInCode = STAGE_POOLS.flat().length + 3; // 18 regular + 3 bosses
      expect(enemyComponents.length).toBe(totalInCode);
    });

    it('enemy equipment references exist', () => {
      for (const comp of enemyComponents) {
        if (comp.combatant) {
          for (const equipId of comp.combatant.equipmentIds) {
            const equipComp = allComponents.find(c => c.id === equipId);
            expect(equipComp, `Missing equipment '${equipId}' referenced by '${comp.id}'`).toBeTruthy();
          }
          if (comp.combatant.curseId) {
            const curseComp = allComponents.find(c => c.id === comp.combatant!.curseId);
            expect(curseComp, `Missing curse '${comp.combatant.curseId}' referenced by '${comp.id}'`).toBeTruthy();
          }
        }
      }
    });
  });

  describe('Curse coverage', () => {
    const curseComponents = allComponents.filter(c => c.tags.includes('curse'));

    it('3 curses exist (one per boss)', () => {
      expect(curseComponents.length).toBe(3);
    });

    it('each curse has at least one effect', () => {
      for (const curse of curseComponents) {
        expect(curse.effects.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Rules coverage', () => {
    const rulesComponents = allComponents.filter(c => c.tags.includes('rules_override'));

    it('global defaults exist', () => {
      expect(rulesComponents.length).toBeGreaterThanOrEqual(1);
      const defaults = rulesComponents.find(c => c.id === 'rules_global_defaults');
      expect(defaults).toBeTruthy();
    });

    it('global defaults cover key rules', () => {
      const defaults = rulesComponents.find(c => c.id === 'rules_global_defaults')!;
      const overrides = defaults.rulesOverride!;
      expect(overrides['scoring.bustThreshold']).toBe(21);
      expect(overrides['dealer.standsOn']).toBe(17);
      expect(overrides['health.playerMaxHp']).toBe(50);
      expect(overrides['progression.totalStages']).toBe(3);
    });
  });

  describe('Tag consistency', () => {
    it('equipment components have slot tags', () => {
      const equipComps = allComponents.filter(c => c.equipment);
      for (const comp of equipComps) {
        const slot = comp.equipment!.slot;
        expect(
          comp.tags.includes(slot),
          `Equipment '${comp.id}' missing slot tag '${slot}'`
        ).toBe(true);
      }
    });

    it('player equipment has tier tags', () => {
      const playerEquip = allComponents.filter(
        c => c.equipment && !c.tags.includes('enemy')
      );
      for (const comp of playerEquip) {
        const tier = comp.equipment!.tier;
        expect(
          comp.tags.includes(tier),
          `Player equipment '${comp.id}' missing tier tag '${tier}'`
        ).toBe(true);
      }
    });

    it('enemy components have stage tags', () => {
      const enemyComps = allComponents.filter(c => c.combatant);
      for (const comp of enemyComps) {
        const stage = comp.combatant!.stagePool;
        if (stage) {
          expect(
            comp.tags.includes(`stage_${stage}`),
            `Enemy '${comp.id}' missing stage tag 'stage_${stage}'`
          ).toBe(true);
        }
      }
    });
  });
});

import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../src/engine/rng.js';

describe('SeededRNG', () => {
  it('same seed produces identical sequence', () => {
    const rng1 = new SeededRNG('test-seed');
    const rng2 = new SeededRNG('test-seed');
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new SeededRNG('seed-a');
    const rng2 = new SeededRNG('seed-b');
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (rng1.next() !== rng2.next()) allSame = false;
    }
    expect(allSame).toBe(false);
  });

  it('numeric seeds work correctly', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);
    for (let i = 0; i < 50; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new SeededRNG('bounds-test');
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('nextInt returns values within range', () => {
    const rng = new SeededRNG('int-test');
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    }
  });

  it('shuffle is deterministic with same seed', () => {
    const rng1 = new SeededRNG('shuffle-test');
    const rng2 = new SeededRNG('shuffle-test');
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled1 = rng1.shuffle(arr);
    const shuffled2 = rng2.shuffle(arr);
    expect(shuffled1).toEqual(shuffled2);
  });

  it('shuffle does not mutate the input array', () => {
    const rng = new SeededRNG('no-mutate');
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    rng.shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('fromState correctly restores position', () => {
    const rng1 = new SeededRNG('restore-test');
    // Advance 50 times
    for (let i = 0; i < 50; i++) {
      rng1.next();
    }
    const state = rng1.getState();
    const rng2 = SeededRNG.fromState(state);

    // Both should produce same values from this point
    for (let i = 0; i < 50; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('getState returns correct seed and callCount', () => {
    const rng = new SeededRNG('state-test');
    rng.next();
    rng.next();
    rng.next();
    const state = rng.getState();
    expect(state.seed).toBe('state-test');
    expect(state.callCount).toBe(3);
  });
});

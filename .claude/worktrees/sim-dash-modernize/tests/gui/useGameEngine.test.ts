// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from '../../src/gui/hooks/useGameEngine';

describe('useGameEngine', () => {
  test('initial state has null view', () => {
    const { result } = renderHook(() => useGameEngine());
    expect(result.current.view).toBeNull();
  });

  test('startGame initializes with a view in pre_hand phase', () => {
    const { result } = renderHook(() => useGameEngine());
    act(() => {
      result.current.startGame('test-seed');
    });
    expect(result.current.view).not.toBeNull();
    expect(result.current.view!.phase).toBe('pre_hand');
    expect(result.current.view!.seed).toBe('test-seed');
  });

  test('performAction updates the view', () => {
    const { result } = renderHook(() => useGameEngine());
    act(() => {
      result.current.startGame('test-seed');
    });
    const initialHp = result.current.view!.player.hp;

    // Continue to deal cards
    act(() => {
      result.current.performAction({ type: 'continue' });
    });
    expect(result.current.view!.phase).toBe('player_turn');
    expect(result.current.view!.player.hand).not.toBeNull();
    expect(result.current.view!.player.hand!.length).toBeGreaterThanOrEqual(2);
  });

  test('engine state persists across re-renders', () => {
    const { result, rerender } = renderHook(() => useGameEngine());
    act(() => {
      result.current.startGame('persist-test');
    });
    const phase1 = result.current.view!.phase;
    rerender();
    expect(result.current.view!.phase).toBe(phase1);
    expect(result.current.view!.seed).toBe('persist-test');
  });

  test('startGame without seed generates a seed', () => {
    const { result } = renderHook(() => useGameEngine());
    act(() => {
      result.current.startGame();
    });
    expect(result.current.view).not.toBeNull();
    expect(result.current.view!.seed).toBeTruthy();
  });

  test('performAction returns ActionResult', () => {
    const { result } = renderHook(() => useGameEngine());
    act(() => {
      result.current.startGame('result-test');
    });
    let actionResult: ReturnType<typeof result.current.performAction>;
    act(() => {
      actionResult = result.current.performAction({ type: 'continue' });
    });
    expect(actionResult!).toBeDefined();
    expect(actionResult!.success).toBe(true);
    expect(actionResult!.newPhase).toBe('player_turn');
  });

  test('resetGame clears the view back to null', () => {
    const { result } = renderHook(() => useGameEngine());
    act(() => {
      result.current.startGame('reset-test');
    });
    expect(result.current.view).not.toBeNull();

    act(() => {
      result.current.resetGame();
    });
    expect(result.current.view).toBeNull();
  });
});

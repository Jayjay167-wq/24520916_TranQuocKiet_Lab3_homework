// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeRemainingMs, TICK_MS, usePubgAirdropTimer } from './usePubgAirdropTimer';

const T0 = 1_800_000_000_000;

function setup(target: number, offset?: number) {
  return renderHook(
    (props: { target: number; offset?: number }) =>
      usePubgAirdropTimer(props.target, props.offset),
    { initialProps: { target, offset } },
  );
}

function tick(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function fireVisibilityChange(): void {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('computeRemainingMs', () => {
  it('is target - (now + offset)', () => {
    expect(computeRemainingMs(10_000, 0, 4_000)).toBe(6_000);
    expect(computeRemainingMs(10_000, 1_000, 4_000)).toBe(5_000);
    expect(computeRemainingMs(10_000, -1_000, 4_000)).toBe(7_000);
  });

  it('clamps at 0 and treats non-finite values as live', () => {
    expect(computeRemainingMs(1_000, 0, 5_000)).toBe(0);
    expect(computeRemainingMs(Number.NaN, 0, 5_000)).toBe(0);
  });
});

describe('usePubgAirdropTimer', () => {
  it('starts at target - now', () => {
    const { result } = setup(T0 + 10_000);
    expect(result.current).toEqual({ remainingMs: 10_000, isLive: false });
  });

  it('applies the server offset (server clock ahead of the client)', () => {
    const { result } = setup(T0 + 10_000, 4_000);
    expect(result.current.remainingMs).toBe(6_000);
  });

  it('applies a negative offset (server clock behind the client)', () => {
    const { result } = setup(T0 + 10_000, -3_000);
    expect(result.current.remainingMs).toBe(13_000);
  });

  it('is live immediately, and never negative, when the target has passed', () => {
    const { result } = setup(T0 - 5_000);
    expect(result.current).toEqual({ remainingMs: 0, isLive: true });
    tick(1_000);
    expect(result.current.remainingMs).toBe(0);
  });

  it('refreshes every 200 ms, not sooner', () => {
    expect(TICK_MS).toBe(200);
    const { result } = setup(T0 + 10_000);

    tick(199);
    expect(result.current.remainingMs).toBe(10_000);

    tick(1);
    expect(result.current.remainingMs).toBe(9_800);

    tick(200);
    expect(result.current.remainingMs).toBe(9_600);
  });

  it('counts down to zero, flips isLive, and stops ticking', () => {
    const { result } = setup(T0 + 450);

    tick(400);
    expect(result.current).toEqual({ remainingMs: 50, isLive: false });

    tick(200);
    expect(result.current).toEqual({ remainingMs: 0, isLive: true });

    const timersWhenLive = vi.getTimerCount();
    tick(2_000);
    expect(result.current.remainingMs).toBe(0);
    expect(vi.getTimerCount()).toBe(timersWhenLive);
  });

  it('derives each tick from the wall clock instead of subtracting 200', () => {
    const { result } = setup(T0 + 10_000);

    // The clock jumps 3 s (e.g. a throttled background tab); the next tick
    // must reflect the real elapsed time, not "previous - 200".
    vi.setSystemTime(T0 + 3_000);
    tick(200);

    expect(result.current.remainingMs).toBe(6_800);
  });

  it('resyncs immediately on visibilitychange instead of waiting for a tick', () => {
    const { result } = setup(T0 + 10_000);

    // A hidden tab: the wall clock jumps 5 s but no timer fires.
    vi.setSystemTime(T0 + 5_000);
    expect(result.current.remainingMs).toBe(10_000);

    fireVisibilityChange();
    expect(result.current.remainingMs).toBe(5_000);
  });

  it('restarts with the new target or offset right away', () => {
    const { result, rerender } = setup(T0 + 10_000);

    rerender({ target: T0 + 3_000, offset: undefined });
    expect(result.current.remainingMs).toBe(3_000);

    rerender({ target: T0 + 3_000, offset: 1_000 });
    expect(result.current.remainingMs).toBe(2_000);
  });

  it('goes live and resumes ticking correctly when given a new future target', () => {
    const { result, rerender } = setup(T0 - 1);
    expect(result.current.isLive).toBe(true);

    rerender({ target: T0 + 1_000, offset: undefined });
    expect(result.current).toEqual({ remainingMs: 1_000, isLive: false });

    tick(200);
    expect(result.current.remainingMs).toBe(800);
  });

  describe('cleanup', () => {
    it('removes the interval on unmount', () => {
      const { unmount } = setup(T0 + 10_000);
      const timersBefore = vi.getTimerCount();

      unmount();

      expect(vi.getTimerCount()).toBeLessThan(timersBefore);
    });

    it('removes the same visibilitychange listener it added', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = setup(T0 + 10_000);

      const added = addSpy.mock.calls.find(([type]) => type === 'visibilitychange')?.[1];
      expect(added).toBeDefined();

      unmount();
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', added);
    });

    it('stops updating after unmount', () => {
      const { result, unmount } = setup(T0 + 10_000);
      tick(200);
      const last = result.current.remainingMs;

      unmount();
      vi.advanceTimersByTime(1_000);
      fireVisibilityChange();

      expect(result.current.remainingMs).toBe(last);
    });

    it('replaces the old interval and listener when inputs change', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const { result, rerender } = setup(T0 + 10_000);
      const timersBefore = vi.getTimerCount();

      rerender({ target: T0 + 20_000, offset: undefined });

      expect(
        removeSpy.mock.calls.filter(([type]) => type === 'visibilitychange'),
      ).toHaveLength(1);
      // The old interval was cleared and exactly one new one started.
      expect(vi.getTimerCount()).toBe(timersBefore);

      tick(200);
      expect(result.current.remainingMs).toBe(19_800);
    });
  });
});

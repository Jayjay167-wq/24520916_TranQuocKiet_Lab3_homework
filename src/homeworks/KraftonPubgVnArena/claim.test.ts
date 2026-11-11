import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaimHttpError, createSimulatedClaimApi, isConflictError } from './claim';

describe('isConflictError', () => {
  it('is true only for status 409', () => {
    expect(isConflictError(new ClaimHttpError(409))).toBe(true);
    expect(isConflictError({ status: 409 })).toBe(true);
    expect(isConflictError(new ClaimHttpError(500))).toBe(false);
    expect(isConflictError(new Error('409'))).toBe(false);
    expect(isConflictError(null)).toBe(false);
    expect(isConflictError('409')).toBe(false);
  });
});

describe('createSimulatedClaimApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the simulated latency', async () => {
    const api = createSimulatedClaimApi({ latencyMs: 100 });
    const done = vi.fn();
    void api('a').then(done);

    await vi.advanceTimersByTimeAsync(99);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('rejects every Nth call with HTTP 409', async () => {
    const api = createSimulatedClaimApi({ latencyMs: 50, conflictEvery: 2 });

    const first = api('a');
    const second = api('a');
    const third = api('a');
    const conflict = expect(second).rejects.toMatchObject({ status: 409 });
    await vi.advanceTimersByTimeAsync(50);

    await expect(first).resolves.toBeUndefined();
    await conflict;
    await expect(third).resolves.toBeUndefined();
  });

  it('never conflicts by default', async () => {
    const api = createSimulatedClaimApi({ latencyMs: 10 });
    const calls = [api('a'), api('a'), api('a'), api('a')];
    await vi.advanceTimersByTimeAsync(10);
    await expect(Promise.all(calls)).resolves.toHaveLength(4);
  });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClaimHttpError, type ClaimOutcome } from './claim';
import { useCrateClaim } from './useCrateClaim';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const CRATES = [
  { id: 'a', stock: 5 },
  { id: 'b', stock: 3 },
];

/** An API whose calls stay pending until the test settles them. */
function controllableApi() {
  const calls: Deferred[] = [];
  const api = vi.fn(() => {
    const d = deferred();
    calls.push(d);
    return d.promise;
  });
  return { api, calls };
}

afterEach(cleanup);

describe('useCrateClaim', () => {
  it('decrements stock optimistically, before the server answers', () => {
    const { api } = controllableApi();
    const { result } = renderHook(() => useCrateClaim(CRATES, api));

    act(() => {
      void result.current.claim('a');
    });

    expect(result.current.stocks.a).toBe(4);
    expect(result.current.statuses.a).toBe('pending');
    expect(result.current.pendingIds.has('a')).toBe(true);
  });

  it('ignores duplicate clicks while a claim is in flight (double click)', async () => {
    const { api, calls } = controllableApi();
    const { result } = renderHook(() => useCrateClaim(CRATES, api));

    let first!: Promise<ClaimOutcome>;
    let second!: Promise<ClaimOutcome>;
    let third!: Promise<ClaimOutcome>;
    act(() => {
      // Same tick: React has not re-rendered, only the ref lock can stop these.
      first = result.current.claim('a');
      second = result.current.claim('a');
      third = result.current.claim('a');
    });

    expect(api).toHaveBeenCalledTimes(1);
    expect(await second).toBe('locked');
    expect(await third).toBe('locked');
    expect(result.current.stocks.a).toBe(4); // decremented once, not three times

    await act(async () => {
      calls[0].resolve();
      await first;
    });
    expect(await first).toBe('claimed');
    expect(result.current.stocks.a).toBe(4);
    expect(result.current.statuses.a).toBe('claimed');
  });

  it('rolls stock back when the server answers HTTP 409', async () => {
    const { api, calls } = controllableApi();
    const { result } = renderHook(() => useCrateClaim(CRATES, api));

    let outcome!: Promise<ClaimOutcome>;
    act(() => {
      outcome = result.current.claim('a');
    });
    expect(result.current.stocks.a).toBe(4);

    await act(async () => {
      calls[0].reject(new ClaimHttpError(409));
      await outcome;
    });

    expect(await outcome).toBe('conflict');
    expect(result.current.stocks.a).toBe(5); // restored
    expect(result.current.statuses.a).toBe('conflict');
  });

  it('does NOT roll back for non-409 failures', async () => {
    const { api, calls } = controllableApi();
    const { result } = renderHook(() => useCrateClaim(CRATES, api));

    let outcome!: Promise<ClaimOutcome>;
    act(() => {
      outcome = result.current.claim('a');
    });
    await act(async () => {
      calls[0].reject(new ClaimHttpError(500));
      await outcome;
    });

    expect(await outcome).toBe('error');
    expect(result.current.stocks.a).toBe(4);
    expect(result.current.statuses.a).toBe('error');
  });

  describe('lock release (finally)', () => {
    it.each<[string, (d: Deferred) => void]>([
      ['success', (d: Deferred) => d.resolve()],
      ['HTTP 409', (d: Deferred) => d.reject(new ClaimHttpError(409))],
      ['HTTP 500', (d: Deferred) => d.reject(new ClaimHttpError(500))],
      ['a thrown non-Error value', (d: Deferred) => d.reject('network down')],
    ])('releases the lock after %s so the crate can be claimed again', async (_name, settle) => {
      const { api, calls } = controllableApi();
      const { result } = renderHook(() => useCrateClaim(CRATES, api));

      let first!: Promise<ClaimOutcome>;
      act(() => {
        first = result.current.claim('a');
      });
      await act(async () => {
        settle(calls[0]);
        await first;
      });
      expect(result.current.pendingIds.has('a')).toBe(false);

      let second!: Promise<ClaimOutcome>;
      act(() => {
        second = result.current.claim('a');
      });
      expect(api).toHaveBeenCalledTimes(2); // not locked out
      await act(async () => {
        calls[1].resolve();
        await second;
      });
    });
  });

  it('locks are per crate: different crates can be claimed concurrently', async () => {
    const { api, calls } = controllableApi();
    const { result } = renderHook(() => useCrateClaim(CRATES, api));

    let a!: Promise<ClaimOutcome>;
    let b!: Promise<ClaimOutcome>;
    act(() => {
      a = result.current.claim('a');
      b = result.current.claim('b');
    });

    expect(api).toHaveBeenCalledTimes(2);
    expect(api).toHaveBeenNthCalledWith(1, 'a');
    expect(api).toHaveBeenNthCalledWith(2, 'b');
    expect(result.current.stocks).toEqual({ a: 4, b: 2 });

    await act(async () => {
      calls.forEach((d) => d.resolve());
      await Promise.all([a, b]);
    });
  });

  describe('stock never goes below 0', () => {
    it('refuses to claim sold-out crates without calling the API', async () => {
      const { api } = controllableApi();
      const { result } = renderHook(() => useCrateClaim([{ id: 'z', stock: 0 }], api));

      let outcome!: ClaimOutcome;
      await act(async () => {
        outcome = await result.current.claim('z');
      });

      expect(outcome).toBe('soldOut');
      expect(api).not.toHaveBeenCalled();
      expect(result.current.stocks.z).toBe(0);
      expect(result.current.statuses.z).toBe('soldOut');
    });

    it('stops at 0 after claiming the last unit, then reports soldOut', async () => {
      const api = vi.fn(() => Promise.resolve());
      const { result } = renderHook(() => useCrateClaim([{ id: 'z', stock: 1 }], api));

      await act(async () => {
        expect(await result.current.claim('z')).toBe('claimed');
      });
      expect(result.current.stocks.z).toBe(0);

      await act(async () => {
        expect(await result.current.claim('z')).toBe('soldOut');
        expect(await result.current.claim('z')).toBe('soldOut');
      });
      expect(result.current.stocks.z).toBe(0);
      expect(api).toHaveBeenCalledTimes(1);
    });

    it('clamps a negative initial stock to 0', () => {
      const { result } = renderHook(() => useCrateClaim([{ id: 'z', stock: -5 }], vi.fn()));
      expect(result.current.stocks.z).toBe(0);
    });

    it('a 409 on the last unit restores it to 1, not above', async () => {
      const { api, calls } = controllableApi();
      const { result } = renderHook(() => useCrateClaim([{ id: 'z', stock: 1 }], api));

      let outcome!: Promise<ClaimOutcome>;
      act(() => {
        outcome = result.current.claim('z');
      });
      expect(result.current.stocks.z).toBe(0);

      await act(async () => {
        calls[0].reject(new ClaimHttpError(409));
        await outcome;
      });
      expect(result.current.stocks.z).toBe(1);
    });
  });

  it('returns unknownCrate for an id it was not given', async () => {
    const api = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useCrateClaim(CRATES, api));

    let outcome!: ClaimOutcome;
    await act(async () => {
      outcome = await result.current.claim('nope');
    });

    expect(outcome).toBe('unknownCrate');
    expect(api).not.toHaveBeenCalled();
  });

  it('keeps `claim` referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useCrateClaim(CRATES, vi.fn()));
    const first = result.current.claim;
    rerender();
    expect(result.current.claim).toBe(first);
  });

  it('does not touch state after unmount', async () => {
    const { api, calls } = controllableApi();
    const { result, unmount } = renderHook(() => useCrateClaim(CRATES, api));

    let outcome!: Promise<ClaimOutcome>;
    act(() => {
      outcome = result.current.claim('a');
    });
    unmount();
    calls[0].resolve();

    await expect(outcome).resolves.toBe('claimed');
  });
});

import { useEffect, useState } from 'react';

/** Refresh period for the countdown. */
export const TICK_MS = 200;

export interface AirdropTimer {
  /** Milliseconds until the drop, never negative. */
  remainingMs: number;
  /** True once the countdown has reached zero. */
  isLive: boolean;
}

/**
 * Remaining time against the *server* clock: `serverOffsetMs` is
 * `serverNow - clientNow`, so server time is `Date.now() + serverOffsetMs`.
 * Clamped at 0; a non-finite input counts as already live.
 */
export function computeRemainingMs(
  targetEpochMs: number,
  serverOffsetMs: number = 0,
  clientNowMs: number = Date.now(),
): number {
  const remaining = targetEpochMs - (clientNowMs + serverOffsetMs);
  return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
}

/**
 * Anti-drift countdown to an airdrop.
 *
 * Every tick recomputes the value from the wall clock instead of subtracting
 * 200 each time, so throttled timers (background tabs, busy main thread)
 * never accumulate error. When the tab becomes visible again the value is
 * resynced immediately rather than waiting for the next tick.
 *
 * The interval stops once the countdown reaches zero. The interval and the
 * `visibilitychange` listener are removed on unmount and whenever the inputs
 * change (the effect then restarts with the new target/offset).
 */
export function usePubgAirdropTimer(targetEpochMs: number, serverOffsetMs: number = 0): AirdropTimer {
  const [remainingMs, setRemainingMs] = useState(() =>
    computeRemainingMs(targetEpochMs, serverOffsetMs),
  );

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const stopTicking = () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const sync = () => {
      const remaining = computeRemainingMs(targetEpochMs, serverOffsetMs);
      setRemainingMs(remaining);
      if (remaining === 0) stopTicking();
    };

    // Resync right away: the inputs may have just changed.
    const initial = computeRemainingMs(targetEpochMs, serverOffsetMs);
    setRemainingMs(initial);
    if (initial > 0) intervalId = setInterval(sync, TICK_MS);

    document.addEventListener('visibilitychange', sync);
    return () => {
      stopTicking();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [targetEpochMs, serverOffsetMs]);

  return { remainingMs, isLive: remainingMs === 0 };
}

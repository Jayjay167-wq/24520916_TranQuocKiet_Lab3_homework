import type { RecordedNote } from './recorder';

export type ReplaySpeed = 0.5 | 1 | 2;
export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [0.5, 1, 2];

export type ReplayResult = 'completed' | 'aborted';

export interface ReplayHandlers {
  noteOn: (midi: number, freqHz: number) => void;
  noteOff: (midi: number) => void;
}

export interface ReplayOptions {
  /** Clock in ms; defaults to performance.now. Injectable for tests. */
  now?: () => number;
}

export interface ScheduledEvent {
  /** When to fire, in ms from the start of the replay (already speed-scaled). */
  atMs: number;
  type: 'on' | 'off';
  note: RecordedNote;
}

/**
 * Turn recorded notes into a time-ordered event list. 2x halves every time,
 * 0.5x doubles it. Ordering at equal times: a note's `on` always precedes its
 * own `off`, and an earlier note's `off` precedes a later note's `on`.
 */
export function scheduleEvents(notes: readonly RecordedNote[], speed: ReplaySpeed): ScheduledEvent[] {
  let onsetMs = 0;
  const ranked: { event: ScheduledEvent; rank: number }[] = [];

  notes.forEach((note, i) => {
    onsetMs += note.deltaMs / speed;
    ranked.push({ event: { atMs: onsetMs, type: 'on', note }, rank: 2 * i + 1 });
    ranked.push({ event: { atMs: onsetMs + note.durationMs / speed, type: 'off', note }, rank: 2 * i + 2 });
  });

  return ranked
    .sort((a, b) => a.event.atMs - b.event.atMs || a.rank - b.rank)
    .map(({ event }) => event);
}

/** Resolves true when the delay elapses, false if aborted. Always cleans up. */
function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Replay notes in FIFO order at 0.5x / 1x / 2x.
 *
 * Each event waits until its absolute target time (measured from the start),
 * so timer lateness does not accumulate. Aborting the signal clears the
 * pending timer, removes the listener, and sends `noteOff` for every note
 * still sounding. The promise resolves 'aborted' instead of rejecting.
 */
export async function replay(
  notes: readonly RecordedNote[],
  speed: ReplaySpeed,
  handlers: ReplayHandlers,
  signal: AbortSignal,
  options: ReplayOptions = {},
): Promise<ReplayResult> {
  if (signal.aborted) return 'aborted';

  const now = options.now ?? (() => performance.now());
  const events = scheduleEvents(notes, speed);
  const sounding = new Set<number>();
  const startedAt = now();

  try {
    for (const { atMs, type, note } of events) {
      const waitMs = atMs - (now() - startedAt);
      if (waitMs > 0) {
        if (!(await sleep(waitMs, signal))) return 'aborted';
      } else if (signal.aborted) {
        return 'aborted';
      }

      if (type === 'on') {
        sounding.add(note.midi);
        handlers.noteOn(note.midi, note.freqHz);
      } else {
        sounding.delete(note.midi);
        handlers.noteOff(note.midi);
      }
    }
    return 'completed';
  } finally {
    // Runs on abort (and if a handler throws): never leave a note hanging.
    for (const midi of sounding) handlers.noteOff(midi);
  }
}

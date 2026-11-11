import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordedNote } from './recorder';
import { replay, scheduleEvents, type ReplaySpeed } from './replay';

const notes: RecordedNote[] = [
  { midi: 60, freqHz: 261.63, durationMs: 100, deltaMs: 0 },
  { midi: 64, freqHz: 329.63, durationMs: 200, deltaMs: 300 },
];

type LogEntry = [type: 'on' | 'off', midi: number, atMs: number];

let log: LogEntry[];
let t0: number;
const now = () => Date.now();

function makeHandlers() {
  return {
    noteOn: vi.fn((midi: number) => log.push(['on', midi, Date.now() - t0])),
    noteOff: vi.fn((midi: number) => log.push(['off', midi, Date.now() - t0])),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  log = [];
  t0 = Date.now();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('scheduleEvents', () => {
  it('orders events and scales time by speed', () => {
    const times = (speed: ReplaySpeed) => scheduleEvents(notes, speed).map((e) => e.atMs);
    expect(times(1)).toEqual([0, 100, 300, 500]);
    expect(times(2)).toEqual([0, 50, 150, 250]);
    expect(times(0.5)).toEqual([0, 200, 600, 1000]);
  });

  it("plays a note's on before its off, even with zero duration", () => {
    const events = scheduleEvents([{ midi: 60, freqHz: 1, durationMs: 0, deltaMs: 0 }], 1);
    expect(events.map((e) => e.type)).toEqual(['on', 'off']);
  });

  it("releases an earlier note before a later note starts at the same time", () => {
    const events = scheduleEvents(
      [
        { midi: 60, freqHz: 1, durationMs: 100, deltaMs: 0 },
        { midi: 60, freqHz: 1, durationMs: 100, deltaMs: 100 },
      ],
      1,
    );
    expect(events.map((e) => `${e.type}${e.atMs}`)).toEqual(['on0', 'off100', 'on100', 'off200']);
  });
});

describe('replay', () => {
  it.each<[ReplaySpeed, number[]]>([
    [1, [0, 100, 300, 500]],
    [2, [0, 50, 150, 250]],
    [0.5, [0, 200, 600, 1000]],
  ])('plays notes in order at %sx', async (speed, times) => {
    const handlers = makeHandlers();
    const promise = replay(notes, speed, handlers, new AbortController().signal, { now });
    await vi.advanceTimersByTimeAsync(2000);

    expect(await promise).toBe('completed');
    expect(log).toEqual([
      ['on', 60, times[0]],
      ['off', 60, times[1]],
      ['on', 64, times[2]],
      ['off', 64, times[3]],
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('completes immediately for an empty recording', async () => {
    const result = await replay([], 1, makeHandlers(), new AbortController().signal, { now });
    expect(result).toBe('completed');
  });

  it('does nothing if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const handlers = makeHandlers();

    expect(await replay(notes, 1, handlers, controller.signal, { now })).toBe('aborted');
    expect(handlers.noteOn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('abort silences sounding notes, clears the timer and stops further events', async () => {
    const controller = new AbortController();
    const handlers = makeHandlers();
    const promise = replay(notes, 1, handlers, controller.signal, { now });

    await vi.advanceTimersByTimeAsync(350); // note 64 is sounding, off due at 500
    controller.abort();

    expect(await promise).toBe('aborted');
    expect(handlers.noteOff).toHaveBeenLastCalledWith(64);
    expect(vi.getTimerCount()).toBe(0);

    const eventsAtAbort = log.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(log).toHaveLength(eventsAtAbort);
  });

  it('abort between notes sends no extra noteOff', async () => {
    const controller = new AbortController();
    const handlers = makeHandlers();
    const promise = replay(notes, 1, handlers, controller.signal, { now });

    await vi.advanceTimersByTimeAsync(200); // note 60 already released, 64 not started
    controller.abort();
    await promise;

    expect(handlers.noteOff).toHaveBeenCalledTimes(1);
    expect(handlers.noteOn).toHaveBeenCalledTimes(1);
  });

  it('removes its abort listener after completing', async () => {
    const controller = new AbortController();
    const addSpy = vi.spyOn(controller.signal, 'addEventListener');
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

    const promise = replay(notes, 1, makeHandlers(), controller.signal, { now });
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(addSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledTimes(addSpy.mock.calls.length);
  });

  it('silences sounding notes if a handler throws', async () => {
    const handlers = {
      noteOn: vi.fn(),
      noteOff: vi.fn((midi: number) => {
        if (midi === 60) throw new Error('boom');
      }),
    };
    const hold: RecordedNote[] = [
      { midi: 62, freqHz: 1, durationMs: 1000, deltaMs: 0 },
      { midi: 60, freqHz: 1, durationMs: 10, deltaMs: 0 },
    ];
    const promise = replay(hold, 1, handlers, new AbortController().signal, { now });
    const assertion = expect(promise).rejects.toThrow('boom');
    await vi.advanceTimersByTimeAsync(20);
    await assertion;

    expect(handlers.noteOff).toHaveBeenCalledWith(62);
  });
});

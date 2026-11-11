import { beforeEach, describe, expect, it } from 'vitest';
import { Recorder } from './recorder';

let t = 0;
let recorder: Recorder;

beforeEach(() => {
  t = 0;
  recorder = new Recorder(() => t);
});

describe('Recorder', () => {
  it('records { midi, freqHz, durationMs, deltaMs } in onset order', () => {
    recorder.start();
    t = 1000;
    recorder.noteOn(60, 261.63);
    t = 1200;
    recorder.noteOff(60);
    t = 1500;
    recorder.noteOn(64, 329.63);
    t = 1520;
    recorder.noteOff(64);

    expect(recorder.stop()).toEqual([
      { midi: 60, freqHz: 261.63, durationMs: 200, deltaMs: 0 },
      { midi: 64, freqHz: 329.63, durationMs: 20, deltaMs: 500 },
    ]);
  });

  it('keeps FIFO onset order even if an earlier note is released later', () => {
    recorder.start();
    recorder.noteOn(60, 1); // t=0
    t = 100;
    recorder.noteOn(64, 2);
    t = 150;
    recorder.noteOff(64);
    t = 400;
    recorder.noteOff(60);

    const notes = recorder.stop();
    expect(notes.map((n) => n.midi)).toEqual([60, 64]);
    expect(notes[0]).toMatchObject({ durationMs: 400, deltaMs: 0 });
    expect(notes[1]).toMatchObject({ durationMs: 50, deltaMs: 100 });
  });

  it('closes still-held notes at stop time', () => {
    recorder.start();
    recorder.noteOn(60, 1);
    t = 500;
    expect(recorder.stop()[0].durationMs).toBe(500);
    expect(recorder.isRecording).toBe(false);
  });

  it('ignores events when not recording', () => {
    recorder.noteOn(60, 1);
    recorder.noteOff(60);
    expect(recorder.noteCount).toBe(0);

    recorder.start();
    recorder.stop();
    recorder.noteOn(62, 1);
    expect(recorder.getNotes()).toEqual([]);
  });

  it('ignores noteOff for a note that is not held', () => {
    recorder.start();
    recorder.noteOff(60);
    expect(recorder.noteCount).toBe(0);
  });

  it('re-pressing a held key ends the previous note', () => {
    recorder.start();
    recorder.noteOn(60, 1);
    t = 100;
    recorder.noteOn(60, 1);
    t = 250;
    recorder.noteOff(60);

    expect(recorder.stop()).toEqual([
      { midi: 60, freqHz: 1, durationMs: 100, deltaMs: 0 },
      { midi: 60, freqHz: 1, durationMs: 150, deltaMs: 100 },
    ]);
  });

  it('start() discards the previous recording', () => {
    recorder.start();
    recorder.noteOn(60, 1);
    recorder.stop();
    recorder.start();
    expect(recorder.noteCount).toBe(0);
  });

  it('returns copies, not internal state', () => {
    recorder.start();
    recorder.noteOn(60, 1);
    const copy = recorder.stop();
    (copy[0] as { durationMs: number }).durationMs = 999;
    expect(recorder.getNotes()[0].durationMs).toBe(0);
  });
});

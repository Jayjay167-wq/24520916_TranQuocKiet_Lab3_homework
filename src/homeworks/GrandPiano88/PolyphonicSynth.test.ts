import { beforeEach, describe, expect, it } from 'vitest';
import { createFakeContext, type FakeAudioContext } from './audioTestHelpers';
import { midiToFreq } from './keyGenerator';
import { MAX_VOICES, PolyphonicSynth, RELEASE_TIME_S, SILENCE_GAIN } from './PolyphonicSynth';

let fake: FakeAudioContext;
let synth: PolyphonicSynth;

function play(midi: number): void {
  synth.noteOn(midi, midiToFreq(midi));
}

beforeEach(() => {
  const created = createFakeContext();
  fake = created.fake;
  synth = new PolyphonicSynth(created.ctx);
});

describe('noteOn', () => {
  it('starts an oscillator at the right frequency and wires osc -> gain -> destination', () => {
    play(69);

    const osc = fake.oscillators[0];
    const gain = fake.gains[0];
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
    expect(osc.start).toHaveBeenCalledTimes(1);
    expect(osc.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(fake.destination);
    expect(synth.isActive(69)).toBe(true);
  });

  it('fades in from silence to avoid a click', () => {
    play(60);
    const param = fake.gains[0].gain;
    expect(param.setValueAtTime).toHaveBeenCalledWith(SILENCE_GAIN, 0);
    expect(param.exponentialRampToValueAtTime).toHaveBeenCalledTimes(1);
  });

  it('resumes a suspended context', () => {
    fake.state = 'suspended';
    play(60);
    expect(fake.resume).toHaveBeenCalledTimes(1);
  });

  it('retriggering a held note keeps one voice and releases the old one', () => {
    play(60);
    play(60);

    expect(synth.activeCount).toBe(1);
    expect(fake.oscillators).toHaveLength(2);
    expect(fake.oscillators[0].stop).toHaveBeenCalledTimes(1);
    expect(fake.oscillators[1].stop).not.toHaveBeenCalled();
  });
});

describe('voice limit and FIFO stealing', () => {
  it('allows exactly eight simultaneous voices', () => {
    for (let midi = 60; midi < 60 + MAX_VOICES; midi++) play(midi);

    expect(MAX_VOICES).toBe(8);
    expect(synth.activeCount).toBe(8);
    fake.oscillators.forEach((osc) => expect(osc.stop).not.toHaveBeenCalled());
  });

  it('steals the FIFO-oldest voice on the ninth note', () => {
    for (let midi = 60; midi <= 67; midi++) play(midi);
    play(68);

    expect(synth.activeCount).toBe(8);
    expect(synth.isActive(60)).toBe(false);
    expect(synth.activeNotes()).toEqual([61, 62, 63, 64, 65, 66, 67, 68]);
    expect(fake.oscillators[0].stop).toHaveBeenCalledTimes(1);
    expect(fake.oscillators[1].stop).not.toHaveBeenCalled();
  });

  it('keeps stealing in insertion order and never exceeds eight', () => {
    for (let midi = 21; midi < 31; midi++) play(midi); // 10 notes

    expect(synth.activeCount).toBe(8);
    expect(synth.activeNotes()).toEqual([23, 24, 25, 26, 27, 28, 29, 30]);
  });

  it('gives a stolen voice the same click-free release', () => {
    fake.currentTime = 2;
    for (let midi = 60; midi <= 68; midi++) play(midi);

    expect(fake.gains[0].gain.exponentialRampToValueAtTime).toHaveBeenLastCalledWith(
      SILENCE_GAIN,
      2 + RELEASE_TIME_S,
    );
    expect(fake.oscillators[0].stop).toHaveBeenCalledWith(2 + RELEASE_TIME_S);
  });

  it('a note that is released frees a slot without stealing', () => {
    for (let midi = 60; midi <= 67; midi++) play(midi);
    synth.noteOff(64);
    play(68);

    expect(synth.activeNotes()).toEqual([60, 61, 62, 63, 65, 66, 67, 68]);
    expect(fake.oscillators[0].stop).not.toHaveBeenCalled();
  });
});

describe('noteOff', () => {
  it('ramps gain to 0.0001 over 0.04 s, then stops, then disconnects on ended', () => {
    fake.currentTime = 1;
    play(60);
    const osc = fake.oscillators[0];
    const param = fake.gains[0].gain;

    fake.currentTime = 1.5;
    synth.noteOff(60);

    expect(param.cancelScheduledValues).toHaveBeenCalledWith(1.5);
    expect(param.exponentialRampToValueAtTime).toHaveBeenLastCalledWith(0.0001, 1.5 + 0.04);
    expect(osc.stop).toHaveBeenCalledWith(1.5 + 0.04);

    const rampOrder = param.exponentialRampToValueAtTime.mock.invocationCallOrder.at(-1) ?? 0;
    const stopOrder = osc.stop.mock.invocationCallOrder[0];
    expect(rampOrder).toBeLessThan(stopOrder);

    // Not disconnected while the release tail is still playing.
    expect(osc.disconnect).not.toHaveBeenCalled();
    expect(fake.gains[0].disconnect).not.toHaveBeenCalled();

    osc.fireEnded();
    expect(osc.disconnect).toHaveBeenCalledTimes(1);
    expect(fake.gains[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it('removes the voice from the active set immediately', () => {
    play(60);
    synth.noteOff(60);
    expect(synth.isActive(60)).toBe(false);
    expect(synth.activeCount).toBe(0);
  });

  it('is a no-op for a note that is not playing', () => {
    play(60);
    synth.noteOff(61);
    expect(synth.activeCount).toBe(1);
    expect(fake.oscillators[0].stop).not.toHaveBeenCalled();
  });

  it('does not stop the same voice twice', () => {
    play(60);
    synth.noteOff(60);
    synth.noteOff(60);
    expect(fake.oscillators[0].stop).toHaveBeenCalledTimes(1);
  });
});

describe('dispose', () => {
  it('stops and disconnects active and releasing voices and clears state', () => {
    play(60);
    play(61);
    synth.noteOff(60); // 60 is now releasing, 61 is active

    synth.dispose();

    expect(synth.activeCount).toBe(0);
    for (const osc of fake.oscillators) {
      expect(osc.stop).toHaveBeenCalled();
      expect(osc.disconnect).toHaveBeenCalledTimes(1);
      expect(osc.onended).toBeNull();
    }
    for (const gain of fake.gains) expect(gain.disconnect).toHaveBeenCalledTimes(1);
  });

  it('ignores notes after dispose and can be called twice', () => {
    synth.dispose();
    synth.dispose();
    play(60);

    expect(synth.activeCount).toBe(0);
    expect(fake.oscillators).toHaveLength(0);
  });

  it('does not disconnect twice if a disposed voice fires ended', () => {
    play(60);
    synth.noteOff(60);
    const osc = fake.oscillators[0];

    synth.dispose();
    osc.fireEnded();

    expect(osc.disconnect).toHaveBeenCalledTimes(1);
  });
});

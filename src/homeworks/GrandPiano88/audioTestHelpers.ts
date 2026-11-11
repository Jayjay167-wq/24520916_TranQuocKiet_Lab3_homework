import { vi } from 'vitest';

export class FakeAudioParam {
  value: number;
  setValueAtTime = vi.fn((v: number) => {
    this.value = v;
  });
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();

  constructor(initial = 0) {
    this.value = initial;
  }
}

export class FakeOscillator {
  type: OscillatorType = 'sine';
  frequency = new FakeAudioParam(440);
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();

  /** Simulate the browser firing `ended` after the scheduled stop time. */
  fireEnded(): void {
    this.onended?.();
  }
}

export class FakeGain {
  gain = new FakeAudioParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

export class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = 'running';
  destination = { kind: 'destination' };
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn(() => Promise.resolve());

  createOscillator(): FakeOscillator {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

export function createFakeContext(): { fake: FakeAudioContext; ctx: AudioContext } {
  const fake = new FakeAudioContext();
  return { fake, ctx: fake as unknown as AudioContext };
}

/**
 * Replace the global AudioContext with a fake and return every instance the
 * code under test creates. Pair with `vi.unstubAllGlobals()` in afterEach.
 */
export function installFakeAudioContext(): FakeAudioContext[] {
  const instances: FakeAudioContext[] = [];
  class StubAudioContext extends FakeAudioContext {
    constructor() {
      super();
      instances.push(this);
    }
  }
  vi.stubGlobal('AudioContext', StubAudioContext);
  return instances;
}

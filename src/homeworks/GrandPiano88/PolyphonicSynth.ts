/** Maximum simultaneously active voices. */
export const MAX_VOICES = 8;
/** Click-free release length in seconds. */
export const RELEASE_TIME_S = 0.04;
/** Exponential ramps cannot reach 0, so "silence" is this tiny gain. */
export const SILENCE_GAIN = 0.0001;

const PEAK_GAIN = 0.15; // 8 voices * 0.15 stays below clipping
const ATTACK_TIME_S = 0.005;

interface Voice {
  readonly osc: OscillatorNode;
  readonly gain: GainNode;
}

/**
 * Polyphonic oscillator synth with a hard cap of eight voices.
 *
 * Active voices live in an ES6 `Map` keyed by MIDI note. A Map iterates in
 * insertion order, so `voices.keys().next().value` is always the oldest voice
 * (FIFO), which is the one stolen when a ninth note arrives.
 *
 * The AudioContext is owned by the caller; `dispose()` does not close it.
 */
export class PolyphonicSynth {
  private readonly ctx: AudioContext;
  private readonly destination: AudioNode;
  private readonly waveform: OscillatorType;
  private readonly voices = new Map<number, Voice>();
  /** Voices already told to stop but still ramping down (not "active"). */
  private readonly releasing = new Set<Voice>();
  private disposed = false;

  constructor(
    ctx: AudioContext,
    destination: AudioNode = ctx.destination,
    waveform: OscillatorType = 'triangle',
  ) {
    this.ctx = ctx;
    this.destination = destination;
    this.waveform = waveform;
  }

  /** Number of active (held) voices; never exceeds MAX_VOICES. */
  get activeCount(): number {
    return this.voices.size;
  }

  /** Active MIDI notes, oldest first. */
  activeNotes(): number[] {
    return [...this.voices.keys()];
  }

  isActive(midi: number): boolean {
    return this.voices.has(midi);
  }

  noteOn(midi: number, freqHz: number): void {
    if (this.disposed) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    // Re-pressing a held note retriggers it as the newest voice.
    const existing = this.voices.get(midi);
    if (existing) {
      this.voices.delete(midi);
      this.release(existing);
    }

    // Voice stealing: drop the FIFO-oldest voice until there is room.
    while (this.voices.size >= MAX_VOICES) {
      const oldestMidi = this.voices.keys().next().value;
      if (oldestMidi === undefined) break;
      const oldest = this.voices.get(oldestMidi);
      this.voices.delete(oldestMidi);
      if (oldest) this.release(oldest);
    }

    this.voices.set(midi, this.createVoice(freqHz));
  }

  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice) return;
    this.voices.delete(midi);
    this.release(voice);
  }

  /** Stop everything immediately and disconnect all nodes. Idempotent. */
  dispose(): void {
    this.disposed = true;
    const all = [...this.voices.values(), ...this.releasing];
    this.voices.clear();
    this.releasing.clear();
    for (const { osc, gain } of all) {
      osc.onended = null;
      try {
        osc.stop();
      } catch {
        // already stopped
      }
      osc.disconnect();
      gain.disconnect();
    }
  }

  private createVoice(freqHz: number): Voice {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.setValueAtTime(freqHz, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(SILENCE_GAIN, now);
    gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + ATTACK_TIME_S);

    osc.connect(gain);
    gain.connect(this.destination);
    osc.start(now);
    return { osc, gain };
  }

  /** Ramp the gain down, then stop; nodes are disconnected once playback ends. */
  private release(voice: Voice): void {
    const now = this.ctx.currentTime;
    const param = voice.gain.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(param.value, SILENCE_GAIN), now);
    param.exponentialRampToValueAtTime(SILENCE_GAIN, now + RELEASE_TIME_S);

    this.releasing.add(voice);
    voice.osc.onended = () => this.finalize(voice);
    voice.osc.stop(now + RELEASE_TIME_S);
  }

  private finalize(voice: Voice): void {
    voice.osc.onended = null;
    voice.osc.disconnect();
    voice.gain.disconnect();
    this.releasing.delete(voice);
  }
}

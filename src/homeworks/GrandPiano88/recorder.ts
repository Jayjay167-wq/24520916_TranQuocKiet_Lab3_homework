export interface RecordedNote {
  /** MIDI note number. */
  readonly midi: number;
  readonly freqHz: number;
  /** How long the key was held, in ms. */
  readonly durationMs: number;
  /** Time since the previous note's onset, in ms. The first note has 0. */
  readonly deltaMs: number;
}

interface MutableNote {
  midi: number;
  freqHz: number;
  durationMs: number;
  deltaMs: number;
}

/**
 * Records played notes as a FIFO list: notes are stored in onset order, so a
 * replay plays them back in the order they were first pressed.
 *
 * A note's slot is reserved on key-down and its duration is filled in on
 * key-up. That keeps onset order correct even when an earlier note is held
 * longer than a later one. Leading silence is trimmed (first deltaMs is 0).
 */
export class Recorder {
  private readonly now: () => number;
  private recording = false;
  private notes: MutableNote[] = [];
  private readonly held = new Map<number, { note: MutableNote; onsetAt: number }>();
  private lastOnsetAt: number | null = null;

  constructor(now: () => number = () => performance.now()) {
    this.now = now;
  }

  get isRecording(): boolean {
    return this.recording;
  }

  get noteCount(): number {
    return this.notes.length;
  }

  /** Begin a new recording; any previous one is discarded. */
  start(): void {
    this.notes = [];
    this.held.clear();
    this.lastOnsetAt = null;
    this.recording = true;
  }

  noteOn(midi: number, freqHz: number): void {
    if (!this.recording) return;
    const at = this.now();
    this.finish(midi, at); // re-pressing a held key ends the previous note

    const note: MutableNote = {
      midi,
      freqHz,
      durationMs: 0,
      deltaMs: this.lastOnsetAt === null ? 0 : at - this.lastOnsetAt,
    };
    this.lastOnsetAt = at;
    this.notes.push(note);
    this.held.set(midi, { note, onsetAt: at });
  }

  noteOff(midi: number): void {
    if (!this.recording) return;
    this.finish(midi, this.now());
  }

  /** Stop recording, close any still-held notes, and return a copy of the result. */
  stop(): RecordedNote[] {
    if (this.recording) {
      const at = this.now();
      for (const midi of [...this.held.keys()]) this.finish(midi, at);
      this.recording = false;
    }
    return this.getNotes();
  }

  getNotes(): RecordedNote[] {
    return this.notes.map((note) => ({ ...note }));
  }

  private finish(midi: number, at: number): void {
    const entry = this.held.get(midi);
    if (!entry) return;
    entry.note.durationMs = at - entry.onsetAt;
    this.held.delete(midi);
  }
}

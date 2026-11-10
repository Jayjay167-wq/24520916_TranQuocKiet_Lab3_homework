import type { DrumPad, DrumPadCode, PadMap } from './drumTypes';

export const DRUM_PADS: readonly DrumPad[] = [
  { id: 'crash', label: 'Crash', code: 'KeyW', keyLabel: 'W', sample: '/samples/crash.wav' },
  { id: 'hihat-open', label: 'Hi-Hat Open', code: 'KeyA', keyLabel: 'A', sample: '/samples/hihat-open.wav' },
  { id: 'hihat-closed', label: 'Hi-Hat Closed', code: 'KeyS', keyLabel: 'S', sample: '/samples/hihat-closed.wav' },
  { id: 'snare', label: 'Snare', code: 'KeyD', keyLabel: 'D', sample: '/samples/snare.wav' },
  { id: 'kick', label: 'Kick', code: 'KeyJ', keyLabel: 'J', sample: '/samples/kick.wav' },
  { id: 'tom', label: 'Tom', code: 'KeyK', keyLabel: 'K', sample: '/samples/tom.wav' },
  { id: 'clap', label: 'Clap', code: 'KeyL', keyLabel: 'L', sample: '/samples/clap.wav' },
];

/** Pads keyed by physical KeyboardEvent.code. */
export const padMap: PadMap = new Map<DrumPadCode, DrumPad>(
  DRUM_PADS.map((pad) => [pad.code, pad]),
);

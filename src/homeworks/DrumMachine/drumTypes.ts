/** Physical key codes (KeyboardEvent.code) bound to drum pads. */
export const PAD_CODES = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyJ',
  'KeyK',
  'KeyL',
] as const;

export type DrumPadCode = (typeof PAD_CODES)[number];

export const PAD_IDS = [
  'crash',
  'hihat-open',
  'hihat-closed',
  'snare',
  'kick',
  'tom',
  'clap',
] as const;

export type DrumPadId = (typeof PAD_IDS)[number];

export interface DrumPad {
  /** Stable identifier, also used for React keys and aria wiring. */
  readonly id: DrumPadId;
  /** Human-readable name shown on the pad and announced in the hit log. */
  readonly label: string;
  /** Physical key, matched against KeyboardEvent.code (never keyCode). */
  readonly code: DrumPadCode;
  /** Short key label shown on the pad (e.g. "W"). */
  readonly keyLabel: string;
  /** Sample URL served from /public. */
  readonly sample: string;
}

/** The mapping contract: pads are looked up by KeyboardEvent.code. */
export type PadMap = ReadonlyMap<DrumPadCode, DrumPad>;

/** Single trigger path shared by button clicks and keyboard events. */
export type TriggerPad = (pad: DrumPad) => void;

import { describe, it, expect } from 'vitest';
import { padMap, DRUM_PADS } from './padMap';
import { PAD_CODES } from './drumTypes';

describe('padMap', () => {
  it('maps exactly the seven required physical key codes', () => {
    expect([...padMap.keys()].sort()).toEqual([...PAD_CODES].sort());
    expect(padMap.size).toBe(7);
  });

  it('keys each pad by its own code', () => {
    for (const [code, pad] of padMap) expect(pad.code).toBe(code);
  });

  it('has unique ids and samples', () => {
    expect(new Set(DRUM_PADS.map((p) => p.id)).size).toBe(DRUM_PADS.length);
    expect(new Set(DRUM_PADS.map((p) => p.sample)).size).toBe(DRUM_PADS.length);
  });

  it('does not map unrelated or legacy keys', () => {
    expect(padMap.has('KeyQ' as never)).toBe(false);
    expect(padMap.has('Space' as never)).toBe(false);
  });
});

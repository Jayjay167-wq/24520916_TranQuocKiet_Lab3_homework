import { describe, expect, it } from 'vitest';
import { formatVnd } from './formatVnd';

/** Intl uses NBSP / narrow NBSP between number and symbol; compare with a plain space. */
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatVnd', () => {
  it('uses vi-VN dot grouping and the ₫ symbol', () => {
    expect(plain(formatVnd(49000))).toBe('49.000 ₫');
    expect(plain(formatVnd(1250000))).toBe('1.250.000 ₫');
  });

  it('formats zero', () => {
    expect(plain(formatVnd(0))).toBe('0 ₫');
  });

  it('has no decimal places and rounds fractions of a dong', () => {
    expect(plain(formatVnd(1999.6))).toBe('2.000 ₫');
    expect(formatVnd(49000)).not.toMatch(/[,]\d/);
  });

  it('formats negative amounts', () => {
    expect(plain(formatVnd(-49000))).toBe('-49.000 ₫');
  });

  it('keeps the symbol and number together with a non-breaking space', () => {
    expect(formatVnd(49000)).toMatch(/\d[\u00A0\u202F]₫$/);
  });
});

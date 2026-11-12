import { describe, expect, it } from 'vitest';
import { countdownAnnouncement, formatCountdown } from './countdown';

describe('formatCountdown', () => {
  it.each([
    [0, '00:00'],
    [-500, '00:00'],
    [1, '00:01'], // rounds up so it never shows 00:00 before the drop
    [999, '00:01'],
    [1_000, '00:01'],
    [61_000, '01:01'],
    [600_000, '10:00'],
    [3_600_000, '1:00:00'],
    [3_661_000, '1:01:01'],
  ])('formats %i ms as %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});

describe('countdownAnnouncement', () => {
  it.each([
    [0, 'The airdrop is live.'],
    [600_000, 'About 10 minutes until the airdrop.'],
    [61_000, 'About 2 minutes until the airdrop.'],
    [60_000, 'About 60 seconds until the airdrop.'],
    [59_000, 'About 60 seconds until the airdrop.'],
    [11_000, 'About 20 seconds until the airdrop.'],
    [10_000, 'Less than 10 seconds until the airdrop.'],
    [1, 'Less than 10 seconds until the airdrop.'],
  ])('says the right thing at %i ms', (ms, text) => {
    expect(countdownAnnouncement(ms)).toBe(text);
  });

  it('switches from minutes to seconds at 60 s, so "1 minutes" never appears', () => {
    expect(countdownAnnouncement(60_001)).toBe('About 2 minutes until the airdrop.');
    expect(countdownAnnouncement(60_000)).toBe('About 60 seconds until the airdrop.');
  });

  it('changes only at coarse steps, so a live region does not chatter', () => {
    const messages: string[] = [];
    for (let ms = 125_000; ms >= 0; ms -= 200) messages.push(countdownAnnouncement(ms));

    const changes = messages.filter((text, i) => i > 0 && text !== messages[i - 1]).length;
    const distinct = new Set(messages).size;

    expect(messages.length).toBeGreaterThan(600); // one candidate per 200 ms tick
    expect(distinct).toBeLessThanOrEqual(10);
    expect(changes).toBe(distinct - 1); // never flaps back to an earlier message
  });
});

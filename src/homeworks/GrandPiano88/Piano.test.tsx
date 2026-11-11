// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeAudioContext, type FakeAudioContext } from './audioTestHelpers';
import Piano from './Piano';

let contexts: FakeAudioContext[];

const key = (name: string) => screen.getByRole('button', { name });
const status = () => screen.getByRole('status').textContent;

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function press(name: string): void {
  fireEvent.keyDown(key(name), { key: ' ' });
}

function release(name: string): void {
  fireEvent.keyUp(key(name), { key: ' ' });
}

/** Record C4 (held 200 ms) then E4 (held 100 ms, 300 ms after C4), and stop. */
async function recordTwoNotes(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Record' }));
  press('C4');
  await advance(200);
  release('C4');
  await advance(100);
  press('E4');
  await advance(100);
  release('E4');
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
}

beforeEach(() => {
  vi.useFakeTimers();
  // Keep the recorder's and replay's clock in step with the fake timers.
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  contexts = installFakeAudioContext();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Piano', () => {
  it('renders 88 keys in a labelled region', () => {
    render(<Piano />);
    expect(screen.getByRole('region', { name: /piano keyboard/i })).toBeTruthy();
    expect(document.querySelectorAll('.piano-key')).toHaveLength(88);
  });

  it('records played notes and reports the count', async () => {
    render(<Piano />);
    await recordTwoNotes();

    expect(status()).toBe('Recording stopped. 2 notes recorded.');
    expect(screen.getByText('2 notes recorded')).toBeTruthy();
  });

  it('Stop during playback aborts the replay and silences the sounding note', async () => {
    render(<Piano />);
    await recordTwoNotes();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(status()).toBe('Playing 2 notes at 1×.');
    expect(key('C4').getAttribute('aria-pressed')).toBe('true');

    await advance(50);
    const oscillatorsBeforeStop = contexts[0].oscillators.length;
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await advance(0);

    expect(status()).toBe('Playback stopped.');
    expect(key('C4').getAttribute('aria-pressed')).toBe('false');

    // E4 was due at 300 ms; it must never start after the abort.
    await advance(1000);
    expect(contexts[0].oscillators.length).toBe(oscillatorsBeforeStop);
    expect(key('E4').getAttribute('aria-pressed')).toBe('false');
  });

  it('unmounting mid-replay clears the replay timer and releases the audio graph', async () => {
    const { unmount } = render(<Piano />);
    await recordTwoNotes();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    await advance(50);

    const timersBefore = vi.getTimerCount();
    unmount();

    expect(vi.getTimerCount()).toBeLessThan(timersBefore);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].close).toHaveBeenCalledTimes(1);
    for (const osc of contexts[0].oscillators) {
      expect(osc.stop).toHaveBeenCalled();
      expect(osc.disconnect).toHaveBeenCalled();
    }
    for (const gain of contexts[0].gains) expect(gain.disconnect).toHaveBeenCalled();

    // Nothing may fire after unmount.
    const oscillatorCount = contexts[0].oscillators.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(contexts[0].oscillators.length).toBe(oscillatorCount);
  });
});

/** Visible countdown text: "mm:ss", or "h:mm:ss" from one hour up. Rounds up. */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Screen-reader text for the countdown. It only changes at coarse steps
 * (each minute, then each 10 s, then once under 10 s), so a polite live
 * region announces a few times instead of every 200 ms tick.
 */
export function countdownAnnouncement(remainingMs: number): string {
  if (remainingMs <= 0) return 'The airdrop is live.';
  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds > 60) {
    // seconds > 60, so this is always at least 2 minutes.
    return `About ${Math.ceil(seconds / 60)} minutes until the airdrop.`;
  }
  if (seconds > 10) {
    return `About ${Math.ceil(seconds / 10) * 10} seconds until the airdrop.`;
  }
  return 'Less than 10 seconds until the airdrop.';
}

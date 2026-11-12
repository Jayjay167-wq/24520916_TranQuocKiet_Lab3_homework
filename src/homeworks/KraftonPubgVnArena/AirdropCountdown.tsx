import { countdownAnnouncement, formatCountdown } from './countdown';

interface AirdropCountdownProps {
  /** Crate name, spoken in the announcement so several countdowns stay distinguishable. */
  name: string;
  remainingMs: number;
  isLive: boolean;
}

export default function AirdropCountdown({ name, remainingMs, isLive }: AirdropCountdownProps) {
  return (
    <div className="airdrop-countdown">
      <span className="airdrop-countdown__label">Airdrop</span>
      {/* Sighted users get the ticking time; it is hidden from assistive tech
          because it changes every second. */}
      <span className="airdrop-countdown__time" aria-hidden="true">
        {isLive ? 'LIVE' : formatCountdown(remainingMs)}
      </span>
      {/* Screen readers get coarse, polite updates instead. */}
      <output aria-live="polite" className="visually-hidden">
        {`${name}: ${countdownAnnouncement(remainingMs)}`}
      </output>
    </div>
  );
}

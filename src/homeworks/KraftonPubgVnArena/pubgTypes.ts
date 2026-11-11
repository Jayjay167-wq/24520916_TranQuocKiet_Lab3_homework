export const DROP_PHASES = ['upcoming', 'live', 'soldOut', 'ended'] as const;

/**
 * Lifecycle of an airdrop crate:
 * - upcoming: the drop time is still in the future (countdown running)
 * - live:     the drop time has passed and stock remains (claimable)
 * - soldOut:  stock reached 0
 * - ended:    the claim window is closed
 */
export type DropPhase = (typeof DROP_PHASES)[number];

export interface PubgCrateDrop {
  /** Stable id; also used as the in-flight `claimId` lock key. */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Whole Vietnamese dong (VND has no minor unit). */
  readonly priceVnd: number;
  /** Units still available. Never negative. */
  readonly stock: number;
  /** Units at the start of the drop, so UI can show how much is left. */
  readonly initialStock: number;
  /** Server-side drop time as epoch ms; the countdown target. */
  readonly dropAtEpochMs: number;
  readonly phase: DropPhase;
}

export interface PubgVnSquadStanding {
  readonly id: string;
  readonly name: string;
  /** Winner Winner Chicken Dinner: matches won. */
  readonly wwcd: number;
  /** Points earned from finishing placement. */
  readonly placementPoints: number;
  /** Total eliminations. */
  readonly kills: number;
  readonly matchesPlayed: number;
}

export type LeaderboardSortKey = 'wwcd' | 'placementPoints' | 'kills';

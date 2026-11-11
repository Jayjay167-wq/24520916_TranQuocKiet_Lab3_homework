import type { PubgCrateDrop, PubgVnSquadStanding } from './pubgTypes';

const MINUTE_MS = 60_000;

/**
 * Representative crates. Drop times are relative to `nowMs` so a demo always
 * has one claimable crate and one with a running countdown. Names and prices
 * are placeholders for development.
 */
export function createSampleCrates(nowMs: number = Date.now()): PubgCrateDrop[] {
  return [
    {
      id: 'crate-supply-standard',
      name: 'Supply Crate',
      description: 'Standard supply crate with everyday cosmetics.',
      priceVnd: 49_000,
      stock: 120,
      initialStock: 120,
      dropAtEpochMs: nowMs - MINUTE_MS,
      phase: 'live',
    },
    {
      id: 'crate-vn-legendary',
      name: 'VN Series Legendary Crate',
      description: 'Limited legendary crate, very small stock.',
      priceVnd: 199_000,
      stock: 15,
      initialStock: 15,
      dropAtEpochMs: nowMs + 10 * MINUTE_MS,
      phase: 'upcoming',
    },
  ];
}

/**
 * Illustrative standings for development. The team names are real Vietnamese
 * PUBG squads, but the numbers are made up and are NOT real results.
 */
export const sampleSquadStandings: readonly PubgVnSquadStanding[] = [
  {
    id: 'the-expendables',
    name: 'The Expendables',
    wwcd: 3,
    placementPoints: 62,
    kills: 71,
    matchesPlayed: 18,
  },
  {
    id: 'cerberus-esports',
    name: 'Cerberus Esports',
    wwcd: 2,
    placementPoints: 70,
    kills: 64,
    matchesPlayed: 18,
  },
  {
    id: 'roy-esports',
    name: 'Roy Esports',
    wwcd: 1,
    placementPoints: 55,
    kills: 80,
    matchesPlayed: 18,
  },
  {
    id: 'agg',
    name: 'AGG',
    wwcd: 2,
    placementPoints: 48,
    kills: 59,
    matchesPlayed: 18,
  },
];

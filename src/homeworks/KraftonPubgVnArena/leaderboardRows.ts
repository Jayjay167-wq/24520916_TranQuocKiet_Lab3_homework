import type { LeaderboardSortKey, PubgVnSquadStanding } from './pubgTypes';

export const SORT_OPTIONS: readonly { key: LeaderboardSortKey; label: string }[] = [
  { key: 'wwcd', label: 'WWCD (wins)' },
  { key: 'placementPoints', label: 'Placement points' },
  { key: 'kills', label: 'Kills' },
];

export interface RankedStanding {
  /** Position in the full list for the chosen sort key (1 = best). */
  rank: number;
  standing: PubgVnSquadStanding;
}

/** Highest first; ties fall back to the squad name so the order is stable. */
export function rankStandings(
  standings: readonly PubgVnSquadStanding[],
  sortKey: LeaderboardSortKey,
): RankedStanding[] {
  return [...standings]
    .sort((a, b) => b[sortKey] - a[sortKey] || a.name.localeCompare(b.name))
    .map((standing, index) => ({ rank: index + 1, standing }));
}

/** Case-insensitive name match; a blank query keeps everything. */
export function filterRanked(ranked: readonly RankedStanding[], query: string): RankedStanding[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...ranked];
  return ranked.filter(({ standing }) => standing.name.toLowerCase().includes(needle));
}

/**
 * Rank first, then filter, so a squad keeps its real position while the list
 * is filtered. Pure: call it during render, no state or memo needed.
 */
export function getLeaderboardRows(
  standings: readonly PubgVnSquadStanding[],
  sortKey: LeaderboardSortKey,
  query: string,
): RankedStanding[] {
  return filterRanked(rankStandings(standings, sortKey), query);
}

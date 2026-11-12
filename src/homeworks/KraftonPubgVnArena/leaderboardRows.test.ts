import { describe, expect, it } from 'vitest';
import { filterRanked, getLeaderboardRows, rankStandings, SORT_OPTIONS } from './leaderboardRows';
import type { PubgVnSquadStanding } from './pubgTypes';
import { sampleSquadStandings } from './sampleData';

const names = (rows: { standing: PubgVnSquadStanding }[]) => rows.map((r) => r.standing.name);

describe('rankStandings', () => {
  it('sorts by WWCD, highest first, ties broken by name', () => {
    // The Expendables 3, then AGG and Cerberus Esports tied on 2, then Roy Esports 1.
    expect(names(rankStandings(sampleSquadStandings, 'wwcd'))).toEqual([
      'The Expendables',
      'AGG',
      'Cerberus Esports',
      'Roy Esports',
    ]);
  });

  it('sorts by placement points, highest first', () => {
    expect(names(rankStandings(sampleSquadStandings, 'placementPoints'))).toEqual([
      'Cerberus Esports',
      'The Expendables',
      'Roy Esports',
      'AGG',
    ]);
  });

  it('sorts by kills, highest first', () => {
    expect(names(rankStandings(sampleSquadStandings, 'kills'))).toEqual([
      'Roy Esports',
      'The Expendables',
      'Cerberus Esports',
      'AGG',
    ]);
  });

  it('covers every sort option offered in the UI', () => {
    expect(SORT_OPTIONS.map((o) => o.key).sort()).toEqual(['kills', 'placementPoints', 'wwcd']);
  });

  it('assigns ranks 1..n in order', () => {
    expect(rankStandings(sampleSquadStandings, 'kills').map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('does not mutate the input', () => {
    const before = sampleSquadStandings.map((s) => s.id);
    rankStandings(sampleSquadStandings, 'kills');
    expect(sampleSquadStandings.map((s) => s.id)).toEqual(before);
  });
});

describe('filterRanked', () => {
  const ranked = rankStandings(sampleSquadStandings, 'wwcd');

  it('matches names case-insensitively, as a substring', () => {
    expect(names(filterRanked(ranked, 'ESPORTS'))).toEqual(['Cerberus Esports', 'Roy Esports']);
    expect(names(filterRanked(ranked, 'exp'))).toEqual(['The Expendables']);
  });

  it('ignores surrounding whitespace and treats a blank query as "show all"', () => {
    expect(names(filterRanked(ranked, '  agg  '))).toEqual(['AGG']);
    expect(filterRanked(ranked, '')).toHaveLength(4);
    expect(filterRanked(ranked, '   ')).toHaveLength(4);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterRanked(ranked, 'zzz')).toEqual([]);
  });
});

describe('getLeaderboardRows', () => {
  it('keeps the full-list rank while filtering', () => {
    const rows = getLeaderboardRows(sampleSquadStandings, 'kills', 'agg');
    expect(rows).toHaveLength(1);
    expect(rows[0].rank).toBe(4); // last by kills among all four squads
  });

  it('combines filter and sort', () => {
    expect(names(getLeaderboardRows(sampleSquadStandings, 'placementPoints', 'esports'))).toEqual([
      'Cerberus Esports',
      'Roy Esports',
    ]);
  });
});

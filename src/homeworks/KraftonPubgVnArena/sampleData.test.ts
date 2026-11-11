import { describe, expect, it } from 'vitest';
import { createSampleCrates, sampleSquadStandings } from './sampleData';

const NOW = 1_800_000_000_000;

describe('createSampleCrates', () => {
  const crates = createSampleCrates(NOW);

  it('returns two crates with unique ids', () => {
    expect(crates).toHaveLength(2);
    expect(new Set(crates.map((c) => c.id)).size).toBe(2);
  });

  it('uses whole, non-negative VND prices and valid stock', () => {
    for (const crate of crates) {
      expect(Number.isInteger(crate.priceVnd)).toBe(true);
      expect(crate.priceVnd).toBeGreaterThan(0);
      expect(Number.isInteger(crate.stock)).toBe(true);
      expect(crate.stock).toBeGreaterThanOrEqual(0);
      expect(crate.stock).toBeLessThanOrEqual(crate.initialStock);
    }
  });

  it('places drop times relative to the given clock', () => {
    const live = crates.find((c) => c.phase === 'live');
    const upcoming = crates.find((c) => c.phase === 'upcoming');
    expect(live?.dropAtEpochMs).toBeLessThan(NOW);
    expect(upcoming?.dropAtEpochMs).toBeGreaterThan(NOW);
  });
});

describe('sampleSquadStandings', () => {
  it('includes the four required squads', () => {
    expect(sampleSquadStandings.map((s) => s.name).sort()).toEqual(
      ['AGG', 'Cerberus Esports', 'Roy Esports', 'The Expendables'].sort(),
    );
  });

  it('has unique ids and non-negative integer stats', () => {
    expect(new Set(sampleSquadStandings.map((s) => s.id)).size).toBe(4);
    for (const squad of sampleSquadStandings) {
      for (const value of [squad.wwcd, squad.placementPoints, squad.kills, squad.matchesPlayed]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('has distinct values per sort key so sorting is testable later', () => {
    expect(new Set(sampleSquadStandings.map((s) => s.placementPoints)).size).toBe(4);
    expect(new Set(sampleSquadStandings.map((s) => s.kills)).size).toBe(4);
    expect(new Set(sampleSquadStandings.map((s) => s.wwcd)).size).toBeGreaterThan(1);
  });
});

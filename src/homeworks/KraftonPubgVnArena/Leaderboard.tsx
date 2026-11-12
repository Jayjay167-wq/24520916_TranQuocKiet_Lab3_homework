import { useId, useState } from 'react';
import { getLeaderboardRows, SORT_OPTIONS } from './leaderboardRows';
import type { LeaderboardSortKey, PubgVnSquadStanding } from './pubgTypes';

interface LeaderboardProps {
  standings: readonly PubgVnSquadStanding[];
}

export default function Leaderboard({ standings }: LeaderboardProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>('wwcd');
  const filterId = useId();
  const sortId = useId();

  // Derived during render: nothing to keep in sync, so no state/effect/memo.
  const rows = getLeaderboardRows(standings, sortKey, query);
  const sortLabel = SORT_OPTIONS.find((option) => option.key === sortKey)?.label ?? sortKey;

  return (
    <section className="leaderboard" aria-labelledby={`${filterId}-title`}>
      <h3 id={`${filterId}-title`}>Squad leaderboard</h3>

      <div className="leaderboard__controls">
        <div className="field">
          <label htmlFor={filterId}>Filter squads</label>
          <input
            id={filterId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Squad name"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor={sortId}>Sort by</label>
          <select
            id={sortId}
            value={sortKey}
            onChange={(event) => {
              const next = SORT_OPTIONS.find((option) => option.key === event.target.value);
              if (next) setSortKey(next.key);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="leaderboard__status" role="status">
        Showing {rows.length} of {standings.length} squads, sorted by {sortLabel}.
      </p>

      <div
        className="leaderboard__scroll"
        role="region"
        aria-label="Squad standings table"
        tabIndex={0}
      >
        <table>
          <caption>Squad standings sorted by {sortLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Squad</th>
              <th scope="col" className="num">
                WWCD
              </th>
              <th scope="col" className="num">
                Placement
              </th>
              <th scope="col" className="num">
                Kills
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No squads match “{query.trim()}”.</td>
              </tr>
            ) : (
              rows.map(({ rank, standing }) => (
                <tr key={standing.id}>
                  <td>{rank}</td>
                  <th scope="row">{standing.name}</th>
                  <td className="num">{standing.wwcd}</td>
                  <td className="num">{standing.placementPoints}</td>
                  <td className="num">{standing.kills}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { useState } from 'react';
import './KraftonPubgVnArena.css';
import { createSimulatedClaimApi } from './claim';
import CrateCard from './CrateCard';
import Leaderboard from './Leaderboard';
import { createSampleCrates, sampleSquadStandings } from './sampleData';
import { useCrateClaim } from './useCrateClaim';

/** Demo: the server clock matches the client. Real code would measure this. */
const SERVER_OFFSET_MS = 0;

export default function KraftonPubgVnArena() {
  // Created once so countdown targets and the simulated API stay stable.
  const [crates] = useState(() => createSampleCrates());
  const [claimApi] = useState(() => createSimulatedClaimApi({ latencyMs: 700, conflictEvery: 3 }));
  const { stocks, statuses, pendingIds, claim } = useCrateClaim(crates, claimApi);

  return (
    <section className="arena" aria-labelledby="arena-title">
      <h2 id="arena-title">KRAFTON PUBG VN Arena</h2>

      <h3>Airdrop crates</h3>
      <p className="arena__hint">
        Demo: every third claim is rejected with HTTP 409 to show the stock rollback.
      </p>
      <div className="arena__crates">
        {crates.map((crate) => (
          <CrateCard
            key={crate.id}
            crate={crate}
            stock={stocks[crate.id] ?? 0}
            status={statuses[crate.id] ?? 'idle'}
            isPending={pendingIds.has(crate.id)}
            serverOffsetMs={SERVER_OFFSET_MS}
            onClaim={(crateId) => void claim(crateId)}
          />
        ))}
      </div>

      <Leaderboard standings={sampleSquadStandings} />
    </section>
  );
}

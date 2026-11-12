import { useId } from 'react';
import type { ClaimStatus } from './claim';
import AirdropCountdown from './AirdropCountdown';
import { formatVnd } from './formatVnd';
import type { PubgCrateDrop } from './pubgTypes';
import { usePubgAirdropTimer } from './usePubgAirdropTimer';

interface CrateCardProps {
  crate: PubgCrateDrop;
  /** Current, optimistic stock from useCrateClaim. */
  stock: number;
  status: ClaimStatus;
  isPending: boolean;
  serverOffsetMs?: number;
  onClaim: (crateId: string) => void;
}

export default function CrateCard({
  crate,
  stock,
  status,
  isPending,
  serverOffsetMs = 0,
  onClaim,
}: CrateCardProps) {
  const titleId = useId();
  const { remainingMs, isLive } = usePubgAirdropTimer(crate.dropAtEpochMs, serverOffsetMs);

  const soldOut = stock <= 0;
  const canClaim = isLive && !soldOut && !isPending;
  const buttonLabel = isPending
    ? 'Claiming…'
    : soldOut
      ? 'Sold out'
      : !isLive
        ? 'Not live yet'
        : 'Claim crate';

  return (
    <article className="crate-card" aria-labelledby={titleId}>
      <h3 id={titleId}>{crate.name}</h3>
      <p className="crate-card__description">{crate.description}</p>

      <dl className="crate-card__facts">
        <div>
          <dt>Price</dt>
          <dd>{formatVnd(crate.priceVnd)}</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>
            {stock} / {crate.initialStock}
          </dd>
        </div>
      </dl>

      <AirdropCountdown name={crate.name} remainingMs={remainingMs} isLive={isLive} />

      {/* aria-disabled (not `disabled`) keeps focus on the button while the
          claim is in flight; the click guard makes it inert. */}
      <button
        type="button"
        className="crate-card__claim"
        aria-disabled={!canClaim}
        aria-busy={isPending}
        onClick={() => {
          if (canClaim) onClaim(crate.id);
        }}
      >
        {buttonLabel}
      </button>

      {status === 'claimed' && (
        <p className="crate-card__message crate-card__message--ok" role="status">
          Crate claimed.
        </p>
      )}
      {status === 'conflict' && (
        <p className="crate-card__message crate-card__message--error" role="alert">
          Someone else claimed it first. Your stock was restored.
        </p>
      )}
      {status === 'error' && (
        <p className="crate-card__message crate-card__message--error" role="alert">
          We could not confirm your claim. Refresh to check before trying again.
        </p>
      )}
    </article>
  );
}

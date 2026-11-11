import { useCallback, useEffect, useRef, useState } from 'react';
import { isConflictError, type ClaimApi, type ClaimOutcome, type ClaimStatus } from './claim';
import type { PubgCrateDrop } from './pubgTypes';

type CrateStock = Pick<PubgCrateDrop, 'id' | 'stock'>;

export interface UseCrateClaimResult {
  /** Current (optimistic) stock per crate id. Never negative. */
  stocks: Readonly<Record<string, number>>;
  statuses: Readonly<Record<string, ClaimStatus>>;
  /** Crate ids with a claim in flight (the lock, for disabling buttons). */
  pendingIds: ReadonlySet<string>;
  claim: (crateId: string) => Promise<ClaimOutcome>;
}

/**
 * Optimistic crate claiming.
 *
 * 1. A per-crate in-flight lock (`claimId` = crate id) ignores duplicate
 *    clicks. It lives in a ref, so a second click in the same tick is
 *    rejected immediately, before React has re-rendered.
 * 2. Stock is decremented right away (never below 0).
 * 3. The request goes through the injected `claimApi`.
 * 4. HTTP 409 means someone else got it: stock is rolled back (+1).
 *    Any other failure does NOT roll back, because the request may have
 *    reached the server; the status is 'error' so the UI can ask the user
 *    to refresh.
 * 5. The lock is always released in `finally`.
 *
 * `crates` only seeds the initial stock; later changes to it are ignored.
 */
export function useCrateClaim(crates: readonly CrateStock[], claimApi: ClaimApi): UseCrateClaimResult {
  const [stocks, setStocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(crates.map((crate) => [crate.id, Math.max(0, crate.stock)])),
  );
  const [statuses, setStatuses] = useState<Record<string, ClaimStatus>>({});
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  // Refs are the synchronous source of truth for the guards below.
  const stocksRef = useRef(stocks);
  const inFlightRef = useRef(new Set<string>());
  const apiRef = useRef(claimApi);
  const mountedRef = useRef(false);
  apiRef.current = claimApi;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const adjustStock = useCallback((crateId: string, delta: number) => {
    const next = Math.max(0, (stocksRef.current[crateId] ?? 0) + delta);
    stocksRef.current = { ...stocksRef.current, [crateId]: next };
    if (mountedRef.current) setStocks(stocksRef.current);
  }, []);

  const setStatus = useCallback((crateId: string, status: ClaimStatus) => {
    if (mountedRef.current) setStatuses((prev) => ({ ...prev, [crateId]: status }));
  }, []);

  const setPending = useCallback((crateId: string, pending: boolean) => {
    if (!mountedRef.current) return;
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(crateId);
      else next.delete(crateId);
      return next;
    });
  }, []);

  const claim = useCallback(
    async (crateId: string): Promise<ClaimOutcome> => {
      if (!(crateId in stocksRef.current)) return 'unknownCrate';
      if (inFlightRef.current.has(crateId)) return 'locked';
      if (stocksRef.current[crateId] <= 0) {
        setStatus(crateId, 'soldOut');
        return 'soldOut';
      }

      inFlightRef.current.add(crateId);
      setPending(crateId, true);
      setStatus(crateId, 'pending');
      adjustStock(crateId, -1); // optimistic

      try {
        await apiRef.current(crateId);
        setStatus(crateId, 'claimed');
        return 'claimed';
      } catch (error) {
        if (isConflictError(error)) {
          adjustStock(crateId, +1); // roll back only on HTTP 409
          setStatus(crateId, 'conflict');
          return 'conflict';
        }
        setStatus(crateId, 'error');
        return 'error';
      } finally {
        inFlightRef.current.delete(crateId);
        setPending(crateId, false);
      }
    },
    [adjustStock, setPending, setStatus],
  );

  return { stocks, statuses, pendingIds, claim };
}

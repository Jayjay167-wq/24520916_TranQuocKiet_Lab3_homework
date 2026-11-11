/** Calls the backend to claim one unit of a crate. Resolves on success. */
export type ClaimApi = (crateId: string) => Promise<void>;

export type ClaimStatus = 'idle' | 'pending' | 'claimed' | 'conflict' | 'error' | 'soldOut';

/**
 * - claimed:      the server accepted the claim
 * - conflict:     HTTP 409, stock was rolled back
 * - error:        any other failure (stock is NOT rolled back; see useCrateClaim)
 * - locked:       a claim for this crate is already in flight, so this click was ignored
 * - soldOut:      local stock is 0, so no request was sent
 * - unknownCrate: no crate with this id
 */
export type ClaimOutcome = 'claimed' | 'conflict' | 'error' | 'locked' | 'soldOut' | 'unknownCrate';

/** An HTTP failure carrying its status code. */
export class ClaimHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string = `HTTP ${status}`) {
    super(message);
    this.name = 'ClaimHttpError';
    this.status = status;
  }
}

/** True for any error-like value whose `status` is 409 (works for fetch wrappers too). */
export function isConflictError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: unknown }).status === 409
  );
}

export interface SimulatedClaimApiOptions {
  /** Simulated network latency in ms. */
  latencyMs?: number;
  /** Every Nth call fails with HTTP 409 (0 = never). Deterministic, for demos and tests. */
  conflictEvery?: number;
}

/** In-memory stand-in for the real endpoint, with a predictable 409 pattern. */
export function createSimulatedClaimApi({
  latencyMs = 300,
  conflictEvery = 0,
}: SimulatedClaimApiOptions = {}): ClaimApi {
  let calls = 0;
  return (crateId) =>
    new Promise<void>((resolve, reject) => {
      calls += 1;
      const conflict = conflictEvery > 0 && calls % conflictEvery === 0;
      setTimeout(() => {
        if (conflict) reject(new ClaimHttpError(409, `Crate ${crateId} was already claimed`));
        else resolve();
      }, latencyMs);
    });
}

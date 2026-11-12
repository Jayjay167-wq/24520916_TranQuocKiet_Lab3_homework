# HW3 — KRAFTON PUBG VN Arena

An esports airdrop page for Vietnamese PUBG fans: crates with a server-time countdown, an optimistic claim button with rollback, and a filterable, sortable squad leaderboard.

Location: `src/homeworks/KraftonPubgVnArena`

> The squad names (The Expendables, Cerberus Esports, Roy Esports, AGG) are real teams, but **all standings numbers are made up** for development. Crate names, prices and stock are placeholders too.

## Run

```bash
npm install
npm run dev -- --host 127.0.0.1   # development server
npm run build                     # production build
npm run preview -- --host 127.0.0.1
```

The arena is rendered by `src/App.tsx` below the Drum Kit and Piano demos.

## Files

| File | Purpose |
| --- | --- |
| `pubgTypes.ts` | `PubgCrateDrop`, `PubgVnSquadStanding`, `DropPhase`, `LeaderboardSortKey` |
| `sampleData.ts` | Two crates (`createSampleCrates`) and four squads (`sampleSquadStandings`) |
| `formatVnd.ts` | Vietnamese dong formatting |
| `usePubgAirdropTimer.ts` | Countdown hook |
| `claim.ts`, `useCrateClaim.ts` | Claim API contract, simulated API, optimistic claim hook |
| `leaderboard.ts` | Pure rank / filter / sort functions |
| `countdown.ts` | Countdown text and screen-reader announcements |
| `AirdropCountdown.tsx`, `CrateCard.tsx`, `Leaderboard.tsx`, `KraftonPubgVnArena.tsx` | UI |

## Timer behavior

`usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0)` returns `{ remainingMs, isLive }`.

- **Server time.** `serverOffsetMs` is `serverNow - clientNow`, so server time is `Date.now() + serverOffsetMs`. Remaining time is `max(0, target - (Date.now() + serverOffsetMs))`. A non-finite input counts as already live.
- **No drift.** Every tick recomputes the value from the wall clock. It never subtracts 200 ms from the previous value, so a throttled timer (background tab, busy main thread) cannot accumulate error.
- **200 ms tick** with `setInterval`.
- **Visibility resync.** A `visibilitychange` listener on `document` recomputes the value immediately, so returning to a tab shows the right time without waiting for a tick.
- **Stops at zero.** The interval is cleared once the countdown reaches 0, and none starts if the target is already past.
- **Cleanup.** The interval and the listener are removed on unmount and whenever the target or offset changes; the effect then restarts and syncs right away.
- **Demo limitation.** The arena uses a fixed offset of 0. A real app would measure the server clock difference, for example from an HTTP `Date` header.

Accessibility: the ticking time is `aria-hidden`. A visually hidden `<output aria-live="polite">` announces coarse updates (each minute, then each 10 s, then "less than 10 seconds", then "the airdrop is live") so a screen reader does not read every tick. The crate name is part of the text, so two countdowns can be told apart.

## Claim handling

`useCrateClaim(crates, claimApi)` takes the API as an injected function, `(crateId) => Promise<void>`.

1. **In-flight lock.** One claim per crate id (the `claimId`) can run at a time. The lock is a ref, so a second click in the same tick is rejected before React re-renders. The outcome is `'locked'` and no request is sent.
2. **Optimistic decrement.** Stock drops by one immediately. It is clamped at 0, and a crate with no stock returns `'soldOut'` without calling the API.
3. **Request.** The injected `claimApi` is called.
4. **HTTP 409 means roll back.** Another buyer got there first, so stock is restored (+1) and the status becomes `conflict`.
5. **Other failures do not roll back.** A 500 or a network error may have reached the server, so the stock stays decremented and the status becomes `error`. The card shows "Refresh to check before trying again."
6. **`finally` releases the lock**, on success, 409, other errors and non-`Error` rejections alike.

The card's button uses `aria-disabled` (not `disabled`) while a claim is in flight, so keyboard focus is not lost. Errors use `role="alert"`.

**Simulated API.** The arena uses `createSimulatedClaimApi({ latencyMs: 700, conflictEvery: 3 })`: every third claim overall (counted across both crates) is rejected with HTTP 409, which makes the rollback easy to see.

## Leaderboard

- Sort keys: WWCD (wins), placement points, kills. All sort highest first; ties are broken by squad name so the order is stable.
- **Rank first, then filter.** A squad keeps its real position while the list is filtered.
- Filtering is a case-insensitive substring match on the squad name. A blank query shows everyone.
- The rows are computed during render by `getLeaderboardRows(standings, sortKey, query)`, a pure function, so there is no derived state, effect or memo to keep in sync.
- Accessibility: labelled filter input and sort select, a real `<table>` with a caption, `<th scope="col">` column headers and `<th scope="row">` squad names, a polite status line ("Showing 1 of 4 squads, sorted by Kills."), and a focusable, labelled scroll region so the table scrolls inside itself at 375 px.

## VND formatting

`formatVnd(amount)` uses a single `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`: `49000` becomes `49.000 ₫`. Prices are whole dong, so there are no decimals, and fractions round. Intl separates the number and the symbol with a non-breaking space, so a price never wraps.

## Tests

```bash
npm test
npx vitest run src/homeworks/KraftonPubgVnArena   # this homework only
```

| File | Covers |
| --- | --- |
| `formatVnd.test.ts` | Grouping, symbol, zero, rounding, negatives, non-breaking space |
| `sampleData.test.ts` | Crate and squad data contract |
| `usePubgAirdropTimer.test.ts` | Offset and clamping, 200 ms updates, visibility resync, cleanup |
| `claim.test.ts` | `isConflictError`, simulated API latency and 409 pattern |
| `useCrateClaim.test.ts` | Double-click lock, optimistic decrement, 409 rollback, no rollback on other errors, lock release, stock never below 0 |
| `leaderboard.test.ts` | Each sort key, tie-breaks, ranks, filtering |
| `countdown.test.ts` | Countdown text and announcement thresholds |
| `ArenaUi.test.tsx` | Crate card states and alerts, countdown live region, leaderboard controls and table |

The tests use Vitest fake timers and `@testing-library/react`. `npm test -- --runInBand` is a Jest flag; with Vitest use `npm test`, or `vitest run --no-file-parallelism`.

## Manual verification

1. Run the dev server and open the page at 375 px wide; the page itself must not scroll sideways.
2. Click "Claim crate" twice quickly on the live crate: the button turns to "Claiming…", stock drops by 1 once, and only one request is made.
3. Claim until the third claim overall: after about 0.7 s the alert "Someone else claimed it first" appears and the stock goes back up by 1.
4. On the upcoming crate the button reads "Not live yet" until the countdown reaches zero, then becomes "Claim crate".
5. Switch to another tab for a while and come back: the countdown shows the correct time immediately.
6. Type in "Filter squads" and change "Sort by"; the table and the status line update.

## AI failure audit

See [`AI_FAILURE_AUDIT.md`](./AI_FAILURE_AUDIT.md) for the bugs found in AI-generated code, with reproduction, impact, fix and verification.

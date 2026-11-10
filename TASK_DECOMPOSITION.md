# Homework Task Decomposition

## Working agreement

- Scope: documentation and plan only; implementation work is intentionally out of scope for this document.
- Each row is exactly one commit. Complete its acceptance check before creating the listed commit.
- Commands assume the project scripts provide `npm run lint`, `npm test`, `npm run build`, and (where noted) `npm run dev`. Add the scripts during the relevant setup commit if absent.
- Run UI checks at a 375 px-wide viewport. Record Lighthouse results from a production build, not a development server.

## HW1 — Drum Kit

Target directory: `src/homeworks/DrumMachine`

| Step | Sub-tasks | Files | Acceptance check (runnable) | Commit message |
| --- | --- | --- | --- | --- |
| 1. Setup & contract | Establish drum domain types and a `padMap` keyed by physical `KeyboardEvent.code`; include `KeyW`, `KeyA`, `KeyS`, `KeyD`, `KeyJ`, `KeyK`, and `KeyL`. Define pad IDs, labels, samples, and the mapping contract. | `src/homeworks/DrumMachine/drumTypes.*`; `src/homeworks/DrumMachine/padMap.*`; setup/test configuration as required | `npm run lint && npm test -- --runInBand` | `feat(hw1): define drum pad types and pad map` |
| 2. Core logic | Implement `useDrumKeyboard(padMap, onTriggerPad, isEnabled)`. Listen for `keydown` using `event.code` (never `keyCode`); return for `event.repeat`; ignore `INPUT`, `TEXTAREA`, and `SELECT`; prevent default only for a mapped pad; remove the listener on cleanup and when disabled. | `src/homeworks/DrumMachine/useDrumKeyboard.*`; hook test scaffolding if needed | `npm run lint && npm test -- --runInBand` | `feat(hw1): add useDrumKeyboard hook with e.code and repeat guard` |
| 3. UI & a11y | Build `DrumPad` as a real `<button>` with `aria-pressed`; add a visual `DecibelMeter`; expose each hit through `HitLog` using `<output aria-live="polite">`; wire button and keyboard activation to the same trigger path; ensure usable layout at 375 px. | `src/homeworks/DrumMachine/DrumPad.*`; `HitLog.*`; `DecibelMeter.*`; app/style files | `npm run build && npm run dev -- --host 127.0.0.1` (manual: keyboard, buttons, and 375 px viewport) | `feat(hw1): add accessible drum pads, hit log and decibel meter` |
| 4. Tests | Add focused hook/component tests for repeated-key suppression, focus inside supported form controls, and event-listener cleanup on unmount/disable. Keep keyboard test events populated with `code`. | `src/homeworks/DrumMachine/*.test.*`; `src/homeworks/DrumMachine/*.spec.*` | `npm test -- --runInBand` | `test(hw1): cover repeat guard, input focus and cleanup` |
| 5. Delivery | Write usage, key map, accessibility behavior, test instructions, and mobile verification in the homework README. Produce and record Lighthouse 100 scores for Accessibility and Best Practices. | `src/homeworks/DrumMachine/README.md`; Lighthouse evidence/artifact location | `npm run build` and `npx lighthouse http://127.0.0.1:5173 --only-categories=accessibility,best-practices --output=json --output-path=./lighthouse-hw1.json` | `docs(hw1): add README and lighthouse results` |

## HW2 — 88-Key Polyphonic Piano

Target directory: `src/homeworks/GrandPiano88`

| Step | Sub-tasks | Files | Acceptance check (runnable) | Commit message |
| --- | --- | --- | --- | --- |
| 1. Setup & contract | Create a generator for exactly 88 keys, from A0 through C8. Derive frequency with `440 * 2^((midi - 69) / 12)` and classify exactly 52 white and 36 black keys; avoid hard-coded key markup. | `src/homeworks/GrandPiano88/keyGenerator.*`; `src/homeworks/GrandPiano88/types.*`; generator tests | `npm test -- --runInBand` | `feat(hw2): generate 88 piano keys from midi formula` |
| 2. Core logic | Implement `PolyphonicSynth` with a maximum of eight active voices in an ES6 `Map`. On a ninth note, steal the FIFO-oldest voice using `voices.keys().next().value`. Apply click-free release with `exponentialRampToValueAtTime(0.0001, currentTime + 0.04)` before stopping/disconnecting. | `src/homeworks/GrandPiano88/PolyphonicSynth.*`; audio test helpers | `npm run lint && npm test -- --runInBand` | `feat(hw2): add 8-voice polyphonic synth with FIFO stealing` |
| 3. UI & a11y | Render generated keys through `React.memo` using primitive props. Support pointer and keyboard activation, `aria-pressed`, visible focus, and a responsive keyboard. Verify that pressing a key changes only its memoized key component in React Profiler. | `src/homeworks/GrandPiano88/PianoKey.*`; `Piano.*`; styles | `npm run build && npm run dev -- --host 127.0.0.1` (manual: pointer, keyboard, and Profiler check) | `feat(hw2): add memoized piano keyboard UI` |
| 4. Tests | Record `{ midi, freqHz, durationMs, deltaMs }` in FIFO order. Implement replay at 0.5x, 1x, and 2x; cancel scheduled replay with `AbortController` on Stop/unmount; clean up active audio and timers. Test ordering, abort behavior, and cleanup. | `src/homeworks/GrandPiano88/recorder.*`; `replay.*`; `*.test.*` | `npm test -- --runInBand` | `feat(hw2): add FIFO recording and abortable replay` |
| 5. Delivery | Add a README covering keyboard/pointer use, audio behavior, recording/replay speeds, test commands, and exact React DevTools Profiler verification steps. | `src/homeworks/GrandPiano88/README.md` | `npm run lint && npm test -- --runInBand && npm run build` | `test(hw2): cover replay order, abort and cleanup + docs(hw2): add README` |

## HW3 — KRAFTON PUBG VN Arena

Target directory: `src/homeworks/KraftonPubgVnArena`

| Step | Sub-tasks | Files | Acceptance check (runnable) | Commit message |
| --- | --- | --- | --- | --- |
| 1. Setup & contract | Define `PubgCrateDrop` and `PubgVnSquadStanding`; add representative crate and standings data; format prices with `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`. Include The Expendables, Cerberus Esports, Roy Esports, and AGG. | `src/homeworks/KraftonPubgVnArena/types.*`; `sampleData.*`; formatter tests | `npm test -- --runInBand` | `feat(hw3): add PUBG arena domain contract and sample data` |
| 2. Core logic | Implement `usePubgAirdropTimer(targetEpochMs, serverOffsetMs)`: calculate `max(0, targetEpochMs - (Date.now() + serverOffsetMs))`, refresh every 200 ms, immediately resync on `visibilitychange`, and remove interval/listener on cleanup. | `src/homeworks/KraftonPubgVnArena/usePubgAirdropTimer.*`; hook tests | `npm test -- --runInBand` | `feat(hw3): add anti-drift airdrop timer hook with visibility resync` |
| 3. UI & a11y | Add a crate-claim flow with an in-flight `claimId` lock. Decrement stock optimistically, roll back only on HTTP 409, and release the lock in `finally`. Build accessible countdown and crate cards plus a filterable/sortable leaderboard for WWCD, placement, and kills. | `src/homeworks/KraftonPubgVnArena/claim.*`; UI components; styles | `npm run build && npm run dev -- --host 127.0.0.1` (manual: verify duplicate clicks are locked and a mocked 409 restores stock) | `feat(hw3): add optimistic crate claim with 409 rollback` |
| 4. Tests | Test timer offset/clamping, 200 ms updates, visibility resync, and cleanup; test duplicate-claim lock, 409 rollback, and lock release; test leaderboard filtering and each sort key. | `src/homeworks/KraftonPubgVnArena/*.test.*`; `*.spec.*` | `npm test -- --runInBand` | `feat(hw3): add airdrop arena UI and VN squad leaderboard` |
| 5. Delivery | Create `AI_FAILURE_AUDIT.md` documenting at least three verified bugs (reproduction, impact, fix, and verification). Add README instructions for setup, timer behavior, claim handling, leaderboard, tests, and VND formatting. | `src/homeworks/KraftonPubgVnArena/AI_FAILURE_AUDIT.md`; `src/homeworks/KraftonPubgVnArena/README.md` | `npm run lint && npm test -- --runInBand && npm run build` | `docs(hw3): add AI failure audit + docs(hw3): add README` |

## Git plan — 15 commits

Create commits in this order; do not combine rows, even when a commit message contains two conventional-commit scopes.

1. `feat(hw1): define drum pad types and pad map`
2. `feat(hw1): add useDrumKeyboard hook with e.code and repeat guard`
3. `feat(hw1): add accessible drum pads, hit log and decibel meter`
4. `test(hw1): cover repeat guard, input focus and cleanup`
5. `docs(hw1): add README and lighthouse results`
6. `feat(hw2): generate 88 piano keys from midi formula`
7. `feat(hw2): add 8-voice polyphonic synth with FIFO stealing`
8. `feat(hw2): add memoized piano keyboard UI`
9. `feat(hw2): add FIFO recording and abortable replay`
10. `test(hw2): cover replay order, abort and cleanup + docs(hw2): add README`
11. `feat(hw3): add PUBG arena domain contract and sample data`
12. `feat(hw3): add anti-drift airdrop timer hook with visibility resync`
13. `feat(hw3): add optimistic crate claim with 409 rollback`
14. `feat(hw3): add airdrop arena UI and VN squad leaderboard`
15. `docs(hw3): add AI failure audit + docs(hw3): add README`

The two combined HW2/HW3 delivery messages are intentionally retained exactly as specified; every numbered item remains a single commit.

import { REPLAY_SPEEDS, type ReplaySpeed } from './replay';

export type RecorderMode = 'idle' | 'recording' | 'playing';

interface RecorderControlsProps {
  mode: RecorderMode;
  noteCount: number;
  speed: ReplaySpeed;
  /** Spoken to screen readers through a polite live region. */
  status: string;
  onRecord: () => void;
  onStop: () => void;
  onPlay: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
}

export default function RecorderControls({
  mode,
  noteCount,
  speed,
  status,
  onRecord,
  onStop,
  onPlay,
  onSpeedChange,
}: RecorderControlsProps) {
  const canRecord = mode === 'idle';
  const canStop = mode !== 'idle';
  const canPlay = mode === 'idle' && noteCount > 0;

  // aria-disabled (not `disabled`) keeps the clicked button focusable, so
  // keyboard focus is not dropped when Record -> Stop swap availability.
  return (
    <div className="piano-recorder" role="group" aria-label="Recording and playback">
      <button
        type="button"
        className="piano-recorder__btn"
        aria-disabled={!canRecord}
        onClick={() => canRecord && onRecord()}
      >
        Record
      </button>
      <button
        type="button"
        className="piano-recorder__btn"
        aria-disabled={!canStop}
        onClick={() => canStop && onStop()}
      >
        Stop
      </button>
      <button
        type="button"
        className="piano-recorder__btn"
        aria-disabled={!canPlay}
        onClick={() => canPlay && onPlay()}
      >
        Play
      </button>
      <label className="piano-recorder__speed">
        Speed
        <select
          value={String(speed)}
          disabled={mode !== 'idle'}
          onChange={(event) => {
            const next = REPLAY_SPEEDS.find((s) => String(s) === event.target.value);
            if (next) onSpeedChange(next);
          }}
        >
          {REPLAY_SPEEDS.map((s) => (
            <option key={s} value={String(s)}>
              {s}×
            </option>
          ))}
        </select>
      </label>
      <span className="piano-recorder__count">
        {noteCount} {noteCount === 1 ? 'note' : 'notes'} recorded
      </span>
      <p className="piano-recorder__status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

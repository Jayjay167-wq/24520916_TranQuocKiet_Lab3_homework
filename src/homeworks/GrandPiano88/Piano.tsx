import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import './Piano.css';
import { generate88Keys } from './keyGenerator';
import PianoKey from './PianoKey';
import { PolyphonicSynth } from './PolyphonicSynth';
import { Recorder, type RecordedNote } from './recorder';
import RecorderControls, { type RecorderMode } from './RecorderControls';
import { replay, type ReplaySpeed } from './replay';

/** Middle C: the initial Tab stop and the key scrolled into view on mount. */
const ENTRY_MIDI = 60;

function plural(count: number): string {
  return `${count} ${count === 1 ? 'note' : 'notes'}`;
}

export default function Piano() {
  const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
  const [mode, setMode] = useState<RecorderMode>('idle');
  const [recorded, setRecorded] = useState<readonly RecordedNote[]>([]);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [status, setStatus] = useState('Ready. Press Record, then play some keys.');
  const [recorder] = useState(() => new Recorder());

  const scrollRef = useRef<HTMLDivElement>(null);
  const tabStopRef = useRef<HTMLButtonElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<PolyphonicSynth | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(false);

  // Generated once; `slot` = number of white keys before this key.
  const keys = useMemo(() => {
    let whiteCount = 0;
    return generate88Keys().map((key) => {
      const slot = whiteCount;
      if (!key.isBlack) whiteCount += 1;
      return { ...key, slot };
    });
  }, []);

  // The AudioContext is created on the first key press (a user gesture), so
  // browsers' autoplay policies never block it.
  const getSynth = useCallback((): PolyphonicSynth => {
    if (!synthRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      synthRef.current = new PolyphonicSynth(ctx);
    }
    return synthRef.current;
  }, []);

  // Stable identities are what make React.memo on PianoKey effective.
  // The recorder ignores events unless it is recording, so replayed notes
  // (which go through the same handlers) are never re-recorded.
  const handlePress = useCallback(
    (midi: number, freqHz: number) => {
      setPressed((prev) => (prev.has(midi) ? prev : new Set(prev).add(midi)));
      getSynth().noteOn(midi, freqHz);
      recorder.noteOn(midi, freqHz);
    },
    [getSynth, recorder],
  );

  const handleRelease = useCallback(
    (midi: number) => {
      setPressed((prev) => {
        if (!prev.has(midi)) return prev; // idempotent: same state, no re-render
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
      synthRef.current?.noteOff(midi);
      recorder.noteOff(midi);
    },
    [recorder],
  );

  const handleRecord = () => {
    recorder.start();
    setRecorded([]);
    setMode('recording');
    setStatus('Recording started. Previous recording cleared.');
  };

  const handleStop = () => {
    if (mode === 'recording') {
      const notes = recorder.stop();
      setRecorded(notes);
      setMode('idle');
      setStatus(
        notes.length === 0
          ? 'Recording stopped. No notes were recorded.'
          : `Recording stopped. ${plural(notes.length)} recorded.`,
      );
    } else if (mode === 'playing') {
      abortRef.current?.abort(); // handlePlay reports "Playback stopped"
    }
  };

  const handlePlay = async () => {
    if (mode !== 'idle' || recorded.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setMode('playing');
    setStatus(`Playing ${plural(recorded.length)} at ${speed}×.`);

    const result = await replay(
      recorded,
      speed,
      { noteOn: handlePress, noteOff: handleRelease },
      controller.signal,
    );

    if (!isMountedRef.current) return;
    if (abortRef.current === controller) abortRef.current = null;
    setMode('idle');
    setStatus(result === 'completed' ? 'Playback finished.' : 'Playback stopped.');
  };

  // Start with middle C in view and as the Tab stop.
  useEffect(() => {
    const region = scrollRef.current;
    const c4 = region?.querySelector<HTMLButtonElement>(`[data-midi="${ENTRY_MIDI}"]`);
    if (!region || !c4) return;
    tabStopRef.current = c4;
    region.scrollLeft = c4.offsetLeft - region.clientWidth / 2 + c4.offsetWidth / 2;
  }, []);

  // Unmount: cancel any replay (clears its timer and silences notes), then
  // release the audio graph.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
      synthRef.current?.dispose();
      synthRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  // Roving tabindex without React state, so moving focus never re-renders keys.
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || target === tabStopRef.current) return;
    tabStopRef.current?.setAttribute('tabindex', '-1');
    target.setAttribute('tabindex', '0');
    tabStopRef.current = target;
  };

  // DOM order is pitch order, so siblings are chromatic neighbours.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    let next: Element | null | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = target.nextElementSibling;
        break;
      case 'ArrowLeft':
        next = target.previousElementSibling;
        break;
      case 'Home':
        next = target.parentElement?.firstElementChild;
        break;
      case 'End':
        next = target.parentElement?.lastElementChild;
        break;
      default:
        return;
    }
    if (next instanceof HTMLElement) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <section className="piano" aria-labelledby="piano-title">
      <h2 id="piano-title">Grand piano (88 keys)</h2>
      <p id="piano-hint" className="piano__hint">
        Tap or click keys. With the keyboard, Tab to the piano, move with the arrow keys, Home and
        End, and play with Space or Enter. Scroll sideways for more keys.
      </p>
      <RecorderControls
        mode={mode}
        noteCount={recorded.length}
        speed={speed}
        status={status}
        onRecord={handleRecord}
        onStop={handleStop}
        onPlay={() => void handlePlay()}
        onSpeedChange={setSpeed}
      />
      <div
        ref={scrollRef}
        className="piano__scroll"
        role="region"
        aria-label="Piano keyboard, A0 to C8"
        aria-describedby="piano-hint"
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        <div className="piano__keys">
          {keys.map((key) => (
            <PianoKey
              key={key.midi}
              midi={key.midi}
              freqHz={key.freqHz}
              noteName={key.noteName}
              isBlack={key.isBlack}
              slot={key.slot}
              isPressed={pressed.has(key.midi)}
              tabbable={key.midi === ENTRY_MIDI}
              onPress={handlePress}
              onRelease={handleRelease}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

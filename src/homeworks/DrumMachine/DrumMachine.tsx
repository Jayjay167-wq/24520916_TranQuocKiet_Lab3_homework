import { useCallback, useEffect, useRef, useState } from 'react';
import './DrumMachine.css';
import DecibelMeter, { MIN_DB } from './DecibelMeter';
import DrumPad from './DrumPad';
import type { DrumPad as DrumPadData, DrumPadId } from './drumTypes';
import HitLog, { type HitEntry } from './HitLog';
import { DRUM_PADS, padMap } from './padMap';
import { useDrumKeyboard } from './useDrumKeyboard';

const MAX_LOG = 10;
const FLASH_MS = 120;
const DECAY_DB = 5;
const DECAY_TICK_MS = 50;

function playSample(src: string): void {
  // A new Audio per hit lets rapid hits overlap. Missing files or blocked
  // autoplay must never break the UI.
  Promise.resolve(new Audio(src).play()).catch(() => undefined);
}

export default function DrumMachine() {
  const [pressed, setPressed] = useState<ReadonlySet<DrumPadId>>(new Set());
  const [hits, setHits] = useState<readonly HitEntry[]>([]);
  const [levelDb, setLevelDb] = useState(MIN_DB);
  const nextHitId = useRef(1);
  const flashTimers = useRef(new Map<DrumPadId, number>());

  const setPadPressed = useCallback((id: DrumPadId, value: boolean) => {
    setPressed((prev) => {
      if (prev.has(id) === value) return prev;
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // The single trigger path shared by buttons and the keyboard.
  const triggerPad = useCallback((pad: DrumPadData) => {
    const id = nextHitId.current++;
    playSample(pad.sample);
    setHits((prev) =>
      [{ id, label: pad.label, keyLabel: pad.keyLabel, time: Date.now() }, ...prev].slice(0, MAX_LOG),
    );
    setLevelDb(-6 - Math.random() * 18);
  }, []);

  const handleKeyTrigger = useCallback(
    (pad: DrumPadData) => {
      triggerPad(pad);
      setPadPressed(pad.id, true);
    },
    [triggerPad, setPadPressed],
  );

  const handleKeyRelease = useCallback(
    (pad: DrumPadData) => setPadPressed(pad.id, false),
    [setPadPressed],
  );

  const handleButtonTrigger = useCallback(
    (pad: DrumPadData) => {
      triggerPad(pad);
      window.clearTimeout(flashTimers.current.get(pad.id));
      setPadPressed(pad.id, true);
      flashTimers.current.set(
        pad.id,
        window.setTimeout(() => setPadPressed(pad.id, false), FLASH_MS),
      );
    },
    [triggerPad, setPadPressed],
  );

  useDrumKeyboard(padMap, handleKeyTrigger, true, handleKeyRelease);

  // Meter decay: step down until silent; each new hit restarts the chain.
  useEffect(() => {
    if (levelDb <= MIN_DB) return;
    const timer = window.setTimeout(
      () => setLevelDb((level) => Math.max(MIN_DB, level - DECAY_DB)),
      DECAY_TICK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [levelDb]);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <div className="drum-machine">
      <p className="drum-machine__hint">
        Press <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>J</kbd> <kbd>K</kbd>{' '}
        <kbd>L</kbd> or tap a pad.
      </p>
      <div className="drum-machine__pads" role="group" aria-label="Drum pads">
        {DRUM_PADS.map((pad) => (
          <DrumPad
            key={pad.id}
            pad={pad}
            isPressed={pressed.has(pad.id)}
            onTrigger={handleButtonTrigger}
          />
        ))}
      </div>
      <DecibelMeter valueDb={levelDb} />
      <HitLog hits={hits} />
    </div>
  );
}

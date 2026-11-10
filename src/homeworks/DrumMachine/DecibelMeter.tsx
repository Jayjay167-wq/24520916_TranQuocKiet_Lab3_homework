export const MIN_DB = -60;
export const MAX_DB = 0;

interface DecibelMeterProps {
  /** Current level in dB, clamped to [MIN_DB, MAX_DB]. */
  valueDb: number;
}

export default function DecibelMeter({ valueDb }: DecibelMeterProps) {
  const value = Math.min(MAX_DB, Math.max(MIN_DB, valueDb));
  const percent = ((value - MIN_DB) / (MAX_DB - MIN_DB)) * 100;

  return (
    <div
      className="decibel-meter"
      role="meter"
      aria-label="Hit loudness"
      aria-valuemin={MIN_DB}
      aria-valuemax={MAX_DB}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)} decibels`}
    >
      <div className="decibel-meter__fill" style={{ width: `${percent}%` }} />
      <span className="decibel-meter__readout" aria-hidden="true">
        {Math.round(value)} dB
      </span>
    </div>
  );
}

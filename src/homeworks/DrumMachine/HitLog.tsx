export interface HitEntry {
  id: number;
  label: string;
  keyLabel: string;
  time: number;
}

interface HitLogProps {
  hits: readonly HitEntry[];
}

export default function HitLog({ hits }: HitLogProps) {
  return (
    <section className="hit-log" aria-labelledby="hit-log-title">
      <h2 id="hit-log-title">Hit log</h2>
      {/* additions-only so a screen reader announces the new hit, not the whole list */}
      <output
        aria-live="polite"
        aria-relevant="additions"
        aria-atomic="false"
        aria-labelledby="hit-log-title"
      >
        {hits.length === 0 ? (
          <p className="hit-log__empty">No hits yet</p>
        ) : (
          <ol className="hit-log__list" reversed>
            {hits.map((hit) => (
              <li key={hit.id}>
                {hit.label}{' '}
                <time dateTime={new Date(hit.time).toISOString()}>
                  {new Date(hit.time).toLocaleTimeString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </output>
    </section>
  );
}

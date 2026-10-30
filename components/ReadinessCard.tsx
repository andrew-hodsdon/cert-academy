import { StatusBadge } from '@madhare/web-ui';
import type { Readiness } from '@/lib/queries';

/** "Exam-ready" status: the last N full practice exams must average the target or more. */
export function ReadinessCard({ readiness: r, compact = false }: { readiness: Readiness; compact?: boolean }) {
  const slots = Array.from({ length: r.window }, (_, i) => r.recent[i] ?? null);
  const status = r.ready ? 'Exam-ready' : 'Not yet ready';
  const detail = r.ready
    ? `Your last ${r.window} practice exams average ${r.average}%. Book the exam.`
    : r.taken === 0
      ? `Take ${r.window} full practice exams and average ${r.pct}% or more.`
      : r.taken < r.window
        ? `${r.taken} of ${r.window} practice exams taken (average ${r.average}%). ${r.window - r.taken} to go.`
        : `Last ${r.window} average ${r.average}%. You need ${r.pct}%.`;
  return (
    <div className={`readiness ${r.ready ? 'ready' : ''} ${compact ? 'compact' : ''}`}>
      <div className="readiness-head">
        <StatusBadge color={r.ready ? 'green' : r.taken ? 'yellow' : 'gray'}>{status}</StatusBadge>
        {r.average !== null && <span className="readiness-avg">{r.average}%</span>}
      </div>
      <div className="readiness-slots" aria-label="Most recent practice exams, newest first">
        {slots.map((s, i) => (
          <span key={i} className={s === null ? 'empty' : s >= r.pct ? 'good' : 'bad'}>{s === null ? '–' : `${Math.round(s)}%`}</span>
        ))}
      </div>
      <p className="tiny">{detail}</p>
    </div>
  );
}

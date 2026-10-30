import Link from 'next/link';
import { Badge, Button } from '@madhare/web-ui';
import { notFound } from 'next/navigation';
import { getExam } from '@/lib/queries';
import { Markdown } from '@/components/Markdown';
import { startExam, abandonAttempt } from '@/app/actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ course: string; exam: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const p = await params;
  return { title: (await getExam(p.course, p.exam))?.title ?? 'Exam' };
}

export default async function ExamPage({ params }: { params: Params }) {
  const p = await params;
  const exam = await getExam(p.course, p.exam);
  if (!exam || exam.kind === 'bank') notFound();
  const count = exam.draw_count ?? exam.own_questions;
  const open = exam.attempts.filter((a) => a.status === 'in_progress');
  const done = exam.attempts.filter((a) => a.status !== 'in_progress');
  const base = `/courses/${p.course}/exams/${p.exam}`;

  return (
    <>
      <div className="crumbs"><Link href="/">Courses</Link> / <Link href={`/courses/${p.course}`}>{exam.course_title}</Link> / exam</div>
      <h1>{exam.title}</h1>
      <div className="facts">
        <Badge>{exam.kind === 'practice' ? 'Practice exam' : exam.kind === 'quiz' ? 'Domain quiz' : exam.kind}</Badge>
        <Badge>{count} questions</Badge>
        {exam.time_limit_min && <Badge>{exam.time_limit_min} min</Badge>}
        <Badge>pass at {exam.pass_pct}%</Badge>
        {exam.counts_for_readiness && <Badge appearance="solid">counts toward readiness</Badge>}
        {exam.draw_count && <Badge>new random draw each attempt</Badge>}
      </div>
      {exam.instructions_md && <Markdown>{exam.instructions_md}</Markdown>}

      {open.map((a) => (
        <div key={a.attempt_id} className="notice">
          <div>
            Unfinished attempt from {a.started_at.toLocaleString()}
            {a.deadline_at && (a.deadline_at < new Date() ? ' · time expired' : ` · due ${a.deadline_at.toLocaleTimeString()}`)}
          </div>
          <div className="row">
            <Button href={`${base}/attempts/${a.attempt_id}`}>Resume</Button>
            <form action={abandonAttempt.bind(null, p.course, p.exam, a.attempt_id)}>
              <Button appearance="outline" type="submit">Discard</Button>
            </form>
          </div>
        </div>
      ))}

      <form action={startExam.bind(null, p.course, p.exam)} style={{ margin: '20px 0 28px' }}>
        <Button size="lg" type="submit">{exam.time_limit_min ? `Start the clock (${exam.time_limit_min} min)` : 'Start'}</Button>
      </form>

      <h2>Your attempts</h2>
      {done.length === 0 ? <p className="muted">None yet.</p> : (
        <table className="data">
          <thead><tr><th>Submitted</th><th>Questions</th><th>Score</th><th></th></tr></thead>
          <tbody>
            {done.map((a) => (
              <tr key={a.attempt_id}>
                <td>{a.submitted_at?.toLocaleString()}</td>
                <td>{a.questions}</td>
                <td><span className={a.score_pct !== null && a.score_pct >= exam.pass_pct ? 'good' : 'bad'}>{a.score_pct ?? '—'}%</span></td>
                <td><Link href={`${base}/attempts/${a.attempt_id}`}>Review</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

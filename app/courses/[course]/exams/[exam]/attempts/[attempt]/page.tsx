import Link from 'next/link';
import { Badge, Button } from '@madhare/web-ui';
import { notFound } from 'next/navigation';
import { getAttemptToTake, getAttemptReview } from '@/lib/queries';
import { Markdown } from '@/components/Markdown';
import { ExamClock } from '@/components/ExamClock';
import { ReadinessCard } from '@/components/ReadinessCard';
import { submitAttempt } from '@/app/actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ course: string; exam: string; attempt: string }>;
type Search = Promise<{ show?: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function AttemptPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const p = await params;
  if (!UUID.test(p.attempt)) notFound();
  const take = await getAttemptToTake(p.attempt);
  if (!take || take.attempt.course_slug !== p.course || take.attempt.exam_slug !== p.exam) notFound();
  if (take.attempt.status === 'in_progress') return <TakeExam {...take} course={p.course} exam={p.exam} />;
  return <Review attemptId={p.attempt} course={p.course} exam={p.exam} show={(await searchParams).show} />;
}

function TakeExam({ attempt, questions, course, exam }: NonNullable<Awaited<ReturnType<typeof getAttemptToTake>>> & { course: string; exam: string }) {
  const formId = `attempt-${attempt.attempt_id}`;
  return (
    <>
      <div className="crumbs"><Link href={`/courses/${course}`}>{attempt.course_title}</Link> / {attempt.exam_title}</div>
      <h1>{attempt.exam_title}</h1>
      <form id={formId} action={submitAttempt.bind(null, course, exam, attempt.attempt_id)} className="exam-form">
        <ExamClock formId={formId} attemptId={attempt.attempt_id}
          deadline={attempt.deadline_at?.toISOString() ?? null} total={questions.length} />
        {questions.map((q) => (
          <fieldset key={q.question_id} className="question" id={`q${q.ordinal}`}>
            <legend className="qhead">
              <span>Question {q.ordinal} of {questions.length}</span>
              {q.kind === 'multi' && <Badge appearance="outline">select all that apply</Badge>}
            </legend>
            <Markdown>{q.prompt_md}</Markdown>
            {q.choices?.map((c) => (
              <label key={c.key} className="choice">
                <input type={q.kind === 'single' ? 'radio' : 'checkbox'} name={`q:${q.question_id}`} value={c.key} />
                <span><b>{c.key.toUpperCase()}.</b> {c.text}</span>
              </label>
            ))}
            {(q.kind === 'short' || q.kind === 'project') && (
              <textarea name={`q:${q.question_id}`} rows={q.kind === 'project' ? 14 : 5} placeholder="Your answer" />
            )}
          </fieldset>
        ))}
        <div className="submit-row">
          <Button size="lg" type="submit">Submit and grade</Button>
          <span className="muted">Unanswered questions score zero.</span>
        </div>
      </form>
    </>
  );
}

async function Review({ attemptId, course, exam, show }: { attemptId: string; course: string; exam: string; show?: string }) {
  const data = await getAttemptReview(attemptId);
  if (!data) notFound();
  const { attempt, answers, domains, readiness } = data;
  const wrongOnly = show === 'wrong';
  const shown = wrongOnly ? answers.filter((a) => a.is_correct === false) : answers;
  const correct = answers.filter((a) => a.is_correct).length;
  const pending = answers.filter((a) => a.is_correct === null && a.response !== null && a.kind !== 'single' && a.kind !== 'multi').length;
  const passed = attempt.score_pct !== null && attempt.score_pct >= attempt.pass_pct;
  const minutes = attempt.submitted_at ? Math.round((attempt.submitted_at.getTime() - attempt.started_at.getTime()) / 60000) : null;
  const base = `/courses/${course}/exams/${exam}`;

  return (
    <>
      <div className="crumbs">
        <Link href={`/courses/${course}`}>{attempt.course_title}</Link> / <Link href={base}>{attempt.exam_title}</Link> / results
      </div>
      <div className="result-head">
        <div>
          <div className={`score ${passed ? 'good' : 'bad'}`}>{attempt.score_pct ?? '—'}%</div>
          <p className="muted">
            {correct} of {answers.length} correct · {passed ? 'passed' : `below the ${attempt.pass_pct}% line`}
            {minutes !== null && ` · ${minutes} min`}
            {attempt.overtime && ' · submitted after the time limit'}
            {pending > 0 && ` · ${pending} written answer${pending === 1 ? '' : 's'} not scored`}
          </p>
        </div>
        {readiness && <ReadinessCard readiness={readiness} compact />}
      </div>

      {domains.length > 0 && (
        <section>
          <h2>By domain</h2>
          <table className="data domains">
            <thead><tr><th>Domain</th><th>Score</th><th style={{ width: '40%' }}></th></tr></thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.key}>
                  <td>{d.title}</td>
                  <td>{d.earned} / {d.possible}{d.pct !== null && <> · <b className={d.pct >= attempt.pass_pct ? 'good' : 'bad'}>{d.pct}%</b></>}</td>
                  <td>
                    <div className="meter"><span className={d.pct !== null && d.pct >= attempt.pass_pct ? 'good' : 'bad'} style={{ width: `${d.pct ?? 0}%` }} /><i style={{ left: `${attempt.pass_pct}%` }} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="row" style={{ margin: '24px 0 8px' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Review</h2>
        <Button size="sm" appearance={wrongOnly ? 'outline' : 'solid'} href={`${base}/attempts/${attemptId}`}>All ({answers.length})</Button>
        <Button size="sm" appearance={wrongOnly ? 'solid' : 'outline'} href={`${base}/attempts/${attemptId}?show=wrong`}>Missed ({answers.filter((a) => a.is_correct === false).length})</Button>
      </div>

      {shown.map((a) => {
        const chosen = Array.isArray(a.response) ? (a.response as string[]) : [];
        const text = a.response && !Array.isArray(a.response) ? (a.response as { text?: string }).text : undefined;
        const verdict = a.is_correct === null ? 'pending' : a.is_correct ? 'right' : 'wrong';
        const domain = domains.find((d) => d.key === a.domain_key);
        return (
          <section key={a.question_id} className={`question verdict-${verdict}`}>
            <div className="qhead">
              <span>Question {a.ordinal}{domain && <> · {domain.title}</>}</span>
              <span className={verdict === 'right' ? 'good' : verdict === 'wrong' ? 'bad' : ''}>
                {verdict === 'pending' ? 'not scored' : verdict === 'right' ? 'correct' : chosen.length ? 'wrong' : 'unanswered'}
              </span>
            </div>
            <Markdown>{a.prompt_md}</Markdown>
            {a.choices?.map((c) => {
              const isAnswer = a.answer?.includes(c.key);
              const picked = chosen.includes(c.key);
              return (
                <div key={c.key} className={`choice review ${isAnswer ? 'is-answer' : ''} ${picked && !isAnswer ? 'is-wrong' : ''}`}>
                  <span className="mark">{isAnswer ? '✓' : picked ? '✗' : ''}</span>
                  <span><b>{c.key.toUpperCase()}.</b> {c.text}{picked && <em className="tiny"> (your answer)</em>}</span>
                </div>
              );
            })}
            {text !== undefined && <details open><summary>Your answer</summary><p style={{ whiteSpace: 'pre-wrap' }}>{text || '(blank)'}</p></details>}
            {a.explanation_md && <details open={verdict !== 'right'}><summary>Explanation</summary><Markdown>{a.explanation_md}</Markdown></details>}
            {a.rubric_md && <details><summary>Rubric</summary><Markdown>{a.rubric_md}</Markdown></details>}
          </section>
        );
      })}
      {wrongOnly && shown.length === 0 && <p className="muted">Nothing missed.</p>}

      <div className="row" style={{ marginTop: 20 }}>
        <Button href={base}>Take it again</Button>
        <Button appearance="outline" href={`/courses/${course}`}>Back to the course</Button>
      </div>
    </>
  );
}

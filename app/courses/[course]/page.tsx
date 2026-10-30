import Link from 'next/link';
import { Badge } from '@madhare/web-ui';
import { notFound } from 'next/navigation';
import { getCourse } from '@/lib/queries';
import { Markdown } from '@/components/Markdown';
import { ReadinessCard } from '@/components/ReadinessCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const data = await getCourse((await params).course);
  return { title: data?.course.title ?? 'Course' };
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const data = await getCourse(slug);
  if (!data) notFound();
  const { course, lessons, exams, domains, readiness } = data;

  const modules = new Map<string, typeof lessons>();
  for (const l of lessons) modules.set(l.module_slug, [...(modules.get(l.module_slug) ?? []), l]);
  const done = lessons.filter((l) => l.done).length;
  const minutes = lessons.reduce((n, l) => n + (l.est_minutes ?? 0), 0);
  const practice = exams.filter((e) => e.kind === 'practice');
  const quizzes = exams.filter((e) => e.kind !== 'practice');
  const quizFor = (domain: string | null) => quizzes.find((e) => domain && e.slug.startsWith(domain.split('-')[0] + '-'));

  return (
    <>
      <div className="crumbs"><Link href="/">Courses</Link></div>
      <h1>{course.title}</h1>
      {course.subtitle && <p className="lead">{course.subtitle}</p>}
      <div className="course-layout">
        <div>
          <Markdown>{course.summary_md}</Markdown>

          <h2>Practice exams</h2>
          <div className="exam-grid">
            {practice.map((e) => (
              <Link key={e.slug} href={`/courses/${slug}/exams/${e.slug}`} className="card exam-card">
                <b>{e.title}</b>
                <span className="tiny">
                  {e.draw_count} questions{e.time_limit_min && ` · ${e.time_limit_min} min`}
                  {e.counts_for_readiness ? ' · counts toward readiness' : ''}
                </span>
                <span className="tiny">{e.attempts ? `${e.attempts} taken · last ${e.last}% · best ${e.best}%` : 'Not taken yet'}</span>
              </Link>
            ))}
          </div>

          {[...modules.entries()].map(([mslug, ls]) => {
            const quiz = quizFor(ls[0].module_domain) ?? (mslug.includes('case') ? quizzes.find((e) => e.slug.startsWith('case')) : undefined);
            const mdone = ls.filter((l) => l.done).length;
            return (
              <section key={mslug} className="module">
                <h2><span className="n">{String(ls[0].module_ordinal).padStart(2, '0')}</span>{ls[0].module_title}</h2>
                {ls[0].module_summary && <div className="muted"><Markdown>{ls[0].module_summary}</Markdown></div>}
                <ul className="lesson-list">
                  {ls.map((l) => (
                    <li key={l.slug}>
                      <span className={`done-mark ${l.done ? 'on' : ''}`} title={l.done ? 'completed' : 'not completed'}>{l.done ? '✓' : ''}</span>
                      <Link href={`/courses/${slug}/${mslug}/${l.slug}`}>{l.title}</Link>
                      {l.kind !== 'reading' && <Badge>{l.kind}</Badge>}
                      {l.est_minutes && <span className="tiny">{l.est_minutes} min</span>}
                    </li>
                  ))}
                </ul>
                <div className="module-foot tiny">
                  {mdone} of {ls.length} lessons done
                  {quiz && <> · <Link href={`/courses/${slug}/exams/${quiz.slug}`}>{quiz.title}</Link>
                    {quiz.best !== null && ` (best ${quiz.best}%)`}</>}
                </div>
              </section>
            );
          })}
        </div>

        <aside>
          <ReadinessCard readiness={readiness} />

          {domains.length > 0 && (
            <div className="side-card">
              <h3>Your accuracy by domain</h3>
              <p className="tiny">Every graded answer so far. Aim for {course.readiness_pct}%+ everywhere.</p>
              {domains.map((d) => (
                <div key={d.key} className="domain-row">
                  <div className="domain-label"><span>{d.title}</span><span className="tiny">{d.weight_pct}%</span></div>
                  <div className="meter">
                    <span className={d.accuracy === null ? '' : d.accuracy >= course.readiness_pct ? 'good' : 'bad'} style={{ width: `${d.accuracy ?? 0}%` }} />
                    <i style={{ left: `${course.readiness_pct}%` }} />
                  </div>
                  <div className="tiny">{d.accuracy === null ? 'no answers yet' : `${d.accuracy}% of ${d.answered}`} · {d.bank} in bank</div>
                </div>
              ))}
            </div>
          )}

          <div className="side-card">
            <h3>Progress</h3>
            <div className="meter"><span className="good" style={{ width: `${lessons.length ? (done / lessons.length) * 100 : 0}%` }} /></div>
            <p className="tiny">{done} of {lessons.length} lessons · about {Math.round(minutes / 60)} h of reading</p>
            <h3>Quizzes</h3>
            {quizzes.map((e) => (
              <Link key={e.slug} href={`/courses/${slug}/exams/${e.slug}`} className="exam-link">
                <span>{e.title}</span>
                <span className="tiny">{e.best !== null ? `best ${e.best}%` : `${e.draw_count ?? e.questions} q`}</span>
              </Link>
            ))}
          </div>

          {course.exam_facts_md && (
            <div className="side-card">
              <h3>The real exam</h3>
              <Markdown>{course.exam_facts_md}</Markdown>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

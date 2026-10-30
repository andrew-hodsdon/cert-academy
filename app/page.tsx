import Link from 'next/link';
import { Badge, EmptyState } from '@madhare/web-ui';
import { listCourses } from '@/lib/queries';
import { ReadinessCard } from '@/components/ReadinessCard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const courses = await listCourses();
  return (
    <>
      <section className="hero">
        <h1>Cert <span>Academy</span></h1>
        <p className="lead">
          Study each domain, hold 80% on its quiz, then sit full-length timed practice exams.
          A certification is <b>exam-ready</b> when your last three full practice exams average 80% or more.
        </p>
      </section>
      {courses.length === 0 && <EmptyState title="No courses loaded yet" appearance="neutral">Run npm run load -- --all</EmptyState>}
      <div className="grid">
        {courses.map((c) => {
          const pct = c.lessons ? Math.round((c.completed / c.lessons) * 100) : 0;
          return (
            <Link key={c.slug} href={`/courses/${c.slug}`} className="card course-card">
              <h2>{c.title}</h2>
              {c.subtitle && <p className="muted">{c.subtitle}</p>}
              <div className="facts">
                <Badge>{c.modules} modules</Badge>
                <Badge>{c.lessons} lessons</Badge>
                <Badge>{c.questions} questions</Badge>
                {c.estimated_hours && <Badge>~{c.estimated_hours} h</Badge>}
              </div>
              <div className="meter" title={`${pct}% of lessons done`}><span className="good" style={{ width: `${pct}%` }} /></div>
              <p className="tiny">{c.completed} of {c.lessons} lessons done</p>
              <ReadinessCard readiness={c.readiness} compact />
            </Link>
          );
        })}
      </div>
    </>
  );
}

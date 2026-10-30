import Link from 'next/link';
import { Badge, Button } from '@madhare/web-ui';
import { notFound } from 'next/navigation';
import { getCourse, getLesson } from '@/lib/queries';
import { Markdown } from '@/components/Markdown';
import { setLessonDone } from '@/app/actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ course: string; module: string; lesson: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const p = await params;
  const l = await getLesson(p.course, p.module, p.lesson);
  return { title: l?.title ?? 'Lesson' };
}

export default async function LessonPage({ params }: { params: Params }) {
  const p = await params;
  const [lesson, course] = await Promise.all([getLesson(p.course, p.module, p.lesson), getCourse(p.course)]);
  if (!lesson || !course) notFound();

  const order = course.lessons;
  const i = order.findIndex((l) => l.module_slug === p.module && l.slug === p.lesson);
  const prev = order[i - 1];
  const next = order[i + 1];
  const href = (l: (typeof order)[number]) => `/courses/${p.course}/${l.module_slug}/${l.slug}`;
  const path = `/courses/${p.course}/${p.module}/${p.lesson}`;

  return (
    <>
      <div className="lesson-head">
        <div className="crumbs">
          <Link href="/">Courses</Link> / <Link href={`/courses/${p.course}`}>{lesson.course_title}</Link> / {lesson.module_title}
        </div>
        <h1>{lesson.title}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {lesson.kind !== 'reading' && <Badge>{lesson.kind}</Badge>}
          {lesson.est_minutes && <Badge>{lesson.est_minutes} min</Badge>}
          <span className="tiny">lesson {i + 1} of {order.length}</span>
        </div>
      </div>

      {lesson.objectives.length > 0 && (
        <div className="objectives" style={{ maxWidth: 860 }}>
          <h3>By the end you can</h3>
          <ul>{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      )}

      <Markdown>{lesson.body_md}</Markdown>

      {lesson.sources.length > 0 && (
        <section className="sources">
          <h2>Sources</h2>
          <ul>
            {lesson.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> <Badge>{s.kind.replace('_', ' ')}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        action={async () => { 'use server'; await setLessonDone(lesson.lesson_id, !lesson.done, path); }}
        style={{ margin: '26px 0 0' }}
      >
        <Button appearance={lesson.done ? 'outline' : 'solid'} type="submit">
          {lesson.done ? '✓ Completed (undo)' : 'Mark as completed'}
        </Button>
      </form>

      <nav className="lesson-nav">
        {prev ? <Link href={href(prev)}><span className="tiny">← previous</span><br />{prev.title}</Link> : <span />}
        {next ? <Link className="next" href={href(next)}><span className="tiny">next →</span><br />{next.title}</Link> : <span />}
      </nav>
    </>
  );
}

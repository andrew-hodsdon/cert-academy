import 'server-only';
import { q, learner } from './db';

export interface Readiness {
  pct: number;            // the target average, e.g. 80
  window: number;         // how many recent practice exams count, e.g. 3
  taken: number;          // practice exams in that window so far
  average: number | null; // their average score
  ready: boolean;
  recent: number[];       // newest first
}

/** Exam-ready means the last `window` readiness exams average `pct` or more. */
export async function getReadiness(courseId: string): Promise<Readiness> {
  const [course] = await q<{ readiness_pct: number; readiness_window: number }>(
    'SELECT readiness_pct, readiness_window FROM learning.course WHERE course_id = $1', [courseId]);
  const rows = await q<{ score_pct: number }>(`
    SELECT a.score_pct FROM learning.exam_attempt a JOIN learning.exam e USING (exam_id)
    WHERE e.course_id = $1 AND e.counts_for_readiness AND a.learner_id = $2
      AND a.status = 'graded' AND a.score_pct IS NOT NULL
    ORDER BY a.submitted_at DESC LIMIT $3`, [courseId, learner(), course.readiness_window]);
  const recent = rows.map((r) => r.score_pct);
  const average = recent.length ? Math.round((recent.reduce((n, s) => n + s, 0) / recent.length) * 10) / 10 : null;
  return {
    pct: course.readiness_pct, window: course.readiness_window, taken: recent.length, average, recent,
    ready: recent.length >= course.readiness_window && average !== null && average >= course.readiness_pct,
  };
}

export interface CourseCard {
  course_id: string; slug: string; ordinal: number; title: string; subtitle: string | null; summary_md: string;
  level: string; estimated_hours: number | null; status: string; updated_at: Date; exam_facts_md: string | null;
  modules: number; lessons: number; exams: number; questions: number; completed: number;
}

export async function listCourses() {
  const courses = await q<CourseCard>(`
    SELECT c.course_id, c.slug, c.ordinal, c.title, c.subtitle, c.summary_md, c.level, c.estimated_hours, c.status,
           c.updated_at, c.exam_facts_md,
           (SELECT count(*) FROM learning.module m WHERE m.course_id = c.course_id)::int AS modules,
           (SELECT count(*) FROM learning.lesson l JOIN learning.module m USING (module_id) WHERE m.course_id = c.course_id)::int AS lessons,
           (SELECT count(*) FROM learning.exam e WHERE e.course_id = c.course_id AND e.kind <> 'bank')::int AS exams,
           (SELECT count(*) FROM learning.exam_question x JOIN learning.exam e USING (exam_id)
             WHERE e.course_id = c.course_id AND e.kind IN ('quiz','bank'))::int AS questions,
           (SELECT count(*) FROM learning.lesson_progress p JOIN learning.lesson l USING (lesson_id)
              JOIN learning.module m USING (module_id)
            WHERE m.course_id = c.course_id AND p.learner_id = $1 AND p.status = 'completed')::int AS completed
    FROM learning.course c WHERE c.status = 'published' ORDER BY c.ordinal`, [learner()]);
  return Promise.all(courses.map(async (c) => ({ ...c, readiness: await getReadiness(c.course_id) })));
}

export interface LessonRow {
  module_slug: string; module_title: string; module_ordinal: number; module_summary: string | null;
  module_domain: string | null; slug: string; title: string; kind: string; est_minutes: number | null;
  ordinal: number; done: boolean;
}

export interface DomainStat {
  key: string; ordinal: number; title: string; weight_pct: number;
  bank: number;                 // questions available to draw
  answered: number; correct: number; accuracy: number | null;
}

export interface ExamCard {
  slug: string; title: string; kind: string; pass_pct: number; draw_count: number | null;
  time_limit_min: number | null; counts_for_readiness: boolean; questions: number;
  attempts: number; best: number | null; last: number | null;
}

export async function getCourse(slug: string) {
  const [course] = await q<CourseCard & { readiness_pct: number }>(
    `SELECT course_id, slug, ordinal, title, subtitle, summary_md, level, estimated_hours, status, updated_at,
            exam_facts_md, readiness_pct
     FROM learning.course WHERE slug = $1`, [slug]);
  if (!course) return null;
  const lessons = await q<LessonRow>(`
    SELECT m.slug AS module_slug, m.title AS module_title, m.ordinal AS module_ordinal, m.summary_md AS module_summary,
           m.domain_key AS module_domain, l.slug, l.title, l.kind, l.est_minutes, l.ordinal,
           coalesce(p.status = 'completed', false) AS done
    FROM learning.module m JOIN learning.lesson l USING (module_id)
    LEFT JOIN learning.lesson_progress p ON p.lesson_id = l.lesson_id AND p.learner_id = $2
    WHERE m.course_id = $1 ORDER BY m.ordinal, l.ordinal`, [course.course_id, learner()]);
  const exams = await q<ExamCard>(`
    SELECT e.slug, e.title, e.kind, e.pass_pct, e.draw_count, e.time_limit_min, e.counts_for_readiness,
           (SELECT count(*) FROM learning.exam_question x WHERE x.exam_id = e.exam_id)::int AS questions,
           (SELECT count(*) FROM learning.exam_attempt a WHERE a.exam_id = e.exam_id AND a.learner_id = $2
              AND a.status = 'graded')::int AS attempts,
           (SELECT max(score_pct) FROM learning.exam_attempt a WHERE a.exam_id = e.exam_id AND a.learner_id = $2
              AND a.status = 'graded') AS best,
           (SELECT score_pct FROM learning.exam_attempt a WHERE a.exam_id = e.exam_id AND a.learner_id = $2
              AND a.status = 'graded' ORDER BY submitted_at DESC LIMIT 1) AS last
    FROM learning.exam e WHERE e.course_id = $1 AND e.kind <> 'bank' ORDER BY e.ordinal`, [course.course_id, learner()]);
  const domains = await q<DomainStat>(`
    SELECT d.key, d.ordinal, d.title, d.weight_pct,
           (SELECT count(*) FROM learning.exam_question x JOIN learning.exam e USING (exam_id)
             WHERE e.course_id = d.course_id AND e.kind IN ('quiz','bank') AND x.domain_key = d.key)::int AS bank,
           count(ans.question_id)::int AS answered,
           count(ans.question_id) FILTER (WHERE ans.is_correct)::int AS correct,
           CASE WHEN count(ans.question_id) > 0
             THEN round(100.0 * count(ans.question_id) FILTER (WHERE ans.is_correct) / count(ans.question_id), 1) END AS accuracy
    FROM learning.domain d
    LEFT JOIN (
      SELECT x.domain_key, x.question_id, an.is_correct, e.course_id
      FROM learning.exam_answer an
      JOIN learning.exam_attempt a USING (attempt_id)
      JOIN learning.exam_question x ON x.question_id = an.question_id
      JOIN learning.exam e ON e.exam_id = x.exam_id
      WHERE a.learner_id = $2 AND a.status = 'graded' AND an.is_correct IS NOT NULL
    ) ans ON ans.domain_key = d.key AND ans.course_id = d.course_id
    WHERE d.course_id = $1
    GROUP BY d.course_id, d.key, d.ordinal, d.title, d.weight_pct ORDER BY d.ordinal`, [course.course_id, learner()]);
  const readiness = await getReadiness(course.course_id);
  return { course, lessons, exams, domains, readiness };
}

export interface SourceRef { slug: string; title: string; url: string; kind: string; summary_md: string | null }

export async function getLesson(course: string, mod: string, lesson: string) {
  const [row] = await q<{
    lesson_id: string; title: string; kind: string; est_minutes: number | null; objectives: string[];
    body_md: string; updated_at: Date; module_title: string; course_title: string; done: boolean;
  }>(`
    SELECT l.lesson_id, l.title, l.kind, l.est_minutes, l.objectives, l.body_md, l.updated_at,
           m.title AS module_title, c.title AS course_title,
           coalesce(p.status = 'completed', false) AS done
    FROM learning.course c JOIN learning.module m USING (course_id) JOIN learning.lesson l USING (module_id)
    LEFT JOIN learning.lesson_progress p ON p.lesson_id = l.lesson_id AND p.learner_id = $4
    WHERE c.slug = $1 AND m.slug = $2 AND l.slug = $3`, [course, mod, lesson, learner()]);
  if (!row) return null;
  const sources = await q<SourceRef>(`
    SELECT a.slug, a.title, s.url, s.kind, a.summary_md
    FROM learning.lesson_source ls
    JOIN library.article a USING (article_id) JOIN library.source s USING (source_id)
    WHERE ls.lesson_id = $1 ORDER BY a.title`, [row.lesson_id]);
  return { ...row, sources };
}

export interface ExamInfo {
  exam_id: string; course_id: string; title: string; kind: string; pass_pct: number; instructions_md: string | null;
  draw_count: number | null; time_limit_min: number | null; counts_for_readiness: boolean; course_title: string;
  own_questions: number;
}

export async function getExam(course: string, exam: string) {
  const [row] = await q<ExamInfo>(`
    SELECT e.exam_id, e.course_id, e.title, e.kind, e.pass_pct, e.instructions_md, e.draw_count, e.time_limit_min,
           e.counts_for_readiness, c.title AS course_title,
           (SELECT count(*) FROM learning.exam_question x WHERE x.exam_id = e.exam_id)::int AS own_questions
    FROM learning.exam e JOIN learning.course c USING (course_id) WHERE c.slug = $1 AND e.slug = $2`, [course, exam]);
  if (!row) return null;
  const attempts = await q<{ attempt_id: string; started_at: Date; submitted_at: Date | null; score_pct: number | null;
    status: string; deadline_at: Date | null; questions: number }>(`
    SELECT a.attempt_id, a.started_at, a.submitted_at, a.score_pct, a.status, a.deadline_at,
           (SELECT count(*) FROM learning.attempt_question aq WHERE aq.attempt_id = a.attempt_id)::int AS questions
    FROM learning.exam_attempt a
    WHERE a.exam_id = $1 AND a.learner_id = $2 ORDER BY a.started_at DESC LIMIT 15`, [row.exam_id, learner()]);
  return { ...row, attempts };
}

export interface AttemptQuestion {
  question_id: string; key: string; ordinal: number; kind: 'single' | 'multi' | 'short' | 'project';
  domain_key: string | null; prompt_md: string; choices: { key: string; text: string }[] | null; points: number;
}

export interface AttemptHeader {
  attempt_id: string; status: string; score_pct: number | null; started_at: Date; deadline_at: Date | null;
  submitted_at: Date | null; overtime: boolean; exam_title: string; exam_kind: string; pass_pct: number;
  counts_for_readiness: boolean; course_id: string; course_slug: string; course_title: string; exam_slug: string;
}

async function attemptHeader(attemptId: string) {
  const [attempt] = await q<AttemptHeader>(`
    SELECT a.attempt_id, a.status, a.score_pct, a.started_at, a.deadline_at, a.submitted_at, a.overtime,
           e.title AS exam_title, e.kind AS exam_kind, e.pass_pct, e.counts_for_readiness,
           c.course_id, c.slug AS course_slug, c.title AS course_title, e.slug AS exam_slug
    FROM learning.exam_attempt a JOIN learning.exam e USING (exam_id) JOIN learning.course c USING (course_id)
    WHERE a.attempt_id = $1 AND a.learner_id = $2`, [attemptId, learner()]);
  return attempt ?? null;
}

/** The drawn questions, without answers: for taking the exam. */
export async function getAttemptToTake(attemptId: string) {
  const attempt = await attemptHeader(attemptId);
  if (!attempt) return null;
  const questions = await q<AttemptQuestion>(`
    SELECT x.question_id, x.key, aq.ordinal, x.kind, x.domain_key, x.prompt_md, x.choices, x.points
    FROM learning.attempt_question aq JOIN learning.exam_question x USING (question_id)
    WHERE aq.attempt_id = $1 ORDER BY aq.ordinal`, [attemptId]);
  return { attempt, questions };
}

export interface ReviewedAnswer extends AttemptQuestion {
  answer: string[] | null; explanation_md: string | null; rubric_md: string | null;
  response: unknown; is_correct: boolean | null; points_awarded: number | null;
}

export interface DomainScore { key: string; title: string; ordinal: number; earned: number; possible: number; pct: number | null }

/** The graded attempt: answers, explanations and the per-domain breakdown. */
export async function getAttemptReview(attemptId: string) {
  const attempt = await attemptHeader(attemptId);
  if (!attempt) return null;
  const answers = await q<ReviewedAnswer>(`
    SELECT x.question_id, x.key, aq.ordinal, x.kind, x.domain_key, x.prompt_md, x.choices, x.points, x.answer,
           x.explanation_md, x.rubric_md, an.response, an.is_correct, an.points_awarded
    FROM learning.attempt_question aq JOIN learning.exam_question x USING (question_id)
    LEFT JOIN learning.exam_answer an ON an.attempt_id = aq.attempt_id AND an.question_id = aq.question_id
    WHERE aq.attempt_id = $1 ORDER BY aq.ordinal`, [attemptId]);
  const domains = await q<DomainScore>(`
    SELECT d.key, d.title, d.ordinal,
           coalesce(sum(an.points_awarded), 0)::float AS earned,
           coalesce(sum(x.points) FILTER (WHERE an.is_correct IS NOT NULL), 0)::float AS possible,
           CASE WHEN sum(x.points) FILTER (WHERE an.is_correct IS NOT NULL) > 0
             THEN round(100.0 * sum(an.points_awarded) / sum(x.points) FILTER (WHERE an.is_correct IS NOT NULL), 1) END AS pct
    FROM learning.attempt_question aq
    JOIN learning.exam_question x USING (question_id)
    JOIN learning.domain d ON d.key = x.domain_key AND d.course_id = $2
    LEFT JOIN learning.exam_answer an ON an.attempt_id = aq.attempt_id AND an.question_id = aq.question_id
    WHERE aq.attempt_id = $1
    GROUP BY d.key, d.title, d.ordinal ORDER BY d.ordinal`, [attemptId, attempt.course_id]);
  const readiness = attempt.counts_for_readiness ? await getReadiness(attempt.course_id) : null;
  return { attempt, answers, domains, readiness };
}

export const listArticles = () => q<{ slug: string; title: string; authors: string[]; published_at: Date | null;
  summary_md: string | null; tags: string[]; url: string; kind: string; site: string | null; cited_by: string[] }>(`
  SELECT a.slug, a.title, a.authors, a.published_at, a.summary_md, a.tags, s.url, s.kind, s.site,
         coalesce(array_agg(DISTINCT c.title) FILTER (WHERE c.slug IS NOT NULL), '{}') AS cited_by
  FROM library.article a JOIN library.source s USING (source_id)
  LEFT JOIN learning.lesson_source ls ON ls.article_id = a.article_id
  LEFT JOIN learning.lesson l USING (lesson_id) LEFT JOIN learning.module m USING (module_id)
  LEFT JOIN learning.course c USING (course_id)
  GROUP BY a.article_id, s.source_id ORDER BY a.title`);

export const searchLibrary = (term: string) => q<{ kind: string; title: string; href: string; snippet: string }>(`
  WITH query AS (SELECT websearch_to_tsquery('english', $1) AS tq)
  SELECT kind, title, href, snippet FROM (
    SELECT 'lesson' AS kind, l.title, '/courses/' || c.slug || '/' || m.slug || '/' || l.slug AS href,
           ts_headline('english', l.body_md, tq, 'MaxWords=24,MinWords=10,StartSel=⟦,StopSel=⟧') AS snippet,
           ts_rank(to_tsvector('english', l.title || ' ' || l.body_md), tq) AS rank
    FROM learning.lesson l JOIN learning.module m USING (module_id) JOIN learning.course c USING (course_id), query
    WHERE to_tsvector('english', l.title || ' ' || l.body_md) @@ tq
    UNION ALL
    SELECT 'source', a.title, s.url, ts_headline('english', coalesce(a.summary_md, ''), tq, 'MaxWords=24,MinWords=10,StartSel=⟦,StopSel=⟧'),
           ts_rank(a.tsv, tq)
    FROM library.article a JOIN library.source s USING (source_id), query WHERE a.tsv @@ tq
  ) r ORDER BY rank DESC LIMIT 30`, [term]);

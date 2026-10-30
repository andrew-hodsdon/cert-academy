'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type pg from 'pg';
import { pool, learner } from '@/lib/db';
import { allocate } from '@/lib/draw';

export async function setLessonDone(lessonId: string, done: boolean, path: string) {
  if (done) {
    await pool().query(
      `INSERT INTO learning.lesson_progress (learner_id, lesson_id, status, completed_at) VALUES ($1,$2,'completed',now())
       ON CONFLICT (learner_id, lesson_id) DO UPDATE SET status='completed', completed_at=now()`,
      [learner(), lessonId]);
  } else {
    await pool().query('DELETE FROM learning.lesson_progress WHERE learner_id=$1 AND lesson_id=$2', [learner(), lessonId]);
  }
  revalidatePath(path);
}

interface ExamRow { exam_id: string; course_id: string; kind: string; draw_count: number | null; time_limit_min: number | null }

// Least-seen first, then random: a learner who retakes an exam sees new questions before repeats.
const LEAST_SEEN = `
  (SELECT count(*) FROM learning.attempt_question aq JOIN learning.exam_attempt a USING (attempt_id)
    WHERE aq.question_id = x.question_id AND a.learner_id = $LEARNER) ASC, random()`;

/** Picks the questions for a new attempt, in the order they will be shown. */
async function drawQuestions(db: pg.PoolClient, exam: ExamRow): Promise<string[]> {
  const me = learner();
  if (exam.kind !== 'practice') {
    if (!exam.draw_count) {
      const { rows } = await db.query<{ question_id: string }>(
        'SELECT question_id FROM learning.exam_question WHERE exam_id=$1 ORDER BY ordinal', [exam.exam_id]);
      return rows.map((r) => r.question_id);
    }
    const { rows } = await db.query<{ question_id: string }>(
      `SELECT x.question_id FROM learning.exam_question x WHERE x.exam_id=$1
       ORDER BY ${LEAST_SEEN.replace('$LEARNER', '$2')} LIMIT $3`, [exam.exam_id, me, exam.draw_count]);
    return rows.map((r) => r.question_id);
  }

  // Practice exam: every auto-graded question in the course's quizzes and banks, split by domain weight.
  const { rows: domains } = await db.query<{ key: string; weight_pct: number }>(
    'SELECT key, weight_pct FROM learning.domain WHERE course_id=$1 ORDER BY ordinal', [exam.course_id]);
  const { rows: pool } = await db.query<{ question_id: string; domain_key: string }>(
    `SELECT x.question_id, x.domain_key FROM learning.exam_question x JOIN learning.exam e USING (exam_id)
     WHERE e.course_id=$1 AND e.kind IN ('quiz','bank') AND x.kind IN ('single','multi')
     ORDER BY ${LEAST_SEEN.replace('$LEARNER', '$2')}`, [exam.course_id, me]);
  const byDomain = new Map<string, string[]>();
  for (const p of pool) byDomain.set(p.domain_key, [...(byDomain.get(p.domain_key) ?? []), p.question_id]);
  const quotas = allocate(exam.draw_count!, domains.map((d) => ({ key: d.key, weight: Number(d.weight_pct) })));

  const picked: string[] = [];
  for (const d of domains) picked.push(...(byDomain.get(d.key) ?? []).splice(0, quotas.get(d.key) ?? 0));
  // A domain with a thin bank leaves a gap; fill it from what is left, least seen first.
  const leftovers = pool.map((p) => p.question_id).filter((id) => !picked.includes(id));
  picked.push(...leftovers.slice(0, Math.max(0, exam.draw_count! - picked.length)));
  // Mix the domains, as the real exam does.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

/** Starts an attempt: draws its questions, sets its deadline, and opens it. */
export async function startExam(courseSlug: string, examSlug: string) {
  const db = await pool().connect();
  let attemptId: string;
  try {
    await db.query('BEGIN');
    const { rows: [exam] } = await db.query<ExamRow>(
      `SELECT e.exam_id, e.course_id, e.kind, e.draw_count, e.time_limit_min
       FROM learning.exam e JOIN learning.course c USING (course_id) WHERE c.slug=$1 AND e.slug=$2`,
      [courseSlug, examSlug]);
    if (!exam || exam.kind === 'bank') throw new Error('exam not found');
    const questions = await drawQuestions(db, exam);
    if (questions.length === 0) throw new Error('this exam has no questions to draw yet');
    const { rows: [attempt] } = await db.query<{ attempt_id: string }>(
      `INSERT INTO learning.exam_attempt (exam_id, learner_id, deadline_at)
       VALUES ($1, $2, CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(mins => $3::int) END)
       RETURNING attempt_id`, [exam.exam_id, learner(), exam.time_limit_min]);
    attemptId = attempt.attempt_id;
    await db.query(
      `INSERT INTO learning.attempt_question (attempt_id, question_id, ordinal)
       SELECT $1, q, n FROM unnest($2::uuid[]) WITH ORDINALITY AS t(q, n)`, [attemptId, questions]);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    db.release();
  }
  redirect(`/courses/${courseSlug}/exams/${examSlug}/attempts/${attemptId}`);
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

// Network and clock slack before a late submission is marked overtime.
const GRACE_SECONDS = 90;

/**
 * Grades an attempt's drawn questions. Choice questions are graded now (blank is wrong);
 * short and project answers are stored ungraded for rubric review, outside the score.
 */
export async function submitAttempt(courseSlug: string, examSlug: string, attemptId: string, form: FormData) {
  const db = await pool().connect();
  try {
    await db.query('BEGIN');
    const { rows: [attempt] } = await db.query<{ status: string; overtime: boolean }>(
      `SELECT status, (deadline_at IS NOT NULL AND now() > deadline_at + make_interval(secs => $3)) AS overtime
       FROM learning.exam_attempt WHERE attempt_id=$1 AND learner_id=$2 FOR UPDATE`,
      [attemptId, learner(), GRACE_SECONDS]);
    if (!attempt) throw new Error('attempt not found');
    if (attempt.status !== 'in_progress') {
      // Already graded (double submit, or the timer fired after a manual submit): just show it.
      await db.query('ROLLBACK');
      redirect(`/courses/${courseSlug}/exams/${examSlug}/attempts/${attemptId}`);
    }
    const { rows: questions } = await db.query<{ question_id: string; kind: string; answer: string[] | null; points: number }>(
      `SELECT x.question_id, x.kind, x.answer, x.points
       FROM learning.attempt_question aq JOIN learning.exam_question x USING (question_id) WHERE aq.attempt_id=$1`,
      [attemptId]);

    let earned = 0, possible = 0, pending = 0;
    for (const q of questions) {
      const raw = form.getAll(`q:${q.question_id}`).map(String);
      let response: unknown, correct: boolean | null = null, points: number | null = null;
      if (q.kind === 'single' || q.kind === 'multi') {
        response = raw;
        correct = sameSet(raw, q.answer ?? []);
        points = correct ? Number(q.points) : 0;
        earned += points;
        possible += Number(q.points);
      } else {
        response = { text: raw[0] ?? '' };
        pending++;
      }
      await db.query(
        `INSERT INTO learning.exam_answer (attempt_id, question_id, response, is_correct, points_awarded)
         VALUES ($1,$2,$3,$4,$5)`,
        [attemptId, q.question_id, JSON.stringify(response), correct, points]);
    }
    const score = possible ? Math.round((earned / possible) * 10000) / 100 : null;
    await db.query(
      `UPDATE learning.exam_attempt SET submitted_at=now(), score_pct=$2, status=$3, overtime=$4 WHERE attempt_id=$1`,
      [attemptId, score, pending ? 'submitted' : 'graded', attempt.overtime]);
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    db.release();
  }
  redirect(`/courses/${courseSlug}/exams/${examSlug}/attempts/${attemptId}`);
}

/** Abandons an unfinished attempt so it no longer shows as in progress. */
export async function abandonAttempt(courseSlug: string, examSlug: string, attemptId: string) {
  await pool().query(
    `DELETE FROM learning.exam_attempt WHERE attempt_id=$1 AND learner_id=$2 AND status='in_progress'`,
    [attemptId, learner()]);
  redirect(`/courses/${courseSlug}/exams/${examSlug}`);
}

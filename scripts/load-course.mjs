// Loads course content from content/courses/<slug>/ into cert_academy.
//
//   npm run load -- <slug> [<slug>...]     load (upsert) the named courses
//   npm run load -- --all                  load every course directory
//   npm run load -- --check <slug>         validate only, no database writes
//
// One transaction per course. Rows are matched on slugs/keys so learner progress and
// exam history survive reloads; modules, lessons and questions removed from the files
// are deleted. The schema's statement triggers NOTIFY the site, which re-renders live.
// Format: content/TEMPLATE.md.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import pg from 'pg';

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const ROOT = join(CONTENT, 'courses');
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ORDERED = /^(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)(\.md)?$/;
const yaml = (file) => matter(`---\n${readFileSync(file, 'utf8')}\n---\n`).data;
const sha = (s) => createHash('sha256').update(s).digest('hex');

class ContentError extends Error {}
function need(cond, where, msg) {
  if (!cond) throw new ContentError(`${where}: ${msg}`);
}
function oneOf(v, allowed, where, field) {
  need(allowed.includes(v), where, `${field} must be one of ${allowed.join('|')}, got ${JSON.stringify(v)}`);
}

/**
 * Library rows a course writes are namespaced by course slug: a source (URL) is shared,
 * but each course's notes on it are its own article, so courses can't overwrite each other.
 */
export const articleSlug = (course, slug) => `${course}--${slug}`;

export function readCourse(slug) {
  const dir = join(ROOT, slug);
  need(existsSync(join(dir, 'course.yaml')), dir, 'missing course.yaml');
  const where = `${slug}/course.yaml`;
  const c = yaml(join(dir, 'course.yaml'));
  need(c.slug === slug, where, `slug must equal the directory name "${slug}"`);
  need(Number.isInteger(c.ordinal), where, 'ordinal must be an integer');
  need(typeof c.title === 'string' && c.title, where, 'title is required');
  need(typeof c.summary_md === 'string' && c.summary_md.trim(), where, 'summary_md is required');
  oneOf(c.level, ['foundation', 'practitioner', 'advanced'], where, 'level');
  oneOf(c.status ?? 'draft', ['draft', 'published'], where, 'status');
  const domains = c.domains ?? [];
  need(Array.isArray(domains), where, 'domains must be a list');
  const domainKeys = new Set();
  for (const [i, d] of domains.entries()) {
    const w = `${where} domains[${i}]`;
    need(SLUG.test(d.key ?? ''), w, 'key must be kebab-case');
    need(!domainKeys.has(d.key), w, `duplicate domain ${d.key}`);
    domainKeys.add(d.key);
    need(typeof d.title === 'string' && d.title, w, 'title is required');
    need(typeof d.weight === 'number' && d.weight > 0 && d.weight <= 100, w, 'weight must be a percentage');
  }
  if (domains.length) {
    const total = domains.reduce((n, d) => n + d.weight, 0);
    need(Math.abs(total - 100) < 0.01, where, `domain weights must sum to 100, got ${total}`);
  }
  const readiness = c.readiness ?? {};
  need(readiness.pct === undefined || (readiness.pct > 0 && readiness.pct <= 100), where, 'readiness.pct must be a percentage');
  need(readiness.window === undefined || (Number.isInteger(readiness.window) && readiness.window > 0), where, 'readiness.window must be a positive integer');

  // Sources live in the course's sources.yaml and in any module's own sources.yaml, so
  // modules can be written independently. Slugs must be unique across all of them.
  const sourceFiles = [join(dir, 'sources.yaml'),
    ...readdirSync(dir).sort().filter((d) => ORDERED.test(d) && !d.endsWith('.md')).map((d) => join(dir, d, 'sources.yaml'))];
  const sources = sourceFiles.filter((f) => existsSync(f)).flatMap((f) => yaml(f).sources ?? []);
  const sourceSlugs = new Set();
  for (const [i, s] of sources.entries()) {
    const w = `${slug}/sources.yaml[${i}]`;
    need(SLUG.test(s.slug ?? ''), w, 'slug must be kebab-case');
    need(!sourceSlugs.has(s.slug), w, `duplicate slug ${s.slug}`);
    sourceSlugs.add(s.slug);
    need(/^https?:\/\//.test(s.url ?? ''), w, 'url must be http(s)');
    need(typeof s.title === 'string' && s.title, w, 'title is required');
    oneOf(s.kind, ['web', 'paper', 'repo', 'vendor_docs', 'product_docs', 'video', 'book', 'standard'], w, 'kind');
    need(typeof s.summary_md === 'string' && s.summary_md.trim(), w, 'summary_md (our notes on the source) is required');
  }


  const modules = [];
  for (const mdir of readdirSync(dir).sort()) {
    const m = ORDERED.exec(mdir);
    if (!m || m[3] || !statSync(join(dir, mdir)).isDirectory()) continue;
    const w = `${slug}/${mdir}`;
    need(existsSync(join(dir, mdir, 'module.yaml')), w, 'missing module.yaml');
    const meta = yaml(join(dir, mdir, 'module.yaml'));
    need(typeof meta.title === 'string' && meta.title, `${w}/module.yaml`, 'title is required');
    if (meta.domain !== undefined) need(domainKeys.has(meta.domain), `${w}/module.yaml`, `domain "${meta.domain}" is not in course.yaml domains`);
    const lessons = [];
    for (const f of readdirSync(join(dir, mdir)).sort()) {
      const l = ORDERED.exec(f);
      if (!l || !l[3]) continue;
      const lw = `${w}/${f}`;
      const raw = readFileSync(join(dir, mdir, f), 'utf8');
      const { data, content } = matter(raw);
      need(typeof data.title === 'string' && data.title, lw, 'frontmatter title is required');
      oneOf(data.kind, ['reading', 'lab', 'project', 'reference'], lw, 'kind');
      need(content.trim().length > 0, lw, 'lesson body is empty');
      for (const ref of data.sources ?? []) need(sourceSlugs.has(ref), lw, `source "${ref}" is not in sources.yaml`);
      lessons.push({
        slug: l[2], ordinal: Number(l[1]), title: data.title, kind: data.kind,
        est_minutes: data.est_minutes ?? null, objectives: data.objectives ?? [],
        body_md: content.trim(), sources: data.sources ?? [], sha: sha(raw),
      });
    }
    need(lessons.length > 0, w, 'module has no lessons (expected NN-slug.md files)');
    modules.push({ slug: m[2], ordinal: Number(m[1]), title: meta.title, summary_md: meta.summary_md ?? null, domain: meta.domain ?? null, lessons });
  }
  need(modules.length > 0, slug, 'course has no modules (expected NN-slug/ directories)');

  const exams = [];
  const examDir = join(dir, 'exams');
  if (existsSync(examDir)) {
    for (const f of readdirSync(examDir).sort()) {
      if (!f.endsWith('.yaml')) continue;
      const w = `${slug}/exams/${f}`;
      const e = yaml(join(examDir, f));
      need(e.slug === f.replace(/\.yaml$/, ''), w, 'slug must equal the file name');
      need(typeof e.title === 'string' && e.title, w, 'title is required');
      oneOf(e.kind, ['quiz', 'practice', 'bank', 'final', 'project'], w, 'kind');
      e.questions ??= [];
      need(Array.isArray(e.questions), w, 'questions must be a list');
      if (e.kind === 'practice') {
        need(Number.isInteger(e.draw) && e.draw > 0, w, 'practice exams need draw: <number of questions>');
        need(domains.length > 0, w, 'practice exams draw by domain weight, so course.yaml needs domains');
      } else {
        need(e.questions.length > 0, w, 'questions[] is required');
        need(e.draw === undefined || (Number.isInteger(e.draw) && e.draw > 0 && e.draw <= e.questions.length), w,
          'draw must be a positive integer no larger than the number of questions');
      }
      need(e.readiness === undefined || typeof e.readiness === 'boolean', w, 'readiness must be true or false');
      need(e.time_limit_min === undefined || (Number.isInteger(e.time_limit_min) && e.time_limit_min > 0), w,
        'time_limit_min must be a positive integer');
      const keys = new Set();
      for (const [i, q] of e.questions.entries()) {
        const qw = `${w} questions[${i}]`;
        need(SLUG.test(q.key ?? ''), qw, 'key must be kebab-case and stable across edits');
        need(!keys.has(q.key), qw, `duplicate key ${q.key}`);
        keys.add(q.key);
        oneOf(q.kind, ['single', 'multi', 'short', 'project'], qw, 'kind');
        if (domains.length) need(domainKeys.has(q.domain), qw, `domain must be one of ${[...domainKeys].join('|')}, got ${JSON.stringify(q.domain)}`);
        need(typeof q.prompt_md === 'string' && q.prompt_md.trim(), qw, 'prompt_md is required');
        if (q.kind === 'single' || q.kind === 'multi') {
          need(Array.isArray(q.choices) && q.choices.length >= 2, qw, 'choices[] needs at least 2 entries');
          const ck = new Set(q.choices.map((c) => c.key));
          need(ck.size === q.choices.length, qw, 'choice keys must be unique');
          need(Array.isArray(q.answer) && q.answer.length > 0 && q.answer.every((a) => ck.has(a)), qw, 'answer[] must list valid choice keys');
          if (q.kind === 'single') need(q.answer.length === 1, qw, 'single questions have exactly one answer');
        } else {
          need(typeof q.rubric_md === 'string' && q.rubric_md.trim(), qw, 'short/project questions need rubric_md');
        }
      }
      exams.push({ ...e, ordinal: e.ordinal ?? exams.length + 1 });
    }
  }

  // Question keys are unique per exam, but practice exams mix every bank, so keep them
  // unique across the course too: a duplicate would make attempt reviews ambiguous.
  const seen = new Map();
  for (const e of exams) for (const q of e.questions) {
    need(!seen.has(q.key), `${slug}/exams/${e.slug}.yaml`, `question key "${q.key}" is also used in ${seen.get(q.key)}`);
    seen.set(q.key, e.slug);
  }

  // Bank coverage: what a practice exam can draw per domain.
  const pool = new Map();
  for (const e of exams) if (['quiz', 'bank'].includes(e.kind)) {
    for (const q of e.questions) if (q.kind === 'single' || q.kind === 'multi') pool.set(q.domain, (pool.get(q.domain) ?? 0) + 1);
  }
  const warnings = [];
  for (const e of exams.filter((x) => x.kind === 'practice')) {
    for (const d of domains) {
      const want = Math.round((e.draw * d.weight) / 100);
      const have = pool.get(d.key) ?? 0;
      if (have < want) warnings.push(`${e.slug}: domain ${d.key} wants ${want} questions, bank has ${have}`);
    }
  }
  return { course: c, domains, sources, modules, exams, pool, warnings,
    sha: sha(JSON.stringify({ c, sources, modules, exams })) };
}

async function upsertSources(db, course, sources) {
  const ids = new Map();
  for (const s of sources) {
    const { rows: [src] } = await db.query(
      `INSERT INTO library.source (kind, url, site, title, author, published_at, license, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (url) DO UPDATE SET kind=EXCLUDED.kind, site=EXCLUDED.site, title=EXCLUDED.title,
         author=EXCLUDED.author, published_at=EXCLUDED.published_at, license=EXCLUDED.license, fetched_at=now()
       RETURNING source_id`,
      [s.kind, s.url, s.site ?? null, s.title, (s.authors ?? []).join(', ') || null, s.published ?? null, s.license ?? null, null]);
    const body = s.body_md ?? null;
    const { rows: [a] } = await db.query(
      `INSERT INTO library.article (source_id, slug, title, authors, published_at, summary_md, body_md, content_sha256, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (slug) DO UPDATE SET source_id=EXCLUDED.source_id, title=EXCLUDED.title, authors=EXCLUDED.authors,
         published_at=EXCLUDED.published_at, summary_md=EXCLUDED.summary_md, body_md=EXCLUDED.body_md,
         content_sha256=EXCLUDED.content_sha256, tags=EXCLUDED.tags
       RETURNING article_id`,
      [src.source_id, articleSlug(course, s.slug), s.title, s.authors ?? [], s.published ?? null, s.summary_md, body,
       sha(s.summary_md + (body ?? '')), s.tags ?? []]);
    ids.set(s.slug, { article_id: a.article_id });
  }
  return ids;
}

async function loadCourse(db, slug) {
  const { course: c, domains, sources, modules, exams, sha: contentSha } = readCourse(slug);
  await db.query('BEGIN');
  try {
    const sourceIds = await upsertSources(db, slug, sources);

    const { rows: [course] } = await db.query(
      `INSERT INTO learning.course (slug, ordinal, title, subtitle, summary_md, level, estimated_hours, status,
         readiness_pct, readiness_window, exam_facts_md, content_sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (slug) DO UPDATE SET ordinal=EXCLUDED.ordinal, title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
         summary_md=EXCLUDED.summary_md, level=EXCLUDED.level, estimated_hours=EXCLUDED.estimated_hours,
         status=EXCLUDED.status, readiness_pct=EXCLUDED.readiness_pct, readiness_window=EXCLUDED.readiness_window,
         exam_facts_md=EXCLUDED.exam_facts_md, content_sha256=EXCLUDED.content_sha256
       RETURNING course_id`,
      [c.slug, c.ordinal, c.title, c.subtitle ?? null, c.summary_md, c.level, c.estimated_hours ?? null,
       c.status ?? 'draft', c.readiness?.pct ?? 80, c.readiness?.window ?? 3, c.exam_facts_md ?? null, contentSha]);

    for (const [i, d] of domains.entries()) {
      await db.query(
        `INSERT INTO learning.domain (course_id, key, ordinal, title, weight_pct) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (course_id, key) DO UPDATE SET ordinal=EXCLUDED.ordinal, title=EXCLUDED.title, weight_pct=EXCLUDED.weight_pct`,
        [course.course_id, d.key, i + 1, d.title, d.weight]);
    }
    await db.query('DELETE FROM learning.domain WHERE course_id=$1 AND NOT (key = ANY($2))',
      [course.course_id, domains.map((d) => d.key)]);

    const keepModules = [];
    for (const m of modules) {
      const { rows: [mod] } = await db.query(
        `INSERT INTO learning.module (course_id, slug, ordinal, title, summary_md, domain_key) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (course_id, slug) DO UPDATE SET ordinal=EXCLUDED.ordinal, title=EXCLUDED.title,
           summary_md=EXCLUDED.summary_md, domain_key=EXCLUDED.domain_key
         RETURNING module_id`,
        [course.course_id, m.slug, m.ordinal, m.title, m.summary_md, m.domain]);
      keepModules.push(mod.module_id);
      const keepLessons = [];
      for (const l of m.lessons) {
        const { rows: [les] } = await db.query(
          `INSERT INTO learning.lesson (module_id, slug, ordinal, title, kind, est_minutes, objectives, body_md, content_sha256)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (module_id, slug) DO UPDATE SET ordinal=EXCLUDED.ordinal, title=EXCLUDED.title, kind=EXCLUDED.kind,
             est_minutes=EXCLUDED.est_minutes, objectives=EXCLUDED.objectives, body_md=EXCLUDED.body_md,
             content_sha256=EXCLUDED.content_sha256
           WHERE learning.lesson.content_sha256 IS DISTINCT FROM EXCLUDED.content_sha256 OR learning.lesson.ordinal <> EXCLUDED.ordinal
           RETURNING lesson_id`,
          [mod.module_id, l.slug, l.ordinal, l.title, l.kind, l.est_minutes, l.objectives, l.body_md, l.sha]);
        const lessonId = les?.lesson_id ?? (await db.query(
          'SELECT lesson_id FROM learning.lesson WHERE module_id=$1 AND slug=$2', [mod.module_id, l.slug])).rows[0].lesson_id;
        keepLessons.push(lessonId);
        await db.query('DELETE FROM learning.lesson_source WHERE lesson_id=$1', [lessonId]);
        for (const ref of l.sources) {
          const t = sourceIds.get(ref);
          await db.query('INSERT INTO learning.lesson_source (lesson_id, article_id) VALUES ($1,$2)', [lessonId, t.article_id]);
        }
      }
      await db.query('DELETE FROM learning.lesson WHERE module_id=$1 AND NOT (lesson_id = ANY($2))', [mod.module_id, keepLessons]);
    }
    await db.query('DELETE FROM learning.module WHERE course_id=$1 AND NOT (module_id = ANY($2))', [course.course_id, keepModules]);

    const keepExams = [];
    for (const e of exams) {
      const { rows: [ex] } = await db.query(
        `INSERT INTO learning.exam (course_id, slug, ordinal, title, kind, pass_pct, instructions_md, draw_count, time_limit_min,
           counts_for_readiness)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (course_id, slug) DO UPDATE SET ordinal=EXCLUDED.ordinal, title=EXCLUDED.title, kind=EXCLUDED.kind,
           pass_pct=EXCLUDED.pass_pct, instructions_md=EXCLUDED.instructions_md, draw_count=EXCLUDED.draw_count,
           time_limit_min=EXCLUDED.time_limit_min, counts_for_readiness=EXCLUDED.counts_for_readiness
         RETURNING exam_id`,
        [course.course_id, e.slug, e.ordinal, e.title, e.kind, e.pass_pct ?? 70, e.instructions_md ?? null,
         e.draw ?? null, e.time_limit_min ?? null, e.readiness ?? e.kind === 'practice']);
      keepExams.push(ex.exam_id);
      const keys = [];
      for (const [i, q] of e.questions.entries()) {
        keys.push(q.key);
        await db.query(
          `INSERT INTO learning.exam_question (exam_id, key, ordinal, kind, domain_key, prompt_md, choices, answer,
             explanation_md, rubric_md, points)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (exam_id, key) DO UPDATE SET ordinal=EXCLUDED.ordinal, kind=EXCLUDED.kind, domain_key=EXCLUDED.domain_key,
             prompt_md=EXCLUDED.prompt_md, choices=EXCLUDED.choices, answer=EXCLUDED.answer,
             explanation_md=EXCLUDED.explanation_md, rubric_md=EXCLUDED.rubric_md, points=EXCLUDED.points`,
          [ex.exam_id, q.key, i + 1, q.kind, q.domain ?? null, q.prompt_md, q.choices ? JSON.stringify(q.choices) : null,
           q.answer ? JSON.stringify(q.answer) : null, q.explanation_md ?? null, q.rubric_md ?? null, q.points ?? 1]);
      }
      await db.query('DELETE FROM learning.exam_question WHERE exam_id=$1 AND NOT (key = ANY($2))', [ex.exam_id, keys]);
    }
    await db.query('DELETE FROM learning.exam WHERE course_id=$1 AND NOT (exam_id = ANY($2))', [course.course_id, keepExams]);
    // Prune this course's notes on sources it no longer cites.
    const kept = sources.map((s) => articleSlug(slug, s.slug));
    await db.query(`DELETE FROM library.article WHERE slug LIKE $1 AND NOT (slug = ANY($2))`, [`${slug}--%`, kept]);
    await db.query('COMMIT');
    const lessons = modules.reduce((n, m) => n + m.lessons.length, 0);
    const questions = exams.reduce((n, e) => n + e.questions.length, 0);
    console.log(`loaded ${slug}: ${domains.length} domains, ${modules.length} modules, ${lessons} lessons, ${exams.length} exams, ${questions} questions, ${sources.length} sources`);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  let slugs = args.filter((a) => !a.startsWith('--'));
  if (args.includes('--all')) slugs = readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'course.yaml')));
  if (slugs.length === 0) {
    console.error('usage: npm run load -- [--check] <slug>... | --all');
    process.exit(2);
  }
  if (check) {
    for (const s of slugs) {
      const r = readCourse(s);
      const banked = [...r.pool.values()].reduce((n, v) => n + v, 0);
      console.log(`ok ${s}: ${r.domains.length} domains, ${r.modules.length} modules, ` +
        `${r.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons, ${r.exams.length} exams, ${banked} banked questions`);
      for (const d of r.domains) console.log(`   ${d.key.padEnd(28)} ${String(d.weight).padStart(5)}%  bank ${r.pool.get(d.key) ?? 0}`);
      for (const w of r.warnings) console.log(`   warning: ${w}`);
    }
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set (expected in .env.local)');
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: 'academy-loader' });
  await db.connect();
  try {
    for (const s of slugs) await loadCourse(db, s);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err instanceof ContentError ? `content error: ${err.message}` : err);
  process.exit(1);
});

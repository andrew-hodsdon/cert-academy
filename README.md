# Cert Academy

Certification prep with full courses, domain quizzes and timed, weighted practice exams. Each
certification shows an **exam-ready** badge once your last three full practice exams average 80%
or more.

| Course | Built on | Lessons | Question bank | Full practice exam |
|---|---|---|---|---|
| CISSP (`cissp`) | ISC2 outline effective 15 April 2024 | 8 domains + orientation | 400 | 125 questions, 3 h |
| Google Cloud Professional Cloud Architect (`gcp-pca`) | current exam guide, case studies v6.1 | 6 sections + case studies + orientation | 6 section banks + case studies | 55 questions, 2 h |

All study material and questions are original. They are not affiliated with ISC2 or Google, and contain no real exam items.

## How it works

- **Content is files.** `content/courses/<slug>/` holds the course metadata and domains,
  module folders of markdown lessons, and `exams/*.yaml`. The format is in
  [content/TEMPLATE.md](content/TEMPLATE.md), the writing rules in
  [content/WRITING.md](content/WRITING.md), and the verified official outlines in
  [content/OUTLINES.md](content/OUTLINES.md).
- **The loader** (`npm run load`) validates the files and upserts them into Postgres. Slugs and
  question keys are stable, so your progress and attempt history survive reloads. Open pages
  refresh live through Postgres `NOTIFY`.
- **Exams draw questions:**
  - A domain quiz draws N questions at random from its own bank.
  - A practice exam draws from every bank in the course, split by the official domain weights
    (largest-remainder rounding).
  - Both draw the questions you have seen least first.
  - The attempt records the questions it drew, and the clock is enforced in the browser:
    answers are saved locally and auto-submitted at zero.
  - Results show a per-domain breakdown and a review of every answer you missed.
- **UI:** Next.js 16 on the Mad Hare kit, `@madhare/web-ui` controls with the `madhare` theme
  from `@madhare/web-themes`. The two kit packages are vendored as tarballs in `vendor/`
  (packed from `madharedev/madhare-web` v1.0.0), because the private registry is unavailable.

## Run it

```bash
npm ci
cp .env.example .env.local      # then fill DATABASE_URL; chmod 600
npm run load -- --check --all   # validate content only
npm run load -- --all           # write to the database
npm run dev                     # http://localhost:3310
```

To set up the database once (roles, database and schema), see [db/README.md](db/README.md).

## Layout

```
app/             pages: courses, lessons, exams, attempts, sources, search
components/      Markdown renderer, ExamClock (timer and autosave), ReadinessCard
lib/             db pool, queries, draw (domain-weight allocation)
scripts/         load-course.mjs
db/              00-bootstrap.sql (roles and database), 01-schema.sql (schema)
content/         courses and the authoring guides
vendor/          @madhare/web-ui and @madhare/web-themes tarballs
```

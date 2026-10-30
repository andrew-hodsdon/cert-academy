# Database

Cert Academy uses one Postgres database (`cert_academy`). It runs on the local AlloyDB Omni
container, `jbc-vectors-alloy` on mh-ai, alongside the other databases there.

| File | Runs as | What it does |
|---|---|---|
| `00-bootstrap.sql` | `postgres`, in `postgres` | creates the `<db>_owner` (NOLOGIN) and app login roles, and the database |
| `01-schema.sql` | `postgres`, in the new database | creates the `learning` and `library` schemas, tables, triggers and grants |

The owner role owns every object. The app role gets only `SELECT/INSERT/UPDATE/DELETE`, so
a leaked app credential can't drop or alter tables.

## Create it

Generate the password and keep it off the command line: `printf` is a shell builtin, so the
password goes in on stdin and never shows up in `ps`.

```bash
cd db
umask 077
PW=$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-32)
{ printf '\\set app_password %s\n' "$PW"; cat 00-bootstrap.sql; } |
  docker exec -i jbc-vectors-alloy psql -X -q -U postgres -d postgres -v db=cert_academy -v app_role=cert_app
docker exec -i jbc-vectors-alloy psql -X -q -U postgres -d cert_academy \
  -v db=cert_academy -v app_role=cert_app < 01-schema.sql
IP=$(docker inspect jbc-vectors-alloy --format '{{.NetworkSettings.Networks.bridge.IPAddress}}')
printf 'DATABASE_URL=postgres://cert_app:%s@%s:5432/cert_academy\nACADEMY_LEARNER=andrew\n' "$PW" "$IP" > ../.env.local
unset PW
```

The container's port isn't published on the host. Applications connect over the Docker bridge
IP, which can change when the container is recreated. If it changes, update `.env.local`.

## Main tables

| Table | Holds |
|---|---|
| `learning.course` | One row per certification, with its readiness rule (`readiness_pct`, `readiness_window`) |
| `learning.domain` | The official domains or sections and their weights |
| `learning.module`, `learning.lesson` | The course content |
| `learning.exam` | Quizzes, practice exams and banks, with `draw_count`, `time_limit_min` and `counts_for_readiness` |
| `learning.exam_question` | Questions, each tagged with a `domain_key` |
| `learning.exam_attempt` | Each attempt: start, deadline, submission, score and overtime flag |
| `learning.attempt_question` | The questions an attempt drew, in display order |
| `learning.exam_answer` | Your responses and how each was graded |
| `library.source`, `library.article` | Cited sources, with our notes on each |

Useful query: readiness over your last three full practice exams.

```sql
SELECT c.slug, round(avg(score_pct), 1) AS avg_last_3
FROM (SELECT e.course_id, a.score_pct,
             row_number() OVER (PARTITION BY e.course_id ORDER BY a.submitted_at DESC) AS n
      FROM learning.exam_attempt a JOIN learning.exam e USING (exam_id)
      WHERE e.counts_for_readiness AND a.status = 'graded') r
JOIN learning.course c USING (course_id)
WHERE n <= 3 GROUP BY c.slug;
```

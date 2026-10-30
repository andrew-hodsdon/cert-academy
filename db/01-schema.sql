-- Cert Academy: schema. Run as postgres, connected to the new database.
--
--   psql -d cert_academy -v db=cert_academy -v app_role=cert_app -f 01-schema.sql
--
-- Two schemas:
--   learning   certifications (courses), domains, modules, lessons, exams, question banks,
--              attempts with the questions each attempt drew, and progress.
--   library    the sources the lessons cite, with our notes on each.
--
-- Content tables are upserted by the loader; changes NOTIFY 'academy_content' so the
-- site re-renders live.

\set ON_ERROR_STOP on
\set owner_role :db '_owner'

BEGIN;

-- psql variables do not expand inside $$ bodies; hand the role names to the DO blocks.
SET LOCAL academy.app_role = :'app_role';
SET LOCAL academy.owner_role = :'owner_role';

SET ROLE :"owner_role";

CREATE SCHEMA learning;
CREATE SCHEMA library;

-- ---------------------------------------------------------------- shared functions

CREATE FUNCTION learning.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

-- Statement-level, so a 200-lesson reload sends one notification per table, not 200.
CREATE FUNCTION learning.notify_content() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('academy_content',
    json_build_object('table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, 'op', TG_OP)::text);
  RETURN NULL;
END $$;

-- ---------------------------------------------------------------- library

CREATE TABLE library.source (
  source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('web','paper','repo','vendor_docs','product_docs',
    'video','book','standard')),
  url text NOT NULL UNIQUE,
  site text, title text NOT NULL, author text,
  published_at date,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  license text,
  notes text
);

CREATE TABLE library.article (
  article_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES library.source(source_id),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  authors text[] NOT NULL DEFAULT '{}',
  published_at date,
  summary_md text,
  body_md text,
  content_sha256 char(64),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english',
    title || ' ' || coalesce(summary_md, '') || ' ' || coalesce(body_md, ''))) STORED
);
CREATE INDEX article_tsv ON library.article USING gin (tsv);
CREATE INDEX article_tags ON library.article USING gin (tags);

-- ---------------------------------------------------------------- learning

-- One course per certification.
CREATE TABLE learning.course (
  course_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordinal integer NOT NULL,
  title text NOT NULL,
  subtitle text,
  summary_md text NOT NULL,
  level text NOT NULL CHECK (level IN ('foundation','practitioner','advanced')),
  estimated_hours numeric(5,1),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  -- Exam-ready when the last readiness_window practice exams average readiness_pct or more.
  readiness_pct numeric(5,2) NOT NULL DEFAULT 80,
  readiness_window integer NOT NULL DEFAULT 3 CHECK (readiness_window > 0),
  exam_facts_md text,       -- the real exam's format, shown on the course page
  content_sha256 char(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The official exam's domains (CISSP) or sections (Google), with their weight.
CREATE TABLE learning.domain (
  course_id uuid NOT NULL REFERENCES learning.course(course_id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordinal integer NOT NULL,
  title text NOT NULL,
  weight_pct numeric(5,2) NOT NULL CHECK (weight_pct > 0 AND weight_pct <= 100),
  PRIMARY KEY (course_id, key)
);

CREATE TABLE learning.module (
  module_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES learning.course(course_id) ON DELETE CASCADE,
  slug text NOT NULL,
  ordinal integer NOT NULL,
  title text NOT NULL,
  summary_md text,
  domain_key text,          -- the exam domain this module teaches, if any
  UNIQUE (course_id, slug)
);

CREATE TABLE learning.lesson (
  lesson_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES learning.module(module_id) ON DELETE CASCADE,
  slug text NOT NULL,
  ordinal integer NOT NULL,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reading','lab','project','reference')),
  est_minutes integer,
  objectives text[] NOT NULL DEFAULT '{}',
  body_md text NOT NULL,
  content_sha256 char(64) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);

CREATE TABLE learning.lesson_source (
  lesson_id uuid NOT NULL REFERENCES learning.lesson(lesson_id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES library.article(article_id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, article_id)
);

-- kind:
--   quiz      a domain quiz; draws from its own questions
--   practice  a full-length practice exam; draws from the whole course bank by domain
--             weight, and counts toward readiness
--   bank      questions only, never taken directly; practice exams draw from it
--   final / project   fixed exams, kept for completeness
CREATE TABLE learning.exam (
  exam_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES learning.course(course_id) ON DELETE CASCADE,
  slug text NOT NULL,
  ordinal integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('quiz','practice','bank','final','project')),
  pass_pct numeric(5,2) NOT NULL DEFAULT 70,
  instructions_md text,
  draw_count integer CHECK (draw_count > 0),   -- null: every question, in file order
  time_limit_min integer CHECK (time_limit_min > 0),
  counts_for_readiness boolean NOT NULL DEFAULT false,   -- full-length practice exams only
  UNIQUE (course_id, slug),
  CHECK (kind <> 'practice' OR draw_count IS NOT NULL)
);

CREATE TABLE learning.exam_question (
  question_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES learning.exam(exam_id) ON DELETE CASCADE,
  -- Stable key from the content file, so reloads keep attempt history attached.
  key text NOT NULL,
  ordinal integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('single','multi','short','project')),
  domain_key text,
  prompt_md text NOT NULL,
  choices jsonb,          -- [{"key":"a","text":"..."}] for single/multi
  answer jsonb,           -- ["a"] for single/multi; null when graded by rubric
  explanation_md text,
  rubric_md text,
  points numeric(6,2) NOT NULL DEFAULT 1,
  UNIQUE (exam_id, key),
  CHECK (kind NOT IN ('single','multi') OR (choices IS NOT NULL AND answer IS NOT NULL))
);
CREATE INDEX exam_question_domain ON learning.exam_question (domain_key);

CREATE TABLE learning.learner (
  learner_id text PRIMARY KEY,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE learning.lesson_progress (
  learner_id text NOT NULL REFERENCES learning.learner(learner_id),
  lesson_id uuid NOT NULL REFERENCES learning.lesson(lesson_id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('started','completed')),
  completed_at timestamptz,
  notes_md text,
  PRIMARY KEY (learner_id, lesson_id)
);

CREATE TABLE learning.exam_attempt (
  attempt_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES learning.exam(exam_id) ON DELETE CASCADE,
  learner_id text NOT NULL REFERENCES learning.learner(learner_id),
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz,          -- started_at + the exam's time limit
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded')),
  overtime boolean NOT NULL DEFAULT false,
  score_pct numeric(5,2)
);
CREATE INDEX exam_attempt_learner ON learning.exam_attempt (learner_id, submitted_at DESC);

-- The questions an attempt drew, in the order they were shown.
CREATE TABLE learning.attempt_question (
  attempt_id uuid NOT NULL REFERENCES learning.exam_attempt(attempt_id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES learning.exam_question(question_id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  UNIQUE (attempt_id, ordinal)
);

CREATE TABLE learning.exam_answer (
  attempt_id uuid NOT NULL REFERENCES learning.exam_attempt(attempt_id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES learning.exam_question(question_id) ON DELETE CASCADE,
  response jsonb NOT NULL,
  is_correct boolean,     -- null until a rubric question is graded
  points_awarded numeric(6,2),
  feedback_md text,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE TRIGGER course_touch BEFORE UPDATE ON learning.course
  FOR EACH ROW EXECUTE FUNCTION learning.touch_updated_at();
CREATE TRIGGER lesson_touch BEFORE UPDATE ON learning.lesson
  FOR EACH ROW EXECUTE FUNCTION learning.touch_updated_at();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['course','domain','module','lesson','exam','exam_question'] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_notify AFTER INSERT OR UPDATE OR DELETE ON learning.%1$s '
                   'FOR EACH STATEMENT EXECUTE FUNCTION learning.notify_content()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------- grants

RESET ROLE;

DO $$ DECLARE s text; BEGIN
  FOREACH s IN ARRAY ARRAY['learning','library'] LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO %I', s, current_setting('academy.app_role'));
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I',
                   s, current_setting('academy.app_role'));
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I '
                   'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
                   current_setting('academy.owner_role'), s, current_setting('academy.app_role'));
  END LOOP;
END $$;

INSERT INTO learning.learner (learner_id, display_name) VALUES ('andrew', 'Andrew')
ON CONFLICT DO NOTHING;

COMMIT;

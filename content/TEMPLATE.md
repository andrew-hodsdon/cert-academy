# Course content template

Every certification course in Cert Academy uses this layout. Content lives in git as files; the loader
(`npm run load -- <slug>`) upserts it into `cert_academy`, and the running site
re-renders as soon as the transaction commits (Postgres `NOTIFY academy_content`).

```
content/courses/<slug>/
  course.yaml                 course metadata
  sources.yaml                optional: course-wide sources (→ library.source/article)
  01-<module-slug>/
    module.yaml               title, summary_md, domain
    sources.yaml              the sources this module's lessons cite
    01-<lesson-slug>.md       frontmatter + markdown body
    02-<lesson-slug>.md
  02-<module-slug>/...
  exams/
    <exam-slug>.yaml          quiz / final / project
  reference/                  optional: code that proves the course (not loaded)
```

`NN-` prefixes set order and are stripped from slugs. Slugs are kebab-case and **stable**:
renaming one deletes the row and the learner's progress with it.

## course.yaml

```yaml
slug: ml-basics            # must equal the directory name
ordinal: 1                 # position on the home page
title: "ML Basics"
subtitle: "One line, shown under the title"
level: foundation          # foundation | practitioner | advanced
estimated_hours: 14
status: published          # draft hides it from the program page
summary_md: |
  Two or three short paragraphs: who this is for, what you'll be able to do after.
exam_facts_md: |           # the real exam's format, shown beside the course
  - 100–150 items, 3 hours
readiness: { pct: 80, window: 3 }   # exam-ready when the last 3 practice exams average 80%+
domains:                   # the official domains/sections; weights sum to 100
  - { key: d1-security-risk-management, title: "1. Security and Risk Management", weight: 16 }
```

## module.yaml

```yaml
title: "Domain 3: Security Architecture and Engineering"
domain: d3-security-architecture   # a key from course.yaml domains
summary_md: |
  One paragraph, naming the outline objectives covered (3.1–3.10).
```

## Lesson file (`NN-slug.md`)

```markdown
---
title: "Vectors, dot products and similarity"
kind: reading              # reading | lab | project | reference
est_minutes: 30
objectives:
  - Compute a dot product by hand and explain what it measures
  - Explain why cosine similarity normalises magnitude away
sources: [goodfellow-dlbook-ch2, 3b1b-linear-algebra]   # slugs from sources.yaml
---

Body in GitHub-flavoured markdown.
```

What the renderer supports:

- **Math**: `$inline$` and `$$display$$` (KaTeX).
- **Code**: fenced blocks with a language (` ```ts `, ` ```bash `, ` ```sql `, ` ```python `).
- **Diagrams**: ` ```mermaid ` fenced blocks.
- **Callouts**: GitHub alert syntax, `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!CAUTION]`.
- **Tables**, task lists, footnotes (GFM).

Every lesson should have: the objectives, the teaching body, at least one worked example,
a short "Check yourself" section with 2–4 questions (answers in a `<details>` block), and a
"Sources" note when the lesson makes factual or technical claims. Labs end with an
explicit "Done when" checklist.

## sources.yaml

Every factual or technical claim a lesson makes should rest on **at least two independent
sources**. Record each one here; the loader writes it to `library.source` + `library.article`
and links it to the lessons that cite it.

```yaml
sources:
  - slug: attention-is-all-you-need
    kind: standard           # web | paper | repo | vendor_docs | product_docs | video | book | standard
    url: https://arxiv.org/abs/1706.03762
    title: "Attention Is All You Need"
    authors: [Ashish Vaswani, Noam Shazeer]
    site: arXiv
    published: 2017-06-12    # optional, YYYY-MM-DD
    tags: [transformers, attention]
    summary_md: |
      Our notes: what this source establishes and which lessons rely on it.
    body_md: |               # optional: key excerpts / extended notes worth keeping
      ...
```

Module `sources.yaml` files use the same format; slugs must be unique across the course.
Each course's notes are its own: the loader stores articles as `<course>--<slug>`, so two courses citing the same URL never overwrite each other's notes. The
URL itself is one shared `library.source` row.

## exams/<slug>.yaml

```yaml
slug: d3-quiz                # must equal the file name
title: "Domain 3 quiz"
kind: quiz                  # quiz | practice | bank | final | project
draw: 25                    # optional: questions drawn at random per attempt
time_limit_min: 35          # optional: the attempt auto-submits at zero
pass_pct: 80
instructions_md: |
  How long, what's allowed, how it's graded.
questions:
  - key: d3-star-property         # stable and unique across the course
    kind: single                  # single | multi | short | project
    domain: d3-security-architecture
    prompt_md: "..."
    choices:
      - { key: a, text: "..." }
      - { key: b, text: "..." }
    answer: [b]
    explanation_md: "Why b is right and why each other option is wrong."
    points: 1
  - key: explain-overfitting
    kind: short                   # short/project are graded against rubric_md
    prompt_md: "Explain overfitting to a product manager in three sentences."
    rubric_md: |
      - Mentions training vs unseen data (1)
      - ...
    points: 3
```

Practice exams (`kind: practice`) have no questions of their own: each attempt draws
`draw` questions from every `quiz` and `bank` file in the course, split by domain weight,
least-seen first. They count toward readiness unless the file says `readiness: false`.

## Workflow

```bash
npm run load -- --check <slug>   # validate files only
npm run load -- <slug>           # write to the database; the site updates live
```

# Writing cert content

The brief every content writer follows. The file format itself is in `TEMPLATE.md`; this file
covers what good content looks like and the rules that keep the question banks honest.

## Hard rules

1. **Original questions only.** Never reproduce real exam items, "brain dump" material,
   or questions from commercial practice tests or books. Write every scenario yourself.
2. **Teach from the official outline.** Every lesson maps to named outline objectives
   (CISSP `1.1`…`8.5`, Google PCA `1.1`…`6.6`). Say which ones in the module summary.
3. **Two independent sources for every factual claim** (NIST, ISO, RFCs, OWASP, ISC2 and
   Google Cloud documentation, laws themselves). Record them in the module's own
   `sources.yaml` (not the course-level file), with slugs prefixed by the module key, for
   example `d3-nist-sp-800-160`.
4. **Stable, course-unique question keys**, prefixed with the domain key's short form:
   `d3-bell-lapadula-star-property`, `s2-gke-autopilot-vs-standard`.
5. **Balanced answer keys.** Spread the correct option evenly across a/b/c/d. A file
   where most answers are `b` is rejected.
6. Use only `single` (one answer) and `multi` (choose all that apply; say how many, as
   the real exams do: "Choose two.") questions. No short/project questions in the banks.
7. Every question has `domain:` set to the module's domain key, and an `explanation_md`
   that says why the right answer is right **and why each distractor is wrong**.
8. No outdated product names (Google: Vertex AI is now part of Gemini Enterprise Agent
   Platform in the current guide; Cloud Run functions replaces Cloud Functions; Cloud Logging and Cloud Monitoring
   are Google Cloud Observability). When unsure, check current docs.

## Question quality

- Scenario first, like the real exam: a short situation, a constraint, then the ask.
- Mix the levels: about 25% recall ("which term…"), 45% application ("what should you
  use…"), 30% judgement ("what should the security manager do FIRST / BEST / MOST").
- CISSP: answer as a risk adviser to the business. Due care before tools; people's safety
  first; policy before procedure; the most complete answer wins.
- Google PCA: the right answer meets every stated requirement at the lowest operational
  burden. Prefer managed services, least privilege and the documented Google pattern.
- Distractors are plausible: real terms, real services, wrong for this situation.
- No "all of the above", no "none of the above", no trick wording, no negatives
  without bold (**NOT**).

## Lessons

- 1,200–2,500 words each, GitHub-flavoured markdown, `kind: reading` unless it is a hands-on lab.
- Open with the objectives (frontmatter), teach with tables and at least one worked
  example, use a mermaid diagram where a flow or hierarchy helps, call out exam traps
  with `> [!TIP]` / `> [!WARNING]`, and end with a **Check yourself** section of 3 questions
  whose answers sit in a `<details>` block.
- Include memory aids where they genuinely help (e.g. the OSI layers, the IR phases).

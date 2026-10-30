---
title: "How to use this course"
kind: reading
est_minutes: 20
objectives:
  - Read the Built, Partial, Target and Abandoned labels and know what each promises
  - Run the labs safely, without changing anything shared
  - Explain the course's central idea: things work when the method is tight, and break when each project rebuilds its own copy
sources: [m0-global-process, m0-process-pr]
---

This is the onboarding course for anyone joining Mad Hare, person or agent. It was built from
an audit of every repository, GitHub, the software installed on the dev machine and our session
history, as of **2026-10-30**. It teaches how things are meant to work, and it shows plainly
what is broken today, with evidence for each claim.

## The five areas

| Module | Question it answers |
|---|---|
| 1. Architecture | What have we built, and what are we building? |
| 2. Conflux, Code A Zone and Sabai | How is each product actually implemented, and how do they differ? |
| 3. How our agents are built | Which agents exist, how are they defined and bootstrapped, and how does review work? |
| 4. Using the products | How do you run each runtime and CLI, run the tests, and work a support issue? |
| 5. How we work | How do sessions, releases, branches, PRs, reviews and hours fit together, and how consistently do we follow them? |
| 6. The fix list | What has to exist once, shared, so no project rebuilds it? |

Each module ends with a lesson called **What is broken here, and the fix**, and a quiz. The
**final exam** draws 40 questions across all five areas. You are onboarded when your last three
final exams average 80% or more.

## The status labels

Every component in this course carries one label, with a date and a link to its evidence:

| Label | Means | What you can rely on |
|---|---|---|
| **Built** | On `main` and running | You can use it today as documented |
| **Partial** | Some of it exists or runs, often from a branch or worktree | Check the lesson for exactly which part |
| **Target** | Planned; linked to an issue | Do not build on it yet |
| **Abandoned** | Was built or planned, now superseded | Do not use it; the lesson says what replaced it |

> [!WARNING]
> "It runs on the dev machine" and "it is Built" are different things. Several running pieces
> come from **unmerged branches or worktrees** (module 1). Running is not the same as merged.

## Running the labs safely

Labs are read-only. They inspect, build in scratch folders, start things offline and run test
suites against local fixtures. Every lab follows these rules:

1. **Never** deploy, merge, push, tag, comment, or change a board from a lab.
2. Work in a scratch folder or a scratch clone. **Never** run `git fetch`, `git checkout` or
   builds inside the shared canonical clones under `/srv/conflux/projects/*/repos/`.
3. Run anything heavy (builds, test suites, installs) through `mhjob`, which keeps it out of the
   desktop apps' resources:

   ```bash
   /home/gurplelite/.local/bin/mhjob npm test
   ```

4. Never print a secret. If a step needs a credential, the lab says where the reference lives,
   never its value.
5. Clean up containers and temp folders when the lab says so.

When a lab step fails today, the lab says **"this fails today; that is the lesson"** and explains
why. Those failures are some of the most useful parts of the course.

## The idea that ties it together

The audit found the same pattern in every area:

- **When the method is tight, it works.** The conflux-api epic (#70) went release → epic →
  feature → code, test and docs tasks → PRs, with six rounds of cross-model review, recorded
  hours and a merge receipt. Module 5 walks it end to end.
- **When it is loose, each project rebuilds its own copy.** Code A Zone has its own engine,
  agents, telemetry and portal. Sabai copied Conflux's CLI from a version that no longer exists,
  and its runtime has been rebuilt three times. Agent definitions live in three systems. Six
  workspaces carry their own `WORKFLOW.md` and four variants of `workspace.py`.

Every copy drifts. Drift is why the boards, versions, branches and reviews disagree, and why a
new project starts from almost nothing. Module 6 lists the pieces that, built once and shared,
would end that.

> [!TIP]
> As you go, keep one question in mind: *is this the one shared thing, or a copy of it?*
> That question explains most of what you will find.

## Check yourself

1. A component runs on the dev machine but comes from a branch with an open PR. Which label does it get?
2. A lab asks you to build a repo. Where do you build it, and how do you run the build?
3. What is the one example in the audit where the full method was followed?

<details>
<summary>Answers</summary>

1. **Partial**: it runs, but it isn't on `main`.
2. In a scratch clone or scratch folder, never the canonical clone, and through `mhjob`.
3. conflux-api epic #70 (feature #71, tasks #72–#74).

</details>

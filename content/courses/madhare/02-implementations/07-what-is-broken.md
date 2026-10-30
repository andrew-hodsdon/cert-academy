---
title: "What is broken here, and the fix"
kind: reading
est_minutes: 25
objectives:
  - List the high-severity findings across Conflux, Code A Zone and Sabai with their evidence
  - Explain the fix for each finding and which process rule it restores
  - Prioritise the findings so a newcomer knows what to avoid making worse
sources: [m2-conflux-pr86, m2-conflux-issue87, m2-caz-pr52, m2-caz-issue1, m2-caz-hosting-json, m2-caz-release-config, m2-jbc-tests-pin, m2-sabai-main, m2-sabai-pr130, m2-sabai-issue131, m2-sabai-issue39, m2-sabai-readme, m2-global-process]
---

This lesson collects the findings from the module in one place. Each one is stated as a fact with evidence, a severity, and the fix that would remove it. None of them is about blame: most come from client deadlines meeting a product that had nothing yet to offer them. All facts are as of 2026-10-30.

Severity scale used here:

- **High**: production differs from reviewed code, client or private data is at risk, money or contract is at risk, or the process's core rule is broken.
- **Medium**: wrong or conflicting information that will mislead the next person, or a missing safety net.
- **Low**: drift and housekeeping.

## Cross-cutting findings

| # | Finding | Evidence | Severity | The fix |
|---|---|---|---|---|
| X1 | **Each project rebuilt its stack.** Three runtimes, three agent-definition formats (DB records, repo YAML, wheel JSON), three migration tools, three telemetry paths. No runtime code is shared | Lesson 6 tables; engine `site_plan_review` packages; [sabai README Provenance](https://github.com/madharedev/sabai-engine/blob/491285e33b18954b7cad75462e0b2a277e17b391/README.md) | High | Publish one small, versioned shared surface (a turns API or a library package) and make the next client feature consume it. Add "does this exist elsewhere?" to the review checklist |
| X2 | **Conflux has nothing a client line can depend on.** Turn service on stub only, gateway route to the engine Target, agent database unnamed | [agent-runtime README](https://github.com/madharedev/conflux-engine/blob/13801f53295b082a26d8f9cd7cc425788d27535e/apps/agent-runtime/README.md); [conflux-api README](https://github.com/madharedev/conflux-api/blob/44a3f09cecf20b4b8eb18415028d28c7b4a24d8e/README.md) | High | Make "a client line can call it" the acceptance test of the next Conflux release |
| X3 | **Copied code is orphaned.** Sabai's CLI files came from Conflux's Python `cflx` (`35f4733`, `4e4d041`), which no longer exists on `main`. The Review Portal was copied from another repo at `dd742bf` | Sabai README Provenance; [review/package.json](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/review/package.json) | High | Extract each copied set into a package both sides import; until then keep a Provenance entry for every copy |
| X4 | **Production runs from unmerged branches** in all three: Conflux engine PR #86; Code A Zone PR #52 and engine#595; Sabai's VM runs a task-branch build (`task122-55b4d0c`) while release PR #130 is open | [PR #86](https://github.com/madharedev/conflux-engine/pull/86), [PR #52](https://github.com/madharedev/code-a-zone/pull/52), [PR #130](https://github.com/madharedev/sabai-engine/pull/130) | High | Merge with Andrew's approval or roll the deploy back to `main`. Then deploy only merged commits; the board audit checks "deployed SHA is on `main`" |
| X5 | **No tests or CI for two of three lines.** Nothing for Code A Zone or the Review Portal; JBC engine suite pinned to `b6984dc` (~10-13); `madhare-testing/projects/sabai` holds only `.gitkeep`; no build/lint CI in either client repo | [projects/jbc/PIN](https://github.com/madharedev/madhare-testing/blob/ecf3cc1bf3ff13863dd7fbb3aba5437b85f99a30/projects/jbc/PIN); repo Actions | High | Vera writes the test strategy during refinement; add a minimal `main` CI (build/lint plus the suite entry point) to each repo as a patch release |

## Code A Zone

| # | Finding | Evidence | Severity | The fix |
|---|---|---|---|---|
| C1 | **The hosting config points at the private audience.** `.openai/hosting.json` declares static directory `dist`, which holds the financial model and founder worksheet. The README says never publish `dist/` publicly | [.openai/hosting.json](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/.openai/hosting.json); [README](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/README.md) | High | Delete the file (or point it at `build/public`) in a patch release; the risk is any tool that honours it publishing private data |
| C2 | **Project instructions point at a non-existent plan.** Local `AGENTS.md` and `plan/README.md` name "site-planning-jbc", link a ChatGPT Page and a missing `state.json` | `/srv/conflux/projects/code-a-zone/AGENTS.md`; [global process, Instruction loading](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md) | High | Replace with a pointer to `/srv/conflux/AGENTS.md` and repo structure only |
| C3 | **The branch model is inverted.** The release was cut from `andrew/review` because `main` was "far behind"; a day later feature work merged straight to `main` (PR #37), which is now 15 ahead. Local `main` is stale at `e6bb0e1`; memory says "never treat main as current" | [issue #1](https://github.com/madharedev/code-a-zone/issues/1); [PR #37](https://github.com/madharedev/code-a-zone/pull/37); `git rev-list` (lab step 7) | High | Record on #1 that the reconciliation is done, retire `andrew/review` for this repo, update the canonical clone's `main`, and correct the memory for CAZ only (it stays true for the old portal) |
| C4 | **Version drift.** `package.json` 0.1.0-dev.0 and `release/config.json` 0.1.0 vs release issue v1.0.0; no tags; config lists retired routes | [release/config.json](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/release/config.json) | Medium | Andrew picks the version; set `main` to `X.Y.Z-dev` in the one source of truth; remove retired routes |
| C5 | **Compiled portal committed beside source**, with no check that `dist/review` matches `review/src` | `dist/review/assets/*.js` on main | Medium | Build `dist/review` in CI from `review/src` and fail on difference, or stop committing it |
| C6 | **Workspace sprawl.** Extra engine copy, a second code-a-zone checkout, six team worktrees, `state.json` with backups, and the orphan `codeazone/` scaffold under `/srv/conflux/projects/code-a-zone/` | Local paths | Medium | Keep one canonical clone per repo; remove orphans after Andrew confirms |
| C7 | **Tracking in four places**: GitHub projects 90/93, generated tracking blocks in issue bodies, `state.json`, ChatGPT Pages; two issue-template generations both open | Issues #1–#17 vs #24–#52 | Medium | The release's GitHub project is the one board; close superseded issues and stacked PRs |
| C8 | **Operational fragility**: expired `gcloud` auth stopped GCP work for over three hours; a hand-held ssh tunnel is in the handoff; the AlloyDB trial ends 2026-11-06 | State journal; [cloud-move PLAN.md](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/docs/cloud-move/PLAN.md) | Medium | Plan the AlloyDB decision before 11-06 on an issue; replace the tunnel with a service |

## Sabai

| # | Finding | Evidence | Severity | The fix |
|---|---|---|---|---|
| S1 | **Tag `v1.0.0` points at the empty initial commit** `637b793`, not `491285e`; draft release; PR #130 open | `git ls-remote` (lab step 6); [main tree](https://github.com/madharedev/sabai-engine/tree/637b79332c58d6a7906538b3c0fe12e98d8c61f9) | High | Andrew chooses: approve delete-and-recreate after #130 merges (only a draft depends on it), or release `v1.0.1`. Record the decision on the release issue |
| S2 | **`main` is empty after ~10 days**; 50+ branches across two naming generations | `git log origin/main`; `git branch -a` | High | Merge #130 with approval; set `main` to `1.0.1-dev` (or the chosen next version); close stale story PRs |
| S3 | **The runtime was rebuilt three times**, each in a new repo with new package names and providers | Archived `sabai-platform`, `sabai-agent-platform`; ADO `runtime/v0.1.0` | High | Freeze `sabai-engine` as the one runtime and state it on the release issue; mark the ADO `runtime/v0.1.0` branch superseded |
| S4 | **Database dialect conflict**: ADO `master` is SQL Server; staging is PostgreSQL | ADO `db/sql/audit/001-schemas.sql`; [001_schemas.sql](https://github.com/madharedev/sabai-engine/blob/491285e33b18954b7cad75462e0b2a277e17b391/db/migrations/audit/001_schemas.sql) | High | Get the client's written agreement, then promote through a reviewed ADO PR that retires the SQL Server plane |
| S5 | **Nothing promoted since 10-17**, and nothing from `sabai-engine` ever; promotion is a manual copy under the client identity | ADO `git log --all` (lab step 7); [#39](https://github.com/madharedev/sabai-engine/issues/39) E7 | High | Script the promotion (source SHA in, ADO branch and PR out) so it is repeatable and reviewable |
| S6 | **Hours not captured.** Ledger stops at 10-17, lives in an `_attic` directory, three copies disagree; one task has Actual hours | [#131](https://github.com/madharedev/sabai-engine/issues/131) | High | Andrew names the authoritative ledger; backfill 10-18 to 10-30; record hours on every task at close |
| S7 | **Board drift**: project 94 holds one item though #39 says wave 1 is there; old workspace points at board 79 | `gh project item-list 94` | High | Re-add the release's issues to 94; retire board 79 and the old workspace |
| S8 | **Two control planes**: hub `state.json` and the old `/srv/work/dev/agentd/sabai` workspace with a different status flow; ChatGPT-page pointers | The files cited in lesson 4 | Medium | Retire the old workspace; remove the ChatGPT pointers |
| S9 | **Version and doc drift**: seven version strings; README schema hash `f631a3a5…` vs bundled `928fb27e…`; CLI-006 exits 1 though the README says 78 | Lab steps 3 and 5 | Medium | One version source (`pyproject.toml`); generate the hash in docs; align the exit code or the table |
| S10 | **Client contract unconfirmed**: Run API v1.0.0 sent 10-06 with no answer; Messina withdrew its OTel design | Hub state memory | High | Track the contract as a release dependency with an owner and a date |
| S11 | **Azure access depends on one person** (only Andrew's MFA passes conditional access) | Hub `access-log.jsonl` | Medium | Ask the client for a second named operator or a workload identity for routine tasks |

## Conflux proper (from this module's view)

| # | Finding | Evidence | Severity | The fix |
|---|---|---|---|---|
| F1 | **The running engine is an unmerged line** (1.0.6, `5f6b308`, PR #86), conflicting with `main` in ~160 paths | [#87](https://github.com/madharedev/conflux-engine/issues/87) | High | Decide the line on #87; merge or retire #86 |
| F2 | **The engine binds `0.0.0.0:13080`** while main's README says keep the release local | `ss -ltnp`; [README](https://github.com/madharedev/conflux-engine/blob/13801f53295b082a26d8f9cd7cc425788d27535e/README.md) | High | Bind to loopback until the authentication controls exist |
| F3 | **Four live version identities** (1.1.1, 0.1.0-dev.0, 1.0.6, 1.0.0-dev) | #87 "Version and baseline" | High | Merge the agreed `1.0.0-dev` on `main`; mark pre-reset releases superseded |

## What to do first

If you are new and can only fix a few things, the order that removes the most risk is:

1. **C1**: delete the `dist` hosting pointer. One small change; it prevents a private-data exposure.
2. **X4**: bring production back onto `main` in all three lines. Until then, every review is of the wrong code.
3. **S6** and **S1**: Sabai's hours and tag. One is billing, the other blocks a client release.
4. **X2**: give Conflux one consumable interface, so the next client feature does not add another copy.

> [!IMPORTANT]
> While these are open, **do not make them worse**: do not deploy from an unmerged branch, do not copy code between repos without a Provenance entry, do not create another tracking file or board, and record your hours on the task when it closes.

## Check yourself

1. Why is C1 rated High even though nothing is known to honour `.openai/hosting.json` today?
2. X4 appears in all three lines. Which process rules does it break, and what single check would catch it at every checkpoint?
3. You find a helper you need in `jbc-site-plan-review-engine` while working on Sabai. What do you do?

<details>
<summary>Answers</summary>

1. Because the cost of being wrong is high and the fix is trivial. The file points a hosting tool at `dist/`, which holds the financial model and founder worksheet. If any tool or agent ever honours it, the private audience is published.
2. Every merge needs Andrew's explicit approval, and acceptance (Ran It, cross-model review, docs) happens before Done; deploying an unmerged PR skips both. The check: at each board audit, compare every deployed revision's SHA with `main` and flag any that is not an ancestor of it.
3. Do not copy it silently. Propose extracting it into a shared package on the release issue. If a deadline forces a copy, add a Provenance entry naming the source repo, path and commit, as `sabai-engine` does, and open an issue to replace the copy with the package.

</details>

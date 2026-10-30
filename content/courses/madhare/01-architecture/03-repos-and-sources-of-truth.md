---
title: "Repos and sources of truth"
kind: reading
est_minutes: 35
objectives:
  - Name each Mad Hare repository, what it is meant to own, and its status as of 2026-10-30
  - Say which repo (or which branch, worktree or fork) is actually the source of truth for the engine, the API, the agents and the tests
  - Explain why madhare-api is a placeholder, why madhare-platform/apps/mh-api is the real Mad Hare API, and what the agent-runtime fork adds
sources: [m1-madhare-api-controller, m1-platform-mh-api, m1-conflux-api-readme, m1-conflux-api-architecture, m1-conflux-agents-readme, m1-conflux-agents-pr83, m1-agent-runtime-fork, m1-engine-pr86, m1-engine-readme, m1-process-agents-md]
---

The global process says "Each repo has one version source of truth" and that agents work only
in one canonical clone per repo under `/srv/conflux/projects/<project>/repos/<repo>`
([Mad Hare Operations, "Workspace" and "Versions"](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md)).
That tells you where clones live. It does not tell you which repo is the authority for a given
fact, and in several cases that answer is not the repo's `main`. This lesson is the map.

## The repository map

All repos are in the `madharedev` GitHub organisation unless noted. Canonical clones are at
`/srv/conflux/projects/madhare/repos/<repo>`. Statuses are as of 2026-10-30.

| Repo | Meant to own | Version on `main` | Status |
|---|---|---|---|
| `conflux-engine` | Engine API (resource adapters), agent-runtime (model turns), twin harness, guard | 1.1.1 | **Partial**. The running line is PR #86, not main |
| `andrew-hodsdon/agent-runtime` | Private **fork** of conflux-engine | 1.1.1, 6 commits ahead of upstream | **Partial**, fork drift |
| `conflux-api` | The one public endpoint for every client; OpenAPI 3.1, 28 paths | 1.0.0 (should be `-dev`) | **Partial**: in memory, no image, no CLI |
| `conflux-agents` | Agent, role, skill, tool and profile placement | no version file | **Partial**: Pemberton merged; role agents on open PR #83 |
| `madhare-platform` | System of record: `apps/mh-api` (traces, agents and memory, docs, board, queue, Qdrant), DB migrator and seeder | 0.1.0, tagged 2026-10-15 | **Built**, the largest codebase |
| `madhare-api` | Nothing yet: an empty NestJS starter | 0.0.1, 6 commits | **Abandoned / placeholder** |
| `madhare-web` | madhare.ai public site (Next.js, copy from AlloyDB); `/admin` and `/telemetry` behind IAP | `1.0.1-dev`, after tag `v1.0.0` | **Built**, the one cleanly tagged release |
| `madhare-agents` | Old agent catalogue (`mha` loops: executive, marlowe, warren) | none | **Abandoned**: archived, last push 2026-10-14 |
| `madhare-testing` | **All tests**: `projects/{conflux-api,conflux-engine,jbc,sabai,infra-local}`, `agent-runtime/`, `tracelogs/`, `evalstore/` | none | **Built** (covered in Module 4) |
| `madhare-support` | Production support, triage, release issues, and the global process file | none | **Built** |

Module 2 covers the product repos for Code A Zone, Sabai and JBC.

## Who owns what: the questions you will actually ask

### "Where is the engine?"

There are three candidates, and none of them is cleanly the answer:

1. **`conflux-engine` `main`** (`13801f5`, 1.1.1). This is what the README and the docs
   describe. It has the agent-runtime, the twin harness and the guard. It is **not
   running** anywhere on the dev machine.
2. **`conflux-engine` `feat/engine-consolidated`** (`5f6b308`, 1.0.6, draft
   [PR #86](https://github.com/madharedev/conflux-engine/pull/86)). This is what **runs**
   on :13080 and, per #87, serves madhare.ai. It has a different package name
   (`@conflux/engine`), seven apps, and none of main's agent-runtime, twin or guard. It
   conflicts with main in about 160 paths.
3. **`andrew-hodsdon/agent-runtime`**, a private fork whose `gh repo view` parent is
   `madharedev/conflux-engine`. Its main is
   [6 commits ahead and 0 behind upstream main](https://github.com/andrew-hodsdon/agent-runtime/compare/madharedev:main...main):
   docs retrieval from PostgreSQL (#66), resource fixes (#61, #63) and a merge of
   `release/local`. Upstream does not have the docs-retrieval work.

So the honest answer is: **the code on main is the documented engine, the code on PR #86 is
the running engine, and the fork has work that neither has.** Release v1.0.0
([#87](https://github.com/madharedev/conflux-engine/issues/87)) is meant to settle it.
Until then, when you change "the engine", say in the issue which of the three you mean.

### "Where is the Mad Hare API?"

There are three NestJS services with "API" in their role, plus engine API surfaces:

| Service | What it really is |
|---|---|
| `madhare-api` | A NestJS starter. The [whole controller](https://github.com/madharedev/madhare-api/blob/c5ac55822838c141b86a96acba7840a8d0e590fb/src/app.controller.ts) is one `@Get()` that returns the starter's hello string, plus `/health`. PR #18 is titled "expose GitHub CRUD endpoints with complete field coverage", but it merged documentation only (`docs/github-app/*`). |
| `madhare-platform/apps/mh-api` | The real one. [Its `src/`](https://github.com/madharedev/madhare-platform/tree/f96f3148ea5816470cf5b4ea2eb1cde03f3e8c29/apps/mh-api/src) has `agent-run-trace`, `agents` (memory, Qdrant store), `board`, `docs`, `queue`, `telemetry`, `trace-ingest`, `identity`, `forms` and more. conflux-api's design calls it the system of record with "roughly 176 paths". |
| `conflux-api` | The **product** gateway: the only API Conflux clients are meant to call. It proxies to the platform (`PLATFORM_URL`) and to the engine. |
| `conflux-engine` `apps/api` | Internal resource adapters on 127.0.0.1:8792 (Line 1), not a client-facing API |
| Line 2 API modules | `portal`, `tenants`, `support`, `dashboard`, `mobile`, `installer`: a fifth API surface, on the unmerged branch |

**Rule of thumb:** for Mad Hare platform data (agents, memory, docs, board, traces), the
source of truth is `madhare-platform`. For what a Conflux client may call, it is the
`conflux-api` OpenAPI. Do not add routes to `madhare-api` until someone decides what it is for.

> [!WARNING]
> **Finding: rebuilt per project.** Mad Hare has three NestJS "APIs" with overlapping scope
> (`conflux-api`, `madhare-api`, `madhare-platform/apps/mh-api`), plus engine `apps/api`
> and a fifth surface on Line 2. **Severity: high**, because each new feature has three
> plausible homes, and each one picks up its own auth, tracing and error codes. **Fix:**
> archive `madhare-api` (or define it, in an issue, as a thin extraction of `mh-api`). Write
> one line in each README naming the other two and saying what this one does not own.

### "Where are the agents defined?"

The [conflux-agents README](https://github.com/madharedev/conflux-agents/blob/b15c16210e93e312b97bc4a789be570068285d49/README.md)
says three things that do not match each other or the facts:

- main "intentionally contains no active agent implementations… after the v1.1.0 reset";
- "Each directory is empty except for its placement README", yet `agents/pemberton/*` and
  two skills are merged (#79, #80);
- canonical records "live in the configured database", but no repo, config or installed
  plugin names that database.

What sessions actually load is different again. The `conflux-core` Claude Code marketplace in
`/srv/conflux/claude/plugins/known_marketplaces.json` (and the matching block in
`/srv/conflux/codex/config.toml`) is a **directory**:
`/srv/conflux/projects/madhare/worktrees/conflux-agents/install-f721fc0e9f2a/dist/conflux-core`.
That is a **detached worktree at `f721fc0`**, a commit reachable only from the open PR
branches ([#83](https://github.com/madharedev/conflux-agents/pull/83), #85, #86). The role
agents you dispatch (coder, tester, test-writer, dispatcher, doc-writer, doc-auditor) come
from there. The standards skills (`mh-code-style`, `mh-api-construction` and the rest) come
from a second marketplace, `mh-ai`, a git repo on the `madhare-pi` tailnet host with a single
commit. Module 3 covers both in depth.

| Question | Documented answer | Actual answer, 2026-10-30 |
|---|---|---|
| Source of agent definitions | "the configured database" | `agent.yaml` files on the PR #83 line, built by `conflux-gen` |
| What sessions load | conflux-agents | a detached worktree `install-f721fc0e9f2a` |
| Standards skills | (the process names the skills) | `mh-ai` marketplace, one commit, not on GitHub |

### "Where are the tests?"

The process is unambiguous: "**No tests in product repos. `madhare-testing` holds all
tests.**" In practice conflux-engine main still tracks 29 spec or test files (`git ls-files
| grep -cE '\.(spec|test)\.'`), and conflux-api has specs too (its architecture page cites
`test/gateway.e2e-spec.ts` as the evidence for "Built"). Treat `madhare-testing` as the
place new tests go, and the in-repo specs as legacy that has not been moved yet.

## Branches and worktrees that act as sources of truth

A source of truth should be a merged branch. Several things that run are not:

| What runs | From | Why it matters |
|---|---|---|
| Engine on :13080 | `feat/engine-consolidated` @ `5f6b308` (PR #86, draft) | main's docs describe a different engine |
| `/usr/bin/conflux` (.deb) | `d4ee1ab` on `chore/deployment-package-20261027` | packaged from a chore branch |
| conflux-core plugins | detached worktree @ `f721fc0` (PR #83 line) | agents change when someone moves that worktree |
| Fleet telemetry loader | worktree `deploy-fleet-telemetry`, detached @ `cdd62ac` (`task/e3-fleet-telemetry`) | BigQuery rows depend on an unmerged task branch |
| `conflux-agent-queue` | a `fleet-queue-runtime/candidates/cfe95922…` directory | "candidate" code serving the phone |
| `conflux-local-runner` (dead) | `runner.py` inside a `plans/release-transition-2026-10-23/` folder | plans are supposed to be issues, never code |

The process says "Nothing is deployed from a commit that isn't pushed." These commits are
pushed, so the letter of the rule holds. The intent, that what runs is what was reviewed and
merged, does not. Lesson 6 records this as a high-severity finding.

> [!TIP]
> Before you edit any repo, run `git -C <clone> branch -r --contains <sha>` on whatever is
> running, as in the lab. If the running SHA is not on `origin/main`, the main branch is not
> the source of truth for that component today, and your change to main will not be what
> runs. Say so in your issue.

## A worked example: "add an endpoint that lists a tenant's agents"

1. **Which API?** A client-facing Conflux route belongs in the `conflux-api` OpenAPI. The data
   comes from `madhare-platform` (agents module). It does not go in `madhare-api`.
2. **Which engine?** If the route needs the engine, check #87 first. "Tenants" exist only on
   Line 2 (PR #86). Building against main's engine means building something main does not
   have, and building against Line 2 means building on an unmerged branch. Raise that in the
   issue before you code.
3. **Which tests?** The scenario goes in `madhare-testing/projects/conflux-api/`, not in the
   product repo.
4. **Which docs?** conflux-api's `docs/architecture.md`, with the route marked Target until a
   run is recorded.

## Check yourself

1. You need to change how agent memory is retrieved from Qdrant. Which repo owns that code?
2. Someone says "the engine is on main". In what sense is that true, and in what sense is it
   false?
3. Why is the conflux-agents README not a reliable source of truth for which agents your
   session can dispatch?

<details>
<summary>Answers</summary>

1. `madhare-platform`, in `apps/mh-api/src/agents/` (`agent-memory.store.ts` and the
   retriever store). Qdrant is used only there. No conflux-* repo touches Qdrant.
2. True: conflux-engine `main` holds an engine (1.1.1) with the documented agent-runtime,
   twin and guard. False: that engine is not what runs. The running engine is Line 2 (1.0.6)
   from unmerged PR #86, and the fork `andrew-hodsdon/agent-runtime` has six more commits
   that neither has.
3. It says main has no active agents and that records live in "the configured database",
   which nothing names. Sessions actually load the conflux-core plugins from a detached
   worktree of open PR #83 (`install-f721fc0e9f2a`), and the standards skills from the
   separate `mh-ai` marketplace.

</details>

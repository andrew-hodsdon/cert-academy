---
title: "What is broken here, and the fix"
kind: reading
est_minutes: 35
objectives:
  - List the High findings in how Mad Hare works, with the evidence for each, as of 2026-10-30
  - Name everything each project rebuilt for itself and the single shared thing that should replace it
  - Choose the first five fixes and explain why that order removes the most risk for the least work
sources: [m5-process-file, m5-org-templates, m5-github-default-health-files, m5-github-closing-keywords, m5-jbc-pr-537, m5-capi-pr-80, m5-board-89, m5-agents-pr-85, m5-support-issue-89, m5-support-issue-93, m5-support-issue-66, m5-hub-release-74, m5-support-pr-65]
---

This is the findings register for how we work. Each row is a finding, its evidence, a severity, and the fix that would remove it. Severity is about consequence: **High** means it can put a defect on `main`, mislead an agent about what it may do, or expose data. **Medium** means it wastes time or hides state. **Low** is a footgun. Everything is as of 2026-10-30.

None of this is about individual mistakes. Each finding is a mechanism: something in the setup that makes the wrong thing easy.

## Findings

| # | Finding | Evidence | Severity | The fix |
|---|---|---|---|---|
| 1 | **Two process generations live at once.** The agentd workspaces still mandate `session-start`, `andrew/review`, AGY review, "Draft" status, the Story level and "Andrew alone merges". The global file says otherwise | `/srv/work/dev/agentd/conflux/AGENTS.md`, `instructions/WORKFLOW.md` lines 5, 11, 80. [Process file](https://github.com/madharedev/madhare-support/blob/bddb861bd834fdb92eeda574ef240dee4059cc4d/agents/AGENTS.md) | High | Retire the agentd instructions in one patch release. Replace each workspace `AGENTS.md` with a three-line stub pointing to `/srv/conflux/AGENTS.md`, archive `WORKFLOW.md` and the role briefs, and move any open work into `/srv/conflux/projects/` |
| 2 | **Stale control plane.** `project.json` names closed board 72 and `origin/andrew/review`, which no longer exists. The dispatch approval expired 2026-10-22. All 116 leases had expired by 10-28. `measure-issue-work.py --sync-board` targets the closed board | `gh project view 72` → `closed=true`. `gh api …/branches/andrew%2Freview` → 404 (lesson 4, step 9) | High | Covered by fix 1. Until then, add `"superseded_by": "/srv/conflux/AGENTS.md"` to each `project.json` so any reader sees it is dead |
| 3 | **Merges before cross-model review.** 4 of 14 merged PRs had a finished review on the merged head. jbc #532, #537 and #538 went to `main` unreviewed, and #537 got REQUEST_CHANGES (major) 21 min after merge. code-a-zone #33 and #36 were merged with review "Pending" / "Not yet" | [jbc#537](https://github.com/madharedev/jbc-site-plan-review-engine/pull/537), lesson 5 audit | High | Branch protection on `main`, `release/*` and `epic/*`: require a status check (or review) that only the cross-model step posts. A "merge everything" instruction is answered with each PR's review state first |
| 4 | **Approvals recorded by agents under Andrew's account.** Reviews by `andrew-hodsdon` end "Recorded by the hub session (Claude Code)" | #537 reviews, 2026-10-30T10:36:37Z | High | Agents never post as the operator. They record approval as a comment from `mh-devops-admin` quoting Andrew's words, time and session. Release authority goes on the release issue, as the process already says |
| 5 | **Org templates are probably not applied**, and the hub has no release template. `madharedev/.github` is PRIVATE. GitHub serves defaults only from a public `.github`. madhare-support has its own `ISSUE_TEMPLATE` without `release` | `gh repo view madharedev/.github --json visibility`. [GitHub docs](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) | High (verify) | Make `.github` public: the process says it holds no process, only templates. Copy `release.md` into madhare-support. Delete or clearly mark the `madhare-documentation/templates/github/pull-request.md` duplicate |
| 6 | **Cross-model review has four specs and one working route.** Process: Codex ⇄ Claude with a local judge. Workspace: AGY (0 of 14 runs completed). Plugin hook: auto, but inert. Skill: disabled. No local judge model is served | Module 3. `state/agy-reviews/*.json`. Process §Cross-model | High | Write one route into the process: `codex exec` read-only for Claude authors, Claude for Codex authors, findings posted on the PR. Delete the AGY text. Mark the local judge **Target** with an issue |
| 7 | **Exposed credentials and client data in history.** Two tokens need rotation, and a client address sits in a PR's edit history | [madhare-support#93](https://github.com/madharedev/madhare-support/issues/93), #84 | High (operational) | Rotate now. Never pass credentials on a command line or into a transcript. Run gitleaks before every push (as [conflux-api#80](https://github.com/madharedev/conflux-api/pull/80) did). Purge edit history through GitHub support |
| 8 | **All Claude hooks off, so the hours, board, policy and review hooks are inert.** The fix for one over-strict hook removed every guard | `disableAllHooks: true` in `/srv/conflux/claude/settings.json`. `evidence/aud-hook-authority-20261022/` | Medium | Keep hooks off, as Andrew directed. Move the useful automations server-side: a GitHub Action for board moves, closing and hours checks (fixes 10–12), and branch protection for review (fix 3) |
| 9 | **Branch scheme not followed.** madhare-testing: `story/` 18, `experiment/` 15, `feat/` 14. conflux-engine: `epic/` 14, `rls/` 4, `release/` 3. The installed dispatcher encodes `rls/` and `integration` | `gh api …/branches`. [conflux-agents#85](https://github.com/madharedev/conflux-agents/pull/85) open | Medium | Merge #85 and reinstall the plugins. Add a CI check that rejects PR heads outside `release/ epic/ feat/ task/` (plus `fix/`, `chore/` for patch work, written into the process). Let old branches age out after merge |
| 10 | **Closing keywords don't fire anywhere in the hierarchy**, so issues are closed by hand or not at all. 5 of 16 PRs close natively | [GitHub docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue). #80 merge comment | Medium | A small Action on `pull_request: closed` (merged) that closes every `Closes #n` issue whatever the base, and moves the board item |
| 11 | **Boards drift.** Status sets differ on 89, 90, 93 and 94. The release template (92) lacks `Ready`. 64 of 70 Projects are closed, several recreated. Board 89 shows closed items "In review". Board 90 has 239 items and 0 with hours | Lesson 4, steps 7–8. [Board 89](https://github.com/orgs/madharedev/projects/89) | Medium | Fix template 92 first ([madhare-support#89](https://github.com/madharedev/madhare-support/issues/89)), then copy it. The Action in fix 10 keeps statuses true. The board audit runs at each checkpoint, as written |
| 12 | **Hours inconsistent, no live time report.** 12 of 16 PRs have hours. Board 89 has hours on 3 of 12 items. #73 says `TBD` while the board says 0.85 | Lesson 3 gaps table | Medium | A PR check that fails on an empty Hours section. The time report is a saved board view summing Actual hours, linked from the hub |
| 13 | **Per-epic test environments don't exist.** Even the golden-path epic has "TO BE WRITTEN" | [conflux-api#70](https://github.com/madharedev/conflux-api/issues/70) | Medium | An epic can't reach Accepted without its compose file. Make it the first task of the test work, not the last |
| 14 | **Minimal CI is missing** on conflux-api, conflux-agents, madhare-testing, code-a-zone, jbc-site-plan-review-engine, sabai-engine and madhare-documentation | `.github/workflows` census | Medium | One reusable workflow in `.github` (build/lint plus the madhare-testing entry point), called from each repo |
| 15 | **Session forking has no hand-over contract.** Seven persona sessions forked in one night. Agents spend their first 20 minutes on the board | Session `3cf1e80b`. Andrew, 10-29 17:25 | Medium | Add a hand-over note format to the process: issue, board item, branch, head SHA, NOT RUN list, next step, pending approvals |
| 16 | **Agents worked in `~/dev`**, against the process | Transcript folders `-home-gurplelite-dev-*` (10-23, 10-27, 10-29) | Medium | First step of every session: `pwd` must be under `/srv/conflux/projects/`. Otherwise stop and say so |
| 17 | **Forbidden pointers in a project entry file.** `code-a-zone/AGENTS.md` links a ChatGPT Page and a `state.json` path that doesn't exist | `/srv/conflux/projects/code-a-zone/AGENTS.md` lines 3–5 | Medium | Delete the lines. The process already forbids them |
| 18 | **Release and version churn.** v1.1.0 (#74) and v1.2.0 (#75) were closed "COMPLETED" about a day after creation, undelivered. There are two "Release v1.0.1" issues (#73, #92). About 12 version-reset PRs, several closed unmerged | [madhare-support#74](https://github.com/madharedev/madhare-support/issues/74) | Low–Medium | Close undelivered releases as **not planned**, never "completed". One open release issue per version. One version PR per repo per release |
| 19 | **The process file's own PR skipped the process.** `chore/` branch, no review section, no hours, merged 2 minutes after opening | [madhare-support#65](https://github.com/madharedev/madhare-support/pull/65) | Low | Next process edit goes through the patch-release path it defines, including a Codex review |
| 20 | **Tooling footguns.** `mhjob --help` runs `--help` as a program. `workspace.py prune` dry run hung for more than 120 s | Researcher runs, 2026-10-30 | Low | Add `--help` to `mhjob`. Retire `workspace.py` with fix 1 |

## Rebuilt per project

Andrew's own diagnosis was that each small project rebuilds everything. The evidence agrees:

| Thing | Copies today | Evidence | The one shared thing |
|---|---|---|---|
| Workspace tooling (`workspace.py`) | 6 workspaces, **4 variants** (md5 `4cc8…`, `21b0…` ×3, `b77d…`, `1b87…`) | `/srv/work/dev/agentd/*/scripts/workspace.py` | Retire it (fix 1). If session entry is still wanted, one versioned script in madhare-support |
| Process text | 6 `WORKFLOW.md` files, 41–132 lines, plus the global file | `wc -l /srv/work/dev/agentd/*/instructions/WORKFLOW.md` | The global process file only |
| Project entry files and state | per-project `AGENTS.md` and `state.json`, some superseded and backed up several times a day | `/srv/conflux/projects/*/` (`state.v1-superseded-20261029.json`) | One schema in the process ([madhare-support#66](https://github.com/madharedev/madhare-support/pull/66)) |
| Boards | 70 Projects, 4+ status sets, per-board custom fields (board 90 adds Owner lane, Evidence / build, Next action, Blocking reason) | `gh project field-list` | Template 92, fixed, copied per release |
| PR template | 3 (org `.github`, `madhare-documentation/templates`, the old workspace format still used on [madhare-testing#415](https://github.com/madharedev/madhare-testing/pull/415)) | lesson 4 | The org template, from a public `.github` |
| Review routes | AGY (workspaces), Codex (hub), auto hook (plugins), disabled skill | finding 6 | One route in the process |
| Dispatch logic | `conflux-dispatcher` (enabled) and the disabled `mh-dispatch`, `mh-merge-flow`, `mh-release-planning` | `settings.json` `enabledPlugins` | Keep one, delete the rest |
| Agent definitions | three systems (conflux-core, mh-ai skills, agentd roles) | Module 3 | Module 3's fix |

The pattern behind the table: each new effort starts fresh rather than fixing the shared thing, because the shared thing is hard to find or hard to change. The fix is the same every time. **Put one copy in one repo, load it everywhere, and delete the others in the same PR.** Leaving the old copy "for reference" is what produced finding 1.

## The first five fixes, in order

1. **Rotate the exposed tokens** (finding 7). It's operational risk, and it's independent of everything else.
2. **Branch protection requiring the cross-model check** on `main`, `release/*` and `epic/*` (finding 3). One settings change per repo stops the most damaging failure, and no hooks are needed.
3. **Stop posting as `andrew-hodsdon`** (finding 4). It's a one-line rule, and it restores the approval audit trail that fix 2 relies on.
4. **Retire the agentd instructions** (findings 1 and 2, and most of "rebuilt per project"). One patch release removes a whole contradicting process and its dead references.
5. **One merge Action**: close the linked issues, move the board item and check hours (findings 10–12). It replaces the hand work that slipped even on the golden path.

The fixes for findings 6 (one review route), 5 (a public `.github`) and 11 (template 92) follow naturally once these land.

> [!IMPORTANT]
> Each fix is itself a change to the process or to configuration. Per the process, that means an issue, a PR, a **patch** release, a cross-model review and Andrew's approval. Don't fix the process by skipping it.

> [!TIP]
> Pick one Medium finding and write its fix as an issue **draft** in the release-issue format: outcome, the command that proves it, and done-when. Keep the draft in your notes. Filing it is a decision for Andrew and the hub.

## Check yourself

1. Why is branch protection a better fix for finding 3 than re-enabling the cross-model-review hook?
2. Finding 1 and the "process text" row share one fix. What is it, and why must the old copy be deleted rather than left for reference?
3. A board shows closed tasks as "In review". Which two findings explain that, and what one change fixes both?

<details><summary>Answers</summary>

1. Hooks run on the client and were disabled fleet-wide on Andrew's direction. A hook can't stop a merge done from another session, account or the web UI. Branch protection is enforced by GitHub on every merge, whoever does it, and needs no hook.
2. Retire the agentd instructions in one patch release, replacing them with a stub that points to the global file. A copy left for reference is still loaded as project instructions by any session opened in that folder. That is exactly how two process generations stayed live.
3. Finding 10 (closing keywords don't fire off the default branch, so issues are closed by hand) and finding 11 (nothing moves board items). The merge Action that closes `Closes #n` issues and moves the board item, whatever the base branch, fixes both.

</details>

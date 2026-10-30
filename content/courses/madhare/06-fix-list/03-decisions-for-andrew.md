---
title: "The decisions only Andrew can make"
kind: reading
est_minutes: 15
objectives:
  - Know which open questions block the fixes, grouped by area
  - Recognise when a question needs a decision rather than more work
  - Find the module that holds each question's evidence
sources: [m6-engine-release, m6-agents-pr, m6-global-process]
---

The audit ended with open questions in every area. Most of them are decisions, not engineering
tasks: no amount of agent work settles them. They are collected here, grouped, with the module
that holds the evidence. Status as of 2026-10-30.

## Platform (module 1)

1. **Which engine line goes forward:** `main` (1.1.1) or the consolidated #86 line (1.0.6) that runs today? What happens to `main`'s agent runtime, twin and guard if #86 wins?
2. **Which repo is canonical:** `madharedev/conflux-engine` or the private fork `andrew-hodsdon/agent-runtime`?
3. **What `madhare-api` becomes:** the public API extracted from `madhare-platform/apps/mh-api`, or archived?
4. **Telemetry content:** is raw prompt export to Dynatrace and Langfuse intended? (Lesson 2 recommends turning it off.)
5. **Engine binding:** loopback, or network access on purpose?
6. **Pre-reset releases:** who marks `v1.1.0` and `v0.9.95` "pre-reset, superseded", and when do the `-dev` version PRs merge?

## Products (module 2)

7. **Code A Zone's runtime:** does it ever move onto Conflux, or is the JBC engine its runtime for good?
8. **Code A Zone production:** review and merge PRs #52 and engine#595 retroactively, or revert to `main`?
9. **Code A Zone version:** 0.1.0 or v1.0.0? And is `andrew/review` retired now that `main` contains it?
10. **Sabai's `v1.0.0` tag** points at the initial commit: delete and re-tag, or move on to `v1.0.1`?
11. **Sabai's database:** has the client agreed to replace the SQL Server audit store with PostgreSQL in Azure DevOps?
12. **Sabai hours:** which ledger is authoritative, and who fills 10-18 to 10-30?

## Agents (module 3)

13. **Which roster is authoritative:** Claude dispatches and Codex codes (AGENTS.md), Codex lead with Claude builders (agentd), or the six conflux-core roles?
14. **Who or what is Vera**, and which local model is the judge, served where?
15. **Which review route is canonical:** Codex ⇄ Claude, Gemini (AGY), or a hook? With hooks off, should review be a dispatched step?
16. **conflux-core:** merge #83 and install from a release instead of a detached worktree? Which database is "the definition of record"?
17. **Skills:** move the mh-ai skills into a reviewed repo?

## Products in use (module 4)

18. **Which `conflux` is the product line:** the package (0.1.0-dev.0), the running local build (1.0.6) or `main` (1.1.1)?
19. **"No tests in product repos":** still the rule, given conflux-engine's in-repo test CI? Who migrates?
20. **Hours with hooks off:** what is the mechanism, and where is the live time report?
21. **Per-epic test environments:** what exactly is one, and who prunes the 273 leftover test volumes?

## Process (module 5)

22. **Which process controls today:** the global file, or the per-workspace `WORKFLOW.md` with `session-start`? Retire `/srv/work/dev/agentd/*`?
23. **Make `madharedev/.github` public** so the org templates apply, and add the release template to madhare-support?
24. **Approvals:** may agent sessions post approvals under Andrew's account?
25. **Merge order:** may anything merge before its cross-model review?
26. **Boards:** which board is canonical now that board 72 is closed and the boards were emptied on 10-30?

> [!TIP]
> When you meet one of these while working, don't guess. Link the question in your PR or
> issue and ask Andrew. A wrong guess here creates the next round of drift.

## Check yourself

1. Why are most of these questions decisions rather than tasks?
2. You are an agent and need to know which `conflux` to build against. What do you do?
3. Which three decisions unblock the most fixes in lesson 1?

<details>
<summary>Answers</summary>

1. The facts are known; what's missing is a choice between options that only the owner can make.
2. Ask Andrew, citing question 18, rather than picking one.
3. One engine line (1), one agent roster (13) and one process file (22).

</details>

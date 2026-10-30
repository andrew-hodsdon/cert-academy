---
title: "The roster: as documented vs as configured"
kind: reading
est_minutes: 25
objectives:
  - State the roles AGENTS.md gives to Claude Code, Codex, local models and Andrew, and where Claude and Codex load that file from
  - Show where the configured roster contradicts it (project.json, WORKFLOW.md, the generated agents) and explain the role flip
  - Explain why the "local judge" and "Vera" are Target today, with the evidence
sources: [m3-ops-agents-md, m3-ops-pr-65, m3-ca-team-core, m3-ca-coder-agent, m3-ar-twin-readme, m3-claude-memory-docs]
---

Before you dispatch or review anything at Mad Hare you need to know **who does what**. There is
a clean answer in the process file, and there are at least four other answers in the files that
actually configure the agents. This lesson puts them side by side, as of **2026-10-30**, so you
know which one to trust for which question.

## The roster as documented

The global process is `agents/AGENTS.md` in `madharedev/madhare-support`
([§Method, lines 9–11](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md#L9-L11)),
merged on 2026-10-29 in [PR #65](https://github.com/madharedev/madhare-support/pull/65). On the
dev machine its checkout is symlinked to `/srv/conflux/AGENTS.md`. It says, and it says that it
wins over any repo file:

| Role | Who | Does |
|---|---|---|
| Central planner and dispatcher | **Claude Code** | Plans releases, keeps the hub, dispatches tasks, audits at checkpoints |
| Code, architecture, infrastructure | **Codex** | Primary implementer |
| Judge, process auditors | **Local models** | Cross-checks, process and doc audits, the judge for reviews |
| Operator | **Andrew** | Approves releases and merges, accepts features |

Two more roles appear later in the same file:

- **Cross-model review** ([line 112](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md#L112)):
  "The reviewer is always from a different model family than the author… The local judge breaks ties."
- **Vera** ([line 141](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md#L141)):
  "Vera builds the test strategy for the release, its epics and its features during refinement."

### How each host loads it

Both hosts load the same file, through different mechanisms:

| Host | Environment | What it reads | Result |
|---|---|---|---|
| Claude Code | `CLAUDE_CONFIG_DIR=/srv/conflux/claude` (set in `/srv/conflux/claude/environment.sh`) | `/srv/conflux/claude/CLAUDE.md`, a single line `@/srv/conflux/AGENTS.md` | The `@` import pulls in the process ([Claude memory docs](https://code.claude.com/docs/en/memory)) |
| Codex | `CODEX_HOME=/srv/conflux/codex` | `/srv/conflux/codex/AGENTS.md`, a **symlink** to `/srv/conflux/AGENTS.md` | Codex reads its global AGENTS.md from `CODEX_HOME` |

This part is **Built** and consistent. If you edit the process, both hosts pick it up next
session. Lesson 4 covers the rest of session entry.

## The roster as configured

Now look at what is actually wired up. Four configuration sources each name a roster.

| Source | Roles it names | Models it names | Status |
|---|---|---|---|
| `AGENTS.md` §Method | Claude dispatches, Codex implements, local models judge, Andrew operates; plus Vera | not pinned | Built (as text) |
| conflux-core [`teams/core.yaml`](https://github.com/madharedev/conflux-agents/blob/f721fc0e9f2a30f9d91cc3509f5ef3e8da5f99de/teams/core.yaml) | conflux-dispatcher, doc-writer, doc-auditor, test-writer, tester, coder | every generated agent file says `model: opus` | Built, from an unmerged branch |
| agentd `/srv/work/dev/agentd/conflux/project.json` | coordination, dispatcher, builder, docs-auditor, test-lead, custodian | `lead_profile` **gpt-6.1-sol**/high; `worker_profile` **Claude** subscription CLI `sonnet`/high; fallback AGY/Gemini | Built, manual |
| `/srv/conflux/codex/config.toml` | (host default) | `gpt-6.1-sol`, `model_reasoning_effort = "xhigh"` | Built |
| Claude output styles `/srv/conflux/claude/output-styles/*.md` | Bert, Calder, Kif, LaShonda, Reeve, Rook, Sabrina | — | Personas, not agents |

### The role flip

Read the two middle rows against the process:

- **AGENTS.md:** Claude plans and dispatches. Codex writes the code.
- **agentd `project.json`:** the *lead* (coordination and dispatch) is **GPT-6.1 Sol**, a Codex
  model. The *workers* (builders) are **Claude Sonnet**.
- **agentd `instructions/WORKFLOW.md` lines 32–33** say the same thing in prose: "Claude
  Sonnet/high is the primary builder profile; AGY/Gemini is the named fallback."

So the two documents assign the **opposite** families to the same jobs. The reason is
historical, not a design choice. The agentd workspaces were written on 2026-10-20 to 10-22,
when the batch approval was framed around "Claude subscription coders to preserve the
higher-level coordination model's allowance". The global process came a week later (10-29) and
flipped it. Nobody went back and reconciled `project.json`.

In practice, as of 2026-10-30, the hub session that runs the fleet is a Claude Code session, and
the reviews that completed were mostly Codex reviewing Claude's work (for example
[conflux-api#80](https://github.com/madharedev/conflux-api/pull/80)). That matches AGENTS.md.
The agentd profiles are what an agent *entering the agentd workspace* is told.

> [!WARNING]
> **Finding (High): the roster and model roles contradict each other.** AGENTS.md says Claude
> dispatches and Codex implements; `project.json` and WORKFLOW.md:32–33 say Codex leads and
> Claude builds; every generated conflux-core agent says `model: opus`, so a "coder" dispatched
> from Claude is Claude Opus, not Codex. **Fix:** make AGENTS.md the single roster, map the
> agentd roles onto conflux-core names, and generate `project.json` profiles from it (or delete
> them).

### Opus everywhere

Look at the generated agents themselves. The source package
[`agents/coder/agent.yaml`](https://github.com/madharedev/conflux-agents/blob/f721fc0e9f2a30f9d91cc3509f5ef3e8da5f99de/agents/coder/agent.yaml)
says `model.prefer: opus`, `reasoning: high`. All six generated Claude agent files under
`dist/conflux-core/plugins/*/agents/*.md` say `model: opus` on line 4. When a Claude session
dispatches `coder:coder`, the implementer is a Claude Opus subagent. That is a third answer to
"who implements": AGENTS.md says Codex; agentd says Claude Sonnet; the plugin says Claude Opus.

None of these is wrong on its own. Together they mean that "the coder" is not one thing, and a
cross-model review that assumes "the author was Codex" may be reviewing the wrong family.

## Local models and the judge

AGENTS.md gives local models two jobs: judge for review ties, and process and doc auditors.
Check what is serving. On 2026-10-30, `ssh mh-ai docker ps` showed one vLLM container:

```
vllm-embed-qwen3-8b  nvcr.io/nvidia/vllm:26.05.post1-py3  Up 8 days
jbc-serve-ro, otel-collector, dcgm-exporter, jbc-vectors-alloy, telegraf
```

`vllm-embed-qwen3-8b` is an **embedding** model. It turns text into vectors for search. It cannot
read two reviews and pick a winner. No chat model is served anywhere we found.

The one harness that does judge things, the twin-run harness in `agent-runtime`, uses Claude:
"Rung 2, blind judge (`claude-opus-5-5`…)" ([README line 75](https://github.com/andrew-hodsdon/agent-runtime/blob/e9d46c2431759dfc87fbf93f05e24093ef421710/libs/harnesses/twin/README.md#L75)),
and it says outright that "the Ollama models on this host are 0.6B–2B and unqualified"
([line 93](https://github.com/andrew-hodsdon/agent-runtime/blob/e9d46c2431759dfc87fbf93f05e24093ef421710/libs/harnesses/twin/README.md#L93)).

Status: **local judge = Target.** The doc auditor runs today as a dispatched Claude agent
(`doc-auditor:doc-auditor`), not a local model.

## Vera

"Vera" appears exactly once, at AGENTS.md line 141. She is not a conflux-core agent, not an agentd
role, not an output style and not in the personas PR. In older repos the name shows up in
archived madhare-agents issues (#125, #128) and jbc#511, which suggests a planned test-strategy
role that never got built.

Today the test-strategy job is split three ways:

| Who | Where | What it actually does |
|---|---|---|
| `test-lead` | agentd role brief `instructions/roles/test-lead.md` | Runs the AGY review and qualification in the old workspace flow |
| `test-writer` | conflux-core plugin | Writes harness scenarios in madhare-testing |
| `tester` | conflux-core plugin | Runs the suite at a pinned SHA and qualifies a change |

None of them "builds the test strategy during refinement". Status: **Vera = Target (undefined).**

> [!WARNING]
> **Finding (High): the local judge and Vera are not real today.** The judge needs a chat model;
> mh-ai serves only an embedding model, and the twin judge is Claude Opus. Vera is one line of
> text. **Fix:** either serve a qualified local chat model and wire it as the tie-breaker, or
> change AGENTS.md to name the actual tie-breaker (Andrew). Define Vera as a conflux-core agent
> with a refinement-time command, or remove the line and assign test strategy to `tester`.

## Andrew, the operator

The one role nobody disputes. Andrew approves releases and merges and accepts features. Two
details matter for agents:

- He can approve a merge at the time, or ahead of time for named PRs, or grant **release
  authority** to a dispatcher for a named release (recorded on the release issue).
- His words are authority only when they come from him. In the agentd workspace, his directions
  are kept as evidence files (for example
  `evidence/aud-hook-authority-20261022/authority-native.json`, which lesson 5 uses).

## A worked example: who should review this PR?

Suppose a hub Claude session dispatched `coder:coder` to fix an issue in conflux-engine, and the
coder opened a PR. Who reviews it?

1. The author family is **Claude** (the plugin agent is Opus, whatever `project.json` says).
2. AGENTS.md says the reviewer is the other family: **Codex**.
3. The conflux-core `cross-model-review` hook would also pick Codex (`OTHER_FAMILY["claude"]`),
   but it is not running (lesson 5).
4. The agentd WORKFLOW.md would demand AGY/Gemini, which has never completed a review here.
5. Ties go to "the local judge", which doesn't exist. Escalate to Andrew.

So you dispatch a Codex read-only review yourself, record the model and findings in the PR's
Cross-model review section, and apply and validate the fixes. That is the path that actually
works today.

> [!TIP]
> When two sources disagree, AGENTS.md wins for **process** (who should do what). The
> configuration files tell you what **will actually happen** when you press go. Check both, and
> when they differ, say so in your report rather than silently picking one.

## Check yourself

1. A new agent asks, "Who implements code here?" Give the three answers the files give, and
   say which one governs process.
2. Why can't the current mh-ai setup act as the local judge?
3. Where would you look to find out what Vera does, and what will you find?

<details>
<summary>Answers</summary>

1. AGENTS.md: Codex. agentd `project.json` and WORKFLOW.md: Claude Sonnet builders under a Codex
   (gpt-6.1-sol) lead. conflux-core: a Claude Opus `coder` subagent. AGENTS.md governs process
   ("this file wins"); the others describe what a given entry path will actually run.
2. The only model served on mh-ai is `vllm-embed-qwen3-8b`, an embedding model. A judge has to
   read and compare text and give a verdict, which needs a chat model. The twin harness judge is
   Claude Opus, and its README calls the local Ollama models unqualified.
3. AGENTS.md line 141 is the only definition. No agent, role brief, output style or persona
   defines her. The test-strategy work is actually split between agentd `test-lead` and
   conflux-core `tester`/`test-writer`.

</details>

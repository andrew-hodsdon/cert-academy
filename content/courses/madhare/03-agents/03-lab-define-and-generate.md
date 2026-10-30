---
title: "Lab: how an agent is defined and generated"
kind: lab
est_minutes: 40
objectives:
  - Build the conflux-core team with conflux-gen in a scratch folder, without touching the source worktree
  - Prove with --check and diff that the Claude (and Codex) installed copies match the generator output
  - Trace one rendered charter back to the config bindings that produced it, and name every copy of a skill
sources: [m3-ca-generator, m3-ca-coder-agent, m3-ca-coder-config, m3-ca-install-doc, m3-ca-pr-83, m3-claude-plugins-docs, m3-codex-config-docs]
---

## Goal

Generate the six conflux-core agents yourself from their source packages and prove that what
Claude Code and Codex actually load is exactly that output: no hand edits, no drift. Along the
way, see where a charter's words come from and how many copies of each definition exist.

Everything here is **read-only** with respect to the repos and the installed agents. You write
only into a scratch folder you create.

## Before you start

- You are on the dev machine as the normal user, with `/home/gurplelite/.local/bin/mhjob` on
  `PATH` (AGENTS.md: run builds and installs through `mhjob`).
- You know from lesson 2 that the source is the detached worktree
  `/srv/conflux/projects/madhare/worktrees/conflux-agents/install-f721fc0e9f2a` (commit
  `f721fc0`, on the open [PR #83](https://github.com/madharedev/conflux-agents/pull/83) branch).
- **Do not** run `conflux-gen build` with `--out` pointing into the worktree without `--check`.
  That would overwrite the files both hosts load. Every build below writes to `$S`.
- Do not install, uninstall or update plugins in this lab.

## Steps

### 1. Set variables and confirm where the source is

```bash
W=/srv/conflux/projects/madhare/worktrees/conflux-agents/install-f721fc0e9f2a
S=$(mktemp -d -p "${TMPDIR:-/tmp}" m3-lab-XXXX)
git -C /srv/conflux/projects/madhare/repos/conflux-agents worktree list
```

Expected (trimmed):

```
/srv/conflux/projects/madhare/repos/conflux-agents                                   b15c162 [main]
/srv/conflux/projects/madhare/worktrees/conflux-agents/feat/74-conflux-agents-v1.0.0 f721fc0 [feat/74-conflux-agents-v1.0.0]
/srv/conflux/projects/madhare/worktrees/conflux-agents/fix/74-release-branch-names   5b039c4 [fix/74-release-branch-names]
/srv/conflux/projects/madhare/worktrees/conflux-agents/install-f721fc0e9f2a          f721fc0 (detached HEAD)
```

Note the last line: the install source is a **detached HEAD**, and `main` is `b15c162`, which has
no agents in it.

### 2. Install the generator into a scratch virtualenv

```bash
mhjob python3 -m venv "$S/venv"
mhjob "$S/venv/bin/pip" install -q "$W/libs/generator"
"$S/venv/bin/conflux-gen" --help
```

Expected (trimmed):

```
usage: conflux-gen [-h] [--root ROOT] {validate,render,build} ...

conflux-gen: validate packages, render one config, or build a team marketplace.

    conflux-gen validate
    conflux-gen render <agent>/<config> [--environment <name>]
    conflux-gen build <team> [--out dist/<team>] [--check]

Exit codes: 0 ok, 1 refused (with a CFG-/POL- code), 2 drift found by --check.
```

The exit codes matter: **1** means a package failed a schema or policy rule (the message carries a
`CFG-` or `POL-` code), **2** means `--check` found the output differs from what is on disk.

### 3. Validate every package

```bash
"$S/venv/bin/conflux-gen" --root "$W" validate; echo "exit $?"
```

Expected:

```
ok: 11 agents, 6 configs, 16 skills, 4 hooks, 1 teams
exit 0
```

Eleven agent packages exist, but only six configs. The team uses six; the other packages
(admin, architect, assistant, designer, manager, reporter…) are definitions with no build.

### 4. Render one charter and find where its words came from

```bash
"$S/venv/bin/conflux-gen" --root "$W" render coder/coder | head -12
```

Expected (trimmed):

```
# Coder: typescript (nestjs), implementation

You write typescript code on nestjs for
the Mad Hare API, a NestJS (TypeScript) API that owns I/O, auth and tracing, with a Python engine
behind an internal HTTP call and a CLI that is only a thin client of the API. Every change meets
the mh-code-style standard and passes `TMPDIR=/srv/work/dev/agentd make check`.
You deliver one work item per branch and never merge.

## Mode: implementation
```

Now open the two inputs:

```bash
head -5 "$W/agents/coder/charter.md"
sed -n '/^bindings:/,/^skills:/p' "$W/agents/coder/configs/coder.yaml"
```

The charter is a Jinja template (`# Coder: {{ language }}{% if frameworks %} (…){% endif %}, {{ mode }}`).
The config binds `language: typescript`, `frameworks: [nestjs]`, `mode: implementation`,
`check_command: TMPDIR=/srv/work/dev/agentd make check` and `review_branch: andrew/review`.
That is why the coder believes every job is a NestJS API job, including Python engine and
test work it is dispatched onto. It is a **config** problem, not a template problem.

### 5. Build the team into scratch

```bash
"$S/venv/bin/conflux-gen" --root "$W" build conflux-core --out "$S/out"; echo "exit $?"
```

Expected:

```
built conflux-core: 6 plugins, 104 files -> /…/m3-lab-XXXX/out
exit 0
```

### 6. Prove there is no drift

Two independent proofs. First, the generator's own check against the installed source (this
**reads** `dist/`, it does not write):

```bash
"$S/venv/bin/conflux-gen" --root "$W" build conflux-core --out "$W/dist/conflux-core" --check; echo "exit $?"
```

Expected:

```
up to date: /srv/conflux/projects/madhare/worktrees/conflux-agents/install-f721fc0e9f2a/dist/conflux-core
exit 0
```

Second, a plain diff of your build against it:

```bash
diff -rq "$S/out" "$W/dist/conflux-core"; echo "exit $?"
```

Expected: no lines, then `exit 0`.

### 7. Compare the installed copies

Claude loads plugins from its cache; Codex from its own plugin cache:

```bash
for p in coder conflux-dispatcher doc-auditor doc-writer tester test-writer; do
  diff -rq "$W/dist/conflux-core/plugins/$p" "/srv/conflux/claude/plugins/cache/conflux-core/$p/1.0.0"
  diff -rq "$W/dist/conflux-core/plugins/$p" "/srv/conflux/codex/plugins/cache/conflux-core/$p/1.0.0"
done; echo "exit $?"
```

Expected: no lines, then `exit 0`. All six plugins match in both hosts.

Then check where each host is told to find the marketplace:

```bash
grep -n conflux-core /srv/conflux/claude/plugins/known_marketplaces.json
ls -la /srv/conflux/codex/config.toml /srv/conflux/codex/agents/ 2>&1
```

Expected for Claude (trimmed):

```
27:  "conflux-core": {
30:      "path": "/srv/conflux/projects/madhare/worktrees/conflux-agents/install-f721fc0e9f2a/dist/conflux-core"
```

For Codex, the research run earlier on 2026-10-30 found `config.toml` with a
`[marketplaces.conflux-core]` block pointing at the same path, and six hand-copied role files in
`/srv/conflux/codex/agents/*.toml` that matched `dist/…/codex/agents/*.toml` byte for byte. **At
14:49Z the same day those files were gone**: the Codex home had been rewritten at 14:47Z (a
`rollback/codex-migration` folder appeared), leaving only caches, so `ls` printed `No such file or
directory` for both. If you see the same, that is the lesson: the Codex side depends on
hand-placed files that nothing regenerates (the installer is Target,
[#72](https://github.com/madharedev/conflux-agents/issues/72)). Note what you find; don't
recreate anything.

### 8. Name every copy of one skill

```bash
diff "$W/skills/code/SKILL.md" "$W/dist/conflux-core/plugins/coder/skills/code/SKILL.md" | head -6
```

Expected (trimmed): a diff. The source is a template, the dist copy is rendered:

```
8,9c8
< Language: {{ language }}.{% if frameworks %} Frameworks: {{ frameworks | join(", ") }}.{% endif %}
< Mode: {{ mode }}. Follow {{ style_standard }}; where it is silent, follow the code around you.
---
> Language: typescript. Frameworks: nestjs.Mode: implementation. Follow the mh-code-style standard; …
```

So the `code` skill exists as: (1) the template in `skills/code/SKILL.md`, (2) the rendered copy in
`dist/`, (3) the Claude cache copy, (4) the Codex cache copy. Only (1) is committed, and only on an
unmerged branch.

> [!TIP]
> Notice the rendered line `Frameworks: nestjs.Mode: implementation.` The template's
> `{% endif %}` swallows the newline. A tiny template bug, but it is the kind of thing only
> rendering and reading shows you.

## If it fails

- `pip install` fails offline: the generator's dependencies are not cached. Ask before using the
  network; do not install into a system Python.
- `validate` exits **1**: a package no longer matches its schema. The message names a `CFG-`/`POL-`
  code and the file. Someone has edited the worktree since 2026-10-30; check `git -C "$W" status`.
- `--check` exits **2** or `diff` prints lines: the installed `dist/` is no longer what the source
  builds. That is **drift**. Report it with the diff; do not rebuild into `dist/` yourself.
- The Claude cache diff prints lines: plugins were reinstalled from somewhere else. Check
  `/srv/conflux/claude/plugins/installed_plugins.json` for the install dates.

## Done when

- [ ] `validate` printed `ok: 11 agents, 6 configs, 16 skills, 4 hooks, 1 teams` and exited 0
- [ ] `build --check` printed `up to date` and your `diff -rq` printed nothing
- [ ] The Claude and Codex cache diffs printed nothing for all six plugins
- [ ] You recorded whether `/srv/conflux/codex/config.toml` and `agents/` exist today
- [ ] You can explain where "typescript (nestjs)" in the coder's prompt comes from
- [ ] You can name the four copies of the `code` skill and say which one is committed
- [ ] You deleted `$S` when finished: `rm -r "$S"`

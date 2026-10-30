---
title: "The CLIs: every command-line tool we ship, what works and what fails"
kind: reading
est_minutes: 35
objectives:
  - Find each Mad Hare CLI by install path and say which product and repo it belongs to
  - Run one working, safe example of each, and recognise its documented failure or refusal
  - Say which CLIs are Built, which are Target (including `conflux board audit`), and which are Abandoned but still on PATH
sources: [m4-conflux-cli-script, m4-pkg-install-doc, m4-conflux-api-readme, m4-jbc-pyproject, m4-caz-package, m4-caz-serve-public, m4-sabai-release-readme, m4-support-ops-package, m4-mht-readme, m4-systemd-run, m4-global-process]
---

This is the reference page for every command-line tool a Mad Hare person or agent meets, as of
**2026-10-30**. For each one you get the install path, its purpose, one example that works, and
what fails. The examples were run on host `madhare` unless they're marked *described only*.

A pattern runs through the table. Each product built its **own** CLI shell, exit codes and
build stamping, and they don't share code. The Sabai CLI copied five files from a Conflux
generation that no longer exists. Keep that in mind; lesson 9 picks it up again.

## The table

| CLI | Install path | Purpose | Status |
|---|---|---|---|
| `conflux` (package) | `/usr/bin/conflux` → `/usr/lib/conflux/scripts/conflux.mjs` | Start, check health and print the version of the packaged Engine API + runtime | **Built** |
| `conflux` (user-local) | `~/.local/opt/conflux-engine/bin/conflux` | CLI of the running 1.0.6 engine (port 13080) | Running, pre-reset lineage |
| `conflux board audit` | — | Quoted in the process as the model feature command | **Target**, no code |
| `cflx` | `conflux-api` `scripts/cflx` (on epic branch `6518568`, not main) | Gateway client: auth, chat, run dispatch | **Partial** |
| `mhjob` | `~/.local/bin/mhjob` | Run a heavy command in a transient scope in `madharejobs.slice` | **Built** |
| `session-start` | `/srv/work/dev/agentd/conflux/scripts/session-start` | Manual session entry for the Conflux workspace; writes a bootstrap receipt | **Built** (Conflux workspace only) |
| `scripts/dispatch` | same directory | Launch a coder dispatch | Built, *described only* |
| `measure-issue-work.py` | same directory | Measure issue hours; `--sync-board` writes the board | Built; **writes even without the flag** |
| `jbc` | inside the JBC harness container | JBC site-plan review engine CLI | **Built** (container only) |
| `caz` | engine branch `experiment/team-2-build2-local-caz` | Code A Zone one-shot review | **Target** (engine#556) |
| Code A Zone build | `code-a-zone` `npm run build`, `scripts/serve-public.py` | Build and serve the static sites | **Built** |
| `sabai` | release worktree venv, `…/worktrees/sabai-engine/release-v1.0.0/.venv/bin/sabai` | Sabai guarded run CLI | **Partial** (unmerged release) |
| `sabai-db-migrate` | `sabai-engine` `bin/sabai-db-migrate` | Audit migration ledger | **Partial** (same branch) |
| `@madhare/ops` forms | `madhare-support` `packages/ops` | Generate and check support issue forms | **Built** |
| madhare-testing | `make …`, `projects/<p>/run-suite` | Test suites and harness | **Partial** (lesson 5) |
| `mha` | `~/bin/mha` → `uv run` in `/srv/work/repos/madhare-agents` | Old agents CLI | **Abandoned but on PATH** |
| `mh`, `mh-team`, `mh-diag`, `mh-retro` | `~/bin` → `~/tools/platform-util/bin` | Legacy platform helpers ("v1.0.0" banner) | Legacy, in no repo |

## Conflux

### `conflux` (package)

- **Commands:** `version`, `health [--url]`, `start [--service all|api|runtime]`
  ([conflux.mjs](https://github.com/madharedev/conflux-engine/blob/d4ee1ab9b37eab30f0d374c686fe23e27ba2a66a/scripts/conflux.mjs)).
- **Works:** `conflux version` prints local metadata (product 0.1.0-dev.0, source `d4ee1ab…`)
  without touching the network.
- **Fails:** `conflux health` with nothing started exits 1, and `conflux bogus` gives
  `{"error":"Unknown command"}` with exit 64. Lesson 3 is the full lab.

### `conflux` (user-local 1.0.6)

```bash
~/.local/opt/conflux-engine/bin/conflux health --url http://127.0.0.1:13080
```

```text
{"httpStatus":200,"healthy":true,"revision":"5f6b308…"}
```

- Default port 3080 (the running instance is on 13080).
- Needs `CONFLUX_PERSISTENCE_MODE` (`file` or `postgres`), plus either the admin user and
  password variables or `CONFLUX_AUTH_DISABLED=true`.
- `/version` and `/api/stats/real` return 401 anonymously.
- Don't restart or reconfigure it. It's a live service.

### `conflux board audit --project=56`

The process uses this as its example of a bounded feature with a command that tests it (the
Epic section of [the global process](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md)).

> [!WARNING]
> **It doesn't exist.** `conflux board audit` gives `{"error":"Unknown command"}`, exit 64, on
> the package CLI. No branch implements it. Treat it as **Target**, an illustration of the
> shape a feature command should have, not a tool you can use.

### `cflx`

The gateway's CLI is a thin client of `conflux-api`. On
[main](https://github.com/madharedev/conflux-api/blob/44a3f09cecf20b4b8eb18415028d28c7b4a24d8e/README.md)
there's `scripts/dev.sh` (the gateway on 127.0.0.1:8790), but `scripts/cflx` lives on the epic
branch that the test suite pins (`6518568`, `epic/70-cflx-run-dispatch`). The safe way to see
it work is the madhare-testing runner (lesson 6), which builds it in a fresh clone: auth, chat
and transport pass, and dispatch is PENDING.

## Workspace tools

### `mhjob`

The process says to run builds, tests, installs and broad scans through `mhjob`. It's a
seven-line shell wrapper around
[`systemd-run --user --scope --slice=madharejobs.slice`](https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html).
It inherits your environment, directory and standard streams.

```bash
mhjob uname -sr          # Linux 7.0.0-38-generic
mhjob                     # Usage: mhjob COMMAND [ARGUMENT ...]   (exit 64)
mhjob --help              # Failed to find executable --help      (exit 1)
```

> [!NOTE]
> `mhjob` has no `--help`. It treats the first argument as the command to run. To read about
> it, read the file: `cat ~/.local/bin/mhjob`.

### `session-start`

```bash
/srv/work/dev/agentd/conflux/scripts/session-start --help
```

The argparse usage is `bootstrap [-h] --role ROLE --session SESSION [--dispatch]`. It calls
`workspace.py bootstrap` and writes a `state/bootstrap-*.json` receipt. There were 151 on
2026-10-30. **Only run it as yourself, with your real role and session ID.** Agents must not
reuse the operator identity `operator-review`. It's a manual step, never a hook.

### `measure-issue-work.py`

> [!CAUTION]
> Don't run it to "look". Even without `--sync-board` it writes
> `evidence/lift-shift-20261021/issue-metrics-current.json` (line 216). With the flag it
> writes numeric hours to a GitHub project board. It belongs to the coordination role at
> check-ins.

### `mha` and `mh*`

`~/bin/mha` lists `bootstrap, render, agents, capabilities, run, dispatch, scope,
seed-identity, selftest, loop`. It runs `uv run` in `/srv/work/repos/madhare-agents`, a clone
on branch `epic/remediation-396` of a repo **archived on 2026-10-14**. The
[madhare-testing README](https://github.com/madharedev/madhare-testing/blob/ecf3cc1bf3ff13863dd7fbb3aba5437b85f99a30/README.md)
(line 46) asks Andrew to replace the wrapper once. That hasn't happened. The `mh` family prints
a "v1.0.0" banner and lives in `~/tools`, in no repo, with no owner. Use `--help` only. Don't
run their actions.

## Code A Zone and JBC

### `jbc`

The JBC engine declares `jbc = "site_plan_review.cli:main"`
([pyproject.toml line 35](https://github.com/madharedev/jbc-site-plan-review-engine/blob/aed486b7680349b7538688ce3413b5729844fcf9/pyproject.toml)).
It's **not on the host PATH** (`which jbc` finds nothing). You use it inside the harness
container, where the doctor reports `jbc --version: jbc 0.0.1` and `jbc db migrate` reaches
migration level 0018 (lesson 6). `jbc run` and `jbc serve` against the real cloud project are
off limits in labs.

### `caz`

The planned one-shot CLI (`caz --config … run --submittal … --out report.pdf`) exists only on
an experiment branch. **Target**.

### Code A Zone site build and server

In a scratch clone checked out at the real GitHub `main`. The canonical clone's local `main`
is stale and has no `build` script:

```bash
mhjob npm run build
cat build/public/version.json
PUBLIC_ROOT=build/public PORT=4183 python3 scripts/serve-public.py
```

```text
Built 18 public files from 3fda7a5e…c9 into build/public. Private dist/ excluded.
{ "portalVersion": "0.1.0-dev.0", "audience": "public-marketing", "revision": "3fda7a5…", "sourceDirty": false, … }
```

What it refuses, all by design except the last:

| Try | Result |
|---|---|
| Build with a dirty tree | `Error: Clean source required: commit or remove all changes before building.` |
| `BIND_HOST=10.0.0.1` | `ValueError: BIND_HOST must be 127.0.0.1 or 0.0.0.0` (exit 1) |
| `Host: evil.example` header | 403 (DNS-rebinding guard) |
| `/api/runs` locally | 503, because no engine runs locally |
| No `PUBLIC_ROOT` | `FileNotFoundError: '/app'`. The container default; the README doesn't mention it |

Sources: [package.json](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/package.json),
[serve-public.py](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/scripts/serve-public.py).

## Sabai

The `sabai` CLI lives on the unmerged `release/v1.0.0` branch
([README](https://github.com/madharedev/sabai-engine/blob/491285e33b18954b7cad75462e0b2a277e17b391/README.md)).
`main` is a single README commit. Use the worktree's venv:

```bash
B=/srv/conflux/projects/madhare/worktrees/sabai-engine/release-v1.0.0/.venv/bin
$B/sabai --version
$B/sabai agent list
S="$(mktemp -d)"; $B/sabai run --synthetic --scenario success --events "$S/ev1.ndjson"; echo "exit=$?"
$B/sabai run --synthetic --scenario success --events "$S/ev1.ndjson"; echo "exit=$?"
rm -rf "$S"
```

```text
sabai 1.0.0rc1
{"agents": {"repo-reader": {…}, "subscription-probe": {…}}, "catalog_version": "sabai.agents.v1", …}
{"event_count": 3, "outcome": "succeeded", "synthetic": true, …}
exit=0
sabai: CLI-004: refusing to overwrite existing events path: …/ev1.ndjson
exit=78
```

- **Drift.** `--version` says `1.0.0rc1`, while `pyproject.toml` says `1.0.0` (the venv
  metadata is stale).
- **Exit codes.** A missing `--run-cap-usd` on a live run gives `CLI-006 … there is no
  default` with exit **1**, where the README says config refusals exit 78.
- **Code reuse.** Sabai and Conflux both use an `AGT-001` code for an unknown agent, because
  the Sabai CLI copied its shell from the Python `cflx` (`35f4733`).
- **Off limits.** Never run `--subscription-cli` in a lab. It calls the model on a
  subscription and writes to the client's Azure database.

`sabai-db-migrate inventory` is offline (`"database_contacted": false`, 15/15 `MATCH`) and safe.

## Support: `@madhare/ops`

```bash
cd packages/ops && npm run build && npm run forms:check && npm test
```

`forms:check` exits 0 when the generated YAML in `.github/ISSUE_TEMPLATE` matches
`forms/case-forms.json`, and `npm test` reports `# pass 7`
([package.json](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/packages/ops/package.json)).
Lab 8 runs it in a scratch clone.

## Check yourself

1. Your issue says "verify with `conflux board audit --project=56`". What happens, and what do
   you do?
2. Why is `measure-issue-work.py` dangerous to run "just to see", even without `--sync-board`?
3. You need the JBC engine's CLI. Where do you run it, and why not on the host?

<details>
<summary>Answers</summary>

1. The package CLI answers `{"error":"Unknown command"}` with exit 64. The command is
   **Target**: it's quoted in the process as an example and has no code. Say so on the issue
   and propose the real feature with its output schema, rather than claiming it ran.
2. It writes an evidence JSON file even without the flag (line 216). With the flag it writes
   hours to a GitHub board. Both are shared state owned by the coordination role.
3. Inside the madhare-testing JBC harness container (`make shell` or the suite). `jbc` isn't
   on the host PATH, and the harness gives it a FAKE-seeded PostgreSQL. Running it on the host
   against real config would reach the client's cloud project.

</details>

---
title: "Lab: what actually runs on this machine"
kind: lab
est_minutes: 45
objectives:
  - Identify which Conflux engine is running, from which commit and branch, and prove it is not main
  - Tell the two binaries called conflux apart by version, port, source revision and purpose
  - Check service health on the right port, and explain why the default health checks fail
sources: [m1-engine-pr86, m1-engine-consolidated-package, m1-engine-readme, m1-engine-issue87, m1-conflux-agents-pr83, m1-otel-collector-docs]
---

## Goal

Lesson 1 claimed that the engine running on the dev machine is the unmerged Line 2 branch,
not `main`. In this lab you prove it yourself, using only read-only commands. Then you find
the second `conflux` binary, work out why its health check fails, and list the other
services and ports that make up the real system. Every expected output below was captured
on host `madhare` on **2026-10-30**.

## Before you start

- You need a shell on the dev machine as the normal user (`systemctl --user` must work), and
  a read-only clone of conflux-engine at
  `/srv/conflux/projects/madhare/repos/conflux-engine`.
- **Everything here is read-only.** Do not run `conflux start`, `systemctl restart`, `git
  checkout`, or anything that writes.
- **Never print environment files.** The engine's unit loads
  `~/.config/conflux-engine/local.env`, which holds credentials. You may note that it exists
  and is referenced. Do not `cat` it.
- If a command differs from the expected output, write down what you saw. Drift is a
  finding, not a mistake.

## Steps

### 1. Find the engine's service unit

```bash
systemctl --user cat conflux-engine-local | grep -E 'ExecStart|WorkingDirectory|EnvironmentFile'
```

Expected (trimmed):

```text
EnvironmentFile=/home/gurplelite/.config/conflux-engine/local.env
WorkingDirectory=/home/gurplelite/.local/opt/conflux-engine/current
ExecStart="/home/gurplelite/.local/opt/conflux-engine/bin/conflux" "start"
```

The empty `EnvironmentFile=` and `ExecStart=` lines you may also see are systemd resets
from a drop-in. The unit is a transient user unit created by `systemd-run`, not a packaged
service.

### 2. Resolve the install to a commit

```bash
readlink ~/.local/opt/conflux-engine/current
```

Expected:

```text
/home/gurplelite/.local/opt/conflux-engine/5f6b308ddd69f31f9d53caf22a59a783be622d01
```

The install directory is named after a full commit SHA. Keep it: you will look it up in git
in step 4.

### 3. Ask the running binary what it is

```bash
~/.local/opt/conflux-engine/bin/conflux version
```

Expected:

```json
{"product":"Conflux Engine","version":"1.0.6","sourceRevision":"5f6b308ddd69f31f9d53caf22a59a783be622d01","builtAt":"2026-10-29T16:37:15Z"}
```

Version **1.0.6** is the `@conflux/engine` package
([package.json at 5f6b308](https://github.com/madharedev/conflux-engine/blob/5f6b308ddd69f31f9d53caf22a59a783be622d01/package.json)).
`main` says 1.1.1. Two different version numbers for "the engine" is your first clue.

### 4. Find which branches contain that commit

```bash
cd /srv/conflux/projects/madhare/repos/conflux-engine
git branch -r --contains 5f6b308
git merge-base origin/main origin/feat/engine-consolidated
```

Expected:

```text
  origin/feat/engine-consolidated
  origin/task/e3-fleet-telemetry
554dd6cd020c028138e2048e01d3e59be5159003
```

`origin/main` is **not** in the list. The running engine's commit is on
`feat/engine-consolidated` (draft [PR #86](https://github.com/madharedev/conflux-engine/pull/86))
and on a telemetry task branch that was cut from it. The merge-base is `554dd6c` from
2026-10-15. Since then the two lines have developed separately.

### 5. Check health: the default fails, the right port works

```bash
~/.local/opt/conflux-engine/bin/conflux health
~/.local/opt/conflux-engine/bin/conflux health --url http://127.0.0.1:13080
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:13080/v1/agents
```

Expected:

```text
{"error":"Health endpoint unreachable or returned an invalid response"}
{"url":"http://127.0.0.1:13080/health","httpStatus":200,"healthy":true,"revision":"5f6b308ddd69f31f9d53caf22a59a783be622d01"}
401
```

**The first command fails today; that is the lesson.** The binary's default port is 3080,
but the service was started on 13080. The `revision` in the health response matches the
version output, so the process you asked is the one you think it is. The `401` on
`/v1/agents` shows the API requires authentication. Do not try to supply credentials.

### 6. See what is listening, and on which address

```bash
ss -ltnp | grep -E '13080|8792|8798|4317|13133|8001'
```

Expected (trimmed):

```text
LISTEN 0 4096  127.0.0.1:4317    0.0.0.0:*
LISTEN 0 5     127.0.0.1:8001    0.0.0.0:*  users:(("python",...))
LISTEN 0 5     127.0.0.1:8798    0.0.0.0:*  users:(("python",...))
LISTEN 0 4096  127.0.0.1:13133   0.0.0.0:*
LISTEN 0 511     0.0.0.0:13080   0.0.0.0:*  users:(("node",...))
```

Note the last line. The engine binds **0.0.0.0:13080**, which means every interface, while
main's README says "Keep this release local until those controls exist"
([README line 34](https://github.com/madharedev/conflux-engine/blob/13801f53295b082a26d8f9cd7cc425788d27535e/README.md)).
Also note that **nothing is listening on 8792**, the main-line API port. Port 8001 was the
5090 vLLM chat model's port; today it is a Python process (a docs server), and the vLLM unit
is inactive.

### 7. Meet the other `conflux`

```bash
/usr/bin/conflux --help
/usr/bin/conflux version
dpkg -s conflux-runtime | grep -E '^(Status|Version)'
/usr/bin/conflux health
```

Expected (trimmed):

```text
Conflux startup CLI
  conflux version
  conflux health [--url http://127.0.0.1:8792]
  conflux start [--service all|api|runtime]
Runtime startup requires ENGINE_DEFAULT_MODEL, ENGINE_PORT, ENGINE_MAX_USD_PER_TURN and TRACE_SPOOL_DIR.
{ "product": "Conflux", "productVersion": "0.1.0-dev.0", "component": "conflux-engine",
  "componentVersion": "0.1.0-dev.0", "sourceRevision": "d4ee1ab9b37e…", "upstreamCandidate": "27d736726cad…",
  "nodeVersion": "22.23.1", ... }
Status: install ok installed
Version: 0.1.0~dev.0
{"error":"Health endpoint unreachable or returned an invalid response"}
```

This is the Debian package `conflux-runtime`, built from Line 1 (`packaging/debian`) at
`d4ee1ab`, a commit on the `chore/deployment-package-20261027` branch, not main. It installs
no service ("Installation does not activate a service"), so its health check against 8792
**fails today, and that is expected**: nothing was ever started from it.

### 8. Fill in the comparison table

From steps 3–7, complete this table in your notes:

| | `~/.local/opt/conflux-engine/bin/conflux` | `/usr/bin/conflux` |
|---|---|---|
| Package and version | `@conflux/engine` 1.0.6 | `conflux-runtime` 0.1.0~dev.0 |
| Engine line | Line 2, PR #86 | Line 1 (packaging), deployment-package branch |
| Source revision | `5f6b308` | `d4ee1ab` |
| Default health port | 3080 (service actually on 13080) | 8792 |
| Running? | Yes, `conflux-engine-local` | No service installed |
| On `main`? | No | No |

### 9. List the rest of the real system

```bash
systemctl --user list-units --type=service --all --no-pager | grep -E 'conflux|mh-|jbc'
systemctl --user list-unit-files --no-pager | grep -E 'conflux|mh-|jbc'
systemctl list-units --all --no-pager | grep -E 'pg-agents|vllm'
docker ps --format '{{.Names}}  {{.Image}}'
```

Compare what you see with this inventory from 2026-10-30:

| Unit or container | What it is | State |
|---|---|---|
| `conflux-engine-local` | Line 2 engine, :13080 | running |
| `conflux-agent-queue` | Python fleet queue, SQLite, :8798, from a `candidates/…` directory | running |
| `conflux-fleet-telemetry` (+ timer) | Session transcripts → BigQuery, from a detached worktree | static unit, last run 2026-10-30 03:10; timer disabled and inactive |
| `conflux-runtime-local` | Runs a `start.sh` under the agentd workspace's `state/` | dead since 2026-10-22 |
| `conflux-local-runner` | Runs `runner.py` from a `plans/…` folder | dead |
| `mh-executive`, `mh-marlowe`, `mh-warren` | Loops from the archived `madhare-agents` repo | unit files still installed (disabled) |
| `mh-state-refresh` | Refreshes project state | **failed** |
| `pg-agents-forward` (system unit + socket) | 127.0.0.1:5434 → pg-agents on mh-lab, socket-activated | starts on first connection |
| `jbc-embed-forward`, `jbc-embed-tunnel` | Embeddings for the JBC engine from mh-ai (transient units) | running |
| `vllm-chat32b` (system) | Qwen3-32B chat on the RTX 5090, :8001 | inactive; :8001 now serves docs |
| docker `otel-collector` | OTLP 4317/4318, health 13133 | running |
| docker `mh-alloy-proxy`, `conflux-redis`, `madhare-web-local-pg` | AlloyDB auth proxy 1.13.3, Redis, local Postgres 17 on :55432 | running |
| docker `dcgm-exporter`, `telegraf` | GPU and host metrics (`telegraf:latest` is an unpinned tag) | running |

Several services run code from places that are not a merged branch: an unmerged PR, a
detached worktree, a "candidates" directory, a plan folder. Lesson 6 turns that into a
finding.

## If it fails

- **`systemctl --user` says "Failed to connect to bus"**: you are not in a login session for
  that user. Use `machinectl shell` or SSH in as the user. Do not use `sudo`.
- **`readlink` points at a different SHA**: someone redeployed. Run steps 3 and 4 against
  the new SHA and record the change. If the new SHA is on `origin/main`, the drift has been
  fixed, which is good news to report.
- **The engine health check on 13080 fails**: check `systemctl --user status
  conflux-engine-local` (read-only). Do not restart it. Report it in the support repo.
- **`git branch -r --contains` prints nothing**: your clone is stale. `git fetch` is a
  read-only operation on the remote, but ask before running it in a shared clone.

## Done when

- [ ] You can name the running engine's version (1.0.6), commit (`5f6b308`), branch
      (`feat/engine-consolidated`) and PR (#86), and show that `main` does not contain it.
- [ ] You can explain why `conflux health` fails without `--url`, and why
      `/usr/bin/conflux health` fails.
- [ ] Your comparison table for the two `conflux` binaries is complete.
- [ ] You can say why the 0.0.0.0:13080 bind conflicts with the engine README.
- [ ] You have listed at least three services that run from something other than a merged
      branch.

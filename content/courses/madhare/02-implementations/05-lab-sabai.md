---
title: "Lab: Sabai hands-on"
kind: lab
est_minutes: 45
objectives:
  - Run synthetic sabai runs, read the NDJSON audit events and map every exit code and refusal
  - Use the offline migration inventory to see how checksums protect the audit schema
  - Follow the release and promotion trail and explain why it is broken today
sources: [m2-sabai-readme, m2-sabai-preflight, m2-sabai-migrate, m2-sabai-main, m2-sabai-pr130, m2-sabai-issue39, m2-sabai-issue120]
---

## Goal

Drive the `sabai` CLI through its synthetic runs and its refusals, check the audit migrations offline, find the version and schema drift, and then follow the release and the ADO promotion trail. None of these steps calls a model, contacts a database, or touches the client VM.

Every command and output below was run on the dev machine on 2026-10-30.

## Before you start

- You can read `/srv/conflux/projects/madhare/worktrees/sabai-engine/release-v1.0.0` (the release worktree) and `/srv/work/repos/sabai-ai-platform-azuredevops` (the ADO clone).
- `gh` is signed in with read access to `madharedev`.
- Set two variables once:

```bash
B=/srv/conflux/projects/madhare/worktrees/sabai-engine/release-v1.0.0/.venv/bin
S=$SCRATCH/sabai-lab; mkdir -p $S
```

> [!CAUTION]
> Do **not** run the live command from lesson 4, do not `ssh sabai`, and do not run `sabai-db-migrate apply`. The live path spends money and writes to the client's database. This lab stays synthetic and offline.

## Steps

### 1. Identify the build

```bash
$B/sabai --version
$B/sabai agent list
```

Expected, trimmed:

```text
sabai 1.0.0rc1
{"agents": {"repo-reader": {… "mode_support": ["synthetic"], "tools": ["repo.read_metadata"]},
            "subscription-probe": {… "mode_support": ["subscription_cli"], "tools": []}},
 "catalog_version": "sabai.agents.v1", "source_dirty": false,
 "source_revision": "491285e33b18954b7cad75462e0b2a277e17b391"}
```

Two agents only. `subscription-probe` has **no tools**: the live path can answer a prompt and nothing else. Note `1.0.0rc1`: you will come back to it in step 5.

### 2. Run the synthetic scenarios

```bash
$B/sabai run --synthetic --scenario success --events $S/ev1.ndjson; echo "exit $?"
$B/sabai run --synthetic --scenario failure --events $S/ev2.ndjson; echo "exit $?"
$B/sabai run --synthetic --scenario timeout --events $S/ev3.ndjson > /dev/null; echo "exit $?"
wc -l $S/ev1.ndjson
head -c 300 $S/ev1.ndjson; echo
```

Expected, trimmed:

```text
{"event_count": 3, "events_path": ".../ev1.ndjson", "outcome": "succeeded", "run_id": "…", "source_revision": "491285e…", "synthetic": true}
exit 0
{"event_count": 3, … "outcome": "failed", …}
exit 1
exit 124
3 /…/ev1.ndjson
{"agent_id":"repo-reader","event_type":"run.started","metrics":{"duration_ms":null,…},"outcome":"running",…
```

Each run writes three NDJSON events, starting with `run.started` in outcome `running`. These are the same event shapes the live path writes to PostgreSQL; the synthetic mode lets you test audit consumers without spending anything.

### 3. Trigger the refusals

```bash
$B/sabai run --synthetic --scenario success --events $S/ev1.ndjson; echo "exit $?"
$B/sabai agent show nope; echo "exit $?"
echo "What is 2+3?" > $S/req.txt; echo '{}' > $S/payload.json
$B/sabai run --subscription-cli --synthetic-data --agent-id subscription-probe \
  --prompt-file $S/req.txt --payload-file $S/payload.json --events $S/ev-live.ndjson \
  --ingest-script /nonexistent --psql-argv-file /nonexistent; echo "exit $?"
ls $S
```

Expected:

```text
sabai: CLI-004: refusing to overwrite existing events path: …/ev1.ndjson
exit 78
sabai: AGT-001: unknown technical agent_id 'nope' (supported: repo-reader, subscription-probe)
exit 78
sabai: CLI-006: a per-run cap is required (--run-cap-usd); there is no default
exit 1
ev1.ndjson  ev2.ndjson  ev3.ndjson  payload.json  req.txt
```

Three lessons here:

- **CLI-004** protects the audit trail: an events file is never overwritten.
- **CLI-006** fires before anything else on the live path. There is **no** `ev-live.ndjson` in the listing: nothing was written and no provider was called ([claude_preflight.py](https://github.com/madharedev/sabai-engine/blob/491285e33b18954b7cad75462e0b2a277e17b391/src/sabai_engine/claude_preflight.py)).
- **Drift:** the [README](https://github.com/madharedev/sabai-engine/blob/491285e33b18954b7cad75462e0b2a277e17b391/README.md) says configuration refusals exit 78, but CLI-006 exits **1**. Write that down; it belongs in an issue.

### 4. Check the audit migrations offline

```bash
cd /srv/conflux/projects/madhare/worktrees/sabai-engine/release-v1.0.0
python3 -I bin/sabai-db-migrate inventory | head -12
```

Expected, trimmed:

```text
{
  "tool": "sabai-db-migrate",
  "tool_version": "1.1.0",
  "mode": "inventory",
  "database_contacted": false,
  …
  "file_count": 15,
  "manifest_count": 15,
  "files": [ { "filename": "001_schemas.sql", … "status": "MATCH" }, …
```

Now tamper with a **copy** in scratch and re-run:

```bash
mkdir -p $S/mig && cp -r bin db $S/mig/ && cd $S/mig
echo "-- x" >> db/migrations/audit/005_record_corrections.sql
python3 -I bin/sabai-db-migrate inventory > out.json
python3 -c "import json;d=json.load(open('out.json'));print([(f['filename'],f['status']) for f in d['files'] if f['status']!='MATCH'])"
```

Expected:

```text
[('005_record_corrections.sql', 'CHECKSUM_MISMATCH')]
```

A one-line comment changed the checksum. That is the point of the manifest: an applied migration can never be silently edited, which is what an append-only audit store needs ([sabai-db-migrate](https://github.com/madharedev/sabai-engine/blob/491285e33b18954b7cad75462e0b2a277e17b391/bin/sabai-db-migrate)). Note what is missing: the runtime migrations 104 and 105 have **no** checksum ledger (a defect listed in [#130](https://github.com/madharedev/sabai-engine/pull/130)).

### 5. Find the drift

```bash
cd /srv/conflux/projects/madhare/worktrees/sabai-engine/release-v1.0.0
$B/sabai --version
grep -n '^version' pyproject.toml
$B/sabai schema show --sha256
grep -c f631a3a5 README.md
```

Expected:

```text
sabai 1.0.0rc1
3:version = "1.0.0"
928fb27ef75551fc17b84c164770bc4849a460ff23edb8671c93ce0c71857dd7
1
```

Two disagreements. The venv's installed metadata says `1.0.0rc1` because it was built before `pyproject.toml` was bumped; the source of truth is `pyproject.toml`. The README pins a schema hash `f631a3a5…` that no longer matches the bundled schema `928fb27e…`; the source of truth is the bundled schema, so the README is stale.

### 6. Follow the release (this fails today; that is the lesson)

```bash
cd /srv/conflux/projects/madhare/repos/sabai-engine
git ls-remote origin 'refs/tags/v1*'
git log -1 --format='%h %s' 637b793
gh release list -R madharedev/sabai-engine
gh pr view 130 -R madharedev/sabai-engine --json state,title --jq '.state+" "+.title'
gh project item-list 94 --owner madharedev --format json --jq '.items|length'
```

Expected:

```text
3e0e7140d3db4ea10469caf962ac0dd5484695c7	refs/tags/v1.0.0
637b79332c58d6a7906538b3c0fe12e98d8c61f9	refs/tags/v1.0.0^{}
637b793 Initial commit
Sabai Engine v1.0.0	Draft	v1.0.0	2026-10-30T06:31:52Z
OPEN release: v1.0.0, live audited run in managed Azure PostgreSQL
1
```

The `^{}` line is what the annotated tag points at: the empty initial commit on [`main`](https://github.com/madharedev/sabai-engine/tree/637b79332c58d6a7906538b3c0fe12e98d8c61f9), not the release head `491285e`. The release is a draft, the PR is open, and the release board holds one item although [#39](https://github.com/madharedev/sabai-engine/issues/39) says the wave-1 issues are on it.

### 7. Trace a promotion into ADO

```bash
cd /srv/work/repos/sabai-ai-platform-azuredevops
git branch -r
git log --all --format='%h %ad %s' --date=short | head -4
git log -1 --format='%ae' a2ef57a | cut -d@ -f2
git show 5c4f330 -s --format=%B | head -4
git merge-base --is-ancestor a2ef57a origin/master && echo merged || echo "not on master"
git show origin/master:db/sql/audit/001-schemas.sql | grep -m1 'SET QUOTED_IDENTIFIER'
```

Expected:

```text
  origin/HEAD -> origin/master
  origin/integration
  origin/master
  origin/runtime/v0.1.0
a2ef57a 2026-10-17 Agent runtime and telemetry harness, version 0.1.0
5c4f330 2026-10-07 Platform libraries: schema contracts, runtime core and the sabai command
fb6797c 2026-09-23 Audit store DDL and migrations through 012
bafd037 2026-09-23 Approved design set and access model specifications
sabaiglobal.com
Platform libraries: schema contracts, runtime core and the sabai command

Adds the first platform code, promoted from madharedev/sabai-agent-platform
at 8dd9b594bc7da2a2d8a5cfff3fa8e7ad68642eaa
not on master
SET QUOTED_IDENTIFIER ON;
```

Read it as a trail. Each promoted commit names its staging source SHA in the message, and it is authored under the client's domain. The newest promotion (`a2ef57a`, 10-17) is from the **archived** second-generation runtime and is not on `master`. The 10-07 promote branch exists only in this local clone. `master` ends at the 09-23 DDL, which is SQL Server (`SET QUOTED_IDENTIFIER`), while staging is PostgreSQL. Nothing from `sabai-engine` appears at all.

## If it fails

- `No such file` for `$B/sabai`: the release worktree's venv is missing or moved. Do not rebuild it in the worktree; ask the dispatcher.
- `CLI-004` on your first run: you reused a scratch directory. Pick a new `$S`.
- `gh` returns 404 or asks to sign in: you lack access to the private repo or project; ask for read access rather than using someone else's token.
- `sabai-db-migrate` shows mismatches in the **worktree** (not your copy): someone has an uncommitted edit there. Stop and report it; do not "fix" it.

## Done when

- [ ] You ran success, failure and timeout and can map exit codes 0, 1 and 124 to them.
- [ ] You triggered CLI-004, AGT-001 and CLI-006, confirmed no live events file was written, and noted the exit-1 versus README-78 mismatch.
- [ ] Inventory showed 15/15 MATCH in the worktree and `CHECKSUM_MISMATCH` on your tampered copy, and you can say why checksums gate `apply`.
- [ ] You can name the source of truth for the version (`pyproject.toml`) and for the schema hash (the bundled schema), and which copy of each is stale.
- [ ] You can explain the tag-on-the-wrong-commit problem and the two acceptable fixes under "published tags are never rewritten".
- [ ] You can say which staging SHA the 10-07 ADO commit came from, why `runtime/v0.1.0` is not on `master`, and that ADO `master` is still SQL Server.
- [ ] You deleted `$SCRATCH/sabai-lab`.

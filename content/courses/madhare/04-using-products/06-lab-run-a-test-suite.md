---
title: "Lab: run a test suite, and read the failure that is the lesson"
kind: lab
est_minutes: 45
objectives:
  - Run the hermetic substrate suite from a scratch clone of madhare-testing and read its verdict and negative controls
  - Run the verifier suite and the Sabai harness, watch them fail today, and trace each failure to its file and line
  - Optionally bring up an isolated JBC harness, run its suite, classify every FAIL, and clean up everything you created
sources: [m4-mht-readme, m4-mht-makefile, m4-mht-harness-doc, m4-mht-verifier-test, m4-mht-sabai-profile, m4-mht-jbc-pin, m4-jbc-issue212]
---

## Goal

Run madhare-testing the way it's meant to be run: from a scratch clone, through `mhjob`, one
suite at a time. You'll see a clean pass (substrate), a failure that teaches how the test repo
rots (verifier), and a refusal that shows a product with no test environment (Sabai). With
time to spare, you'll run the best-maintained product suite (JBC) in an isolated stack of your
own.

Every step was run on host `madhare` on 2026-10-30 against madhare-testing `ecf3cc1`. Expected
output is trimmed real output.

**Safety:** you work in a scratch clone. You never `git fetch` in the shared canonical clone.
Containers are torn down, you delete your own volume directory, and nothing is written to
GitHub, a shared database or the cloud.

## Before you start

- Docker works for your user (`docker ps` succeeds).
- About 2 GB of free disk if you do part B.
- For part B only: `gh auth status` shows you're signed in. The harness reads the private
  engine repo with `gh auth token`, passed as a BuildKit secret. It's never written to a file or
  log.

## Part A: substrate, verifier, Sabai (about 10 minutes)

### 1. Make a scratch clone

```bash
export LAB="$(mktemp -d)"
git clone -q /srv/conflux/projects/madhare/repos/madhare-testing "$LAB/mht"
cd "$LAB/mht" && git log -1 --format='%h %s'
```

Expected: `ecf3cc1 …`, or a later commit if main has moved. Cloning from the local path reads
the canonical clone and doesn't change it. **Don't** `cd` into the canonical clone and fetch.

### 2. Check that nobody else is running the substrate

The substrate uses **fixed** container names (`mht-substrate-pg`, `mht-substrate-qdrant`) and
port 5440. Two people running it at once collide.

```bash
docker ps -a --filter name=mht-substrate --format '{{.Names}}'
ss -ltn '( sport = :5440 )'
```

Expected: no names, and only the `ss` header. If you see either, wait. Don't remove someone
else's containers.

### 3. Run the substrate suite

```bash
mhjob make test-substrate
```

Expected (trimmed, 8 seconds or so):

```text
[01/20] …                                                    -> PASS
…
[17/20] Security Guard Negative Control: Remote DSN Refusal  expected: 2  actual: 2  -> PASS
…
 Forensic Summary: 20 / 20 Scenarios Passed
VERDICT: CERTIFIED (All 20 behavioral scenarios verified under Andrew's Testing Law)
```

Then confirm that it cleaned up after itself:

```bash
docker ps -a --filter name=mht-substrate --format '{{.Names}}'
ls artifacts/results/
```

Expected: no containers; `substrate.log` and `substrate.exit` in your clone's results folder.

**Look at scenario 17.** It's a **negative control**: the suite points the database guard at
a remote DSN and requires exit 2 (refused). A suite with only positive checks can pass while the
guard is broken. A negative control proves the check can fail.

### 4. Run the verifier: this fails today, and that is the lesson

```bash
mhjob make test-verifier; echo "exit=$?"
```

Expected (trimmed):

```text
[09/20] Platform Ecosystem: Operator Experience QA Schemas   expected: 0        actual: 2        -> FAIL
[10/20] Agents Ecosystem: Agent Runtime Event Schemas        expected: 0        actual: 2        -> FAIL
…
 Forensic Summary: 18 / 20 Scenarios Passed
…
VERDICT: REJECTED (Failures detected: 2)
make: *** [Makefile:85: test-verifier] Error 1
exit=2
```

Now trace it:

```bash
sed -n 113,124p verifier/test.sh
ls -d /srv/work/dev/repos/madhare-platform /srv/work/dev/repos/madhare-agents
```

Expected: the two `--scan "/srv/work/dev/repos/…"` lines, then `No such file or directory`
twice. The suite hard-codes a workspace layout that was retired. Canonical clones now live at
`/srv/conflux/projects/<project>/repos/`, and `madhare-agents` is archived. Nothing is wrong
with the verifier. The **test data paths** rotted.

### 5. Try to bring up Sabai: refused today, and that is the lesson

```bash
mhjob make up PROJECT=sabai HARNESS_VOLUMES_ROOT="$LAB/vols"; echo "exit=$?"
```

Expected:

```text
harness: REFUSED (…/mht/harness/projects/sabai.env): HARNESS_SRC=/srv/work/dev/repos/sabai-agent-platform does not exist (docker would create it empty)
  fix: clone/create it first, or fix HARNESS_SRC in …/mht/harness/projects/sabai.env
make[1]: *** […/mht/harness/Makefile:68: up] Error 2
make: *** [Makefile:120: up] Error 2
exit=2
```

The refusal is correct behaviour. `make up` won't start a half-built stack. The cause is the
profile: `HARNESS_SRC` points at the archived `sabai-agent-platform` repo at an old path
([sabai.env](https://github.com/madharedev/madhare-testing/blob/ecf3cc1bf3ff13863dd7fbb3aba5437b85f99a30/harness/projects/sabai.env)).
Sabai's real code is on `sabai-engine`'s unmerged release branch, and `projects/sabai/` has no
suite at all.

### 6. Draft (don't file) the fix

Write two short issue drafts in your notes, one for step 4 and one for step 5. Each needs a
title, the file:line, the observed output and the proposed fix. For step 4: repoint
scenarios 9 and 10 at a pinned fresh clone, or retire them. For step 5: point the profile at
`sabai-engine` and add a runner. **Don't** create them on GitHub. Your dispatcher triages
them.

## Part B (optional): an isolated JBC harness (about 4 minutes)

### 7. Pick your own names and a free port

```bash
export P=jbc$(id -un | tr -cd 'a-z0-9' | head -c6)
export PORT_DB=5479
ss -ltn "( sport = :$PORT_DB )"
docker ps --format '{{.Names}}' | grep -c "^mht-$P" || true
```

Expected: only the `ss` header, and `0`. If the port is in use, choose another. Never use plain
`PROJECT=jbc`. That's the operator's stack, volume and port.

### 8. Up, suite, down

```bash
H="PROJECT=$P PROFILE=$PWD/harness/projects/jbc.env HARNESS_DB_PORT=$PORT_DB HARNESS_VOLUMES_ROOT=$LAB/vols"
time mhjob make up $H
time mhjob make suite $H; echo "exit=$?"
mhjob make down $H
```

Expected from `up` (trimmed, about 14 s with the image cached):

```text
PASS  pgvector     vector 0.8.7 installed
PASS  seed         jbc db migrate: migration_status=current, level 0018
PASS  fixtures     5 FAKE-APP submittals, 6 FAKE-CITY sections in …/vols/dev/volumes/<P>/fixtures (manifest hashes match)
WARN  qdrant       optional Qdrant not enabled (pgvector only)
doctor: 0 FAIL, 1 WARN
```

Expected from `suite` (trimmed, about 3 minutes):

```text
S-23  FAIL      23/33   …  criterion and report records are append-only …
S-25  FAIL      42/44   …  jbc assess validate accepts valid criterion records …
S-FAKE-03 SKIPPED  0/0  …  -> skipped: harness gap: docling (the engine etl extra) is not installed in this stack
jbc suite: 20 PASS, 4 FAIL, 4 PENDING, 1 SKIPPED (29 scenarios, 427 checks; engine sha b6984dc480483eb420fbba09907b0a35532c1f84)
store: not stored (no --store CONFIG); a result only in a file is not a result
exit=2
```

### 9. Classify every FAIL

| Scenario | Class | Evidence |
|---|---|---|
| S-00 harness gate | Harness / pin gap | It checks that `make up` succeeds on engine `main`, and that fails |
| S-09 | Known bug, stale pin | [engine#212](https://github.com/madharedev/jbc-site-plan-review-engine/issues/212) is **closed**, but the suite runs the pinned `b6984dc` ([PIN](https://github.com/madharedev/madhare-testing/blob/ecf3cc1bf3ff13863dd7fbb3aba5437b85f99a30/projects/jbc/PIN)) |
| S-23 | Real finding to triage | Read its `-> failed:` line in `latest.json` |
| S-25 | Real finding to triage | The report.json sha256 check |

Find the detail yourself:

```bash
jq '.' "$LAB"/vols/dev/volumes/$P/out/jbc-suite/latest.json | less
```

### 10. Clean up what `make down` leaves

`make down` removes the containers, the database volume and the engine image, but **keeps the
host volume by design**
([harness.md](https://github.com/madharedev/madhare-testing/blob/ecf3cc1bf3ff13863dd7fbb3aba5437b85f99a30/docs/harness.md),
"The host volume stays"). The shared network `mht-shared` also stays. Don't remove it: other
stacks use it.

```bash
docker ps -a --format '{{.Names}}' | grep "^mht-$P" || echo "no containers"
cd / && rm -rf "$LAB"
```

There are 273 leftover volume directories (1.5 GB) under `/srv/hot/runtime/dev/volumes` from
people who skipped this step. Don't add to them, and don't delete theirs.

## If it fails

- **Substrate: "port is already allocated" or a name conflict.** Someone else is running it.
  Wait. Don't `docker rm` their containers.
- **`make up` for JBC fails at the engine clone.** Your `gh` session is missing or expired.
  Run `gh auth status`, and ask your operator rather than pasting tokens anywhere.
- **The suite numbers differ from the table.** Someone moved the PIN. Quote your own summary
  line and SHA. That's the point of a pinned result.
- **You ran `make test-all` by habit.** It stops at surface (archived-repo clone). That's
  expected; see lesson 5.

## Done when

- [ ] The substrate printed `20 / 20 Scenarios Passed` and `VERDICT: CERTIFIED`, and no
      `mht-substrate-*` containers remain.
- [ ] You can explain what negative control [17] proves.
- [ ] You traced verifier [09]/[10] to `verifier/test.sh` lines 116/123 and a missing path.
- [ ] You traced the Sabai refusal to `harness/projects/sabai.env`, and drafted (not filed)
      both fix issues.
- [ ] (Part B) You quoted the JBC summary line with its engine SHA and classified all four FAILs.
- [ ] (Part B) No `mht-<you>` containers remain, and your scratch directory, volumes included,
      is deleted.

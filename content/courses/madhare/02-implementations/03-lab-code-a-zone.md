---
title: "Lab: Code A Zone hands-on"
kind: lab
est_minutes: 45
objectives:
  - Build both Code A Zone audiences from a clean scratch clone and read the release identity they carry
  - Trigger the build and server refusals, and explain the risk each one prevents
  - Package a release, verify its checksums, and find out which ref production actually runs
sources: [m2-caz-build-public, m2-caz-release-metadata, m2-caz-serve-public, m2-caz-package-release, m2-caz-readme, m2-caz-issue1, m2-caz-pr52]
---

## Goal

Build the Code A Zone public and private sites yourself, see the safety refusals fire, run the local private preview and its Host guard, package a release, and then do some branch archaeology to find out which code production runs. Everything here is read-only against the canonical clone and GitHub. All builds happen in a **throwaway clone in your scratch directory**.

The commands and outputs below were run on the dev machine on 2026-10-30 (Node v22.23.1, Python 3.14.4).

## Before you start

- You are on the dev machine with read access to `/srv/conflux/projects/madhare/repos/code-a-zone`.
- You have a scratch directory. Set it once: `export SCRATCH=<your scratchpad path>`.
- `mhjob` is on your path (`/home/gurplelite/.local/bin/mhjob`). The process says to run builds through it.
- **Never** build, edit, or check out branches in the canonical clone. Never deploy, push, merge or post from this lab.

> [!IMPORTANT]
> The build refuses a dirty tree, so it needs a real git checkout, not a copy of files. That is why you clone.

## Steps

### 1. Make a scratch clone at GitHub's `main`

```bash
S=$SCRATCH/caz-lab
git clone -q --no-hardlinks /srv/conflux/projects/madhare/repos/code-a-zone $S/caz
cd $S/caz
git fetch -q /srv/conflux/projects/madhare/repos/code-a-zone refs/remotes/origin/main:refs/heads/ghmain
git checkout -q ghmain
git log -1 --format=%h
```

Expected:

```text
3fda7a5
```

Why the extra `fetch`: a plain clone gives you the canonical clone's **local** `main`, which is stale at `e6bb0e1`. There, `package.json` is still `code-a-zone-investor-model` and `npm run build` fails with `npm error Missing script: "build"`. You want GitHub's `main`, which the canonical clone holds as `refs/remotes/origin/main`.

### 2. Build both audiences

```bash
mhjob npm run build
mhjob npm run build:private
cat build/public/version.json
grep audience build/private/version.json
```

Expected, trimmed:

```text
Built 18 public files from 3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9 into build/public. Private dist/ excluded.
Built 45 private files from 3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9 into build/private. Requires GCP IAP before exposure.
{
  "schemaVersion": 1,
  "portalVersion": "0.1.0-dev.0",
  "releaseTarget": "0.1.0",
  "audience": "public-marketing",
  "revision": "3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9",
  "sourceDirty": false,
  …
}
  "audience": "private-pilot-workspaces",
```

Read what this tells you. Both builds name the same 40-character revision and `sourceDirty: false`, so anything served can be traced to a commit. The public build **excludes** `dist/` (the financial model and founder worksheet live there). The private build says it needs IAP before exposure. Note also `portalVersion 0.1.0-dev.0` and `releaseTarget 0.1.0`, while the release issue is v1.0.0: you are looking at the version drift from lesson 2.

### 3. Watch the build refuse a dirty tree and a wrong revision

```bash
echo x >> public/site.css
node scripts/build-public.mjs
git checkout -q public/site.css
SOURCE_REVISION=deadbeef node scripts/build-public.mjs
```

Expected (one line each, from the error output):

```text
Error: Clean source required: commit or remove all changes before building.
Error: SOURCE_REVISION must equal the full clean HEAD.
```

The first refusal stops someone shipping uncommitted edits: the revision stamp would be a lie. The second stops a caller from claiming a revision the checkout is not at ([build-public.mjs](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/scripts/build-public.mjs), [release-metadata.mjs](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/scripts/release-metadata.mjs)). This is the global rule "Nothing is deployed from a commit that isn't pushed", enforced in code at the point of build.

### 4. Run the private preview and probe the Host guard

Start the static server on loopback in the background:

```bash
PUBLIC_ROOT=build/private SITE_AUDIENCE=private BIND_HOST=127.0.0.1 PORT=4199 python3 scripts/serve-public.py &
SERVER=$!
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4199/
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: localhost:4199' http://127.0.0.1:4199/
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: evil.example:4199' http://127.0.0.1:4199/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4199/review/
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4199/api/runs
kill $SERVER
```

Expected:

```text
200
200
403
200
503
```

What each one means ([serve-public.py](https://github.com/madharedev/code-a-zone/blob/3fda7a5e627ea6667f8786417ee1d1fe8afbb1c9/scripts/serve-public.py)):

| Request | Code | Why |
|---|---|---|
| `127.0.0.1:4199` | 200 | Its own authority |
| `Host: localhost:4199` | 200 | Also its own authority |
| `Host: evil.example:4199` | 403 | **DNS-rebinding guard.** A web page on another domain could resolve its name to 127.0.0.1 and read your local preview. On loopback the server serves only its own Host, compared whole |
| `/review/` | 200 | The Review Portal shell (static files) |
| `/api/runs` | 503 | There is no engine locally. In production the load balancer routes `/api/*` to `jbc-engine`; the static server never proxies |

> [!NOTE]
> The 403 is **not authentication**. It proves the request was addressed to this server, nothing about who sent it. Authentication in production is IAP, and authorization is the engine's allow-list.

### 5. Watch the server refuse a bad bind address

```bash
PUBLIC_ROOT=build/public BIND_HOST=10.0.0.1 python3 scripts/serve-public.py
echo "exit $?"
```

Expected, last lines:

```text
ValueError: BIND_HOST must be 127.0.0.1 or 0.0.0.0
exit 1
```

Only two bind addresses are allowed: loopback for local preview (with the Host guard on) and all interfaces for the container (where the edge does Host routing). Anything else is refused at start-up.

Gotcha: if you omit `PUBLIC_ROOT`, the server crashes with `FileNotFoundError: '/app'`, the container's default root. The README does not mention this.

### 6. Package a release and verify it

```bash
mhjob python3 scripts/package-release.py | grep archiveReadback
ls outputs/release/0.1.0-dev.0/
cd outputs/release/0.1.0-dev.0 && sha256sum -c SHA256SUMS && cd -
```

Expected:

```text
      "archiveReadback": "verified"
      "archiveReadback": "verified"
SHA256SUMS
code-a-zone-0.1.0-dev.0-private.manifest.json
code-a-zone-0.1.0-dev.0-private.tar.gz
code-a-zone-0.1.0-dev.0-public.manifest.json
code-a-zone-0.1.0-dev.0-public.tar.gz
manifest.json
code-a-zone-0.1.0-dev.0-private.manifest.json: OK
…
manifest.json: OK
```

This is solid release engineering: deterministic tarballs, per-audience manifests, checksums read back. What it does **not** produce is a git tag, a GitHub release, or a registry image digest ("Registry digests remain null/pending", README). No tag or release exists for `code-a-zone`.

### 7. Branch archaeology (part of this fails today; that is the lesson)

Back in the **canonical clone**, run only read commands:

```bash
cd /srv/conflux/projects/madhare/repos/code-a-zone
git branch --show-current
for r in main origin/main origin/release/v1.0.0 origin/andrew/review; do echo "$r $(git rev-parse --short $r)"; done
git rev-list --left-right --count origin/main...origin/andrew/review
gh pr view 52 -R madharedev/code-a-zone --json state,headRefOid --jq '.state+" "+.headRefOid'
```

Expected:

```text
andrew/review
main e6bb0e1
origin/main 3fda7a5
origin/release/v1.0.0 3fda7a5
origin/andrew/review 69fa5d3
15	0
OPEN d6566aeff786ddbcea19f24b1cf5b8f36817dc24
```

Now read the "Version and baseline" section of [issue #1](https://github.com/madharedev/code-a-zone/issues/1). It says the release was cut from `andrew/review` because `main` is far behind. Your output says the opposite: `origin/main` is 15 commits **ahead** of `andrew/review` and contains all of it, and `release/v1.0.0` equals `main`. The local `main` (`e6bb0e1`) is what "lies": it has not been updated, so anyone who reads it locally concludes `main` is old.

The last line is the key fact: production's private site runs `d6566ae`, the head of [PR #52](https://github.com/madharedev/code-a-zone/pull/52), which is still **open**.

## If it fails

- `Missing script: "build"`: you built at the stale local `main`. Redo step 1 with the `fetch` and `checkout ghmain`.
- `Clean source required` in step 2: something changed a tracked file. Run `git status` in the scratch clone and `git checkout -- .`.
- `Address already in use` in step 4: another preview is on 4199. Pick another `PORT` and use it in every curl.
- `npm` asks for the network: you ran it in `review/`. This lab never runs `npm ci` there; the portal's compiled output is already committed under `dist/review/`.
- Do not try to make `/api/runs` return 200 locally. It needs the hosted engine behind IAP.

## Done when

- [ ] Both `version.json` files name the same 40-character revision with `sourceDirty: false`, and you can say which audience excludes `dist/` and why.
- [ ] You saw both build refusals and can explain the risk each prevents.
- [ ] You got 200, 200, 403, 200, 503 from the preview and can explain why 403 is not authentication and why `/api` is 503 locally.
- [ ] You saw the `BIND_HOST` refusal exit 1.
- [ ] `sha256sum -c SHA256SUMS` passed, and you noted that no tag or registry digest exists.
- [ ] You can write down, in one line each: which ref `main` is on GitHub, which ref the canonical clone's local `main` is, and which ref production runs (and that it is unmerged).
- [ ] You deleted `$SCRATCH/caz-lab` when finished.

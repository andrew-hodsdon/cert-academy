---
title: "Lab: start the Conflux runtime offline and trace a stub turn"
kind: lab
est_minutes: 30
objectives:
  - Start the packaged Engine API and agent runtime offline with the stub provider, and prove both are healthy
  - Run a stub turn, read the NDJSON stream to its last line, and find its trace file
  - Provoke the three refusals (AGT-001, REQ-001, API /version 401) and explain each from the evidence
sources: [m4-pkg-install-doc, m4-runtime-readme-pkg, m4-conflux-cli-script, m4-ndjson-spec]
---

## Goal

Start the Conflux package that's installed on the dev machine, with no network, no keys and no
spend, then trace one model turn from request to trace file. Then break it on purpose three
ways, and explain each break. Every step below was run on host `madhare` on 2026-10-30. The
expected output is trimmed real output.

**Safety:** this lab is read-only with respect to everything shared. It binds only to
loopback, uses the stub provider (cost 0), writes only into a scratch directory you create, and
leaves no process running when you're done.

## Why this lab matters

As of 2026-10-30, this is the **only** end-to-end path through a Conflux runtime that works on
the dev machine. Real agent turns, provider calls and task dispatch are all Target (lesson 2).
So the stub turn is how you learn the runtime's contract before any money or keys are
involved, and the contract is the same one a real provider turn will use:

- **One route.** `POST /internal/v1/turns` is the runtime's only work endpoint. The gateway is
  its only intended caller, which is why it has no user authentication and refuses to bind to
  anything but loopback or private addresses.
- **Streamed answers.** The response is NDJSON. You'll read it line by line, and you'll see
  why the **last line**, not the HTTP status, decides success.
- **Refuse before spending.** Unknown agent, missing price, over budget: each is refused before
  any model call. You'll trigger one of these refusals yourself.
- **Trace everything except content.** Every turn leaves an append-only trace file you can
  inspect. The prompt itself is never written to it.

When dispatch lands (conflux-engine#87), the same health checks, the same last-line rule and
the same trace files are how you'll check that a real run did what it claimed. Practise them
here, where a mistake costs nothing.

## Before you start

- You're on the dev machine and `/usr/bin/conflux` exists (`dpkg -s conflux-runtime` shows
  `Version: 0.1.0~dev.0`).
- `curl` and `jq` are installed.
- Two terminals: **A** runs the services in the foreground, **B** pokes them.
- Read the install doc first: `/usr/share/doc/conflux-runtime/README.md`
  ([source](https://github.com/madharedev/conflux-engine/blob/d4ee1ab9b37eab30f0d374c686fe23e27ba2a66a/docs/releases/install-debian.md)).

## Steps

### 1. Confirm which `conflux` you have

In terminal **B**:

```bash
command -v conflux
conflux version
```

Expected:

```text
/usr/bin/conflux
{"product":"Conflux","productVersion":"0.1.0-dev.0",...,"sourceRevision":"d4ee1ab9…"}
```

If the path is anything other than `/usr/bin/conflux`, you've got the user-local 1.0.6 engine
first on your PATH. Stop and use `/usr/bin/conflux` explicitly in every step.

### 2. Check that the ports are free, and see what health does with nothing running

```bash
ss -ltn '( sport = :8792 or sport = :8793 )'
conflux health
echo "exit=$?"
conflux bogus; echo "exit=$?"
```

Expected: `ss` prints only its header line. Then:

```text
{"error":"Health endpoint unreachable or returned an invalid response"}
exit=1
{"error":"Unknown command"}
exit=64
```

If `ss` shows a listener on either port, someone else is using it. Pick two other free ports
and use them consistently below: `PORT` sets the API, `ENGINE_PORT` sets the runtime.

### 3. Make a scratch directory and start offline

In terminal **A**:

```bash
export LAB="$(mktemp -d)"; echo "$LAB"
export ENGINE_DEFAULT_MODEL=stub/echo ENGINE_STUB=1
export ENGINE_MAX_USD_PER_TURN=0.10 TRACE_SPOOL_DIR="$LAB/traces"
export PORT=8792 ENGINE_PORT=8793
conflux start
```

Expected, after a second or two (trimmed Nest logs):

```text
[Nest] …  LOG [RouterExplorer] Mapped {/health, GET} route
[Nest] …  LOG [RouterExplorer] Mapped {/version, GET} route
[Nest] …  LOG [RouterExplorer] Mapped {/gcs/buckets/:bucket/objects, GET} route
…
[Nest] …  LOG [RouterExplorer] Mapped {/internal/v1/turns, POST} route
[Nest] …  LOG [RouterExplorer] Mapped {/ready, GET} route
[Nest] …  LOG [NestApplication] Nest application successfully started
(node:…) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.
```

The punycode warning is expected noise. Leave terminal A running.

### 4. Prove both services are healthy

In terminal **B** (copy the `LAB` path from terminal A):

```bash
export LAB=/the/path/printed/in/terminal/A
conflux health --url http://127.0.0.1:8792
conflux health --url http://127.0.0.1:8793
```

Expected:

```text
{"httpStatus":200,"healthy":true,"service":"conflux-api"}
{"httpStatus":200,"healthy":true,"service":"conflux-engine-agent-runtime"}
```

### 5. Read version and readiness

```bash
curl -s -w ' HTTP %{http_code}\n' http://127.0.0.1:8792/version
curl -s http://127.0.0.1:8793/version; echo
curl -s http://127.0.0.1:8793/ready | jq .
```

Expected:

```text
{"message":"Authentication required",…} HTTP 401
{"service":"conflux-engine-agent-runtime","version":"0.1.0-dev.0","sourceRevision":"d4ee1ab…"}
{
  "status": "ready",
  "defaultModel": "stub/echo",
  "agents": [],
  "providers": { "anthropic": false, "gemini": false, "openai": false, "stub": true },
  "traceIngest": false
}
```

Write down what `/ready` tells you: **no agents**, **no provider keys**, **no trace ingest**.

### 6. Run a stub turn

```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST http://127.0.0.1:8793/internal/v1/turns \
  -H 'content-type: application/json' \
  -d '{"runId":"run_onboard01","tenantId":"madhare","agent":null,
       "messages":[{"role":"user","content":"hello onboarding"}],"maxUsd":0.05}'
```

Expected (trimmed: there are several `delta` lines):

```text
{"type":"delta","text":"[engine "}
…
{"type":"delta","text":"onboarding"}
{"type":"usage","usage":{"inputTokens":2,"outputTokens":9,"costUsd":0}}
HTTP 200
```

The last line is `usage`, so the turn succeeded, at a cost of 0.

### 7. Find and read the trace

```bash
ls "$LAB/traces"
jq -r '.record.type' "$LAB"/traces/*-run_onboard01.jsonl
jq -c '.record | select(.type=="model.call.started") | .data | {model, cap_usd, estimated_input_tokens}' \
  "$LAB"/traces/*-run_onboard01.jsonl
```

Expected:

```text
2026-10-30-run_onboard01.jsonl
run.accepted
model.call.started
model.call.finished
run.closed
{"model":"stub/echo","cap_usd":0.05,"estimated_input_tokens":24}
```

Each line is an `mh.trace.envelope/v1` with `source_kind: runtime_run_event`. Search the file
for `hello onboarding` (`grep -c 'hello onboarding' "$LAB"/traces/*`). You get **0**:
"Message content is never traced"
([agent-runtime README](https://github.com/madharedev/conflux-engine/blob/d4ee1ab9b37eab30f0d374c686fe23e27ba2a66a/apps/agent-runtime/README.md),
Run discipline).

### 8. Break it on purpose: an unknown agent

```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST http://127.0.0.1:8793/internal/v1/turns \
  -H 'content-type: application/json' \
  -d '{"runId":"run_onboard02","tenantId":"madhare","agent":"rook",
       "messages":[{"role":"user","content":"hi"}],"maxUsd":0.05}'
```

Expected:

```text
{"type":"error","code":"AGT-001"}
HTTP 200
```

`rook` is the example agent in the README's request sample. It doesn't exist in this package,
because `agents` is `[]`. The HTTP status is still **200**: the refusal is the last NDJSON line.

### 9. Break it on purpose: a bad request

```bash
curl -s -w '\nHTTP %{http_code}\n' -X POST http://127.0.0.1:8793/internal/v1/turns \
  -H 'content-type: application/json' \
  -d '{"runId":"run_onboard03","tenantId":"madhare","agent":null,"messages":[],"maxUsd":-1}'
```

Expected:

```text
{"code":"REQ-001","message":"maxUsd must be null or a number >= 0"}
HTTP 400
```

This one is a real HTTP 400, because validation happens **before** the stream starts.

### 10. Stop and clean up

In terminal **A**, press **Ctrl-C**. Both children stop. Then in terminal **B**:

```bash
conflux health --url http://127.0.0.1:8793; echo "exit=$?"
ss -ltn '( sport = :8792 or sport = :8793 )'
rm -rf "$LAB"
```

Expected: health exit 1, and `ss` shows only its header. The scratch traces are gone.

## If it fails

- **`conflux start` exits right away with a configuration error.** One of the four required
  variables is missing in terminal A. Re-run the `export` lines in the same shell.
- **Exit 64 from `start`.** The ports collide with each other or with a running process.
  Choose two other free ports.
- **Health is fine but the turn returns `MDL-004` or `BUD-002`.** You set a non-stub model.
  Use `ENGINE_DEFAULT_MODEL=stub/echo` with `ENGINE_STUB=1`.
- **You see `"revision"` instead of `"service"` in health output.** You're talking to the
  user-local 1.0.6 engine (port 13080). Point `--url` at 8792 or 8793.
- **Never** set provider keys to "make it work". Keys come only via `pass-cli`, and a paid
  call needs Andrew's approval.

## Done when

- [ ] Both health checks returned `"healthy":true`, and you can name the service on each port.
- [ ] The stub turn ended with a `usage` line showing `costUsd` 0.
- [ ] You found `<date>-run_onboard01.jsonl` and listed its four record types.
- [ ] You can explain why `rook` gave `AGT-001` with HTTP 200, and why `maxUsd:-1` gave a 400.
- [ ] You can explain why the API's `/version` is 401 while the runtime's isn't (the API is the
      protected resource surface; the runtime is an internal loopback hop with no user auth).
- [ ] Nothing is listening on 8792 or 8793, and your scratch directory is deleted.

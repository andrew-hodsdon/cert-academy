---
title: "Fix first: security and client data"
kind: reading
est_minutes: 15
objectives:
  - List the security and client-data findings that should be fixed before anything else
  - Explain the risk of each in one sentence
  - Name the fix and who decides it
sources: [m6-token-rotation, m6-client-data, m6-global-process]
---

These findings carry real risk today, so they come before the consolidation work in lesson 1.
Each one is stated as the risk and the fix; none of them gives exploit steps. Status as of
2026-10-30.

| # | Finding | Risk | Fix | Status |
|---|---|---|---|---|
| 1 | Claude Code telemetry exports **raw prompts, tool content and API bodies** to Langfuse and a hosted Dynatrace endpoint | Client text (Sabai, Code A Zone material) leaves our machines, against our own rule that no client text goes into traces | Turn off prompt, tool-content and body export in the telemetry settings, keeping metrics and spans | Open; decision for Andrew (module 1) |
| 2 | Two **exposed tokens** (an AlloyDB proxy token on a command line, a Dynatrace ingest token in a collector environment) | Anyone who saw the process list or the environment could use them | Rotate both; pass tokens through the environment or a secret manager, never argv | Open incident: madhare-support#93 |
| 3 | A **client address** remains in an old PR description revision | Client data is visible in GitHub's edit history | Delete the revision | Open: madhare-support#84 |
| 4 | Code A Zone's `.openai/hosting.json` sets its static folder to the **private** `dist/` (financial and founder documents) | If that hosting is ever used, private documents are served publicly | Delete or repoint the hosting file; confirm nothing serves `dist/` | Open; decision for Andrew (module 2) |
| 5 | The running engine listens on **all interfaces** (`0.0.0.0:13080`) while its README says keep it local | The engine is reachable from the network, not just this machine | Bind to loopback, or put it behind the tailnet with auth if remote access is intended | Open; decision for Andrew (module 1) |
| 6 | Agent sessions have posted **approval reviews under Andrew's own GitHub account** | Approvals no longer prove that Andrew approved | Agents comment as the bot account and quote Andrew's approval | Open; decision for Andrew (module 5) |

> [!WARNING]
> If you are an agent and you find something like this, **do not fix it silently**. Report it to
> Andrew in chat with the evidence, and open or link a support issue. Rotating credentials,
> changing telemetry and deleting history are his decisions.

## Check yourself

1. Why is exporting raw prompts a client-data problem and not only a cost or noise problem?
2. What is the rule for passing a token to a command?
3. You find a private file being served publicly. What do you do?

<details>
<summary>Answers</summary>

1. Prompts and tool content include client documents and data; exporting them sends client
   material to third-party services, against our trace rule.
2. Through the environment or a secret manager, never as a command-line argument (argv is
   visible in the process list).
3. Report it to Andrew with the evidence and a support issue. Don't change it silently.

</details>

---
title: "Lab: walk a support issue end to end, read-only, and run the ops package tests"
kind: lab
est_minutes: 40
objectives:
  - Read a real support incident and check it against the README's rules (labels, severity, board, link-back), changing nothing
  - Compare the support repo's generated forms with the org defaults and show that the release form is missing
  - Build and test @madhare/ops in a scratch clone, and prove that forms:check catches a hand edit
sources: [m4-support-readme, m4-support-issue95, m4-support-templates, m4-org-templates, m4-support-forms, m4-support-ops-package, m4-support-forms-ci, m4-global-process]
---

## Goal

Act as triage for one real case, without touching it. You'll read incident
[madhare-support#95](https://github.com/madharedev/madhare-support/issues/95), check it
against the rules in the
[support README](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/README.md),
and write down what a triager would do. Then you'll run the support repo's own code, the
`@madhare/ops` forms generator and its tests, in a scratch clone, and break it on purpose to see
the drift check work.

All steps were run on host `madhare` on 2026-10-30. Expected output is trimmed real output.

**Safety:** every `gh` command here only reads. You don't label, comment, move cards or close
anything. The npm work happens in a scratch clone you delete at the end.

## Why this lab matters

Support is where a customer's problem becomes engineering work, and where releases are meant
to start. If triage is skipped, the problem doesn't go away. It turns up later as an unlabelled
issue nobody owns, a fix with no link back to the customer, or a release with no record of
what it was for. The README's rules (severity, MH- number, link-back line, `/public` replies)
exist so anyone can answer three questions about any case: how bad is it, who is fixing it,
and has the customer been told.

This lab teaches you to check a case against those rules **without changing it**. That's how an
auditor works, and on 2026-10-30 it's also the honest state of the repo. The rules are well
written, the forms machinery works, and the rules are rarely applied. You'll see each half of
that with your own commands: the generator and its drift check pass, and the real incident
carries no labels at all.

The second half is a habit worth keeping. When a repo says "generated, do not edit", prove the
guard works before you trust it. Break it in a scratch clone, watch it fail, and restore it.

## Before you start

- `gh auth status` shows you're signed in with read access to `madharedev`.
- Node 22 and npm are on PATH (`node --version`).
- `jq` is installed.

## Part A: the case (read-only)

### 1. Read the rules first

```bash
export LAB="$(mktemp -d)"
git clone -q /srv/conflux/projects/madhare/repos/madhare-support "$LAB/sup"
sed -n 1,30p "$LAB/sup/README.md"
```

Note the board columns (line 5), the severities (lines 13–17), the link-back line (line 24),
`/public` (line 25) and "Edit the contract, not the YAML" (line 27).

### 2. Read the incident

```bash
gh issue view 95 -R madharedev/madhare-support \
  --json number,title,state,labels,createdAt \
  --jq '{number,title,state,labels:[.labels[].name],createdAt}'
gh issue view 95 -R madharedev/madhare-support | less             # metadata and body
gh issue view 95 -R madharedev/madhare-support --comments | less  # comments only; empty if there are none
```

Expected (first command):

```text
{"createdAt":"2026-10-30T08:09:24Z","labels":[],"number":95,"state":"OPEN",
 "title":"[Incident] Codex desktop tool bridge rejects result_buffered_for_ns after package update"}
```

### 3. Check it against the rules

Fill in this table in your notes:

| Rule (README) | What #95 has | Gap? |
|---|---|---|
| A severity label, sev-1 to sev-5 | `labels: []` | **Yes**: no severity |
| An `incident` label (it's titled "[Incident]") | none | **Yes** |
| A status on board 82 | check the issue's Projects panel in the browser | ? |
| An `MH-` number | look in the body | ? |
| Product work in the product repo, with the link-back line | read the body and comments | ? |

Then write the triage you **would** do (don't do it). For example: "sev-3 (tool impaired, a
workaround exists), label `incident`, open a Bug in the owning repo with `Support case:
madharedev/madhare-support#95 (MH-…)`, and move the card to Triaged."

### 4. See how the repo is really used

```bash
gh issue list -R madharedev/madhare-support --state all --limit 400 --label incident --json number --jq length
gh issue list -R madharedev/madhare-support --state all --limit 400 --label support  --json number --jq length
gh issue list -R madharedev/madhare-support --state open --limit 20 --json number,title \
  --jq '.[] | "#\(.number) \(.title)"'
```

Expected: `2`, then `54`, then a list in which most open items are operator tasks (release
locks, reviews, decisions) rather than customer cases.

### 5. Look for the link-back line across the org

```bash
gh search issues --owner madharedev --limit 100 --json repository,number \
  --jq '[.[] | select(.repository.nameWithOwner != "madharedev/madhare-support")
         | "\(.repository.nameWithOwner)#\(.number)"]' -- '"Support case"'
```

Expected (2026-10-30):

```text
["madharedev/madhare-testing#394","madharedev/madhare-testing#391","madharedev/mh-next#120"]
```

Only three product-repo issues mention a support case at all. The handoff rule exists on paper
and is barely used.

### 6. Where would a release start?

The process says releases start in madhare-support
([line 59](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/agents/AGENTS.md)).
Compare the templates:

```bash
ls "$LAB/sup/.github/ISSUE_TEMPLATE"
gh api repos/madharedev/.github/contents/.github/ISSUE_TEMPLATE --jq '.[].name'
```

Expected:

```text
config.yml  defect.yml  incident.yml  support.yml
config.yml
defect.yml
epic.md
feature.md
incident.yml
release.md
remainder.md
support.yml
task.md
```

**This is the lesson.** The repo where releases start offers no release form. Because it has
its own `ISSUE_TEMPLATE` folder, the org's `release.md` doesn't show there either.

## Part B: run the ops package (about 5 minutes)

### 7. Install, build, check and test

```bash
cd "$LAB/sup"
mhjob npm ci -w @madhare/ops
cd packages/ops
mhjob npm run build
npm run -s forms:check; echo "exit=$?"
mhjob npm test 2>&1 | tail -9
```

Expected:

```text
exit=0
1..7
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

These are the same steps the repo's CI runs
([forms.yml](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/.github/workflows/forms.yml)).
Note that these tests live in the product repo, which the process forbids. Lesson 5 covers
that.

### 8. Break it on purpose: a hand edit

```bash
echo "# hand edit" >> ../../.github/ISSUE_TEMPLATE/support.yml
npm run -s forms:check; echo "exit=$?"
git -C "$LAB/sup" checkout -- .github/ISSUE_TEMPLATE/support.yml
npm run -s forms:check; echo "exit=$?"
```

Expected:

```text
drift: ../../.github/ISSUE_TEMPLATE/support.yml
exit=1
exit=0
```

That's why you "edit the contract, not the YAML". The contract is
[`forms/case-forms.json`](https://github.com/madharedev/madhare-support/blob/865da77acbc2b7eba46ed22d2ba722ff5a39b7a2/packages/ops/forms/case-forms.json),
and its `forms` list is Support request, Defect, Incident. To add a release form, you'd add it
there and run `npm run forms`. **Don't** do that in this lab. Draft it as an issue in your notes.

### 9. Clean up

```bash
cd / && rm -rf "$LAB"
```

## If it fails

- **`gh` says HTTP 404 or "Could not resolve".** Your session lacks access to the private
  repos. Ask your operator. Don't use someone else's token.
- **`npm ci` fails with a network error.** It needs the npm registry. Retry later, or skip Part
  B and read the test files (`packages/ops/src/*.test.ts`) instead.
- **`forms:check` reports drift before you edited anything.** You're in the canonical clone or
  an old checkout. Make a fresh scratch clone.
- **The counts differ from the expected output.** Issues change. Record your own numbers and
  the date. The pattern (few incidents, rare link-backs, no release form) is what matters.

## Done when

- [ ] You filled in the rule table for #95 and wrote the triage you would do, without changing
      the issue.
- [ ] You can state how many incidents and product link-backs exist, and what that says about
      how the repo is used.
- [ ] You showed that madhare-support has no release form, and explained why the org default
      doesn't appear.
- [ ] `forms:check` exited 0, then 1 after your hand edit, then 0 after restoring, and `npm test`
      showed `# pass 7`.
- [ ] You drafted (not filed) an issue proposing a generated `Release` form in `case-forms.json`.
- [ ] Your scratch directory is deleted.

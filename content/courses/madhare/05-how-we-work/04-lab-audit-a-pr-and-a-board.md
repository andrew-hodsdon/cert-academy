---
title: "Lab: audit a PR and a board yourself"
kind: lab
est_minutes: 45
objectives:
  - Pull a PR's process evidence with read-only gh commands and score it on branch, template sections, cross-model review timing, hours, board and native close
  - Compare a good PR (conflux-api#82) with a failing one (jbc-site-plan-review-engine#537) and explain why #537's REQUEST_CHANGES arrived after its merge
  - Compare board status sets and item states against the process's single status field, and find the stale control-plane references
sources: [m5-gh-pr-view, m5-gh-project, m5-capi-pr-82, m5-jbc-pr-537, m5-board-89, m5-process-file, m5-org-templates, m5-github-default-health-files]
---

## Goal

Run the board audit the process asks for at every checkpoint, by hand, on real PRs and boards. You'll score one good PR and one bad one, compare six boards' status sets, and confirm two stale references in the old workspace. By the end you should be able to audit any PR in under five minutes.

Every command here is **read-only**. `gh pr view`, `gh project field-list`, `gh project item-list`, `gh project view`, `gh repo view` and `gh api` GET calls change nothing.

> [!CAUTION]
> Do not run `gh pr merge`, `gh pr review`, `gh pr comment`, `gh issue close`, `gh project item-edit` or `./scripts/session-start` during this lab. Each of those writes to GitHub or to workspace state. If you find a problem, write it up as an issue **draft** in your notes. Don't file it.

## Before you start

- You are on the dev machine with `gh` signed in. `gh auth status` should show `✓ Logged in to github.com account …`. Never print the token.
- You can read the `madharedev` org's repos and Projects.
- Keep the [process file](https://github.com/madharedev/madhare-support/blob/bddb861bd834fdb92eeda574ef240dee4059cc4d/agents/AGENTS.md#L85-L112) open at the board-states, merging, PR-template and cross-model sections.
- Copy this score sheet into your notes:

| Check | Pass when |
|---|---|
| Branch | `task/<n>-code\|test\|docs` → its `feat/` branch, or `feat/` → `epic/`, or `release/` → `main` |
| Template | Closes, Ran It, Cross-model review, Docs changed, Version, Hours all present |
| Ran It | Revision, command, real input, actual output, a failure control |
| Cross-model | A different family reviewed **the merged head, before the merge** |
| Hours | A number on the PR (and on the task) |
| Board | The PR or its issues are on the release board, in the right status |
| Close | Issues are closed, natively or by hand with a note |

## Steps

1. **Check where the templates come from.**

   ```bash
   gh repo view madharedev/.github --json visibility
   ```

   Expected:

   ```text
   {"visibility":"PRIVATE"}
   ```

   The process calls this repo public. GitHub only serves org-default templates from a public `.github` repo ([GitHub docs](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)). So PR authors get the template only if they copy it. Expect section names to vary.

2. **Pull the good PR's shape.**

   ```bash
   gh pr view 82 -R madharedev/conflux-api \
     --json headRefName,baseRefName,mergedBy,closingIssuesReferences,projectItems \
     --jq '"\(.headRefName) -> \(.baseRefName) | by \(.mergedBy.login) | closes \(.closingIssuesReferences|map(.number)) | proj \(.projectItems|map(.status.name))"'
   ```

   Expected:

   ```text
   task/72-code -> feat/71-cflx-run-dispatch | by andrew-hodsdon | closes [] | proj []
   ```

   Score it. **Branch: pass.** **Close:** `[]` even though the body says what it closes. That's expected, because the base is a feature branch, not the default. Check the feature PR #80's merge comment for the hand close. **Board:** the task PR itself isn't on a board. Its issue #72 is (step 7).

3. **List the template sections.**

   ```bash
   gh pr view 82 -R madharedev/conflux-api --json body --jq .body | grep -E '^# '
   ```

   Expected (trimmed):

   ```text
   # What
   # Ran it
   # Ran It: conflux-api task #72, 2026-10-29T20:47:05Z, revision 6518568
   # Cross-model review
   # Docs changed
   # Version
   # Hours
   # Unverified
   # Decisions taken (raise if wrong)
   ```

   **Template: pass.** It has every section, plus *Unverified* and *Decisions taken*. The third line is the heading of the embedded Ran It log, with the revision and the time.

4. **Read the hours and count the review rounds.**

   ```bash
   gh pr view 82 -R madharedev/conflux-api --json body --jq .body | sed -n '/^# Hours/,/^# Unverified/p' | head -4
   gh pr view 82 -R madharedev/conflux-api --json comments \
     --jq '[.comments[]|select(.body|test("Cross-model review round"))]|length'
   ```

   Expected:

   ```text
   # Hours

   - #72 code: 2.6 h (2026-10-29 18:56Z → 20:55Z, including the contract doc, the Ran It, six cross-model review rounds and their fixes, and the suite-verification fix).
   6
   ```

   **Hours: pass**, with timestamps. **Cross-model: pass.** Six Codex rounds, with final APPROVE at `6518568`, recorded before the 2026-10-30T01:35Z merge.

5. **Now the failing PR.**

   ```bash
   gh pr view 537 -R madharedev/jbc-site-plan-review-engine \
     --json headRefName,baseRefName,mergedBy,mergedAt,closingIssuesReferences,projectItems \
     --jq '"\(.headRefName) -> \(.baseRefName) | by \(.mergedBy.login) at \(.mergedAt) | closes \(.closingIssuesReferences|map(.number)) | proj \(.projectItems|map(.status.name))"'
   gh pr view 537 -R madharedev/jbc-site-plan-review-engine --json body --jq .body | grep -E '^## '
   gh pr view 537 -R madharedev/jbc-site-plan-review-engine --json body --jq .body | sed -n '/^## Cross-model/,/^## Hours/p'
   ```

   Expected:

   ```text
   task/536-code -> main | by mh-devops-admin at 2026-10-30T10:50:07Z | closes [536] | proj []
   ## Ran It
   ## Limits
   ## Cross-model review
   ## Hours
   ## Cross-model review
   Not yet.

   ## Hours
   ```

   Score it:
   - **Branch: fail.** A task branch went straight to `main`, skipping the feature and epic branches.
   - **Close: pass**, natively, because it merged to the default branch. That's the irony: skipping the hierarchy is what made the closing keyword work.
   - **Template: partial.** No Docs changed, no Version.
   - **Board: fail.** It isn't on any board.
   - **Cross-model: fail** at merge time.

6. **Find out when the review arrived, and who approved.**

   ```bash
   gh pr view 537 -R madharedev/jbc-site-plan-review-engine --json comments,mergedAt \
     --jq '.mergedAt, (.comments[]|select(.body|test("REQUEST_CHANGES"))|.createdAt)'
   gh pr view 537 -R madharedev/jbc-site-plan-review-engine --json reviews \
     --jq '.reviews[]|"\(.author.login) \(.state) \(.submittedAt)"'
   ```

   Expected:

   ```text
   2026-10-30T10:50:07Z
   2026-10-30T11:11:49Z
   andrew-hodsdon APPROVED 2026-10-30T10:36:37Z
   ```

   The merge was at 10:50. The Codex review ("Cross-family review R1, **REQUEST_CHANGES** (post-merge qualification)", with a **major** ownership-lifecycle finding in `serve/worker.py`) came 21 minutes later. So the defect is now on `main`.

   Read the approval's body in the browser. It ends "Recorded by the hub session (Claude Code)". An agent posted it under Andrew's GitHub account, quoting his chat instruction "merge everything to main". Write down two findings: **merged before cross-model review**, and **approval recorded by an agent under the operator's identity**.

7. **Check the release board's item states.**

   ```bash
   gh project item-list 89 --owner madharedev --format json --limit 50 \
     --jq '.items[]|"\(.content.repository // "-")#\(.content.number // "-") \(.status // "-") \(.title[:40])"'
   ```

   Expected (trimmed):

   ```text
   madharedev/conflux-api#70 In progress Epic: Operators dispatch coding agents fr
   madharedev/conflux-api#71 In review Feature: cflx run dispatch starts one co
   madharedev/conflux-api#72 In review Task (code): implement cflx run dispatch
   madharedev/conflux-api#73 In review Task (test): cross-model review and Ran
   madharedev/conflux-api#74 In review Task (docs): document cflx run dispatch
   madharedev/conflux-api#80 In review feat(#71): cflx run dispatch starts one
   ```

   #71–#74 were closed and #80 merged at 06:44Z on 2026-10-30, but the board still says **In review**. They should be **Done**. **Board: fail (stale)**, even on the best example.

8. **Compare board status sets.**

   ```bash
   for n in 82 89 90 93 94 92; do
     echo "$n: $(gh project field-list $n --owner madharedev --format json \
       --jq '.fields[]|select(.name=="Status")|.options|map(.name)|join(" > ")')"
   done
   ```

   Expected:

   ```text
   82: New > Triaged > In progress > Waiting on customer > Resolved > Closed
   89: Backlog > Refining > In progress > In review > Accepted > Done
   90: Backlog > Refining > In progress > In review > Accepted > Done > Ready
   93: Todo > In progress > Done
   94: Backlog > Refining > In progress > In review > Accepted > Done
   92: Backlog > Refining > In progress > In review > Accepted > Done
   ```

   The process says "one status field everywhere: Backlog → Refining → Ready → In progress → In review → Accepted → Done". None of these matches it exactly:
   - 89, 94 and **92, the "Release Project Template"**, lack `Ready`, so every new board copied from the template inherits the gap.
   - 90 has `Ready` at the end, out of order.
   - 93 uses Todo/In progress/Done.
   - 82 is the support board, with a support-desk set. That's defensible, but undocumented.

9. **Confirm the stale workspace references.** This fails today; that is the lesson.

   ```bash
   gh project view 72 --owner madharedev --format json --jq '"\(.number) \(.title) closed=\(.closed)"'
   gh api repos/madharedev/conflux-engine/branches/andrew%2Freview --jq .name
   ```

   Expected:

   ```text
   72 Madhare Conflux Release v1.1.0 closed=true
   {"message":"Branch not found",…,"status":"404"}gh: Branch not found (HTTP 404)
   ```

   `/srv/work/dev/agentd/conflux/project.json` still names board 72 and `origin/andrew/review` as its baseline. `scripts/measure-issue-work.py --sync-board`, which WORKFLOW.md says to run at every check-in, targets that closed board. The 404 is the correct result, and it is the finding.

10. **Fill in the score sheet** for both PRs. Your result should match:

    | Check | conflux-api#82 | jbc#537 |
    |---|---|---|
    | Branch | pass | fail (task → main) |
    | Template | pass | partial |
    | Ran It | pass (dozen+ failure controls) | partial: one live check. The live check ran against the production database, so record whether that was approved |
    | Cross-model | pass (6 rounds before merge) | fail (REQUEST_CHANGES 21 min after merge) |
    | Hours | pass (2.6 h with times) | pass (0.4 h) |
    | Board | issue on board 89, stale status | not on a board |
    | Close | by hand, noted on #80 | native |

> [!TIP]
> Repeat steps 2–6 on [code-a-zone#36](https://github.com/madharedev/code-a-zone/pull/36). It says "Closes #34" and "Cross-model review: Not yet: to be requested from Codex", and it was merged by an agent account. Predict each score before you run the commands.

## If it fails

- `gh: Could not resolve to a PullRequest` or HTTP 404 on a PR: you are not signed in to an account with access to the `madharedev` org. Run `gh auth status` (it prints no secret by default) and ask for access. Don't paste tokens anywhere.
- `gh project …` says `missing required scopes [read:project]`: your token lacks the Projects scope. Ask the account owner to add it. Don't work around it with someone else's token.
- Step 9 printing "Branch not found" is **not** a lab failure. It's the expected result.
- Outputs drift as people work. If board 89's statuses have been fixed when you run step 7, good: note the date and move on.

## Done when

- [ ] You scored conflux-api#82 and jbc-site-plan-review-engine#537 on all seven checks, and your table matches step 10.
- [ ] You can explain why #82 shows `closes []` but its issues are closed, and why #537 closed natively.
- [ ] You can say, with timestamps, why #537's REQUEST_CHANGES came after its merge, and why an approval recorded by an agent under Andrew's account is a finding.
- [ ] You can name which boards break "one status field everywhere", and why copying board 92 spreads the gap.
- [ ] You have written two issue **drafts** (not filed): one for the stale `project.json` board and baseline, one for the missing `Ready` status.

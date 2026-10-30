---
title: "Collecting security process data"
kind: reading
est_minutes: 35
objectives:
  - Distinguish key performance indicators (KPIs) from key risk indicators (KRIs) and write good ones
  - Collect account-management evidence and run access reviews that find real problems
  - Explain what management review and approval should produce and why it matters
  - Use backup verification, training and awareness, and DR/BC exercise data as evidence of control effectiveness
sources: [d6-isc2-cissp-outline, d6-nist-sp-800-55v1, d6-nist-csf-2, d6-nist-sp-800-137, d6-iso-27001, d6-nist-sp-800-53a, d6-nist-sp-800-34, d6-nist-sp-800-84, d6-nist-sp-800-50]
---

Objective **6.3** is about the data that shows whether security **processes** — not just
technical controls — are working. The outline lists six sources: account management, management
review and approval, key performance and risk indicators, backup verification data, training and
awareness, and disaster recovery (DR) and business continuity (BC). The common thread: **collect
data that a decision-maker can act on**.

## Measures, metrics and indicators

NIST SP 800-55 (2024 revision) distinguishes measures by what they tell you:

| Type | Question it answers | Example |
|---|---|---|
| **Implementation** | Is the control in place? | % of servers with EDR installed |
| **Effectiveness / efficiency** | Is it working, and at what cost? | % of phishing simulations reported; mean time to patch |
| **Impact** | What does it mean for the mission? | Losses avoided; downtime prevented |

Implementation measures come first because they are easy to collect, but leadership needs
effectiveness and impact. A good measure is **tied to a goal**, **quantifiable**, **repeatable**
(collected the same way each time), **obtainable** without heroic effort, and **owned** by someone
who can act on it.

### KPIs vs KRIs

| | Key performance indicator (KPI) | Key risk indicator (KRI) |
|---|---|---|
| Looks | **Backward** at how well a process performed | **Forward** at rising exposure — an early warning |
| Answers | "Are we doing what we said, as well as we said?" | "Is risk moving toward or beyond appetite?" |
| Example | 95% of critical patches applied within 14 days | Number of internet-facing systems with known-exploited vulnerabilities older than 7 days |
| Threshold | Target | **Tolerance / trigger** tied to risk appetite, with a defined escalation |

The same raw data can feed both. "Mean days to patch" is a KPI of the patching process; "count of
critical exposures beyond SLA on crown-jewel systems" is a KRI, because it signals the likelihood
of a damaging event and is tied to appetite.

> [!TIP]
> If the question says **early warning**, **trend toward appetite** or **leading**, think KRI. If
> it says **target**, **SLA achievement** or **how well the team performed**, think KPI.

CSF 2.0's **Govern** function makes oversight a governance activity: metrics exist so leadership
can see whether the risk strategy is working and adjust it. Present metrics in business terms,
with trend and context — "80% compliant" means nothing without "up from 60%, target 95%, gap
concentrated in the acquired subsidiary".

## Account management data

Account management is where most real-world compromises begin, so the data matters.

Collect:

- **Joiner–mover–leaver records**: requests, approvals, provisioning and de-provisioning dates.
- **Time to revoke** after termination (compare HR termination date with account disable date).
- **Orphaned accounts** (no current owner), **dormant accounts** (no login in N days) and
  **shared / generic** accounts.
- **Privileged accounts**: count, owners, use, and whether each use was approved.
- **Access review results**: % of reviews completed on time, % of access removed, exceptions.

**Access reviews** (recertification) are the key control. The manager or data owner confirms each
user still needs each entitlement. Common failures to look for:

- **Rubber-stamping** — 100% approved in minutes. Measure revocation rates; a review that never
  removes anything isn't working.
- Reviewing **accounts** but not **entitlements** (the user is valid, but has three roles too many).
- Reviews by IT instead of the **data owner**, who actually knows who needs access.

Sampling is normal for auditors: pick a statistically meaningful sample of leavers and check each
was disabled within policy. A single failure in a small sample is a finding to investigate, not to
explain away.

## Management review and approval

Management review closes the loop between the security programme and the people accountable for
risk. ISO/IEC 27001 clause **9.3** requires top management to review the ISMS at planned intervals,
considering the status of previous actions, changes in context, performance feedback (nonconformities,
monitoring and measurement results, audit results, achievement of objectives), interested-party
feedback, risk-assessment results and improvement opportunities. Its outputs are **decisions**:
improvement actions, changes to the ISMS, resources.

Why it matters on the exam:

- **Accountability stays with management.** Security staff gather and present data; management
  approves risk acceptance, budgets and priorities.
- **Approval is evidence.** Minutes, signed risk acceptances and approved exceptions show the
  control environment is governed, not just operated.
- A review that receives reports but records no decisions or actions is a weakness.

## Backup verification data

A backup that has never been restored is a hope, not a control. Evidence of backup effectiveness:

| Data point | What it shows |
|---|---|
| Job success/failure rates and alerts acted on | Backups are actually taken |
| **Restore tests** (file, system, full environment) — with timings | Backups are usable, and restore fits within **RTO** |
| Backup age / frequency vs **RPO** | Data loss on recovery would be within tolerance |
| Integrity checks (hashes), encryption, offline/immutable copies | Backups survive tampering and ransomware |
| Coverage (systems backed up vs inventory) | Nothing critical was forgotten |

SP 800-34 ties backup and recovery to recovery objectives from the business impact analysis.
Restore tests must be **realistic**: restore to a clean environment, measure end-to-end time, and
verify the application works with the restored data.

## Training and awareness data

SP 800-50 Rev. 1 treats training as a programme with a lifecycle — and evaluation is part of it.
Completion rates are an **implementation** measure; they show attendance, not learning or
behaviour change. Better data:

- **Phishing simulation** click rates **and report rates** (reporting is the behaviour you want);
  trend over time and by department.
- **Assessment scores** before and after training.
- **Incident data**: proportion of incidents caused by human error, trend after targeted training.
- **Role-based training** completion for high-risk roles (administrators, developers, finance).

## DR and BC data

DR and BC exercises produce some of the most valuable process data you have. SP 800-84 describes
**tabletop exercises** (discussion-based) and **functional exercises** (simulated operations), and
the **after-action report** that records what happened and what must change. Collect:

- Whether **RTOs and RPOs were met** in tests, with actual times.
- Which plan steps failed or were missing; contact lists that were wrong.
- Dependencies discovered (a system nobody knew was needed).
- Corrective actions, owners and completion status.
- Plan maintenance: date last reviewed/updated vs required frequency, and after major changes.

(Domain 7 covers how to run DR tests — read-through, walkthrough, simulation, parallel, full
interruption. Domain 6 cares about the **data** they produce and whether it's used.)

## Worked example: a quarterly security dashboard for the board

*Scenario.* The board's risk committee wants one page each quarter. The security team currently
reports 47 operational metrics.

*Reasoning.* Choose a handful of measures tied to the top risks, each with a target or tolerance,
a trend and an owner:

| Measure | Type | Target / tolerance | This quarter | Trend | Owner |
|---|---|---|---|---|---|
| Critical vulnerabilities on internet-facing systems beyond 14-day SLA | KRI | ≤ 5 (tolerance) | 12 | ↑ | CIO |
| Leavers' accounts disabled within 24 h | KPI | 98% | 91% | ↓ | HR + IAM lead |
| Privileged access review completion with ≥ 1 revocation recorded | KPI | 100% on time | 100% | → | Data owners |
| Successful restore tests within RTO (tier-1 systems) | KPI | 100% | 80% (1 of 5 failed) | ↓ | Infrastructure |
| Phishing simulation **report** rate | KPI | ≥ 60% | 54% | ↑ | Security awareness |

Two KRIs or KPIs are red; for each, the board sees the cause, the remediation plan and the
decision required (fund faster patching; accept the restore-test gap until the new site is live).
That is management review and approval in action.

> [!WARNING]
> **Vanity metrics** — "we blocked 3 million attacks" — describe activity, not risk. On the exam,
> prefer measures that show control effectiveness against stated objectives.

## Check yourself

1. Which is a KRI: "percentage of security awareness training completed" or "number of users with
   standing domain-admin rights, trending upward"?
2. A quarterly access review shows managers approved 100% of entitlements for three years running.
   What should you conclude and do?
3. Backups have shown "100% success" for a year. Why is that insufficient evidence for the DR
   programme?

<details>
<summary>Answers</summary>

1. The second — it's a forward-looking indicator of rising exposure that can be tied to risk
   appetite. The first is a KPI (and only an implementation measure).
2. The review is probably being rubber-stamped. Check revocation rates and sample entitlements,
   make data owners accountable, and report the weakness to management.
3. Job success shows the backups ran, not that they **restore** — completely, intact and within
   RTO/RPO. You need restore-test data.

</details>

## Sources

ISC2 CISSP Exam Outline (2024), objective 6.3; NIST SP 800-55 Vol. 1 (measure types and
qualities); NIST CSF 2.0 (governance and oversight); NIST SP 800-137 (metrics in continuous
monitoring); ISO/IEC 27001:2022 clauses 9.1 and 9.3; NIST SP 800-53A (sampling and evidence);
NIST SP 800-34 Rev. 1 and SP 800-84 (backup, recovery objectives, exercises); NIST SP 800-50
Rev. 1 (training evaluation).

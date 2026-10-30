---
title: "Business continuity requirements and the business impact analysis"
kind: reading
est_minutes: 40
objectives:
  - Explain the scope, sponsorship and team of a business continuity planning effort (1.7)
  - Conduct a business impact analysis that identifies critical processes, impacts and recovery priorities (1.7)
  - Define and relate MTD/MTPD, RTO, WRT and RPO, and check a proposed strategy against them (1.7)
  - Identify and plan for external dependencies (1.7)
sources: [d1-isc2-cissp-outline, d1-nist-sp-800-34, d1-iso-22301, d1-nist-glossary, d1-nist-csf-2]
---

Objective 1.7 is about the **requirements** side of business continuity: what the business
needs to survive a disruption, and how fast. Building and testing the recovery itself sits in
Domain 7 (7.10–7.13). On the exam, the BIA is the hinge between the two: you can't choose a
recovery strategy until the BIA tells you what to recover, in what order, and how quickly.

## BCP, DRP and where they meet

| | Business continuity planning (BCP) | Disaster recovery planning (DRP) |
|---|---|---|
| Focus | Keep **critical business functions** running during and after a disruption | Restore **IT systems and facilities** after a disruption |
| Scope | Whole organisation: people, processes, facilities, suppliers, technology | Mainly technology and data centres |
| Time | Before, during and after the event | After the event |
| Owner | Senior management | IT, under the BCP |

DRP is one part of BCP. **People's safety always comes first** in either plan: evacuation and
life safety outrank any system or data.

## Starting the BCP effort

1. **Project initiation and scope**: what parts of the organisation, which locations, which
   types of event.
2. **Senior management sponsorship**: BCP needs budget, authority and cross-department
   cooperation; management is accountable for continuity and approves the plan.
3. **BCP team**: representatives of every major business unit, plus IT, security, legal,
   HR, facilities and communications/PR. Business units know what is critical; IT alone does not.
4. **Legal and regulatory requirements**: some sectors are required to have continuity plans
   (banking, healthcare, utilities); contracts may impose availability commitments.
5. **Resource requirements** for building and maintaining the plan itself.

> [!TIP]
> "What is the FIRST step in business continuity planning?" Usually: obtain senior management
> support / project initiation and scoping. "What is the first step of the BIA?" Identify the
> business processes (and their criticality).

## The business impact analysis (BIA)

The BIA identifies the organisation's critical business processes and quantifies the impact
of their disruption over time. NIST SP 800-34 Rev. 1 describes three steps:

1. **Determine mission/business processes and recovery criticality**: list processes, the
   impact of losing each over time, and the outage each can tolerate (the MTD).
2. **Identify resource requirements**: the people, facilities, systems, data, suppliers and
   records each process needs.
3. **Identify recovery priorities**: rank the processes and resources so the most critical
   are recovered first.

ISO 22301 adds the requirement to perform risk assessment alongside the BIA and to set a
**minimum business continuity objective** (the minimum acceptable level of service during
disruption).

```mermaid
flowchart LR
  P[Identify business processes] --> I[Assess impact over time: financial, operational, legal, reputational, safety]
  I --> M[Set MTD / MTPD per process]
  M --> R[Derive RTO and RPO for supporting systems]
  R --> D[Identify resource and external dependencies]
  D --> PR[Rank recovery priorities]
  PR --> S[Feed strategy selection in DR/BC planning]
```

### Impact categories

Impacts are both **quantitative** (lost revenue, contractual penalties, fines, overtime) and
**qualitative** (reputation, customer confidence, regulatory standing, staff morale, human
safety). Impacts grow with time: an outage that costs little in the first hour may be
company-ending after a week, which is why BIA results are expressed as impact **over time**.

### The recovery metrics

| Metric | Definition | Set by |
|---|---|---|
| **MTD** (maximum tolerable downtime), also **MTPD** (maximum tolerable period of disruption) | The longest a business process can be unavailable before the impact becomes unacceptable (the organisation's survival or mission is threatened) | Business owners in the BIA |
| **RTO** (recovery time objective) | The target time to restore a system or process after disruption | Derived from the MTD |
| **WRT** (work recovery time) | Time after systems are back to verify data, catch up on backlog and resume normal work | Derived from the MTD |
| **RPO** (recovery point objective) | The maximum tolerable **data loss**, measured as the age of the data you can restore to (the point in time) | Business owners, based on data value |

The relationships that matter:

$$RTO + WRT \le MTD$$

So **RTO must be less than or equal to MTD**, and in practice comfortably less to leave time
for work recovery. **RPO** is independent of time-to-recover: it drives **backup frequency and
replication**. An RPO of 15 minutes means backups or replication at least every 15 minutes; an
RPO near zero needs synchronous replication.

> [!WARNING]
> Don't confuse them: **RTO** is about **time** (how long until it's back), **RPO** is about
> **data** (how much you can lose). A nightly backup gives an RPO of up to 24 hours no matter how
> fast you can restore it.

### Worked example: an online pharmacy

> The BIA team interviews owners of the prescription-ordering process. Findings: after
> 8 hours offline, patients start going to competitors and regulators require notice; after
> 24 hours, lost revenue and patient-safety concerns become unacceptable. Orders cannot be
> re-created once lost, and the business can accept losing at most 5 minutes of orders.
> Verifying and reconciling orders after a restore takes about 4 hours.

- **MTD** = 24 hours (the point where impact becomes unacceptable).
- **WRT** ≈ 4 hours, so **RTO ≤ 24 − 4 = 20 hours**. A prudent RTO might be 12 hours,
  leaving margin.
- **RPO** = 5 minutes, so nightly backups are inadequate; the ordering database needs
  continuous or near-synchronous replication to a second site.
- **Proposed strategy check**: IT proposes restoring from nightly tape at a cold site in 48
  hours. It fails both tests: 48 h > MTD, and up to 24 h of data loss > RPO. A warm site with
  database replication meets them.
- **Priority**: the ordering process ranks above, say, the marketing website (MTD of a week).

### External dependencies

The outline calls out **external dependencies** specifically. A process is only as resilient as
everything it relies on outside your walls:

- Utilities (power, water, telecommunications) and internet service providers
- Cloud providers and SaaS platforms (payments, identity, email)
- Suppliers and logistics partners, including single-source suppliers
- Outsourced services (payroll, call centres) and **their** dependencies (fourth parties)
- Public services (emergency services, transport for staff)

For each: document it in the BIA, check whether the supplier's own recovery commitments (SLAs,
their RTO/RPO) meet **your** MTD and RPO, identify alternatives, and put continuity terms into
contracts. If a payment provider's contractual RTO is 48 hours and your MTD for checkout is 8
hours, you have a gap that needs a second provider or a manual fallback.

> [!NOTE]
> NIST CSF 2.0 treats supply chain and dependency awareness under **Govern** and **Identify**:
> knowing your critical suppliers is a governance responsibility, not only an IT one.

## Check yourself

1. A BIA sets the MTD for payroll at 72 hours and work recovery at 12 hours. What is the
   longest acceptable RTO for the payroll system?
2. The CFO says losing more than one hour of trading records would be unacceptable. Which
   metric does that set, and what does it imply for backups?
3. Who should determine the MTD of the claims-processing function: the IT director, the BCP
   coordinator, or the head of claims? Why?

<details>
<summary>Answers</summary>

1. 60 hours (72 − 12). RTO must leave room for work recovery inside the MTD.
2. The RPO of one hour. Backups or replication must capture the data at least hourly (and a
   restore point no older than an hour must be reliably available).
3. The head of claims, as the business process owner. The BIA collects owners' judgements of
   impact over time; IT and the BCP coordinator facilitate, but the business decides how long
   it can tolerate an outage.

</details>

## Sources

ISC2 CISSP Exam Outline (1.7); NIST SP 800-34 Rev. 1 (BIA steps, MTD/RTO/RPO definitions and
relationships); ISO 22301:2019 (BCMS requirements, MTPD, minimum business continuity
objective); NIST CSRC Glossary; NIST CSF 2.0 for dependency governance.

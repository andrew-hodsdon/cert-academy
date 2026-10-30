---
title: "Handling, secure provisioning and asset inventory"
kind: reading
est_minutes: 35
objectives:
  - Turn a classification into concrete handling requirements for marking, storage, transport and sharing (2.2)
  - Distinguish marking from labelling and explain why both matter (2.2)
  - Explain what a useful asset inventory contains and how it supports security decisions (2.3)
  - Describe secure provisioning of information and assets, including ownership and acceptable use (2.3)
sources: [d2-isc2-cissp-outline, d2-iso-27001, d2-iso-27002, d2-nist-sp-800-53r5, d2-cui-32-cfr-2002, d2-cis-controls-v8, d2-nist-sp-1800-5, d2-nist-sp-800-128, d2-ms-purview-ip]
---

A classification on its own changes nothing. Objective 2.2 asks you to **establish handling
requirements**: the rules that tell every person and system what to do with an asset at each
level. Objective 2.3 asks you to **provision information and assets securely**, which depends on
knowing what you have (inventory), who owns it, and how it is managed through its life.

## From classification to handling

A handling standard is a matrix: classification levels across the top, activities down the side.
The owner sets the requirement; the custodian and users carry it out.

| Activity | Public | Internal | Confidential | Restricted |
|---|---|---|---|---|
| Marking / labelling | Optional | Footer label | Header and footer label, metadata tag | Label on every page, cover sheet, metadata tag |
| Storage at rest | No rule | Corporate systems only | Encrypted; access by role | Encrypted; named individuals; logged access |
| Transmission | No rule | Corporate e-mail | Encrypted in transit; no personal e-mail | Encrypted end to end; approved channels only |
| Printing | No rule | Corporate printers | Secure (pull) printing | Approved printers; tracked copies |
| Removable media | Allowed | Approved devices | Encrypted, approved devices | Prohibited without owner approval |
| Sharing outside | Allowed | NDA in place | Owner approval and NDA | Owner approval per release, logged |
| Disposal | Normal recycling | Shred | Cross-cut shred / purge | Destroy, with certificate |

ISO/IEC 27001 Annex A covers this ground in 5.10 (acceptable use of information and assets), 5.13
(labelling), 5.14 (information transfer) and 7.10 (storage media). NIST SP 800-53's Media
Protection family does the same for media: MP-3 marking, MP-4 storage, MP-5 transport and MP-6
sanitisation.

### Marking versus labelling

The terms are close and the exam may separate them:

- **Marking** is the human-readable indication of classification and handling caveats on the
  asset: a banner on a document, a sticker on a tape, a header in an e-mail. CUI, for example, has
  prescribed banner markings (32 CFR 2002).
- **Labelling** usually means the **machine-readable** attribute associated with the data:
  metadata or a security label that systems use to enforce rules (a sensitivity label in a
  document's metadata that a DLP or rights-management system reads, or a label used by mandatory
  access control).

Both matter. Humans need markings to handle things properly; systems need labels to enforce
policy automatically. Unmarked media should be treated as the **highest** classification it could
hold until someone accountable decides otherwise.

> [!TIP]
> Handling requirements apply to the **media and the copies**, not only the original. A printout of
> a Confidential report is Confidential; so is the backup tape that holds it, and so is the laptop
> that once cached it.

### Storage, transport and custody

- **Storage**: secured locations matching the classification (locked cabinets, safes, encrypted
  storage, access-controlled rooms). Backups inherit the classification of their contents and need
  the same or stronger protection, including off-site copies.
- **Transport**: encryption of portable media, tamper-evident packaging, bonded couriers, and a
  **chain of custody** record showing who held the asset and when. NIST SP 800-53 MP-5 asks for
  accountability during transport and restricting transport to authorised personnel.
- **Destruction**: handled in lesson 3, but the handling standard should say which method applies
  to which level.

### People are part of handling

Handling rules only work if people know them. Pair the standard with awareness training, an
acceptable use policy that users acknowledge, and a clear route to report mishandling. A clean-desk
policy and screen locks are handling controls too.

## Asset inventory (2.3)

Everything in Domain 2 assumes you know what assets exist. CIS Control 1 (enterprise assets) and
Control 2 (software assets) put inventory first for this reason, and CIS Control 3 adds a **data
inventory**. ISO/IEC 27001 control 5.9 requires an inventory of information and other associated
assets, **including owners**.

### What a useful inventory records

| Field | Why it matters |
|---|---|
| Unique identifier and type | Count and track it; tangible (laptop, server) and intangible (data set, licence, SaaS tenant) |
| Owner (accountable person) | Someone decides classification and approves access |
| Custodian / location | Who operates it and where it physically or logically lives (including which cloud region) |
| Classification | Drives handling and control selection |
| Data it holds or processes | Links hardware and services to the information at risk |
| Configuration baseline and software | Patch and vulnerability management depend on it |
| Lifecycle dates | Acquired, warranty, **end of support**, planned disposal |
| Dependencies / business function | Business impact analysis and recovery priority |

NIST SP 1800-5 shows the practical pattern: **automated discovery** feeding a single asset
repository, reconciled against procurement and configuration records, so that unknown devices
stand out. Manual spreadsheets drift out of date within weeks.

> [!WARNING]
> Shadow IT and unmanaged cloud services are inventory failures. You cannot patch, back up,
> classify or sanitise an asset you do not know about. If a scenario describes an unknown server
> being breached, the root-cause control is **asset inventory and management**, not a better
> firewall rule.

### Asset management across the lifecycle

Asset management is broader than inventory: it follows each asset from **request and approval**,
through **acquisition**, **provisioning**, **operation and change**, to **retirement and
disposal**, keeping the inventory accurate at every step. Configuration management (NIST SP
800-128) keeps a known, approved baseline for each asset type, and change management keeps the
inventory and baselines current.

## Secure provisioning (2.3)

Provisioning means making an information asset or IT resource available to someone. Doing it
securely means:

1. **Approved request.** The asset or access is requested and approved by the **owner** (not just
   the requester's manager), based on need to know and least privilege.
2. **Known-good baseline.** Hardware and virtual machines are built from an approved, hardened
   image (secure configuration baseline), with security tools installed before handover.
3. **Recorded ownership.** The inventory records the new asset, its owner, its custodian and its
   classification at the moment it is provisioned, not weeks later.
4. **Acceptable use acknowledged.** The recipient accepts the acceptable use policy and any
   handling obligations.
5. **Return and deprovisioning.** When the need ends (role change, termination, contract end),
   assets are returned (ISO/IEC 27001 control 5.11) and access removed; data on returned devices
   is sanitised before re-issue.

The same logic applies to cloud resources: a new storage bucket or SaaS tenant is an asset that
needs an owner, a classification, a secure default configuration and an inventory entry. Templates
(infrastructure as code) are a strong way to make secure provisioning repeatable.

## Worked example: a laptop refresh

**Scenario.** A legal firm is replacing 300 laptops. Lawyers carry privileged client data
classified Restricted. The IT manager plans to image new laptops, let users copy their own files
across over the weekend, and send the old laptops to a reseller.

**Problems a CISSP should spot:**

| Step as planned | Issue | Better practice |
|---|---|---|
| Image new laptops | Is the image the approved hardened baseline with full-disk encryption on? | Provision from the approved baseline; verify encryption before issue |
| Users copy their own files | Unknown copies of Restricted data on USB sticks; no record of where data went | Custodian-run migration over a controlled channel; no removable media |
| Inventory | Old and new devices not reconciled | Update the inventory at issue and return; each device has an owner and status |
| Old laptops to a reseller | Media leaves organisational control holding Restricted data | **Purge** (or destroy) per the sanitisation standard, verify, and get certificates before release |
| Who approved? | The IT manager is a custodian | The data owner (managing partner or delegate) approves the handling plan |

The CISSP answer is not "use a better copy tool": it is **follow the handling standard the owner
set, keep the inventory accurate, and sanitise to the classification** before anything leaves your
control.

## Check yourself

1. A box of unlabelled backup tapes is found in a storeroom. How should staff handle them until
   their contents are known?
2. What is the difference between marking and labelling?
3. An attacker compromised a forgotten test server holding a copy of production customer data.
   Which Domain 2 control failed first?

<details>
<summary>Answers</summary>

1. Treat them as holding the **highest** classification the organisation uses, secure them
   accordingly, and refer them to the likely data owner to decide.
2. **Marking** is the human-readable indication on the asset (banners, stickers); **labelling** is
   the machine-readable attribute (metadata, security label) that systems use to enforce policy.
3. **Asset inventory and management** (2.3): an unknown asset holding classified data had no owner,
   no baseline and no handling controls. Production data in test also breaks the owner's handling
   rules.

</details>

## Sources

ISC2 CISSP outline (2.2, 2.3); ISO/IEC 27001 and 27002 controls 5.9–5.14 and 7.10; NIST SP 800-53
MP and CM-8 families; 32 CFR 2002 (CUI marking); CIS Controls v8 Controls 1–3; NIST SP 1800-5
(automated asset management); NIST SP 800-128 (secure baselines); Microsoft Purview documentation
(an example of machine-readable sensitivity labels).

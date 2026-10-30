---
title: "Security models, control selection, evaluation and system capabilities"
kind: reading
est_minutes: 45
objectives:
  - State the rules of Bell-LaPadula, Biba, Clark-Wilson, Brewer-Nash, Take-Grant, Graham-Denning and Harrison-Ruzzo-Ullman and pick the right model for a scenario
  - Select and tailor controls from system security requirements using categorisation and baselines (3.3)
  - Explain Common Criteria terms (TOE, PP, ST, EAL1–7) and what certification and authorisation mean
  - Describe the security capabilities of information systems: reference monitor, TCB, memory protection, TPM, HSM and trusted execution (3.4)
sources: [d3-isc2-cissp-outline, d3-bell-lapadula-1976, d3-biba-1977, d3-clark-wilson-1987, d3-brewer-nash-1989, d3-anderson-security-engineering, d3-nist-sp-800-53r5, d3-nist-sp-800-37r2, d3-common-criteria, d3-iso-15408, d3-tcg-tpm2, d3-nist-sp-800-193, d3-fips-140-3, d3-nist-sp-800-160v1r1]
---

## What a security model is

A security model is a precise statement of a security policy, usually as rules about how **subjects**
(active entities: users, processes) may access **objects** (passive entities: files, records). Models
are abstract: they tell an engineer what the system must enforce, not how. Most of them are built on two
underlying ideas:

- **State machine model:** the system is secure if it starts in a secure state and every transition
  leads to another secure state. Bell-LaPadula and Biba are both state machine models.
- **Information flow model:** the system controls how information may move between security levels.
  **Lattice-based** access control puts levels and categories in a lattice so any two have a least
  upper bound and greatest lower bound. **Noninterference** (Goguen and Meseguer, 1982) says actions at a
  high level must have no visible effect at a low level, which is the formal basis for closing covert
  channels.

## The confidentiality model: Bell-LaPadula (BLP)

Built for the US Department of Defense in the 1970s, BLP protects **confidentiality** only.

| Rule | Plain English | Memory aid |
|---|---|---|
| **Simple security property** | A subject may not read an object at a higher level | No read up |
| **\* (star) property** | A subject may not write to an object at a lower level | No write down |
| **Strong star property** | A subject may read and write only at its own level | Same level only |
| **Discretionary security property** | Access also has to be allowed by an access matrix | Need to know |

"No write down" stops a SECRET process leaking data into an UNCLASSIFIED file, whether through a
careless user or a Trojan horse. BLP's weaknesses: it says nothing about integrity (a low user can
write *up* and corrupt high data), and it does not address covert channels. **Tranquillity** properties
govern whether security labels may change while the system runs.

## The integrity models

### Biba

Biba (1977) is BLP turned upside down, to protect **integrity**:

| Rule | Plain English | Memory aid |
|---|---|---|
| **Simple integrity property** | A subject may not read lower-integrity data | No read down |
| **\* integrity property** | A subject may not write to a higher-integrity object | No write up |
| **Invocation property** | A subject may not invoke (call) a subject at higher integrity | No calling up |

> [!TIP]
> A memory trick: in both models, **simple = read** and **star = write**. Then: BLP protects secrets so
> you cannot read *up* to them; Biba protects clean data so you cannot be contaminated by reading *down*.
> "**Bi**ba is **i**ntegrity: '**I** won't read **d**irt.'"

### Clark-Wilson

Clark and Wilson (1987) argued that commercial systems care about integrity through **well-formed
transactions** and **separation of duty**, not through levels. Its pieces:

- **Constrained data items (CDIs):** the data whose integrity matters (account balances).
- **Unconstrained data items (UDIs):** untrusted input (a form submission).
- **Transformation procedures (TPs):** the only programs allowed to change CDIs, each a well-formed
  transaction.
- **Integrity verification procedures (IVPs):** check that CDIs are in a valid state (a reconciliation).
- **The access triple:** a user may touch a CDI only through an authorised TP: *subject → program →
  object*. Users never access the data directly.

Clark-Wilson addresses all three integrity goals: prevent unauthorised users from making changes,
prevent authorised users from making improper changes, and keep internal and external consistency.

### Brewer-Nash (the Chinese Wall)

Brewer and Nash (1989) model a consultancy that serves competitors. Data are grouped into **company
datasets**, and those into **conflict-of-interest classes**. Once an analyst reads Bank A's data, the
wall goes up and they can no longer access Bank B's data in the same class, though they can still access
an oil company in a different class. The key feature is that it is **dynamic**: access rights depend on
what the subject has *already* accessed.

## Access-rights models

| Model | What it describes | Remember |
|---|---|---|
| **Take-Grant** | A directed graph of subjects and objects with four rules: *take*, *grant*, *create*, *remove* | Shows how rights can propagate between subjects |
| **Graham-Denning** | Eight protection rules for creating and deleting subjects and objects, and for reading, granting, deleting and transferring access rights | How subjects and objects are securely created and deleted |
| **Harrison-Ruzzo-Ullman (HRU)** | Generalises Graham-Denning with an access matrix and commands; proves the *safety question* (can a right ever leak?) is undecidable in general | Rights changes as commands; safety is undecidable |
| **Access control matrix** | Rows are subjects, columns are objects; rows are **capability lists**, columns are **access control lists** | ACL = column, capability = row |

> [!NOTE]
> The 2024 outline also names a "Star Model" in 3.2. Treat it as the \*-property family: questions about
> star rules are about **writing** (no write down in BLP, no write up in Biba).

### Worked example: which model?

| Scenario | Model | Why |
|---|---|---|
| Military system must stop a SECRET process copying data into a CONFIDENTIAL log | Bell-LaPadula (\*-property) | Confidentiality; no write down |
| A sensor feed of unknown quality must not alter the verified reference dataset | Biba (\* integrity) | Integrity; no write up |
| Bank tellers may change balances only through the posting application, and a supervisor reconciles daily | Clark-Wilson | Access triple via TPs; IVP is the reconciliation |
| An audit firm must stop the same partner working for two rival airlines | Brewer-Nash | Conflict-of-interest classes, history-based |
| Analyst wants to know whether user X could ever end up with write rights to the payroll file | Take-Grant (or HRU) | Rights propagation and the safety question |

## Selecting controls from requirements (3.3)

Control selection is risk-driven, not vendor-driven. The NIST Risk Management Framework (SP 800-37) gives
the sequence: **prepare → categorise → select → implement → assess → authorise → monitor**.

1. **Categorise** the system by the impact of losing confidentiality, integrity or availability (FIPS
   199: low, moderate, high; the high-water mark sets the overall category).
2. **Select** the matching baseline from SP 800-53B (low, moderate or high).
3. **Tailor** it: scope out controls that don't apply, choose parameter values, add **compensating
   controls** where a baseline control is infeasible, and add controls for specific threats.
4. Document the result in the security plan, with each control traced to a requirement.

The order matters on the exam: you cannot pick controls until you know what you are protecting and how
much it matters. Requirements also come from law, contracts (PCI DSS for card data) and the organisation's
own policy, and a good answer reconciles all three.

## Evaluating systems: Common Criteria

The **Common Criteria (CC)**, published as **ISO/IEC 15408**, is the international scheme for evaluating
the security of IT products. The current version is **CC:2022**; you may still see products evaluated
under v3.1.

| Term | Meaning |
|---|---|
| **Target of evaluation (TOE)** | The product or system being evaluated |
| **Protection profile (PP)** | An implementation-independent set of security requirements for a *type* of product, written by a user community or government (for example, a firewall PP) |
| **Security target (ST)** | The vendor's document stating the security claims for *this* product, often claiming conformance to a PP |
| **Security functional requirements (SFRs)** | What the product does |
| **Security assurance requirements (SARs)** | How confident we are that it does it |
| **Evaluation assurance level (EAL)** | A package of assurance requirements, EAL1 to EAL7 |

| EAL | Name |
|---|---|
| EAL1 | Functionally tested |
| EAL2 | Structurally tested |
| EAL3 | Methodically tested and checked |
| EAL4 | Methodically designed, tested and reviewed |
| EAL5 | Semiformally designed and tested |
| EAL6 | Semiformally verified design and tested |
| EAL7 | Formally verified design and tested |

> [!WARNING]
> A higher EAL means more **assurance** (rigour of evaluation), not more security **functionality**. An
> EAL4 product with weak functional claims can be less suitable than an EAL2 product whose security
> target matches your requirements. Always check that the evaluated configuration and ST match how you
> will deploy it.

Historical schemes still appear in older questions: the US **TCSEC** ("Orange Book", divisions D, C, B,
A, focused on confidentiality) and the European **ITSEC**. CC replaced both.

**Certification and authorisation.** *Certification* (or assessment) is the technical evaluation of
whether controls are implemented correctly. *Accreditation*, which NIST now calls **authorisation**, is
the management decision by a senior official to accept the remaining risk and allow the system to
operate. The authorising official owns the risk; the assessor does not.

## Security capabilities of information systems (3.4)

### The reference monitor and the TCB

The **reference monitor** is the abstract concept of a mechanism that mediates every access by a subject
to an object. It must be **tamper-proof**, **always invoked** (complete mediation), and **small enough
to be verified**. The **security kernel** is the hardware, firmware and software that implement it. The
**trusted computing base (TCB)** is everything that enforces the security policy; the **security
perimeter** is the boundary between the TCB and the rest of the system. Keep the TCB small, which is
"keep it simple and small" from lesson 1 applied to architecture.

### Memory protection and process isolation

- **Protection rings:** ring 0 (kernel) is most privileged; ring 3 runs user applications. A user
  process reaches the kernel only through controlled system calls.
- **Process isolation:** each process has its own virtual address space, enforced by the memory
  management unit, so one process cannot read another's memory.
- **Data execution prevention (DEP / NX bit):** marks memory pages as non-executable, so injected code
  in a data region cannot run.
- **Address space layout randomisation (ASLR):** randomises where code and libraries load, making
  exploits that rely on fixed addresses unreliable.
- **Trusted execution environments (TEEs) / secure enclaves:** hardware-isolated regions (for example
  Intel SGX, Arm TrustZone) that protect code and data even from a compromised OS.

### TPM

A **Trusted Platform Module** is a hardware root of trust on the motherboard (specified by the Trusted
Computing Group, also ISO/IEC 11889). Its capabilities:

- **Platform configuration registers (PCRs)** record hashes of each boot component (**measured boot**).
- **Sealing** binds a key to a set of PCR values, so a disk-encryption key is released only if the boot
  chain is unchanged.
- **Remote attestation** lets the platform prove its measured state to a verifier.
- **Protected keys:** the endorsement key and storage root key never leave the chip.

### HSM

A **hardware security module** is a dedicated, tamper-resistant appliance or card that generates, stores
and uses keys at scale (CA signing keys, payment PINs, database master keys). FIPS 140-3 validates
cryptographic modules at four levels: level 2 adds tamper **evidence** and role-based authentication,
level 3 adds tamper **response** (zeroise keys on intrusion) and identity-based authentication, level 4
adds protection against environmental attacks such as voltage and temperature manipulation.

| | TPM | HSM |
|---|---|---|
| Scope | One device | Many applications or a whole organisation |
| Typical use | Measured boot, disk encryption keys, device identity | CA keys, payment keys, key management service |
| Performance | Slow, low cost | High throughput, expensive |

### Encryption and decryption as a system capability

The outline lists encryption/decryption here as a built-in capability: self-encrypting drives, full-disk
encryption keyed by the TPM, and hardware AES instructions. The design point is that keys must be
protected by something stronger than the data they protect, which is why TPMs and HSMs exist.

## Check yourself

1. A process labelled SECRET tries to write a summary into a CONFIDENTIAL file and is blocked. Which
   model and rule?
2. A vendor shows you a Common Criteria certificate at EAL4. What two things should you check before
   relying on it?
3. Which TPM capability ensures a disk-encryption key is released only if the bootloader has not been
   modified?

<details>
<summary>Answers</summary>

1. Bell-LaPadula, the \*-property (no write down).
2. That the security target's claims (and any protection profile) match your requirements, and that
   the evaluated configuration matches how you will deploy the product. The EAL alone says nothing about
   functionality.
3. Sealing to PCR values recorded during measured boot.

</details>

## Sources

Models: Bell and LaPadula (MTR-2997, 1976), Biba (MTR-3153, 1977), Clark and Wilson (1987), Brewer and
Nash (1989), cross-checked with Anderson, *Security Engineering* 3rd ed. Control selection: NIST SP
800-37 Rev. 2 and SP 800-53 Rev. 5. Evaluation: Common Criteria portal (CC:2022) and ISO/IEC 15408.
Capabilities: TCG TPM 2.0 Library, NIST SP 800-193, FIPS 140-3, NIST SP 800-160.

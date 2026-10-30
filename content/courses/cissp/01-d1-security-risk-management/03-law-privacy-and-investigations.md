---
title: "Law, regulation, privacy, intellectual property and investigations"
kind: reading
est_minutes: 45
objectives:
  - Distinguish contractual, legal, industry-standard and regulatory requirements (1.4)
  - Explain cybercrime and data breach obligations, including GDPR's 72-hour rule (1.4)
  - Choose the right intellectual property protection and licensing model (1.4)
  - Apply import/export controls and transborder data flow mechanisms (1.4)
  - Apply privacy principles from the OECD guidelines, GDPR and US law (1.4)
  - Compare administrative, criminal, civil, regulatory and industry-standard investigations (1.5)
sources: [d1-isc2-cissp-outline, d1-gdpr, d1-edpb-transfers, d1-oecd-privacy, d1-ccpa, d1-hhs-hipaa, d1-cfaa, d1-doj-ccips, d1-wipo-ip, d1-uspto-ip-basics, d1-wassenaar, d1-bis-ear, d1-pci-dss, d1-nist-sp-800-86]
---

The CISSP is an international exam, so it tests **principles** of law rather than one
country's statutes, but it uses well-known laws (mostly US and EU) as examples. You are not
expected to act as a lawyer. You are expected to know when to **involve legal counsel**, what
kind of obligation you are facing, and what evidence standard applies.

> [!TIP]
> When a scenario raises a legal question you can't answer from the facts, "consult legal
> counsel" is very often the best first step.

## Types of requirement (1.4)

| Type | Source | Enforced by | Example |
|---|---|---|---|
| **Legal (statutory) / regulatory** | Legislatures and the agencies they empower | Courts, regulators (fines, sanctions, prison) | GDPR, HIPAA, SOX, GLBA, state breach laws |
| **Contractual** | Agreements you sign | The other party (breach of contract, damages, termination) | SLAs, data processing agreements, NDAs |
| **Industry standard** | Industry bodies | Contract and membership (fines, loss of privileges) | **PCI DSS**: not a law; enforced by card brands through acquirers |

Categories of law: **criminal** (offences against society; the state prosecutes; prison and
fines), **civil / tort** (disputes between parties; compensation), **administrative /
regulatory** (rules made by government agencies). Common-law systems (US, UK) rely on
precedent; civil-law systems (most of Europe) on codified statutes; some countries use
religious or customary law, or a mix.

### Example laws worth recognising

| Law | Jurisdiction | Gist |
|---|---|---|
| Computer Fraud and Abuse Act (CFAA, 1986) | US federal | Unauthorised access to, or exceeding authorised access on, protected computers |
| HIPAA (1996) and HITECH (2009) | US | Health information privacy and security; breach notification; business associates liable |
| Gramm-Leach-Bliley Act (GLBA, 1999) | US | Financial institutions' privacy notices and safeguards for customer data |
| Sarbanes-Oxley (SOX, 2002) | US | Accuracy of public companies' financial reporting; internal controls; executives certify |
| FISMA (2002, updated 2014) | US | Security programmes for federal agencies (uses NIST standards) |
| COPPA (1998) | US | Parental consent for collecting data from children under 13 |
| CCPA as amended by CPRA | California | Consumer rights to know, delete, correct, opt out of sale/sharing |
| GDPR (in force May 2018) | EU/EEA, extraterritorial | Comprehensive data protection for anyone processing EU residents' personal data |

All US states now have data breach notification laws, each with its own triggers and deadlines.

## Cybercrime and data breaches

Cybercrime laws criminalise unauthorised access, damage, fraud, extortion and trafficking in
credentials. Challenges for investigators: attackers cross borders, evidence is volatile,
and jurisdiction is unclear. The Budapest Convention on Cybercrime (Council of Europe, 2001)
is the main treaty for harmonising cybercrime law and cross-border cooperation.

**Data breach** obligations come from law and contract:

- **GDPR Art. 33**: the controller notifies the supervisory authority **without undue delay and
  where feasible within 72 hours** of becoming aware, unless the breach is unlikely to result
  in a risk to people. **Art. 34**: notify the affected individuals without undue delay when the
  risk to them is **high**. Processors must notify the controller without undue delay.
- **GDPR fines (Art. 83)**: up to **EUR 20 million or 4% of worldwide annual turnover**,
  whichever is higher, for the most serious infringements.
- **HIPAA**: covered entities notify affected individuals, HHS, and in large breaches the media.
- **Contracts**: PCI DSS and data processing agreements impose their own notification duties.

## Intellectual property and licensing

| Type | Protects | How obtained | Duration (US example) | Watch for |
|---|---|---|---|---|
| **Copyright** | Original expression (code, text, music); not the idea | Automatic on creation; registration helps enforce | Author's life + 70 years; works made for hire 95 years from publication or 120 from creation, whichever is shorter | DMCA (1998) adds anti-circumvention rules |
| **Patent** | Novel, useful, non-obvious inventions | Application and examination; public disclosure required | Generally 20 years from filing | You give up secrecy in exchange for a monopoly |
| **Trademark** | Words, logos, symbols identifying a source | Use; registration strengthens (USPTO) | Registrations renewable every 10 years, indefinitely while used | Must keep using and defending it |
| **Trade secret** | Valuable confidential business information (recipes, algorithms) | Keep it secret with reasonable measures (NDAs, access control) | As long as it stays secret | No protection once independently discovered or reverse-engineered lawfully |

> [!WARNING]
> Choosing between patent and trade secret: a patent forces public disclosure and expires; a
> trade secret can last forever but you must **actively protect** it, and the law will not help
> if you failed to take reasonable measures. The US Economic Espionage Act (1996) criminalises
> theft of trade secrets.

**Licensing**: software is licensed, not sold. Types: contractual (signed) licences,
shrink-wrap (accepted by opening the package), click-through, cloud/subscription terms, and
open-source licences (permissive such as MIT/Apache, or copyleft such as the GPL, which
requires derivative works to be released under the same terms). Licence compliance is a
legal risk: track entitlements, audit installs, and check open-source obligations before
shipping.

## Import/export controls

Cryptography and some security tools are **dual-use** goods. The **Wassenaar Arrangement** is
a multilateral regime (42 participating states) whose dual-use list includes information
security items; each state implements it in national law. In the US, dual-use items are
controlled by the **Export Administration Regulations (EAR)** from Commerce's Bureau of
Industry and Security, and defence articles by **ITAR** (State Department). Import controls
also exist: some countries restrict the use or import of strong encryption.

Practical effect: shipping a product with strong encryption, or letting a foreign national
access controlled technology, may need classification or a licence. Ask legal or trade
compliance first.

## Transborder data flow

Moving personal data across borders is regulated by the data's origin, not just its
destination. Under GDPR Chapter V, personal data may leave the EEA only with a transfer
mechanism:

| Mechanism | What it is |
|---|---|
| **Adequacy decision** (Art. 45) | The Commission finds a country's protection essentially equivalent; data flows freely. The **EU–US Data Privacy Framework** (July 2023) covers US organisations that certify to it |
| **Standard contractual clauses** (Art. 46) | Commission-approved contract terms between exporter and importer, plus a transfer impact assessment |
| **Binding corporate rules** (Art. 47) | Approved internal rules for transfers within one multinational group |
| **Derogations** (Art. 49) | Narrow exceptions such as explicit consent or contract necessity; not for routine transfers |

**Data localisation** (sovereignty) laws in some countries go further and require certain
data to stay in-country. Cloud architecture must respect both.

## Privacy

Privacy is the individual's right to control their personal information; security is one of
the tools that protects it. The foundation for most privacy law is the **OECD Privacy
Guidelines** (1980, revised 2013), with eight principles:

1. Collection limitation
2. Data quality
3. Purpose specification
4. Use limitation
5. Security safeguards
6. Openness
7. Individual participation
8. Accountability

**GDPR Art. 5 principles** echo them: lawfulness, fairness and transparency; purpose
limitation; data minimisation; accuracy; storage limitation; integrity and confidentiality;
accountability. Key GDPR roles: the **controller** decides purposes and means; the
**processor** processes on the controller's documented instructions (Art. 28 contract); a
**data protection officer** is required for public authorities and some large-scale
processing. Processing needs a **lawful basis** (Art. 6: consent, contract, legal obligation,
vital interests, public task, legitimate interests). High-risk processing needs a **DPIA**
(Art. 35), and systems must have **data protection by design and by default** (Art. 25).

Other privacy laws you may see named: Canada's PIPEDA, Brazil's LGPD, China's PIPL, South
Africa's POPIA. You won't be tested on their details; recognise that they are comprehensive
privacy laws modelled on similar principles.

### Worked example: a transfer decision

> A German retailer wants to move its customer database to an analytics provider in a country
> with no adequacy decision.

1. The retailer is the controller; the provider is a processor. Sign an Art. 28 processing agreement.
2. No adequacy, so use **SCCs** plus a transfer impact assessment (can the destination's laws
   undermine the clauses?), with supplementary measures such as encryption where the provider
   does not hold the keys.
3. Apply minimisation: send only the fields the analytics needs, pseudonymised.
4. Record it, and run a DPIA if the processing is high-risk.

## Investigation types (1.5)

The **type** of investigation sets who leads it, the burden of proof, and how carefully
evidence must be handled.

| Type | Purpose | Who leads | Standard of proof | Evidence handling |
|---|---|---|---|---|
| **Administrative** (operational) | Internal matters: policy violations, operational problems | The organisation (HR, security) | Low; whatever the organisation needs to act | Less formal, but may become criminal, so preserve evidence |
| **Criminal** | Breach of criminal law | Law enforcement and prosecutors | **Beyond a reasonable doubt** | Strict: chain of custody, legal search authority, admissibility rules |
| **Civil** | Dispute between parties (contract, IP, tort) | The parties and their lawyers | **Preponderance of the evidence** (more likely than not) | Discovery/e-discovery; preservation (legal hold) duties |
| **Regulatory** | Violations of administrative law or regulation | Government agencies (or regulated bodies' internal teams for them) | Varies by regulator | Varies; may be very formal |
| **Industry standards** | Compliance with an industry standard (e.g. PCI DSS) | Industry-appointed investigators, such as a PCI Forensic Investigator | Set by the standard and contracts | Per the standard's requirements |

> [!IMPORTANT]
> Treat **every** investigation as if it could end up in court. An administrative
> investigation into misuse can uncover a crime; if you didn't keep a chain of custody, the
> evidence may be unusable. Involve legal counsel before contacting law enforcement, and know
> that once law enforcement is involved the organisation loses some control (evidence may be
> seized, the matter may become public).

Forensic practice (detail in Domain 7, objective 7.1) follows NIST SP 800-86: **collection,
examination, analysis, reporting**, collecting the most volatile evidence first, working on
verified copies (hash before and after), and documenting every hand-off in a chain of custody.

## Check yourself

1. Your company is fined by a card brand after an audit finds it non-compliant with PCI DSS.
   What kind of requirement was breached, and why isn't it a statutory violation?
2. A company wants maximum, indefinite protection for a proprietary trading algorithm that
   cannot easily be reverse-engineered from its outputs. Patent or trade secret, and what must
   it do to keep that protection?
3. An HR investigation into an employee's misuse of the expense system finds evidence of
   large-scale fraud. What changes about how the evidence must be handled, and what is the
   standard of proof if it goes to criminal court?

<details>
<summary>Answers</summary>

1. An industry-standard (contractual) requirement: PCI DSS is created by the PCI Security
   Standards Council and enforced through contracts with acquirers and card brands, not passed
   by a legislature.
2. Trade secret: it can last indefinitely and avoids the public disclosure a patent requires.
   The company must take reasonable measures to keep it secret (NDAs, access control,
   need-to-know, marking).
3. It may become a criminal matter, so evidence needs full forensic handling and a documented
   chain of custody, and legal counsel should decide on involving law enforcement. Criminal
   courts require proof beyond a reasonable doubt.

</details>

## Sources

ISC2 CISSP Exam Outline (1.4, 1.5); GDPR text on EUR-Lex (Arts. 5, 6, 25, 28, 33–35, 44–49, 83) and
the European Commission's international data protection pages; OECD Privacy Guidelines;
California AG on CCPA/CPRA; HHS on HIPAA; 18 U.S.C. § 1030 and DOJ CCIPS on cybercrime; WIPO and
USPTO on intellectual property; Wassenaar Arrangement and BIS on export controls; PCI SSC on
PCI DSS; NIST SP 800-86 on forensic process.

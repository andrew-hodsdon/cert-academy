# Official exam outlines (verified 2026-10-30)

Checked against the official ISC2 and Google Cloud pages on the date above. Re-check before relying on a date.

## CISSP (ISC2)

Outline effective **15 April 2024**; a new outline is announced for **15 April 2027**.
Source: https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline

| # | Domain | Weight | Objectives |
|---|---|---|---|
| 1 | Security and Risk Management | 16% | 1.1 Professional ethics · 1.2 Security concepts (CIA, authenticity, nonrepudiation) · 1.3 Security governance principles · 1.4 Legal, regulatory and compliance issues · 1.5 Investigation types · 1.6 Policies, standards, procedures, guidelines · 1.7 Business continuity requirements · 1.8 Personnel security · 1.9 Risk management concepts · 1.10 Threat modeling · 1.11 Supply chain risk management · 1.12 Security awareness, education and training |
| 2 | Asset Security | 10% | 2.1 Information and asset classification · 2.2 Information and asset handling · 2.3 Secure provisioning of resources · 2.4 Data lifecycle management · 2.5 Asset retention · 2.6 Data security controls and compliance |
| 3 | Security Architecture and Engineering | 13% | 3.1 Secure design principles · 3.2 Security models · 3.3 Control selection from system requirements · 3.4 Security capabilities of information systems · 3.5 Vulnerabilities of architectures, designs and solution elements · 3.6 Cryptographic solutions · 3.7 Cryptanalytic attacks · 3.8 Site and facility design · 3.9 Site and facility security controls · 3.10 Information system lifecycle |
| 4 | Communication and Network Security | 13% | 4.1 Secure network architecture design · 4.2 Secure network components · 4.3 Secure communication channels |
| 5 | Identity and Access Management | 13% | 5.1 Physical and logical access to assets · 5.2 Identification and authentication strategy · 5.3 Federated identity with third parties · 5.4 Authorization mechanisms · 5.5 Identity and access provisioning lifecycle · 5.6 Authentication systems |
| 6 | Security Assessment and Testing | 12% | 6.1 Assessment, test and audit strategies · 6.2 Security control testing · 6.3 Security process data collection · 6.4 Test output analysis and reporting · 6.5 Security audits |
| 7 | Security Operations | 13% | 7.1 Investigations · 7.2 Logging and monitoring · 7.3 Configuration management · 7.4 Foundational security operations concepts · 7.5 Resource protection · 7.6 Incident management · 7.7 Detective and preventative measures · 7.8 Patch and vulnerability management · 7.9 Change management · 7.10 Recovery strategies · 7.11 DR processes · 7.12 DR plan testing · 7.13 BC planning and exercises · 7.14 Physical security · 7.15 Personnel safety and security |
| 8 | Software Development Security | 10% | 8.1 Security in the SDLC · 8.2 Security controls in development ecosystems · 8.3 Software security effectiveness · 8.4 Security impact of acquired software · 8.5 Secure coding guidelines and standards |

Exam: CAT, 100–150 items, 3 hours, multiple choice plus advanced item types, 25 unscored pretest
items, passing standard 700/1000 (CAT reports pass/fail).

## Google Cloud Professional Cloud Architect

Current exam guide (undated; case studies labelled **v6.1**). Covers the Well-Architected
Framework, Gemini Cloud Assist, Gemini Enterprise Agent Platform and Model Armor.
Guide: https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf
Page: https://cloud.google.com/learn/certification/cloud-architect

| § | Section | Weight | Objectives |
|---|---|---|---|
| 1 | Designing and planning a cloud solution architecture | ~25% | 1.1 Business requirements · 1.2 Technical requirements · 1.3 Network, storage and compute resources · 1.4 Migration plan · 1.5 Future solution improvements |
| 2 | Managing and provisioning a solution infrastructure | ~17.5% | 2.1 Network topologies · 2.2 Storage systems · 2.3 Compute systems · 2.4 Gemini Enterprise Agent Platform for end-to-end ML workflows · 2.5 Prebuilt solutions and APIs with Agent Platform |
| 3 | Designing for security and compliance | ~17.5% | 3.1 Designing for security · 3.2 Designing for compliance |
| 4 | Analyzing and optimizing technical and business processes | ~15% | 4.1 Technical processes · 4.2 Business processes |
| 5 | Managing implementation | ~12.5% | 5.1 Advising development and operations teams · 5.2 Interacting with Google Cloud programmatically |
| 6 | Ensuring solution and operations excellence | ~12.5% | 6.1 Operational excellence pillar of the Well-Architected Framework · 6.2 Google Cloud Observability · 6.3 Deployment and release management · 6.4 Supporting deployed solutions · 6.5 Quality control measures · 6.6 Reliability in production (chaos engineering, penetration and load testing) |

Exam: 50–60 multiple choice / multiple select, 2 hours, $200, valid 2 years. Each exam uses
2 of the 4 case studies (~20–30% of questions).

### Case studies (v6.1), summarised in our own words

- **Altostrat Media** — a media company with a large library of podcasts, interviews, news and
  documentaries. Already on GKE, Cloud Storage, BigQuery and Cloud Run functions, with some on-prem
  ingestion and archive systems to migrate. Wants generative AI for 24/7 natural-language support,
  automatic summaries and metadata extraction, inappropriate-content detection, content-trend
  insight, better reliability and lower storage cost. Technical: centralised container CI/CD,
  fast secure hybrid connectivity, Kubernetes on-prem and in cloud, auditable and explainable AI
  moderation, LLM chatbots.
  https://services.google.com/fh/files/misc/v6.1_pca_altostrat_media_case_study_english.pdf
- **Cymbal Retail** — a fast-growing online retailer with a huge, hard-to-manage catalogue. Hybrid
  estate: MySQL, SQL Server, Redis, MongoDB, Kubernetes, SFTP/batch-ETL integrations, an IVR feeding a
  call centre that keys orders by hand, open-source monitoring. Wants gen AI for product attributes,
  descriptions and images, conversational shopping agents, lower call-centre and data-centre cost.
  Technical: accurate attribute generation, image editing/variation, natural-language product
  discovery, catalogue-scale, a human review step for AI output, secure compliant data handling.
  https://services.google.com/fh/files/misc/v6.1_pca_cymbal_retail_case_study_english.pdf
- **EHR Healthcare** — SaaS electronic health records for medical offices, hospitals and insurers;
  leaving colocation because a lease is ending. Containerised apps on Kubernetes, relational and
  NoSQL databases, legacy insurer integrations on-prem, Active Directory, scattered monitoring.
  Needs fast insurer onboarding, ≥99.9% availability, central performance visibility, lower latency,
  regulatory compliance (healthcare data), lower admin cost, healthcare-trend analytics. Technical:
  hybrid connectivity keeping legacy interfaces, consistent multi-environment container management,
  unified logging and alerting, dynamic scaling, data pipelines for new providers.
  https://services.google.com/fh/files/misc/v6.1_pca_ehr_healthcare_case_study_english.pdf
- **KnightMotives Automotive** — a vehicle maker (autonomous, battery-electric, hybrid, petrol) whose
  hybrid/petrol in-car tech lags and sales are suffering. Mostly on-prem: an old mainframe supply
  chain and ERP, fragmented vehicle code bases, weak connectivity at plants and in rural areas.
  Goals: a consistent AI-powered in-car experience across models within five years, better
  build-to-order for dealers, data monetisation, autonomous-driving investment, strong security after
  past breaches, EU data-protection compliance. Technical: hybrid cloud, network upgrades, scalable
  AI/ML and simulation, a secure data platform, incident response, new dealer tools and CRM.
  https://services.google.com/fh/files/misc/v6.1_pca_knightmotives_automotive_case_study_english.pdf

Retired (do not teach as current): Mountkirk Games, TerramEarth, Helicopter Racing League, Dress4Win.

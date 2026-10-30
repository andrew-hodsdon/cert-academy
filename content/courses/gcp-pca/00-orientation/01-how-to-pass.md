---
title: "How to use this course and pass the PCA"
kind: reading
est_minutes: 15
sources: [gcp-pca-cert-page, gcp-pca-exam-guide]
objectives:
  - Follow a study loop that ends with booking the exam at the right time
  - Describe the exam's format and how case studies appear in it
  - Apply the "every requirement, least operational burden" rule to pick answers
---

## The loop

1. **Read a section module**, then take its **section quiz** (random draw from the section bank). Review every miss.
2. Read the **case studies** module and take the case-studies quiz. Know all four companies well: the exam will use two of them.
3. When every section quiz is at 80%, sit the **full practice exam**: 55 questions in 2 hours, weighted like the real exam.
4. You are **exam-ready** when your last three full practice exams average **80% or more**. Then book.

## How the real exam behaves

| | |
|---|---|
| Questions | 50–60, multiple choice and multiple select |
| Time | 2 hours (about 2 minutes per question) |
| Case studies | 2 of the 4 (Altostrat Media, Cymbal Retail, EHR Healthcare, KnightMotives Automotive), roughly 20–30% of questions |
| Weights | §1 ~25%, §2 ~17.5%, §3 ~17.5%, §4 ~15%, §5 ~12.5%, §6 ~12.5% |
| Validity | 2 years |

> [!TIP]
> Case-study questions can be answered faster if you already know each company's requirements by heart. Read the case-study lessons twice.

## How to pick the answer

Google's correct answer is almost always the one that:

1. meets **every** requirement in the question (cost, latency, compliance, region, skills);
2. uses a **managed** service rather than something you operate yourself;
3. follows **least privilege** and the documented Google pattern;
4. changes the **least** to get there when the question says "minimise changes".

> [!WARNING]
> Product names change. The current exam guide uses **Gemini Enterprise Agent Platform** (formerly Vertex AI), **Cloud Run functions** (formerly Cloud Functions) and **Google Cloud Observability** (Cloud Monitoring and Cloud Logging).

## Check yourself

1. A question needs a relational database, global writes and 99.999% availability. Which service?
2. Two options both work; one is a GKE Standard cluster you manage, the other is Cloud Run. The app is a stateless HTTP API. Which does the exam prefer, and why?
3. What share of the exam do case studies usually make up?

<details>
<summary>Answers</summary>

1. Spanner (multi-region configuration).
2. Cloud Run: it meets the need with less operational burden.
3. Roughly 20–30%.

</details>

**Sources:** the Google Cloud Professional Cloud Architect certification page and exam guide (see the Sources tab).

---
title: "1.3 Choosing network, storage and compute resources"
kind: reading
est_minutes: 55
objectives:
  - Choose between Compute Engine, GKE Standard, GKE Autopilot, Cloud Run, Cloud Run functions and App Engine for a workload
  - Choose machine options (Spot, custom machine types, specialised families and accelerators)
  - Choose between Cloud SQL, AlloyDB, Spanner, Bigtable, Firestore, BigQuery and Memorystore
  - Choose object, block and file storage and the right Cloud Storage class
  - Choose hybrid connectivity, Network Service Tier and VPC sharing model
  - Place Google's AI and data-processing services in a design
sources: [s1-compute-choice, s1-cloud-run, s1-gke-autopilot, s1-app-engine, s1-machine-families, s1-spot-vms, s1-cud-overview, s1-databases, s1-spanner, s1-alloydb, s1-bigtable, s1-firestore, s1-bigquery, s1-storage-classes, s1-autoclass, s1-filestore, s1-data-processing, s1-pubsub, s1-network-tiers, s1-connectivity-choice, s1-dedicated-interconnect, s1-ha-vpn, s1-shared-vpc, s1-vpc-peering, s1-psc, s1-agent-platform, s1-ai-hypercomputer, s1-waf-ai-ml]
---

## How to read a "which service" question

Objective 1.3 is the decision-table objective. The exam gives a workload and constraints, and the
four answers are real products. Use this order of questions:

1. **What does the workload need control over?** (OS, kernel, GPU drivers, licences, node config)
2. **What is its shape?** (request-driven, long-running, batch, event, streaming)
3. **What are the data's access pattern and consistency needs?**
4. **What is the operational budget?** If the team is small, the most managed option that meets
   requirement 1–3 wins.

## Compute: mapping needs to products

| Product | You manage | Scales | Billing | Pick it when |
|---|---|---|---|---|
| **Compute Engine** | OS, patches, runtime | MIG autoscaler | Per VM-second | Lift-and-shift, custom OS/kernel, licensed software, special hardware, stateful legacy apps |
| **GKE Standard** | Node pools, upgrades windows, node config | HPA + cluster autoscaler | Per node (VMs) + cluster fee | You need node-level control: GPUs/TPUs with specific config, privileged workloads, DaemonSets on custom nodes, fine bin-packing |
| **GKE Autopilot** | Pods only | HPA; Google provisions nodes | Per Pod resource request | Kubernetes API and portability with minimal node operations |
| **Cloud Run** (services, jobs) | Container image | Per request, to zero; jobs run to completion | Per use (request or instance based) | Stateless HTTP/gRPC services, APIs, web apps, event handlers, batch jobs; small ops team |
| **Cloud Run functions** | Function code | Per event | Per use | Small single-purpose event glue (a file lands in a bucket, a Pub/Sub message arrives) |
| **App Engine** (standard, flexible) | Code (standard) | Automatic | Per instance | Existing App Engine apps; for new serverless containers Google points to Cloud Run |

> [!TIP]
> "Containers, Kubernetes skills are scarce, want the least operations" → **Cloud Run** if stateless
> and request-driven, **GKE Autopilot** if they need the Kubernetes API (Helm charts, operators,
> hybrid consistency with on-prem Kubernetes). "Must control nodes / custom kernel modules" →
> **GKE Standard** or Compute Engine.

**Worked example: EHR-style platform.** A healthcare SaaS runs dozens of containerised services on
Kubernetes on premises and wants consistent container management in the cloud and on premises,
dynamic scaling and less admin work. Cloud Run would mean rewriting deployment tooling and dropping
the Kubernetes API, and Compute Engine would add operations. The fit is **GKE** (Autopilot where no
node customisation is needed), managed across environments with GKE Enterprise fleet features so the
on-prem clusters are governed the same way. Hybrid connectivity reaches legacy insurer interfaces.

### Choosing compute resources

| Option | What it is | Use when | Avoid when |
|---|---|---|---|
| **Spot VMs** | Spare capacity, deep discount, preemptible any time, no SLA, no max runtime | Fault-tolerant batch, CI, rendering, simulation, stateless workers | Databases, single-instance services, anything that can't be interrupted |
| **Custom machine types** | Choose vCPU and memory independently (within family limits) | Predefined shapes waste memory or CPU; licence is per core | A predefined type already fits |
| **Compute-optimised (C-series/H-series)** | Highest per-core performance | HPC, gaming servers, CPU-bound batch | General web apps |
| **Memory-optimised (M-series)** | Very large memory per VM | SAP HANA, large in-memory databases | Small workloads |
| **Accelerator-optimised (A-series GPUs, TPUs)** | GPUs or TPUs attached | ML training/inference, simulation, rendering | CPU-only work |
| **Sole-tenant nodes** | Dedicated physical host | Licences tied to physical cores, strict isolation | Ordinary workloads (higher cost) |

For very large AI training and inference, Google packages TPUs, GPUs, networking, storage and
software as **AI Hypercomputer**: the answer when a scenario needs large-scale accelerator capacity
with optimised software, not a single GPU VM.

## Data stores: the database decision table

| Service | Model | Scale and consistency | Pick it when |
|---|---|---|---|
| **Cloud SQL** | Managed MySQL, PostgreSQL, SQL Server | Single primary, vertical scale, read replicas; regional HA | Lift an existing relational app; moderate scale; familiar engines |
| **AlloyDB for PostgreSQL** | PostgreSQL-compatible | Higher performance than standard PostgreSQL, columnar engine for analytics on operational data, high availability | Demanding PostgreSQL OLTP, hybrid transactional/analytical, migrating off commercial databases to PostgreSQL |
| **Spanner** | Relational, SQL, strongly consistent | Horizontal scale, multi-region with external consistency | Global relational OLTP, very high write scale, 99.999%-class availability needs |
| **Bigtable** | Wide-column NoSQL (HBase API) | Millions of ops/sec, single-digit ms by row key | Time series, IoT telemetry, ad-tech, ML features; key-based access only |
| **Firestore** | Document NoSQL | Serverless, real-time listeners, offline mobile sync | Mobile/web apps, user profiles, flexible schema |
| **Memorystore** | Redis/Valkey/Memcached | In-memory | Caching, sessions, leaderboards |
| **BigQuery** | Columnar analytics warehouse | Serverless, petabyte SQL | Analytics, BI, ML on data; not per-request OLTP |

> [!WARNING]
> Classic traps: BigQuery as an application's transactional database (wrong: it is for analytics);
> Bigtable for ad-hoc SQL joins (wrong: it is key-range access); Spanner for a small regional app
> with no scale need (over-engineered and costly); Cloud SQL for a globally distributed write-heavy
> system (single-primary bottleneck).

**Worked example.** KnightMotives wants to ingest telemetry from millions of connected vehicles
(a few readings per second each), serve the latest readings by vehicle ID to a dealer app in
milliseconds, and run fleet-wide analytics. Telemetry ingestion → **Pub/Sub**; stream processing →
**Dataflow**; per-vehicle low-latency reads → **Bigtable** keyed by vehicle ID and reversed
timestamp; fleet analytics → **BigQuery**. No single database does all three well.

## Storage types and Cloud Storage classes

| Type | Product | Use |
|---|---|---|
| Object | Cloud Storage | Unstructured data, media, backups, data lakes; HTTP access; effectively unlimited |
| Block | Persistent Disk / Hyperdisk, Local SSD | VM boot and data disks; Local SSD for scratch (data lost when the VM stops) |
| File | Filestore (NFS); Cloud Storage FUSE / Parallelstore for specialised cases | Lift-and-shift apps that need a shared POSIX file system |

Cloud Storage classes all have the same millisecond access latency and durability; they differ in
storage price, retrieval fee and **minimum storage duration**:

| Class | Minimum duration | Typical access |
|---|---|---|
| Standard | None | Hot data, frequently read |
| Nearline | 30 days | About once a month or less |
| Coldline | 90 days | About once a quarter or less |
| Archive | 365 days | Less than once a year; compliance archives, DR copies |

Use **Object Lifecycle Management** rules when the access pattern is predictable by age ("move to
Coldline after 90 days, delete after 7 years"). Use **Autoclass** when access is unpredictable: it
moves objects between classes based on actual access, without retrieval or early-deletion charges
for those transitions. Location types: region (lowest latency to co-located compute), dual-region,
multi-region (highest availability for geographically spread readers).

## Data processing choices

| Need | Service |
|---|---|
| Ingest events/messages at scale, decouple systems | Pub/Sub |
| Unified batch and streaming pipelines (Apache Beam), serverless | Dataflow |
| Existing Spark/Hadoop jobs with minimal change | Dataproc (or Dataproc Serverless for Spark) |
| SQL transformations and analytics in the warehouse | BigQuery |
| Visual, low-code ETL with connectors | Cloud Data Fusion |
| Orchestrate multi-step pipelines (Airflow) | Cloud Composer |

The exam's rule of thumb: **existing Spark/Hadoop → Dataproc; new pipelines, especially streaming
→ Dataflow; SQL-able transformations → BigQuery.**

## AI and machine learning solutions

Vertex AI is now part of **Gemini Enterprise Agent Platform**, Google's platform for building,
scaling, governing and optimising AI agents and models. The parts the guide names:

- **Gemini models**: Google's multimodal LLMs, used through the platform's APIs for summarisation,
  extraction, chat, image understanding and generation.
- **Model Garden**: a catalogue of Google, third-party and open models to evaluate, tune and deploy.
- **Agent tooling** (the guide's "Agent Builder"): build conversational and task agents grounded in
  enterprise data, low-code or with the Agent Development Kit.
- **AI Hypercomputer**: the accelerator infrastructure layer for training and serving at scale.

Decision rule: **use a prebuilt model or API before tuning, and tune before training from scratch.**
Cymbal's product-description generation and Altostrat's episode summaries are calls to Gemini with
grounding and a human review step, not custom model training. Section 2.4–2.5 covers the platform
in depth.

## Networking

### Cloud-native networking building blocks

- **VPC**: global network; **subnets are regional**. Firewall rules and policies control traffic;
  routes and Cloud Router (BGP) handle dynamic routing.
- **Shared VPC**: one **host project** owns the network; **service projects** attach and deploy
  into its subnets. Central network and security teams keep control while app teams own projects.
  The default for an organisation's landing zone.
- **VPC Network Peering**: private connectivity between two VPCs (even across organisations).
  **Not transitive**, and ranges must not overlap.
- **Private Service Connect (PSC)**: a private endpoint in your VPC for Google APIs or a producer's
  published service. Consumer and producer stay separate networks; overlapping IP ranges are fine.
- **Load balancers**: global external Application Load Balancer (HTTP(S), anycast IP, Cloud CDN,
  Cloud Armor), regional variants, network (L4) load balancers, internal load balancers.
- **Container networking**: VPC-native GKE clusters use alias IP ranges for Pods and Services.

### Network Service Tiers

| | Premium Tier (default) | Standard Tier |
|---|---|---|
| Path | Google's backbone from the edge nearest the user | Public internet to the region |
| Scope | Global (global load balancers, anycast IP) | Regional only |
| Performance | Lower latency, higher reliability | Comparable to other clouds' internet routing |
| Cost | Higher egress price | Lower |

Choose Standard Tier only when cost matters more than performance and a regional deployment is
acceptable.

### Hybrid and multicloud connectivity

| Option | Capacity | Path | SLA | Use when |
|---|---|---|---|---|
| **HA VPN** | A few Gbps per tunnel; add tunnels | Encrypted over internet | 99.99% with the documented topology | Quick start, low-to-moderate bandwidth, backup for Interconnect |
| **Dedicated Interconnect** | 10, 100 or 400 Gbps circuits | Private physical link in a colocation facility | 99.9% or 99.99% with redundant topologies | High bandwidth, you can reach a Google colocation facility |
| **Partner Interconnect** | VLAN attachments 50 Mbps–50 Gbps | Through a service provider | Google-to-provider SLA; provider may offer end-to-end | Can't reach a colocation facility, or need less than 10 Gbps |
| **Cross-Cloud Interconnect** | 10 or 100 Gbps class | Physical link between Google and another cloud | With primary and redundant connections | Private high-bandwidth multicloud |
| **Direct / Carrier Peering** | Varies | Public Google services (e.g. Workspace) | **No SLA** | Reaching Google's public services, not your VPC |

For **99.99%** Dedicated Interconnect, Google's topology uses four connections across two metro
areas (two in each, in different edge availability domains) with Cloud Routers in two regions.
**99.9%** needs two connections in one metro in different edge availability domains. Network
Connectivity Center provides a hub-and-spoke for connecting many sites and VPCs.

> [!TIP]
> Interconnect traffic is **not encrypted by default**. If the scenario requires encryption over a
> private link, add HA VPN over Cloud Interconnect or MACsec (Section 3 detail).

## Check yourself

1. A stateless REST API in a container has unpredictable traffic with long idle periods and a
   two-person team. Which compute product?
2. A global gaming leaderboard must accept writes from every continent with strong consistency.
   Which database?
3. A factory site needs 2 Gbps to Google Cloud and cannot reach a colocation facility. Which
   connectivity option?

<details>
<summary>Answers</summary>

1. Cloud Run: scales to zero, no cluster to manage.
2. Spanner multi-region (global writes with strong consistency). Memorystore could cache reads but
   is not the system of record.
3. Partner Interconnect (sub-10 Gbps, through a provider), with HA VPN as a cheaper alternative
   if bandwidth and latency allow.

</details>

## Sources

Compute choices rest on Google's hosting options page and the Cloud Run, GKE Autopilot, App Engine,
machine family and Spot VM pages. The database table rests on Google's database overview and each
product's overview page. Storage classes and Autoclass come from Cloud Storage documentation.
Networking rests on the Network Service Tiers, connectivity-choice, Dedicated Interconnect, HA VPN,
Shared VPC, VPC peering and PSC pages. AI services come from the Gemini Enterprise Agent Platform
overview, AI Hypercomputer page and the framework's AI and ML perspective.

---
title: "Vulnerabilities of architectures and solution elements"
kind: reading
est_minutes: 45
objectives:
  - Identify the characteristic weaknesses of client, server, database, cryptographic and distributed systems
  - Explain the priorities and weaknesses of ICS/OT, IoT and embedded systems and the matching mitigations
  - Compare cloud service and deployment models, virtualisation, containers, serverless, microservices, HPC and edge computing by their risks
  - Choose the most effective mitigation for an architecture weakness in a scenario
sources: [d3-isc2-cissp-outline, d3-owasp-top10, d3-nist-sp-800-145, d3-csa-security-guidance, d3-nist-sp-800-125, d3-nist-sp-800-190, d3-owasp-serverless-top10, d3-nist-sp-800-82r3, d3-cisa-ics, d3-nist-ir-8259, d3-owasp-iot-top10, d3-anderson-security-engineering]
---

## How to think about 3.5

Objective 3.5 lists many architectures: client-based, server-based, database, cryptographic systems,
ICS, cloud (SaaS, IaaS, PaaS), distributed, IoT, microservices, containerisation, serverless, embedded,
high-performance computing and edge computing, plus virtualised systems. You are not expected to
configure any of them. You are expected to know **what typically goes wrong** in each and **which
control addresses it best**. The pattern across all of them: every new layer of abstraction adds a new
shared component, and a flaw in the shared component affects everyone on it.

## Client, server and database systems

| Architecture | Typical weaknesses | Main mitigations |
|---|---|---|
| **Client-based** | Malicious downloads and applets, unpatched browsers and plug-ins, local caches holding sensitive data, trusting client-side validation | Patch and harden endpoints, EDR, application allow-listing; **re-validate everything on the server** |
| **Server-based** | Data-flow control failures, injection, misconfiguration, unneeded services, excessive privileges | Hardening baselines, least functionality, input validation, segmentation |
| **Database** | **Aggregation** and **inference**, SQL injection, excessive privileges, unencrypted backups | Parameterised queries, views, polyinstantiation, cell suppression, noise, least privilege, activity monitoring |
| **Cryptographic systems** | Weak or deprecated algorithms, poor key management, bad random numbers, implementation flaws | Approved algorithms, HSM or KMS key storage, vetted libraries (see lessons 4 and 5) |

### Aggregation and inference

These two database risks are exam favourites.

- **Aggregation:** combining individually low-sensitivity items produces something more sensitive. Each
  base's delivery schedule is unclassified; all of them together reveal troop movements.
- **Inference:** a user *deduces* information they are not cleared for from what they can see. A clerk
  sees that the department budget fell by exactly one senior salary the week a colleague left and infers
  that salary.

Countermeasures:

- **Polyinstantiation** creates two records with the same key at different classification levels, so a
  low user sees a cover story rather than a revealing "access denied".
- **Cell suppression** hides specific cells.
- **Noise and perturbation** add small errors to statistical results.
- **Partitioning** splits the database.
- **Context-dependent access control** decides on what else the user has already seen.

> [!TIP]
> If the question says "**combining** records reveals more", it is aggregation. If it says "the user
> **worked out** something from what they could see", it is inference. Polyinstantiation is the
> classic answer to inference in a multilevel database.

### Distributed systems and microservices

Distributed systems spread trust across many nodes. Risks include inconsistent security policy between
nodes, weak authentication between services, data in transit across untrusted networks, and the
difficulty of a complete audit trail. **Microservices** multiply these: dozens of small services, each
with its own API, credentials and dependencies. Mitigations are service-to-service authentication
(mutual TLS, often through a service mesh), an API gateway for external traffic, centralised logging with
correlation IDs, and least-privilege service identities.

**High-performance computing (HPC)** clusters prioritise throughput, often run on shared, high-speed
interconnects with shared file systems and batch schedulers, and are frequently exempted from the
endpoint tools that would slow them down. That makes job isolation, strict access to the scheduler and
data segregation between research projects the key controls.

## Industrial control systems and OT

ICS covers **SCADA** (supervisory control across wide areas, such as pipelines and power grids),
**DCS** (distributed control within one plant) and **PLCs** (the controllers that drive physical
equipment). NIST SP 800-82 Rev. 3 frames them as **operational technology (OT)**.

| IT priority | OT priority |
|---|---|
| Confidentiality often first | **Safety** and **availability** first; integrity of commands next |
| Patch monthly | Patch in planned outages, sometimes once a year or never |
| 3–5 year hardware life | 15–30 year life |
| Reboot is cheap | Reboot may stop production or endanger people |

Typical weaknesses: legacy protocols (Modbus, DNP3) with no authentication or encryption, flat networks
joined to the corporate LAN, vendor remote-access links, default credentials and unsupported operating
systems. The highest-value mitigation is **segmentation**: separate OT from IT with a DMZ (the Purdue
model levels), allow only required flows, and monitor passively. Where you cannot patch, compensate with
isolation, allow-listing and strict remote-access control.

> [!WARNING]
> Never pick "run an active vulnerability scan against the PLCs during production" as a first step.
> Active scans can crash fragile controllers. Passive monitoring and an asset inventory come first, and
> any testing is scheduled with the plant's safety staff.

## IoT and embedded systems

**Embedded systems** are computers built into larger devices (medical pumps, car ECUs, printers). **IoT**
devices are embedded systems with network connectivity. They share weaknesses: hard-coded or default
passwords, no secure update mechanism, unencrypted communication, limited CPU for cryptography, long
service lives with short vendor support, and physical exposure.

NISTIR 8259 sets baseline device capabilities manufacturers should provide: device identification,
device configuration, data protection, logical access to interfaces, software update, and cybersecurity
state awareness. OWASP's IoT Top 10 starts with weak, guessable or hard-coded passwords and insecure
network services.

Mitigations for the buyer: put IoT on its **own network segment** with only the flows it needs, change
default credentials, buy devices that support signed updates, and track firmware in the asset inventory.

## Cloud service and deployment models

NIST SP 800-145 defines cloud by five essential characteristics: **on-demand self-service, broad network
access, resource pooling, rapid elasticity and measured service**.

| Service model | You get | You still secure |
|---|---|---|
| **IaaS** | Virtual machines, storage, networks | Guest OS, middleware, apps, data, identities, network rules |
| **PaaS** | A managed runtime or database | Your code, its configuration, data and identities |
| **SaaS** | A finished application | Data, user access, configuration of the app's security settings |

Deployment models: **public**, **private**, **community** (shared by organisations with common concerns)
and **hybrid**. Cloud-specific risks: misconfigured storage and identity policies (the most common cause
of cloud breaches), multi-tenancy and data remanence, loss of physical access for forensics, data
location and sovereignty, provider lock-in, and the shared responsibility gap where each side assumes
the other owns a control.

## Virtualisation

| Hypervisor | Runs on | Example use |
|---|---|---|
| **Type 1** (bare metal) | Directly on hardware | Data centres, cloud providers |
| **Type 2** (hosted) | On top of a host OS | Desktop labs, testing |

Type 1 has a smaller attack surface because there is no general-purpose host OS underneath. Key risks:
**VM escape** (code in a guest breaks out to the hypervisor and so to every other guest), **VM sprawl**
(unmanaged, unpatched VMs), insecure snapshots holding sensitive memory, and shared resources enabling
side-channel attacks between tenants. Mitigations: patch the hypervisor first, restrict management
interfaces, keep a VM inventory, and separate workloads of different sensitivity onto different hosts.

## Containers

Containers package an application with its dependencies but **share the host operating system kernel**.
That is the key difference from VMs: a kernel exploit from one container can affect every container on
the host. NIST SP 800-190 groups container risks by component:

- **Images:** embedded vulnerabilities, malware, embedded secrets, untrusted base images.
- **Registries:** insecure connections, stale images, weak access control.
- **Orchestrator:** unbounded administrative access, weak separation between workloads of different
  sensitivity.
- **Containers:** running as root, privileged mode, writable file systems.
- **Host OS:** a large attack surface and shared kernel.

Mitigations: scan images in the pipeline, sign images and pull only from trusted registries, never bake
secrets into images, run as non-root with a read-only root file system, use container-specific host OSes,
and group containers by sensitivity onto separate hosts.

## Serverless

In serverless (function as a service) the provider manages servers, OS and scaling; you supply functions
triggered by events. The attack surface shifts to **event data** (injection from queues, storage events,
HTTP), **over-privileged function roles**, insecure third-party dependencies, secrets in environment
variables, and thin logging. Least-privilege roles per function and input validation on every event
source are the main controls.

## Edge computing

Edge computing processes data close to where it is produced (a factory, a cell tower, a vehicle) to cut
latency and bandwidth. The risks: many physically exposed nodes, intermittent connectivity to central
management (so patches and revocations lag), and inconsistent configuration. Controls: hardware root of
trust and secure boot on edge nodes, encryption of local data, zero-touch provisioning with strong device
identity, and central policy that is cached and enforced locally.

## Worked example: picking the best mitigation

**Scenario.** A food manufacturer has (a) packaging-line PLCs on the same flat network as office PCs,
(b) 300 IP cameras still using their factory passwords, and (c) a new container platform whose developers
build images from random public base images and pass database passwords as build arguments.

| Finding | Best first mitigation | Why not the alternatives |
|---|---|---|
| PLCs on flat network | Segment OT from IT with a DMZ and strict flow rules | Patching PLCs needs outages; an active scan risks the line |
| Cameras with default passwords | Change credentials and move cameras to an isolated VLAN | Buying new cameras is slower; encryption doesn't fix the login |
| Container images | Approved base images from a trusted registry, image scanning, and a secrets manager | A WAF in front of the app doesn't touch build-time secrets |

The common thread: start with the control that removes the most risk across the whole population at the
lowest cost and disruption.

## Check yourself

1. Why is a container breakout potentially more damaging to neighbouring workloads than a single VM
   compromise?
2. A user with access only to aggregate salary tables works out one colleague's pay. Which risk is this,
   and which control would a multilevel database use to address it?
3. Under SaaS, who is responsible for configuring which employees can access the application?

<details>
<summary>Answers</summary>

1. Containers share the host kernel, so a kernel exploit from one container can reach every container on
   that host. VMs each run their own kernel; a guest compromise needs a separate hypervisor escape.
2. Inference. Polyinstantiation, cell suppression or noise/perturbation; for statistical tables, noise
   and minimum query-set sizes.
3. The customer. Identity and access to the data stay with the customer in every service model.

</details>

## Sources

ISC2 CISSP outline 3.5; OWASP Top 10; NIST SP 800-145 and CSA Security Guidance v5 (cloud); NIST SP
800-125 (virtualisation); NIST SP 800-190 (containers); OWASP Serverless Top 10; NIST SP 800-82 Rev. 3
and CISA ICS guidance (OT); NISTIR 8259 and OWASP IoT Top 10 (IoT); Anderson, *Security Engineering*
(aggregation, inference, multilevel databases).

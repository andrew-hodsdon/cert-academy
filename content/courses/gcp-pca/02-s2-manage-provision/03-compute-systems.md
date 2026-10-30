---
title: "Configuring compute systems"
kind: reading
est_minutes: 55
objectives:
  - Provision Compute Engine with instance templates, managed instance groups, autohealing and autoscaling
  - Decide when Spot VMs are appropriate and how to design for preemption
  - Choose GKE Autopilot or Standard, and configure node pools, autoscaling and upgrades
  - Configure networking for Compute Engine, GKE, Cloud Run and Google Cloud VMware Engine
  - Automate infrastructure and patching with Terraform, Infrastructure Manager and VM Manager
sources: [s2-instance-templates, s2-mig, s2-autoscaler, s2-spot-vms, s2-gke-modes, s2-gke-node-pools, s2-gke-autoscaling, s2-gke-vpc-native, s2-gke-fleets, s2-cloud-run, s2-cloud-run-direct-vpc, s2-cloud-run-functions, s2-gcve, s2-vm-manager-patch, s2-terraform, s2-infra-manager]
---

Objective **2.3** covers provisioning, **volatility** (Spot versus standard), **cloud-native networking**
for Compute Engine, GKE, serverless and VMware Engine, **orchestration, configuration and
patching**, **container orchestration** and **serverless**. The exam's bias is consistent: prefer the
most managed option that meets every requirement, and choose a less managed one only when a
requirement forces it.

## 1. The compute spectrum

| Option | You manage | Scales to zero? | Choose when |
|---|---|---|---|
| **Cloud Run** (services, jobs, functions) | Container image or function source | Yes | Stateless HTTP, event-driven or batch containers. The default for new apps |
| **GKE Autopilot** | Kubernetes manifests | Pods scale to zero, and you pay per Pod request | You need Kubernetes APIs without running nodes |
| **GKE Standard** | Manifests **and** node pools | No (nodes persist unless autoscaled down) | You need node-level control: custom machine types, privileged daemons, specific kernel settings |
| **Compute Engine** with MIGs | VM images, OS, scaling policy | Autoscaling can go to zero for some signals | Lift-and-shift, licensed or stateful software, full OS control |
| **Google Cloud VMware Engine** | vSphere workloads | No | Move VMware VMs **unchanged**, keeping vCenter tools and processes |

## 2. Compute Engine provisioning

- **Instance templates** are immutable descriptions of a VM (machine type, image, disks, network, metadata, service account). To change something, create a new template and roll it out.
- **Managed instance groups (MIGs)** run identical VMs from a template and provide:
  - **Autohealing**: an *application* health check recreates VMs that fail it. This is separate from the load balancer's health check, and the autohealing check should be more tolerant.
  - **Autoscaling** on CPU utilisation, load-balancer serving capacity, Cloud Monitoring metrics, or **schedules** for predictable peaks. Predictive autoscaling forecasts from history.
  - **Regional MIGs** spread VMs across zones in a region for zone-failure resilience. This is the default answer when availability matters.
  - **Rolling updates** with `maxSurge` / `maxUnavailable`, and **canary** updates that send a percentage of instances to a new template.
  - **Stateful MIGs** preserve specific disks, metadata and instance names for stateful apps.

> [!TIP]
> Scaling and healing need *stateless* VMs. If an app writes local state, move that state into
> Cloud SQL, Filestore or Cloud Storage before putting it behind an autoscaler. Use a stateful
> MIG only when you truly can't.

## 3. Volatility: Spot versus standard

**Spot VMs** use spare capacity at a deep discount (up to 91% off the on-demand price). Compute
Engine can **preempt them at any time**: by default there is only a brief best-effort shutdown period (about 30 seconds) for a shutdown script, and you can optionally configure a longer dedicated preemption notice. They have **no
availability SLA**, aren't live-migrated, and unlike legacy preemptible VMs have no 24-hour
maximum runtime.

| Good fit for Spot | Bad fit for Spot |
|---|---|
| Batch, rendering, CI runners, fault-tolerant data processing | Databases, single-instance services, anything with an SLA |
| GKE node pools for interruptible Pods, alongside an on-demand pool | Latency-sensitive front ends with no fallback |
| Large ML hyperparameter sweeps with checkpointing | Long jobs that can't checkpoint |

Design for preemption: use a **shutdown script** to checkpoint, keep work units small and
idempotent, and pair a Spot node pool or MIG with a standard-capacity one so critical work keeps
running. For **predictable, steady** usage the cost lever is **committed use discounts**, not Spot.

## 4. Container orchestration with GKE

| | Autopilot | Standard |
|---|---|---|
| Nodes | Managed by Google | You create and size node pools |
| Billing | Per Pod resource requests | Per node (VM) |
| Security posture | Hardened defaults enforced (no privileged Pods, Workload Identity Federation for GKE on) | You choose |
| Fit | Most workloads. The recommended default | Special hardware or OS needs, or tight bin-packing you want to control yourself |

**Node pools** (Standard) group nodes that share a configuration, such as a GPU pool, a high-memory
pool or a Spot pool. Steer Pods with **node selectors or affinity** and keep general workloads off
special pools with **taints and tolerations**.

**Scaling layers:**

- **Horizontal Pod Autoscaler (HPA)**: more Pod replicas based on CPU, memory or custom metrics.
- **Vertical Pod Autoscaler (VPA)**: right-sizes Pod requests.
- **Cluster autoscaler**: adds or removes nodes when Pods are pending or nodes sit idle. **Node auto-provisioning** creates new node pools to fit pending Pods.

**Upgrades:** enrol clusters in a **release channel** (Rapid, Regular, Stable) and set
**maintenance windows and exclusions**. Node pools upgrade by **surge** or **blue-green**. A
**regional cluster** keeps control-plane replicas in three zones, so control-plane upgrades don't
cause API downtime.

**Networking:** use **VPC-native clusters**, where Pods and Services get alias IP ranges from subnet
secondary ranges, making Pods routable in the VPC and over peering or hybrid links. Use **private nodes**
(no external IPs) with Cloud NAT for egress, and **authorized networks** or a private endpoint to
restrict the control plane. On a Shared VPC, the cluster lives in a service project and uses the
host project's subnet.

**Many clusters and hybrid:** group clusters into a **fleet** for consistent policy (Config Sync,
Policy Controller), multi-cluster Services and Gateways, and a single view. Through Google
Distributed Cloud, fleets also include clusters running on-premises. That is the documented answer for
"manage Kubernetes consistently on-premises and in the cloud" (EHR Healthcare and Altostrat Media
both ask for it).

## 5. Serverless computing and its networking

**Cloud Run** runs containers that scale on request load or events, down to zero.

- **Services** handle HTTP. **Jobs** run to completion. **Cloud Run functions** (the successor to Cloud Functions) deploy source code for event-driven work, triggered through Eventarc.
- Key settings: **concurrency** per instance, **minimum instances** to avoid cold starts, a **maximum instances** limit to protect downstream databases, and CPU allocation (only during requests, or always on).
- **Egress to a VPC**: use **Direct VPC egress** (instances get IPs from your subnet, so there is no connector to manage), or a Serverless VPC Access connector. Route all egress through the VPC to get a static outbound IP through Cloud NAT.
- **Ingress controls**: `internal` or `internal-and-cloud-load-balancing` keep a service off the public internet. Put an external Application Load Balancer with a **serverless NEG** in front for custom domains, Cloud Armor and multi-region routing.

## 6. Google Cloud VMware Engine networking

VMware Engine runs a dedicated VMware private cloud (vSphere, vSAN, NSX) on bare metal in a
Google region. It connects to your VPC through a **private connection** (VPC peering to a VMware
Engine network). On-premises sites reach it over Cloud Interconnect or VPN, and workloads use
Google services privately. Choose it when the requirement is **"migrate VMware VMs quickly without
re-platforming or retraining operations staff"**. Choose Migrate to Virtual Machines when the goal is
to convert VMs into native Compute Engine instances.

## 7. Infrastructure orchestration, configuration and patching

| Need | Tool |
|---|---|
| Declarative, repeatable infrastructure | **Terraform** with the Google provider. State goes in a Cloud Storage backend with versioning |
| Terraform run as a managed Google Cloud service, with state and runs managed by Google | **Infrastructure Manager** |
| Manage Google Cloud resources as Kubernetes objects | **Config Connector** |
| OS patch compliance across fleets of long-lived VMs | **VM Manager OS patch management**: patch jobs, recurring patch deployments, zone-by-zone rollout with pre/post scripts, and compliance reporting |
| Immutable fleets (MIGs) | Bake a new image (for example with a CI pipeline), update the instance template, then do a **rolling update**. Avoid patching in place |

> [!NOTE]
> Cloud Deployment Manager is at end of support. For new designs, the documented IaC answers
> are Terraform and Infrastructure Manager.

## Worked example

*An analytics firm runs a nightly 6-hour batch on 400 vCPUs, a customer-facing API with spiky
traffic, and a legacy licensed app that must keep its OS and a static disk. The ops team is small.*

| Workload | Choice | Why |
|---|---|---|
| Nightly batch | Cloud Batch or a MIG on **Spot VMs**, with checkpointing and a fallback to standard VMs if the deadline is at risk | Fault-tolerant work at the lowest cost |
| Spiky API | **Cloud Run** service with min instances = 2 and Direct VPC egress to Cloud SQL | Scales to zero off-peak, with no nodes to patch |
| Licensed app | A single Compute Engine VM, or a stateful MIG of size 1 for autohealing, on a regional PD. Patched by **VM Manager** patch deployments | Needs OS control. Autohealing plus a regional disk gives zone resilience |
| All infrastructure | **Terraform** in Git, applied through Infrastructure Manager | Repeatable environments and auditable changes |

## Check yourself

1. A team needs Kubernetes with GPUs on some nodes and a privileged security agent DaemonSet on every node. Autopilot or Standard?
2. A Cloud Run service must call a partner API that allow-lists a single source IP. What do you configure?
3. A MIG keeps recreating healthy VMs during slow startups. What's the likely cause and fix?

<details>
<summary>Answers</summary>

1. Standard. Its node pools let you create a GPU pool and run privileged DaemonSets, which Autopilot restricts. (Autopilot supports GPUs, but not arbitrary privileged agents.)
2. Route all egress through the VPC (Direct VPC egress or a connector, with all traffic routed to the VPC), and attach Cloud NAT with a reserved static IP.
3. The autohealing health check's initial delay is too short, or its thresholds too strict. Lengthen the initial delay and make the autohealing check more tolerant than the load-balancer check.

</details>

## Sources

Instance templates, MIG autohealing, autoscaling and update behaviour come from the Compute
Engine docs, and Spot VM preemption from the Spot VMs page. GKE modes, node pools, autoscaling,
VPC-native networking and fleets come from the GKE documentation. Cloud Run, Direct VPC egress and Cloud Run
functions come from the Cloud Run docs, VMware Engine networking from its overview, and patching and IaC from
VM Manager, Terraform on Google Cloud and Infrastructure Manager. See this module's sources list.

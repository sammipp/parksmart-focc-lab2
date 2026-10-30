# BTech Fundamentals of Cloud Computing Lab #2: Reflection & Conceptual Answers

These answers are tailored directly to the ParkSmart architecture and your lab demonstration requirements.

---

### Question 1: What is the difference between containers and virtual machines?

**Answer:**
Virtual Machines (VMs) and containers represent two fundamentally different approaches to application virtualization and resource isolation. A Virtual Machine runs an entire guest operating system (including its own kernel, system binaries, device drivers, and utilities) on top of a hypervisor (such as VMware ESXi, KVM, or AWS Nitro/Xen) that virtualizes physical hardware. Consequently, VMs require substantial system overhead—often several gigabytes of memory and minutes to boot.

In contrast, containers (such as ParkSmart's Docker containers) virtualize the operating system rather than the hardware. Containers share the host operating system's kernel and isolate processes using Linux kernel primitives: **namespaces** (providing isolated process IDs, network interfaces, and mount points) and **cgroups** (enforcing resource limits on CPU and memory). For ParkSmart, packaging the Python Flask backend and Nginx frontend as containers results in lightweight images (~50–150 MB), near-instantaneous startup times (<2 seconds), and deterministic parity across local workstations and Amazon EKS production clusters without the overhead of spinning up dedicated guest operating systems.

---

### Question 2: How does Kubernetes manage containerized applications?

**Answer:**
Kubernetes (K8s) serves as a declarative container orchestration platform that continuously reconciles an application's observed state with its desired state. Within ParkSmart, Kubernetes manages containers through several abstractions:

1. **Pods and Deployments**: Kubernetes wraps containers into Pods (the smallest deployable unit) and manages them via Deployments (`parksmart-backend`, `parksmart-frontend`). If a container crashes, the kubelet automatically restarts it per the restart policy.
2. **Declarative Self-Healing & Health Probes**: Using `livenessProbes` (`/api/health`) and `readinessProbes` (`/api/ready`), Kubernetes determines whether a backend pod is alive and ready to accept traffic. If a pod fails its readiness check (e.g., due to database connectivity loss), Kubernetes temporarily removes it from the Service endpoints without terminating it.
3. **Service Discovery & Internal Routing**: The `ClusterIP` Service provides a stable internal DNS name (`parksmart-backend.parksmart.svc.cluster.local:5000`) and acts as a Layer-4 load balancer distributing traffic among healthy pods.
4. **Configuration Decoupling**: ConfigMaps and Secrets inject environment-specific configurations (`FLASK_ENV`, `REDIS_URL`) and credentials without modifying container images.

---

### Question 3: How does HPA use CPU utilization to scale replicas?

**Answer:**
The Horizontal Pod Autoscaler (HPA) implements a continuous control loop (typically executing every 15 seconds) that queries the Kubernetes Metrics Server for resource consumption metrics across targeted pods. In ParkSmart, the backend HPA is configured with a target average CPU utilization of 50%:

$$\text{Desired Replicas} = \left\lceil \text{Current Replicas} \times \left( \frac{\text{Current Average Metric Value}}{\text{Target Metric Value}} \right) \right\rceil$$

For this mechanism to function, container specifications **must** declare explicit resource requests (`resources.requests.cpu: "200m"`). If load testing via `scripts/load-test.ps1` drives backend CPU utilization from 10% to 120m (which corresponds to 60% of the 200m baseline), the HPA detects that $60\% > 50\%$ and automatically issues a scale-out instruction to the Deployment controller, increasing replicas from 1 toward the configured maximum of 5. Conversely, when traffic subsides, a configurable stabilization window (cooldown period) prevents rapid thrashing ("flapping") before safely scaling down.

---

### Question 4: What problems can occur during cloud deployment?

**Answer:**
During cloud deployment of containerized systems to AWS (ECR/EKS), several failure modes commonly arise:

1. **Authentication & Identity Failures**: IAM permission mismatches, such as missing `AmazonEC2ContainerRegistryReadOnly` on EKS worker node instance roles, resulting in `ImagePullBackOff` errors.
2. **Stateful Ephemeral Storage Pitfalls**: Deploying an embedded SQLite database inside multi-replica Kubernetes pods causes data divergence, because each pod writes to its own isolated container filesystem. This requires migrating to Amazon RDS PostgreSQL.
3. **Missing Metrics Server**: Without an active `metrics-server` deployment in the cluster, HPA cannot evaluate CPU utilization and displays `<unknown>/50%`, disabling automatic scaling.
4. **Networking and Security Group Misconfigurations**: Inability of backend pods to communicate with AWS ElastiCache Redis or RDS due to missing ingress rules on VPC security groups.
5. **Cost Overruns**: Unintended creation of public AWS Network/Application Load Balancers or unconstrained CloudWatch Container Insights log ingestion can lead to unexpected AWS charges in educational lab environments.

---

### Question 5: How does monitoring help application reliability?

**Answer:**
Comprehensive monitoring transforms cloud operations from reactive firefighting into proactive engineering. In ParkSmart, monitoring bolsters reliability through three complementary mechanisms:

1. **Rapid Mean Time to Detection (MTTD) & Resolution (MTTR)**: CloudWatch Container Insights tracks container restarts (`pod_number_of_container_restarts`) and memory consumption (`pod_memory_working_set`), instantly notifying engineers via Amazon SNS when memory leaks or crashing threads occur.
2. **Correlation Across the Stack**: Correlating infrastructure metrics (CPU spikes) with application metrics (`/api/metrics` showing elevated P95 latency or 5xx error spikes) allows teams to determine whether degraded user experience stems from code-level bottlenecks (e.g., SQLite table lock contention) or infrastructure saturation.
3. **Capacity Planning & Automated Autoscaling**: Historical metrics over days and weeks reveal peak parking reservation hours, informing baseline pod counts and ensuring autoscalers are tuned effectively ahead of high-traffic events, thus maintaining high availability and cost efficiency.


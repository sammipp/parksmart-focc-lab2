# AWS Deployment Guide

This guide covers pushing ParkSmart Docker images to Amazon ECR and deploying the application to Amazon EKS with autoscaling.

> [!WARNING]
> Running EKS clusters and load balancers incurs real AWS charges. Always run the **Cleanup** section after your lab to avoid unexpected costs.

---

## Prerequisites

Ensure the following tools are installed and configured before beginning:

| Tool      | Purpose                          | Install Reference                              |
|-----------|----------------------------------|------------------------------------------------|
| AWS CLI   | Authenticate and manage AWS      | https://aws.amazon.com/cli/                    |
| Docker    | Build container images           | https://docs.docker.com/get-docker/            |
| kubectl   | Manage Kubernetes resources      | https://kubernetes.io/docs/tasks/tools/        |
| eksctl    | Create and manage EKS clusters   | https://eksctl.io/installation/                |

Verify your setup:

```powershell
aws --version
docker version
kubectl version --client
eksctl version
```

---

## Required IAM Permissions

Your AWS IAM user or role needs the following permissions. Attach the `AdministratorAccess` policy for a lab environment, or use this minimum set for production:

**ECR (image registry):**
- `ecr:GetAuthorizationToken`
- `ecr:CreateRepository`
- `ecr:DescribeRepositories`
- `ecr:BatchCheckLayerAvailability`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`
- `ecr:BatchGetImage`

**EKS (cluster management):**
- `eks:CreateCluster`, `eks:DescribeCluster`, `eks:UpdateClusterConfig`
- `ec2:*` (for VPC, subnets, security groups)
- `iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PassRole`

**CloudWatch (monitoring):**
- `logs:CreateLogGroup`, `logs:PutLogEvents`
- `cloudwatch:PutMetricData`

---

## Step 1: Push Images to ECR

Run the included PowerShell script to build and push both Docker images:

```powershell
# Navigate to project root
cd "C:\Users\SAMIP\OneDrive\Desktop\New folder (2)"

# Run with defaults (us-east-1, tag: latest)
.\scripts\push-to-ecr.ps1

# Or specify region and tag
.\scripts\push-to-ecr.ps1 -Region ap-south-1 -Tag v1.0.0
```

The script outputs the full ECR image URIs, for example:
```
Frontend: 123456789012.dkr.ecr.us-east-1.amazonaws.com/parksmart-frontend:latest
Backend:  123456789012.dkr.ecr.us-east-1.amazonaws.com/parksmart-backend:latest
```

**Copy these URIs** — you will need them in Step 4.

---

## Step 2: Create EKS Cluster

```bash
eksctl create cluster \
  --name parksmart-cluster \
  --region us-east-1 \
  --nodegroup-name parksmart-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed
```

> This takes approximately 15–20 minutes. eksctl creates the VPC, subnets, and node group automatically.

Update your kubeconfig to point to the new cluster:

```bash
aws eks update-kubeconfig --region us-east-1 --name parksmart-cluster
```

Verify the nodes are ready:

```bash
kubectl get nodes
```

---

## Step 3: Install metrics-server

The Horizontal Pod Autoscaler requires `metrics-server` to read CPU and memory utilization from pods:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Wait for it to become ready:

```bash
kubectl get deployment metrics-server -n kube-system
kubectl top nodes
```

---

## Step 4: Update Kubernetes Image URIs

Edit `k8s/04-backend-deployment.yaml` and replace the placeholder image URI:

```yaml
# Before
image: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/parksmart-backend:latest

# After (example)
image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/parksmart-backend:latest
```

Edit `k8s/05-frontend-deployment.yaml` and replace similarly:

```yaml
# Before
image: <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/parksmart-frontend:latest

# After (example)
image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/parksmart-frontend:latest
```

---

## Step 5: Apply Kubernetes Manifests

First, create the namespace and secret. **Never commit real secret values to git.**

```bash
# Apply namespace first
kubectl apply -f k8s/00-namespace.yaml

# Create the application secret with your secure key
kubectl create secret generic parksmart-secrets \
  --from-literal=SECRET_KEY="$(openssl rand -hex 32)" \
  -n parksmart
```

Then apply remaining manifests:

```bash
# Apply all manifests (namespace already exists, will be skipped)
kubectl apply -f k8s/
```

---

## Step 6: Verify Deployment

```bash
# Check all resources in the parksmart namespace
kubectl get all -n parksmart

# Check pod status
kubectl get pods -n parksmart

# Check pod logs (replace pod name)
kubectl logs -n parksmart deployment/parksmart-backend

# Describe a pod for detailed events
kubectl describe pod -n parksmart -l app=parksmart-backend

# Check services
kubectl get svc -n parksmart

# Port-forward to test locally without a load balancer
kubectl port-forward svc/parksmart-backend 5000:5000 -n parksmart
kubectl port-forward svc/parksmart-frontend 8080:80 -n parksmart
```

---

## Step 7: Configure and Verify HPA

The HPA manifests are already applied via `k8s/06-hpa.yaml`. Verify they are working:

```bash
# Check HPA status
kubectl get hpa -n parksmart

# Describe HPA for scaling events
kubectl describe hpa parksmart-backend-hpa -n parksmart

# Run load test to trigger scaling
.\scripts\load-test.ps1 -Requests 500 -Concurrency 15

# Watch pods scale in real time (open separate terminal)
kubectl get pods -n parksmart --watch
```

Expected HPA output when under load:
```
NAME                      REFERENCE                       TARGETS   MINPODS   MAXPODS   REPLICAS
parksmart-backend-hpa     Deployment/parksmart-backend    65%/50%   1         5         3
```

---

## Database Migration Note: SQLite → RDS PostgreSQL

SQLite is included for local demo convenience. It does **not** support multiple concurrent writers, making it unsuitable for multi-replica deployments.

To migrate to Amazon RDS PostgreSQL:

1. **Create an RDS instance** in the same VPC as the EKS cluster:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier parksmart-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username parksmart \
     --master-user-password <secure-password> \
     --allocated-storage 20 \
     --region us-east-1
   ```

2. **Update ConfigMap** in `k8s/01-configmap.yaml`:
   ```yaml
   DATABASE_URL: "postgresql://parksmart:<password>@parksmart-db.xxxx.us-east-1.rds.amazonaws.com:5432/parksmart"
   ```

3. **Move credentials to Secrets**:
   ```bash
   kubectl create secret generic parksmart-secrets \
     --from-literal=SECRET_KEY="..." \
     --from-literal=DATABASE_URL="postgresql://..." \
     -n parksmart
   ```

4. **Increase backend replicas** in `k8s/04-backend-deployment.yaml`:
   ```yaml
   replicas: 2
   ```

5. **Reapply manifests**:
   ```bash
   kubectl apply -f k8s/
   ```

---

## Cost Warning

| Resource                    | Estimated Cost        |
|-----------------------------|-----------------------|
| EKS Cluster                 | ~\$0.10/hour          |
| 2× t3.medium EC2 nodes      | ~\$0.083/hour each    |
| NAT Gateway                 | ~\$0.045/hour + data  |
| Load Balancer (optional)    | ~\$0.025/hour + data  |
| ECR storage                 | \$0.10/GB/month       |
| **Total (cluster only)**    | **~\$0.27/hour**      |

Always clean up after the lab.

---

## Cleanup Commands

```bash
# Delete optional load balancer first (stops billing)
kubectl delete -f k8s/07-loadbalancer-optional.yaml

# Delete all Kubernetes resources in the namespace
kubectl delete namespace parksmart

# Delete EKS cluster and all node groups (~5 minutes)
eksctl delete cluster --name parksmart-cluster --region us-east-1

# Delete ECR repositories (optional, storage is cheap)
aws ecr delete-repository --repository-name parksmart-frontend --force --region us-east-1
aws ecr delete-repository --repository-name parksmart-backend --force --region us-east-1
```

Verify cleanup in the AWS Console: EC2, EKS, and VPC sections should show no remaining ParkSmart resources.

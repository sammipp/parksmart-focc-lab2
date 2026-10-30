# ParkSmart — Troubleshooting & Operations Guide

This guide covers common operational challenges, failure scenarios, diagnostic procedures, and resolutions across local Docker Compose and Amazon EKS environments.

---

## 1. Local Docker Compose Troubleshooting

### 1.1 Port Conflicts (5000 or 5173 already in use)

**Symptoms:**
`Error starting userland proxy: listen tcp4 0.0.0.0:5000: bind: address already in use`

**Diagnostics:**
```powershell
# Identify processes occupying ports 5000 or 5173 on Windows
Get-NetTCPConnection -LocalPort 5000,5173 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess
Get-Process -Id <OwningProcessId>
```

**Resolution:**
Terminate the conflicting process or remap ports in `docker-compose.yml`:
```powershell
# Terminate conflicting process
Stop-Process -Id <OwningProcessId> -Force

# Or edit docker-compose.yml to change host port: "5001:5000"
```

---

### 1.2 Backend Database Permission or Locking Errors

**Symptoms:**
`sqlite3.OperationalError: unable to open database file` or `database is locked`

**Diagnostics:**
```bash
docker compose logs backend
```

**Resolution:**
1. Ensure the SQLite mount directory `/app/data` has write permissions for the container process.
2. In multi-process Gunicorn environments, SQLite WAL (Write-Ahead Logging) mode is activated by default in ParkSmart (`PRAGMA journal_mode=WAL;`).
3. To reset the demonstration database completely:
   ```bash
   docker compose down -v
   docker compose up --build -d
   ```

---

### 1.3 Redis Connection Warnings

**Symptoms:**
Log message: `WARNING: Redis unavailable at redis://redis:6379/0. Falling back to in-memory transient store.`

**Diagnostics:**
```bash
docker compose ps redis
docker compose exec redis redis-cli ping
```

**Resolution:**
- ParkSmart is deliberately engineered with fault-tolerant graceful degradation. If Redis is down, core booking and database operations continue without crashing.
- Check Redis container health:
  ```bash
  docker compose logs redis
  docker compose restart redis
  ```

---

## 2. Amazon EKS & Kubernetes Troubleshooting

### 2.1 Pods Stuck in `ImagePullBackOff` or `ErrImagePull`

**Symptoms:**
```
NAME                                READY   STATUS             RESTARTS   AGE
parksmart-backend-78bdfc78d-k92lx   0/1     ImagePullBackOff   0          2m
```

**Diagnostics:**
```bash
kubectl describe pod -l app=parksmart-backend -n parksmart
```

**Common Causes & Resolutions:**
1. **Unreplaced ECR Placeholder**: The deployment yaml contains `<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com`.
   - Update `k8s/04-backend-deployment.yaml` and `k8s/05-frontend-deployment.yaml` with your actual ECR image URI output by `scripts/push-to-ecr.ps1`.
2. **Missing Node IAM Permissions**: The EKS worker node role lacks `AmazonEC2ContainerRegistryReadOnly`.
   ```bash
   aws iam attach-role-policy --role-name <NodeInstanceRoleName> --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
   ```

---

### 2.2 Horizontal Pod Autoscaler (HPA) Shows `<unknown>/50%`

**Symptoms:**
```
NAME                     REFERENCE                      TARGETS         MINPODS   MAXPODS   REPLICAS
parksmart-backend-hpa    Deployment/parksmart-backend   <unknown>/50%   1         5         1
```

**Cause:**
1. The Kubernetes `metrics-server` is not installed on the EKS cluster, or
2. The Pod specification is missing `resources.requests.cpu`.

**Diagnostics:**
```bash
kubectl get deployment metrics-server -n kube-system
kubectl top pods -n parksmart
```

**Resolution:**
1. Install `metrics-server`:
   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```
2. Verify that `k8s/04-backend-deployment.yaml` defines `resources.requests.cpu` (configured as `200m`).
3. Allow 60–90 seconds for metrics-server to collect initial metrics. Target will change from `<unknown>` to actual percentage (e.g., `4%/50%`).

---

### 2.3 Readiness Probe Failing (`/api/ready`)

**Symptoms:**
Pod status is `Running` but `0/1 READY`:
```
Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 503
```

**Diagnostics:**
```bash
kubectl logs -l app=parksmart-backend -n parksmart --tail=50
```

**Resolution:**
The readiness endpoint checks database connectivity. Verify that:
1. `DATABASE_URL` is set properly in ConfigMap/Secrets.
2. If using Amazon RDS PostgreSQL, verify that the Security Group allows inbound port 5432 from the EKS Node Security Group.

---

### 2.4 Multi-Replica Database Inconsistency (SQLite in Cloud)

**Symptoms:**
Reservation created on replica A does not show up when making a subsequent request hitting replica B.

**Cause:**
SQLite uses a local disk file. In Kubernetes, every replica container gets its own isolated ephemeral storage. Multiple backend replicas cannot share a local SQLite file.

**Resolution:**
Migrate to Amazon RDS for PostgreSQL before scaling backend replicas beyond 1:
1. Provision Amazon RDS PostgreSQL.
2. Update `DATABASE_URL` in `k8s/01-configmap.yaml` or `parksmart-secrets`:
   `postgresql://parksmart:Password@rds-cluster.xyz.rds.amazonaws.com:5432/parksmart`
3. Restart backend pods: `kubectl rollout restart deployment/parksmart-backend -n parksmart`.

---

## 3. Operational Cheat Sheet

| Task | Command |
| :--- | :--- |
| **Inspect all ParkSmart pods** | `kubectl get pods -n parksmart -o wide` |
| **Tail backend logs** | `kubectl logs -f -l app=parksmart-backend -n parksmart` |
| **Check HPA status** | `kubectl describe hpa parksmart-backend-hpa -n parksmart` |
| **Restart backend rollout** | `kubectl rollout restart deployment/parksmart-backend -n parksmart` |
| **Simulate local entry event** | `curl -X POST http://localhost:5000/api/vehicles/entry -H "Content-Type: application/json" -d '{"space_id":"A01","vehicle_reg":"KA-01-AB-1234"}'` |
| **Verify health endpoint** | `curl -s http://localhost:5000/api/health \| jq .` |


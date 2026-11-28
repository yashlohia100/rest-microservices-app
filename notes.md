# Notes

## Dockerfile review

The basic setup is right in all four Dockerfiles: a multi-stage build, npm ci from the lockfile, dev dependencies left out of the final image, and node started directly so shutdown signals reach your handlers. I checked that the Prisma build works: the generated client is compiled into dist/generated/ and the import paths resolve.

## Run install docker script

```
chmod +x install-docker.sh
sudo ./install-docker.sh
```

## Creating jwt secret

```
kubectl -n auth-app create secret generic auth-secret \
  --from-literal=JWT_SECRET='replace-with-a-strong-secret'
```

## Running build and push images script

```
docker login
bash scripts/build-and-push-images.sh
```

### For versioned, immutable tags

```
bash scripts/build-and-push-images.sh v1
```

This produces tags such as: `yashlohia105/rest-msvc-app:auth-app-v1`

### Useful options

```
# Preview without building or pushing
DRY_RUN=true bash scripts/build-and-push-images.sh v1

# For an ARM64/Graviton Kubernetes host
DOCKER_PLATFORM=linux/arm64 bash scripts/build-and-push-images.sh v1
```

## Running install k8s tools script

```
chmod +x install-k8s-tools.sh
./install-k8s-tools.sh
```

### Install specific versions

```
KUBECTL_VERSION=v1.31.5 \
K3D_VERSION=v5.8.3 \
./install-k8s-tools.sh
```

## Create a Kubernetes cluster

```
k3d cluster create dev-cluster
```

### Verify the cluster

```
kubectl get nodes
kubectl get pods -A
```

### Delete the cluster

```
k3d cluster delete dev-cluster
```

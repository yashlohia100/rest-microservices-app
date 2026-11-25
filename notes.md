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

#!/usr/bin/env bash
set -Eeuo pipefail

# Docker Engine from Amazon Linux 2023 packages.
# Docker Compose and Buildx plugins from Docker's official GitHub releases.
# Grant the invoking non-root login user access via the docker group.
COMPOSE_VERSION="v5.7.1"
BUILDX_VERSION="v0.39.0"
PLUGIN_DIR="/usr/local/lib/docker/cli-plugins"

if (( EUID != 0 )); then
  echo "Run this script with sudo: sudo bash $0" >&2
  exit 1
fi

# Only run on Amazon Linux 2023.
source /etc/os-release
if [[ "${ID:-}" != "amzn" || "${VERSION_ID:-}" != 2023* ]]; then
  echo "This script supports Amazon Linux 2023 only." >&2
  exit 1
fi

case "$(uname -m)" in
  x86_64)
    COMPOSE_ARCH="x86_64"; BUILDX_ARCH="amd64"
    COMPOSE_SHA256="af426722a8af5de812fcee30cc1c39f0639f5f723cbadefb25e5d4db054064cf"
    BUILDX_SHA256="5fb31a097304fbf6dd4038649a0decf32c2b9510e4047acd7d68b9d700c46194"
    ;;
  aarch64)
    COMPOSE_ARCH="aarch64"; BUILDX_ARCH="arm64"
    COMPOSE_SHA256="f2f49f903240895fa764c0dca3a14548b754ad9426f6b609ccaf55ec5a3aa2a5"
    BUILDX_SHA256="722cdcdfdd6f3fb943fa1ba75102d057feb18ba72aab93b1b0a8cf2b2b48a25f"
    ;;
  *) echo "Unsupported CPU architecture: $(uname -m)" >&2; exit 1 ;;
esac

echo "==> Installing/updating Docker Engine"
dnf install -y docker ca-certificates
if ! command -v curl >/dev/null 2>&1; then
  dnf install -y curl-minimal
fi
systemctl enable --now docker

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

fetch_and_install() {
  local url="$1" expected_hash="$2" name="$3"
  echo "==> Installing ${name}"
  curl --fail --location --silent --show-error --retry 3 \
    "$url" --output "$tmpdir/$name"
  echo "$expected_hash  $tmpdir/$name" | sha256sum --check --status || {
    echo "Checksum verification failed for $name" >&2
    exit 1
  }
  install -m 0755 "$tmpdir/$name" "$PLUGIN_DIR/$name"
}

mkdir -p "$PLUGIN_DIR"
fetch_and_install \
  "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}" \
  "$COMPOSE_SHA256" "docker-compose"
fetch_and_install \
  "https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-${BUILDX_ARCH}" \
  "$BUILDX_SHA256" "docker-buildx"

# Grant the invoking non-root login user permission to use Docker.
# When invoked with `sudo`, SUDO_USER is the normal SSH/login user.
# If run from a root shell, pass DOCKER_USER explicitly or use ec2-user.
TARGET_USER="${DOCKER_USER:-${SUDO_USER:-}}"
if [[ -z "$TARGET_USER" || "$TARGET_USER" == "root" ]]; then
  if id ec2-user >/dev/null 2>&1; then
    TARGET_USER="ec2-user"
  else
    echo "Unable to identify a non-root account. Run with sudo from your login user, or set DOCKER_USER=username." >&2
    exit 1
  fi
fi
if ! id "$TARGET_USER" >/dev/null 2>&1; then
  echo "User does not exist: $TARGET_USER" >&2
  exit 1
fi

echo "==> Allowing $TARGET_USER to run Docker without sudo"
if ! getent group docker >/dev/null; then
  groupadd docker
fi
usermod -aG docker "$TARGET_USER"

echo "==> Installed versions"
docker --version
docker compose version
docker buildx version

echo "==> Docker daemon status"
docker info --format 'Server: {{.ServerVersion}}'
echo "Installation completed."
echo "The user '$TARGET_USER' belongs to the docker group."
echo "To activate the new group permissions, DISCONNECT and RECONNECT your SSH session."
echo "Alternatively run 'newgrp docker' as $TARGET_USER in your current shell."
echo "Then run: docker compose up -d --build (no sudo required)."
echo "SECURITY: Membership in the docker group grants root-equivalent access to this host."


#!/usr/bin/env bash

set -euo pipefail

INSTALL_DIR="/usr/local/bin"

# Optional version overrides
KUBECTL_VERSION="${KUBECTL_VERSION:-latest}"
K3D_VERSION="${K3D_VERSION:-latest}"

# Detect architecture
case "$(uname -m)" in
    x86_64|amd64)
        ARCH="amd64"
        ;;
    aarch64|arm64)
        ARCH="arm64"
        ;;
    *)
        echo "Unsupported architecture: $(uname -m)"
        exit 1
        ;;
esac

echo "Detected architecture: ${ARCH}"

# Handle root and non-root execution
SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
    SUDO="sudo"
fi

# Install curl only if missing
if ! command -v curl >/dev/null 2>&1; then
    ${SUDO} dnf install -y curl
fi

# Create temporary working directory
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

cd "${TMP_DIR}"

download() {
    curl -fsSL --retry 3 "$@"
}

${SUDO} mkdir -p "${INSTALL_DIR}"

# ----------------------------------------
# Install kubectl
# ----------------------------------------

if [[ "${KUBECTL_VERSION}" == "latest" ]]; then
    KUBECTL_VERSION="$(download \
        https://dl.k8s.io/release/stable.txt)"
fi

echo "Installing kubectl ${KUBECTL_VERSION}..."

KUBECTL_URL="https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}/kubectl"

download "${KUBECTL_URL}" -o kubectl
download "${KUBECTL_URL}.sha256" -o kubectl.sha256

# Verify checksum
printf '%s  kubectl\n' "$(cat kubectl.sha256)" | sha256sum --check

${SUDO} install -m 0755 kubectl "${INSTALL_DIR}/kubectl"

# ----------------------------------------
# Install k3d
# ----------------------------------------

K3D_REPO="https://github.com/k3d-io/k3d"

if [[ "${K3D_VERSION}" == "latest" ]]; then
    RELEASE_URL="$(download -o /dev/null \
        -w '%{url_effective}' \
        "${K3D_REPO}/releases/latest")"

    K3D_VERSION="${RELEASE_URL##*/}"
fi

echo "Installing k3d ${K3D_VERSION}..."

K3D_BINARY="k3d-linux-${ARCH}"
K3D_URL="${K3D_REPO}/releases/download/${K3D_VERSION}"

download "${K3D_URL}/${K3D_BINARY}" -o "${K3D_BINARY}"
download "${K3D_URL}/checksums.txt" -o checksums.txt

# Extract and verify checksum
awk -v binary="${K3D_BINARY}" '
    {
        name = $2
        sub(/^\*/, "", name)
        sub(/^.*\//, "", name)

        if (name == binary)
            print $1 "  " binary
    }
' checksums.txt | sha256sum --check

${SUDO} install -m 0755 "${K3D_BINARY}" "${INSTALL_DIR}/k3d"

# ----------------------------------------
# Verify installation
# ----------------------------------------

echo
echo "Installation completed successfully!"
echo "----------------------------------------"

"${INSTALL_DIR}/kubectl" version --client
"${INSTALL_DIR}/k3d" version

echo "----------------------------------------"

if ! docker info >/dev/null 2>&1; then
    echo "Warning: Docker is not accessible by the current user."
fi

#!/usr/bin/env bash
set -Eeuo pipefail

# Build and push all application images to a single Docker Hub repository.
#
# Usage:
#   docker login
#   bash scripts/build-and-push-images.sh
#   bash scripts/build-and-push-images.sh v1
#
# With no argument, the tags are auth-app, event-app, user-app, and post-app.
# With an argument such as v1, the tags become auth-app-v1, event-app-v1, etc.
#
# Optional environment variables:
#   DOCKERHUB_REPOSITORY  Image repository (default: yashlohia105/rest-msvc-app)
#   DOCKER_PLATFORM       Build platform (default: linux/amd64)
#   DRY_RUN=true          Print commands without building or pushing
#
# Examples:
#   Preview without building or pushing
#   DRY_RUN=true bash scripts/build-and-push-images.sh v1
#  
#   For an ARM64/Graviton Kubernetes host
#   DOCKER_PLATFORM=linux/arm64 bash scripts/build-and-push-images.sh v1

readonly DEFAULT_REPOSITORY="yashlohia105/rest-msvc-app"
readonly DEFAULT_PLATFORM="linux/amd64"

repository="${DOCKERHUB_REPOSITORY:-$DEFAULT_REPOSITORY}"
platform="${DOCKER_PLATFORM:-$DEFAULT_PLATFORM}"
dry_run="${DRY_RUN:-false}"
version="${1:-}"

if (( $# > 1 )); then
  echo "Usage: bash scripts/build-and-push-images.sh [version]" >&2
  exit 2
fi

if [[ -n "$version" && ! "$version" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]*$ ]]; then
  echo "Invalid version '$version'. Use only letters, numbers, dots, dashes, and underscores." >&2
  exit 2
fi

case "$dry_run" in
  true|false) ;;
  *)
    echo "DRY_RUN must be either true or false." >&2
    exit 2
    ;;
esac

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"

# Each entry maps the Docker Hub tag to its Docker build context.
image_tags=(auth-app event-app user-app post-app)
build_contexts=(auth-service event-service user-app post-app)

for context in "${build_contexts[@]}"; do
  if [[ ! -f "$repo_root/$context/Dockerfile" ]]; then
    echo "Dockerfile not found: $repo_root/$context/Dockerfile" >&2
    exit 1
  fi
done

if [[ "$dry_run" == false ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is not installed or is not available on PATH." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Cannot connect to the Docker daemon." >&2
    exit 1
  fi

  if ! docker buildx version >/dev/null 2>&1; then
    echo "Docker Buildx is required but is not available." >&2
    exit 1
  fi

  # Start the selected builder before beginning the first application build.
  docker buildx inspect --bootstrap >/dev/null
fi

echo "Repository: $repository"
echo "Platform:   $platform"
if [[ -n "$version" ]]; then
  echo "Version:    $version"
fi
echo

for index in "${!image_tags[@]}"; do
  app_tag="${image_tags[$index]}"
  context="${build_contexts[$index]}"

  if [[ -n "$version" ]]; then
    app_tag="${app_tag}-${version}"
  fi

  image="${repository}:${app_tag}"
  command=(
    docker buildx build
    --platform "$platform"
    --tag "$image"
    --push
    "$repo_root/$context"
  )

  echo "==> Building and pushing $image"
  if [[ "$dry_run" == true ]]; then
    printf '    '
    printf '%q ' "${command[@]}"
    printf '\n'
  else
    "${command[@]}"
  fi
  echo
done

echo "Published images:"
for app_tag in "${image_tags[@]}"; do
  if [[ -n "$version" ]]; then
    app_tag="${app_tag}-${version}"
  fi
  echo "  ${repository}:${app_tag}"
done

#!/usr/bin/env bash
set -Eeuo pipefail
set +x
: "${CI_PROJECT:?}"
: "${IMAGE_TAG:?}"
: "${REGISTRY_PREFIX:?For example ghcr.io/your-account/skillbridge}"
: "${REGISTRY_USER:?Jenkins registry credential required}"
: "${REGISTRY_PASSWORD:?Jenkins registry credential required}"
[[ $CI_PROJECT =~ ^skillbridge-ci-[a-z0-9-]+$ ]] || exit 2
[[ $IMAGE_TAG =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
[[ $REGISTRY_PREFIX =~ ^[a-z0-9.-]+(:[0-9]+)?/[a-z0-9._/-]+$ && $REGISTRY_PREFIX != */ ]] || { echo 'Use a lowercase registry/namespace prefix.' >&2; exit 2; }
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
release_dir="$root/SkillBridge-backend/.local/release"
mkdir -p "$release_dir"
export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
trap 'rm -rf -- "$DOCKER_CONFIG"' EXIT
registry=${REGISTRY_PREFIX%%/*}
printf '%s' "$REGISTRY_PASSWORD" | docker login "$registry" --username "$REGISTRY_USER" --password-stdin
: > "$release_dir/images.env"
for service in backend frontend; do
  remote="$REGISTRY_PREFIX/$service:$IMAGE_TAG"
  docker tag "$CI_PROJECT/$service:$IMAGE_TAG" "$remote"
  docker push "$remote"
  # Deploy the digest returned by the registry, so later tag changes cannot change this release.
  digest=$(docker image inspect "$remote" --format '{{range .RepoDigests}}{{println .}}{{end}}' | awk -v prefix="$REGISTRY_PREFIX/$service@sha256:" 'index($0,prefix)==1 {print; exit}')
  [[ -n $digest ]] || { echo "No pushed digest found for $service." >&2; exit 1; }
  printf '%s_IMAGE=%s\n' "${service^^}" "$digest" >> "$release_dir/images.env"
done
cp "$root/SkillBridge-backend/deploy/compose.production.yaml" "$root/SkillBridge-backend/deploy/deploy-vps.sh" "$release_dir/"
printf 'Built from %s\n' "$IMAGE_TAG" > "$release_dir/release.txt"
echo "Release prepared in SkillBridge-backend/.local/release."

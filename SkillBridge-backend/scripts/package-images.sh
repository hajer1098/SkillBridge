#!/usr/bin/env bash
# Export only the two tested application images; no registry or secrets.
set -Eeuo pipefail
umask 077
: "${CI_PROJECT:?}"
: "${IMAGE_TAG:?}"
[[ $CI_PROJECT =~ ^skillbridge-ci-[a-z0-9-]+$ ]] || exit 2
[[ $IMAGE_TAG =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ && $IMAGE_TAG != *..* ]] || exit 2
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
release_dir="$root/SkillBridge-backend/.local/direct-release/$IMAGE_TAG"
mkdir -p "$release_dir"
trap 'rm -f -- "$release_dir/images.tar.gz.partial"' EXIT
: > "$release_dir/images.env"
for service in backend frontend; do
  id=$(docker image inspect "$CI_PROJECT/$service:$IMAGE_TAG" --format '{{.Id}}')
  [[ $id =~ ^sha256:[a-f0-9]{64}$ ]] || { echo "Invalid local image ID for $service." >&2; exit 1; }
  printf '%s_IMAGE=%s\n' "${service^^}" "$id" >> "$release_dir/images.env"
done
docker image save "$CI_PROJECT/backend:$IMAGE_TAG" "$CI_PROJECT/frontend:$IMAGE_TAG" | gzip -1 > "$release_dir/images.tar.gz.partial"
mv -- "$release_dir/images.tar.gz.partial" "$release_dir/images.tar.gz"
(cd -- "$release_dir" && sha256sum images.tar.gz > images.sha256)
cp "$root/SkillBridge-backend/deploy/compose.production.yaml" "$root/SkillBridge-backend/deploy/deploy-vps.sh" "$release_dir/"
printf 'Built from %s; transfer=SSH; images=local immutable IDs\n' "$IMAGE_TAG" > "$release_dir/release.txt"
echo 'Tested frontend and backend images exported for SSH transfer.'

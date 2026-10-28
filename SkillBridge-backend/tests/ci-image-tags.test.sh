#!/usr/bin/env bash
# Verify build/publish agreement when Jenkins exports a remote registry prefix.
set -Eeuo pipefail
backend=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture=$(mktemp -d /tmp/skillbridge-image-tags-test-XXXXXXXX)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/images" "$fixture/repo/SkillBridge-backend/scripts" "$fixture/repo/SkillBridge-backend/deploy"
cp "$backend/scripts/ci-docker.sh" "$backend/scripts/publish-images.sh" "$fixture/repo/SkillBridge-backend/scripts/"
cp "$backend/deploy/compose.production.yaml" "$backend/deploy/deploy-vps.sh" "$fixture/repo/SkillBridge-backend/deploy/"
cp "$backend/../compose.yaml" "$fixture/repo/compose.yaml"
cat > "$fixture/bin/docker" <<'FAKE'
#!/usr/bin/env bash
set -Eeuo pipefail
case $1 in
  compose)
    if [[ " $* " == *' build '* ]]; then
      for service in backend frontend; do
        image="$REGISTRY_PREFIX/$service:$IMAGE_TAG"
        touch "$TEST_IMAGES/${image//\//_}"
      done
    fi
    ;;
  login) cat >/dev/null ;;
  tag)
    [[ -f "$TEST_IMAGES/${2//\//_}" ]] || { echo "Missing built image: $2" >&2; exit 1; }
    printf '%s -> %s\n' "$2" "$3" >> "$TEST_TAG_LOG"
    ;;
  push) printf '%s\n' "$2" >> "$TEST_PUSH_LOG" ;;
  image)
    [[ $2 == inspect ]] || exit 1
    printf '%s@sha256:%064d\n' "${3%:*}" 1
    ;;
  *) echo "Unexpected Docker command: $1" >&2; exit 1 ;;
esac
FAKE
chmod +x "$fixture/bin/docker"
export PATH="$fixture/bin:$PATH"
export TEST_IMAGES="$fixture/images" TEST_TAG_LOG="$fixture/tags.log" TEST_PUSH_LOG="$fixture/pushes.log"
export CI_PROJECT=skillbridge-ci-image-tags IMAGE_TAG=commit-7
scripts="$fixture/repo/SkillBridge-backend/scripts"
for registry in ghcr.io/hajer1098/skillbridge registry.example.test:5000/team/skillbridge; do
  export REGISTRY_PREFIX="$registry" REGISTRY_USER=test-user REGISTRY_PASSWORD=test-token
  bash "$scripts/ci-docker.sh" prepare
  bash "$scripts/ci-docker.sh" build
  [[ $REGISTRY_PREFIX == "$registry" ]]
  : > "$TEST_TAG_LOG"
  : > "$TEST_PUSH_LOG"
  bash "$scripts/publish-images.sh"
  for service in backend frontend; do
    grep -Fxq "$CI_PROJECT/$service:$IMAGE_TAG -> $registry/$service:$IMAGE_TAG" "$TEST_TAG_LOG"
    grep -Fxq "$registry/$service:$IMAGE_TAG" "$TEST_PUSH_LOG"
    grep -Fq "${service^^}_IMAGE=$registry/$service@sha256:" "$fixture/repo/SkillBridge-backend/.local/release/images.env"
  done
  [[ $(wc -l < "$TEST_PUSH_LOG") -eq 2 ]]
  bash "$scripts/ci-docker.sh" cleanup
  [[ ! -f "$fixture/repo/SkillBridge-backend/.local/ci/$CI_PROJECT.env" ]]
  printf 'PASS: CI image names match publication sources with REGISTRY_PREFIX=%s.\n' "$registry"
done

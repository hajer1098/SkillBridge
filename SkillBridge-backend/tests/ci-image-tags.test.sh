#!/usr/bin/env bash
# Verify CI image names and SSH export even with an old registry parameter set.
set -Eeuo pipefail
backend=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture=$(mktemp -d /tmp/skillbridge-image-tags-test-XXXXXXXX)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/images" "$fixture/repo/SkillBridge-backend/scripts" "$fixture/repo/SkillBridge-backend/deploy"
cp "$backend/scripts/ci-docker.sh" "$backend/scripts/package-images.sh" "$backend/scripts/send-release.sh" "$fixture/repo/SkillBridge-backend/scripts/"
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
  image)
    case $2 in
      inspect)
        [[ $* == *'{{.Id}}'* && -f "$TEST_IMAGES/${3//\//_}" ]] || exit 1
        printf 'sha256:%064d\n' 1
        ;;
      save)
        for image in "${@:3}"; do [[ -f "$TEST_IMAGES/${image//\//_}" ]] || exit 1; done
        printf 'test-archive\n'
        ;;
      *) exit 1 ;;
    esac
    ;;
  *) echo "Unexpected Docker command: $1" >&2; exit 1 ;;
esac
FAKE
chmod +x "$fixture/bin/docker"
export PATH="$fixture/bin:$PATH"
export TEST_IMAGES="$fixture/images"
export CI_PROJECT=skillbridge-ci-image-tags IMAGE_TAG=commit-7
scripts="$fixture/repo/SkillBridge-backend/scripts"
for registry in ghcr.io/hajer1098/skillbridge registry.example.test:5000/team/skillbridge; do
  export REGISTRY_PREFIX="$registry"
  bash "$scripts/ci-docker.sh" prepare
  bash "$scripts/ci-docker.sh" build
  [[ $REGISTRY_PREFIX == "$registry" ]]
  bash "$scripts/package-images.sh"
  release="$fixture/repo/SkillBridge-backend/.local/direct-release/$IMAGE_TAG"
  (cd "$release" && sha256sum -c images.sha256)
  [[ $(gzip -dc "$release/images.tar.gz") == test-archive ]]
  [[ $(grep -Ec '^(BACKEND|FRONTEND)_IMAGE=sha256:[a-f0-9]{64}$' "$release/images.env") -eq 2 ]]
  bash "$scripts/ci-docker.sh" cleanup
  [[ ! -f "$fixture/repo/SkillBridge-backend/.local/ci/$CI_PROJECT.env" ]]
  [[ ! -f "$release/images.tar.gz" ]]
  printf 'PASS: local image IDs export correctly despite REGISTRY_PREFIX=%s.\n' "$registry"
done

# Transfer and deployment are separate actions using only pinned SSH credentials.
export VPS_HOST=51.210.107.84 VPS_USER=hajer VPS_PORT=2244 VPS_DIRECTORY=/home/hajer/skillbridge
export KNOWN_HOSTS_FILE="$fixture/known-hosts" TEST_SSH_LOG="$fixture/ssh.log"
export SSH_KEY_FILE="$fixture/private-key"
printf 'test-host-key\n' > "$KNOWN_HOSTS_FILE"
printf 'test-private-key\n' > "$SSH_KEY_FILE"
for tool in ssh scp; do
  cat > "$fixture/bin/$tool" <<'FAKE_SSH'
#!/usr/bin/env bash
printf '%s %s\n' "$(basename "$0")" "$*" >> "$TEST_SSH_LOG"
FAKE_SSH
  chmod +x "$fixture/bin/$tool"
done
bash "$scripts/package-images.sh"
bash "$scripts/send-release.sh" upload
grep -q 'scp .*images.tar.gz' "$TEST_SSH_LOG"
grep -q 'StrictHostKeyChecking=yes' "$TEST_SSH_LOG"
grep -q 'IdentitiesOnly=yes' "$TEST_SSH_LOG"
grep -Fq -- "-i $SSH_KEY_FILE" "$TEST_SSH_LOG"
grep -q -- '-P 2244' "$TEST_SSH_LOG"
if grep -q "bash .*deploy-vps.sh" "$TEST_SSH_LOG"; then exit 1; fi
bash "$scripts/send-release.sh" deploy
grep -q "ssh .*bash .*deploy-vps.sh" "$TEST_SSH_LOG"
echo 'PASS: transfer uses the pinned host and SSH port; deployment is a separate action.'

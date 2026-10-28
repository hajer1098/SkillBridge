#!/usr/bin/env bash
# Exercises release/backup/rollback ordering without a real server or database.
set -Eeuo pipefail
source_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../deploy" && pwd)
fixture=$(mktemp -d /tmp/skillbridge-deploy-test-XXXXXXXX)
trap 'rm -rf -- "$fixture"' EXIT
trap 'status=$?; cat "${case_root:-$fixture}/output" >&2 2>/dev/null || true; exit "$status"' ERR
mkdir -p "$fixture/bin"
cat > "$fixture/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_DOCKER_LOG"
case " $* " in
  *' image inspect '*)
    [[ ${FAIL_IMAGE_ID:-0} != 1 ]] || exit 1
    printf '%s\n' "$3"
    ;;
  *' image load '*)
    [[ ${FAIL_IMAGE_LOAD:-0} != 1 ]] || exit 1
    ;;
  *' exec -T database '*)
    [[ ${FAIL_BACKUP:-0} != 1 ]] || exit 1
    printf 'test-backup\n'
    ;;
  *' up '*' backend frontend '*)
    if [[ ${FAIL_RELEASE:-0} == 1 && " $* " == *'/releases/new/compose.production.yaml '* ]]; then exit 1; fi
    ;;
esac
MOCK
chmod +x "$fixture/bin/docker"
export FAKE_DOCKER_SCRIPT="$fixture/bin/docker"
docker() { bash "$FAKE_DOCKER_SCRIPT" "$@"; }
export -f docker
export FAKE_DOCKER_LOG
make_case() {
  case_root="$fixture/$1"
  mkdir -p "$case_root/releases/old" "$case_root/releases/new"
  for release in old new; do
    cp "$source_dir/deploy-vps.sh" "$source_dir/compose.production.yaml" "$case_root/releases/$release/"
    printf 'BACKEND_IMAGE=ghcr.io/example/backend@sha256:%064d\nFRONTEND_IMAGE=ghcr.io/example/frontend@sha256:%064d\n' 1 2 > "$case_root/releases/$release/images.env"
  done
  printf 'DOCKER_DATABASE_PASSWORD=test-password\n' > "$case_root/.env.production"
  ln -s "$case_root/releases/old" "$case_root/current"
  FAKE_DOCKER_LOG="$case_root/docker.log"
  : > "$FAKE_DOCKER_LOG"
  unset FAIL_RELEASE FAIL_BACKUP FAIL_IMAGE_ID FAIL_IMAGE_LOAD
}
make_case success
bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1
[[ $(readlink -f "$case_root/current") == "$case_root/releases/new" ]]
[[ $(find "$case_root/backups" -name '*.dump' | wc -l) -eq 1 ]]
grep -q 'test-backup' "$case_root"/backups/*.dump
echo 'PASS: success takes a backup and advances current.'

make_case rollback
export FAIL_RELEASE=1
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
[[ $(readlink -f "$case_root/current") == "$case_root/releases/old" ]]
grep -q '/releases/old/compose.production.yaml.*up -d.*backend frontend' "$FAKE_DOCKER_LOG"
echo 'PASS: failed app startup attempts image rollback and keeps current.'

make_case backup_failure
export FAIL_BACKUP=1
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
[[ $(readlink -f "$case_root/current") == "$case_root/releases/old" ]]
if grep -q 'up -d.*backend frontend' "$FAKE_DOCKER_LOG"; then exit 1; fi
echo 'PASS: failed backup prevents application replacement.'

make_case malformed_release
printf 'PUBLIC_ORIGIN=https://unexpected.example\n' >> "$case_root/releases/new/images.env"
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
[[ ! -s $FAKE_DOCKER_LOG ]]
echo 'PASS: malformed release is rejected before Docker runs.'

make_case deployment_lock
exec 9>"$case_root/.deploy.lock"
flock -n 9
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
exec 9>&-
[[ ! -s $FAKE_DOCKER_LOG ]]
echo 'PASS: concurrent deployment is rejected.'

make_offline_case() {
  make_case "$1"
  printf 'BACKEND_IMAGE=sha256:%064d\nFRONTEND_IMAGE=sha256:%064d\n' 1 2 > "$case_root/releases/new/images.env"
  printf 'test-image-archive\n' > "$case_root/releases/new/images.tar.gz"
  (cd "$case_root/releases/new" && sha256sum images.tar.gz > images.sha256)
}
make_offline_case offline_success
bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1
[[ $(readlink -f "$case_root/current") == "$case_root/releases/new" ]]
grep -q 'image load --input' "$FAKE_DOCKER_LOG"
if grep -q 'pull backend frontend' "$FAKE_DOCKER_LOG"; then exit 1; fi
load_line=$(grep -n 'image load --input' "$FAKE_DOCKER_LOG" | cut -d: -f1)
backup_line=$(grep -n 'exec -T database' "$FAKE_DOCKER_LOG" | cut -d: -f1)
app_line=$(grep -n 'up .*backend frontend' "$FAKE_DOCKER_LOG" | cut -d: -f1)
[[ $load_line -lt $backup_line && $backup_line -lt $app_line ]]
echo 'PASS: SSH archive loads before backup and app replacement without registry access.'

make_offline_case corrupt_archive
printf 'corruption\n' >> "$case_root/releases/new/images.tar.gz"
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
if grep -Eq 'image load|exec -T database|up .*backend frontend' "$FAKE_DOCKER_LOG"; then exit 1; fi
[[ $(readlink -f "$case_root/current") == "$case_root/releases/old" ]]
echo 'PASS: checksum failure prevents image loading and app replacement.'

make_offline_case offline_rollback
export FAIL_RELEASE=1
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
[[ $(readlink -f "$case_root/current") == "$case_root/releases/old" ]]
grep -q '/releases/old/compose.production.yaml.*up -d.*backend frontend' "$FAKE_DOCKER_LOG"
echo 'PASS: failed SSH deployment attempts rollback to previous images.'

make_offline_case wrong_image
export FAIL_IMAGE_ID=1
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
if grep -Eq 'exec -T database|up .*backend frontend' "$FAKE_DOCKER_LOG"; then exit 1; fi
echo 'PASS: unavailable immutable image IDs prevent database and app changes.'

make_offline_case load_failure
export FAIL_IMAGE_LOAD=1
if bash "$case_root/releases/new/deploy-vps.sh" "$case_root" > "$case_root/output" 2>&1; then exit 1; fi
if grep -Eq 'exec -T database|up .*backend frontend' "$FAKE_DOCKER_LOG"; then exit 1; fi
echo 'PASS: image import failure prevents database and app changes.'

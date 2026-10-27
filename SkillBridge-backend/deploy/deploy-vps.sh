#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

deploy_root=${1:-/opt/skillbridge}
[[ $deploy_root =~ ^/[a-zA-Z0-9_/-]+$ && $deploy_root != / && $deploy_root != *..* ]] || { echo 'Invalid deployment directory.' >&2; exit 2; }
[[ -d $deploy_root && -f $deploy_root/.env.production ]] || { echo 'Prepare the deployment directory and .env.production on the VPS first.' >&2; exit 2; }
deploy_root=$(cd -- "$deploy_root" && pwd -P)
release_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
[[ $release_dir == "$deploy_root/releases/"* ]] || { echo 'Run the script from a release inside the deployment directory.' >&2; exit 2; }
[[ -f $release_dir/images.env && -f $release_dir/compose.production.yaml ]] || exit 2
[[ $(wc -l < "$release_dir/images.env") -eq 2 ]] || exit 2
for service in BACKEND FRONTEND; do
  [[ $(grep -Ec "^${service}_IMAGE=[a-z0-9./:_-]+@sha256:[a-f0-9]{64}$" "$release_dir/images.env") -eq 1 ]] || { echo 'Release image references must use registry digests.' >&2; exit 2; }
done
exec 9>"$deploy_root/.deploy.lock"
flock -n 9 || { echo 'Another deployment is in progress.' >&2; exit 1; }
chmod 600 "$deploy_root/.env.production"

compose=(docker compose -p skillbridge-production --env-file "$deploy_root/.env.production" --env-file "$release_dir/images.env" -f "$release_dir/compose.production.yaml")
previous_dir=$(readlink -f "$deploy_root/current" 2>/dev/null || true)
release_started=0
on_failure() {
  local status=$?
  trap - ERR
  echo 'Deployment failed. Inspect the release logs and backup before retrying.' >&2
  "${compose[@]}" logs --tail 60 backend frontend >&2 || true
  if [[ $release_started == 1 && $previous_dir == "$deploy_root/releases/"* && -f $previous_dir/images.env ]]; then
    echo 'Restoring the previous application images. Database migrations are not reversed.' >&2
    docker compose -p skillbridge-production --env-file "$deploy_root/.env.production" --env-file "$previous_dir/images.env" -f "$previous_dir/compose.production.yaml" \
      up -d --no-build --wait --wait-timeout 240 backend frontend || echo 'Previous images did not recover; operator action is required.' >&2
  fi
  exit "$status"
}
trap on_failure ERR
"${compose[@]}" config --quiet
# A database image upgrade is a separate maintenance action; pull only app images here.
"${compose[@]}" pull backend frontend
"${compose[@]}" up -d --no-build --wait --wait-timeout 180 database
mkdir -p "$deploy_root/backups"
backup="$deploy_root/backups/$(date -u +%Y%m%dT%H%M%SZ)-$(basename -- "$release_dir").dump"
"${compose[@]}" exec -T database sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup.partial"
mv -- "$backup.partial" "$backup"
echo 'Database backup completed.'
release_started=1
"${compose[@]}" up -d --no-build --wait --wait-timeout 240 backend frontend
"${compose[@]}" exec -T frontend wget -q -O /dev/null http://127.0.0.1:8080/
"${compose[@]}" exec -T frontend wget -q -O /dev/null http://127.0.0.1:8080/admin
"${compose[@]}" exec -T frontend wget -q -O - http://127.0.0.1:8080/api/health
ln -sfn -- "$release_dir" "$deploy_root/current.next"
mv -Tf -- "$deploy_root/current.next" "$deploy_root/current"
trap - ERR
echo "Deployment healthy: $(basename -- "$release_dir")"

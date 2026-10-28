#!/usr/bin/env bash
set -Eeuo pipefail

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
export DOCKER_BUILD_FILE=Dockerfile
: "${CI_PROJECT:?Set a unique CI_PROJECT starting with skillbridge-ci-}"
: "${IMAGE_TAG:?Set IMAGE_TAG to the commit/build identifier}"
[[ $CI_PROJECT =~ ^skillbridge-ci-[a-z0-9-]+$ ]] || { echo 'Invalid CI project name.' >&2; exit 2; }
[[ $IMAGE_TAG =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$ && $IMAGE_TAG != *..* ]] || { echo 'Invalid image tag.' >&2; exit 2; }
# Jenkins exports REGISTRY_PREFIX as a build parameter. Shell variables override
# --env-file values, so keep CI names consistent for tests and SSH export.
export REGISTRY_PREFIX="$CI_PROJECT"
env_file="$root/SkillBridge-backend/.local/ci/$CI_PROJECT.env"
compose=(docker compose -p "$CI_PROJECT" --env-file "$env_file" -f "$root/compose.yaml")

case ${1:-} in
  prepare)
    umask 077
    mkdir -p "$(dirname -- "$env_file")"
    database_password=$(openssl rand -hex 32)
    printf 'DOCKER_DATABASE_PASSWORD=%s\nDOCKER_DATABASE_NAME=skillbridge_ci\nDOCKER_DATABASE_USER=skillbridge_ci\nREGISTRY_PREFIX=%s\nIMAGE_TAG=%s\nFRONTEND_BIND_ADDRESS=127.0.0.1\nFRONTEND_PORT=0\nDEMO_SEED=true\nMAIL_ENABLED=false\n' \
      "$database_password" "$CI_PROJECT" "$IMAGE_TAG" > "$env_file"
    "${compose[@]}" config --quiet
    ;;
  build)
    "${compose[@]}" build --pull backend frontend
    ;;
  test)
    "${compose[@]}" --profile test build --pull tests deploy-tests
    "${compose[@]}" up -d --no-build --wait --wait-timeout 240 database backend frontend
    "${compose[@]}" run --rm tests
    "${compose[@]}" exec -T frontend wget -q -O /dev/null http://127.0.0.1:8080/
    "${compose[@]}" exec -T frontend wget -q -O /dev/null http://127.0.0.1:8080/admin
    "${compose[@]}" exec -T frontend wget -q -O - http://127.0.0.1:8080/api/health
    "${compose[@]}" run --rm deploy-tests
    ;;
  cleanup)
    # This file is generated only for a uniquely named, isolated CI stack.
    if [[ -f $env_file ]]; then
      "${compose[@]}" down --volumes --remove-orphans
      rm -f -- "$env_file"
    fi
    rm -f -- "$root/SkillBridge-backend/.local/direct-release/$IMAGE_TAG/images.tar.gz"
    ;;
  *) echo 'Usage: ci-docker.sh prepare|build|test|cleanup' >&2; exit 2 ;;
esac

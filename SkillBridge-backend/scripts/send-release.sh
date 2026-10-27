#!/usr/bin/env bash
set -Eeuo pipefail
: "${VPS_HOST:?}"
: "${VPS_USER:?}"
: "${VPS_PORT:=22}"
: "${VPS_DIRECTORY:=/opt/skillbridge}"
: "${KNOWN_HOSTS_FILE:?Jenkins secret file containing the verified VPS host key}"
: "${IMAGE_TAG:?}"
[[ $VPS_HOST =~ ^[a-zA-Z0-9.-]+$ && $VPS_HOST != -* ]] || { echo 'Use a DNS hostname or IPv4 address.' >&2; exit 2; }
[[ $VPS_USER =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 2
[[ $VPS_PORT =~ ^[0-9]+$ ]] && ((VPS_PORT>=1 && VPS_PORT<=65535)) || exit 2
[[ $VPS_DIRECTORY =~ ^/[a-zA-Z0-9_/-]+$ && $VPS_DIRECTORY != / && $VPS_DIRECTORY != *..* ]] || exit 2
[[ $IMAGE_TAG =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
[[ -s $KNOWN_HOSTS_FILE ]] || { echo 'The pinned SSH known_hosts file is empty.' >&2; exit 2; }
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
release_dir="$root/SkillBridge-backend/.local/release"
remote_dir="$VPS_DIRECTORY/releases/$IMAGE_TAG"
ssh_options=(-o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KNOWN_HOSTS_FILE" -o ConnectTimeout=15)
ssh "${ssh_options[@]}" -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "mkdir -p '$remote_dir'"
scp "${ssh_options[@]}" -P "$VPS_PORT" "$release_dir/compose.production.yaml" "$release_dir/deploy-vps.sh" "$release_dir/images.env" "$release_dir/release.txt" "$VPS_USER@$VPS_HOST:$remote_dir/"
ssh "${ssh_options[@]}" -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "bash '$remote_dir/deploy-vps.sh' '$VPS_DIRECTORY'"

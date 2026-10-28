#!/usr/bin/env bash
set -Eeuo pipefail
: "${VPS_HOST:?}"
: "${VPS_USER:?}"
: "${VPS_PORT:=2244}"
: "${VPS_DIRECTORY:=/home/hajer/skillbridge}"
: "${KNOWN_HOSTS_FILE:?Jenkins secret file containing the verified VPS host key}"
: "${SSH_KEY_FILE:?Jenkins SSH private-key credential file}"
: "${IMAGE_TAG:?}"
[[ $VPS_HOST =~ ^[a-zA-Z0-9.-]+$ && $VPS_HOST != -* ]] || { echo 'Use a DNS hostname or IPv4 address.' >&2; exit 2; }
[[ $VPS_USER =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 2
[[ $VPS_PORT =~ ^[0-9]+$ ]] && ((VPS_PORT>=1 && VPS_PORT<=65535)) || exit 2
[[ $VPS_DIRECTORY =~ ^/[a-zA-Z0-9_/-]+$ && $VPS_DIRECTORY != / && $VPS_DIRECTORY != *..* ]] || exit 2
[[ $IMAGE_TAG =~ ^[a-zA-Z0-9_.-]+$ ]] || exit 2
[[ $IMAGE_TAG != *..* && $IMAGE_TAG != .* && $IMAGE_TAG != -* && ${#IMAGE_TAG} -le 128 ]] || exit 2
[[ -s $KNOWN_HOSTS_FILE ]] || { echo 'The pinned SSH known_hosts file is empty.' >&2; exit 2; }
[[ -s $SSH_KEY_FILE ]] || { echo 'The deployment SSH key file is empty.' >&2; exit 2; }
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
release_dir="$root/SkillBridge-backend/.local/direct-release/$IMAGE_TAG"
remote_dir="$VPS_DIRECTORY/releases/$IMAGE_TAG"
ssh_options=(-i "$SSH_KEY_FILE" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KNOWN_HOSTS_FILE" -o ConnectTimeout=15)
case ${1:-} in
  upload)
    for file in compose.production.yaml deploy-vps.sh images.env release.txt images.sha256 images.tar.gz; do
      [[ -s $release_dir/$file ]] || { echo "Missing release file: $file" >&2; exit 2; }
    done
    ssh -n "${ssh_options[@]}" -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "umask 077; mkdir -p '$remote_dir'"
    scp "${ssh_options[@]}" -P "$VPS_PORT" "$release_dir/compose.production.yaml" "$release_dir/deploy-vps.sh" "$release_dir/images.env" "$release_dir/release.txt" "$release_dir/images.sha256" "$release_dir/images.tar.gz" "$VPS_USER@$VPS_HOST:$remote_dir/"
    ;;
  deploy)
    ssh -n "${ssh_options[@]}" -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "bash '$remote_dir/deploy-vps.sh' '$VPS_DIRECTORY'"
    ;;
  *) echo 'Usage: send-release.sh upload|deploy' >&2; exit 2 ;;
esac

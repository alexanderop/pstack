#!/usr/bin/env bash
# Check upstream skill parity and show the current port diff.
#
# cursor/plugins is a monorepo and pstack is one directory in it, so there is no
# clean merge base. This fetches upstream into a temp clone and diffs its
# pstack/ against this tree, skipping the files the port deliberately owns.
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "fetching cursor/plugins..." >&2
git clone --depth 1 --filter=blob:none --sparse --quiet https://github.com/cursor/plugins.git "$tmp/upstream"
git -C "$tmp/upstream" sparse-checkout set pstack
upstream_sha=$(git -C "$tmp/upstream" rev-parse --short HEAD)
upstream_version=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' \
	"$tmp/upstream/pstack/.cursor-plugin/plugin.json")

echo "upstream: $upstream_sha (pstack $upstream_version)" >&2
echo >&2

status=0
python3 "$repo_root/scripts/check-upstream.py" "$tmp/upstream/pstack" || status=$?

diff -ru \
	--exclude='.git' --exclude='node_modules' \
	--exclude='.claude-plugin' --exclude='.codex-plugin' \
	--exclude='harness' --exclude='hooks' --exclude='PORT.md' \
	--exclude='check-upstream.py' --exclude='sync-upstream.sh' --exclude='detect-harness.sh' --exclude='validate.sh' \
	"$tmp/upstream/pstack" "$repo_root" || true

exit "$status"

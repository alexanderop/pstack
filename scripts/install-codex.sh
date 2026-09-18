#!/usr/bin/env bash
set -euo pipefail
root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
command -v codex >/dev/null || { echo 'Codex CLI is required.' >&2; exit 1; }
bash "$root/scripts/validate.sh"
# The plugin is the repository root, so install from a clean source checkout.
if [[ -n "$(find "$root" -name node_modules -type d -prune -print -quit)" ]] || [[ -d "$root/.eval-artifacts" ]] || [[ -d "$root/.audit" ]]; then
  echo 'Install from a separate clean checkout without node_modules, .eval-artifacts, or .audit; these must not enter the plugin cache.' >&2
  exit 1
fi
codex plugin marketplace add "$root"
codex plugin add pstack@pstack
printf '%s\n' 'Installed. Start a new task and invoke $setup-pstack, then $poteto-mode when needed.'

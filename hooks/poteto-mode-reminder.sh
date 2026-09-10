#!/usr/bin/env bash
# Claude Code UserPromptSubmit hook: the nearest thing to Cursor's sticky mode.
#
# Cursor arms `poteto-mode` as a mode and re-injects its `reminder` line on every
# turn. Claude Code has no mode concept, so this hook does the re-injection.
#
# This optional per-prompt reminder supplements the automatic SessionStart hook.
# Wire it up yourself — see hooks/README.md.
#
# Fires only while ~/.pstack/armed exists, so /poteto-mode stays something you
# turn on rather than something that follows you around.
set -uo pipefail

[ -f "$HOME/.pstack/armed" ] || exit 0

cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "New task? Playbook match or rigor needed -> apply /poteto-mode. Casual turn or user opts out -> don't."
  }
}
JSON

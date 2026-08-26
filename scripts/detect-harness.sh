#!/usr/bin/env bash
# Print the active agent harness: claude-code | codex | copilot-cli | cursor | unknown
#
# Reads only environment variables the harness itself sets. Never infers from
# which config directories exist on disk — a developer who uses all four has
# all four.
set -uo pipefail

if [ -n "${CLAUDECODE:-}" ] || [ -n "${CLAUDE_CODE_ENTRYPOINT:-}" ]; then
  echo claude-code
elif [ -n "${CURSOR_AGENT:-}" ] || [ -n "${CURSOR_TRACE_ID:-}" ]; then
  echo cursor
elif [ -n "${CODEX_HOME:-}" ] || [ -n "${CODEX_SANDBOX:-}" ] || [ -n "${CODEX_SANDBOX_NETWORK_DISABLED:-}" ]; then
  echo codex
elif [ -n "${COPILOT_CLI:-}" ] || [ -n "${COPILOT_AGENT:-}" ]; then
  echo copilot-cli
else
  # Fall back to the caller's own judgment. The tool used to spawn a subagent is
  # the giveaway: Agent/Workflow -> claude-code, Task -> cursor, shell plus
  # ~/.codex/agents/*.toml -> codex.
  echo unknown
fi

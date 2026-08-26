# Hooks

This plugin ships **no `hooks.json`**. Claude Code and Codex both auto-register a
plugin's hooks the moment it is enabled, and a plugin that injects text into
every prompt without being asked is a bad neighbor. Everything here is opt-in.

## `poteto-mode-reminder.sh`

Cursor arms `poteto-mode` as a *mode*: a sticky persona whose `reminder` line is
re-injected on every turn. No other harness has that concept. A `UserPromptSubmit`
hook is the closest equivalent on Claude Code.

Add to `~/.claude/settings.json` (or a project's `.claude/settings.json`):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/poteto-mode-reminder.sh"
          }
        ]
      }
    ]
  }
}
```

Then arm and disarm it by hand:

```bash
mkdir -p ~/.pstack && touch ~/.pstack/armed   # on
rm ~/.pstack/armed                            # off
```

The hook exits silently when the flag file is absent, so leaving it registered
costs nothing while disarmed.

**Codex** takes the same JSON shape in `.codex/hooks.json`, reads the same stdin,
and returns the same `hookSpecificOutput.additionalContext`. One script serves
both. Two differences worth knowing: `${CLAUDE_PLUGIN_ROOT}` does not expand
there, so write an absolute path, and a project hook must be trusted once in the
TUI before it will ever run — which also means `codex exec` cannot run a hook that
was never approved interactively.

**Copilot CLI** has no equivalent. Type `/poteto-mode` per task.

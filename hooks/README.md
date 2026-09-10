# Hooks

## Automatic session context

The plugin registers `hooks/hooks.json` in Claude Code and Codex. Its `SessionStart`
hooks print the complete installed `skills/poteto-mode/SKILL.md` into session
context on startup, resume, clear, and compaction. Claude Code forks are included.
You do not need to invoke the skill or ask the agent to read it first.

The skill is split into three numbered parts, each below 9,000 characters, because
Claude Code spills hook outputs above 10,000 characters to a file. Codex's
`additionalContextLimit` is set explicitly. The output includes the installed
plugin root and skill directory so referenced files resolve outside your project.
The parts preserve the exact skill text and identify their order even if hooks
finish concurrently. Referenced playbooks remain separate and load when needed.

Python 3 must be available. In Codex, open `/hooks` and trust the three pstack
SessionStart commands once, then start a new session. New or changed hook
definitions require review again. Enabling the plugin alone does not grant trust.
In Claude Code, enable the plugin and start a new session.

To opt out for a conversation, tell the agent to stop using poteto mode. To stop
loading the text, disable the three hooks in Codex's `/hooks` menu or disable the
plugin. A later SessionStart event loads the default mode again.

Run `python3 scripts/check-session-hook.py` to verify every registered start source,
exact text reconstruction, output budgets, and installed paths containing spaces.

References: [Codex hooks](https://learn.chatgpt.com/docs/hooks) and
[Claude Code hooks](https://code.claude.com/docs/en/hooks).

## Optional per-prompt reminder

Cursor arms `poteto-mode` as a *mode*: a sticky persona whose `reminder` line is
re-injected on every turn. No other harness has that concept. A `UserPromptSubmit`
hook can provide an additional reminder on Claude Code. It is not required for
the automatic session context above.

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

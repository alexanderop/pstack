# Harness facts

Upstream pstack is written for Cursor. Every fact that is *true only in Cursor* —
the subagent tool's name, the model slugs, where transcripts live, where a
generated project skill goes — is pulled out of the skills and into this
directory, one file per harness.

Skills never hardcode a harness fact. They say "read the active harness file"
and branch on what they find. That keeps the 34 principle and prose skills
byte-identical to upstream so this fork can rebase cheaply.

## Files

| harness | file | manifest it installs from |
|---|---|---|
| Claude Code | `claude-code.md` | `.claude-plugin/plugin.json` |
| Codex | `codex.md` | `.codex-plugin/plugin.json` |
| GitHub Copilot CLI | `copilot-cli.md` | `.claude-plugin/plugin.json` |
| Cursor | `cursor.md` | `.cursor-plugin/plugin.json` |

## Detecting the active harness

Run `scripts/detect-harness.sh`. It prints one of `claude-code`, `codex`,
`copilot-cli`, `cursor`, or `unknown`, and reads only environment variables the
harness itself sets.

`CLAUDECODE=1` is verified on Claude Code. The other three env signals are
best-effort: if the script prints `unknown`, decide from your own tool surface
instead — the tool you use to spawn a subagent is the giveaway (`Agent` and
`Workflow` mean Claude Code, `Task` means Cursor, `shell` with
`~/.codex/agents/*.toml` means Codex) — then read that harness file directly.
Never guess from which config directories exist on disk. A developer who uses
all four has all four.

## What every harness file must answer

1. **Subagent spawn** — the tool, how to set a per-subagent model, how many run
   at once, whether they can run in the background.
2. **Model roster** — the slugs this harness actually accepts, and the per-role
   defaults built from them.
3. **Transcript location** — exact path and format, plus how to scope to the
   current workspace.
4. **Project-local skill path** — where `create-verification-skill` and
   `automate-me` write a generated skill.
5. **Persistent instruction file** — the harness's always-applied rules
   location, for anything that must survive across turns.
6. **Long-running work** — the harness's answer to a Cursor cloud agent.

## Model configuration

`/setup-pstack` writes `~/.pstack/models.md`, one line per role, at the same
path on every harness. Skills read it when present and fall back to the
per-role defaults in the harness file when a line is absent. It lives outside
every harness's own config directory on purpose: writing into `~/.claude/CLAUDE.md`
or `~/.cursor/rules/` puts pstack's configuration into a file the user owns and
edits by hand.

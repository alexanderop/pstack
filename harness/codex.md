# Harness: Codex

## Subagent spawn

Codex agents are TOML definitions in `~/.codex/agents/<name>.toml` with
`name`, `description`, and a `developer_instructions` block. Spawn one by
delegating to it by name.

For a panel of N workers, the portable path is the CLI: run
`codex exec --model <slug> "<prompt>"` per worker from `shell`, backgrounded,
then drain. `codex exec` is non-interactive and returns the final message.

A hook or skill can only run if the enclosing plugin was trusted once in the
TUI. `codex exec` cannot run a hook that has never been approved interactively.

## Model roster

Read the user's entitled slugs before writing any of them into a config —
never write a slug you have not confirmed. `codex --help` and the model picker
are the dependable sources.

Per-role defaults when `~/.pstack/models.md` has no line for the role: omit
the model and inherit the parent. Codex is single-family in practice, so a
panel varies `model_reasoning_effort` rather than model slug. `high` for
judgment roles, the default for mechanical ones.

`inherit-parent` and `auto` are always valid.

## Transcripts

`~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<timestamp>-<uuid>.jsonl`.

Sessions are filed by **date, not by workspace**. There is no per-project
directory. To scope to the current workspace you must read each candidate
file's metadata and match its cwd — so bound the search by date first, then
filter, and do the whole scan in a subagent so the raw lines never enter the
main thread.

`~/.codex/session_index.jsonl` and `~/.codex/history.jsonl` are faster entry
points than walking the date tree.

## Project-local skills

`.codex/skills/<name>/SKILL.md` in the repo, or `~/.codex/skills/<name>/`.
Note `~/.codex/skills/` on this machine holds symlinks into `~/.agents/skills/`,
the cross-agent shared skill root — prefer that for a skill meant to be visible
to Codex and Copilot at once.

## Persistent instructions

`AGENTS.md` (project root) and `~/.codex/AGENTS.md` (global). `~/.codex/rules/`
holds always-applied rules.

## Long-running work

No cloud agent. Use `codex exec` backgrounded from `shell`, or
`~/.codex/automations/` for scheduled runs. Where a playbook says "cloud agent",
read it as a backgrounded `codex exec` whose output file you poll.

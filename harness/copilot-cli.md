# Harness: GitHub Copilot CLI

Copilot CLI reads the Claude plugin format directly — it installs from
`.claude-plugin/plugin.json` and discovers `skills/` and `agents/` the same way.
Everything below is where it *diverges* from `claude-code.md`.

## Subagent spawn

Copilot has subagents, defined as `agents/<name>.agent.md` — note the
`.agent.md` suffix, which Claude Code does not require. Files named plain
`<name>.md` are still picked up, so pstack's `agents/*.md` work as-is.

There is no per-subagent model override comparable to Claude Code's. Panels run
on the session model. A four-member panel becomes four workers with four
different *briefs* rather than four different models — which is what
`interrogate` and `architect` need anyway; `arena`'s cross-family judge is the
one thing that genuinely degrades.

## Model roster

Whatever the session is configured for. Do not write model slugs into
`~/.pstack/models.md` on this harness; use `inherit-parent` for every role.

## Transcripts

Two pieces, and neither is a per-project jsonl directory:

- `~/.copilot/session-store.db` — sqlite. The `sessions` table has `id`, `cwd`,
  `repository`, `branch`, `summary`, `created_at`. Query it by `cwd` to find the
  sessions for the current workspace. `turns`, `checkpoints`, and
  `session_files` hang off it.
- `~/.copilot/session-state/<session-id>/events.jsonl` — the actual message
  stream for one session, plus `checkpoints/`, `files/`, and `workspace.yaml`.

So: sqlite query for the ids, then read the matching `events.jsonl`. Any skill
that assumes it can glob a directory of transcripts (`recall`, `reflect`,
`show-me-your-work`) needs this two-step here.

## Project-local skills

`.github/skills/<name>/SKILL.md` in the repo, or `~/.copilot/skills/<name>/`
(which symlinks into `~/.agents/skills/`, the shared cross-agent root).

## Persistent instructions

`.github/copilot-instructions.md` (project) and `AGENTS.md`, both honored.

## Long-running work

No cloud agent equivalent in the CLI. Background a shell command and poll it.
Where a playbook depends on a detached remote run, say so and fall back to an
in-session background job rather than pretending the run is durable.

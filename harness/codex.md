# Harness: Codex

## Browser and desktop verification

Use pstack [browse-web](../skills/browse-web/SKILL.md) to select the driver.
Treat a callable Computer Use runtime in the current session as authoritative.
When its `computer-use:computer-use` skill is also available, read and follow
that skill. When only the runtime is exposed, initialize it and follow the
documentation it returns; do not call Computer Use uninstalled because the
skill is absent. pstack does not bundle the runtime. CLI and desktop sessions
may expose different tools, so keep plugin installation, skill availability,
and runtime availability distinct. If the runtime is absent or fails to
initialize, report that concrete failure and use `agent-browser` for web
surfaces unless the user requires Computer Use.
Keep automated test suites on their existing runners.

## Subagent spawn

Prefer the native subagent tools exposed in the current session, such as
`spawn_agent` or `collaboration.spawn_agent`. Use their actual schema and the
session's concurrency limit. Map upstream `Task` calls to these tools. Do not
pass Cursor arguments such as `subagent_type`, `run_in_background`, `readonly`,
or `environment` unless the active tool explicitly supports them.

For general-purpose tasks, use the available `default` agent. Use a named
`poteto-agent` or `comment-sicko` only if it appears in the available agent list.
Otherwise spawn `default` with the bounded task and an absolute path to this
plugin's `agents/poteto-agent.md` or `agents/comment-sicko.md`. Require the child
to read that file before working. Installing Markdown agent files does not
establish that Codex registered their names.

Custom Codex agents use TOML files in `.codex/agents/` or `~/.codex/agents/`.
The required fields are `name`, `description`, and `developer_instructions`.
This port uses the instruction-file fallback without modifying user config.

Use native wait, message, resume, and close tools where available. Give writers
separate worktrees and tell reviewers their scope is read-only in the task.
Subagents inherit the session's permissions; a read-only instruction is not a
sandbox. Keep the tools needed for MCP-backed evidence available.

If native delegation is unavailable and the session permits CLI delegation,
`codex exec` can run a bounded task in a separate worktree. It does not inherit
the full parent conversation. Include the task, instruction paths, constraints,
and output path. Do not use a CLI subprocess to bypass delegation restrictions.
If neither path is available, do the work locally and report the missing
independent review.

## Model roster

Use the active tool's available models and supported override fields. Do not
copy Cursor model slugs into Codex calls. Read per-role overrides from
`~/.pstack/models.md`; absent a supported override, inherit the parent by
omitting the model and reasoning fields. `inherit-parent` and `auto` also mean
omit those fields. Respect any restrictions on overrides with forked context.

A repeated model still gives independent reads, but not cross-family review.
Report the actual panel composition. Do not promise a different model family
unless the session exposes one.

## Transcripts

Local CLI rollouts commonly live under
`~/.codex/sessions/<YYYY>/<MM>/<DD>/rollout-<timestamp>-<uuid>.jsonl`.
Use the session's supplied transcript path or history tools first. A runtime
may store history differently. `~/.codex/session_index.jsonl` and
`~/.codex/history.jsonl`, when present, can narrow a local search.

Sessions are filed by date rather than workspace. Bound searches by date, then
match the current workspace in session metadata before reading message bodies.
Do not scan unrelated projects' conversations.

## Project-local skills

Use `.agents/skills/<name>/SKILL.md` in the repository, or
`~/.agents/skills/<name>/SKILL.md` for personal skills. Plugin skills stay in this
plugin's `skills/` directory and are discovered through the plugin manifest.

## Persistent instructions

Use project `AGENTS.md` and global `~/.codex/AGENTS.md` for instructions.
`.codex/rules/` files govern command permissions; they are not a substitute for
always-applied prose. Keep pstack's model choices in `~/.pstack/models.md`.

## Long-running work

Use native background agents and wait tools for work within the active session.
Do not treat Cursor's `/loop` or `environment: "cloud"` as Codex commands.
Scheduled or cloud execution requires a separately available tool and an
explicitly configured task. A local worker does not become durable because a
playbook calls it a cloud agent. Report this limit when it affects delivery.

Source: [official Codex subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
and [skill discovery](https://learn.chatgpt.com/docs/build-skills).

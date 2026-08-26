# Harness: Claude Code

## Subagent spawn

Use the **`Agent`** tool. One call per subagent; put every independent call in a
single message so they run concurrently.

- `subagent_type` picks the agent definition. `general-purpose` is the default;
  pstack's own agents (`agents/*.md`) are addressable by their `name`.
- `model` accepts exactly `opus`, `sonnet`, `haiku`, `fable`. Nothing else.
  Omit it to inherit the parent's model.
- `subagent_type: "fork"` inherits the parent's full conversation context and
  ignores `model`. Use it when the subagent needs what the parent already read.
- `isolation: "worktree"` gives the subagent its own git worktree. Use it only
  when parallel subagents write to the same files.
- Subagents run in the background. You are notified when one finishes; do not
  poll, and never write the result yourself before the notification arrives.
- `SendMessage` continues an existing subagent with its context intact. A fresh
  `Agent` call does not.

For deterministic fan-out with barriers, loops, or per-item pipelines, use the
**`Workflow`** tool instead — but only when the user has explicitly opted into
multi-agent orchestration. `Workflow` also exposes `effort` per agent
(`low`/`medium`/`high`/`xhigh`/`max`), which `Agent` does not.

## Model roster

Four slugs, and that is the whole roster: `opus`, `sonnet`, `haiku`, `fable`.

Upstream pstack routes by model *family* strength — precise code to sol, fast
mechanical code to grok, prose and judgment to fable. Claude Code has one
family, so panels lose genuine cross-family disagreement. A four-member panel
still gets four distinct capability tiers, which is what the panel actually
needs; treat "different family" in upstream skill text as "different tier" here.

Per-role defaults when `~/.pstack/models.md` has no line for the role:

```
feature, refactoring: sonnet
bug-fix: opus
perf-issue: opus
hillclimb: opus
judgment and prose: fable
hardest tasks: opus
how explorer: sonnet
how explainer: fable
how critics: fable, opus, sonnet, haiku
why investigators: sonnet
why synthesizer: fable
reflect tooling: sonnet
reflect judgment, divergent, synthesizer: fable
arena runners: fable, opus, sonnet, haiku
arena cross-judge pool: fable, opus, sonnet, haiku
swarm workers: sonnet
architect runners: fable, opus, sonnet, haiku
interrogate reviewers: fable, opus, sonnet, haiku
```

`inherit-parent` and `auto` both mean "omit `model` and run on the parent's
model". Both are always valid.

**Arena cross-judge:** upstream picks a judge from a different model family
than the parent's. Here, pick a different *slug* than the parent is running,
preferring `fable` for judgment unless the parent is already on it.

## Transcripts

`~/.claude/projects/<slug>/<session-uuid>.jsonl`, one JSON object per line.

`<slug>` is the absolute workspace path with every `/` replaced by `-`,
**including the leading slash**, so `/Users/you/proj` becomes
`-Users-you-proj`. This differs from Cursor, which drops the leading slash.

Read only the slug for the current workspace. Do not glob `~/.claude/projects/*/`
— that crosses workspace boundaries into unrelated private chats.

The current session's own transcript is the file whose uuid matches
`$CLAUDE_CODE_SESSION_ID`.

## Project-local skills

`.claude/skills/<name>/SKILL.md` in the repo, or `~/.claude/skills/<name>/`
for a personal one. `create-verification-skill` writes `.claude/skills/verify-<app>/`.

## Persistent instructions

`./CLAUDE.md` (project), `~/.claude/CLAUDE.md` (global). Both are loaded every
session. They are hand-maintained by the user — append to them only when the
user asks, and never rewrite one wholesale.

For a rule that must fire on every turn rather than at session start, use a
`UserPromptSubmit` hook in `.claude/settings.json`.

## Long-running work

There is no Cursor cloud agent. The equivalents, in order of preference:

1. `Agent` with `isolation: "worktree"` for parallel isolated work in-session.
2. `Bash` with `run_in_background: true` for a long build, test run, or deploy.
   You are re-invoked when it exits.
3. `/loop` or a scheduled cloud agent (`schedule` skill) for work that spans
   sessions.

Where a playbook says "launch a cloud agent and come back to it", read that as
a background subagent plus a `Monitor`, not a detached remote run.

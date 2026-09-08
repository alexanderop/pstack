# Harness: Cursor

The original target. Everything here matches upstream pstack, and this file
exists so the skills can branch uniformly rather than treating Cursor as an
implicit default.

## Subagent spawn

The **`Task`** tool. `model` takes a full Cursor slug. Launch every subagent in
a single message to get real parallelism.

## Model roster

Full cross-family roster. Enumerate the slugs you can actually pass to `Task`
in this session; that is the dependable source. Never write a slug you have not
confirmed.

Per-role defaults when `~/.pstack/models.md` has no line for the role:

```
feature, refactoring: grok-4.6-fast-xhigh
bug-fix: claude-fable-5-1-thinking-max
perf-issue: claude-fable-5-1-thinking-max
hillclimb: claude-fable-5-1-thinking-max
judgment and prose: claude-fable-5-1-thinking-max
hardest tasks: claude-fable-5-1-thinking-max
how explorer: grok-4.6-fast-xhigh
how explainer: claude-fable-5-1-thinking-max
why investigators: grok-4.6-fast-xhigh
why synthesizer: claude-fable-5-1-thinking-max
reflect tooling: gpt-5.6-sol-max
reflect judgment, divergent, synthesizer: claude-fable-5-1-thinking-max
arena runners: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
arena cross-judge pool: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
swarm workers: grok-4.6-fast-xhigh
architect runners: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
interrogate reviewers: claude-fable-5-1-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
```

`inherit-parent` and `auto` are always valid.

## Transcripts

`~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, one message
per line. `<slug>` is the workspace path with the leading slash **dropped** and
each `/` turned into `-`, so `/Users/you/proj` becomes `Users-you-proj`.

The system prompt names the active workspace's `agent-transcripts/` directory —
use that path. Do not glob across `~/.cursor/projects/*/`; that crosses
workspace boundaries into unrelated private chats.

## Project-local skills

`.cursor/skills/<name>/SKILL.md`, or `~/.cursor/skills/<name>/` for a personal
one.

## Persistent instructions

`.cursor/rules/*.mdc` with `alwaysApply: true`, and `AGENTS.md`.

## Long-running work

Cursor cloud agents. Playbooks that say "launch a cloud agent" mean this
literally here.

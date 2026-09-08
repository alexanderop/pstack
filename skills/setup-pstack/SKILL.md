---
name: setup-pstack
description: Detect the active agent harness and configure which models pstack uses per role. Writes ~/.pstack/models.md, which the skills read as an override on the harness defaults. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Two jobs: pin down which harness pstack is running in, then write
`~/.pstack/models.md`, one line per role. The skills read that file and fall
back to the active harness file's defaults when a line is absent, so this is an
override layer, not a requirement.

`~/.pstack/models.md` lives at the same path on every harness on purpose. It
stays out of `~/.claude/CLAUDE.md`, `~/.cursor/rules/`, and `AGENTS.md` because
those are files the user owns and hand-edits; pstack should not be rewriting
them on every re-run.

## Steps

### 1. Detect the harness

Run `scripts/detect-harness.sh` from the pstack plugin root. It prints
`claude-code`, `codex`, `copilot-cli`, `cursor`, or `unknown`.

On `unknown`, decide from your own tool surface rather than from which config
directories exist on disk. A developer who uses all four harnesses has all
four directories. The subagent tool is the giveaway: `Agent` and `Workflow`
mean Claude Code, `Task` means Cursor, `spawn_agent` or `collaboration.spawn_agent`
means Codex. Ask the user if you still cannot tell.

Read `harness/<detected>.md` in full. Everything in steps 2 through 5 depends on
it.

### 2. Detect available models

Enumerate the model slugs you can actually pass to a subagent in this session;
that is the dependable source, and the harness file's roster section says what
shape to expect. If the harness exposes a models API or CLI listing the user's
entitled models, prefer it for completeness. If you cannot detect any, ask the
user to paste the slugs they have access to. Never write a real slug you have
not confirmed is available. The aliases `inherit-parent` and `auto` are always
valid even though they are not detected slugs.

On a harness with no per-subagent model override (see the harness file), skip
straight to writing `inherit-parent` for every role and say why. Do not invent a
roster the harness cannot use.

### 3. Load current state

The default role-to-model mapping is the block in `harness/<detected>.md`. If
`~/.pstack/models.md` already exists, read it and treat its values as the
current choices. Otherwise start from the harness defaults.

### 4. Map and confirm

Show every role with its current model, marking any real slug not in the
detected set as needing a choice. Ask whether to accept as-is or change specific
roles, offering the detected models plus `inherit-parent` and `auto` (both mean:
this role runs on the parent chat model) as the options. Prefer a structured
question over free text.

For panel roles (arena runners, architect runners, interrogate
reviewers) the value is a list, and one subagent runs per entry, alias entries
included, so the list length sets the fan-out. `arena cross-judge pool` is also
a list, but Arena selects one value from it whose model family differs from the
parent's when possible. `swarm workers` is the default model for every worker
unless a race or comparison assigns another model per arm.

When the harness is single-family, say so plainly while confirming: the panels
still fan out, but the entries are capability tiers rather than rival vendors,
so cross-family disagreement is not available and panel agreement is worth
less. That is a real limitation, not a detail to paper over.

### 5. Validate

Every real slug written must be in the detected set; `inherit-parent` and `auto`
always pass. If a chosen real slug is not available, stop and ask again. A
config pointing at a model the user cannot use breaks every delegation that
reads it.

### 6. Write the file

Write `~/.pstack/models.md`, creating `~/.pstack/` if it does not exist.
Overwrite the whole file so re-runs stay idempotent. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to
# the active harness file's default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model
# (omit the subagent `model` argument). Alias entries in a panel list still
# count toward its fan-out.
harness: <claude-code|codex|copilot-cli|cursor>
feature, refactoring: <slug>
bug-fix: <slug>
perf-issue: <slug>
hillclimb: <slug>
judgment and prose: <slug>
hardest tasks: <slug>
how explorer: <slug>
how explainer: <slug>
why investigators: <slug>
why synthesizer: <slug>
reflect tooling: <slug>
reflect judgment, divergent, synthesizer: <slug>
arena runners: <slug>, <slug>, <slug>, <slug>
arena cross-judge pool: <slug>, <slug>, <slug>, <slug>
swarm workers: <slug>
architect runners: <slug>, <slug>, <slug>, <slug>
interrogate reviewers: <slug>, <slug>, <slug>, <slug>
```

The `harness:` line records what step 1 detected. A skill that reads the file
can trust it and skip re-detection; if the user later switches harness, the
mismatch is visible and re-running this skill fixes it.

### 7. Confirm

Tell the user the file was written, which harness it targets, and that it
applies to new sessions. Re-running this skill updates it.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a
`verify-*` skill, or an existing harness). If not, offer once: "want a
project-local verification skill, so agents can drive the app the way a user
does and prove changes work? I can generate one with
/create-verification-skill." On yes, invoke `/create-verification-skill`
(resolves wherever pstack is installed: workspace, user, or plugin). On no,
move on without pushing.

# What this port changed

Upstream: [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack)
at `bdf7aa3`, version 0.14.3. The first commit in this repo is that tree
unmodified, so `git diff <first-commit>..HEAD` is the complete port.

## The shape of the change

All four harnesses read the same on-disk layout — `skills/<name>/SKILL.md`,
`agents/*.md`, `references/`, `scripts/`. Only the manifest directory differs,
and Copilot CLI and Codex both accept the Claude one. So the port is not a
rewrite; it is four manifests plus an indirection layer.

Every fact that is true only in Cursor now lives in `harness/`, one file per
harness plus `harness/built-ins.md` for the cross-harness tool mapping. Skills
say "read the active harness file" instead of naming a Cursor path or slug.
`scripts/detect-harness.sh` names the active one.

That keeps the 34 principle and prose skills byte-identical to upstream, so
rebasing on poteto's updates stays cheap. `scripts/sync-upstream.sh` shows the
drift.

## Manifests

| file | for |
|---|---|
| `.claude-plugin/plugin.json` | Claude Code, Copilot CLI, and Codex's fallback |
| `.claude-plugin/marketplace.json` | self-hosting, so the repo is its own marketplace |
| `.codex-plugin/plugin.json` | Codex, with its `interface` block |
| `.cursor-plugin/plugin.json` | Cursor, unchanged from upstream |

## What was rewritten

- **`skills/setup-pstack/SKILL.md`** — rewritten. Detects the harness first, then
  the models, and writes `~/.pstack/models.md` instead of
  `~/.cursor/rules/pstack-models.mdc`. The new path is harness-independent and
  outside every harness's own config directory, so pstack never rewrites a file
  the user hand-edits.
- **Model slugs** — every hardcoded `gpt-5.6-sol-max` / `grok-4.6-fast-xhigh` /
  `claude-fable-5-thinking-max` / `claude-opus-5-thinking-xhigh` now resolves
  through a role name. Roles are the same names upstream uses.
- **Transcript reads** (`recall`, `reflect`, `show-me-your-work`, `automate-me`,
  the `eval` and `session-pickup` playbooks, `worktree-audit.sh`) — point at the
  harness file. Two harnesses are not a per-workspace jsonl directory at all.
- **Project-skill writes** (`create-verification-skill`,
  `maintain-verification-skill`, `automate-me`) — `.cursor/skills/` became the
  harness's project-local skill path.
- **Subagent vocabulary** — `Task tool` and `subagent_type: generalPurpose` are
  named per harness rather than assumed.
- **Cursor built-ins and `cursor-team-kit`** (`/deslop`, `control-ui`,
  `control-cli`, `create-skill`, `/loop`, built-in babysit) — mapped in
  `harness/built-ins.md`.
- **`name: Poteto Mode` → `poteto-mode`, `name: Comment Sicko` → `comment-sicko`**
  — Claude Code validates skill and agent names as lowercase-hyphen. The
  capitalized upstream names fail to register.

## What does not survive the trip

Four things, stated plainly rather than papered over.

1. **Cross-family model panels.** `arena`, `interrogate`, `architect`, and
   `how`'s critics exist to get disagreement from genuinely different models.
   Claude Code, Codex, and Copilot CLI are each single-family. The panels still
   fan out — four independent reads is most of the value — but four capability
   tiers is not four vendors, and panel agreement is worth less. The skills now
   say so in their own output rather than implying otherwise. Arena's
   cross-judge degrades the most.

2. **Cursor's sticky mode.** `poteto-mode`'s `mode: true` / `reminder` is a
   Cursor concept: the mode stays armed and re-injects its reminder every turn.
   `hooks/poteto-mode-reminder.sh` is a `UserPromptSubmit` equivalent for Claude
   Code and Codex, deliberately **opt-in** and gated on `~/.pstack/armed`. No
   `hooks.json` ships, because a plugin that injects text into every prompt
   without being asked is a bad neighbor. Copilot CLI has no equivalent; type
   `/poteto-mode` per task.

3. **Cloud agents.** Playbooks that detach work to a Cursor cloud agent
   (`orchestrate`, `shipping`, `autopilot-full`, `autopilot-stack`, `swarm`) have
   no true equivalent. Backgrounded local subagents in their own worktrees are
   the substitute, and they die with the session. Where a playbook's value
   depends on durability, it degrades — an overnight run is the clearest case.

4. **`automations/benny/`** is **not ported.** It is an optional sub-pack with
   its own installer that writes `.cursor/automations/benny/` and edits
   `.cursor/settings.json`. It is shipped here unmodified so nothing is lost,
   but it works on Cursor only. Porting it means redoing its setup skill against
   each harness's project-config file, which is a separate job.

## Verified, not assumed

All three installs were run against this tree, and three of the port's decisions
came out of what they reported rather than out of the docs.

- **`"agents"` in `.claude-plugin/plugin.json` is omitted on purpose.** As a
  string it fails validation outright (`agents: Invalid input`). As an array of
  paths it validates and installs — and then registers **zero** agents, because
  declaring it suppresses the auto-discovery that actually works. No key at all
  is the only form that yields `Agents (2)`.
- **Agent files stay `*.md`, not `*.agent.md`.** Copilot CLI's own convention is
  the `.agent.md` suffix, and Claude Code does discover those files — but it
  names an agent from its *filename*, so the suffix produces `poteto-agent.agent`
  and silently breaks every `subagent_type: "poteto-agent"` call in
  `poteto-mode`. Plain `.md` registers correctly on Claude Code, Codex, and
  Cursor. The cost is that Copilot CLI registers the skills but not the two
  agents; they are thin routing wrappers, so the loss is small and the alternative
  breaks the main harness.
- **Codex ingests `disable-model-invocation: true`; its authoring linter rejects
  it.** `plugin-creator/scripts/validate_plugin.py` fails all 39 skills carrying
  the key with "must be false". That is the lint, not the install gate:
  `compound-engineering` ships the same key, fails the same check, and is
  installed and enabled in Codex. `codex plugin add pstack@pstack` succeeds here
  too. The real consequence is behavioral, not fatal — those 39 skills stay
  model-invokable on Codex instead of being user-invoked only.

Install results on this machine:

| harness | command | result |
|---|---|---|
| Claude Code | `claude plugin install pstack@pstack` | 44 skills, 2 agents |
| Codex | `codex plugin add pstack@pstack` | 44 skills, read `.claude-plugin/marketplace.json` |
| Copilot CLI | `copilot plugin install <path>` | 44 skills, 0 agents |

`scripts/validate.sh` re-checks the manifests, every skill and agent name, and
that no Cursor-only path leaked back into `skills/`.

## Copilot CLI specifics

Copilot installs the Claude manifest directly and discovers `skills/` and
`agents/` the same way. Its own agent files use an `.agent.md` suffix; plain
`.md` is still picked up, so `agents/*.md` work unchanged. It has no
per-subagent model override, so `/setup-pstack` writes `inherit-parent` for
every role there.

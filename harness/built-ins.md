# Built-ins and sibling plugins

Upstream pstack calls out to things that ship *with Cursor* or with Cursor's
`cursor-team-kit` plugin. Those calls are not part of pstack and do not travel
with it. This table is what each one maps to elsewhere.

When a skill says "use the built-in X", resolve X here first. If the row says
none, do the work inline and say in your reply that the dedicated tool was not
available — do not silently skip the step, and do not invent a slash command.

| upstream call | Cursor | Claude Code | Codex | Copilot CLI |
|---|---|---|---|---|
| `create-skill` (authoring a SKILL.md) | built-in | `skill-creator` skill | `skill-creator` (system skill) | none — author the file directly |
| `/loop` (wake mechanism) | built-in | `/loop` | `~/.codex/automations/` | none — poll a background job |
| `/deslop` (`cursor-team-kit`) | plugin | none — use pstack's own **unslop** skill | none — **unslop** | none — **unslop** |
| `control-ui` (`cursor-team-kit`) | plugin | none — generate one with `/create-verification-skill` | same | same |
| `control-cli` (`cursor-team-kit`) | plugin | none — generate one with `/create-verification-skill` | same | same |
| built-in babysit | built-in | none — the **Babysit** playbook is the answer | same | same |
| cloud agent | built-in | see "long-running work" in the harness file | same | same |

Two notes worth keeping straight:

- pstack already ships **unslop** and **no-comments**. On every harness but
  Cursor they replace `/deslop` outright rather than supplementing it. The
  upstream text that runs both is a Cursor-only belt-and-braces.
- `control-ui` and `control-cli` are a *generated* artifact everywhere else.
  `/create-verification-skill` writes the project its own equivalent, tailored
  to the repo, which is what those skills are for. That is a better answer than
  a generic driver, and it is the one pstack can actually deliver.

## MCP servers

`why` enumerates the available MCP servers before spawning investigators.
Every harness exposes some list; none of them expose it the same way. Ask for
the tool list you actually have rather than assuming a Cursor-shaped
`available-tools` map, and treat an absent source as a null result to report,
not a reason to stop.

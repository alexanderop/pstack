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
| `/loop` (wake mechanism) | built-in | `/loop` | native wait tools within the session; a scheduling tool only when available and configured | none — poll a background job |
| `/deslop` (`cursor-team-kit`) | plugin | none — use pstack's own **unslop** skill | none — **unslop** | none — **unslop** |
| Website/browser work (including upstream `control-ui` calls) | pstack **browse-web** → `agent-browser` | same | same | same |
| `control-cli` (`cursor-team-kit`) | plugin | none — generate one with `/create-verification-skill` | shell tools, or a generated verification skill | same |
| built-in babysit | built-in | none — the **Babysit** playbook is the answer | same | same |
| cloud agent | built-in | see "long-running work" in the harness file | same | same |

Two notes worth keeping straight:

- pstack already ships **unslop** and **no-comments**. On every harness but
  Cursor they replace `/deslop` outright rather than supplementing it. The
  upstream text that runs both is a Cursor-only belt-and-braces.
- Use [browse-web](../skills/browse-web/SKILL.md) and the installed `agent-browser` CLI for website browsing and live frontend checks. Native desktop surfaces need a separate driver. `/create-verification-skill` packages project-specific launch, fixtures, and scenarios around that browser workflow; automated test suites keep their own runners.

## MCP servers

`why` enumerates the available MCP servers before spawning investigators.
Every harness exposes some list; none of them expose it the same way. Ask for
the tool list you actually have rather than assuming a Cursor-shaped
`available-tools` map, and treat an absent source as a null result to report,
not a reason to stop.

## Bot routines

`make-bot-ui` is included to preserve the upstream skill inventory. Creating a
Grok Bot routine and collecting its sender key require Cursor's `update_state`
and `SendToUser` tools. On Codex, use an existing webhook supplied by the user
or report the missing integration. Keep the key in server-side configuration.
The plugin does not supply these external tools.

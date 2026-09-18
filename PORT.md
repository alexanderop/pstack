# What this port changed

This port tracks [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/71ed0d1/pstack)
at `71ed0d1`, version 0.15.0. It includes the same 47 skills and every upstream
file, plus the local Vue composition principle (48 skills total). The initial
import was `bdf7aa3`, version 0.14.3, recorded as this
repository's first commit. That initial commit is historical, not the current
sync baseline.

## Shared skills, separate harness instructions

The skill names, playbooks, reference files, scripts, and agent instructions
follow upstream. Runtime-specific paths, model choices, tool arguments, and
agent registration resolve through `harness/`. Shared principle and prose
skills remain byte-identical wherever possible.

Run this against an upstream checkout to verify the inventory, versions, and
bundled files, and report the number of unchanged skill entrypoints:

```sh
python3 scripts/check-upstream.py /path/to/plugins/pstack
```

`scripts/sync-upstream.sh` clones current upstream, runs that check, and shows
the port diff. It does not modify this checkout.

The 0.15.0 update includes the two new principles, `make-bot-ui`, shorter
`how` and `why` instructions, removal of `how`'s critique mode, and PR workflows
that use GitHub CLI or Origin without requiring Graphite. Cursor's model
mapping follows the new Fable 5.1 defaults. Other harnesses keep their own
supported model mappings.

## Port adaptations

- `.claude-plugin/` and `.codex-plugin/` provide installation metadata alongside
  upstream's `.cursor-plugin/`. Plugin manifests retain the base version; Codex
  may add a cachebuster suffix.
- `setup-pstack` detects the harness and writes `~/.pstack/models.md`. Skills
  consult that file rather than writing model choices into Cursor rules.
- Delegating skills read the active harness instructions before spawning.
  Codex uses native delegation when available. If a named agent is absent,
  a general-purpose child reads the same bundled agent instruction file.
- Transcript lookups use the active harness's storage and remain scoped to the
  current workspace. Generated Codex skills use `.agents/skills/`.
- Skill and agent frontmatter names match their lowercase directory or file
  names. `make-bot-ui` follows the same convention.
- Existing small-edit routing remains. PR steps run only when the user asks for
  a PR or the established delivery workflow requires one.
- The new testing principle's examples distinguish weak assertions from ones
  that accept `undefined`. For example, `toBeDefined` rejects `undefined`, but
  still does not prove a specific result is correct.

The reusable eval library and local checks are port additions. They do not
change the upstream skill inventory.

## Runtime limits

Model panels use models exposed by the active session. Repeating one model
preserves independent reads, but does not provide cross-family disagreement.
Reports must name that limitation when it applies.

Cursor's sticky mode metadata is not portable. Claude Code and Codex require
explicit invocation. No session-start injection or prompt-reminder hooks ship.
A request to use Poteto throughout a task remains a task-scoped instruction.
The native Codex marketplace preserves this repository's root plugin layout.
`agents/openai.yaml` makes all skills except setup explicit-only on Codex;
routing skills read their leaf instructions directly.
A local background worker is not a durable cloud agent. Map loops and cloud
steps through the active harness and report unavailable capabilities.

`make-bot-ui` is included, but creating Grok Bot routines and collecting keys
requires Cursor's external tools. On Codex it can build against a supplied
webhook and server-side credential configuration. It must report when routine
creation or the live wake cannot be verified. `automations/benny/` remains an
upstream Cursor-only sub-pack.

Codex custom agents use TOML configuration. Bundling `agents/*.md` does not
prove those names registered, so the port supports reading their instructions
through a general-purpose child instead. No user agent configuration is
rewritten during installation.

The upstream `disable-model-invocation` frontmatter remains for other harnesses.
Codex uses its native `allow_implicit_invocation` metadata. Discovery and metadata
checks do not establish end-to-end model behavior.

## Verification

`bash scripts/validate.sh` checks manifests, skill and agent names, and
Cursor-only path leaks. `pnpm check` checks TypeScript. `pnpm test` runs unit
checks and installs this candidate into an isolated Codex environment to
compare the discovered skills with the repository inventory.

Live behavior is a separate check through `pnpm eval:codex` and the acceptance
suites. An installation check does not establish that every workflow runs
correctly on every harness.

For the 0.15.0 sync, all 42 unit and installation tests passed with the direct
Codex 0.153.4 executable. The live `comments.acceptance.test.ts` check also
passed: a child read the bundled Comment Sicko instructions, removed the
redundant comment, and preserved the license, application code, and file scope.
The upstream inventory check, TypeScript check, plugin validation, and
`git diff --check` passed. Other live workflows and harness installs were not
rerun for this update.

## Selective Codex adapter improvements

Adapted from [ScriptedAlchemy/pstack-codex at 594accc](https://github.com/ScriptedAlchemy/pstack-codex/tree/594accc):
Codex invocation metadata, native marketplace packaging, conservative worktree
auditing, and plan-template regression tests. The audit retains Claude Code and
Cursor lookup, uses Codex session ownership metadata, preserves untracked work,
and requires ancestry before suggesting a safe bucket. It reads cached refs;
cleanup still needs fresh verification before deletion.

`pnpm test:helpers` runs the audit fixtures and checks populated plans against the
shipped template. Our small-edit routing, PR authorization boundary, and behavior
evaluations remain. Benny polling and the HTTP bridge were not imported.

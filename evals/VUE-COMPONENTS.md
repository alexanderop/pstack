# Vue component principle comparison

This suite measures whether `principle-compose-vue-components` changes generated Vue code. It compares the same model and prompt with and without the principle. It does not measure automatic skill discovery or the whole pstack plugin.

See [the first pilot](VUE-COMPONENTS-PILOT.md) for generated-code findings, reviewer disagreement, and preserved verification results.

See [the accessibility and naming pilot](VUE-COMPONENTS-ACCESSIBILITY-NAMING.md) for the revised tasks, naming differences, and corrected six-application replay.

## Run the comparison

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
PSTACK_CODEX_BIN=/absolute/path/to/codex PSTACK_VUE_ARTIFACTS=.eval-artifacts/vue-current pnpm eval:vue
PSTACK_VUE_ARTIFACTS=.eval-artifacts/vue-current pnpm eval:vue:pack
```

Use the direct Codex CLI 0.153.4 executable required by the existing adapter. Live runs use the existing Codex login. Ordinary `pnpm test` starts no model calls. The Vue checker unit cases do launch local Chromium.

The default pilot makes six model calls. Use `PSTACK_EVAL_TRIALS=3` for eighteen independent calls. Use `-t dialogs`, `-t avatar`, or `-t task-list` to select one pair. `PSTACK_CODEX_MODEL` changes the model for both conditions. Both use medium reasoning effort and an eight-minute execution limit per attempt. Use a fresh `PSTACK_VUE_ARTIFACTS` directory for each campaign. The live runner, packet generator, and replay command all honor it.

## Tasks and controls

The dialog task requests delete, edit, and share layouts with independent forms. Browser checks activate buttons with Tab and Enter, exercise forward and backward focus containment, and check restoration after closing. An empty name must produce an associated field error. Labels may include a required indicator, and native invalid state is accepted alongside explicit ARIA. The avatar task checks accessible names and reactive initials while retaining a small task where extra abstraction may be unnecessary.

The task-list scenario supplies concrete naming opportunities. Shared styled controls appear in both search and workspace-name forms. Task rows belong to a list, and search action components belong to their search controls. The prompt requests these responsibilities without supplying preferred filenames or prefix rules. Browser checks verify searching, clearing, task completion, accessible checkbox names, and workspace-name changes. The blinded reviewer checks naming from actual component roles and imports.

Each attempt gets a fresh project and isolated Codex home, with no pstack plugin. Both receive the same base `guide.md`. The treatment appends the principle body. The user request explicitly asks the agent to read the guide. Neither request names the comparison or supplies the grading rubric. No application dependencies are installed inside the agent workspace. The host checks generated source in a separate directory with the locked Vue toolchain.

Conditions alternate across tasks and repetitions. Keep the model fixed within each pair to avoid confounding the principle with model choice. Runs are sequential under the existing Vitest concurrency limit. These choices replace the generic eval playbook's different-model parallel candidates.

## Evidence and review

The existing adapter retains source snapshots, requests, settings, fixture hashes, native rollouts, normalized read evidence, and elapsed time. `vue-comparison.json` records condition, repetition, scenario, and hashes of the principle, checker, and dependency lockfile. Application checks require strict Vue type checking and real Chromium interactions. Guide-read evidence is checked separately. Missing recognized read evidence remains unknown until the native transcript is inspected.

`eval:vue:pack` pairs only attempts with matching prompt, model, reasoning, settings, principle revision, repetition, and non-guide fixture hashes. It reports incomplete or ambiguous pairs rather than silently selecting successful runs. Use a separate artifact directory per campaign if repeating the same repetition numbers.

Give a reviewer only the generated `pair-*.json` files. Keep `vue-review-manifest.json` private until the verdict is saved. Packets contain random labels, the user request, behavioral results, source, and six criteria scored from zero to two. They omit the guide, model, condition, and agent explanation. The reviewer scores responsibility and logic, composition, state ownership, proportionality, accessibility, and naming. The maximum score is twelve. A rubric hash separates packets when the criteria change.

Naming review checks one consistent prefix for styled base components, the parent name in tightly coupled children, and general-to-specific word order. It classifies actual component roles first. Feature components do not automatically need a base prefix. Accessibility review includes visible focus and whether composition preserves semantics. Automated checks do not establish complete assistive-technology support. Small inline pure computations are explicitly allowed, addressing the first pilot's reviewer disagreement. Save the verdict alongside the packet before revealing conditions.

Run `pnpm eval:vue:recheck` to check saved implementations again without model calls. Set `PSTACK_VUE_ARTIFACTS` to use another artifact directory. Each replay appends a timestamped result and preserves the original verdict. This is useful after a checker or transcript-parser fix. Tool output containing the complete guide counts as exposure even when the general file-read parser cannot classify a combined command. A later command can fail after the guide has already been returned. Packet labels remain stable when regenerated.

Replay verifies that generated source and guide match their saved originals. Review packets use the latest replay only when its source hash and current checker hash match. The private manifest records that replay and preserves the original status. A newer result for different code cannot replace the original observation.

Replay requires the saved prompt to match the current task contract. Older dialog outputs were never asked to implement required-name validation. They must not be scored as failures of this revised request. Use the campaign directory that matches the current task, or the historical evaluator for older artifacts.

Read every implementation and inspect instruction exposure before interpreting scores. A guide read proves exposure, not application. A passing browser check proves the exercised behavior, not architectural quality. Compare within pairs and preserve failures and ties. A six-call pilot can expose problems but cannot establish a general improvement. The first pilot used an older principle, checker, and ten-point rubric. Do not compare its totals directly with this version.

## Verification

```sh
pnpm check
pnpm test:unit
```

The checker fixtures demonstrate that incomplete applications fail and working reference implementations pass. The evaluator checks observable behavior without requiring a particular component tree.

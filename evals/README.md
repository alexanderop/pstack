# Pstack Codex evals

Run real Codex behavior through Vitest 5 before changing the plugin. The compatibility fixes remain out of scope for this first eval-library change.

See the [measured baseline](BASELINE.md) for results and local evidence from real Codex runs.

Requires Node.js 22.12 or newer, pnpm, Git, and Codex CLI 0.153.4. Live runs also require an existing Codex login in `auth.json`. The library was exercised on macOS with Node 24.20.0 and Vitest 5.0.0.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:unit
pnpm test
pnpm eval:list
pnpm eval:codex
pnpm eval:baseline
```

`pnpm test` runs unit and installation-contract tests without model turns. `pnpm eval:list` lists cases without executing them. `pnpm eval:codex` starts a real native-child smoke test. `pnpm eval:baseline` runs the actual installed comment-review skill and audits a worktree with a recent real Codex session. Live commands use your existing Codex login.

If your `codex` command is a home-dependent shim, set `PSTACK_CODEX_BIN` to the direct executable before running contract or live tests. The evaluator changes HOME deliberately, so a shim can behave differently inside it. An incorrect executable or CLI version fails visibly. `PSTACK_CODEX_MODEL` overrides the suite's `gpt-6-astra` default; reasoning effort is medium. Record model changes as separate baselines.

Live projects are registered only when `PSTACK_LIVE_EVALS=1`. The eval scripts set that flag and use `vitest run`. Ordinary test and watch commands do not start model calls. Retries are disabled, and test workers and concurrent cases are limited to one. To focus a baseline:

```sh
pnpm eval:baseline -t 'recent-worktree'
pnpm eval:baseline -t 'comment-review'
```

Results live in `.eval-artifacts/<timestamp>-<uuid>/`. Vitest annotations print each directory. `transcript.json` contains normalized runtime evidence, `outcome.json` records observed state, `trial.json` contains named graders and checks, and `verdict.json` records the Vitest result. A runtime can complete successfully while its acceptance assertion fails.

The first baseline intentionally remains red for cleanup. A clean, merged worktree is read by real Codex before running the unchanged installed audit script. The assertion requires `verify-recent-chat`; the script currently returns `safe`. Comment review is invoked naturally, without adapter instructions in the test prompt. It passed one completed baseline and failed a later trial because the child did not load the Comment Sicko wrapper, although the output file was correct. Preserve both observations; do not retry away the missing-instruction failure or demand a particular agent name.

The local `origin` used by the cleanup test is a bare repository inside the fixture. No user worktrees are pruned, and the audit does not contact a real remote repository. Candidate plugin files are snapshotted before installation. The tests do not modify production skills, agents, or scripts.

The next step is to change the cleanup implementation, run the same assertion against a fresh candidate, and verify that restoring the old implementation makes it fail again. Do not mark the test as an expected failure, weaken its assertion, or retry until it passes.

See [the reusable package](../packages/agent-eval/README.md) for the API, isolation boundary, evidence format, and current limitations. Existing historical files under `evals/results/` are unrelated and remain untouched.

## Add tasks and trials

Tasks live in `evals/tasks/`; suite registration lives in `evals/tests/`. Start with [comment review](tasks/comment-review.ts): it declares fixture files, a logical skill invocation, the observed file outcome, and named graders. The task imports no Codex APIs. [Worktree setup](fixtures/worktree.ts) keeps Git mechanics out of the [recent-worktree task](tasks/recent-worktree.ts).

`tests/setup.ts` selects the agent harness. Codex is currently the only production adapter. A future Claude Code or Copilot adapter implements the same `AgentHarness` contract; the task definitions and graders stay shared.

```sh
PSTACK_EVAL_TRIALS=3 pnpm eval:baseline -t 'comment-review'
```

This registers three independent trials. Every result is preserved; these are not failure retries. Missing recognized read evidence is `unknown`, which remains non-passing and requires transcript inspection. Grader exceptions are reported as errors rather than agent failures. The real-install probe exposed a valid combined-shell read that the parser could not classify, so a missing read must not automatically be called a missing instruction.

`eval:list` uses Vitest 5's `--no-static-parse` to collect generated suite registrations without executing their test bodies. It selects only eval projects. The full suite and grader terminology is documented in the [package README](../packages/agent-eval/README.md#terminology).

## Realistic poteto-mode tasks

`pnpm eval:realistic` runs three tasks against the installed `poteto-mode` entrypoint in a fresh records-desk application for each trial:

| Task | Independent acceptance checks |
| --- | --- |
| `stale-search` | Complete requests in both orders; reject obsolete rows and errors after success or failure; check repeated queries, separate controllers, retained rows, loading, and recovery. |
| `csv-export` | Invoke the actual CLI; check status filtering, all records, empty results, quotes, commas, newlines, Unicode, and existing list behavior. |
| `help-text` | Check actual CLI help output, correct the help source exactly, and reject unrelated file changes. |

Run a pilot with three independent trials per task:

```sh
PSTACK_EVAL_TRIALS=3 pnpm eval:realistic
```

Use `-t 'stale-search'`, `-t 'csv-export'`, or `-t 'help-text'` to select one task. The existing direct-executable and model overrides also apply. Ordinary `pnpm test` does not run these model calls. Engineering tasks allow ten minutes of agent execution; the help task allows three minutes. Vitest allows eleven minutes per trial for setup and collection. No failure retries run.

The fixture lives in `fixtures/records/`. It uses Node without downloaded application dependencies. The prompts state user goals and invoke poteto-mode without spelling out its internal workflow. A separate grader checks native skill injection or a recognized root read of the installed mode. Missing evidence remains `unknown`; inspect the native transcript before diagnosing an instruction-loading failure. Codex can inject a skill body directly, so a file read is not required when that injection is recorded.

The acceptance check programs live in `checks/`, outside the seeded agent workspace, and run after the agent finishes. They exercise the resulting application rather than trusting agent-authored tests or final claims. This is filesystem separation, not a security boundary against hostile code. `records.unit.test.ts` verifies that the original application fails, complete reference solutions pass, and incomplete solutions fail. These deterministic checks establish grader behavior, not agent capability.

The realistic suite measures the current poteto-mode candidate. Use the comparison suite below to compare routing variants and plain Codex. Neither suite estimates token cost, judges delegation quality, or establishes multi-turn persistence. A passing trial alone does not establish that poteto-mode improves on plain Codex.


## Compare routing and overhead

```sh
pnpm eval:compare
PSTACK_EVAL_TRIALS=3 pnpm eval:compare
pnpm eval:report
```

The comparison runs the same task definitions and behavioral graders in three conditions:

- `plain`: fresh Codex state, no candidate files exposed, no plugin installed, and the task instruction without a skill invocation. Discovery rejects foreign non-system skills.
- `control`: the plugin from the exact Git revision in `comparison/control.json`, before the routing changes. Each trial extracts that revision into temporary storage and records its hashes and revision.
- `revised`: the plugin in the current checkout, snapshotted before installation.

The model, reasoning effort, task files, permissions, and timeouts stay the same. The plugin conditions explicitly invoke poteto-mode. Mode activation is checked separately from application behavior. Conditions rotate across tasks and repetitions to reduce order bias. The default is one attempt per condition and task, nine model calls total. Use `-t help-text` for a three-call routing check. Independent repetitions are not failure retries.

`metrics.json` records elapsed milliseconds around `session.run`, including discovery and transcript collection but excluding initial fixture creation. It also records completed transcript child counts, shell-command counts, failed or incomplete commands, recognized skill-file reads, and successful shell commands containing the opening-a-PR playbook path. These are observations, not quality scores. File-read counts depend on parser coverage; command counts exclude non-shell tools. No token or monetary cost is inferred.

`eval:report` reads saved comparison artifacts and emits JSON with every recorded attempt, overall and behavioral pass counts, and median elapsed time. It keeps different models, reasoning efforts, fixture hashes, and candidate hashes in separate groups. A run that fails before producing `trial.json` is not included; inspect Vitest's result for setup failures and interrupted runs. Raw artifacts remain unchanged. Pass the artifact root as an argument to report on another directory.

The revised mode routes mechanical edits directly through locate, edit, and output verification. PR steps run only when requested or required by the established delivery workflow. The comparison measures those changes; delegation rules for engineering work remain unchanged.

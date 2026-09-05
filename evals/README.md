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

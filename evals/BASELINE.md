# Codex baseline — 2026-09-05

Tested the unchanged pstack candidate from `597c3a8` with Vitest 5.0.0, Codex CLI 0.153.4, Node 24.20.0, and `gpt-6-astra` at medium reasoning effort on macOS. These observations establish regression targets; they do not establish complete Cursor parity.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Unit and installation contracts | 22 passed; clean installation discovered 44 skills |
| Real native child | Passed; child read the fixture and executed the expected Node runtime |
| Recent Codex worktree protection | Failed; audit returned `safe`, expected `verify-recent-chat` |
| Installed comment-review skill | Latest run passed; an earlier completed run produced the correct edit but skipped the child reviewer wrapper |

The final live suite had two passing tests and one failing test, with retries disabled. The cleanup failure remains an ordinary failing assertion. Production skills, agents, and audit scripts have not been changed.

## Reproduce

This machine's usual `codex` command is a home-dependent shim. Set the direct executable before running the contract and live tests:

```sh
export PSTACK_CODEX_BIN='/Users/alexanderopalic/.vite-plus/packages/@openai/codex/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex'
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm eval:codex
pnpm eval:baseline
```

On another machine, use its direct Codex CLI 0.153.4 executable. Live runs require an existing login and consume model usage. The fixtures supply isolated login-shell profiles so their shell retains the Node runtime running Vitest.

## Local evidence

Artifacts are ignored by Git and remain in this checkout. Each trial includes the candidate snapshot, runtime evidence, resulting files, and an independent Vitest verdict.

- [Final live suite report](../.eval-artifacts/verification-2026-09-05T08-59-23-458Z.json)
- [Native child pass](../.eval-artifacts/2026-09-05T09-00-42.217Z-767d0206-3e35-41c3-b58e-a0ecf2871932/verdict.json)
- [Cleanup failure](../.eval-artifacts/2026-09-05T09-00-22.208Z-738ea082-70a1-4034-9207-57a62f1643e3/verdict.json)
- [Latest comment-review pass](../.eval-artifacts/2026-09-05T08-59-24.000Z-a5c58f7a-2816-4985-ae0a-b89460ec3d61/verdict.json)
- [Earlier missing-wrapper failure](../.eval-artifacts/2026-09-05T08-54-31.192Z-ebe198e9-86f7-42b5-9f86-22f8fa66e8c1/verdict.json)

Comment review needs repeated trials before claiming reliability. Its mixed outcomes are preserved rather than hidden through retries. The read-evidence adapter's coverage limits are documented in the [package README](../packages/agent-eval/README.md).

## Task and grader refactor verification

The subsequent Vitest 5 refactor passed TypeScript and 30 unit/installation checks. A deterministic second adapter exercised the shared suite runner with two independent trials; it does not establish Claude Code or Copilot support.

The final real Codex run passed native-child execution and comment review. Worktree protection remained red with `safe` instead of `verify-recent-chat`. See the [local final report](../.eval-artifacts/readable-evals-final.json). An earlier refactor trial recorded the correct comment edit as passing and the unrecognized wrapper read as `unknown`, preserving the distinction between outcome success and insufficient transcript evidence.

Tasks now live under `evals/tasks/`; named graders save separate checks in `trial.json`. Repeated trials are explicitly registered with `PSTACK_EVAL_TRIALS`; failure retries remain disabled. Production plugin files are unchanged.

## Records-desk pilot

The first realistic pilot used the same Codex CLI and model settings above. All three resulting applications passed their behavioral checks. The initial suite reported all three trials as `unknown` because its mode-activation grader required a file read. Native rollouts show that Codex injected the complete poteto-mode skill directly into each root conversation.

The adapter now records native injected skills separately from file reads. Regrading copies of the saved workspaces with the corrected activation grader passed all three tasks. Original verdicts remain unchanged. These regrades are reassessments of the same attempts, not new trials or evidence of repeatability.

| Task | Initial trial duration, including setup and collection | Regrade |
| --- | --- | --- |
| Stale search | 201 seconds | [Passed](../.eval-artifacts/records-regrade-5yJ8ZC/regrade.json) |
| CSV export | 156 seconds | [Passed](../.eval-artifacts/records-regrade-WiIYEn/regrade.json) |
| Help text | 46 seconds | [Passed](../.eval-artifacts/records-regrade-fIfk4D/regrade.json) |

The help task makes overhead visible even when the edit is correct. This pilot has no plain-Codex comparison, so it does not establish a benefit from poteto-mode.

A fresh help-text trial passed end to end with the corrected adapter and CLI-output check. [Live verdict](../.eval-artifacts/2026-09-05T11-34-30.664Z-35d6acad-cfc1-4cf3-b58c-d6f198e18212/verdict.json). TypeScript and all 38 unit and installation checks passed.

## Routing comparison pilot

One independent attempt per condition and task passed, nine of nine overall. The control is pinned to `18f794ce65a21e0f6bca2845a831993ece6fe8a7`; revised mode uses the current local routing edits. Each condition used one consistent candidate hash across its tasks.

| Task | Plain Codex | Control mode | Revised mode |
| --- | --- | --- | --- |
| stale-search | 82.5 s | 166.2 s | 164.5 s |
| csv-export | 77.7 s | 132.9 s | 144.8 s |
| help-text | 28.2 s | 43.2 s | 34.3 s |

Time wraps the adapter run, including skill discovery and transcript collection. These single observations do not establish a stable speed difference. Plain Codex was faster on both engineering tasks with the same behavioral acceptance criteria. Revised mode did not show an engineering-task speed benefit.

The revised help trial read no supporting skill files, spawned no children, and verified the actual CLI output. Inspection of its complete command list confirmed the short route. Neither plugin condition read the PR playbook in this comparison; earlier pilot trials did, so this run alone does not establish the effect of the PR-routing change.

[Full comparison report](../.eval-artifacts/routing-comparison-20260905T120012Z.json) retains per-trial correctness, workflow observations, hashes, and artifact paths. TypeScript, all 42 unit and installation checks, and plugin validation passed.

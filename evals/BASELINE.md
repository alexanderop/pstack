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

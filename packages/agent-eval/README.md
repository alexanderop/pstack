# Agent eval

A private TypeScript package that runs real Codex sessions from Vitest 5. It owns disposable workspaces, plugin installation, decoded thread evidence, subprocess cancellation, and immutable artifacts. Vitest owns test selection and assertions.

```ts
import { codexTest } from '@pstack/agent-eval/vitest'

const test = codexTest({
  candidate: {
    root: '/path/to/plugin',
    entries: ['.codex-plugin', '.claude-plugin', 'skills', 'agents', 'harness'],
    name: 'example',
    marketplace: 'example-marketplace',
  },
  artifactRoot: '/path/to/results',
  files: { 'README.md': 'A fixture.\n' },
  model: 'gpt-6-astra',
  reasoningEffort: 'medium',
})

test('the skill performs its task', async ({ codex, expect, annotate }) => {
  await annotate(codex.artifacts.path)
  const run = await codex.run('Use $example:my-skill to inspect README.md.')
  expect(run.status).toBe('completed')
  expect(run.changedPaths).toEqual([])
})
```

Each fixture permits one root conversation. Native children belong to that conversation and are collected through their parent IDs. Create another fixture for another trial. `discover()` checks installation without starting a model turn. `command()` runs a real external verification command in the fixture and records its output and exit code. `workspace.read()` and `workspace.changes()` inspect the resulting files.

The adapter currently requires Codex CLI 0.153.4. New runtime versions fail the version check until their protocol is verified. Pass `executable` when a command shim depends on the original home directory. Models and reasoning effort are caller settings; omitting them uses the isolated runtime's defaults. The pstack suite pins Astra/medium for reproducibility.

`codex.run()` returns `completed`, `cancelled`, `timed-out`, or `infrastructure-failure`. A completed run is not a passing eval: the Vitest assertions determine the verdict. Failures retain execution and any collected evidence. Discovery, malformed protocol data, and incomplete child threads fail rather than becoming empty successful results.

Only successful runtime command actions classified as reads contribute read evidence. Agent messages, echoed paths, failed commands, and truncated output do not establish a read. This initial adapter does not recognize every possible file-access tool or prove that every byte was read. Tests requiring a complete file should also compare the captured output with its expected contents. Unknown evidence should never be treated as proof.

Each artifact directory contains candidate and fixture hashes, the candidate snapshot, command results, the request, process output, decoded root and child threads, source rollout records, resulting workspace, normalized evidence, and a Vitest `verdict.json`. Setup failures receive their own artifact. JSON files use exclusive creation and cannot overwrite earlier evidence. To regrade parser behavior without model calls, pass a saved `thread-*.json` object's `thread` field to `readEvidence` from `@pstack/agent-eval/evidence`. A full regrade CLI and LLM judges are not implemented.

The fixture uses a separate home, Codex state, candidate cache, and Git repository. Discovery rejects personal or unrelated plugin skills. Login uses a temporary link to the existing Codex `auth.json`; credentials are not copied into artifacts. Fixture teardown removes the temporary directory and authentication link. Cancellation terminates the owned process group, including descendants, on the tested macOS runtime. Windows process-tree cleanup is not supported by this initial adapter.

This is filesystem convenience isolation, not a security sandbox for hostile agents or code. Codex's own permission mode controls model-driven file access. The suite runs one test at a time; independently launched test processes have separate state but do not share a concurrency budget. Snapshot inputs are selected explicitly, and nested `node_modules` and `.git` directories are omitted. Fixture files are committed before execution so changes and deletions remain inspectable.

# Agent evaluations with Vitest 5

Write a task once, then run independent trials through an agent-harness adapter. Vitest handles registration, selection, assertions, timeouts, and reporting. Codex is the only implemented production adapter.

## Write a task

```ts
import { defineTask, equal } from '@pstack/agent-eval'

export const removeComment = defineTask({
  id: 'remove-comment',
  description: 'Remove a redundant comment without changing the code',
  files: {
    'answer.js': '// Return the answer.\nexport const answer = 42;\n',
  },
  prompt: agent => agent.skill('no-comments',
    'remove the redundant comment in answer.js. Do not change other files.'),
  async observe({ environment }) {
    return {
      source: await environment.read('answer.js'),
      changedPaths: await environment.changes(),
    }
  },
  graders: {
    'Correct edit': ({ outcome }) => [
      equal('Application code preserved', outcome.source, 'export const answer = 42;\n'),
      equal('Only requested file changed', outcome.changedPaths, ['answer.js']),
    ],
  },
})
```

A task owns its fixture, prompt, outcome observation, and success criteria. Optional `setup` prepares more complex environments, such as a merged Git worktree. Keep setup mechanics in a fixture helper when they obscure the task. `observe` reads actual environment state after the agent finishes; the agent's final message is not the outcome.

## Register a suite

```ts
import { evaluationSuite } from '@pstack/agent-eval/vitest'
import { codexHarness } from '@pstack/agent-eval/codex'
import { removeComment } from './tasks/remove-comment.js'

evaluationSuite({
  name: 'Plugin capabilities',
  agentHarness: codexHarness({ model: 'gpt-6-astra', reasoningEffort: 'medium' }),
  candidate: {
    root: '/path/to/pstack',
    entries: ['.codex-plugin', '.claude-plugin', 'skills', 'agents', 'harness', 'scripts'],
    name: 'pstack',
    marketplace: 'pstack',
  },
  artifactRoot: '/path/to/artifacts',
  trials: 3,
  tasks: [removeComment],
})
```

Each task/trial pair becomes a separate Vitest test with a fresh session and environment. Multiple graders run even if one fails. Multiple checks appear separately in Vitest's failure report. `unknown` and grader errors also make the test non-passing, but retain their distinct statuses in `trial.json`. A passing edit cannot hide missing reviewer evidence.

Trials are deliberate repeated attempts, not retries after a failure. This package reports every trial and its checks; it does not yet aggregate pass@k or pass^k, estimate reliability, or support weighted scoring. All checks must pass for the trial to pass. Individual checks preserve partial success for review.

## Terminology

These names follow Anthropic's [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).

| Term | Meaning here |
| --- | --- |
| Task | One input scenario and its success criteria, defined with `defineTask` |
| Trial | One attempt at a task in a fresh environment |
| Grader | A named function assessing an aspect of the outcome or transcript |
| Check | One assertion within a grader, with pass, fail, or unknown status |
| Transcript | The trial's recorded interactions, including the root and child sessions |
| Outcome | Observed final environment state, such as file contents or audit results |
| Evaluation harness | This library together with Vitest, running and grading trials |
| Agent harness | Codex, or a future Claude Code/Copilot adapter plus its model |
| Evaluation suite | A named collection of tasks registered with `evaluationSuite` |

`transcript.json` is the normalized view used by graders. The full native records remain separate artifacts; the normalized view is not the complete trace. `outcome.json` stores task-selected observations. `trial.json` records named graders and checks; `verdict.json` records Vitest's outcome. The Codex adapter also retains prompts, settings, hashes, process output, candidate snapshots, decoded threads, source rollouts, and resulting workspace files.

## Add an agent harness

Implement `AgentHarness` from `@pstack/agent-eval`, then pass it as `agentHarness` when registering the existing tasks. The adapter owns:

1. Creating isolated state and installing the candidate using that harness's supported mechanism.
2. Rendering a logical skill name through `session.skill(name, instruction)`.
3. Starting the agent with the requested model, permissions, timeout, and cancellation signal.
4. Saving native transcripts and normalizing root/child execution evidence into `Transcript`.
5. Exposing the installed plugin path and environment operations, then disposing the session.

Keep authentication, CLI flags, SDK schemas, and cache directories inside the adapter. The shared workspace does not set Codex state or authentication. See `src/types.ts` for the contract and `codexHarness` for the current adapter. The scripted adapter in `test/suite.unit.test.ts` proves the evaluation harness can run independently of Codex; it is a deterministic contract test, not evidence of Claude Code or Copilot support.

An adapter must report unsupported operations and missing/incomplete transcripts as errors. It must not silently substitute another harness or fabricate tool evidence. Add real installation and execution contracts before claiming a new adapter works.

## Evidence and isolation limits

Use outcome graders wherever possible. Add transcript graders when the behavior itself matters, such as loading a required reviewer wrapper. `observedRead` accepts successful recognized reads; absent evidence is `unknown`. A combined shell command may contain a valid read but be classified as `unknown` by Codex. Inspect native command output before treating that as an agent failure. Echoed paths and agent self-reports are not read evidence.

Only code-based graders are implemented. Model-based judges, human-review tooling, a regrade CLI, and aggregate metrics are future work. The existing evidence parser can regrade a saved decoded thread offline through `@pstack/agent-eval/evidence`.

The Codex adapter requires CLI 0.153.4 and an existing `auth.json`. Pass `executable` if a command shim depends on HOME. It links authentication into temporary state and removes the link during disposal. Credentials are not copied into artifacts. Each trial permits one root conversation and collects its descendants by parent ID.

The environment provides filesystem convenience isolation, not a security sandbox for hostile code. Codex permissions control model-driven access. The pstack suite limits workers/concurrency to one and disables retries; independent Vitest processes do not share a concurrency budget. Process-tree cancellation is tested on macOS, not Windows. This is a private package with TypeScript source exports.

The Codex adapter also records `injectedSkills` on normalized threads when native rollout user messages contain complete skill envelopes. This is separate from command-based file-read evidence. Adapters that do not expose native injection may omit the field. Agent self-reports, tool output, and ordinary mentions are not recognized as injected skills.


Pass `plugin: 'none'` to `codexHarness` for a plain-Codex control. It leaves candidate storage empty, checks the pinned CLI version, rejects non-system discovered skills, and renders `session.skill` as the instruction alone. Calling `pluginFile` in this condition fails explicitly. Candidate metadata remains required by the shared session contract, but its files are not copied or installed.

Tasks save `metrics.json` separately from grader results. Elapsed time wraps `session.run`; shell command and child counts come from the normalized transcript. They remain available when execution returns a non-completed status. A thrown adapter error can prevent metrics collection. These observations do not imply useful delegation or successful verification.

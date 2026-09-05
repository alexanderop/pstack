import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    retry: 0,
    maxWorkers: 1,
    maxConcurrency: 1,
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    projects: [
      { test: { name: 'unit', include: ['packages/**/*.unit.test.ts', 'evals/**/*.unit.test.{ts,mjs}'] } },
      { test: { name: 'contracts', include: ['evals/tests/*.contract.test.ts'], testTimeout: 60_000 } },
      ...(process.env.PSTACK_LIVE_EVALS === '1' ? [
        { test: { name: 'comparison', include: ['evals/tests/*.comparison.test.ts'], testTimeout: 660_000 } },
        { test: { name: 'realistic', include: ['evals/tests/*.realistic.test.ts'], testTimeout: 660_000 } },
        { test: { name: 'live-codex', include: ['evals/tests/*.live.test.ts'], testTimeout: 240_000 } },
        { test: { name: 'acceptance', include: ['evals/tests/*.acceptance.test.ts'], testTimeout: 240_000 } },
      ] : []),
    ],
  },
})

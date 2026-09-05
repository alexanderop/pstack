# Recorded evidence

`comment-review.json` is a reduced real Codex CLI 0.153.4 thread captured on September 5, 2026. It retains the successful `commandExecution` item that read pstack's Comment Sicko wrapper, including Codex's `commandActions`, output, exit code, and completed turn status.

Filesystem prefixes are normalized to `/fixture`. The parser tests also supply counterexamples for messages claiming reads, echoed paths, failed commands, truncated output, and null command-action paths. Those counterexamples are grader inputs, not mocked Codex executions. Live tests execute the real CLI separately.

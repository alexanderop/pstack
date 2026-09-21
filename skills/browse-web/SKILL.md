---
name: browse-web
description: "Browse websites, interact with forms, capture screenshots, and verify frontend behavior using the active harness's browser driver. Applies to local and remote websites; existing automated test suites keep their runners."
---

# Browse and verify websites

Select the browser driver below for website browsing, rendered-page inspection, interaction, screenshots, and live frontend verification. Read project-local verification instructions for launch, fixtures, and acceptance scenarios, and use this skill as the browser driver. Explicit user tool choices and host requirements take precedence. Search tools may discover URLs; APIs and CLIs may handle non-browser operations. Keep existing Vitest Browser Mode, Playwright, and Cypress regression suites.

## Select the driver

Identify the active harness using [the harness instructions](../../harness/README.md).

- **Codex:** inspect the tools exposed to the current session first. If the Computer Use runtime (for example, `mcp__cua_repl`) is callable, use it. If the accompanying `computer-use:computer-use` skill is also available, read and follow it before interacting. If the runtime is callable but the skill is absent, initialize the runtime once and follow the documentation it returns. The callable runtime is authoritative: do not report Computer Use as unavailable or uninstalled solely because its skill is missing from the skill catalog. Conversely, a skill file on disk does not establish runtime availability.
- **Other harnesses, or Codex without a callable Computer Use runtime:** use the `agent-browser` workflow below. On Codex, fall back only when the runtime is absent or fails to initialize, and state that concrete failure rather than inferring installation state. If the user explicitly requires Computer Use, report the blocker instead of substituting another driver. Do not use fallback to bypass a permission denial.

Keep these states distinct when diagnosing Codex: plugin installation, skill availability, and runtime/tool availability. One does not prove the others.

For Computer Use, start the app with the repository's documented command, identify the intended browser/app and URL, exercise the user journey, and inspect the resulting state and screenshots. Record expected and observed results and retain evidence. Reproduce defects before editing and repeat the same path afterward. Check persistence, responsive layout, and keyboard/focus behavior when relevant. A shared desktop is not an isolated browser session: serialize UI interaction and avoid unrelated tabs, windows, and user data. Clean up only resources created for this run, following the Computer Use skill's confirmation rules. Electron and native desktop UI can use this driver without requiring CDP.

The remaining CLI commands apply only when `agent-browser` is selected.

## Start an agent-browser session

Check `command -v agent-browser` and `agent-browser --version`. Read `agent-browser <command> --help` for unfamiliar flags; use `agent-browser doctor` for launch or dependency failures. The CLI is an external prerequisite, not bundled with pstack. If unavailable, report the concrete blocker; do not silently switch browser drivers or claim verification passed.

Use a named session from the first command. Choose a unique task/run name and pass `--session` on every command, including cleanup; independent workers need different names. A worktree-derived session ID alone does not separate concurrent runs in the same checkout. Do not attach to an unrelated browser or reuse a personal profile by default.

For local apps, start the repository's documented dev/preview command and confirm the expected URL and build are ready. Isolate app ports and data as well as browser state. For remote websites, navigate directly within the user's task scope.

```bash
agent-browser --session pstack-example-run open http://127.0.0.1:4173
agent-browser --session pstack-example-run snapshot -i
```

The example session and URL are illustrative: use the current run's name and actual app URL.

## Drive and observe

Use `snapshot -i` to discover interactive elements, then semantic locators or refs from that snapshot. Use a full `snapshot` or `get text` when reading non-interactive page content or checking results. Refresh snapshots after navigation or changes to the page before reusing refs.

```bash
agent-browser --session pstack-example-run find role textbox fill "Release checklist" --name "Title" --exact
agent-browser --session pstack-example-run find role button click --name "Save" --exact
agent-browser --session pstack-example-run wait --text "Saved"
agent-browser --session pstack-example-run snapshot
```

Wait for the expected visible state, URL, or element rather than arbitrary sleeps. For defects, reproduce the failure before editing and repeat the same path after the fix. Use real clicks, typing, scrolling, and keyboard input. Do not use JavaScript event dispatch or internal state setters to bypass the behavior being verified. Read-only `eval` may help diagnose DOM state but does not substitute for user interaction.

For Electron's web renderer, use an explicitly identified app-owned CDP endpoint with a named session and `--pin-tab`; shared CDP sessions isolate tab selection, not cookies or storage. Native desktop controls need their own driver. Never close an unrelated session to resolve a daemon version mismatch.

## Evidence and cleanup

Choose an artifact directory outside disposable app data and create it before capture. Record the URL, scenario, actions, expected result, and observed result. Check persistence through reload or a second user-facing view when the claim includes persistence.

```bash
mkdir -p artifacts/browser-check
agent-browser --session pstack-example-run snapshot > artifacts/browser-check/result.txt
agent-browser --session pstack-example-run screenshot artifacts/browser-check/result.png
```

Open and inspect screenshots before claiming appearance is correct. Check relevant desktop and narrow viewports for responsive changes, and keyboard/focus behavior when affected. A screenshot file or accessibility snapshot alone does not prove the whole journey.

Use `screenshot --if-changed` for repeated inspection when supported (0.38+). An unchanged capture returns no new image path: retain and inspect the previous artifact. Use an ordinary screenshot for the final evidence file. For motion or timing claims, check `record --help` and capture video when useful; do not require recording for every task.

Close only the browser session and app processes this run started, including after failure. Keep evidence files and report any unverified paths or blockers alongside the results.

```bash
agent-browser --session pstack-example-run close
```

CLI reference: [commands](https://agent-browser.dev/commands), [snapshots](https://agent-browser.dev/snapshots), [sessions](https://agent-browser.dev/sessions).

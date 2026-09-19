---
name: browse-web
description: "Use the agent-browser CLI to browse websites, read rendered pages, interact with forms, capture screenshots, and verify frontend behavior in a live browser. Applies to local and remote websites; existing automated test suites keep their runners."
---

# Browse and verify websites

Use Vercel's `agent-browser` CLI for website browsing, rendered-page inspection, interaction, screenshots, and live frontend verification across pstack's harnesses. Read project-local verification instructions for launch, fixtures, and acceptance scenarios, and use this skill as the browser driver. Explicit user tool choices and host requirements take precedence. Search tools may discover URLs; APIs and CLIs may handle non-browser operations. Keep existing Vitest Browser Mode, Playwright, and Cypress regression suites.

## Start a session

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

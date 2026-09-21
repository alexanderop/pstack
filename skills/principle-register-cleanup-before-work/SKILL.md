---
name: principle-register-cleanup-before-work
description: "Apply when a test acquires a resource that must be released, such as a server, socket, timer, subscription, temporary directory, database, or browser context. Register cleanup immediately after acquisition, before assertions or any other work that can throw."
disable-model-invocation: true
---

# Register Cleanup Before Work

When a test acquires a resource, make its cleanup inevitable before doing anything that can fail. Never place the only cleanup call after an assertion, because a rejected assertion skips the call and leaks the resource.

**Why:** Failure is the path on which cleanup matters most. A leaked server, socket, timer, subscription, file handle, database, or browser context can slow the suite, keep the process alive, exhaust resources, or contaminate later tests with shared state.

**The rule:** Acquire the resource, immediately bind its cleanup to lexical scope or register it with the test framework, then configure it, exercise the subject, and assert. Keep setup local to the test so its prerequisites and ownership remain visible.

Prefer cleanup owned by the resource:

```ts
test("responds to a client connection", async () => {
  await using server = createTestServer()

  server.instance.get("/message", messageHandler)
  await server.instance.listen()

  await expect.poll(readMessage).toBe("hello")
})
```

Implement synchronous cleanup with `Symbol.dispose` and asynchronous cleanup with `Symbol.asyncDispose`. `using` and `await using` run disposal when control leaves the lexical scope, including abrupt exits caused by thrown errors or rejected assertions. If creating the resource also returns a promise, await both operations: `await using resource = await createResource()`.

When the resource cannot be disposable, register cleanup immediately with the narrowest framework hook that guarantees it after the current test:

```ts
test("responds to a client connection", async ({ onTestFinished }) => {
  const socket = new WebSocket(url)
  onTestFinished(() => socket.close())

  await expect.poll(readMessage).toBe("hello")
})
```

Use suite-level hooks only for resources that are genuinely shared by that suite. Do not move per-test setup into nested `describe`, `beforeEach`, or `afterEach` blocks merely to obtain cleanup; that hides prerequisites and broadens mutable scope. Do not rely on garbage collection or a final statement in the test body for deterministic release.

**The test:** If the next line throws, is every resource acquired so far still guaranteed to be released? If not, register its cleanup before continuing.

**Source:** Artem Zakharchenko, [Better Test Setup with Disposable Objects](https://www.epicweb.dev/better-test-setup-with-disposable-objects).

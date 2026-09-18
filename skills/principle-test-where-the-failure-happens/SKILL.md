---
name: principle-test-where-the-failure-happens
description: "Apply when planning frontend features, fixing UI regressions, or choosing frontend test coverage. Plan observable scenarios, test UI in a real browser, and share page objects and data factories across test layers."
disable-model-invocation: true
---

# Test Where the Failure Happens

Choose the smallest test setup that includes the real behavior and dependencies needed to expose the defect. Default to a real browser for UI behavior. Plan the observable outcome before choosing the test layer.

**Why:** A green test is useful only when the relevant user-facing failure would make it red. Mocking the browser behavior under test can remove the failure you need to detect. Shared page objects and factories keep tests consistent without duplicating the application implementation.

**The pattern:**

- **Plan in Given/When/Then.** Before implementing a frontend behavior, write concrete acceptance scenarios in user language: Given the starting state, When the user acts, Then the observable result. Include meaningful failure and recovery paths. Assign each scenario to the smallest environment that can expose its failure. Use Gherkin as planning vocabulary; executable `.feature` files and Cucumber are optional, not required infrastructure.
- **Pure logic in Node.** Use Vitest for calculations, validation, transformations, and state transitions that do not need browser behavior. Cover meaningful edge cases without mounting UI. Do not extract component-local behavior solely to reach private state from tests.
- **UI in a real browser.** Default to Vitest Browser Mode with Playwright and the framework's rendering helper (`vitest-browser-vue` for Vue). Include relevant production CSS. Prefer this over jsdom or happy-dom for UI component tests. Do not mock layout, focus, or pointer APIs to simulate the browser behavior being tested.
- **Center coverage on user flows.** Render real components together with the routing and state management the scenario needs. Use semantic locators and realistic interactions; await observable results with the runner's retrying assertions. Test public outcomes rather than private component state, child stubs, or internal call sequences.
- **Share page objects across runners.** Keep a single page-object implementation for the same UI in Vitest Browser Mode and Playwright tests. Put semantic locators and named user actions there. Inject a minimal, typed query/action interface or compatible query root; use thin runner adapters where APIs differ. Vitest's browser `page` is not Playwright's `Page`: do not cast one to the other or import Node-only Playwright runtime code into browser tests. Keep mounting, navigation setup, network setup, and runner-specific assertions outside the shared object. Preserve native locator types for retrying assertions. Avoid duplicate page-object classes per runner and generic wrappers around every browser API. Verify shared objects through representative scenarios in both runners when introducing or changing them.
- **Use test-data factories.** Share typed factories such as `aProduct({ price: 25 })` across unit, browser, and E2E tests. Give them valid, deterministic defaults and explicit scenario overrides. Return fresh objects, including nested mutable data, on every call. Keep database seeding separate from data creation. Distinguish data factories from a `createTestApp` setup helper and from page objects. Write expected results independently of the production calculation under test.
- **Mock external boundaries deliberately.** Use MSW for controlled network responses while keeping application behavior real. Cover relevant loading, empty, error, and recovery states. Mocked responses prove frontend handling; verify provider compatibility separately when drift matters. Use real browser persistence when persistence is the behavior under test, with isolated data and cleanup.
- **Check behavior, accessibility, and appearance separately.** Combine behavioral assertions with keyboard/focus checks, relevant ARIA assertions, and axe audits. Add reviewed screenshot comparisons for important visual contracts. Semantic queries and axe support accessibility verification but do not prove complete accessibility. Review intentional baseline changes; do not automatically approve diffs to obtain green tests.
- **Keep application-boundary tests.** Use Playwright against the built application for critical journeys involving startup, hydration, server integration, or persistence across reloads. Include the real boundary being claimed. Sharing a page object does not mean duplicating every scenario across both runners.
- **Prove the test catches the defect.** For regressions, reproduce the failure before fixing it. Do not force interactions past obstructions or replace real behavior with permissive mocks to make a test pass. Allocate coverage by risk instead of fixed percentages. Lint and type checks complement runtime tests.

**Example planning scenario:**

```gherkin
Scenario: Retry a failed purchase without losing the cart
  Given my cart contains one product priced at 25 euros
  And the checkout service is temporarily unavailable
  When I submit my order
  Then I see a checkout error
  And my cart still contains that product
  When the service recovers and I retry
  Then I see an order confirmation for 25 euros
```

The product comes from a shared data factory. Both runners use the same checkout page object for user actions. A Browser Mode test controls the failure with MSW; a separate Playwright journey checks the required built-application boundary. Each test retains explicit assertions about its own promised outcome.

**The test:** If this feature broke for a user, would this test fail? Does the setup include what could cause that failure? Can both browser runners reuse the same UI vocabulary and data factories without hiding their different boundaries?

**Sources:** [What Should a Green Test Prove?](https://alexop.dev/posts/what-should-a-green-test-prove-vitest-browser-mode/), [Vue 3 Testing Pyramid](https://alexop.dev/posts/vue3_testing_pyramid_vitest_browser_mode/), [Modern Frontend Quality Pipeline](https://alexop.dev/posts/modern-frontend-quality-pipeline/), and [Vitest browser context](https://vitest.dev/api/browser/context.html). The requirement to share page objects across runners is a project convention; the APIs are not interchangeable.

---
name: principle-keep-the-application-independent
description: "Apply when application workflows interact with UI, storage, network services, or external tools. Let the application own both port contracts, supply adapters externally, and prove behavior with test dependencies."
disable-model-invocation: true
---

# Keep the Application Independent

Make application behavior runnable without its production UI, database, or external services.

**Own both sides of the boundary.** Driving ports define the operations callers can invoke. Driven ports define the capabilities the application requires from dependencies. The application owns both contracts and expresses them in domain terms. Ask for available appointments, not SQL rows. Keep framework, transport, and storage types outside these contracts.

**“Adapters are outside.”** UI handlers call application operations. Database and service adapters implement the contracts the application requires. Adapters depend on application contracts; the application must not import their implementations. Keep business decisions inside the application and technology translation in adapters.

**Wire dependencies at assembly.** Supply adapters when assembling the application. Tests supply test dependencies through the same mechanism. Switching between test and production adapters must not require editing application logic.

**Make the test harness the first caller.** For a new workflow, establish application behavior through its public API with lightweight test dependencies before wiring production adapters. Assert meaningful outcomes. This demonstrates that the boundary works. Keep integration and browser tests for real adapters and user journeys; passing application tests alone does not establish their correctness. In the talk, Cockburn credits Ron Jeffries with the correction: “The test harness is the first user of your app.”

**Keep it small.** A function parameter can be a port. A function can be an adapter. Add interfaces, modules, and folders when they clarify a real boundary. Keep simple local UI state in the UI. Apply the principle to the workflow being changed without turning an unrelated task into an architecture rewrite.

**Example:** This TypeScript adaptation of Cockburn's tax calculator keeps both contracts inside the application. The fixed-rate adapter and assembly sit outside it.

```ts
// Application-owned contracts
interface ForCalculatingTaxes {
  taxOn(amount: number): number
}

interface ForGettingTaxRates {
  taxRate(amount: number): number
}

// Application behavior
function createTaxCalculator(
  rates: ForGettingTaxRates,
): ForCalculatingTaxes {
  return {
    taxOn: amount => amount * rates.taxRate(amount),
  }
}

// External adapter
const fixedRates: ForGettingTaxRates = {
  taxRate: () => 0.15,
}

// Assembly: a test or production caller uses the same application API
const calculator = createTaxCalculator(fixedRates)
calculator.taxOn(100) // 15
```

**Warning signs:**

- A business rule can only be tested by mounting a component.
- Application code imports a concrete database client or service SDK.
- Changing storage technology changes application contracts.
- Tests replace internal modules instead of supplying dependencies.
- UI handlers or persistence adapters contain business decisions.

**The check:** Can a test drive the same application behavior with a different storage or service implementation, without changing application code?

Source: [Alistair Cockburn, The Hexagonal — Ports & Adapters Architecture, SAG 2025](https://www.youtube.com/watch?v=ChUlRa0xsWo). See 4:00 for the purpose, 6:00 for ownership of both interfaces, 12:30 for adapter placement, and 18:00 for the development sequence.

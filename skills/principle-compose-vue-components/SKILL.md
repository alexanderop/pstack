---
name: principle-compose-vue-components
description: "Apply when building or refactoring Vue components. Design accessibility first, organize by responsibility, and express layout variants through composition."
disable-model-invocation: true
---

# Compose Vue Components

Design accessibility into each component from the start. Give each component one clear UI responsibility. Express layout variations through composition. Keep business rules independent of Vue.

**Why:** People must be able to understand and operate the UI with a keyboard or assistive technology. Retrofitting accessibility can require changing the component's structure and API. A component that mixes business rules, reactive effects, and several layouts makes every change harder to trace. Focused components let consumers arrange the UI they need. Pure functions let maintainers test business rules without mounting Vue.

**The pattern:**

- **Accessibility first.** Choose semantic HTML and keyboard behavior before styling or defining the component API. Use native buttons, links, and form controls. Give controls accessible names, associate labels and errors with inputs, and expose state to assistive technology. Keep focus visible and manage its movement and restoration for interactions such as dialogs. Prefer established accessible primitives such as Reka UI when native elements do not cover the interaction.
- **Preserve accessibility through composition.** Slots and element overrides must retain required semantics, label relationships, keyboard behavior, and focus handling. Verify the assembled component in a real browser with keyboard interactions and accessibility-tree checks. Automated checks support manual verification with assistive technology.
- **Name components consistently.** Use one project-wide prefix for styled base components (`BaseButton`, `AppButton`, or `VButton`). Prefix tightly coupled children with the parent's name (`TodoListItem`). Order names from general to specific (`SearchButtonClear`).
- **Separate business rules from reactivity.** Put calculations and domain decisions in pure functions. Use composables for reactive state, effects, and lifecycle management. Components connect that behavior to the template.
- **Compose at the top, implement below.** In `<script setup lang="ts">`, put imports and the component contract (props, emits, and slots) first. Follow with a short setup section that calls named composables and connects their returned state and actions to the template. Define component-local composables below that section using function declarations. The setup section should read as an overview of the component's responsibilities.
- **Group logic by responsibility.** Keep each concern's state, computed values, watchers, lifecycle hooks, and actions together in a named local composable, such as `useFolderNavigation` or `useFavoriteFolders`. Do not split the script into separate blocks for all refs, all computed values, and all watchers. Use this structure when the component has multiple substantial concerns; leave a small, single-concern component inline.
- **Make dependencies visible.** Pass reactive inputs, service dependencies, and callbacks to local composables explicitly instead of capturing unrelated setup variables. Preserve reactivity when passing changing inputs: use refs or getters rather than snapshots. Return only the state and actions needed by the template or another concern. Call composables synchronously during setup so their effects belong to the component lifecycle.
- **Keep local behavior local.** Start component-specific composables in the same `.vue` file. Extract them into modules when another consumer needs them or a substantial independent responsibility becomes easier to understand separately. Reuse is not required to justify a local composable, and one responsibility does not require one file. Keep pure calculations as ordinary functions rather than naming every helper `useSomething`.
- **Compose real layout variants.** Use slots and focused child components when consumers need different arrangements. Avoid growing lists of flags such as `showHeader`, `showCancel`, and `isEditMode`.
- **Give shared state one owner.** When compound components need shared behavior across the tree, use a typed provider. Keep layout decisions with the consumer. Fail clearly when a required provider is missing.
- **Build shortcuts on top.** A `ConfirmDialog` can assemble shared dialog components. Its convenience API should not add special cases to the shared root.
- **Keep simple components simple.** A button or avatar with a stable shape can use ordinary props. Do not introduce providers, compound APIs, or separate composable files without a concrete need.

**The test:** Can someone understand and operate the component with a keyboard and assistive technology? Does that remain true when its pieces are composed differently? Can a consumer build the next required layout by arranging existing pieces? Can a maintainer read the setup section as an overview, then find a concern's state and behavior together? Can they identify who owns the state and test business rules without mounting the component? If any answer is no, inspect the component's accessibility and responsibilities before adding another prop.

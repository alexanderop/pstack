# Vue component pilot, September 10, 2026

The principle changed the generated dialog structure in the intended direction. The avatar comparison did not establish a meaningful quality difference. All four generated applications passed strict Vue type checking and Chromium behavior checks.

## Method

Four independent Codex runs used `gpt-6-astra` with medium reasoning effort. Each scenario had one run without the principle and one with it. Prompts and starting application source matched within each pair. Only the workspace guide differed. The remaining pstack plugin was absent.

The run took about six minutes. Measured agent execution includes discovery and transcript collection. It excludes fixture setup and browser grading.

| Scenario | Without principle | With principle | Parent assessment |
| --- | --- | --- | --- |
| Dialogs | Three native dialogs inside `App.vue`. 97.0 seconds. | Shared `WorkspaceDialog.vue` with body and footer slots. 115.3 seconds. | Prefer the shared shell for these three actual layouts. |
| Avatar | Initials computed inside `UserAvatar.vue`. 68.1 seconds. | Initials extracted into `utils/initials.ts`. 58.3 seconds. | Tie. Both keep a direct prop API and avoid provider machinery. |

Both dialog implementations keep form state independent. The shared shell reduces repeated title and footer markup while leaving form content at the call site. It is not a full compound component system, and the task does not require one.

## Blinded review

An independent `gpt-5.5` reviewer saw randomized labels, source, behavior results, and five criteria. It did not receive condition labels, model identities, guides, or agent explanations. This is a different model generation in the same model family, not cross-family corroboration.

The reviewer scored the treatment 10/10 and the control 9/10 for both tasks. The parent read all generated source and agreed with the dialog preference. The parent did not accept the avatar score difference. A small computed initials expression is appropriate inside a component. Extracting it is an option, not proof of better architecture. This disagreement limits the rubric's ability to distinguish appropriate extraction from unnecessary files.

The shared dialog also has limits the numerical score does not show. Its styles remain in App, and its open watcher does not handle an initially true prop. Neither issue breaks the exercised task, whose dialogs start closed. A 10/10 rubric score is not a claim of general-purpose component completeness.

## Verification and corrections

The initial live command reported two passes and two unknown instruction-exposure results. All four behavior checks passed. Both unknowns were parser gaps on combined shell commands. The native transcripts returned the complete principle. One command subsequently exited with status 1 because its final search found no files.

The exposure check now recognizes the complete guide in tool output. It does not rely on the agent's final claims or on a later command's exit status. Replaying the four saved applications passed behavior and exposure checks. The original live verdicts remain unchanged, and timestamped replay results preserve the correction.

A concurrent reference check exposed a shared Vite dependency cache. Each verification directory now has its own cache. A concurrent browser test verifies that isolation. The checker also verifies accessible avatar names and unsaved edit cancellation. Replay used this final checker against all four saved implementations.

The pilot started before checker and lockfile hashes were added to per-run metadata. Its replay files record the checker hash. Future runs record principle, checker, and lockfile hashes before execution.

## Local evidence

- [Dialog review packet](../.eval-artifacts/vue-review/pair-46605771a09a.json).
- [Dialog reviewer verdict](../.eval-artifacts/vue-review/dialogs-verdict.md).
- [Avatar review packet](../.eval-artifacts/vue-review/pair-16b7962745e4.json).
- [Avatar reviewer verdict](../.eval-artifacts/vue-review/avatar-verdict.md).
- [Condition mapping and original artifact paths](../.eval-artifacts/vue-review-manifest.json).

These artifacts are local and ignored by Git. Each original artifact directory contains its generated workspace, request, transcript, metrics, and original verdict. The replay appends results without replacing the original observations.

## Recommendation

Keep this as an exploratory comparison. The dialog result supports the principle's composition guidance. The simple case shows that it did not introduce providers or a compound API without need. One pair per task does not establish a reliable improvement, and these tasks do not exercise substantial business-rule extraction.

Run more independent repetitions before using aggregate scores to promote the principle. Judge small pure computations as proportional in either location unless the task supplies a concrete reason for reuse outside the component.

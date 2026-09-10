# Accessibility and naming pilot, September 10, 2026

The revised comparison covers accessibility first and all three component naming conventions. Six generated applications passed the corrected browser checks and instruction-exposure checks. The task-list pair showed a concrete naming difference.

## What changed in the evaluator

- Dialog checks use Tab and Enter to activate controls, check forward and backward focus containment, and verify focus returns to the opener.
- Empty-name validation must keep the dialog open, mark the field invalid, and associate the visible error with the input. Native validity and required-field label indicators are accepted.
- Avatar checks verify accessible image names and keyboard activation of the switch control.
- The task-list case exercises shared controls in two forms, submitted search, clearing, independent checkbox state, and keyboard completion.
- Blinded review now has six criteria, including accessibility and component naming. It scores actual component roles rather than requiring every filename to start with a base prefix.

Visible focus styles are inspected in source. Automated checks are not a full screen-reader or accessibility audit.

## Observed naming

| Role | Without principle | With principle | Assessment |
| --- | --- | --- | --- |
| Styled base controls | `BaseButton`, `BaseTextField` | `AppButton`, `AppTextField` | Both use a consistent prefix. |
| List and its row | `TaskList`, `TaskListRow` | `TaskList`, `TaskListItem` | Both preserve the parent prefix. |
| Search parent | `TaskSearchControls` | `TaskSearch` | Both names identify their responsibility. |
| Run action | `RunTaskSearchAction` | `TaskSearchButtonRun` | Only the treatment preserves its parent's prefix and places the action last. |
| Clear action | `ClearTaskSearchAction` | `TaskSearchButtonClear` | Only the treatment preserves its parent's prefix and places the action last. |

The baseline search actions import the shared button correctly and work with a keyboard. Their naming still violates the requested conventions. Behavior and naming are separate findings.

The dialog treatment extracted `BaseDialog` and supplied each form through its slot. The baseline kept modal mechanics and conditional layouts in `App.vue`. Both passed the same corrected accessibility checks. The avatar treatment extracted an initials helper; the baseline kept the calculation inside the component. Both approaches remain reasonable for that small task.

## Method and timing

Each task ran once per condition using `gpt-6-astra` with medium reasoning effort. The prompt and initial application source matched within each pair. Only the guide's principle body differed. No pstack plugin was installed in either condition.

| Task | Without principle | With principle |
| --- | --- | --- |
| Dialogs | 181.2 seconds | 228.6 seconds |
| Avatar | 71.4 seconds | 80.8 seconds |
| Task list | 269.3 seconds | 142.5 seconds |

Times include discovery and transcript collection. These single observations do not establish a speed advantage. The six live attempts took about 16.5 minutes in total.

## Preserved evaluator correction

The original live command reported five passes and one failure. The treatment dialog used the accessible label `Name (required)`. The original matcher expected exactly `Name`, so it rejected a valid label before reaching the form interactions.

The corrected matcher accepts anchored required-field indicators. New reference cases prove those labels and native required validity pass, while an unassociated validation error still fails. No generated code was changed. Replay checked the original source and guide hashes, then passed all six implementations. The seven replay tests include six applications and one artifact-presence check.

The original failure remains in its trial artifact. Timestamped replay files contain corrected results and source/checker hashes. Review packets use a replay only when both hashes match. The evaluator's full repository suite passed 63 tests, and TypeScript checking passed.

## Blinded review

An independent `gpt-5.5` reviewer saw only randomized source packets and the six-criterion rubric. This is a different model generation in the same family, not cross-family validation. The parent read all six implementations independently.

The dialog review favored the treatment, 12/12 versus 10/12. The avatar review favored the smaller baseline, 12/12 versus 11/12. The parent agrees with the dialog preference and considers the avatar difference small; an optional initials helper does not establish a meaningful quality advantage either way.

The task-list review favored the treatment, 12/12 versus 11/12. Only the naming criterion differed. The parent agrees that the search children preserve their parent's full name and follow general-to-specific word order. Both versions received full accessibility scores and passed the same browser checks, so this run shows no measured accessibility advantage.

## Local evidence

- [Dialog pair](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review/pair-5fe940ec1651.json) and [verdict](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review/dialogs-verdict.md).
- [Avatar pair](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review/pair-28718815b939.json) and [verdict](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review/avatar-verdict.md).
- [Task-list pair](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review/pair-3b548d2eb4d7.json) and [verdict](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review/task-list-verdict.md).
- [Condition mapping, original paths, and replay records](../.eval-artifacts/vue-a11y-naming-2026-09-10/vue-review-manifest.json).

These are local artifacts ignored by Git. The earlier pilot remains separate and used a different principle and rubric. This run demonstrates useful task coverage and one naming improvement, not a reliable general effect. More independent repetitions are needed for that claim.

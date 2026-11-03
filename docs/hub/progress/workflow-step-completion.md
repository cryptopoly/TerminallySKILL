# Workflow steps completing early (Decision 14)

Fixed on branch `fix/workflow-step-completion`, 2026-11-01. The bug is in released 0.9.103.

**Early completion.** A step's marker draws its own prompt, which can arrive after the next step has been typed. The 1 s fallback then ended that running step with the prompt's exit code. A prompt now ends a step only after the shell reports `command-start` for that step.

**Visible `printf` line.** Two causes, plus the stale prompt above: the terminal can echo the marker during a step and the line editor draws it again at the prompt; and a long marker wraps at the window edge, where the editor redraws characters and an exact match fails. The filter now matches the marker's unique start, drops the rest of the line, and stays armed after the first echo.

**Tests.** New e2e `a long step is not marked done by the prompt of the step before it` failed 3 of 3 before the fix. After it: `workflow-input-flush.spec.mjs` 9 of 9 over 3 repeats, `test:ci` 523 passed, full e2e 30 passed and 6 skipped, on macOS with zsh.

**Not tested.** bash by hand, a real multi-minute build, a prompt wide enough to wrap inside the marker's start (the text would still show there). The up-arrow position and cropped last row Dan saw need a retest.

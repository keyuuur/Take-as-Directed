# Take as Directed

Google Apps Script classroom game for modeling antibiotic adherence and bacterial resistance.

## Developer Notes

### Project Shape

- `Code.js` is the Apps Script server file. It creates sessions, builds reflection questions, saves submissions, and sets up the connected Sheet tabs.
- `Index.html` contains the screen markup and stable element IDs used by the client script.
- `Script.html` owns the client-side game state, phase changes, rendering, charts, overlays, and `google.script.run` calls.
- `Styles.html` owns the student-facing arcade UI and iPad layout rules.
- `appsscript.json` stores the Apps Script runtime and web app settings.

### Refactored Game Flow

- Shared gameplay constants live near the top of `Script.html`: color order, good-dose rolls, missed-dose rolls, removals per dose, and Patient A's automatic roll.
- Compare mode and Extra mode both use the same treatment helpers where practical.
- Compare mode is intentionally sequential: students finish all Patient A rounds first, then all Patient B rounds, then compare the final results.
- Patient A and Patient B keep separate progress counters so the UI can say exactly which mission and round students are working on.
- `startTreatmentPhase(...)` prepares a working copy of a patient's bacteria counts and decides whether removal is needed.
- `finishTreatmentWithReproduction(...)` handles the post-treatment reproduction overlay and then commits the round.
- `reproduceAndCommitRound(...)` applies reproduction, stores the new bacteria counts, and records the history row.
- Rendering still happens through `renderCompareView()` and `renderExtraView()`, with smaller helpers updating action controls, roll readouts, cards, charts, and footer HUD.

### Rules To Preserve

- Compare mode and Extra mode both run 8 rounds.
- Patient A always represents consistent dosing.
- Patient B / Extra mode roll one six-sided die.
- Compare mode should not switch back and forth each round. Run Patient A rounds 1-8, then Patient B rounds 1-8.
- Rolls `1` or `6` mean the dose was missed.
- A taken dose removes up to 5 bacteria.
- Bacteria must be removed in order: red, then blue, then yellow.
- After each dose phase, each surviving color reproduces by 1.
- Do not change Sheet tab names, server function names, or submission payload shapes unless the Sheets contract is intentionally being updated.

### Layout Notes

- The UI is optimized for 9th grade students on iPad landscape.
- The short-height media query in `Styles.html` is the main no-scroll classroom layout pass.
- In that compact mode, the science tip is hidden during gameplay, the board and charts are shortened, and the action controls stay visible.
- Critical controls should never be hidden: start/roll/remove buttons, emergency submit, counts, and round progress.

### Safe Verification Checklist

Before pushing to Apps Script:

- Confirm all `byId(...)` references still match IDs in `Index.html`.
- Confirm there are no duplicate IDs.
- Run a syntax check on `Script.html`.
- Run `clasp status` from this folder.
- Test Compare mode taken-dose and missed-dose branches.
- Test Extra mode taken-dose and missed-dose branches.
- Confirm there is no horizontal overflow at iPad landscape size.

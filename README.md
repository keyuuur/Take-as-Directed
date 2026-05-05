# Take as Directed

Google Apps Script classroom game for modeling antibiotic adherence and bacterial resistance.

## Developer Notes

### Project Shape

- `Code.js` is the Apps Script server file. It creates sessions, builds reflection questions, saves submissions, and sets up the connected Sheet tabs.
- `Index.html` contains the screen markup and stable element IDs used by the client script.
- `Script.html` is now a small client-script loader. The `Client_*.html` partials split state, startup, gameplay flow, rendering, submissions, and utilities.
- Rendering is split into three smaller partials: `Client_Render_Core.html` for top-level screen updates, `Client_Render_Hud.html` for side panels/action controls, and `Client_Render_Board.html` for lung boards, bacteria tokens, counts, and charts.
- `Styles.html` owns the student-facing arcade UI and iPad layout rules.
- `appsscript.json` stores the Apps Script runtime and web app settings.

### Refactored Game Flow

- Shared gameplay constants live near the top of `Client_State.html`: color order, good-dose rolls, missed-dose rolls, removals per dose, and Patient A's automatic roll.
- Compare mode and Extra mode both use the same treatment helpers where practical.
- Compare mode is intentionally sequential: students finish all Patient A rounds first, then all Patient B rounds, then compare the final results.
- Before Patient B starts, students must make a prediction about how missed doses will affect Patient B and choose a confidence level. This is saved for reflection and teacher analytics, but it is not graded.
- Patient A and Patient B keep separate progress counters so the UI can say exactly which mission and round students are working on.
- `startTreatmentPhase(...)` prepares a working copy of a patient's bacteria counts and decides whether removal is needed.
- `finishTreatmentWithReproduction(...)` handles the post-treatment reproduction overlay and then commits the round.
- `reproduceAndCommitRound(...)` applies reproduction, stores the new bacteria counts, and records the history row.
- Rendering still happens through `renderCompareView()` and `renderExtraView()`, with smaller helpers updating action controls, roll readouts, cards, charts, and footer HUD.
- If a patient's bacteria total reaches 0, the round auto-completes with a student-facing explanation instead of showing a reproduction overlay. The message explains that there is nothing left to remove or reproduce.
- Submission payloads are built through shared helpers in `Client_Submissions.html` so normal submit and emergency submit use the same summary logic.
- Emergency Submit opens a type-confirm modal first. Students must type `SUBMIT` before partial work can be saved.

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

### Teacher Data Notes

- The existing `Sessions`, `RoundData`, and `Responses` tabs are preserved. New expected headers are only appended to the right if needed; sheets are not cleared.
- The first time the analytics upgrade runs, Apps Script creates one-time backup tabs for `Sessions`, `RoundData`, and `Responses`.
- The backup marker is stored in the document property `takeAsDirected.analyticsBackupCreatedAt`, so those backup tabs are not recreated every time the app opens.
- A new `Analytics` tab stores one summary row per Compare, Extra, or Emergency submission.
- A new `TeacherDashboard` tab reads from `Analytics` with summary formulas for submissions, emergency submissions, average scores, missed doses, prediction distribution, and period-level patterns.
- The dashboard setup only fills blank expected cells. If a teacher has already typed notes or made changes in existing dashboard cells, the app does not overwrite those edits.
- Compare analytics include the Patient B prediction, confidence level, final Patient A total, final Patient B total, the Patient B minus Patient A difference, Patient B yellow share, missed doses, score, and a short adherence outcome note.
- Extra analytics leave prediction fields blank and store the extra-mode final total, missed doses, score, and adherence outcome note.

### Layout Notes

- The UI is optimized for 9th grade students on iPad landscape.
- The short-height media query in `Styles.html` is the main no-scroll classroom layout pass.
- A second iPad-landscape width query targets roughly 1024-1180px classroom screens so buttons, boards, charts, and footer cards stay readable without crowding.
- In that compact mode, the science tip is hidden during gameplay, the board and charts are shortened, and the action controls stay visible.
- Critical controls should never be hidden: start/roll/remove buttons, emergency submit, counts, and round progress.

### Safe Verification Checklist

Before pushing to Apps Script:

- Confirm all `byId(...)` references still match IDs in `Index.html`.
- Confirm there are no duplicate IDs.
- Run `powershell -ExecutionPolicy Bypass -File .\tools\run-client-flow-check.ps1`.
- Run `powershell -ExecutionPolicy Bypass -File .\tools\run-server-check.ps1`.
- Run syntax checks on `Code.js` and the concatenated client partials.
- Run `clasp status` from this folder.
- Test Compare mode taken-dose and missed-dose branches.
- Test that Patient B stays locked until the student chooses both a prediction and confidence level.
- Test that the final Compare debrief includes final totals, missed-dose count, the student prediction, the real-world adherence explanation, and the medical-professional disclaimer.
- Test Extra mode taken-dose and missed-dose branches.
- Confirm the new `Analytics` tab appears and backup tabs are created only once.
- Confirm the new `TeacherDashboard` tab appears and formulas pull from `Analytics`.
- Test Emergency Submit in both modes: Cancel should do nothing, and Submit Partial Work should unlock only after typing `SUBMIT`.
- Confirm there is no horizontal overflow at iPad landscape size.

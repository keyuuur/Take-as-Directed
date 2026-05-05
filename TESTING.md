# Testing Take as Directed

These checks are local-only. They do not require npm packages and do not change the Apps Script project.

## Recommended pre-deploy checks

Run from `C:\Users\Keyur\Desktop\Take-as-Directed LOCAL`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-client-flow-check.ps1
powershell -ExecutionPolicy Bypass -File .\tools\run-server-check.ps1
```

The client-flow check verifies:

- Compare Mode keeps Patient B locked until Patient A finishes all 8 rounds.
- Patient B remains locked until the student chooses both a prediction and confidence level.
- The compare payload includes the prediction choice, confidence level, and the point in the flow when the prediction was made.
- Patient B then runs all 8 rounds with both missed-dose and taken-dose branches.
- The cleared-infection auto-complete explanation appears when bacteria reach 0.
- The final Compare debrief includes the student prediction, final totals, real-world adherence explanation, and simplified-model disclaimer.
- Extra Mode can complete all 8 rounds with both missed-dose and taken-dose branches.
- Compare and Extra submissions still produce the expected history rows.
- Compare and Extra Emergency Submit buttons open a confirmation modal instead of saving immediately.
- Emergency Submit stays locked until the student types exactly `SUBMIT`.
- Cancel closes the Emergency Submit modal without saving.
- Confirming the modal still builds the same safe partial payload.
- The page has no duplicate DOM IDs.

The server check verifies:

- The server recomputes completed rounds, scores, missed doses, and analytics values from history instead of trusting browser summary values.
- Invalid prediction choices and confidence values are rejected.
- Compare analytics include prediction data.
- Extra analytics leave prediction fields blank.
- The Sheet-only teacher dashboard formulas point to the `Analytics` tab.

Also run:

```powershell
node --check Code.js
clasp status
```

After deployment, open the connected Google Sheet and confirm:

- Existing `Sessions`, `RoundData`, and `Responses` data are still present.
- One-time backup tabs exist for `Sessions`, `RoundData`, and `Responses`.
- A new `Analytics` tab exists.
- A new `TeacherDashboard` tab exists.
- The `TeacherDashboard` formulas read from `Analytics` and show counts/averages once there are submissions.
- A Compare submission writes prediction values into the `Analytics` row.
- An Extra submission writes an `Analytics` row with blank prediction fields.

After `clasp push`, clone or pull the Apps Script project into a temporary folder and compare file hashes before classroom use.

## Manual iPad-landscape checklist

Use a real iPad in landscape if possible. If not, use the browser's device toolbar at a width near `1024-1180px`.

1. Open the deployed web app and hard refresh the page.
2. Enter a test student name and period.
3. Open Compare Mode.
4. Confirm there is no horizontal scrolling.
5. Confirm the current instruction, active patient board, roll/remove controls, progress, and counts are visible without hunting.
6. Start Patient A and complete at least two rounds.
7. Finish Patient A, then confirm the prediction prompt is readable and not cramped.
8. Start Patient B and confirm the one-die roll panel is easy to spot.
9. Tap Emergency Submit, confirm the modal appears, type something other than `SUBMIT`, and verify the final button stays disabled.
10. Tap Cancel and confirm the game is still playable.
11. Open Extra Mode and repeat the Emergency Submit modal check.
12. Open the connected Sheet and confirm `TeacherDashboard` is present and no existing data tabs were cleared.

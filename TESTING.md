# Testing Take as Directed

These checks are local-only. They do not require npm packages and do not change the Apps Script project.

## Recommended pre-deploy checks

Run from `C:\Users\Keyur\Desktop\Take-as-Directed LOCAL`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-client-flow-check.ps1
```

This verifies:

- Compare Mode keeps Patient B locked until Patient A finishes all 8 rounds.
- Patient B remains locked until the student chooses both a prediction and confidence level.
- The compare payload includes the prediction choice, confidence level, and the point in the flow when the prediction was made.
- Patient B then runs all 8 rounds with both missed-dose and taken-dose branches.
- The cleared-infection auto-complete explanation appears when bacteria reach 0.
- The final Compare debrief includes the student prediction, final totals, real-world adherence explanation, and simplified-model disclaimer.
- Extra Mode can complete all 8 rounds with both missed-dose and taken-dose branches.
- Compare and Extra submissions still produce the expected history rows.
- The page has no duplicate DOM IDs.

Also run:

```powershell
node --check Code.js
clasp status
```

After deployment, open the connected Google Sheet and confirm:

- Existing `Sessions`, `RoundData`, and `Responses` data are still present.
- One-time backup tabs exist for `Sessions`, `RoundData`, and `Responses`.
- A new `Analytics` tab exists.
- A Compare submission writes prediction values into the `Analytics` row.
- An Extra submission writes an `Analytics` row with blank prediction fields.

After `clasp push`, clone or pull the Apps Script project into a temporary folder and compare file hashes before classroom use.

# Testing Take as Directed

These checks are local-only. They do not require npm packages and do not change the Apps Script project.

## Recommended pre-deploy checks

Run from `C:\Users\Keyur\Desktop\Take-as-Directed LOCAL`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\run-client-flow-check.ps1
```

This verifies:

- Compare Mode keeps Patient B locked until Patient A finishes all 8 rounds.
- Patient B then runs all 8 rounds with both missed-dose and taken-dose branches.
- Extra Mode can complete all 8 rounds with both missed-dose and taken-dose branches.
- Compare and Extra submissions still produce the expected history rows.
- The page has no duplicate DOM IDs.

Also run:

```powershell
node --check Code.js
clasp status
```

After `clasp push`, clone or pull the Apps Script project into a temporary folder and compare file hashes before classroom use.

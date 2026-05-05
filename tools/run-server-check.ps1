# Local server-logic check for Take as Directed.
# This runs selected Code.js helper functions in Node without touching Apps Script or the Sheet.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$codePath = Join-Path $root 'Code.js'

$nodeHarness = @'
const fs = require('fs');
const vm = require('vm');
const codePath = process.argv[2];
const code = fs.readFileSync(codePath, 'utf8');

const test = `
function assert(condition, message) { if (!condition) throw new Error(message); }

const sessionInfo = {
  record: ['Existing Student', '2'],
  idx: { studentName: 0, period: 1 }
};

const comparePayload = {
  sessionId: 'session-1',
  studentName: 'Student One',
  period: '2',
  prediction: {
    choice: 'Patient B will end with more bacteria.',
    confidence: 'Very sure',
    madeAfterPatientARounds: 8
  },
  history: [
    { patientType: 'patient_a', round: 0, roll: '', adherence: 'Starting population', red: 13, blue: 6, yellow: 1 },
    { patientType: 'patient_a', round: 8, roll: 4, adherence: 'Took dose on time', red: 0, blue: 0, yellow: 0 },
    { patientType: 'patient_b', round: 0, roll: '', adherence: 'Starting population', red: 13, blue: 6, yellow: 1 },
    { patientType: 'patient_b', round: 8, roll: 6, adherence: 'Missed dose', red: 2, blue: 4, yellow: 6 }
  ],
  responses: [{ questionId: 'CQ1', prompt: 'Prompt', selected: 'A', correctAnswer: 'A' }],
  summary: { completedRounds: 999, totalScore: 999, patientBMissedDoses: 999 }
};

const compare = normalizePayload_('compare', comparePayload, sessionInfo);
assert(compare.summary.completedRounds === 8, 'Server should recompute compare completed rounds');
assert(compare.summary.totalScore === 20, 'Server should recompute compare score');
assert(compare.summary.patientBMissedDoses === 1, 'Server should recompute Patient B missed doses');
assert(compare.summary.predictionChoice === 'Patient B will end with more bacteria.', 'Server should keep valid prediction choice');

const compareAnalytics = buildAnalyticsRow_('compare', compare, false);
assert(compareAnalytics.status === 'submitted', 'Compare analytics should mark submitted');
assert(compareAnalytics.predictionConfidence === 'Very sure', 'Compare analytics should include confidence');
assert(compareAnalytics.patientBMinusA === 12, 'Compare analytics should compute Patient B minus Patient A');
assert(compareAnalytics.patientBYellowShare === 0.5, 'Compare analytics should compute Patient B yellow share');

const invalidPrediction = normalizePayload_('compare', {
  sessionId: 'session-2',
  studentName: 'Student Two',
  period: '2',
  prediction: { choice: 'Injected choice', confidence: 'Mega sure', madeAfterPatientARounds: 999 },
  history: comparePayload.history,
  responses: []
}, sessionInfo);
assert(invalidPrediction.summary.predictionChoice === '', 'Server should reject invalid prediction choice');
assert(invalidPrediction.summary.predictionConfidence === '', 'Server should reject invalid prediction confidence');

const extra = normalizePayload_('extra', {
  sessionId: 'session-3',
  studentName: 'Student Three',
  period: '2',
  history: [
    { patientType: 'random_patient', round: 0, roll: '', red: 13, blue: 6, yellow: 1 },
    { patientType: 'random_patient', round: 8, roll: 1, red: 3, blue: 5, yellow: 7 }
  ],
  responses: []
}, sessionInfo);
const extraAnalytics = buildAnalyticsRow_('extra', extra, true);
assert(extra.summary.completedRounds === 8, 'Server should recompute extra completed rounds');
assert(extra.summary.missedDoses === 1, 'Server should recompute extra missed doses');
assert(extraAnalytics.status === 'partial', 'Emergency analytics should mark partial');
assert(extraAnalytics.predictionChoice === '', 'Extra analytics should leave prediction blank');

console.log(JSON.stringify({ server: 'passed', analytics: 'passed', validation: 'passed' }, null, 2));
`;

const context = { console };
vm.createContext(context);
vm.runInContext(code + '\n' + test, context, { timeout: 10000 });
'@

$nodeHarness | node - $codePath

# Local test harness for Take as Directed.
# This uses Node only; it does not require npm packages and is not pushed to Apps Script.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$clientFiles = @(
  'Client_State.html',
  'Client_Init.html',
  'Client_Flow.html',
  'Client_Render.html',
  'Client_Submissions.html',
  'Client_Utils.html'
)

$tempClient = Join-Path $env:TEMP 'take-directed-client-bundle.js'
$clientJs = ($clientFiles | ForEach-Object { Get-Content -Raw (Join-Path $root $_) }) -join "`n"
Set-Content -Path $tempClient -Value $clientJs -Encoding UTF8

$indexPath = Join-Path $root 'Index.html'
$nodeHarness = @'
const fs = require('fs');
const vm = require('vm');
const clientPath = process.argv[2];
const indexPath = process.argv[3];
const js = fs.readFileSync(clientPath, 'utf8');
const ids = [...fs.readFileSync(indexPath, 'utf8').matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }

const context = {
  SERVER_CONFIG: {
    periods: ['2', '3', '6'],
    compareRounds: 8,
    extraRounds: 8,
    compareStarting: { red: 13, blue: 6, yellow: 1 },
    extraStarting: { red: 13, blue: 6, yellow: 1 },
    comparePoints: { completion: 10, reflection: 10, total: 20 },
    extraPoints: { completion: 5, reflection: 5, total: 10 }
  },
  console,
  alert: (msg) => fail('Unexpected alert: ' + msg),
  setTimeout: (fn) => fn()
};
context.Math = Object.create(Math);
context.Math.random = Math.random;

function makeClassList(el) {
  const set = new Set();
  return {
    add: (...names) => names.forEach(n => set.add(n)),
    remove: (...names) => names.forEach(n => set.delete(n)),
    toggle: (name, force) => {
      const shouldAdd = force === undefined ? !set.has(name) : !!force;
      if (shouldAdd) set.add(name); else set.delete(name);
      el.className = [...set].join(' ');
      return shouldAdd;
    },
    contains: (name) => set.has(name)
  };
}

function makeEl(id) {
  const el = {
    id,
    textContent: '',
    innerHTML: '',
    className: '',
    disabled: false,
    value: '',
    dataset: {},
    style: {},
    focus() {},
    addEventListener() {},
    querySelector() { return null; }
  };
  el.classList = makeClassList(el);
  return el;
}

const elements = new Map(ids.map(id => [id, makeEl(id)]));
['overlayTitle', 'overlayText', 'overlayContinueBtn', 'overlay', 'screen-compare', 'screen-extra', 'screen-finish', 'finishMessage'].forEach(id => {
  if (!elements.has(id)) elements.set(id, makeEl(id));
});

function makeRemoveButton(color) {
  const el = makeEl('remove-' + color);
  el.dataset.color = color;
  const countEl = makeEl('count-' + color);
  el.querySelector = (selector) => selector === `[data-color-count="${color}"]` ? countEl : null;
  return el;
}
const compareRemoveButtons = ['red', 'blue', 'yellow'].map(makeRemoveButton);
const extraRemoveButtons = ['red', 'blue', 'yellow'].map(makeRemoveButton);

context.document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeEl(id));
    return elements.get(id);
  },
  querySelectorAll(selector) {
    if (selector === '#compareRemoveControls .remove-btn') return compareRemoveButtons;
    if (selector === '#extraRemoveControls .remove-btn') return extraRemoveButtons;
    if (selector === 'button') return [...elements.values()].filter(el => el.id && el.id.toLowerCase().includes('btn'));
    if (selector === '.screen') return [elements.get('screen-compare'), elements.get('screen-extra'), elements.get('screen-finish')];
    if (selector.startsWith('input[name=')) return [];
    return [];
  },
  addEventListener() {}
};

const runner = {
  savedComparePayload: null,
  savedExtraPayload: null,
  withSuccessHandler(fn) { this.success = fn; return this; },
  withFailureHandler() { return this; },
  buildCompareReflection() { this.success([{ prompt: 'Which patient had fewer bacteria?', choices: ['Patient A', 'Patient B'], answer: 'Patient A' }]); return this; },
  buildExtraReflection() { this.success([{ prompt: 'What happens after a missed dose?', choices: ['Survivors reproduce'], answer: 'Survivors reproduce' }]); return this; },
  createSession() { this.success({ sessionId: 'test-session', studentName: 'Test Student', period: '2' }); return this; },
  saveCompareSubmission(payload) { this.savedComparePayload = payload; this.success(); return this; },
  saveExtraSubmission(payload) { this.savedExtraPayload = payload; this.success(); return this; },
  saveEmergencySubmission(payload) { this.savedEmergencyPayload = payload; this.success(); return this; }
};
context.google = { charts: { load() {}, setOnLoadCallback() {} }, visualization: null, script: { run: runner } };

const test = `
function assert(condition, message) { if (!condition) throw new Error(message); }
const defaultRandom = Math.random;
function chooseRemovalColor(mode) {
  const state = mode === 'compare' ? appState.compare : appState.extra;
  const counts = state.working.workingCounts;
  if (canRemoveColor(counts, 'red')) return 'red';
  if (canRemoveColor(counts, 'blue')) return 'blue';
  if (canRemoveColor(counts, 'yellow')) return 'yellow';
  throw new Error('No legal removal color available');
}
function finishTreatment(mode) {
  const state = mode === 'compare' ? appState.compare : appState.extra;
  let guard = 30;
  while (state.working && guard-- > 0) {
    removeFromActive(mode, chooseRemovalColor(mode));
    if (appState.overlayOpen) continueOverlayAction();
  }
  assert(guard > 0, mode + ' treatment loop got stuck');
}
function runCompare() {
  appState.sessionId = 'test-session';
  appState.studentName = 'Test Student';
  appState.period = '2';
  appState.compare = createCompareState();
  appState.compare.patientB.rolls = [4, 1, 5, 6, 3, 4, 2, 5];
  renderCompareView();
  assert(document.getElementById('compareBHeaderBadge').textContent === 'Locked', 'Patient B should be locked before Patient A finishes');
  handleCompareMainButton();
  let sawClearedMessage = false;
  for (let round = 1; round <= appState.config.compareRounds; round++) {
    if (appState.compare.phase === 'a_remove') finishTreatment('compare');
    if ((appState.compare.roundSummary || '').includes('No bacteria are left in this patient')) sawClearedMessage = true;
    assert(appState.compare.patientARoundsCompleted === round, 'Patient A round mismatch');
    assert(appState.compare.patientBRoundsCompleted === 0, 'Patient B advanced too early');
    if (round < appState.config.compareRounds) handleCompareMainButton();
  }
  assert(sawClearedMessage, 'Compare should explain when a cleared infection auto-completes');
  assert(appState.compare.phase === 'transition_to_b', 'Compare should transition to Patient B');
  assert(document.getElementById('compareMainBtn').disabled === true, 'Patient B start button should wait for prediction');
  handleCompareMainButton();
  assert(appState.compare.phase === 'transition_to_b', 'Patient B should not start without a prediction');
  assert(appState.compare.prediction.error, 'Missing prediction should show feedback');
  handleComparePredictionInput('choice', 'Patient B will end with more bacteria.');
  assert(document.getElementById('compareMainBtn').disabled === true, 'Prediction also needs confidence');
  handleComparePredictionInput('confidence', 'Somewhat sure');
  assert(document.getElementById('compareMainBtn').disabled === false, 'Complete prediction should enable Patient B start');
  handleCompareMainButton();
  assert(appState.compare.prediction.locked, 'Prediction should lock before Patient B starts');
  assert(appState.compare.prediction.madeAfterPatientARounds === 8, 'Prediction should record that it happened after Patient A finished');
  for (let round = 1; round <= appState.config.compareRounds; round++) {
    assert(appState.compare.phase === 'b_roll', 'Patient B should start each round by rolling');
    rollComparePatientB();
    if (isMissedDose(appState.compare.currentRoll)) continueOverlayAction();
    else if (appState.compare.phase === 'b_remove') finishTreatment('compare');
    assert(appState.compare.patientBRoundsCompleted === round, 'Patient B round mismatch');
    if (round < appState.config.compareRounds) handleCompareMainButton();
  }
  assert(appState.compare.phase === 'finished', 'Compare should finish after both missions');
  assert(document.getElementById('compareSummary').innerHTML.includes('Real-world connection'), 'Final summary should include real-world connection');
  assert(document.getElementById('compareSummary').innerHTML.includes('simplified classroom model'), 'Final summary should include medical disclaimer');
  appState.compare.reflection[0].selected = 'Patient A';
  submitCompareMode();
  assert(google.script.run.savedComparePayload.history.length === 18, 'Compare should submit 18 history rows');
  assert(google.script.run.savedComparePayload.prediction.choice === 'Patient B will end with more bacteria.', 'Compare payload should include prediction choice');
  assert(google.script.run.savedComparePayload.prediction.confidence === 'Somewhat sure', 'Compare payload should include prediction confidence');
  assert(google.script.run.savedComparePayload.summary.predictionMadeAfterPatientARounds === 8, 'Compare summary should include prediction timing');
}
function runExtra() {
  const randomValues = [0.5, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  Math.random = () => randomValues.length ? randomValues.shift() : 0.5;
  appState.extra = createExtraState();
  renderExtraView();
  handleExtraMainButton();
  for (let round = 1; round <= appState.config.extraRounds; round++) {
    assert(appState.extra.phase === 'extra_roll', 'Extra should start each round by rolling');
    rollExtraPatient();
    if (isMissedDose(appState.extra.currentRoll)) continueOverlayAction();
    else if (appState.extra.phase === 'extra_remove') finishTreatment('extra');
    assert(appState.extra.roundsCompleted === round, 'Extra round mismatch');
    if (round < appState.config.extraRounds) handleExtraMainButton();
  }
  assert(appState.extra.phase === 'finished', 'Extra should finish after 8 rounds');
  appState.extra.reflection[0].selected = 'Survivors reproduce';
  submitExtraMode();
  assert(google.script.run.savedExtraPayload.history.length === 9, 'Extra should submit 9 history rows');
  Math.random = defaultRandom;
}
function runEmergencySubmits() {
  appState.compare = createCompareState();
  appState.compare.prediction.choice = 'I am not sure yet.';
  appState.compare.prediction.confidence = 'Not sure';
  emergencySubmit('compare');
  assert(google.script.run.savedEmergencyPayload.mode === 'compare', 'Compare emergency should include mode');
  assert(google.script.run.savedEmergencyPayload.history.length === 2, 'Compare emergency should include both starting history rows');
  assert(google.script.run.savedEmergencyPayload.summary.predictionChoice === 'I am not sure yet.', 'Compare emergency should preserve prediction');
  assert(google.script.run.savedEmergencyPayload.summary.completedRounds === 0, 'Compare emergency should record partial progress');

  appState.extra = createExtraState();
  emergencySubmit('extra');
  assert(google.script.run.savedEmergencyPayload.mode === 'extra', 'Extra emergency should include mode');
  assert(google.script.run.savedEmergencyPayload.history.length === 1, 'Extra emergency should include starting history row');
  assert(google.script.run.savedEmergencyPayload.summary.finalTotal === 20, 'Extra emergency should record current total');
}
runCompare();
runExtra();
runEmergencySubmits();
console.log(JSON.stringify({ compare: 'passed', extra: 'passed', emergency: 'passed' }, null, 2));
`;

assert(duplicateIds.length === 0, 'Duplicate IDs: ' + duplicateIds.join(', '));
vm.createContext(context);
vm.runInContext(js + '\n' + test, context, { timeout: 10000 });
'@

$nodeHarness | node - $tempClient $indexPath

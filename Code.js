const CONFIG = {
  periods: ['2', '3', '6'],
  compareRounds: 8,
  extraRounds: 8,
  compareStarting: { red: 13, blue: 6, yellow: 1 },
  extraStarting: { red: 13, blue: 6, yellow: 1 },
  comparePoints: {
    completion: 10,
    reflection: 10,
    total: 20
  },
  extraPoints: {
    completion: 5,
    reflection: 5,
    total: 10
  },
  compareReflectionQuestions: [
    {
      id: 'CQ1',
      build: function(data) {
        return {
          prompt: `Which patient finished with fewer total bacteria after Round 8?`,
          choices: [
            'Patient A: Takes antibiotics as directed',
            'Patient B: Misses some doses',
            'They finished with the same total',
            'There is not enough information to tell'
          ],
          answer: data.compare.patientATotalFinal < data.compare.patientBTotalFinal
            ? 'Patient A: Takes antibiotics as directed'
            : data.compare.patientATotalFinal > data.compare.patientBTotalFinal
              ? 'Patient B: Misses some doses'
              : 'They finished with the same total'
        };
      }
    },
    {
      id: 'CQ2',
      build: function(data) {
        const aShare = data.compare.patientAYellowShareFinal;
        const bShare = data.compare.patientBYellowShareFinal;
        return {
          prompt: `Which patient ended with the larger proportion of highly resistant bacteria (yellow)?`,
          choices: [
            'Patient A: Takes antibiotics as directed',
            'Patient B: Misses some doses',
            'They had the same proportion',
            'Neither patient had yellow bacteria left'
          ],
          answer: aShare > bShare
            ? 'Patient A: Takes antibiotics as directed'
            : bShare > aShare
              ? 'Patient B: Misses some doses'
              : (aShare === 0 && bShare === 0 ? 'Neither patient had yellow bacteria left' : 'They had the same proportion')
        };
      }
    },
    {
      id: 'CQ3',
      build: function(data) {
        return {
          prompt: `Patient B missed ${data.compare.patientBMissedDoses} dose(s). Which statement best fits your data?`,
          choices: [
            'Missing doses gave surviving bacteria more chances to reproduce without being killed',
            'Missing doses made the antibiotic stronger',
            'Missing doses removed the resistant bacteria first',
            'Missing doses had no effect on the bacterial population'
          ],
          answer: 'Missing doses gave surviving bacteria more chances to reproduce without being killed'
        };
      }
    },
    {
      id: 'CQ4',
      build: function(data) {
        const aCleared = data.compare.patientATotalFinal === 0;
        const bCleared = data.compare.patientBTotalFinal === 0;
        let answer = 'Neither patient completely cleared the infection';
        if (aCleared && !bCleared) answer = 'Only Patient A completely cleared the infection';
        if (!aCleared && bCleared) answer = 'Only Patient B completely cleared the infection';
        if (aCleared && bCleared) answer = 'Both patients completely cleared the infection';
        return {
          prompt: `Based on your results, which statement is true about infection clearance by the end of the simulation?`,
          choices: [
            'Only Patient A completely cleared the infection',
            'Only Patient B completely cleared the infection',
            'Both patients completely cleared the infection',
            'Neither patient completely cleared the infection'
          ],
          answer: answer
        };
      }
    },
    {
      id: 'CQ5',
      build: function(data) {
        return {
          prompt: `Which claim is best supported by your graphs?`,
          choices: [
            'Taking antibiotics consistently helps reduce the bacterial population and limits resistant survivors',
            'Stopping or missing doses is just as effective as taking antibiotics correctly',
            'Highly resistant bacteria always die first',
            'Antibiotics create resistance in every bacterium immediately'
          ],
          answer: 'Taking antibiotics consistently helps reduce the bacterial population and limits resistant survivors'
        };
      }
    }
  ],
  extraReflectionQuestions: [
    {
      id: 'EQ1',
      build: function(data) {
        return {
          prompt: `In your extra-credit simulation, how many doses were missed?`,
          choices: [
            String(data.extra.missedDoses),
            String(Math.max(0, data.extra.missedDoses - 1)),
            String(data.extra.missedDoses + 1),
            String(data.extra.missedDoses + 2)
          ].filter((v, i, arr) => arr.indexOf(v) === i),
          answer: String(data.extra.missedDoses)
        };
      }
    },
    {
      id: 'EQ2',
      build: function(data) {
        return {
          prompt: `What was your final total bacteria population at the end of the extra-credit simulation?`,
          choices: [
            String(data.extra.totalFinal),
            String(Math.max(0, data.extra.totalFinal - 2)),
            String(data.extra.totalFinal + 2),
            String(data.extra.totalFinal + 4)
          ].filter((v, i, arr) => arr.indexOf(v) === i),
          answer: String(data.extra.totalFinal)
        };
      }
    },
    {
      id: 'EQ3',
      build: function(data) {
        return {
          prompt: `Which bacteria type made up the largest share of your final population?`,
          choices: [
            'Low resistance (red)',
            'Average resistance (blue)',
            'High resistance (yellow)',
            'There was a tie for the largest share'
          ],
          answer: determineDominantTypeText(data.extra.finalCounts)
        };
      }
    },
    {
      id: 'EQ4',
      build: function(data) {
        return {
          prompt: `Compared with a patient who takes every dose on time, your extra-credit patient most likely had:`,
          choices: [
            'more opportunities for bacteria to reproduce without being killed',
            'fewer opportunities for bacteria to reproduce without being killed',
            'exactly the same adherence pattern',
            'no bacterial reproduction at all'
          ],
          answer: data.extra.missedDoses > 0
            ? 'more opportunities for bacteria to reproduce without being killed'
            : 'exactly the same adherence pattern'
        };
      }
    },
    {
      id: 'EQ5',
      build: function(data) {
        return {
          prompt: `Which statement best matches your extra-credit graph?`,
          choices: [
            'Missed doses can make it easier for resistant bacteria to remain in the population',
            'Missing doses immediately kills all bacteria',
            'The yellow bacteria always disappear first',
            'Adherence never changes the graph'
          ],
          answer: 'Missed doses can make it easier for resistant bacteria to remain in the population'
        };
      }
    }
  ]
};

function doGet() {
  initializeSheets_();
  const tpl = HtmlService.createTemplateFromFile('Index');
  tpl.config = getClientConfig_();
  return tpl.evaluate()
    .setTitle('Take as Directed')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getClientBootstrap() {
  initializeSheets_();
  return getClientConfig_();
}

function createSession(studentName, period) {
  initializeSheets_();
  const cleanName = String(studentName || '').trim();
  const cleanPeriod = String(period || '').trim();
  if (!cleanName) throw new Error('Student name is required.');
  if (CONFIG.periods.indexOf(cleanPeriod) === -1) throw new Error('Please choose a valid period.');

  const sessionId = Utilities.getUuid();
  const now = new Date();
  const row = buildSessionRow_({
    timestamp: now,
    sessionId,
    studentName: cleanName,
    period: cleanPeriod,
    compareStatus: 'not_started',
    compareCompletedRounds: 0,
    compareReflectionAnswered: 0,
    compareReflectionCorrect: 0,
    compareCompletionScore: 0,
    compareReflectionScore: 0,
    compareTotalScore: 0,
    compareEmergencySubmitted: 'No',
    extraStatus: 'not_started',
    extraCompletedRounds: 0,
    extraReflectionAnswered: 0,
    extraReflectionCorrect: 0,
    extraCompletionScore: 0,
    extraReflectionScore: 0,
    extraTotalScore: 0,
    extraEmergencySubmitted: 'No',
    lastModeVisited: 'mode_select'
  });
  const sheet = getSheet_('Sessions');
  sheet.appendRow(row);
  return {
    sessionId,
    studentName: cleanName,
    period: cleanPeriod,
    config: getClientConfig_()
  };
}

function saveCompareSubmission(payload) {
  initializeSheets_();
  return saveModeSubmission_('compare', payload || {});
}

function saveExtraSubmission(payload) {
  initializeSheets_();
  return saveModeSubmission_('extra', payload || {});
}

function saveEmergencySubmission(payload) {
  initializeSheets_();
  const mode = (payload && payload.mode) || '';
  if (mode !== 'compare' && mode !== 'extra') throw new Error('Emergency submit requires a valid mode.');
  return saveModeSubmission_(mode, payload || {}, true);
}

function saveModeSubmission_(mode, payload, isEmergency) {
  const sessionId = String(payload.sessionId || '');
  if (!sessionId) throw new Error('Missing session ID.');
  const sessionInfo = getSessionInfo_(sessionId);
  if (!sessionInfo) throw new Error('Session not found.');

  const modePayload = normalizePayload_(mode, payload, sessionInfo);
  writeRoundRows_(modePayload.roundRows);
  writeResponseRows_(modePayload.responseRows);
  updateSessionRow_(sessionInfo.rowNumber, buildSessionUpdateMap_(mode, modePayload, isEmergency));

  return {
    ok: true,
    mode,
    emergency: !!isEmergency,
    totals: modePayload.summary
  };
}

function getSessionInfo_(sessionId) {
  const sheet = getSheet_('Sessions');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  const headers = values[0];
  const idx = headerMap_(headers);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idx.sessionId]) === sessionId) {
      return {
        rowNumber: r + 1,
        headers,
        idx,
        record: values[r]
      };
    }
  }
  return null;
}

function normalizePayload_(mode, payload, sessionInfo) {
  const sessionId = payload.sessionId;
  const studentName = String(payload.studentName || sessionInfo.record[sessionInfo.idx.studentName] || '');
  const period = String(payload.period || sessionInfo.record[sessionInfo.idx.period] || '');
  const submittedAt = new Date();
  const history = Array.isArray(payload.history) ? payload.history : [];
  const responses = Array.isArray(payload.responses) ? payload.responses : [];
  const summary = payload.summary || {};

  const roundRows = history.map(function(step) {
    return [
      submittedAt,
      sessionId,
      studentName,
      period,
      mode,
      step.patientType || '',
      step.round || '',
      step.roll || '',
      step.adherence || '',
      step.red || 0,
      step.blue || 0,
      step.yellow || 0,
      step.total || 0,
      step.total > 0 ? (step.yellow || 0) / step.total : 0
    ];
  });

  const responseRows = responses.map(function(resp) {
    return [
      submittedAt,
      sessionId,
      studentName,
      period,
      mode,
      resp.questionId || '',
      resp.prompt || '',
      resp.selected || '',
      resp.correctAnswer || '',
      resp.isCorrect ? 'Yes' : 'No',
      resp.pointsPossible || 0,
      resp.pointsEarned || 0
    ];
  });

  return {
    sessionId,
    studentName,
    period,
    submittedAt,
    roundRows,
    responseRows,
    summary
  };
}

function buildSessionUpdateMap_(mode, payload, isEmergency) {
  const s = payload.summary || {};
  const submittedAt = payload.submittedAt;
  const map = { lastModeVisited: mode };
  if (mode === 'compare') {
    map.compareStatus = isEmergency ? 'partial' : 'submitted';
    map.compareCompletedRounds = s.completedRounds || 0;
    map.compareReflectionAnswered = s.reflectionAnswered || 0;
    map.compareReflectionCorrect = s.reflectionCorrect || 0;
    map.compareCompletionScore = s.completionScore || 0;
    map.compareReflectionScore = s.reflectionScore || 0;
    map.compareTotalScore = s.totalScore || 0;
    map.compareEmergencySubmitted = isEmergency ? 'Yes' : 'No';
    map.compareSubmittedAt = submittedAt;
    map.comparePatientAFinalRed = s.patientAFinalRed || 0;
    map.comparePatientAFinalBlue = s.patientAFinalBlue || 0;
    map.comparePatientAFinalYellow = s.patientAFinalYellow || 0;
    map.comparePatientAFinalTotal = s.patientAFinalTotal || 0;
    map.comparePatientBFinalRed = s.patientBFinalRed || 0;
    map.comparePatientBFinalBlue = s.patientBFinalBlue || 0;
    map.comparePatientBFinalYellow = s.patientBFinalYellow || 0;
    map.comparePatientBFinalTotal = s.patientBFinalTotal || 0;
    map.comparePatientBMissedDoses = s.patientBMissedDoses || 0;
  } else {
    map.extraStatus = isEmergency ? 'partial' : 'submitted';
    map.extraCompletedRounds = s.completedRounds || 0;
    map.extraReflectionAnswered = s.reflectionAnswered || 0;
    map.extraReflectionCorrect = s.reflectionCorrect || 0;
    map.extraCompletionScore = s.completionScore || 0;
    map.extraReflectionScore = s.reflectionScore || 0;
    map.extraTotalScore = s.totalScore || 0;
    map.extraEmergencySubmitted = isEmergency ? 'Yes' : 'No';
    map.extraSubmittedAt = submittedAt;
    map.extraFinalRed = s.finalRed || 0;
    map.extraFinalBlue = s.finalBlue || 0;
    map.extraFinalYellow = s.finalYellow || 0;
    map.extraFinalTotal = s.finalTotal || 0;
    map.extraMissedDoses = s.missedDoses || 0;
  }
  return map;
}

function writeRoundRows_(rows) {
  if (!rows || !rows.length) return;
  const sheet = getSheet_('RoundData');
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function writeResponseRows_(rows) {
  if (!rows || !rows.length) return;
  const sheet = getSheet_('Responses');
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function updateSessionRow_(rowNumber, updateMap) {
  const sheet = getSheet_('Sessions');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idx = headerMap_(headers);
  Object.keys(updateMap).forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(idx, key)) {
      sheet.getRange(rowNumber, idx[key] + 1).setValue(updateMap[key]);
    }
  });
}

function initializeSheets_() {
  ensureSheet_('Sessions', sessionHeaders_());
  ensureSheet_('RoundData', [
    'timestamp', 'sessionId', 'studentName', 'period', 'mode', 'patientType', 'round', 'roll', 'adherence',
    'red', 'blue', 'yellow', 'total', 'yellowShare'
  ]);
  ensureSheet_('Responses', [
    'timestamp', 'sessionId', 'studentName', 'period', 'mode', 'questionId', 'prompt', 'selected', 'correctAnswer',
    'isCorrect', 'pointsPossible', 'pointsEarned'
  ]);
}

function ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  const existingHeaders = sheet.getLastRow() >= 1 ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0] : [];
  const needsHeader = headers.some(function(h, i) { return existingHeaders[i] !== h; });
  if (sheet.getLastRow() === 0 || needsHeader) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function sessionHeaders_() {
  return [
    'timestamp', 'sessionId', 'studentName', 'period',
    'compareStatus', 'compareCompletedRounds', 'compareReflectionAnswered', 'compareReflectionCorrect',
    'compareCompletionScore', 'compareReflectionScore', 'compareTotalScore', 'compareEmergencySubmitted', 'compareSubmittedAt',
    'comparePatientAFinalRed', 'comparePatientAFinalBlue', 'comparePatientAFinalYellow', 'comparePatientAFinalTotal',
    'comparePatientBFinalRed', 'comparePatientBFinalBlue', 'comparePatientBFinalYellow', 'comparePatientBFinalTotal', 'comparePatientBMissedDoses',
    'extraStatus', 'extraCompletedRounds', 'extraReflectionAnswered', 'extraReflectionCorrect',
    'extraCompletionScore', 'extraReflectionScore', 'extraTotalScore', 'extraEmergencySubmitted', 'extraSubmittedAt',
    'extraFinalRed', 'extraFinalBlue', 'extraFinalYellow', 'extraFinalTotal', 'extraMissedDoses',
    'lastModeVisited'
  ];
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet: ' + name);
  return sheet;
}

function buildSessionRow_(obj) {
  const headers = sessionHeaders_();
  return headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
}

function headerMap_(headers) {
  return headers.reduce(function(map, h, i) {
    map[h] = i;
    return map;
  }, {});
}

function getClientConfig_() {
  return {
    periods: CONFIG.periods,
    compareRounds: CONFIG.compareRounds,
    extraRounds: CONFIG.extraRounds,
    compareStarting: CONFIG.compareStarting,
    extraStarting: CONFIG.extraStarting,
    comparePoints: CONFIG.comparePoints,
    extraPoints: CONFIG.extraPoints,
    compareReflectionBlueprints: CONFIG.compareReflectionQuestions.map(function(q) { return { id: q.id }; }),
    extraReflectionBlueprints: CONFIG.extraReflectionQuestions.map(function(q) { return { id: q.id }; })
  };
}

function buildCompareReflection(data) {
  return CONFIG.compareReflectionQuestions.map(function(q) {
    return q.build(data);
  });
}

function buildExtraReflection(data) {
  return CONFIG.extraReflectionQuestions.map(function(q) {
    return q.build(data);
  });
}

function determineDominantTypeText(counts) {
  const items = [
    { label: 'Low resistance (red)', value: counts.red || 0 },
    { label: 'Average resistance (blue)', value: counts.blue || 0 },
    { label: 'High resistance (yellow)', value: counts.yellow || 0 }
  ];
  const max = Math.max.apply(null, items.map(function(i) { return i.value; }));
  const winners = items.filter(function(i) { return i.value === max; });
  return winners.length === 1 ? winners[0].label : 'There was a tie for the largest share';
}
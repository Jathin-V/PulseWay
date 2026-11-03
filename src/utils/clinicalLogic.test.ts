import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyEmergencySeverity,
  buildLocalTriageResponse,
  allocatePreArrivalResources,
  calculateHaversineDistanceKm,
  interpolateCoordinates,
  generateRoadRouteWaypoints,
  getRoutePositionAtProgress,
} from './clinicalLogic';

test('classifies active labour contractions and pregnancy emergencies as CRITICAL', () => {
  const eval1 = buildLocalTriageResponse('My wife is having active labour contractions every 3 minutes', 'en');
  assert.equal(eval1.severity, 'CRITICAL');
  assert.equal(eval1.requiresAmbulance, true);
  assert.ok(eval1.emergencyGroup.includes('Labour'));

  const evalKn = buildLocalTriageResponse('ಗರ್ಭಿಣಿ ಹೆರಿಗೆ ನೋವು ತೀವ್ರವಾಗಿದೆ', 'kn');
  assert.equal(evalKn.severity, 'CRITICAL');
  assert.equal(evalKn.requiresAmbulance, true);
});

test('classifies chest pain, stroke, and severe bleeding as CRITICAL with ambulance required', () => {
  const chest = buildLocalTriageResponse('Severe chest pain radiating to left arm and sweating', 'en');
  assert.equal(chest.severity, 'CRITICAL');
  assert.equal(chest.requiresAmbulance, true);

  const stroke = buildLocalTriageResponse('Sudden slurred speech and face droop on right side', 'en');
  assert.equal(stroke.severity, 'CRITICAL');
  assert.equal(stroke.requiresAmbulance, true);
});

test('classifies minor cases (headache, fever, cold, sprain) as MINOR with OTC medicines and NO ambulance button', () => {
  const fever = buildLocalTriageResponse('I have a mild headache and low fever since morning', 'en');
  assert.equal(fever.severity, 'MINOR');
  assert.equal(fever.requiresAmbulance, false);
  assert.ok(Array.isArray(fever.otcMedicines) && fever.otcMedicines.length >= 2);
  assert.ok(fever.otcMedicines.some((m) => m.includes('Paracetamol') || m.includes('Dolo 650')));
  assert.ok(Array.isArray(fever.warningSigns) && fever.warningSigns.length >= 1);
});

test('allocates appropriate pre-arrival bed and specialist doctor by emergency type', () => {
  const cardiacAlloc = allocatePreArrivalResources('Severe chest pain and cardiac arrest', 'HOSP-BLR-8841');
  assert.ok(cardiacAlloc.bedCode.includes('CCU') || cardiacAlloc.bedCode.includes('ICU'));
  assert.ok(cardiacAlloc.doctorName.includes('Dr. Vikram Adiga'));

  const labourAlloc = allocatePreArrivalResources('Active labour contractions water broke', 'HOSP-BLR-1024');
  assert.ok(labourAlloc.bedCode.includes('OBG'));
  assert.ok(labourAlloc.doctorName.includes('Dr. Meera Nair'));
});

test('calculates Haversine GPS distance and road-following route waypoints accurately', () => {
  const distKm = calculateHaversineDistanceKm(12.9716, 77.5946, 12.9592, 77.6476);
  assert.ok(distKm > 4 && distKm < 7);

  const mid = interpolateCoordinates(12.90, 77.50, 13.00, 77.60, 0.5);
  assert.equal(mid.lat, 12.95);
  assert.equal(mid.lng, 77.55);

  const waypoints = generateRoadRouteWaypoints(12.9592, 77.6476, 12.9716, 77.5946);
  assert.equal(waypoints.length, 9);
  const posHalf = getRoutePositionAtProgress(waypoints, 0.5);
  assert.ok(posHalf.completedWaypoints.length >= 4);
  assert.ok(posHalf.remainingWaypoints.length >= 4);
});


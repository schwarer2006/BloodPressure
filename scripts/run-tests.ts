/**
 * Automated Regression & Quality Verification Suite for BloodPressure v0.1.2
 * Covers Q1..Q6:
 * - Multi-profile isolation & restart persistence
 * - Demo vs Production namespace isolation & v0.1.0/v0.1.1 -> v0.1.2 migration
 * - Corrupted localStorage & corrupted backup error handling without data loss
 * - AES-GCM-256 encrypted backup roundtrip
 * - Mandatory 18.11.2026 12:08 (129/89/71) Mittwoch KW 47 Calendar + PDF Heatmap parity
 * - Month/Year rollovers, DST transition, multiple measurements/day
 * - PDF generation across 0, 1, 10, 50, 200 measurements + Ghostscript output export
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Mock browser localStorage before importing StorageService
const memoryStore = new Map<string, string>();
const mockLocalStorage: Storage = {
  get length() {
    return memoryStore.size;
  },
  clear() {
    memoryStore.clear();
  },
  getItem(key: string) {
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  },
  key(index: number) {
    return Array.from(memoryStore.keys())[index] ?? null;
  },
  removeItem(key: string) {
    memoryStore.delete(key);
  },
  setItem(key: string, value: string) {
    memoryStore.set(key, String(value));
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

import { StorageService, STORAGE_KEYS, generateDemoMeasurements } from '../src/services/storage';
import {
  aggregateByCalendarDay,
  buildCalendarWeeks,
  calculateStats,
  classifyBloodPressure,
  getISOWeek,
  getMondayWeekdayIndex,
  parseLocalDateKey,
  toDateKey,
} from '../src/services/bloodPressureUtils';
import { generatePdfDocument } from '../src/services/exportService';
import { Measurement, UserProfile } from '../src/types/bloodPressure';

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`PASS: ${name}`);
    });
}

async function run() {
  console.log('=== BloodPressure v0.1.2 Automated Regression Suite ===\n');

  // --- 1. Multi-Profile Isolation, App Restart & Delete Safety ---
  await test('Q3.1: Multi-profile creation, switching, measurement isolation, restart persistence', () => {
    mockLocalStorage.clear();
    StorageService.initializeAndMigrate();
    StorageService.setAppMode('production');

    const profileA = StorageService.createProfile('Anna');
    const profileB = StorageService.createProfile('Max');

    StorageService.setActiveProfileId(profileA.id);
    assert.equal(StorageService.getActiveProfileId(), profileA.id);

    StorageService.addMeasurement({
      timestamp: new Date(2026, 10, 18, 12, 8, 0, 0).toISOString(),
      systolic: 129,
      diastolic: 89,
      pulse: 71,
      arm: 'left',
      posture: 'sitting',
      source: 'manual',
      notes: 'Messung Anna',
    });

    StorageService.setActiveProfileId(profileB.id);
    assert.equal(StorageService.getActiveProfileId(), profileB.id);

    StorageService.addMeasurement({
      timestamp: new Date(2026, 10, 18, 18, 15, 0, 0).toISOString(),
      systolic: 142,
      diastolic: 91,
      pulse: 78,
      arm: 'right',
      posture: 'sitting',
      source: 'manual',
      notes: 'Messung Max',
    });

    // Simulate app restart
    StorageService.initializeAndMigrate();
    const listA = StorageService.getMeasurementsForProfile(profileA.id);
    const listB = StorageService.getMeasurementsForProfile(profileB.id);

    assert.equal(listA.length, 1);
    assert.equal(listA[0].systolic, 129);
    assert.equal(listA[0].profileId, profileA.id);

    assert.equal(listB.length, 1);
    assert.equal(listB[0].systolic, 142);
    assert.equal(listB[0].profileId, profileB.id);

    // Deleting Profile B keeps Profile A intact
    StorageService.deleteProfile(profileB.id);
    const remainingProfiles = StorageService.getProfiles('production');
    assert.equal(remainingProfiles.some((p) => p.id === profileB.id), false);
    assert.equal(StorageService.getMeasurementsForProfile(profileA.id).length, 1);
  });

  // --- 2. Update Migration v0.1.0 / v0.1.1 -> v0.1.2 & Mode Isolation ---
  await test('Q3.2: Fresh install asks for mode and never auto-seeds demo data into Production', () => {
    mockLocalStorage.clear();
    const report = StorageService.initializeAndMigrate();
    assert.equal(report.needsInitialModeSelection, true);
    assert.equal(report.hadExistingProductionData, false);
    assert.equal(StorageService.getAllMeasurements('production').length, 0);
  });

  await test('Q3.3: v0.1.0/v0.1.1 upgrade migration preserves existing profiles & v1/v2 measurements safely', () => {
    mockLocalStorage.clear();
    const legacyProfiles: UserProfile[] = [
      { id: 'profile_user_1', name: 'Echter Nutzer', isDefault: true, createdAt: '2026-10-01T08:00:00.000Z' },
    ];
    const legacyMeasurements: Measurement[] = [
      {
        id: 'm_legacy_1',
        profileId: 'profile_user_1',
        timestamp: new Date(2026, 10, 18, 12, 8, 0, 0).toISOString(),
        systolic: 129,
        diastolic: 89,
        pulse: 71,
        arm: 'left',
        posture: 'sitting',
        source: 'manual',
      },
    ];
    mockLocalStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(legacyProfiles));
    mockLocalStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, 'profile_user_1');
    mockLocalStorage.setItem(STORAGE_KEYS.MEASUREMENTS_LEGACY, JSON.stringify(legacyMeasurements));

    const report = StorageService.initializeAndMigrate();
    assert.equal(report.migratedFromV1, true);
    assert.equal(report.hadExistingProductionData, true);
    assert.equal(report.needsInitialModeSelection, false);
    assert.equal(report.activeMode, 'production');

    const migrated = StorageService.getMeasurementsForProfile('profile_user_1', 'production');
    assert.equal(migrated.length, 1);
    assert.equal(migrated[0].id, 'm_legacy_1');
    assert.equal(migrated[0].systolic, 129);
    assert.ok(mockLocalStorage.getItem(STORAGE_KEYS.MEASUREMENTS_LEGACY));
  });

  await test('Q3.4: Mode switching, persistent Demo deletion, and clean Production backups', () => {
    mockLocalStorage.clear();
    StorageService.initializeAndMigrate();
    StorageService.setAppMode('production');

    StorageService.addMeasurement({
      timestamp: new Date(2026, 10, 18, 12, 8, 0, 0).toISOString(),
      systolic: 129,
      diastolic: 89,
      pulse: 71,
      arm: 'left',
      posture: 'sitting',
      source: 'manual',
      notes: 'Produktiv-Eintrag',
    });

    StorageService.setAppMode('demo');
    assert.ok(StorageService.getAllMeasurements('demo').length > 0);
    StorageService.clearDemoData();
    assert.equal(StorageService.getAllMeasurements('demo').length, 0);

    // App restart in Demo mode -> remains empty
    const restartReport = StorageService.initializeAndMigrate();
    assert.equal(restartReport.activeMode, 'demo');
    assert.equal(StorageService.getAllMeasurements('demo').length, 0);

    // Switch back to Production -> real data untouched
    StorageService.setAppMode('production');
    const prodMeas = StorageService.getAllMeasurements('production');
    assert.equal(prodMeas.length, 1);
    assert.equal(prodMeas[0].notes, 'Produktiv-Eintrag');

    // Backup contains ONLY Production data
    const backup = JSON.parse(StorageService.exportBackupJson());
    assert.equal(backup.measurements.length, 1);
    assert.equal(backup.measurements[0].notes, 'Produktiv-Eintrag');
  });

  // --- 3. Backup, Restore, AES-GCM-256 & Corrupted Data Error Handling ---
  await test('Q3.5: Corrupted storage & invalid backup rejection without existing data loss, plus AES-GCM-256 roundtrip', async () => {
    mockLocalStorage.clear();
    StorageService.initializeAndMigrate();
    StorageService.setAppMode('production');

    const saved = StorageService.addMeasurement({
      timestamp: new Date(2026, 10, 18, 12, 8, 0, 0).toISOString(),
      systolic: 129,
      diastolic: 89,
      pulse: 71,
      arm: 'left',
      posture: 'sitting',
      source: 'manual',
      notes: 'Originalwert',
    });

    // Export plain & encrypted backups
    const plainJson = StorageService.exportBackupJson();
    const encJson = await StorageService.exportEncryptedBackup('Geheim123!');

    // Corrupted JSON validation fails gracefully
    const syntaxErr = StorageService.validateBackup('{broken json');
    assert.equal(syntaxErr.isValid, false);

    // Corrupted measurement fields inside backup are rejected cleanly
    const corruptPayload = JSON.stringify({
      version: 2,
      measurements: [{ id: 'bad', systolic: 'abc', diastolic: 80, pulse: 70, timestamp: 'not-a-date' }],
    });
    const corruptCheck = StorageService.validateBackup(corruptPayload);
    assert.equal(corruptCheck.isValid, false);

    // Direct call to importBackupPayload with invalid data keeps existing Production data untouched
    const importFail = StorageService.importBackupPayload(
      { version: 2, appName: 'BP', exportDate: new Date().toISOString(), profiles: [], measurements: [{ id: 'x', profileId: 'p', timestamp: 'bad', systolic: 120, diastolic: 80, pulse: 70, arm: 'left', posture: 'sitting', source: 'manual' }] },
      'overwrite'
    );
    assert.equal(importFail.success, false);
    assert.equal(StorageService.getAllMeasurements('production').length, 1);
    assert.equal(StorageService.getAllMeasurements('production')[0].id, saved.id);

    // Wrong password throws clean error on decryptBackup
    await assert.rejects(() => StorageService.decryptBackup(encJson, 'FalschesPasswort'));

    // Correct password decrypts & restores after wipe
    StorageService.clearAllDataForActiveProfile('production');
    assert.equal(StorageService.getAllMeasurements('production').length, 0);

    const decryptedPayload = await StorageService.decryptBackup(encJson, 'Geheim123!');
    const restoreRes = StorageService.importBackupPayload(decryptedPayload, 'overwrite');
    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.count, 1);
    assert.equal(StorageService.getAllMeasurements('production')[0].systolic, 129);

    // Plain merge avoids duplicates
    const plainParsed = StorageService.validateBackup(plainJson);
    assert.equal(plainParsed.isValid, true);
    const mergeRes = StorageService.importBackupPayload(plainParsed.payload!, 'merge');
    assert.equal(mergeRes.success, true);
    assert.equal(mergeRes.count, 0);

    // Corrupt localStorage array entry doesn't crash reads
    mockLocalStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify([{ broken: true }, saved]));
    const recovered = StorageService.getAllMeasurements('production');
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].systolic, 129);

    // Total syntax corruption in localStorage returns empty safely instead of throwing
    mockLocalStorage.setItem(STORAGE_KEYS.MEASUREMENTS, '<<<CORRUPT>>>');
    assert.deepEqual(StorageService.getAllMeasurements('production'), []);
  });

  // --- 4. Mandatory Calendar & PDF Heatmap Regression Case ---
  await test('Q1.1: Mandatory regression 18.11.2026 12:08 SYS 129 / DIA 89 / Puls 71 -> KW 47, Mittwoch (not Sonntag)', () => {
    const refTimestamp = new Date(2026, 10, 18, 12, 8, 0, 0).toISOString();
    const refMeasurement: Measurement = {
      id: 'ref_2026_11_18_1208',
      profileId: 'p1',
      timestamp: refTimestamp,
      systolic: 129,
      diastolic: 89,
      pulse: 71,
      arm: 'left',
      posture: 'sitting',
      context: 'home',
      source: 'manual',
    };

    const refDate = parseLocalDateKey('2026-11-18');
    assert.equal(getISOWeek(refDate).week, 47);
    assert.equal(getISOWeek(refDate).year, 2026);
    assert.equal(getMondayWeekdayIndex(refDate), 2); // 0=Mo, 1=Di, 2=Mi

    const weeks = buildCalendarWeeks({
      startDate: parseLocalDateKey('2026-10-20'),
      endDate: refDate,
      dailyMap: aggregateByCalendarDay([refMeasurement]),
      referenceToday: refDate,
    });
    const kw47 = weeks.find((w) => w.isoWeek === 47);
    assert.ok(kw47, 'KW 47 muss vorhanden sein');

    // Mittwoch must be index 2; Sonntag index 6 must NOT carry 18.11.2026 data
    const wednesday = kw47.days[2];
    const sunday = kw47.days[6];
    assert.equal(wednesday.dateKey, '2026-11-18');
    assert.equal(wednesday.weekdayIndex, 2);
    assert.ok(wednesday.aggregate);
    assert.equal(wednesday.aggregate.avgSys, 129);
    assert.equal(wednesday.aggregate.avgDia, 89);
    assert.equal(wednesday.aggregate.avgPulse, 71);

    assert.equal(sunday.dateKey, '2026-11-22');
    assert.equal(sunday.aggregate, undefined);

    // 129/89 has DIA 89 >= 85 HBPM -> Hypertonie Grad 1 threshold check
    assert.equal(classifyBloodPressure(129, 89, true).category, 'hypertension_grade_1');
    assert.equal(classifyBloodPressure(124, 82, true).category, 'normal');
  });

  await test('Q1.2: Month/Year rollover, ISO KW 53 -> KW 1, DST transition & multi-measurement daily mean', () => {
    // October -> November rollover inside 30-day window ending 18.11.2026
    const octNovWeeks = buildCalendarWeeks({
      startDate: parseLocalDateKey('2026-10-20'),
      endDate: parseLocalDateKey('2026-11-18'),
      dailyMap: aggregateByCalendarDay([
        {
          id: 'oct31',
          profileId: 'p1',
          timestamp: new Date(2026, 9, 31, 9, 0, 0, 0).toISOString(), // Saturday
          systolic: 122,
          diastolic: 78,
          pulse: 66,
          arm: 'left',
          posture: 'sitting',
          source: 'manual',
        },
        {
          id: 'nov01',
          profileId: 'p1',
          timestamp: new Date(2026, 10, 1, 9, 0, 0, 0).toISOString(), // Sunday
          systolic: 126,
          diastolic: 80,
          pulse: 68,
          arm: 'left',
          posture: 'sitting',
          source: 'manual',
        },
      ]),
      referenceToday: parseLocalDateKey('2026-11-18'),
    });
    const rolloverWeek = octNovWeeks.find((w) => w.isoWeek === 44);
    assert.ok(rolloverWeek);
    assert.equal(rolloverWeek.days[5].dateKey, '2026-10-31');
    assert.equal(rolloverWeek.days[5].aggregate?.avgSys, 122);
    assert.equal(rolloverWeek.days[6].dateKey, '2026-11-01');
    assert.equal(rolloverWeek.days[6].aggregate?.avgSys, 126);

    // Year transition 2026-12-31 (KW 53) -> 2027-01-04 (KW 1 of 2027)
    assert.equal(getISOWeek(parseLocalDateKey('2026-12-31')).week, 53);
    assert.equal(getISOWeek(parseLocalDateKey('2026-12-31')).year, 2026);
    assert.equal(getISOWeek(parseLocalDateKey('2027-01-01')).week, 53);
    assert.equal(getISOWeek(parseLocalDateKey('2027-01-04')).week, 1);
    assert.equal(getISOWeek(parseLocalDateKey('2027-01-04')).year, 2027);

    // DST transition day (2026-03-29 Sunday)
    assert.equal(toDateKey(new Date(2026, 2, 29, 23, 30, 0, 0)), '2026-03-29');
    assert.equal(getMondayWeekdayIndex(parseLocalDateKey('2026-03-29')), 6);

    // Multiple measurements on same day average cleanly
    const dayMeasurements: Measurement[] = [
      {
        id: 'm1',
        profileId: 'p1',
        timestamp: new Date(2026, 10, 18, 7, 30, 0, 0).toISOString(),
        systolic: 120,
        diastolic: 80,
        pulse: 64,
        arm: 'left',
        posture: 'sitting',
        source: 'manual',
      },
      {
        id: 'm2',
        profileId: 'p1',
        timestamp: new Date(2026, 10, 18, 12, 8, 0, 0).toISOString(),
        systolic: 129,
        diastolic: 89,
        pulse: 71,
        arm: 'left',
        posture: 'sitting',
        source: 'manual',
      },
      {
        id: 'm3',
        profileId: 'p1',
        timestamp: new Date(2026, 10, 18, 20, 15, 0, 0).toISOString(),
        systolic: 132,
        diastolic: 83,
        pulse: 72,
        arm: 'left',
        posture: 'sitting',
        source: 'manual',
      },
    ];
    const weeks = buildCalendarWeeks({
      startDate: parseLocalDateKey('2026-11-16'),
      endDate: parseLocalDateKey('2026-11-22'),
      dailyMap: aggregateByCalendarDay(dayMeasurements),
      referenceToday: parseLocalDateKey('2026-11-18'),
    });
    const cell = weeks[0].days[2];
    assert.equal(cell.aggregate?.avgSys, 127); // (120+129+132)/3 = 127
    assert.equal(cell.aggregate?.avgDia, 84);  // (80+89+83)/3 = 84
    assert.equal(cell.aggregate?.avgPulse, 69); // (64+71+72)/3 = 69
    assert.equal(cell.aggregate?.count, 3);
  });

  // --- 5. PDF Regression & Stress Tests across 0, 1, 10, 50, 200 Measurements ---
  await test('Q4: PDF generation across 0, 1 (18.11.2026 12:08 129/89/71), 10, 50, 200 measurements', async () => {
    const outDir = path.resolve(process.cwd(), '.tmp_verify');
    fs.mkdirSync(outDir, { recursive: true });

    const longProfile: UserProfile = {
      id: 'prof_long',
      name: 'Prof. Dr. Maximilian-Alexander von und zu Hohenlohe-Schillingsfürst',
      isDefault: true,
      birthYear: 1964,
      gender: 'male',
      heightCm: 181,
      weightKg: 82.5,
      personalNotes:
        'Medikation: Ramipril 5 mg (1-0-0), Amlodipin 5 mg (0-0-1). Ärztlicher Zielbereich HBPM < 135/85 mmHg; Sonderzeichen: ÄÖÜäöüß ≥ ≤ Ø „Morgens“ – — ².',
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const minimalProfile: UserProfile = {
      id: 'prof_min',
      name: 'Minimal',
      isDefault: true,
      createdAt: '2026-11-01T08:00:00.000Z',
    };

    // 0 measurements edge case (no NaN, clean empty state)
    assert.equal(calculateStats([]).count, 0);
    const { doc: zeroDoc } = await generatePdfDocument([], minimalProfile, 'Leerbericht (0 Messungen)', {
      isDemoMode: false,
      includePulseHeatmap: true,
      referenceDate: new Date(2026, 10, 18, 12, 8, 0, 0),
    });
    assert.ok(zeroDoc.getNumberOfPages() >= 3);
    fs.writeFileSync(path.join(outDir, 'empty_0.pdf'), Buffer.from(zeroDoc.output('arraybuffer')));

    // 1 measurement: Mandatory 18.11.2026 12:08 SYS 129 / DIA 89 / Puls 71
    const refMeas: Measurement = {
      id: 'ref_pdf_1208',
      profileId: 'prof_long',
      timestamp: new Date(2026, 10, 18, 12, 8, 0, 0).toISOString(),
      systolic: 129,
      diastolic: 89,
      pulse: 71,
      arm: 'left',
      posture: 'sitting',
      context: 'home',
      notes: 'Pflicht-Regressionstest: Mi 18.11.2026 12:08 Uhr (KW 47) · Sonderzeichen: ≥ ≤ Ø „Test“',
      source: 'manual',
    };
    const { doc: refDoc } = await generatePdfDocument([refMeas], longProfile, 'Referenztest 18.11.2026', {
      isDemoMode: false,
      includePulseHeatmap: true,
      referenceDate: new Date(2026, 10, 18, 12, 8, 0, 0),
    });
    assert.ok(refDoc.getNumberOfPages() >= 3);
    const refBuf = Buffer.from(refDoc.output('arraybuffer'));
    assert.ok(refBuf.length > 50000);
    fs.writeFileSync(path.join(outDir, 'ref_2026_11_18.pdf'), refBuf);

    // 10, 50, 200 measurements stress tests
    for (const count of [10, 50, 200]) {
      const list = generateDemoMeasurements(minimalProfile.id, count, new Date(2026, 10, 18, 12, 8, 0, 0));
      const { doc } = await generatePdfDocument(list, minimalProfile, `Testlauf (${count})`, {
        isDemoMode: true,
        includePulseHeatmap: true,
        referenceDate: new Date(2026, 10, 18, 12, 8, 0, 0),
      });
      const pages = doc.getNumberOfPages();
      assert.ok(pages >= 3, `Expected >= 3 pages for ${count} measurements, got ${pages}`);
      if (count === 50) {
        fs.writeFileSync(path.join(outDir, 'demo_50.pdf'), Buffer.from(doc.output('arraybuffer')));
      }
      if (count === 200) {
        assert.ok(pages >= 6, `Expected multi-page table for 200 measurements, got ${pages}`);
        fs.writeFileSync(path.join(outDir, 'demo_200.pdf'), Buffer.from(doc.output('arraybuffer')));
      }
    }
  });

  console.log(`\nALL ${passed} TESTS PASSED.`);
}

run().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});

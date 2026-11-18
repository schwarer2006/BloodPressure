/**
 * Automated Verification Suite for BloodPressure v0.1.1
 * Covers Gate 1 (BP-001), Gate 2 (BP-002), Gate 4 (BP-004 PDF), Gate 5 (BP-005 Calendar/Heatmap)
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
  console.log('=== BloodPressure v0.1.1 Automated Test Suite ===\n');

  // --- GATE 1 (BP-001): Multi-Profile & Isolation ---
  await test('BP-001: Multi-profile creation, switching, measurement isolation, restart persistence', () => {
    mockLocalStorage.clear();
    StorageService.initializeAndMigrate();
    StorageService.setAppMode('production');

    const profileA = StorageService.createProfile('Anna');
    const profileB = StorageService.createProfile('Max');

    StorageService.setActiveProfileId(profileA.id);
    assert.equal(StorageService.getActiveProfileId(), profileA.id);

    StorageService.addMeasurement({
      timestamp: new Date(2026, 10, 18, 10, 3, 0, 0).toISOString(),
      systolic: 124,
      diastolic: 82,
      pulse: 120,
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

    // Simulate app restart by running initializeAndMigrate & reading fresh from storage
    StorageService.initializeAndMigrate();
    const listA = StorageService.getMeasurementsForProfile(profileA.id);
    const listB = StorageService.getMeasurementsForProfile(profileB.id);

    assert.equal(listA.length, 1);
    assert.equal(listA[0].systolic, 124);
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

  // --- GATE 2 (BP-002): Demo vs Production Isolation & Safe Migration ---
  await test('BP-002.1: Fresh install asks for mode and never auto-seeds demo data into Production', () => {
    mockLocalStorage.clear();
    const report = StorageService.initializeAndMigrate();
    assert.equal(report.needsInitialModeSelection, true);
    assert.equal(report.hadExistingProductionData, false);
    assert.equal(StorageService.getAllMeasurements('production').length, 0);
  });

  await test('BP-002.2: v0.1.0 migration preserves existing production profiles & v1 measurements safely', () => {
    mockLocalStorage.clear();
    const legacyProfiles: UserProfile[] = [
      { id: 'profile_user_1', name: 'Echter Nutzer', isDefault: true, createdAt: '2026-10-01T08:00:00.000Z' },
    ];
    const legacyMeasurements: Measurement[] = [
      {
        id: 'm_legacy_1',
        profileId: 'profile_user_1',
        timestamp: '2026-11-18T09:03:00.000Z',
        systolic: 124,
        diastolic: 82,
        pulse: 120,
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
    // Original v1 key remains untouched as safety net
    assert.ok(mockLocalStorage.getItem(STORAGE_KEYS.MEASUREMENTS_LEGACY));
  });

  await test('BP-002.3: Mode switching, persistent Demo deletion, and clean Production backups', () => {
    mockLocalStorage.clear();
    StorageService.initializeAndMigrate();
    StorageService.setAppMode('production');

    StorageService.addMeasurement({
      timestamp: '2026-11-18T10:03:00.000Z',
      systolic: 128,
      diastolic: 84,
      pulse: 72,
      arm: 'left',
      posture: 'sitting',
      source: 'manual',
      notes: 'Produktiv-Eintrag',
    });

    // Switch to Demo & clear Demo permanently
    StorageService.setAppMode('demo');
    assert.ok(StorageService.getAllMeasurements('demo').length > 0);
    StorageService.clearDemoData();
    assert.equal(StorageService.getAllMeasurements('demo').length, 0);

    // Simulate app restart in Demo mode -> must remain empty!
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

  // --- GATE 5 (BP-005): Calendar Heatmap Precision & Edge Cases ---
  await test('BP-005.1: Reference date 18.11.2026 10:03 SYS 124 / DIA 82 / Puls 120 -> KW 47, Mittwoch', () => {
    const refTimestamp = new Date(2026, 10, 18, 10, 3, 0, 0).toISOString();
    const refMeasurement: Measurement = {
      id: 'ref_2026_11_18',
      profileId: 'p1',
      timestamp: refTimestamp,
      systolic: 124,
      diastolic: 82,
      pulse: 120,
      arm: 'left',
      posture: 'sitting',
      context: 'home',
      source: 'manual',
    };

    const refDate = parseLocalDateKey('2026-11-18');
    assert.equal(getISOWeek(refDate).week, 47);
    assert.equal(getISOWeek(refDate).year, 2026);
    assert.equal(getMondayWeekdayIndex(refDate), 2); // 0=Mo, 1=Di, 2=Mi

    assert.equal(getMondayWeekdayIndex(parseLocalDateKey('2026-11-16')), 0); // Mo
    assert.equal(getMondayWeekdayIndex(parseLocalDateKey('2026-11-22')), 6); // So

    const weeks = buildCalendarWeeks({
      startDate: parseLocalDateKey('2026-11-01'),
      endDate: parseLocalDateKey('2026-11-22'),
      dailyMap: aggregateByCalendarDay([refMeasurement]),
      referenceToday: refDate,
    });
    const kw47 = weeks.find((w) => w.isoWeek === 47);
    assert.ok(kw47, 'KW 47 muss vorhanden sein');

    // Mittwoch must be index 2 (not Sunday index 6!)
    const wednesday = kw47.days[2];
    const sunday = kw47.days[6];
    assert.equal(wednesday.dateKey, '2026-11-18');
    assert.equal(wednesday.weekdayIndex, 2);
    assert.ok(wednesday.aggregate);
    assert.equal(wednesday.aggregate.avgSys, 124);
    assert.equal(wednesday.aggregate.avgDia, 82);
    assert.equal(wednesday.aggregate.avgPulse, 120);

    // Sunday 22.11.2026 must have no measurement
    assert.equal(sunday.dateKey, '2026-11-22');
    assert.equal(sunday.aggregate, undefined);

    // HBPM classification for 124/82 must be Normal (not Hoch-Normal!)
    assert.equal(classifyBloodPressure(124, 82, true).category, 'normal');
  });

  await test('BP-005.2: Month/Year rollover, ISO KW 53, DST transition & multi-measurement daily average', () => {
    // 2026-12-31 is Thursday in ISO Week 53 of 2026
    assert.equal(getISOWeek(parseLocalDateKey('2026-12-31')).week, 53);
    assert.equal(getISOWeek(parseLocalDateKey('2026-12-31')).year, 2026);
    assert.equal(getMondayWeekdayIndex(parseLocalDateKey('2026-12-31')), 3);
    assert.equal(getISOWeek(parseLocalDateKey('2027-01-01')).week, 53);
    assert.equal(getISOWeek(parseLocalDateKey('2027-01-01')).year, 2026);

    // DST transition day (2026-03-29 Sunday)
    assert.equal(toDateKey(new Date(2026, 2, 29, 23, 30, 0, 0)), '2026-03-29');
    assert.equal(getMondayWeekdayIndex(parseLocalDateKey('2026-03-29')), 6);

    // Two measurements on same day average cleanly
    const m1: Measurement = {
      id: 'm1',
      profileId: 'p1',
      timestamp: new Date(2026, 10, 18, 7, 30, 0, 0).toISOString(),
      systolic: 120,
      diastolic: 80,
      pulse: 64,
      arm: 'left',
      posture: 'sitting',
      source: 'manual',
    };
    const m2: Measurement = {
      id: 'm2',
      profileId: 'p1',
      timestamp: new Date(2026, 10, 18, 20, 15, 0, 0).toISOString(),
      systolic: 130,
      diastolic: 84,
      pulse: 72,
      arm: 'left',
      posture: 'sitting',
      source: 'manual',
    };
    const weeks = buildCalendarWeeks({
      startDate: parseLocalDateKey('2026-11-16'),
      endDate: parseLocalDateKey('2026-11-22'),
      dailyMap: aggregateByCalendarDay([m1, m2]),
      referenceToday: parseLocalDateKey('2026-11-18'),
    });
    const cell = weeks[0].days[2];
    assert.equal(cell.aggregate?.avgSys, 125);
    assert.equal(cell.aggregate?.avgDia, 82);
    assert.equal(cell.aggregate?.avgPulse, 68);
    assert.equal(cell.aggregate?.count, 2);
  });

  // --- GATE 4 (BP-004): PDF Generation Stress & Edge Cases ---
  await test('BP-004: PDF generation (1, 10, 50, 200 items, long names/notes, reference case, Demo mode)', async () => {
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
        'Medikation: Ramipril 5 mg (1-0-0), Amlodipin 5 mg (0-0-1). Ärztlicher Zielbereich HBPM < 135/85 mmHg; Sonderzeichen-Prüfung: ÄÖÜäöüß ≥ ≤ Ø „Morgens“ – — ².',
      createdAt: '2026-10-01T08:00:00.000Z',
    };

    const minimalProfile: UserProfile = {
      id: 'prof_min',
      name: 'Minimal',
      isDefault: true,
      createdAt: '2026-11-01T08:00:00.000Z',
    };

    // 1. Reference case: 18.11.2026 10:03 SYS 124 / DIA 82 / Puls 120
    const refMeas: Measurement = {
      id: 'ref_pdf_1',
      profileId: 'prof_long',
      timestamp: new Date(2026, 10, 18, 10, 3, 0, 0).toISOString(),
      systolic: 124,
      diastolic: 82,
      pulse: 120,
      arm: 'left',
      posture: 'sitting',
      context: 'home',
      notes: 'Referenzmessung am Mittwoch KW 47 nach 5 Minuten Ruhe im Sitzen – Sonderzeichen: ≥ ≤ Ø „Test“',
      source: 'manual',
    };
    const { doc: refDoc } = await generatePdfDocument([refMeas], longProfile, 'Referenztest 18.11.2026', {
      isDemoMode: false,
      includePulseHeatmap: true,
      referenceDate: new Date(2026, 10, 18, 12, 0, 0, 0),
    });
    assert.ok(refDoc.getNumberOfPages() >= 3);
    const refBuf = Buffer.from(refDoc.output('arraybuffer'));
    assert.ok(refBuf.length > 50000);
    fs.writeFileSync(path.join(outDir, 'ref_2026_11_18.pdf'), refBuf);

    // 2. Stress tests: 10, 50, 200 measurements
    for (const count of [10, 50, 200]) {
      const list = generateDemoMeasurements(minimalProfile.id, count, new Date(2026, 10, 18, 12, 0, 0, 0));
      const { doc } = await generatePdfDocument(list, minimalProfile, `Testlauf (${count})`, {
        isDemoMode: true,
        includePulseHeatmap: true,
        referenceDate: new Date(2026, 10, 18, 12, 0, 0, 0),
      });
      const pages = doc.getNumberOfPages();
      assert.ok(pages >= 3, `Expected >= 3 pages for ${count} measurements, got ${pages}`);
      if (count === 50) {
        fs.writeFileSync(path.join(outDir, 'demo_50.pdf'), Buffer.from(doc.output('arraybuffer')));
      }
    }
  });

  console.log(`\nALL ${passed} TESTS PASSED.`);
}

run().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});

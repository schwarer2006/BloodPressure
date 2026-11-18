/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppMode, Measurement, UserProfile } from '../types/bloodPressure';

export const STORAGE_KEYS = {
  // Production (Betriebsmodus) – backward compatible with v0.1.0
  MEASUREMENTS: 'bp_measurements_v2',
  MEASUREMENTS_LEGACY: 'bp_measurements_v1',
  PROFILES: 'bp_profiles_v1',
  ACTIVE_PROFILE_ID: 'bp_active_profile_id_v1',

  // Demo (strictly isolated namespace)
  DEMO_MEASUREMENTS: 'bp_demo_measurements_v1',
  DEMO_PROFILES: 'bp_demo_profiles_v1',
  DEMO_ACTIVE_PROFILE_ID: 'bp_demo_active_profile_id_v1',
  DEMO_CLEARED_FLAG: 'bp_demo_cleared_v1',

  // App Mode, Migration & Preferences
  APP_MODE: 'bp_app_mode_v1',
  SCHEMA_VERSION: 'bp_schema_version_v1',
  THEME_MODE: 'bp_theme_mode_v1',
  VIEWPORT_SHELL: 'bp_viewport_shell_v1',
};

const CURRENT_SCHEMA_VERSION = '2';

const DEFAULT_PROFILE: UserProfile = {
  id: 'profile_default',
  name: 'Mein Profil',
  isDefault: true,
  createdAt: new Date().toISOString(),
};

const DEMO_PROFILE_PRIMARY: UserProfile = {
  id: 'demo_profile_1',
  name: 'Max Mustermann (Demo)',
  isDefault: true,
  birthYear: 1968,
  gender: 'male',
  heightCm: 178,
  weightKg: 81,
  personalNotes: 'Synthetisches Demoprofil zur Test- und Funktionsansicht.',
  createdAt: '2026-10-01T08:00:00.000Z',
};

const DEMO_PROFILE_SECONDARY: UserProfile = {
  id: 'demo_profile_2',
  name: 'Erika Musterfrau (Demo)',
  isDefault: false,
  birthYear: 1972,
  gender: 'female',
  heightCm: 166,
  weightKg: 64,
  personalNotes: 'Zweites synthetisches Demoprofil (optimaler Verlauf).',
  createdAt: '2026-10-01T08:00:00.000Z',
};

function getStore(): Storage {
  return globalThis.localStorage;
}

/**
 * Creates realistic synthetic demo measurements with natural variance, morning and evening sessions.
 * Used exclusively in Demo Mode or explicit PDF stress tests — never auto-seeded into Production Mode.
 */
export function generateDemoMeasurements(
  profileId: string,
  count = 30,
  referenceDate: Date = new Date()
): Measurement[] {
  const list: Measurement[] = [];
  const baseDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0,
    0
  );

  const morningNotes = [
    'Morgens nüchtern vor dem Frühstück',
    'Vor Einnahme Ramipril 5mg',
    'Ruhig nach dem Aufstehen gemessen',
    'Vor dem Morgenkaffee',
    'Nach 5 Minuten Entspannung im Sitzen',
  ];

  const eveningNotes = [
    'Abends vor dem Abendessen',
    'Nach einem kurzen Spaziergang',
    'Nach Feierabend auf dem Sofa',
    'Ruhige Abendmessung',
    '',
  ];

  // Deterministic-friendly offset for secondary demo profile
  const isSecondary = profileId === DEMO_PROFILE_SECONDARY.id;
  const sysOffset = isSecondary ? -10 : 0;
  const diaOffset = isSecondary ? -6 : 0;

  for (let i = count - 1; i >= 0; i--) {
    const daysAgo = Math.floor(i / 2);
    const isEvening = i % 2 === 1;

    const mDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() - daysAgo
    );
    if (isEvening) {
      mDate.setHours(19 + (i % 2), (i * 13) % 55, 0, 0);
    } else {
      mDate.setHours(7 + (i % 2), (i * 17) % 55, 0, 0);
    }

    const wave = Math.sin(daysAgo / 3.5);
    const jitterSys = ((i * 7) % 11) - 5;
    const jitterDia = ((i * 5) % 9) - 4;
    const jitterPulse = ((i * 3) % 11) - 5;

    const baseSys = 126 + sysOffset + Math.round(wave * 9 + jitterSys);
    const baseDia = 81 + diaOffset + Math.round(wave * 5 + jitterDia);
    const basePulse = 69 + jitterPulse;

    const note = isEvening
      ? eveningNotes[i % eveningNotes.length]
      : morningNotes[i % morningNotes.length];

    list.push({
      id: `demo_m_${profileId}_${count}_${i}`,
      profileId,
      timestamp: mDate.toISOString(),
      systolic: Math.min(168, Math.max(105, baseSys)),
      diastolic: Math.min(102, Math.max(64, baseDia)),
      pulse: Math.min(95, Math.max(56, basePulse)),
      arm: i % 3 === 0 ? 'right' : 'left',
      posture: 'sitting',
      context: 'home',
      notes: note || undefined,
      source: 'demo',
    });
  }

  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Web Crypto AES-GCM helpers for optional password-encrypted backups
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface BackupPayload {
  version: 2;
  appName: string;
  exportDate: string;
  profiles: UserProfile[];
  measurements: Measurement[];
  settings?: {
    themeMode: string;
    viewportShell: string;
  };
}

export interface MigrationReport {
  schemaVersion: string;
  migratedFromV1: boolean;
  hadExistingProductionData: boolean;
  needsInitialModeSelection: boolean;
  activeMode: AppMode;
}

/**
 * Persistent Storage Controller with strict namespace separation between Production & Demo
 */
export const StorageService = {
  // --- Migration & Mode Control (Gate 2) ---
  hasExistingProductionData(): boolean {
    const store = getStore();
    try {
      const profilesRaw = store.getItem(STORAGE_KEYS.PROFILES);
      const v2Raw = store.getItem(STORAGE_KEYS.MEASUREMENTS);
      const v1Raw = store.getItem(STORAGE_KEYS.MEASUREMENTS_LEGACY);

      if (v2Raw) {
        const parsed = JSON.parse(v2Raw);
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      }
      if (v1Raw) {
        const parsed = JSON.parse(v1Raw);
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      }
      if (profilesRaw) {
        const parsed = JSON.parse(profilesRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  initializeAndMigrate(): MigrationReport {
    const store = getStore();
    let migratedFromV1 = false;

    // 1. Safe, idempotent migration from v1 measurements key to v2 (never deletes v1)
    const existingV2 = store.getItem(STORAGE_KEYS.MEASUREMENTS);
    const existingV1 = store.getItem(STORAGE_KEYS.MEASUREMENTS_LEGACY);
    if (!existingV2 && existingV1) {
      store.setItem(STORAGE_KEYS.MEASUREMENTS, existingV1);
      migratedFromV1 = true;
    }

    const hadExistingProductionData = this.hasExistingProductionData();
    const savedMode = store.getItem(STORAGE_KEYS.APP_MODE) as AppMode | null;

    let needsInitialModeSelection = false;
    let activeMode: AppMode = 'production';

    if (savedMode === 'production' || savedMode === 'demo') {
      activeMode = savedMode;
    } else if (hadExistingProductionData) {
      // Existing user upgrading from v0.1.0 -> preserve everything in Production automatically
      activeMode = 'production';
      store.setItem(STORAGE_KEYS.APP_MODE, 'production');
    } else {
      // Brand new install -> prompt user to pick Betriebsmodus or Demo-Modus
      needsInitialModeSelection = true;
      activeMode = 'production';
    }

    store.setItem(STORAGE_KEYS.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      migratedFromV1,
      hadExistingProductionData,
      needsInitialModeSelection,
      activeMode,
    };
  },

  hasSelectedInitialMode(): boolean {
    const saved = getStore().getItem(STORAGE_KEYS.APP_MODE);
    return saved === 'production' || saved === 'demo';
  },

  getAppMode(): AppMode {
    const saved = getStore().getItem(STORAGE_KEYS.APP_MODE);
    return saved === 'demo' ? 'demo' : 'production';
  },

  setAppMode(mode: AppMode): void {
    const store = getStore();
    store.setItem(STORAGE_KEYS.APP_MODE, mode);
    if (mode === 'demo') {
      this.ensureDemoInitialized();
    }
  },

  isDemoCleared(): boolean {
    return getStore().getItem(STORAGE_KEYS.DEMO_CLEARED_FLAG) === 'true';
  },

  ensureDemoInitialized(): void {
    const store = getStore();
    // Ensure demo profiles exist
    if (!store.getItem(STORAGE_KEYS.DEMO_PROFILES)) {
      store.setItem(
        STORAGE_KEYS.DEMO_PROFILES,
        JSON.stringify([DEMO_PROFILE_PRIMARY, DEMO_PROFILE_SECONDARY])
      );
      store.setItem(STORAGE_KEYS.DEMO_ACTIVE_PROFILE_ID, DEMO_PROFILE_PRIMARY.id);
    }

    // Only generate demo measurements if they haven't been initialized yet AND user hasn't cleared them
    const existingDemo = store.getItem(STORAGE_KEYS.DEMO_MEASUREMENTS);
    if (!existingDemo && !this.isDemoCleared()) {
      const m1 = generateDemoMeasurements(DEMO_PROFILE_PRIMARY.id, 30);
      const m2 = generateDemoMeasurements(DEMO_PROFILE_SECONDARY.id, 16);
      store.setItem(STORAGE_KEYS.DEMO_MEASUREMENTS, JSON.stringify([...m1, ...m2]));
    }
  },

  // --- Profiles (Strict Namespace Separation) ---
  getProfiles(modeOverride?: AppMode): UserProfile[] {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();

    if (mode === 'demo') {
      try {
        const raw = store.getItem(STORAGE_KEYS.DEMO_PROFILES);
        if (!raw) {
          const initial = [DEMO_PROFILE_PRIMARY, DEMO_PROFILE_SECONDARY];
          store.setItem(STORAGE_KEYS.DEMO_PROFILES, JSON.stringify(initial));
          return initial;
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0
          ? parsed
          : [DEMO_PROFILE_PRIMARY, DEMO_PROFILE_SECONDARY];
      } catch {
        return [DEMO_PROFILE_PRIMARY, DEMO_PROFILE_SECONDARY];
      }
    }

    // Production mode
    try {
      const raw = store.getItem(STORAGE_KEYS.PROFILES);
      if (!raw) {
        const initial = [{ ...DEFAULT_PROFILE, createdAt: new Date().toISOString() }];
        store.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_PROFILE];
    } catch {
      return [DEFAULT_PROFILE];
    }
  },

  getActiveProfileId(modeOverride?: AppMode): string {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const key =
      mode === 'demo'
        ? STORAGE_KEYS.DEMO_ACTIVE_PROFILE_ID
        : STORAGE_KEYS.ACTIVE_PROFILE_ID;
    const profiles = this.getProfiles(mode);

    try {
      const id = store.getItem(key);
      if (id && profiles.some((p) => p.id === id)) {
        return id;
      }
      const fallbackId = profiles[0]?.id || (mode === 'demo' ? DEMO_PROFILE_PRIMARY.id : DEFAULT_PROFILE.id);
      store.setItem(key, fallbackId);
      return fallbackId;
    } catch {
      return profiles[0]?.id || DEFAULT_PROFILE.id;
    }
  },

  setActiveProfileId(profileId: string, modeOverride?: AppMode): void {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const key =
      mode === 'demo'
        ? STORAGE_KEYS.DEMO_ACTIVE_PROFILE_ID
        : STORAGE_KEYS.ACTIVE_PROFILE_ID;
    const profiles = this.getProfiles(mode);
    if (profiles.some((p) => p.id === profileId)) {
      store.setItem(key, profileId);
    }
  },

  saveProfile(profile: UserProfile, modeOverride?: AppMode): void {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const key = mode === 'demo' ? STORAGE_KEYS.DEMO_PROFILES : STORAGE_KEYS.PROFILES;
    const list = this.getProfiles(mode);
    const index = list.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      list[index] = { ...profile };
    } else {
      list.push({ ...profile });
    }
    store.setItem(key, JSON.stringify(list));
  },

  createProfile(name: string, modeOverride?: AppMode): UserProfile {
    const mode = modeOverride ?? this.getAppMode();
    const prefix = mode === 'demo' ? 'demo_profile_' : 'profile_';
    const newProfile: UserProfile = {
      id: `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.saveProfile(newProfile, mode);
    this.setActiveProfileId(newProfile.id, mode);
    return newProfile;
  },

  deleteProfile(profileId: string, modeOverride?: AppMode): void {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const profileKey = mode === 'demo' ? STORAGE_KEYS.DEMO_PROFILES : STORAGE_KEYS.PROFILES;
    const measKey = mode === 'demo' ? STORAGE_KEYS.DEMO_MEASUREMENTS : STORAGE_KEYS.MEASUREMENTS;

    let list = this.getProfiles(mode);
    if (list.length <= 1) return;
    list = list.filter((p) => p.id !== profileId);
    store.setItem(profileKey, JSON.stringify(list));

    const measurements = this.getAllMeasurements(mode).filter((m) => m.profileId !== profileId);
    store.setItem(measKey, JSON.stringify(measurements));

    if (this.getActiveProfileId(mode) === profileId) {
      this.setActiveProfileId(list[0].id, mode);
    }
  },

  // --- Measurements (Strict Namespace & Profile Isolation) ---
  getAllMeasurements(modeOverride?: AppMode): Measurement[] {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();

    if (mode === 'demo') {
      this.ensureDemoInitialized();
      try {
        const raw = store.getItem(STORAGE_KEYS.DEMO_MEASUREMENTS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    // Production mode: NEVER auto-generate synthetic demo measurements!
    try {
      let raw = store.getItem(STORAGE_KEYS.MEASUREMENTS);
      if (!raw) {
        raw = store.getItem(STORAGE_KEYS.MEASUREMENTS_LEGACY);
        if (raw) {
          store.setItem(STORAGE_KEYS.MEASUREMENTS, raw);
        }
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getMeasurementsForProfile(profileId: string, modeOverride?: AppMode): Measurement[] {
    const mode = modeOverride ?? this.getAppMode();
    return this.getAllMeasurements(mode)
      .filter((m) => m.profileId === profileId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getMeasurementsForActiveProfile(modeOverride?: AppMode): Measurement[] {
    const mode = modeOverride ?? this.getAppMode();
    const activeId = this.getActiveProfileId(mode);
    return this.getMeasurementsForProfile(activeId, mode);
  },

  addMeasurement(
    m: Omit<Measurement, 'id' | 'profileId'>,
    modeOverride?: AppMode
  ): Measurement {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const measKey = mode === 'demo' ? STORAGE_KEYS.DEMO_MEASUREMENTS : STORAGE_KEYS.MEASUREMENTS;
    const activeProfileId = this.getActiveProfileId(mode);

    const all = this.getAllMeasurements(mode);
    const newMeasurement: Measurement = {
      ...m,
      id: `${mode === 'demo' ? 'dm_' : 'm_'}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      profileId: activeProfileId,
    };
    all.unshift(newMeasurement);
    store.setItem(measKey, JSON.stringify(all));
    return newMeasurement;
  },

  updateMeasurement(updated: Measurement, modeOverride?: AppMode): void {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const measKey = mode === 'demo' ? STORAGE_KEYS.DEMO_MEASUREMENTS : STORAGE_KEYS.MEASUREMENTS;
    const all = this.getAllMeasurements(mode);
    const idx = all.findIndex((m) => m.id === updated.id);
    if (idx >= 0) {
      all[idx] = updated;
      store.setItem(measKey, JSON.stringify(all));
    }
  },

  deleteMeasurement(id: string, modeOverride?: AppMode): void {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const measKey = mode === 'demo' ? STORAGE_KEYS.DEMO_MEASUREMENTS : STORAGE_KEYS.MEASUREMENTS;
    const all = this.getAllMeasurements(mode).filter((m) => m.id !== id);
    store.setItem(measKey, JSON.stringify(all));
  },

  clearAllDataForActiveProfile(modeOverride?: AppMode): void {
    const store = getStore();
    const mode = modeOverride ?? this.getAppMode();
    const measKey = mode === 'demo' ? STORAGE_KEYS.DEMO_MEASUREMENTS : STORAGE_KEYS.MEASUREMENTS;
    const activeId = this.getActiveProfileId(mode);
    const rest = this.getAllMeasurements(mode).filter((m) => m.profileId !== activeId);
    store.setItem(measKey, JSON.stringify(rest));
  },

  // --- Demo Data Lifecycle (Gate 2.6: isolated from Production & persistent deletion) ---
  clearDemoData(): void {
    const store = getStore();
    store.setItem(STORAGE_KEYS.DEMO_MEASUREMENTS, JSON.stringify([]));
    store.setItem(STORAGE_KEYS.DEMO_CLEARED_FLAG, 'true');
  },

  resetDemoData(count = 30): void {
    const store = getStore();
    store.removeItem(STORAGE_KEYS.DEMO_CLEARED_FLAG);
    const profiles = this.getProfiles('demo');
    const primaryId = profiles[0]?.id || DEMO_PROFILE_PRIMARY.id;
    const secondaryId = profiles[1]?.id;

    const demoPrimary = generateDemoMeasurements(primaryId, count);
    const demoSecondary = secondaryId ? generateDemoMeasurements(secondaryId, Math.max(10, Math.round(count / 2))) : [];
    store.setItem(
      STORAGE_KEYS.DEMO_MEASUREMENTS,
      JSON.stringify([...demoPrimary, ...demoSecondary])
    );
  },

  // Helper for Gate 2.5: detect legacy measurements in Production that carry source === 'demo' from v0.1.0 auto-seed
  getLegacyDemoSourceCountInProduction(): number {
    return this.getAllMeasurements('production').filter((m) => m.source === 'demo').length;
  },

  removeLegacyDemoSourceFromProduction(): number {
    const store = getStore();
    const all = this.getAllMeasurements('production');
    const kept = all.filter((m) => m.source !== 'demo');
    const removed = all.length - kept.length;
    store.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(kept));
    return removed;
  },

  // --- Theme & Viewport Mode ---
  getThemeMode(): 'light' | 'dark' | 'system' {
    return (getStore().getItem(STORAGE_KEYS.THEME_MODE) as 'light' | 'dark' | 'system') || 'system';
  },

  setThemeMode(mode: 'light' | 'dark' | 'system'): void {
    getStore().setItem(STORAGE_KEYS.THEME_MODE, mode);
  },

  getViewportShell(): 'android_phone' | 'responsive' {
    return (getStore().getItem(STORAGE_KEYS.VIEWPORT_SHELL) as 'android_phone' | 'responsive') || 'responsive';
  },

  setViewportShell(shell: 'android_phone' | 'responsive'): void {
    getStore().setItem(STORAGE_KEYS.VIEWPORT_SHELL, shell);
  },

  // --- Backup & Restore (Always scoped to Production data to avoid Demo contamination) ---
  exportBackupJson(): string {
    const backup: BackupPayload = {
      version: 2,
      appName: 'BloodPressure – Intelligenter Blutdruckmanager',
      exportDate: new Date().toISOString(),
      profiles: this.getProfiles('production'),
      measurements: this.getAllMeasurements('production'),
      settings: {
        themeMode: this.getThemeMode(),
        viewportShell: this.getViewportShell(),
      },
    };
    return JSON.stringify(backup, null, 2);
  },

  async exportEncryptedBackup(password: string): Promise<string> {
    const plainJson = this.exportBackupJson();
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      enc.encode(plainJson)
    );

    const envelope = {
      encrypted: true,
      algorithm: 'AES-GCM-256-PBKDF2',
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext)),
    };

    return JSON.stringify(envelope, null, 2);
  },

  validateBackup(jsonString: string): {
    isValid: boolean;
    isEncrypted: boolean;
    error?: string;
    payload?: BackupPayload;
  } {
    try {
      const data = JSON.parse(jsonString);
      if (data && data.encrypted === true && data.data) {
        return { isValid: true, isEncrypted: true };
      }
      if (!data || !Array.isArray(data.measurements)) {
        return {
          isValid: false,
          isEncrypted: false,
          error: 'Ungültiges Format: Keine Messungsliste gefunden.',
        };
      }
      return { isValid: true, isEncrypted: false, payload: data as BackupPayload };
    } catch {
      return { isValid: false, isEncrypted: false, error: 'JSON-Syntaxfehler.' };
    }
  },

  async decryptBackup(jsonString: string, password: string): Promise<BackupPayload> {
    const envelope = JSON.parse(jsonString);
    if (!envelope.encrypted || !envelope.salt || !envelope.iv || !envelope.data) {
      throw new Error('Ungültiger Verschlüsselungsumschlag.');
    }

    const salt = new Uint8Array(envelope.salt);
    const iv = new Uint8Array(envelope.iv);
    const ciphertext = new Uint8Array(envelope.data);
    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource
    );

    const dec = new TextDecoder();
    const plainJson = dec.decode(decrypted);
    return JSON.parse(plainJson);
  },

  importBackupPayload(
    payload: BackupPayload,
    strategy: 'merge' | 'overwrite' = 'merge'
  ): { success: boolean; message: string; count: number } {
    const store = getStore();
    try {
      if (!payload || !Array.isArray(payload.measurements)) {
        return { success: false, message: 'Ungültige Messdaten im Backup.', count: 0 };
      }

      // Always restore into Production namespace
      if (Array.isArray(payload.profiles) && payload.profiles.length > 0) {
        if (strategy === 'overwrite') {
          store.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(payload.profiles));
          store.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, payload.profiles[0].id);
        } else {
          const currentProfiles = this.getProfiles('production');
          for (const p of payload.profiles) {
            if (!currentProfiles.some((existing) => existing.id === p.id)) {
              currentProfiles.push(p);
            }
          }
          store.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(currentProfiles));
        }
      }

      if (strategy === 'overwrite') {
        store.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(payload.measurements));
        return {
          success: true,
          message: `${payload.measurements.length} Messungen vollständig wiederhergestellt.`,
          count: payload.measurements.length,
        };
      } else {
        const current = this.getAllMeasurements('production');
        const existingIds = new Set(current.map((m) => m.id));
        let addedCount = 0;
        for (const m of payload.measurements) {
          if (!existingIds.has(m.id)) {
            current.push(m);
            existingIds.add(m.id);
            addedCount++;
          }
        }
        store.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(current));
        return {
          success: true,
          message: `${addedCount} neue Messungen zusammengeführt (${current.length} insgesamt).`,
          count: addedCount,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      return { success: false, message: msg, count: 0 };
    }
  },
};

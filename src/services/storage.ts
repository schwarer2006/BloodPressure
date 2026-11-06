/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Measurement, UserProfile } from '../types/bloodPressure';

const STORAGE_KEYS = {
  MEASUREMENTS: 'bp_measurements_v2',
  MEASUREMENTS_LEGACY: 'bp_measurements_v1',
  PROFILES: 'bp_profiles_v1',
  ACTIVE_PROFILE_ID: 'bp_active_profile_id_v1',
  THEME_MODE: 'bp_theme_mode_v1',
  VIEWPORT_SHELL: 'bp_viewport_shell_v1',
};

const DEFAULT_PROFILE: UserProfile = {
  id: 'profile_default',
  name: 'Mein Profil',
  isDefault: true,
  birthYear: 1968,
  gender: 'not_specified',
  heightCm: 175,
  weightKg: 78,
  personalNotes: 'Regelmäßige Heimmessung (HBPM) nach ärztlicher Empfehlung.',
  createdAt: new Date().toISOString(),
};

/**
 * Creates realistic demo measurements with natural variance, morning and evening sessions.
 * Support count = 10, 30, 50, 200 for testing.
 */
export function generateDemoMeasurements(profileId: string, count = 30): Measurement[] {
  const list: Measurement[] = [];
  const now = new Date();

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

  for (let i = count - 1; i >= 0; i--) {
    const daysAgo = Math.floor(i / 2);
    const isEvening = i % 2 === 1;

    const mDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    if (isEvening) {
      mDate.setHours(19 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 50), 0);
    } else {
      mDate.setHours(7 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 50), 0);
    }

    // Natural physiological baseline with sinus variance and occasional spikes
    const baseSys = 124 + Math.round(Math.sin(daysAgo / 3.5) * 8 + (Math.random() * 10 - 5));
    const baseDia = 80 + Math.round(Math.sin(daysAgo / 3.5) * 5 + (Math.random() * 8 - 4));
    const basePulse = 68 + Math.round(Math.random() * 12 - 6);

    const note = isEvening
      ? eveningNotes[i % eveningNotes.length]
      : morningNotes[i % morningNotes.length];

    list.push({
      id: `demo_m_${count}_${i}`,
      profileId,
      timestamp: mDate.toISOString(),
      systolic: Math.min(168, Math.max(105, baseSys)),
      diastolic: Math.min(102, Math.max(68, baseDia)),
      pulse: Math.min(95, Math.max(58, basePulse)),
      arm: Math.random() > 0.3 ? 'left' : 'right',
      posture: 'sitting',
      context: 'home',
      notes: note || undefined,
      source: 'demo',
    });
  }

  // Sort descending (newest first)
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

/**
 * Persistent Storage Controller
 */
export const StorageService = {
  // --- Profiles ---
  getProfiles(): UserProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (!raw) {
        const initial = [DEFAULT_PROFILE];
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw);
    } catch {
      return [DEFAULT_PROFILE];
    }
  },

  getActiveProfileId(): string {
    try {
      const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      if (id) return id;
      const profiles = this.getProfiles();
      const defaultId = profiles[0]?.id || DEFAULT_PROFILE.id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, defaultId);
      return defaultId;
    } catch {
      return DEFAULT_PROFILE.id;
    }
  },

  setActiveProfileId(profileId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, profileId);
  },

  saveProfile(profile: UserProfile): void {
    const list = this.getProfiles();
    const index = list.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      list[index] = profile;
    } else {
      list.push(profile);
    }
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));
  },

  deleteProfile(profileId: string): void {
    let list = this.getProfiles();
    if (list.length <= 1) return;
    list = list.filter((p) => p.id !== profileId);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));

    const measurements = this.getAllMeasurements().filter((m) => m.profileId !== profileId);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(measurements));
    if (this.getActiveProfileId() === profileId) {
      this.setActiveProfileId(list[0].id);
    }
  },

  // --- Measurements ---
  getAllMeasurements(): Measurement[] {
    try {
      // Check v2 key first
      let raw = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
      if (!raw) {
        // Fallback / migration from v1 key
        raw = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS_LEGACY);
        if (raw) {
          localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, raw);
        }
      }

      if (!raw) {
        // Seed default profile with initial 30 demo entries
        const defaultProfileId = this.getActiveProfileId();
        const demo = generateDemoMeasurements(defaultProfileId, 30);
        localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(demo));
        return demo;
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  getMeasurementsForActiveProfile(): Measurement[] {
    const activeId = this.getActiveProfileId();
    const all = this.getAllMeasurements();
    return all
      .filter((m) => m.profileId === activeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addMeasurement(m: Omit<Measurement, 'id' | 'profileId'>): Measurement {
    const all = this.getAllMeasurements();
    const newMeasurement: Measurement = {
      ...m,
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      profileId: this.getActiveProfileId(),
    };
    all.unshift(newMeasurement);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(all));
    return newMeasurement;
  },

  updateMeasurement(updated: Measurement): void {
    const all = this.getAllMeasurements();
    const idx = all.findIndex((m) => m.id === updated.id);
    if (idx >= 0) {
      all[idx] = updated;
      localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(all));
    }
  },

  deleteMeasurement(id: string): void {
    const all = this.getAllMeasurements().filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(all));
  },

  clearAllDataForActiveProfile(): void {
    const activeId = this.getActiveProfileId();
    const rest = this.getAllMeasurements().filter((m) => m.profileId !== activeId);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(rest));
  },

  loadDemoData(count = 30): void {
    const activeId = this.getActiveProfileId();
    const rest = this.getAllMeasurements().filter((m) => m.profileId !== activeId);
    const demo = generateDemoMeasurements(activeId, count);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify([...demo, ...rest]));
  },

  // --- Theme & Viewport Mode ---
  getThemeMode(): 'light' | 'dark' | 'system' {
    return (localStorage.getItem(STORAGE_KEYS.THEME_MODE) as 'light' | 'dark' | 'system') || 'system';
  },

  setThemeMode(mode: 'light' | 'dark' | 'system'): void {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  },

  getViewportShell(): 'android_phone' | 'responsive' {
    return (localStorage.getItem(STORAGE_KEYS.VIEWPORT_SHELL) as 'android_phone' | 'responsive') || 'android_phone';
  },

  setViewportShell(shell: 'android_phone' | 'responsive'): void {
    localStorage.setItem(STORAGE_KEYS.VIEWPORT_SHELL, shell);
  },

  // --- Backup & Restore (Version 2 with validation & optional encryption) ---
  exportBackupJson(): string {
    const backup: BackupPayload = {
      version: 2,
      appName: 'BloodPressure – Intelligenter Blutdruckmanager',
      exportDate: new Date().toISOString(),
      profiles: this.getProfiles(),
      measurements: this.getAllMeasurements(),
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
    try {
      if (!payload || !Array.isArray(payload.measurements)) {
        return { success: false, message: 'Ungültige Messdaten im Backup.', count: 0 };
      }

      // Restore Profiles
      if (Array.isArray(payload.profiles) && payload.profiles.length > 0) {
        if (strategy === 'overwrite') {
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(payload.profiles));
        } else {
          const currentProfiles = this.getProfiles();
          for (const p of payload.profiles) {
            if (!currentProfiles.some((existing) => existing.id === p.id)) {
              currentProfiles.push(p);
            }
          }
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(currentProfiles));
        }
      }

      // Restore Measurements
      if (strategy === 'overwrite') {
        localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(payload.measurements));
        return {
          success: true,
          message: `${payload.measurements.length} Messungen vollständig wiederhergestellt.`,
          count: payload.measurements.length,
        };
      } else {
        const current = this.getAllMeasurements();
        const existingIds = new Set(current.map((m) => m.id));
        let addedCount = 0;
        for (const m of payload.measurements) {
          if (!existingIds.has(m.id)) {
            current.push(m);
            existingIds.add(m.id);
            addedCount++;
          }
        }
        localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(current));
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

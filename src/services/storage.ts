/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Measurement, UserProfile } from '../types/bloodPressure';

const STORAGE_KEYS = {
  MEASUREMENTS: 'bp_measurements_v1',
  PROFILES: 'bp_profiles_v1',
  ACTIVE_PROFILE_ID: 'bp_active_profile_id_v1',
  THEME_MODE: 'bp_theme_mode_v1', // 'light' | 'dark' | 'system'
  VIEWPORT_SHELL: 'bp_viewport_shell_v1', // 'android_phone' | 'responsive'
};

const DEFAULT_PROFILE: UserProfile = {
  id: 'profile_default',
  name: 'Mein Profil',
  isDefault: true,
  birthYear: 1968,
  gender: 'not_specified',
  heightCm: 175,
  weightKg: 78,
  personalNotes: 'Blutdrucküberwachung auf Empfehlung des Hausarztes.',
  createdAt: new Date().toISOString(),
};

/**
 * Creates realistic 30-day demo measurements for immediate testing
 */
export function generateDemoMeasurements(profileId: string): Measurement[] {
  const list: Measurement[] = [];
  const now = new Date();

  // Generate 30 days of 1-2 measurements per day (morning and/or evening)
  for (let i = 29; i >= 0; i--) {
    const dayDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    // Morning measurement (around 07:30 - 08:30)
    const morningDate = new Date(dayDate);
    morningDate.setHours(7 + Math.floor(Math.random() * 2), 15 + Math.floor(Math.random() * 40), 0);

    // Baseline with natural variance and occasional spikes
    const baseSys = 124 + Math.round((Math.sin(i / 3) * 8) + (Math.random() * 10 - 5));
    const baseDia = 80 + Math.round((Math.sin(i / 3) * 5) + (Math.random() * 8 - 4));
    const basePulse = 68 + Math.round(Math.random() * 12 - 6);

    const morningNotes = [
      'Morgens vor dem Frühstück',
      'Vor Einnahme Blutdrucksenker',
      'Ruhig nach dem Aufstehen',
      'Vor dem Morgenkaffee',
      'Etwas unruhig geschlafen',
    ];

    list.push({
      id: `demo_m_${i}_am`,
      profileId,
      timestamp: morningDate.toISOString(),
      systolic: Math.min(168, Math.max(105, baseSys)),
      diastolic: Math.min(102, Math.max(68, baseDia)),
      pulse: Math.min(95, Math.max(58, basePulse)),
      arm: Math.random() > 0.3 ? 'left' : 'right',
      posture: 'sitting',
      notes: morningNotes[i % morningNotes.length],
      source: 'demo',
    });

    // Evening measurement (around 19:00 - 21:00) on most days
    if (i % 4 !== 0) {
      const eveningDate = new Date(dayDate);
      eveningDate.setHours(19 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 55), 0);

      const eveSys = baseSys + Math.round(Math.random() * 8 - 2);
      const eveDia = baseDia + Math.round(Math.random() * 6 - 2);
      const evePulse = basePulse + Math.round(Math.random() * 8);

      const eveningNotes = [
        'Abends vor dem Abendessen',
        'Nach einem Spaziergang',
        'Nach Feierabend auf dem Sofa',
        'Entspannt nach dem Lesen',
        '',
      ];

      list.push({
        id: `demo_m_${i}_pm`,
        profileId,
        timestamp: eveningDate.toISOString(),
        systolic: Math.min(165, Math.max(110, eveSys)),
        diastolic: Math.min(100, Math.max(70, eveDia)),
        pulse: Math.min(92, Math.max(60, evePulse)),
        arm: 'left',
        posture: 'sitting',
        notes: eveningNotes[i % eveningNotes.length] || undefined,
        source: 'demo',
      });
    }
  }

  return list;
}

/**
 * Storage Controller
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
    if (list.length <= 1) return; // Keep at least one
    list = list.filter((p) => p.id !== profileId);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));
    // Also delete measurements for that profile
    const measurements = this.getAllMeasurements().filter((m) => m.profileId !== profileId);
    localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(measurements));
    if (this.getActiveProfileId() === profileId) {
      this.setActiveProfileId(list[0].id);
    }
  },

  // --- Measurements ---
  getAllMeasurements(): Measurement[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
      if (!raw) {
        // Initialize with realistic German demo data for seamless initial evaluation
        const defaultProfileId = this.getActiveProfileId();
        const demo = generateDemoMeasurements(defaultProfileId);
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

  loadDemoData(): void {
    const activeId = this.getActiveProfileId();
    const rest = this.getAllMeasurements().filter((m) => m.profileId !== activeId);
    const demo = generateDemoMeasurements(activeId);
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

  // --- Backup & Restore ---
  exportBackupJson(): string {
    const backup = {
      version: 1,
      appName: 'BloodPressure – Intelligenter Blutdruckmanager',
      exportDate: new Date().toISOString(),
      profiles: this.getProfiles(),
      measurements: this.getAllMeasurements(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJson(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.measurements)) {
        return { success: false, message: 'Ungültiges Sicherungsformat: Keine Messungen gefunden.' };
      }
      if (Array.isArray(data.profiles) && data.profiles.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(data.profiles));
      }
      localStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(data.measurements));
      return {
        success: true,
        message: `${data.measurements.length} Messungen und Profile erfolgreich importiert!`,
        count: data.measurements.length,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Syntaxfehler in JSON';
      return { success: false, message: `Fehler beim Import: ${message}` };
    }
  },
};

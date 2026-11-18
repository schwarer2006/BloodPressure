/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ActiveTab, Navigation } from './components/Navigation';
import { AndroidHeader } from './components/AndroidHeader';
import { AndroidShell } from './components/AndroidShell';
import { DashboardView } from './components/DashboardView';
import { MeasurementFormView } from './components/MeasurementFormView';
import { HistoryAndAnalyticsView } from './components/HistoryAndAnalyticsView';
import { ReportsAndExportView } from './components/ReportsAndExportView';
import { ProfileAndSettingsView } from './components/ProfileAndSettingsView';
import { AppMode, Measurement, UserProfile } from './types/bloodPressure';
import { StorageService } from './services/storage';
import { CheckCircle2, ShieldCheck, FlaskConical, Heart } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  // Run safe migration once on app boot before loading initial state
  const [migrationReport] = useState(() => StorageService.initializeAndMigrate());
  const [showModePicker, setShowModePicker] = useState<boolean>(
    migrationReport.needsInitialModeSelection
  );
  const [appMode, setAppMode] = useState<AppMode>(migrationReport.activeMode);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profiles, setProfiles] = useState<UserProfile[]>(() =>
    StorageService.getProfiles(migrationReport.activeMode)
  );
  const [activeProfileId, setActiveProfileId] = useState<string>(() =>
    StorageService.getActiveProfileId(migrationReport.activeMode)
  );
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [allModeMeasurements, setAllModeMeasurements] = useState<Measurement[]>([]);
  const [legacyDemoCount, setLegacyDemoCount] = useState<number>(() =>
    StorageService.getLegacyDemoSourceCountInProduction()
  );

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() =>
    StorageService.getThemeMode()
  );
  const [viewportShell, setViewportShell] = useState<'android_phone' | 'responsive'>(() =>
    StorageService.getViewportShell()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Profile object
  const currentProfile = useMemo(() => {
    return (
      profiles.find((p) => p.id === activeProfileId) ||
      profiles[0] || {
        id: 'profile_default',
        name: 'Mein Profil',
        isDefault: true,
        createdAt: new Date().toISOString(),
      }
    );
  }, [profiles, activeProfileId]);

  // Reload profiles & measurements cleanly for active mode and active profile
  const syncStateFromStorage = useCallback((targetMode: AppMode) => {
    const modeProfiles = StorageService.getProfiles(targetMode);
    const modeActiveId = StorageService.getActiveProfileId(targetMode);
    const modeAll = StorageService.getAllMeasurements(targetMode);
    const profileMeasurements = StorageService.getMeasurementsForProfile(modeActiveId, targetMode);

    setProfiles(modeProfiles);
    setActiveProfileId(modeActiveId);
    setAllModeMeasurements(modeAll);
    setMeasurements(profileMeasurements);
    setLegacyDemoCount(StorageService.getLegacyDemoSourceCountInProduction());
  }, []);

  useEffect(() => {
    syncStateFromStorage(appMode);
  }, [appMode, activeProfileId, syncStateFromStorage]);

  // Measurement count per profile for UI badge display
  const profileMeasurementCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of profiles) counts[p.id] = 0;
    for (const m of allModeMeasurements) {
      counts[m.profileId] = (counts[m.profileId] || 0) + 1;
    }
    return counts;
  }, [profiles, allModeMeasurements]);

  // Apply dark mode class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    StorageService.setThemeMode(themeMode);
  }, [themeMode]);

  const handleToggleViewportShell = () => {
    const next = viewportShell === 'android_phone' ? 'responsive' : 'android_phone';
    setViewportShell(next);
    StorageService.setViewportShell(next);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // App Mode switching (Gate 2)
  const handleSelectInitialMode = (mode: AppMode) => {
    StorageService.setAppMode(mode);
    setAppMode(mode);
    setShowModePicker(false);
    syncStateFromStorage(mode);
    showToast(
      mode === 'demo'
        ? 'Demo-Modus gestartet. Echte Daten bleiben getrennt.'
        : 'Betriebsmodus gestartet.'
    );
  };

  const handleSwitchAppMode = (mode: AppMode) => {
    if (mode === appMode) return;
    StorageService.setAppMode(mode);
    setAppMode(mode);
    syncStateFromStorage(mode);
    showToast(
      mode === 'demo'
        ? 'In den Demo-Modus gewechselt.'
        : 'In den Betriebsmodus gewechselt.'
    );
  };

  // Handlers for Measurements (always isolated to activeProfileId & appMode)
  const handleSaveMeasurement = (data: Omit<Measurement, 'id' | 'profileId'>) => {
    const saved = StorageService.addMeasurement(data, appMode);
    syncStateFromStorage(appMode);
    showToast(`Messung (${saved.systolic}/${saved.diastolic} mmHg) gespeichert!`);
    setActiveTab('dashboard');
  };

  const handleUpdateMeasurement = (updated: Measurement) => {
    StorageService.updateMeasurement(updated, appMode);
    syncStateFromStorage(appMode);
    showToast('Messung aktualisiert.');
  };

  const handleDeleteMeasurement = (id: string) => {
    StorageService.deleteMeasurement(id, appMode);
    syncStateFromStorage(appMode);
    showToast('Messung entfernt.');
  };

  // Handlers for Profiles (Gate 1)
  const handleSelectProfile = (id: string) => {
    StorageService.setActiveProfileId(id, appMode);
    setActiveProfileId(id);
    const meas = StorageService.getMeasurementsForProfile(id, appMode);
    setMeasurements(meas);
    const chosen = profiles.find((p) => p.id === id);
    if (chosen) {
      showToast(`Aktives Profil: ${chosen.name}`);
    }
  };

  const handleCreateProfile = (name: string) => {
    const created = StorageService.createProfile(name, appMode);
    syncStateFromStorage(appMode);
    setActiveProfileId(created.id);
    showToast(`Profil „${created.name}“ angelegt & aktiviert.`);
  };

  const handleDeleteProfile = (id: string) => {
    StorageService.deleteProfile(id, appMode);
    syncStateFromStorage(appMode);
    showToast('Profil gelöscht.');
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    StorageService.saveProfile(updated, appMode);
    syncStateFromStorage(appMode);
    showToast('Profildaten gespeichert.');
  };

  // Demo Data Controls
  const handleResetDemoData = () => {
    StorageService.resetDemoData(30);
    syncStateFromStorage(appMode);
    showToast('Demodaten im Demo-Modus neu generiert.');
  };

  const handleClearDemoData = () => {
    StorageService.clearDemoData();
    syncStateFromStorage(appMode);
    showToast('Demodaten dauerhaft gelöscht.');
  };

  const handleClearAllData = () => {
    StorageService.clearAllDataForActiveProfile(appMode);
    syncStateFromStorage(appMode);
    showToast(`Alle Messungen von „${currentProfile.name}“ gelöscht.`);
  };

  const handleRemoveLegacyDemoFromProduction = () => {
    const removed = StorageService.removeLegacyDemoSourceFromProduction();
    syncStateFromStorage(appMode);
    showToast(`${removed} alte Demomessungen aus dem Betriebsmodus entfernt.`);
  };

  return (
    <AndroidShell shellMode={viewportShell}>
      {/* Top Android App Bar */}
      <AndroidHeader
        currentProfile={currentProfile}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
        viewportShell={viewportShell}
        onToggleViewportShell={handleToggleViewportShell}
        appMode={appMode}
      />

      {/* Main Content Area with Edge-to-Edge bottom nav clearance */}
      <main className="p-3 sm:p-4 pb-[calc(5.5rem+var(--bp-safe-bottom))] flex-1 min-w-0 w-full">
        {/* Offline Connectivity Banner */}
        <OfflineIndicator />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-[calc(3.75rem+var(--bp-safe-top))] left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-slate-900 text-white dark:bg-sky-600 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView
            measurements={measurements}
            profile={currentProfile}
            appMode={appMode}
            onNavigateToCapture={() => setActiveTab('add')}
            onNavigateToHistory={() => setActiveTab('history')}
            onSwitchToDemoMode={() => handleSwitchAppMode('demo')}
            onSwitchToProductionMode={() => handleSwitchAppMode('production')}
          />
        )}

        {/* Tab 2: Add Measurement */}
        {activeTab === 'add' && (
          <MeasurementFormView
            onSaveMeasurement={handleSaveMeasurement}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {/* Tab 3: History & Analytics */}
        {activeTab === 'history' && (
          <HistoryAndAnalyticsView
            measurements={measurements}
            onDeleteMeasurement={handleDeleteMeasurement}
            onUpdateMeasurement={handleUpdateMeasurement}
            onNavigateToCapture={() => setActiveTab('add')}
          />
        )}

        {/* Tab 4: Reports & Export */}
        {activeTab === 'reports' && (
          <ReportsAndExportView
            measurements={measurements}
            profile={currentProfile}
            appMode={appMode}
            onRefreshData={() => syncStateFromStorage(appMode)}
          />
        )}

        {/* Tab 5: Profile & Settings */}
        {activeTab === 'profile' && (
          <ProfileAndSettingsView
            currentProfile={currentProfile}
            profiles={profiles}
            profileMeasurementCounts={profileMeasurementCounts}
            appMode={appMode}
            legacyDemoCount={legacyDemoCount}
            onUpdateProfile={handleUpdateProfile}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onDeleteProfile={handleDeleteProfile}
            themeMode={themeMode}
            onSetThemeMode={setThemeMode}
            viewportShell={viewportShell}
            onSetViewportShell={setViewportShell}
            onSwitchAppMode={handleSwitchAppMode}
            onResetDemoData={handleResetDemoData}
            onClearDemoData={handleClearDemoData}
            onClearAllData={handleClearAllData}
            onRemoveLegacyDemoFromProduction={handleRemoveLegacyDemoFromProduction}
          />
        )}
      </main>

      {/* Bottom Material Design 3 Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Initial First-Start Mode Selector Modal (only shown on brand new empty installs) */}
      {showModePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-600 flex items-center justify-center text-white shrink-0">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Willkommen bei BloodPressure
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  100% lokal, offlinefähig und ohne Cloud-Zwang
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Wie möchten Sie starten? Sie können später jederzeit unter <strong>Profil & Einstellungen</strong> zwischen beiden Modi wechseln, ohne Daten zu verlieren.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSelectInitialMode('production')}
                className="w-full p-4 rounded-2xl border-2 border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-left hover:bg-sky-100/70 dark:hover:bg-sky-950/70 transition-all flex items-start gap-3"
              >
                <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Betriebsmodus (Echte Messungen)
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Leeres Tagebuch für Ihre persönlichen Blutdruckwerte und Arztberichte. Keine Beispieldaten.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectInitialMode('demo')}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-start gap-3"
              >
                <FlaskConical className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Demo-Modus (Zum Testen)
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Enthält synthetische Verlaufsdaten und Profile zum Ausprobieren aller Diagramme und PDF-Berichte.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </AndroidShell>
  );
}

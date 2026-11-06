/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, Navigation } from './components/Navigation';
import { AndroidHeader } from './components/AndroidHeader';
import { AndroidShell } from './components/AndroidShell';
import { DashboardView } from './components/DashboardView';
import { MeasurementFormView } from './components/MeasurementFormView';
import { HistoryAndAnalyticsView } from './components/HistoryAndAnalyticsView';
import { ReportsAndExportView } from './components/ReportsAndExportView';
import { ProfileAndSettingsView } from './components/ProfileAndSettingsView';
import { Measurement, UserProfile } from './types/bloodPressure';
import { StorageService } from './services/storage';
import { CheckCircle2 } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profiles, setProfiles] = useState<UserProfile[]>(() => StorageService.getProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => StorageService.getActiveProfileId());
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => StorageService.getThemeMode());
  const [viewportShell, setViewportShell] = useState<'android_phone' | 'responsive'>(() =>
    StorageService.getViewportShell()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Profile object
  const currentProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0] || {
      id: 'profile_default',
      name: 'Mein Profil',
      isDefault: true,
      createdAt: new Date().toISOString(),
    };

  // Reload measurements for active profile
  const refreshMeasurements = useCallback(() => {
    const list = StorageService.getMeasurementsForActiveProfile();
    setMeasurements(list);
  }, []);

  useEffect(() => {
    refreshMeasurements();
  }, [activeProfileId, refreshMeasurements]);

  // Apply dark mode class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
    } else {
      // System mode
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    StorageService.setThemeMode(themeMode);
  }, [themeMode]);

  // Update viewport shell mode in storage
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

  // Handlers for Measurements
  const handleSaveMeasurement = (data: Omit<Measurement, 'id' | 'profileId'>) => {
    const saved = StorageService.addMeasurement(data);
    refreshMeasurements();
    showToast(`Messung (${saved.systolic}/${saved.diastolic} mmHg) erfolgreich gespeichert!`);
    setActiveTab('dashboard');
  };

  const handleUpdateMeasurement = (updated: Measurement) => {
    StorageService.updateMeasurement(updated);
    refreshMeasurements();
    showToast('Messung erfolgreich aktualisiert.');
  };

  const handleDeleteMeasurement = (id: string) => {
    StorageService.deleteMeasurement(id);
    refreshMeasurements();
    showToast('Messung entfernt.');
  };

  // Handlers for Profiles
  const handleSelectProfile = (id: string) => {
    StorageService.setActiveProfileId(id);
    setActiveProfileId(id);
  };

  const handleCreateProfile = (name: string) => {
    const newProfile: UserProfile = {
      id: 'profile_' + Date.now(),
      name,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    StorageService.saveProfile(newProfile);
    const updatedProfiles = StorageService.getProfiles();
    setProfiles(updatedProfiles);
    handleSelectProfile(newProfile.id);
    showToast(`Profil „${name}“ angelegt.`);
  };

  const handleDeleteProfile = (id: string) => {
    StorageService.deleteProfile(id);
    const updatedProfiles = StorageService.getProfiles();
    setProfiles(updatedProfiles);
    const active = StorageService.getActiveProfileId();
    setActiveProfileId(active);
    refreshMeasurements();
    showToast('Profil gelöscht.');
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    StorageService.saveProfile(updated);
    setProfiles(StorageService.getProfiles());
    showToast('Profil aktualisiert.');
  };

  const handleResetDemoData = () => {
    StorageService.loadDemoData();
    refreshMeasurements();
    showToast('Demodaten neu geladen.');
  };

  const handleClearAllData = () => {
    StorageService.clearAllDataForActiveProfile();
    refreshMeasurements();
    showToast('Alle Messdaten dieses Profils wurden gelöscht.');
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
      />

      {/* Main Content Area */}
      <main className="p-4 flex-1">
        {/* Offline Connectivity Banner */}
        <OfflineIndicator />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-slate-900 text-white dark:bg-sky-600 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView
            measurements={measurements}
            profile={currentProfile}
            onNavigateToCapture={() => setActiveTab('add')}
            onNavigateToHistory={() => setActiveTab('history')}
            onLoadDemoData={handleResetDemoData}
          />
        )}

        {/* Tab 2: Add Measurement (Manual or Camera OCR) */}
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
            onRefreshData={refreshMeasurements}
          />
        )}

        {/* Tab 5: Profile & Settings */}
        {activeTab === 'profile' && (
          <ProfileAndSettingsView
            currentProfile={currentProfile}
            profiles={profiles}
            onUpdateProfile={handleUpdateProfile}
            onSelectProfile={handleSelectProfile}
            onCreateProfile={handleCreateProfile}
            onDeleteProfile={handleDeleteProfile}
            themeMode={themeMode}
            onSetThemeMode={setThemeMode}
            viewportShell={viewportShell}
            onSetViewportShell={setViewportShell}
            onResetDemoData={handleResetDemoData}
            onClearAllData={handleClearAllData}
          />
        )}
      </main>

      {/* Bottom Material Design 3 Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
    </AndroidShell>
  );
}

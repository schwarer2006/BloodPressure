/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ShieldCheck,
  Moon,
  Sun,
  Plus,
  Trash2,
  Check,
  Smartphone,
  Monitor,
  Info,
  Code2,
  AlertTriangle,
  FlaskConical,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { AppMode, UserProfile } from '../types/bloodPressure';
import { WHO_CATEGORIES } from '../services/bloodPressureUtils';
import { PWAInstallCard } from './PWAInstallCard';

interface ProfileAndSettingsViewProps {
  currentProfile: UserProfile;
  profiles: UserProfile[];
  profileMeasurementCounts: Record<string, number>;
  appMode: AppMode;
  legacyDemoCount: number;
  onUpdateProfile: (updated: UserProfile) => void;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  themeMode: 'light' | 'dark' | 'system';
  onSetThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  viewportShell: 'android_phone' | 'responsive';
  onSetViewportShell: (shell: 'android_phone' | 'responsive') => void;
  onSwitchAppMode: (mode: AppMode) => void;
  onResetDemoData: () => void;
  onClearDemoData: () => void;
  onClearAllData: () => void;
  onRemoveLegacyDemoFromProduction: () => void;
}

export const ProfileAndSettingsView: React.FC<ProfileAndSettingsViewProps> = ({
  currentProfile,
  profiles,
  profileMeasurementCounts,
  appMode,
  legacyDemoCount,
  onUpdateProfile,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  themeMode,
  onSetThemeMode,
  viewportShell,
  onSetViewportShell,
  onSwitchAppMode,
  onResetDemoData,
  onClearDemoData,
  onClearAllData,
  onRemoveLegacyDemoFromProduction,
}) => {
  const isNative = Capacitor.isNativePlatform();

  // Local Profile Form State — synced strictly to currentProfile whenever profile switches
  const [name, setName] = useState(currentProfile.name);
  const [birthYear, setBirthYear] = useState<string>(currentProfile.birthYear?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female' | 'divers' | 'not_specified'>(
    currentProfile.gender || 'not_specified'
  );
  const [heightCm, setHeightCm] = useState<string>(currentProfile.heightCm?.toString() || '');
  const [weightKg, setWeightKg] = useState<string>(currentProfile.weightKg?.toString() || '');
  const [personalNotes, setPersonalNotes] = useState(currentProfile.personalNotes || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    setName(currentProfile.name || '');
    setBirthYear(currentProfile.birthYear?.toString() || '');
    setGender(currentProfile.gender || 'not_specified');
    setHeightCm(currentProfile.heightCm?.toString() || '');
    setWeightKg(currentProfile.weightKg?.toString() || '');
    setPersonalNotes(currentProfile.personalNotes || '');
    setIsSavedNotice(false);
  }, [currentProfile.id, currentProfile]);

  // Modals (in-app, Android WebView & iFrame safe — never window.confirm/alert)
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileError, setNewProfileError] = useState<string | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<UserProfile | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
  const [showKotlinModal, setShowKotlinModal] = useState(false);

  // BMI Calculation
  const numHeight = parseFloat(heightCm);
  const numWeight = parseFloat(weightKg);
  let bmi: string | null = null;
  let bmiCategory = '';
  if (numHeight > 0 && numWeight > 0) {
    const val = numWeight / Math.pow(numHeight / 100, 2);
    bmi = val.toFixed(1);
    if (val < 18.5) bmiCategory = 'Untergewicht';
    else if (val < 25) bmiCategory = 'Normalgewicht';
    else if (val < 30) bmiCategory = 'Übergewicht';
    else bmiCategory = 'Adipositas';
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...currentProfile,
      name: name.trim() || 'Mein Profil',
      birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
      gender,
      heightCm: numHeight > 0 ? Math.round(numHeight) : undefined,
      weightKg: numWeight > 0 ? Math.round(numWeight * 10) / 10 : undefined,
      personalNotes: personalNotes.trim() || undefined,
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleCreateNewProfile = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      setNewProfileError('Bitte geben Sie einen Profilnamen ein.');
      return;
    }
    onCreateProfile(trimmed);
    setNewProfileName('');
    setNewProfileError(null);
    setShowNewProfileModal(false);
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200 min-w-0">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profil & Einstellungen
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Persönliche Daten, Multi-Profil-Verwaltung und Betriebsmodus
        </p>
      </div>

      {/* Betriebsmodus vs Demo-Modus Controller (Gate 2) */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Anwendungsmodus
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              appMode === 'demo'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
            }`}
          >
            {appMode === 'demo' ? 'Demo-Modus aktiv' : 'Betriebsmodus aktiv'}
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Echte Messungen im <strong>Betriebsmodus</strong> und synthetische Testdaten im <strong>Demo-Modus</strong> sind technisch vollständig getrennt. Ein Wechsel löscht keine realen Daten.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSwitchAppMode('production')}
            className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
              appMode === 'production'
                ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500/40'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                appMode === 'production' ? 'text-sky-600' : 'text-slate-400'
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Betriebsmodus (Echte Daten)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Für Ihre persönlichen Messwerte & Arztberichte
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSwitchAppMode('demo')}
            className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
              appMode === 'demo'
                ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-1 ring-amber-500/40'
                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <FlaskConical
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                appMode === 'demo' ? 'text-amber-600' : 'text-slate-400'
              }`}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Demo-Modus (Testbereich)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Beispieldaten testen ohne echte Profile zu verändern
              </div>
            </div>
          </button>
        </div>

        {/* Demo Mode Specific Controls */}
        {appMode === 'demo' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onResetDemoData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Demodaten neu generieren</span>
            </button>
            <button
              type="button"
              onClick={() => setShowClearDemoConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Demodaten dauerhaft löschen</span>
            </button>
          </div>
        )}

        {/* Legacy Demo Entries Cleanup Notice in Production (only if upgraded from v0.1.0 auto-seed) */}
        {appMode === 'production' && legacyDemoCount > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Aus Version 0.1.0 befinden sich noch <strong>{legacyDemoCount}</strong> automatisch erzeugte Demomessungen (Quelle: „demo“) in Ihrem Produktivbestand. Ihre selbst erfassten Messungen bleiben beim Entfernen vollständig erhalten.
              </span>
            </div>
            <button
              type="button"
              onClick={onRemoveLegacyDemoFromProduction}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
            >
              Alte Demodaten aus Betriebsmodus entfernen
            </button>
          </div>
        )}
      </div>

      {/* Multi-Profile Switcher Card (Gate 1) */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {appMode === 'demo' ? 'Demoprofile' : 'Aktive Profile'}
          </span>
          <button
            type="button"
            onClick={() => {
              setNewProfileName('');
              setNewProfileError(null);
              setShowNewProfileModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-xs text-sky-700 dark:text-sky-300 font-semibold hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neues Profil anlegen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {profiles.map((p) => {
            const isActive = p.id === currentProfile.id;
            const count = profileMeasurementCounts[p.id] ?? 0;
            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 min-w-0 ${
                  isActive
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectProfile(p.id)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {isActive ? 'Aktiv' : 'Wechseln'} · {count} {count === 1 ? 'Messung' : 'Messungen'}
                    </div>
                  </div>
                </button>

                {profiles.length > 1 && !p.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDeleteProfileTarget(p)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
                    title="Profil löschen"
                    aria-label={`Profil ${p.name} löschen`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Profile Edit Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Profildaten: {currentProfile.name}
          </span>
          {isSavedNotice && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Gespeichert!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Name oder Pseudonym
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Geburtsjahr (optional)
            </label>
            <input
              type="number"
              placeholder="z.B. 1968"
              min="1900"
              max="2026"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Geschlecht
            </label>
            <select
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as 'male' | 'female' | 'divers' | 'not_specified')
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="not_specified">Keine Angabe</option>
              <option value="male">Männlich</option>
              <option value="female">Weiblich</option>
              <option value="divers">Divers</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Größe (cm)
            </label>
            <input
              type="number"
              placeholder="175"
              min="100"
              max="240"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
              Gewicht (kg)
            </label>
            <input
              type="number"
              placeholder="78"
              step="0.5"
              min="30"
              max="300"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* BMI Display if calculated */}
        {bmi && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Berechneter Body-Mass-Index:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {bmi} kg/m²
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                {bmiCategory}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1">
            Persönliche Notizen & Medikation (z.B. Ramipril 5mg morgens)
          </label>
          <textarea
            rows={2}
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            placeholder="z.B. Dauermedikation, bekannte Vorerkrankungen, Zielblutdruck..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs transition-colors"
        >
          Profildaten speichern
        </button>
      </form>

      {/* PWA App Installation Card */}
      {!isNative && <PWAInstallCard />}

      {/* App & Design Settings */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Erscheinungsbild & Anzeige
        </span>

        {/* Theme Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Farbschema (Theme)
            </div>
            <div className="text-[11px] text-slate-500">
              Helles oder dunkles Design nach Wunsch
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => onSetThemeMode('light')}
              className={`p-1.5 rounded-lg text-xs font-medium ${
                themeMode === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Helles Design"
            >
              <Sun className="w-4 h-4 text-amber-500" />
            </button>
            <button
              type="button"
              onClick={() => onSetThemeMode('dark')}
              className={`p-1.5 rounded-lg text-xs font-medium ${
                themeMode === 'dark'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              title="Dunkles Design"
            >
              <Moon className="w-4 h-4 text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => onSetThemeMode('system')}
              className={`px-2 py-1 rounded-lg text-xs font-medium ${
                themeMode === 'system'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Auto
            </button>
          </div>
        </div>

        {/* Desktop-only Viewport Shell Mode Selector */}
        {!isNative && (
          <div className="hidden md:flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Desktop-Vorschaumodus
              </div>
              <div className="text-[11px] text-slate-500">
                Smartphone-Vorschauraum oder responsive Vollbildansicht
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onSetViewportShell('android_phone')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  viewportShell === 'android_phone'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Handy-Rahmen</span>
              </button>
              <button
                type="button"
                onClick={() => onSetViewportShell('responsive')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                  viewportShell === 'responsive'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Vollbild</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ESH / WHO Guidelines Reference Table */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600 shrink-0" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            ESH/ESC 2023 & WHO Blutdruck-Klassifikation
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Schwellenwerte gemäß ESH/ESC 2023 für Heimmessung (HBPM: ≥ 135/85 mmHg) und Praxismessung (≥ 140/90 mmHg).
        </p>

        <div className="space-y-2 pt-1">
          {Object.values(WHO_CATEGORIES).map((cat) => (
            <div
              key={cat.category}
              className="p-2.5 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs transition-colors"
              style={{
                backgroundColor: cat.bgLight,
                borderColor: cat.color + '40',
              }}
            >
              <div className="min-w-0">
                <div className="font-bold" style={{ color: cat.textColor }}>
                  {cat.labelDe}
                </div>
                <div className="text-[10px] text-slate-600">
                  {cat.descriptionDe}
                </div>
              </div>
              <div className="font-mono tabular-nums text-right shrink-0">
                <div className="font-bold text-slate-900 text-[11px]">{cat.thresholdHome}</div>
                <div className="text-[10px] text-slate-600">Praxis: {cat.thresholdOffice}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Native Android Integration Info */}
      <div className="rounded-3xl p-4 sm:p-5 bg-slate-900 text-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
            <h3 className="text-sm font-bold">
              Android Capacitor 8 Build-Architektur (v0.1.2)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowKotlinModal(true)}
            className="text-xs text-sky-400 hover:underline font-medium"
          >
            Build-Details ansehen
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Gemeinsame Codebasis für PWA und Android-APK (Capacitor 8, Edge-to-Edge Safe Areas, lokale Offline-Datenhaltung).
        </p>
      </div>

      {/* Data Security & Reset Actions */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-600">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <h3 className="text-sm font-bold">
            Datenschutz &amp; Speicherung: 100% Offline &amp; Lokal
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Alle Messwerte, Profildaten und Kamerafotos verbleiben lokal im Gerätespeicher (unverschlüsselte App-Datenbank; es erfolgt keine Übermittlung an externe Cloud-Dienste oder Server). Für den externen Export stehen unter „Berichte“ passwortgeschützte AES-GCM-256-Backups zur Verfügung.
        </p>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium"
          >
            Alle Messungen von „{currentProfile.name}“ löschen
          </button>
        </div>
      </div>

      {/* NEW PROFILE MODAL */}
      {showNewProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateNewProfile}
            className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Neues Profil anlegen ({appMode === 'demo' ? 'Demo-Modus' : 'Betriebsmodus'})
            </h3>
            <p className="text-xs text-slate-500">
              Erfassen Sie ein separates Blutdrucktagebuch für einen Partner oder ein Familienmitglied.
            </p>
            <input
              type="text"
              placeholder="Name (z.B. Anna, Max...)"
              value={newProfileName}
              onChange={(e) => {
                setNewProfileName(e.target.value);
                setNewProfileError(null);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              autoFocus
            />
            {newProfileError && (
              <p className="text-xs text-red-600 dark:text-red-400">{newProfileError}</p>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewProfileModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs"
              >
                Anlegen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE PROFILE CONFIRMATION MODAL */}
      {deleteProfileTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Profil löschen?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Möchten Sie das Profil „{deleteProfileTarget.name}“ und alle zugehörigen Messwerte ({profileMeasurementCounts[deleteProfileTarget.id] ?? 0} Einträge) unwiderruflich löschen?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProfileTarget(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProfile(deleteProfileTarget.id);
                  setDeleteProfileTarget(null);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Profil löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL MEASUREMENTS FOR ACTIVE PROFILE CONFIRMATION MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Alle Messdaten löschen?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Möchten Sie wirklich alle Messungen für das Profil „{currentProfile.name}“ unwiderruflich löschen? Sie können zuvor unter „Berichte“ ein Backup herunterladen.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Ja, alles löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR DEMO DATA PERMANENTLY MODAL */}
      {showClearDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-600">
              <FlaskConical className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Demodaten dauerhaft löschen?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alle Messungen im Demo-Modus werden entfernt und beim nächsten App-Start nicht automatisch neu erzeugt. Ihre echten Daten im Betriebsmodus bleiben unangetastet.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearDemoData();
                  setShowClearDemoConfirm(false);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Demo leeren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANDROID CAPACITOR & BUILD INFO MODAL */}
      {showKotlinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 text-white p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
                <h3 className="text-sm font-bold">
                  Android-Integration &amp; Build (Capacitor 8 / v0.1.2)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKotlinModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Schließen
              </button>
            </div>

            <div className="overflow-y-auto flex-1 font-mono text-[11px] bg-slate-900 p-3.5 rounded-xl space-y-4">
              <div>
                <span className="text-emerald-400 font-bold">// Android APK lokal bauen (im Ordner /android):</span>
                <pre className="text-slate-300 mt-1 whitespace-pre-wrap">
{`npm run build
npx cap sync android
cd android
./gradlew assembleDebug
# Ausgabe: android/app/build/outputs/apk/debug/app-debug.apk`}
                </pre>
              </div>
              <div>
                <span className="text-sky-400 font-bold">// Update-Kompatibilität:</span>
                <pre className="text-slate-300 mt-1 whitespace-pre-wrap">
{`applicationId: "app.bloodpressure.mobile"
versionCode: 3
versionName: "0.1.2"`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

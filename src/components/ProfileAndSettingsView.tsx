/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  Settings,
  ShieldCheck,
  Moon,
  Sun,
  Plus,
  Trash2,
  Check,
  Smartphone,
  Monitor,
  Info,
  Database,
  Code2,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types/bloodPressure';
import { WHO_CATEGORIES } from '../services/bloodPressureUtils';
import { StorageService } from '../services/storage';

interface ProfileAndSettingsViewProps {
  currentProfile: UserProfile;
  profiles: UserProfile[];
  onUpdateProfile: (updated: UserProfile) => void;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  themeMode: 'light' | 'dark' | 'system';
  onSetThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  viewportShell: 'android_phone' | 'responsive';
  onSetViewportShell: (shell: 'android_phone' | 'responsive') => void;
  onResetDemoData: () => void;
  onClearAllData: () => void;
}

export const ProfileAndSettingsView: React.FC<ProfileAndSettingsViewProps> = ({
  currentProfile,
  profiles,
  onUpdateProfile,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  themeMode,
  onSetThemeMode,
  viewportShell,
  onSetViewportShell,
  onResetDemoData,
  onClearAllData,
}) => {
  // Local Profile Form State
  const [name, setName] = useState(currentProfile.name);
  const [birthYear, setBirthYear] = useState<string>(currentProfile.birthYear?.toString() || '');
  const [gender, setGender] = useState<'male' | 'female' | 'divers' | 'not_specified'>(
    currentProfile.gender || 'not_specified'
  );
  const [heightCm, setHeightCm] = useState<string>(currentProfile.heightCm?.toString() || '');
  const [weightKg, setWeightKg] = useState<string>(currentProfile.weightKg?.toString() || '');
  const [personalNotes, setPersonalNotes] = useState(currentProfile.personalNotes || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // New Profile Dialog
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Clear data confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Android Kotlin Source Code preview modal
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

  const handleCreateNewProfile = () => {
    if (!newProfileName.trim()) return;
    onCreateProfile(newProfileName.trim());
    setNewProfileName('');
    setShowNewProfileModal(false);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profil & Einstellungen
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Persönliche Daten, Profile und Systemeinstellungen
        </p>
      </div>

      {/* Multi-Profile Switcher Card */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Aktives Profil
          </span>
          <button
            onClick={() => setShowNewProfileModal(true)}
            className="flex items-center gap-1 text-xs text-sky-600 font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Neues Profil anlegen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {profiles.map((p) => {
            const isActive = p.id === currentProfile.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isActive ? 'Aktives Tagebuch' : 'Tippen zum Wechseln'}
                    </div>
                  </div>
                </div>

                {profiles.length > 1 && !p.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Möchten Sie das Profil „${p.name}“ und alle zugehörigen Daten löschen?`)) {
                        onDeleteProfile(p.id);
                      }
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                    title="Profil löschen"
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
      <form onSubmit={handleSaveProfile} className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Biometrische Patientendaten
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
              onChange={(e) => setGender(e.target.value as any)}
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
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Berechneter Body-Mass-Index:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {bmi} kg/m²
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
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

      {/* App & Design Settings */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Erscheinungsbild & Anzeige
        </span>

        {/* Theme Mode Selector */}
        <div className="flex items-center justify-between">
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

        {/* Viewport Shell Mode Selector (Phone Frame vs Full Responsive) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              Anzeige-Modus
            </div>
            <div className="text-[11px] text-slate-500">
              Android Smartphone-Gehäuse oder Vollbild/Tablet
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => onSetViewportShell('android_phone')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                viewportShell === 'android_phone'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Handy</span>
            </button>
            <button
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
      </div>

      {/* WHO / ESH Guidelines Reference Table */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            WHO / ESH Blutdruck-Klassifikationstabelle
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Gültige Schwellenwerte der Weltgesundheitsorganisation und der Europäischen Gesellschaft für Hypertonie (mmHg)
        </p>

        <div className="space-y-2 pt-1">
          {Object.values(WHO_CATEGORIES).map((cat) => (
            <div
              key={cat.category}
              className="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
              style={{
                backgroundColor: cat.bgLight,
                borderColor: cat.color + '40',
              }}
            >
              <div>
                <div className="font-bold" style={{ color: cat.textColor }}>
                  {cat.labelDe}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-700">
                  {cat.descriptionDe}
                </div>
              </div>
              <div className="font-mono tabular-nums text-right shrink-0 ml-3">
                <div className="font-bold text-slate-900">SYS {cat.rangeSys}</div>
                <div className="text-[10px] text-slate-600">DIA {cat.rangeDia}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Native Kotlin Jetpack Compose Architecture Code View */}
      <div className="rounded-3xl p-5 bg-slate-900 text-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold">
              Android Kotlin & Jetpack Compose Architektur
            </h3>
          </div>
          <button
            onClick={() => setShowKotlinModal(true)}
            className="text-xs text-sky-400 hover:underline font-medium"
          >
            Quellcode ansehen
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Diese App folgt der nativen Android-Architektur (Jetpack Compose, Room SQLite, CameraX und Material 3).
        </p>
      </div>

      {/* Data Security & Reset Actions */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-600">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="text-sm font-bold">
            Datenschutzgarantie: 100% Offline & Privat
          </h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Alle Messwerte, biometrischen Profildaten und Kamerafotos verbleiben ausschließlich lokal in Ihrem Browser bzw. Gerät. Es findet keinerlei Übermittlung an externe Cloud-Dienste oder fremde Server statt.
        </p>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={onResetDemoData}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
          >
            Demodaten neu laden
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium"
          >
            Alle Messungen dieses Profils löschen
          </button>
        </div>
      </div>

      {/* NEW PROFILE MODAL */}
      {showNewProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Neues Profil anlegen
            </h3>
            <p className="text-xs text-slate-500">
              Erfassen Sie ein separates Blutdrucktagebuch für einen Partner oder ein Familienmitglied.
            </p>
            <input
              type="text"
              placeholder="Name (z.B. Anna, Max...)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              autoFocus
            />
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowNewProfileModal(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateNewProfile}
                className="w-1/2 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs"
              >
                Anlegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Alle Messdaten löschen?
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Möchten Sie wirklich alle Messungen für das Profil „{currentProfile.name}“ unwiderruflich löschen? Sie können zuvor unter „Berichte“ ein Backup herunterladen.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
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

      {/* ANDROID KOTLIN SOURCE CODE MODAL */}
      {showKotlinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 text-white p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold">
                  Android Jetpack Compose & Room Architektur
                </h3>
              </div>
              <button
                onClick={() => setShowKotlinModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Schließen
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Native Android-Komponenten für Jetpack Compose, Room Database und CameraX OCR:
            </p>

            <div className="overflow-y-auto flex-1 font-mono text-[11px] bg-slate-900 p-3 rounded-xl space-y-4">
              <div>
                <span className="text-sky-400 font-bold">// MeasurementEntity.kt (Room SQLite Entity)</span>
                <pre className="text-slate-300 mt-1">
{`@Entity(tableName = "measurements")
data class MeasurementEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val profileId: Long,
    val timestamp: Long = System.currentTimeMillis(),
    val systolic: Int,
    val diastolic: Int,
    val pulse: Int,
    val arm: String, // "left" or "right"
    val posture: String, // "sitting", "lying", "standing"
    val notes: String? = null,
    val source: String // "manual" or "camera_ocr"
)`}
                </pre>
              </div>

              <div>
                <span className="text-sky-400 font-bold">// BloodPressureDao.kt (Room DAO)</span>
                <pre className="text-slate-300 mt-1">
{`@Dao
interface BloodPressureDao {
    @Query("SELECT * FROM measurements WHERE profileId = :profileId ORDER BY timestamp DESC")
    fun getAll(profileId: Long): Flow<List<MeasurementEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(measurement: MeasurementEntity): Long

    @Delete
    suspend fun delete(measurement: MeasurementEntity)
}`}
                </pre>
              </div>

              <div>
                <span className="text-sky-400 font-bold">// CameraX & Local MLKit / 7-Segment OCR Analyzer</span>
                <pre className="text-slate-300 mt-1">
{`class BloodPressureDisplayAnalyzer(
    private val onResult: (sys: Int, dia: Int, pulse: Int) -> Unit
) : ImageAnalysis.Analyzer {
    override fun analyze(imageProxy: ImageProxy) {
        // Local on-device 7-segment / LCD display analysis
        // No internet access required
        imageProxy.close()
    }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

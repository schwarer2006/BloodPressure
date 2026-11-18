/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  AlertCircle,
  FileDown,
  Lock,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';
import { AppMode, Measurement, TimeframeFilter, UserProfile } from '../types/bloodPressure';
import { calculateStats, formatDateDe, toDateKey } from '../services/bloodPressureUtils';
import { exportToPdf, exportToCsv } from '../services/exportService';
import { StorageService, BackupPayload, generateDemoMeasurements } from '../services/storage';

interface ReportsAndExportViewProps {
  measurements: Measurement[];
  profile: UserProfile;
  appMode: AppMode;
  onRefreshData: () => void;
}

export const ReportsAndExportView: React.FC<ReportsAndExportViewProps> = ({
  measurements,
  profile,
  appMode,
  onRefreshData,
}) => {
  const isDemoMode = appMode === 'demo';
  const [selectedRange, setSelectedRange] = useState<TimeframeFilter>('30days');
  const [includePulseHeatmap, setIncludePulseHeatmap] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [exportNotice, setExportNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [importMessage, setImportMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Backup Password encryption
  const [backupPassword, setBackupPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(false);

  // Import Preview Modal
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const [pendingEncryptedStr, setPendingEncryptedStr] = useState<string | null>(null);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Simulation test state
  const [isSimulatingPdf, setIsSimulatingPdf] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter measurements for selected export range
  const now = new Date();
  const exportItems = measurements.filter((m) => {
    const mTime = new Date(m.timestamp).getTime();
    if (selectedRange === '7days') {
      return mTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    if (selectedRange === '14days') {
      return mTime >= now.getTime() - 14 * 24 * 60 * 60 * 1000;
    }
    if (selectedRange === '30days') {
      return mTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }
    if (selectedRange === '90days') {
      return mTime >= now.getTime() - 90 * 24 * 60 * 60 * 1000;
    }
    if (selectedRange === '1year') {
      return mTime >= now.getTime() - 365 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  const stats = calculateStats(exportItems);

  const rangeTitleMap: Record<TimeframeFilter, string> = {
    today: 'Heute',
    '7days': 'Letzte 7 Tage',
    '14days': 'Letzte 14 Tage',
    '30days': 'Letzte 30 Tage',
    '90days': 'Letzte 90 Tage',
    '1year': 'Letztes Jahr',
    all: 'Gesamter Verlauf',
    custom: 'Benutzerdefiniert',
  };

  const handleExportPdf = async () => {
    if (exportItems.length === 0) {
      setExportNotice({
        text: 'Keine Messwerte für diesen Zeitraum vorhanden.',
        success: false,
      });
      return;
    }
    setExportNotice(null);
    setIsExportingPdf(true);
    try {
      await exportToPdf(exportItems, profile, rangeTitleMap[selectedRange], {
        isDemoMode,
        includePulseHeatmap,
      });
      setExportNotice({
        text: isDemoMode
          ? 'Demo-PDF erfolgreich erstellt.'
          : 'PDF-Verlaufsbericht erfolgreich erstellt.',
        success: true,
      });
    } catch (err) {
      console.error('PDF export error:', err);
      setExportNotice({ text: 'Fehler beim Erstellen der PDF-Datei.', success: false });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Dedicated test runner (explicitly marked as Demo/Test PDF)
  const handleTestSimulationPdf = async (count: number) => {
    setIsSimulatingPdf(count);
    setExportNotice(null);
    try {
      const testSet = generateDemoMeasurements(profile.id, count);
      await exportToPdf(testSet, profile, `Prüflauf (${count} Test-Messungen)`, {
        isDemoMode: true,
        includePulseHeatmap,
      });
      setExportNotice({
        text: `Testbericht mit ${count} synthetischen Messungen erstellt (als DEMO markiert).`,
        success: true,
      });
    } catch (err) {
      console.error('Test PDF export failed:', err);
      setExportNotice({
        text: `Fehler beim Erstellen des Testberichts (${count} Messungen).`,
        success: false,
      });
    } finally {
      setIsSimulatingPdf(null);
    }
  };

  const handleExportCsv = async () => {
    if (exportItems.length === 0) {
      setExportNotice({
        text: 'Keine Messwerte für diesen Zeitraum vorhanden.',
        success: false,
      });
      return;
    }
    setExportNotice(null);
    setIsExportingCsv(true);
    try {
      await exportToCsv(exportItems, profile, isDemoMode);
      setExportNotice({ text: 'CSV-Tabelle erfolgreich erstellt.', success: true });
    } catch (err) {
      console.error('CSV export error:', err);
      setExportNotice({ text: 'Fehler beim Erstellen der CSV-Datei.', success: false });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleBackupDownload = async () => {
    setImportMessage(null);
    try {
      let jsonStr: string;
      let filename: string;
      const dateStr = toDateKey(new Date());

      if (useEncryption && backupPassword.trim()) {
        jsonStr = await StorageService.exportEncryptedBackup(backupPassword.trim());
        filename = `BloodPressure_Backup_Verschluesselt_${dateStr}.json`;
      } else {
        jsonStr = StorageService.exportBackupJson();
        filename = `BloodPressure_Backup_${dateStr}.json`;
      }

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportMessage({
        text: 'Datensicherung (Betriebsmodus) erfolgreich heruntergeladen.',
        success: true,
      });
    } catch (err) {
      console.error('Backup error:', err);
      setImportMessage({ text: 'Fehler bei der Sicherungserstellung.', success: false });
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const validation = StorageService.validateBackup(content);

      if (!validation.isValid) {
        setImportMessage({ text: validation.error || 'Ungültiges Backup-Format.', success: false });
        return;
      }

      if (validation.isEncrypted) {
        setPendingEncryptedStr(content);
        setIsDecryptModalOpen(true);
        setDecryptError(null);
        return;
      }

      if (validation.payload) {
        setPendingPayload(validation.payload);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDecryptAndPreview = async () => {
    if (!pendingEncryptedStr || !decryptPassword) return;
    try {
      const payload = await StorageService.decryptBackup(pendingEncryptedStr, decryptPassword);
      setIsDecryptModalOpen(false);
      setDecryptPassword('');
      setPendingPayload(payload);
    } catch {
      setDecryptError('Falsches Passwort oder beschädigte Datei.');
    }
  };

  const handleConfirmImport = (strategy: 'merge' | 'overwrite') => {
    if (!pendingPayload) return;
    const res = StorageService.importBackupPayload(pendingPayload, strategy);
    setImportMessage({ text: res.message, success: res.success });
    setPendingPayload(null);
    if (res.success) {
      onRefreshData();
    }
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200 min-w-0">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Berichte & Export
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Medizinische Arzt-Tagebücher (DIN A4), CSV-Tabellen und passwortgeschützte Backups (AES-GCM-256)
        </p>
      </div>

      {/* Demo Warning Banner */}
      {isDemoMode && (
        <div className="rounded-2xl p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
          <FlaskConical className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong>Demo-Modus aktiv:</strong> Exportierte PDF- und CSV-Dateien werden ausdrücklich als <strong>DEMO-DATEN</strong> gekennzeichnet. Echte Patientendaten im Betriebsmodus bleiben unberührt.
          </span>
        </div>
      )}

      {/* Main Section: Medical PDF Report */}
      <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-sky-50 to-white dark:from-slate-900 dark:to-slate-800/80 border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                PDF-Blutdruckbericht (DIN A4)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nach ESH/ESC 2023 Leitlinien mit SYS-, DIA- & Puls-Heatmap und Protokoll
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded-md shrink-0">
            DIN A4
          </span>
        </div>

        {/* Range Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Auswertungszeitraum:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: '7days' as TimeframeFilter, label: 'Letzte 7 Tage' },
              { id: '30days' as TimeframeFilter, label: 'Letzte 30 Tage' },
              { id: '90days' as TimeframeFilter, label: 'Letzte 90 Tage' },
              { id: 'all' as TimeframeFilter, label: 'Gesamter Verlauf' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRange(r.id)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                  selectedRange === r.id
                    ? 'border-sky-600 bg-sky-600 text-white shadow-xs font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Options */}
        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includePulseHeatmap}
            onChange={(e) => setIncludePulseHeatmap(e.target.checked)}
            className="rounded text-sky-600 focus:ring-sky-500"
          />
          <span>Zusätzliche Puls-Kalender-Heatmap auf Seite 2 einbinden</span>
        </label>

        {/* Report Preview Highlights */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
            <span>Patient/in:</span>
            <span className="font-bold text-slate-900 dark:text-white truncate">{profile.name}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
            <span>Enthaltene Messungen:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {exportItems.length} Einträge
            </span>
          </div>
          {stats.count > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-700 font-mono tabular-nums">
              <span>Mittelwert im Zeitraum:</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {stats.avgSys} / {stats.avgDia} mmHg (Ø Puls: {stats.avgPulse} BPM)
              </span>
            </div>
          )}
        </div>

        {exportNotice && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              exportNotice.success
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {exportNotice.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <span>{exportNotice.text}</span>
          </div>
        )}

        {/* PDF Download Button */}
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExportingPdf || exportItems.length === 0}
          className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExportingPdf ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          <span>{isDemoMode ? 'Demo-PDF jetzt erstellen' : 'PDF-Bericht jetzt erstellen & herunterladen'}</span>
        </button>

        {/* PDF Benchmark Simulation Suite (only visible in Demo Mode to keep Production UI clean) */}
        {isDemoMode && (
          <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <FlaskConical className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>PDF-Belastungstest (synthetische Daten):</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[10, 50, 200].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleTestSimulationPdf(count)}
                  disabled={isSimulatingPdf !== null}
                  className="py-1.5 px-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-medium text-sky-700 dark:text-sky-300 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  {isSimulatingPdf === count ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  <span>{count} Werte</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSV & Excel Export Card */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tabellen-Export (CSV & Excel)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Deutsche Tabellenformatierung mit Semikolon-Trennzeichen und UTF-8 BOM
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Exportiert alle {exportItems.length} Messungen des gewählten Zeitraums tabellarisch für Microsoft Excel, Apple Numbers oder LibreOffice.
        </p>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isExportingCsv || exportItems.length === 0}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isExportingCsv ? (
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <Download className="w-4 h-4 text-emerald-600" />
          )}
          <span>CSV-Tabelle herunterladen (.csv)</span>
        </button>
      </div>

      {/* Backup & Restore (always scoped to Production data) */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Datensicherung & Migration (Betriebsmodus)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sichert ausschließlich reale Profile und Messwerte (keine Demodaten)
            </p>
          </div>
        </div>

        {importMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              importMessage.success
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {importMessage.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            )}
            <span>{importMessage.text}</span>
          </div>
        )}

        {/* Optional Password Encryption Checkbox */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={useEncryption}
              onChange={(e) => setUseEncryption(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              Backup mit Passwort verschlüsseln (AES-GCM-256)
            </span>
          </label>

          {useEncryption && (
            <input
              type="password"
              placeholder="Passwort für Datensicherung vergeben..."
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleBackupDownload}
            className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Backup herunterladen (JSON)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            className="hidden"
            onChange={handleBackupFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Backup wiederherstellen</span>
          </button>
        </div>
      </div>

      {/* IMPORT PREVIEW & CONFIRMATION MODAL */}
      {pendingPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-600">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sicherungsdatei überprüfen & importieren
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Erstellungsdatum:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDateDe(pendingPayload.exportDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Enthaltene Messungen:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {pendingPayload.measurements.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Enthaltene Profile:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {pendingPayload.profiles?.length || 1}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Wie möchten Sie die Messungen in den Betriebsmodus importieren?
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleConfirmImport('merge')}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs"
              >
                Zusammenführen (Bestehende Daten behalten)
              </button>
              <button
                type="button"
                onClick={() => handleConfirmImport('overwrite')}
                className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium"
              >
                Vollständig ersetzen (Bestehende überschreiben)
              </button>
              <button
                type="button"
                onClick={() => setPendingPayload(null)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DECRYPT MODAL */}
      {isDecryptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-600">
              <Lock className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Verschlüsseltes Backup entsperren
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Geben Sie das Passwort ein, das beim Export vergeben wurde:
            </p>
            <input
              type="password"
              placeholder="Passwort eingeben..."
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
              autoFocus
            />
            {decryptError && <p className="text-xs text-red-600">{decryptError}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDecryptModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDecryptAndPreview}
                className="w-1/2 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
              >
                Entschlüsseln
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

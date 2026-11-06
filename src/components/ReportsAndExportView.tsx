/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Upload,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { Measurement, TimeframeFilter, UserProfile } from '../types/bloodPressure';
import { calculateStats, formatDateDe } from '../services/bloodPressureUtils';
import { exportToPdf, exportToCsv } from '../services/exportService';
import { StorageService } from '../services/storage';

interface ReportsAndExportViewProps {
  measurements: Measurement[];
  profile: UserProfile;
  onRefreshData: () => void;
}

export const ReportsAndExportView: React.FC<ReportsAndExportViewProps> = ({
  measurements,
  profile,
  onRefreshData,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeframeFilter>('30days');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [importMessage, setImportMessage] = useState<{ text: string; success: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter measurements for selected export range
  const now = new Date();
  const exportItems = measurements.filter((m) => {
    const mTime = new Date(m.timestamp).getTime();
    if (selectedRange === '7days') {
      return mTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
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
    return true; // 'all'
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

  const handleExportPdf = () => {
    if (exportItems.length === 0) {
      alert('Keine Messwerte für diesen Zeitraum vorhanden.');
      return;
    }
    setIsExportingPdf(true);
    try {
      exportToPdf(exportItems, profile, rangeTitleMap[selectedRange]);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Fehler beim Erstellen der PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (exportItems.length === 0) {
      alert('Keine Messwerte für diesen Zeitraum vorhanden.');
      return;
    }
    exportToCsv(exportItems, profile);
  };

  const handleBackupDownload = () => {
    const jsonStr = StorageService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BloodPressure_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importBackupJson(content);
      setImportMessage({
        text: res.message,
        success: res.success,
      });
      if (res.success) {
        onRefreshData();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Berichte & Export
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Erstellen Sie druckfertige Arzt-Tagebücher und sichern Sie Ihre Daten lokal
        </p>
      </div>

      {/* Main Section: Medical PDF Report for Doctor */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-sky-50 to-white dark:from-slate-900 dark:to-slate-800/80 border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                PDF-Blutdrucktagebuch für den Arzttermin
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Formatierter Verlaufsbericht nach medizinischem Standard (A4)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-100 dark:bg-sky-950/80 px-2 py-0.5 rounded-full">
            Druckfertig
          </span>
        </div>

        {/* Range Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Auswertungszeitraum wählen:
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
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all text-center ${
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

        {/* Report Preview Highlights */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Patient/in:</span>
            <span className="font-bold text-slate-900 dark:text-white">{profile.name}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Enthaltene Messungen:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {exportItems.length} Einträge
            </span>
          </div>
          {stats.count > 0 && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-700 font-mono tabular-nums">
              <span>Mittelwert im Zeitraum:</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {stats.avgSys} / {stats.avgDia} mmHg (Puls: {stats.avgPulse} BPM)
              </span>
            </div>
          )}
        </div>

        {/* PDF Download Button */}
        <button
          onClick={handleExportPdf}
          disabled={isExportingPdf || exportItems.length === 0}
          className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExportingPdf ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          <span>PDF-Tagebuch jetzt herunterladen</span>
        </button>
      </div>

      {/* CSV & Excel Export Card */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tabellen-Export (CSV & Excel)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Excel-kompatibel mit deutschem Trennzeichen und Umlauten
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Exportiert alle Messungen ({exportItems.length} im gewählten Zeitraum) mit SYS, DIA, Puls, Pulsdruck, Arm, Haltung, Notizen und WHO-Kategorie.
        </p>

        <button
          onClick={handleExportCsv}
          disabled={exportItems.length === 0}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>CSV-Tabelle herunterladen (.csv)</span>
        </button>
      </div>

      {/* Backup & Restore (JSON) */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Vollständige Datensicherung (Backup & Wiederherstellung)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Sichern Sie all Ihre Profile und Messungen in einer Datei
            </p>
          </div>
        </div>

        {importMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              importMessage.success
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {importMessage.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{importMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleBackupDownload}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Backup herunterladen (JSON)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            className="hidden"
            onChange={handleBackupUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Backup wiederherstellen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

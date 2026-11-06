/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Heart,
  Plus,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Info,
  Sun,
  Moon,
} from 'lucide-react';
import { Measurement, UserProfile } from '../types/bloodPressure';
import {
  classifyBloodPressure,
  calculateStats,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
} from '../services/bloodPressureUtils';
import { BloodPressureChart } from './BloodPressureChart';

interface DashboardViewProps {
  measurements: Measurement[];
  profile: UserProfile;
  onNavigateToCapture: () => void;
  onNavigateToHistory: () => void;
  onLoadDemoData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  measurements,
  profile,
  onNavigateToCapture,
  onNavigateToHistory,
  onLoadDemoData,
}) => {
  const [chartRange, setChartRange] = useState<'7days' | '30days' | 'all'>('30days');
  const [showPulseOnChart, setShowPulseOnChart] = useState(false);

  // Latest measurement
  const latest = measurements.length > 0 ? measurements[0] : null;
  const latestCategory = latest ? classifyBloodPressure(latest.systolic, latest.diastolic) : null;

  // 7-day measurements
  const now = new Date();
  const ms7DaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const ms30DaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const measurements7d = measurements.filter(
    (m) => new Date(m.timestamp).getTime() >= ms7DaysAgo
  );
  const measurements30d = measurements.filter(
    (m) => new Date(m.timestamp).getTime() >= ms30DaysAgo
  );

  const stats7d = calculateStats(measurements7d);
  const stats30d = calculateStats(measurements30d);
  const statsAll = calculateStats(measurements);

  // Filtered measurements for chart
  const chartMeasurements =
    chartRange === '7days'
      ? measurements7d
      : chartRange === '30days'
      ? measurements30d
      : measurements;

  // Trend calculation comparing 7d vs 30d
  const sysDiff = stats7d.count > 0 && stats30d.count > 0 ? stats7d.avgSys - stats30d.avgSys : 0;

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hallo, {profile.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {measurements.length > 0
              ? `${measurements.length} Messungen erfasst`
              : 'Willkommen! Erfassen Sie Ihre erste Messung.'}
          </p>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onNavigateToCapture}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-medium text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Messung</span>
        </button>
      </div>

      {/* Main Card: Latest Blood Pressure Reading */}
      {latest ? (
        <div className="rounded-3xl p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Letzte Messung
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {formatDateDe(latest.timestamp)} · {formatTimeDe(latest.timestamp)} Uhr
              </span>
            </div>
          </div>

          {/* Large BP Numbers */}
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {latest.systolic}
                </span>
                <span className="text-2xl text-slate-400 font-light">/</span>
                <span className="text-4xl font-bold text-slate-700 dark:text-slate-200">
                  {latest.diastolic}
                </span>
                <span className="text-xs text-slate-500 font-sans ml-1">mmHg</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Systolisch (SYS) / Diastolisch (DIA)
              </div>
            </div>

            {/* Pulse */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                <Heart className="w-5 h-5 text-red-500 fill-red-500 animate-pulse" />
                <span>{latest.pulse}</span>
              </div>
              <div className="text-[11px] text-slate-500">Puls BPM</div>
            </div>
          </div>

          {/* WHO Category Assessment Box */}
          {latestCategory && (
            <div
              className="mt-3 p-3 rounded-2xl flex items-center justify-between transition-colors"
              style={{
                backgroundColor: latestCategory.bgLight,
                borderLeft: `4px solid ${latestCategory.color}`,
              }}
            >
              <div>
                <div
                  className="text-xs font-bold"
                  style={{ color: latestCategory.textColor }}
                >
                  {latestCategory.labelDe}
                </div>
                <div className="text-[11px] text-slate-700 dark:text-slate-800 line-clamp-1">
                  {latestCategory.descriptionDe}
                </div>
              </div>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-white/80 shadow-xs"
                style={{ color: latestCategory.textColor }}
              >
                WHO-Klasse
              </span>
            </div>
          )}

          {/* Measurement context: Arm, Posture, Notes */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>{formatArmDe(latest.arm)}</span>
              <span>·</span>
              <span>{formatPostureDe(latest.posture)}</span>
            </div>
            {latest.notes && (
              <span className="italic max-w-[200px] truncate" title={latest.notes}>
                „{latest.notes}“
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-600 mx-auto">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Noch keine Messungen erfasst
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Starten Sie mit Ihrer ersten Blutdruckmessung manuell oder scannen Sie das Display Ihres Messgeräts per Kamera.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onNavigateToCapture}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
            >
              Erste Messung eingeben
            </button>
            <button
              onClick={onLoadDemoData}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
            >
              Demodaten laden
            </button>
          </div>
        </div>
      )}

      {/* 7-Tage & 30-Tage Durchschnittswerte */}
      <div className="grid grid-cols-2 gap-3">
        {/* 7 Tage Durchschnitt */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold">7-Tage-Schnitt</span>
            <span className="font-mono text-[10px]">{stats7d.count} Messungen</span>
          </div>
          {stats7d.count > 0 ? (
            <div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats7d.avgSys}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                  {stats7d.avgDia}
                </span>
                <span className="text-[10px] text-slate-500 font-sans">mmHg</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500">Puls: {stats7d.avgPulse} BPM</span>
                {sysDiff !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 font-medium ${
                      sysDiff < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {sysDiff < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(sysDiff)} SYS
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">Keine Werte in 7 Tagen</div>
          )}
        </div>

        {/* 30 Tage Durchschnitt */}
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold">30-Tage-Schnitt</span>
            <span className="font-mono text-[10px]">{stats30d.count} Messungen</span>
          </div>
          {stats30d.count > 0 ? (
            <div>
              <div className="flex items-baseline gap-1 font-mono tabular-nums">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats30d.avgSys}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-xl font-semibold text-slate-700 dark:text-slate-300">
                  {stats30d.avgDia}
                </span>
                <span className="text-[10px] text-slate-500 font-sans">mmHg</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-500">Puls: {stats30d.avgPulse} BPM</span>
                <span className="text-slate-500">
                  Druck: {stats30d.avgPulsePressure} mmHg
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-2">Keine Werte in 30 Tagen</div>
          )}
        </div>
      </div>

      {/* Morning vs Evening Snapshot */}
      {(statsAll.morningAvg || statsAll.eveningAvg) && (
        <div className="rounded-2xl p-3.5 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-900 dark:text-sky-300">
              Tageszeit-Vergleich (Morgen vs. Abend)
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
              WHO-Verlauf
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl">
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-500">Morgens (05-12h)</div>
                <div className="font-bold font-mono text-slate-900 dark:text-white">
                  {statsAll.morningAvg
                    ? `${statsAll.morningAvg.sys}/${statsAll.morningAvg.dia}`
                    : '—'}{' '}
                  <span className="text-[9px] font-normal text-slate-400">mmHg</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl">
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-500">Abends (17-24h)</div>
                <div className="font-bold font-mono text-slate-900 dark:text-white">
                  {statsAll.eveningAvg
                    ? `${statsAll.eveningAvg.sys}/${statsAll.eveningAvg.dia}`
                    : '—'}{' '}
                  <span className="text-[9px] font-normal text-slate-400">mmHg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Chart Section */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Blutdruckverlauf
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Systolisch (rot) & Diastolisch (blau) mit Grenzwert 140/90
            </p>
          </div>

          {/* Timeframe Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setChartRange('7days')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                chartRange === '7days'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              7 Tage
            </button>
            <button
              onClick={() => setChartRange('30days')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                chartRange === '30days'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              30 Tage
            </button>
            <button
              onClick={() => setChartRange('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                chartRange === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Alle
            </button>
          </div>
        </div>

        {/* Pulse Toggle */}
        <div className="flex items-center justify-end mb-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showPulseOnChart}
              onChange={(e) => setShowPulseOnChart(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Puls einblenden</span>
          </label>
        </div>

        <BloodPressureChart
          measurements={chartMeasurements}
          height={210}
          showPulse={showPulseOnChart}
        />

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={onNavigateToHistory}
            className="text-sky-600 dark:text-sky-400 font-medium hover:underline flex items-center gap-1"
          >
            Vollständigen Verlauf ansehen
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-400 text-[11px]">
            {chartMeasurements.length} Datenpunkte
          </span>
        </div>
      </div>

      {/* Floating Action Hint / Medical Disclaimer */}
      <div className="rounded-2xl p-3 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        <p>
          Diese App dient der persönlichen Dokumentation für Ihren Arzt. Es werden keine automatischen Diagnosen gestellt.
        </p>
      </div>
    </div>
  );
};

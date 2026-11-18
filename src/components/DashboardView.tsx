/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Heart,
  Plus,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sun,
  Moon,
  Calendar,
  Activity,
  ScatterChart,
  BarChart2,
  FlaskConical,
} from 'lucide-react';
import { AppMode, Measurement, UserProfile, TimeframeFilter } from '../types/bloodPressure';
import {
  classifyBloodPressure,
  calculateStats,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
} from '../services/bloodPressureUtils';
import { BloodPressureChart } from './BloodPressureChart';
import { CalendarHeatmap } from './CalendarHeatmap';
import { BloodPressureScatterplot } from './BloodPressureScatterplot';
import { BloodPressureDistribution } from './BloodPressureDistribution';

interface DashboardViewProps {
  measurements: Measurement[];
  profile: UserProfile;
  appMode: AppMode;
  onNavigateToCapture: () => void;
  onNavigateToHistory: () => void;
  onSwitchToDemoMode: () => void;
  onSwitchToProductionMode: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  measurements,
  profile,
  appMode,
  onNavigateToCapture,
  onSwitchToDemoMode,
  onSwitchToProductionMode,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeframeFilter>('30days');
  const [showPulseOnChart, setShowPulseOnChart] = useState(false);
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [activeAnalysisView, setActiveAnalysisView] = useState<'chart' | 'heatmap' | 'scatter' | 'dist'>('chart');

  // Latest measurement
  const latest = measurements.length > 0 ? measurements[0] : null;
  const latestCategory = latest
    ? classifyBloodPressure(latest.systolic, latest.diastolic, latest.context !== 'office')
    : null;

  // Timeframe calculation
  const now = new Date();
  const rangeDays = useMemo(() => {
    switch (selectedRange) {
      case '7days':
        return 7;
      case '14days':
        return 14;
      case '30days':
        return 30;
      case '90days':
        return 90;
      default:
        return 30;
    }
  }, [selectedRange]);

  const filteredMeasurements = useMemo(() => {
    if (selectedRange === 'all') return measurements;
    const cutoff = now.getTime() - rangeDays * 86400000;
    return measurements.filter((m) => new Date(m.timestamp).getTime() >= cutoff);
  }, [measurements, selectedRange, rangeDays]);

  const stats = useMemo(() => {
    return calculateStats(filteredMeasurements, measurements, rangeDays);
  }, [filteredMeasurements, measurements, rangeDays]);

  const comp = stats.comparison;

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-200 min-w-0">
      {/* Demo Mode Banner (Gate 2) */}
      {appMode === 'demo' && (
        <div className="rounded-2xl p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 min-w-0">
            <FlaskConical className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Demo-Modus:</strong> Sie betrachten synthetische Testdaten. Echte Profile bleiben getrennt.
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchToProductionMode}
            className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] shrink-0"
          >
            Zum Betriebsmodus
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
            Hallo, {profile.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {measurements.length > 0
              ? `${measurements.length} Messungen im Profil`
              : appMode === 'demo'
              ? 'Demo-Tagebuch ist leer.'
              : 'Willkommen! Erfassen Sie Ihre erste Messung.'}
          </p>
        </div>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={onNavigateToCapture}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-xs shadow-sm transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Messung erfassen</span>
        </button>
      </div>

      {/* Main KPI Card: Latest Blood Pressure Reading */}
      {latest ? (
        <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Letzte Messung
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {formatDateDe(latest.timestamp)} · {formatTimeDe(latest.timestamp)} Uhr
              </span>
            </div>
          </div>

          {/* Large BP Numbers */}
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1 font-mono tabular-nums flex-wrap">
                <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {latest.systolic}
                </span>
                <span className="text-2xl text-slate-400 font-light">/</span>
                <span className="text-3xl sm:text-4xl font-bold text-slate-700 dark:text-slate-200">
                  {latest.diastolic}
                </span>
                <span className="text-xs text-slate-500 font-sans ml-1">mmHg</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Systolisch (SYS) / Diastolisch (DIA)
              </div>
            </div>

            {/* Pulse */}
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1 font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <span>{latest.pulse}</span>
              </div>
              <div className="text-[11px] text-slate-500">Puls BPM</div>
            </div>
          </div>

          {/* ESH/WHO Category Assessment Box */}
          {latestCategory && (
            <div
              className="mt-3 p-3 rounded-2xl flex items-center justify-between gap-2 transition-colors"
              style={{
                backgroundColor: latestCategory.bgLight,
                borderLeft: `4px solid ${latestCategory.color}`,
              }}
            >
              <div className="min-w-0">
                <div
                  className="text-xs font-bold"
                  style={{ color: latestCategory.textColor }}
                >
                  {latestCategory.labelDe}
                </div>
                <div className="text-[11px] text-slate-700 line-clamp-2">
                  {latestCategory.descriptionDe}
                </div>
              </div>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold bg-white/80 shadow-xs shrink-0"
                style={{ color: latestCategory.textColor }}
              >
                {latest.context === 'office' ? 'Praxis' : 'HBPM'}
              </span>
            </div>
          )}

          {/* Context Strip */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>{formatArmDe(latest.arm)}</span>
              <span>·</span>
              <span>{formatPostureDe(latest.posture)}</span>
            </div>
            {latest.notes && (
              <span className="italic max-w-[220px] truncate" title={latest.notes}>
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
              Noch keine Messungen in „{profile.name}“
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Erfassen Sie Ihre erste echte Messung manuell oder per Kameraerkennung. Zum Ausprobieren können Sie jederzeit in den getrennten Demo-Modus wechseln.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onNavigateToCapture}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
            >
              Erste Messung eingeben
            </button>
            {appMode !== 'demo' && (
              <button
                type="button"
                onClick={onSwitchToDemoMode}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Demo-Modus ansehen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timeframe Filter Bar (overflow-safe on 360px devices) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Auswertungszeitraum:
        </span>
        <div className="overflow-x-auto no-scrollbar max-w-full">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-max">
            {[
              { id: '7days' as TimeframeFilter, label: '7T' },
              { id: '14days' as TimeframeFilter, label: '14T' },
              { id: '30days' as TimeframeFilter, label: '30T' },
              { id: '90days' as TimeframeFilter, label: '90T' },
              { id: 'all' as TimeframeFilter, label: 'Gesamt' },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setSelectedRange(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selectedRange === tab.id
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Professional KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Ø Systole (SYS)
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.count > 0 ? stats.avgSys : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">mmHg</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
            {comp ? (
              <span
                className={`flex items-center font-semibold font-mono ${
                  comp.diffSys < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : comp.diffSys > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {comp.diffSys > 0 ? `+${comp.diffSys}` : comp.diffSys}
                {comp.diffSys < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 ml-0.5" />
                ) : comp.diffSys > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                ) : null}
              </span>
            ) : (
              <span className="text-slate-400 text-[10px]">Ziel: &lt;135</span>
            )}
            <span className="text-[10px] text-slate-400 truncate">Vorp.</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Ø Diastole (DIA)
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.count > 0 ? stats.avgDia : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">mmHg</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
            {comp ? (
              <span
                className={`flex items-center font-semibold font-mono ${
                  comp.diffDia < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : comp.diffDia > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-500'
                }`}
              >
                {comp.diffDia > 0 ? `+${comp.diffDia}` : comp.diffDia}
                {comp.diffDia < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 ml-0.5" />
                ) : comp.diffDia > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                ) : null}
              </span>
            ) : (
              <span className="text-slate-400 text-[10px]">Ziel: &lt;85</span>
            )}
            <span className="text-[10px] text-slate-400 truncate">Vorp.</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Ø Puls
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.count > 0 ? stats.avgPulse : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">BPM</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
            {comp ? (
              <span className="text-slate-600 dark:text-slate-300 font-mono">
                {comp.diffPulse > 0 ? `+${comp.diffPulse}` : comp.diffPulse} BPM
              </span>
            ) : (
              <span className="text-slate-400 text-[10px]">Mittelwert</span>
            )}
            <span className="text-[10px] text-slate-400 truncate">Puls</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
            Messanzahl
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.count}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">Werte</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
            {comp ? (
              <span className="text-slate-500 font-mono text-[10px]">
                {comp.diffCount >= 0 ? `+${comp.diffCount}` : comp.diffCount} vgl. Vorp.
              </span>
            ) : (
              <span className="text-slate-400 text-[10px]">Zeitraum</span>
            )}
            <span className="text-[10px] text-sky-600 font-medium">Aktiv</span>
          </div>
        </div>
      </div>

      {/* Morning vs Evening Comparison Card */}
      {(stats.morningAvg || stats.eveningAvg) && (
        <div className="rounded-3xl p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/60 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
              Morgen- vs. Abendvergleich (Zirkadianes Profil)
            </span>
            <span className="text-[10px] text-sky-600 dark:text-sky-400">
              HBPM-Standard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2.5 bg-white/80 dark:bg-slate-900/70 p-3 rounded-2xl min-w-0">
              <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500">Morgens (05:00–11:59 Uhr)</div>
                <div className="font-bold font-mono text-slate-900 dark:text-white text-base">
                  {stats.morningAvg ? `${stats.morningAvg.sys}/${stats.morningAvg.dia}` : '—'}
                  <span className="text-[10px] font-sans text-slate-400 ml-1">mmHg</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {stats.morningAvg
                    ? `${stats.morningAvg.count} Messungen · Ø Puls ${stats.morningAvg.pulse}`
                    : 'Keine'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-white/80 dark:bg-slate-900/70 p-3 rounded-2xl min-w-0">
              <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-slate-500">Abends (17:00–23:59 Uhr)</div>
                <div className="font-bold font-mono text-slate-900 dark:text-white text-base">
                  {stats.eveningAvg ? `${stats.eveningAvg.sys}/${stats.eveningAvg.dia}` : '—'}
                  <span className="text-[10px] font-sans text-slate-400 ml-1">mmHg</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {stats.eveningAvg
                    ? `${stats.eveningAvg.count} Messungen · Ø Puls ${stats.eveningAvg.pulse}`
                    : 'Keine'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Visualization Card */}
      <div className="rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Medizinische Visualisierungen
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interaktive Zeitreihen, Kalender-Heatmap, Verteilung und Scatterplot
            </p>
          </div>

          <div className="overflow-x-auto no-scrollbar max-w-full">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-max">
              <button
                type="button"
                onClick={() => setActiveAnalysisView('chart')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeAnalysisView === 'chart'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Zeitreihe</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisView('heatmap')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeAnalysisView === 'heatmap'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Heatmap</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisView('scatter')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeAnalysisView === 'scatter'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ScatterChart className="w-3.5 h-3.5" />
                <span>Scatterplot</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAnalysisView('dist')}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  activeAnalysisView === 'dist'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Verteilung</span>
              </button>
            </div>
          </div>
        </div>

        {/* View 1: Time Series Chart */}
        {activeAnalysisView === 'chart' && (
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMovingAverage}
                  onChange={(e) => setShowMovingAverage(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Gleitender Schnitt (3P)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
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
              measurements={filteredMeasurements}
              height={230}
              showPulse={showPulseOnChart}
              showMovingAverage={showMovingAverage}
            />
          </div>
        )}

        {/* View 2: Calendar Heatmap */}
        {activeAnalysisView === 'heatmap' && (
          <CalendarHeatmap
            measurements={measurements}
            daysCount={rangeDays}
          />
        )}

        {/* View 3: Scatterplot SYS vs DIA */}
        {activeAnalysisView === 'scatter' && (
          <BloodPressureScatterplot
            measurements={filteredMeasurements}
            height={280}
          />
        )}

        {/* View 4: Histogram Distribution */}
        {activeAnalysisView === 'dist' && (
          <BloodPressureDistribution
            sysBins={stats.sysDistribution}
            diaBins={stats.diaDistribution}
            totalCount={stats.count}
          />
        )}
      </div>

      {/* Medical Disclaimer */}
      <div className="rounded-2xl p-3 bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        <p>
          Diese Dokumentation dient der Information bei ärztlichen Konsultationen. Einzelmessungen sind Momentaufnahmen und begründen keine eigenmächtige Therapieanpassung.
        </p>
      </div>
    </div>
  );
};

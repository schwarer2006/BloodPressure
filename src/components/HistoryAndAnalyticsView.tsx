/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Trash2,
  Edit2,
  TrendingUp,
  Sun,
  Moon,
  ArrowUpDown,
  Heart,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { Measurement, TimeframeFilter, WhoCategory } from '../types/bloodPressure';
import {
  classifyBloodPressure,
  calculateStats,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
  WHO_CATEGORIES,
} from '../services/bloodPressureUtils';
import { BloodPressureChart } from './BloodPressureChart';

interface HistoryAndAnalyticsViewProps {
  measurements: Measurement[];
  onDeleteMeasurement: (id: string) => void;
  onUpdateMeasurement: (measurement: Measurement) => void;
  onNavigateToCapture: () => void;
}

export const HistoryAndAnalyticsView: React.FC<HistoryAndAnalyticsViewProps> = ({
  measurements,
  onDeleteMeasurement,
  onUpdateMeasurement,
  onNavigateToCapture,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('30days');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArmFilter, setSelectedArmFilter] = useState<'all' | 'left' | 'right'>('all');
  const [chartType, setChartType] = useState<'bp' | 'pulse'>('bp');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<Measurement | null>(null);
  const [editSys, setEditSys] = useState<number>(120);
  const [editDia, setEditDia] = useState<number>(80);
  const [editPulse, setEditPulse] = useState<number>(70);
  const [editNotes, setEditNotes] = useState<string>('');

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Timeframe filtering
  const now = new Date();
  const filteredByTime = useMemo(() => {
    return measurements.filter((m) => {
      const mTime = new Date(m.timestamp).getTime();
      if (timeframe === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return mTime >= todayStart;
      }
      if (timeframe === '7days') {
        return mTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      }
      if (timeframe === '14days') {
        return mTime >= now.getTime() - 14 * 24 * 60 * 60 * 1000;
      }
      if (timeframe === '30days') {
        return mTime >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      }
      if (timeframe === '90days') {
        return mTime >= now.getTime() - 90 * 24 * 60 * 60 * 1000;
      }
      if (timeframe === '1year') {
        return mTime >= now.getTime() - 365 * 24 * 60 * 60 * 1000;
      }
      return true; // 'all'
    });
  }, [measurements, timeframe]);

  // Search and Arm filtering
  const finalFiltered = useMemo(() => {
    return filteredByTime.filter((m) => {
      if (selectedArmFilter !== 'all' && m.arm !== selectedArmFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = (m.notes || '').toLowerCase().includes(q);
        const dateMatch = formatDateDe(m.timestamp).toLowerCase().includes(q);
        return noteMatch || dateMatch;
      }
      return true;
    });
  }, [filteredByTime, selectedArmFilter, searchQuery]);

  // Statistics for currently selected period
  const stats = useMemo(() => calculateStats(finalFiltered), [finalFiltered]);

  const openEditModal = (item: Measurement) => {
    setEditingItem(item);
    setEditSys(item.systolic);
    setEditDia(item.diastolic);
    setEditPulse(item.pulse);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    if (editSys <= editDia) {
      alert('Der systolische Blutdruck muss höher sein als der diastolische Blutdruck.');
      return;
    }
    onUpdateMeasurement({
      ...editingItem,
      systolic: Math.round(editSys),
      diastolic: Math.round(editDia),
      pulse: Math.round(editPulse),
      notes: editNotes.trim() || undefined,
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Verlauf & Analysen
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Detaillierte Auswertungen, Trends und Messhistorie
          </p>
        </div>
      </div>

      {/* Timeframe Filter Tabs (7-, 14-, 30-, 90-Tage & Jahr) */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-max">
          {[
            { id: '7days' as TimeframeFilter, label: '7 Tage' },
            { id: '14days' as TimeframeFilter, label: '14 Tage' },
            { id: '30days' as TimeframeFilter, label: '30 Tage' },
            { id: '90days' as TimeframeFilter, label: '90 Tage' },
            { id: '1year' as TimeframeFilter, label: '1 Jahr' },
            { id: 'all' as TimeframeFilter, label: 'Gesamt' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                timeframe === tab.id
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistical Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Durchschnitte */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Mittelwert
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {stats.count > 0 ? `${stats.avgSys}/${stats.avgDia}` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">mmHg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Puls: {stats.count > 0 ? `${stats.avgPulse} BPM` : '—'}
          </div>
        </div>

        {/* Min / Max SYS */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Systole Min / Max
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-red-600 dark:text-red-400">
              {stats.count > 0 ? `${stats.minSys} - ${stats.maxSys}` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">mmHg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Schwankung: {stats.count > 0 ? `${stats.maxSys - stats.minSys} mmHg` : '—'}
          </div>
        </div>

        {/* Min / Max DIA */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Diastole Min / Max
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400">
              {stats.count > 0 ? `${stats.minDia} - ${stats.maxDia}` : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">mmHg</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Pulsdruck: {stats.count > 0 ? `${stats.avgPulsePressure} mmHg` : '—'}
          </div>
        </div>

        {/* Messungen Anzahl */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Messanzahl
          </div>
          <div className="mt-1 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {stats.count}
            </span>
            <span className="text-[10px] text-slate-400 font-sans ml-1">Einträge</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Im gewählten Zeitraum
          </div>
        </div>
      </div>

      {/* Morning vs Evening Analysis Card */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Zirkadianer Vergleich: Morgen vs. Abend
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">05–12h vs. 17–24h</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Morgen */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-500" />
                Morgens (05:00 – 11:59 Uhr)
              </span>
              <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                {stats.morningAvg ? `${stats.morningAvg.count} Messungen` : 'Keine'}
              </span>
            </div>
            {stats.morningAvg ? (
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.morningAvg.sys}
                  <span className="text-slate-400 font-normal">/</span>
                  {stats.morningAvg.dia}
                  <span className="text-[10px] font-sans text-slate-500 ml-1">mmHg</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Puls: {stats.morningAvg.pulse} BPM
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Keine Morgenmessungen erfasst</div>
            )}
          </div>

          {/* Abend */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-500" />
                Abends (17:00 – 23:59 Uhr)
              </span>
              <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400">
                {stats.eveningAvg ? `${stats.eveningAvg.count} Messungen` : 'Keine'}
              </span>
            </div>
            {stats.eveningAvg ? (
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.eveningAvg.sys}
                  <span className="text-slate-400 font-normal">/</span>
                  {stats.eveningAvg.dia}
                  <span className="text-[10px] font-sans text-slate-500 ml-1">mmHg</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Puls: {stats.eveningAvg.pulse} BPM
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">Keine Abendmessungen erfasst</div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Interaktiver Verlauf
          </h3>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setChartType('bp')}
              className={`px-2.5 py-1 rounded-lg font-medium ${
                chartType === 'bp'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              SYS / DIA
            </button>
            <button
              onClick={() => setChartType('pulse')}
              className={`px-2.5 py-1 rounded-lg font-medium ${
                chartType === 'pulse'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Puls
            </button>
          </div>
        </div>

        <BloodPressureChart
          measurements={finalFiltered}
          height={220}
          showPulse={chartType === 'pulse'}
        />
      </div>

      {/* WHO Category Distribution */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Kategorien-Verteilung (WHO/ESH)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {stats.count} Messungen
          </span>
        </div>

        {stats.count > 0 ? (
          <div className="space-y-2">
            {(Object.keys(WHO_CATEGORIES) as WhoCategory[]).map((catKey) => {
              const cat = WHO_CATEGORIES[catKey];
              const count = stats.categoryDistribution[catKey] || 0;
              const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
              if (count === 0 && (catKey === 'hypertension_grade_3' || catKey === 'isolated_systolic')) {
                return null;
              }

              return (
                <div key={catKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {cat.labelDe}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400">Keine Daten vorhanden</div>
        )}
      </div>

      {/* Historical Measurements Table with Search & Filters */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Messwert-Historie ({finalFiltered.length})
          </h3>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Notizen oder Datum suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-sky-500"
            />
          </div>
        </div>

        {/* Arm Filter pills */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Arm:</span>
          <button
            onClick={() => setSelectedArmFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] ${
              selectedArmFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setSelectedArmFilter('left')}
            className={`px-2.5 py-1 rounded-lg text-[11px] ${
              selectedArmFilter === 'left'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Links
          </button>
          <button
            onClick={() => setSelectedArmFilter('right')}
            className={`px-2.5 py-1 rounded-lg text-[11px] ${
              selectedArmFilter === 'right'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Rechts
          </button>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {finalFiltered.length > 0 ? (
            finalFiltered.map((m) => {
              const cat = classifyBloodPressure(m.systolic, m.diastolic);
              return (
                <div
                  key={m.id}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors"
                >
                  {/* Left: Values & Time */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-base font-extrabold text-slate-900 dark:text-white">
                        {m.systolic}/{m.diastolic}
                      </span>
                      <span className="text-[10px] text-slate-400">mmHg</span>
                      <span className="flex items-center gap-0.5 text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        <Heart className="w-3 h-3 fill-emerald-500" />
                        {m.pulse}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatDateDe(m.timestamp)}</span>
                      <span>·</span>
                      <span>{formatTimeDe(m.timestamp)} Uhr</span>
                      <span>·</span>
                      <span>{m.arm === 'left' ? 'L' : 'R'}</span>
                      <span>·</span>
                      <span>{formatPostureDe(m.posture)}</span>
                    </div>

                    {m.notes && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                        „{m.notes}“
                      </div>
                    )}
                  </div>

                  {/* Right: Category & Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: cat.bgLight,
                        color: cat.textColor,
                      }}
                    >
                      {cat.shortLabel}
                    </span>

                    <button
                      onClick={() => openEditModal(m)}
                      title="Bearbeiten"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(m.id)}
                      title="Löschen"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <p>Keine Einträge für diese Filterkriterien gefunden.</p>
              <button
                onClick={onNavigateToCapture}
                className="text-sky-600 font-semibold hover:underline"
              >
                Neue Messung anlegen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Messung bearbeiten
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">SYS</label>
                <input
                  type="number"
                  value={editSys}
                  onChange={(e) => setEditSys(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold text-base"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">DIA</label>
                <input
                  type="number"
                  value={editDia}
                  onChange={(e) => setEditDia(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold text-base"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">PULS</label>
                <input
                  type="number"
                  value={editPulse}
                  onChange={(e) => setEditPulse(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Notiz
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="w-1/2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs"
              >
                Änderungen speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Messung löschen?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Möchten Sie diesen Messwert wirklich unwiderruflich aus Ihrem Tagebuch entfernen?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Behalten
              </button>
              <button
                onClick={() => {
                  onDeleteMeasurement(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

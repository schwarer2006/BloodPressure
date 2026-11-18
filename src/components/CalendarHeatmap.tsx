/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Measurement,
  DayAggregate,
  HeatmapMetric,
  PulseScaleConfig,
} from '../types/bloodPressure';
import {
  aggregateByCalendarDay,
  buildCalendarWeeks,
  getHeatmapColorForValue,
  DEFAULT_PULSE_SCALE,
  parseLocalDateKey,
  toDateKey,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
  classifyBloodPressure,
} from '../services/bloodPressureUtils';
import { Calendar, X, Heart, Clock, Info, SlidersHorizontal } from 'lucide-react';

interface CalendarHeatmapProps {
  measurements: Measurement[];
  daysCount?: number;
  initialMetric?: HeatmapMetric;
  onSelectMeasurement?: (measurement: Measurement) => void;
}

type RangeMode = 7 | 14 | 30 | 90 | 'custom';

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  measurements,
  daysCount = 30,
  initialMetric = 'systolic',
}) => {
  const [metric, setMetric] = useState<HeatmapMetric>(initialMetric);
  const [selectedDay, setSelectedDay] = useState<DayAggregate | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayAggregate | null>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>(
    daysCount === 7 || daysCount === 14 || daysCount === 30 || daysCount === 90
      ? daysCount
      : 30
  );

  // Sync rangeMode if parent timeframe changes (unless user switched to custom)
  useEffect(() => {
    if (rangeMode !== 'custom') {
      if (daysCount === 7 || daysCount === 14 || daysCount === 30 || daysCount === 90) {
        setRangeMode(daysCount);
      }
    }
  }, [daysCount]);

  // Custom date range bounds (defaulting to last 30 days)
  const todayStr = useMemo(() => toDateKey(new Date()), []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toDateKey(d);
  }, []);
  const [customStart, setCustomStart] = useState<string>(thirtyDaysAgoStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Configurable Pulse Scale (exploratory orientation, non-diagnostic)
  const [pulseScale, setPulseScale] = useState<PulseScaleConfig>(DEFAULT_PULSE_SCALE);
  const [showPulseConfig, setShowPulseConfig] = useState(false);

  // Central day aggregation
  const dailyMap = useMemo(() => aggregateByCalendarDay(measurements), [measurements]);

  // Compute startDate & endDate (local calendar dates)
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (rangeMode === 'custom') {
      const s = customStart ? parseLocalDateKey(customStart) : new Date(localToday.getFullYear(), localToday.getMonth(), localToday.getDate() - 29);
      const e = customEnd ? parseLocalDateKey(customEnd) : localToday;
      return { startDate: s <= e ? s : e, endDate: s <= e ? e : s };
    }

    const s = new Date(
      localToday.getFullYear(),
      localToday.getMonth(),
      localToday.getDate() - (rangeMode - 1)
    );
    return { startDate: s, endDate: localToday };
  }, [rangeMode, customStart, customEnd]);

  // Central week-aligned calendar matrix (Mo..So + ISO KW)
  const calendarWeeks = useMemo(
    () => buildCalendarWeeks({ startDate, endDate, dailyMap }),
    [startDate, endDate, dailyMap]
  );

  const weekDayHeaders = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 min-w-0">
      {/* Top Header & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              Kalender-Heatmap
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kalendergenaue Tagesmittelwerte (Mo–So, ISO-KW)
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setMetric('systolic')}
            className={`px-2.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              metric === 'systolic'
                ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            SYS
          </button>
          <button
            type="button"
            onClick={() => setMetric('diastolic')}
            className={`px-2.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              metric === 'diastolic'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            DIA
          </button>
          <button
            type="button"
            onClick={() => setMetric('pulse')}
            className={`px-2.5 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              metric === 'pulse'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Puls
          </button>
        </div>
      </div>

      {/* Timeframe Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-500 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-[11px]">Zeitraum:</span>
          {(
            [
              { val: 7, label: '7T' },
              { val: 14, label: '14T' },
              { val: 30, label: '30T' },
              { val: 90, label: '90T' },
              { val: 'custom', label: 'Benutzerdefiniert' },
            ] as Array<{ val: RangeMode; label: string }>
          ).map((item) => (
            <button
              key={String(item.val)}
              type="button"
              onClick={() => setRangeMode(item.val)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                rangeMode === item.val
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-400 shrink-0">
          Tag antippen für Einzelmessungen
        </span>
      </div>

      {/* Custom Date Range Picker */}
      {rangeMode === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
          <div className="min-w-0">
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Von</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Bis</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Configurable Pulse Scale Panel (when Pulse tab active) */}
      {metric === 'pulse' && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 p-2.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600 dark:text-slate-300">
              Pulsskala ist individuell anpassbar (keine medizinische Diagnose).
            </span>
            <button
              type="button"
              onClick={() => setShowPulseConfig((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showPulseConfig ? 'Fertig' : 'Anpassen'}</span>
            </button>
          </div>
          {showPulseConfig && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="min-w-0">
                <label className="text-[10px] text-slate-500 block">Niedrig &lt;</label>
                <input
                  type="number"
                  min={35}
                  max={80}
                  value={pulseScale.lowMax}
                  onChange={(e) =>
                    setPulseScale((s) => ({
                      ...s,
                      lowMax: Math.max(35, Math.min(s.normalMax - 5, Number(e.target.value) || 60)),
                    }))
                  }
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="text-[10px] text-slate-500 block">Ruhig bis</label>
                <input
                  type="number"
                  min={55}
                  max={110}
                  value={pulseScale.normalMax}
                  onChange={(e) =>
                    setPulseScale((s) => ({
                      ...s,
                      normalMax: Math.max(s.lowMax + 5, Math.min(s.elevatedMax - 5, Number(e.target.value) || 80)),
                    }))
                  }
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>
              <div className="min-w-0">
                <label className="text-[10px] text-slate-500 block">Leicht erh. bis</label>
                <input
                  type="number"
                  min={70}
                  max={140}
                  value={pulseScale.elevatedMax}
                  onChange={(e) =>
                    setPulseScale((s) => ({
                      ...s,
                      elevatedMax: Math.max(s.normalMax + 5, Math.min(160, Number(e.target.value) || 95)),
                    }))
                  }
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Grid Container with ISO KW column on the left */}
      <div className="space-y-1.5 min-w-0">
        {/* Header Row: KW + Mo..So */}
        <div className="grid grid-cols-[2.2rem_repeat(7,minmax(0,1fr))] gap-1 sm:gap-1.5 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 pb-0.5">
          <div className="text-left pl-0.5">KW</div>
          {weekDayHeaders.map((dayName) => (
            <div key={dayName}>{dayName}</div>
          ))}
        </div>

        {/* Week Rows */}
        <div className="space-y-1 sm:space-y-1.5">
          {calendarWeeks.map((week) => (
            <div
              key={`${week.isoYear}-W${week.isoWeek}`}
              className="grid grid-cols-[2.2rem_repeat(7,minmax(0,1fr))] gap-1 sm:gap-1.5 items-stretch"
            >
              {/* ISO Calendar Week Label */}
              <div
                className="flex items-center justify-start pl-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 tabular-nums"
                title={`ISO-Kalenderwoche ${week.isoWeek} (${week.isoYear})`}
              >
                KW{String(week.isoWeek).padStart(2, '0')}
              </div>

              {/* 7 Days (Mon=0 .. Sun=6) */}
              {week.days.map((cell) => {
                const { date, dateKey, aggregate, isInRange, isToday } = cell;
                const hasData = !!(aggregate && aggregate.count > 0 && isInRange);
                const val = hasData
                  ? metric === 'systolic'
                    ? aggregate.avgSys
                    : metric === 'diastolic'
                    ? aggregate.avgDia
                    : aggregate.avgPulse
                  : null;

                const color =
                  val !== null ? getHeatmapColorForValue(val, metric, pulseScale) : null;

                // Show month hint on the 1st of a month so month transitions are unmistakable
                const dateLabel =
                  cell.dayOfMonth === 1
                    ? `${cell.dayOfMonth}.${date.getMonth() + 1}.`
                    : `${cell.dayOfMonth}.`;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={!hasData}
                    onClick={() => {
                      if (hasData && aggregate) setSelectedDay(aggregate);
                    }}
                    onMouseEnter={() => hasData && aggregate && setHoveredDay(aggregate)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`group relative min-h-[44px] sm:min-h-[48px] min-w-0 rounded-lg sm:rounded-xl flex flex-col items-center justify-between p-1 transition-all border ${
                      hasData && color
                        ? `${color.bgClass} ${color.textClass} border-transparent hover:scale-[1.04] active:scale-95 shadow-xs cursor-pointer`
                        : isInRange
                        ? 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-800 cursor-default'
                        : 'bg-slate-50/50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-slate-800/40 cursor-default opacity-60'
                    } ${
                      isToday
                        ? 'ring-2 ring-sky-500 ring-offset-1 dark:ring-offset-slate-900'
                        : ''
                    }`}
                    title={
                      hasData && aggregate
                        ? `${formatDateDe(date)}: Ø ${aggregate.avgSys}/${aggregate.avgDia} mmHg, Puls: ${aggregate.avgPulse} BPM (${aggregate.count} Messungen)`
                        : `${formatDateDe(date)}: Keine Messung im Zeitraum`
                    }
                  >
                    {/* Day of Month */}
                    <span
                      className={`text-[9px] sm:text-[10px] font-medium leading-none truncate max-w-full ${
                        hasData ? 'opacity-90' : ''
                      }`}
                    >
                      {dateLabel}
                    </span>

                    {/* Metric Value or Placeholder */}
                    {hasData ? (
                      <span className="font-mono text-[11px] font-bold leading-tight tabular-nums">
                        {val}
                      </span>
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 my-auto" />
                    )}

                    {/* Count badge */}
                    {hasData && aggregate ? (
                      <span className="text-[8px] opacity-80 font-mono leading-none">
                        {aggregate.count}x
                      </span>
                    ) : (
                      <span className="text-[8px] opacity-0 leading-none">0</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Information Strip */}
      {hoveredDay && (
        <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-2 font-mono animate-in fade-in duration-100">
          <div className="font-sans font-medium text-slate-300">
            {formatDateDe(hoveredDay.date)}
          </div>
          <div className="flex flex-wrap items-center gap-3 tabular-nums">
            <span className="text-red-400 font-bold">Ø SYS: {hoveredDay.avgSys}</span>
            <span className="text-sky-400 font-bold">Ø DIA: {hoveredDay.avgDia}</span>
            <span className="text-emerald-400 font-bold">Ø Puls: {hoveredDay.avgPulse}</span>
            <span className="text-slate-400 font-sans text-[11px]">({hoveredDay.count}x)</span>
          </div>
        </div>
      )}

      {/* Legend with Concrete Documented mmHg Boundaries */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>
            Farb-Legende ({metric === 'systolic' ? 'Tagesmittel Systole in mmHg (HBPM)' : metric === 'diastolic' ? 'Tagesmittel Diastole in mmHg (HBPM)' : 'Tagesmittel Puls in BPM (individuell)'})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
          {metric === 'systolic' && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
                <span>&lt; 120 (Optimal)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-sky-500" />
                <span>120–129 (Normal)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-amber-400" />
                <span>130–134 (Hoch-Norm.)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-orange-500" />
                <span>135–159 (HBPM erhöht)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-red-600" />
                <span>≥ 160 (Deutlich erh.)</span>
              </div>
            </>
          )}

          {metric === 'diastolic' && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
                <span>&lt; 80 (Optimal)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-sky-500" />
                <span>80–84 (Normal)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-amber-400" />
                <span>85–89 (Hoch-Norm.)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-orange-500" />
                <span>90–99 (Erhöht)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-red-600" />
                <span>≥ 100 (Deutlich erh.)</span>
              </div>
            </>
          )}

          {metric === 'pulse' && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-indigo-500" />
                <span>&lt; {pulseScale.lowMax}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
                <span>{pulseScale.lowMax}–{pulseScale.normalMax}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-amber-400" />
                <span>{pulseScale.normalMax + 1}–{pulseScale.elevatedMax}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-red-600" />
                <span>&gt; {pulseScale.elevatedMax}</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-slate-200 dark:bg-slate-700" />
            <span>Keine Messung</span>
          </div>
        </div>
      </div>

      {/* DAY DETAIL MODAL */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-md max-h-[85dvh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="min-w-0 pr-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Messungen vom {formatDateDe(selectedDay.date)}
                </h4>
                <div className="text-[11px] text-slate-500 font-mono break-words">
                  Tagesmittel: {selectedDay.avgSys}/{selectedDay.avgDia} mmHg · Puls: {selectedDay.avgPulse} BPM ({selectedDay.count}x)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                aria-label="Modal schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of measurements on that day */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {selectedDay.measurements.map((m) => {
                const cat = classifyBloodPressure(m.systolic, m.diastolic, m.context !== 'office');
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                          {m.systolic}/{m.diastolic}
                        </span>
                        <span className="text-[10px] text-slate-400">mmHg</span>
                        <span className="flex items-center gap-0.5 text-emerald-600 font-mono font-medium">
                          <Heart className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          {m.pulse}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeDe(m.timestamp)} Uhr
                        </span>
                        <span>·</span>
                        <span>{formatArmDe(m.arm)}</span>
                        <span>·</span>
                        <span>{formatPostureDe(m.posture)}</span>
                      </div>
                      {m.notes && (
                        <div className="text-[10px] text-slate-600 dark:text-slate-300 italic mt-1 break-words">
                          „{m.notes}“
                        </div>
                      )}
                    </div>

                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: cat.bgLight,
                        color: cat.textColor,
                      }}
                    >
                      {cat.shortLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="w-full py-2.5 min-h-[44px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity shrink-0"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

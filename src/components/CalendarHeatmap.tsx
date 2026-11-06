/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Measurement, DayAggregate } from '../types/bloodPressure';
import {
  aggregateByCalendarDay,
  toDateKey,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
  classifyBloodPressure,
} from '../services/bloodPressureUtils';
import { Calendar, X, Heart, Clock, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface CalendarHeatmapProps {
  measurements: Measurement[];
  daysCount?: number; // 30, 60, 90 or all
  onSelectMeasurement?: (measurement: Measurement) => void;
}

type HeatmapMetric = 'systolic' | 'diastolic' | 'pulse';

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  measurements,
  daysCount = 35, // 5 full calendar weeks
  onSelectMeasurement,
}) => {
  const [metric, setMetric] = useState<HeatmapMetric>('systolic');
  const [selectedDay, setSelectedDay] = useState<DayAggregate | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayAggregate | null>(null);
  const [activeRange, setActiveRange] = useState<number>(daysCount);

  // Central day aggregation
  const dailyMap = useMemo(() => aggregateByCalendarDay(measurements), [measurements]);

  // Generate calendar days for the selected range (aligned to full weeks Monday - Sunday)
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; dateKey: string; aggregate?: DayAggregate; isCurrentMonth: boolean }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate start date
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (activeRange - 1));

    // Align start to preceding Monday (in JS: 0 is Sun, 1 is Mon... 6 is Sat)
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - diffToMonday);

    const cursor = new Date(startDate);
    while (cursor <= today || cursor.getDay() !== 1) {
      const key = toDateKey(cursor);
      days.push({
        date: new Date(cursor),
        dateKey: key,
        aggregate: dailyMap[key],
        isCurrentMonth: cursor.getMonth() === today.getMonth(),
      });
      cursor.setDate(cursor.getDate() + 1);
      // Safety limit
      if (days.length > 180) break;
    }

    return days;
  }, [dailyMap, activeRange]);

  // Color mapping per metric with clinical mmHg limits
  const getColorForValue = (val: number, metricType: HeatmapMetric): { bg: string; text: string; label: string } => {
    if (metricType === 'systolic') {
      if (val < 120) return { bg: 'bg-emerald-500', text: 'text-white', label: '< 120 (Optimal)' };
      if (val < 130) return { bg: 'bg-sky-500', text: 'text-white', label: '120–129 (Normal)' };
      if (val < 135) return { bg: 'bg-amber-400', text: 'text-slate-900', label: '130–134 (Hoch-Norm.)' };
      if (val < 160) return { bg: 'bg-orange-500', text: 'text-white', label: '135–159 (Hypertonie 1)' };
      return { bg: 'bg-red-600', text: 'text-white', label: '≥ 160 (Hypertonie 2+)' };
    }
    if (metricType === 'diastolic') {
      if (val < 80) return { bg: 'bg-emerald-500', text: 'text-white', label: '< 80 (Optimal)' };
      if (val < 85) return { bg: 'bg-sky-500', text: 'text-white', label: '80–84 (Normal)' };
      if (val < 90) return { bg: 'bg-amber-400', text: 'text-slate-900', label: '85–89 (Hoch-Norm.)' };
      if (val < 100) return { bg: 'bg-orange-500', text: 'text-white', label: '90–99 (Hypertonie 1)' };
      return { bg: 'bg-red-600', text: 'text-white', label: '≥ 100 (Hypertonie 2+)' };
    }
    // Pulse
    if (val < 60) return { bg: 'bg-indigo-400', text: 'text-white', label: '< 60 (Ruhepuls niedrig)' };
    if (val <= 80) return { bg: 'bg-emerald-500', text: 'text-white', label: '60–80 (Optimal)' };
    if (val <= 90) return { bg: 'bg-amber-400', text: 'text-slate-900', label: '81–90 (Leicht erhöht)' };
    return { bg: 'bg-red-500', text: 'text-white', label: '> 90 (Erhöht)' };
  };

  const weekDayHeaders = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Top Header & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Kalender-Heatmap
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tagesmittelwerte im zeitlichen Überblick
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('systolic')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              metric === 'systolic'
                ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            SYS (Systole)
          </button>
          <button
            type="button"
            onClick={() => setMetric('diastolic')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              metric === 'diastolic'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            DIA (Diastole)
          </button>
          <button
            type="button"
            onClick={() => setMetric('pulse')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
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
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">Zeitraum:</span>
          {[
            { days: 14, label: '14T' },
            { days: 30, label: '30T' },
            { days: 60, label: '60T' },
            { days: 90, label: '90T' },
          ].map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => setActiveRange(item.days)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                activeRange === item.days
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-400">
          Tippen zum Öffnen der Tagesmessungen
        </span>
      </div>

      {/* Calendar Grid Container */}
      <div className="space-y-1">
        {/* Weekday Labels Header */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 pb-1">
          {weekDayHeaders.map((dayName) => (
            <div key={dayName}>{dayName}</div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map(({ date, dateKey, aggregate }) => {
            const hasData = aggregate && aggregate.count > 0;
            const val = hasData
              ? metric === 'systolic'
                ? aggregate.avgSys
                : metric === 'diastolic'
                ? aggregate.avgDia
                : aggregate.avgPulse
              : null;

            const color = val !== null ? getColorForValue(val, metric) : null;
            const isToday = toDateKey(new Date()) === dateKey;

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => {
                  if (hasData) setSelectedDay(aggregate);
                }}
                onMouseEnter={() => hasData && setHoveredDay(aggregate)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`group relative h-11 sm:h-12 rounded-xl flex flex-col items-center justify-between p-1 transition-all border ${
                  hasData
                    ? `${color?.bg} ${color?.text} border-transparent hover:scale-105 active:scale-95 shadow-xs cursor-pointer`
                    : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border-slate-200/50 dark:border-slate-800/50 cursor-default'
                } ${isToday ? 'ring-2 ring-sky-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                title={
                  hasData
                    ? `${formatDateDe(date)}: ${aggregate.avgSys}/${aggregate.avgDia} mmHg, Puls: ${aggregate.avgPulse} (${aggregate.count} Messungen)`
                    : `${formatDateDe(date)}: Keine Messung`
                }
              >
                {/* Day of Month */}
                <span className={`text-[10px] font-medium leading-none ${hasData ? 'opacity-90' : 'text-slate-400'}`}>
                  {date.getDate()}
                </span>

                {/* Metric Value or Dot */}
                {hasData ? (
                  <span className="font-mono text-[11px] font-bold leading-tight tabular-nums">
                    {val}
                  </span>
                ) : (
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 my-auto" />
                )}

                {/* Count badge */}
                {hasData && (
                  <span className="text-[8px] opacity-75 font-mono leading-none">
                    {aggregate.count}x
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover Information Strip */}
      {hoveredDay && (
        <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between font-mono animate-in fade-in duration-100">
          <div className="font-sans font-medium text-slate-300">
            {formatDateDe(hoveredDay.date)}
          </div>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="text-red-400 font-bold">SYS: {hoveredDay.avgSys}</span>
            <span className="text-sky-400 font-bold">DIA: {hoveredDay.avgDia}</span>
            <span className="text-emerald-400 font-bold">Puls: {hoveredDay.avgPulse}</span>
            <span className="text-slate-400 font-sans text-[11px]">({hoveredDay.count} Messungen)</span>
          </div>
        </div>
      )}

      {/* Legend with Concrete Documented mmHg Boundaries */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Farb-Legende ({metric === 'systolic' ? 'Systole in mmHg' : metric === 'diastolic' ? 'Diastole in mmHg' : 'Puls in BPM'})</span>
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
                <span>135–159 (Hyp. 1)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-red-600" />
                <span>≥ 160 (Hyp. 2+)</span>
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
                <span>90–99 (Hyp. 1)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-red-600" />
                <span>≥ 100 (Hyp. 2+)</span>
              </div>
            </>
          )}

          {metric === 'pulse' && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-indigo-400" />
                <span>&lt; 60 (Niedrig)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-emerald-500" />
                <span>60–80 (Optimal)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-amber-400" />
                <span>81–90 (Leicht erhöht)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-red-500" />
                <span>&gt; 90 (Erhöht)</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-slate-200 dark:bg-slate-700" />
            <span>Keine Messung</span>
          </div>
        </div>
      </div>

      {/* DAY DETAIL MODAL: Opens when a day with measurements is clicked */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Messungen vom {formatDateDe(selectedDay.date)}
                </h4>
                <div className="text-[11px] text-slate-500 font-mono">
                  Tagesmittel: {selectedDay.avgSys}/{selectedDay.avgDia} mmHg · Puls: {selectedDay.avgPulse} BPM ({selectedDay.count} Messungen)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of measurements on that day */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selectedDay.measurements.map((m) => {
                const cat = classifyBloodPressure(m.systolic, m.diastolic);
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                          {m.systolic}/{m.diastolic}
                        </span>
                        <span className="text-[10px] text-slate-400">mmHg</span>
                        <span className="flex items-center gap-0.5 text-emerald-600 font-mono font-medium">
                          <Heart className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          {m.pulse}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
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
                        <div className="text-[10px] text-slate-600 dark:text-slate-300 italic mt-1">
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
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

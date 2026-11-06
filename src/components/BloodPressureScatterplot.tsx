/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Measurement } from '../types/bloodPressure';
import {
  formatDateDe,
  formatTimeDe,
  getTimeOfDay,
  classifyBloodPressure,
} from '../services/bloodPressureUtils';

interface BloodPressureScatterplotProps {
  measurements: Measurement[];
  height?: number;
}

export const BloodPressureScatterplot: React.FC<BloodPressureScatterplotProps> = ({
  measurements,
  height = 280,
}) => {
  const [hoveredItem, setHoveredItem] = useState<Measurement | null>(null);

  if (measurements.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Keine Messwerte für den Scatterplot vorhanden
      </div>
    );
  }

  const paddingLeft = 46;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const svgWidth = 600;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Axis ranges
  const minX = 90;
  const maxX = 200;
  const minY = 50;
  const maxY = 120;

  const getX = (sys: number) => {
    const clamped = Math.max(minX, Math.min(maxX, sys));
    return paddingLeft + ((clamped - minX) / (maxX - minX)) * chartWidth;
  };

  const getY = (dia: number) => {
    const clamped = Math.max(minY, Math.min(maxY, dia));
    return paddingTop + chartHeight - ((clamped - minY) / (maxY - minY)) * chartHeight;
  };

  const getTimeColor = (tod: 'morning' | 'day' | 'evening' | 'night') => {
    switch (tod) {
      case 'morning':
        return '#f59e0b'; // Amber-500
      case 'day':
        return '#0284c7'; // Sky-600
      case 'evening':
        return '#8b5cf6'; // Violet-500
      case 'night':
        return '#64748b'; // Slate-500
    }
  };

  // Threshold coords
  const x135 = getX(135);
  const x140 = getX(140);
  const y85 = getY(85);
  const y90 = getY(90);

  return (
    <div className="relative w-full overflow-hidden select-none space-y-2">
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        {/* Normal target quadrant (<135 SYS and <85 DIA) */}
        <rect
          x={paddingLeft}
          y={y85}
          width={Math.max(0, x135 - paddingLeft)}
          height={Math.max(0, paddingTop + chartHeight - y85)}
          fill="#10b981"
          fillOpacity="0.06"
        />

        {/* X Grid lines (Systolic) */}
        {[100, 120, 135, 140, 160, 180, 200].map((val) => {
          const x = getX(val);
          const isHome = val === 135;
          const isOffice = val === 140;
          return (
            <g key={`x_grid_${val}`}>
              <line
                x1={x}
                y1={paddingTop}
                x2={x}
                y2={paddingTop + chartHeight}
                stroke="currentColor"
                className={
                  isHome
                    ? 'text-amber-400 dark:text-amber-500/50'
                    : isOffice
                    ? 'text-red-400 dark:text-red-500/50'
                    : 'text-slate-200 dark:text-slate-800'
                }
                strokeDasharray={isHome || isOffice ? '4,3' : '2,2'}
                strokeWidth={isHome || isOffice ? '1.2' : '0.75'}
              />
              <text
                x={x}
                y={paddingTop + chartHeight + 14}
                textAnchor="middle"
                className={`text-[9px] font-mono tabular-nums ${
                  isHome ? 'fill-amber-600 font-bold' : isOffice ? 'fill-red-600 font-bold' : 'fill-slate-400'
                }`}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Y Grid lines (Diastolic) */}
        {[60, 70, 80, 85, 90, 100, 110, 120].map((val) => {
          const y = getY(val);
          const isHome = val === 85;
          const isOffice = val === 90;
          return (
            <g key={`y_grid_${val}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                className={
                  isHome
                    ? 'text-amber-400 dark:text-amber-500/50'
                    : isOffice
                    ? 'text-red-400 dark:text-red-500/50'
                    : 'text-slate-200 dark:text-slate-800'
                }
                strokeDasharray={isHome || isOffice ? '4,3' : '2,2'}
                strokeWidth={isHome || isOffice ? '1.2' : '0.75'}
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                className={`text-[9px] font-mono tabular-nums ${
                  isHome ? 'fill-amber-600 font-bold' : isOffice ? 'fill-red-600 font-bold' : 'fill-slate-400'
                }`}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Axis Labels */}
        <text
          x={paddingLeft + chartWidth / 2}
          y={height - 6}
          textAnchor="middle"
          className="text-[10px] font-semibold fill-slate-500 dark:fill-slate-400"
        >
          Systolischer Blutdruck (mmHg)
        </text>

        <text
          x={14}
          y={paddingTop + chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90, 14, ${paddingTop + chartHeight / 2})`}
          className="text-[10px] font-semibold fill-slate-500 dark:fill-slate-400"
        >
          Diastolisch (mmHg)
        </text>

        {/* Data points */}
        {measurements.map((m) => {
          const x = getX(m.systolic);
          const y = getY(m.diastolic);
          const d = new Date(m.timestamp);
          const tod = getTimeOfDay(d);
          const color = getTimeColor(tod);
          const isHovered = hoveredItem?.id === m.id;

          return (
            <circle
              key={m.id}
              cx={x}
              cy={y}
              r={isHovered ? 6 : 4}
              fill={color}
              fillOpacity={0.8}
              stroke="#ffffff"
              strokeWidth={isHovered ? 2.5 : 1.2}
              className="cursor-pointer transition-transform duration-100"
              onMouseEnter={() => setHoveredItem(m)}
              onMouseLeave={() => setHoveredItem(null)}
              onTouchStart={() => setHoveredItem(m)}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredItem && (
        <div className="p-2.5 rounded-2xl bg-slate-900 text-white text-xs shadow-xl flex items-center justify-between font-mono animate-in fade-in">
          <div>
            <span className="font-sans font-medium text-slate-300">
              {formatDateDe(hoveredItem.timestamp)} · {formatTimeDe(hoveredItem.timestamp)} Uhr
            </span>
          </div>
          <div className="flex items-center gap-3 tabular-nums">
            <span className="text-red-400 font-bold">SYS: {hoveredItem.systolic}</span>
            <span className="text-sky-400 font-bold">DIA: {hoveredItem.diastolic}</span>
            <span className="text-emerald-400">Puls: {hoveredItem.pulse}</span>
          </div>
        </div>
      )}

      {/* Legend with Time of Day */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Morgens (05–12h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
          <span>Tagsüber (12–17h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span>Abends (17–23h)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span>Nachts (23–05h)</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500" />
          <span>Zielbereich &lt;135/85</span>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Measurement } from '../types/bloodPressure';
import {
  formatDateDe,
  formatTimeDe,
  calculateMovingAverage,
  classifyBloodPressure,
} from '../services/bloodPressureUtils';
import { Heart, Activity } from 'lucide-react';

interface BloodPressureChartProps {
  measurements: Measurement[];
  height?: number;
  showPulse?: boolean;
  showMovingAverage?: boolean;
  maxPoints?: number;
}

export const BloodPressureChart: React.FC<BloodPressureChartProps> = ({
  measurements,
  height = 250,
  showPulse = false,
  showMovingAverage = false,
  maxPoints = 40,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Chronological order for the chart (oldest left, newest right)
  const sorted = useMemo(() => {
    return [...measurements].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [measurements]);

  // Display subset to avoid visual clutter
  const displayItems = useMemo(() => {
    return maxPoints > 0 ? sorted.slice(-maxPoints) : sorted;
  }, [sorted, maxPoints]);

  // Calculate 3-point moving average
  const movingAverages = useMemo(() => {
    return calculateMovingAverage(displayItems, 3);
  }, [displayItems]);

  if (displayItems.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Keine Messwerte für das Diagramm im gewählten Zeitraum vorhanden
      </div>
    );
  }

  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 32;
  const svgWidth = 620;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determine dynamic bounds with sensible medical minimums
  const allSys = displayItems.map((m) => m.systolic);
  const allDia = displayItems.map((m) => m.diastolic);
  const minVal = Math.min(50, ...allDia);
  const maxVal = Math.max(190, ...allSys);

  const minY = Math.floor(minVal / 10) * 10;
  const maxY = Math.ceil(maxVal / 10) * 10;

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return paddingTop + chartHeight - ((clamped - minY) / (maxY - minY)) * chartHeight;
  };

  const getX = (index: number) => {
    if (displayItems.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (displayItems.length - 1)) * chartWidth;
  };

  // Build SVG Paths
  const sysPoints = displayItems.map((m, i) => `${getX(i)},${getY(m.systolic)}`).join(' ');
  const diaPoints = displayItems.map((m, i) => `${getX(i)},${getY(m.diastolic)}`).join(' ');
  const pulsePoints = displayItems.map((m, i) => `${getX(i)},${getY(m.pulse)}`).join(' ');

  const sysMaPoints = movingAverages.map((ma, i) => `${getX(i)},${getY(ma.sysMA)}`).join(' ');
  const diaMaPoints = movingAverages.map((ma, i) => `${getX(i)},${getY(ma.diaMA)}`).join(' ');

  // Guideline lines
  const y140 = getY(140); // Office guideline SYS
  const y135 = getY(135); // HBPM Home guideline SYS
  const y90 = getY(90);   // Office guideline DIA
  const y85 = getY(85);   // HBPM Home guideline DIA
  const y120 = getY(120); // Optimal SYS
  const y80 = getY(80);   // Optimal DIA

  const hoveredItem = hoveredIndex !== null ? displayItems[hoveredIndex] : null;
  const hoveredCategory = hoveredItem ? classifyBloodPressure(hoveredItem.systolic, hoveredItem.diastolic) : null;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          <linearGradient id="normalZoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Optimal Target corridor (<120 / <80) */}
        <rect
          x={paddingLeft}
          y={y120}
          width={chartWidth}
          height={Math.max(0, y80 - y120)}
          fill="url(#normalZoneGrad)"
        />

        {/* Horizontal grid lines */}
        {[60, 80, 100, 120, 135, 140, 160, 180].map((val) => {
          if (val < minY || val > maxY) return null;
          const y = getY(val);
          const isHomeThreshold = val === 135 || val === 85;
          const isOfficeThreshold = val === 140 || val === 90;
          const isThreshold = isHomeThreshold || isOfficeThreshold;

          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                className={
                  isThreshold
                    ? isHomeThreshold
                      ? 'text-amber-400 dark:text-amber-500/50'
                      : 'text-red-400 dark:text-red-500/50'
                    : 'text-slate-200 dark:text-slate-800'
                }
                strokeDasharray={isThreshold ? (isHomeThreshold ? '3,3' : '5,3') : '2,2'}
                strokeWidth={isThreshold ? '1.2' : '0.75'}
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                className={`text-[9px] font-mono tabular-nums ${
                  isThreshold
                    ? isHomeThreshold
                      ? 'fill-amber-600 dark:fill-amber-400 font-bold'
                      : 'fill-red-600 dark:fill-red-400 font-bold'
                    : 'fill-slate-400 dark:fill-slate-500'
                }`}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Moving Average curves (optional) */}
        {showMovingAverage && displayItems.length >= 3 && (
          <>
            <polyline
              fill="none"
              stroke="#fca5a5"
              strokeWidth="1.8"
              strokeDasharray="4,2"
              points={sysMaPoints}
            />
            <polyline
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="1.8"
              strokeDasharray="4,2"
              points={diaMaPoints}
            />
          </>
        )}

        {/* Systolic Line */}
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={sysPoints}
        />

        {/* Diastolic Line */}
        <polyline
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={diaPoints}
        />

        {/* Pulse Line if enabled */}
        {showPulse && (
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="3,2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pulsePoints}
          />
        )}

        {/* Data points & hit areas */}
        {displayItems.map((m, i) => {
          const x = getX(i);
          const ySys = getY(m.systolic);
          const yDia = getY(m.diastolic);
          const isHovered = hoveredIndex === i;

          return (
            <g key={m.id}>
              {/* Hit target column */}
              <rect
                x={x - (chartWidth / displayItems.length) / 2}
                y={paddingTop}
                width={Math.max(16, chartWidth / displayItems.length)}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={() => setHoveredIndex(i)}
              />

              {/* Systolic Point */}
              <circle
                cx={x}
                cy={ySys}
                r={isHovered ? 5.5 : 3}
                fill="#ffffff"
                stroke="#ef4444"
                strokeWidth={isHovered ? 3 : 1.8}
                className="transition-all duration-150"
              />

              {/* Diastolic Point */}
              <circle
                cx={x}
                cy={yDia}
                r={isHovered ? 5.5 : 3}
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth={isHovered ? 3 : 1.8}
                className="transition-all duration-150"
              />

              {/* Guideline on hover */}
              {isHovered && (
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + chartHeight}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              )}
            </g>
          );
        })}

        {/* X-axis date labels */}
        {displayItems.map((m, i) => {
          const step = Math.max(1, Math.floor(displayItems.length / 5));
          if (i % step !== 0 && i !== displayItems.length - 1) return null;
          const x = getX(i);
          const d = new Date(m.timestamp);
          const label = `${d.getDate()}.${d.getMonth() + 1}.`;

          return (
            <text
              key={`x_${i}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px] font-mono fill-slate-400 dark:fill-slate-500"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Interactive Tooltip Card */}
      {hoveredItem && (
        <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-900 text-white text-xs shadow-xl border border-slate-800 animate-in fade-in duration-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {formatDateDe(hoveredItem.timestamp)} · {formatTimeDe(hoveredItem.timestamp)} Uhr
            </span>
            {hoveredCategory && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: hoveredCategory.bgLight, color: hoveredCategory.textColor }}
              >
                {hoveredCategory.shortLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="text-red-400 font-bold">SYS: {hoveredItem.systolic}</span>
            <span className="text-sky-400 font-bold">DIA: {hoveredItem.diastolic}</span>
            <span className="text-emerald-400 font-medium">Puls: {hoveredItem.pulse}</span>
          </div>
        </div>
      )}

      {/* Comprehensive Medical Legend */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Systolisch (SYS)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
          <span>Diastolisch (DIA)</span>
        </div>
        {showMovingAverage && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-red-300" />
            <span>Gleitender Schnitt</span>
          </div>
        )}
        {showPulse && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Puls</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <span className="h-0.5 w-3 bg-amber-400 border-t border-dashed" />
          <span>135/85 (Heim ESH)</span>
        </div>
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <span className="h-0.5 w-3 bg-red-400 border-t border-dashed" />
          <span>140/90 (Praxis)</span>
        </div>
      </div>
    </div>
  );
};

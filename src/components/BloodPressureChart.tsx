/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Measurement } from '../types/bloodPressure';
import { formatDateDe, formatTimeDe } from '../services/bloodPressureUtils';

interface BloodPressureChartProps {
  measurements: Measurement[];
  height?: number;
  showPulse?: boolean;
}

export const BloodPressureChart: React.FC<BloodPressureChartProps> = ({
  measurements,
  height = 240,
  showPulse = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (measurements.length === 0) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Keine Messwerte für das Diagramm vorhanden
      </div>
    );
  }

  // Chronological order for the chart (oldest left, newest right)
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Maximum items to display on chart to avoid overcrowding
  const displayItems = sorted.slice(-30);

  const paddingLeft = 38;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 30;
  const svgWidth = 600;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Value boundaries
  const minY = 50;
  const maxY = 200;

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

  // Guideline lines (140 mmHg = Hypertonie Schwelle, 90 mmHg = Diastolische Schwelle)
  const y140 = getY(140);
  const y90 = getY(90);
  const y120 = getY(120);
  const y80 = getY(80);

  const hoveredItem = hoveredIndex !== null ? displayItems[hoveredIndex] : null;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        <defs>
          <linearGradient id="sysGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="diaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[60, 80, 100, 120, 140, 160, 180].map((val) => {
          const y = getY(val);
          const isThreshold = val === 140 || val === 90;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgWidth - paddingRight}
                y2={y}
                stroke="currentColor"
                className={isThreshold ? 'text-red-400 dark:text-red-500/40' : 'text-slate-200 dark:text-slate-800'}
                strokeDasharray={isThreshold ? '4,3' : '2,2'}
                strokeWidth={isThreshold ? '1.2' : '0.8'}
              />
              <text
                x={paddingLeft - 6}
                y={y + 3}
                textAnchor="end"
                className={`text-[9px] font-mono tabular-nums ${
                  isThreshold ? 'fill-red-500 font-semibold' : 'fill-slate-400 dark:fill-slate-500'
                }`}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Normal target zone highlight (80 to 120) */}
        <rect
          x={paddingLeft}
          y={y120}
          width={chartWidth}
          height={Math.max(0, y80 - y120)}
          fill="#10b981"
          fillOpacity="0.04"
        />

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
                r={isHovered ? 5 : 3}
                fill="#ffffff"
                stroke="#ef4444"
                strokeWidth={isHovered ? 2.5 : 1.8}
                className="transition-all duration-150"
              />

              {/* Diastolic Point */}
              <circle
                cx={x}
                cy={yDia}
                r={isHovered ? 5 : 3}
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth={isHovered ? 2.5 : 1.8}
                className="transition-all duration-150"
              />

              {/* Vertical guideline on hover */}
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
          // Show roughly 5-6 date labels
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
        <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 text-white px-3 py-1.5 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {formatDateDe(hoveredItem.timestamp)} · {formatTimeDe(hoveredItem.timestamp)} Uhr
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="text-red-400 font-bold">SYS: {hoveredItem.systolic}</span>
            <span className="text-sky-400 font-bold">DIA: {hoveredItem.diastolic}</span>
            <span className="text-emerald-400">PULS: {hoveredItem.pulse}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Systolisch (SYS)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
          <span>Diastolisch (DIA)</span>
        </div>
        {showPulse && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Puls (BPM)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
          <span className="h-0.5 w-3 bg-red-400 border-t border-dashed" />
          <span>Grenzwert 140/90 mmHg</span>
        </div>
      </div>
    </div>
  );
};

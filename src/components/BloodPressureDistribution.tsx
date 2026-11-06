/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HistogramBin } from '../types/bloodPressure';
import { BarChart3 } from 'lucide-react';

interface BloodPressureDistributionProps {
  sysBins: HistogramBin[];
  diaBins: HistogramBin[];
  totalCount: number;
}

export const BloodPressureDistribution: React.FC<BloodPressureDistributionProps> = ({
  sysBins,
  diaBins,
  totalCount,
}) => {
  const [activeTab, setActiveTab] = useState<'sys' | 'dia'>('sys');

  if (totalCount === 0) {
    return (
      <div className="flex h-36 w-full items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Keine Messwerte für die Verteilung vorhanden
      </div>
    );
  }

  const activeBins = activeTab === 'sys' ? sysBins : diaBins;
  const maxBinCount = Math.max(1, ...activeBins.map((b) => b.count));

  const getBinColor = (label: string, isSys: boolean) => {
    if (isSys) {
      if (label.includes('< 120')) return 'bg-emerald-500';
      if (label.includes('120–129')) return 'bg-sky-500';
      if (label.includes('130–139')) return 'bg-amber-400';
      if (label.includes('140–159')) return 'bg-orange-500';
      return 'bg-red-600';
    } else {
      if (label.includes('< 80')) return 'bg-emerald-500';
      if (label.includes('80–84')) return 'bg-sky-500';
      if (label.includes('85–89')) return 'bg-amber-400';
      if (label.includes('90–99')) return 'bg-orange-500';
      return 'bg-red-600';
    }
  };

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Klassen-Häufigkeit ({totalCount} Messungen)
        </span>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('sys')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'sys'
                ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Systole (SYS)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dia')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'dia'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Diastole (DIA)
          </button>
        </div>
      </div>

      {/* Histogram Bars */}
      <div className="space-y-2 pt-1">
        {activeBins.map((bin) => {
          const barWidthPct = Math.round((bin.count / maxBinCount) * 100);
          const color = getBinColor(bin.label, activeTab === 'sys');

          return (
            <div key={bin.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {bin.label} mmHg
                </span>
                <span className="text-slate-500 tabular-nums">
                  {bin.count} Messungen ({bin.percentage}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${color}`}
                  style={{ width: `${barWidthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

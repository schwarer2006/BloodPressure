/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WhoCategory, CategoryInfo, Measurement, BloodPressureStats } from '../types/bloodPressure';

export const WHO_CATEGORIES: Record<WhoCategory, CategoryInfo> = {
  optimal: {
    category: 'optimal',
    labelDe: 'Optimal',
    shortLabel: 'Optimal',
    color: '#10b981', // emerald-500
    bgLight: '#ecfdf5', // emerald-50
    bgDark: '#064e3b', // emerald-900/40
    textColor: '#047857',
    descriptionDe: 'Ihr Blutdruck liegt im optimalen Zielbereich unter 120/80 mmHg.',
    rangeSys: '< 120',
    rangeDia: '< 80',
  },
  normal: {
    category: 'normal',
    labelDe: 'Normal',
    shortLabel: 'Normal',
    color: '#0ea5e9', // sky-500
    bgLight: '#f0f9ff', // sky-50
    bgDark: '#0c4a6e', // sky-900/40
    textColor: '#0369a1',
    descriptionDe: 'Guter physiologischer Normalbereich nach WHO/ESH-Leitlinie.',
    rangeSys: '120 – 129',
    rangeDia: '80 – 84',
  },
  high_normal: {
    category: 'high_normal',
    labelDe: 'Hoch-Normal',
    shortLabel: 'Hoch-Norm.',
    color: '#f59e0b', // amber-500
    bgLight: '#fffbeb', // amber-50
    bgDark: '#78350f', // amber-900/40
    textColor: '#b45309',
    descriptionDe: 'Grenzwertig normal. Regelmäßige Kontrollen und gesunder Lebensstil empfohlen.',
    rangeSys: '130 – 139',
    rangeDia: '85 – 89',
  },
  hypertension_grade_1: {
    category: 'hypertension_grade_1',
    labelDe: 'Hypertonie Grad 1 (Mild)',
    shortLabel: 'Hyp. 1',
    color: '#f97316', // orange-500
    bgLight: '#fff7ed', // orange-50
    bgDark: '#7c2d12', // orange-900/40
    textColor: '#c2410c',
    descriptionDe: 'Leichte Hypertonie. Besprechen Sie diese Werte bei Ihrem nächsten Arzttermin.',
    rangeSys: '140 – 159',
    rangeDia: '90 – 99',
  },
  hypertension_grade_2: {
    category: 'hypertension_grade_2',
    labelDe: 'Hypertonie Grad 2 (Mäßig)',
    shortLabel: 'Hyp. 2',
    color: '#ef4444', // red-500
    bgLight: '#fef2f2', // red-50
    bgDark: '#7f1d1d', // red-900/40
    textColor: '#b91c1c',
    descriptionDe: 'Mittelschwere Hypertonie. Zeitnahe ärztliche Abklärung wird empfohlen.',
    rangeSys: '160 – 179',
    rangeDia: '100 – 109',
  },
  hypertension_grade_3: {
    category: 'hypertension_grade_3',
    labelDe: 'Hypertonie Grad 3 (Schwer)',
    shortLabel: 'Hyp. 3',
    color: '#b91c1c', // red-700
    bgLight: '#fee2e2', // red-100
    bgDark: '#450a0a', // red-950/60
    textColor: '#991b1b',
    descriptionDe: 'Schwere Hypertonie. Bei Beschwerden oder Persistenz unverzüglich ärztlichen Rat einholen.',
    rangeSys: '≥ 180',
    rangeDia: '≥ 110',
  },
  isolated_systolic: {
    category: 'isolated_systolic',
    labelDe: 'Isolierte systolische Hypertonie',
    shortLabel: 'Isol. Syst.',
    color: '#d97706', // amber-600
    bgLight: '#fef3c7', // amber-100
    bgDark: '#451a03',
    textColor: '#92400e',
    descriptionDe: 'Systolischer Wert erhöht bei normalem diastolischem Druck (häufig im Alter).',
    rangeSys: '≥ 140',
    rangeDia: '< 90',
  },
};

/**
 * Classifies a blood pressure reading according to WHO / ESH guidelines.
 */
export function classifyBloodPressure(sys: number, dia: number): CategoryInfo {
  // Check for isolated systolic hypertension
  if (sys >= 140 && dia < 90) {
    return WHO_CATEGORIES.isolated_systolic;
  }
  if (sys >= 180 || dia >= 110) {
    return WHO_CATEGORIES.hypertension_grade_3;
  }
  if ((sys >= 160 && sys <= 179) || (dia >= 100 && dia <= 109)) {
    return WHO_CATEGORIES.hypertension_grade_2;
  }
  if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) {
    return WHO_CATEGORIES.hypertension_grade_1;
  }
  if ((sys >= 130 && sys <= 139) || (dia >= 85 && dia <= 89)) {
    return WHO_CATEGORIES.high_normal;
  }
  if ((sys >= 120 && sys <= 129) || (dia >= 80 && dia <= 84)) {
    return WHO_CATEGORIES.normal;
  }
  return WHO_CATEGORIES.optimal;
}

/**
 * Checks if a measurement is in the morning window (05:00 - 11:59)
 */
export function isMorningMeasurement(date: Date): boolean {
  const hours = date.getHours();
  return hours >= 5 && hours < 12;
}

/**
 * Checks if a measurement is in the evening window (17:00 - 23:59)
 */
export function isEveningMeasurement(date: Date): boolean {
  const hours = date.getHours();
  return hours >= 17 && hours <= 23;
}

/**
 * Computes aggregate statistics for a set of measurements
 */
export function calculateStats(measurements: Measurement[]): BloodPressureStats {
  if (measurements.length === 0) {
    return {
      count: 0,
      avgSys: 0,
      avgDia: 0,
      avgPulse: 0,
      minSys: 0,
      maxSys: 0,
      minDia: 0,
      maxDia: 0,
      minPulse: 0,
      maxPulse: 0,
      avgPulsePressure: 0,
      categoryDistribution: {
        optimal: 0,
        normal: 0,
        high_normal: 0,
        hypertension_grade_1: 0,
        hypertension_grade_2: 0,
        hypertension_grade_3: 0,
        isolated_systolic: 0,
      },
    };
  }

  let totalSys = 0;
  let totalDia = 0;
  let totalPulse = 0;

  let minSys = Infinity;
  let maxSys = -Infinity;
  let minDia = Infinity;
  let maxDia = -Infinity;
  let minPulse = Infinity;
  let maxPulse = -Infinity;

  const morningItems: Measurement[] = [];
  const eveningItems: Measurement[] = [];

  const categoryCounts: Record<WhoCategory, number> = {
    optimal: 0,
    normal: 0,
    high_normal: 0,
    hypertension_grade_1: 0,
    hypertension_grade_2: 0,
    hypertension_grade_3: 0,
    isolated_systolic: 0,
  };

  for (const m of measurements) {
    totalSys += m.systolic;
    totalDia += m.diastolic;
    totalPulse += m.pulse;

    if (m.systolic < minSys) minSys = m.systolic;
    if (m.systolic > maxSys) maxSys = m.systolic;
    if (m.diastolic < minDia) minDia = m.diastolic;
    if (m.diastolic > maxDia) maxDia = m.diastolic;
    if (m.pulse < minPulse) minPulse = m.pulse;
    if (m.pulse > maxPulse) maxPulse = m.pulse;

    const cat = classifyBloodPressure(m.systolic, m.diastolic);
    categoryCounts[cat.category] = (categoryCounts[cat.category] || 0) + 1;

    const d = new Date(m.timestamp);
    if (isMorningMeasurement(d)) morningItems.push(m);
    else if (isEveningMeasurement(d)) eveningItems.push(m);
  }

  const count = measurements.length;
  const avgSys = Math.round(totalSys / count);
  const avgDia = Math.round(totalDia / count);
  const avgPulse = Math.round(totalPulse / count);

  const stats: BloodPressureStats = {
    count,
    avgSys,
    avgDia,
    avgPulse,
    minSys,
    maxSys,
    minDia,
    maxDia,
    minPulse,
    maxPulse,
    avgPulsePressure: avgSys - avgDia,
    categoryDistribution: categoryCounts,
  };

  if (morningItems.length > 0) {
    const mSys = Math.round(morningItems.reduce((acc, i) => acc + i.systolic, 0) / morningItems.length);
    const mDia = Math.round(morningItems.reduce((acc, i) => acc + i.diastolic, 0) / morningItems.length);
    const mPulse = Math.round(morningItems.reduce((acc, i) => acc + i.pulse, 0) / morningItems.length);
    stats.morningAvg = { sys: mSys, dia: mDia, pulse: mPulse, count: morningItems.length };
  }

  if (eveningItems.length > 0) {
    const eSys = Math.round(eveningItems.reduce((acc, i) => acc + i.systolic, 0) / eveningItems.length);
    const eDia = Math.round(eveningItems.reduce((acc, i) => acc + i.diastolic, 0) / eveningItems.length);
    const ePulse = Math.round(eveningItems.reduce((acc, i) => acc + i.pulse, 0) / eveningItems.length);
    stats.eveningAvg = { sys: eSys, dia: eDia, pulse: ePulse, count: eveningItems.length };
  }

  return stats;
}

/**
 * Format date in German standard (e.g. "05.11.2026")
 */
export function formatDateDe(isoStringOrDate: string | Date): string {
  const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time in German standard (e.g. "08:15")
 */
export function formatTimeDe(isoStringOrDate: string | Date): string {
  const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format arm position in German
 */
export function formatArmDe(arm: 'left' | 'right'): string {
  return arm === 'left' ? 'Linker Arm' : 'Rechter Arm';
}

/**
 * Format posture in German
 */
export function formatPostureDe(posture: 'sitting' | 'lying' | 'standing'): string {
  switch (posture) {
    case 'sitting':
      return 'Sitzend';
    case 'lying':
      return 'Liegend';
    case 'standing':
      return 'Stehend';
    default:
      return 'Sitzend';
  }
}

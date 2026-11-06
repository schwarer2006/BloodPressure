/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WhoCategory,
  CategoryInfo,
  Measurement,
  BloodPressureStats,
  DayAggregate,
  HistogramBin,
  PeriodComparison,
  TrendAnalysis,
} from '../types/bloodPressure';

/**
 * Medizinisch dokumentierte Schwellenwerte nach ESH/ESC 2023 Leitlinien
 * und WHO-Klassifikation.
 * Beachtet die Unterscheidung zwischen Praxisblutdruck (140/90 mmHg)
 * und Heimmessung / HBPM (135/85 mmHg).
 */
export const WHO_CATEGORIES: Record<WhoCategory, CategoryInfo> = {
  optimal: {
    category: 'optimal',
    labelDe: 'Optimal',
    shortLabel: 'Optimal',
    color: '#10b981', // emerald-500
    bgLight: '#ecfdf5',
    bgDark: '#064e3b',
    textColor: '#047857',
    descriptionDe: 'Blutdruck liegt im optimalen Zielbereich unter 120/80 mmHg.',
    guidelineBasis: 'ESH/ESC 2023 & WHO Leitlinie',
    thresholdHome: '< 120 / < 80 mmHg',
    thresholdOffice: '< 120 / < 80 mmHg',
    rangeSys: '< 120',
    rangeDia: '< 80',
  },
  normal: {
    category: 'normal',
    labelDe: 'Normal',
    shortLabel: 'Normal',
    color: '#0ea5e9', // sky-500
    bgLight: '#f0f9ff',
    bgDark: '#0c4a6e',
    textColor: '#0369a1',
    descriptionDe: 'Physiologischer Normalbereich. Regelmäßige Routineüberwachung empfohlen.',
    guidelineBasis: 'ESH/ESC 2023 & WHO Leitlinie',
    thresholdHome: '120–129 / 80–84 mmHg',
    thresholdOffice: '120–129 / 80–84 mmHg',
    rangeSys: '120 – 129',
    rangeDia: '80 – 84',
  },
  high_normal: {
    category: 'high_normal',
    labelDe: 'Hoch-Normal',
    shortLabel: 'Hoch-Norm.',
    color: '#f59e0b', // amber-500
    bgLight: '#fffbeb',
    bgDark: '#78350f',
    textColor: '#b45309',
    descriptionDe: 'Grenzwertig normal. Lebensstilmaßnahmen und Kontrollmessungen empfohlen.',
    guidelineBasis: 'ESH/ESC 2023 & WHO Leitlinie',
    thresholdHome: '130–134 / 84 mmHg (HBPM)',
    thresholdOffice: '130–139 / 85–89 mmHg (Praxis)',
    rangeSys: '130 – 139',
    rangeDia: '85 – 89',
  },
  hypertension_grade_1: {
    category: 'hypertension_grade_1',
    labelDe: 'Hypertonie Grad 1 (Mild)',
    shortLabel: 'Hyp. 1',
    color: '#f97316', // orange-500
    bgLight: '#fff7ed',
    bgDark: '#7c2d12',
    textColor: '#c2410c',
    descriptionDe: 'Leichte Hypertonie (Heimmessung ≥135/85 mmHg, Praxismessung ≥140/90 mmHg). Ärztliche Konsultation empfohlen.',
    guidelineBasis: 'ESH/ESC 2023 & Deutsche Hochdruckliga',
    thresholdHome: '≥ 135 / ≥ 85 mmHg (HBPM-Grenze)',
    thresholdOffice: '≥ 140 / ≥ 90 mmHg (Praxis-Grenze)',
    rangeSys: '140 – 159',
    rangeDia: '90 – 99',
  },
  hypertension_grade_2: {
    category: 'hypertension_grade_2',
    labelDe: 'Hypertonie Grad 2 (Mäßig)',
    shortLabel: 'Hyp. 2',
    color: '#ef4444', // red-500
    bgLight: '#fef2f2',
    bgDark: '#7f1d1d',
    textColor: '#b91c1c',
    descriptionDe: 'Mittelschwere Hypertonie. Zeitnahe ärztliche Abklärung erforderlich.',
    guidelineBasis: 'ESH/ESC 2023 Leitlinie',
    thresholdHome: '160–179 / 100–109 mmHg',
    thresholdOffice: '160–179 / 100–109 mmHg',
    rangeSys: '160 – 179',
    rangeDia: '100 – 109',
  },
  hypertension_grade_3: {
    category: 'hypertension_grade_3',
    labelDe: 'Hypertonie Grad 3 (Schwer)',
    shortLabel: 'Hyp. 3',
    color: '#b91c1c', // red-700
    bgLight: '#fee2e2',
    bgDark: '#450a0a',
    textColor: '#991b1b',
    descriptionDe: 'Schwere Hypertonie. Bei Symptomen oder Persistenz unverzüglich medizinischen Rat einholen.',
    guidelineBasis: 'ESH/ESC 2023 Leitlinie',
    thresholdHome: '≥ 180 / ≥ 110 mmHg',
    thresholdOffice: '≥ 180 / ≥ 110 mmHg',
    rangeSys: '≥ 180',
    rangeDia: '≥ 110',
  },
  isolated_systolic: {
    category: 'isolated_systolic',
    labelDe: 'Isolierte systolische Hypertonie',
    shortLabel: 'Isol. Syst.',
    color: '#d97706', // amber-600
    bgLight: '#fef3c7',
    bgDark: '#451a03',
    textColor: '#92400e',
    descriptionDe: 'Systolischer Blutdruck erhöht bei normalem diastolischem Druck (typisch bei Gefäßsteifigkeit).',
    guidelineBasis: 'ESH/ESC 2023 & WHO Leitlinie',
    thresholdHome: 'SYS ≥ 135 & DIA < 85 mmHg',
    thresholdOffice: 'SYS ≥ 140 & DIA < 90 mmHg',
    rangeSys: '≥ 140',
    rangeDia: '< 90',
  },
};

/**
 * Classifies a blood pressure reading according to clinical ESH/ESC & WHO guidelines.
 * Accounts for isolated systolic hypertension and home vs. office measurement context.
 */
export function classifyBloodPressure(sys: number, dia: number, isHomeMeasurement = true): CategoryInfo {
  // Check for isolated systolic hypertension
  const sysHypertensionThreshold = isHomeMeasurement ? 135 : 140;
  const diaHypertensionThreshold = isHomeMeasurement ? 85 : 90;

  if (sys >= sysHypertensionThreshold && dia < diaHypertensionThreshold) {
    return WHO_CATEGORIES.isolated_systolic;
  }
  if (sys >= 180 || dia >= 110) {
    return WHO_CATEGORIES.hypertension_grade_3;
  }
  if ((sys >= 160 && sys <= 179) || (dia >= 100 && dia <= 109)) {
    return WHO_CATEGORIES.hypertension_grade_2;
  }
  if (sys >= sysHypertensionThreshold || dia >= diaHypertensionThreshold) {
    return WHO_CATEGORIES.hypertension_grade_1;
  }
  if (isHomeMeasurement) {
    if ((sys >= 130 && sys < 135) || (dia >= 80 && dia < 85)) {
      return WHO_CATEGORIES.high_normal;
    }
  } else {
    if ((sys >= 130 && sys <= 139) || (dia >= 85 && dia <= 89)) {
      return WHO_CATEGORIES.high_normal;
    }
  }
  if ((sys >= 120 && sys <= 129) || (dia >= 80 && dia <= 84)) {
    return WHO_CATEGORIES.normal;
  }
  return WHO_CATEGORIES.optimal;
}

/**
 * Time-of-day classifiers
 */
export function isMorningMeasurement(date: Date, startHour = 5, endHour = 12): boolean {
  const h = date.getHours();
  return h >= startHour && h < endHour;
}

export function isEveningMeasurement(date: Date, startHour = 17, endHour = 24): boolean {
  const h = date.getHours();
  return h >= startHour && h < endHour;
}

export function getTimeOfDay(date: Date): 'morning' | 'day' | 'evening' | 'night' {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'day';
  if (h >= 17 && h < 23) return 'evening';
  return 'night';
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Aggregates measurements by calendar day.
 * Missing days are NOT interpolated or assigned zero values.
 */
export function aggregateByCalendarDay(measurements: Measurement[]): Record<string, DayAggregate> {
  const map: Record<string, DayAggregate> = {};

  for (const m of measurements) {
    const d = new Date(m.timestamp);
    if (isNaN(d.getTime())) continue;
    const key = toDateKey(d);

    if (!map[key]) {
      map[key] = {
        dateKey: key,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        avgSys: 0,
        avgDia: 0,
        avgPulse: 0,
        minSys: m.systolic,
        maxSys: m.systolic,
        minDia: m.diastolic,
        maxDia: m.diastolic,
        count: 0,
        measurements: [],
      };
    }

    const item = map[key];
    item.measurements.push(m);
    item.count++;
    if (m.systolic < item.minSys) item.minSys = m.systolic;
    if (m.systolic > item.maxSys) item.maxSys = m.systolic;
    if (m.diastolic < item.minDia) item.minDia = m.diastolic;
    if (m.diastolic > item.maxDia) item.maxDia = m.diastolic;
  }

  // Calculate arithmetic means per day
  for (const key of Object.keys(map)) {
    const item = map[key];
    const totalSys = item.measurements.reduce((acc, m) => acc + m.systolic, 0);
    const totalDia = item.measurements.reduce((acc, m) => acc + m.diastolic, 0);
    const totalPulse = item.measurements.reduce((acc, m) => acc + m.pulse, 0);
    item.avgSys = Math.round(totalSys / item.count);
    item.avgDia = Math.round(totalDia / item.count);
    item.avgPulse = Math.round(totalPulse / item.count);
  }

  return map;
}

/**
 * Generates histogram distributions for SYS and DIA with standard physiological intervals.
 */
export function computeHistograms(measurements: Measurement[]): {
  sysBins: HistogramBin[];
  diaBins: HistogramBin[];
} {
  const total = measurements.length;
  if (total === 0) {
    return { sysBins: [], diaBins: [] };
  }

  const sysDefs = [
    { label: '< 120', min: 0, max: 119 },
    { label: '120–129', min: 120, max: 129 },
    { label: '130–139', min: 130, max: 139 },
    { label: '140–159', min: 140, max: 159 },
    { label: '160–179', min: 160, max: 179 },
    { label: '≥ 180', min: 180, max: 999 },
  ];

  const diaDefs = [
    { label: '< 80', min: 0, max: 79 },
    { label: '80–84', min: 80, max: 84 },
    { label: '85–89', min: 85, max: 89 },
    { label: '90–99', min: 90, max: 99 },
    { label: '100–109', min: 100, max: 109 },
    { label: '≥ 110', min: 110, max: 999 },
  ];

  const sysBins: HistogramBin[] = sysDefs.map((def) => {
    const count = measurements.filter((m) => m.systolic >= def.min && m.systolic <= def.max).length;
    return {
      label: def.label,
      min: def.min,
      max: def.max,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });

  const diaBins: HistogramBin[] = diaDefs.map((def) => {
    const count = measurements.filter((m) => m.diastolic >= def.min && m.diastolic <= def.max).length;
    return {
      label: def.label,
      min: def.min,
      max: def.max,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });

  return { sysBins, diaBins };
}

/**
 * Computes linear trend (slope in mmHg per day) for SYS and DIA.
 */
export function computeTrend(measurements: Measurement[]): TrendAnalysis {
  if (measurements.length < 3) {
    return {
      slopeSys: 0,
      slopeDia: 0,
      directionSys: 'stable',
      directionDia: 'stable',
      descriptionDe: 'Zu wenige Messwerte für eine Trendanalyse (mindestens 3 erforderlich).',
    };
  }

  // Sort chronologically (oldest to newest)
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const t0 = new Date(sorted[0].timestamp).getTime();
  const msInDay = 86400000;

  // Simple linear regression (y = mx + b)
  let sumX = 0;
  let sumY_sys = 0;
  let sumY_dia = 0;
  let sumXY_sys = 0;
  let sumXY_dia = 0;
  let sumXX = 0;
  const n = sorted.length;

  for (let i = 0; i < n; i++) {
    const x = (new Date(sorted[i].timestamp).getTime() - t0) / msInDay;
    const ySys = sorted[i].systolic;
    const yDia = sorted[i].diastolic;

    sumX += x;
    sumY_sys += ySys;
    sumY_dia += yDia;
    sumXY_sys += x * ySys;
    sumXY_dia += x * yDia;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  const slopeSys = denom !== 0 ? (n * sumXY_sys - sumX * sumY_sys) / denom : 0;
  const slopeDia = denom !== 0 ? (n * sumXY_dia - sumX * sumY_dia) / denom : 0;

  const classifySlope = (s: number): 'falling' | 'stable' | 'rising' => {
    if (s < -0.15) return 'falling';
    if (s > 0.15) return 'rising';
    return 'stable';
  };

  const dirSys = classifySlope(slopeSys);
  const dirDia = classifySlope(slopeDia);

  let desc = 'Blutdruckverlauf weitgehend stabil.';
  if (dirSys === 'falling' && dirDia === 'falling') {
    desc = 'Erfreulicher Abwärtstrend sowohl bei Systole als auch Diastole.';
  } else if (dirSys === 'rising' || dirDia === 'rising') {
    desc = 'Tendenzieller Anstieg der Blutdruckwerte im Beobachtungszeitraum.';
  } else if (dirSys === 'falling') {
    desc = 'Systolischer Blutdruck zeigt eine leicht fallende Tendenz.';
  }

  return {
    slopeSys: Math.round(slopeSys * 100) / 100,
    slopeDia: Math.round(slopeDia * 100) / 100,
    directionSys: dirSys,
    directionDia: dirDia,
    descriptionDe: desc,
  };
}

/**
 * Calculates moving average (n-point moving average) for time series smoothing
 */
export function calculateMovingAverage(
  measurements: Measurement[],
  windowSize = 3
): Array<{ id: string; timestamp: string; sysMA: number; diaMA: number }> {
  if (measurements.length === 0) return [];
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return sorted.map((item, idx) => {
    const start = Math.max(0, idx - Math.floor(windowSize / 2));
    const end = Math.min(sorted.length, start + windowSize);
    const windowSlice = sorted.slice(start, end);

    const avgSys = Math.round(windowSlice.reduce((acc, m) => acc + m.systolic, 0) / windowSlice.length);
    const avgDia = Math.round(windowSlice.reduce((acc, m) => acc + m.diastolic, 0) / windowSlice.length);

    return {
      id: item.id,
      timestamp: item.timestamp,
      sysMA: avgSys,
      diaMA: avgDia,
    };
  });
}

/**
 * Central Statistics Engine:
 * Computes arithmetic means, day aggregates, morning/evening comparison,
 * min/max, pulse pressure, distributions, and comparison with previous period.
 */
export function calculateStats(
  currentMeasurements: Measurement[],
  allHistoricalMeasurements?: Measurement[],
  timeframeDays?: number
): BloodPressureStats {
  const count = currentMeasurements.length;
  const emptyDistribution: Record<WhoCategory, number> = {
    optimal: 0,
    normal: 0,
    high_normal: 0,
    hypertension_grade_1: 0,
    hypertension_grade_2: 0,
    hypertension_grade_3: 0,
    isolated_systolic: 0,
  };

  if (count === 0) {
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
      categoryDistribution: emptyDistribution,
      dailyAggregates: {},
      sysDistribution: [],
      diaDistribution: [],
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
  const daytimeItems: Measurement[] = [];
  const eveningItems: Measurement[] = [];
  const nightItems: Measurement[] = [];

  const categoryCounts: Record<WhoCategory, number> = { ...emptyDistribution };

  for (const m of currentMeasurements) {
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
    const tod = getTimeOfDay(d);
    if (tod === 'morning') morningItems.push(m);
    else if (tod === 'day') daytimeItems.push(m);
    else if (tod === 'evening') eveningItems.push(m);
    else nightItems.push(m);
  }

  const avgSys = Math.round(totalSys / count);
  const avgDia = Math.round(totalDia / count);
  const avgPulse = Math.round(totalPulse / count);

  // Group helpers
  const getSubAvg = (items: Measurement[]) => {
    if (items.length === 0) return undefined;
    return {
      sys: Math.round(items.reduce((acc, m) => acc + m.systolic, 0) / items.length),
      dia: Math.round(items.reduce((acc, m) => acc + m.diastolic, 0) / items.length),
      pulse: Math.round(items.reduce((acc, m) => acc + m.pulse, 0) / items.length),
      count: items.length,
    };
  };

  const dailyAggregates = aggregateByCalendarDay(currentMeasurements);
  const { sysBins, diaBins } = computeHistograms(currentMeasurements);
  const trend = computeTrend(currentMeasurements);

  // Comparison with previous period if days provided
  let comparison: PeriodComparison | undefined;
  if (timeframeDays && allHistoricalMeasurements && allHistoricalMeasurements.length > 0) {
    const now = new Date().getTime();
    const currentStart = now - timeframeDays * 86400000;
    const previousStart = now - 2 * timeframeDays * 86400000;

    const previousItems = allHistoricalMeasurements.filter((m) => {
      const t = new Date(m.timestamp).getTime();
      return t >= previousStart && t < currentStart;
    });

    if (previousItems.length > 0) {
      const prevSys = Math.round(previousItems.reduce((acc, m) => acc + m.systolic, 0) / previousItems.length);
      const prevDia = Math.round(previousItems.reduce((acc, m) => acc + m.diastolic, 0) / previousItems.length);
      const prevPulse = Math.round(previousItems.reduce((acc, m) => acc + m.pulse, 0) / previousItems.length);

      comparison = {
        diffSys: avgSys - prevSys,
        diffDia: avgDia - prevDia,
        diffPulse: avgPulse - prevPulse,
        diffCount: count - previousItems.length,
        previousAvgSys: prevSys,
        previousAvgDia: prevDia,
        previousAvgPulse: prevPulse,
        previousCount: previousItems.length,
      };
    }
  }

  return {
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
    morningAvg: getSubAvg(morningItems),
    daytimeAvg: getSubAvg(daytimeItems),
    eveningAvg: getSubAvg(eveningItems),
    nightAvg: getSubAvg(nightItems),
    categoryDistribution: categoryCounts,
    dailyAggregates,
    sysDistribution: sysBins,
    diaDistribution: diaBins,
    trend,
    comparison,
  };
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
 * Format date in short German standard (e.g. "05. Nov")
 */
export function formatDateShortDe(isoStringOrDate: string | Date): string {
  const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
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

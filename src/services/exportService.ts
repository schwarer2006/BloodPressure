/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import {
  HeatmapMetric,
  Measurement,
  PulseScaleConfig,
  UserProfile,
} from '../types/bloodPressure';
import {
  classifyBloodPressure,
  calculateStats,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
  aggregateByCalendarDay,
  buildCalendarWeeks,
  getHeatmapColorForValue,
  DEFAULT_PULSE_SCALE,
  toDateKey,
} from './bloodPressureUtils';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface PdfExportOptions {
  isDemoMode?: boolean;
  includePulseHeatmap?: boolean;
  pulseScale?: PulseScaleConfig;
  referenceDate?: Date;
}

/**
 * Downloads a text or blob file to user's device (Web Fallback)
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Shares or saves a file natively on Android if running under Capacitor, or falls back to Web download.
 */
async function saveOrShareFile(
  base64Data: string,
  filename: string,
  mimeType: string,
  title: string
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        text: `Exportierter Blutdruck-Bericht: ${filename}`,
        url: result.uri,
        dialogTitle: 'Bericht teilen oder speichern',
      });
      return;
    } catch (err) {
      console.warn('Native Capacitor share failed, falling back to blob download:', err);
    }
  }

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  triggerDownload(blob, filename);
}

/**
 * Layout constants for DIN A4 Medical Report (Gate 4.1)
 */
const PDF_LAYOUT = {
  PAGE_W: 210,
  PAGE_H: 297,
  MARGIN: 15, // >= 15 mm required
  CONTENT_W: 180, // 210 - 2 * 15
  HEADER_LINE_Y: 14,
  TOP_CONTENT_Y: 20,
  FOOTER_LINE_Y: 280,
  FOOTER_TEXT_Y: 285,
  MAX_Y: 275, // Safe bottom content limit before page break
  FONT_FAMILY: 'LibSans',
  FONT_BODY: 10.5,
  FONT_SUB: 9.5,
  FONT_TABLE: 9,
  FONT_HEADING: 12,
  LINE_H_BODY: 4.7,
  LINE_H_SUB: 4.3,
  LINE_H_TABLE: 4.1,
};

/**
 * Builds the complete jsPDF document (exported cleanly for both app export and automated/visual PDF verification).
 */
export async function generatePdfDocument(
  measurements: Measurement[],
  profile: UserProfile,
  dateRangeTitle: string,
  options: PdfExportOptions = {}
): Promise<{ doc: jsPDF; filename: string }> {
  const {
    isDemoMode = false,
    includePulseHeatmap = true,
    pulseScale = DEFAULT_PULSE_SCALE,
    referenceDate = new Date(),
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register embedded Unicode LiberationSans TTF fonts (äöüßÄÖÜ, ≥, ≤, –, —, Ø, „, “, ²)
  const { LIBERATION_SANS_REGULAR_B64, LIBERATION_SANS_BOLD_B64 } = await import('./pdfFonts');
  doc.addFileToVFS('LiberationSans-Regular.ttf', LIBERATION_SANS_REGULAR_B64);
  doc.addFileToVFS('LiberationSans-Bold.ttf', LIBERATION_SANS_BOLD_B64);
  doc.addFont('LiberationSans-Regular.ttf', PDF_LAYOUT.FONT_FAMILY, 'normal');
  doc.addFont('LiberationSans-Bold.ttf', PDF_LAYOUT.FONT_FAMILY, 'bold');

  const F = PDF_LAYOUT.FONT_FAMILY;
  const { PAGE_W, PAGE_H, MARGIN, CONTENT_W, MAX_Y } = PDF_LAYOUT;

  const stats = calculateStats(measurements);
  const sortedAsc = [...measurements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Header & Footer renderer for pages 2..N (and footer on page 1)
  const drawRunningHeader = (pageNum: number, subtitle: string) => {
    if (pageNum === 1) return;
    if (isDemoMode) {
      doc.setFillColor(217, 119, 6); // Amber-600
    } else {
      doc.setFillColor(2, 132, 199); // Sky-600
    }
    doc.rect(0, 0, PAGE_W, 14, 'F');
    doc.setFont(F, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    const titlePrefix = isDemoMode ? 'DEMO · ' : '';
    doc.text(`${titlePrefix}${subtitle}`, MARGIN, 9.2);

    doc.setFont(F, 'normal');
    doc.setFontSize(9);
    const maxNameWidth = 65;
    const truncatedName = doc.splitTextToSize(`Patient/in: ${profile.name}`, maxNameWidth)[0];
    doc.text(truncatedName, PAGE_W - MARGIN, 9.2, { align: 'right' });
  };

  let curY = PDF_LAYOUT.TOP_CONTENT_Y;

  const startNewPage = (subtitle: string) => {
    doc.addPage();
    const pNum = doc.getNumberOfPages();
    drawRunningHeader(pNum, subtitle);
    curY = 21;
  };

  const ensureSpace = (neededHeight: number, continuationSubtitle: string): boolean => {
    if (curY + neededHeight > MAX_Y) {
      startNewPage(continuationSubtitle);
      return true;
    }
    return false;
  };

  // ==========================================================
  // SEITE 1: MEDIZINISCHE ZUSAMMENFASSUNG
  // ==========================================================
  if (isDemoMode) {
    doc.setFillColor(217, 119, 6);
  } else {
    doc.setFillColor(2, 132, 199);
  }
  doc.rect(0, 0, PAGE_W, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont(F, 'bold');
  doc.setFontSize(16);
  doc.text(
    isDemoMode ? 'Blutdruck-Verlaufsbericht (DEMO)' : 'Blutdruck-Verlaufsbericht',
    MARGIN,
    12
  );

  doc.setFont(F, 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Erstellt am ${formatDateDe(referenceDate)} um ${formatTimeDe(referenceDate)} Uhr · ESH/ESC 2023 Dokumentation`,
    MARGIN,
    19
  );

  curY = 30;

  // Demo Warning Banner if in Demo Mode
  if (isDemoMode) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(MARGIN, curY, CONTENT_W, 10, 2, 2, 'FD');
    doc.setFont(F, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(146, 64, 14);
    doc.text(
      'DEMO-BERICHT: Enthält ausschließlich synthetische Beispieldaten – nicht für ärztliche Befundung.',
      MARGIN + 4,
      curY + 6.4
    );
    curY += 14;
  }

  // Patient Profile Box (dynamic height with clean wrapping for long names & notes)
  doc.setFont(F, 'bold');
  doc.setFontSize(11);
  const nameLines = doc.splitTextToSize(`Patient/in: ${profile.name || 'Mein Profil'}`, CONTENT_W - 10);

  doc.setFont(F, 'normal');
  doc.setFontSize(10);
  const bioParts: string[] = [];
  if (profile.birthYear) bioParts.push(`Geburtsjahr: ${profile.birthYear}`);
  if (profile.gender && profile.gender !== 'not_specified') {
    const gMap: Record<string, string> = {
      male: 'Männlich',
      female: 'Weiblich',
      divers: 'Divers',
    };
    if (gMap[profile.gender]) bioParts.push(`Geschlecht: ${gMap[profile.gender]}`);
  }
  if (profile.heightCm) bioParts.push(`Größe: ${profile.heightCm} cm`);
  if (profile.weightKg) bioParts.push(`Gewicht: ${profile.weightKg} kg`);
  if (profile.heightCm && profile.weightKg) {
    const bmiVal = (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1);
    bioParts.push(`BMI: ${bmiVal} kg/m²`);
  }
  const bioText =
    bioParts.length > 0 ? bioParts.join('  ·  ') : 'Keine biometrischen Zusatzdaten hinterlegt';
  const bioLines = doc.splitTextToSize(bioText, CONTENT_W - 10);

  const uniqueDayCount = Math.max(1, Object.keys(stats.dailyAggregates).length);
  const freqText = stats.count > 0 ? (stats.count / uniqueDayCount).toFixed(1) : '0.0';
  const metaText = `Zeitraum: ${dateRangeTitle}  ·  Messungen: ${stats.count} (${freqText}x / Messtag)  ·  Kontext: Heimmessung (HBPM)`;
  const metaLines = doc.splitTextToSize(metaText, CONTENT_W - 10);

  const personalNoteLines = profile.personalNotes
    ? doc.splitTextToSize(`Profilnotiz: ${profile.personalNotes}`, CONTENT_W - 10)
    : [];

  const profileBoxH =
    7 +
    nameLines.length * 5.2 +
    bioLines.length * 4.5 +
    metaLines.length * 4.5 +
    (personalNoteLines.length > 0 ? personalNoteLines.length * 4.5 + 1.5 : 0) +
    3;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, curY, CONTENT_W, profileBoxH, 2.5, 2.5, 'FD');

  let pY = curY + 6.5;
  doc.setFont(F, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(nameLines, MARGIN + 5, pY);
  pY += nameLines.length * 5.2;

  doc.setFont(F, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(bioLines, MARGIN + 5, pY);
  pY += bioLines.length * 4.5;

  doc.text(metaLines, MARGIN + 5, pY);
  pY += metaLines.length * 4.5;

  if (personalNoteLines.length > 0) {
    pY += 1;
    doc.setTextColor(51, 65, 85);
    doc.text(personalNoteLines, MARGIN + 5, pY);
  }

  curY += profileBoxH + 6;

  // Section 1: 4 KPI Cards
  doc.setFont(F, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Kernkennzahlen (Arithmetische Mittelwerte)', MARGIN, curY);
  curY += 4;

  const kpiGap = 3.5;
  const kpiW = (CONTENT_W - kpiGap * 3) / 4;
  const kpiH = 24;
  const kpis = [
    {
      label: 'Ø Systole (SYS)',
      val: stats.count > 0 ? `${stats.avgSys} mmHg` : '—',
      sub: 'HBPM-Ziel: < 135',
    },
    {
      label: 'Ø Diastole (DIA)',
      val: stats.count > 0 ? `${stats.avgDia} mmHg` : '—',
      sub: 'HBPM-Ziel: < 85',
    },
    {
      label: 'Ø Puls',
      val: stats.count > 0 ? `${stats.avgPulse} BPM` : '—',
      sub: stats.count > 0 ? `Pulsdruck: ${stats.avgPulsePressure} mmHg` : 'Keine Daten',
    },
    {
      label: 'Messanzahl',
      val: `${stats.count}`,
      sub: `${uniqueDayCount} Messtage (${freqText}x/Tag)`,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = MARGIN + idx * (kpiW + kpiGap);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, curY, kpiW, kpiH, 2, 2, 'FD');

    doc.setFont(F, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.label, kx + 3.5, curY + 6);

    doc.setFont(F, 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, kx + 3.5, curY + 14.5);

    doc.setFont(F, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, kx + 3.5, curY + 20.5);
  });

  curY += kpiH + 7;

  // Section 2: Vector SYS/DIA Time-Series Chart
  doc.setFont(F, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Blutdruck-Zeitreihe (Systolisch & Diastolisch)', MARGIN, curY);
  curY += 4;

  const chartBoxH = 58;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, curY, CONTENT_W, chartBoxH, 2, 2, 'FD');

  const cPadL = 16;
  const cPadR = 12;
  const cPadT = 7;
  const cPadB = 13;
  const cW = CONTENT_W - cPadL - cPadR;
  const cH = chartBoxH - cPadT - cPadB;

  const minRaw = sortedAsc.length > 0 ? Math.min(50, ...sortedAsc.map((m) => m.diastolic)) : 50;
  const maxRaw = sortedAsc.length > 0 ? Math.max(170, ...sortedAsc.map((m) => m.systolic)) : 180;
  const chartMinY = Math.floor(minRaw / 10) * 10;
  const chartMaxY = Math.ceil(maxRaw / 10) * 10;

  const getChartY = (val: number) => {
    const clamped = Math.max(chartMinY, Math.min(chartMaxY, val));
    return curY + cPadT + cH - ((clamped - chartMinY) / (chartMaxY - chartMinY)) * cH;
  };

  // Subtle horizontal grid ticks
  [60, 80, 100, 120, 140, 160, 180].forEach((tick) => {
    if (tick < chartMinY || tick > chartMaxY) return;
    const ty = getChartY(tick);
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.25);
    doc.line(MARGIN + cPadL, ty, MARGIN + cPadL + cW, ty);
    doc.setFont(F, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${tick}`, MARGIN + cPadL - 2, ty + 1, { align: 'right' });
  });

  // Reference threshold lines (135/85 HBPM) with right-side labels (no overlap with 140/80)
  const y135 = getChartY(135);
  const y85 = getChartY(85);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.35);
  doc.line(MARGIN + cPadL, y135, MARGIN + cPadL + cW, y135);
  doc.line(MARGIN + cPadL, y85, MARGIN + cPadL + cW, y85);

  doc.setFont(F, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text('135', MARGIN + cPadL + cW + 1.5, y135 + 1);
  doc.text('85', MARGIN + cPadL + cW + 1.5, y85 + 1);

  const plotSubset = sortedAsc.slice(-45);
  if (plotSubset.length === 1) {
    const cx = MARGIN + cPadL + cW / 2;
    doc.setFillColor(239, 68, 68);
    doc.circle(cx, getChartY(plotSubset[0].systolic), 1.3, 'F');
    doc.setFillColor(2, 132, 199);
    doc.circle(cx, getChartY(plotSubset[0].diastolic), 1.3, 'F');
    doc.setFont(F, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(formatDateDe(plotSubset[0].timestamp), cx, curY + cPadT + cH + 4.5, { align: 'center' });
  } else if (plotSubset.length > 1) {
    const getChartX = (idx: number) =>
      MARGIN + cPadL + (idx / (plotSubset.length - 1)) * cW;

    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.65);
    for (let i = 0; i < plotSubset.length - 1; i++) {
      doc.line(
        getChartX(i),
        getChartY(plotSubset[i].systolic),
        getChartX(i + 1),
        getChartY(plotSubset[i + 1].systolic)
      );
    }

    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.65);
    for (let i = 0; i < plotSubset.length - 1; i++) {
      doc.line(
        getChartX(i),
        getChartY(plotSubset[i].diastolic),
        getChartX(i + 1),
        getChartY(plotSubset[i + 1].diastolic)
      );
    }

    for (let i = 0; i < plotSubset.length; i++) {
      doc.setFillColor(239, 68, 68);
      doc.circle(getChartX(i), getChartY(plotSubset[i].systolic), 0.9, 'F');
      doc.setFillColor(2, 132, 199);
      doc.circle(getChartX(i), getChartY(plotSubset[i].diastolic), 0.9, 'F');
    }

    // X-axis date ticks (max 5 labels)
    const step = Math.max(1, Math.floor((plotSubset.length - 1) / 4));
    doc.setFont(F, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    for (let i = 0; i < plotSubset.length; i++) {
      if (i === 0 || i === plotSubset.length - 1 || i % step === 0) {
        const d = new Date(plotSubset[i].timestamp);
        const lbl = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
        doc.text(lbl, getChartX(i), curY + cPadT + cH + 4.5, { align: 'center' });
      }
    }
  } else {
    doc.setFont(F, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Keine Messpunkte im gewählten Zeitraum', MARGIN + CONTENT_W / 2, curY + chartBoxH / 2, {
      align: 'center',
    });
  }

  doc.setFont(F, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Rot: Systolisch (SYS)  ·  Blau: Diastolisch (DIA)  ·  Gelb: 135/85 mmHg (HBPM-Richtwert)',
    MARGIN + 5,
    curY + chartBoxH - 2.5
  );

  curY += chartBoxH + 6;

  // Section 3: 2-Column Dynamic Boxes (Circadian + Ranges/Trend)
  const colGap = 5;
  const halfW = (CONTENT_W - colGap) / 2;
  const colTextW = halfW - 9;

  doc.setFont(F, 'bold');
  doc.setFontSize(9.5);

  const mornVal = stats.morningAvg
    ? `${stats.morningAvg.sys} / ${stats.morningAvg.dia} mmHg (Puls ${stats.morningAvg.pulse} BPM, ${stats.morningAvg.count}x)`
    : 'Keine Morgenmessungen erfasst';
  const eveVal = stats.eveningAvg
    ? `${stats.eveningAvg.sys} / ${stats.eveningAvg.dia} mmHg (Puls ${stats.eveningAvg.pulse} BPM, ${stats.eveningAvg.count}x)`
    : 'Keine Abendmessungen erfasst';

  const mornLines = doc.splitTextToSize(mornVal, colTextW);
  const eveLines = doc.splitTextToSize(eveVal, colTextW);
  const leftNeededH = 14 + mornLines.length * 4.2 + eveLines.length * 4.2 + 9;

  const trendText = `Trend: ${stats.trend?.descriptionDe || 'Verlauf wird dokumentiert.'}`;
  const trendLines = doc.splitTextToSize(trendText, colTextW);
  const rightNeededH = 26 + trendLines.length * 4.3 + 5;

  const twoColH = Math.max(leftNeededH, rightNeededH, 38);

  ensureSpace(twoColH + 6, 'Medizinische Zusammenfassung');

  // Box A: Zirkadianer Vergleich
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, curY, halfW, twoColH, 2, 2, 'FD');

  doc.setFont(F, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Zirkadianer Vergleich (Morgen / Abend)', MARGIN + 4, curY + 6.5);

  let lY = curY + 13;
  doc.setFont(F, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Morgens (05:00–11:59 Uhr):', MARGIN + 4, lY);
  lY += 4.3;
  doc.setFont(F, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(mornLines, MARGIN + 4, lY);
  lY += mornLines.length * 4.2 + 2.5;

  doc.setFont(F, 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Abends (17:00–23:59 Uhr):', MARGIN + 4, lY);
  lY += 4.3;
  doc.setFont(F, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(eveLines, MARGIN + 4, lY);

  // Box B: Spannen & Verlaufstrend
  const colBX = MARGIN + halfW + colGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(colBX, curY, halfW, twoColH, 2, 2, 'FD');

  doc.setFont(F, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Statistische Spannen & Trend', colBX + 4, curY + 6.5);

  let rY = curY + 13;
  doc.setFont(F, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    stats.count > 0 ? `SYS-Spanne: ${stats.minSys} bis ${stats.maxSys} mmHg` : 'SYS-Spanne: —',
    colBX + 4,
    rY
  );
  rY += 4.5;
  doc.text(
    stats.count > 0 ? `DIA-Spanne: ${stats.minDia} bis ${stats.maxDia} mmHg` : 'DIA-Spanne: —',
    colBX + 4,
    rY
  );
  rY += 4.5;
  doc.text(
    stats.count > 0 ? `Puls-Spanne: ${stats.minPulse} bis ${stats.maxPulse} BPM` : 'Puls-Spanne: —',
    colBX + 4,
    rY
  );
  rY += 5.5;

  doc.setFont(F, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(trendLines, colBX + 4, rY);

  curY += twoColH + 6;

  // Medical Notice Box (10.5 pt, dynamically measured!)
  doc.setFont(F, 'normal');
  doc.setFontSize(10.5);
  const noticeBody =
    stats.count > 0
      ? `Bei der Heimmessung (HBPM) gilt ein Blutdruckmittelwert < 135/85 mmHg als normoton (Praxis-Grenzwert: < 140/90 mmHg). Der arithmetische Mittelwert aller ${stats.count} erfassten Messungen liegt bei ${stats.avgSys}/${stats.avgDia} mmHg (Ø Puls: ${stats.avgPulse} BPM). Dieser Bericht ist eine strukturierte Messdokumentation und stellt keine ärztliche Diagnose dar.`
      : 'Für den ausgewählten Zeitraum liegen keine Messwerte vor. Dieser Bericht dient der persönlichen Dokumentation und stellt keine ärztliche Diagnose dar.';
  const noticeLines = doc.splitTextToSize(noticeBody, CONTENT_W - 8);
  const noticeBoxH = 10 + noticeLines.length * PDF_LAYOUT.LINE_H_BODY + 3;

  ensureSpace(noticeBoxH + 4, 'Medizinische Einordnung');

  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(MARGIN, curY, CONTENT_W, noticeBoxH, 2, 2, 'FD');

  doc.setFont(F, 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(3, 105, 161);
  doc.text('Medizinische Einordnung (ESH/ESC 2023 Leitlinie):', MARGIN + 4, curY + 6.5);

  doc.setFont(F, 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(noticeLines, MARGIN + 4, curY + 12);

  // ==========================================================
  // SEITE 2+: VISUALISIERUNG, KALENDER-HEATMAPS & ANALYTIK
  // ==========================================================
  startNewPage('Visualisierung & Analytik');

  const daysMap = aggregateByCalendarDay(measurements);

  // Determine calendar window: anchor to referenceDate unless all measurements are outside the last 35 days
  const localRef = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  let calendarEnd = localRef;
  if (sortedAsc.length > 0) {
    const newestM = new Date(sortedAsc[sortedAsc.length - 1].timestamp);
    const newestLocal = new Date(newestM.getFullYear(), newestM.getMonth(), newestM.getDate());
    const cutoff35 = new Date(localRef.getFullYear(), localRef.getMonth(), localRef.getDate() - 34);
    if (newestLocal < cutoff35 || newestLocal > localRef) {
      calendarEnd = newestLocal;
    }
  }
  const calendarStart = new Date(
    calendarEnd.getFullYear(),
    calendarEnd.getMonth(),
    calendarEnd.getDate() - 29
  );

  const calendarWeeks = buildCalendarWeeks({
    startDate: calendarStart,
    endDate: calendarEnd,
    dailyMap: daysMap,
    referenceToday: localRef,
  });

  // Reusable PDF Heatmap Renderer using the exact central calendar engine (Gate 5)
  const renderPdfCalendarHeatmap = (
    sectionTitle: string,
    metric: HeatmapMetric,
    legendText: string
  ) => {
    const rowH = 9.5;
    const headerH = 6.5;
    const legendH = 8;
    const cardH = 8 + headerH + calendarWeeks.length * rowH + legendH + 3;

    ensureSpace(cardH + 10, 'Kalender-Heatmaps & Analytik');

    doc.setFont(F, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(sectionTitle, MARGIN, curY);
    curY += 4;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN, curY, CONTENT_W, cardH, 2, 2, 'FD');

    const kwColW = 14;
    const gridLeft = MARGIN + 4 + kwColW;
    const gridW = CONTENT_W - 8 - kwColW;
    const cellW = gridW / 7;

    const wdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    doc.setFont(F, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('KW', MARGIN + 4 + kwColW / 2, curY + 6.5, { align: 'center' });
    wdays.forEach((wd, idx) => {
      doc.text(wd, gridLeft + idx * cellW + cellW / 2, curY + 6.5, { align: 'center' });
    });

    const gridStartY = curY + 8.5;

    calendarWeeks.forEach((week, rIdx) => {
      const cy = gridStartY + rIdx * rowH;

      // ISO Week label on left
      doc.setFont(F, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`KW ${String(week.isoWeek).padStart(2, '0')}`, MARGIN + 4 + kwColW / 2, cy + rowH / 2 + 1.2, {
        align: 'center',
      });

      week.days.forEach((cell, cIdx) => {
        const cx = gridLeft + cIdx * cellW;
        const agg = cell.aggregate;
        const hasData = !!(agg && agg.count > 0 && cell.isInRange);
        const dateTag =
          cell.dayOfMonth === 1
            ? `${cell.dayOfMonth}.${cell.date.getMonth() + 1}.`
            : `${cell.dayOfMonth}.`;

        if (hasData && agg) {
          const val =
            metric === 'systolic'
              ? agg.avgSys
              : metric === 'diastolic'
              ? agg.avgDia
              : agg.avgPulse;
          const color = getHeatmapColorForValue(val, metric, pulseScale);

          doc.setFillColor(color.rgb[0], color.rgb[1], color.rgb[2]);
          doc.roundedRect(cx + 0.7, cy + 0.6, cellW - 1.4, rowH - 1.2, 1.2, 1.2, 'F');

          // Small day number top-left inside tile
          doc.setFont(F, 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(color.textRgb[0], color.textRgb[1], color.textRgb[2]);
          doc.text(dateTag, cx + 2, cy + 3.2);

          // Daily mean centered-bottom
          doc.setFont(F, 'bold');
          doc.setFontSize(9.5);
          doc.text(`${val}`, cx + cellW / 2, cy + rowH - 2, { align: 'center' });
        } else {
          // Neutral gray for days without measurements (never shifts current day to Sunday)
          doc.setFillColor(cell.isInRange ? 226 : 238, cell.isInRange ? 232 : 242, cell.isInRange ? 240 : 246);
          doc.roundedRect(cx + 0.7, cy + 0.6, cellW - 1.4, rowH - 1.2, 1.2, 1.2, 'F');

          doc.setFont(F, 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(dateTag, cx + cellW / 2, cy + rowH / 2 + 1, { align: 'center' });
        }
      });
    });

    // Legend
    doc.setFont(F, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const legendLines = doc.splitTextToSize(legendText, CONTENT_W - 8);
    doc.text(legendLines, MARGIN + 4, gridStartY + calendarWeeks.length * rowH + 4.8);

    curY += cardH + 6;
  };

  // A: SYS Calendar Heatmap
  renderPdfCalendarHeatmap(
    '1. Kalender-Heatmap Systole (SYS, Tagesmittel in mmHg)',
    'systolic',
    'Legende SYS: Grün (< 120) · Blau (120–129) · Gelb (130–134) · Orange (135–159) · Rot (≥ 160) · Grau (Keine Messung)'
  );

  // B: DIA Calendar Heatmap
  renderPdfCalendarHeatmap(
    '2. Kalender-Heatmap Diastole (DIA, Tagesmittel in mmHg)',
    'diastolic',
    'Legende DIA: Grün (< 80) · Blau (80–84) · Gelb (85–89) · Orange (90–99) · Rot (≥ 100) · Grau (Keine Messung)'
  );

  // C: Optional Pulse Calendar Heatmap
  if (includePulseHeatmap) {
    renderPdfCalendarHeatmap(
      '3. Kalender-Heatmap Puls (Tagesmittel in BPM, Orientierungsskala)',
      'pulse',
      `Legende Puls (konfigurierbar, keine Diagnose): Indigo (< ${pulseScale.lowMax}) · Grün (${pulseScale.lowMax}–${pulseScale.normalMax}) · Gelb (${pulseScale.normalMax + 1}–${pulseScale.elevatedMax}) · Rot (> ${pulseScale.elevatedMax})`
    );
  }

  // Section 4: Distribution Histograms (>= 9 pt!)
  const binRows = Math.max(stats.sysDistribution.length, stats.diaDistribution.length, 5);
  const distCardH = 14 + binRows * 6.5 + 4;
  ensureSpace(distCardH + 10, 'Messwert-Verteilung & Pulsverlauf');

  doc.setFont(F, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Messwert-Verteilung (Häufigkeit nach Intervallen)', MARGIN, curY);
  curY += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, curY, CONTENT_W, distCardH, 2, 2, 'FD');

  const distColW = (CONTENT_W - 14) / 2;
  const sysBins = stats.sysDistribution;
  const diaBins = stats.diaDistribution;

  doc.setFont(F, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Systolische Verteilung (SYS)', MARGIN + 5, curY + 7);
  doc.text('Diastolische Verteilung (DIA)', MARGIN + 5 + distColW + 6, curY + 7);

  if (sysBins.length === 0) {
    doc.setFont(F, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine Messwerte vorhanden', MARGIN + 5, curY + 15);
  } else {
    sysBins.forEach((bin, idx) => {
      const by = curY + 12 + idx * 6.5;
      doc.setFont(F, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(bin.label, MARGIN + 5, by + 3.5);

      const barStart = MARGIN + 24;
      const barMaxW = distColW - 42;
      const barW = bin.count > 0 ? Math.max(2, (bin.percentage / 100) * barMaxW) : 0;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barStart, by + 0.3, barMaxW, 4, 0.8, 0.8, 'F');
      if (barW > 0) {
        doc.setFillColor(239, 68, 68);
        doc.roundedRect(barStart, by + 0.3, barW, 4, 0.8, 0.8, 'F');
      }

      doc.setFontSize(8.5);
      doc.text(`${bin.count} (${bin.percentage}%)`, barStart + barMaxW + 2, by + 3.5);
    });

    diaBins.forEach((bin, idx) => {
      const colX = MARGIN + 5 + distColW + 6;
      const by = curY + 12 + idx * 6.5;
      doc.setFont(F, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(bin.label, colX, by + 3.5);

      const barStart = colX + 18;
      const barMaxW = distColW - 40;
      const barW = bin.count > 0 ? Math.max(2, (bin.percentage / 100) * barMaxW) : 0;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barStart, by + 0.3, barMaxW, 4, 0.8, 0.8, 'F');
      if (barW > 0) {
        doc.setFillColor(2, 132, 199);
        doc.roundedRect(barStart, by + 0.3, barW, 4, 0.8, 0.8, 'F');
      }

      doc.setFontSize(8.5);
      doc.text(`${bin.count} (${bin.percentage}%)`, barStart + barMaxW + 2, by + 3.5);
    });
  }

  curY += distCardH + 7;

  // Section 5: Pulse Progression Vector Chart
  const pulseBoxH = 44;
  ensureSpace(pulseBoxH + 10, 'Pulsverlauf & Referenztabelle');

  doc.setFont(F, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('5. Pulsverlauf (BPM im Beobachtungszeitraum)', MARGIN, curY);
  curY += 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, curY, CONTENT_W, pulseBoxH, 2, 2, 'FD');

  if (plotSubset.length > 0) {
    const pPadL = 16;
    const pPadR = 8;
    const pPadT = 6;
    const pPadB = 10;
    const pW = CONTENT_W - pPadL - pPadR;
    const pH = pulseBoxH - pPadT - pPadB;
    const pMin = Math.floor(Math.min(45, ...plotSubset.map((m) => m.pulse)) / 10) * 10;
    const pMax = Math.ceil(Math.max(110, ...plotSubset.map((m) => m.pulse)) / 10) * 10;
    const getPY = (v: number) =>
      curY + pPadT + pH - ((Math.max(pMin, Math.min(pMax, v)) - pMin) / (pMax - pMin)) * pH;

    [50, 70, 90, 110].forEach((t) => {
      if (t < pMin || t > pMax) return;
      const y = getPY(t);
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(MARGIN + pPadL, y, MARGIN + pPadL + pW, y);
      doc.setFont(F, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`${t}`, MARGIN + pPadL - 2, y + 1, { align: 'right' });
    });

    if (plotSubset.length === 1) {
      doc.setFillColor(16, 185, 129);
      doc.circle(MARGIN + pPadL + pW / 2, getPY(plotSubset[0].pulse), 1.3, 'F');
    } else {
      const getPX = (idx: number) => MARGIN + pPadL + (idx / (plotSubset.length - 1)) * pW;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.6);
      for (let i = 0; i < plotSubset.length - 1; i++) {
        doc.line(
          getPX(i),
          getPY(plotSubset[i].pulse),
          getPX(i + 1),
          getPY(plotSubset[i + 1].pulse)
        );
      }
      for (let i = 0; i < plotSubset.length; i++) {
        doc.setFillColor(16, 185, 129);
        doc.circle(getPX(i), getPY(plotSubset[i].pulse), 0.9, 'F');
      }
    }

    doc.setFont(F, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Ø Puls: ${stats.avgPulse} BPM · Spanne: ${stats.minPulse}–${stats.maxPulse} BPM`,
      MARGIN + 5,
      curY + pulseBoxH - 2.5
    );
  } else {
    doc.setFont(F, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Keine Pulswerte im gewählten Zeitraum', MARGIN + CONTENT_W / 2, curY + pulseBoxH / 2, {
      align: 'center',
    });
  }

  curY += pulseBoxH + 7;

  // Section 6: ESH/ESC 2023 Medical Reference Table (>= 9 pt!)
  const refRows = [
    { cat: 'Optimal', home: '< 120 / < 80', office: '< 120 / < 80', rec: 'Routinekontrolle im Normbereich' },
    { cat: 'Normal', home: '120–129 / 80–84', office: '120–129 / 80–84', rec: 'Physiologischer Zielbereich' },
    { cat: 'Hoch-Normal', home: '130–134 / < 85', office: '130–139 / 85–89', rec: 'Lebensstil & Verlaufskontrolle' },
    { cat: 'Hypertonie Grad 1', home: '≥ 135 / ≥ 85', office: '140–159 / 90–99', rec: 'Ärztliche Konsultation empfohlen' },
    { cat: 'Hypertonie Grad 2', home: '160–179 / 100–109', office: '160–179 / 100–109', rec: 'Zeitnahe ärztliche Abklärung' },
    { cat: 'Hypertonie Grad 3', home: '≥ 180 / ≥ 110', office: '≥ 180 / ≥ 110', rec: 'Unverzügliche ärztliche Prüfung' },
    { cat: 'Isol. syst. Hyp.', home: 'SYS ≥ 135 & DIA < 85', office: 'SYS ≥ 140 & DIA < 90', rec: 'Ärztliche Bewertung (Gefäßsteifigkeit)' },
  ];

  const refTableH = 9 + refRows.length * 7.5 + 3;
  ensureSpace(refTableH + 10, 'Medizinische Schwellenwerte');

  doc.setFont(F, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('6. Medizinische Referenzwerte (ESH/ESC 2023 Leitlinie, mmHg)', MARGIN, curY);
  curY += 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN, curY, CONTENT_W, refTableH, 2, 2, 'FD');

  const refCols = [
    { title: 'Kategorie', x: MARGIN + 3, w: 38 },
    { title: 'Heimmessung (HBPM)', x: MARGIN + 41, w: 42 },
    { title: 'Praxis (Office)', x: MARGIN + 83, w: 40 },
    { title: 'Dokumentationshinweis', x: MARGIN + 123, w: 54 },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, curY, CONTENT_W, 8, 'F');
  doc.setFont(F, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  refCols.forEach((rc) => doc.text(rc.title, rc.x, curY + 5.3));

  doc.setFont(F, 'normal');
  doc.setFontSize(9);
  refRows.forEach((rr, i) => {
    const ry = curY + 8 + i * 7.5;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, ry, CONTENT_W, 7.5, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(rr.cat, refCols[0].x, ry + 5.2);
    doc.setTextColor(51, 65, 85);
    doc.text(rr.home, refCols[1].x, ry + 5.2);
    doc.text(rr.office, refCols[2].x, ry + 5.2);
    doc.text(rr.rec, refCols[3].x, ry + 5.2);
  });

  // ==========================================================
  // FOLGESEITEN: VOLLSTÄNDIGES MESSPROTOKOLL (>= 9 pt!)
  // ==========================================================
  startNewPage('Vollständiges Messwertprotokoll');

  doc.setFont(F, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Messwertprotokoll (${sortedAsc.length} Einzelmessungen)`, MARGIN, curY);
  curY += 4.5;

  // Total width = 180 mm
  const cols = [
    { header: 'Datum', x: MARGIN, w: 22 },
    { header: 'Zeit', x: MARGIN + 22, w: 13 },
    { header: 'SYS', x: MARGIN + 35, w: 12 },
    { header: 'DIA', x: MARGIN + 47, w: 12 },
    { header: 'Puls', x: MARGIN + 59, w: 12 },
    { header: 'Arm', x: MARGIN + 71, w: 15 },
    { header: 'Haltung', x: MARGIN + 86, w: 18 },
    { header: 'Kategorie', x: MARGIN + 104, w: 26 },
    { header: 'Notizen', x: MARGIN + 130, w: 50 },
  ];

  const drawProtocolHeader = (y: number) => {
    doc.setFillColor(isDemoMode ? 217 : 2, isDemoMode ? 119 : 132, isDemoMode ? 6 : 199);
    doc.rect(MARGIN, y, CONTENT_W, 8.5, 'F');
    doc.setFont(F, 'bold');
    doc.setFontSize(PDF_LAYOUT.FONT_TABLE);
    doc.setTextColor(255, 255, 255);
    cols.forEach((col) => {
      doc.text(col.header, col.x + 1.5, y + 5.8);
    });
  };

  drawProtocolHeader(curY);
  curY += 8.5;

  let rowCounter = 0;

  if (sortedAsc.length === 0) {
    doc.setFont(F, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Keine Messungen im gewählten Zeitraum dokumentiert.', MARGIN + 2, curY + 8);
  } else {
    for (const m of sortedAsc) {
      const cat = classifyBloodPressure(m.systolic, m.diastolic, m.context !== 'office');
      const dateStr = formatDateDe(m.timestamp);
      const timeStr = formatTimeDe(m.timestamp);
      const armStr = m.arm === 'left' ? 'Links' : 'Rechts';
      const postureStr = formatPostureDe(m.posture);
      const catStr = cat.shortLabel;
      const noteText = m.notes || '—';

      doc.setFont(F, 'normal');
      doc.setFontSize(PDF_LAYOUT.FONT_TABLE);
      const splitNotes = doc.splitTextToSize(noteText, cols[8].w - 3);
      const splitCat = doc.splitTextToSize(catStr, cols[7].w - 3);
      const maxLines = Math.max(splitNotes.length, splitCat.length, 1);
      const rowHeight = Math.max(8, 3.5 + maxLines * PDF_LAYOUT.LINE_H_TABLE);

      if (curY + rowHeight > MAX_Y) {
        startNewPage(`Messwertprotokoll: ${profile.name} (Fortsetzung)`);
        drawProtocolHeader(curY);
        curY += 8.5;
        rowCounter = 0;
      }

      if (rowCounter % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN, curY, CONTENT_W, rowHeight, 'F');
      }

      const textBaseline = curY + 5.2;

      doc.setFont(F, 'normal');
      doc.setFontSize(PDF_LAYOUT.FONT_TABLE);
      doc.setTextColor(15, 23, 42);
      doc.text(dateStr, cols[0].x + 1.5, textBaseline);
      doc.text(timeStr, cols[1].x + 1.5, textBaseline);

      if (m.systolic >= 135 || m.diastolic >= 85) {
        doc.setTextColor(185, 28, 28);
        doc.setFont(F, 'bold');
      } else {
        doc.setTextColor(15, 23, 42);
        doc.setFont(F, 'normal');
      }
      doc.text(`${m.systolic}`, cols[2].x + 1.5, textBaseline);
      doc.text(`${m.diastolic}`, cols[3].x + 1.5, textBaseline);

      doc.setFont(F, 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`${m.pulse}`, cols[4].x + 1.5, textBaseline);
      doc.text(armStr, cols[5].x + 1.5, textBaseline);
      doc.text(postureStr, cols[6].x + 1.5, textBaseline);
      doc.text(splitCat, cols[7].x + 1.5, textBaseline);
      doc.text(splitNotes, cols[8].x + 1.5, textBaseline);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, curY + rowHeight, MARGIN + CONTENT_W, curY + rowHeight);

      curY += rowHeight;
      rowCounter++;
    }
  }

  // Final pass: Draw clean, non-overlapping footers + "Seite X von Y" on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.line(MARGIN, PDF_LAYOUT.FOOTER_LINE_Y, PAGE_W - MARGIN, PDF_LAYOUT.FOOTER_LINE_Y);

    doc.setFont(F, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const leftFooter = isDemoMode
      ? 'DEMO-BERICHT (Synthetische Daten) · Keine medizinische Diagnose.'
      : 'Hinweis: Persönliche Dokumentation für Ihren Arzt · Keine Diagnose.';
    doc.text(leftFooter, MARGIN, PDF_LAYOUT.FOOTER_TEXT_Y);

    doc.setFont(F, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Seite ${p} von ${totalPages}`, PAGE_W - MARGIN, PDF_LAYOUT.FOOTER_TEXT_Y, {
      align: 'right',
    });
  }

  const cleanName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const demoSuffix = isDemoMode ? '_DEMO' : '';
  const filename = `Blutdruck_Verlaufsbericht${demoSuffix}_${cleanName}_${toDateKey(referenceDate)}.pdf`;

  return { doc, filename };
}

/**
 * Generates and downloads/shares the multi-page Medical Blood Pressure Report (DIN A4)
 */
export async function exportToPdf(
  measurements: Measurement[],
  profile: UserProfile,
  dateRangeTitle: string,
  options: PdfExportOptions = {}
): Promise<void> {
  const { doc, filename } = await generatePdfDocument(
    measurements,
    profile,
    dateRangeTitle,
    options
  );
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  await saveOrShareFile(pdfBase64, filename, 'application/pdf', 'Blutdruck-Verlaufsbericht');
}

/**
 * Exports measurements to Excel-compatible CSV format (German semicolon separator and UTF-8 BOM)
 */
export async function exportToCsv(
  measurements: Measurement[],
  profile: UserProfile,
  isDemoMode = false
): Promise<void> {
  let csvContent = '\uFEFF';
  const modeTag = isDemoMode ? 'DEMO-DATEN;' : '';

  csvContent += `${modeTag}Blutdruck-Export;${profile.name};Erstellt am: ${formatDateDe(new Date())};Leitlinie: ESH/ESC 2023\n`;
  csvContent +=
    'Datum;Uhrzeit;Systole (mmHg);Diastole (mmHg);Puls (BPM);Pulsdruck (mmHg);Messort;Körperhaltung;Kategorie (ESH);Notiz;Erfassungsmethode\n';

  for (const m of measurements) {
    const cat = classifyBloodPressure(m.systolic, m.diastolic, m.context !== 'office');
    const dateStr = formatDateDe(m.timestamp);
    const timeStr = formatTimeDe(m.timestamp);
    const pulsePressure = m.systolic - m.diastolic;
    const armStr = formatArmDe(m.arm);
    const postureStr = formatPostureDe(m.posture);
    const catStr = cat.labelDe;
    const noteStr = (m.notes || '').replace(/;/g, ',').replace(/\r?\n/g, ' ');
    const methodStr =
      m.source === 'camera_ocr' ? 'Kamera-OCR' : m.source === 'demo' ? 'Demodaten' : 'Manuell';

    csvContent += `${dateStr};${timeStr};${m.systolic};${m.diastolic};${m.pulse};${pulsePressure};${armStr};${postureStr};${catStr};${noteStr};${methodStr}\n`;
  }

  const cleanName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const demoSuffix = isDemoMode ? '_DEMO' : '';
  const filename = `Blutdruck_Daten${demoSuffix}_${cleanName}_${toDateKey(new Date())}.csv`;

  const utf8Encoder = new TextEncoder();
  const uint8Array = utf8Encoder.encode(csvContent);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  await saveOrShareFile(base64, filename, 'text/csv', 'Blutdruck-Tabelle');
}

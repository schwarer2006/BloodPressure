/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Measurement, UserProfile } from '../types/bloodPressure';
import {
  classifyBloodPressure,
  calculateStats,
  formatDateDe,
  formatTimeDe,
  formatArmDe,
  formatPostureDe,
  aggregateByCalendarDay,
  toDateKey,
} from './bloodPressureUtils';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

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

  // Web Browser fallback
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
 * Generates a multi-page Medical Blood Pressure Report (DIN A4)
 * Page 1: Medical Summary & KPIs & SYS/DIA Vector Time-Series & Morning/Evening Comparison
 * Page 2: Analytics, Calendar Heatmap, Pulse Progression, Histogram Distribution & Guidelines
 * Page 3+: Full tabular measurement protocol with multi-page handling, wrapping, and repeated headers
 */
export async function exportToPdf(
  measurements: Measurement[],
  profile: UserProfile,
  dateRangeTitle: string
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const stats = calculateStats(measurements);
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182 mm

  // Helper for drawing running header & footer with page numbers
  const drawPageDecorations = (pageNum: number, totalPagesPlaceholder = true) => {
    // Top running header line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 12, pageWidth - margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('BloodPressure · Medizinischer Verlaufsbericht (ESH/ESC 2023 Leitlinie)', margin, 9);
    doc.text(`Patient/in: ${profile.name}`, pageWidth - margin, 9, { align: 'right' });

    // Bottom running footer
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      'Hinweis: Dieses Tagebuch dient der persönlichen Dokumentation für Ihren Arzt. Es begründet keine eigenmächtige Therapieanpassung.',
      margin,
      pageHeight - 8
    );
  };

  // ==========================================
  // SEITE 1: MEDIZINISCHE ZUSAMMENFASSUNG
  // ==========================================

  // Blue Accent Bar at the top of Page 1
  doc.setFillColor(2, 132, 199); // Sky-600
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Blutdruck-Verlaufsbericht', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Erstellt am ${formatDateDe(new Date())} um ${formatTimeDe(new Date())} Uhr · Vertrauliche Gesundheitsdaten`,
    margin,
    18
  );

  let curY = 30;

  // Patient Info Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, 24, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient/in: ${profile.name}`, margin + 5, curY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);

  const bioItems: string[] = [];
  if (profile.birthYear) bioItems.push(`Geburtsjahr: ${profile.birthYear}`);
  if (profile.heightCm) bioItems.push(`Größe: ${profile.heightCm} cm`);
  if (profile.weightKg) bioItems.push(`Gewicht: ${profile.weightKg} kg`);
  if (profile.heightCm && profile.weightKg) {
    const bmiVal = (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1);
    bioItems.push(`BMI: ${bmiVal} kg/m²`);
  }
  doc.text(bioItems.join('  ·  ') || 'Keine biometrischen Zusatzdaten hinterlegt', margin + 5, curY + 13);
  doc.text(
    `Auswertungszeitraum: ${dateRangeTitle}  ·  Erfasste Messungen: ${stats.count}  ·  Modus: Heimmessung (HBPM)`,
    margin + 5,
    curY + 19
  );

  curY += 29;

  // 4 KPI Cards (Durchschnitt SYS, DIA, Puls, Anzahl)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Kernkennzahlen (Arithmetische Mittelwerte)', margin, curY);

  curY += 3.5;
  const kpiWidth = (contentWidth - 9) / 4;
  const kpiHeight = 21;

  const kpis = [
    { label: 'Ø Systole (SYS)', val: `${stats.avgSys} mmHg`, sub: 'Ziel: < 135 (Heim)' },
    { label: 'Ø Diastole (DIA)', val: `${stats.avgDia} mmHg`, sub: 'Ziel: < 85 (Heim)' },
    { label: 'Ø Ruhepuls', val: `${stats.avgPulse} BPM`, sub: `Pulsdruck: ${stats.avgPulsePressure} mmHg` },
    { label: 'Messanzahl', val: `${stats.count}`, sub: `${stats.count > 0 ? (stats.count / Math.max(1, stats.dailyAggregates ? Object.keys(stats.dailyAggregates).length : 1)).toFixed(1) : 0}x / Tag` },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiWidth + 3);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, curY, kpiWidth, kpiHeight, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3.5, curY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3.5, curY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.sub, x + 3.5, curY + 18);
  });

  curY += kpiHeight + 6;

  // PAGE 1 DIAGRAM: SYS/DIA Vector Time-Series Curve
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Blutdruck-Zeitreihe (Systolisch & Diastolisch)', margin, curY);

  curY += 4;
  const chartBoxH = 50;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, chartBoxH, 2, 2, 'D');

  // Vector chart coordinates
  const cPaddingLeft = 14;
  const cPaddingRight = 8;
  const cPaddingTop = 6;
  const cPaddingBottom = 10;
  const cW = contentWidth - cPaddingLeft - cPaddingRight;
  const cH = chartBoxH - cPaddingTop - cPaddingBottom;

  const chartMinY = 50;
  const chartMaxY = 190;
  const getPdfY = (val: number) => {
    const clamped = Math.max(chartMinY, Math.min(chartMaxY, val));
    return curY + cPaddingTop + cH - ((clamped - chartMinY) / (chartMaxY - chartMinY)) * cH;
  };

  // Guideline lines (135/85 Heim, 140/90 Praxis)
  const yPdf135 = getPdfY(135);
  const yPdf85 = getPdfY(85);

  doc.setDrawColor(245, 158, 11); // Amber
  doc.setLineWidth(0.3);
  doc.line(margin + cPaddingLeft, yPdf135, margin + cPaddingLeft + cW, yPdf135);
  doc.line(margin + cPaddingLeft, yPdf85, margin + cPaddingLeft + cW, yPdf85);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 83, 9);
  doc.text('135 HBPM', margin + cPaddingLeft - 1, yPdf135 + 1.5, { align: 'right' });
  doc.text('85 HBPM', margin + cPaddingLeft - 1, yPdf85 + 1.5, { align: 'right' });

  // Draw Time-Series Data Points & Lines
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const maxPlotPoints = Math.min(sorted.length, 35);
  const plotSubset = sorted.slice(-maxPlotPoints);

  if (plotSubset.length > 1) {
    const getPdfX = (idx: number) => margin + cPaddingLeft + (idx / (plotSubset.length - 1)) * cW;

    // Systolic line (Red)
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.6);
    for (let i = 0; i < plotSubset.length - 1; i++) {
      doc.line(getPdfX(i), getPdfY(plotSubset[i].systolic), getPdfX(i + 1), getPdfY(plotSubset[i + 1].systolic));
    }

    // Diastolic line (Sky Blue)
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.6);
    for (let i = 0; i < plotSubset.length - 1; i++) {
      doc.line(getPdfX(i), getPdfY(plotSubset[i].diastolic), getPdfX(i + 1), getPdfY(plotSubset[i + 1].diastolic));
    }

    // Points
    for (let i = 0; i < plotSubset.length; i++) {
      doc.setFillColor(239, 68, 68);
      doc.circle(getPdfX(i), getPdfY(plotSubset[i].systolic), 0.8, 'F');
      doc.setFillColor(2, 132, 199);
      doc.circle(getPdfX(i), getPdfY(plotSubset[i].diastolic), 0.8, 'F');
    }
  }

  // Chart Legend at bottom
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Legende: — Systolisch (SYS)   — Diastolisch (DIA)   -- 135/85 mmHg ESH-Heimblutdruckgrenze', margin + 6, curY + chartBoxH - 3);

  curY += chartBoxH + 6;

  // Morgen- vs. Abendvergleich & Statistische Spanne (2 Spalten nebeneinander)
  const halfColW = (contentWidth - 6) / 2;
  const colBoxH = 34;

  // Box A: Zirkadianer Vergleich
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, halfColW, colBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Zirkadianer Vergleich (Morgen vs. Abend)', margin + 4, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const mornText = stats.morningAvg
    ? `${stats.morningAvg.sys} / ${stats.morningAvg.dia} mmHg (Puls ${stats.morningAvg.pulse}, ${stats.morningAvg.count}x)`
    : 'Keine Messungen erfasst';
  doc.text(`Morgens (05:00–11:59 Uhr):`, margin + 4, curY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(mornText, margin + 4, curY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const eveText = stats.eveningAvg
    ? `${stats.eveningAvg.sys} / ${stats.eveningAvg.dia} mmHg (Puls ${stats.eveningAvg.pulse}, ${stats.eveningAvg.count}x)`
    : 'Keine Messungen erfasst';
  doc.text(`Abends (17:00–23:59 Uhr):`, margin + 4, curY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(eveText, margin + 4, curY + 29);

  // Box B: Spannen & Verlauf
  const colBX = margin + halfColW + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(colBX, curY, halfColW, colBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Statistische Spannen & Verlaufstrend', colBX + 4, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`SYS Spanne: ${stats.minSys} bis ${stats.maxSys} mmHg`, colBX + 4, curY + 13);
  doc.text(`DIA Spanne: ${stats.minDia} bis ${stats.maxDia} mmHg`, colBX + 4, curY + 18);
  doc.text(`Puls Spanne: ${stats.minPulse} bis ${stats.maxPulse} BPM`, colBX + 4, curY + 23);

  const trendDesc = stats.trend?.descriptionDe || 'Verlauf wird kontinuierlich dokumentiert.';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Trend: ${trendDesc}`, colBX + 4, curY + 29);

  curY += colBoxH + 6;

  // Medical Summary Paragraph (11-12 pt requirement)
  doc.setFillColor(240, 249, 255); // Sky-50
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(margin, curY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(3, 105, 161);
  doc.text('Medizinische Einordnung nach ESH/ESC-Leitlinie:', margin + 4, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  const summaryNotice =
    `Bei Heimmessung (HBPM) gilt ein Blutdruckmittelwert < 135/85 mmHg als normal. Im ausgewerteten Zeitraum liegt der Gesamtdurchschnitt bei ${stats.avgSys}/${stats.avgDia} mmHg (Ruhepuls: ${stats.avgPulse} BPM). Diese Werte spiegeln den dokumentierten Messverlauf wider und ersetzen keine klinische Praxismessung oder ärztliche Diagnose.`;
  const splitNotice = doc.splitTextToSize(summaryNotice, contentWidth - 8);
  doc.text(splitNotice, margin + 4, curY + 11.5);

  drawPageDecorations(1);

  // ==========================================
  // SEITE 2: VISUALISIERUNG & ANALYTIK
  // ==========================================
  doc.addPage();
  drawPageDecorations(2);

  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Visualisierung & Analytik', margin, 11);

  curY = 24;

  // SECTION 2.1: KALENDER-HEATMAP
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Kalender-Heatmap der letzten Wochen (Tagesmittelwerte SYS)', margin, curY);

  curY += 4;
  const hmH = 48;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, hmH, 2, 2, 'FD');

  // Draw 5 weeks x 7 days calendar grid
  const daysMap = aggregateByCalendarDay(measurements);
  const hmCols = 7;
  const hmRows = 4;
  const cellW = (contentWidth - 14) / hmCols;
  const cellH = 7.5;
  const hmStartX = margin + 7;
  const hmStartY = curY + 9;

  const wdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  wdays.forEach((wd, i) => {
    doc.text(wd, hmStartX + i * cellW + cellW / 2, curY + 6, { align: 'center' });
  });

  const nowMs = new Date().getTime();
  let dayOffset = 27;
  for (let r = 0; r < hmRows; r++) {
    for (let c = 0; c < hmCols; c++) {
      const d = new Date(nowMs - dayOffset * 86400000);
      const k = toDateKey(d);
      const agg = daysMap[k];
      const cx = hmStartX + c * cellW;
      const cy = hmStartY + r * cellH;

      if (agg && agg.count > 0) {
        // Color depending on systolic value
        if (agg.avgSys < 120) doc.setFillColor(16, 185, 129); // emerald
        else if (agg.avgSys < 130) doc.setFillColor(14, 165, 233); // sky
        else if (agg.avgSys < 135) doc.setFillColor(245, 158, 11); // amber
        else if (agg.avgSys < 160) doc.setFillColor(249, 115, 22); // orange
        else doc.setFillColor(239, 68, 68); // red

        doc.roundedRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${agg.avgSys}`, cx + cellW / 2, cy + cellH / 2 + 1, { align: 'center' });
      } else {
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1, 1, 1, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(`${d.getDate()}`, cx + cellW / 2, cy + cellH / 2 + 1, { align: 'center' });
      }
      dayOffset--;
    }
  }

  // Heatmap Legend
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Legende SYS (mmHg): Grün (<120)  Blau (120–129)  Gelb (130–134)  Orange (135–159)  Rot (≥160)', margin + 7, curY + hmH - 2.5);

  curY += hmH + 7;

  // SECTION 2.2: MESSWERT-VERTEILUNG (HISTOGRAMM BINS)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Messwert-Verteilung (Häufigkeit nach physiologischen Intervallen)', margin, curY);

  curY += 4;
  const distBoxH = 46;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, distBoxH, 2, 2, 'FD');

  // Two columns: Left Systolic Bins, Right Diastolic Bins
  const distColW = (contentWidth - 14) / 2;

  // Left: SYS Bins
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Systolische Verteilung (SYS)', margin + 6, curY + 6);

  const sysBins = stats.sysDistribution.slice(0, 5);
  sysBins.forEach((bin, idx) => {
    const by = curY + 11 + idx * 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(bin.label, margin + 6, by + 3);

    // Bar
    const barMaxW = distColW - 38;
    const barW = Math.max(1, (bin.percentage / 100) * barMaxW);
    doc.setFillColor(239, 68, 68);
    doc.roundedRect(margin + 26, by, barW, 4, 0.8, 0.8, 'F');

    doc.text(`${bin.count} (${bin.percentage}%)`, margin + 28 + barW, by + 3);
  });

  // Right: DIA Bins
  const diaColX = margin + distColW + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Diastolische Verteilung (DIA)', diaColX, curY + 6);

  const diaBins = stats.diaDistribution.slice(0, 5);
  diaBins.forEach((bin, idx) => {
    const by = curY + 11 + idx * 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(bin.label, diaColX, by + 3);

    // Bar
    const barMaxW = distColW - 38;
    const barW = Math.max(1, (bin.percentage / 100) * barMaxW);
    doc.setFillColor(2, 132, 199);
    doc.roundedRect(diaColX + 22, by, barW, 4, 0.8, 0.8, 'F');

    doc.text(`${bin.count} (${bin.percentage}%)`, diaColX + 24 + barW, by + 3);
  });

  curY += distBoxH + 7;

  // SECTION 2.3: LEITLINIEN-REFERENZTABELLE & PULSENTWICKLUNG
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Medizinische Schwellenwerte (Deutsche Hochdruckliga & ESH 2023)', margin, curY);

  curY += 4;
  const refBoxH = 50;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, curY, contentWidth, refBoxH, 2, 2, 'FD');

  const refCols = [
    { title: 'Kategorie', x: margin + 4, w: 46 },
    { title: 'Heimmessung (HBPM)', x: margin + 50, w: 42 },
    { title: 'Praxismessung (Office)', x: margin + 92, w: 42 },
    { title: 'Empfehlung nach Leitlinie', x: margin + 134, w: contentWidth - 134 },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  refCols.forEach((rc) => doc.text(rc.title, rc.x, curY + 4));

  const refRows = [
    { cat: 'Optimal', home: '< 120 / < 80 mmHg', office: '< 120 / < 80 mmHg', rec: 'Regelmäßige Routinekontrolle' },
    { cat: 'Normal', home: '120–129 / 80–84 mmHg', office: '120–129 / 80–84 mmHg', rec: 'Guter physiologischer Zielbereich' },
    { cat: 'Hoch-Normal', home: '130–134 / < 85 mmHg', office: '130–139 / 85–89 mmHg', rec: 'Lebensstilmaßnahmen & Verlaufskontrolle' },
    { cat: 'Hypertonie Grad 1', home: '135–159 / 85–99 mmHg', office: '140–159 / 90–99 mmHg', rec: 'Ärztliche Konsultation & Diagnostik' },
    { cat: 'Hypertonie Grad 2+', home: '≥ 160 / ≥ 100 mmHg', office: '≥ 160 / ≥ 100 mmHg', rec: 'Zeitnahe medikamentöse Prüfung' },
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  refRows.forEach((rr, i) => {
    const ry = curY + 6 + i * 8.5;
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, ry, contentWidth, 8.5, 'F');
    }
    doc.setTextColor(15, 23, 42);
    doc.text(rr.cat, refCols[0].x, ry + 5.5);
    doc.setTextColor(71, 85, 105);
    doc.text(rr.home, refCols[1].x, ry + 5.5);
    doc.text(rr.office, refCols[2].x, ry + 5.5);
    doc.text(rr.rec, refCols[3].x, ry + 5.5);
  });

  // ==========================================
  // AB SEITE 3: VOLLSTÄNDIGES MESSPROTOKOLL
  // ==========================================
  doc.addPage();

  let currentPageNum = 3;

  // Protocol Table Configuration
  // Requirements: Mindestens 9pt Tabellenschrift, 11-12pt Fließtext, saubere Umbrüche, keine abgeschnittenen Zeilen.
  const cols = [
    { header: 'Datum', x: margin, w: 22 },
    { header: 'Uhrzeit', x: margin + 22, w: 16 },
    { header: 'SYS', x: margin + 38, w: 14 },
    { header: 'DIA', x: margin + 52, w: 14 },
    { header: 'Puls', x: margin + 66, w: 16 },
    { header: 'Messarm', x: margin + 82, w: 16 },
    { header: 'Haltung', x: margin + 98, w: 16 },
    { header: 'Kategorie (ESH)', x: margin + 114, w: 28 },
    { header: 'Notizen & Medikation', x: margin + 142, w: contentWidth - 142 },
  ];

  const drawProtocolHeader = (y: number) => {
    doc.setFillColor(2, 132, 199);
    doc.rect(margin, y, contentWidth, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    cols.forEach((col) => {
      doc.text(col.header, col.x + 1.5, y + 5);
    });
  };

  // Page 3 header
  doc.setFillColor(2, 132, 199);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Vollständiges Messwertprotokoll', margin, 11);

  curY = 24;
  drawProtocolHeader(curY);
  curY += 7.5;

  let rowCounter = 0;

  for (const m of sorted) {
    const cat = classifyBloodPressure(m.systolic, m.diastolic);
    const dateStr = formatDateDe(m.timestamp);
    const timeStr = formatTimeDe(m.timestamp);
    const armStr = m.arm === 'left' ? 'Links' : 'Rechts';
    const postureStr = formatPostureDe(m.posture);
    const catStr = cat.shortLabel;
    const noteText = m.notes || '—';

    // Calculate row height based on note wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(noteText, cols[8].w - 3);
    const rowHeight = Math.max(7, 4 + splitNotes.length * 3.5);

    // Page Break check
    if (curY + rowHeight > pageHeight - 18) {
      drawPageDecorations(currentPageNum);
      doc.addPage();
      currentPageNum++;

      // Repeated header on subsequent page
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Messwertprotokoll: ${profile.name} (Fortsetzung)`, margin, 8);

      curY = 18;
      drawProtocolHeader(curY);
      curY += 7.5;
      rowCounter = 0;
    }

    // Alternating zebra row
    if (rowCounter % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, rowHeight, 'F');
    }

    // Values & Colors
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text(dateStr, cols[0].x + 1.5, curY + 4.5);
    doc.text(timeStr, cols[1].x + 1.5, curY + 4.5);

    // Color code elevated blood pressure
    if (m.systolic >= 135 || m.diastolic >= 85) {
      doc.setTextColor(220, 38, 38); // red-600
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(`${m.systolic}`, cols[2].x + 1.5, curY + 4.5);
    doc.text(`${m.diastolic}`, cols[3].x + 1.5, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${m.pulse}`, cols[4].x + 1.5, curY + 4.5);
    doc.text(armStr, cols[5].x + 1.5, curY + 4.5);
    doc.text(postureStr, cols[6].x + 1.5, curY + 4.5);
    doc.text(catStr, cols[7].x + 1.5, curY + 4.5);

    // Notes wrapped
    doc.setTextColor(51, 65, 85);
    doc.text(splitNotes, cols[8].x + 1.5, curY + 4.5);

    // Hairline divider
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, curY + rowHeight, margin + contentWidth, curY + rowHeight);

    curY += rowHeight;
    rowCounter++;
  }

  drawPageDecorations(currentPageNum);

  // Set total page count in all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Seite ${p} von ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // Save / Share file
  const cleanName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Blutdruck_Verlaufsbericht_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  const pdfBase64 = doc.output('datauristring').split(',')[1];
  await saveOrShareFile(pdfBase64, filename, 'application/pdf', 'Blutdruck-Verlaufsbericht');
}

/**
 * Exports measurements to Excel-compatible CSV format (German semicolon separator and UTF-8 BOM)
 */
export async function exportToCsv(measurements: Measurement[], profile: UserProfile): Promise<void> {
  // UTF-8 BOM
  let csvContent = '\uFEFF';

  // Meta header
  csvContent += `Blutdruck-Export;${profile.name};Erstellt am: ${formatDateDe(new Date())};Leitlinie: ESH/ESC 2023\n`;
  csvContent +=
    'Datum;Uhrzeit;Systole (mmHg);Diastole (mmHg);Puls (BPM);Pulsdruck (mmHg);Messort;Körperhaltung;Kategorie (ESH);Notiz;Erfassungsmethode\n';

  for (const m of measurements) {
    const cat = classifyBloodPressure(m.systolic, m.diastolic);
    const dateStr = formatDateDe(m.timestamp);
    const timeStr = formatTimeDe(m.timestamp);
    const pulsePressure = m.systolic - m.diastolic;
    const armStr = formatArmDe(m.arm);
    const postureStr = formatPostureDe(m.posture);
    const catStr = cat.labelDe;
    const noteStr = (m.notes || '').replace(/;/g, ',');
    const methodStr = m.source === 'camera_ocr' ? 'Kamera-OCR' : m.source === 'demo' ? 'Demodaten' : 'Manuell';

    csvContent += `${dateStr};${timeStr};${m.systolic};${m.diastolic};${m.pulse};${pulsePressure};${armStr};${postureStr};${catStr};${noteStr};${methodStr}\n`;
  }

  const cleanName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Blutdruck_Daten_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`;

  // Encode to base64 for native sharing
  const utf8Encoder = new TextEncoder();
  const uint8Array = utf8Encoder.encode(csvContent);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  await saveOrShareFile(base64, filename, 'text/csv', 'Blutdruck-Tabelle');
}

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
} from './bloodPressureUtils';

/**
 * Downloads a text or blob file to user's device
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
 * Generates a clean medical Blood Pressure Diary PDF for doctor appointments
 */
export function exportToPdf(measurements: Measurement[], profile: UserProfile, dateRangeTitle: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const stats = calculateStats(measurements);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Background bar
  doc.setFillColor(2, 132, 199); // Sky-600
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Blutdruck-Tagebuch (Medizinischer Verlaufsbericht)', margin, 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Erstellt am ${formatDateDe(new Date())} um ${formatTimeDe(new Date())} Uhr · Vertrauliche Gesundheitsdaten`, margin, 17);

  // Patient Card
  let curY = 30;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 26, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient/in: ${profile.name || 'Hauptprofil'}`, margin + 4, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const birthText = profile.birthYear ? `Geburtsjahr: ${profile.birthYear}` : '';
  const heightText = profile.heightCm ? `Größe: ${profile.heightCm} cm` : '';
  const weightText = profile.weightKg ? `Gewicht: ${profile.weightKg} kg` : '';
  let bmiText = '';
  if (profile.heightCm && profile.weightKg) {
    const bmi = (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1);
    bmiText = `BMI: ${bmi}`;
  }
  const bioString = [birthText, heightText, weightText, bmiText].filter(Boolean).join('  |  ');
  doc.text(bioString || 'Keine biometrischen Zusatzangaben hinterlegt', margin + 4, curY + 13);

  doc.text(`Auswertungszeitraum: ${dateRangeTitle}  |  Messungen insgesamt: ${stats.count}`, margin + 4, curY + 19);

  curY += 32;

  // Statistical Summary Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Statistische Zusammenfassung', margin, curY);

  curY += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, curY, pageWidth - margin * 2, 22, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const colW = (pageWidth - margin * 2) / 4;
  // Col 1: Average
  doc.setFont('helvetica', 'bold');
  doc.text('Mittelwert (Gesamt)', margin + 4, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${stats.avgSys} / ${stats.avgDia} mmHg`, margin + 4, curY + 12);
  doc.text(`Puls: ${stats.avgPulse} BPM`, margin + 4, curY + 17);

  // Col 2: Min / Max
  doc.setFont('helvetica', 'bold');
  doc.text('Min / Max Spanne', margin + colW + 4, curY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`SYS: ${stats.minSys} - ${stats.maxSys} mmHg`, margin + colW + 4, curY + 12);
  doc.text(`DIA: ${stats.minDia} - ${stats.maxDia} mmHg`, margin + colW + 4, curY + 17);

  // Col 3: Morning Avg
  doc.setFont('helvetica', 'bold');
  doc.text('Morgen-Mittelwert (05-12h)', margin + colW * 2 + 4, curY + 6);
  doc.setFont('helvetica', 'normal');
  if (stats.morningAvg) {
    doc.text(`${stats.morningAvg.sys} / ${stats.morningAvg.dia} mmHg (${stats.morningAvg.count}x)`, margin + colW * 2 + 4, curY + 12);
    doc.text(`Puls: ${stats.morningAvg.pulse} BPM`, margin + colW * 2 + 4, curY + 17);
  } else {
    doc.text('Keine Morgenwerte', margin + colW * 2 + 4, curY + 12);
  }

  // Col 4: Evening Avg
  doc.setFont('helvetica', 'bold');
  doc.text('Abend-Mittelwert (17-24h)', margin + colW * 3 + 4, curY + 6);
  doc.setFont('helvetica', 'normal');
  if (stats.eveningAvg) {
    doc.text(`${stats.eveningAvg.sys} / ${stats.eveningAvg.dia} mmHg (${stats.eveningAvg.count}x)`, margin + colW * 3 + 4, curY + 12);
    doc.text(`Puls: ${stats.eveningAvg.pulse} BPM`, margin + colW * 3 + 4, curY + 17);
  } else {
    doc.text('Keine Abendwerte', margin + colW * 3 + 4, curY + 12);
  }

  curY += 28;

  // Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Messwert-Protokoll', margin, curY);

  curY += 3;
  const tableTopY = curY;

  // Table columns
  const cols = [
    { header: 'Datum & Zeit', x: margin, w: 32 },
    { header: 'SYS / DIA', x: margin + 32, w: 26 },
    { header: 'Puls', x: margin + 58, w: 16 },
    { header: 'Arm / Haltung', x: margin + 74, w: 28 },
    { header: 'WHO-Kategorie', x: margin + 102, w: 32 },
    { header: 'Notizen & Kontext', x: margin + 134, w: pageWidth - margin * 2 - 134 },
  ];

  const drawTableHeader = (y: number) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    for (const c of cols) {
      doc.text(c.header, c.x + 2, y + 5);
    }
  };

  drawTableHeader(curY);
  curY += 7;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const rowHeight = 6.2;
  let rowIndex = 0;

  for (const m of measurements) {
    // Check if new page is needed
    if (curY + rowHeight > pageHeight - 16) {
      doc.addPage();
      // Draw header on subsequent pages
      doc.setFillColor(2, 132, 199);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Blutdruck-Tagebuch: ${profile.name} (Fortsetzung)`, margin, 8);

      curY = 18;
      drawTableHeader(curY);
      curY += 7;
      rowIndex = 0;
    }

    // Alternating row background
    if (rowIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, pageWidth - margin * 2, rowHeight, 'F');
    }

    const cat = classifyBloodPressure(m.systolic, m.diastolic);
    const dateStr = `${formatDateDe(m.timestamp)} ${formatTimeDe(m.timestamp)}`;
    const bpStr = `${m.systolic} / ${m.diastolic}`;
    const pulseStr = `${m.pulse} BPM`;
    const armPostureStr = `${m.arm === 'left' ? 'L' : 'R'}, ${formatPostureDe(m.posture).substring(0, 4)}.`;
    const catStr = cat.shortLabel;
    const noteStr = m.notes || '-';

    doc.setTextColor(15, 23, 42);
    doc.text(dateStr, cols[0].x + 2, curY + 4.5);

    // Color code high blood pressure slightly
    if (m.systolic >= 140 || m.diastolic >= 90) {
      doc.setTextColor(185, 28, 28); // red-700
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(bpStr, cols[1].x + 2, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(pulseStr, cols[2].x + 2, curY + 4.5);
    doc.text(armPostureStr, cols[3].x + 2, curY + 4.5);
    doc.text(catStr, cols[4].x + 2, curY + 4.5);

    // Truncate note if too long
    const cleanNote = noteStr.length > 36 ? noteStr.substring(0, 34) + '...' : noteStr;
    doc.text(cleanNote, cols[5].x + 2, curY + 4.5);

    // Hairline divider
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, curY + rowHeight, pageWidth - margin, curY + rowHeight);

    curY += rowHeight;
    rowIndex++;
  }

  // Footer Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Hinweis: Dieses Tagebuch dient der persönlichen Dokumentation für Ihren Arzt. Es ersetzt keine ärztliche Diagnose.',
    margin,
    pageHeight - 8
  );

  const cleanName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Blutdruck_Tagebuch_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Exports measurements to Excel-compatible CSV format (German semicolon separator and UTF-8 BOM)
 */
export function exportToCsv(measurements: Measurement[], profile: UserProfile): void {
  // UTF-8 BOM
  let csvContent = '\uFEFF';

  // Meta header
  csvContent += `Blutdruck-Export;${profile.name};Erstellt am: ${formatDateDe(new Date())}\n`;
  csvContent += 'Datum;Uhrzeit;Systole (mmHg);Diastole (mmHg);Puls (BPM);Pulsdruck (mmHg);Messort;Körperhaltung;WHO-Kategorie;Notiz;Erfassungsmethode\n';

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

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const cleanName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
  triggerDownload(blob, `Blutdruck_Daten_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Edit3,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  Clock,
  Calendar,
  Sparkles,
  ShieldCheck,
  Video,
  VideoOff,
  Image as ImageIcon,
} from 'lucide-react';
import { ArmPosition, BodyPosture, Measurement } from '../types/bloodPressure';
import { classifyBloodPressure } from '../services/bloodPressureUtils';
import {
  analyzeBloodPressureImage,
  SAMPLE_MONITOR_PRESETS,
  generateSampleMonitorImage,
  OcrResult,
} from '../services/localOcrEngine';

interface MeasurementFormViewProps {
  onSaveMeasurement: (
    data: Omit<Measurement, 'id' | 'profileId'>
  ) => void;
  onCancel: () => void;
}

export const MeasurementFormView: React.FC<MeasurementFormViewProps> = ({
  onSaveMeasurement,
  onCancel,
}) => {
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');

  // Form State
  const [systolic, setSystolic] = useState<number>(124);
  const [diastolic, setDiastolic] = useState<number>(82);
  const [pulse, setPulse] = useState<number>(72);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [arm, setArm] = useState<ArmPosition>('left');
  const [posture, setPosture] = useState<BodyPosture>('sitting');
  const [notes, setNotes] = useState<string>('');
  const [quickNoteTag, setQuickNoteTag] = useState<string>('');

  // Camera & OCR State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [ocrConfirmed, setOcrConfirmed] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live classification preview
  const currentCategory = classifyBloodPressure(systolic, diastolic);

  // Quick note chips
  const quickTags = [
    'Morgens nüchtern',
    'Vor Medikament',
    'Nach Medikament',
    'Nach dem Sport',
    'Vor dem Schlafen',
    'Kopfschmerzen',
    'Stressiger Tag',
  ];

  // Stop camera when leaving camera mode or unmounting
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera wird von diesem Browser nicht unterstützt.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access denied or failed:', err);
      setCameraError('Kamerazugriff wurde verweigert oder ist nicht verfügbar. Sie können ein Foto hochladen oder eine Beispielanzeige testen.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture frame from active camera stream
  const handleSnapCamera = async () => {
    if (!videoRef.current) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeBloodPressureImage(videoRef.current);
      setOcrResult(result);
      if (result.displayCropPreview) {
        setCapturedPreview(result.displayCropPreview);
      }
      // Populate form values
      setSystolic(result.systolic);
      setDiastolic(result.diastolic);
      setPulse(result.pulse);
      setOcrConfirmed(false);
      stopCamera();
    } catch (err) {
      console.error('OCR analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload photo from device storage
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPreview(dataUrl);
      setIsAnalyzing(true);

      const img = new Image();
      img.onload = async () => {
        const result = await analyzeBloodPressureImage(img);
        setOcrResult(result);
        setSystolic(result.systolic);
        setDiastolic(result.diastolic);
        setPulse(result.pulse);
        setOcrConfirmed(false);
        setIsAnalyzing(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Test with authentic monitor preset
  const handleSelectPreset = async (presetId: string) => {
    const preset = SAMPLE_MONITOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setIsAnalyzing(true);
    stopCamera();

    const imageUrl = await generateSampleMonitorImage(preset);
    setCapturedPreview(imageUrl);

    const img = new Image();
    img.onload = async () => {
      const result = await analyzeBloodPressureImage(img);
      setOcrResult(result);
      setSystolic(preset.sys);
      setDiastolic(preset.dia);
      setPulse(preset.pulse);
      setOcrConfirmed(false);
      setIsAnalyzing(false);
    };
    img.src = imageUrl;
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Physiological checks
    if (systolic <= diastolic) {
      alert('Der systolische Blutdruck muss höher sein als der diastolische Blutdruck.');
      return;
    }

    // Combine date and time
    const dateTimeStr = `${date}T${time}:00`;
    const timestamp = new Date(dateTimeStr).toISOString();

    const finalNotes = [notes.trim(), quickNoteTag].filter(Boolean).join(' · ');

    onSaveMeasurement({
      timestamp,
      systolic: Math.round(systolic),
      diastolic: Math.round(diastolic),
      pulse: Math.round(pulse),
      arm,
      posture,
      notes: finalNotes || undefined,
      source: mode === 'camera' && ocrResult ? 'camera_ocr' : 'manual',
      confidenceScore: ocrResult ? ocrResult.confidence : undefined,
    });
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Messung erfassen
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Wählen Sie manuelle Eingabe oder lokale Kamera-Displayerkennung
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'manual'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manuell</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'camera'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Per Kamera (OCR)</span>
          </button>
        </div>
      </div>

      {/* CAMERA OCR SECTION */}
      {mode === 'camera' && (
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-600" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Display-Erkennung (100% Lokal & Privat)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Keine Cloud-Übertragung</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Halten Sie das Display Ihres Messgeräts in den Sucherrahmen. Die Werte für SYS, DIA und Puls werden lokal im Browser ausgelesen.
          </p>

          {/* Camera Viewfinder / Preview Container */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-300 dark:border-slate-800">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Viewfinder Target Framing Overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-sky-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <span className="text-[10px] font-mono text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded self-start">
                    SYS / DIA / PULS Display
                  </span>
                  <div className="text-center text-[11px] text-white/90 drop-shadow">
                    Display im Kasten zentrieren
                  </div>
                </div>
              </>
            ) : capturedPreview ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedPreview}
                  alt="Aufgenommenes Display"
                  className="w-full h-full object-contain bg-slate-900"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded">
                  Erfasstes Bild
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <Camera className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
                <p className="text-xs">
                  Kamera aktivieren, Foto hochladen oder Test-Messgerät wählen
                </p>
              </div>
            )}

            {/* Loading Spinner during OCR Analysis */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white space-y-2 backdrop-blur-xs">
                <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
                <span className="text-xs font-medium">Display-OCR analysiert Werte...</span>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Camera Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-xs"
              >
                <Video className="w-4 h-4" />
                <span>Live-Kamera starten</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSnapCamera}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md active:scale-95 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                  <span>Jetzt scannen</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  <VideoOff className="w-3.5 h-3.5" />
                  <span>Kamera beenden</span>
                </button>
              </>
            )}

            {/* File Upload Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Foto hochladen</span>
            </button>
          </div>

          {/* Quick Test Presets (Omron, Beurer, Sanitas, Braun) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Oder Test-Display eines Blutdruckmessgeräts simulieren:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_MONITOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className="p-2 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {p.name}
                  </div>
                  <div className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                    {p.sys}/{p.dia} · {p.pulse} BPM
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* OCR Result & Explicit Confirmation Box */}
          {ocrResult && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                ocrResult.isUncertain
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {ocrResult.isUncertain ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {ocrResult.isUncertain
                        ? 'Erkennung unsicher – Bitte Werte manuell verifizieren'
                        : 'Messwerte erfolgreich erkannt'}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      Erkennungs-Konfidenz: {ocrResult.confidence}%
                    </div>
                  </div>
                </div>

                {/* Preprocessed LCD Preview */}
                {ocrResult.processedImagePreview && (
                  <img
                    src={ocrResult.processedImagePreview}
                    alt="Binarisiertes LCD"
                    className="w-16 h-10 object-cover rounded-md border border-slate-300 dark:border-slate-700 bg-black"
                    title="Binarisierte Ziffernanalyse"
                  />
                )}
              </div>

              {ocrResult.uncertaintyReason && (
                <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                  {ocrResult.uncertaintyReason}
                </p>
              )}

              {/* Explicit Confirmation Checkbox (Requirement: Vor dem Speichern eine ausdrückliche Bestätigung verlangen) */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ocrConfirmed}
                    onChange={(e) => setOcrConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    Ich bestätige, dass die erkannten Werte ({systolic}/{diastolic} mmHg, {pulse} BPM) mit dem Geräte-Display übereinstimmen.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL & EDITABLE FORM (Values populated by manual inputs or OCR) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core Blood Pressure Input Card */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Messwerte
            </span>
            {/* Live Category Indicator */}
            <div
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: currentCategory.bgLight,
                color: currentCategory.textColor,
              }}
            >
              {currentCategory.labelDe}
            </div>
          </div>

          {/* SYS / DIA / PULSE Inputs with Steppers and Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Systolic */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span className="font-semibold text-red-600 dark:text-red-400">SYS (Systolisch)</span>
                <span className="text-[10px]">mmHg</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSystolic((v) => Math.max(70, v - 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold flex items-center justify-center text-lg shadow-xs hover:bg-slate-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="70"
                  max="260"
                  value={systolic}
                  onChange={(e) => setSystolic(Number(e.target.value))}
                  className="w-20 text-center font-mono text-2xl font-extrabold text-slate-900 dark:text-white bg-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setSystolic((v) => Math.min(260, v + 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold flex items-center justify-center text-lg shadow-xs hover:bg-slate-100"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="80"
                max="220"
                value={systolic}
                onChange={(e) => setSystolic(Number(e.target.value))}
                className="w-full mt-2 accent-red-500 cursor-pointer"
              />
            </div>

            {/* Diastolic */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span className="font-semibold text-sky-600 dark:text-sky-400">DIA (Diastolisch)</span>
                <span className="text-[10px]">mmHg</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDiastolic((v) => Math.max(40, v - 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold flex items-center justify-center text-lg shadow-xs hover:bg-slate-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="40"
                  max="160"
                  value={diastolic}
                  onChange={(e) => setDiastolic(Number(e.target.value))}
                  className="w-20 text-center font-mono text-2xl font-extrabold text-slate-900 dark:text-white bg-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setDiastolic((v) => Math.min(160, v + 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold flex items-center justify-center text-lg shadow-xs hover:bg-slate-100"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="50"
                max="130"
                value={diastolic}
                onChange={(e) => setDiastolic(Number(e.target.value))}
                className="w-full mt-2 accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Pulse */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                  Puls
                </span>
                <span className="text-[10px]">BPM</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPulse((v) => Math.max(40, v - 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold flex items-center justify-center text-lg shadow-xs hover:bg-slate-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min="40"
                  max="220"
                  value={pulse}
                  onChange={(e) => setPulse(Number(e.target.value))}
                  className="w-20 text-center font-mono text-2xl font-extrabold text-slate-900 dark:text-white bg-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPulse((v) => Math.min(220, v + 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-bold flex items-center justify-center text-lg shadow-xs hover:bg-slate-100"
                >
                  +
                </button>
              </div>
              <input
                type="range"
                min="45"
                max="150"
                value={pulse}
                onChange={(e) => setPulse(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Measurement Context (Arm & Posture) */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Bedingungen der Messung
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Arm Selection */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                Gemessener Arm
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setArm('left')}
                  className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                    arm === 'left'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Linker Arm
                </button>
                <button
                  type="button"
                  onClick={() => setArm('right')}
                  className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                    arm === 'right'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Rechter Arm
                </button>
              </div>
            </div>

            {/* Posture Selection */}
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium block mb-1.5">
                Körperhaltung
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPosture('sitting')}
                  className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                    posture === 'sitting'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Sitzend
                </button>
                <button
                  type="button"
                  onClick={() => setPosture('lying')}
                  className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                    posture === 'lying'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Liegend
                </button>
                <button
                  type="button"
                  onClick={() => setPosture('standing')}
                  className={`py-2 text-xs font-medium rounded-lg transition-colors ${
                    posture === 'standing'
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Stehend
                </button>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Datum
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Uhrzeit
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Notes & Quick Tags */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Notiz & Begleitumstände
          </span>

          <input
            type="text"
            placeholder="z.B. Vor Einnahme Ramipril, nach Ruhepause..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-sky-500"
          />

          {/* Quick tags */}
          <div className="flex flex-wrap gap-1.5">
            {quickTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuickNoteTag(quickNoteTag === tag ? '' : tag)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  quickNoteTag === tag
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={mode === 'camera' && ocrResult !== null && !ocrConfirmed}
            className={`w-2/3 py-3 rounded-2xl text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
              mode === 'camera' && ocrResult !== null && !ocrConfirmed
                ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70'
                : 'bg-sky-600 hover:bg-sky-500 active:scale-98'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {mode === 'camera' && ocrResult ? 'Werte bestätigen & speichern' : 'Messung speichern'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

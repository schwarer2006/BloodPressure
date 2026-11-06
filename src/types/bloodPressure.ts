/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ArmPosition = 'left' | 'right';
export type BodyPosture = 'sitting' | 'lying' | 'standing';

export type WhoCategory =
  | 'optimal'
  | 'normal'
  | 'high_normal'
  | 'hypertension_grade_1'
  | 'hypertension_grade_2'
  | 'hypertension_grade_3'
  | 'isolated_systolic';

export interface CategoryInfo {
  category: WhoCategory;
  labelDe: string;
  shortLabel: string;
  color: string; // Tailwind color class or hex
  bgLight: string;
  bgDark: string;
  textColor: string;
  descriptionDe: string;
  rangeSys: string;
  rangeDia: string;
}

export interface Measurement {
  id: string;
  profileId: string;
  timestamp: string; // ISO String: "2026-11-05T14:30:00.000Z"
  systolic: number; // mmHg (e.g. 120)
  diastolic: number; // mmHg (e.g. 80)
  pulse: number; // BPM (e.g. 72)
  arm: ArmPosition;
  posture: BodyPosture;
  notes?: string;
  source: 'manual' | 'camera_ocr' | 'demo';
  confidenceScore?: number; // 0-100 for OCR
  capturedImagePreview?: string; // Optional local thumbnail
}

export interface UserProfile {
  id: string;
  name: string;
  isDefault: boolean;
  birthYear?: number;
  gender?: 'male' | 'female' | 'divers' | 'not_specified';
  heightCm?: number;
  weightKg?: number;
  personalNotes?: string;
  createdAt: string;
}

export type TimeframeFilter = 'today' | '7days' | '14days' | '30days' | '90days' | '1year' | 'all' | 'custom';

export interface BloodPressureStats {
  count: number;
  avgSys: number;
  avgDia: number;
  avgPulse: number;
  minSys: number;
  maxSys: number;
  minDia: number;
  maxDia: number;
  minPulse: number;
  maxPulse: number;
  avgPulsePressure: number; // SYS - DIA
  morningAvg?: { sys: number; dia: number; pulse: number; count: number };
  eveningAvg?: { sys: number; dia: number; pulse: number; count: number };
  categoryDistribution: Record<WhoCategory, number>;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Capacitor } from '@capacitor/core';

interface AndroidShellProps {
  children: React.ReactNode;
  shellMode: 'android_phone' | 'responsive';
}

export const AndroidShell: React.FC<AndroidShellProps> = ({ children, shellMode }) => {
  const isNative = Capacitor.isNativePlatform();

  // On real Android devices / native WebView or when responsive mode is active,
  // render full-bleed responsive layout without any simulated device bezel.
  if (isNative || shellMode === 'responsive') {
    return (
      <div className="min-h-dvh w-full bg-slate-50 md:bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-x-clip">
        <div className="max-w-4xl mx-auto min-h-dvh w-full bg-white dark:bg-slate-900 md:shadow-xl md:border-x border-slate-200 dark:border-slate-800 flex flex-col relative min-w-0">
          {children}
        </div>
      </div>
    );
  }

  // Desktop-only Pixel smartphone preview shell (automatically bypassed on narrow/mobile screens)
  return (
    <div className="min-h-dvh w-full bg-slate-50 md:bg-slate-900/90 dark:bg-slate-950 md:dark:bg-black md:py-8 md:px-2 md:flex md:items-center md:justify-center transition-colors overflow-x-clip">
      {/* Mobile screen fallback (<md): full width native-feel view */}
      <div className="md:hidden min-h-dvh w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col relative min-w-0">
        {children}
      </div>

      {/* Desktop preview container (md+) */}
      <div className="hidden md:block w-full max-w-[420px] rounded-[44px] bg-slate-950 p-3 shadow-2xl shadow-sky-950/40 ring-1 ring-slate-800 relative">
        {/* Phone Bezel & Camera Punch Hole */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black ring-1 ring-slate-800 z-50 pointer-events-none" />

        {/* Screen Area */}
        <div className="relative w-full h-[840px] max-h-[90vh] rounded-[36px] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col border border-slate-800">
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col min-w-0">
            {children}
          </div>

          {/* Android Home Gesture Pill Indicator (only inside desktop simulator frame) */}
          <div className="h-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-center shrink-0 border-t border-slate-200/40 dark:border-slate-800/40">
            <div className="w-32 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

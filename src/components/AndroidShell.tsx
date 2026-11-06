/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AndroidShellProps {
  children: React.ReactNode;
  shellMode: 'android_phone' | 'responsive';
}

export const AndroidShell: React.FC<AndroidShellProps> = ({ children, shellMode }) => {
  if (shellMode === 'responsive') {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="max-w-4xl mx-auto min-h-screen bg-white dark:bg-slate-900 shadow-xl border-x border-slate-200 dark:border-slate-800 flex flex-col relative">
          {children}
        </div>
      </div>
    );
  }

  // Android Smartphone Shell (Pixel Style)
  return (
    <div className="min-h-screen bg-slate-900/90 dark:bg-black py-4 px-2 sm:py-8 flex items-center justify-center transition-colors">
      <div className="w-full max-w-[420px] rounded-[44px] bg-slate-950 p-3 shadow-2xl shadow-sky-950/40 ring-1 ring-slate-800 relative">
        {/* Phone Bezel & Camera Punch Hole */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black ring-1 ring-slate-800 z-50 pointer-events-none" />

        {/* Screen Area */}
        <div className="relative w-full h-[840px] max-h-[90vh] rounded-[36px] overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col border border-slate-800">
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {children}
          </div>

          {/* Android Home Gesture Pill Indicator */}
          <div className="h-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-center shrink-0 border-t border-slate-200/40 dark:border-slate-800/40">
            <div className="w-32 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-amber-500 text-slate-950 font-semibold px-4 py-2 rounded-2xl shadow-xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 border border-amber-400">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
        <span>Offline-Modus aktiv</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-900 font-sans">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Alle Daten lokal sicher</span>
      </div>
    </div>
  );
};

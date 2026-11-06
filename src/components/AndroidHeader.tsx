/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Moon, Sun, ShieldCheck, Smartphone, Monitor } from 'lucide-react';
import { UserProfile } from '../types/bloodPressure';

interface AndroidHeaderProps {
  currentProfile: UserProfile;
  profiles: UserProfile[];
  onSelectProfile: (id: string) => void;
  themeMode: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  viewportShell: 'android_phone' | 'responsive';
  onToggleViewportShell: () => void;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  currentProfile,
  profiles,
  onSelectProfile,
  themeMode,
  onToggleTheme,
  viewportShell,
  onToggleViewportShell,
}) => {
  const [currentTime, setCurrentTime] = useState('09:41');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Android System Status Bar (Authentic Android look) */}
      <div className="flex items-center justify-between px-4 pt-1.5 pb-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
        <span className="font-semibold">{currentTime}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline & Sicher</span>
          </div>
          <Wifi className="w-3.5 h-3.5" />
          <BatteryMedium className="w-4 h-4" />
        </div>
      </div>

      {/* Material 3 Top App Bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-sm font-bold text-sm tracking-tight">
            BP
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
              BloodPressure
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
              Intelligenter Blutdruckmanager
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Shell Toggle (Phone frame vs Responsive) */}
          <button
            onClick={onToggleViewportShell}
            title={viewportShell === 'android_phone' ? 'Vollbildmodus' : 'Smartphone-Rahmen'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {viewportShell === 'android_phone' ? (
              <Monitor className="w-4 h-4" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title="Design wechseln"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Profile Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="max-w-[70px] truncate">{currentProfile.name}</span>
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Profil wechseln
                  </div>
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProfile(p.id);
                        setShowProfileMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        p.id === currentProfile.id
                          ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.id === currentProfile.id && (
                        <span className="text-[10px] text-sky-500">Aktiv</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

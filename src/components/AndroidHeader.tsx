/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Wifi, BatteryMedium, Moon, Sun, ShieldCheck, Smartphone, Monitor, FlaskConical } from 'lucide-react';
import { AppMode, UserProfile } from '../types/bloodPressure';

interface AndroidHeaderProps {
  currentProfile: UserProfile;
  profiles: UserProfile[];
  onSelectProfile: (id: string) => void;
  themeMode: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  viewportShell: 'android_phone' | 'responsive';
  onToggleViewportShell: () => void;
  appMode: AppMode;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  currentProfile,
  profiles,
  onSelectProfile,
  themeMode,
  onToggleTheme,
  viewportShell,
  onToggleViewportShell,
  appMode,
}) => {
  const [currentTime, setCurrentTime] = useState('09:41');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isNative = Capacitor.isNativePlatform();

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

  const showSimulatedStatusBar = !isNative && viewportShell === 'android_phone';

  return (
    <header
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors pt-[var(--bp-safe-top)] pl-[var(--bp-safe-left)] pr-[var(--bp-safe-right)]"
    >
      {/* Simulated status bar only inside desktop smartphone preview frame */}
      {showSimulatedStatusBar && (
        <div className="hidden md:flex items-center justify-between px-4 pt-1.5 pb-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-400">
          <span className="font-semibold">{currentTime}</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Offline &amp; Lokal</span>
            </div>
            <Wifi className="w-3.5 h-3.5" />
            <BatteryMedium className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Material 3 Top App Bar */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 min-w-0">
        {/* Brand Lockup */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-sm font-bold text-sm tracking-tight shrink-0">
            BP
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate">
                BloodPressure
              </h1>
              {appMode === 'demo' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-[10px] font-bold text-amber-800 dark:text-amber-300 shrink-0">
                  <FlaskConical className="w-2.5 h-2.5" />
                  DEMO
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none truncate">
              {appMode === 'demo' ? 'Test- & Demobereich' : 'Intelligenter Blutdruckmanager'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Desktop-only Shell Toggle (Phone frame vs Responsive) */}
          {!isNative && (
            <button
              type="button"
              onClick={onToggleViewportShell}
              title={viewportShell === 'android_phone' ? 'Vollbildmodus' : 'Smartphone-Rahmen'}
              aria-label="Ansichtsrahmen umschalten"
              className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {viewportShell === 'android_phone' ? (
                <Monitor className="w-4 h-4" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title="Design wechseln"
            aria-label="Farbschema wechseln"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label={`Aktives Profil: ${currentProfile.name}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  appMode === 'demo' ? 'bg-amber-500' : 'bg-sky-500'
                }`}
              />
              <span className="max-w-[85px] sm:max-w-[120px] truncate">{currentProfile.name}</span>
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    {appMode === 'demo' ? 'Demoprofil wechseln' : 'Profil wechseln'}
                  </div>
                  {profiles.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        onSelectProfile(p.id);
                        setShowProfileMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        p.id === currentProfile.id
                          ? 'font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.id === currentProfile.id && (
                        <span className="text-[10px] text-sky-500 shrink-0 ml-2">Aktiv</span>
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

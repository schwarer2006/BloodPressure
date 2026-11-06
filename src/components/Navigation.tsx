/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
  User,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'add' | 'history' | 'reports' | 'profile';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'add' as ActiveTab,
      label: 'Erfassen',
      icon: PlusCircle,
      highlight: true,
    },
    {
      id: 'history' as ActiveTab,
      label: 'Verlauf',
      icon: TrendingUp,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Berichte',
      icon: FileSpreadsheet,
    },
    {
      id: 'profile' as ActiveTab,
      label: 'Profil',
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="mx-auto max-w-lg px-2">
        <div className="grid grid-cols-5 items-center h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-all relative ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {/* Material 3 active indicator pill */}
                {isActive && (
                  <span className="absolute top-1.5 w-12 h-7 bg-sky-100 dark:bg-sky-950/80 rounded-full -z-10 animate-fade-in" />
                )}

                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <span className="text-[10px] tracking-tight mt-1 whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

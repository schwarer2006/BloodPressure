/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, CheckCircle2, Share, PlusSquare, Monitor, HelpCircle } from 'lucide-react';

export const PWAInstallCard: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showGenericHelp, setShowGenericHelp] = useState(false);

  return (
    <div className="rounded-3xl p-5 bg-gradient-to-br from-sky-50 to-white dark:from-slate-900 dark:to-slate-800/80 border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              App auf Startbildschirm installieren (PWA)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Vollbild ohne Browserleiste, Offline-Nutzung & blitzschneller Start
            </p>
          </div>
        </div>

        {isInstalled && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Installiert</span>
          </span>
        )}
      </div>

      {isInstalled ? (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            BloodPressure wird bereits im eigenständigen App-Modus (Standalone) ausgeführt.
          </span>
        </div>
      ) : isInstallable ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Installieren Sie BloodPressure mit einem Klick als native Progressive Web App auf Ihrem Smartphone, Tablet oder Computer:
          </p>
          <button
            type="button"
            onClick={install}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Jetzt auf diesem Gerät installieren</span>
          </button>
        </div>
      ) : isIOS ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Auf dem iPhone / iPad kann die App direkt über Safari installiert werden:
          </p>
          <button
            type="button"
            onClick={() => setShowIOSModal(true)}
            className="w-full py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-800 hover:bg-sky-50 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Share className="w-4 h-4 text-sky-600" />
            <span>Anleitung für iPhone / iPad anzeigen</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Um BloodPressure zu installieren, nutzen Sie die Installationsfunktion Ihres Browsers:
          </p>
          <button
            type="button"
            onClick={() => setShowGenericHelp(!showGenericHelp)}
            className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Installationsanleitung für Chrome, Edge & Safari</span>
          </button>

          {showGenericHelp && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 animate-in fade-in">
              <div className="font-semibold text-slate-900 dark:text-white">
                Browser-Installation:
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Chrome / Edge (PC/Mac):</strong> Klicken Sie auf das Download-Symbol rechts in der Adresszeile.</li>
                <li><strong>Android (Chrome):</strong> Tippen Sie auf die drei Punkte (Menü) → „App installieren“ oder „Zum Startbildschirm hinzufügen“.</li>
                <li><strong>iPhone / iPad (Safari):</strong> Tippen Sie auf das Teilen-Symbol → „Zum Home-Bildschirm“.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-sky-600">
              <Smartphone className="w-5 h-5" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Installation auf iPhone / iPad
              </h4>
            </div>

            <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 list-decimal list-inside">
              <li>
                Tippen Sie in der Safari-Symbolleiste unten auf das <strong>Teilen-Symbol</strong> (<Share className="w-3.5 h-3.5 inline text-sky-600" />).
              </li>
              <li>
                Scrollen Sie nach unten und wählen Sie <strong>„Zum Home-Bildschirm“</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-sky-600" />).
              </li>
              <li>
                Tippen Sie oben rechts auf <strong>„Hinzufügen“</strong>.
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-500"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

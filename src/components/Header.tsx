import React from 'react';
import { GPSCoords, KimaiConfig, KimaiUser } from '../types/kimai';
import { Navigation, Settings, ShieldCheck, Info } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { SteampunkClockIcon } from './SteampunkClockIcon';

interface HeaderProps {
  config: KimaiConfig;
  user: KimaiUser | null;
  gpsCoords: GPSCoords | null;
  gpsLoading: boolean;
  onRefreshGps: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onToggleDemoMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  user,
  gpsCoords,
  gpsLoading,
  onRefreshGps,
  onOpenSettings,
  onOpenAbout,
  onToggleDemoMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 safe-top px-4 py-2.5">
      <div className="flex items-center justify-between gap-2 max-w-xl mx-auto">
        {/* Brand & Steampunk Clock Logo */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAbout}
            className="relative flex items-center justify-center p-1 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-400 hover:border-amber-400/50 transition cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
            title="Acerca de kimaai"
          >
            <SteampunkClockIcon size={32} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-baseline gap-1">
                kimaai
                <span className="text-[10px] font-normal text-amber-200/80 hidden xs:inline">
                  for Kimai Self-Hosted
                </span>
              </h1>
              <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                v2.5
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <button
                onClick={onToggleDemoMode}
                className="hover:underline flex items-center gap-1"
                title="Cambiar entre Kimai Real y Modo Demo"
              >
                {config.isDemoMode ? (
                  <span className="text-amber-400 font-medium">Modo Demo</span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    Kimai Self-Hosted
                  </span>
                )}
              </button>
              <span>·</span>
              <span className="truncate max-w-[90px]">{user?.alias || user?.username || 'Usuario'}</span>
            </div>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-1.5">
          {/* GPS Status quick-button */}
          <button
            onClick={onRefreshGps}
            disabled={gpsLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition active:scale-95 cursor-pointer ${
              gpsCoords
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-amber-500/30 text-amber-300'
            }`}
            title="Estado de sensor GPS para plugins de Kimai"
          >
            <Navigation
              className={`w-3 h-3 ${gpsLoading ? 'animate-spin text-cyan-400' : gpsCoords ? 'text-emerald-400 fill-emerald-400/20' : 'text-amber-400'}`}
            />
            <span>
              {gpsLoading
                ? 'GPS...'
                : gpsCoords
                ? `GPS ±${gpsCoords.accuracy ? Math.round(gpsCoords.accuracy) : 10}m`
                : 'GPS inactivo'}
            </span>
          </button>

          <PWAInstallButton />

          {/* About Modal button */}
          <button
            onClick={onOpenAbout}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/40 transition active:scale-95 cursor-pointer"
            title="Acerca de kimaai (Desarrollador y Repositorio)"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95 cursor-pointer"
            title="Configuración de Kimai y Plugins"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

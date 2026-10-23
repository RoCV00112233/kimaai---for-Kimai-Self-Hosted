import React, { useState } from 'react';
import { GPSCoords, GPSPluginMode, KimaiConfig } from '../types/kimai';
import {
  Navigation,
  RefreshCw,
  CheckCircle2,
  Sliders,
  Compass,
  Cpu,
} from 'lucide-react';

interface GpsDiagnosticsProps {
  config: KimaiConfig;
  onUpdateConfig: (updated: Partial<KimaiConfig>) => void;
  gpsCoords: GPSCoords | null;
  gpsLoading: boolean;
  onRefreshGps: () => void;
}

export const GpsDiagnostics: React.FC<GpsDiagnosticsProps> = ({
  config,
  onUpdateConfig,
  gpsCoords,
  gpsLoading,
  onRefreshGps,
}) => {
  const [customLat, setCustomLat] = useState<string>(String(config.fallbackLatitude || '19.432608'));
  const [customLon, setCustomLon] = useState<string>(String(config.fallbackLongitude || '-99.133209'));
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const saveCustomFallback = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      onUpdateConfig({
        fallbackLatitude: lat,
        fallbackLongitude: lon,
      });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Diagnóstico GPS & Compatibilidad de Plugins</span>
          </h2>
          <p className="text-xs text-slate-400">
            Resuelve fallos de validación en Kimai causados por plugins de geolocalización
          </p>
        </div>
      </div>

      {/* Sensor Hardware Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Sensor GPS del Dispositivo</h3>
              <p className="text-[11px] text-slate-400">
                {gpsCoords ? 'Coordenadas satelitales adquiridas' : 'Sin posición en vivo'}
              </p>
            </div>
          </div>

          <button
            onClick={onRefreshGps}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Capturar Posición</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase">Latitud</span>
            <p className="font-mono text-emerald-400 font-bold mt-0.5">
              {gpsCoords ? gpsCoords.latitude.toFixed(6) : customLat}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase">Longitud</span>
            <p className="font-mono text-emerald-400 font-bold mt-0.5">
              {gpsCoords ? gpsCoords.longitude.toFixed(6) : customLon}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase">Precisión</span>
            <p className="font-mono text-cyan-400 font-bold mt-0.5">
              {gpsCoords?.accuracy ? `±${gpsCoords.accuracy}m` : '±8m (Est)'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase">Origen</span>
            <p className="font-mono text-slate-300 font-bold mt-0.5">
              {gpsCoords ? 'Dispositivo Real' : 'Fallback / Mock'}
            </p>
          </div>
        </div>
      </div>

      {/* Fallback Coordinates Settings */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold text-white">Coordenadas de Respaldo / Indoor Fallback</h3>
              <p className="text-[11px] text-slate-400">
                Evita que los plugins de Kimai rechacen tareas cuando estás en interiores o sin señal
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.useFallbackGPS}
              onChange={(e) => onUpdateConfig({ useFallbackGPS: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {config.useFallbackGPS && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400">Latitud de Respaldo</label>
              <input
                type="text"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Longitud de Respaldo</label>
              <input
                type="text"
                value={customLon}
                onChange={(e) => setCustomLon(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveCustomFallback}
                className={`w-full py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  savedFeedback
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {savedFeedback ? '✓ Guardadas' : 'Guardar Coordenadas'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plugin Mode Selector Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">Modo de Formato para Plugins Kimai</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            {
              mode: 'smart',
              title: 'Smart Dual (Recomendado)',
              desc: 'Envía latitude y longitude tanto en la raíz como en el array metaFields[]. Compatible con prácticamente todos los plugins.',
            },
            {
              mode: 'metaFields',
              title: 'Kimai 2 MetaFields Array',
              desc: 'Formato estándar del plugin de Kevin Papst. Inyecta {name: "latitude", value: "..."}, {name: "longitude", value: "..."}.',
            },
            {
              mode: 'rootFields',
              title: 'Campos Raíz Directos',
              desc: 'Inyecta latitude, longitude y location como propiedades de primer nivel del JSON.',
            },
            {
              mode: 'legacy',
              title: 'GeoTracking Plugin Legacy',
              desc: 'Inyecta metaFields con nombres geo_lat y geo_long.',
            },
            {
              mode: 'bypass',
              title: 'Bypass Total (Sin GPS)',
              desc: 'No envía ninguna coordenada GPS. Úsalo si tu servidor Kimai lanza error de "campo desconocido".',
            },
          ].map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onUpdateConfig({ gpsPluginMode: item.mode as GPSPluginMode })}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                config.gpsPluginMode === item.mode
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-200">{item.title}</span>
                {config.gpsPluginMode === item.mode && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

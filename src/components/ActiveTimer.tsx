import React, { useEffect, useState } from 'react';
import { GPSCoords, KimaiActivity, KimaiProject, KimaiTimesheet } from '../types/kimai';
import { Play, Square, MapPin, Tag, Briefcase, FolderKanban, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActiveTimerProps {
  activeTimesheet: KimaiTimesheet | null;
  onStop: () => Promise<void>;
  onStartNew: () => void;
  onResumeTask: (projectId: number, activityId: number, description?: string) => void;
  recentTasks: Array<{ projectId: number; projectName: string; activityId: number; activityName: string; color?: string }>;
  isStopping: boolean;
  gpsCoords: GPSCoords | null;
  projects?: KimaiProject[];
  activities?: KimaiActivity[];
}

export const ActiveTimer: React.FC<ActiveTimerProps> = ({
  activeTimesheet,
  onStop,
  onStartNew,
  onResumeTask,
  recentTasks,
  isStopping,
  gpsCoords,
  projects = [],
  activities = [],
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Compute live elapsed time from `begin` timestamp
  useEffect(() => {
    if (!activeTimesheet) {
      setElapsedSeconds(0);
      return;
    }

    const beginMs = new Date(activeTimesheet.begin).getTime();

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - beginMs) / 1000));
      setElapsedSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeTimesheet]);

  // Format seconds into HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      hours: pad(hrs),
      minutes: pad(mins),
      seconds: pad(secs),
    };
  };

  const time = formatTime(elapsedSeconds);

  // Safely resolve project
  const projectObj =
    activeTimesheet?.project && typeof activeTimesheet.project === 'object'
      ? activeTimesheet.project
      : projects.find((p) => p.id === Number(activeTimesheet?.project));

  const projectName =
    projectObj?.name ||
    (activeTimesheet?.project ? `Proyecto #${activeTimesheet.project}` : 'Proyecto en Curso');

  const projectColor = projectObj?.color || '#10B981';

  // Safely resolve activity
  const activityObj =
    activeTimesheet?.activity && typeof activeTimesheet.activity === 'object'
      ? activeTimesheet.activity
      : activities.find((a) => a.id === Number(activeTimesheet?.activity));

  const activityName =
    activityObj?.name ||
    (activeTimesheet?.activity ? `Actividad #${activeTimesheet.activity}` : 'Actividad');

  const customerName =
    projectObj && (projectObj as any).customerName
      ? (projectObj as any).customerName
      : undefined;

  // Extract GPS from metaFields (KimaiMobileGPSInfoBundle or standard)
  const gpsStartLocation = activeTimesheet?.metaFields?.find((m) => m.name === 'gps_start_location')?.value;
  const gpsLat = activeTimesheet?.metaFields?.find((m) => m.name === 'latitude' || m.name === 'geo_lat')?.value;
  const gpsLon = activeTimesheet?.metaFields?.find((m) => m.name === 'longitude' || m.name === 'geo_long')?.value;
  const gpsDisplay = gpsStartLocation || (gpsLat && gpsLon ? `${gpsLat}, ${gpsLon}` : null);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {activeTimesheet ? (
          <motion.div
            key="running-timer"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-emerald-500/30 p-5 shadow-2xl shadow-emerald-500/10"
          >
            {/* Ambient Background Glow */}
            <div
              className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ backgroundColor: projectColor }}
            />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

            {/* Status Header */}
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
                  En progreso
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {new Date(activeTimesheet.begin).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Big Digital Stopwatch */}
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-1 font-mono tracking-tight select-none">
                <span className="text-5xl sm:text-6xl font-extrabold text-white">
                  {time.hours}
                </span>
                <span className="text-3xl sm:text-4xl font-light text-slate-500 animate-pulse">:</span>
                <span className="text-5xl sm:text-6xl font-extrabold text-white">
                  {time.minutes}
                </span>
                <span className="text-3xl sm:text-4xl font-light text-slate-500 animate-pulse">:</span>
                <span className="text-5xl sm:text-6xl font-extrabold text-emerald-400">
                  {time.seconds}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                Horas · Minutos · Segundos
              </p>
            </div>

            {/* Task Context Card */}
            <div className="rounded-2xl bg-slate-950/60 border border-slate-800/90 p-3.5 space-y-2.5 mb-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: projectColor }}
                    />
                    <h3 className="text-sm font-bold text-white truncate">{projectName}</h3>
                  </div>

                  <p className="text-xs font-medium text-slate-300 mt-0.5 ml-4.5 truncate">
                    {activityName}
                  </p>

                  {customerName && (
                    <p className="text-[11px] text-slate-500 ml-4.5 truncate">{customerName}</p>
                  )}
                </div>
              </div>

              {/* Description if present */}
              {activeTimesheet.description && (
                <p className="text-xs text-slate-300 italic bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60">
                  "{activeTimesheet.description}"
                </p>
              )}

              {/* Badges: Tags & GPS Telemetry */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                {/* GPS Tag */}
                {(gpsDisplay || gpsCoords) && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>
                      GPS {gpsDisplay ? gpsDisplay : `${gpsCoords?.latitude.toFixed(4)}, ${gpsCoords?.longitude.toFixed(4)}`}
                    </span>
                  </div>
                )}

                {/* Tags */}
                {activeTimesheet.tags && activeTimesheet.tags.length > 0 && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span className="truncate max-w-[200px]">
                      {Array.isArray(activeTimesheet.tags)
                        ? activeTimesheet.tags.join(', ')
                        : String(activeTimesheet.tags)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stop Action Button */}
            <button
              onClick={onStop}
              disabled={isStopping}
              className="w-full relative flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-500 text-white font-bold py-3.5 shadow-lg shadow-rose-900/30 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>{isStopping ? 'Deteniendo sesión...' : 'Detener y Guardar Tarea'}</span>
            </button>
          </motion.div>
        ) : (
          /* Empty / Standby State with Fast Launcher */
          <motion.div
            key="idle-timer"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 shadow-xl space-y-4"
          >
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner mb-3">
                <Clock className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-white">Listo para cronometrar</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Inicia una nueva tarea en tu servidor Kimai con captura GPS automática para plugins.
              </p>
            </div>

            {/* Prominent Start Button */}
            <button
              onClick={onStartNew}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Iniciar Nueva Tarea</span>
            </button>

            {/* Quick Resume from Recent Tasks */}
            {recentTasks.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Reanudar recientes
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {recentTasks.slice(0, 3).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => onResumeTask(item.projectId, item.activityId)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 text-left transition group active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color || '#10B981' }}
                          />
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 truncate">
                            {item.projectName}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 ml-3.5 truncate">{item.activityName}</p>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-900 text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition">
                        <Play className="w-3 h-3 fill-current" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

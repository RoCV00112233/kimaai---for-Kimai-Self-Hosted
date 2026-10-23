import React, { useState, useMemo } from 'react';
import { KimaiActivity, KimaiProject, KimaiTimesheet } from '../types/kimai';
import { Clock, Play, MapPin, Search, Calendar, Tag, Trash2, ExternalLink } from 'lucide-react';

interface TimesheetHistoryProps {
  timesheets: KimaiTimesheet[];
  onResume: (projectId: number, activityId: number, description?: string) => void;
  onDelete?: (id: number) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
  projects?: KimaiProject[];
  activities?: KimaiActivity[];
}

export const TimesheetHistory: React.FC<TimesheetHistoryProps> = ({
  timesheets = [],
  onResume,
  onDelete,
  isLoading,
  onRefresh,
  projects = [],
  activities = [],
}) => {
  const [filterQuery, setFilterQuery] = useState<string>('');

  const getProjectInfo = (sheet: KimaiTimesheet) => {
    if (sheet.project && typeof sheet.project === 'object') {
      return {
        name: sheet.project.name || 'Proyecto',
        color: sheet.project.color || '#10B981',
        id: sheet.project.id,
      };
    }
    const id = Number(sheet.project);
    const found = projects.find((p) => p.id === id);
    return {
      name: found?.name || (id ? `Proyecto #${id}` : 'Sin proyecto'),
      color: found?.color || '#10B981',
      id: id || 0,
    };
  };

  const getActivityInfo = (sheet: KimaiTimesheet) => {
    if (sheet.activity && typeof sheet.activity === 'object') {
      return {
        name: sheet.activity.name || 'Actividad',
        id: sheet.activity.id,
      };
    }
    const id = Number(sheet.activity);
    const found = activities.find((a) => a.id === id);
    return {
      name: found?.name || (id ? `Actividad #${id}` : 'Sin actividad'),
      id: id || 0,
    };
  };

  // Group timesheets by date (Hoy, Ayer, Fecha)
  const grouped = useMemo(() => {
    const groups: { [key: string]: KimaiTimesheet[] } = {};

    const filtered = (timesheets || []).filter((t) => {
      if (!t || !t.begin) return false;
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      const proj = getProjectInfo(t);
      const act = getActivityInfo(t);
      const desc = t.description || '';
      return (
        proj.name.toLowerCase().includes(q) ||
        act.name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q)
      );
    });

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.toDateString();

    filtered.forEach((t) => {
      const d = new Date(t.begin);
      const dStr = d.toDateString();

      let groupLabel = '';
      if (dStr === todayStr) {
        groupLabel = 'Hoy';
      } else if (dStr === yesterdayStr) {
        groupLabel = 'Ayer';
      } else {
        groupLabel = d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[groupLabel]) {
        groups[groupLabel] = [];
      }
      groups[groupLabel].push(t);
    });

    return groups;
  }, [timesheets, filterQuery]);

  // Format seconds to '2h 15m'
  const formatDuration = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${seconds % 60}s`;
  };

  // Format time '14:30'
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Total seconds today
  const totalTodaySeconds = useMemo(() => {
    const todayEntries = grouped['Hoy'] || [];
    return todayEntries.reduce((sum, item) => sum + (item.duration || 0), 0);
  }, [grouped]);

  return (
    <div className="w-full space-y-4">
      {/* Header bar & stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Historial de Registros</span>
          </h2>
          <p className="text-xs text-slate-400">
            Total registrado hoy:{' '}
            <span className="font-semibold text-emerald-400">{formatDuration(totalTodaySeconds)}</span>
          </p>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por proyecto, actividad..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Grouped Timesheet List */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([dateLabel, items]) => {
          const groupTotal = items.reduce((acc, curr) => acc + (curr.duration || 0), 0);

          return (
            <div key={dateLabel} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {dateLabel}
                </span>
                <span className="text-slate-500">{formatDuration(groupTotal)}</span>
              </div>

              <div className="space-y-2">
                {items.map((sheet) => {
                  const proj = getProjectInfo(sheet);
                  const act = getActivityInfo(sheet);
                  const projName = proj.name;
                  const projColor = proj.color;
                  const actName = act.name;
                  const projId = proj.id;
                  const actId = act.id;

                  const gpsLoc =
                    sheet.metaFields?.find((m) => m.name === 'gps_start_location' || m.name === 'gps_stop_location')?.value ||
                    (sheet.metaFields?.find((m) => m.name === 'latitude' || m.name === 'geo_lat')?.value
                      ? `${sheet.metaFields.find((m) => m.name === 'latitude' || m.name === 'geo_lat')?.value}, ${sheet.metaFields.find((m) => m.name === 'longitude' || m.name === 'geo_long')?.value}`
                      : null);

                  return (
                    <div
                      key={sheet.id}
                      className="group relative rounded-2xl bg-slate-900/70 border border-slate-800/80 p-3.5 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Project & Activity */}
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: projColor }}
                            />
                            <h3 className="text-xs font-bold text-white truncate">{projName}</h3>
                          </div>

                          <p className="text-[11px] font-medium text-slate-300 mt-0.5 ml-4.5 truncate">
                            {actName}
                          </p>

                          {/* Description */}
                          {sheet.description && (
                            <p className="text-xs text-slate-400 italic mt-1.5 ml-4.5">
                              {sheet.description}
                            </p>
                          )}

                          {/* Metadata row: time interval, tags, GPS */}
                          <div className="flex flex-wrap items-center gap-2 mt-2 ml-4.5 text-[11px] text-slate-400">
                            <span>
                              {formatTime(sheet.begin)} - {formatTime(sheet.end)}
                            </span>

                            {gpsLoc && (
                              <span className="flex items-center gap-0.5 text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <MapPin className="w-2.5 h-2.5" />
                                {gpsLoc}
                              </span>
                            )}

                            {sheet.tags && sheet.tags.length > 0 && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <Tag className="w-2.5 h-2.5" />
                                {Array.isArray(sheet.tags) ? sheet.tags.join(', ') : sheet.tags}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: Duration & Resume action */}
                        <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            {formatDuration(sheet.duration)}
                          </span>

                          <button
                            onClick={() => onResume(projId, actId, sheet.description)}
                            className="mt-2 p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-slate-700/60 transition cursor-pointer"
                            title="Reanudar esta tarea"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
            {isLoading ? 'Cargando registros...' : 'No hay registros de tiempo en el periodo seleccionado'}
          </div>
        )}
      </div>
    </div>
  );
};

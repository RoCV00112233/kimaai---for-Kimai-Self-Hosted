import React, { useState, useMemo } from 'react';
import {
  GPSCoords,
  GPSPluginMode,
  KimaiActivity,
  KimaiCustomer,
  KimaiProject,
} from '../types/kimai';
import {
  X,
  Play,
  Search,
  MapPin,
  Tag,
  AlertCircle,
  RefreshCw,
  Sliders,
  Check,
  ChevronDown,
  Users,
  Briefcase,
} from 'lucide-react';

interface StartTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: KimaiProject[];
  activities: KimaiActivity[];
  customers: KimaiCustomer[];
  tags: string[];
  gpsCoords: GPSCoords | null;
  gpsLoading: boolean;
  onRefreshGps: () => void;
  onRefreshCatalog?: () => Promise<void>;
  isRefreshingCatalog?: boolean;
  onStart: (params: {
    projectId: number;
    activityId: number;
    description?: string;
    tags?: string[];
    gpsCoords?: GPSCoords | null;
  }) => Promise<void>;
  defaultProjectId?: number;
  defaultActivityId?: number;
  defaultDescription?: string;
  gpsPluginMode: GPSPluginMode;
  onChangeGpsPluginMode: (mode: GPSPluginMode) => void;
}

export const StartTaskModal: React.FC<StartTaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  activities,
  customers,
  tags,
  gpsCoords,
  gpsLoading,
  onRefreshGps,
  onStart,
  defaultProjectId,
  defaultActivityId,
  defaultDescription,
  gpsPluginMode,
  onChangeGpsPluginMode,
  onRefreshCatalog,
  isRefreshingCatalog = false,
}) => {
  // Find customer of default project if passed
  const initialCustomerId = useMemo(() => {
    if (defaultProjectId) {
      const p = projects.find((proj) => proj.id === defaultProjectId);
      if (p && p.customer) return p.customer;
    }
    return 'all';
  }, [defaultProjectId, projects]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'all'>(initialCustomerId);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(
    defaultProjectId || projects[0]?.id
  );
  const [selectedActivityId, setSelectedActivityId] = useState<number | undefined>(
    defaultActivityId || activities[0]?.id
  );
  const [description, setDescription] = useState<string>(defaultDescription || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchCustomerQuery, setSearchCustomerQuery] = useState<string>('');
  const [searchProjectQuery, setSearchProjectQuery] = useState<string>('');
  const [includeGps, setIncludeGps] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvancedGps, setShowAdvancedGps] = useState<boolean>(false);

  // Map project count per customer
  const projectCountByCustomer = useMemo(() => {
    const map: Record<number, number> = {};
    projects.forEach((p) => {
      if (p.customer) {
        map[p.customer] = (map[p.customer] || 0) + 1;
      }
    });
    return map;
  }, [projects]);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!searchCustomerQuery.trim()) return customers;
    const q = searchCustomerQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.number && c.number.toLowerCase().includes(q)) ||
        (c.comment && c.comment.toLowerCase().includes(q))
    );
  }, [customers, searchCustomerQuery]);

  // Filter projects by customer and search
  const filteredProjects = useMemo(() => {
    let list = projects;
    if (selectedCustomerId !== 'all' && selectedCustomerId !== undefined) {
      list = list.filter((p) => p.customer === selectedCustomerId);
    }
    if (!searchProjectQuery.trim()) return list;
    const q = searchProjectQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.orderNumber && p.orderNumber.toLowerCase().includes(q))
    );
  }, [projects, selectedCustomerId, searchProjectQuery]);

  // Filter activities relevant to project or global activities
  const relevantActivities = useMemo(() => {
    if (!selectedProjectId) return activities;
    return activities.filter(
      (a) => !a.project || a.project === selectedProjectId || a.project === null
    );
  }, [activities, selectedProjectId]);

  // If user selects a customer, update filtered projects and select first project
  const handleSelectCustomer = (custId: number | 'all') => {
    setSelectedCustomerId(custId);
    if (custId === 'all') return;
    const custProjects = projects.filter((p) => p.customer === custId);
    if (custProjects.length > 0 && (!selectedProjectId || !custProjects.some((p) => p.id === selectedProjectId))) {
      handleSelectProject(custProjects[0].id);
    }
  };

  // If selected activity is not valid for newly selected project, reset it
  const handleSelectProject = (projId: number) => {
    setSelectedProjectId(projId);
    const proj = projects.find((p) => p.id === projId);
    if (proj && proj.customer && selectedCustomerId !== 'all' && selectedCustomerId !== proj.customer) {
      setSelectedCustomerId(proj.customer);
    }
    const valid = activities.filter((a) => !a.project || a.project === projId);
    if (valid.length > 0 && (!selectedActivityId || !valid.some((a) => a.id === selectedActivityId))) {
      setSelectedActivityId(valid[0].id);
    }
  };

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !selectedActivityId) {
      setErrorMessage('Por favor selecciona un Proyecto y una Actividad.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onStart({
        projectId: selectedProjectId,
        activityId: selectedActivityId,
        description: description.trim(),
        tags: selectedTags,
        gpsCoords: includeGps ? gpsCoords : null,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to start timesheet:', err);
      setErrorMessage(err.message || 'No se pudo iniciar la tarea en Kimai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Iniciar Tarea</h2>
              <p className="text-[11px] text-slate-400">Selecciona cliente, proyecto, actividad y telemetría</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefreshCatalog && (
              <button
                type="button"
                onClick={onRefreshCatalog}
                disabled={isRefreshingCatalog}
                className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
                title="Actualizar clientes, proyectos y actividades desde Kimai"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingCatalog ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleStart} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Refreshing Banner */}
          {isRefreshingCatalog && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 flex items-center gap-2 text-xs text-amber-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              <span>Sincronizando clientes, proyectos y actividades más recientes...</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Error al iniciar en Kimai</p>
                <p className="mt-0.5">{errorMessage}</p>
                <p className="mt-1 text-[11px] text-rose-400/80">
                  Si tu servidor tiene plugin GPS estricto, prueba cambiando el "Modo de Plugin GPS" abajo a "Smart" o "MetaFields".
                </p>
              </div>
            </div>
          )}

          {/* Customer Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Cliente</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  ({customers.length > 0 ? `${customers.length} disponibles` : 'Sin clientes registrados'})
                </span>
              </label>

              {selectedCustomerId !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleSelectCustomer('all')}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Ver todos
                </button>
              )}
            </div>

            {customers.length > 3 && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchCustomerQuery}
                  onChange={(e) => setSearchCustomerQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-1 space-y-1">
              {/* Option: Todos los clientes */}
              <button
                type="button"
                onClick={() => handleSelectCustomer('all')}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                  selectedCustomerId === 'all'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Todos los Clientes</span>
                </div>
                <span className="text-[10px] text-slate-500">{projects.length} proyectos</span>
              </button>

              {/* Individual customers */}
              {filteredCustomers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                const count = projectCountByCustomer[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color || '#F59E0B' }}
                      />
                      <span className="truncate">{c.name}</span>
                      {c.number && (
                        <span className="text-[10px] text-slate-500 font-mono">#{c.number}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">
                        {count} {count === 1 ? 'proyecto' : 'proyectos'}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}

              {filteredCustomers.length === 0 && customers.length > 0 && (
                <p className="p-3 text-center text-xs text-slate-500">No se encontraron clientes</p>
              )}
            </div>
          </div>

          {/* Project Selector with search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>Proyecto <span className="text-emerald-400">*</span></span>
              </label>
              {selectedCustomerId !== 'all' && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Filtrado por cliente
                </span>
              )}
            </div>

            {/* Quick search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar proyecto o cliente..."
                value={searchProjectQuery}
                onChange={(e) => setSearchProjectQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-1 space-y-1">
              {filteredProjects.map((p) => {
                const isSelected = selectedProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProject(p.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.color || '#10B981' }}
                      />
                      <span className="truncate">{p.name}</span>
                    </div>

                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
              {filteredProjects.length === 0 && (
                <p className="p-3 text-center text-xs text-slate-500">No se encontraron proyectos</p>
              )}
            </div>
          </div>

          {/* Activity Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Actividad <span className="text-emerald-400">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-1">
              {relevantActivities.map((a) => {
                const isSelected = selectedActivityId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedActivityId(a.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: a.color || '#06B6D4' }}
                      />
                      <span className="truncate">{a.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descripción (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="¿Qué estás desarrollando o realizando?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Etiquetas / Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const active = selectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-medium'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GPS Plugin & Telemetry Section */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-white">Telemetría GPS para Kimai</h4>
                  <p className="text-[11px] text-slate-400">
                    Soporte para plugin de GeoTracking y validación de posición
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGps}
                  onChange={(e) => setIncludeGps(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {includeGps && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Coordenadas del sensor:</span>
                  <div className="flex items-center gap-1.5">
                    {gpsCoords ? (
                      <span className="font-mono text-emerald-400 text-[11px]">
                        {gpsCoords.latitude.toFixed(5)}, {gpsCoords.longitude.toFixed(5)} (±{Math.round(gpsCoords.accuracy || 10)}m)
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[11px]">Buscando señal...</span>
                    )}
                    <button
                      type="button"
                      onClick={onRefreshGps}
                      disabled={gpsLoading}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                      title="Actualizar posición GPS"
                    >
                      <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Advanced plugin mode toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedGps(!showAdvancedGps)}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Modo de compatibilidad con plugins Kimai:</span>
                  <span className="font-semibold text-emerald-400 uppercase">{gpsPluginMode}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedGps ? 'rotate-180' : ''}`} />
                </button>

                {showAdvancedGps && (
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                    <p className="text-[11px] text-slate-400 mb-1">
                      Elige el formato de payload esperado por el plugin de tu servidor:
                    </p>
                    {[
                      { mode: 'smart', label: 'Smart Dual (Recomendado)', desc: 'Envía campos raíz y metaFields simultáneos' },
                      { mode: 'metaFields', label: 'MetaFields Kimai 2', desc: 'latitude y longitude dentro de metaFields[]' },
                      { mode: 'rootFields', label: 'Campos Raíz Directos', desc: 'latitude, longitude en json raíz' },
                      { mode: 'legacy', label: 'GeoTracking Legacy', desc: 'geo_lat y geo_long' },
                    ].map((item) => (
                      <label
                        key={item.mode}
                        className={`flex items-start gap-2 p-1.5 rounded-lg border cursor-pointer ${
                          gpsPluginMode === item.mode
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                            : 'border-slate-800 text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="gpsPluginMode"
                          value={item.mode}
                          checked={gpsPluginMode === item.mode}
                          onChange={() => onChangeGpsPluginMode(item.mode as GPSPluginMode)}
                          className="mt-0.5 text-emerald-500"
                        />
                        <div>
                          <p className="font-semibold text-xs text-slate-200">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProjectId || !selectedActivityId}
              className="flex-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'Iniciando en Kimai...' : 'Iniciar Tarea'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

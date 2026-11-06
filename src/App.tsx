import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  GPSCoords,
  GPSPluginMode,
  KimaiActivity,
  KimaiConfig,
  KimaiCustomer,
  KimaiProject,
  KimaiTimesheet,
  KimaiUser,
} from './types/kimai';
import {
  clearStoredConfig,
  DEFAULT_CONFIG,
  hydrateStoredConfig,
  loadStoredConfig,
  saveStoredConfig,
  saveStoredConfigAsync,
} from './services/storage';
import { KimaiApiClient } from './services/kimaiApi';
import { useGeolocation } from './hooks/useGeolocation';
import { Header } from './components/Header';
import { ActiveTimer } from './components/ActiveTimer';
import { StartTaskModal, isMandatoryMovilTag } from './components/StartTaskModal';
import { TimesheetHistory } from './components/TimesheetHistory';
import { GpsDiagnostics } from './components/GpsDiagnostics';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { BottomNav, NavTab } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SetupScreen } from './components/SetupScreen';
import { PullToRefresh } from './components/PullToRefresh';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface SecurityAuditResult {
  isRooted: boolean;
  isDebuggable: boolean;
  indicators: string[];
}

interface SecurityAuditPlugin {
  checkDeviceSecurity(): Promise<SecurityAuditResult>;
}

const SecurityAudit = registerPlugin<SecurityAuditPlugin>('SecurityAudit');

export default function App() {
  const [config, setConfig] = useState<KimaiConfig>(loadStoredConfig);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('timer');
  const [user, setUser] = useState<KimaiUser | null>(null);
  const [activeTimesheet, setActiveTimesheet] = useState<KimaiTimesheet | null>(null);
  const [recentTimesheets, setRecentTimesheets] = useState<KimaiTimesheet[]>([]);
  const [projects, setProjects] = useState<KimaiProject[]>([]);
  const [activities, setActivities] = useState<KimaiActivity[]>([]);
  const [customers, setCustomers] = useState<KimaiCustomer[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  // Modals state
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [resumeDefaults, setResumeDefaults] = useState<{
    projectId?: number;
    activityId?: number;
    description?: string;
  }>({});

  // Geolocation hook
  const { coords: gpsCoords, isLoading: gpsLoading, refreshLocation } = useGeolocation(true);

  // Hydrate AES-GCM encrypted credentials and check Android device integrity on mount
  useEffect(() => {
    let active = true;

    hydrateStoredConfig()
      .then((hydrated) => {
        if (!active) return;
        setConfig(hydrated);
        setIsHydrated(true);
      })
      .catch(() => {
        if (active) setIsHydrated(true);
      });

    if (Capacitor.isNativePlatform()) {
      SecurityAudit.checkDeviceSecurity()
        .then((res) => {
          if (!active) return;
          if (res?.isRooted) {
            setSecurityWarning(
              'Advertencia de seguridad: Se detectó acceso Root o entorno modificado en el dispositivo. Protege tu Token de API.'
            );
          }
        })
        .catch(() => {
          // Plugin unavailable on web or older shells
        });
    }

    return () => {
      active = false;
    };
  }, []);

  // Kimai API Client instance
  const apiClient = useMemo(() => new KimaiApiClient(config), [config]);

  // Keep screen awake via Screen Wake Lock API when timer is active
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    if (activeTimesheet && config.keepScreenAwake && 'wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((lock) => {
          wakeLockRef.current = lock;
        })
        .catch(() => {});
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [activeTimesheet, config.keepScreenAwake]);

  // Play subtle feedback chime using Web Audio API
  const playSound = useCallback(
    (type: 'start' | 'stop') => {
      if (!config.soundAlerts || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'start') {
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        } else {
          osc.frequency.setValueAtTime(660, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch (e) {
        console.warn('Audio playback not supported:', e);
      }
    },
    [config.soundAlerts]
  );

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [userRes, activeRes, projsRes, actsRes, custsRes, tagsRes, recentRes] =
        await Promise.allSettled([
          apiClient.getCurrentUser(),
          apiClient.getActiveTimesheets(),
          apiClient.getProjects(),
          apiClient.getActivities(),
          apiClient.getCustomers(),
          apiClient.getTags(),
          apiClient.getRecentTimesheets(30),
        ]);

      if (userRes.status === 'fulfilled') setUser(userRes.value);
      if (activeRes.status === 'fulfilled') {
        setActiveTimesheet(Array.isArray(activeRes.value) ? activeRes.value[0] || null : null);
      }
      if (projsRes.status === 'fulfilled' && Array.isArray(projsRes.value)) {
        setProjects(projsRes.value);
      } else {
        setProjects([]);
      }
      if (actsRes.status === 'fulfilled' && Array.isArray(actsRes.value)) {
        setActivities(actsRes.value);
      } else {
        setActivities([]);
      }
      if (custsRes.status === 'fulfilled' && Array.isArray(custsRes.value)) {
        setCustomers(custsRes.value);
      } else {
        setCustomers([]);
      }
      if (tagsRes.status === 'fulfilled' && Array.isArray(tagsRes.value)) {
        setTags(tagsRes.value);
      } else {
        setTags([]);
      }
      if (recentRes.status === 'fulfilled' && Array.isArray(recentRes.value)) {
        setRecentTimesheets(recentRes.value);
      } else {
        setRecentTimesheets([]);
      }

      if (activeRes.status === 'rejected' && !config.isDemoMode) {
        setErrorBanner(
          `No se pudo conectar a Kimai: ${(activeRes.reason as any)?.message || 'Verifica tus credenciales en Ajustes'}`
        );
      }
    } catch (err: any) {
      if (!config.isDemoMode) {
        setErrorBanner(err.message || 'Error al conectar con servidor Kimai.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, config.isDemoMode]);

  useEffect(() => {
    if (!isHydrated || !config.isConfigured) return;
    fetchData();
    if (config.gpsEnabled) {
      refreshLocation();
    }
  }, [fetchData, refreshLocation, isHydrated, config.isConfigured, config.gpsEnabled]);

  // Periodic polling for active timesheet
  useEffect(() => {
    if (!isHydrated || !config.isConfigured) return;
    const intervalSec = config.autoRefreshInterval || 30;
    const interval = setInterval(async () => {
      try {
        const active = await apiClient.getActiveTimesheets();
        if (Array.isArray(active)) {
          setActiveTimesheet(active[0] || null);
        }
      } catch {
        // quiet error on background poll
      }
    }, intervalSec * 1000);

    return () => clearInterval(interval);
  }, [apiClient, config.autoRefreshInterval, config.isConfigured, isHydrated]);

  // Helper to obtain fresh device coordinates with bounded wait before fallback
  const resolveGpsForAction = useCallback(
    async (provided?: GPSCoords | null, maxWaitMs: number = 6000): Promise<GPSCoords | null> => {
      const isFreshDevice = (c: GPSCoords | null | undefined): c is GPSCoords =>
        Boolean(c && c.source === 'device' && Date.now() - c.timestamp < 120_000);

      if (isFreshDevice(provided)) return provided;
      if (isFreshDevice(gpsCoords)) return gpsCoords;

      const fresh = await Promise.race<GPSCoords | null>([
        refreshLocation(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), maxWaitMs)),
      ]);

      if (fresh) return fresh;
      if (provided) return provided;
      if (gpsCoords) return gpsCoords;

      if (config.useFallbackGPS) {
        return {
          latitude: config.fallbackLatitude || 19.432608,
          longitude: config.fallbackLongitude || -99.133209,
          accuracy: 10,
          timestamp: Date.now(),
          source: 'fallback',
        };
      }
      return null;
    },
    [gpsCoords, refreshLocation, config.useFallbackGPS, config.fallbackLatitude, config.fallbackLongitude]
  );

  // Start task handler with live GPS capture and mandatory "movil" tag enforcement
  const handleStartTask = async (params: {
    projectId: number;
    activityId: number;
    description?: string;
    tags?: string[];
    gpsCoords?: GPSCoords | null;
    includeGps?: boolean;
  }) => {
    const shouldUseGps = params.includeGps ?? config.gpsEnabled;
    const mandatoryMovil = tags.filter(isMandatoryMovilTag);
    const finalTags = Array.from(new Set([...mandatoryMovil, ...(params.tags || [])]));

    let coordsToUse: GPSCoords | null = null;
    if (shouldUseGps) {
      coordsToUse = await resolveGpsForAction(params.gpsCoords, 6000);
      if (!coordsToUse && config.requireGPS) {
        throw new Error(
          'Se requiere señal GPS para iniciar la tarea. Verifica que la ubicación esté activada.'
        );
      }
    }

    playSound('start');

    const optimisticBegin = new Date().toISOString();
    const optimisticTimesheet: KimaiTimesheet = {
      id: Date.now(),
      begin: optimisticBegin,
      end: null,
      duration: 0,
      user: user || { id: 1, username: 'yo' },
      project: params.projectId,
      activity: params.activityId,
      description: params.description || '',
      tags: finalTags,
    };
    setActiveTimesheet(optimisticTimesheet);
    setCurrentTab('timer');

    try {
      const started = await apiClient.startTimesheet({
        projectId: params.projectId,
        activityId: params.activityId,
        description: params.description,
        tags: finalTags,
        gpsCoords: coordsToUse,
      });

      setActiveTimesheet(started);
      apiClient
        .getRecentTimesheets(30)
        .then((res) => {
          if (Array.isArray(res)) setRecentTimesheets(res);
        })
        .catch(() => {});
    } catch (err: any) {
      console.error('Failed to start timesheet on server:', err);
      setActiveTimesheet(null);
      setErrorBanner(`Error al iniciar tarea en Kimai: ${err.message}`);
      throw err;
    }
  };

  // Stop task handler with live stop GPS capture
  const handleStopTask = async () => {
    if (!activeTimesheet) return;
    setIsStopping(true);
    setErrorBanner(null);
    try {
      let stopCoords: GPSCoords | null = null;
      if (config.gpsEnabled) {
        stopCoords = await resolveGpsForAction(gpsCoords, 5000);
      }

      await apiClient.stopTimesheet(activeTimesheet.id, stopCoords);
      setActiveTimesheet(null);
      playSound('stop');

      const freshHistory = await apiClient.getRecentTimesheets(30);
      setRecentTimesheets(freshHistory);
    } catch (err: any) {
      setErrorBanner(`Error al detener tarea: ${err.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  // Open start modal with instant catalog refresh
  const handleOpenStartModal = (
    defaults: {
      projectId?: number;
      activityId?: number;
      description?: string;
    } = {}
  ) => {
    setResumeDefaults(defaults);
    setIsStartModalOpen(true);
    fetchData();
  };

  const handleResumeTask = (projectId: number, activityId: number, desc?: string) => {
    handleOpenStartModal({
      projectId,
      activityId,
      description: desc,
    });
  };

  const handleSaveConfig = async (newConfig: KimaiConfig) => {
    setConfig(newConfig);
    await saveStoredConfigAsync(newConfig);
    setTimeout(() => fetchData(), 100);
  };

  const handleUpdateConfigPartial = (updated: Partial<KimaiConfig>) => {
    const merged = { ...config, ...updated };
    setConfig(merged);
    saveStoredConfig(merged);
  };

  const handleToggleDemoMode = () => {
    const nextMode = !config.isDemoMode;
    handleUpdateConfigPartial({ isDemoMode: nextMode });
  };

  const handleLogout = async () => {
    await clearStoredConfig();
    setUser(null);
    setActiveTimesheet(null);
    setRecentTimesheets([]);
    setProjects([]);
    setActivities([]);
    setCustomers([]);
    setTags([]);
    setErrorBanner(null);
    setConfig(DEFAULT_CONFIG);
  };

  const handleTestConnection = async (cfg: KimaiConfig) => {
    const tempClient = new KimaiApiClient(cfg);
    const pingRes = await tempClient.ping();
    const userRes = await tempClient.getCurrentUser();
    return {
      success: true,
      message: `Conectado exitosamente con Kimai (${pingRes.message || 'OK'}). Usuario: ${userRes.username} (${userRes.alias || ''})`,
      user: userRes,
    };
  };

  const recentQuickTasks = useMemo(() => {
    const list: Array<{
      projectId: number;
      projectName: string;
      activityId: number;
      activityName: string;
      color?: string;
    }> = [];

    const seen = new Set<string>();

    (recentTimesheets || []).forEach((t) => {
      if (!t) return;
      const pId =
        typeof t.project === 'object' && t.project !== null ? t.project.id : Number(t.project);
      const aId =
        typeof t.activity === 'object' && t.activity !== null ? t.activity.id : Number(t.activity);
      if (!pId || !aId) return;
      const key = `${pId}-${aId}`;

      if (!seen.has(key)) {
        seen.add(key);
        const foundProj = projects.find((p) => p.id === pId);
        const foundAct = activities.find((a) => a.id === aId);

        const pName =
          foundProj?.name ||
          (typeof t.project === 'object' && t.project !== null
            ? t.project.name
            : `Proyecto #${pId}`);
        const pColor =
          foundProj?.color ||
          (typeof t.project === 'object' && t.project !== null ? t.project.color : '#10B981');
        const aName =
          foundAct?.name ||
          (typeof t.activity === 'object' && t.activity !== null
            ? t.activity.name
            : `Actividad #${aId}`);

        list.push({
          projectId: pId,
          projectName: pName,
          activityId: aId,
          activityName: aName,
          color: pColor,
        });
      }
    });

    return list.slice(0, 4);
  }, [recentTimesheets, projects, activities]);

  const handleSaveInitialConfig = async (newConfig: KimaiConfig) => {
    const tempClient = new KimaiApiClient(newConfig);
    await tempClient.ping();
    await tempClient.getCurrentUser();
    await saveStoredConfigAsync(newConfig);
    setConfig(newConfig);
  };

  const handleStartDemo = async () => {
    const demoCfg: KimaiConfig = {
      ...config,
      isDemoMode: true,
      isConfigured: true,
    };
    await saveStoredConfigAsync(demoCfg);
    setConfig(demoCfg);
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#070a11] text-slate-300 flex items-center justify-center p-4">
        <div className="text-xs font-mono text-slate-400">Inicializando Kimaai...</div>
      </div>
    );
  }

  if (!config.isConfigured) {
    return <SetupScreen onSave={handleSaveInitialConfig} onStartDemo={handleStartDemo} />;
  }

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <OfflineIndicator />

      <PullToRefresh onRefresh={fetchData} isRefreshing={isLoading}>
        <Header
          config={config}
          user={user}
          gpsCoords={gpsCoords}
          gpsLoading={gpsLoading}
          onRefreshGps={refreshLocation}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenAbout={() => setIsAboutModalOpen(true)}
          onToggleDemoMode={handleToggleDemoMode}
        />

        {/* Root / Environment Security Warning Banner */}
        {securityWarning && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-2 max-w-xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{securityWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setSecurityWarning(null)}
              className="text-[11px] underline text-amber-300 hover:text-white shrink-0 cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        )}

        {/* Error banner if connection or action failed */}
        {errorBanner && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between gap-2 max-w-xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{errorBanner}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleDemoMode}
                className="text-[11px] underline text-rose-200 hover:text-white cursor-pointer"
              >
                Usar Modo Demo
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[11px] font-medium cursor-pointer"
              >
                Ajustes
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-xl w-full mx-auto p-4 pb-28 space-y-5">
          {currentTab === 'timer' && (
            <div className="space-y-5">
              <ActiveTimer
                activeTimesheet={activeTimesheet}
                onStop={handleStopTask}
                onStartNew={() => handleOpenStartModal({})}
                onResumeTask={handleResumeTask}
                recentTasks={recentQuickTasks}
                isStopping={isStopping}
                gpsCoords={gpsCoords}
                projects={projects}
                activities={activities}
              />

              <div className="pt-2">
                <TimesheetHistory
                  timesheets={recentTimesheets.slice(0, 10)}
                  onResume={handleResumeTask}
                  isLoading={isLoading}
                  onRefresh={fetchData}
                  projects={projects}
                  activities={activities}
                />
              </div>
            </div>
          )}

          {currentTab === 'history' && (
            <TimesheetHistory
              timesheets={recentTimesheets}
              onResume={handleResumeTask}
              isLoading={isLoading}
              onRefresh={fetchData}
              projects={projects}
              activities={activities}
            />
          )}

          {currentTab === 'gps' && (
            <GpsDiagnostics
              config={config}
              onUpdateConfig={handleUpdateConfigPartial}
              gpsCoords={gpsCoords}
              gpsLoading={gpsLoading}
              onRefreshGps={refreshLocation}
            />
          )}
        </main>
      </PullToRefresh>

      {/* Start Task Modal */}
      <StartTaskModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        projects={projects}
        activities={activities}
        customers={customers}
        tags={tags}
        gpsCoords={gpsCoords}
        gpsLoading={gpsLoading}
        gpsEnabled={config.gpsEnabled}
        onRefreshGps={refreshLocation}
        onRefreshCatalog={fetchData}
        isRefreshingCatalog={isLoading}
        onStart={handleStartTask}
        defaultProjectId={resumeDefaults.projectId}
        defaultActivityId={resumeDefaults.activityId}
        defaultDescription={resumeDefaults.description}
        gpsPluginMode={config.gpsPluginMode}
        onChangeGpsPluginMode={(mode: GPSPluginMode) =>
          handleUpdateConfigPartial({ gpsPluginMode: mode })
        }
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onTestConnection={handleTestConnection}
        onLogout={handleLogout}
      />

      {/* About Modal */}
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        hasActiveTimer={Boolean(activeTimesheet)}
      />
    </div>
  );
}

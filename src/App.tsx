import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { loadStoredConfig, saveStoredConfig } from './services/storage';
import { KimaiApiClient } from './services/kimaiApi';
import { useGeolocation } from './hooks/useGeolocation';
import { Header } from './components/Header';
import { ActiveTimer } from './components/ActiveTimer';
import { StartTaskModal } from './components/StartTaskModal';
import { TimesheetHistory } from './components/TimesheetHistory';
import { GpsDiagnostics } from './components/GpsDiagnostics';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { BottomNav, NavTab } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SetupScreen } from './components/SetupScreen';
import { AlertCircle, RefreshCw, Zap } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<KimaiConfig>(loadStoredConfig);
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
        .catch(() => {
          // Wake lock request failed or unpermitted
        });
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
      // Fetch active timer, user profile, projects, activities, customers, tags, history in parallel
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

      // Check if primary calls failed
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
    if (!config.isConfigured) return;
    fetchData();
    // Refresh GPS on startup in background
    refreshLocation();
  }, [fetchData, refreshLocation, config.isConfigured]);

  // Periodic polling for active timesheet
  useEffect(() => {
    if (!config.isConfigured) return;
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
  }, [apiClient, config.autoRefreshInterval, config.isConfigured]);

  // Start task handler with GPS coordinates and instant feedback
  const handleStartTask = async (params: {
    projectId: number;
    activityId: number;
    description?: string;
    tags?: string[];
    gpsCoords?: GPSCoords | null;
  }) => {
    // 1. Play sound immediately (< 10ms feedback)
    playSound('start');

    // 2. Optimistic UI update so stopwatch begins immediately
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
      tags: params.tags || [],
    };
    setActiveTimesheet(optimisticTimesheet);
    setCurrentTab('timer');

    // 3. Fast GPS coordinate determination (never wait 10 seconds!)
    const coordsToUse = params.gpsCoords || gpsCoords || (config.useFallbackGPS ? {
      latitude: config.fallbackLatitude || 19.432608,
      longitude: config.fallbackLongitude || -99.133209,
      accuracy: 10,
      timestamp: Date.now(),
      source: 'fallback' as const,
    } : null);

    // 4. Send API call in background
    try {
      const started = await apiClient.startTimesheet({
        projectId: params.projectId,
        activityId: params.activityId,
        description: params.description,
        tags: params.tags,
        gpsCoords: coordsToUse,
      });

      // Update with server confirmed timesheet
      setActiveTimesheet(started);
      // Refresh history in background
      apiClient.getRecentTimesheets(30).then((res) => {
        if (Array.isArray(res)) setRecentTimesheets(res);
      }).catch(() => {});
    } catch (err: any) {
      console.error('Failed to start timesheet on server:', err);
      // Rollback optimistic active timer if server rejected
      setActiveTimesheet(null);
      alert(`Error al iniciar tarea en Kimai: ${err.message}`);
    }
  };

  // Stop task handler
  const handleStopTask = async () => {
    if (!activeTimesheet) return;
    setIsStopping(true);
    try {
      await apiClient.stopTimesheet(activeTimesheet.id);
      setActiveTimesheet(null);
      playSound('stop');
      // Refresh recent timesheets
      const freshHistory = await apiClient.getRecentTimesheets(30);
      setRecentTimesheets(freshHistory);
    } catch (err: any) {
      alert(`Error al detener tarea: ${err.message}`);
    } finally {
      setIsStopping(false);
    }
  };

  // Quick resume task
  const handleResumeTask = (projectId: number, activityId: number, desc?: string) => {
    setResumeDefaults({
      projectId,
      activityId,
      description: desc,
    });
    setIsStartModalOpen(true);
  };

  // Update configuration
  const handleSaveConfig = (newConfig: KimaiConfig) => {
    setConfig(newConfig);
    saveStoredConfig(newConfig);
    // Reload data with new config
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

  // Connection test
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

  // Extract recent tasks for quick-resume chips safely
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
      const pId = typeof t.project === 'object' && t.project !== null ? t.project.id : Number(t.project);
      const aId = typeof t.activity === 'object' && t.activity !== null ? t.activity.id : Number(t.activity);
      if (!pId || !aId) return;
      const key = `${pId}-${aId}`;

      if (!seen.has(key)) {
        seen.add(key);
        const foundProj = projects.find((p) => p.id === pId);
        const foundAct = activities.find((a) => a.id === aId);

        const pName = foundProj?.name || (typeof t.project === 'object' && t.project !== null ? t.project.name : `Proyecto #${pId}`);
        const pColor = foundProj?.color || (typeof t.project === 'object' && t.project !== null ? t.project.color : '#10B981');
        const aName = foundAct?.name || (typeof t.activity === 'object' && t.activity !== null ? t.activity.name : `Actividad #${aId}`);

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

  // Initial onboarding handlers
  const handleSaveInitialConfig = async (newConfig: KimaiConfig) => {
    const tempClient = new KimaiApiClient(newConfig);
    // Validate connection by pinging
    await tempClient.ping();
    await tempClient.getCurrentUser();
    setConfig(newConfig);
    saveStoredConfig(newConfig);
  };

  const handleStartDemo = () => {
    const demoCfg: KimaiConfig = {
      ...config,
      isDemoMode: true,
      isConfigured: true,
    };
    setConfig(demoCfg);
    saveStoredConfig(demoCfg);
  };

  if (!config.isConfigured) {
    return (
      <SetupScreen
        onSave={handleSaveInitialConfig}
        onStartDemo={handleStartDemo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <OfflineIndicator />

      {/* Header */}
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

      {/* Error banner if connection failed */}
      {errorBanner && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between gap-2 max-w-xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{errorBanner}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleDemoMode}
              className="text-[11px] underline text-rose-200 hover:text-white"
            >
              Usar Modo Demo
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 text-[11px] font-medium"
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
              onStartNew={() => {
                setResumeDefaults({});
                setIsStartModalOpen(true);
              }}
              onResumeTask={handleResumeTask}
              recentTasks={recentQuickTasks}
              isStopping={isStopping}
              gpsCoords={gpsCoords}
              projects={projects}
              activities={activities}
            />

            {/* Quick Timesheet Mini Preview */}
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
        onRefreshGps={refreshLocation}
        onStart={handleStartTask}
        defaultProjectId={resumeDefaults.projectId}
        defaultActivityId={resumeDefaults.activityId}
        defaultDescription={resumeDefaults.description}
        gpsPluginMode={config.gpsPluginMode}
        onChangeGpsPluginMode={(mode: GPSPluginMode) => handleUpdateConfigPartial({ gpsPluginMode: mode })}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onTestConnection={handleTestConnection}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        hasActiveTimer={Boolean(activeTimesheet)}
      />
    </div>
  );
}

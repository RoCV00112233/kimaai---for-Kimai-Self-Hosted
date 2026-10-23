import { KimaiConfig } from '../types/kimai';

const STORAGE_KEY = 'codetimer_kimai_config_v2';

export const DEFAULT_CONFIG: KimaiConfig = {
  baseUrl: '',
  username: '',
  apiToken: '',
  useProxy: false,
  isDemoMode: false,
  isConfigured: false,
  gpsEnabled: true,
  gpsPluginMode: 'smart',
  requireGPS: false,
  useFallbackGPS: true,
  fallbackLatitude: 19.432608,
  fallbackLongitude: -99.133209,
  keepScreenAwake: true,
  soundAlerts: true,
  hapticFeedback: true,
  autoRefreshInterval: 30,
};

export function loadStoredConfig(): KimaiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load stored config, using defaults', err);
  }
  return DEFAULT_CONFIG;
}

export function saveStoredConfig(config: KimaiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save config to localStorage', err);
  }
}

export interface KimaiUser {
  id: number;
  username: string;
  alias?: string;
  title?: string;
  email?: string;
  avatar?: string;
  color?: string;
  roles?: string[];
  preferences?: Record<string, any>;
}

export interface KimaiCustomer {
  id: number;
  name: string;
  number?: string;
  comment?: string;
  visible: boolean;
  color?: string;
}

export interface KimaiProject {
  id: number;
  name: string;
  customer?: number;
  customerName?: string;
  comment?: string;
  orderNumber?: string;
  color?: string;
  visible: boolean;
  globalActivities?: boolean;
}

export interface KimaiActivity {
  id: number;
  name: string;
  project?: number | null;
  projectName?: string;
  comment?: string;
  color?: string;
  visible: boolean;
}

export interface KimaiMetaField {
  name: string;
  value: string;
}

export interface KimaiTimesheet {
  id: number;
  begin: string; // ISO 8601 string
  end?: string | null; // ISO 8601 string
  duration?: number; // seconds
  user: number | { id: number; username: string };
  activity: number | KimaiActivity;
  project: number | KimaiProject;
  description?: string;
  rate?: number;
  fixedRate?: number;
  hourlyRate?: number;
  tags?: string[];
  metaFields?: KimaiMetaField[];
}

export interface GPSCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  timestamp: number;
  source: 'device' | 'fallback' | 'manual';
}

export type GPSPluginMode = 
  | 'smart'       // Auto-detect and send both metaFields and root fields
  | 'metaFields'  // Only metaFields: [{ name: 'latitude', value }, { name: 'longitude', value }]
  | 'rootFields'  // Only root JSON keys: { latitude, longitude, location }
  | 'legacy'      // GeoTracking plugin format
  | 'bypass';     // Don't send GPS (if GPS plugin was disabled on server)

export interface KimaiConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  useProxy: boolean;
  isDemoMode: boolean;
  isConfigured: boolean;
  
  // GPS Plugin settings
  gpsEnabled: boolean;
  gpsPluginMode: GPSPluginMode;
  requireGPS: boolean; // Prompt or warn if GPS not available
  useFallbackGPS: boolean; // Auto-use default coordinates if GPS unavailable
  fallbackLatitude: number;
  fallbackLongitude: number;
  
  // App preferences
  keepScreenAwake: boolean;
  soundAlerts: boolean;
  hapticFeedback: boolean;
  autoRefreshInterval: number; // in seconds
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  direction: 'OUT' | 'IN' | 'ERROR';
  method: string;
  endpoint: string;
  payload?: any;
  response?: any;
  status?: number;
  gpsIncluded?: boolean;
}

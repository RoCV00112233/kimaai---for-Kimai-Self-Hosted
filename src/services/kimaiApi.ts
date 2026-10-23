import {
  ApiLogEntry,
  GPSCoords,
  KimaiActivity,
  KimaiConfig,
  KimaiCustomer,
  KimaiProject,
  KimaiTimesheet,
  KimaiUser,
} from '../types/kimai';
import {
  MOCK_ACTIVE_TIMESHEET,
  MOCK_ACTIVITIES,
  MOCK_CUSTOMERS,
  MOCK_PAST_TIMESHEETS,
  MOCK_PROJECTS,
  MOCK_USER,
} from './mockData';

// Event listener for live API request logging
type LogListener = (entry: ApiLogEntry) => void;
const logListeners: Set<LogListener> = new Set();

export function subscribeApiLogs(listener: LogListener) {
  logListeners.add(listener);
  return () => {
    logListeners.delete(listener);
  };
}

function broadcastLog(entry: ApiLogEntry) {
  logListeners.forEach((fn) => {
    try {
      fn(entry);
    } catch (e) {
      console.error('Log listener error:', e);
    }
  });
}

// In-memory state for Demo Mode so the user can interact freely
let demoActiveTimesheet: KimaiTimesheet | null = { ...MOCK_ACTIVE_TIMESHEET };
let demoPastTimesheets: KimaiTimesheet[] = [...MOCK_PAST_TIMESHEETS];

export class KimaiApiClient {
  private config: KimaiConfig;

  constructor(config: KimaiConfig) {
    this.config = config;
  }

  public updateConfig(config: KimaiConfig) {
    this.config = config;
  }

  private getHeaders(): Record<string, string> {
    const token = this.config.apiToken.trim();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
    gpsIncluded: boolean = false
  ): Promise<T> {
    const logId = Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toLocaleTimeString();

    // Broadcast outgoing request log
    broadcastLog({
      id: logId,
      timestamp,
      direction: 'OUT',
      method,
      endpoint,
      payload: body,
      gpsIncluded,
    });

    // Handle Demo Mode
    if (this.config.isDemoMode) {
      return this.handleDemoRequest<T>(endpoint, method, body, logId, timestamp);
    }

    try {
      let response: Response;

      if (this.config.useProxy) {
        // Send through backend Node.js proxy to bypass CORS
        response = await fetch('/api/kimai-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            baseUrl: this.config.baseUrl,
            username: this.config.username,
            apiToken: this.config.apiToken,
            method,
            body,
          }),
        });
      } else {
        // Direct browser/device fetch
        const cleanBase = this.config.baseUrl.replace(/\/+$/, '');
        let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        if (!cleanEndpoint.startsWith('/api') && !cleanBase.endsWith('/api')) {
          cleanEndpoint = `/api${cleanEndpoint}`;
        }
        const fullUrl = `${cleanBase}${cleanEndpoint}`;

        response = await fetch(fullUrl, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
        });
      }

      const responseText = await response.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        broadcastLog({
          id: `${logId}-err`,
          timestamp: new Date().toLocaleTimeString(),
          direction: 'ERROR',
          method,
          endpoint,
          status: response.status,
          response: responseData,
        });

        const errorMessage =
          responseData?.message ||
          responseData?.data?.message ||
          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));

        throw new Error(
          `Kimai API Error (${response.status} ${response.statusText}): ${errorMessage}`
        );
      }

      broadcastLog({
        id: `${logId}-res`,
        timestamp: new Date().toLocaleTimeString(),
        direction: 'IN',
        method,
        endpoint,
        status: response.status,
        response: responseData,
      });

      return responseData as T;
    } catch (err: any) {
      broadcastLog({
        id: `${logId}-fail`,
        timestamp: new Date().toLocaleTimeString(),
        direction: 'ERROR',
        method,
        endpoint,
        response: { error: err.message },
      });
      throw err;
    }
  }

  // Demo mode handler for instant preview without credentials
  private async handleDemoRequest<T>(
    endpoint: string,
    method: string,
    body: any,
    logId: string,
    timestamp: string
  ): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 250)); // Simular latencia de red

    let data: any;

    if (endpoint.includes('/ping')) {
      data = { message: 'pong', mode: 'demo' };
    } else if (endpoint.includes('/version')) {
      data = { version: '2.14.0', candidate: 'CodeTimer Mobile Demo', semver: '2.14.0' };
    } else if (endpoint.includes('/users/me')) {
      data = MOCK_USER;
    } else if (endpoint.includes('/timesheets/active')) {
      data = demoActiveTimesheet ? [demoActiveTimesheet] : [];
    } else if (endpoint.includes('/projects')) {
      data = MOCK_PROJECTS;
    } else if (endpoint.includes('/activities')) {
      data = MOCK_ACTIVITIES;
    } else if (endpoint.includes('/customers')) {
      data = MOCK_CUSTOMERS;
    } else if (endpoint.includes('/tags')) {
      data = ['mobile', 'gps', 'frontend', 'backend', 'v2', 'testing', 'kimai'];
    } else if (endpoint.includes('/timesheets') && method === 'GET') {
      data = demoPastTimesheets;
    } else if (endpoint.includes('/timesheets') && method === 'POST') {
      // Start timesheet
      const project = MOCK_PROJECTS.find((p) => p.id === Number(body.project)) || MOCK_PROJECTS[0];
      const activity = MOCK_ACTIVITIES.find((a) => a.id === Number(body.activity)) || MOCK_ACTIVITIES[0];

      demoActiveTimesheet = {
        id: Date.now(),
        begin: body.begin || new Date().toISOString(),
        end: null,
        duration: 0,
        user: MOCK_USER,
        project,
        activity,
        description: body.description || '',
        tags: body.tags || [],
        metaFields: body.metaFields || [],
      };
      data = demoActiveTimesheet;
    } else if (endpoint.includes('/stop') && method === 'PATCH') {
      if (demoActiveTimesheet) {
        const stopped: KimaiTimesheet = {
          ...demoActiveTimesheet,
          end: new Date().toISOString(),
          duration: Math.floor((Date.now() - new Date(demoActiveTimesheet.begin).getTime()) / 1000),
        };
        demoPastTimesheets = [stopped, ...demoPastTimesheets];
        demoActiveTimesheet = null;
        data = stopped;
      } else {
        data = { message: 'No active timesheet' };
      }
    } else {
      data = { success: true };
    }

    broadcastLog({
      id: `${logId}-res`,
      timestamp,
      direction: 'IN',
      method,
      endpoint,
      status: 200,
      response: data,
    });

    return data as T;
  }

  // --- Public Kimai API Methods ---

  public async ping(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/ping');
  }

  public async getVersion(): Promise<any> {
    return this.request<any>('/version');
  }

  public async getCurrentUser(): Promise<KimaiUser> {
    return this.request<KimaiUser>('/users/me');
  }

  public async getProjects(): Promise<KimaiProject[]> {
    const res = await this.request<any>('/projects?visible=1');
    return Array.isArray(res) ? res : [];
  }

  public async getActivities(projectId?: number): Promise<KimaiActivity[]> {
    const q = projectId ? `?project=${projectId}&visible=1` : '?visible=1';
    const res = await this.request<any>(`/activities${q}`);
    return Array.isArray(res) ? res : [];
  }

  public async getCustomers(): Promise<KimaiCustomer[]> {
    const res = await this.request<any>('/customers?visible=1');
    return Array.isArray(res) ? res : [];
  }

  public async getTags(): Promise<string[]> {
    const res = await this.request<any>('/tags');
    return Array.isArray(res) ? res : [];
  }

  public async getActiveTimesheets(): Promise<KimaiTimesheet[]> {
    const res = await this.request<any>('/timesheets/active');
    return Array.isArray(res) ? res : [];
  }

  public async getRecentTimesheets(size: number = 30): Promise<KimaiTimesheet[]> {
    const res = await this.request<any>(`/timesheets?size=${size}&order=DESC&orderBy=begin`);
    return Array.isArray(res) ? res : [];
  }

  /**
   * Starts a timesheet safely with KimaiMobileGPSInfoBundle and GeoTracking support.
   */
  public async startTimesheet(params: {
    projectId: number;
    activityId: number;
    description?: string;
    tags?: string[];
    gpsCoords?: GPSCoords | null;
  }): Promise<KimaiTimesheet> {
    // Only standard form fields accepted by Kimai POST /api/timesheets
    const payload: Record<string, any> = {
      project: params.projectId,
      activity: params.activityId,
    };

    if (params.description && params.description.trim()) {
      payload.description = params.description.trim();
    }

    if (params.tags && params.tags.length > 0) {
      payload.tags = params.tags.join(',');
    }

    // Determine GPS coordinates to attach
    let gps: GPSCoords | null = null;
    if (this.config.gpsEnabled) {
      if (params.gpsCoords) {
        gps = params.gpsCoords;
      } else if (this.config.useFallbackGPS) {
        gps = {
          latitude: this.config.fallbackLatitude || 19.432608,
          longitude: this.config.fallbackLongitude || -99.133209,
          accuracy: 10,
          timestamp: Date.now(),
          source: 'fallback',
        };
      }
    }

    const started = await this.request<KimaiTimesheet>('/timesheets', 'POST', payload, Boolean(gps));

    // If timesheet was successfully started, attach GPS coordinates to KimaiMobileGPSInfoBundle
    if (gps && started?.id && this.config.gpsPluginMode !== 'bypass') {
      const coordStr = `${gps.latitude},${gps.longitude}`;
      this.setMetaField(started.id, 'gps_start_location', coordStr).catch(() => {});
    }

    return started;
  }

  public async setMetaField(timesheetId: number, name: string, value: string): Promise<any> {
    if (this.config.isDemoMode) return { name, value };
    try {
      return await this.request(`/timesheets/${timesheetId}/meta`, 'PATCH', { name, value });
    } catch {
      return null;
    }
  }

  public async stopTimesheet(id: number, gpsCoords?: GPSCoords | null): Promise<KimaiTimesheet> {
    const stopped = await this.request<KimaiTimesheet>(`/timesheets/${id}/stop`, 'PATCH');

    // Attach stop GPS location for KimaiMobileGPSInfoBundle
    let gps = gpsCoords;
    if (!gps && this.config.gpsEnabled && this.config.useFallbackGPS) {
      gps = {
        latitude: this.config.fallbackLatitude || 19.432608,
        longitude: this.config.fallbackLongitude || -99.133209,
        accuracy: 10,
        timestamp: Date.now(),
        source: 'fallback',
      };
    }

    if (gps && id && this.config.gpsPluginMode !== 'bypass') {
      const coordStr = `${gps.latitude},${gps.longitude}`;
      this.setMetaField(id, 'gps_stop_location', coordStr).catch(() => {});
    }

    return stopped;
  }

  public async deleteTimesheet(id: number): Promise<void> {
    return this.request<void>(`/timesheets/${id}`, 'DELETE');
  }
}

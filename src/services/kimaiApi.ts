import {
  ApiLogEntry,
  GPSCoords,
  KimaiActivity,
  KimaiConfig,
  KimaiCustomer,
  KimaiMetaField,
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

function sanitizeForLog(value: any, depth: number = 0): any {
  if (depth > 4 || value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeForLog(item, depth + 1));
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    if (/token|password|secret|authorization|cookie/i.test(k)) {
      clean[k] = '[REDACTED]';
    } else {
      clean[k] = sanitizeForLog(v, depth + 1);
    }
  }
  return clean;
}

function broadcastLog(entry: ApiLogEntry) {
  const safeEntry: ApiLogEntry = {
    ...entry,
    payload: sanitizeForLog(entry.payload),
    response: sanitizeForLog(entry.response),
  };
  logListeners.forEach((fn) => {
    try {
      fn(safeEntry);
    } catch (e) {
      console.error('Log listener error:', e);
    }
  });
}

function mergeMetaFields(
  existing: KimaiMetaField[] | undefined,
  additions: KimaiMetaField[]
): KimaiMetaField[] {
  const map = new Map<string, string>();
  (existing || []).forEach((m) => {
    if (m && m.name) map.set(m.name, String(m.value ?? ''));
  });
  additions.forEach((m) => {
    if (m && m.name && !map.has(m.name)) {
      map.set(m.name, String(m.value ?? ''));
    }
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function collectSymfonyErrors(node: any, path: string = ''): string[] {
  if (!node || typeof node !== 'object') return [];
  const collected: string[] = [];

  if (Array.isArray(node.errors)) {
    for (const errItem of node.errors) {
      if (typeof errItem === 'string' && errItem.trim()) {
        collected.push(path ? `${path}: ${errItem.trim()}` : errItem.trim());
      }
    }
  }

  if (node.children && typeof node.children === 'object') {
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any, idx: number) => {
        collected.push(...collectSymfonyErrors(child, path ? `${path}[${idx}]` : `[${idx}]`));
      });
    } else {
      for (const [key, val] of Object.entries(node.children)) {
        const nextPath = path ? `${path}.${key}` : key;
        collected.push(...collectSymfonyErrors(val, nextPath));
      }
    }
  }

  return collected;
}

function formatKimaiErrorMessage(responseData: any): string {
  const baseMsg =
    responseData?.message ||
    responseData?.data?.message ||
    responseData?.error ||
    (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));

  const details = Array.from(
    new Set(collectSymfonyErrors(responseData?.errors ?? responseData?.data?.errors))
  );
  if (details.length > 0) {
    return `${baseMsg} (${details.join('; ')})`;
  }
  return String(baseMsg);
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
            username: this.config.username || 'usuario',
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

        const errorMessage = formatKimaiErrorMessage(responseData);

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
    await new Promise((resolve) => setTimeout(resolve, 200));

    let data: any;

    if (endpoint.includes('/ping')) {
      data = { message: 'pong', mode: 'demo' };
    } else if (endpoint.includes('/version')) {
      data = { version: '2.14.0', candidate: 'Kimaai Demo', semver: '2.14.0' };
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
      data = ['movil', 'gps', 'frontend', 'backend', 'v2', 'testing', 'kimai'];
    } else if (endpoint.includes('/timesheets') && endpoint.includes('/meta') && method === 'PATCH') {
      if (demoActiveTimesheet && body?.name) {
        demoActiveTimesheet = {
          ...demoActiveTimesheet,
          metaFields: mergeMetaFields(demoActiveTimesheet.metaFields, [
            { name: body.name, value: String(body.value ?? '') },
          ]),
        };
      }
      data = { name: body?.name, value: body?.value };
    } else if (endpoint.includes('/timesheets') && method === 'GET') {
      data = demoPastTimesheets;
    } else if (endpoint.includes('/timesheets') && method === 'POST') {
      const project = MOCK_PROJECTS.find((p) => p.id === Number(body.project)) || MOCK_PROJECTS[0];
      const activity = MOCK_ACTIVITIES.find((a) => a.id === Number(body.activity)) || MOCK_ACTIVITIES[0];
      const parsedTags = Array.isArray(body.tags)
        ? body.tags
        : typeof body.tags === 'string'
        ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];

      const initialMeta: KimaiMetaField[] = Array.isArray(body.metaFields) ? [...body.metaFields] : [];
      if (body.latitude !== undefined && body.longitude !== undefined) {
        initialMeta.push(
          { name: 'latitude', value: String(body.latitude) },
          { name: 'longitude', value: String(body.longitude) }
        );
      }

      demoActiveTimesheet = {
        id: Date.now(),
        begin: body.begin || new Date().toISOString(),
        end: null,
        duration: 0,
        user: MOCK_USER,
        project,
        activity,
        description: body.description || '',
        tags: parsedTags,
        metaFields: initialMeta,
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
    if (!Array.isArray(res)) return [];
    return res
      .map((t) => (typeof t === 'string' ? t : typeof t?.name === 'string' ? t.name : ''))
      .map((t) => t.trim())
      .filter(Boolean);
  }

  public async getActiveTimesheets(): Promise<KimaiTimesheet[]> {
    const res = await this.request<any>('/timesheets/active');
    return Array.isArray(res) ? res : [];
  }

  public async getRecentTimesheets(size: number = 30): Promise<KimaiTimesheet[]> {
    const res = await this.request<any>(`/timesheets?size=${size}&order=DESC&orderBy=begin`);
    return Array.isArray(res) ? res : [];
  }

  private buildCreatePayloadWithGps(
    basePayload: Record<string, any>,
    gps: GPSCoords,
    mode: KimaiConfig['gpsPluginMode']
  ): Record<string, any> {
    const latStr = gps.latitude.toFixed(6);
    const lonStr = gps.longitude.toFixed(6);
    const coordStr = `${latStr},${lonStr}`;
    const payload = { ...basePayload };

    if (mode === 'metaFields' || mode === 'smart') {
      payload.metaFields = [
        { name: 'latitude', value: latStr },
        { name: 'longitude', value: lonStr },
      ];
    } else if (mode === 'rootFields') {
      payload.latitude = Number(latStr);
      payload.longitude = Number(lonStr);
      payload.location = coordStr;
    } else if (mode === 'legacy') {
      payload.metaFields = [
        { name: 'geo_lat', value: latStr },
        { name: 'geo_long', value: lonStr },
      ];
    }

    return payload;
  }

  private getFallbackCoords(): GPSCoords {
    const rawLat = Number(this.config.fallbackLatitude);
    const rawLon = Number(this.config.fallbackLongitude);
    return {
      latitude: Number.isFinite(rawLat) ? rawLat : 19.432608,
      longitude: Number.isFinite(rawLon) ? rawLon : -99.133209,
      accuracy: 10,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }

  /**
   * Starts a timesheet and attaches GPS coordinates according to the configured Kimai GPS plugin mode.
   */
  public async startTimesheet(params: {
    projectId: number;
    activityId: number;
    description?: string;
    tags?: string[];
    gpsCoords?: GPSCoords | null;
  }): Promise<KimaiTimesheet> {
    const basePayload: Record<string, any> = {
      project: params.projectId,
      activity: params.activityId,
    };

    if (params.description && params.description.trim()) {
      basePayload.description = params.description.trim();
    }

    if (params.tags && params.tags.length > 0) {
      basePayload.tags = params.tags.join(',');
    }

    const mode = this.config.gpsPluginMode || 'smart';
    let gps = mode !== 'bypass' ? params.gpsCoords || null : null;

    const createPayload = gps
      ? this.buildCreatePayloadWithGps(basePayload, gps, mode)
      : { ...basePayload };

    let started: KimaiTimesheet;
    try {
      started = await this.request<KimaiTimesheet>('/timesheets', 'POST', createPayload, Boolean(gps));
    } catch (err: any) {
      const msg = String(err?.message || '');
      const lowerMsg = msg.toLowerCase();
      const isNonGpsDomainError =
        /overlap|solapa|already|activa|active timesheet|closed|cerrado|budget|presupuesto|locked|bloqueado/.test(
          lowerMsg
        );

      if (gps && mode === 'smart' && msg.includes('400') && !isNonGpsDomainError) {
        try {
          started = await this.request<KimaiTimesheet>(
            '/timesheets',
            'POST',
            this.buildCreatePayloadWithGps(basePayload, gps, 'rootFields'),
            true
          );
        } catch {
          try {
            started = await this.request<KimaiTimesheet>(
              '/timesheets',
              'POST',
              this.buildCreatePayloadWithGps(basePayload, gps, 'legacy'),
              true
            );
          } catch {
            started = await this.request<KimaiTimesheet>('/timesheets', 'POST', basePayload, true);
          }
        }
      } else if (!gps && msg.includes('400') && !isNonGpsDomainError && mode !== 'bypass') {
        // When GPS was disabled in the app, some Kimai servers still require GPS metaFields/fields
        // on POST /timesheets. Retry with configured fallback coordinates if enabled.
        const mentionsGpsField = /metafield|latitude|longitude|location|gps|geo_|blank|vacío|required|obligatorio/.test(
          lowerMsg
        );
        if (this.config.useFallbackGPS || mentionsGpsField) {
          const fallbackGps = this.getFallbackCoords();
          const fallbackPayload = this.buildCreatePayloadWithGps(basePayload, fallbackGps, mode);
          try {
            started = await this.request<KimaiTimesheet>('/timesheets', 'POST', fallbackPayload, true);
            gps = fallbackGps;
          } catch (fallbackErr: any) {
            if (mode === 'smart' && String(fallbackErr?.message || '').includes('400')) {
              try {
                started = await this.request<KimaiTimesheet>(
                  '/timesheets',
                  'POST',
                  this.buildCreatePayloadWithGps(basePayload, fallbackGps, 'rootFields'),
                  true
                );
                gps = fallbackGps;
              } catch {
                try {
                  started = await this.request<KimaiTimesheet>(
                    '/timesheets',
                    'POST',
                    this.buildCreatePayloadWithGps(basePayload, fallbackGps, 'legacy'),
                    true
                  );
                  gps = fallbackGps;
                } catch {
                  throw err;
                }
              }
            } else {
              throw err;
            }
          }
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    // Attach and verify GPS meta fields (KimaiMobileGPSInfoBundle & Custom MetaFields)
    if (gps && started?.id && mode !== 'bypass') {
      const latStr = gps.latitude.toFixed(6);
      const lonStr = gps.longitude.toFixed(6);
      const coordStr = `${latStr},${lonStr}`;

      const metaTargets: KimaiMetaField[] = [];
      const existingNames = new Set((started.metaFields || []).map((m) => m.name));

      if (mode === 'smart') {
        metaTargets.push({ name: 'gps_start_location', value: coordStr });
        if (!existingNames.has('latitude')) metaTargets.push({ name: 'latitude', value: latStr });
        if (!existingNames.has('longitude')) metaTargets.push({ name: 'longitude', value: lonStr });
      } else if (mode === 'metaFields') {
        if (!existingNames.has('latitude')) metaTargets.push({ name: 'latitude', value: latStr });
        if (!existingNames.has('longitude')) metaTargets.push({ name: 'longitude', value: lonStr });
        metaTargets.push({ name: 'gps_start_location', value: coordStr });
      } else if (mode === 'rootFields') {
        metaTargets.push({ name: 'gps_start_location', value: coordStr });
      } else if (mode === 'legacy') {
        if (!existingNames.has('geo_lat')) metaTargets.push({ name: 'geo_lat', value: latStr });
        if (!existingNames.has('geo_long')) metaTargets.push({ name: 'geo_long', value: lonStr });
      }

      if (metaTargets.length > 0) {
        const results = await Promise.all(
          metaTargets.map((m) => this.setMetaField(started.id, m.name, m.value))
        );
        const persisted = metaTargets.filter((_, idx) => results[idx] !== null);
        if (persisted.length > 0) {
          started = {
            ...started,
            metaFields: mergeMetaFields(started.metaFields, persisted),
          };
        }
      }
    }

    return started;
  }

  public async setMetaField(timesheetId: number, name: string, value: string): Promise<any> {
    if (this.config.isDemoMode) {
      return this.request(`/timesheets/${timesheetId}/meta`, 'PATCH', { name, value }, true);
    }
    try {
      return await this.request(`/timesheets/${timesheetId}/meta`, 'PATCH', { name, value }, true);
    } catch {
      return null;
    }
  }

  public async stopTimesheet(id: number, gpsCoords?: GPSCoords | null): Promise<KimaiTimesheet> {
    const mode = this.config.gpsPluginMode || 'smart';
    let gps = mode !== 'bypass' ? gpsCoords || null : null;

    if (!gps && mode !== 'bypass' && this.config.gpsEnabled && this.config.useFallbackGPS) {
      gps = {
        latitude: this.config.fallbackLatitude || 19.432608,
        longitude: this.config.fallbackLongitude || -99.133209,
        accuracy: 10,
        timestamp: Date.now(),
        source: 'fallback',
      };
    }

    const persistedStopMeta: KimaiMetaField[] = [];

    // Persist stop GPS coordinates while timesheet is active (before stopping)
    // so servers that lock stopped timesheets or evaluate stop listeners receive them.
    if (gps && id && mode !== 'bypass') {
      const latStr = gps.latitude.toFixed(6);
      const lonStr = gps.longitude.toFixed(6);
      const coordStr = `${latStr},${lonStr}`;

      const stopTargets: KimaiMetaField[] = [{ name: 'gps_stop_location', value: coordStr }];
      if (mode === 'legacy') {
        stopTargets.push(
          { name: 'geo_stop_lat', value: latStr },
          { name: 'geo_stop_long', value: lonStr }
        );
      }

      const results = await Promise.all(
        stopTargets.map((m) => this.setMetaField(id, m.name, m.value))
      );
      stopTargets.forEach((m, idx) => {
        if (results[idx] !== null) {
          persistedStopMeta.push(m);
        }
      });
    }

    const stopped = await this.request<KimaiTimesheet>(
      `/timesheets/${id}/stop`,
      'PATCH',
      undefined,
      Boolean(gps)
    );

    if (persistedStopMeta.length > 0) {
      return {
        ...stopped,
        metaFields: mergeMetaFields(stopped.metaFields, persistedStopMeta),
      };
    }

    return stopped;
  }

  public async deleteTimesheet(id: number): Promise<void> {
    return this.request<void>(`/timesheets/${id}`, 'DELETE');
  }
}

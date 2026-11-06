import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/**
 * Validates external Kimai server URLs to prevent Server-Side Request Forgery (SSRF)
 * against loopback services or cloud metadata endpoints.
 */
function validateExternalKimaiUrl(rawBaseUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawBaseUrl.trim());
  } catch {
    throw new Error('Invalid Kimai baseUrl format.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP/HTTPS protocols are allowed.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Embedded credentials in URL are not allowed.');
  }

  const host = parsed.hostname.toLowerCase();
  const blockedHosts = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    '169.254.169.254',
    'metadata.google.internal',
    'metadata',
  ]);

  if (
    blockedHosts.has(host) ||
    host.startsWith('127.') ||
    host.startsWith('169.254.') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Target host is restricted for security reasons.');
  }

  return parsed;
}

function sanitizeEndpointPath(rawEndpoint: string, basePath: string): string {
  const trimmed = rawEndpoint.trim();
  if (!trimmed.startsWith('/') || trimmed.includes('..') || trimmed.includes('@')) {
    throw new Error('Invalid API endpoint path.');
  }
  const cleanBasePath = basePath.replace(/\/+$/, '');
  if (!trimmed.startsWith('/api') && !cleanBasePath.endsWith('/api')) {
    return `/api${trimmed}`;
  }
  return trimmed;
}

/**
 * Kimai Proxy Endpoint:
 * Bypasses CORS restrictions on self-hosted Kimai instances with SSRF protection.
 */
app.post('/api/kimai-proxy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint, baseUrl, username, apiToken, method = 'GET', body } = req.body || {};

    if (!baseUrl || !username || !apiToken || !endpoint) {
      res.status(400).json({
        error: 'Missing required configuration: baseUrl, username, apiToken, and endpoint are required.',
      });
      return;
    }

    const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);
    const upperMethod = String(method).toUpperCase();
    if (!allowedMethods.has(upperMethod)) {
      res.status(405).json({ error: 'HTTP method not allowed.' });
      return;
    }

    const parsedBase = validateExternalKimaiUrl(String(baseUrl));
    const cleanBaseUrl = parsedBase.toString().replace(/\/+$/, '');
    const cleanEndpoint = sanitizeEndpointPath(String(endpoint), parsedBase.pathname);
    const targetUrl = `${cleanBaseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${String(apiToken).trim()}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: upperMethod,
      headers,
      signal: AbortSignal.timeout(15000),
    };

    if (['POST', 'PATCH'].includes(upperMethod) && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    let responseData: any;
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      res.status(response.status).json({
        isKimaiError: true,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
      return;
    }

    res.json(responseData);
  } catch (error: any) {
    const message = error?.message || 'Failed to communicate with Kimai server';
    const isValidation =
      message.includes('Invalid') ||
      message.includes('restricted') ||
      message.includes('allowed');
    res.status(isValidation ? 400 : 502).json({
      error: isValidation ? message : 'Failed to communicate with Kimai server',
    });
  }
});

/**
 * Diagnostics endpoint to inspect what GPS and plugin fields the Kimai instance supports
 */
app.post('/api/kimai-diagnose', async (req: Request, res: Response): Promise<void> => {
  try {
    const { baseUrl, apiToken } = req.body || {};
    if (!baseUrl || !apiToken) {
      res.status(400).json({ error: 'baseUrl and apiToken are required.' });
      return;
    }

    const parsedBase = validateExternalKimaiUrl(String(baseUrl));
    const cleanBaseUrl = parsedBase.toString().replace(/\/+$/, '');
    const cleanRoot = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl.slice(0, -4) : cleanBaseUrl;

    const headers = {
      'Authorization': `Bearer ${String(apiToken).trim()}`,
      'Accept': 'application/json',
    };

    const opts = { headers, signal: AbortSignal.timeout(12000) };

    const [pingRes, versionRes, meRes, activeRes, pluginsRes] = await Promise.allSettled([
      fetch(`${cleanRoot}/api/ping`, opts).then((r) => r.json()),
      fetch(`${cleanRoot}/api/version`, opts).then((r) => r.json()),
      fetch(`${cleanRoot}/api/users/me`, opts).then((r) => r.json()),
      fetch(`${cleanRoot}/api/timesheets/active`, opts).then((r) => r.json()),
      fetch(`${cleanRoot}/api/plugins`, opts).then((r) => r.json()).catch(() => null),
    ]);

    res.json({
      ping: pingRes.status === 'fulfilled' ? pingRes.value : { error: pingRes.reason?.message },
      version:
        versionRes.status === 'fulfilled' ? versionRes.value : { error: versionRes.reason?.message },
      user: meRes.status === 'fulfilled' ? meRes.value : { error: meRes.reason?.message },
      activeTimesheets:
        activeRes.status === 'fulfilled' ? activeRes.value : { error: activeRes.reason?.message },
      plugins: pluginsRes.status === 'fulfilled' ? pluginsRes.value : null,
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Diagnostics request failed.' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`kimaai Server running on http://localhost:${PORT}`);
  });
}

startServer();

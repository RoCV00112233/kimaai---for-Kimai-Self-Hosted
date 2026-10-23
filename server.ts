import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Kimai Proxy Endpoint:
 * Bypasses CORS restrictions on self-hosted Kimai instances
 * and handles GPS plugin compatibility validation
 */
app.post('/api/kimai-proxy', async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint, baseUrl, username, apiToken, method = 'GET', body } = req.body;

    if (!baseUrl || !username || !apiToken || !endpoint) {
      res.status(400).json({
        error: 'Missing required configuration: baseUrl, username, apiToken, and endpoint are required.',
      });
      return;
    }

    // Normalize baseUrl: remove trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    // Ensure endpoint starts with slash and includes /api/ if needed
    let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (!cleanEndpoint.startsWith('/api') && !cleanBaseUrl.endsWith('/api')) {
      cleanEndpoint = `/api${cleanEndpoint}`;
    }

    const targetUrl = `${cleanBaseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiToken.trim()}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (['POST', 'PATCH', 'PUT'].includes(method.toUpperCase()) && body) {
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

    // If server responded with an error, pass through the status and data with debug context
    if (!response.ok) {
      res.status(response.status).json({
        isKimaiError: true,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        targetUrl,
      });
      return;
    }

    res.json(responseData);
  } catch (error: any) {
    console.error('[Kimai Proxy Error]:', error);
    res.status(502).json({
      error: 'Failed to communicate with Kimai server',
      details: error?.message || String(error),
      code: error?.code,
    });
  }
});

/**
 * Diagnostics endpoint to inspect what GPS and plugin fields the Kimai instance supports
 */
app.post('/api/kimai-diagnose', async (req: Request, res: Response): Promise<void> => {
  try {
    const { baseUrl, username, apiToken } = req.body;
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const cleanRoot = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl.slice(0, -4) : cleanBaseUrl;

    const headers = {
      'Authorization': `Bearer ${apiToken.trim()}`,
      'Accept': 'application/json',
    };

    // Parallel probes to Kimai
    const [pingRes, versionRes, meRes, activeRes, pluginsRes] = await Promise.allSettled([
      fetch(`${cleanRoot}/api/ping`, { headers }).then(r => r.json()),
      fetch(`${cleanRoot}/api/version`, { headers }).then(r => r.json()),
      fetch(`${cleanRoot}/api/users/me`, { headers }).then(r => r.json()),
      fetch(`${cleanRoot}/api/timesheets/active`, { headers }).then(r => r.json()),
      fetch(`${cleanRoot}/api/plugins`, { headers }).then(r => r.json()).catch(() => null),
    ]);

    res.json({
      ping: pingRes.status === 'fulfilled' ? pingRes.value : { error: pingRes.reason?.message },
      version: versionRes.status === 'fulfilled' ? versionRes.value : { error: versionRes.reason?.message },
      user: meRes.status === 'fulfilled' ? meRes.value : { error: meRes.reason?.message },
      activeTimesheets: activeRes.status === 'fulfilled' ? activeRes.value : { error: activeRes.reason?.message },
      plugins: pluginsRes.status === 'fulfilled' ? pluginsRes.value : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    // Serve static files in production
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

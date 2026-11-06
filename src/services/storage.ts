import { KimaiConfig } from '../types/kimai';

const LEGACY_STORAGE_KEY = 'codetimer_kimai_config_v2';
const SECURE_STORAGE_KEY = 'kimaai_kimai_config_v3';
const IDB_DB_NAME = 'kimaai_secure_vault';
const IDB_STORE_NAME = 'crypto_keys';
const IDB_KEY_ID = 'aes_gcm_master_key';

interface EncryptedAuthEnvelope {
  iv: string;
  ciphertext: string;
}

interface StoredConfigPayload extends Omit<KimaiConfig, 'apiToken' | 'username'> {
  encryptedAuth?: EncryptedAuthEnvelope;
}

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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
  });
}

async function getOrCreateVaultKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null;
  }
  try {
    const db = await openKeyDatabase();
    const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(IDB_KEY_ID);
      req.onsuccess = () => resolve(req.result as CryptoKey | undefined);
      req.onerror = () => reject(req.error);
    });

    if (existing) {
      db.close();
      return existing;
    }

    // Generate a non-extractable AES-GCM 256-bit key bound to the origin's IndexedDB
    const newKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.put(newKey, IDB_KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    db.close();
    return newKey;
  } catch {
    return null;
  }
}

async function encryptCredentials(username: string, apiToken: string): Promise<EncryptedAuthEnvelope | undefined> {
  if (!username && !apiToken) return undefined;
  const key = await getOrCreateVaultKey();
  if (!key) return undefined;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify({ username, apiToken }));
  const encryptedBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encoded
  );

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuf)),
  };
}

async function decryptCredentials(
  envelope?: EncryptedAuthEnvelope
): Promise<{ username: string; apiToken: string } | null> {
  if (!envelope?.iv || !envelope?.ciphertext) return null;
  const key = await getOrCreateVaultKey();
  if (!key) return null;

  try {
    const ivBytes = base64ToBytes(envelope.iv);
    const cipherBytes = base64ToBytes(envelope.ciphertext);
    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer },
      key,
      cipherBytes.buffer as ArrayBuffer
    );
    const parsed = JSON.parse(new TextDecoder().decode(decryptedBuf));
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      apiToken: typeof parsed.apiToken === 'string' ? parsed.apiToken : '',
    };
  } catch {
    return null;
  }
}

/**
 * Synchronous initial load for React initial state (reads non-sensitive flags immediately;
 * sensitive credentials are decrypted asynchronously in hydrateStoredConfig).
 */
export function loadStoredConfig(): KimaiConfig {
  try {
    const secureRaw = localStorage.getItem(SECURE_STORAGE_KEY);
    if (secureRaw) {
      const parsed: StoredConfigPayload = JSON.parse(secureRaw);
      const { encryptedAuth: _ignored, ...rest } = parsed;
      return {
        ...DEFAULT_CONFIG,
        ...rest,
        username: '',
        apiToken: '',
      };
    }

    // Legacy fallback: migrate transparently in hydrateStoredConfig()
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load stored config, using defaults', err);
  }
  return DEFAULT_CONFIG;
}

/**
 * Asynchronously decrypts stored API credentials via Web Crypto AES-GCM
 * and migrates any legacy plaintext storage to encrypted storage.
 */
export async function hydrateStoredConfig(): Promise<KimaiConfig> {
  try {
    const secureRaw = localStorage.getItem(SECURE_STORAGE_KEY);
    if (secureRaw) {
      const parsed: StoredConfigPayload = JSON.parse(secureRaw);
      const { encryptedAuth, ...rest } = parsed;
      const creds = await decryptCredentials(encryptedAuth);
      return {
        ...DEFAULT_CONFIG,
        ...rest,
        username: creds?.username || '',
        apiToken: creds?.apiToken || '',
      };
    }

    // Migrate legacy plaintext config if present
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyConfig: KimaiConfig = { ...DEFAULT_CONFIG, ...JSON.parse(legacyRaw) };
      await saveStoredConfigAsync(legacyConfig);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacyConfig;
    }
  } catch (err) {
    console.warn('Failed to hydrate encrypted config', err);
  }
  return DEFAULT_CONFIG;
}

export async function saveStoredConfigAsync(config: KimaiConfig): Promise<void> {
  try {
    const { apiToken, username, ...publicFields } = config;
    const encryptedAuth = await encryptCredentials(username || '', apiToken || '');

    const payload: StoredConfigPayload = {
      ...publicFields,
      ...(encryptedAuth ? { encryptedAuth } : {}),
    };

    localStorage.setItem(SECURE_STORAGE_KEY, JSON.stringify(payload));
    // Ensure legacy plaintext key is always removed
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to save encrypted config', err);
  }
}

export function saveStoredConfig(config: KimaiConfig): void {
  // Immediately persist public settings without plaintext credentials, then seal encrypted envelope
  try {
    const { apiToken: _t, username: _u, ...publicFields } = config;
    const existingRaw = localStorage.getItem(SECURE_STORAGE_KEY);
    const existingParsed: StoredConfigPayload = existingRaw ? JSON.parse(existingRaw) : {};
    localStorage.setItem(
      SECURE_STORAGE_KEY,
      JSON.stringify({
        ...publicFields,
        ...(existingParsed.encryptedAuth ? { encryptedAuth: existingParsed.encryptedAuth } : {}),
      })
    );
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore pre-seal write errors
  }
  void saveStoredConfigAsync(config);
}

export async function clearStoredConfig(): Promise<void> {
  try {
    localStorage.removeItem(SECURE_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(IDB_DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  } catch (err) {
    console.warn('Failed to wipe secure storage', err);
  }
}

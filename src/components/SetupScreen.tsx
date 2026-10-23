import React, { useState } from 'react';
import { KimaiConfig } from '../types/kimai';
import { Server, Key, User, ShieldCheck, ArrowRight, Play, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { SteampunkClockIcon } from './SteampunkClockIcon';

interface SetupScreenProps {
  onSave: (config: KimaiConfig) => Promise<void>;
  onStartDemo: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onSave, onStartDemo }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [username, setUsername] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) {
      setErrorMessage('Por favor ingresa la URL de tu servidor Kimai.');
      return;
    }
    if (!apiToken.trim()) {
      setErrorMessage('Por favor ingresa tu Token de API (Personal Access Token).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Format clean URL (no trailing slash)
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');

    const newConfig: KimaiConfig = {
      baseUrl: cleanUrl,
      username: username.trim() || 'usuario',
      apiToken: apiToken.trim(),
      useProxy,
      isDemoMode: false,
      isConfigured: true,
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

    try {
      await onSave(newConfig);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'No se pudo conectar con el servidor Kimai. Verifica que la URL y el Token sean correctos.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-slate-950 border border-amber-500/30 text-amber-400 shadow-xl shadow-amber-500/10 mb-1">
            <SteampunkClockIcon size={56} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>kimaai</span>
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                v1.2.2
              </span>
            </h1>
            <p className="text-xs font-medium text-amber-200/80 mt-0.5">
              for Kimai Self-Hosted
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Conecta tu servidor auto-hosteado de Kimai con control de tiempo de precisión y soporte GPS.
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Error de conexión</p>
              <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL del Servidor Kimai <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Server className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                placeholder="https://tt.tu-empresa.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
                className="w-full pl-9.5 pr-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Ingresa la URL base (sin /api al final)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Token de API (Personal Access Token) <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="Generado en Perfil de Kimai &rarr; API"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                required
                className="w-full pl-9.5 pr-10 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Encuéntralo en tu Kimai en: <em>Tu Usuario &rarr; Editar &rarr; API</em>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Usuario / Correo (Opcional)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="test01 o usuario@correo.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9.5 pr-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Proxy toggle */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Proxy CORS Integrado</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Omite restricciones del navegador en servidores auto-hosteados
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useProxy}
                onChange={(e) => setUseProxy(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Verificando conexión con Kimai...</span>
              </>
            ) : (
              <>
                <span>Conectar y Comenzar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demo fallback */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={onStartDemo}
            className="text-xs text-slate-400 hover:text-emerald-400 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current text-amber-400" />
            <span>¿Solo quieres ver la app? <strong>Probar en Modo Demostración</strong></span>
          </button>
        </div>
      </div>
    </div>
  );
};

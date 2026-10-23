import React, { useState } from 'react';
import { KimaiConfig, KimaiUser } from '../types/kimai';
import {
  X,
  Server,
  Key,
  User,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw,
  Compass,
  Sliders,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: KimaiConfig;
  onSaveConfig: (newConfig: KimaiConfig) => void;
  onTestConnection: (cfg: KimaiConfig) => Promise<{ success: boolean; message: string; user?: KimaiUser }>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTestConnection,
}) => {
  const [form, setForm] = useState<KimaiConfig>({ ...config });
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(form);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error al conectar con el servidor Kimai.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Configuración de Kimai</h2>
              <p className="text-[11px] text-slate-400">Credenciales de API y plugins de GPS</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mode Selector: Demo vs Real Kimai */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white">Modo de Demostración</h3>
              <p className="text-[11px] text-slate-400">
                Permite probar todas las pantallas y animaciones sin conectar a un servidor real
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDemoMode}
                onChange={(e) => setForm({ ...form, isDemoMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {/* Kimai Server Credentials */}
          <div className={`space-y-3 ${form.isDemoMode ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL de tu Servidor Kimai (Base URL)
              </label>
              <div className="relative">
                <Server className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://kimai.tu-empresa.com"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Ejemplo: https://kimai.dominio.com (sin /api al final, se añade automáticamente)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Usuario (X-AUTH-USER)
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="susan_super"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Token / Password (X-AUTH-TOKEN)
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="api_token_..."
                    value={form.apiToken}
                    onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* CORS Proxy Toggle */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Proxy CORS Integrado
                </p>
                <p className="text-[10px] text-slate-400">
                  Omitir bloqueo de CORS en servidores auto-hosteados sin modificar Nginx/Apache
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.useProxy}
                onChange={(e) => setForm({ ...form, useProxy: e.target.checked })}
                className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
              />
            </div>

            {/* Test Connection Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isTesting ? 'Probando conexión...' : 'Probar Conexión con Kimai'}</span>
              </button>

              {testResult && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{testResult.success ? 'Conexión Exitosa' : 'Fallo de Conexión'}</p>
                    <p className="text-[11px] mt-0.5">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GPS Plugin Defaults */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Configuración Predeterminada de GPS</h3>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between text-slate-300">
                <span>Habilitar GPS en todas las tareas</span>
                <input
                  type="checkbox"
                  checked={form.gpsEnabled}
                  onChange={(e) => setForm({ ...form, gpsEnabled: e.target.checked })}
                  className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300">
                <span>Mantener pantalla encendida durante el cronómetro</span>
                <input
                  type="checkbox"
                  checked={form.keepScreenAwake}
                  onChange={(e) => setForm({ ...form, keepScreenAwake: e.target.checked })}
                  className="w-4 h-4 text-emerald-500 rounded bg-slate-900 border-slate-700"
                />
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="flex-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

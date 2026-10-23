import React from 'react';
import { X, ExternalLink, GitBranch, Sparkles, User, ShieldCheck, Heart, Code2 } from 'lucide-react';
import { SteampunkClockIcon } from './SteampunkClockIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-emerald-500 to-amber-500" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer z-10"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Brand & Steampunk Clock Icon */}
          <div className="flex flex-col items-center text-center pt-2">
            <div className="relative mb-3.5 group">
              <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 rounded-full blur-md" />
              <div className="relative p-2 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-lg">
                <SteampunkClockIcon size={64} />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>kimaai</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                v2.5
              </span>
            </h2>
            <p className="text-xs text-amber-200/80 font-medium mt-0.5">
              for Kimai Self-Hosted
            </p>
            <p className="text-[11px] text-slate-400 mt-2 max-w-xs">
              Cliente móvil y web ultra-rápido para seguimiento de tiempo con soporte nativo de geolocalización GPS.
            </p>
          </div>

          {/* Developer & Origin Info */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Proyecto Base & Autor</span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400 text-[11px]">Desarrollador Original:</span>
                <span className="font-semibold text-white">RoCV00112233</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400 text-[11px]">Institución / Afiliación:</span>
                <span className="text-slate-300">UNAM FES Acatlán</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 text-[11px]">Compatibilidad:</span>
                <a
                  href="https://www.kimai.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  Kimai Open Source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* GitHub Repo Link Button */}
            <a
              href="https://github.com/RoCV00112233/TimeTracker-CV"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>github.com/RoCV00112233/TimeTracker-CV</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* AI Modification Note */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-950/60 to-emerald-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Modificada y Optimizada por IA</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Esta versión ha sido refinada y estructurada mediante <strong>Google AI Studio</strong> con los siguientes ajustes específicos:
            </p>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>Nuevo diseño del icono minimalista estilo <em>Steampunk Clock</em>.</li>
              <li>Simplificación de la interfaz y eliminación de paneles de depuración técnica y logs.</li>
              <li>Ajuste de branding a <strong>kimaai - for Kimai Self-Hosted</strong> (icono móvil: <em>Kimaai</em>).</li>
              <li>Arquitectura de proxy y cliente con validación robusta para entornos móviles y PWA.</li>
            </ul>
          </div>

          {/* Footer Close Button */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer border border-slate-700"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

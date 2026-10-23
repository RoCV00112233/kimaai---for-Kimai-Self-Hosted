import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SteampunkClockIcon } from './SteampunkClockIcon';
import { ArrowDown, Check } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 65; // px to trigger refresh
const MAX_PULL = 100; // max px visual offset

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing = false,
  children,
}) => {
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const pullYRef = useRef(0);

  // Sync ref with state
  pullYRef.current = pullY;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only allow pull to refresh when scrolled at the very top of the window
    if (window.scrollY > 5 || localRefreshing || isRefreshing) {
      isDraggingRef.current = false;
      return;
    }

    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  }, [localRefreshing, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    if (window.scrollY > 5) {
      isDraggingRef.current = false;
      setPullY(0);
      setIsPulling(false);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Elastic rubber-band resistance
      const resisted = Math.min(MAX_PULL, diff * 0.45);
      setPullY(resisted);
      setIsPulling(true);

      // Prevent default pull-down bounce behavior of native browser
      if (e.cancelable && resisted > 15) {
        e.preventDefault();
      }
    } else {
      setPullY(0);
      setIsPulling(false);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsPulling(false);

    if (pullYRef.current >= PULL_THRESHOLD) {
      // Threshold reached - trigger refresh
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          // ignore
        }
      }

      setLocalRefreshing(true);
      setPullY(PULL_THRESHOLD * 0.85);

      try {
        await onRefresh();
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 900);
      } catch (err) {
        console.error('Error refreshing data on pull:', err);
      } finally {
        setLocalRefreshing(false);
        setPullY(0);
      }
    } else {
      // Release below threshold - spring back
      setPullY(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const container = document.body;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isSpinning = localRefreshing || isRefreshing;
  const progressRatio = Math.min(1, pullY / PULL_THRESHOLD);
  const isPastThreshold = pullY >= PULL_THRESHOLD;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Pull indicator banner */}
      <div
        className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-center transition-all duration-150 ease-out"
        style={{
          transform: `translateY(${pullY > 0 || isSpinning ? Math.min(pullY, 70) : -60}px)`,
          opacity: pullY > 5 || isSpinning ? 1 : 0,
        }}
      >
        <div className="mx-auto mt-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-amber-500/40 shadow-xl shadow-amber-500/10 backdrop-blur-md flex items-center gap-2.5 text-xs text-slate-200">
          <div
            className={`transition-transform duration-200 ${isSpinning ? 'animate-spin' : ''}`}
            style={{
              transform: isSpinning ? undefined : `rotate(${pullY * 4.5}deg)`,
            }}
          >
            <SteampunkClockIcon size={20} />
          </div>

          <span className="font-medium text-[11px] tracking-tight">
            {isSpinning ? (
              <span className="text-amber-300">Actualizando clientes y proyectos...</span>
            ) : justCompleted ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> ¡Actualizado!
              </span>
            ) : isPastThreshold ? (
              <span className="text-emerald-400 font-semibold">Suelta para actualizar</span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-amber-400" /> Desliza para actualizar
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Main children content with subtle top pull transform */}
      <div
        className="flex-1 flex flex-col transition-transform ease-out"
        style={{
          transform: isPulling ? `translateY(${pullY * 0.4}px)` : 'none',
          transitionDuration: isPulling ? '0ms' : '250ms',
        }}
      >
        {children}
      </div>
    </div>
  );
};

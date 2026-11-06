import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { GPSCoords } from '../types/kimai';

function mapPositionToGPSCoords(pos: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  };
  timestamp?: number;
}): GPSCoords {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: Math.round((pos.coords.accuracy || 10) * 10) / 10,
    altitude: pos.coords.altitude ?? null,
    timestamp: pos.timestamp || Date.now(),
    source: 'device',
  };
}

function getWebPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function useGeolocation(autoWatch: boolean = false) {
  const [coords, setCoords] = useState<GPSCoords | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
  const [isWatching, setIsWatching] = useState<boolean>(autoWatch);

  const coordsRef = useRef<GPSCoords | null>(null);
  const updateCoords = useCallback((next: GPSCoords) => {
    coordsRef.current = next;
    setCoords(next);
  }, []);

  // Check initial permission status on native Android/iOS or Web
  useEffect(() => {
    let active = true;

    if (Capacitor.isNativePlatform()) {
      Geolocation.checkPermissions()
        .then((status) => {
          if (!active) return;
          if (status.location === 'granted' || status.coarseLocation === 'granted') {
            setPermissionStatus('granted');
          } else if (status.location === 'denied' && status.coarseLocation === 'denied') {
            setPermissionStatus('denied');
          } else {
            setPermissionStatus('prompt');
          }
        })
        .catch(() => {
          // Location services might be disabled on device; handled during capture
        });
    } else if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          if (!active) return;
          setPermissionStatus(result.state);
          result.onchange = () => {
            setPermissionStatus(result.state);
          };
        })
        .catch(() => {
          // Permissions query not supported on all browsers
        });
    }

    return () => {
      active = false;
    };
  }, []);

  const refreshLocation = useCallback(async (): Promise<GPSCoords | null> => {
    setIsLoading(true);
    setError(null);

    // 1. Native Capacitor Android/iOS Geolocation
    if (Capacitor.isNativePlatform()) {
      try {
        let perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
          perm = await Geolocation.requestPermissions({
            permissions: ['location', 'coarseLocation'],
          });
        }

        if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
          setPermissionStatus('denied');
          setError('Permiso de ubicación denegado en el dispositivo. Actívalo en Ajustes.');
          setIsLoading(false);
          return null;
        }

        setPermissionStatus('granted');

        let position: Position;
        try {
          // Stage 1: High accuracy satellite/fused GPS
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 30000,
            enableLocationFallback: true,
          });
        } catch (highAccErr: any) {
          const errMsg = String(highAccErr?.message || highAccErr || '').toLowerCase();
          if (errMsg.includes('denied') || errMsg.includes('disabled')) {
            throw highAccErr;
          }
          // Stage 2: Indoor / network-assisted fallback (Wi-Fi / cell towers)
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 120000,
            enableLocationFallback: true,
          });
        }

        const freshCoords = mapPositionToGPSCoords(position);
        updateCoords(freshCoords);
        setError(null);
        setIsLoading(false);
        return freshCoords;
      } catch (err: any) {
        const rawMsg = String(err?.message || err || '');
        const lower = rawMsg.toLowerCase();
        let friendlyMsg = 'No se pudo obtener la ubicación GPS del dispositivo.';

        if (lower.includes('denied') || lower.includes('permission')) {
          setPermissionStatus('denied');
          friendlyMsg = 'Permiso de ubicación denegado. Habilita el acceso GPS en Ajustes.';
        } else if (lower.includes('disabled') || lower.includes('location services')) {
          friendlyMsg = 'El GPS o los servicios de ubicación del teléfono están desactivados.';
        } else if (lower.includes('timeout')) {
          friendlyMsg = 'Tiempo de espera de GPS agotado (12s). Verifica recepción satelital.';
        }

        setError(friendlyMsg);
        setIsLoading(false);

        // Return recent valid device fix (< 5 min) if available
        if (coordsRef.current && Date.now() - coordsRef.current.timestamp < 300_000) {
          return coordsRef.current;
        }
        return null;
      }
    }

    // 2. Web Browser Geolocation
    if (!('geolocation' in navigator)) {
      setError('Geolocalización no soportada por el navegador o dispositivo.');
      setIsLoading(false);
      return null;
    }

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError('El navegador bloquea el GPS en conexiones HTTP no seguras. Usa HTTPS o la app Android.');
      setIsLoading(false);
      return null;
    }

    try {
      let webPos: GeolocationPosition;
      try {
        // Stage 1: High accuracy
        webPos = await getWebPosition({
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        });
      } catch (firstErr: any) {
        if (firstErr?.code === 1) {
          throw firstErr; // PERMISSION_DENIED - don't retry
        }
        // Stage 2: Network/Wi-Fi fallback
        webPos = await getWebPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 120000,
        });
      }

      const freshCoords = mapPositionToGPSCoords(webPos);
      updateCoords(freshCoords);
      setPermissionStatus('granted');
      setError(null);
      setIsLoading(false);
      return freshCoords;
    } catch (err: any) {
      let msg = 'Error desconocido al obtener GPS.';
      switch (err?.code) {
        case 1:
          msg = 'Permiso de ubicación denegado por el usuario o navegador.';
          setPermissionStatus('denied');
          break;
        case 2:
          msg = 'Señal de GPS no disponible en este momento.';
          break;
        case 3:
          msg = 'Tiempo de espera de GPS agotado (12s).';
          break;
      }
      setError(msg);
      setIsLoading(false);

      if (coordsRef.current && Date.now() - coordsRef.current.timestamp < 300_000) {
        return coordsRef.current;
      }
      return null;
    }
  }, [updateCoords]);

  // Continuous watch when enabled and permission is available
  useEffect(() => {
    if (!isWatching) return;

    if (Capacitor.isNativePlatform()) {
      if (permissionStatus !== 'granted') return;

      let cancelled = false;
      let nativeWatchId: string | null = null;

      Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          minimumUpdateInterval: 5000,
          enableLocationFallback: true,
        },
        (position, err) => {
          if (cancelled) return;
          if (position) {
            updateCoords(mapPositionToGPSCoords(position));
            setError(null);
          } else if (err && !coordsRef.current) {
            setError(`GPS Watch Error: ${err?.message || 'Sin señal'}`);
          }
        }
      )
        .then((id) => {
          if (cancelled) {
            Geolocation.clearWatch({ id }).catch(() => {});
          } else {
            nativeWatchId = id;
          }
        })
        .catch(() => {});

      return () => {
        cancelled = true;
        if (nativeWatchId) {
          Geolocation.clearWatch({ id: nativeWatchId }).catch(() => {});
        }
      };
    }

    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateCoords(mapPositionToGPSCoords(position));
        setError(null);
      },
      (err) => {
        if (!coordsRef.current) {
          setError(`GPS Watch Error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isWatching, permissionStatus, updateCoords]);

  return {
    coords,
    setCoords,
    isLoading,
    error,
    permissionStatus,
    refreshLocation,
    isWatching,
    setIsWatching,
  };
}

import { useCallback, useEffect, useState } from 'react';
import { GPSCoords } from '../types/kimai';

export function useGeolocation(autoWatch: boolean = false) {
  const [coords, setCoords] = useState<GPSCoords | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');
  const [isWatching, setIsWatching] = useState<boolean>(autoWatch);

  // Check permission status if API is available
  useEffect(() => {
    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setPermissionStatus(result.state);
          result.onchange = () => {
            setPermissionStatus(result.state);
          };
        })
        .catch(() => {
          // Permissions query not supported for geolocation on all browsers
        });
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<GPSCoords | null> => {
    if (!('geolocation' in navigator)) {
      setError('Geolocalización no soportada por el navegador o dispositivo.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: GPSCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy * 10) / 10,
            altitude: position.coords.altitude,
            timestamp: position.timestamp || Date.now(),
            source: 'device',
          };
          setCoords(newCoords);
          setIsLoading(false);
          setPermissionStatus('granted');
          resolve(newCoords);
        },
        (err) => {
          let msg = 'Error desconocido al obtener GPS';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Permiso de ubicación denegado por el usuario o navegador.';
              setPermissionStatus('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'Señal de GPS no disponible en este momento.';
              break;
            case err.TIMEOUT:
              msg = 'Tiempo de espera de GPS agotado (10s).';
              break;
          }
          setError(msg);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 3000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  // Continuous watch when enabled
  useEffect(() => {
    if (!isWatching || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy * 10) / 10,
          altitude: position.coords.altitude,
          timestamp: position.timestamp || Date.now(),
          source: 'device',
        });
        setError(null);
      },
      (err) => {
        setError(`GPS Watch Error: ${err.message}`);
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
  }, [isWatching]);

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

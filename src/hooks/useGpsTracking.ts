import { useState, useRef, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
import { translations } from '../translations';
import type { FuelSettings } from './useFuelTracker';

// ── Haversine Distance ───────────────────────────────────────────────────
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

interface GpsTrackingProps {
  settings: FuelSettings;
  onDistanceUpdate: (dist: number, speedKmh: number) => void;
  onTrackingError: (error: { message: string, action?: 'openGPS' | 'openSettings' } | null) => void;
}

export function useGpsTracking({ settings, onDistanceUpdate, onTrackingError }: GpsTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsUpdateCount, setGpsUpdateCount] = useState(0);
  const [lastGpsTime, setLastGpsTime] = useState<string | null>(null);
  
  const watchId = useRef<string | null>(null);
  const lastPositionRef = useRef<any>(null);
  const wakeLock = useRef<any>(null);
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try { wakeLock.current = await (navigator as any).wakeLock.request('screen'); }
      catch (e) { console.warn('[WakeLock]', e); }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock.current) { wakeLock.current.release().catch(() => {}); wakeLock.current = null; }
  };

  const startTracking = async (silent = false) => {
    const isAndroid = (window as any).Capacitor?.getPlatform() === 'android';
    const lang = settingsRef.current.language as 'en' | 'ar';
    
    if (watchId.current !== null) {
      setIsTracking(true);
      return;
    }

    if (!silent) setIsStarting(true);

    try {
      if (!silent) {
        // Permissions
        if (isAndroid) {
          try {
            const AlarmPlugin = registerPlugin<any>('AlarmPlugin');
            const gpsStatus = await AlarmPlugin.checkGPS();
            if (!gpsStatus || !gpsStatus.enabled) {
              onTrackingError({ message: translations[lang].gpsDisabledErrorInner, action: 'openGPS' });
              setIsStarting(false);
              return; // STOP HERE
            }
          } catch (e) {
             console.warn('[GpsTracking] AlarmPlugin.checkGPS failed', e);
          }
        }

        const locPerm = await Geolocation.checkPermissions();
        if (locPerm.location !== 'granted') {
          const result = await Geolocation.requestPermissions();
          if (result.location !== 'granted') {
            onTrackingError({ message: translations[lang].locPermissionReqInner, action: 'openSettings' });
            setIsStarting(false);
            return; // STOP HERE
          }
        }
      }
    } catch (err: any) {
      onTrackingError({ message: translations[lang].setupError + (err?.message || String(err)) });
      setIsStarting(false);
      return;
    }

    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: 'was_tracking', value: 'true' });
      
      const savedPosRes = await Preferences.get({ key: 'last_gps_position' });
      if (savedPosRes.value && !lastPositionRef.current) {
        try { lastPositionRef.current = JSON.parse(savedPosRes.value); } catch {}
      }

      setIsTracking(true);
      setIsStarting(false);
      setGpsUpdateCount(0);

      const wId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        (pos, err) => {
          if (err) {
            onTrackingError({ message: 'GPS Connection Lost' });
            return;
          }
          if (!pos) return;

          onTrackingError(null);
          setGpsUpdateCount(prev => prev + 1);
          setLastGpsTime(new Date().toLocaleTimeString());

          const MAX_GPS_ACCURACY = 50;

          if (pos.coords.accuracy && pos.coords.accuracy > MAX_GPS_ACCURACY) {
            if (pos.coords) {
              lastPositionRef.current = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                timestamp: pos.timestamp ?? Date.now(),
                accuracy: pos.coords.accuracy
              };
            }
            return;
          }

          const nativeSpeed = pos.coords?.speed;
          let currentKmh = 0;
          let calculatedKmh = 0;
          let dist = 0;
          let timeDiffMs = 0;

          if (lastPositionRef.current && pos.coords) {
            const prevTimestamp = lastPositionRef.current.timestamp;
            const currTimestamp = pos.timestamp ?? Date.now();
            const isValidTimestamp = prevTimestamp > 0 && currTimestamp > prevTimestamp;

            dist = calculateDistance(
              lastPositionRef.current.latitude, lastPositionRef.current.longitude,
              pos.coords.latitude, pos.coords.longitude
            );

            if (isValidTimestamp) {
              timeDiffMs = Math.max(1, currTimestamp - prevTimestamp);
              if (timeDiffMs < 60000) {
                const hours = timeDiffMs / (1000 * 60 * 60);
                calculatedKmh = dist / hours;
              }
            }
          }

          if (nativeSpeed !== null && nativeSpeed !== undefined) {
            const nativeKmh = nativeSpeed * 3.6;
            currentKmh = (nativeKmh < 6 && calculatedKmh > 10) ? nativeKmh : Math.max(nativeKmh, calculatedKmh);
          } else {
            currentKmh = calculatedKmh;
          }

          const finalDisplaySpeed = Math.round(currentKmh);
          setCurrentSpeed(finalDisplaySpeed > 0 ? finalDisplaySpeed : 0);

          const maxAllowedDist = Math.max(0.15, (timeDiffMs / 1000) * 0.04);
          const posToSave = {
            latitude: pos.coords?.latitude,
            longitude: pos.coords?.longitude,
            timestamp: pos.timestamp ?? Date.now(),
            accuracy: pos.coords?.accuracy
          };

          import('@capacitor/preferences').then(({ Preferences }) =>
            Preferences.set({ key: 'last_gps_position', value: JSON.stringify(posToSave) })
          ).catch(() => {});

          if (lastPositionRef.current && pos.coords) {
            // Jitter Filter: If distance is within reasonable bounds (e.g. < 144km/h)
            if (dist < maxAllowedDist) {
              if (dist > 0.004) {
                // Precision: Count distance starting from 6km/h to avoid walking noise
                if (currentKmh >= 6) {
                  onDistanceUpdate(dist, currentKmh);
                }
              }
            } else {
               // Recovery: If we hit a massive jump, we don't count the distance (teleportation protection),
               // but we MUST update the reference point to the new location so we don't get stuck forever.
               console.warn('[GpsTracking] Large jump detected, skipping distance but updating reference.');
            }
            lastPositionRef.current = posToSave;
          } else {
            lastPositionRef.current = posToSave;
          }
        }
      );
      watchId.current = String(wId);
      await requestWakeLock();

      try {
        const alarmPlugin = registerPlugin<any>('AlarmPlugin');
        await alarmPlugin.startBackgroundTracking();
      } catch {}

    } catch (e) {
      console.error('[GpsTracking] Start failed', e);
      setIsTracking(false);
      setIsStarting(false);
    }
  };

  const stopTracking = async () => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'was_tracking', value: 'false' });
    await Preferences.remove({ key: 'last_gps_position' });

    if (watchId.current !== null) {
      await Geolocation.clearWatch({ id: watchId.current }).catch(() => {});
      watchId.current = null;
    }

    try {
      const alarmPlugin = registerPlugin<any>('AlarmPlugin');
      await alarmPlugin.stopBackgroundTracking();
    } catch {}

    setCurrentSpeed(0);
    setIsTracking(false);
    releaseWakeLock();
    lastPositionRef.current = null;
  };

  return { isTracking, isStarting, currentSpeed, gpsUpdateCount, lastGpsTime, startTracking, stopTracking };
}

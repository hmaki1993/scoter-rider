import { useState, useRef, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
import { translations } from '../translations';
import type { FuelSettings } from './useFuelTracker';

// ── Haversine Distance (km) ──────────────────────────────────────────────
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ── Bearing between two points (degrees 0-360) ──────────────────────────
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

// ── Simple 1D Kalman Filter for GPS coordinates ─────────────────────────
class KalmanFilter1D {
  private estimate: number;
  private errorEstimate: number;
  private errorMeasure: number;
  private q: number; // process noise

  constructor(initialEstimate: number, errorEstimate = 0.0001, errorMeasure = 0.00015, q = 0.000005) {
    this.estimate = initialEstimate;
    this.errorEstimate = errorEstimate;
    this.errorMeasure = errorMeasure;
    this.q = q;
  }

  update(measurement: number, accuracy?: number): number {
    // Adapt measurement noise based on GPS accuracy (if available)
    if (accuracy !== undefined && accuracy > 0) {
      // Convert meters accuracy to approximate degree noise
      this.errorMeasure = Math.max(0.00005, accuracy / 111000);
    }

    // Prediction step
    this.errorEstimate += this.q;

    // Update step
    const kalmanGain = this.errorEstimate / (this.errorEstimate + this.errorMeasure);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.errorEstimate = (1 - kalmanGain) * this.errorEstimate;

    return this.estimate;
  }

  reset(value: number) {
    this.estimate = value;
    this.errorEstimate = 0.0001;
  }
}

interface GpsTrackingProps {
  settings: FuelSettings;
  onDistanceUpdate: (dist: number, speedKmh: number) => void;
  onTrackingError: (error: { message: string, action?: 'openGPS' | 'openSettings' } | null) => void;
}

interface SavedPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  bearing?: number;
}

export function useGpsTracking({ settings, onDistanceUpdate, onTrackingError }: GpsTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsUpdateCount, setGpsUpdateCount] = useState(0);
  const [lastGpsTime, setLastGpsTime] = useState<string | null>(null);
  
  const watchId = useRef<string | null>(null);
  const lastPositionRef = useRef<SavedPosition | null>(null);
  // Reference point for distance accumulation — only moves when we accept a segment
  const lastAcceptedRef = useRef<SavedPosition | null>(null);
  const wakeLock = useRef<any>(null);
  const settingsRef = useRef(settings);
  const kalmanLat = useRef<KalmanFilter1D | null>(null);
  const kalmanLon = useRef<KalmanFilter1D | null>(null);
  const lastBearingRef = useRef<number | null>(null);
  // Track consecutive still readings to avoid counting drift while stopped
  const stillCountRef = useRef(0);

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
              return;
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
            return;
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
        try {
          const parsed = JSON.parse(savedPosRes.value);
          lastPositionRef.current = parsed;
          lastAcceptedRef.current = parsed;
          // Initialize Kalman with saved position
          kalmanLat.current = new KalmanFilter1D(parsed.latitude);
          kalmanLon.current = new KalmanFilter1D(parsed.longitude);
        } catch {}
      }

      setIsTracking(true);
      setIsStarting(false);
      setGpsUpdateCount(0);
      stillCountRef.current = 0;
      lastBearingRef.current = null;

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

          // ── GUARD 1: Accuracy filter — reject readings worse than 20m ──
          const MAX_GPS_ACCURACY = 20;
          if (pos.coords.accuracy && pos.coords.accuracy > MAX_GPS_ACCURACY) {
            console.log('[GPS] Skipping low accuracy reading:', pos.coords.accuracy.toFixed(0) + 'm');
            return; // Don't even update lastPosition with bad data
          }

          const rawLat = pos.coords.latitude;
          const rawLon = pos.coords.longitude;
          const accuracy = pos.coords.accuracy || 10;
          const currTimestamp = pos.timestamp ?? Date.now();

          // ── Apply Kalman Filter to smooth GPS coordinates ──
          if (!kalmanLat.current || !kalmanLon.current) {
            kalmanLat.current = new KalmanFilter1D(rawLat);
            kalmanLon.current = new KalmanFilter1D(rawLon);
          }
          const smoothLat = kalmanLat.current.update(rawLat, accuracy);
          const smoothLon = kalmanLon.current.update(rawLon, accuracy);

          // ── Speed from native GPS (most reliable) ──
          const nativeSpeed = pos.coords?.speed;
          let currentKmh = 0;

          if (nativeSpeed !== null && nativeSpeed !== undefined && nativeSpeed >= 0) {
            currentKmh = nativeSpeed * 3.6;
          }

          // ── Track if we're standing still ──
          if (currentKmh < 5) {
            stillCountRef.current++;
          } else {
            stillCountRef.current = 0;
          }

          const finalDisplaySpeed = Math.round(currentKmh);
          setCurrentSpeed(finalDisplaySpeed > 0 ? finalDisplaySpeed : 0);

          // ── Distance calculation using ACCEPTED reference point ──
          const refPoint = lastAcceptedRef.current;

          if (refPoint) {
            const prevTimestamp = refPoint.timestamp;
            const isValidTimestamp = prevTimestamp > 0 && currTimestamp > prevTimestamp;

            // Distance from last accepted point to current smoothed position
            const dist = calculateDistance(
              refPoint.latitude, refPoint.longitude,
              smoothLat, smoothLon
            );

            // Also compute calculated speed from distance
            let calculatedKmh = 0;
            let timeDiffMs = 0;
            if (isValidTimestamp) {
              timeDiffMs = Math.max(1, currTimestamp - prevTimestamp);
              if (timeDiffMs < 60000) {
                const hours = timeDiffMs / (1000 * 60 * 60);
                calculatedKmh = dist / hours;
              }
            }

            // Use native speed primarily, fall back to calculated
            if (currentKmh < 1 && calculatedKmh > 15) {
              currentKmh = calculatedKmh; // GPS chip lag fix
            }

            // ── GUARD 2: Time-based max distance (120 km/h max) ──
            if (timeDiffMs > 0) {
              const maxAllowedDist = (timeDiffMs / 1000) * (120 / 3600);

              if (dist > maxAllowedDist) {
                console.warn('[GPS] Jump detected (dist=' + (dist*1000).toFixed(0) + 'm, max=' + (maxAllowedDist*1000).toFixed(0) + 'm), resetting.');
                // Reset Kalman and reference on teleport
                kalmanLat.current?.reset(rawLat);
                kalmanLon.current?.reset(rawLon);
                lastAcceptedRef.current = {
                  latitude: rawLat, longitude: rawLon,
                  timestamp: currTimestamp, accuracy
                };
                lastBearingRef.current = null;
              }
              // ── GUARD 3: Minimum distance 25m to count ──
              // ── GUARD 4: Must be moving ≥ 10 km/h (native speed) ──
              // ── GUARD 5: Must not be in a "still" streak ──
              else if (
                dist > 0.025 &&            // at least 25m moved
                currentKmh >= 10 &&         // must be genuinely moving (scooter minimum)
                stillCountRef.current < 3   // not standing still for multiple readings
              ) {
                // ── GUARD 6: Bearing consistency check ──
                const bearing = calculateBearing(
                  refPoint.latitude, refPoint.longitude,
                  smoothLat, smoothLon
                );

                let bearingOk = true;
                if (lastBearingRef.current !== null && dist < 0.080) {
                  // For short segments, check bearing didn't flip 180° (GPS bounce)
                  let bearingDiff = Math.abs(bearing - lastBearingRef.current);
                  if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
                  if (bearingDiff > 150) {
                    bearingOk = false;
                    console.log('[GPS] Bearing flip detected (' + bearingDiff.toFixed(0) + '°), skipping segment.');
                  }
                }

                if (bearingOk) {
                  // ✅ Accept this segment
                  onDistanceUpdate(dist, currentKmh);
                  lastBearingRef.current = bearing;

                  // Move accepted reference to current position
                  lastAcceptedRef.current = {
                    latitude: smoothLat, longitude: smoothLon,
                    timestamp: currTimestamp, accuracy, bearing
                  };
                }
              }
            }
          } else {
            // First reading — set as reference
            lastAcceptedRef.current = {
              latitude: smoothLat, longitude: smoothLon,
              timestamp: currTimestamp, accuracy
            };
          }

          // Always update lastPosition for persistence
          const posToSave: SavedPosition = {
            latitude: smoothLat,
            longitude: smoothLon,
            timestamp: currTimestamp,
            accuracy
          };
          lastPositionRef.current = posToSave;

          import('@capacitor/preferences').then(({ Preferences }) =>
            Preferences.set({ key: 'last_gps_position', value: JSON.stringify(posToSave) })
          ).catch(() => {});
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
    lastAcceptedRef.current = null;
    kalmanLat.current = null;
    kalmanLon.current = null;
    lastBearingRef.current = null;
    stillCountRef.current = 0;
  };

  return { isTracking, isStarting, currentSpeed, gpsUpdateCount, lastGpsTime, startTracking, stopTracking };
}

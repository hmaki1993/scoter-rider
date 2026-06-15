import { useState, useRef, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { AlarmPlugin } from '../AlarmPlugin';
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

  constructor(initialEstimate: number, errorEstimate = 0.0001, errorMeasure = 0.00015, q = 0.000015) {
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
  initialOdo: number;
  onDistanceUpdate: (dist: number, speedKmh: number) => void;
  onTrackingError: (error: { message: string, action?: 'openGPS' | 'openSettings' } | null) => void;
  onTrackingStart?: () => void;
}

interface SavedPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  bearing?: number;
}

export function useGpsTracking({ settings, initialOdo, onDistanceUpdate, onTrackingError, onTrackingStart }: GpsTrackingProps) {
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
  // ── Traffic Mode Logic State ──
  const isScooterModeRef = useRef(true);
  const scooterModeConfirmCountRef = useRef(0);
  const walkingDurationStartRef = useRef(0);
  const pendingDistanceKmRef = useRef(0.0);

  const onDistanceUpdateRef = useRef(onDistanceUpdate);
  const onTrackingErrorRef = useRef(onTrackingError);
  const onTrackingStartRef = useRef(onTrackingStart);

  useEffect(() => { onDistanceUpdateRef.current = onDistanceUpdate; }, [onDistanceUpdate]);
  useEffect(() => { onTrackingErrorRef.current = onTrackingError; }, [onTrackingError]);
  useEffect(() => { onTrackingStartRef.current = onTrackingStart; }, [onTrackingStart]);

  useEffect(() => { settingsRef.current = settings; }, [settings]);



  useEffect(() => {
    let appStateListener: any = null;
    let gpsListener: any = null;
    let isResuming = false;

    const handleResume = async () => {
      if (isResuming) return;
      isResuming = true;

      // CLEAR ANCHOR IMMEDIATELY so any pending JS GPS callback doesn't add background distance
      lastPositionRef.current = null;
      lastAcceptedRef.current = null;
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.remove({ key: 'last_gps_position' }).catch(() => {});
      });
      localStorage.removeItem('last_gps_position');

      try {
        const { Preferences } = await import('@capacitor/preferences');
        const wasTrackingRes = await Preferences.get({ key: 'was_tracking' });
        const stillTracking = wasTrackingRes.value === 'true' || localStorage.getItem('was_tracking') === 'true';
        
        const resumeAfterGpsRes = await Preferences.get({ key: 'resume_tracking_on_gps' });
        const resumeAfterGps = resumeAfterGpsRes.value === 'true' || localStorage.getItem('resume_tracking_on_gps') === 'true';

        // 1. Recover native distance
        if (stillTracking) {
          try {

            const res = await AlarmPlugin.getNativeDistance();
            if (res && res.distanceKm && res.distanceKm > 0) {
              onDistanceUpdateRef.current(res.distanceKm, 0);
            }
          } catch (e) {
            console.warn('[GpsTracking] Failed to get native distance:', e);
          }
        }

        // 2. GPS status recovery check
        try {

          const status = await AlarmPlugin.checkGPS();
          if (status && status.enabled) {
            onTrackingErrorRef.current(null);
          } else {
            const currentLang = settingsRef.current.language as 'en' | 'ar';
            const msg = currentLang === 'ar' 
              ? '📍 الـ GPS مقفول خالص يا ريس. افتحه الأول من السيتنج عشان أقدر أحسبلك المشوار.'
              : '📍 GPS is completely disabled. Enable it first to grant permissions.';
            onTrackingErrorRef.current({ message: msg, action: 'openGPS' });
          }
        } catch (e) {}

        if (resumeAfterGps) {
          console.log('[GpsTracking] Returned from GPS settings — retrying tracking...');
          import('@capacitor/preferences').then(({ Preferences }) => {
            Preferences.remove({ key: 'resume_tracking_on_gps' }).catch(() => {});
          });
          localStorage.removeItem('resume_tracking_on_gps');
          if (watchId.current !== null) {
            try { Geolocation.clearWatch({ id: watchId.current }).catch(() => {}); } catch(e) {}
            watchId.current = null;
          }
          setTimeout(() => startTracking(false), 800);
        } else if (stillTracking) {
          console.log('[GpsTracking] App resumed — resetting geolocation watcher');
          if (watchId.current !== null) {
            try { Geolocation.clearWatch({ id: watchId.current }).catch(() => {}); } catch(e) {}
            watchId.current = null;
          }
          startTracking(true);
        }
      } finally {
        setTimeout(() => { isResuming = false; }, 2000);
      }
    };

    const init = async () => {
      const { Preferences } = await import('@capacitor/preferences');
      const wasTrackingRes = await Preferences.get({ key: 'was_tracking' });
      const wasTracking = wasTrackingRes.value === 'true' || localStorage.getItem('was_tracking') === 'true';

      lastPositionRef.current = null;
      lastAcceptedRef.current = null;
      await Preferences.remove({ key: 'last_gps_position' });
      localStorage.removeItem('last_gps_position');

      // Recover accumulated distance if app was killed while tracking
      if (wasTracking) {
        try {
          // AlarmPlugin is already registered at module level
          const res = await AlarmPlugin.getNativeDistance();
          if (res && res.distanceKm && res.distanceKm > 0) {
            onDistanceUpdateRef.current(res.distanceKm, 0);
          }
        } catch (e) {}
      }

      if (wasTracking && !isTracking) {
        await new Promise(r => setTimeout(r, 1500));
        startTracking(true);
      }

      // Check GPS status immediately on boot
      try {
        const isAndroid = (window as any).Capacitor?.getPlatform() === 'android';
        if (isAndroid) {

          const status = await AlarmPlugin.checkGPS();
          if (status && !status.enabled) {
            const currentLang = settingsRef.current.language as 'en' | 'ar';
            const msg = currentLang === 'ar' 
              ? '📍 الـ GPS مقفول خالص يا ريس. افتحه الأول من السيتنج عشان أقدر أحسبلك المشوار.'
              : '📍 GPS is completely disabled. Enable it first to grant permissions.';
            onTrackingErrorRef.current({ message: msg, action: 'openGPS' });
          }
        }
      } catch (e) {
        console.warn('[GpsTracking] Init GPS check failed:', e);
      }

      try {

        gpsListener = await AlarmPlugin.addListener('gpsStateChanged', (data: any) => {
          if (!data.enabled) {
            console.warn('[GpsTracking] GPS disabled detected via broadcast!');
            const currentLang = settingsRef.current.language as 'en' | 'ar';
            const msg = currentLang === 'ar' 
              ? '📍 الـ GPS مقفول خالص يا ريس. افتحه الأول من السيتنج عشان أقدر أحسبلك المشوار.'
              : '📍 GPS is completely disabled. Enable it first to grant permissions.';
            onTrackingErrorRef.current({ message: msg, action: 'openGPS' });
            import('@capacitor/local-notifications').then(async ({ LocalNotifications }) => {
              try {
                await LocalNotifications.createChannel({
                  id: 'gps_alert_heads_up_v1',
                  name: 'GPS Critical Alerts',
                  description: 'High priority alerts for GPS status',
                  importance: 5,
                  visibility: 1,
                  vibration: true,
                });
              } catch (e) {
                console.log('Error creating channel', e);
              }
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: currentLang === 'ar' ? "تم إيقاف تتبع الـ GPS" : "GPS Tracking Stopped",
                    body: currentLang === 'ar' ? "الـ GPS مقفول. برجاء تشغيله للمتابعة." : "GPS is disabled. Please turn it back on to continue tracking.",
                    id: 1001,
                    channelId: 'gps_alert_heads_up_v1',
                    schedule: { at: new Date(Date.now() + 100) },
                  }
                ]
              });
            }).catch(() => {});
          } else {
            console.log('[GpsTracking] GPS enabled detected via broadcast!');
            onTrackingErrorRef.current(null);
          }
        });
      } catch (e) {
        console.warn('[GpsTracking] Could not add gpsStateChanged listener', e);
      }

      const { App } = await import('@capacitor/app');
      appStateListener = await App.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          await handleResume();
        } else {
          // Clear anchor on background
          lastPositionRef.current = null;
          lastAcceptedRef.current = null;
          Preferences.remove({ key: 'last_gps_position' }).catch(() => {});
          localStorage.removeItem('last_gps_position');
          // Reset native distance counter to 0: JS already counted foreground distance,
          // so native should only accumulate from NOW (background-only distance)
          try {

            AlarmPlugin.resetNativeDistance().catch(() => {});
          } catch (e) {}
          // Fix Double Tracking: Stop JS watcher so it doesn't run concurrently with Native Service
          if (watchId.current !== null) {
            try { Geolocation.clearWatch({ id: watchId.current }).catch(() => {}); } catch(e) {}
            watchId.current = null;
          }
        }
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      } else {
        lastPositionRef.current = null;
        lastAcceptedRef.current = null;
        import('@capacitor/preferences').then(({ Preferences }) => {
          Preferences.remove({ key: 'last_gps_position' }).catch(() => {});
        });
        localStorage.removeItem('last_gps_position');
        // Reset native distance counter to 0: JS already counted foreground distance
        try {

          AlarmPlugin.resetNativeDistance().catch(() => {});
        } catch (e) {}
        // Fix Double Tracking: Stop JS watcher so it doesn't run concurrently with Native Service
        if (watchId.current !== null) {
          try { Geolocation.clearWatch({ id: watchId.current }).catch(() => {}); } catch(e) {}
          watchId.current = null;
        }
      }
    };

    init();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      appStateListener?.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Wait for gpsListener to resolve and remove if it exists. Since it's a promise, we handle it simply
      // But we can't easily wait for the promise in a sync cleanup function, so we'll just ignore for now or if we had it synchronously. 
      // Capacitor listener objects have a .remove() method. 
      if (gpsListener && typeof gpsListener.remove === 'function') {
        gpsListener.remove();
      }
    };
  }, []);

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
      localStorage.setItem('was_tracking', 'true');
      
      // Auto-set trip base on first tracking start (so trip counter works immediately)
      const existingTripBase = localStorage.getItem('custom_trip_base');
      if (!existingTripBase) {
        localStorage.setItem('custom_trip_base', String(initialOdo));
        Preferences.set({ key: 'custom_trip_base', value: String(initialOdo) }).catch(() => {});
      }
      onTrackingStartRef.current?.();

      let savedPosVal = localStorage.getItem('last_gps_position');
      if (!savedPosVal) {
        const savedPosRes = await Preferences.get({ key: 'last_gps_position' });
        savedPosVal = savedPosRes.value;
      }
      if (savedPosVal && !lastPositionRef.current) {
        try {
          const parsed = JSON.parse(savedPosVal);
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
            onTrackingError({ message: 'We lost connection to your GPS signal. Please make sure Location Services are turned on to continue tracking.', action: 'openGPS' });
            return;
          }
          if (!pos) return;

          onTrackingError(null);
          setGpsUpdateCount(prev => prev + 1);
          setLastGpsTime(new Date().toLocaleTimeString());

          // ── GUARD 1: Accuracy filter — reject readings worse than 100m ──
          const MAX_GPS_ACCURACY = 100;
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

          // Use RAW coordinates when GPS accuracy is good, Kalman only when poor
          const useLat = accuracy <= 15 ? rawLat : smoothLat;
          const useLon = accuracy <= 15 ? rawLon : smoothLon;

          // ── Speed from native GPS (most reliable) ──
          const nativeSpeed = pos.coords?.speed;
          let currentKmh = 0;

          if (nativeSpeed !== null && nativeSpeed !== undefined && nativeSpeed >= 0) {
            currentKmh = nativeSpeed * 3.6;
          }

          // ── Track if we're standing still ──
          if (currentKmh < 3) {
            stillCountRef.current++;
          } else {
            stillCountRef.current = 0;
          }

          // ── Smart Activity Recognition (Scooter vs Walk) ──
          // First, calculate distance and speed from last accepted point
          let activeSpeed = currentKmh;
          const refPoint = lastAcceptedRef.current;
          let distFromRef = 0;
          
          if (refPoint) {
            const prevTimestamp = refPoint.timestamp;
            const isValidTimestamp = prevTimestamp > 0 && currTimestamp > prevTimestamp;
            distFromRef = calculateDistance(refPoint.latitude, refPoint.longitude, useLat, useLon);
            if (isValidTimestamp) {
              // const timeDiffMs = Math.max(1, currTimestamp - prevTimestamp);
              // calculatedKmhFromRef = distFromRef / (timeDiffMs / (1000 * 60 * 60));
            }
          }
          
          activeSpeed = currentKmh;

          if (activeSpeed >= 8.0) {
            scooterModeConfirmCountRef.current += 1;
            if (scooterModeConfirmCountRef.current >= 4) {
              isScooterModeRef.current = true;
              walkingDurationStartRef.current = 0;
              if (pendingDistanceKmRef.current > 0.0) {
                onDistanceUpdateRef.current(pendingDistanceKmRef.current, currentKmh);
                pendingDistanceKmRef.current = 0.0;
              }
            }
          } else {
            scooterModeConfirmCountRef.current = 0;
            isScooterModeRef.current = false;
            
            if (activeSpeed >= 1.0) {
              if (walkingDurationStartRef.current === 0) {
                walkingDurationStartRef.current = currTimestamp;
              } else if (currTimestamp - walkingDurationStartRef.current >= 45000) {
                pendingDistanceKmRef.current = 0.0;
              }
            } else {
              // Pause timer when stopped
              if (walkingDurationStartRef.current !== 0 && currTimestamp > 0) {
                // Just use the time since last location update (roughly 1000ms if watchPosition is 1hz)
                // We don't have prevTimestamp here, but we know location updates are ~1s apart
                walkingDurationStartRef.current += 1000;
              }
            }
          }

          const finalDisplaySpeed = Math.round(currentKmh);
          setCurrentSpeed(finalDisplaySpeed > 0 ? finalDisplaySpeed : 0);

          // ── Distance calculation using ACCEPTED reference point ──
          if (refPoint) {
            const prevTimestamp = refPoint.timestamp;
            const isValidTimestamp = prevTimestamp > 0 && currTimestamp > prevTimestamp;

            // Distance from last accepted point to current position
            const dist = calculateDistance(
              refPoint.latitude, refPoint.longitude,
              useLat, useLon
            );

            // Also compute calculated speed from distance
            let calculatedKmh = 0;
            let timeDiffMs = 0;
            if (isValidTimestamp) {
              timeDiffMs = Math.max(1, currTimestamp - prevTimestamp);
              const hours = timeDiffMs / (1000 * 60 * 60);
              calculatedKmh = dist / hours;
            }

            // Use native speed primarily, fall back to calculated
            if (currentKmh < 1 && calculatedKmh > 15) {
              currentKmh = calculatedKmh; // GPS chip lag fix
            }

            // ── GUARD 2: Time-based max distance (120 km/h max) ──
            if (timeDiffMs > 0) {
              const maxAllowedDist = Math.max(0.150, (timeDiffMs / 1000) * (120 / 3600));

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
              // ── GUARD 3: Minimum distance 5m to count ──
              else if (dist > 0.005) {
                // ── GUARD 4: Bearing consistency check ──
                const bearing = calculateBearing(
                  refPoint.latitude, refPoint.longitude,
                  smoothLat, smoothLon
                );

                let bearingOk = true;
                if (lastBearingRef.current !== null && dist < 0.030) {
                  // Only check bearing for very short segments (<30m) to catch GPS bounce
                  let bearingDiff = Math.abs(bearing - lastBearingRef.current);
                  if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;
                  if (bearingDiff > 170) {
                    bearingOk = false;
                    console.log('[GPS] Bearing flip detected (' + bearingDiff.toFixed(0) + '°), skipping segment.');
                  }
                }

                if (bearingOk) {
                  if (activeSpeed >= 1.0) {
                    if (isScooterModeRef.current) {
                      onDistanceUpdateRef.current(dist, currentKmh);
                    } else {
                      pendingDistanceKmRef.current += dist;
                      if (pendingDistanceKmRef.current > 0.5) pendingDistanceKmRef.current = 0.5;
                    }
                  } else {
                    console.log(`[GPS] Ignoring distance. Speed: ${currentKmh.toFixed(1)} km/h, Calc: ${calculatedKmh.toFixed(1)} km/h`);
                  }
                  lastBearingRef.current = bearing;

                  // Move accepted reference to current position
                  lastAcceptedRef.current = {
                    latitude: useLat, longitude: useLon,
                    timestamp: currTimestamp, accuracy, bearing
                  };
                }
              }
            }
          } else {
            // First reading — set as reference
            lastAcceptedRef.current = {
              latitude: useLat, longitude: useLon,
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
          localStorage.setItem('last_gps_position', JSON.stringify(posToSave));
        }
      );
      watchId.current = String(wId);
      await requestWakeLock();

      try {

        await AlarmPlugin.startBackgroundTracking();
      } catch {}

    } catch (e) {
      console.error('[GpsTracking] Start failed', e);
      setIsTracking(false);
      setIsStarting(false);
    }
  };

  const stopTracking = async () => {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key: 'was_tracking', value: 'false' });
      await Preferences.remove({ key: 'last_gps_position' });
    } catch {}
    localStorage.setItem('was_tracking', 'false');
    localStorage.removeItem('last_gps_position');

    if (watchId.current !== null) {
      await Geolocation.clearWatch({ id: watchId.current }).catch(() => {});
      watchId.current = null;
    }

    try {

      await AlarmPlugin.stopBackgroundTracking();
    } catch {}

    setCurrentSpeed(0);
    setIsTracking(false);
    releaseWakeLock();
    lastPositionRef.current = null;
    lastAcceptedRef.current = null;
    kalmanLat.current = null;
  };

  return { isTracking, isStarting, currentSpeed, gpsUpdateCount, lastGpsTime, startTracking, stopTracking };
}

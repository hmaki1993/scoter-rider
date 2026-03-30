import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { translations } from '../translations';

export interface FuelSettings {
  tankCapacity: number; // Liters
  avgConsumption: number; // km per liter
  warningThreshold: number; // km remaining to trigger warning
  fuelPricePerLiter: number; // EGP per Liter
  autoTrack: boolean; // Automatically start GPS on app load
  enableAlerts: boolean; // Sound/Vibrate on low fuel
  language: 'en' | 'ar';
}

export interface UserProfile {
  name: string;
  phone: string;
  vehicleType: string;
  photoUrl?: string;
  photoPosition?: { x: number, y: number, scale: number };
  registeredAt: string;
}

export interface FuelState {
  estimatedFuelLiters: number;
  lastOdo: number;
  totalGpsDistance: number;
}

export interface RefuelLog {
  id: string;
  date: string;
  odo: number;
  litersAdded: number;
  pricePaid?: number;
  isFullTank: boolean;
  fuelBeforeRefuel?: number;
}

const DEFAULT_SETTINGS: FuelSettings = {
  tankCapacity: 7,
  avgConsumption: 21.4,
  warningThreshold: 30,
  fuelPricePerLiter: 22.25,
  autoTrack: false,
  enableAlerts: true,
  language: 'ar',
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: safely get BackgroundGeolocation plugin (cached)
// ─────────────────────────────────────────────────────────────────────────────
let _bgGeoInstance: any = null;
async function getBGGeo() {
  if (!_bgGeoInstance) {
    const { registerPlugin } = await import('@capacitor/core');
    // We use the string 'BackgroundGeolocation' which is the default for the community plugin
    _bgGeoInstance = registerPlugin<any>('BackgroundGeolocation');
  }
  return _bgGeoInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: check if we're on Android
// ─────────────────────────────────────────────────────────────────────────────
function isAndroidPlatform() {
  return (window as any).Capacitor?.getPlatform() === 'android';
}

export const useFuelTracker = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('scooter_user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [settings, setSettings] = useState<FuelSettings>(() => {
    const saved = localStorage.getItem('fuel_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [fuelState, setFuelState] = useState<FuelState>(() => {
    const saved = localStorage.getItem('fuel_state');
    return saved ? JSON.parse(saved) : { estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 };
  });
  const [logs, setLogs] = useState<RefuelLog[]>(() => {
    const saved = localStorage.getItem('fuel_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [isTracking, setIsTracking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [trackingError, setTrackingError] = useState<{ message: string; action?: 'openGPS' | 'openSettings' } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0); // KM/H
  const [isMuted, setIsMuted] = useState(false);
  const [gpsUpdateCount, setGpsUpdateCount] = useState(0);
  const [lastGpsTime, setLastGpsTime] = useState<string | null>(null);
  const lastPositionRef = useRef<any>(null);
  const watchId = useRef<string | null>(null);
  const wakeLock = useRef<any>(null);
  const lastNotifiedStepRef = useRef<number>(999);

  // ── settingsRef: always up-to-date inside GPS callbacks (fixes stale closure) ──
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── Restore last GPS position from localStorage on mount ──────────────────
  useEffect(() => {
    const saved = localStorage.getItem('last_gps_position');
    if (saved) {
      try { lastPositionRef.current = JSON.parse(saved); } catch { /* ignore */ }
    }
  }, []);

  // ── Register Notification Channel & Actions ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        const lang = (settings.language in translations) ? settings.language : 'ar';
        await LocalNotifications.registerActionTypes({
          types: [{
            id: 'FUEL_ALARM_ACTIONS',
            actions: [{
              id: 'silence',
              title: (translations[lang] as any)?.stopNotif || 'Stop',
              foreground: false,
            }]
          }]
        });

        await LocalNotifications.createChannel({
          id: 'fuel_alerts',
          name: 'Fuel Alerts',
          description: 'Critical fuel reminders',
          importance: 5,
          visibility: 1,
          sound: 'alarm.wav',
          vibration: true
        });

        const listener = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          if (action.actionId === 'silence') {
            setIsMuted(true);
            import('@capacitor/core').then(({ registerPlugin }) => {
              registerPlugin<any>('AlarmPlugin').stopAlarm().catch(() => {});
            });
            LocalNotifications.removeAllDeliveredNotifications();
          }
        });

        return () => { listener.remove(); };
      } catch (e) {
        console.warn('[FuelTracker] Notification setup failed:', e);
      }
    })();
  }, []);

  // ── Audio Warning ─────────────────────────────────────────────────────────
  const playWarningSound = (isAlarm = false) => {
    if (!settings.enableAlerts || isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const playBeep = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.5, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(start); osc.stop(start + dur);
      };
      if (isAlarm) {
        import('@capacitor/core').then(({ registerPlugin }) => {
          registerPlugin<any>('AlarmPlugin').playAlarm().catch(() => {});
        });
        for (let i = 0; i < 20; i++) playBeep(i % 2 === 0 ? 900 : 1800, ctx.currentTime + i * 0.15, 0.12);
        if (navigator.vibrate) navigator.vibrate([300,100,300,100,300,500,800,200,800,200,800]);
      } else {
        playBeep(600, ctx.currentTime, 0.4);
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } catch (e) { console.warn('Audio failed', e); }
  };

  // ── Wake Lock ─────────────────────────────────────────────────────────────
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try { wakeLock.current = await (navigator as any).wakeLock.request('screen'); }
      catch (e) { console.warn('[WakeLock]', e); }
    }
  };
  const releaseWakeLock = () => {
    if (wakeLock.current) { wakeLock.current.release(); wakeLock.current = null; }
  };

  // ── Haversine Distance ───────────────────────────────────────────────────
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // startTracking — THE CORE FUNCTION
  // silent=false → user pressed button (request permissions if needed)
  // silent=true  → auto-restart after swipe-kill / resume from background
  // ═══════════════════════════════════════════════════════════════════════════
  const startTracking = async (silent = false) => {
    const isAndroid = isAndroidPlatform();

    // ── GUARD: already running ───────────────────────────────────────────
    if (watchId.current !== null) {
      setIsTracking(true);
      return;
    }

    if (!silent) setIsStarting(true);

    try {
      const isWeb = (window as any).Capacitor?.getPlatform() === 'web';

      // ────────────────────────────────────────────────────────────────────
      // STEP 1: Interactive Permission Checks (Only if NOT silent)
      // ────────────────────────────────────────────────────────────────────
      if (!silent && !isWeb) {
        // Notifications (Android only)
        if (isAndroid) {
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
          } catch (e) { console.warn('[FuelTracker] Notification permission error:', e); }
        }

        // ── 1. Check GPS Hardware First ──
        // Capacitor Geolocation throws an error if we check tracking permissions while GPS is physically off.
        // ── 1. Check GPS Hardware First ──
        // Capacitor Geolocation throws an error if we check tracking permissions while GPS is physically off.
        if (isAndroid) {
          try {
            const { registerPlugin } = await import('@capacitor/core');
            const AlarmPlugin = registerPlugin<any>('AlarmPlugin');
            const gpsStatus = await AlarmPlugin.checkGPS();
            if (!gpsStatus || !gpsStatus.enabled) {
              setTrackingError({ message: translations[settings.language].gpsDisabledErrorInner, action: 'openGPS' });
            }
          } catch (gpsErr) { console.warn('[FuelTracker] Instant GPS check failed:', gpsErr); }
        }

        // ── 2. Location Permissions ──
        try {
          const locPerm = await Geolocation.checkPermissions();
          if (locPerm.location !== 'granted') {
            const result = await Geolocation.requestPermissions();
            if (result.location !== 'granted') {
              setTrackingError({ message: translations[settings.language].locPermissionReqInner, action: 'openSettings' });
              setIsStarting(false);
              return;
            }
          }
        } catch (permErr: any) {
          const msg = permErr?.message || String(permErr);
          // If the plugin still complains about GPS OFF
          if (msg.includes('Location services are not enabled')) {
             setTrackingError({ message: translations[settings.language].gpsDisabledErrorInner, action: 'openGPS' });
          } else {
             setTrackingError({ message: translations[settings.language].locPermissionReqInner + msg });
          }
          setIsStarting(false);
          return;
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // STEP 2: Silent Mode Guard (Only if silent=true)
      // ────────────────────────────────────────────────────────────────────
      if (silent && isAndroid) {
        const locPerm = await Geolocation.checkPermissions();
        if (locPerm.location !== 'granted') {
          localStorage.setItem('was_tracking', 'false');
          return;
        }
      }
    } catch (err: any) {
      console.error('[FuelTracker] Start logic failed:', err);
      setTrackingError({ 
        message: translations[settings.language].setupError + (err?.message || String(err)),
        action: undefined
      });
      setIsStarting(false);
      return;
    }

    // ── STEP 3: Initiate Tracking ────────────────────────────────────────
    localStorage.setItem('was_tracking', 'true');
    localStorage.removeItem('resume_tracking_on_gps');

    // Restore last position if available
    const savedPos = localStorage.getItem('last_gps_position');
    if (savedPos && !lastPositionRef.current) {
      try { lastPositionRef.current = JSON.parse(savedPos); } catch { /* ignore */ }
    }

    setIsTracking(true);
    setIsStarting(false);
    setGpsUpdateCount(0);
    setLastGpsTime(null);

    // ── Start BackgroundGeolocation Watcher ──────────────────────────────
    try {
      const BgGeo = await getBGGeo();
      const id = await BgGeo.addWatcher(
        {
          backgroundMessage: translations[settingsRef.current.language === 'ar' ? 'ar' : 'en']?.bgMsg ?? 'Tracking location...',
          backgroundTitle: translations[settingsRef.current.language === 'ar' ? 'ar' : 'en']?.bgTitle ?? 'Scooter Tracker',
          requestPermissions: true,
          stale: false,
          distanceFilter: 0, // Set to 0 for continuous background updates as requested
        },
        (pos: any, err: any) => {
          if (err) { 
            console.error('[FuelTracker] GPS error:', err);
            setTrackingError({ message: 'GPS Connection Lost' });
            return; 
          }
          if (!pos) return;

          // ── SUCCESS: Clear any previous tracking error automatically ──
          setTrackingError(null);

          // ── Update diagnostics ──
          setGpsUpdateCount(prev => prev + 1);
          setLastGpsTime(new Date().toLocaleTimeString());
          if (trackingError) setTrackingError(null);

          // ── Update Current Speed (m/s to KM/H) ───────────────────────────
          if (pos.speed !== undefined && pos.speed !== null) {
            const kmh = Math.round(pos.speed * 3.6);
            setCurrentSpeed(kmh > 0.5 ? kmh : 0);
          } else {
            setCurrentSpeed(0);
          }

          // ── Persist latest position so it survives app kill ───────────────
          const posToSave = { latitude: pos.latitude, longitude: pos.longitude, timestamp: pos.time ?? Date.now() };
          localStorage.setItem('last_gps_position', JSON.stringify(posToSave));

          setFuelState(prev => {
            if (lastPositionRef.current) {
              const dist = calculateDistance(
                lastPositionRef.current.latitude, lastPositionRef.current.longitude,
                pos.latitude, pos.longitude
              );
              // Threshold 0.0005km (0.5 meter) to be ultra sensitive but filter tiny noise/jitter
              if (dist > 0.0005) {
                const consumed = dist / settingsRef.current.avgConsumption; // Use settingsRef.current
                lastPositionRef.current = posToSave;
                return {
                  ...prev,
                  estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                  lastOdo: prev.lastOdo + dist,
                  totalGpsDistance: prev.totalGpsDistance + dist,
                };
              }
              return prev;
            }
            lastPositionRef.current = posToSave;
            return prev;
          });
        }
      );
      watchId.current = id;

      // ── One-time prompt for "Allow all the time" (Background Location) ────
      // This is needed for the GPS to keep running when the app is FULLY closed.
      // On Android 11+, the user MUST do this manually in Settings > Apps > Location.
      // We show this prompt once per install (not every time the user starts tracking).
      if (!silent && isAndroid && !localStorage.getItem('bg_location_prompted')) {
        localStorage.setItem('bg_location_prompted', 'true');
        setTimeout(() => {
          const shouldOpen = confirm(
            translations[settings.language].bgLocationPromptTitle + '\n\n' +
            translations[settings.language].bgLocationPromptBody
          );
          if (shouldOpen) {
            import('@capacitor/core').then(({ registerPlugin }) => {
              const AlarmPlugin = registerPlugin<any>('AlarmPlugin');
              // Open App Details Settings (not general location settings)
              AlarmPlugin.openAppSettings().catch(() => {
                // Fallback to location settings
                AlarmPlugin.openLocationSettings().catch(() => {});
              });
            });
          }
        }, 1500);
      }
    } catch (geoErr: any) {
      console.error('[FuelTracker] BackgroundGeolocation failed:', geoErr);
      const lang = (settings.language in translations) ? settings.language : 'ar';
      setTrackingError({ 
        message: ((translations[lang] as any)?.bgTrackingError || 'Error: ') + (geoErr?.message || String(geoErr))
      });
      setIsTracking(false);
      setIsStarting(false);
      localStorage.setItem('was_tracking', 'false');
      return;
    }

    // ── Wake Lock ─────────────────────────────────────────────────────────
    await requestWakeLock();

    // ── Background Mode (prevent WebView death on swipe-kill) ─────────────
    try {
      const cordova = (window as any).cordova;
      if (cordova?.plugins?.backgroundMode) {
        const bm = cordova.plugins.backgroundMode;
        const lang = (settings.language in translations) ? settings.language : 'ar';
        bm.setDefaults({
          title: (translations[lang] as any)?.bgStatusTitle,
          text: (translations[lang] as any)?.bgStatusText,
          color: 'F14F4D',
          resume: true,
          hidden: false,
          silent: false,
        });
        bm.enable();
        bm.disableWebViewOptimizations();
        bm.disableBatteryOptimizations();
      }
    } catch (e) {
      console.warn('[FuelTracker] Background mode error:', e);
    }

    // ── GPS Health Monitor ────────────────────────────────────────────────
    const monitorId = setInterval(async () => {
      try {
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      } catch {
        // GPS unavailable — notify user
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const lang = (settings.language in translations) ? settings.language : 'ar';
          await LocalNotifications.schedule({
            notifications: [{
              title: (translations[lang] as any)?.gpsOffTitle,
              body: (translations[lang] as any)?.gpsOffBody,
              id: 9999,
              schedule: { at: new Date(Date.now() + 500) },
              channelId: 'fuel_alerts',
              attachments: [],
              extra: null,
            }]
          });
        } catch { /* noop */ }
      }
    }, 30000);
    (window as any).__gpsMonitorId = monitorId;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // stopTracking
  // ═══════════════════════════════════════════════════════════════════════════
  const stopTracking = async () => {
    localStorage.setItem('was_tracking', 'false');
    // Clear saved position when user explicitly stops tracking
    localStorage.removeItem('last_gps_position');

    if (watchId.current !== null) {
      try {
        const BgGeo = await getBGGeo();
        await BgGeo.removeWatcher({ id: watchId.current });
      } catch (e) {
        console.warn('[FuelTracker] removeWatcher error:', e);
      }
      watchId.current = null;
    }
    setCurrentSpeed(0);
    setIsTracking(false);
    lastPositionRef.current = null;
    releaseWakeLock();

    if ((window as any).__gpsMonitorId) {
      clearInterval((window as any).__gpsMonitorId);
      (window as any).__gpsMonitorId = null;
    }

    try {
      const cordova = (window as any).cordova;
      if (cordova?.plugins?.backgroundMode) {
        cordova.plugins.backgroundMode.disable();
      }
    } catch { /* noop */ }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-start on app open / resume from background
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let appStateListener: any = null;

    const init = async () => {
      const wasTracking = localStorage.getItem('was_tracking') === 'true';
      if (wasTracking && !isTracking) {
        await new Promise(r => setTimeout(r, 1500)); // let plugins initialize
        startTracking(true);
      }

      appStateListener = await App.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          const stillTracking = localStorage.getItem('was_tracking') === 'true';
          const resumeAfterGps = localStorage.getItem('resume_tracking_on_gps') === 'true';

          // ── Explicit check when user returns ──
          if (trackingError) {
             try {
                const { registerPlugin } = await import('@capacitor/core');
                const alarmPlugin = registerPlugin<any>('AlarmPlugin');
                const status = await alarmPlugin.checkGPS();
                if (status && status.enabled) {
                   setTrackingError(null);
                   if (stillTracking) startTracking(true);
                }
             } catch (e) { /* ignore */ }
          }

          if (resumeAfterGps) {
            // User returned from GPS settings — try starting tracking again
            console.log('[FuelTracker] Returned from GPS settings — retrying tracking...');
            localStorage.removeItem('resume_tracking_on_gps');
            setTimeout(() => startTracking(false), 800);
          } else if (stillTracking && watchId.current === null) {
            // Watcher was killed by OS — restart silently
            console.log('[FuelTracker] App resumed — restarting watcher silently');
            startTracking(true);
          }
        }
      });
    };

    init();
    return () => { appStateListener?.remove(); };
  }, []);

  // ── Persist state ─────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('scooter_user_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('fuel_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('fuel_state', JSON.stringify(fuelState)); }, [fuelState]);
  useEffect(() => { localStorage.setItem('fuel_logs', JSON.stringify(logs)); }, [logs]);

  // ── Low-Fuel Alerts ───────────────────────────────────────────────────────
  useEffect(() => {
    const range = fuelState.estimatedFuelLiters * settings.avgConsumption;
    if (range <= 0) return;

    const steps = [15.1, 13.1, 11.1, 9.1, 7.1, 5.1, 3.1, 1.1];
    // Find ALL crossed steps and take the most recent (last one in list that is >= range)
    const crossedSteps = steps.filter(s => range <= s && lastNotifiedStepRef.current > s);
    const hit = crossedSteps[crossedSteps.length - 1]; // Get the 'deepest' step crossed

    if (hit) {
      const display = range.toFixed(1); // Use ACTUAL range for dynamic number in notification
      if (!isMuted && range <= 15.1) {
        const lang = (settings.language in translations) ? settings.language : 'ar';
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
          LocalNotifications.schedule({
            notifications: [{
              title: (translations[lang] as any)?.lowFuelAlertTitle,
              body: typeof (translations[lang] as any)?.lowFuelAlertBody === 'function' 
                ? (translations[lang] as any).lowFuelAlertBody(display) 
                : display,
              id: Math.floor(hit * 10), // Unique ID based on step
              schedule: { at: new Date(Date.now() + 1000) },
              sound: 'alarm.wav',
              actionTypeId: 'FUEL_ALARM_ACTIONS',
              channelId: 'fuel_alerts',
              attachments: [],
              extra: null,
            }]
          }).catch(console.warn);
        });
        playWarningSound(true);
      }
      lastNotifiedStepRef.current = hit;
    } else if (range > 15.1 && range <= settings.warningThreshold && lastNotifiedStepRef.current > settings.warningThreshold) {
      if (!isMuted) playWarningSound(false);
      lastNotifiedStepRef.current = settings.warningThreshold;
    }
  }, [fuelState.estimatedFuelLiters, settings.avgConsumption, settings.warningThreshold, isMuted]);

  // ── Refuel ────────────────────────────────────────────────────────────────
  const addRefuel = (odo: number, liters: number, price: number | undefined, isFullTank: boolean) => {
    let baseFuel = 0;
    let isEdit = false;
    let prevLog: RefuelLog | null = null;

    if (logs.length > 0 && logs[0].odo === odo) {
      isEdit = true; prevLog = logs[0];
      baseFuel = prevLog.fuelBeforeRefuel ?? 0;
    } else if (fuelState.lastOdo > 0 && odo > fuelState.lastOdo) {
      baseFuel = Math.max(0, fuelState.estimatedFuelLiters - (odo - fuelState.lastOdo) / settings.avgConsumption);
    } else {
      baseFuel = fuelState.estimatedFuelLiters;
    }

    const newFuel = isFullTank ? settings.tankCapacity : Math.min(settings.tankCapacity, baseFuel + liters);
    const newLog: RefuelLog = {
      id: isEdit ? prevLog!.id : crypto.randomUUID(),
      date: new Date().toISOString(),
      odo, litersAdded: liters, pricePaid: price, isFullTank,
      fuelBeforeRefuel: baseFuel,
    };

    setLogs(prev => isEdit ? prev.map((l, i) => i === 0 ? newLog : l) : [newLog, ...prev]);
    setFuelState({ estimatedFuelLiters: newFuel, lastOdo: odo, totalGpsDistance: 0 });
    lastNotifiedStepRef.current = 999;
    setIsMuted(false);
  };

  const updateCurrentOdo = (odo: number) => {
    setFuelState(prev => {
      const diff = odo - prev.lastOdo;
      if (diff > 0) {
        return { ...prev, lastOdo: odo, estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - diff / settings.avgConsumption) };
      }
      return { ...prev, lastOdo: odo };
    });
  };

  const updateUserProfile = (profile: UserProfile) => setUserProfile(profile);

  const requestAllPermissions = async () => {
    if (!isAndroidPlatform()) return;
    try {
      // ── Step 1: Notifications ──────────────────────────────────────────────
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const notifPerm = await LocalNotifications.checkPermissions();
      console.log('[FuelTracker] Notification permission status:', notifPerm.display);
      if (notifPerm.display !== 'granted') {
        const result = await LocalNotifications.requestPermissions();
        console.log('[FuelTracker] Notification permission result:', result.display);
      }

      // ── Step 2: Fine Location (GPS) ────────────────────────────────────────
      // Must specify permissions array to trigger the actual system dialog
      const locPerm = await Geolocation.checkPermissions();
      console.log('[FuelTracker] Location permission status:', locPerm.location);
      if (locPerm.location !== 'granted') {
        // Explicitly request fine + coarse location
        const locResult = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        console.log('[FuelTracker] Location permission result:', locResult.location);
        if (locResult.location !== 'granted') {
          console.warn('[FuelTracker] GPS permission was not granted by user');
        }
      }
      // Background location is handled by BackgroundGeolocation native plugin when tracking starts
    } catch (e) {
      console.warn('[FuelTracker] requestAllPermissions error:', e);
    }
  };

  const resetData = () => {
    stopTracking();
    setLogs([]);
    setFuelState({ estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 });
    setSettings(DEFAULT_SETTINGS);
    setUserProfile(null);
    setIsMuted(false);
    localStorage.clear();
    setTimeout(() => { window.location.reload(); }, 300);
  };

  // ── Derived UI values ─────────────────────────────────────────────────────
  const rangeRemainingKm = Math.max(0, fuelState.estimatedFuelLiters * settings.avgConsumption);
  const runOutOdo = fuelState.lastOdo + rangeRemainingKm;
  const isWarning = rangeRemainingKm <= settings.warningThreshold;
  const isDanger = rangeRemainingKm <= 10;
  const fuelPercentage = Math.min(100, Math.max(0, (fuelState.estimatedFuelLiters / settings.tankCapacity) * 100));

  return {
    fuelState, settings, userProfile, logs,
    isWarning, isDanger, fuelPercentage, rangeRemainingKm, runOutOdo,
    isTracking, isStarting, isMuted, currentSpeed,
    trackingError, clearTrackingError: () => setTrackingError(null),
    gpsUpdateCount, lastGpsTime,
    setSettings, addRefuel, updateCurrentOdo, updateUserProfile,
    startTracking, stopTracking, setIsMuted, playWarningSound,
    resetData, requestAllPermissions, setCurrentSpeed
  };
};

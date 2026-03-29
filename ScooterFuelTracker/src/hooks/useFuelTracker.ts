import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';

export interface FuelSettings {
  tankCapacity: number; // Liters
  avgConsumption: number; // km per liter
  warningThreshold: number; // km remaining to trigger warning
  fuelPricePerLiter: number; // EGP per Liter
  autoTrack: boolean; // Automatically start GPS on app load
  enableAlerts: boolean; // Sound/Vibrate on low fuel
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
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: safely get BackgroundGeolocation plugin
// ─────────────────────────────────────────────────────────────────────────────
async function getBGGeo() {
  const { registerPlugin } = await import('@capacitor/core');
  return registerPlugin<any>('BackgroundGeolocation');
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
  const [currentSpeed, setCurrentSpeed] = useState(0); // KM/H
  const [isMuted, setIsMuted] = useState(false);
  const lastPositionRef = useRef<any>(null);
  const watchId = useRef<string | null>(null);
  const wakeLock = useRef<any>(null);
  const lastNotifiedStepRef = useRef<number>(999);

  // ── Register Notification Channel & Actions ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        await LocalNotifications.registerActionTypes({
          types: [{
            id: 'FUEL_ALARM_ACTIONS',
            actions: [{
              id: 'silence',
              title: 'إيقاف 🔇',
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

    if (!silent) {
      const isWeb = (window as any).Capacitor?.getPlatform() === 'web';

      // ────────────────────────────────────────────────────────────────────
      // STEP 1: Notifications permission (Android only)
      // ────────────────────────────────────────────────────────────────────
      if (isAndroid && !isWeb) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const perm = await LocalNotifications.checkPermissions();
          if (perm.display !== 'granted') {
            const result = await LocalNotifications.requestPermissions();
            if (result.display !== 'granted') {
              alert('بدون إذن التنبيهات التطبيق قد يتوقف في الخلفية. فعّله من الإعدادات.');
            }
          }
        } catch (e) {
          console.warn('[FuelTracker] Notification permission error:', e);
        }
      }

      // ────────────────────────────────────────────────────────────────────
      // STEP 2: Location permission (Skip on Web)
      // ────────────────────────────────────────────────────────────────────
      if (!isWeb) {
        try {
          const locPerm = await Geolocation.checkPermissions();
          if (locPerm.location !== 'granted') {
            const result = await Geolocation.requestPermissions();
            if (result.location !== 'granted') {
              alert('لازم تسمح بإذن الموقع عشان التطبيق يشتغل!');
              return;
            }
          }
        } catch (e) {
          console.warn('[FuelTracker] Location permission error:', e);
          return;
        }

        // ────────────────────────────────────────────────────────────────────
        // STEP 3: Test if GPS hardware switch is actually ON
        // ────────────────────────────────────────────────────────────────────
        try {
          await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 0,
          });
          // If we reach here, GPS is ON ✅
        } catch (gpsErr: any) {
          // GPS hardware is OFF → open Android Location Settings
          const msg =
            '📍 الـ GPS مقفول!\n\n' +
            'لازم تفتح الموقع (Location) من إعدادات الموبايل واختار "دقة عالية" أو "عالية الدقة فقط".\n\n' +
            'هيفتحلك شاشة الإعدادات دلوقتي، افتح الموقع وارجع للتطبيق.';
          alert(msg);

          // Open Android Location Settings natively
          try {
            const { registerPlugin } = await import('@capacitor/core');
            const AlarmPlugin = registerPlugin<any>('AlarmPlugin');
            await AlarmPlugin.openLocationSettings();
          } catch (settingsErr) {
            console.warn('[FuelTracker] Could not open location settings:', settingsErr);
          }

          // Set flag so when user comes back from settings, auto-resume tracking
          localStorage.setItem('resume_tracking_on_gps', 'true');
          return;
        }
      }

    } else {
      // ═══ SILENT MODE: only run if permissions & GPS already confirmed ═══
      if (isAndroid) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const notifPerm = await LocalNotifications.checkPermissions();
          const locPerm = await Geolocation.checkPermissions();
          if (notifPerm.display !== 'granted' || locPerm.location !== 'granted') {
            console.warn('[FuelTracker] Silent start aborted — permissions not ready');
            localStorage.setItem('was_tracking', 'false');
            return;
          }
          // Also test GPS hardware quickly (3s timeout for silent mode)
          await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 });
        } catch (e) {
          console.warn('[FuelTracker] Silent start aborted — GPS unavailable');
          localStorage.setItem('was_tracking', 'false');
          return;
        }
      }
    }

    // ── Mark as tracking ─────────────────────────────────────────────────
    localStorage.setItem('was_tracking', 'true');
    localStorage.removeItem('resume_tracking_on_gps');
    setIsTracking(true);

    // ── Start BackgroundGeolocation Watcher ──────────────────────────────
    try {
      const BgGeo = await getBGGeo();
      const id = await BgGeo.addWatcher(
        {
          backgroundMessage: 'متتبع البنزين شغال في الخلفية...',
          backgroundTitle: 'جاري تتبع المشوار 🛵،',
          // IMPORTANT: false here — we handled permissions manually above.
          // Setting true causes the native plugin to re-request "Always allow"
          // which redirects the user to Settings and Android kills our service
          // (GPS icons disappear) because bg location isn't granted yet.
          requestPermissions: false,
          stale: false,
          distanceFilter: 10,
        },
        (pos: any, err: any) => {
          if (err) { console.error('[FuelTracker] GPS error:', err); return; }
          if (!pos) return;

          // ── Update Current Speed (m/s to KM/H) ───────────────────────────
          if (pos.speed !== undefined && pos.speed !== null) {
            const kmh = Math.round(pos.speed * 3.6);
            setCurrentSpeed(kmh > 0.5 ? kmh : 0); // ignore micro movements
          } else {
            setCurrentSpeed(0);
          }

          setFuelState(prev => {
            if (lastPositionRef.current) {
              const dist = calculateDistance(
                lastPositionRef.current.latitude, lastPositionRef.current.longitude,
                pos.latitude, pos.longitude
              );
              if (dist > 0.01) {
                const consumed = dist / settings.avgConsumption;
                lastPositionRef.current = pos;
                return {
                  ...prev,
                  estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                  lastOdo: prev.lastOdo + dist,
                  totalGpsDistance: prev.totalGpsDistance + dist,
                };
              }
              return prev;
            }
            lastPositionRef.current = pos;
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
            '📍 خطوة مهمة واحدة لاستمرار التتبع!\n\n' +
            'لازم تسمح للتطبيق يستخدم الموقع "طوال الوقت" (Allow all the time)\n' +
            'عشان يفضل يحسب المسافة حتى لو أغلقت التطبيق خالص.\n\n' +
            'دوس OK وهيفتحلك إعدادات التطبيق، اختار:\n' +
            'Location → Allow all the time'
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
      // Surface the exact error to help debug:
      alert(
        'خطأ في تشغيل الـ GPS:\n' + (geoErr.message || String(geoErr)) +
        '\n\nتأكد إن إذن الموقع مفعّل من الإعدادات واختار "السماح طوال الوقت".'
      );
      setIsTracking(false);
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
        bm.setDefaults({
          title: 'متتبع مشاوير سيم',
          text: 'التتبع شغال ومحمي من الإغلاق...',
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
          await LocalNotifications.schedule({
            notifications: [{
              title: '⚠️ الـ GPS مقفول!',
              body: 'افتح الـ GPS عشان يكمل التتبع.',
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

      appStateListener = await App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          const stillTracking = localStorage.getItem('was_tracking') === 'true';
          const resumeAfterGps = localStorage.getItem('resume_tracking_on_gps') === 'true';

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
    const hit = steps.find(s => range <= s && lastNotifiedStepRef.current > s);
    if (hit) {
      const display = Math.floor(hit);
      if (!isMuted && display > 0) {
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
          LocalNotifications.schedule({
            notifications: [{
              title: 'تحذير بنزين منخفض! ⚠️',
              body: `باقي لك ${display} كيلو بس والبنزين يخلص، خلي بالك!`,
              id: display,
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
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const notifPerm = await LocalNotifications.checkPermissions();
      if (notifPerm.display !== 'granted') await LocalNotifications.requestPermissions();

      const locPerm = await Geolocation.checkPermissions();
      if (locPerm.location !== 'granted') await Geolocation.requestPermissions();
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
    isTracking, isMuted, currentSpeed,
    setSettings, addRefuel, updateCurrentOdo, updateUserProfile,
    startTracking, stopTracking, setIsMuted, playWarningSound,
    resetData, requestAllPermissions, setCurrentSpeed
  };
};

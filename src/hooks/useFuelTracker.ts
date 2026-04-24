import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { translations } from '../translations';
import { registerPlugin } from '@capacitor/core';

export interface FuelSettings {
  tankCapacity: number; // Liters
  avgConsumption: number; // km per liter
  warningThreshold: number; // km remaining to trigger warning
  fuelPricePerLiter: number; // EGP per Liter
  autoTrack: boolean; // Automatically start GPS on app load
  enableAlerts: boolean; // Sound/Vibrate on low fuel
  language: 'en' | 'ar';
  accentColor: string;
  alertTone: string; // Now stores the tone name or index
  customTones: { name: string; data: string }[];
  isLightMode: boolean;
  oilChangeInterval: number;
  lastOilChangeOdo: number;
  widgetAccentColor: string;
  widgetOpacity: number;
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
  avgConsumption: 16.6,
  warningThreshold: 30,
  fuelPricePerLiter: 22.25,
  autoTrack: false,
  enableAlerts: true,
  language: 'en',
  accentColor: '#326144',
  alertTone: 'Digital',
  customTones: [],
  isLightMode: false,
  oilChangeInterval: 1000,
  lastOilChangeOdo: 0,
  widgetAccentColor: '#00f0ff',
  widgetOpacity: 100,
};

// ── Global Audio Singleton for overlap prevention ───────────────────────────
let globalAudioCtx: AudioContext | null = null;
let globalActiveAudio: HTMLAudioElement | null = null;
let globalToneInterval: any = null;
let globalToneIntervalLock = false; // TRUE IF CURRENTLY RINGING AN ALARM

// ── Audio Engine (Web Audio API) ───────────────────────────────────────────
export const playTone = (
  type: string, 
  customTones: { name: string; data: string }[] = [],
  audioCtxRef?: React.MutableRefObject<AudioContext | null>,
  activeAudioRef?: React.MutableRefObject<HTMLAudioElement | null>,
  isLoop: boolean = false
) => {
  try {
    // ── 1. Cleanup any existing audio ──
    if (globalToneInterval) {
      clearInterval(globalToneInterval);
      globalToneInterval = null;
    }
    if (globalAudioCtx) {
      globalAudioCtx.close().catch(() => {});
      globalAudioCtx = null;
    }
    if (audioCtxRef?.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (globalActiveAudio) {
      globalActiveAudio.pause();
      globalActiveAudio.src = "";
      globalActiveAudio = null;
    }
    if (activeAudioRef?.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = "";
      activeAudioRef.current = null;
    }

    // ── 2. Handle Custom Tone (Look up in list) ──
    const custom = customTones.find(t => t.name === type);
    if (custom) {
      const audio = new Audio(custom.data);
      audio.volume = 0.5;
      audio.loop = false;
      globalActiveAudio = audio;
      if (activeAudioRef) activeAudioRef.current = audio;
      
      let playCount = 0;
      audio.onended = () => {
         playCount++;
         if (isLoop && playCount < 3) {
            audio.play().catch(()=>{});
         } else {
            stopTone();
         }
      };
      
      audio.play().catch(e => console.warn('Custom audio playback failed', e));
      return;
    }

    // ── 3. Handle Web Audio Tones ──
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    globalAudioCtx = ctx;
    if (audioCtxRef) audioCtxRef.current = ctx;

    let sequenceCount = 0;
    const playSequence = () => {
      if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
        if (globalToneInterval) { clearInterval(globalToneInterval); globalToneInterval = null; }
        return;
      }
      
      // ── AUTO-STOP after EXACTLY 3 rounds ──
      if (sequenceCount >= 3) {
        stopTone();
        return;
      }

      const now = globalAudioCtx.currentTime;
      const playBeep = (freq: number, startTime: number, duration: number, vol = 0.1, wave: 'sine'|'square'|'sawtooth'|'triangle' = 'sine') => {
        const osc = globalAudioCtx!.createOscillator();
        const gain = globalAudioCtx!.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(globalAudioCtx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      switch(type) {
        case 'Radar':
          playBeep(880, now, 0.5, 0.15);
          playBeep(440, now + 0.5, 0.5, 0.1);
          break;
        case 'Cyber':
          playBeep(1200, now, 0.1, 0.1, 'square');
          playBeep(800, now + 0.15, 0.1, 0.1, 'square');
          playBeep(1600, now + 0.3, 0.2, 0.1, 'square');
          break;
        case 'Alarm':
          for(let i=0; i<3; i++) {
            playBeep(500, now + i*0.4, 0.2, 0.2, 'sawtooth');
            playBeep(800, now + i*0.4 + 0.2, 0.2, 0.2, 'sawtooth');
          }
          break;
        default: // 'Digital'
          playBeep(2000, now, 0.05);
          playBeep(2500, now + 0.1, 0.05);
      }
      
      sequenceCount++;
    };
    
    playSequence();
    
    if (isLoop) {
      globalToneInterval = setInterval(playSequence, 3000);
    } else {
      setTimeout(() => {
        if (globalAudioCtx === ctx) {
          ctx.close().catch(() => {});
          globalAudioCtx = null;
        }
      }, 2500);
    }
  } catch(err) { console.error('Audio failed', err); }
};

export const stopTone = () => {
  globalToneIntervalLock = false; // RELEASE LOCK
  
  if (globalToneInterval) {
    clearInterval(globalToneInterval);
    globalToneInterval = null;
  }
  if (globalAudioCtx) {
    // Graceful and instant suspension of the web audio context
    if (globalAudioCtx.state === 'running') {
       globalAudioCtx.suspend().catch(() => {});
    }
    globalAudioCtx.close().catch(() => {});
    globalAudioCtx = null;
  }
  if (globalActiveAudio) {
    globalActiveAudio.pause();
    globalActiveAudio.src = "";
    globalActiveAudio = null;
  }
  
  // ── FIX: Ensure native vibration and legacy alarms are stopped everywhere ──
  try {
    registerPlugin<any>('AlarmPlugin').stopAlarm().catch(() => {});
  } catch (e) { /* ignore */ }
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility: check if we're on Android
// ─────────────────────────────────────────────────────────────────────────────
function isAndroidPlatform() {
  return (window as any).Capacitor?.getPlatform() === 'android';
}

export const useFuelTracker = () => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<FuelSettings>(DEFAULT_SETTINGS);
  const [fuelState, setFuelState] = useState<FuelState>({ estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 });
  const [logs, setLogs] = useState<RefuelLog[]>([]);

  // ── Capacitor Preferences Migration & Load & Native Sync ────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { registerPlugin } = await import('@capacitor/core');
        const alarmPlugin = registerPlugin<any>('AlarmPlugin');
        
        // Helper to load or migrate from localStorage
        const getOrMigrate = async (key: string) => {
          const { value } = await Preferences.get({ key });
          if (value !== null) return value;
          const old = localStorage.getItem(key);
          if (old !== null) {
            await Preferences.set({ key, value: old });
            return old;
          }
          return null;
        };

        // 1. Fetch Basic Core Stats
        const savedProfile = await getOrMigrate('scooter_user_profile');
        if (savedProfile) setUserProfile(JSON.parse(savedProfile));

        const savedState = await getOrMigrate('fuel_state');
        if (savedState) setFuelState(JSON.parse(savedState));

        const savedLogs = await getOrMigrate('fuel_logs');
        if (savedLogs) setLogs(JSON.parse(savedLogs));

        // 2. Fetch Native Widget Settings (Source of Truth for Look)
        let nativeLook: any = null;
        if (isAndroidPlatform()) {
           try { nativeLook = await alarmPlugin.getWidgetSettings(); } catch {}
        }

        // 3. Merge Settings (Preferences vs Native)
        // CRITICAL: Strip widgetAccentColor & widgetOpacity from saved prefs COMPLETELY.
        // They are exclusively owned by WidgetStore (native file). Never read them from prefs.
        const savedSettings = await getOrMigrate('fuel_settings');
        let finalSettings = DEFAULT_SETTINGS;
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            // DELETE the color/opacity from the parsed prefs before merging
            delete parsed.widgetAccentColor;
            delete parsed.widgetOpacity;
            finalSettings = { ...DEFAULT_SETTINGS, ...parsed };
          } catch {}
        }

        // ALWAYS override with Native (WidgetStore file) — this is the only source of truth
        if (nativeLook) {
           finalSettings = {
             ...finalSettings,
             widgetAccentColor: nativeLook.accentColor || finalSettings.widgetAccentColor,
             widgetOpacity: nativeLook.opacity !== undefined ? nativeLook.opacity : finalSettings.widgetOpacity
           };
        }
        setHasSyncedFromNative(true); // Always allow sync — WidgetStore is reliable
        setSettings(finalSettings);

        // 4. Migrate Remaining State
        await getOrMigrate('custom_trip_base');
        await getOrMigrate('was_tracking');
        await getOrMigrate('resume_tracking_on_gps');
        const savedLastGps = await getOrMigrate('last_gps_position');
        if (savedLastGps) {
          try { lastPositionRef.current = JSON.parse(savedLastGps); } catch {}
        }

        // 5. Finalize
        setIsDataLoaded(true);
        if (!nativeLook && isAndroidPlatform()) setHasSyncedFromNative(true); // fallback
      } catch (e) {
        console.error('Error loading preferences', e);
        setIsDataLoaded(true); 
        setHasSyncedFromNative(true);
      }
    }
    loadData();
  }, []);

  const [isTracking, setIsTracking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [trackingError, setTrackingError] = useState<{ message: string; action?: 'openGPS' | 'openSettings' } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0); // KM/H
  const [isMuted, setIsMuted] = useState(false);
  const [gpsUpdateCount, setGpsUpdateCount] = useState(0);
  const [lastGpsTime, setLastGpsTime] = useState<string | null>(null);
  const [hasSyncedFromNative, setHasSyncedFromNative] = useState(false);
  const lastPositionRef = useRef<any>(null);
  const watchId = useRef<string | null>(null);
  const wakeLock = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const lastNotifiedKmRef = useRef<number>(999);
  const isManuallyChanged = useRef(false);

  // ── settingsRef: always up-to-date inside GPS callbacks (fixes stale closure) ──
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Initial native sync & state restoration moved to consolidated loadData

  // ── Register Notification Channel & Actions ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const isWeb = (window as any).Capacitor?.getPlatform() === 'web' || !(window as any).Capacitor;
        
        if (isWeb) return;

        // ── Channel Strategy (V14) ───────────────────────────────────────────
        const channelId = `fuel_alert_v14_premium`;
        
        // ── Permissions & Cleanup ──────────────────────────────────────────
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        try {
          const existing = await LocalNotifications.listChannels();
          for (const ch of existing.channels || []) {
            // Delete ALL previous notification channels to prevent priority conflicts
            if (ch.id.startsWith('fuel_') && ch.id !== channelId) {
              await LocalNotifications.deleteChannel({ id: ch.id });
            }
          }
        } catch { /* ignore */ }

        await LocalNotifications.createChannel({
          id: channelId,
          name: 'Fuel Alerts (Urgent Peek)',
          description: 'High priority alerts with heads-up support',
          importance: 5,      // IMPORTANCE_MAX -> Heads-up
          visibility: 1,      // VISIBILITY_PUBLIC
          vibration: true,    // Essential for Peek
          lights: true,
          lightColor: '#FF3366',
          sound: 'default',   // Use system default to guarantee peek/Heads-up
        } as any);

        const lang = (settings.language in translations) ? settings.language : 'ar';
        await LocalNotifications.registerActionTypes({
          types: [{
            id: 'FUEL_ALARM_ACTIONS',
            actions: [{
              id: 'silence',
              title: (translations[lang] as any)?.stopNotif || 'Stop',
              foreground: true,
            }]
          }]
        });

        const listener = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          if (action.actionId === 'silence') {
            setIsMuted(true);
            registerPlugin<any>('AlarmPlugin').stopAlarm().catch(() => {});
            LocalNotifications.removeAllDeliveredNotifications();
          }
        });

        return () => { listener.remove(); };
      } catch (e) {
        console.warn('[FuelTracker] Notification setup failed:', e);
      }
    })();
  }, [settings.language]);


  // ── Bridge Alarm Control ────────────────────────────────────────────────
  // NOTE: Listener is registered only on window (not document) to prevent duplicate firing.
  // See also: useEffect below at line ~478 for the unified single listener.
  // (Duplicate document listener removed — was causing double-stop calls)

  // ── Audio Warning ─────────────────────────────────────────────────────────
  const playWarningSound = (isAlarm = false) => {
    if (!settings.enableAlerts || isMuted) return;
    try {
      if (isAlarm) {
        // ── GUARD: Prevent overlapping simultaneous alarms ──
        if (globalToneIntervalLock) return;
        globalToneIntervalLock = true;

        // ── Loop tone for 3 rounds (approx 8 seconds) ──
        playTone(settingsRef.current.alertTone || 'Digital', settingsRef.current.customTones, audioCtxRef, activeAudioRef, true);

        // ── Native vibration (3x pattern in Java) ──
        registerPlugin<any>('AlarmPlugin').startVibration().catch(() => {
          if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 800, 500, 400, 200, 400, 200, 800, 500, 400, 200, 400, 200, 800]);
        });

        // ── HARD STOP after 3 rounds (approx 10 seconds) ──
        setTimeout(() => stopTone(), 10000);

      } else {
        // Soft pre-warning (single short beep + gentle buzz)
        playTone('Digital');
        import('@capacitor/haptics').then(({ Haptics }) => Haptics.vibrate()).catch(() => {
          if (navigator.vibrate) navigator.vibrate(200);
        });
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

  // ── Native Alarm Action Listener ──────────────────────────────────────────
  useEffect(() => {
    const handleStopEvent = () => stopTone();
    window.addEventListener('stopFuelAlarmEvent', handleStopEvent);
    return () => window.removeEventListener('stopFuelAlarmEvent', handleStopEvent);
  }, []);

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
          // Fix: Use Capacitor Preferences instead of localStorage (survives WebView restarts)
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({ key: 'was_tracking', value: 'false' });
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
    // Fix: Use Capacitor Preferences for all persistent state (localStorage is wiped on Android WebView restart)
    const { Preferences: TrackingPrefs } = await import('@capacitor/preferences');
    await TrackingPrefs.set({ key: 'was_tracking', value: 'true' });
    await TrackingPrefs.remove({ key: 'resume_tracking_on_gps' });

    // Restore last position if available
    const savedPosRes = await TrackingPrefs.get({ key: 'last_gps_position' });
    if (savedPosRes.value && !lastPositionRef.current) {
      try { lastPositionRef.current = JSON.parse(savedPosRes.value); } catch { /* ignore */ }
    }

    setIsTracking(true);
    setIsStarting(false);
    setGpsUpdateCount(0);
    setLastGpsTime(null);

    // ── Start GPS Watcher using official @capacitor/geolocation ────────────
    // This replaces the community plugin which was incompatible with Capacitor 8
    try {
      const wId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        },
        (pos, err) => {
          try {
            if (err) {
              console.error('[FuelTracker] GPS watchPosition error:', err);
              setTrackingError({ message: 'GPS Connection Lost' });
              return;
            }
            if (!pos) return;

            // ── SUCCESS: Clear any previous tracking error automatically ──
            setTrackingError(null);

            // ── Update diagnostics ──
            setGpsUpdateCount(prev => prev + 1);
            setLastGpsTime(new Date().toLocaleTimeString());

            // ── PROFESSIONAL FILTERING ─────────────────────────────────────────
            const MIN_TRACKING_SPEED = 6;  // Minimum speed to count distance
            const MAX_GPS_ACCURACY = 50;   // Max acceptable GPS accuracy in meters

            // 🐛 FIX Bug#2: Accuracy check FIRST — before any distance calculation
            // If GPS signal is poor, update ref position (so we don't drift) but skip counting
            if (pos.coords.accuracy && pos.coords.accuracy > MAX_GPS_ACCURACY) {
              // Still advance the ref so we don't accumulate distance from stale point later
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

            // ── Calculate distance & time from last known position ──────────────
            const nativeSpeed = pos.coords?.speed;
            let currentKmh = 0;
            let calculatedKmh = 0;
            let dist = 0;
            let timeDiffMs = 0;

            if (lastPositionRef.current && pos.coords) {
              // 🐛 FIX Bug#3: Validate timestamps before using them
              const prevTimestamp = lastPositionRef.current.timestamp;
              const currTimestamp = pos.timestamp ?? Date.now();
              const isValidTimestamp = prevTimestamp > 0 && currTimestamp > prevTimestamp;

              dist = calculateDistance(
                lastPositionRef.current.latitude, lastPositionRef.current.longitude,
                pos.coords.latitude, pos.coords.longitude
              );

              if (isValidTimestamp) {
                timeDiffMs = Math.max(1, currTimestamp - prevTimestamp);
                // Only calculate speed if time gap is reasonable (< 60 seconds)
                if (timeDiffMs < 60000) {
                  const hours = timeDiffMs / (1000 * 60 * 60);
                  calculatedKmh = dist / hours;
                }
              }
            }

            // ── Use the most responsive speed value ─────────────────────────────
            if (nativeSpeed !== null && nativeSpeed !== undefined) {
              const nativeKmh = nativeSpeed * 3.6;
              // Stability filter: ignore high "calculated" speeds when native speed is low
              if (nativeKmh < 3 && calculatedKmh > 10) {
                currentKmh = nativeKmh;
              } else {
                currentKmh = Math.max(nativeKmh, calculatedKmh);
              }
            } else {
              currentKmh = calculatedKmh;
            }

            // ── Update UI speed display ──────────────────────────────────────────
            const finalDisplaySpeed = Math.round(currentKmh);
            setCurrentSpeed(finalDisplaySpeed > 0 ? finalDisplaySpeed : 0);

            // Dynamic Gap Threshold: Max allowed speed ~140km/h (approx 0.04 km/sec)
            const maxAllowedDist = Math.max(0.15, (timeDiffMs / 1000) * 0.04);

            // ── Persist latest position ──────────────────────────────────────────
            const posToSave = {
              latitude: pos.coords?.latitude,
              longitude: pos.coords?.longitude,
              timestamp: pos.timestamp ?? Date.now(),
              accuracy: pos.coords?.accuracy
            };
            // Fire-and-forget async save — doesn't block the GPS callback
            import('@capacitor/preferences').then(({ Preferences }) =>
              Preferences.set({ key: 'last_gps_position', value: JSON.stringify(posToSave) })
            ).catch(() => {});

            setFuelState(prev => {
              if (lastPositionRef.current && pos.coords) {

                if (dist >= maxAllowedDist) {
                  // 🚫 Teleport/GPS jump — skip, don't advance ref
                  return prev;
                }

                if (dist > 0.004) {
                  if (currentKmh >= MIN_TRACKING_SPEED) {
                    // ✅ Moving fast enough — count distance & advance ref
                    const consumed = dist / (settingsRef.current.avgConsumption || 16.6);
                    lastPositionRef.current = posToSave;
                    return {
                      ...prev,
                      estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                      lastOdo: prev.lastOdo + dist,
                      totalGpsDistance: prev.totalGpsDistance + dist,
                    };
                  } else {
                    // 🐛 FIX Bug#1: Slow/idle — skip distance but ADVANCE ref
                    lastPositionRef.current = posToSave;
                    return prev;
                  }
                } else {
                  // Jitter < 4m — advance ref silently
                  lastPositionRef.current = posToSave;
                  return prev;
                }
              }
              // First GPS fix
              lastPositionRef.current = posToSave;
              return prev;
            });
          } catch (callbackErr: any) {
            console.error('[FuelTracker] CRASH AVERTED in watchPosition callback:', callbackErr);
            setTrackingError({ message: 'App Logic Error: ' + String(callbackErr) });
          }
        }
      );
      watchId.current = String(wId);

      // ── One-time prompt for "Allow all the time" (Background Location) ────
      // Removed: This was using a synchronous window.confirm that was blocking the WebView
      // and redirecting to Android settings immediately when location was found, causing a perceived crash.
      // With the foreground service set to type "location", "While using the app" permission is enough.
    } catch (geoErr: any) {
      console.error('[FuelTracker] watchPosition failed:', geoErr);
      const lang = (settings.language in translations) ? settings.language : 'ar';
      setTrackingError({
        message: ((translations[lang] as any)?.bgTrackingError || 'Error: ') + (geoErr?.message || String(geoErr))
      });
      setIsTracking(false);
      setIsStarting(false);
      // Fix: Use Preferences instead of localStorage
      import('@capacitor/preferences').then(({ Preferences }) =>
        Preferences.set({ key: 'was_tracking', value: 'false' })
      ).catch(() => {});
      return;
    }

    // ── Wake Lock ─────────────────────────────────────────────────────────
    await requestWakeLock();

    // ── Start Native Background Tracking Service ──
    try {
      const alarmPlugin = registerPlugin<any>('AlarmPlugin');
      await alarmPlugin.startBackgroundTracking();
    } catch(e) {
      console.warn('[FuelTracker] Native bg tracking failed to start', e);
    }
    // NOTE: GPS Health Monitor removed — it was calling getCurrentPosition() every 30s
    // while watchPosition() was already active, causing Android to kill the WebView
    // due to concurrent GPS request conflicts. The watchPosition error callback handles
    // GPS loss detection instead.
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // stopTracking
  // ═══════════════════════════════════════════════════════════════════════════
  const stopTracking = async () => {
    // Fix: Use Capacitor Preferences instead of localStorage
    const { Preferences: StopPrefs } = await import('@capacitor/preferences');
    await StopPrefs.set({ key: 'was_tracking', value: 'false' });
    // Clear saved position when user explicitly stops tracking
    await StopPrefs.remove({ key: 'last_gps_position' });

    if (watchId.current !== null) {
      try {
        await Geolocation.clearWatch({ id: watchId.current });
      } catch (e) {
        console.warn('[FuelTracker] clearWatch error:', e);
      }
      watchId.current = null;
    }

    // ── Stop Native Background Tracking Service ──
    try {
      const alarmPlugin = registerPlugin<any>('AlarmPlugin');
      await alarmPlugin.stopBackgroundTracking();
    } catch(e) {
      console.warn('[FuelTracker] Native bg tracking failed to stop', e);
    }

    setCurrentSpeed(0);
    setIsTracking(false);
    lastPositionRef.current = null;
    releaseWakeLock();

    // (GPS health monitor interval was removed — no cleanup needed)
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-start on app open / resume from background
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let appStateListener: any = null;

    const init = async () => {
      // Fix: Read from Capacitor Preferences (consistent with how we write)
      const { Preferences: InitPrefs } = await import('@capacitor/preferences');
      const wasTrackingRes = await InitPrefs.get({ key: 'was_tracking' });
      const wasTracking = wasTrackingRes.value === 'true';

      // 1. Recover accumulated distance if app was killed while tracking
      if (wasTracking) {
        try {
          const alarmPlugin = registerPlugin<any>('AlarmPlugin');
          const res = await alarmPlugin.getNativeDistance();
          if (res && res.distanceKm && res.distanceKm > 0) {
            const dist = res.distanceKm;
            setFuelState(prev => {
              const consumed = dist / (settingsRef.current.avgConsumption || 21.4);
              return {
                ...prev,
                estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                lastOdo: prev.lastOdo + dist,
                totalGpsDistance: prev.totalGpsDistance + dist,
              };
            });
          }
        } catch(e) { /* ignore */ }
      }

      if (wasTracking && !isTracking) {
        await new Promise(r => setTimeout(r, 1500)); // let plugins initialize
        startTracking(true);
      }

      appStateListener = await App.addListener('appStateChange', async (state) => {
        if (state.isActive) {
          const { Preferences } = await import('@capacitor/preferences');
          const stillTrackingRes = await Preferences.get({ key: 'was_tracking' });
          const resumeAfterGpsRes = await Preferences.get({ key: 'resume_tracking_on_gps' });
          
          const stillTracking = stillTrackingRes.value === 'true';
          const resumeAfterGps = resumeAfterGpsRes.value === 'true';

          // 2. Recover distance if app was merely suspended/swiped away
          if (stillTracking) {
            try {
              const alarmPlugin = registerPlugin<any>('AlarmPlugin');
              const res = await alarmPlugin.getNativeDistance();
              if (res && res.distanceKm && res.distanceKm > 0) {
                const dist = res.distanceKm;
                setFuelState(prev => {
                  const consumed = dist / (settingsRef.current.avgConsumption || 21.4);
                  return {
                    ...prev,
                    estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                    lastOdo: prev.lastOdo + dist,
                    totalGpsDistance: prev.totalGpsDistance + dist,
                  };
                });
              }
            } catch(e) { /* ignore */ }
          }

          // ── Explicit check when user returns ──
          if (trackingError) {
             try {
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
            await Preferences.remove({ key: 'resume_tracking_on_gps' });
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

  // ── Persistence to Capacitor Preferences ──────────────────────────────────
  useEffect(() => {
    if (!isDataLoaded) return;
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.set({ key: 'scooter_user_profile', value: JSON.stringify(userProfile) });
    });
  }, [userProfile, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    import('@capacitor/preferences').then(({ Preferences }) => {
      // CRITICAL: NEVER save widgetAccentColor or widgetOpacity to Preferences.
      // They are exclusively owned by WidgetStore (native file) to prevent reversion.
      const { widgetAccentColor, widgetOpacity, ...settingsToSave } = settings;
      Preferences.set({ key: 'fuel_settings', value: JSON.stringify(settingsToSave) });
    });
  }, [settings, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.set({ key: 'fuel_state', value: JSON.stringify(fuelState) });
    });
  }, [fuelState, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.set({ key: 'fuel_logs', value: JSON.stringify(logs) });
    });
  }, [logs, isDataLoaded]);

  // ── Low-Fuel Alerts ───────────────────────────────────────────────────────
  useEffect(() => {
    const range = fuelState.estimatedFuelLiters * settings.avgConsumption;
    if (range <= 0 || !settings.enableAlerts) return;

    // ── 1km Granular Logic ──
    const currentKmFloor = Math.floor(range);
    
    // Only alert if we are below the user's chosen threshold (e.g. 15km, 20km)
    if (range <= settings.warningThreshold + 0.1) {
      if (currentKmFloor < lastNotifiedKmRef.current) {
        if (!isMuted) {
          const lang = (settings.language in translations) ? settings.language : 'ar';
          const display = currentKmFloor.toString();
          
          // ── STEP 1: DROP NOTIFICATION FIRST (100% Native, High Importance) ──
          const title = (translations[lang] as any)?.lowFuelAlertTitle || "⚠️ Fuel Alert";
          const bodyFunc = (translations[lang] as any)?.lowFuelAlertBody;
          const body = typeof bodyFunc === 'function' ? bodyFunc(display) : display;

          registerPlugin<any>('AlarmPlugin').showFuelPopup({
            title: title,
            body: body
          }).catch(console.warn);

          // ── STEP 2: Trigger Alarm Sound/Vibration Immediately ──
          playWarningSound(true); 
        }
        lastNotifiedKmRef.current = currentKmFloor;
      }
    } else {
      // If fuel is added, reset the notification tracker
      if (currentKmFloor > lastNotifiedKmRef.current) {
        lastNotifiedKmRef.current = 999;
      }
    }
  }, [fuelState.estimatedFuelLiters, settings.avgConsumption, settings.warningThreshold, isMuted, settings.enableAlerts]);

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
    lastNotifiedKmRef.current = 999;
    
    // ── Auto-Calculate Consumption Average ──────────────────────────────────
    // Only calculate if we have a previous "Full Tank" and the CURRENT is "Full Tank"
    if (!isEdit && isFullTank) {
      // Find the most recent "Full Tank" in logs
      const prevFullLog = logs.find(l => l.isFullTank);
      if (prevFullLog) {
        const distanceSinceFull = odo - prevFullLog.odo;
        if (distanceSinceFull > 10) { // Safety: Need at least 10km to be accurate
          // Sum up all liters added BETWEEN the previous full tank and BEFORE this one
          let litersUsed = 0;
          for (const log of logs) {
            if (log.id === prevFullLog.id) break;
            litersUsed += log.litersAdded;
          }
          // Plus the liters we just added to get it back to FULL
          litersUsed += liters;

          if (litersUsed > 0) {
            const actualAvg = distanceSinceFull / litersUsed;
            console.log(`[FuelTracker] Actual Avg Calculated: ${actualAvg.toFixed(2)} km/L`);
            
            // If the difference is significant (>3%), update settings automatically
            const diff = Math.abs(actualAvg - settings.avgConsumption);
            if (diff > 0.5) {
              setSettings(prev => ({ ...prev, avgConsumption: Number(actualAvg.toFixed(1)) }));
            }
          }
        }
      }
    }
    
    // ── FIX: Stop vibration upon refueling ──
    stopTone();
    setIsMuted(false);
  };

  const updateCurrentOdo = (odo: number) => {
    setFuelState(prev => {
      const diff = odo - prev.lastOdo;
      // Calculate fuel adjustment based on the odometer shift (positive or negative)
      const fuelAdjustment = diff / settings.avgConsumption;
      
      return { 
        ...prev, 
        lastOdo: odo, 
        estimatedFuelLiters: Math.max(0, Math.min(settings.tankCapacity, prev.estimatedFuelLiters - fuelAdjustment))
      };
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
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.clear();
    });
    setTimeout(() => { window.location.reload(); }, 300);
  };

  // ── Derived UI values ─────────────────────────────────────────────────────
  const rangeRemainingKm = Math.max(0, fuelState.estimatedFuelLiters * settings.avgConsumption);
  const runOutOdo = (fuelState.lastOdo || 0) + rangeRemainingKm;
  const isWarning = rangeRemainingKm <= settings.warningThreshold;
  const isDanger = rangeRemainingKm <= 10;
  const fuelPercentage = Math.min(100, Math.max(0, (fuelState.estimatedFuelLiters / settings.tankCapacity) * 100));
  const kmSinceOilChange = Math.max(0, (fuelState.lastOdo || 0) - (settings.lastOilChangeOdo || 0));
  const kmUntilNextOilChange = Math.max(0, settings.oilChangeInterval - kmSinceOilChange);

  const recordOilChange = (odoValue: number) => {
    setSettings(prev => ({ ...prev, lastOilChangeOdo: odoValue }));
  };

  // ── Sync Live Stats with Native Widget ────────────────────────────────────
  const isFirstRender = useRef(true);
  const prevSettingsRef = useRef<FuelSettings | null>(null);
  
  useEffect(() => {
    if (!isAndroidPlatform() || !hasSyncedFromNative || !isDataLoaded) return;
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevSettingsRef.current = settings;
    }
    
    // Accurately detect if the color/opacity changed compared to last sync
    const isSettingsChange = settings.widgetAccentColor !== prevSettingsRef.current?.widgetAccentColor || 
                             settings.widgetOpacity !== prevSettingsRef.current?.widgetOpacity;
                             
    // If it's pure telemetry updating, we do NOT want to overwrite the colors! 
    // We only send colors if they actually changed manually inside the React app.
    const shouldSendColors = isSettingsChange && isManuallyChanged.current;

    prevSettingsRef.current = settings; // Update after check
    isManuallyChanged.current = false;  // Reset manual flag

    const updateWidget = async () => {
      try {
        const tripBaseRes = await (await import('@capacitor/preferences')).Preferences.get({ key: 'custom_trip_base' });
        const tripValue = Math.max(0, (fuelState.lastOdo || 0) - (Number(tripBaseRes.value) || logs[0]?.odo || 0));
        const lastLog = logs[0];
        const pricePerLiter = settings.fuelPricePerLiter || 14.5;
        const pricePaid = (lastLog?.pricePaid && lastLog.pricePaid > 0) ? lastLog.pricePaid : (lastLog?.litersAdded ?? 0) * pricePerLiter;
        const litersAtRefuel = lastLog ? (lastLog.fuelBeforeRefuel ?? 0) + lastLog.litersAdded : 0;
        const consumedSinceRefuel = Math.max(0, litersAtRefuel - fuelState.estimatedFuelLiters);
        const budgetRemaining = Math.max(0, pricePaid - (consumedSinceRefuel * pricePerLiter));

        const payload: any = {
          speed: Math.round(currentSpeed || 0),
          range: `${rangeRemainingKm.toFixed(1)} KM`,
          fuelPercent: Math.round(fuelPercentage),
          litersLeft: `${fuelState.estimatedFuelLiters.toFixed(1)} L`,
          emptyAt: `EMPTY: ${runOutOdo.toFixed(1)} KM`,
          oilLeft: `OIL: ${Math.max(0, kmUntilNextOilChange).toFixed(0)}`,
          trip: `TRIP: ${tripValue.toFixed(1)}`,
          budget: `${budgetRemaining.toFixed(0)} EGP`,
          odo: `ODO: ${(fuelState.lastOdo || 0).toFixed(0)}`,
          
          fuelLitersRaw: fuelState.estimatedFuelLiters,
          oilLeftRaw: kmUntilNextOilChange,
          tripRaw: tripValue,
          odoRaw: fuelState.lastOdo || 0,
          consumptionRate: settings.avgConsumption,
          tankCapacity: settings.tankCapacity,
          fuelPrice: settings.fuelPricePerLiter,
          warningThreshold: settings.warningThreshold,
          isWarning,
          isDanger
        };

        // Decoupling: Only overwrite look if explicitly changed from inside React
        if (shouldSendColors) {
          payload.accentColor = settings.widgetAccentColor;
          payload.opacity = settings.widgetOpacity;
        }

        registerPlugin<any>('AlarmPlugin').updateWidgetStats(payload).catch(() => {});
      } catch (e) { /* ignore */ }
    };

    // Immediate update for critical telemetry
    updateWidget();

    // Debounced update for settings changes
    const timer = setTimeout(updateWidget, 250);
    return () => clearTimeout(timer);
  }, [
    currentSpeed, rangeRemainingKm, fuelPercentage, runOutOdo, 
    kmUntilNextOilChange, fuelState.estimatedFuelLiters, fuelState.lastOdo,
    isWarning, isDanger, settings.widgetAccentColor, settings.widgetOpacity,
    logs, settings.fuelPricePerLiter, settings.avgConsumption, settings.tankCapacity
  ]);

  return {
    fuelState, settings, userProfile, logs,
    isWarning, isDanger, fuelPercentage, rangeRemainingKm, runOutOdo,
    isTracking, isStarting, isMuted, currentSpeed,
    trackingError, clearTrackingError: () => setTrackingError(null),
    gpsUpdateCount, lastGpsTime,
    kmSinceOilChange, kmUntilNextOilChange, recordOilChange,
    setSettings, 
    setWidgetSettings: (newSettings: Partial<FuelSettings>) => {
      isManuallyChanged.current = true;
      setSettings(prev => ({ ...prev, ...newSettings }));
    },
    addRefuel, updateCurrentOdo, updateUserProfile,
    startTracking, stopTracking, setIsMuted, playWarningSound,
    resetData, requestAllPermissions, setCurrentSpeed,
    audioCtxRef, activeAudioRef, isDataLoaded
  };
};

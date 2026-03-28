import { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';

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
  totalGpsDistance: number; // Cumulative distance tracked via GPS since last refuel
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
  avgConsumption: 21.4, // 150km / 7L
  warningThreshold: 30, // Warn when less than 30km left
  fuelPricePerLiter: 22.25, // Updated price for 92
  autoTrack: false,
  enableAlerts: true,
};

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
  const [isMuted, setIsMuted] = useState(false); // Manually silence alerts for the current ride
  const lastPositionRef = useRef<GeolocationPosition | any | null>(null);
  const watchId = useRef<string | null>(null);
  const wakeLock = useRef<any>(null);
  const lastNotifiedStepRef = useRef<number>(999); // Track the last 2km step we alerted (15, 13, 11...)

  // Register Notification Actions
  useEffect(() => {
    (async () => {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      // Register the action type
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'FUEL_ALARM_ACTIONS',
            actions: [
              {
                id: 'silence',
                title: 'إيقاف 🔇',
                foreground: false, // Don't bring app to front, just mute
              }
            ]
          }
        ]
      });

      // Create a high-importance channel for "Heads-up" notifications
      await LocalNotifications.createChannel({
        id: 'fuel_alerts',
        name: 'Fuel Alerts',
        description: 'Critical fuel reminders',
        importance: 5, // High importance for pop-up behavior
        visibility: 1, // Public
        sound: 'alarm.wav',
        vibration: true
      });

      // Add listener for action
      const listener = await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        if (action.actionId === 'silence') {
          setIsMuted(true);
          // Stop native alarm if playing
          import('@capacitor/core').then(({ registerPlugin }) => {
            const AlarmPlugin = registerPlugin<any>('AlarmPlugin');
            AlarmPlugin.stopAlarm().catch(() => {});
          });
          LocalNotifications.removeAllDeliveredNotifications();
        }
      });

      return () => {
        listener.remove();
      };
    })();
  }, []);

  // Audio warning (Aggressive Alarm)
  const playWarningSound = (isAlarm: boolean = false) => {
    if (!settings.enableAlerts || isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square'; // Very harsh and piercing
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.5, startTime); // Max safe gain for square wave
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (isAlarm) {
        // Native Alarm (Overrides Silent Mode)
        import('@capacitor/core').then(({ registerPlugin }) => {
          const AlarmPlugin = registerPlugin<any>('AlarmPlugin');
          AlarmPlugin.playAlarm().catch((e: any) => console.warn('Native alarm failed', e));
        });

        // High-pitch emergency siren (Web Audio fallback)
        for (let i = 0; i < 20; i++) {
          const freq = i % 2 === 0 ? 900 : 1800; // Alternating "Siren" tones
          playBeep(freq, ctx.currentTime + i * 0.15, 0.12);
        }
        if (navigator.vibrate) {
          // SOS style aggressive pulses
          navigator.vibrate([300, 100, 300, 100, 300, 500, 800, 200, 800, 200, 800, 500, 300, 100, 300, 100, 300]);
        }
      } else {
        playBeep(600, ctx.currentTime, 0.4);
        if (navigator.vibrate) navigator.vibrate(200);
      }
    } catch (e) {
      console.warn('Audio failed', e);
    }
  };

  // Wake Lock Logic
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock.current) {
      wakeLock.current.release();
      wakeLock.current = null;
    }
  };

  // Haversine formula to calculate distance in KM
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; 
    return d;
  };

  const startTracking = async () => {
    try {
      const win = window as any;
      const isAndroid = win.Capacitor.getPlatform() === 'android';

      // 1. Request Notifications (Required for Foreground Service in Android 13+)
      if (isAndroid) {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const notifPerm = await LocalNotifications.checkPermissions();
        if (notifPerm.display !== 'granted') {
          // Explicit Rationale for Notifications on Android 13+
          alert("عشان الأبلكيشن يفضل يحسب المسافة والتنبيهات وأنت قافل الشاشة، لازم توافق على إذن التنبيهات في الخطوة الجاية.");
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') {
            alert("بدون إذن التنبيهات، البرنامج ممكن يتوقف فجأة وهو في الخلفية. من فضلك فعله من إعدادات الموبايل.");
          }
        }
      }


      // 2. Request Foreground Location (FINE_LOCATION)
      let currentPerms = await Geolocation.checkPermissions();
      if (currentPerms.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          alert("Location permission required to track fuel usage");
          return;
        }
      }

      // 3. Trigger GPS Hardware Toggle (Native Android Intent)
      if (isAndroid) {
        try {
          // Quick position check with high accuracy - triggers native GPS dialog on most devices.
          const result = await Promise.race([
            Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
          ]).catch(async (_err: any) => {
            // If timed out or position unavailable, GPS is likely off - open Location Settings
            const msg = "الـ GPS مقفول في موبايلك. هتنقلك للإعدادات عشان تفتحه ضروري للتتبع.";
            alert(msg);
            // Open Android Location Settings
            if (win.cordova?.plugins?.diagnostic) {
              win.cordova.plugins.diagnostic.switchToLocationSettings();
            } else {
              console.log('Directing user to location settings (manual) - GPS was off');
            }

          });
          if (result) console.log('GPS is active');
        } catch (err: any) {
          console.warn("GPS check outcome:", err.message);
        }
      }

      // 4. Request Background Location (Sequenced / Android 10+)
      if (isAndroid) {
        // To accurately check for "Allow all the time", we often need to just try requesting it
        // or show a manual prompt because Capacitor doesn't distinguish 'Always' vs 'While using' easily.
        const message = "عشان التطبيق يشتغل تمام في الخلفية ويحسب المسافة وأنت قافل الشاشة، لازم تتأكد إنك مختار 'Allow all the time' (السماح طوال الوقت) في إعدادات الموقع.";
        alert(message);
        await Geolocation.requestPermissions();
        // This will trigger the system to show the "Allow all the time" option or take them to Settings.
      }




    } catch (e) {
      console.log('Permission check issue:', e);
    }
    
    setIsTracking(true);
    
    // --- BACKGROUND GEOLOCATION ---
    // This plugin creates a Foreground Service notification on Android
    const { registerPlugin } = await import('@capacitor/core');
    const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');

    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: "تطبيق متتبع البنزين يعمل في الخلفية...",
        backgroundTitle: "جاري تتبع المشوار 🛵",
        requestPermissions: true,
        stale: false,
        distanceFilter: 10 // Update every 10 meters
      },
      (pos: any, err: any) => {
        if (err) {
          console.error(err);
          return;
        }
        if (!pos) return;

        setFuelState(prev => {
          if (lastPositionRef.current) {
            const dist = calculateDistance(
              lastPositionRef.current.latitude, lastPositionRef.current.longitude,
              pos.latitude, pos.longitude
            );
            
            if (dist > 0.01) {
              const consumed = dist / settings.avgConsumption;
              const newState = {
                ...prev,
                estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                lastOdo: prev.lastOdo + dist,
                totalGpsDistance: prev.totalGpsDistance + dist
              };
              
              lastPositionRef.current = pos;
              return newState;
            }
            return prev;
          } else {
            lastPositionRef.current = pos;
            return prev;
          }
        });
      }
    );
    
    watchId.current = id;
    requestWakeLock();
  };

  const stopTracking = async () => {
    if (watchId.current !== null) {
      const { registerPlugin } = await import('@capacitor/core');
      const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');
      await BackgroundGeolocation.removeWatcher({ id: watchId.current });
      watchId.current = null;
    }
    setIsTracking(false);
    lastPositionRef.current = null;
    releaseWakeLock();
  };

  // Auto-start tracking on load (Always on now as per user request)
  useEffect(() => {
    if (!isTracking) {
      // Delay slightly to ensure permissions are handled or UI is ready
      const timer = setTimeout(() => {
        startTracking();
      }, 1000);
      return () => {
        clearTimeout(timer);
        stopTracking(); // Ensure tracking is stopped when component unmounts
      };
    }
    return () => {
      stopTracking(); // This cleanup runs if isTracking becomes true or effect re-runs
    };
  }, []);

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem('scooter_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('fuel_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('fuel_state', JSON.stringify(fuelState));
  }, [fuelState]);

  useEffect(() => {
    localStorage.setItem('fuel_logs', JSON.stringify(logs));
  }, [logs]);

    // Global Warning & Notification logic: triggers on any fuel change (GPS or Manual Sync)
  useEffect(() => {
    const rangeRemaining = fuelState.estimatedFuelLiters * settings.avgConsumption;
    
    // CRITICAL FIX: Don't alert if fuel/range is 0 (not initialized yet)
    if (rangeRemaining <= 0) return;
    
    const possibleSteps = [15.1, 13.1, 11.1, 9.1, 7.1, 5.1, 3.1, 1.1];
    const activeStep = possibleSteps.find(s => rangeRemaining <= s && lastNotifiedStepRef.current > s);


    if (activeStep) {
      const displayStep = Math.floor(activeStep); // 15, 13, 11...
      if (!isMuted && displayStep > 0) {
        import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
          LocalNotifications.schedule({
            notifications: [
              {
                title: "تحذير بنزين منخفض! ⚠️",
                body: `باقي لك ${displayStep} كيلو بس والبنزين يخلص، خلي بالك!`,
                id: displayStep, // Unique ID per step
                schedule: { at: new Date(Date.now() + 1000) },
                sound: 'alarm.wav',
                actionTypeId: 'FUEL_ALARM_ACTIONS',
                channelId: 'fuel_alerts',
                attachments: [],
                extra: null
              }
            ]
          }).catch(console.warn);
        });
        playWarningSound(true); // Play "Alarm" version
      }
      lastNotifiedStepRef.current = activeStep;
    } else if (
      rangeRemaining > 15.1 && 
      rangeRemaining <= settings.warningThreshold && 
      lastNotifiedStepRef.current > settings.warningThreshold
    ) {
      if (!isMuted) playWarningSound(false);
      lastNotifiedStepRef.current = settings.warningThreshold; // Prevent standard double warnings
    }
  }, [fuelState.estimatedFuelLiters, settings.avgConsumption, settings.warningThreshold, isMuted]);


  /**
   * Refuel action: user adds fuel at a specific odometer reading.
   */
  const addRefuel = (odo: number, liters: number, price: number | undefined, isFullTank: boolean) => {
    let baseFuelAmount = 0;
    let isEditingLastLog = false;
    let prevLog: RefuelLog | null = null;

    if (logs.length > 0 && logs[0].odo === odo) {
      isEditingLastLog = true;
      prevLog = logs[0];
      baseFuelAmount = prevLog.fuelBeforeRefuel !== undefined ? prevLog.fuelBeforeRefuel : 0;
    } else if (fuelState.lastOdo > 0 && odo > fuelState.lastOdo) {
      const distanceDriven = odo - fuelState.lastOdo;
      const consumed = distanceDriven / settings.avgConsumption;
      baseFuelAmount = Math.max(0, fuelState.estimatedFuelLiters - consumed);
    } else {
      baseFuelAmount = fuelState.estimatedFuelLiters;
    }

    let newFuelAmount = 0;
    if (isFullTank) {
      newFuelAmount = settings.tankCapacity;
    } else {
      newFuelAmount = Math.min(settings.tankCapacity, baseFuelAmount + liters);
    }

    const newLog: RefuelLog = {
      id: isEditingLastLog ? prevLog!.id : crypto.randomUUID(),
      date: new Date().toISOString(),
      odo,
      litersAdded: liters,
      pricePaid: price,
      isFullTank,
      fuelBeforeRefuel: baseFuelAmount,
    };

    setLogs((prev) => {
      if (isEditingLastLog) {
        const updated = [...prev];
        updated[0] = newLog;
        return updated;
      }
      return [newLog, ...prev];
    });

    setFuelState({
      estimatedFuelLiters: newFuelAmount,
      lastOdo: odo,
      totalGpsDistance: 0 // Reset GPS distance on refuel
    });
    lastNotifiedStepRef.current = 999; // Reset notification tracker
    setIsMuted(false); // Enable alerts again after refuel
  };

  /**
   * Manual Odo update (without refueling) just to sync app.
   */
  const updateCurrentOdo = (odo: number) => {
    setFuelState(prev => {
      const diff = odo - prev.lastOdo;
      if (diff > 0) {
        // If odometer skipped forward, calculate untracked fuel and remove it
        const consumed = diff / settings.avgConsumption;
        return {
          ...prev,
          lastOdo: odo,
          estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed)
        };
      }
      return { ...prev, lastOdo: odo };
    });
  };

  const updateUserProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  /**
   * Reset the tracker data
   */
  const resetData = () => {
    if (confirm('Are you sure you want to delete all data?')) {
      setLogs([]);
      setFuelState({ estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 });
      setIsMuted(false);
    }
  };

  // Derived values for the UI
  const rangeRemainingKm = Math.max(0, fuelState.estimatedFuelLiters * settings.avgConsumption);
  const runOutOdo = fuelState.lastOdo + rangeRemainingKm;
  const isWarning = rangeRemainingKm <= settings.warningThreshold;
  const isDanger = rangeRemainingKm <= 10;
  const fuelPercentage = Math.min(100, Math.max(0, (fuelState.estimatedFuelLiters / settings.tankCapacity) * 100));

  return {
    fuelState,
    settings,
    userProfile,
    logs,
    isWarning,
    isDanger,
    fuelPercentage,
    rangeRemainingKm,
    runOutOdo,
    isTracking,
    isMuted,
    setSettings,
    addRefuel,
    updateCurrentOdo,
    updateUserProfile,
    startTracking,
    stopTracking,
    setIsMuted,
    playWarningSound,
    resetData
  };
};

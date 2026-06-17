import { useState, useEffect, useRef } from 'react';
import { translations } from '../translations';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';

import { AlarmPlugin } from '../AlarmPlugin';
import { useAudioAlerts, playTone, stopTone } from './useAudioAlerts';
import { useGpsTracking } from './useGpsTracking';

export { playTone, stopTone };

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
  distanceMultiplier: number;
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
  language: 'en',
  accentColor: '#326144',
  alertTone: 'Digital',
  customTones: [],
  isLightMode: false,
  oilChangeInterval: 700,
  lastOilChangeOdo: 0,
  widgetAccentColor: '#00f0ff',
  widgetOpacity: 100,
  distanceMultiplier: 1.0,
};



// ─────────────────────────────────────────────────────────────────────────────
// Utility: check if we're on Android
// ─────────────────────────────────────────────────────────────────────────────
function isAndroidPlatform() {
  return (window as any).Capacitor?.getPlatform() === 'android';
}

export const useFuelTracker = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('scooter_user_profile');
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error('Corrupt scooter_user_profile, resetting', e); localStorage.removeItem('scooter_user_profile'); } }
    return null;
  });
  const [settings, setSettings] = useState<FuelSettings>(() => {
    const saved = localStorage.getItem('fuel_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });
  const [fuelState, setFuelState] = useState<FuelState>(() => {
    const saved = localStorage.getItem('fuel_state');
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error('Corrupt fuel_state, resetting', e); localStorage.removeItem('fuel_state'); } }
    return { estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 };
  });
  const [logs, setLogs] = useState<RefuelLog[]>(() => {
    const saved = localStorage.getItem('fuel_logs');
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error('Corrupt fuel_logs, resetting', e); localStorage.removeItem('fuel_logs'); } }
    return [];
  });

  const [trackingError, setTrackingError] = useState<{ message: string; action?: 'openGPS' | 'openSettings' } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const lastNotifiedStepRef = useRef<number>(999);
  const lastNotifiedKmRef = useRef<number>(999);

  const { triggerAlarm, triggerWarning, audioCtxRef, activeAudioRef } = useAudioAlerts();

  const {
    isTracking,
    isStarting,
    currentSpeed,
    gpsUpdateCount,
    lastGpsTime,
    startTracking: gpsStartTracking,
    stopTracking: gpsStopTracking
  } = useGpsTracking({
    settings,
    initialOdo: fuelState.lastOdo,
    onDistanceUpdate: (dist, _speedKmh) => {
      const consumed = (Number(dist) || 0) / (Number(settingsRef.current.avgConsumption) || 21.4);
      setFuelState(prev => {
        const currentFuel = Number(prev.estimatedFuelLiters) || 0;
        const newFuel = Math.max(0, currentFuel - consumed);
        return {
          ...prev,
          estimatedFuelLiters: Number.isNaN(newFuel) ? 0 : newFuel,
          lastOdo: (Number(prev.lastOdo) || 0) + (Number(dist) || 0),
          totalGpsDistance: (Number(prev.totalGpsDistance) || 0) + (Number(dist) || 0),
        };
      });
    },
    onTrackingError: (err) => {
      setTrackingError(err);
    }
  });

  // ── settingsRef: always up-to-date inside GPS callbacks (fixes stale closure) ──
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── fuelStateRef: always up-to-date inside background app listener callbacks ──
  const fuelStateRef = useRef(fuelState);
  useEffect(() => { fuelStateRef.current = fuelState; }, [fuelState]);



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
        // We no longer request permissions here on mount.
        // It is handled gracefully in the Onboarding/Permissions flow.

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
          lightColor: '#dc2626',
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
            AlarmPlugin.stopAlarm().catch(() => {});
            LocalNotifications.removeAllDeliveredNotifications();
          }
        });

        return () => { listener.remove(); };
      } catch (e) {
        console.warn('[FuelTracker] Notification setup failed:', e);
      }
    })();
  }, [settings.language]);

  // ── Audio Warning ─────────────────────────────────────────────────────────
  const playWarningSound = (isAlarm = false) => {
    if (!settings.enableAlerts || isMuted) return;
    try {
      if (isAlarm) {
        triggerAlarm(settings.alertTone || 'Digital', settings.customTones);
      } else {
        triggerWarning();
      }
    } catch (e) { console.warn('Audio failed', e); }
  };




  // ── Mount/Initialization Effect ──
  useEffect(() => {
    let appStateListener: any = null;

    const init = async () => {
      // ── Ensure we load the reliable native settings in case localStorage was wiped ──
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const prefSettings = await Preferences.get({ key: 'fuel_settings' });
        if (prefSettings.value) {
          const parsedPrefs = JSON.parse(prefSettings.value);
          setSettings(prev => {
            const merged = { ...prev, ...parsedPrefs };
            localStorage.setItem('fuel_settings', JSON.stringify(merged));
            return merged;
          });
        }
        
        // --- Fetch TRUE native widget design state ---
        if (isAndroidPlatform()) {
          const alarmPlugin = AlarmPlugin;
          const widgetStats = await alarmPlugin.getWidgetSettings();
          if (widgetStats && widgetStats.accentColor) {
            setSettings(prev => {
              const merged = { ...prev, widgetAccentColor: widgetStats.accentColor, widgetOpacity: widgetStats.opacity };
              localStorage.setItem('fuel_settings', JSON.stringify(merged));
              return merged;
            });
          }
          
          const logsRes = await alarmPlugin.getNativeLogs();
          if (logsRes && logsRes.logs && logsRes.logs !== "[]") {
            try {
              const newLogs = JSON.parse(logsRes.logs);
              if (newLogs.length > 0) {
                let addedLiters = 0;
                newLogs.forEach((log: any) => { addedLiters += log.liters || 0; });
                
                setFuelState(prev => ({
                  ...prev,
                  estimatedFuelLiters: Math.min(settingsRef.current.tankCapacity, prev.estimatedFuelLiters + addedLiters)
                }));

                setLogs(prev => {
                  const merged = [...newLogs, ...prev];
                  merged.sort((a: any, b: any) => b.timestamp - a.timestamp);
                  return merged;
                });
              }
            } catch(e) {}
          }
        }
      } catch (e) { /* ignore */ }

      try {
        const { App } = await import('@capacitor/app');
        appStateListener = await App.addListener('appStateChange', async (state) => {
          if (!state.isActive) {
            // App going to background, ensure state is saved
            localStorage.setItem('fuel_state', JSON.stringify(fuelStateRef.current));
          } else {
            // App came back to foreground — check if overlay synced ODO
            if (isAndroidPlatform()) {
              try {
                const alarmPlugin = AlarmPlugin;
                const res = await alarmPlugin.checkOverlaySync();
                if (res && res.pending && res.odo > 0) {
                  const newOdo = res.odo;
                  setFuelState(prev => {
                    const diff = newOdo - prev.lastOdo;
                    if (diff < 0) return prev;
                    const fuelAdj = diff / (settingsRef.current.avgConsumption || 21.4);
                    return {
                      ...prev,
                      lastOdo: newOdo,
                      estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - fuelAdj)
                    };
                  });
                  console.log('[FuelTracker] Overlay sync applied: ODO =', newOdo);
                }

                const logsRes = await alarmPlugin.getNativeLogs();
                if (logsRes && logsRes.logs && logsRes.logs !== "[]") {
                  try {
                    const newLogs = JSON.parse(logsRes.logs);
                    if (newLogs.length > 0) {
                      let addedLiters = 0;
                      newLogs.forEach((log: any) => { addedLiters += log.liters || 0; });
                      
                      setFuelState(prev => ({
                        ...prev,
                        estimatedFuelLiters: Math.min(settingsRef.current.tankCapacity, prev.estimatedFuelLiters + addedLiters)
                      }));

                      setLogs(prev => {
                        const merged = [...newLogs, ...prev];
                        merged.sort((a: any, b: any) => b.timestamp - a.timestamp);
                        return merged;
                      });
                    }
                  } catch(e) {}
                }
              } catch (e) {
                console.warn('[FuelTracker] Overlay sync check failed:', e);
              }
            }
          }
        });
      } catch (e) {}
    };

    init();

    return () => {
      appStateListener?.remove();
    };
  }, []);

  // ── Persist state & Sync to Native Widget ────────────────────────────────
  useEffect(() => { localStorage.setItem('scooter_user_profile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { 
    localStorage.setItem('fuel_settings', JSON.stringify(settings)); 
    // Sync to Capacitor Preferences so that they survive app close and are in sync with native
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.set({ key: 'fuel_settings', value: JSON.stringify(settings) }).catch(() => {});
    }).catch(() => {});
  }, [settings]);
  useEffect(() => { 
    localStorage.setItem('fuel_state', JSON.stringify(fuelState)); 
    // --- LIVE SYNC TO NATIVE SHRED PREFS (For Widget & BG Service) ---
    if (isAndroidPlatform()) {
      try {
        const alarmPlugin = AlarmPlugin;
        const rawRange = fuelState.estimatedFuelLiters * settings.avgConsumption;
        alarmPlugin.syncStateToNative({
          trip: fuelState.totalGpsDistance,
          fuelLiters: fuelState.estimatedFuelLiters,
          odo: fuelState.lastOdo,
          range: (isFinite(rawRange) ? rawRange.toFixed(1) : "0.0") + " KM",
          fuelPercent: settings.tankCapacity > 0 ? Math.round((fuelState.estimatedFuelLiters / settings.tankCapacity) * 100) : 0,
          distanceMultiplier: settings.distanceMultiplier ?? 1.0,
          consumptionRate: settings.avgConsumption,
          tankCapacity: settings.tankCapacity,
          warningThreshold: settings.warningThreshold,
          language: settings.language,
          fuelPrice: settings.fuelPricePerLiter
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    }
  }, [fuelState, settings.avgConsumption, settings.tankCapacity, settings.distanceMultiplier, settings.fuelPricePerLiter, settings.warningThreshold, settings.language]);
  useEffect(() => { localStorage.setItem('fuel_logs', JSON.stringify(logs)); }, [logs]);

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
          
          // ── STEP 1: DROP NOTIFICATION (uses phone's default alarm sound via channel) ──
          LocalNotifications.schedule({
            notifications: [{
              title: (translations[lang] as any)?.lowFuelAlertTitle,
              body: typeof (translations[lang] as any)?.lowFuelAlertBody === 'function' 
                ? (translations[lang] as any).lowFuelAlertBody(display) 
                : display,
              id: Math.floor(Math.random() * 100000) + 1,
              schedule: { at: new Date(), allowWhileIdle: true },
              actionTypeId: 'FUEL_ALARM_ACTIONS',
              channelId: `fuel_alert_v14_premium`,
              importance: 5, 
              priority: 2,
            } as any]
          }).catch(console.warn);
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

    if (fuelState.lastOdo > 0 && odo > fuelState.lastOdo) {
      baseFuel = Math.max(0, fuelState.estimatedFuelLiters - (odo - fuelState.lastOdo) / settings.avgConsumption);
    } else {
      baseFuel = fuelState.estimatedFuelLiters;
    }

    const newFuel = baseFuel + liters;
    const newLog: RefuelLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      odo, litersAdded: liters, pricePaid: price, isFullTank,
      fuelBeforeRefuel: baseFuel,
    };

    // ── Auto-learn consumption from refuel history ──
    if (liters > 0) {
      const prevRefuel = logs.find(l => l.odo < odo);
      if (prevRefuel) {
        const kmDriven = odo - prevRefuel.odo;
        if (kmDriven > 5) {
          // ✅ FIX Bug 3: Correctly calculate liters BURNED between the two refuels.
          // Before: was (fuelBeforeRefuel + liters) which sums both sides wrongly.
          // Now: fuel at start of interval - fuel remaining when we arrived = consumed.
          const fuelAtStartOfInterval = (prevRefuel.fuelBeforeRefuel ?? 0) + prevRefuel.litersAdded;
          const litersConsumed = fuelAtStartOfInterval - baseFuel; // baseFuel = fuel remaining before THIS refuel
          if (litersConsumed > 0.5) {
            const actualConsumption = kmDriven / litersConsumed;
            const newAvg = Math.round((settings.avgConsumption * 0.7 + actualConsumption * 0.3) * 10) / 10;
            const clamped = Math.max(5, Math.min(60, newAvg));
            setSettings(prev => ({ ...prev, avgConsumption: clamped }));
            localStorage.setItem('fuel_settings', JSON.stringify({ ...settings, avgConsumption: clamped }));
            import('@capacitor/preferences').then(({ Preferences }) =>
              Preferences.set({ key: 'fuel_settings', value: JSON.stringify({ ...settings, avgConsumption: clamped }) })
            ).catch(() => {});
          }
        }
      }
    }

    setLogs(prev => [newLog, ...prev]);
    // ✅ FIX Bug 2: Preserve totalGpsDistance instead of wiping it on every refuel.
    setFuelState(prev => ({ ...prev, estimatedFuelLiters: newFuel, lastOdo: odo }));
    lastNotifiedStepRef.current = 999;
    
    // ── FIX: Stop vibration upon refueling ──
    stopTone();
    setIsMuted(false);
  };

  const removeRefuel = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const emptyTank = () => {
    setFuelState(prev => ({ ...prev, estimatedFuelLiters: 0 }));
    // Fix: Stop vibration if fuel was low and user reset it explicitly (though usually reset means 0 fuel, but user wants it clean)
    stopTone();
    setIsMuted(false);
  };

  const updateCurrentOdo = (odo: number) => {
    setFuelState(prev => {
      const diff = odo - prev.lastOdo;
      // Calculate fuel adjustment based on the odometer shift (positive or negative)
      const fuelAdjustment = diff / (settingsRef.current.avgConsumption || 21.4);
      
      return { 
        ...prev, 
        lastOdo: odo, 
        estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - fuelAdjustment)
      };
    });
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => setUserProfile(prev => ({ name: '', phone: '', vehicleType: '', registeredAt: new Date().toISOString(), ...prev, ...profile }));

  const requestAllPermissions = async (): Promise<boolean> => {
    if (!isAndroidPlatform()) return true;
    try {
      // ── Step 1: Notifications ──────────────────────────────────────────────
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const notifPerm = await LocalNotifications.checkPermissions();
      if (notifPerm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }

      // ── Step 2: Fine Location (GPS) ────────────────────────────────────────
      const locPerm = await Geolocation.checkPermissions();
      if (locPerm.location !== 'granted') {
        const locResult = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        if (locResult.location !== 'granted') {
          return false;
        }
      }

      // ── Step 3: Overlay Permission ────────────────────────────────────────
      try {
        const alarmPlugin = AlarmPlugin;
        const overlayCheck = await alarmPlugin.checkOverlayPermission();
        if (!overlayCheck?.granted) {
          await alarmPlugin.requestOverlayPermission();
          return false;
        }

        // ── Step 4: Physical Activity Permission (for Pedometer) ─────────────


      } catch (e) {
        console.warn('[FuelTracker] Plugin permission request failed:', e);
      }
      return true;
    } catch (e) {
      console.warn('[FuelTracker] requestAllPermissions error:', e);
      return true;
    }
  };

  const resetData = async () => {
    stopTracking();
    setLogs([]);
    setFuelState({ estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 });
    setSettings(DEFAULT_SETTINGS);
    setUserProfile(null);
    setIsMuted(false);
    localStorage.clear();
    
    // Clear Native Preferences
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.clear();
    } catch (e) { console.warn('Could not clear preferences', e); }
    
    // Clear Native Background Service / Widget Data
    if (isAndroidPlatform()) {
      try {
        const alarmPlugin = AlarmPlugin;
        await alarmPlugin.syncStateToNative({
          trip: 0, fuelLiters: 0, odo: 0, range: "0 KM", fuelPercent: 0
        });
        // You might also need to clear native distance
        if (alarmPlugin.stopBackgroundTracking) await alarmPlugin.stopBackgroundTracking();
      } catch (e) {}
    }

    // Removed window.location.reload() for a smooth React state reset
  };

  const startTracking = async () => {
    const hasPerms = await requestAllPermissions();
    if (!hasPerms) {
      return; // Stop here if user didn't grant mandatory permissions
    }

    await gpsStartTracking();
  };

  const stopTracking = () => {
    gpsStopTracking();
  };

  // ── Derived UI values ─────────────────────────────────────────────────────
  const rangeRemainingKm = Math.max(0, fuelState.estimatedFuelLiters * settings.avgConsumption);
  const runOutOdo = fuelState.lastOdo + rangeRemainingKm;
  const isWarning = rangeRemainingKm <= settings.warningThreshold;
  const isDanger = rangeRemainingKm <= 10;
  const fuelPercentage = settings.tankCapacity > 0 ? Math.max(0, (fuelState.estimatedFuelLiters / settings.tankCapacity) * 100) : 0;
  const kmSinceOilChange = Math.max(0, fuelState.lastOdo - settings.lastOilChangeOdo);
  const kmUntilNextOilChange = Math.max(0, settings.oilChangeInterval - kmSinceOilChange);

  const recordOilChange = (odoValue: number) => {
    setSettings(prev => ({ ...prev, lastOilChangeOdo: odoValue }));
  };

  // ── Widget Settings (accent color, opacity) ─────────────────────────────
  const setWidgetSettings = (partial: Partial<Pick<FuelSettings, 'widgetAccentColor' | 'widgetOpacity' | 'language'>>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      // Persist immediately so it survives app close
      localStorage.setItem('fuel_settings', JSON.stringify(updated));
      import('@capacitor/preferences').then(({ Preferences }) =>
        Preferences.set({ key: 'fuel_settings', value: JSON.stringify(updated) })
      ).catch(() => {});
      // Immediately push to native widget
      if (isAndroidPlatform()) {
        try {
          AlarmPlugin.updateWidgetDesign({
            accentColor: updated.widgetAccentColor,
            opacity: updated.widgetOpacity
          }).catch(() => {});
        } catch (e) { /* ignore */ }
      }
      return updated;
    });
  };

  // ── Sync Live Stats with Native Widget ────────────────────────────────────
  const forceWidgetSync = () => {
    if (!isAndroidPlatform()) return;
    try {
      const tripValue = Math.max(0, fuelState.lastOdo - (Number(localStorage.getItem('custom_trip_base')) || 0));
      const pricePerLiter = settings.fuelPricePerLiter || 14.5;
      const budgetRemaining = Math.max(0, fuelState.estimatedFuelLiters * pricePerLiter);

      AlarmPlugin.updateWidgetStats({
        speed: Math.round(currentSpeed || 0),
        range: `${rangeRemainingKm.toFixed(1)} KM`,
        fuelPercent: Math.round(fuelPercentage),
        litersLeft: `${fuelState.estimatedFuelLiters.toFixed(1)} L`,
        emptyAt: `EMPTY: ${runOutOdo.toFixed(1)} KM`,
        oilLeft: `OIL: ${Math.ceil(Math.max(0, kmUntilNextOilChange)).toFixed(0)}`,
        trip: `TRIP: ${tripValue.toFixed(1)}`,
        budget: `${budgetRemaining.toFixed(0)} EGP`,
        fuelLitersRaw: fuelState.estimatedFuelLiters,
        oilLeftRaw: kmUntilNextOilChange,
        tripRaw: tripValue,
        odoRaw: fuelState.lastOdo,
        consumptionRate: settings.avgConsumption,
        tankCapacity: settings.tankCapacity,
        fuelPrice: settings.fuelPricePerLiter,
        odo: `ODO: ${fuelState.lastOdo.toFixed(0)}`,
        language: settings.language,
        isWarning,
        isDanger
      }).catch(() => {});
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!isAndroidPlatform()) return;

    // Immediate update for critical telemetry
    forceWidgetSync();

    // Debounced update for settings changes
    const timer = setTimeout(forceWidgetSync, 150);
    return () => clearTimeout(timer);
  }, [
    currentSpeed, rangeRemainingKm, fuelPercentage, runOutOdo, 
    kmUntilNextOilChange, fuelState.estimatedFuelLiters, 
    isWarning, isDanger, settings.widgetAccentColor, settings.widgetOpacity,
    logs, settings.fuelPricePerLiter, settings.avgConsumption, settings.tankCapacity,
    fuelState.lastOdo, settings.language
  ]);

  return {
    fuelState, settings, userProfile, logs,
    isWarning, isDanger, fuelPercentage, rangeRemainingKm, runOutOdo,
    isTracking, isStarting, isMuted, currentSpeed,
    trackingError, clearTrackingError: () => setTrackingError(null), setTrackingError,
    gpsUpdateCount, lastGpsTime,
    kmSinceOilChange, kmUntilNextOilChange, recordOilChange,
    setSettings, setWidgetSettings, addRefuel, removeRefuel, updateCurrentOdo, updateUserProfile, emptyTank,
    startTracking, stopTracking, setIsMuted, playWarningSound,
    resetData, requestAllPermissions, forceWidgetSync,
    audioCtxRef, activeAudioRef,
    isDataLoaded: true
  };
};

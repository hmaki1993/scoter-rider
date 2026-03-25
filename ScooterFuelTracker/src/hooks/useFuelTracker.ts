import { useState, useEffect, useRef } from 'react';

export interface FuelSettings {
  tankCapacity: number; // Liters
  avgConsumption: number; // km per liter
  warningThreshold: number; // km remaining to trigger warning
  fuelPricePerLiter: number; // EGP per Liter
  autoTrack: boolean; // Automatically start GPS on app load
  enableAlerts: boolean; // Sound/Vibrate on low fuel
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
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<any>(null);

  // Audio warning (simple beep)
  const playWarningSound = () => {
    if (!settings.enableAlerts) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
      
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.error("Audio error", e);
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

  const startTracking = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser");
    
    setIsTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (lastPosition) {
          const dist = calculateDistance(
            lastPosition.coords.latitude, lastPosition.coords.longitude,
            pos.coords.latitude, pos.coords.longitude
          );
          
          if (dist > 0.01) { // Only update if moved > 10 meters to avoid jitter
            setFuelState(prev => {
              const consumed = dist / settings.avgConsumption;
              const newState = {
                ...prev,
                estimatedFuelLiters: Math.max(0, prev.estimatedFuelLiters - consumed),
                lastOdo: prev.lastOdo + dist,
                totalGpsDistance: prev.totalGpsDistance + dist
              };

              // Trigger warning if crossing threshold
              const rangeRemaining = newState.estimatedFuelLiters * settings.avgConsumption;
              if (rangeRemaining <= settings.warningThreshold && (prev.estimatedFuelLiters * settings.avgConsumption) > settings.warningThreshold) {
                playWarningSound();
              }

              return newState;
            });
          }
        }
        setLastPosition(pos);
      },
      (err: any) => console.error(err),
      { enableHighAccuracy: true }
    );
    
    requestWakeLock();
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    setLastPosition(null);
    releaseWakeLock();
  };

  // Auto-start tracking if enabled
  useEffect(() => {
    if (settings.autoTrack) {
      startTracking();
    }
    return () => stopTracking();
  }, [settings.autoTrack]);

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem('fuel_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('fuel_state', JSON.stringify(fuelState));
  }, [fuelState]);

  useEffect(() => {
    localStorage.setItem('fuel_logs', JSON.stringify(logs));
  }, [logs]);

  /**
   * Refuel action: user adds fuel at a specific odometer reading.
   */
  const addRefuel = (odo: number, liters: number, price: number | undefined, isFullTank: boolean) => {
    const newLog: RefuelLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      odo,
      litersAdded: liters,
      pricePaid: price,
      isFullTank,
    };

    setLogs((prev) => [newLog, ...prev]);

    // Calculate new state
    let newFuelAmount = 0;
    
    // First, deduct fuel consumed since last odo (if we had a previous log)
    if (fuelState.lastOdo > 0 && odo > fuelState.lastOdo) {
      const distanceDriven = odo - fuelState.lastOdo;
      const consumed = distanceDriven / settings.avgConsumption;
      newFuelAmount = Math.max(0, fuelState.estimatedFuelLiters - consumed);
    } else {
      // First time or odo is weird, just use what we have
      newFuelAmount = fuelState.estimatedFuelLiters;
    }

    if (isFullTank) {
      newFuelAmount = settings.tankCapacity;
    } else {
      newFuelAmount = Math.min(settings.tankCapacity, newFuelAmount + liters);
    }

    setFuelState({
      estimatedFuelLiters: newFuelAmount,
      lastOdo: odo,
      totalGpsDistance: 0 // Reset GPS distance on refuel
    });
  };

  /**
   * Manual Odo update (without refueling) just to sync app.
   */
  const updateCurrentOdo = (currentOdo: number) => {
    if (currentOdo <= fuelState.lastOdo) return;
    
    const distanceDriven = currentOdo - fuelState.lastOdo;
    const consumed = distanceDriven / settings.avgConsumption;
    const remaining = Math.max(0, fuelState.estimatedFuelLiters - consumed);

    setFuelState({
      estimatedFuelLiters: remaining,
      lastOdo: currentOdo,
      totalGpsDistance: 0 // Reset GPS distance on manual sync
    });
  };

  /**
   * Reset the tracker data
   */
  const resetData = () => {
    if (confirm('Are you sure you want to delete all data?')) {
      setLogs([]);
      setFuelState({ estimatedFuelLiters: 0, lastOdo: 0, totalGpsDistance: 0 });
    }
  };

  // Derived values for the UI
  const rangeRemainingKm = Math.max(0, fuelState.estimatedFuelLiters * settings.avgConsumption);
  const runOutOdo = fuelState.lastOdo + rangeRemainingKm;
  const isWarning = rangeRemainingKm <= settings.warningThreshold;
  const isDanger = rangeRemainingKm <= 10;
  const fuelPercentage = Math.min(100, Math.max(0, (fuelState.estimatedFuelLiters / settings.tankCapacity) * 100));

  return {
    settings,
    setSettings,
    fuelState,
    logs,
    addRefuel,
    updateCurrentOdo,
    resetData,
    rangeRemainingKm,
    runOutOdo,
    isWarning,
    isDanger,
    fuelPercentage,
    isTracking,
    startTracking,
    stopTracking
  };
};

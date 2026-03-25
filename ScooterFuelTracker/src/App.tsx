import React, { useState, useEffect, useRef } from 'react';
import { useFuelTracker } from './hooks/useFuelTracker';
import { Fuel, MapPin, AlertTriangle, Settings, Droplets, RotateCcw, Navigation, NavigationOff, Bell } from 'lucide-react';
import gsap from 'gsap';
import './index.css';

function App() {
  const tracker = useFuelTracker();
  const [showRefuel, setShowRefuel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const appRef = useRef<HTMLDivElement>(null);

  // Initial Entrance Animation
  useEffect(() => {
    if (appRef.current) {
      gsap.fromTo(
        appRef.current.children,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: "power4.out" }
      );
    }
  }, []);

  return (
    <div className="app-container" ref={appRef} style={{ padding: '24px', width: '100%', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="text-gradient" style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>SYM 200</h1>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>Fuel Tracker System</div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {tracker.settings.enableAlerts && <Bell size={20} color="var(--accent-color)" style={{ opacity: 0.6 }} />}
          <button className="glass-button" style={{ padding: '12px', borderRadius: '50%' }} onClick={() => setShowSettings(true)}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Status Dashboard */}
      <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background glow for danger/warning */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '250px', height: '250px', borderRadius: '50%',
          background: tracker.isDanger ? 'var(--danger-color)' : tracker.isWarning ? 'var(--warning-color)' : 'var(--accent-color)',
          filter: 'blur(80px)', opacity: 0.15, zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
            Estimated Range
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
            <span style={{ fontSize: '72px', fontWeight: '800', lineHeight: '1', color: tracker.isDanger ? 'var(--danger-color)' : 'var(--text-primary)', textShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {Math.max(0, Math.round(tracker.rangeRemainingKm))}
            </span>
            <span style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '12px' }}>km</span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ 
              height: '100%', 
              width: `${tracker.fuelPercentage}%`, 
              background: tracker.isDanger ? 'var(--danger-color)' : tracker.isWarning ? 'var(--warning-color)' : 'var(--accent-color)',
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 10px currentColor'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Droplets size={16} /> {tracker.fuelState.estimatedFuelLiters.toFixed(1)} L left</span>
            <span>Empty at: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(tracker.runOutOdo)}</strong> km</span>
          </div>
        </div>
      </div>

      {/* Warning Message */}
      {tracker.isWarning && (
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(255, 51, 102, 0.3)', background: 'rgba(255, 51, 102, 0.05)', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
          <div style={{ background: 'rgba(255, 51, 102, 0.2)', padding: '12px', borderRadius: '50%' }}>
            <AlertTriangle color="var(--danger-color)" size={24} />
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--danger-color)', fontSize: '16px' }}>Refuel Needed Soon!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>You might run out of fuel shortly.</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 'auto', marginBottom: '16px' }}>
        <button className="glass-button" style={{ flexDirection: 'column', gap: '8px', padding: '20px 16px', borderColor: tracker.isTracking ? 'var(--accent-color)' : 'var(--glass-border)' }} onClick={() => tracker.isTracking ? tracker.stopTracking() : tracker.startTracking()}>
          <div style={{ background: tracker.isTracking ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '50%', color: tracker.isTracking ? 'var(--accent-color)' : 'var(--text-primary)' }}>
            {tracker.isTracking ? <NavigationOff size={24} /> : <Navigation size={24} />}
          </div>
          <span style={{ fontSize: '14px' }}>{tracker.isTracking ? 'Stop Ride' : 'Track Ride'}</span>
        </button>
        <button className="glass-button" style={{ flexDirection: 'column', gap: '8px', padding: '20px 16px' }} onClick={() => setShowRefuel(true)}>
          <div style={{ background: 'rgba(0, 240, 255, 0.1)', padding: '12px', borderRadius: '50%', color: 'var(--accent-color)' }}>
            <Fuel size={24} />
          </div>
          <span style={{ fontSize: '14px' }}>Log Refuel</span>
        </button>
      </div>

      <button className="glass-button" style={{ width: '100%', gap: '12px', padding: '16px' }} onClick={() => {
        const odo = prompt('Manual Odometer Entry (km):', tracker.fuelState.lastOdo.toFixed(1));
        if (odo && !isNaN(Number(odo)) && Number(odo) > tracker.fuelState.lastOdo) {
          tracker.updateCurrentOdo(Number(odo));
        }
      }}>
        <MapPin size={18} />
        <span style={{ fontSize: '14px' }}>Sync Manual Odo</span>
      </button>

      {/* REFUEL MODAL */}
      {showRefuel && <RefuelModal tracker={tracker} onClose={() => setShowRefuel(false)} />}
      
      {/* SETTINGS MODAL */}
      {showSettings && <SettingsModal tracker={tracker} onClose={() => setShowSettings(false)} />}
      
    </div>
  );
}

// Inline Modal Components for simplicity in this PWA
function RefuelModal({ tracker, onClose }: { tracker: any, onClose: () => void }) {
  const [odo, setOdo] = useState(tracker.fuelState.lastOdo === 0 ? '' : tracker.fuelState.lastOdo.toFixed(1));
  const [inputValue, setInputValue] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [inputMode, setInputMode] = useState<'liters' | 'currency'>('currency');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!odo || !inputValue) return alert('Please fill in Odometer and Value.');
    
    let liters = Number(inputValue);
    const price = tracker.settings.fuelPricePerLiter || 14.0;
    if (inputMode === 'currency') {
      liters = Number(inputValue) / price;
    }

    tracker.addRefuel(Number(odo), liters, undefined, isFullTank);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: '100%', padding: '32px 24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Log Refuel</h2>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
            <button type="button" onClick={() => setInputMode('currency')} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: inputMode === 'currency' ? 'var(--accent-color)' : 'transparent', color: inputMode === 'currency' ? '#000' : '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>EGP</button>
            <button type="button" onClick={() => setInputMode('liters')} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: inputMode === 'liters' ? 'var(--accent-color)' : 'transparent', color: inputMode === 'liters' ? '#000' : '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Liters</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Odometer at Refuel (km)</label>
            <input type="number" step="0.1" className="glass-input" value={odo} onChange={e => setOdo(e.target.value)} placeholder="e.g. 1250" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {inputMode === 'currency' ? 'Amount in EGP' : 'Fuel Added (Liters)'}
            </label>
            <div style={{ position: 'relative' }}>
              <input type="number" step="0.1" className="glass-input" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={inputMode === 'currency' ? "e.g. 50" : "e.g. 4.5"} autoFocus />
              {inputMode === 'currency' && tracker.settings.fuelPricePerLiter > 0 && inputValue && (
                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ≈ {(Number(inputValue) / tracker.settings.fuelPricePerLiter).toFixed(2)} L
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            <input type="checkbox" id="fullTank" checked={isFullTank} onChange={e => setIsFullTank(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }} />
            <label htmlFor="fullTank" style={{ color: 'var(--text-primary)', fontWeight: '500' }}>I filled it to Full Tank</label>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="glass-button" style={{ flex: 1, background: 'transparent' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-button" style={{ flex: 2, background: 'var(--accent-color)', color: '#000', borderColor: 'var(--accent-color)' }}>Save Log</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ tracker, onClose }: { tracker: any, onClose: () => void }) {
  const [avg, setAvg] = useState((tracker.settings.avgConsumption || 30).toString());
  const [cap, setCap] = useState((tracker.settings.tankCapacity || 7.5).toString());
  const [price, setPrice] = useState((tracker.settings.fuelPricePerLiter || 14.0).toString());
  const [auto, setAuto] = useState(!!tracker.settings.autoTrack);
  const [alerts, setAlerts] = useState(!!tracker.settings.enableAlerts);

  const handleSave = () => {
    tracker.setSettings({ 
      ...tracker.settings, 
      avgConsumption: Number(avg), 
      tankCapacity: Number(cap),
      fuelPricePerLiter: Number(price),
      autoTrack: auto,
      enableAlerts: alerts
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: '100%', padding: '32px 24px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '24px' }}>Settings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Consumption (km/L)</label>
              <input type="number" step="0.1" className="glass-input" value={avg} onChange={e => setAvg(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Capacity (L)</label>
              <input type="number" step="0.1" className="glass-input" value={cap} onChange={e => setCap(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Fuel Price (EGP / Liter)</label>
            <input type="number" step="0.1" className="glass-input" value={price} onChange={e => setPrice(e.target.value)} />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Current price for Octane 92</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            <input type="checkbox" id="autoTrack" checked={auto} onChange={e => setAuto(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }} />
            <div style={{ flex: 1 }}>
              <label htmlFor="autoTrack" style={{ color: 'var(--text-primary)', fontWeight: '500', display: 'block' }}>Auto-Start Tracking</label>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>GPS starts on app load</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            <input type="checkbox" id="enableAlerts" checked={alerts} onChange={e => setAlerts(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }} />
            <div style={{ flex: 1 }}>
              <label htmlFor="enableAlerts" style={{ color: 'var(--text-primary)', fontWeight: '500', display: 'block' }}>Sound & Vibrate Alert</label>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Warn when fuel is low</span>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid var(--glass-border)', margin: '12px 0', paddingTop: '24px' }}>
            <button className="glass-button" style={{ width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={() => { tracker.resetData(); onClose(); }}>
              <RotateCcw size={18} /> Reset All App Data
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="glass-button" style={{ flex: 1, background: 'transparent' }} onClick={onClose}>Cancel</button>
            <button type="button" className="glass-button" style={{ flex: 2, background: 'var(--text-primary)', color: '#000' }} onClick={handleSave}>Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

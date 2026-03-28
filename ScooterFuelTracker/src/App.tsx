import React, { useState, useEffect, useRef } from 'react';
import { useFuelTracker } from './hooks/useFuelTracker';
import { Fuel, MapPin, AlertTriangle, Settings, Droplets, RotateCcw, Bell, BellOff, User, Camera } from 'lucide-react';
import gsap from 'gsap';
import './index.css';

function App() {
  const tracker = useFuelTracker();
  const [showRefuel, setShowRefuel] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const appRef = useRef<HTMLDivElement>(null);

  // Initial Entrance Animation & Update Check
  useEffect(() => {
    if (appRef.current) {
      gsap.fromTo(
        appRef.current.children,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: "power4.out" }
      );
    }

    // --- Update Check Logic ---
    const checkForUpdate = async () => {
      try {
        const CURRENT_VERSION = '1.1.0';
        // ملاحظة: استبدل هذا الرابط برابط GitHub بتاعك لما ترفعه (مثلاً: https://raw.githubusercontent.com/.../version.json)
        const UPDATE_URL = 'https://raw.githubusercontent.com/hmaki1993/scoter-rider/main/public/version.json'; 
        
        const response = await fetch(UPDATE_URL, { cache: 'no-store' });
        const data = await response.json();

        if (data.version && data.version !== CURRENT_VERSION) {
          const message = `يوجد تحديث جديد (الإصدار ${data.version})\n\n${data.notes || ''}\n\nهل تريد التحميل الآن؟`;
          if (window.confirm(message)) {
            window.open(data.url, '_system');
          }
        }
      } catch (error) {
        console.error('Update check failed:', error);
      }
    };

    // تشغيل الفحص بعد ثانية من فتح التطبيق
    const timer = setTimeout(checkForUpdate, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-container" ref={appRef} style={{ padding: '24px', width: '100%', maxWidth: '480px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="logo-text" style={{ margin: 0, fontSize: '30px', letterSpacing: '-1.2px' }}>Fuel Tracker</h1>
          <div className="subtitle-text" style={{ fontSize: '13px', marginTop: '2px', letterSpacing: '0.5px' }}>Premium Intelligence System</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="glass-button" 
            style={{ 
              padding: '12px', 
              borderRadius: '50%',
              background: tracker.settings.enableAlerts ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              borderColor: tracker.settings.enableAlerts ? 'rgba(0, 240, 255, 0.3)' : 'var(--glass-border)',
              transition: 'all 0.3s ease'
            }} 
            onClick={() => tracker.setSettings({ ...tracker.settings, enableAlerts: !tracker.settings.enableAlerts })}
          >
            {tracker.settings.enableAlerts ? (
              <Bell size={20} color="var(--accent-color)" />
            ) : (
              <BellOff size={20} color="var(--text-secondary)" />
            )}
          </button>
          <button className="glass-button" style={{ padding: '12px', borderRadius: '50%' }} onClick={() => setShowSettings(true)}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Centered Content Block */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
        {/* Main Status Dashboard */}
        <div className="glass-panel" style={{ padding: '20px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '180px', height: '180px', borderRadius: '50%',
            background: tracker.isDanger ? 'var(--danger-color)' : tracker.isWarning ? 'var(--warning-color)' : 'var(--accent-color)',
            filter: 'blur(50px)', opacity: 0.1, zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px', opacity: 0.7 }}>
              Estimated Range
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '3px', marginBottom: '10px' }}>
              <span style={{ fontSize: '54px', fontWeight: '800', lineHeight: '1', color: tracker.isDanger ? 'var(--danger-color)' : 'var(--text-primary)', textShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
                {Math.max(0, tracker.rangeRemainingKm).toFixed(1)}
              </span>
              <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>km</span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '2.5px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ 
                height: '100%', 
                width: `${tracker.fuelPercentage}%`, 
                background: tracker.isDanger ? 'var(--danger-color)' : tracker.isWarning ? 'var(--warning-color)' : 'var(--accent-color)',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 6px currentColor'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                <Droplets size={12} />
                <span>{tracker.fuelState.estimatedFuelLiters.toFixed(1)} L left</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                Empty at: <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{(tracker.fuelState.lastOdo + tracker.rangeRemainingKm).toFixed(1)}</span> km
              </div>
            </div>
          </div>
        </div>

        {/* Warning Card */}
        {tracker.isWarning && (
          <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '1px solid rgba(255, 51, 102, 0.3)', background: 'rgba(255, 51, 102, 0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', animation: 'pulse 2s infinite', position: 'relative' }}>
            <AlertTriangle color="var(--danger-color)" size={24} style={{ position: 'absolute', left: '20px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', color: 'var(--danger-color)', fontSize: '15px', letterSpacing: '0.3px', marginBottom: '2px' }}>Refuel Needed Soon!</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.9 }}>You might run out of fuel shortly.</div>
            </div>
          </div>
        )}
      </div>

      {/* Action Center - Fixed at bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: 'auto', marginBottom: '8px' }}>
        <button 
          className="glass-button" 
          style={{ width: '100%', gap: '12px', padding: '16px', borderRadius: '16px' }} 
          onClick={() => setShowSync(true)}
        >
          <MapPin size={18} />
          <span style={{ fontSize: '14px', fontWeight: '600' }}>Sync Manual Odometer</span>
        </button>

        <button 
          className="glass-button" 
          style={{ 
            width: '100%', 
            gap: '12px', 
            padding: '18px', 
            borderRadius: '16px',
            background: 'rgba(0, 240, 255, 0.08)', 
            borderColor: 'rgba(0, 240, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }} 
          onClick={() => setShowRefuel(true)}
        >
          <Fuel size={20} color="var(--accent-color)" />
          <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent-color)' }}>Log Refuel Now</span>
        </button>
      </div>

      {/* MODALS */}
      {!tracker.userProfile && (
        <OnboardingModal 
          onComplete={(profile) => tracker.updateUserProfile(profile)} 
        />
      )}
      
      {showRefuel && <RefuelModal tracker={tracker} onClose={() => setShowRefuel(false)} />}
      {showSync && <SyncOdoModal tracker={tracker} onClose={() => setShowSync(false)} />}
      {showSettings && <SettingsModal tracker={tracker} onClose={() => setShowSettings(false)} />}
      
    </div>
  );
}

// Onboarding Modal Component
const OnboardingModal = ({ onComplete }: { onComplete: (profile: any) => void }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim() && vehicleType.trim()) {
      onComplete({
        name,
        phone,
        vehicleType,
        registeredAt: new Date().toISOString()
      });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', border: '1px solid rgba(255, 51, 102, 0.4)', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}>
          <User size={40} color="var(--danger-color)" />
          <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--danger-color)', padding: '6px', borderRadius: '50%' }}>
            <Camera size={14} color="white" />
          </div>
        </div>

        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)' }}>Welcome Rider!</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Let's set up your profile to start tracking your scooter or motorcycle.</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Rider Name</label>
            <input 
              required
              type="text" 
              placeholder="" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Phone Number</label>
            <input 
              required
              type="tel" 
              placeholder="" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Scooter / Motorcycle Type</label>
            <input 
              required
              type="text" 
              placeholder="" 
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px' }}
            />
          </div>

          <button 
            type="submit"
            className="glass-button" 
            style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--danger-color)', borderColor: 'transparent', color: 'white', fontWeight: '700', marginTop: '8px' }}
          >
            Start My Journey
          </button>
        </form>
      </div>
    </div>
  );
};

// Inline Modal Components for simplicity in this PWA
const SyncOdoModal = ({ tracker, onClose }: { tracker: any, onClose: () => void }) => {
  const [odo, setOdo] = useState('0.0');

  const handleSync = () => {
    const val = Number(odo);
    if (!isNaN(val) && val > 0) {
      tracker.updateCurrentOdo(val);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.3s ease', backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.6)' }}>
      <div 
        className="modal-content glass-panel" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)', 
          background: 'rgba(255, 255, 255, 0.05)', 
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '24px',
          width: '90%',
          maxWidth: '400px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--danger-color)" />
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>Sync Odometer 🛵</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255, 0, 0, 0.15)', border: '1px solid rgba(255, 0, 0, 0.3)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>✕</button>
        </div>

        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', display: 'block', opacity: 0.8 }}>Enter current scooter odometer reading (km)</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="number" 
              step="0.1"
              value={odo} 
              onChange={e => setOdo(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '16px', 
                fontSize: '24px', 
                fontWeight: '700', 
                border: '1px solid rgba(255, 255, 255, 0.15)', 
                background: 'transparent', 
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                textAlign: 'center',
                color: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                outline: 'none',
              }}
              autoFocus
            />
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '12px', lineHeight: '1.4', textAlign: 'center' }}>
            Adjust the value to match your scooter's screen <br/>
            <span style={{ color: 'var(--danger-color)', opacity: 0.5 }}>Fuel range will be updated automatically</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            className="glass-button" 
            style={{ 
              width: 'auto', 
              minWidth: '220px',
              padding: '14px 32px', 
              fontWeight: '700', 
              gap: '12px', 
              background: 'rgba(255, 0, 0, 0.05)', 
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: '#fff',
              fontSize: '15px',
              border: '1px solid rgba(255, 0, 0, 0.4)',
              boxShadow: '0 8px 32px rgba(255, 0, 0, 0.1)',
              borderRadius: '16px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }} 
            onClick={handleSync}
          >
            <RotateCcw size={18} />
            Save Sync ✨
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '32px 24px', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
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
  const [alerts, setAlerts] = useState(!!tracker.settings.enableAlerts);

  const handleSave = () => {
    tracker.setSettings({ 
      ...tracker.settings, 
      avgConsumption: Number(avg), 
      tankCapacity: Number(cap),
      fuelPricePerLiter: Number(price),
      enableAlerts: alerts
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '32px 24px', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
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
          
          {/* Auto-start removed as it is now always on by default */}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            <input type="checkbox" id="enableAlerts" checked={alerts} onChange={e => setAlerts(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-color)' }} />
            <div style={{ flex: 1 }}>
              <label htmlFor="enableAlerts" style={{ color: 'var(--text-primary)', fontWeight: '500', display: 'block' }}>Sound & Vibrate Alert</label>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Warn when fuel is low</span>
            </div>
            <button 
              type="button" 
              className="glass-button" 
              style={{ padding: '8px 12px', fontSize: '12px', background: 'rgba(255,255,255,0.05)' }}
              onClick={() => tracker.playWarningSound(true)}
            >
              Test Alarm
            </button>
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

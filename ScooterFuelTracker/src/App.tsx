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
  const [updateInfo, setUpdateInfo] = useState<{ version: string, url: string, notes: string } | null>(null);

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

    // --- Request Notification Permission ---
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // --- Update Check Logic ---
    const checkForUpdate = async () => {
      try {
        const CURRENT_VERSION = '1.2.2';
        const UPDATE_URL = `https://scoter-rider.vercel.app/version.json?t=${new Date().getTime()}`;

        const response = await fetch(UPDATE_URL, { cache: 'no-store' });
        const data = await response.json();

        if (data.version && data.version !== CURRENT_VERSION) {
          setUpdateInfo({
            version: data.version,
            url: data.url,
            notes: data.notes || ''
          });
        }
      } catch (error) {
        console.error('Update check failed:', error);
      }
    };

    const timer = setTimeout(checkForUpdate, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-container" ref={appRef} style={{ padding: '24px', width: '100%', maxWidth: '480px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header - App Name small top-left */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h1 className="logo-text" style={{ margin: 0, fontSize: '16px', letterSpacing: '-0.5px', opacity: 0.7 }}>Fuel Tracker</h1>
          <div className="subtitle-text" style={{ fontSize: '9px', marginTop: '1px', letterSpacing: '0.5px', opacity: 0.5 }}>Premium Intelligence System</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="glass-button"
            style={{
              padding: '12px', borderRadius: '50%',
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

      {/* Welcome Card */}
      {tracker.userProfile && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '14px',
          marginBottom: '22px', padding: '12px 20px 12px 14px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,51,102,0.15)',
          borderRadius: '50px',
          backdropFilter: 'blur(10px)',
          width: 'fit-content'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            overflow: 'hidden', border: '2px solid var(--danger-color)',
            boxShadow: '0 0 16px rgba(255,51,102,0.35)',
            flexShrink: 0, background: 'rgba(255,51,102,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {tracker.userProfile.photoUrl ? (
              <img
                src={tracker.userProfile.photoUrl}
                alt="Rider"
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  objectPosition: tracker.userProfile.photoPosition
                    ? `${tracker.userProfile.photoPosition.x}% ${tracker.userProfile.photoPosition.y}%`
                    : '50% 50%',
                  transform: tracker.userProfile.photoPosition
                    ? `scale(${(tracker.userProfile.photoPosition.scale || 100) / 100})`
                    : 'scale(1)',
                  transformOrigin: 'center'
                }}
              />
            ) : (
              <User size={26} color="var(--danger-color)" />
            )}
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', opacity: 0.8 }}>Welcome back 👋</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{tracker.userProfile.name}</div>
          </div>
        </div>
      )}

      {/* Centered Content Block */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '20px' }}>
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
      {updateInfo && <UpdateModal info={updateInfo} onClose={() => setUpdateInfo(null)} />}

    </div>
  );
}

// Onboarding Modal Component
const OnboardingModal = ({ onComplete }: { onComplete: (profile: any) => void }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  // percentage-based focal point (50,50 = center)
  const [objPos, setObjPos] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    if (!photo) fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        setObjPos({ x: 50, y: 50 });
        setZoom(100);
      };
      reader.readAsDataURL(file);
    }
  };

  const getClient = (e: React.MouseEvent | React.TouchEvent) => ({
    x: 'touches' in e ? e.touches[0].clientX : e.clientX,
    y: 'touches' in e ? e.touches[0].clientY : e.clientY,
  });

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!photo) return;
    e.preventDefault();
    const { x, y } = getClient(e);
    dragRef.current = { startX: x, startY: y, startPx: objPos.x, startPy: objPos.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !dragRef.current) return;
    const { x, y } = getClient(e);
    const sensitivity = 0.3;
    const dx = (x - dragRef.current.startX) * -sensitivity;
    const dy = (y - dragRef.current.startY) * -sensitivity;
    setObjPos({
      x: Math.max(0, Math.min(100, dragRef.current.startPx + dx)),
      y: Math.max(0, Math.min(100, dragRef.current.startPy + dy)),
    });
  };

  const handleMouseUp = () => { setIsDragging(false); dragRef.current = null; };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim() && vehicleType.trim()) {
      onComplete({ name, phone, vehicleType, photoUrl: photo, photoPosition: { x: objPos.x, y: objPos.y, scale: zoom }, registeredAt: new Date().toISOString() });
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
    >
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', border: '1px solid rgba(255, 51, 102, 0.4)', textAlign: 'center' }}>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Avatar */}
        <div
          onClick={handlePhotoClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          style={{
            width: '110px', height: '110px', borderRadius: '50%',
            background: 'rgba(255, 51, 102, 0.05)', border: '2px solid var(--danger-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px', position: 'relative',
            cursor: photo ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
            overflow: 'hidden',
            boxShadow: '0 0 24px rgba(255, 51, 102, 0.25)',
            userSelect: 'none'
          }}
        >
          {photo ? (
            <img
              src={photo} alt="Profile" draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${objPos.x}% ${objPos.y}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'object-position 0.05s',
                pointerEvents: 'none',
                display: 'block'
              }}
            />
          ) : (
            <>
              <div style={{ opacity: 0.5 }}><User size={48} color="var(--danger-color)" /></div>
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', color: 'rgba(255,255,255,0.6)' }}>
                <Camera size={16} />
              </div>
            </>
          )}
        </div>

        {/* Zoom + hint (only when photo selected) */}
        {photo && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Zoom</span>
              <input type="range" min="80" max="250" step="5" value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--danger-color)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>
              Drag photo to reposition •{' '}
              <span onClick={() => fileInputRef.current?.click()} style={{ color: 'var(--danger-color)', textDecoration: 'underline', cursor: 'pointer' }}>Change</span>
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>Welcome Rider!</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Set up your profile before you hit the road.</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Rider Name</label>
            <input required type="text" placeholder="" value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Phone Number</label>
            <input required type="tel" placeholder="" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Scooter / Motorcycle Type</label>
            <input required type="text" placeholder="" value={vehicleType} onChange={e => setVehicleType(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', color: 'white', fontSize: '15px' }} />
          </div>
          <button type="submit" className="glass-button"
            disabled={!name.trim() || !phone.trim() || !vehicleType.trim()}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 'rgba(255,51,102,0.3)' : 'var(--danger-color)',
              borderColor: 'transparent', color: 'white', fontWeight: '700', marginTop: '8px',
              opacity: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 0.5 : 1,
              cursor: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}>
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
            Adjust the value to match your scooter's screen <br />
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
  const [isFullTank, setIsFullTank] = useState(false);
  const [inputMode, setInputMode] = useState<'liters' | 'currency'>('currency');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Use last known odo if field is empty
    const odometerVal = odo ? Number(odo) : tracker.fuelState.lastOdo;
    if (!odometerVal && odometerVal !== 0) return alert('Please enter the odometer reading.');

    const price = tracker.settings.fuelPricePerLiter || 14.0;
    const tankCap = tracker.settings.tankCapacity || 7.5;

    let liters: number;
    if (inputValue) {
      // User entered a value
      liters = inputMode === 'currency'
        ? Number(inputValue) / price
        : Number(inputValue);
    } else if (isFullTank) {
      // Full tank checked but no amount → use full tank capacity
      liters = tankCap;
    } else {
      return alert('Please enter the fuel amount or check Full Tank.');
    }

    tracker.addRefuel(odometerVal, liters, undefined, isFullTank);
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
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', opacity: 0.7 }}>Enter the price for your preferred fuel (e.g., 92 or 95)</div>
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

function UpdateModal({ info, onClose }: { info: any, onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center', border: '1px solid rgba(255, 51, 102, 0.4)', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid var(--danger-color)', boxShadow: '0 0 20px rgba(255, 51, 102, 0.3)' }}>
          <Settings size={34} color="var(--danger-color)" style={{ animation: 'spin 4s linear infinite' }} />
        </div>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff', fontWeight: '800' }}>تحديث جديد متاح! 🚀</h2>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: '600' }}>
          الإصدار {info.version} متوفر الآن
        </div>
        {info.notes && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', fontSize: '13px', color: '#ddd', marginBottom: '24px', lineHeight: '1.7', textAlign: 'right', direction: 'rtl' }}>
            {info.notes}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={onClose}>تأجيل</button>
          <a href={info.url} target="_blank" rel="noopener noreferrer" className="glass-button" style={{ flex: 2, background: 'var(--danger-color)', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', border: 'none', boxShadow: '0 4px 15px rgba(255, 51, 102, 0.4)' }}>
            تحديث الآن
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;

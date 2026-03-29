import React, { useState, useEffect, useRef } from 'react';
import { useFuelTracker } from './hooks/useFuelTracker';
import { Fuel, MapPin, AlertTriangle, Settings, Droplets, RotateCcw, Bell, BellOff, User, Camera, Check } from 'lucide-react';
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

    // --- Update Check Logic ---
    const checkForUpdate = async () => {
      try {
        const CURRENT_VERSION = '1.3.4';
        const UPDATE_URL = `https://scoter-rider.vercel.app/version.json?t=${new Date().getTime()}`;

        const response = await fetch(UPDATE_URL, { cache: 'no-store' });
        const data = await response.json();

        if (data.version && data.version.trim() !== CURRENT_VERSION.trim()) {
          setUpdateInfo({
            version: data.version.trim(),
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
          <h1 className="logo-text" style={{ margin: 0, fontSize: '24px', letterSpacing: '-1px', opacity: 0.9 }}>Fuel Tracker</h1>
          <div className="subtitle-text" style={{ fontSize: '11px', marginTop: '2px', letterSpacing: '0.5px', opacity: 0.7 }}>Premium Intelligence System</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Tracking Status Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '5px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
            background: tracker.isTracking ? 'rgba(0, 240, 100, 0.1)' : 'rgba(255,255,255,0.04)',
            border: tracker.isTracking ? '1px solid rgba(0, 240, 100, 0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: tracker.isTracking ? '#00f064' : 'rgba(255,255,255,0.3)',
            letterSpacing: '0.5px'
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: tracker.isTracking ? '#00f064' : 'rgba(255,255,255,0.2)',
              boxShadow: tracker.isTracking ? '0 0 6px #00f064' : 'none',
              animation: tracker.isTracking ? 'pulse 1.5s infinite' : 'none'
            }} />
            {tracker.isTracking ? 'LIVE' : 'PAUSED'}
          </div>
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
          marginBottom: '22px', padding: '4px 0',
          background: 'none',
          border: 'none',
          width: 'fit-content'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '11px',
            overflow: 'hidden', border: '1.5px solid var(--accent-color)',
            boxShadow: '0 0 8px rgba(0, 240, 255, 0.2)',
            flexShrink: 0, background: 'rgba(0, 240, 255, 0.05)',
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '16px' }}>
        {/* Main Status Dashboard Cluster (Integrated Speed & Range) - Compact Fit */}
        <div className="glass-panel" style={{ padding: '32px 20px 24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '220px', height: '220px', borderRadius: '50%',
            background: tracker.isDanger ? 'var(--danger-color)' : tracker.isWarning ? 'var(--warning-color)' : 'var(--accent-color)',
            filter: 'blur(60px)', opacity: 0.1, zIndex: 0
          }} />

          {/* Integrated Pro Dashboard - Compact Hybrid */}
          {tracker.isTracking && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', marginTop: '0', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ position: 'relative', width: '180px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                <svg width="180" height="110" viewBox="0 0 180 110" style={{ transform: 'translateY(12px)' }}>
                   {/* Background Arc */}
                   <path d="M 30,95 A 60,60 0 0,1 150,95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
                   {/* Speed Arc */}
                   <path 
                     d="M 30,95 A 60,60 0 0,1 150,95" 
                     fill="none" 
                     stroke={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-color)'} 
                     strokeWidth="6" 
                     strokeLinecap="round" 
                     strokeDasharray="188.5"
                     strokeDashoffset={188.5 - (Math.min(tracker.currentSpeed, 120) / 120) * 188.5}
                     style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s' }}
                   />
                   {/* Ticks & Numbers */}
                   {[0, 20, 40, 60, 80, 100, 120].map((v) => {
                     const angle = (v / 120) * 180 - 180;
                     const rad = (angle * Math.PI) / 180;
                     const x1 = 90 + 55 * Math.cos(rad); const y1 = 95 + 55 * Math.sin(rad);
                     const x2 = 90 + 64 * Math.cos(rad); const y2 = 95 + 64 * Math.sin(rad);
                     const tx = 90 + 78 * Math.cos(rad); const ty = 95 + 78 * Math.sin(rad);
                     return (
                       <g key={v}>
                         <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                         <text x={tx} y={ty} fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="700" textAnchor="middle" alignmentBaseline="middle">{v}</text>
                       </g>
                     );
                   })}
                   {/* Needle - Dynamic Theme */}
                   <g style={{ 
                     transformOrigin: '90px 95px', 
                     transform: `rotate(${(Math.min(tracker.currentSpeed, 120) / 120) * 180}deg)`,
                     transition: 'transform 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                   }}>
                     <line 
                        x1="90" y1="95" x2="35" y2="95" 
                        stroke={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-color)'} 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        style={{ filter: 'drop-shadow(0 0 2px currentColor)', transition: 'stroke 0.5s' }}
                     />
                     <circle 
                        cx="90" cy="95" r="3" 
                        fill={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-color)'} 
                        style={{ transition: 'fill 0.5s' }}
                     />
                   </g>
                </svg>
                {/* Center Digital Speed - Compact */}
                <div style={{ position: 'absolute', bottom: '15px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: '#fff', textShadow: '0 0 10px rgba(0, 240, 255, 0.3)', lineHeight: '1' }}>
                    {tracker.currentSpeed || 0}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>KM/H</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 1, marginTop: '16px' }}>
            {/* Warning Pill - Slimmer */}
            {tracker.isWarning && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', 
                padding: '4px 10px', borderRadius: '10px', background: 'rgba(255, 51, 102, 0.12)',
                border: '1px solid rgba(255, 51, 102, 0.25)', marginBottom: '16px',
                animation: 'pulse 1.5s infinite'
              }}>
                <AlertTriangle size={12} color="var(--danger-color)" />
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--danger-color)' }}>LOW FUEL</span>
              </div>
            )}
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.5 }}>
              Estimated Range
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '3px', marginBottom: '16px' }}>
              <span style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1', color: tracker.isDanger ? 'var(--danger-color)' : 'var(--text-primary)', textShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                {Math.max(0, tracker.rangeRemainingKm).toFixed(1)}
              </span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>km</span>
            </div>

            {/* Progress Bar - Compact */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                height: '100%',
                width: `${tracker.fuelPercentage}%`,
                background: tracker.isDanger ? 'var(--danger-color)' : tracker.isWarning ? 'var(--warning-color)' : 'var(--accent-color)',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 6px currentColor'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                <Droplets size={14} />
                <span>{tracker.fuelState.estimatedFuelLiters.toFixed(1)} L left</span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>
                Empty at: <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{(tracker.fuelState.lastOdo + tracker.rangeRemainingKm).toFixed(1)}</span> km
              </div>
            </div>
          </div>
        </div>


        {/* Start Tracking Prompt (Centered small) */}
        {!tracker.isTracking && (
          <div 
            className="glass-panel" 
            style={{ 
              padding: '12px 20px', 
              width: 'fit-content',
              margin: '0 auto',
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid rgba(0, 240, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'center',
              textAlign: 'center',
              borderRadius: '16px'
            }}
          >
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7, marginBottom: '2px' }}>
              GPS tracking required for speedometer.
            </div>
            <button 
              className="glass-button" 
              style={{ 
                background: 'rgba(0, 240, 255, 0.05)', 
                border: '1px solid var(--accent-color)',
                color: 'var(--accent-color)',
                fontWeight: '700',
                padding: '6px 16px',
                fontSize: '11px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}
              onClick={() => tracker.startTracking(false)}
            >
              Start Tracking Now
            </button>
          </div>
        )}
      </div>

      {/* Action Center - Centered & Compact */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: 'auto', marginBottom: '8px' }}>
        <button
          className="glass-button"
          style={{ width: 'fit-content', gap: '8px', padding: '8px 16px', borderRadius: '20px' }}
          onClick={() => setShowSync(true)}
        >
          <MapPin size={14} />
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Sync Manual Odometer</span>
        </button>

        <button
          className="glass-button"
          style={{
            width: 'fit-content',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '20px',
            background: 'rgba(0, 240, 255, 0.08)',
            borderColor: 'rgba(0, 240, 255, 0.4)'
          }}
          onClick={() => setShowRefuel(true)}
        >
          <Fuel size={16} color="var(--accent-color)" />
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-color)' }}>Log Refuel Now</span>
        </button>
      </div>

      {/* MODALS */}
      {!tracker.userProfile && (
        <OnboardingModal
          onComplete={(profile) => {
            tracker.updateUserProfile(profile);
            setTimeout(() => tracker.requestAllPermissions(), 800);
          }}
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center' }}>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

        {/* Avatar */}
        <div
          onClick={handlePhotoClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          style={{
            width: '64px', height: '64px', borderRadius: '14px',
            background: 'transparent', border: '2px solid var(--accent-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px', position: 'relative',
            cursor: photo ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
            overflow: 'hidden',
            boxShadow: '0 0 16px rgba(0, 240, 255, 0.25)',
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
              <div style={{ opacity: 0.5 }}><User size={30} color="var(--accent-color)" /></div>
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', color: 'rgba(255,255,255,0.6)' }}>
                <Camera size={14} />
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
                style={{ flex: 1, accentColor: 'var(--accent-color)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>
              Drag photo to reposition •{' '}
              <span onClick={() => fileInputRef.current?.click()} style={{ color: 'var(--accent-color)', textDecoration: 'underline', cursor: 'pointer' }}>Change</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '4px', height: '22px', background: 'var(--accent-color)', borderRadius: '4px', boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)' }} />
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontFamily: "'Inter', sans-serif",
            fontWeight: '700', 
            letterSpacing: '1px', 
            background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Welcome Rider!</h2>
        </div>
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
              alignSelf: 'center', padding: '14px 48px', borderRadius: '14px',
              background: 'transparent',
              border: '1px solid var(--accent-color)', color: 'white', fontWeight: '700', marginTop: '12px',
              opacity: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 0.5 : 1,
              cursor: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}>
            Start Ride
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '18px', background: 'var(--accent-color)', borderRadius: '4px', boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)' }} />
            <h2 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontFamily: "'Inter', sans-serif",
              fontWeight: '700', 
              letterSpacing: '1px', 
              background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase'
            }}>Refuel</h2>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
            <button type="button" onClick={() => setInputMode('currency')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: inputMode === 'currency' ? 'rgba(0, 240, 255, 0.05)' : 'transparent', color: inputMode === 'currency' ? 'var(--accent-color)' : 'var(--text-secondary)', boxShadow: inputMode === 'currency' ? 'inset 0 0 0 1px var(--accent-color)' : 'none', transition: 'all 0.2s ease', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>EGP</button>
            <button type="button" onClick={() => setInputMode('liters')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: inputMode === 'liters' ? 'rgba(0, 240, 255, 0.05)' : 'transparent', color: inputMode === 'liters' ? 'var(--accent-color)' : 'var(--text-secondary)', boxShadow: inputMode === 'liters' ? 'inset 0 0 0 1px var(--accent-color)' : 'none', transition: 'all 0.2s ease', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}>Liters</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 4px' }}>
            <span style={{ width: '140px', flexShrink: 0, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Odometer (km)</span>
            <input type="number" step="0.1" value={odo} onChange={e => setOdo(e.target.value)} style={{ flex: 1, maxWidth: '180px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontWeight: '800', textAlign: 'left', outline: 'none', transition: 'all 0.3s' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 4px' }}>
            <span style={{ width: '140px', flexShrink: 0, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
              {inputMode === 'currency' ? 'Amount (EGP)' : 'Amount (L)'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, position: 'relative' }}>
              <input type="number" step="0.1" value={inputValue} onChange={e => setInputValue(e.target.value)} style={{ width: '100%', maxWidth: '180px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '15px', fontWeight: '800', textAlign: 'left', outline: 'none', transition: 'all 0.3s' }} autoFocus />
              {inputMode === 'currency' && tracker.settings.fuelPricePerLiter > 0 && inputValue && (
                <span style={{ position: 'absolute', left: '190px', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--accent-color)', fontWeight: '800', opacity: 0.9 }}>
                  ≈ {(Number(inputValue) / tracker.settings.fuelPricePerLiter).toFixed(2)} L
                </span>
              )}
            </div>
          </div>
          
          <div 
            onClick={() => setIsFullTank(!isFullTank)}
            style={{ 
              display: 'flex', alignItems: 'center', padding: '8px 4px', cursor: 'pointer'
            }}
          >
            <span style={{ width: '140px', flexShrink: 0, fontSize: '11px', color: isFullTank ? 'var(--accent-color)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', transition: 'color 0.2s' }}>
              Full Tank Fill-up
            </span>
            <div style={{
              width: '24px', height: '24px', borderRadius: '8px',
              border: isFullTank ? 'none' : '1px solid rgba(255,255,255,0.2)',
              background: isFullTank ? 'var(--accent-color)' : 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              {isFullTank && <Check size={16} color="#000" strokeWidth={4} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button 
              type="button" 
              className="glass-button" 
              style={{ 
                background: 'transparent', 
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: '600',
                padding: '10px 20px',
                fontSize: '13px',
                borderRadius: '10px',
                transition: 'all 0.2s ease',
                minWidth: 'fit-content'
              }} 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="glass-button" 
              style={{ 
                background: 'transparent', 
                color: 'var(--accent-color)', 
                border: '1px solid var(--accent-color)',
                fontWeight: '700',
                padding: '10px 24px',
                fontSize: '13px',
                borderRadius: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'all 0.2s ease',
                minWidth: 'fit-content'
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ tracker, onClose }: { tracker: any, onClose: () => void }) {
  // Profile State
  const [name, setName] = useState(tracker.userProfile?.name || '');
  const [phone, setPhone] = useState(tracker.userProfile?.phone || '');
  const [vehicle, setVehicle] = useState(tracker.userProfile?.vehicleType || '');
  const [photo, setPhoto] = useState(tracker.userProfile?.photoUrl || null);
  const [objPos, setObjPos] = useState(tracker.userProfile?.photoPosition || { x: 50, y: 50, scale: 100 });
  const [isSimulation, setIsSimulation] = useState((window as any).__isSimulating || false);

  // Technical State
  const [avg, setAvg] = useState((tracker.settings.avgConsumption || 30).toString());
  const [cap, setCap] = useState((tracker.settings.tankCapacity || 7.5).toString());
  const [price, setPrice] = useState((tracker.settings.fuelPricePerLiter || 14.0).toString());
  const [alerts, setAlerts] = useState(!!tracker.settings.enableAlerts);

  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    // Save Profile
    tracker.updateUserProfile({
      ...tracker.userProfile,
      name,
      phone,
      vehicleType: vehicle,
      photoUrl: photo,
      photoPosition: objPos
    });

    // Save Technical Settings
    tracker.setSettings({
      ...tracker.settings,
      avgConsumption: Number(avg),
      tankCapacity: Number(cap),
      fuelPricePerLiter: Number(price),
      enableAlerts: alerts
    });

    // Handle Simulation Toggle
    if (isSimulation && !(window as any).__isSimulating) {
      startSimulator();
    } else if (!isSimulation && (window as any).__isSimulating) {
      stopSimulator();
    }

    onClose();
  };

  const startSimulator = () => {
    (window as any).__isSimulating = true;
    let speed = 0;
    (window as any).__simInterval = setInterval(() => {
      speed = speed >= 120 ? 0 : speed + 5;
      tracker.setCurrentSpeed(speed);
    }, 500);
  };

  const stopSimulator = () => {
    (window as any).__isSimulating = false;
    clearInterval((window as any).__simInterval);
    tracker.setCurrentSpeed(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', padding: '28px 24px', animation: 'scaleUp 0.3s ease-out' }}>
        
        {/* Profile Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 12px',
              border: '2px solid var(--accent-color)', overflow: 'hidden', cursor: 'pointer',
              position: 'relative', boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
            }}
          >
            {photo ? (
              <img src={photo} aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${objPos.x}% ${objPos.y}%`, transform: `scale(${objPos.scale / 100})` }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                <Camera size={24} color="var(--accent-color)" />
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.5)', fontSize: '8px', padding: '2px 0', color: '#fff' }}>EDIT</div>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
          
          {photo && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Zoom:</span>
                <input 
                  type="range" min="100" max="300" 
                  value={objPos.scale} 
                  onChange={e => setObjPos((p: any) => ({ ...p, scale: Number(e.target.value) }))}
                  style={{ width: '80px', accentColor: 'var(--accent-color)' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Pos:</span>
                <input 
                  type="range" min="0" max="100" 
                  value={objPos.x} 
                  onChange={e => setObjPos(p => ({ ...p, x: Number(e.target.value) }))}
                  style={{ width: '40px', accentColor: 'var(--accent-color)' }}
                />
                <input 
                  type="range" min="0" max="100" 
                  value={objPos.y} 
                  onChange={e => setObjPos(p => ({ ...p, y: Number(e.target.value) }))}
                  style={{ width: '40px', accentColor: 'var(--accent-color)' }}
                />
              </div>
            </div>
          )}

          <input 
            value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', fontWeight: '800', outline: 'none' }}
            placeholder="Your Name"
          />
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
             <input 
              value={phone} onChange={e => setPhone(e.target.value)}
              style={{ width: '100px', textAlign: 'right', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', outline: 'none' }}
              placeholder="01xxxxxxxxx"
            />
            <span style={{ color: 'var(--text-secondary)', opacity: 0.3 }}>|</span>
            <input 
              value={vehicle} onChange={e => setVehicle(e.target.value)}
              style={{ width: '100px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--accent-color)', fontSize: '12px', fontWeight: '600', outline: 'none' }}
              placeholder="Vehicle Type"
            />
          </div>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: '24px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tech Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div style={{ padding: '4px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Consumpt. (km/L)</label>
              <input type="number" className="glass-input" value={avg} onChange={e => setAvg(e.target.value)} style={{ fontSize: '15px' }} />
            </div>
            <div style={{ padding: '4px' }}>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tank (Liters)</label>
              <input type="number" className="glass-input" value={cap} onChange={e => setCap(e.target.value)} style={{ fontSize: '15px' }} />
            </div>
          </div>

          <div style={{ padding: '4px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Fuel Price (EGP / L)</label>
            <input type="number" className="glass-input" value={price} onChange={e => setPrice(e.target.value)} style={{ fontSize: '15px' }} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div 
              onClick={() => setAlerts(!alerts)}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '14px 16px', borderRadius: '16px', 
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <div>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600', display: 'block' }}>Alerts & Sound</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Vibrate on low fuel</span>
              </div>
              <div style={{
                width: '42px', height: '22px', borderRadius: '12px',
                background: alerts ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                border: alerts ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)',
                position: 'relative', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: alerts ? '0 0 10px rgba(0, 240, 255, 0.2)' : 'none'
              }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: alerts ? 'var(--accent-color)' : 'rgba(255,255,255,0.3)',
                  position: 'absolute', top: '3px',
                  left: alerts ? '24px' : '4px',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: alerts ? '0 0 8px var(--accent-color)' : 'none'
                }} />
              </div>
            </div>

            <div 
              onClick={() => setIsSimulation(!isSimulation)}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '14px 16px', borderRadius: '16px', 
                background: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.1)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <div>
                <span style={{ color: 'var(--accent-color)', fontSize: '13px', fontWeight: '800', display: 'block' }}>Simulate Drive</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Test speedometer on PC</span>
              </div>
              <div style={{
                width: '42px', height: '22px', borderRadius: '12px',
                background: isSimulation ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.05)',
                border: isSimulation ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)',
                position: 'relative', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: isSimulation ? '0 0 15px rgba(0, 240, 255, 0.3)' : 'none'
              }}>
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: isSimulation ? '#fff' : 'rgba(255,255,255,0.3)',
                  position: 'absolute', top: '3px',
                  left: isSimulation ? '24px' : '4px',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: isSimulation ? '0 0 10px #fff' : 'none'
                }} />
              </div>
            </div>
          </div>

          {/* Reset Action */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            {!confirmReset ? (
              <button 
                className="glass-button" 
                style={{ background: 'transparent', borderColor: 'rgba(255, 51, 102, 0.2)', color: 'var(--danger-color)', fontSize: '11px', padding: '8px 16px' }} 
                onClick={() => setConfirmReset(true)}
              >
                Reset App Data
              </button>
            ) : (
              <button 
                className="glass-button" 
                style={{ background: 'var(--danger-color)', color: '#fff', fontSize: '11px', padding: '8px 16px' }} 
                onClick={() => { tracker.resetData(); onClose(); }}
              >
                ARE YOU SURE?
              </button>
            )}
          </div>

          {/* Footer Save */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '28px', justifyContent: 'center' }}>
            <button 
              className="glass-button" 
              style={{ 
                width: 'fit-content', padding: '8px 20px', background: 'transparent', 
                borderColor: 'rgba(255,255,255,0.15)', color: 'var(--text-secondary)', 
                fontSize: '12px', fontWeight: '600' 
              }} 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="glass-button primary-glow" 
              style={{ 
                width: 'fit-content', padding: '8px 24px', background: 'transparent', 
                borderColor: 'var(--accent-color)', color: '#fff', 
                fontSize: '12px', fontWeight: '800' 
              }} 
              onClick={handleSave}
            >
              Save Profile
            </button>
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

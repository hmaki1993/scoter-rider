import React, { useState, useEffect, useRef } from 'react';
import { useFuelTracker } from './hooks/useFuelTracker';
import { AlertTriangle, User, Camera, Smartphone, Fuel, X, Sun, Moon, Droplet, Navigation } from 'lucide-react';
import { translations } from './translations';
import { App as CapApp } from '@capacitor/app';
import gsap from 'gsap';
import './index.css';

const THEME_COLORS = [
  { name: 'Fusion', hex: '#326144', secondary: '#ff5e00' },
  { name: 'Gold', hex: '#ffcc00', secondary: '#ffcc00' },
  { name: 'Orange', hex: '#ff9500', secondary: '#ff9500' },
  { name: 'Red', hex: '#ff3b30', secondary: '#ff3b30' },
  { name: 'Purple', hex: '#af52de', secondary: '#af52de' },
  { name: 'Cyan', hex: '#5ac8fa', secondary: '#5ac8fa' },
  { name: 'Moss', hex: '#248a3d', secondary: '#248a3d' },
];

function App() {
  const tracker = useFuelTracker();

  // Sync Global Theme Color
  useEffect(() => {
    const root = document.documentElement;
    const isLight = tracker.settings.isLightMode;
    
    root.style.setProperty('--accent-color', tracker.settings.accentColor);
    const theme = THEME_COLORS.find(c => c.hex === tracker.settings.accentColor);
    if (theme) {
      root.style.setProperty('--accent-secondary', theme.secondary);
      
      // ─── Elite High-Contrast Mode Switching ───
      if (isLight) {
        root.classList.add('app-light');
        root.classList.remove('app-dark');
        root.style.setProperty('--primary-bg', '#ffffff');
        root.style.setProperty('--text-primary', '#000000'); // Ink Black
        root.style.setProperty('--text-secondary', 'rgba(0,0,0,0.7)');
        root.style.setProperty('--glass-bg', 'rgba(255,255,255,0.92)'); // Frosted White
        root.style.setProperty('--glass-border', 'rgba(0,0,0,0.12)');
      } else {
        root.classList.add('app-dark');
        root.classList.remove('app-light');
        root.style.setProperty('--primary-bg', '#0a0a0c');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', 'rgba(255,255,255,0.6)');
        root.style.setProperty('--glass-bg', 'rgba(255,255,255,0.03)');
        root.style.setProperty('--glass-border', 'rgba(255,255,255,0.08)');
      }
    }
  }, [tracker.settings.accentColor, tracker.settings.isLightMode, tracker.isWarning, tracker.isDanger]);

  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'en';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  const [showRefuel, setShowRefuel] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWidgetMiniSettings, setShowWidgetMiniSettings] = useState(false);
  const [showPhotoZoom, setShowPhotoZoom] = useState(false);
  const [showTripAdjustModal, setShowTripAdjustModal] = useState(false);

  const [tripBase, setTripBase] = useState<number | null>(null);

  useEffect(() => {
    if (tracker.isDataLoaded) {
      import('@capacitor/preferences').then(({ Preferences }) => {
        Preferences.get({ key: 'custom_trip_base' }).then(res => {
          if (res.value) setTripBase(Number(res.value));
        });
      });
    }
  }, [tracker.isDataLoaded]);

  const appRef = useRef<HTMLDivElement>(null);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, message: string, onConfirm: () => void, isDanger?: boolean}>({ isOpen: false, message: '', onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, isOpen: false }));

  // Initial Entrance Animation
  useEffect(() => {
    if (appRef.current) {
      gsap.fromTo(
        appRef.current.children,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, stagger: 0.1, ease: "power4.out" }
      );
    }

    // --- Widget Action Handling (Deep Link from Widget Buttons) ---
    const handleWidgetAction = async () => {
      try {
        const { registerPlugin } = await import('@capacitor/core');
        const alarmPlugin = registerPlugin<any>('AlarmPlugin');
        const res = await alarmPlugin.getWidgetAction();
        
        console.log('[App] Checking widget action...', res);
        
        if (res && res.action === 'open_settings') {
          console.log('[App] Widget action received: open_settings -> Triggering Card');
          setTimeout(() => setShowWidgetMiniSettings(true), 500); 
        }
      } catch (e) {
        console.warn('[App] Widget action check failed:', e);
      }
    };

    // Auto-check on load and when app returns to foreground
    handleWidgetAction();
    let stateListener: any = null;
    CapApp.addListener('appStateChange', (state: any) => {
      if (state.isActive) handleWidgetAction();
    }).then(l => { stateListener = l; });

    // --- Kill any orphaned GSAP animations on the refuel btn ---
    gsap.killTweensOf('.premium-refuel-btn');

    return () => {
      if (stateListener) stateListener.remove();
    };
  }, []);

  if (!tracker.isDataLoaded) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#050505',
        color: '#00f0ff'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0, 240, 255, 0.1)',
          borderTop: '3px solid #00f0ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '4px', opacity: 0.6 }}>LOADING SYSTEM</div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="app-container"
      ref={appRef}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{
        padding: '24px 24px 70px 24px',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Immersive Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: '8px'
        }}
      >
        <button
          onClick={() =>
            tracker.setSettings({
              ...tracker.settings,
              language: tracker.settings.language === 'ar' ? 'en' : 'ar'
            })
          }
          style={{
            background: tracker.settings.isLightMode
              ? 'rgba(255,255,255,0.7)'
              : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(128,128,128,0.15)',
            cursor: 'pointer',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 900,
              fontFamily: "'Orbitron', sans-serif",
              color: tracker.settings.isLightMode
                ? 'rgba(0,0,0,0.85)'
                : 'rgba(255,255,255,0.85)'
            }}
          >
            {tracker.settings.language === 'ar' ? 'EN' : 'AR'}
          </span>
        </button>
        <button
          onClick={() =>
            tracker.setSettings({
              ...tracker.settings,
              isLightMode: !tracker.settings.isLightMode
            })
          }
          style={{
            background: tracker.settings.isLightMode
              ? 'rgba(255,255,255,0.7)'
              : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(128,128,128,0.15)',
            cursor: 'pointer',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
          }}
        >
          {tracker.settings.isLightMode ? (
            <Sun size={18} style={{ color: '#000000', opacity: 0.85 }} />
          ) : (
            <Moon size={18} style={{ color: '#ffffff', opacity: 0.85 }} />
          )}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tracker.trackingError && (
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '340px',
            padding: '16px 20px',
            borderRadius: '10px',
            background: tracker.settings.isLightMode ? 'rgba(220, 38, 38, 0.05)' : 'rgba(220, 38, 38, 0.08)',
            border: '1px solid var(--danger-color)',
            animation: 'fadeIn 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center',
            margin: '0 auto'
          }}>
            <div style={{ fontSize: '13.5px', color: 'var(--danger-color)', fontWeight: 750, lineHeight: 1.5, fontFamily: "'Rajdhani', sans-serif" }}>
              {tracker.trackingError.message}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {tracker.trackingError.action === 'openGPS' && (
                <button
                  className="raised-btn"
                  style={{
                    fontSize: '11px', padding: '8px 16px', borderRadius: '10px',
                    color: '#ffffff', border: 'none',
                    background: 'linear-gradient(135deg, var(--danger-color), #c62828)',
                    fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.5px',
                    cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                  }}
                  onClick={() => {
                    import('@capacitor/core').then(({ registerPlugin }) => {
                      registerPlugin<any>('AlarmPlugin').openLocationSettings().catch(() => {});
                    });
                  }}
                >
                  {t('openSettings')}
                </button>
              )}
              <button
                className="raised-btn"
                style={{
                  fontSize: '11px', padding: '8px 16px', borderRadius: '10px',
                  color: 'var(--text-primary)',
                  border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                  background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
                  fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer'
                }}
                onClick={() => tracker.clearTrackingError()}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
        {/* Top Status Pills Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              width: '100%',
              padding: '8px 12px 0 12px',
              background: 'transparent'
            }}
          >
            {/* Maintenance / Status Pill */}
            <div
              className={`elite-status-pill ${tracker.kmUntilNextOilChange <= 100 ? 'oil-warning-pulse' : ''}`}
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  message: tracker.settings.language === 'ar' ? 'هل قمت بتغيير الزيت بالفعل؟' : 'Have you actually changed the oil?',
                  onConfirm: () => tracker.recordOilChange(tracker.fuelState.lastOdo),
                  isDanger: false
                });
              }}
              style={{
                position: 'relative',
                margin: 0,
                minWidth: '90px',
                justifyContent: 'center',
                borderRadius: '10px',
                background: 'transparent',
                border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                padding: '10px 14px'
              }}
            >
              <div className="themed-icon" style={{ width: '24px', height: '24px', WebkitMaskImage: 'url(/icon-oil.png)', maskImage: 'url(/icon-oil.png)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                <span style={{ fontSize: '7px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Orbitron', sans-serif" }}>OIL</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: tracker.kmUntilNextOilChange <= 100 ? 'var(--danger-color)' : 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
                  {Math.max(0, tracker.kmUntilNextOilChange).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Trip Pill */}
            <div
              className="elite-status-pill"
              onClick={() => setShowTripAdjustModal(true)}
              style={{
                position: 'relative',
                margin: 0,
                minWidth: '90px',
                justifyContent: 'center',
                borderRadius: '10px',
                background: 'transparent',
                border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                padding: '10px 14px'
              }}
            >
              <div className="themed-icon" style={{ width: '24px', height: '24px', WebkitMaskImage: 'url(/icon-route.png)', maskImage: 'url(/icon-route.png)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                <span style={{ fontSize: '7px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Orbitron', sans-serif" }}>TRIP</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
                  {Math.max(0, tracker.fuelState.lastOdo - (tripBase ?? tracker.logs?.[0]?.odo ?? 0)).toFixed(1)}
                </span>
              </div>
            </div>

            {/* Budget Remaining Pill */}
            {(() => {
              const lastLog = tracker.logs?.[0];
              const pricePerLiter = tracker.settings.fuelPricePerLiter || 14.5;
              const pricePaid = (lastLog?.pricePaid && lastLog.pricePaid > 0) ? lastLog.pricePaid : (lastLog?.litersAdded ?? 0) * pricePerLiter;
              const litersAtRefuel = lastLog ? (lastLog.fuelBeforeRefuel ?? 0) + lastLog.litersAdded : 0;
              const litersConsumed = Math.max(0, litersAtRefuel - tracker.fuelState.estimatedFuelLiters);
              const costConsumed = litersConsumed * pricePerLiter;
              const remaining = Math.max(0, pricePaid - costConsumed);
              return (
                <div
                  className="elite-status-pill-static"
                  style={{
                    position: 'relative',
                    margin: 0,
                    minWidth: '90px',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                    padding: '10px 14px'
                  }}
                >
                  <div className="themed-icon" style={{ width: '24px', height: '24px', WebkitMaskImage: 'url(/icon-money.png)', maskImage: 'url(/icon-money.png)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                    <span style={{ fontSize: '7px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Orbitron', sans-serif" }}>EGP</span>
                    <span style={{ fontSize: '12px', fontWeight: 900, color: remaining < pricePaid * 0.2 ? 'var(--danger-color)' : 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
                      {remaining.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative'
          }}
        >
            <div
              style={{
                borderRadius: '10px',
                background: 'transparent',
                border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                boxShadow: tracker.settings.isLightMode
                  ? '0 6px 14px rgba(0,0,0,0.13), 0 5px 0 rgba(0,0,0,0.35), inset 0 1.5px 0 rgba(255,255,255,0.9)'
                  : '0 5px 0 rgba(255,255,255,0.28), 0 6px 14px rgba(0,0,0,0.80), inset 0 1.5px 0 rgba(255,255,255,0.25)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 0, marginTop: 0, animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ position: 'relative', width: '200px', height: '130px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                  <svg width="200" height="130" viewBox="0 0 200 130" style={{ transform: 'translateY(8px)' }}>
                    <path d="M 30,110 A 70,70 0 0,1 170,110" fill="none" stroke={tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'} strokeWidth="1" />
                    <path d="M 34,110 A 66,66 0 0,1 166,110" fill="none" stroke={tracker.settings.isLightMode ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'} strokeWidth="8" strokeLinecap="round" />
                    <path
                      d="M 34,110 A 66,66 0 0,1 166,110"
                      fill="none"
                      stroke={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-color)'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="207.3"
                      strokeDashoffset={207.3 - (Math.min(tracker.currentSpeed, 120) / 120) * 207.3}
                      style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s' }}
                    />
                    {[0, 20, 40, 60, 80, 100, 120].map((v) => {
                      const angle = (v / 120) * 180 - 180;
                      const rad = (angle * Math.PI) / 180;
                      const x1 = 100 + 58 * Math.cos(rad); const y1 = 110 + 58 * Math.sin(rad);
                      const x2 = 100 + 64 * Math.cos(rad); const y2 = 110 + 64 * Math.sin(rad);
                      const tx = 100 + 78 * Math.cos(rad); const ty = 110 + 78 * Math.sin(rad);
                      return (
                        <g key={v}>
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-primary)" strokeWidth={v % 40 === 0 ? 2 : 1} opacity={tracker.settings.isLightMode ? 0.6 : 0.35} />
                          <text x={tx} y={ty} fill="var(--text-primary)" fontSize={v % 40 === 0 ? 11 : 9} fontWeight="800" textAnchor="middle" alignmentBaseline="middle" opacity={v % 40 === 0 ? 1 : 0.6}>{v}</text>
                        </g>
                      );
                    })}
                    <g style={{
                      transformOrigin: '100px 110px',
                      transform: `rotate(${(Math.min(tracker.currentSpeed, 120) / 120) * 180}deg)`,
                      transition: 'transform 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                    }}>
                      <line x1="100" y1="110" x2="42" y2="110" stroke={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-secondary)'} strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'stroke 0.5s' }} />
                      <circle cx="100" cy="110" r="4" fill={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-secondary)'} style={{ transition: 'fill 0.5s' }} />
                      <circle cx="100" cy="110" r="2" fill={tracker.settings.isLightMode ? '#ffffff' : 'var(--primary-bg)'} />
                    </g>
                  </svg>
                  <div style={{ position: 'absolute', left: '50%', top: '82%', transform: 'translate(-50%, -50%)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '36px', fontWeight: 900, fontFamily: "'Orbitron', sans-serif", color: tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-color)', lineHeight: 1, transition: 'color 0.5s' }}>
                      {tracker.currentSpeed || 0}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 800, fontFamily: "'Orbitron', sans-serif", color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>{t('kmh')}</div>
                  </div>
                </div>
                {tracker.isWarning && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                    padding: '5px 14px', borderRadius: '10px', background: tracker.settings.isLightMode ? 'rgba(185, 28, 28, 0.15)' : 'rgba(255, 59, 48, 0.22)',
                    border: tracker.settings.isLightMode ? '2px solid rgba(185, 28, 28, 0.7)' : '2px solid rgba(255, 59, 48, 0.75)',
                    borderBottom: tracker.settings.isLightMode ? '4px solid rgba(185, 28, 28, 0.75)' : '4px solid rgba(255, 59, 48, 0.8)',
                    marginTop: '16px', animation: 'pulse 1.8s infinite',
                    boxShadow: tracker.settings.isLightMode ? '0 0 6px rgba(185, 28, 28, 0.15)' : '0 0 8px rgba(255, 59, 48, 0.2)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    <AlertTriangle size={12} color={tracker.settings.isLightMode ? '#b91c1c' : '#ff3b30'} />
                    <span style={{ fontSize: '10px', fontWeight: 900, color: tracker.settings.isLightMode ? '#b91c1c' : '#ff3b30', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Orbitron', sans-serif" }}>{t('lowFuel')}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '12px' }}>
                <div style={{ fontSize: '11px', fontFamily: "'Orbitron', sans-serif", fontWeight: 750, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                  {t('estimatedRange')}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '3px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '46px', fontWeight: 800, fontFamily: "'Orbitron', sans-serif", lineHeight: 1, color: 'var(--accent-color)' }}>
                    {Math.max(0, tracker.rangeRemainingKm).toFixed(1)}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", color: 'var(--text-primary)', marginTop: '12px', letterSpacing: '0.5px' }}>{t('kmRemaining')}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, tracker.fuelPercentage)}%`,
                    background: tracker.isDanger
                      ? 'var(--danger-color)'
                      : tracker.isWarning
                        ? 'var(--warning-color)'
                        : 'var(--accent-color)',
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>
                    <span>
                      <span style={{ color: 'var(--accent-secondary)', fontWeight: 900, fontFamily: "'Orbitron', sans-serif", fontSize: '17px' }}>
                        {tracker.fuelState.estimatedFuelLiters.toFixed(1)}
                      </span>{' '}
                      <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {tracker.settings.language === 'ar' ? 'لتر فاضل' : 'L left'}
                      </span>
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '13.5px', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif" }}>
                    <span>
                      ≈{' '}
                      <span style={{ color: 'var(--accent-secondary)', fontWeight: 900, fontFamily: "'Orbitron', sans-serif", fontSize: '15px' }}>
                        {Math.max(0, tracker.fuelState.estimatedFuelLiters * (tracker.settings.fuelPricePerLiter || 14.5)).toFixed(0)}
                      </span>{' '}
                      {lang === 'ar' ? 'جنيه بنزين' : 'EGP fuel'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 'auto',
            marginBottom: '0px',
            paddingBottom: '16px',
            paddingTop: '20px',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                className="raised-btn"
                style={{
                  width: '200px',
                  height: '42px',
                  gap: '8px',
                  borderRadius: '10px',
                  background: tracker.settings.isLightMode
                    ? 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)'
                    : 'rgba(255,255,255,0.14)',
                  border: tracker.settings.isLightMode
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.4s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => setShowRefuel(true)}
                onMouseDown={(e) => gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1 })}
                onMouseUp={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'back.out(2)' })}
              >
                <Fuel size={18} style={{ color: 'var(--accent-secondary)' }} strokeWidth={2.5} />
                <span style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontFamily: "'Inter', sans-serif"
                }}>{t('refuel')}</span>
              </button>
              <div style={{
                width: '2px',
                height: '24px',
                background: tracker.settings.isLightMode
                  ? 'rgba(0,0,0,0.15)'
                  : 'rgba(255,255,255,0.25)',
                margin: '0 4px',
                borderRadius: '1px'
              }} />
              <button
                className="raised-btn"
                style={{
                  height: '42px',
                  width: '42px',
                  background: tracker.settings.isLightMode
                    ? 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)'
                    : 'rgba(255,255,255,0.14)',
                  border: tracker.settings.isLightMode
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.22)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setShowSync(true)}
                onMouseDown={(e) => gsap.to(e.currentTarget, { scale: 0.8, duration: 0.1 })}
                onMouseUp={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'back.out(2)' })}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: 'var(--accent-secondary)',
                  WebkitMask: "url('/plus-sign.png') no-repeat center / contain",
                  mask: "url('/plus-sign.png') no-repeat center / contain",
                  filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.15))'
                }} />
              </button>
            </div>
          </div>
      </div>

      {tracker.userProfile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          maxWidth: '480px',
          margin: '0 auto',
          height: '56px',
          padding: '0',
          borderRadius: '0',
          background: tracker.settings.isLightMode
            ? 'rgba(255,255,255,0.90)'
            : 'rgba(18,18,24,0.90)',
          borderTop: tracker.settings.isLightMode
            ? '1.5px solid rgba(0,0,0,0.12)'
            : '1.5px solid rgba(255,255,255,0.15)',
          borderLeft: tracker.settings.isLightMode
            ? '1px solid rgba(0,0,0,0.08)'
            : '1px solid rgba(255,255,255,0.1)',
          borderRight: tracker.settings.isLightMode
            ? '1px solid rgba(0,0,0,0.08)'
            : '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          boxShadow: 'none',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          gap: '0',
          zIndex: 9998
        }}>
          <button
            onClick={() => {
              setShowSettings(false);
              setShowSync(false);
              setShowRefuel(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bottom-nav-btn"
            style={{ background: 'transparent', border: 'none' }}
          >
            <img
              src="/icon-home.png"
              width={24}
              height={24}
              style={{
                filter: tracker.settings.isLightMode
                  ? 'brightness(0)'
                  : 'brightness(0) invert(1)',
                opacity: 0.85
              }}
            />
          </button>
          <div style={{
            width: '2px',
            height: '24px',
            background: tracker.settings.isLightMode
              ? 'rgba(0,0,0,0.35)'
              : 'rgba(255,255,255,0.45)',
            borderRadius: '1px',
            alignSelf: 'center'
          }} />
          <button
            className="bottom-nav-btn"
            onClick={() => setShowSettings(true)}
            style={{ background: 'transparent', border: 'none' }}
          >
            <img
              src="/icon-settings.png"
              width={24}
              height={24}
              style={{
                filter: tracker.settings.isLightMode
                  ? 'brightness(0)'
                  : 'brightness(0) invert(1)',
                opacity: 0.85
              }}
            />
          </button>
        </div>
      )}

      {/* MODALS */}
      {!tracker.userProfile && (
        <OnboardingModal
          tracker={tracker}
          setTripBase={setTripBase}
          onComplete={(profile) => {
            tracker.updateUserProfile(profile);
            setTimeout(() => tracker.requestAllPermissions(), 800);
          }}
        />
      )}

      {showRefuel && <RefuelModal tracker={tracker} onClose={() => setShowRefuel(false)} setConfirmDialog={setConfirmDialog} />}
      {showSync && <SyncOdoModal tracker={tracker} tripBase={tripBase} setTripBase={setTripBase} onClose={() => setShowSync(false)} />}
      {showSettings && <SettingsModal tracker={tracker} onClose={() => setShowSettings(false)} setConfirmDialog={setConfirmDialog} />}


      {showPhotoZoom && (
        <PhotoZoomModal
          photoUrl={tracker.userProfile?.photoUrl}
          photoPosition={tracker.userProfile?.photoPosition}
          tracker={tracker}
          onClose={() => setShowPhotoZoom(false)}
        />
      )}

      {showWidgetMiniSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(30px)' }}>
          <WidgetMiniSettingsCard 
            tracker={tracker} 
            onClose={() => setShowWidgetMiniSettings(false)} 
          />
        </div>
      )}

      {showTripAdjustModal && (
        <TripAdjustModal
          tracker={tracker}
          tripBase={tripBase}
          setTripBase={setTripBase}
          onClose={() => setShowTripAdjustModal(false)}
        />
      )}

      {confirmDialog.isOpen && (
        <ConfirmModal 
          isOpen={confirmDialog.isOpen} 
          message={confirmDialog.message} 
          onConfirm={() => { confirmDialog.onConfirm(); closeConfirm(); }} 
          onCancel={closeConfirm} 
          isDanger={confirmDialog.isDanger} 
          tracker={tracker}
        />
      )}

    </div>
  );
}

// Onboarding Modal Component
const OnboardingModal = ({ tracker, onComplete, setTripBase }: { tracker: any, onComplete: (profile: any) => void, setTripBase: (v: number) => void }) => {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [fuelPrice, setFuelPrice] = useState('22');
  const [odoReading, setOdoReading] = useState('');
  const [isLightMode, setIsLightMode] = useState(false);
  const [accentColor, setAccentColor] = useState(tracker.settings.accentColor || '#326144');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onComplete({
      name,
      phone,
      vehicleType,
      photoUrl: photo,
      photoPosition: { x: 50, y: 50, scale: 100 },
      registeredAt: new Date().toISOString()
    });
    const selectedTheme = THEME_COLORS.find(c => c.hex === accentColor);
    tracker.setSettings({
      ...tracker.settings,
      accentColor,
      accentSecondary: selectedTheme?.secondary || '#ff5e00',
      isLightMode,
      fuelPricePerLiter: Number(fuelPrice) || 22,
      lastOilChangeOdo: odoReading && Number(odoReading) > 0 ? Number(odoReading) : 0,
    });
    if (odoReading && Number(odoReading) > 0) {
      setTimeout(() => {
        const val = Number(odoReading);
        tracker.updateCurrentOdo(val);
        import('@capacitor/preferences').then(({ Preferences }) =>
          Preferences.set({ key: 'custom_trip_base', value: String(val) })
        ).catch(() => {});
        localStorage.setItem('custom_trip_base', String(val));
        setTripBase(val);
      }, 500);
    }
    // Auto-start tracking after setup
    setTimeout(() => {
      tracker.startTracking(false);
    }, 600);
  };

  /* ─── colour helpers ─── */
  const cardBg   = isLightMode ? '#ffffff'          : 'rgba(255,255,255,0.06)';
  const cardBdr  = isLightMode ? '#e8e8ee'          : 'rgba(255,255,255,0.12)';
  const pageBg   = isLightMode ? '#f0f2f5'          : '#111115';
  const labelClr = isLightMode ? '#7b7b8a'          : 'rgba(255,255,255,0.45)';
  const textClr  = isLightMode ? '#12121c'          : '#ffffff';
  // Bright label color: for the default green theme (#326144) use a vivid green, otherwise use the accent itself
  const brightLabel = accentColor === '#326144'
    ? (isLightMode ? '#1a7a3a' : '#4ade80')
    : accentColor;

  return (
    <div style={{ position:'fixed', inset:0, background:pageBg, zIndex:1000,
                  display:'flex', flexDirection:'column', overflow:'auto' }}>

      {/* ── HERO HEADER ── */}
      <div style={{
        background: accentColor,
        position: 'relative',
        paddingBottom: '0',
      }}>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display:'none' }} onChange={handleFileChange} />

        {/* Dark overlay for depth */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents:'none'
        }} />

        {/* Top bar: scooter + app name */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          gap:'8px', padding:'18px 20px 0', position:'relative', zIndex:1
        }}>
          <div style={{
            width:'22px', height:'22px',
            background:'rgba(255,255,255,0.9)',
            WebkitMaskImage:'url(/icon-scooter.png)', maskImage:'url(/icon-scooter.png)',
            WebkitMaskSize:'contain', maskSize:'contain',
            WebkitMaskRepeat:'no-repeat', maskRepeat:'no-repeat',
            WebkitMaskPosition:'center', maskPosition:'center'
          }} />
          <span style={{
            fontSize:'11px', fontWeight:800, color:'rgba(255,255,255,0.85)',
            letterSpacing:'3px', textTransform:'uppercase',
            fontFamily:"'Orbitron', sans-serif"
          }}>
            FUEL TRACKER
          </span>
        </div>

        {/* Main content: avatar left + text right */}
        <div style={{
          display:'flex', alignItems:'center', gap:'16px',
          padding:'16px 22px 22px', position:'relative', zIndex:1
        }}>
          {/* Avatar */}
          <div
            onClick={handlePhotoClick}
            style={{
              width:'70px', height:'70px', borderRadius:'18px',
              background:'rgba(0,0,0,0.3)',
              border:'2.5px solid rgba(255,255,255,0.85)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', overflow:'hidden', flexShrink:0,
            }}
          >
            {photo
              ? <img src={photo} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <User size={28} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
            }
          </div>

          {/* Text */}
          <div style={{ textAlign:'left' }}>
            <h1 style={{
              margin:'0 0 4px', fontSize:'22px', fontWeight:900,
              fontFamily:"'Orbitron', sans-serif",
              color:'#ffffff', letterSpacing:'0.5px',
              textTransform:'uppercase', lineHeight:1.1,
              textShadow:'0 2px 10px rgba(0,0,0,0.3)'
            }}>
              {t('welcomeRider')}
            </h1>
            <p style={{
              margin:0, fontSize:'12px',
              color:'rgba(255,255,255,0.72)', fontWeight:600,
              letterSpacing:'0.5px'
            }}>
              {t('setupProfile')}
            </p>
          </div>
        </div>

        {/* Wave bottom edge */}
        <svg viewBox="0 0 375 24" style={{ display:'block', width:'100%', height:'24px', marginBottom:'-1px' }}
             preserveAspectRatio="none">
          <path d="M0,0 C120,24 255,24 375,0 L375,24 L0,24 Z" fill={pageBg} />
        </svg>
      </div>

      {/* ── FORM ── */}
      <form
        onSubmit={handleSubmit}
        style={{ flex:1, padding:'20px 18px 40px',
                 display:'flex', flexDirection:'column', gap:'16px' }}
      >

        {/* Name */}
        <div style={{ background:cardBg,
                      border:`1.5px solid ${cardBdr}`,
                      borderLeft:`3px solid ${brightLabel}`,
                      borderRadius:'14px', padding:'0',
                      overflow:'hidden',
                      boxShadow: isLightMode ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ padding:'12px 16px 0', display:'flex', alignItems:'center', gap:'8px' }}>
            <User size={16} color={brightLabel} strokeWidth={2.5} />
            <span style={{ fontSize:'11px', fontWeight:800, color:brightLabel,
                           textTransform:'uppercase', letterSpacing:'1.5px',
                           fontFamily:"'Orbitron', sans-serif" }}>
              {t('riderName')}
            </span>
          </div>
          <input
            required type="text" value={name}
            onChange={e=>{ const v=e.target.value; setName(v.charAt(0).toUpperCase()+v.slice(1)); }}
            placeholder="Ahmed…"
            style={{ width:'100%', background:'none', border:'none', outline:'none',
                     padding:'6px 16px 14px', fontSize:'22px', fontWeight:800,
                     fontFamily:"'Rajdhani', sans-serif", color:textClr, boxSizing:'border-box' }}
          />
        </div>

        {/* Phone */}
        <div style={{ background:cardBg,
                      border:`1.5px solid ${cardBdr}`,
                      borderLeft:`3px solid ${brightLabel}`,
                      borderRadius:'14px', overflow:'hidden',
                      boxShadow: isLightMode ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ padding:'12px 16px 0', display:'flex', alignItems:'center', gap:'8px' }}>
            <Smartphone size={16} color={brightLabel} strokeWidth={2.5} />
            <span style={{ fontSize:'11px', fontWeight:800, color:brightLabel,
                           textTransform:'uppercase', letterSpacing:'1.5px',
                           fontFamily:"'Orbitron', sans-serif" }}>
              {t('phoneNumber')}
            </span>
          </div>
          <input
            type="tel" value={phone}
            onChange={e=>setPhone(e.target.value.replace(/\D/g,''))}
            placeholder="01XXXXXXXXX"
            style={{ width:'100%', background:'none', border:'none', outline:'none',
                     padding:'6px 16px 14px', fontSize:'22px', fontWeight:800,
                     fontFamily:"'Rajdhani', sans-serif", color:textClr, boxSizing:'border-box' }}
          />
        </div>

        {/* Vehicle */}
        <div style={{ background:cardBg,
                      border:`1.5px solid ${cardBdr}`,
                      borderLeft:`3px solid ${brightLabel}`,
                      borderRadius:'14px', overflow:'hidden',
                      boxShadow: isLightMode ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ padding:'12px 16px 0', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'16px', height:'16px', flexShrink:0,
                          background:brightLabel,
                          WebkitMaskImage:'url(/icon-scooter.png)', maskImage:'url(/icon-scooter.png)',
                          WebkitMaskSize:'contain', maskSize:'contain',
                          WebkitMaskRepeat:'no-repeat', maskRepeat:'no-repeat',
                          WebkitMaskPosition:'center', maskPosition:'center' }} />
            <span style={{ fontSize:'11px', fontWeight:800, color:brightLabel,
                           textTransform:'uppercase', letterSpacing:'1.5px',
                           fontFamily:"'Orbitron', sans-serif" }}>
              {t('vehicleType')}
            </span>
          </div>
          <input
            type="text" value={vehicleType}
            onChange={e=>setVehicleType(e.target.value.toUpperCase())}
            placeholder="SCOOTER / MOTORCYCLE"
            style={{ width:'100%', background:'none', border:'none', outline:'none',
                     padding:'6px 16px 14px', fontSize:'22px', fontWeight:800,
                     fontFamily:"'Rajdhani', sans-serif", color:textClr,
                     textTransform:'uppercase', boxSizing:'border-box' }}
          />
        </div>

        {/* Fuel Price + Odo */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
          {/* Fuel Price */}
          <div style={{ background:cardBg,
                        border:`1.5px solid ${cardBdr}`,
                        borderLeft:`3px solid ${brightLabel}`,
                        borderRadius:'14px', padding:'12px 14px',
                        boxShadow: isLightMode ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 10px rgba(0,0,0,0.2)' }}>
            <span style={{ display:'block', fontSize:'10px', fontWeight:800,
                           color:brightLabel, textTransform:'uppercase', letterSpacing:'1.5px',
                           marginBottom:'8px', fontFamily:"'Orbitron', sans-serif" }}>
              {t('fuelPrice')}
            </span>
            <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
              <input
                type="number" step="0.5" value={fuelPrice}
                onChange={e=>setFuelPrice(e.target.value)}
                style={{ flex:1, background:'none', border:'none', outline:'none',
                         fontSize:'28px', fontWeight:900,
                         fontFamily:"'Orbitron', sans-serif",
                         color:brightLabel, width:'100%' }}
              />
              <span style={{ fontSize:'13px', fontWeight:800, color:labelClr }}>EGP</span>
            </div>
          </div>

          {/* Odometer */}
          <div style={{ background:cardBg,
                        border:`1.5px solid ${cardBdr}`,
                        borderLeft:`3px solid ${brightLabel}`,
                        borderRadius:'14px', padding:'12px 14px',
                        boxShadow: isLightMode ? '0 2px 8px rgba(0,0,0,0.04)' : '0 2px 10px rgba(0,0,0,0.2)' }}>
            <span style={{ display:'block', fontSize:'10px', fontWeight:800,
                           color:brightLabel, textTransform:'uppercase', letterSpacing:'1.5px',
                           marginBottom:'8px', fontFamily:"'Orbitron', sans-serif" }}>
              {t('odoReading')}
            </span>
            <div style={{ display:'flex', alignItems:'baseline', gap:'4px' }}>
              <input
                type="number" step="0.1" value={odoReading}
                onChange={e=>setOdoReading(e.target.value)}
                placeholder="0"
                style={{ flex:1, background:'none', border:'none', outline:'none',
                         fontSize:'28px', fontWeight:900,
                         fontFamily:"'Orbitron', sans-serif",
                         color:textClr, width:'100%' }}
              />
              <span style={{ fontSize:'13px', fontWeight:800, color:labelClr }}>KM</span>
            </div>
          </div>
        </div>

        {/* Dark / Light toggle */}
        <div style={{ background:cardBg, border:`1.5px solid ${cardBdr}`,
                      borderRadius:'14px', padding:'12px 16px',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {isLightMode
              ? <Sun size={18} color={accentColor} />
              : <Moon size={18} color={accentColor} />}
            <span style={{ fontSize:'14px', fontWeight:700, color:textClr }}>
              {isLightMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </div>
          <div onClick={()=>setIsLightMode(!isLightMode)}
               style={{ width:'50px', height:'28px', borderRadius:'14px', cursor:'pointer',
                        background: isLightMode ? accentColor : 'rgba(255,255,255,0.18)',
                        position:'relative', transition:'background 0.3s' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:'#fff',
                          position:'absolute', top:'3px',
                          left: isLightMode ? '25px' : '3px',
                          transition:'left 0.3s',
                          boxShadow:'0 2px 6px rgba(0,0,0,0.25)' }} />
          </div>
        </div>

        {/* Theme colours */}
        <div style={{ background:cardBg, border:`1.5px solid ${cardBdr}`,
                      borderRadius:'14px', padding:'12px 16px' }}>
          <span style={{ display:'block', fontSize:'10px', fontWeight:800,
                         color:labelClr, textTransform:'uppercase', letterSpacing:'1px',
                         marginBottom:'12px' }}>
            THEME COLOR
          </span>
          <div style={{ display:'flex', gap:'10px', justifyContent:'center' }}>
            {THEME_COLORS.map(theme=>(
              <div
                key={theme.hex}
                onClick={()=>setAccentColor(theme.hex)}
                style={{
                  width:'34px', height:'34px', borderRadius:'50%',
                  background:theme.hex,
                  border: accentColor===theme.hex
                    ? `3px solid ${textClr}`
                    : '2px solid transparent',
                  cursor:'pointer', transition:'all 0.2s',
                  transform: accentColor===theme.hex ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            marginTop:'6px', width:'100%', padding:'18px',
            borderRadius:'14px', border:'none',
            background: name.trim()
              ? accentColor
              : isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)',
            color: name.trim()
              ? '#fff'
              : isLightMode ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.28)',
            fontSize:'13px', fontWeight:900,
            fontFamily:"'Orbitron', sans-serif",
            letterSpacing:'3px', textTransform:'uppercase',
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            transition:'all 0.3s',
          }}
        >
          {t('startRide')}
        </button>
      </form>
    </div>
  );
};


// Trip Adjust Modal Component
const TripAdjustModal = ({ tracker, tripBase, setTripBase, onClose }: { tracker: any; tripBase: number | null; setTripBase: (val: number | null) => void; onClose: () => void }) => {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  
  const initialTrip = Math.max(0, tracker.fuelState.lastOdo - (tripBase ?? tracker.logs?.[0]?.odo ?? 0)).toFixed(1);
  const [tripVal, setTripVal] = useState(initialTrip);

  const handleReset = () => {
    const odo = tracker.fuelState.lastOdo;
    import('@capacitor/preferences').then(({ Preferences }) =>
      Preferences.set({ key: 'custom_trip_base', value: String(odo) })
    ).catch(() => {});
    localStorage.setItem('custom_trip_base', String(odo));
    setTripBase(odo);
    onClose();
  };

  const handleSave = () => {
    const val = Number(tripVal);
    if (!isNaN(val) && val >= 0) {
      const base = tracker.fuelState.lastOdo - val;
      import('@capacitor/preferences').then(({ Preferences }) =>
        Preferences.set({ key: 'custom_trip_base', value: String(base) })
      ).catch(() => {});
      localStorage.setItem('custom_trip_base', String(base));
      setTripBase(base);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.72)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
        background: tracker.settings.isLightMode ? '#ffffff' : 'var(--card-bg)',
        border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.08)' : 'var(--glass-border)'}`,
        borderRadius: '20px',
        padding: '24px',
        width: '90%',
        maxWidth: '320px',
        boxShadow: tracker.settings.isLightMode ? '0 8px 32px rgba(0,0,0,0.12)' : '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="themed-icon" style={{
              width: '24px',
              height: '24px',
              WebkitMaskImage: 'url(/icon-route.png)',
              maskImage: 'url(/icon-route.png)',
            }} />
            <span style={{
              fontSize: '16px',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
            }}>{t('trip')}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <img src="/cancel.png" alt="close" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)',
          }}>{tracker.settings.language === 'ar' ? 'عداد الرحلة على السكوتر' : 'Scooter Trip Meter'}</label>
        </div>

        <div style={{
          background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.04)' : 'var(--glass-bg)',
          border: `1.5px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.15)' : 'var(--glass-border)'}`,
          borderRadius: '14px',
          padding: '4px 14px',
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <input
            type="number"
            step="0.1"
            value={tripVal}
            onChange={(e) => setTripVal(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: '32px',
              fontWeight: 900,
              fontFamily: "'Rajdhani', sans-serif",
              border: 'none',
              background: 'transparent',
              textAlign: 'center',
              color: 'var(--text-primary)',
              outline: 'none',
              letterSpacing: '1px',
            }}
          />
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)',
            letterSpacing: '1px',
          }}>KM</span>
        </div>

        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '22px',
          lineHeight: '1.6',
          color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)',
        }}>
          {tracker.settings.language === 'ar' ? 'اكتب رقم عداد الرحلة اللي على السكوتر' : "Enter your scooter's trip meter reading"}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleReset} style={{
            flex: 1,
            padding: '13px',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: "'Rajdhani', sans-serif",
            background: 'transparent',
            color: 'var(--danger-color)',
            border: '2.5px solid var(--danger-color)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>{tracker.settings.language === 'ar' ? 'تصفير' : 'RESET'}</button>
          <button onClick={handleSave} style={{
            flex: 1,
            padding: '13px',
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontFamily: "'Rajdhani', sans-serif",
            background: 'transparent',
            color: 'var(--accent-color)',
            border: '2.5px solid var(--accent-color)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>{tracker.settings.language === 'ar' ? 'حفظ' : 'SAVE'}</button>
        </div>
      </div>
    </div>
  );
};

const SyncOdoModal = ({ tracker, tripBase, setTripBase, onClose }: { tracker: any, tripBase: number | null, setTripBase: (v: number) => void, onClose: () => void }) => {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  const [odo, setOdo] = useState(tracker.fuelState.lastOdo.toFixed(1));

  const handleSync = () => {
    const val = Number(odo);
    if (!isNaN(val) && val > 0) {
      const oldOdo = tracker.fuelState.lastOdo;
      
      tracker.updateCurrentOdo(val);
      
      // Only set tripBase on FIRST TIME setup (when ODO was 0 or tripBase not set)
      // so trip starts at 0. On subsequent syncs, leave tripBase alone
      // so the driven distance (with GPS off) gets added to the trip.
      if (oldOdo === 0 || tripBase === null) {
        setTripBase(val);
        import('@capacitor/preferences').then(({ Preferences }) =>
          Preferences.set({ key: 'custom_trip_base', value: String(val) })
        ).catch(() => {});
        localStorage.setItem('custom_trip_base', String(val));
      }
      
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.3s ease', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.72)' }}>
      <div
        className="modal-content glass-panel"
        onClick={e => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          background: tracker.settings.isLightMode ? '#ffffff' : 'var(--card-bg)',
          border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.08)' : 'var(--glass-border)'}`,
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '320px',
          boxShadow: tracker.settings.isLightMode ? '0 12px 40px rgba(0,0,0,0.12)' : '0 20px 60px rgba(0,0,0,0.45)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/title-tag.png"
              alt="tag"
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain',
                filter: tracker.settings.isLightMode ? 'brightness(0.72)' : 'none'
              }}
            />
            <span style={{
              fontSize: '16px',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              textShadow: 'none'
            }}>{t('sync')}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <img src="/cancel.png" alt="close" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </button>
        </div>

        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)'
            }}>{t('odoReading')}</label>
            {Number(odo) > tracker.fuelState.lastOdo && (
              <span style={{
                fontSize: '11px',
                color: 'var(--accent-color)',
                fontWeight: '900'
              }}>
                +{(Number(odo) - tracker.fuelState.lastOdo).toFixed(1)} KM
              </span>
            )}
          </div>
          <div style={{
            background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.04)' : 'var(--glass-bg)',
            border: `1.5px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.15)' : 'var(--glass-border)'}`,
            borderRadius: '14px',
            padding: '4px 14px',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <input
              type="number"
              step="0.1"
              value={odo}
              onChange={e => setOdo(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: '32px',
                fontWeight: '900',
                fontFamily: "'Rajdhani', sans-serif",
                border: 'none',
                background: 'transparent',
                textAlign: 'center',
                color: 'var(--text-primary)',
                outline: 'none',
                letterSpacing: '1px'
              }}
            />
            <span style={{
              fontSize: '12px',
              fontWeight: '800',
              color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)',
              letterSpacing: '1px'
            }}>KM</span>
          </div>
          <div style={{
            fontSize: '12px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '22px',
            lineHeight: '1.6',
            color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)'
          }}>
            {tracker.settings.language === 'ar' ? 'ظبط الرقم عشان يبقى زي شاشة السكوتر' : "Match your scooter's odometer screen"}
          </div>
          <button
            onClick={handleSync}
            style={{
              width: '100%',
              padding: '13px',
              fontWeight: '800',
              fontSize: '13px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontFamily: "'Rajdhani', sans-serif",
              background: 'transparent',
              color: 'var(--accent-color)',
              border: '2.5px solid var(--accent-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'all 0.2s'
            }}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

function RefuelModal({ tracker, onClose, setConfirmDialog }: { tracker: any, onClose: () => void, setConfirmDialog?: any }) {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;

  const [odo, setOdo] = useState(
    tracker.fuelState.lastOdo === 0 ? '' : tracker.fuelState.lastOdo.toFixed(1)
  );

  const currentPrice = tracker.settings.fuelPricePerLiter || 14.5;
  // Store what's already in the tank so we only add the DIFFERENCE on submit
  const [baseRemainingLiters] = useState(tracker.fuelState.estimatedFuelLiters);
  const remainingEGP = Math.max(0, baseRemainingLiters * currentPrice);
  const initialValue = remainingEGP > 0 ? remainingEGP.toFixed(1).replace(/\.0$/, '') : '';

  const [inputValue, setInputValue] = useState(initialValue);
  const [inputMode, setInputMode] = useState<'currency' | 'liters'>('currency');

  const handleModeSwitch = (newMode: 'currency' | 'liters') => {
    if (newMode === inputMode) return;
    const currentVal = Number(inputValue);
    if (!currentVal) {
      setInputMode(newMode);
      return;
    }
    const price = tracker.settings.fuelPricePerLiter || 14.5;
    if (newMode === 'liters') {
      // When converting EGP to Liters, show 2 decimals
      setInputValue((currentVal / price).toFixed(2));
    } else {
      // When converting Liters to EGP, round to nearest 0.1 to avoid 619.96
      setInputValue(Number((currentVal * price).toFixed(1)).toString());
    }
    setInputMode(newMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const odometerVal = odo ? Number(odo) : tracker.fuelState.lastOdo;
    if (!odometerVal && odometerVal !== 0) return;
    const price = tracker.settings.fuelPricePerLiter || 14.5;
    
    // Calculate total liters the input represents
    let totalLiters: number;
    if (inputMode === 'currency') {
      totalLiters = Number(inputValue) / price;
    } else {
      totalLiters = Number(inputValue);
    }
    
    // Only add the DIFFERENCE (new fuel on top of what was already in tank)
    const addedLiters = totalLiters - baseRemainingLiters;
    
    if (addedLiters < 0.01) {
      // Nothing new added or value decreased → just close, don't double
      onClose();
      return;
    }
    
    const addedEGP = Number((addedLiters * price).toFixed(1));
    tracker.addRefuel(odometerVal, addedLiters, addedEGP, false);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.3s ease',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.72)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          background: tracker.settings.isLightMode ? '#ffffff' : 'var(--card-bg)',
          border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.08)' : 'var(--glass-border)'}`,
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '360px',
          boxShadow: tracker.settings.isLightMode ? '0 12px 40px rgba(0,0,0,0.12)' : '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/title-tag.png"
              alt="tag"
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain',
                filter: tracker.settings.isLightMode ? 'brightness(0.72)' : 'none'
              }}
            />
            <span style={{
              fontSize: '16px',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 900,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
            }}>{t('refuel')}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <img src="/cancel.png" alt="close" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Odometer Input Group */}
          <div
            className="fusion-input-group"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              background: tracker.settings.isLightMode ? '#ffffff' : 'var(--subtle-bg)',
              border: `2px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.18)' : 'var(--glass-border)'}`,
              boxShadow: tracker.settings.isLightMode ? '0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>{t('odoReading')}</span>
              {Number(odo) > tracker.fuelState.lastOdo && (
                <span style={{
                  fontSize: '10px',
                  color: 'var(--accent-color)',
                  fontWeight: 900,
                }}>
                  (+{(Number(odo) - tracker.fuelState.lastOdo).toFixed(1)} KM)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                className="fusion-input"
                style={{
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: "'Orbitron', sans-serif",
                  color: 'var(--text-primary)',
                }}
                value={odo}
                onChange={(e) => setOdo(e.target.value)}
              />
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)',
              }}>KM</span>
            </div>
          </div>

          {/* Amount / Liters Input Group */}
          <div
            className="fusion-input-group"
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              background: tracker.settings.isLightMode ? '#ffffff' : 'var(--subtle-bg)',
              border: `2px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.18)' : 'var(--glass-border)'}`,
              boxShadow: tracker.settings.isLightMode ? '0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {inputMode === 'currency'
                ? (tracker.settings.language === 'ar' ? 'المبلغ' : 'Amount')
                : (tracker.settings.language === 'ar' ? 'الكمية' : 'Liters')}
            </span>
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                className="fusion-input"
                style={{
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: "'Orbitron', sans-serif",
                  color: 'var(--text-primary)',
                }}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0.0"
              />
              <div style={{
                display: 'flex',
                background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '2px',
                border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'var(--glass-border)'}`,
              }}>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('currency')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputMode === 'currency' ? 'var(--accent-secondary)' : 'transparent',
                    color: inputMode === 'currency' ? '#fff' : (tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)'),
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    transition: 'all 0.2s',
                  }}
                >EGP</button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('liters')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputMode === 'liters' ? 'var(--accent-secondary)' : 'transparent',
                    color: inputMode === 'liters' ? '#fff' : (tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)'),
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    transition: 'all 0.2s',
                  }}
                >Liters</button>
              </div>
            </div>
          </div>

          {/* Conversions preview */}
          {inputValue && Number(inputValue) > 0 && (() => {
            const price = tracker.settings.fuelPricePerLiter || 14.5;
            const val = Number(inputValue);
            const totalL = inputMode === 'currency' ? val / price : val;
            const addedL = totalL - baseRemainingLiters;
            return (
              <div style={{
                textAlign: 'center',
                padding: '10px 14px',
                borderRadius: '12px',
                background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {inputMode === 'currency' ? (
                    <>= {totalL.toFixed(2)} L</>
                  ) : (
                    <>= {Number((val * price).toFixed(1))} EGP</>
                  )}
                </span>
                {addedL > 0.01 && (
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-color)', marginLeft: '6px' }}>
                    (+{addedL.toFixed(2)} L {tracker.settings.language === 'ar' ? 'جديد' : 'new'})
                  </span>
                )}
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--accent-secondary)',
                border: '2.5px solid var(--accent-secondary)',
                fontWeight: 900,
                padding: '13px',
                fontSize: '13px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: '2px',
                textTransform: 'uppercase',
                boxShadow: 'none',
                transition: 'all 0.2s',
              }}
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={() => {
                const msg = tracker.settings.language === 'ar' ? 'هل أنت متأكد من تصفير البنزين بالكامل؟' : 'Are you sure you want to completely empty the tank?';
                if (setConfirmDialog) {
                  setConfirmDialog({
                    isOpen: true,
                    message: msg,
                    isDanger: true,
                    onConfirm: () => {
                      tracker.emptyTank();
                      onClose();
                    }
                  });
                } else if (window.confirm(msg)) {
                  tracker.emptyTank();
                  onClose();
                }
              }}
              style={{
                width: '100%',
                background: 'rgba(255, 59, 48, 0.1)',
                color: '#ff3b30',
                border: '1px solid rgba(255, 59, 48, 0.2)',
                fontWeight: 800,
                padding: '10px',
                fontSize: '12px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
                transition: 'all 0.2s',
              }}
            >
              {tracker.settings.language === 'ar' ? 'تصفير كمية البنزين' : 'Empty Tank Completely'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ tracker, onClose }: { tracker: any, onClose: () => void, setConfirmDialog?: any }) {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'en';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;

  const [name, setName] = useState(tracker.userProfile?.name || '');
  const [phone, setPhone] = useState(tracker.userProfile?.phone || '');
  const [vehicle, setVehicle] = useState(tracker.userProfile?.vehicleType || '');
  const [photo, setPhoto] = useState(tracker.userProfile?.photoUrl || null);
  const [objPos, setObjPos] = useState(tracker.userProfile?.photoPosition || { x: 0, y: 0, scale: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, sx: 0, sy: 0 });
  const hasMovedRef = useRef(false);

  const [price, setPrice] = useState((tracker.settings.fuelPricePerLiter || 14.5).toString());
  const [threshold] = useState((tracker.settings.warningThreshold || 15).toString());
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!photo) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    setDragStart({ x: e.clientX, y: e.clientY, sx: objPos.x, sy: objPos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMovedRef.current = true;
    setObjPos((p: any) => ({ ...p, x: dragStart.sx + dx, y: dragStart.sy + dy }));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      maxWidth: '480px',
      margin: '0 auto',
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'var(--primary-bg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.3s ease'
    }}>

      {/* Immersive Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="themed-icon" style={{
            width: '28px',
            height: '28px',
            WebkitMaskImage: 'url(/circle-arrow.png)',
            maskImage: 'url(/circle-arrow.png)'
          }} />
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>{t('settings')}</h2>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 80px 24px' }}>

        {/* Dynamic Avatar Setup */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setIsDragging(false)}
            onClick={() => {
              if (!hasMovedRef.current) fileInputRef.current?.click();
            }}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '3px solid var(--accent-secondary)',
              margin: '0 auto 12px',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : (photo ? 'move' : 'pointer'),
              position: 'relative',
              touchAction: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12), inset 0 2px 4px rgba(0,0,0,0.1)',
              background: 'var(--glass-bg)',
            }}>
            {photo ? (
              <img
                src={photo}
                draggable="false"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `translate(${objPos.x}px, ${objPos.y}px) scale(${objPos.scale / 100})`,
                }}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={26} color="var(--accent-secondary)" />
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              background: 'rgba(0,0,0,0.5)',
              padding: '4px 0',
              fontSize: '9px',
              fontWeight: '900',
              color: '#fff',
            }}>
              {t('edit')}
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept="image/*"
            onChange={(e) => {
              let file = e.target.files?.[0];
              if (file) {
                let reader = new FileReader();
                reader.onload = (event) => setPhoto(event.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />
          {photo && (
            <input
              type="range"
              min="10"
              max="400"
              value={objPos.scale}
              onChange={(e) => setObjPos((prev: any) => ({ ...prev, scale: Number(e.target.value) }))}
              style={{ width: '150px', accentColor: 'var(--accent-secondary)' }}
            />
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--glass-border)', marginBottom: '32px' }} />

        {/* Section 1: PROFILE */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/programmer.png" alt="user" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>
              {t('userProfile') || 'USER PROFILE'}
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="fusion-input-group">
              <User size={23} strokeWidth={2.8} color="var(--accent-secondary)" style={{ opacity: 1 }} />
              <input className="fusion-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
            </div>
            <div className="fusion-input-group">
              <Smartphone size={23} strokeWidth={2.8} color="var(--accent-secondary)" style={{ opacity: 1 }} />
              <input
                type="tel"
                className="fusion-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Phone Number"
              />
            </div>
            <div className="fusion-input-group">
              <div className="themed-icon" style={{
                width: '23px',
                height: '23px',
                opacity: 1,
                WebkitMaskImage: 'url(/icon-scooter.png)',
                maskImage: 'url(/icon-scooter.png)'
              }} />
              <input className="fusion-input" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Vehicle Type" />
            </div>
          </div>
        </div>

        {/* Section 2: SPECS */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/motorcycle.png" alt="vehicle" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>
              {t('vehicleSpecs') || 'VEHICLE SPECS'}
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('fuelPrice')}
              </span>
              <input
                type="number"
                className="fusion-input"
                style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: MAINTENANCE */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/mechanic.png" alt="mechanic" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>
              {t('maintenance')}
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('oilChangeInterval')}
              </span>
              <input
                type="number"
                className="fusion-input"
                style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }}
                value={tracker.settings.oilChangeInterval === 0 ? '' : tracker.settings.oilChangeInterval}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  tracker.setSettings({ ...tracker.settings, oilChangeInterval: val });
                }}
              />
            </div>
            <div className="fusion-input-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('lastOilChangeOdo')}
              </span>
              <div style={{ fontSize: '16px', color: 'var(--accent-secondary)', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }}>
                {tracker.settings.lastOilChangeOdo} KM
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: THEME */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/paint.png" alt="theme" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>
              {t('appTheme')}
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', justifyContent: 'center', padding: '4px 0' }}>
            {THEME_COLORS.map((tColors) => {
              const isActive = tracker.settings.accentColor === tColors.hex;
              const isDarkDot = tColors.hex === '#ffcc00' || tColors.hex === '#5ac8fa';
              return (
                <div
                  key={tColors.name}
                  onClick={() => tracker.setSettings({ ...tracker.settings, accentColor: tColors.hex })}
                  className={`theme-dot-btn ${isActive ? 'active' : ''}`}
                  style={{
                    background: tColors.secondary === tColors.hex ? tColors.hex : `linear-gradient(135deg, ${tColors.hex}, ${tColors.secondary})`,
                  }}
                >
                  {isActive && <div className={`theme-dot-indicator ${isDarkDot ? 'dark-dot' : ''}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px', marginBottom: '16px' }}>
          <button className="settings-modal-btn settings-btn-cancel" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            className="settings-modal-btn settings-btn-save"
            onClick={() => {
              tracker.updateUserProfile({
                ...tracker.userProfile,
                name,
                phone,
                vehicleType: vehicle,
                photoUrl: photo,
                photoPosition: objPos,
              });
              tracker.setSettings({
                ...tracker.settings,
                fuelPricePerLiter: Number(price),
                warningThreshold: Number(threshold),
                isLightMode: tracker.settings.isLightMode,
              });
              onClose();
            }}
          >
            {t('save')}
          </button>
        </div>

        {/* Discreet Reset Button */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          textAlign: 'center',
        }}>
          <button
            className="raised-danger-btn"
            onClick={() => setConfirmReset(true)}
            style={{ padding: '8px 24px', borderRadius: '12px', gap: '12px' }}
          >
            <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src="/icon-reset.png" alt="reset" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <span style={{
              fontSize: '13px',
              fontWeight: '900',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              {t('resetApp')}
            </span>
          </button>
        </div>

      </div>

      {/* Built-in Reset Confirmation Overlay */}
      {confirmReset && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 200,
          background: tracker.settings.isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          animation: 'fadeIn 0.25s ease-out',
        }}>
          <div style={{
            maxWidth: '300px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            background: tracker.settings.isLightMode ? '#ffffff' : '#22222a',
            border: tracker.settings.isLightMode ? '2px solid rgba(0,0,0,0.18)' : '2px solid rgba(255,255,255,0.18)',
            borderBottom: tracker.settings.isLightMode ? '5px solid rgba(0,0,0,0.22)' : '5px solid rgba(255,255,255,0.22)',
            borderRadius: '20px',
            padding: '32px 28px',
            boxShadow: tracker.settings.isLightMode
              ? '0 4px 0 rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)'
              : '0 4px 0 rgba(0,0,0,0.6), 0 12px 48px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <AlertTriangle size={48} color="var(--danger-color)" />
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '900',
              color: 'var(--text-primary)',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              {tracker.settings.language === 'ar' ? 'مسح البيانات!' : 'RESET SYSTEM!'}
            </h3>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              {tracker.settings.language === 'ar'
                ? 'هل أنت متأكد من مسح جميع البيانات والإعدادات نهائياً؟'
                : 'Are you sure you want to permanently erase all tracking data and settings?'}
            </span>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              <button
                onClick={() => setConfirmReset(false)}
                style={{
                  background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                  border: tracker.settings.isLightMode ? '2px solid rgba(0,0,0,0.2)' : '2px solid rgba(255,255,255,0.25)',
                  color: 'var(--text-primary)',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif",
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  tracker.resetData();
                  onClose();
                }}
                style={{
                  background: '#e53935',
                  color: '#ffffff',
                  border: 'none',
                  borderBottom: '3px solid #b71c1c',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  fontFamily: "'Rajdhani', sans-serif",
                  boxShadow: '0 2px 8px rgba(229,57,53,0.35)',
                }}
              >
                {t('areYouSure') || (tracker.settings.language === 'ar' ? 'متأكد' : 'Sure')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, isDanger, tracker }: any) => {
  if (!isOpen) return null;
  const isLight = tracker?.settings?.isLightMode;

  const getIconBg = () => {
    if (isDanger) return 'rgba(255, 59, 48, 0.12)';
    const msgLower = message.toLowerCase();
    if (msgLower.includes('oil') || msgLower.includes('زيت')) {
      return 'rgba(255, 94, 0, 0.12)';
    }
    if (msgLower.includes('trip') || msgLower.includes('رحلة')) {
      return 'rgba(50, 97, 68, 0.12)';
    }
    return 'rgba(255, 94, 0, 0.12)';
  };

  const getIcon = () => {
    if (isDanger) return <AlertTriangle size={26} color="#ff3b30" />;
    const msgLower = message.toLowerCase();
    if (msgLower.includes('oil') || msgLower.includes('زيت')) {
      return <Droplet size={26} color="#ff5e00" />;
    }
    if (msgLower.includes('trip') || msgLower.includes('رحلة')) {
      return <Navigation size={26} color="#326144" />;
    }
    return <AlertTriangle size={26} color="#ff5e00" />;
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      zIndex: 100000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.5)', 
      backdropFilter: 'blur(16px)', 
      animation: 'fadeIn 0.25s ease-out' 
    }}>
      <div 
        className="glass-panel" 
        style={{ 
          width: '88%', 
          maxWidth: '320px', 
          padding: '28px 24px 24px 24px', 
          borderRadius: '28px', 
          border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)', 
          background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(42, 42, 54, 0.72)', 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          boxShadow: isLight ? '0 20px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)' : '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ease-out'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: getIconBg(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px auto',
            boxShadow: isLight ? '0 4px 10px rgba(0,0,0,0.04)' : '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            {getIcon()}
          </div>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            fontFamily: "'Rajdhani', sans-serif", 
            color: 'var(--text-primary)', 
            lineHeight: '1.5', 
            letterSpacing: '0.3px',
            padding: '0 8px'
          }}>
            {message}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', justifyContent: 'center' }}>
          <button 
            onClick={onCancel} 
            className="confirm-modal-btn confirm-btn-no"
          >
            {tracker.settings.language === 'ar' ? 'لا' : 'NO'}
          </button>
          <button 
            onClick={onConfirm} 
            className={`confirm-modal-btn confirm-btn-yes ${isDanger ? 'danger-confirm' : ''}`}
          >
            {tracker.settings.language === 'ar' ? 'نعم' : 'YES'}
          </button>
        </div>
      </div>
    </div>
  );
};



// Photo Zoom Modal Component
const PhotoZoomModal = ({ photoUrl, photoPosition, tracker, onClose }: { photoUrl?: string, photoPosition?: any, tracker: any, onClose: () => void }) => {
  return (
      <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', animation: 'fadeIn 0.3s ease'
      }}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: '340px',
          aspectRatio: '1', borderRadius: '24px', overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          boxShadow: tracker.settings.isLightMode ? '0 20px 60px rgba(0,0,0,0.1)' : '0 20px 60px rgba(0,0,0,0.85)',
          animation: 'scaleUp 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          background: 'var(--primary-bg)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {photoUrl ? (
          <img
            src={photoUrl} alt="Rider Full"
            style={{
              width: '100%', height: '100%', objectFit: 'contain', background: '#000',
              transform: photoPosition
                ? `translate(${(photoPosition.x || 0) * 4}px, ${(photoPosition.y || 0) * 4}px) scale(${(photoPosition.scale || 100) / 100})`
                : 'scale(1)',
              transformOrigin: 'center'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <User size={100} color="var(--accent-color)" opacity={0.4} />
          </div>
        )}

        {/* Close Button - Smaller & In-Card */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            zIndex: 10
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
// ΓöÇΓöÇ Widget Mini Settings Card (Live Customization) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const WidgetMiniSettingsCard = ({ tracker, onClose }: { tracker: any, onClose: () => void }) => {
  const colors = [
    '#00f0ff', '#ff3366', '#00ff64', '#ffcc00', '#af52de', '#ff9500', '#ffffff'
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'
    }}>
      <div className="widget-settings-card" style={{
        width: '100%', maxWidth: '320px', padding: '24px',
        borderRadius: '24px',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '950', color: '#fff', letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.8 }}>
            WIDGET DESIGNER
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Color Sped-Dial */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginBottom: '32px' }}>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => {
                tracker.setWidgetSettings({ widgetAccentColor: c });
              }}
              className={`color-dot-btn ${tracker.settings.widgetAccentColor === c ? 'active' : ''}`}
              style={{
                background: c,
                color: c // for currentColor shadow
              }}
            />
          ))}
        </div>

        {/* Opacity Slider */}
        <div style={{ marginBottom: '32px', padding: '0 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '900', letterSpacing: '1.5px', marginBottom: '12px' }}>
            <span>TRANSPARENCY</span>
            <span style={{ color: tracker.settings.widgetAccentColor || '#fff' }}>{tracker.settings.widgetOpacity}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={tracker.settings.widgetOpacity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              tracker.setWidgetSettings({ widgetOpacity: val });
            }}
            style={{ 
              width: '100%', 
              accentColor: tracker.settings.widgetAccentColor || '#00f0ff',
              height: '4px',
              cursor: 'pointer'
            }}
          />
        </div>

        <button
          onClick={onClose}
          className="glass-button primary-glow"
          style={{
            width: '100%', 
            borderRadius: '14px',
            fontSize: '11px', 
            letterSpacing: '4px',
            background: tracker.settings.widgetAccentColor || 'var(--accent-color)'
          }}
        >
          APPLY CHANGES
        </button>
      </div>
    </div>
  );
};

export default App;

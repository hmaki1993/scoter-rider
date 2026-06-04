import React, { useState, useEffect, useRef } from 'react';
import { useFuelTracker } from './hooks/useFuelTracker';
import { MapPin, AlertTriangle, Droplets, User, Camera, Smartphone, Fuel, Sun, Moon, Navigation } from 'lucide-react';
import cancelPng from './assets/cancel.png';
import titleTagPng from './assets/title-tag.png';
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
    
    // Toggle class for CSS themes
    root.classList.toggle('app-light', isLight);
    
    root.style.setProperty('--accent-color', tracker.settings.accentColor);
    const theme = THEME_COLORS.find(c => c.hex === tracker.settings.accentColor);
    if (theme) {
      root.style.setProperty('--accent-secondary', theme.secondary);
      // Set RGB components for rgba() usage in buttons
      const hex = theme.hex.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      root.style.setProperty('--accent-rgb', `${r},${g},${b}`);
      
      // ── Elite High-Contrast Mode Switching ──
      if (isLight) {
        root.style.setProperty('--primary-bg', '#ffffff');
        root.style.setProperty('--text-primary', '#000000'); // Ink Black
        root.style.setProperty('--text-secondary', 'rgba(0,0,0,0.7)');
        root.style.setProperty('--glass-bg', 'rgba(255,255,255,0.92)'); // Frosted White
        root.style.setProperty('--glass-border', 'rgba(0,0,0,0.12)');
      } else {
        root.style.setProperty('--primary-bg', '#141417');
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

  // Initial Entrance Animation & Update Check
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
    <div className="app-container" ref={appRef} dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ padding: '24px 24px 110px 24px', width: '100%', maxWidth: '480px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Bar: Language + Theme toggles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '8px' }}>
        <button
          onClick={() => tracker.setSettings({ ...tracker.settings, language: tracker.settings.language === 'ar' ? 'en' : 'ar' })}
          style={{ background: tracker.settings.isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(128,128,128,0.15)', cursor: 'pointer', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
        >
          <span style={{ fontSize: '12px', fontWeight: '900', fontFamily: "'Orbitron', sans-serif", color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)' }}>{tracker.settings.language === 'ar' ? 'EN' : 'AR'}</span>
        </button>
        <button
          onClick={() => tracker.setSettings({ ...tracker.settings, isLightMode: !tracker.settings.isLightMode })}
          style={{ background: tracker.settings.isLightMode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(128,128,128,0.15)', cursor: 'pointer', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
        >
          {tracker.settings.isLightMode ? (
            <Moon size={18} style={{ color: '#000000', opacity: 0.85 }} />
          ) : (
            <Sun size={18} style={{ color: '#ffffff', opacity: 0.85 }} />
          )}
        </button>
      </div>

      {/* Centered Content Block */}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '16px' }}>
        
  
        
        {/* Top Status Pills Bar - Centered */}
        <div 
          style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            width: '100%',
            padding: '24px 12px 14px 12px',
            background: 'transparent',
            marginBottom: '4px'
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
            style={{ position: 'relative', margin: 0, minWidth: '100px', justifyContent: 'center' }}
          >
            <div className="themed-icon" style={{ width: '26px', height: '26px', WebkitMaskImage: 'url(/icon-oil.png)', maskImage: 'url(/icon-oil.png)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Orbitron', sans-serif" }}>
                OIL
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: '900', color: tracker.kmUntilNextOilChange <= 100 ? 'var(--danger-color)' : 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
                {Math.max(0, tracker.kmUntilNextOilChange).toFixed(0)}
              </span>
            </div>
          </div>

          {/* Trip Pill */}
          <div 
            className="elite-status-pill"
            style={{ position: 'relative', margin: 0, minWidth: '100px', justifyContent: 'center' }}
            onClick={() => {
              setConfirmDialog({
                isOpen: true,
                message: tracker.settings.language === 'ar' ? 'هل تريد تصفير عداد الرحلة يدوياً (Trip Reset)؟' : 'Reset Trip meter manually?',
                onConfirm: () => {
                  // Fix: Use Capacitor Preferences instead of localStorage (survives Android WebView restarts)
                  import('@capacitor/preferences').then(({ Preferences }) =>
                    Preferences.set({ key: 'custom_trip_base', value: String(tracker.fuelState.lastOdo) })
                  ).catch(() => {});
                  setTripBase(tracker.fuelState.lastOdo);
                },
                isDanger: false
              });
            }}
          >
            <div className="themed-icon" style={{ width: '26px', height: '26px', WebkitMaskImage: 'url(/icon-route.png)', maskImage: 'url(/icon-route.png)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Orbitron', sans-serif" }}>
                TRIP
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: '900', color: 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
                {Math.max(0, tracker.fuelState.lastOdo - Math.max(tripBase || 0, tracker.logs?.[0]?.odo || 0)).toFixed(1)}
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
                style={{ position: 'relative', margin: 0, minWidth: '100px', justifyContent: 'center' }}
              >
                <div className="themed-icon" style={{ width: '26px', height: '26px', WebkitMaskImage: 'url(/icon-money.png)', maskImage: 'url(/icon-money.png)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Orbitron', sans-serif" }}>
                    EGP
                  </span>
                  <span style={{ fontSize: '13.5px', fontWeight: '900', color: remaining < pricePaid * 0.2 ? 'var(--danger-color)' : 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
                    {remaining.toFixed(0)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Main Status Dashboard Cluster (Integrated Speed & Range) */}
        <div style={{ padding: '30px 20px 40px 20px', textAlign: 'center', position: 'relative' }}>


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
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-primary)" strokeWidth="1.5" opacity={tracker.settings.isLightMode ? 0.7 : 0.4} />
                        <text x={tx} y={ty} fill="var(--text-primary)" fontSize="10" fontWeight="900" textAnchor="middle" alignmentBaseline="middle" opacity={1}>{v}</text>
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
                      stroke={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-secondary)'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{ transition: 'stroke 0.5s' }}
                    />
                    <circle
                      cx="90" cy="95" r="3"
                      fill={tracker.currentSpeed > 80 ? 'var(--danger-color)' : 'var(--accent-secondary)'}
                      style={{ transition: 'fill 0.5s' }}
                    />
                  </g>
                </svg>
                {/* Center Digital Speed - Compact */}
                <div style={{ position: 'absolute', bottom: '15px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', fontFamily: "'Orbitron', sans-serif", color: 'var(--text-primary)', textShadow: 'none', lineHeight: '1' }}>
                    {tracker.currentSpeed || 0}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif", color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('kmh')}</div>
                </div>
              </div>


            </div>
          )}


          <div style={{ position: 'relative', zIndex: 1, marginTop: '16px' }}>
            {/* Warning Pill - Slimmer */}
            {tracker.isWarning && (
              <div style={{
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                justifyContent: 'center',
                padding: '7px 18px', 
                borderRadius: '10px', 
                background: tracker.settings.isLightMode ? 'rgba(185, 28, 28, 0.15)' : 'rgba(255, 59, 48, 0.22)',
                border: tracker.settings.isLightMode ? '2px solid rgba(185, 28, 28, 0.7)' : '2px solid rgba(255, 59, 48, 0.75)', 
                borderBottom: tracker.settings.isLightMode ? '4px solid rgba(185, 28, 28, 0.75)' : '4px solid rgba(255, 59, 48, 0.8)',
                marginBottom: '16px',
                animation: 'pulse 1.8s infinite',
                boxShadow: tracker.settings.isLightMode 
                  ? '0 0 6px rgba(185, 28, 28, 0.15)' 
                  : '0 0 8px rgba(255, 59, 48, 0.2)',
                backdropFilter: 'blur(8px)'
              }}>
                <AlertTriangle size={13} color={tracker.settings.isLightMode ? '#b91c1c' : '#ff3b30'} />
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '900', 
                  color: tracker.settings.isLightMode ? '#b91c1c' : '#ff3b30', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.8px', 
                  fontFamily: "'Orbitron', sans-serif" 
                }}>{t('lowFuel')}</span>
              </div>
            )}
            <div style={{ fontSize: '11px', fontFamily: "'Orbitron', sans-serif", fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
              {t('estimatedRange')}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '3px', marginBottom: '16px' }}>
              <span style={{ fontSize: '46px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif", lineHeight: '1', color: 'var(--accent-color)', textShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                {Math.max(0, tracker.rangeRemainingKm).toFixed(1)}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif", color: 'var(--text-primary)', marginTop: '12px', letterSpacing: '0.5px' }}>{t('kmRemaining')}</span>
            </div>

            {/* Progress Bar - Compact */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{
                height: '100%',
                width: `${tracker.fuelPercentage}%`,
                background: tracker.isDanger
                  ? 'var(--danger-color)'
                  : tracker.isWarning
                    ? 'var(--warning-color)'
                    : 'var(--accent-color)',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'none'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700' }}>
                <span>
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: '900', fontFamily: "'Orbitron', sans-serif", fontSize: '17px' }}>
                    {tracker.fuelState.estimatedFuelLiters.toFixed(1)}
                  </span>
                  {' '}
                  <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: '700' }}>
                    {tracker.settings.language === 'ar' ? 'لتر فاضل' : 'L left'}
                  </span>
                </span>
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: '13.5px', fontWeight: '700', fontFamily: "'Rajdhani', sans-serif" }}>
                <span>
                  {t('emptyAt')}{' '}
                  <span style={{ color: 'var(--accent-secondary)', fontWeight: '900', fontFamily: "'Orbitron', sans-serif", fontSize: '15px' }}>
                    {(tracker.fuelState.lastOdo + tracker.rangeRemainingKm).toFixed(1)}
                  </span>
                  {' '}
                  {t('kmRemaining')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Tracking Prompt (Centered small) */}
        {!tracker.isTracking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%', marginTop: '16px' }}>
            <div
              className="glass-panel"
              style={{
                padding: '28px 24px',
                width: '100%',
                maxWidth: '340px',
                margin: '0 auto',
                background: tracker.settings.isLightMode 
                  ? 'rgba(255, 255, 255, 0.85)' 
                  : 'rgba(30, 30, 40, 0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1.5px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
                borderTop: `1.5px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                alignItems: 'center',
                textAlign: 'center',
                borderRadius: '24px',
                cursor: 'default',
                transition: 'all 0.3s ease',
                boxShadow: tracker.settings.isLightMode 
                  ? '0 12px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' 
                  : '0 16px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              {/* Pulse Icon container */}
              <div style={{
                position: 'relative',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: tracker.settings.isLightMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`
              }}>
                {/* Pulsing ring */}
                <div 
                  className="gps-pulse-ring" 
                  style={{
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '50%',
                    border: '2px dashed var(--accent-color)',
                    opacity: 0.4,
                    animation: 'spin 12s linear infinite'
                  }} 
                />
                <MapPin size={24} style={{ color: 'var(--accent-color)' }} strokeWidth={2} />
              </div>

              <div style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: 'var(--text-primary)', 
                lineHeight: '1.6',
                fontFamily: "'Rajdhani', sans-serif",
                maxWidth: '260px'
              }}>
                {tracker.isStarting ? t('activatingGps') : t('gpsRequired')}
              </div>

              <button
                className="raised-btn"
                disabled={tracker.isStarting}
                style={{
                  width: '190px',
                  height: '46px',
                  borderRadius: '14px',
                  background: tracker.isStarting 
                    ? 'rgba(0, 0, 0, 0.1)' 
                    : 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-secondary) 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  fontFamily: "'Orbitron', sans-serif",
                  opacity: tracker.isStarting ? 0.6 : 1,
                  cursor: tracker.isStarting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: tracker.isStarting 
                    ? 'none' 
                    : '0 6px 20px rgba(var(--accent-rgb), 0.35)',
                  transition: 'all 0.4s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onClick={() => { tracker.clearTrackingError(); tracker.startTracking(false); }}
                onMouseDown={(e) => {
                  if (!tracker.isStarting) {
                    gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1 });
                  }
                }}
                onMouseUp={(e) => {
                  if (!tracker.isStarting) {
                    gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
                  }
                }}
              >
                {tracker.isStarting ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: '14px', height: '14px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      marginRight: '6px'
                    }} />
                    {t('starting')}
                  </>
                ) : (
                  <>
                    <Navigation size={18} style={{ color: '#ffffff' }} strokeWidth={2.5} />
                    {t('startRide')}
                  </>
                )}
              </button>
            </div>

            {/* GPS Error Banner — shows instead of alert() */}
            {tracker.trackingError && (
              <div 
                className="glass-panel"
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  padding: '16px 20px',
                  borderRadius: '20px',
                  background: tracker.settings.isLightMode ? 'rgba(220, 38, 38, 0.05)' : 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid var(--danger-color)',
                  animation: 'fadeIn 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center',
                  textAlign: 'center',
                  boxShadow: tracker.settings.isLightMode ? '0 6px 20px rgba(220, 38, 38, 0.05)' : '0 10px 30px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div style={{ fontSize: '13.5px', color: 'var(--danger-color)', fontWeight: '750', lineHeight: '1.5', fontFamily: "'Rajdhani', sans-serif" }}>
                  {tracker.trackingError.message}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {tracker.trackingError.action === 'openGPS' && (
                    <button
                      className="raised-btn"
                      style={{ 
                        fontSize: '11px', 
                        padding: '8px 16px', 
                        borderRadius: '10px', 
                        color: '#ffffff', 
                        border: 'none', 
                        background: 'linear-gradient(135deg, var(--danger-color), #c62828)',
                        fontWeight: '850',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                      }}
                      onClick={() => {
                        import('@capacitor/core').then(({ registerPlugin }) => {
                          registerPlugin<any>('AlarmPlugin').openLocationSettings().catch(() => { });
                        });
                      }}
                    >
                      {t('openSettings')}
                    </button>
                  )}
                  <button
                    className="raised-btn"
                    style={{ 
                      fontSize: '11px', 
                      padding: '8px 16px', 
                      borderRadius: '10px', 
                      color: 'var(--text-primary)', 
                      border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'}`,
                      background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer'
                    }}
                    onClick={() => tracker.clearTrackingError()}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Professional Control HUB - Unified Bottom Actions */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 'auto', 
        marginBottom: '16px', 
        paddingTop: '20px', 
        width: '100%' 
      }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px'
          }}
        >
          {/* Main Refuel Action */}
          <button
            className="raised-btn"
            style={{
              width: '200px',
              height: '42px',
              gap: '8px',
              borderRadius: '10px',
              background: tracker.settings.isLightMode ? 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)' : 'rgba(255,255,255,0.14)',
              border: tracker.settings.isLightMode ? 'none' : '1px solid rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={() => setShowRefuel(true)}
            onMouseDown={(e) => gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1 })}
            onMouseUp={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'back.out(2)' })}
          >
            <Fuel size={18} style={{ color: 'var(--accent-secondary)' }} strokeWidth={2.5} />
            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: "'Inter', sans-serif" }}>{t('refuel')}</span>
          </button>

          {/* Vertical Divider */}
          <div style={{ 
            width: '2px', 
            height: '24px', 
            background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)',
            margin: '0 4px',
            borderRadius: '1px'
          }} />

          {/* Quick Sync / Manual ODO Action */}
          <button
            className="raised-btn"
            style={{
              height: '42px',
              width: '42px',
              background: tracker.settings.isLightMode ? 'linear-gradient(180deg, #f5f5f7 0%, #e8e8ed 100%)' : 'rgba(255,255,255,0.14)',
              border: tracker.settings.isLightMode ? 'none' : '1px solid rgba(255,255,255,0.22)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setShowSync(true)}
            onMouseDown={(e) => gsap.to(e.currentTarget, { scale: 0.8, duration: 0.1 })}
            onMouseUp={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'back.out(2)' })}
          >
            <div 
              style={{ 
                width: '18px', 
                height: '18px', 
                backgroundColor: 'var(--accent-secondary)',
                WebkitMask: "url('/plus-sign.png') no-repeat center / contain",
                mask: "url('/plus-sign.png') no-repeat center / contain",
                filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.15))'
              }} 
            />
          </button>
        </div>
      </div>



      {/* Premium Bottom Menu */}
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

          {/* Home */}
          <button
            onClick={() => {
              setShowSettings(false);
              setShowRefuel(false);
              setShowSync(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bottom-nav-btn"
            style={{ background: 'transparent', border: 'none' }}
          >
            <img src="/icon-home.png" width={24} height={24} style={{ filter: tracker.settings.isLightMode ? 'brightness(0)' : 'brightness(0) invert(1)', opacity: 0.85 }} />
          </button>

          {/* Vertical Divider */}
          <div style={{
            width: '2px',
            height: '24px',
            background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.45)',
            borderRadius: '1px',
            alignSelf: 'center'
          }} />

          {/* Settings */}
          <button
            className="bottom-nav-btn"
            onClick={() => setShowSettings(true)}
            style={{ background: 'transparent', border: 'none' }}
          >
            <img src="/icon-settings.png" width={24} height={24} style={{ filter: tracker.settings.isLightMode ? 'brightness(0)' : 'brightness(0) invert(1)', opacity: 0.85 }} />
          </button>
        </div>
      )}


      {!tracker.userProfile && (
        <OnboardingModal
          tracker={tracker}
          onComplete={(profile) => {
            tracker.updateUserProfile(profile);
            setTimeout(() => tracker.requestAllPermissions(), 800);
          }}
        />
      )}

      {showRefuel && <RefuelModal tracker={tracker} onClose={() => setShowRefuel(false)} />}
      {showSync && <SyncOdoModal tracker={tracker} onClose={() => setShowSync(false)} />}
      {showSettings && <SettingsModal tracker={tracker} onClose={() => setShowSettings(false)} />}
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
const OnboardingModal = ({ tracker, onComplete }: { tracker: any, onComplete: (profile: any) => void }) => {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [photo, setPhoto] = useState<string | null>(tracker.userProfile?.photoUrl || null);
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
      style={{ position: 'fixed', inset: 0, background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
      onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
    >
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: '32px 24px', 
          textAlign: 'center', 
          background: tracker.settings.isLightMode ? '#ffffff' : '#22222a',
          border: tracker.settings.isLightMode ? '2px solid rgba(0,0,0,0.18)' : '2px solid rgba(255,255,255,0.18)',
          borderBottom: tracker.settings.isLightMode ? '5px solid rgba(0,0,0,0.22)' : '5px solid rgba(255,255,255,0.22)',
          borderRadius: '24px',
          boxShadow: tracker.settings.isLightMode 
            ? '0 4px 0 rgba(0,0,0,0.18), 0 15px 45px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)' 
            : '0 4px 0 rgba(0,0,0,0.6), 0 15px 45px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.4)'
        }}
      >
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
            boxShadow: 'none',
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
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('zoom')}</span>
              <input type="range" min="80" max="250" step="5" value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent-color)' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>
              {t('dragPhoto')}{' '}
              <span onClick={() => fileInputRef.current?.click()} style={{ color: 'var(--accent-color)', textDecoration: 'underline', cursor: 'pointer' }}>{t('change')}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '4px', height: '22px', background: 'var(--accent-color)', borderRadius: '4px', boxShadow: 'none' }} />
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: '900',
            letterSpacing: '1px',
            background: tracker.settings.isLightMode 
              ? 'linear-gradient(90deg, #000 0%, #444 100%)' 
              : 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}> {t('welcomeRider')} </h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('setupProfile')}</p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="fusion-input-group">
              <User size={23} strokeWidth={2.8} color="var(--accent-secondary)" style={{ opacity: 1 }} />
              <input required type="text" className="fusion-input" value={name}
                onChange={e => {
                  const val = e.target.value;
                  setName(val.charAt(0).toUpperCase() + val.slice(1));
                }}
                placeholder={t('riderName')}
                autoCapitalize="words" spellCheck="false" />
            </div>

            <div className="fusion-input-group">
              <Smartphone size={23} strokeWidth={2.8} color="var(--accent-secondary)" style={{ opacity: 1 }} />
              <input required type="tel" className="fusion-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phoneNumber')} />
            </div>

            <div className="fusion-input-group">
              <div className="themed-icon" style={{ width: '23px', height: '23px', opacity: 1, WebkitMaskImage: 'url(/icon-scooter.png)', maskImage: 'url(/icon-scooter.png)' }} />
              <input required type="text" className="fusion-input" value={vehicleType}
                onChange={e => setVehicleType(e.target.value.toUpperCase())}
                placeholder={t('vehicleType') || 'Vehicle'}
                autoCapitalize="characters" spellCheck="false" />
            </div>
          </div>

          <button 
            type="submit" 
            className="onboarding-start-btn"
            disabled={!name.trim() || !phone.trim() || !vehicleType.trim()}
          >
            {t('startRide')}
          </button>
        </form>
      </div>
    </div>
  );
};

// Inline Modal Components for simplicity in this PWA
const SyncOdoModal = ({ tracker, onClose }: { tracker: any, onClose: () => void }) => {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  const [odo, setOdo] = useState(tracker.fuelState.lastOdo.toFixed(1));

  const handleSync = () => {
    const val = Number(odo);
    if (!isNaN(val) && val > 0) {
      tracker.updateCurrentOdo(val);
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.3s ease',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.72)'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          background: tracker.settings.isLightMode ? '#ffffff' : 'var(--card-bg)',
          border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.08)' : 'var(--glass-border)'}`,
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '320px',
          boxShadow: tracker.settings.isLightMode
            ? '0 8px 32px rgba(0,0,0,0.12)'
            : '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={titleTagPng} 
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
              fontWeight: '900',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              textShadow: 'none'
            }}>{t('sync')}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <img src={cancelPng} alt="close" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </button>
        </div>

        {/* Label + delta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{
            fontSize: '11px', fontWeight: '800', letterSpacing: '1px',
            textTransform: 'uppercase',
            color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)'
          }}>{t('odoReading')}</label>
          {Number(odo) > tracker.fuelState.lastOdo && (
            <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: '900' }}>
              +{(Number(odo) - tracker.fuelState.lastOdo).toFixed(1)} KM
            </span>
          )}
        </div>

        {/* Input box */}
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
          <span style={{ fontSize: '12px', fontWeight: '800', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)', letterSpacing: '1px' }}>KM</span>
        </div>

        {/* Hint */}
        <div style={{ fontSize: '12px', fontWeight: '700', textAlign: 'center', marginBottom: '22px', lineHeight: '1.6', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)' }}>
          {tracker.settings.language === 'ar'
            ? 'ظبط الرقم عشان يبقى زي شاشة السكوتر'
            : "Match your scooter's odometer screen"}
        </div>

        {/* Save Button */}
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
  );
};

function RefuelModal({ tracker, onClose }: { tracker: any, onClose: () => void }) {
  const t = (key: string): string => (translations[tracker.settings.language as keyof typeof translations] as any)[key] || key;
  const [odo, setOdo] = useState(tracker.fuelState.lastOdo === 0 ? '' : tracker.fuelState.lastOdo.toFixed(1));
  const [inputValue, setInputValue] = useState('');
  const [isFullTank, setIsFullTank] = useState(false);
  const [inputMode, setInputMode] = useState<'liters' | 'currency'>('currency');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const odometerVal = odo ? Number(odo) : tracker.fuelState.lastOdo;
    if (!odometerVal && odometerVal !== 0) return alert('Please enter the odometer reading.');
    const price = tracker.settings.fuelPricePerLiter || 14.0;
    const tankCap = tracker.settings.tankCapacity || 7.5;
    const currentFuel = tracker.fuelState.estimatedFuelLiters || 0;
    
    let liters: number;
    if (inputValue) {
      liters = inputMode === 'currency' ? Number(inputValue) / price : Number(inputValue);
    } else if (isFullTank) {
      liters = Math.max(0, tankCap - currentFuel);
    } else {
      return alert('Please enter the fuel amount or check Full Tank.');
    }
    
    const pricePaidEGP = inputValue
      ? (inputMode === 'currency' ? Number(inputValue) : Number(inputValue) * price)
      : (isFullTank ? (tankCap - currentFuel) * price : undefined);
    
    tracker.addRefuel(odometerVal, liters, pricePaidEGP, isFullTank);
    onClose();
  };

  const price = tracker.settings.fuelPricePerLiter || 22.25;
  const tankCap = tracker.settings.tankCapacity || 7.0;
  const currentFuel = tracker.fuelState.estimatedFuelLiters || 0;
  const avg = tracker.settings.avgConsumption || 16.6;
  
  let predictedLiters = currentFuel;
  if (inputValue) {
    const added = inputMode === 'currency' ? Number(inputValue) / price : Number(inputValue);
    predictedLiters = Math.min(tankCap, currentFuel + added);
  } else if (isFullTank) {
    predictedLiters = tankCap;
  }
  const predictedRange = predictedLiters * avg;

  return (
    <div
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
        background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.72)'
      }}
    >
      <div
        style={{
          animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          background: tracker.settings.isLightMode ? '#ffffff' : 'var(--card-bg)',
          border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.08)' : 'var(--glass-border)'}`,
          borderRadius: '20px',
          padding: '24px',
          width: '90%',
          maxWidth: '360px',
          boxShadow: tracker.settings.isLightMode
            ? '0 12px 40px rgba(0,0,0,0.12)'
            : '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={titleTagPng} 
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
              fontWeight: '900',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              textShadow: 'none'
            }}>{t('refuel') || 'Refuel'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <img src={cancelPng} alt="close" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Odo Input */}
          <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', background: tracker.settings.isLightMode ? '#ffffff' : 'var(--subtle-bg)', border: `2px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.18)' : 'var(--glass-border)'}`, boxShadow: tracker.settings.isLightMode ? '0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('odoReading')}
              </span>
              {Number(odo) > tracker.fuelState.lastOdo && (
                <span style={{ fontSize: '10px', color: 'var(--accent-color)', fontWeight: '900' }}>
                  (+{(Number(odo) - tracker.fuelState.lastOdo).toFixed(1)} KM)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                className="fusion-input"
                style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif", color: 'var(--text-primary)' }}
                value={odo}
                onChange={e => setOdo(e.target.value)}
              />
              <span style={{ fontSize: '12px', fontWeight: '800', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)' }}>KM</span>
            </div>
          </div>

          {/* Amount Input with Mode Toggles */}
          <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', background: tracker.settings.isLightMode ? '#ffffff' : 'var(--subtle-bg)', border: `2px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.18)' : 'var(--glass-border)'}`, boxShadow: tracker.settings.isLightMode ? '0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.08)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {inputMode === 'currency' ? (tracker.settings.language === 'ar' ? 'المبلغ' : 'Amount') : (tracker.settings.language === 'ar' ? 'الكمية' : 'Liters')}
            </span>
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.1"
                className="fusion-input"
                style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif", color: 'var(--text-primary)' }}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="0.0"
              />
              <div style={{ display: 'flex', background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2px', border: `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.06)' : 'var(--glass-border)'}` }}>
                <button
                  type="button"
                  onClick={() => setInputMode('currency')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputMode === 'currency' ? 'var(--accent-secondary)' : 'transparent',
                    color: inputMode === 'currency' ? '#fff' : (tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)'),
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '800',
                    transition: 'all 0.2s'
                  }}
                >
                  EGP
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('liters')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: inputMode === 'liters' ? 'var(--accent-secondary)' : 'transparent',
                    color: inputMode === 'liters' ? '#fff' : (tracker.settings.isLightMode ? 'rgba(0,0,0,0.8)' : 'var(--text-secondary)'),
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '800',
                    transition: 'all 0.2s'
                  }}
                >
                  Liters
                </button>
              </div>
            </div>
          </div>

          {/* Full Tank Toggle */}
          <div
            onClick={() => setIsFullTank(!isFullTank)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              cursor: 'pointer',
              background: isFullTank
                ? 'rgba(255, 94, 0, 0.08)'
                : (tracker.settings.isLightMode ? '#ffffff' : 'var(--subtle-bg)'),
              border: isFullTank
                ? '2px solid var(--accent-secondary)'
                : `2px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.18)' : 'var(--glass-border)'}`,
              borderRadius: '16px',
              transition: 'all 0.3s ease',
              boxShadow: tracker.settings.isLightMode ? '0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: isFullTank ? 'var(--accent-secondary)' : (tracker.settings.isLightMode ? 'rgba(0,0,0,0.9)' : 'var(--text-secondary)'), textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>{t('isFullTank')}</span>
              <span style={{ fontSize: '9px', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.4)', marginTop: '2px', fontWeight: '700' }}>{tracker.settings.language === 'ar' ? 'مليت التانك للأخر؟' : 'Did you fill to max?'}</span>
            </div>
            <div style={{ width: '42px', height: '22px', borderRadius: '12px', background: isFullTank ? 'var(--accent-secondary)' : (tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'var(--glass-bg)'), border: isFullTank ? 'none' : `1px solid ${tracker.settings.isLightMode ? 'rgba(0,0,0,0.22)' : 'var(--glass-border)'}`, position: 'relative', transition: 'all 0.3s' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: isFullTank ? '24px' : '4px', transition: 'all 0.3s' }} />
            </div>
          </div>

          {/* Predicted Range */}
          <div style={{
            marginTop: '4px', 
            padding: '12px', 
            background: tracker.settings.isLightMode ? 'rgba(50, 97, 68, 0.05)' : 'rgba(0, 240, 255, 0.05)', 
            borderRadius: '14px', 
            border: `1.5px solid ${tracker.settings.isLightMode ? 'rgba(50, 97, 68, 0.12)' : 'rgba(0, 240, 255, 0.1)'}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: tracker.settings.isLightMode ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', marginBottom: '4px' }}>
              {tracker.settings.language === 'ar' ? 'المسافة بعد التفويلة' : 'Predicted Range After Refuel'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-color)' }}>
              {predictedRange.toFixed(1)} <span style={{ fontSize: '12px', fontWeight: '800', opacity: 0.9 }}>KM</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', marginTop: '16px', justifyContent: 'center' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--accent-secondary)',
                border: '2.5px solid var(--accent-secondary)',
                fontWeight: '900',
                padding: '13px',
                fontSize: '13px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: '2px',
                textTransform: 'uppercase',
                boxShadow: 'none',
                transition: 'all 0.2s'
              }}
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ tracker, onClose }: { tracker: any, onClose: () => void }) {
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

  const [avg, setAvg] = useState((tracker.settings.avgConsumption || 30).toString());
  const [cap, setCap] = useState((tracker.settings.tankCapacity || 7.5).toString());
  const [price, setPrice] = useState((tracker.settings.fuelPricePerLiter || 14.5).toString());
  const [threshold] = useState((tracker.settings.warningThreshold || 15).toString());
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleSave = () => {
    tracker.updateUserProfile({ ...tracker.userProfile, name, phone, vehicleType: vehicle, photoUrl: photo, photoPosition: objPos });
    tracker.setSettings({ 
      ...tracker.settings, 
      avgConsumption: Number(avg), 
      tankCapacity: Number(cap), 
      fuelPricePerLiter: Number(price), 
      warningThreshold: Number(threshold),
      isLightMode: tracker.settings.isLightMode
    });
    onClose();
  };

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

      {/* Immersive Header - Without X Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="themed-icon" style={{ width: '28px', height: '28px', WebkitMaskImage: 'url(/circle-arrow.png)', maskImage: 'url(/circle-arrow.png)' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>{t('settings')}</h2>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 80px 24px' }}>

        {/* Dynamic Avatar Setup - Sleek Circular Design */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => setIsDragging(false)}
            onClick={() => { if (!hasMovedRef.current) fileInputRef.current?.click(); }}
            style={{ 
              width: '100px', height: '100px', 
              borderRadius: '50%', 
              border: '3px solid var(--accent-secondary)', 
              margin: '0 auto 12px', 
              overflow: 'hidden', 
              cursor: isDragging ? 'grabbing' : (photo ? 'move' : 'pointer'), 
              position: 'relative', 
              touchAction: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12), inset 0 2px 4px rgba(0,0,0,0.1)',
              background: 'var(--glass-bg)'
            }}
          >
            {photo ? (
              <img src={photo} draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${objPos.x}px, ${objPos.y}px) scale(${objPos.scale / 100})` }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={26} color="var(--accent-secondary)" />
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.5)', padding: '4px 0', fontSize: '9px', fontWeight: '900', color: '#fff' }}>{t('edit')}</div>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = x => setPhoto(x.target?.result as string); r.readAsDataURL(f); } }} />
          {photo && <input type="range" min="10" max="400" value={objPos.scale} onChange={e => setObjPos((p: any) => ({ ...p, scale: Number(e.target.value) }))} style={{ width: '150px', accentColor: 'var(--accent-secondary)' }} />}
        </div>

        <div style={{ height: '1px', background: 'var(--glass-border)', marginBottom: '32px' }} />

        {/* Section 1: PROFILE */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/programmer.png" alt="user" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>{t('userProfile') || 'USER PROFILE'}</label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="fusion-input-group">
              <User size={23} strokeWidth={2.8} color="var(--accent-secondary)" style={{ opacity: 1 }} />
              <input className="fusion-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" />
            </div>
            <div className="fusion-input-group">
              <Smartphone size={23} strokeWidth={2.8} color="var(--accent-secondary)" style={{ opacity: 1 }} />
              <input type="tel" className="fusion-input" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Phone Number" />
            </div>
            <div className="fusion-input-group">
              <div className="themed-icon" style={{ width: '23px', height: '23px', opacity: 1, WebkitMaskImage: 'url(/icon-scooter.png)', maskImage: 'url(/icon-scooter.png)' }} />
              <input className="fusion-input" value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Vehicle Type" />
            </div>
          </div>
        </div>

        {/* Section 2: SPECS */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/motorcycle.png" alt="vehicle" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>{t('vehicleSpecs') || 'VEHICLE SPECS'}</label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('avgConsumption')}</span>
              <input type="number" className="fusion-input" style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }} value={avg} onChange={e => setAvg(e.target.value)} />
            </div>
            <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('tankCapacity')}</span>
              <input type="number" className="fusion-input" style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }} value={cap} onChange={e => setCap(e.target.value)} />
            </div>
          </div>
          <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('fuelPrice')}</span>
            <input type="number" className="fusion-input" style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }} value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>

        {/* Section 3: MAINTENANCE */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/mechanic.png" alt="mechanic" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>{t('maintenance')}</label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="fusion-input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('oilChangeInterval')}</span>
              <input 
                type="number" 
                className="fusion-input" 
                style={{ width: '100%', fontSize: '18px', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }} 
                value={tracker.settings.oilChangeInterval === 0 ? '' : tracker.settings.oilChangeInterval} 
                onChange={e => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  tracker.setSettings({ ...tracker.settings, oilChangeInterval: val });
                }} 
              />
            </div>
            <div className="fusion-input-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('lastOilChangeOdo')}</span>
              <div style={{ fontSize: '16px', color: 'var(--accent-secondary)', fontWeight: '800', fontFamily: "'Orbitron', sans-serif" }}>{tracker.settings.lastOilChangeOdo} KM</div>
            </div>
          </div>
        </div>

        {/* Section 4: THEME */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <img src="/paint.png" alt="theme" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <label className="fusion-label" style={{ margin: 0, color: 'var(--accent-secondary)', fontWeight: '700' }}>{t('appTheme')}</label>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', justifyContent: 'center', padding: '4px 0' }}>
            {THEME_COLORS.map(c => {
              const isSelected = tracker.settings.accentColor === c.hex;
              const isBrightColor = c.hex === '#ffcc00' || c.hex === '#5ac8fa'; // Gold and Cyan are very light/bright
              return (
                <div
                  key={c.name}
                  onClick={() => tracker.setSettings({ ...tracker.settings, accentColor: c.hex })}
                  className={`theme-dot-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    background: c.secondary === c.hex ? c.hex : `linear-gradient(135deg, ${c.hex}, ${c.secondary})`
                  }}
                >
                  {isSelected && (
                    <div className={`theme-dot-indicator ${isBrightColor ? 'dark-dot' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>


        {/* Premium Action Buttons - Cancel & Save */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px', marginBottom: '16px' }}>
          <button 
            className="settings-modal-btn settings-btn-cancel" 
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button 
            className="settings-modal-btn settings-btn-save" 
            onClick={handleSave}
          >
            {t('save')}
          </button>
        </div>

        {/* Premium Danger Zone Section */}
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '16px', 
          borderTop: '1px solid var(--glass-border)',
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '12px',
          width: '100%',
          textAlign: 'center'
        }}>
          <button
            className="raised-danger-btn"
            onClick={() => setConfirmReset(true)}
            style={{
              padding: '8px 24px',
              borderRadius: '12px',
              gap: '12px'
            }}
          >
            <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img 
                src="/icon-reset.png" 
                alt="reset" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: 'block'
                }} 
              />
            </div>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '900', 
              color: '#ffffff', 
              textTransform: 'uppercase', 
              letterSpacing: '1.5px', 
              fontFamily: "'Orbitron', sans-serif" 
            }}>
              {t('resetApp')}
            </span>
          </button>
        </div>

      </div>

      {/* Danger Zone Full Blur Modal Overlay */}
      {confirmReset && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: tracker.settings.isLightMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{ 
            maxWidth: '300px', width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            background: tracker.settings.isLightMode ? '#ffffff' : '#22222a',
            border: tracker.settings.isLightMode ? '2px solid rgba(0,0,0,0.18)' : '2px solid rgba(255,255,255,0.18)',
            borderBottom: tracker.settings.isLightMode ? '5px solid rgba(0,0,0,0.22)' : '5px solid rgba(255,255,255,0.22)',
            borderRadius: '20px',
            padding: '32px 28px',
            boxShadow: tracker.settings.isLightMode 
              ? '0 4px 0 rgba(0,0,0,0.18), 0 12px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)' 
              : '0 4px 0 rgba(0,0,0,0.6), 0 12px 48px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.4)'
          }}>
            <AlertTriangle size={48} color="var(--danger-color)" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', fontFamily: "'Orbitron', sans-serif" }}>
              {lang === 'ar' ? 'مسح البيانات!' : 'RESET SYSTEM!'}
            </h3>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
              {lang === 'ar' ? 'هل أنت متأكد من مسح جميع البيانات والإعدادات نهائياً؟' : 'Are you sure you want to permanently erase all tracking data and settings?'}
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
                  fontFamily: "'Rajdhani', sans-serif"
                }}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => { tracker.resetData(); onClose(); }} 
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
                  boxShadow: '0 2px 8px rgba(229,57,53,0.35)'
                }}
              >
                {t('areYouSure')}
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

  const getIcon = () => {
    if (isDanger) return <AlertTriangle size={26} color="#ff3b30" />;
    const msgLower = message.toLowerCase();
    if (msgLower.includes('oil') || msgLower.includes('زيت')) {
      return <Droplets size={26} color="#ff5e00" />;
    }
    if (msgLower.includes('trip') || msgLower.includes('رحلة')) {
      return <MapPin size={26} color="#326144" />;
    }
    return <AlertTriangle size={26} color="#ff5e00" />;
  };

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
          <img src={cancelPng} alt="close" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
        </button>
      </div>
    </div>
  );
};
// ── Widget Mini Settings Card (Live Customization) ──────────────────────────
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
            <img src={cancelPng} alt="close" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
          </button>
        </div>

        {/* Color Sped-Dial */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginBottom: '32px' }}>
          {colors.map(c => {
            const isSelected = tracker.settings.widgetAccentColor === c;
            const isBrightColor = c === '#ffffff' || c === '#ffcc00' || c === '#00ff64' || c === '#00f0ff';
            return (
              <button
                key={c}
                onClick={() => {
                  tracker.setWidgetSettings({ widgetAccentColor: c });
                }}
                className={`color-dot-btn ${isSelected ? 'active' : ''}`}
                style={{
                  background: c,
                  color: c // for currentColor shadow
                }}
              >
                {isSelected && (
                  <div className={`theme-dot-indicator ${isBrightColor ? 'dark-dot' : ''}`} />
                )}
              </button>
            );
          })}
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

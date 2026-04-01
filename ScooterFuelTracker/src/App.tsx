import React, { useState, useEffect, useRef } from 'react';
import { useFuelTracker, playTone, stopTone } from './hooks/useFuelTracker';
import { MapPin, AlertTriangle, Settings, Droplets, Bell, BellOff, User, Camera, Smartphone, Music, Fuel, Trash2, X } from 'lucide-react';
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
      
      // ── Elite High-Contrast Mode Switching ──
      if (isLight) {
        root.style.setProperty('--primary-bg', '#ffffff');
        root.style.setProperty('--text-primary', '#000000'); // Ink Black
        root.style.setProperty('--text-secondary', 'rgba(0,0,0,0.7)');
        root.style.setProperty('--glass-bg', 'rgba(255,255,255,0.92)'); // Frosted White
        root.style.setProperty('--glass-border', 'rgba(0,0,0,0.12)');
      } else {
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
  const tFunc = (key: string, val: string): string => {
    const fn = (translations[lang] as any)?.[key];
    return typeof fn === 'function' ? fn(val) : "";
  };
  const [showRefuel, setShowRefuel] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWidgetMiniSettings, setShowWidgetMiniSettings] = useState(false);
  const [showPhotoZoom, setShowPhotoZoom] = useState(false);
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
      clearTimeout(timer);
      if (stateListener) stateListener.remove();
    };
  }, []);

  return (
    <div className="app-container" ref={appRef} dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ padding: '24px 24px 8px 24px', width: '100%', maxWidth: '480px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>


      {/* Immersive Header Section */}

      {/* Header - App Name small top-left */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        direction: 'ltr', // Absolute lock to LTR to keep logo left
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'nowrap',
        width: '100%',
        gap: 'var(--header-gap)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          paddingRight: '4px',
          direction: 'ltr'
        }}>
          <h1 className="logo-text" style={{ 
            margin: 0, 
            fontSize: 'var(--logo-font-size)',
            background: tracker.settings.isLightMode 
              ? 'linear-gradient(135deg, #111 0%, #444 50%, var(--accent-secondary) 100%)' 
              : 'linear-gradient(135deg, #fff 0%, #fff 50%, var(--accent-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>{t('appName')}</h1>
          <div className="subtitle-text" style={{ marginTop: '4px', color: 'var(--text-secondary)', fontWeight: '800' }}>{t('premiumSystem')}</div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 'var(--header-gap)',
          flexShrink: 0,
          background: 'none',
          padding: '0',
          borderRadius: '0',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          border: 'none',
          boxShadow: 'none'
        }}>
          {/* Single Language Toggle Box */}
          <button
            onClick={() => tracker.setSettings({ ...tracker.settings, language: tracker.settings.language === 'ar' ? 'en' : 'ar' })}
            style={{
              width: 'var(--header-btn-size)', height: 'var(--header-btn-size)', borderRadius: '10px',
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              color: 'var(--accent-secondary)', fontWeight: '900', fontSize: '9px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
          >
            {tracker.settings.language === 'ar' ? 'EN' : 'AR'}
          </button>

          {/* Tracking Status Badge */}
          <button
            onClick={() => {
              if (tracker.isTracking) tracker.stopTracking();
              else tracker.startTracking(false);
            }}
            style={{
              width: 'var(--header-btn-size)', height: 'var(--header-btn-size)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: 'none',
              background: 'none'
            }}
          >
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: tracker.isTracking ? '#00f064' : '#ff3366',
              boxShadow: tracker.isTracking ? '0 0 12px #00f064' : '0 0 12px #ff3366',
              animation: tracker.isTracking ? 'pulse 1.5s infinite' : 'none'
            }} />
          </button>

          <button
            style={{
              width: 'var(--header-btn-size)', height: 'var(--header-btn-size)', borderRadius: '50%',
              background: 'none',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.3s ease',
              padding: 0
            }}
            onClick={() => {
              stopTone();
              tracker.setSettings({ ...tracker.settings, enableAlerts: !tracker.settings.enableAlerts });
            }}
          >
            {tracker.settings.enableAlerts ? (
              <Bell size={24} color="var(--accent-secondary)" strokeWidth={2.5} />
            ) : (
              <BellOff size={24} color="var(--text-secondary)" opacity={0.6} strokeWidth={2} />
            )}
          </button>

          <button
            style={{
              width: 'var(--header-btn-size)', height: 'var(--header-btn-size)', borderRadius: '50%',
              background: 'none',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0
            }}
            onClick={() => setShowSettings(true)}
          >
            <Settings size={24} color="var(--text-primary)" strokeWidth={2} />
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
          <div
            onClick={() => setShowPhotoZoom(true)}
            style={{
              width: '52px', height: '52px', borderRadius: '14px',
              overflow: 'hidden', border: '1.5px solid var(--accent-color)',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.1)',
              flexShrink: 0, background: 'rgba(0, 240, 255, 0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-in', transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {tracker.userProfile.photoUrl ? (
              <img
                src={tracker.userProfile.photoUrl}
                alt="Rider"
                style={{
                  width: '100%', height: '100%', objectFit: 'contain', background: '#000',
                  transform: tracker.userProfile.photoPosition
                    ? `translate(${(tracker.userProfile.photoPosition.x || 0) * 0.48}px, ${(tracker.userProfile.photoPosition.y || 0) * 0.48}px) scale(${(tracker.userProfile.photoPosition.scale || 100) / 100})`
                    : 'scale(1)',
                  transformOrigin: 'center'
                }}
              />
            ) : (
              <User size={26} color="var(--accent-color)" style={{ opacity: 0.6 }} />
            )}
          </div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '850',
              background: 'linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent-color) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '6px',
              opacity: 1,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>
              {t('welcomeBack')}
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '950',
              background: tracker.settings.isLightMode 
                ? 'linear-gradient(135deg, #000 0%, #333 100%)' 
                : 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1.5px',
              lineHeight: '1',
              filter: tracker.settings.isLightMode ? 'none' : 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))'
            }}>
              {tracker.userProfile.name}
            </div>
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

          {/* Maintenance / Status Pill - Prominent & Interactive */}
          <div 
            className={`elite-status-pill ${tracker.kmUntilNextOilChange <= 100 ? 'oil-warning-pulse' : ''}`}
            onClick={() => {
              if (window.confirm(tracker.settings.language === 'ar' ? 'هل قمت بتغيير الزيت بالفعل؟' : 'Have you actually changed the oil?')) {
                tracker.recordOilChange(tracker.fuelState.lastOdo);
              }
            }}
            style={{
              borderColor: tracker.kmUntilNextOilChange <= 100 ? 'var(--danger-color)' : 'rgba(255,255,255,0.1)',
              background: tracker.kmUntilNextOilChange <= 100 ? 'rgba(255, 51, 102, 0.1)' : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            {tracker.kmUntilNextOilChange <= 100 ? (
              <>
                <Droplets size={12} color="var(--danger-color)" fill="var(--danger-color)" />
                <span style={{ fontSize: '10px', fontWeight: '950', color: 'var(--danger-color)', letterSpacing: '0.5px' }}>
                  OIL: {Math.max(0, tracker.kmUntilNextOilChange).toFixed(0)} KM
                </span>
              </>
            ) : (
              <>
                <div className="pulse-badge-dot" />
                <span className="pill-text" style={{ fontSize: '9px', fontWeight: '950', color: 'var(--text-primary)', letterSpacing: '1px' }}>
                  OIL: {Math.max(0, tracker.kmUntilNextOilChange).toFixed(0)} KM
                </span>
              </>
            )}
          </div>

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
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-secondary)" strokeWidth="1.5" opacity={tracker.settings.isLightMode ? 0.5 : 0.3} />
                        <text x={tx} y={ty} fill="var(--text-primary)" fontSize="10" fontWeight="900" textAnchor="middle" alignmentBaseline="middle" opacity={tracker.settings.isLightMode ? 0.9 : 0.6}>{v}</text>
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
                      style={{ filter: 'drop-shadow(0 0 2px currentColor)', transition: 'stroke 0.5s' }}
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
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', textShadow: tracker.settings.isLightMode ? 'none' : '0 0 10px rgba(0, 240, 255, 0.3)', lineHeight: '1' }}>
                    {tracker.currentSpeed || 0}
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{t('kmh')}</div>
                </div>
              </div>

              {/* Diagnostic Panel for GPS Fixes */}
              <div style={{
                marginTop: '12px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (tracker.trackingError ? 'rgba(255, 51, 51, 0.3)' : 'rgba(255,255,255,0.05)'),
                borderRadius: '12px', padding: '8px 16px',
                display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {tracker.trackingError ? <AlertTriangle size={10} color="#ff6666" /> : null}
                    {t('satelliteFixes')}: <strong style={{ color: tracker.trackingError ? '#ff6666' : 'var(--accent-color)' }}>{tracker.gpsUpdateCount}</strong>
                  </span>
                  <span>{t('lastFix')}: <strong style={{ color: 'var(--accent-color)' }}>{tracker.lastGpsTime || '--:--'}</strong></span>
                </div>
                {tracker.trackingError && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: '#ff6666', fontSize: '9px', fontWeight: 'bold' }}>
                      ⚠️ {tracker.trackingError.message}
                    </div>
                    {tracker.trackingError.action === 'openGPS' && (
                      <button
                        onClick={() => tracker.startTracking()}
                        className="glass-button"
                        style={{
                          padding: '4px 12px', fontSize: '9px', borderColor: 'rgba(255, 51, 102, 0.4)',
                          background: 'rgba(255, 51, 102, 0.1)', color: '#ffcccc', minHeight: 'unset'
                        }}
                      >
                        {t('openSettings')}
                      </button>
                    )}
                  </div>
                )}
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
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--danger-color)' }}>{t('lowFuel')}</span>
              </div>
            )}
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.5 }}>
              {t('estimatedRange')}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '3px', marginBottom: '16px' }}>
              <span style={{ fontSize: '46px', fontWeight: '800', lineHeight: '1', color: tracker.isDanger ? 'var(--danger-color)' : 'var(--text-primary)', textShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
                {Math.max(0, tracker.rangeRemainingKm).toFixed(1)}
              </span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '8px' }}>{t('kmRemaining')}</span>
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
                    : `linear-gradient(90deg, var(--accent-color), var(--accent-secondary))`,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: tracker.isTracking ? `0 0 10px var(--accent-secondary)` : 'none'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>
                <Droplets size={14} />
                <span>
                  {tFunc('litersLeft', tracker.fuelState.estimatedFuelLiters.toFixed(1))}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500' }}>
                {t('emptyAt')} <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>{(tracker.fuelState.lastOdo + tracker.rangeRemainingKm).toFixed(1)}</span> {t('kmRemaining')}
                <button 
                  onClick={() => setShowSync(true)} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-color)', padding: '2px 4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', marginLeft: '4px', opacity: 0.8 }}
                  title={t('sync')}
                >
                  <MapPin size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Start Tracking Prompt (Centered small) */}
        {!tracker.isTracking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
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
                {tracker.isStarting ? t('activatingGps') : t('gpsRequired')}
              </div>
              <button
                className="glass-button"
                disabled={tracker.isStarting}
                style={{
                  background: tracker.isStarting ? 'rgba(0, 240, 255, 0.02)' : 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid var(--accent-color)',
                  color: 'var(--accent-color)',
                  fontWeight: '700',
                  padding: '6px 16px',
                  fontSize: '11px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  opacity: tracker.isStarting ? 0.6 : 1,
                  cursor: tracker.isStarting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => { tracker.clearTrackingError(); tracker.startTracking(false); }}
              >
                {tracker.isStarting ? (
                  <>
                    <span style={{
                      display: 'inline-block',
                      width: '10px', height: '10px',
                      border: '2px solid var(--accent-color)',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    {t('starting')}
                  </>
                ) : t('startRide')}
              </button>
            </div>

            {/* GPS Error Banner — shows instead of alert() */}
            {tracker.trackingError && (
              <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'rgba(255, 51, 51, 0.08)',
                border: '1px solid rgba(255, 51, 51, 0.35)',
                animation: 'fadeIn 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#ff6666', fontWeight: '700', lineHeight: '1.5' }}>
                  {tracker.trackingError.message}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {tracker.trackingError.action === 'openGPS' && (
                    <button
                      className="glass-button"
                      style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '12px', color: '#ff6666', borderColor: 'rgba(255,51,51,0.4)', background: 'rgba(255,51,51,0.05)' }}
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
                    className="glass-button"
                    style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '12px', color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.1)' }}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', marginTop: 'auto', marginBottom: '8px', paddingTop: '40px' }}>

        <button
          className="premium-refuel-btn"
          style={{
            width: '250px',
            height: '44px',
            gap: '8px',
            borderRadius: '12px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid var(--accent-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.4s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
          }}
          onClick={() => setShowRefuel(true)}
          onMouseDown={(e) => {
            gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1 });
          }}
          onMouseUp={(e) => {
            gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
          }}
        >
          <Fuel size={16} style={{ color: 'var(--accent-color)' }} strokeWidth={2.5} />
          <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '8px', fontFamily: "'Inter', sans-serif", marginLeft: '8px' }}>{t('refuel')}</span>
        </button>
      </div>

      {/* Fusion HUD Footer */}
      <div style={{
        width: '100%',
        padding: '0 0 10px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
          <div className="pulse-dot" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-color)', boxShadow: '0 0 8px var(--accent-color)' }} />
          <span style={{ fontSize: '9px', fontWeight: '950', color: '#fff', letterSpacing: '3px', textTransform: 'uppercase', textShadow: '0 0 4px rgba(255,255,255,0.3)' }}>FUSION SYSTEM ACTIVE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '7.5px', color: '#fff', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.2 }}>RIDE HUD DASHBOARD • V1.2.0 • ELITE EDITION</span>
          <div style={{ fontSize: '7.5px', color: '#fff', fontWeight: '900', letterSpacing: '2px', textTransform: 'uppercase' }}>
            <span style={{ opacity: 0.3 }}>SYSTEM ARCHITECT: </span>
            <span style={{
              opacity: 1,
              background: 'linear-gradient(90deg, var(--accent-secondary) 0%, var(--accent-color) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '950',
              letterSpacing: '2px'
            }}>AHMED HAMAKI</span>
          </div>
        </div>
      </div>

      {/* MODALS */}
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
      {updateInfo && <UpdateModal info={updateInfo} tracker={tracker} onClose={() => setUpdateInfo(null)} />}

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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center', boxShadow: tracker.settings.isLightMode ? '0 20px 60px rgba(0,0,0,0.1)' : '0 20px 60px rgba(0,0,0,0.4)' }}>
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
          <div style={{ width: '4px', height: '22px', background: 'var(--accent-color)', borderRadius: '4px', boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)' }} />
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
          <label className="fusion-label" style={{ marginBottom: '6px', fontSize: '9px' }}>{t('riderName')}</label>
          <div className="fusion-input-group">
            <User size={18} color="var(--accent-color)" opacity={0.5} />
            <input required type="text" className="fusion-input" value={name}
              onChange={e => {
                const val = e.target.value;
                setName(val.charAt(0).toUpperCase() + val.slice(1));
              }}
              autoCapitalize="words" spellCheck="false" />
          </div>

          <label className="fusion-label" style={{ marginBottom: '6px', fontSize: '9px' }}>{t('phoneNumber')}</label>
          <div className="fusion-input-group">
            <Smartphone size={18} color="var(--accent-color)" opacity={0.5} />
            <input required type="tel" className="fusion-input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <label className="fusion-label" style={{ marginBottom: '6px', fontSize: '9px' }}>{t('vehicleType') || 'Vehicle'}</label>
          <div className="fusion-input-group">
            <Settings size={18} color="var(--accent-color)" opacity={0.5} />
            <input required type="text" className="fusion-input" value={vehicleType}
              onChange={e => setVehicleType(e.target.value.toUpperCase())}
              autoCapitalize="characters" spellCheck="false" />
          </div>

          <button type="submit" className="glass-button"
            disabled={!name.trim() || !phone.trim() || !vehicleType.trim()}
            style={{
              alignSelf: 'center', padding: '10px 28px', borderRadius: '20px',
              background: 'transparent',
              border: '2px solid var(--accent-color)', color: 'var(--text-primary)', fontWeight: '900', marginTop: '20px',
              textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px',
              opacity: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 0.3 : 1,
              cursor: (!name.trim() || !phone.trim() || !vehicleType.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: tracker.settings.isLightMode ? 'none' : '0 0 15px rgba(0, 240, 255, 0.08)'
            }}>
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
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.3s ease', backdropFilter: 'blur(12px)', background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.6)' }}>
      <div
        className="modal-content glass-panel"
        onClick={e => e.stopPropagation()}
        style={{
          animation: 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          boxShadow: tracker.settings.isLightMode ? '0 20px 60px rgba(0,0,0,0.1)' : '0 20px 60px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '18px', background: 'var(--accent-color)', borderRadius: '4px', boxShadow: '0 0 12px color-mix(in srgb, var(--accent-color), transparent 60%)' }} />
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontFamily: "'Inter', sans-serif",
              fontWeight: '900',
              letterSpacing: '1px',
              background: tracker.settings.isLightMode 
                ? 'linear-gradient(90deg, #000 0%, #444 100%)' 
                : 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase'
            }}>{t('sync')}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>✕</button>
        </div>

        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', display: 'block', opacity: 0.8 }}>{t('odoReading')}</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              step="0.1"
              value={odo}
              onChange={e => setOdo(e.target.value)}
              style={{
                width: '140px',
                margin: '0 auto',
                display: 'block',
                padding: '10px 12px',
                fontSize: '22px',
                fontWeight: '900',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                textAlign: 'center',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                outline: 'none',
              }}
              autoFocus
            />
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '12px', lineHeight: '1.4', textAlign: 'center' }}>
            {tracker.settings.language === 'ar' ? 'ظبط الرقم عشان يبقى زي شاشة السكوتر بالظبط' : 'Adjust the value to match your scooter\'s screen'} <br />
            <span style={{ color: 'var(--accent-color)', opacity: 0.6 }}>{tracker.settings.language === 'ar' ? 'حسابات البنزين هتتحدث تلقائياً' : 'Fuel range will be updated automatically'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            className="glass-button"
            style={{
              width: 'fit-content',
              padding: '10px 24px',
              fontWeight: '800',
              background: 'transparent',
              color: 'var(--accent-color)',
              fontSize: '13px',
              border: '1px solid var(--accent-color)',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 15px color-mix(in srgb, var(--accent-color), transparent 80%)'
            }}
            onClick={handleSync}
          >
            {t('save')}
          </button>
        </div>
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
    let liters: number;
    if (inputValue) {
      liters = inputMode === 'currency' ? Number(inputValue) / price : Number(inputValue);
    } else if (isFullTank) {
      liters = tankCap;
    } else {
      return alert('Please enter the fuel amount or check Full Tank.');
    }
    tracker.addRefuel(odometerVal, liters, undefined, isFullTank);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '32px 24px', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: tracker.settings.isLightMode ? '0 20px 60px rgba(0,0,0,0.1)' : '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '4px', height: '18px', background: 'var(--accent-color)', borderRadius: '4px' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', textTransform: 'uppercase' }}>Refuel</h2>
          </div>
          <div style={{ display: 'flex', background: 'var(--glass-bg)', borderRadius: '12px', padding: '4px', border: '1px solid var(--glass-border)' }}>
            <button type="button" onClick={() => setInputMode('currency')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: inputMode === 'currency' ? 'var(--accent-secondary)' : 'transparent', color: inputMode === 'currency' ? '#fff' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: '800' }}>EGP</button>
            <button type="button" onClick={() => setInputMode('liters')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: inputMode === 'liters' ? 'var(--accent-secondary)' : 'transparent', color: inputMode === 'liters' ? '#fff' : 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontWeight: '800' }}>Liters</button>
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>{t('odoReading')}</label>
            <input type="number" step="0.1" value={odo} onChange={e => setOdo(e.target.value)} style={{ width: '130px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '800', textAlign: 'center', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
              {inputMode === 'currency' ? (tracker.settings.language === 'ar' ? 'المبلغ (جنيه)' : 'Amount (EGP)') : (tracker.settings.language === 'ar' ? 'الكمية (لتر)' : 'Amount (L)')}
            </label>
            <div style={{ position: 'relative' }}>
              <input type="number" step="0.1" value={inputValue} onChange={e => setInputValue(e.target.value)} style={{ width: '130px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '800', textAlign: 'center', outline: 'none' }} autoFocus />
            </div>
          </div>
          <div onClick={() => setIsFullTank(!isFullTank)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', background: isFullTank ? 'color-mix(in srgb, var(--accent-color), transparent 90%)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '14px', marginTop: '4px', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: isFullTank ? 'var(--accent-secondary)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>{t('isFullTank')}</span>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)', opacity: 0.6 }}>{tracker.settings.language === 'ar' ? 'مليت التانك للأخر؟' : 'Did you fill to max?'}</span>
            </div>
            <div style={{ width: '42px', height: '22px', borderRadius: '12px', background: isFullTank ? 'var(--accent-secondary)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)', position: 'relative', transition: 'all 0.3s' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: isFullTank ? '24px' : '4px', transition: 'all 0.3s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
            <button type="button" onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', fontWeight: '600', padding: '10px 20px', fontSize: '13px', borderRadius: '10px' }}>{t('cancel')}</button>
            <button type="submit" style={{ background: 'var(--accent-secondary)', color: '#fff', border: 'none', fontWeight: '900', padding: '10px 24px', fontSize: '13px', borderRadius: '12px', boxShadow: '0 8px 25px rgba(255, 94, 0, 0.25)' }}>{t('save')}</button>
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
  const [threshold, setThreshold] = useState((tracker.settings.warningThreshold || 15).toString());
  const [wColor, setWColor] = useState(tracker.settings.widgetAccentColor || '#00f0ff');
  const [wOpacity, setWOpacity] = useState(tracker.settings.widgetOpacity ?? 100);

  const [confirmReset, setConfirmReset] = useState(false);
  const [toneDropOpen, setToneDropOpen] = useState(false);
  const toneDropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close tone dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toneDropRef.current && !toneDropRef.current.contains(e.target as Node)) {
        setToneDropOpen(false);
      }
    };
    if (toneDropOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [toneDropOpen]);

  const handleSave = () => {
    tracker.updateUserProfile({ ...tracker.userProfile, name, phone, vehicleType: vehicle, photoUrl: photo, photoPosition: objPos });
    tracker.setSettings({ 
      ...tracker.settings, 
      avgConsumption: Number(avg), 
      tankCapacity: Number(cap), 
      fuelPricePerLiter: Number(price), 
      warningThreshold: Number(threshold),
      isLightMode: tracker.settings.isLightMode,
      widgetAccentColor: wColor,
      widgetOpacity: wOpacity
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--primary-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>

      {/* Immersive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '4px', height: '18px', background: 'var(--accent-secondary)', borderRadius: '4px', boxShadow: '0 0 10px var(--accent-secondary)' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>{t('settings')}</h2>
        </div>
        <button onClick={onClose} style={{ background: 'var(--glass-border)', border: 'none', color: 'var(--text-primary)', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px 24px' }}>

        {/* Dynamic Avatar Setup */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => setIsDragging(false)}
            onClick={() => { if (!hasMovedRef.current) fileInputRef.current?.click(); }}
            style={{ width: '100px', height: '100px', borderRadius: '24px', border: '2px solid var(--accent-secondary)', margin: '0 auto 12px', overflow: 'hidden', cursor: isDragging ? 'grabbing' : (photo ? 'move' : 'pointer'), position: 'relative', touchAction: 'none' }}>
            {photo ? <img src={photo} draggable="false" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: `translate(${objPos.x}px, ${objPos.y}px) scale(${objPos.scale / 100})`, background: '#000' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={26} color="var(--accent-secondary)" /></div>}
            <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)', padding: '4px 0', fontSize: '9px', fontWeight: '900' }}>{t('edit')}</div>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = x => setPhoto(x.target?.result as string); r.readAsDataURL(f); } }} />
          {photo && <input type="range" min="10" max="400" value={objPos.scale} onChange={e => setObjPos((p: any) => ({ ...p, scale: Number(e.target.value) }))} style={{ width: '150px', accentColor: 'var(--accent-secondary)' }} />}
        </div>

        <div style={{ height: '1px', background: 'var(--glass-border)', marginBottom: '32px' }} />

        {/* Section 1: PROFILE */}
        <div style={{ marginBottom: '32px' }}>
          <label className="fusion-label" style={{ marginBottom: '16px', color: tracker.settings.accentColor === '#326144' ? '#4ade80' : 'var(--accent-secondary)' }}>{t('userProfile') || 'USER PROFILE'}</label>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '16px 0' }}>
              <User size={18} color="#ff9800" opacity={0.6} />
              <input className="fusion-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={{ background: 'transparent', color: 'var(--text-primary)', fontWeight: '700' }} />
            </div>
            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '16px 0' }}>
              <Smartphone size={18} color="#ff9800" opacity={0.6} />
              <input type="tel" className="fusion-input" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Phone Number" style={{ background: 'transparent', color: 'var(--text-primary)', fontWeight: '700' }} />
            </div>
            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '16px 0' }}>
              <Settings size={18} color="#ff9800" opacity={0.6} />
              <input className="fusion-input" value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="Vehicle Type" style={{ background: 'transparent', color: 'var(--text-primary)', fontWeight: '700' }} />
            </div>
          </div>
        </div>

        {/* Section 2: SPECS */}
        <div style={{ marginBottom: '32px' }}>
          <label className="fusion-label" style={{ marginBottom: '16px', color: tracker.settings.accentColor === '#326144' ? '#4ade80' : 'var(--accent-secondary)' }}>{t('vehicleSpecs') || 'VEHICLE SPECS'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '12px 0', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-secondary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('avgConsumption')}</span>
              <input type="number" className="fusion-input" style={{ width: '100%', fontSize: '20px', background: 'transparent', padding: 0, color: 'var(--text-primary)', fontWeight: '800' }} value={avg} onChange={e => setAvg(e.target.value)} />
            </div>
            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '12px 0', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-secondary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('tankCapacity')}</span>
              <input type="number" className="fusion-input" style={{ width: '100%', fontSize: '20px', background: 'transparent', padding: 0, color: 'var(--text-primary)', fontWeight: '800' }} value={cap} onChange={e => setCap(e.target.value)} />
            </div>
          </div>
          <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '12px 0', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-secondary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('fuelPrice')}</span>
            <input type="number" className="fusion-input" style={{ width: '100%', fontSize: '20px', background: 'transparent', padding: 0, color: 'var(--text-primary)', fontWeight: '800' }} value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>




        {/* Section 3: MAINTENANCE */}
        <div style={{ marginBottom: '32px' }}>
          <label className="fusion-label" style={{ marginBottom: '16px', color: tracker.settings.accentColor === '#326144' ? '#4ade80' : 'var(--accent-secondary)' }}>{t('maintenance')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '12px 0', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-secondary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('oilChangeInterval')}</span>
              <input 
                type="number" 
                className="fusion-input" 
                style={{ width: '100%', fontSize: '20px', background: 'transparent', padding: 0, color: 'var(--text-primary)', fontWeight: '800' }} 
                value={tracker.settings.oilChangeInterval === 0 ? '' : tracker.settings.oilChangeInterval} 
                onChange={e => {
                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                  tracker.setSettings({ ...tracker.settings, oilChangeInterval: val });
                }} 
              />
            </div>

            <div className="fusion-input-group" style={{ background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--glass-border)', borderRadius: 0, padding: '12px 0', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-secondary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('lastOilChangeOdo')}</span>
              <div style={{ fontSize: '20px', color: 'var(--accent-color)', fontWeight: '800' }}>{tracker.settings.lastOilChangeOdo} KM</div>
            </div>
          </div>
        </div>

        {/* Section 4: THEME */}
        <div style={{ marginBottom: '32px' }}>
          <label className="fusion-label" style={{ marginBottom: '24px', color: tracker.settings.accentColor === '#326144' ? '#4ade80' : 'var(--accent-secondary)' }}>{t('appTheme')}</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', justifyContent: 'center' }}>
            {THEME_COLORS.map(c => (
              <div key={c.name} onClick={() => tracker.setSettings({ ...tracker.settings, accentColor: c.hex })} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.secondary === c.hex ? c.hex : `linear-gradient(135deg, ${c.hex}, ${c.secondary})`, border: tracker.settings.accentColor === c.hex ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s', transform: tracker.settings.accentColor === c.hex ? 'scale(1.1)' : 'scale(1)', boxShadow: tracker.settings.accentColor === c.hex ? `0 0 15px ${c.hex}66` : 'none' }} />
            ))}
          </div>
        </div>

        {/* Section 4.1: WIDGET STYLING */}
        <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '14px' }}>
          <label className="fusion-label" style={{ marginBottom: '10px', display: 'block', fontSize: '10px', color: 'var(--accent-secondary)' }}>
            {tracker.settings.language === 'ar' ? 'تصميم الـ WIDGET' : 'WIDGET STYLING'}
          </label>
          
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{tracker.settings.language === 'ar' ? 'الشفافية' : 'Opacity'}</span>
              <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--accent-color)' }}>{wOpacity}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={wOpacity} 
              onChange={e => setWOpacity(Number(e.target.value))} 
              style={{ width: '100%', accentColor: 'var(--accent-secondary)' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...THEME_COLORS, { name: 'CyanNeon', hex: '#00f0ff', secondary: '#00f0ff' }].map((c, idx) => (
              <div key={idx} onClick={() => setWColor(c.hex)} style={{ 
                width: '24px', height: '24px', borderRadius: '50%', background: c.hex, 
                border: wColor === c.hex ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer', transform: wColor === c.hex ? 'scale(1.15)' : 'scale(1)',
                boxShadow: wColor === c.hex ? `0 0 10px ${c.hex}88` : 'none',
                transition: 'all 0.15s'
              }} />
            ))}
          </div>
        </div>

        {/* Section 5: NOTIFICATION TONE */}
        <div style={{ marginBottom: '40px' }}>
          <label className="fusion-label" style={{ marginBottom: '16px', opacity: 0.5, fontSize: '10px', color: tracker.settings.accentColor === '#326144' ? '#4ade80' : 'var(--accent-secondary)' }}>{t('notificationTone')}</label>

          {/* Alert Threshold input */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('warningThreshold')} 🔔</span>
            <div style={{ background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.4)', borderRadius: '8px', padding: '2px 8px', display: 'flex', alignItems: 'center' }}>
              <input type="number" className="fusion-input" style={{ width: '36px', fontSize: '13px', fontWeight: '900', background: 'transparent', padding: 0, textAlign: 'center', color: '#ff9800', outline: 'none', border: 'none' }} value={threshold} onChange={e => setThreshold(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* Premium Custom Dropdown */}
            <div ref={toneDropRef} style={{ position: 'relative', flex: 1 }}>
              <div
                onClick={() => setToneDropOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid var(--glass-border)`,
                  borderRadius: '10px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  gap: '6px'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                  🎵 {tracker.settings.alertTone?.replace(/\.[^.]+$/, '').slice(0, 14) || 'Digital'}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', opacity: 0.5, flexShrink: 0 }}>▾</span>
              </div>

              {toneDropOpen && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
                    background: tracker.settings.isLightMode ? '#fff' : 'rgba(20,20,24,0.92)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  {[...['Digital', 'Radar', 'Cyber', 'Alarm'],
                  ...(tracker.settings.customTones || []).map((ct: { name: string }) => ct.name)
                  ].map((tone, i) => {
                    const isDefault = ['Digital', 'Radar', 'Cyber', 'Alarm'].includes(tone);
                    return (
                      <div
                        key={tone}
                        onClick={() => {
                          tracker.setSettings({ ...tracker.settings, alertTone: tone });
                          playTone(tone, tracker.settings.customTones, tracker.audioCtxRef, tracker.activeAudioRef);
                        }}
                        style={{
                          padding: '9px 14px',
                          fontSize: '11px',
                          fontWeight: tracker.settings.alertTone === tone ? '800' : '500',
                          color: tracker.settings.alertTone === tone ? 'var(--accent-secondary)' : 'var(--text-primary)',
                          background: tracker.settings.alertTone === tone ? 'var(--glass-bg)' : 'transparent',
                          borderTop: i > 0 ? '1px solid var(--glass-border)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                          {tracker.settings.alertTone === tone && <span style={{ marginRight: '6px', color: 'var(--accent-color)' }}>▶</span>}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tone.replace(/\.[^.]+$/, '').slice(0, 22)}</span>
                        </div>
                        
                        {!isDefault && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(tracker.settings.language === 'ar' ? `هل تريد حذف رنة "${tone}"؟` : `Delete tone "${tone}"?`)) {
                                const updatedCustomTones = (tracker.settings.customTones || []).filter((ct: any) => ct.name !== tone);
                                const nextTone = tracker.settings.alertTone === tone ? 'Digital' : tracker.settings.alertTone;
                                tracker.setSettings({ 
                                  ...tracker.settings, 
                                  alertTone: nextTone, 
                                  customTones: updatedCustomTones 
                                });
                              }
                            }}
                            style={{ marginLeft: '8px', padding: '4px', opacity: 0.4, transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                          >
                            <Trash2 size={12} color="var(--danger-color)" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div
              onClick={() => document.getElementById('tone-upload')?.click()}
              style={{
                background: 'transparent',
                color: '#ff9800',
                width: '32px', height: '32px',
                borderRadius: '9px',
                cursor: 'pointer',
                border: '1px dashed rgba(255,152,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Music size={13} />
              <input
                id="tone-upload" type="file" accept="audio/*" style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 1.5 * 1024 * 1024) { alert(t('fileTooLarge')); return; }
                    const reader = new FileReader();
                    reader.onload = (res) => {
                      const base64 = res.target?.result as string;
                      const newTone = { name: file.name, data: base64 };
                      const updatedTones = [...(tracker.settings.customTones || []), newTone];
                      tracker.setSettings({ ...tracker.settings, alertTone: file.name, customTones: updatedTones });
                      playTone(file.name, updatedTones);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Minimalist Save Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <button className="glass-button" style={{ padding: '10px 42px', background: 'transparent', borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)', fontWeight: '900', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }} onClick={handleSave}>{t('save')}</button>
        </div>

        {/* Discreet Reset Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.3, transition: 'opacity 0.3s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.3'}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', fontSize: '9px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('resetApp')}</button>
          ) : (
            <button onClick={() => { tracker.resetData(); onClose(); }} style={{ background: 'var(--danger-color)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', cursor: 'pointer' }}>{t('areYouSure')}</button>
          )}
        </div>

        </div>

      </div>
  );
}

function UpdateModal({ info, tracker, onClose }: { info: any, tracker: any, onClose: () => void }) {
  const lang = (tracker.settings.language in translations) ? tracker.settings.language as keyof typeof translations : 'ar';
  const t = (key: string) => (translations[lang] as any)?.[key] ?? key;
  const tFunc = (key: string, val: string): string => {
    const fn = (translations[lang] as any)?.[key];
    return typeof fn === 'function' ? fn(val) : val;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: tracker.settings.isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center', border: tracker.settings.isLightMode ? '1px solid var(--glass-border)' : '1px solid rgba(255, 51, 102, 0.4)', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: tracker.settings.isLightMode ? '0 20px 60px rgba(0,0,0,0.1)' : '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ background: 'rgba(255, 51, 102, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid var(--danger-color)', boxShadow: '0 0 20px rgba(255, 51, 102, 0.3)' }}>
          <Settings size={34} color="var(--danger-color)" style={{ animation: 'spin 4s linear infinite' }} />
        </div>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '800' }}>{t('updateAvailable')}</h2>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: '600' }}>
          {tFunc('versionAvailable', info.version)}
        </div>
        {info.notes && (
          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '24px', lineHeight: '1.7', textAlign: tracker.settings.language === 'ar' ? 'right' : 'left', direction: tracker.settings.language === 'ar' ? 'rtl' : 'ltr' }}>
            {info.notes}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={onClose}>{t('later')}</button>
          <a href={info.url} target="_blank" rel="noopener noreferrer" className="glass-button" style={{ flex: 2, background: 'var(--danger-color)', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', border: 'none', boxShadow: '0 4px 15px rgba(255, 51, 102, 0.4)' }}>
            {t('updateNow')}
          </a>
        </div>
      </div>
    </div>
  );
}


export default App;

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
            <X size={18} />
          </button>
        </div>

        {/* Color Sped-Dial */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', marginBottom: '32px' }}>
          {colors.map(c => (
            <button
              key={c}
              onClick={() => {
                tracker.setSettings({ ...tracker.settings, widgetAccentColor: c });
                tracker.updateWidgetStats({ ...tracker.fuelState, ...tracker.settings, widgetAccentColor: c });
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
              tracker.setSettings({ ...tracker.settings, widgetOpacity: val });
              tracker.updateWidgetStats({ ...tracker.fuelState, ...tracker.settings, widgetOpacity: val });
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

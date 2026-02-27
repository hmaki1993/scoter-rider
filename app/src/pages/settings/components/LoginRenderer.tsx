import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Globe, Sparkles } from 'lucide-react';

interface LoginRendererProps {
    activeSettings: any;
    designMode: 'desktop' | 'mobile';
    isMobile?: boolean;
    email?: string;
    setEmail?: (val: string) => void;
    password?: string;
    setPassword?: (val: string) => void;
    loading?: boolean;
    error?: string | null;
    handleLogin?: (e: React.FormEvent) => void;
    toggleLanguage?: () => void;
    t: (key: string) => string;
    i18n: any;
    isPreview?: boolean;
    isFullScreen?: boolean;
}

export const LoginRenderer: React.FC<LoginRendererProps> = ({
    activeSettings,
    designMode,
    email = '',
    setEmail = () => { },
    password = '',
    setPassword = () => { },
    loading = false,
    error = null,
    handleLogin = (e) => e.preventDefault(),
    toggleLanguage = () => { },
    t,
    i18n,
    isPreview = false,
    isFullScreen = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [bounds, setBounds] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setBounds({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const targetWidth = designMode === 'mobile' ? 390 : 1920;
    const targetHeight = designMode === 'mobile' ? 844 : 1080;

    // Detect if we are in a small "mini-preview" box to apply Smart Zoom
    const isMiniPreview = isPreview && !isFullScreen && bounds.height < 500 && bounds.height > 0;

    // Smart Zoom: If the container is small, we focus on a "Focus Height" of 700px 
    // instead of the full 1080p Stage to make the card appear larger.
    const focusHeight = isMiniPreview ? 700 : targetHeight;
    const focusWidth = isMiniPreview ? (designMode === 'mobile' ? 390 : 800) : targetWidth;

    // Calculate scale factor for CONTENT (Card, Logo, etc.)
    const scaleFactor = isPreview
        ? (bounds.width > 0 && bounds.height > 0 ? Math.min(bounds.width / (isFullScreen ? targetWidth : focusWidth), bounds.height / (isFullScreen ? targetHeight : focusHeight)) : 1)
        : 1;

    // Calculate scale factor for BACKGROUND (Ensure full BG visibility)
    // We use the full targetHeight (1080) for the BG so it fits the container without heavy zooming.
    // In mini-preview, we multiply by 0.9 to give some "breathing room" so the user can see it's all there.
    const bgScaleFactor = isPreview
        ? (bounds.width > 0 && bounds.height > 0 ? Math.min(bounds.width / targetWidth, bounds.height / targetHeight) * (isMiniPreview ? 0.9 : 1) : 1)
        : 1;

    const logoPath = (activeSettings.login_logo_url as string) || "/logo.png";
    const bgPath = (activeSettings.login_bg_url as string) || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";

    return (
        <div
            ref={containerRef}
            className={`w-full h-full relative font-cairo flex items-center justify-center select-none overflow-hidden ${isPreview ? 'bg-black' : 'bg-transparent'}`}
        >
            {/* Background Layer - Fluid and full-bleed to eliminate cropping */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0 transition-all duration-500 ease-out"
                    style={{
                        filter: `blur(${activeSettings.login_bg_blur ?? 0}px) brightness(${activeSettings.login_bg_brightness ?? 1.0})`,
                    }}
                >
                    <div
                        className="w-full h-full bg-no-repeat bg-black transition-all duration-1000"
                        style={{
                            backgroundImage: `url('${bgPath}')`,
                            backgroundSize: (activeSettings.login_bg_fit === 'fill') ? '100% 100%' : (activeSettings.login_bg_fit as string || 'cover'),
                            backgroundPosition: 'center',
                            transform: `scale(${activeSettings.login_bg_zoom ?? 1.0}) translate(${activeSettings.login_bg_x_offset ?? 0}%, ${activeSettings.login_bg_y_offset ?? 0}%)`,
                            opacity: (activeSettings.login_bg_opacity as number) ?? 0.8
                        }}
                    ></div>
                </div>
            </div>

            {/* Content Stage - Preserving 1080p parity (or fluid if FullScreen) */}
            <div
                className={`${isFullScreen ? "relative w-full h-full" : "absolute"} flex flex-col items-center justify-center transition-transform duration-500 ease-out pointer-events-none z-10`}
                style={isFullScreen ? undefined : {
                    width: `${targetWidth}px`,
                    height: `${targetHeight}px`,
                    transform: `translate(-50%, -50%) scale(${scaleFactor})`,
                    top: '50%',
                    left: '50%',
                    position: 'absolute',
                    transformOrigin: 'center center'
                }}
            >
                {/* Logo Layer - Absolute aligned like actual Login page */}
                {activeSettings.login_show_logo !== false && (
                    <div
                        className="absolute z-20 flex items-center justify-center pointer-events-none"
                        style={{
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) translateX(${activeSettings.login_logo_x_offset ?? 0}px) translateY(${activeSettings.login_logo_y_offset ?? -220}px) scale(${activeSettings.login_logo_scale as number || 1.0})`,
                            transformOrigin: 'center center',
                            width: '160px',
                            height: '160px',
                        }}
                    >
                        <div className="absolute inset-[-30px] bg-[#D4AF37]/10 blur-3xl rounded-full opacity-40"></div>
                        <img
                            src={logoPath}
                            alt="Academy Logo"
                            className="w-full h-full object-contain drop-shadow-2xl transition-all duration-700"
                            style={{ opacity: activeSettings.login_logo_opacity !== undefined ? (activeSettings.login_logo_opacity as number) : 0.8 }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                )}

                <div
                    className="relative group/page z-10 pointer-events-auto"
                    style={{
                        width: `${activeSettings.login_card_width ?? (designMode === 'mobile' ? 340 : 448)}px`,
                        height: activeSettings.login_card_height ? `${activeSettings.login_card_height}px` : 'auto'
                    }}
                >
                    {/* Login Card Layer */}
                    <div
                        className="group/card hover:!opacity-100 focus-within:!opacity-100 border rounded-[3rem] p-8 md:p-12 h-full transition-all duration-700 ease-out flex flex-col justify-center overflow-hidden shadow-[inset_0_0_80px_rgba(255,255,255,0.03)] relative before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.05] before:to-transparent before:pointer-events-none"
                        style={{
                            backgroundColor: (activeSettings.login_card_color as string) || '#000000',
                            border: activeSettings.login_card_border_color ? `${activeSettings.login_card_border_width ?? 1}px solid ${activeSettings.login_card_border_color as string}` : undefined,
                            boxShadow: activeSettings.login_card_border_color ? `0 0 ${activeSettings.login_card_glow_size ?? 60}px -15px color-mix(in srgb, ${activeSettings.login_card_border_color as string}, transparent ${100 - Number(activeSettings.login_card_glow_opacity ?? 50)}%)` : undefined,
                            opacity: (activeSettings.login_card_opacity as number) ?? 0.45,
                            transform: `scale(${activeSettings.login_card_scale as number || 1.0}) translate(${(activeSettings.login_card_x_offset as number || 0)}px, ${(activeSettings.login_card_y_offset as number || 0)}px)`,
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)'
                        }}
                    >
                        <div className="text-center mb-6">
                            <h1 className="font-black tracking-[0.3em] uppercase mb-1 drop-shadow-md" style={{ color: (activeSettings.login_text_color as string) || '#ffffff', fontSize: activeSettings.login_heading_size ? `${activeSettings.login_heading_size}px` : '24px' }}>
                                {(activeSettings.academy_name as string) || 'Epic Gymnastic'}
                            </h1>
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-[1px] w-8" style={{ backgroundColor: `${(activeSettings.login_accent_color as string) || '#D4AF37'}4d` }}></div>
                                <span className="font-black uppercase tracking-[0.5em] opacity-80" style={{ color: (activeSettings.login_accent_color as string) || '#D4AF37', fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '11px' }}>
                                    Academy
                                </span>
                                <div className="h-[1px] w-8" style={{ backgroundColor: `${(activeSettings.login_accent_color as string) || '#D4AF37'}4d` }}></div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-400 text-[10px] font-black p-3 rounded-2xl mb-5 bg-rose-500/10 border border-rose-500/10 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5 w-full" noValidate>
                            <div className="space-y-2.5 w-full text-left group/email relative">
                                <label className="block font-black uppercase tracking-[0.4em] transition-all duration-500 text-left pl-2 group-focus-within/email:text-white group-hover/email:text-white/80" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}66`, fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '11px' }}>
                                    Email Address
                                </label>
                                <div className="relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/5 bg-white/[0.02] shadow-[inset_0_2px_15px_rgba(255,255,255,0.02)] group-focus-within/email:border-white/20 group-focus-within/email:bg-white/[0.06] group-focus-within/email:shadow-[inset_0_2px_20px_rgba(255,255,255,0.04),0_0_20px_rgba(255,255,255,0.05)] group-hover/email:border-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-focus-within/email:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                    <input
                                        type="email"
                                        required
                                        readOnly={isPreview}
                                        className="relative w-full bg-transparent py-4 px-8 transition-all font-bold text-white tracking-widest !outline-none !shadow-none !border-transparent !ring-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            height: '52px',
                                            color: (activeSettings.login_text_color as string) || '#ffffff',
                                            fontSize: activeSettings.login_input_size ? `${activeSettings.login_input_size}px` : '24px'
                                        }}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5 w-full pt-4 text-left group/pass relative">
                                <label className="block font-black uppercase tracking-[0.4em] transition-all duration-500 text-left pl-2 group-focus-within/pass:text-white group-hover/pass:text-white/80" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}66`, fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '11px' }}>
                                    Password
                                </label>
                                <div className="relative rounded-2xl overflow-hidden transition-all duration-500 border border-white/5 bg-white/[0.02] shadow-[inset_0_2px_15px_rgba(255,255,255,0.02)] group-focus-within/pass:border-white/20 group-focus-within/pass:bg-white/[0.06] group-focus-within/pass:shadow-[inset_0_2px_20px_rgba(255,255,255,0.04),0_0_20px_rgba(255,255,255,0.05)] group-hover/pass:border-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] to-transparent opacity-0 group-focus-within/pass:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                    <input
                                        type="password"
                                        required
                                        readOnly={isPreview}
                                        className="relative w-full bg-transparent py-4 px-8 transition-all font-bold text-white tracking-widest !outline-none !shadow-none !border-transparent !ring-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            height: '52px',
                                            color: (activeSettings.login_text_color as string) || '#ffffff',
                                            fontSize: activeSettings.login_input_size ? `${activeSettings.login_input_size}px` : '24px'
                                        }}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder=""
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || isPreview}
                                className="w-full relative h-[52px] py-4 mt-8 rounded-2xl font-black uppercase tracking-[0.5em] bg-black/60 backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:bg-black/80 hover:border-white/30 active:scale-[0.98] group/btn overflow-hidden"
                                style={{
                                    color: (activeSettings.login_accent_color as string) || '#D4AF37',
                                    borderColor: `${(activeSettings.login_accent_color as string) || '#D4AF37'}66`,
                                    fontSize: activeSettings.login_label_size ? `${activeSettings.login_label_size}px` : '12px'
                                }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            {t('common.login')}
                                            <Sparkles className="w-4 h-4 opacity-50" />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>

                        <div className="mt-7 flex flex-col items-center gap-4 w-full">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleLanguage();
                                }}
                                className="px-8 py-2.5 rounded-full flex items-center justify-center gap-3 transition-all font-black uppercase tracking-[0.3em] cursor-pointer"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: `${(activeSettings.login_text_color as string) || '#ffffff'}cc`,
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontSize: activeSettings.login_label_size ? `${Math.max(9, (activeSettings.login_label_size as number) - 2)}px` : '10px'
                                }}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>
                            <span className="font-black uppercase tracking-[0.4em] mt-2" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}1a`, fontSize: activeSettings.login_label_size ? `${Math.max(9, (activeSettings.login_label_size as number) - 2)}px` : '9px' }}>
                                © 2026 {(activeSettings.academy_name as string) || 'Epic Gymnastic Academy'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

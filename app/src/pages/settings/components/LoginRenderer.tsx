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
    isPreview = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const logoPath = (activeSettings.login_logo_url as string) || "/logo.png";
    const bgPath = (activeSettings.login_bg_url as string) || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-visible font-cairo flex items-center justify-center select-none"
        >
            {/* Stage Parity - Renders at 1:1, Parent scales to fit */}
            <div
                className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none"
            >
                <div
                    className="flex-shrink-0 transition-all duration-500 ease-out"
                    style={{
                        width: designMode === 'mobile' ? '390px' : '1920px',
                        height: designMode === 'mobile' ? '844px' : '1080px',
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

            {/* Content Stage - Preserving 1080p parity */}
            <div
                className="absolute flex flex-col items-center justify-center transition-transform duration-500 ease-out pointer-events-none z-10"
                style={{
                    width: designMode === 'mobile' ? '390px' : '1920px',
                    height: designMode === 'mobile' ? '844px' : '1080px',
                    transform: `translate(-50%, -50%)`,
                    top: '50%',
                    left: '50%',
                    position: 'absolute'
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
                        className="group/card hover:!opacity-100 border-2 rounded-[3rem] p-8 md:p-12 h-full transition-all duration-700 ease-out flex flex-col justify-center overflow-hidden"
                        style={{
                            backgroundColor: (activeSettings.login_card_color as string) || '#000000',
                            border: (activeSettings.login_card_border_color as string) ? `1px solid ${activeSettings.login_card_border_color}` : undefined,
                            boxShadow: (activeSettings.login_card_border_color as string) ? `0 0 60px -15px color-mix(in srgb, ${activeSettings.login_card_border_color}, transparent 50%)` : undefined,
                            opacity: 0.45,
                            transform: `scale(${activeSettings.login_card_scale as number || 1.0}) translate(${(activeSettings.login_card_x_offset as number || 0)}px, ${(activeSettings.login_card_y_offset as number || 0)}px)`,
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)'
                        }}
                    >
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-black tracking-[0.3em] uppercase mb-1 drop-shadow-md" style={{ color: (activeSettings.login_text_color as string) || '#ffffff' }}>
                                {(activeSettings.academy_name as string) || 'Epic Gymnastic'}
                            </h1>
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-[1px] w-8" style={{ backgroundColor: `${(activeSettings.login_accent_color as string) || '#D4AF37'}4d` }}></div>
                                <span className="text-[9px] font-black uppercase tracking-[0.7em] opacity-80" style={{ color: (activeSettings.login_accent_color as string) || '#D4AF37' }}>
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
                            <div className="space-y-1.5 w-full text-left group">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] ml-6 transition-colors" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}66` }}>
                                    Email Address
                                </label>
                                <div className="relative rounded-2xl overflow-hidden transition-all duration-300 border border-white/10 focus-within:border-white/30 focus-within:bg-white/[0.05]">
                                    <input
                                        type="email"
                                        required
                                        readOnly={isPreview}
                                        className="w-full px-8 py-3.5 transition-all text-sm font-bold text-white !outline-none !shadow-none !border-transparent !ring-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none bg-transparent"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            height: '52px',
                                            color: (activeSettings.login_text_color as string) || '#ffffff'
                                        }}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={isPreview ? "admin@epic.com" : "email@domain.com"}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 w-full text-left group">
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] ml-6 transition-colors" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}66` }}>
                                    Password
                                </label>
                                <div className="relative rounded-2xl overflow-hidden transition-all duration-300 border border-white/10 focus-within:border-white/30 focus-within:bg-white/[0.05]">
                                    <input
                                        type="password"
                                        required
                                        readOnly={isPreview}
                                        className="w-full px-8 py-3.5 transition-all text-sm font-bold text-white !outline-none !shadow-none !border-transparent !ring-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none bg-transparent"
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            height: '52px',
                                            color: (activeSettings.login_text_color as string) || '#ffffff'
                                        }}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={isPreview ? "••••••••" : "••••••••"}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || isPreview}
                                className="w-full relative py-3.5 mt-8 h-[52px] rounded-full font-black text-[11px] uppercase tracking-[0.5em] shadow-[0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center border hover:shadow-[0_20px_40px_rgba(212,175,55,0.1)] transition-all active:scale-[0.98] group/btn overflow-hidden"
                                style={{
                                    backgroundColor: 'black',
                                    color: (activeSettings.login_accent_color as string) || '#D4AF37',
                                    borderColor: `${(activeSettings.login_accent_color as string) || '#D4AF37'}66`
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
                                className="px-8 py-2.5 rounded-full flex items-center justify-center gap-3 transition-all text-[10px] font-black uppercase tracking-[0.3em] cursor-pointer"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    color: `${(activeSettings.login_text_color as string) || '#ffffff'}66`,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] mt-2" style={{ color: `${(activeSettings.login_text_color as string) || '#ffffff'}1a` }}>
                                © 2026 {(activeSettings.academy_name as string) || 'Epic Gymnastic Academy'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

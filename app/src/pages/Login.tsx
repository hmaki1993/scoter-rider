import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe, Sparkles, Award, Eye, EyeOff, User, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const stripAlpha = (hex: string) => {
    if (!hex) return '#000000';
    return hex.length === 9 || hex.length === 8 ? hex.slice(0, 7) : hex;
};

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { updateSettings, settings, hasLoaded } = useTheme();


    // Detect viewport on mount and resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/app');
            }
        };
        checkSession();
    }, [navigate]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        // Force body background to black to hide any teal/blue "broad strips" on mobile/tablet browser safe areas
        const originalBg = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#000000';

        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.style.backgroundColor = originalBg;
        };
    }, []);

    // Helper to pick the correct setting based on current viewport
    const getSetting = <K extends keyof typeof settings>(key: K): typeof settings[K] => {
        if (isMobile) {
            const mobileKey = `login_mobile_${(key as string).replace('login_', '')}` as K;
            // Fallback to desktop setting if mobile one is explicitly null/empty (though initialized by migration)
            return (settings[mobileKey] ?? settings[key]) as typeof settings[K];
        }
        return settings[key];
    };

    const logoPath = getSetting('login_logo_url') || "/logo.png";
    const bgPath = getSetting('login_bg_url') || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/app');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to login');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = settings.language === 'en' ? 'ar' : 'en';
        updateSettings({ language: newLang });
    };

    if (!hasLoaded) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center font-cairo select-none">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-amber-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-pulse" />
                    </div>
                </div>
                <div className="mt-8 text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
                    Loading Brand Experience...
                </div>
            </div>
        );
    }

    return (
        <div
            className="login-page-root min-h-screen bg-black flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-cairo select-none"
            style={{
                '--fluid-scale': 'min(1, calc(100vh / 1100))',
            } as React.CSSProperties}
        >
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute inset-0 bg-no-repeat transition-all duration-1000 bg-black"
                    style={{
                        backgroundImage: `url('${bgPath}')`,
                        backgroundSize: (getSetting('login_bg_fit') === 'fill') ? '100% 100%' : (getSetting('login_bg_fit') || 'cover'),
                        backgroundPosition: 'center',
                        filter: `blur(${getSetting('login_bg_blur') ?? 0}px) brightness(${getSetting('login_bg_brightness') ?? 1.0})`,
                        transform: `scale(${getSetting('login_bg_zoom') ?? 1.0}) translate(${getSetting('login_bg_x_offset') ?? 0}%, ${getSetting('login_bg_y_offset') ?? 0}%)`,
                        opacity: getSetting('login_bg_opacity') ?? 0.8
                    }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            {/* Fluid Scaled Content Container */}
            <div
                className="relative z-10 w-full h-full flex items-center justify-center transition-transform duration-500 ease-out"
                style={{
                    transform: 'scale(var(--fluid-scale))',
                    transformOrigin: 'center center'
                }}
            >
                {/* Logo - Absolute within scaled container */}
                {
                    getSetting('login_show_logo') !== false && (
                        <div
                            className="absolute z-20 flex items-center justify-center pointer-events-none"
                            style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) translateX(${getSetting('login_logo_x_offset') ?? 0}px) translateY(${getSetting('login_logo_y_offset') ?? -220}px) scale(${getSetting('login_logo_scale') ?? 1.0})`,
                                transformOrigin: 'center center',
                                width: '160px',
                                height: '160px',
                            }}
                        >
                            <img
                                src={logoPath}
                                alt="Academy Logo"
                                className="w-full h-full object-contain drop-shadow-2xl transition-all duration-700"
                                style={{ opacity: getSetting('login_logo_opacity') ?? 0.8 }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        </div>
                    )
                }

                <div
                    className="relative z-10 group/page"
                    style={{
                        width: `${getSetting('login_card_width') ?? (isMobile ? 340 : 448)}px`,
                        height: getSetting('login_card_height') ? `${getSetting('login_card_height')}px` : 'auto'
                    }}
                >
                    {/* Login Card Layer */}
                    <div
                        className="group/card hover:!opacity-100 border-2 rounded-[3rem] p-8 md:p-12 h-full transition-all duration-700 ease-out flex flex-col justify-center overflow-hidden"
                        style={{
                            backgroundColor: getSetting('login_card_color') || '#000000',
                            border: getSetting('login_card_border_color') ? `1px solid ${getSetting('login_card_border_color')}` : undefined,
                            boxShadow: getSetting('login_card_border_color') ? `0 0 60px -15px color-mix(in srgb, ${getSetting('login_card_border_color')}, transparent 50%)` : undefined,
                            opacity: 0.45,
                            transform: `scale(${getSetting('login_card_scale') ?? 1.0}) translate(${getSetting('login_card_x_offset') ?? 0}px, ${getSetting('login_card_y_offset') ?? 0}px)`,
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)'
                        }}
                    >
                        {/* Header - Inside Card */}
                        <div className="text-center mb-6">
                            <h1 className="text-xl font-black tracking-[0.3em] uppercase mb-1 drop-shadow-md" style={{ color: getSetting('login_text_color') || '#ffffff' }}>
                                {settings.academy_name || 'Academy System'}
                            </h1>
                            <div className="flex items-center justify-center gap-4">
                                <div className="h-[1px] w-8" style={{ backgroundColor: `${getSetting('login_accent_color') || '#D4AF37'}4d` }}></div>
                                <span className="text-[9px] font-black uppercase tracking-[0.7em] opacity-80" style={{ color: getSetting('login_accent_color') || '#D4AF37' }}>
                                    Academy
                                </span>
                                <div className="h-[1px] w-8" style={{ backgroundColor: `${getSetting('login_accent_color') || '#D4AF37'}4d` }}></div>
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-400 text-[10px] font-black p-3 rounded-2xl mb-5 bg-rose-500/10 border border-rose-500/10 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 text-left group">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.4em] transition-colors text-left" style={{ color: `${stripAlpha(getSetting('login_text_color') || '#ffffff')}66` }}>Email Address</label>
                                    <div className="group relative rounded-2xl overflow-hidden transition-all duration-300 border border-white/10 focus-within:border-white/30 focus-within:bg-white/[0.05]">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/[0.03] py-4 px-8 transition-all text-sm font-bold text-white !outline-none !shadow-none !border-transparent !ring-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none"
                                            placeholder="email@domain.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 text-left group">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.4em] transition-colors text-left" style={{ color: `${stripAlpha(getSetting('login_text_color') || '#ffffff')}66` }}>Password</label>
                                    <div className="group relative rounded-2xl overflow-hidden transition-all duration-300 border border-white/10 focus-within:border-white/30 focus-within:bg-white/[0.05]">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.03] py-4 px-8 transition-all text-sm font-bold text-white !outline-none !shadow-none !border-transparent !ring-0 focus:!border-transparent focus:!ring-0 focus:!outline-none focus:!shadow-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative py-3 md:py-3.5 mt-1 rounded-full font-black text-[11px] uppercase tracking-[0.5em] bg-black border shadow-xl transition-all active:scale-[0.98] group/btn overflow-hidden"
                                style={{
                                    color: getSetting('login_accent_color') || '#D4AF37',
                                    borderColor: `${stripAlpha(getSetting('login_accent_color') || '#D4AF37')}66`
                                }}
                                onMouseEnter={(e) => {
                                    const accent = getSetting('login_accent_color') || '#D4AF37';
                                    e.currentTarget.style.backgroundColor = `${stripAlpha(accent)}1a`;
                                    e.currentTarget.style.borderColor = accent;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'black';
                                    e.currentTarget.style.borderColor = `${stripAlpha(getSetting('login_accent_color') || '#D4AF37')}66`;
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

                        {/* Pill Language Switcher */}
                        <div className="mt-4 md:mt-7 flex flex-col items-center gap-3">
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.05] border border-white/20 transition-all text-[9px] font-black uppercase tracking-[0.3em]"
                                style={{ color: getSetting('login_text_color') || '#ffffff', borderColor: `${stripAlpha(getSetting('login_text_color') || '#ffffff')}33` }}
                                onMouseEnter={(e) => {
                                    const accent = getSetting('login_accent_color') || '#D4AF37';
                                    e.currentTarget.style.color = accent;
                                    e.currentTarget.style.borderColor = accent;
                                }}
                                onMouseLeave={(e) => {
                                    const textColor = getSetting('login_text_color') || '#ffffff';
                                    e.currentTarget.style.color = textColor;
                                    e.currentTarget.style.borderColor = `${stripAlpha(textColor)}33`;
                                }}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>

                            {/* Copyright Footer */}
                            <span className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: `${stripAlpha(getSetting('login_text_color') || '#ffffff')}55` }}>
                                © 2026 {settings.academy_name || 'Academy System'}
                            </span>
                        </div>
                    </div>
                </div>

                <style>{`
                        input:-webkit-autofill,
                        input:-webkit-autofill:hover, 
                        input:-webkit-autofill:focus {
                            -webkit-text-fill-color: white !important;
                            -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
                            transition: background-color 5000s ease-in-out 0s;
                        }

                        /* OVERRIDE global h1 color rule for the login page */
                        .login-page-root h1,
                        .login-page-root h2,
                        .login-page-root h3 {
                            color: ${getSetting('login_text_color') || '#ffffff'} !important;
                            letter-spacing: inherit !important;
                        }

                        
                        input {
                            background-color: transparent !important;
                            box-shadow: none !important;
                            border-color: ${stripAlpha(getSetting('login_accent_color') || '#D4AF37')}26 !important;
                            font-size: 16px !important;
                            line-height: 1.5 !important;
                            height: auto !important;
                        }

                        /* Higher specificity for Login inputs to beat index.css */
                        .group/card input {
                            font-size: 16px !important;
                        }

                        input:focus {
                            border-color: ${getSetting('login_accent_color') || '#D4AF37'} !important;
                            box-shadow: none !important;
                        }

                        input:invalid, input:focus:invalid, input:hover:invalid {
                            box-shadow: none !important;
                            border-color: ${getSetting('login_accent_color') || '#D4AF37'} !important;
                            outline: none !important;
                        }
                    `}</style>
            </div>
        </div>
    );
};

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
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { updateSettings, settings, hasLoaded } = useTheme();


    // Remove Resize Listener to avoid jarring layout shifts, rely on CSS.
    useEffect(() => {
        // Optional: We could update on resize, but pure CSS is smoother.
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

    const logoPath = settings.login_logo_url || "/logo.png";
    const bgPath = settings.login_bg_url || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";


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
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-6 relative overflow-x-hidden font-cairo select-none">

            {/* Dynamic Background with Natural Scaling & Repositioning */}
            <div className="fixed inset-0 z-0 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 bg-black"
                    style={{
                        backgroundImage: `url('${bgPath}')`,
                        filter: `blur(${settings.login_bg_blur ?? 0}px) brightness(${settings.login_bg_brightness ?? 1.0})`,
                        transform: `translate(${settings.login_bg_x_offset ?? 0}%, ${settings.login_bg_y_offset ?? 0}%) scale(${settings.login_bg_zoom ?? 1.0})`,
                        opacity: 0.8
                    }}
                ></div>

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10 group/page scale-90 md:scale-100 -mt-8 md:mt-0">

                {/* Prominent Logo - Faded as requested */}
                {settings.login_show_logo !== false && (
                    <div className="flex justify-center mb-10 relative group">
                        <div
                            className="w-24 h-24 md:w-40 md:h-40 flex items-center justify-center relative z-10 transition-transform duration-500"
                            style={{
                                transform: `translate(${settings.login_logo_x_offset ?? 0}px, ${settings.login_logo_y_offset ?? 0}px) scale(${settings.login_logo_scale ?? 1.0})`
                            }}
                        >
                            <img
                                src={logoPath}
                                alt="Academy Logo"
                                className="w-full h-full object-contain transition-all duration-700 drop-shadow-2xl"
                                style={{
                                    opacity: settings.login_logo_opacity ?? 0.8
                                }}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Login Card - Ultra Compact & Responsive */}
                {/* Login Card - Guaranteed Visibility with Inline 5% Transparency */}
                {/* Login Card - SPLIT VIEW: Solid Black Mobile / Premium Faded Desktop */}
                {/* Login Card - V2.1 Smart Hover & Toggle */}
                {/* Login Card - Clean Universal Glass View (Matched to Epic) */}
                <div
                    className="group/card border-2 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 transition-all duration-700 ease-out glass-effect overflow-hidden"
                    style={{
                        transform: `scale(${settings.login_card_scale ?? 1.0}) translate(${settings.login_card_x_offset ?? 0}px, ${settings.login_card_y_offset ?? 0}px)`,
                        '--card-accent': settings.login_accent_color || '#D4AF37',
                        '--card-bg': settings.login_card_color || '#000000',
                        '--card-opacity': settings.login_card_opacity ?? 0.6
                    } as React.CSSProperties}
                >

                    {/* Header - Inside Card */}
                    <div className="text-center mb-6">
                        <h1
                            className="text-xl font-black tracking-[0.3em] uppercase mb-1"
                            style={{ color: settings.login_text_color || '#ffffff' }}
                        >
                            {settings.academy_name || 'Academy System'}
                        </h1>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-12">Institutional Management Ecosystem</p>

                        {error && (
                            <div className="text-rose-400 text-[10px] font-black p-3 rounded-2xl mb-5 bg-rose-500/10 border border-rose-500/10 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 text-left">
                                    <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.4em] group-focus-within/card:text-white/40 transition-colors text-left">Email Address</label>
                                    <div className="group relative">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-8 text-white text-[16px] font-bold focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 text-left">
                                    <label className="block text-[9px] font-black text-white/30 uppercase tracking-[0.4em] group-focus-within/card:text-white/40 transition-colors text-left">Secure Pin</label>
                                    <div className="group relative">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-8 text-white text-[16px] font-bold focus:outline-none focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative py-3 md:py-3.5 mt-1 rounded-full font-black text-[11px] uppercase tracking-[0.5em] bg-black border shadow-xl transition-all active:scale-[0.98] group/btn overflow-hidden"
                                style={{
                                    color: settings.login_accent_color || '#D4AF37',
                                    borderColor: `${stripAlpha(settings.login_accent_color || '#D4AF37')}66`
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = `${stripAlpha(settings.login_accent_color || '#D4AF37')}1a`;
                                    e.currentTarget.style.borderColor = settings.login_accent_color || '#D4AF37';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'black';
                                    e.currentTarget.style.borderColor = `${stripAlpha(settings.login_accent_color || '#D4AF37')}66`;
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
                                className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.05] border border-white/20 text-white transition-all text-[9px] font-black uppercase tracking-[0.3em]"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = settings.login_accent_color || '#D4AF37';
                                    e.currentTarget.style.borderColor = settings.login_accent_color || '#D4AF37';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                }}
                            >
                                <Globe className="w-3.5 h-3.5" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>

                            {/* Copyright Footer */}
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">
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
                /* Universal Glass Effect - GHOST MODE ENHANCED */
                .glass-effect {
                    background-color: color-mix(in srgb, var(--card-bg), transparent 95%) !important;
                    backdrop-filter: blur(5px) !important;
                    border-color: rgba(255, 255, 255, 0.05) !important;
                    box-shadow: 0 0 40px -20px rgba(0,0,0,0.5) !important;
                    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }

                /* Ghost Mode Active: Make visible when interacting */
                .glass-effect:hover, .glass-effect:focus-within {
                    background-color: color-mix(in srgb, var(--card-bg), transparent calc(100% - var(--card-opacity) * 100%)) !important;
                    backdrop-filter: blur(40px) !important;
                    border-color: var(--card-accent) !important;
                    box-shadow: 0 0 100px -20px color-mix(in srgb, var(--card-accent), transparent 60%) !important;
                }
                
                input {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-color: ${stripAlpha(settings.login_accent_color || '#D4AF37')}26 !important;
                    font-size: 16px !important;
                    line-height: 1.5 !important;
                    height: auto !important;
                }
                /* Higher specificity for Login inputs to beat index.css */
                .group/card input {
                    font-size: 16px !important;
                }
                input:focus {
                    border-color: ${settings.login_accent_color || '#D4AF37'} !important;
                    box-shadow: none !important;
                }
                input:invalid, input:focus:invalid, input:hover:invalid {
                    box-shadow: none !important;
                    border-color: ${settings.login_accent_color || '#D4AF37'} !important;
                    outline: none !important;
                }
            `}</style>
            </div>
        </div>
    );
}

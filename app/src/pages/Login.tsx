import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe, Sparkles, Award, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { updateSettings, settings } = useTheme();


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

    console.log('Login Page Settings:', {
        login_logo_url: settings.login_logo_url,
        login_bg_url: settings.login_bg_url,
        logoPath,
        bgPath
    });

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

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 md:p-6 relative overflow-x-hidden font-cairo select-none">

            {/* Dynamic Background with Natural Scaling */}
            <div className="fixed inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 transition-transform duration-1000"
                    style={{ backgroundImage: `url('${bgPath}')` }}
                ></div>

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10 group/page scale-90 md:scale-100 -mt-8 md:mt-0">

                {/* Prominent Logo - Faded as requested */}
                <div className="flex justify-center mb-8 relative group">
                    <div className="relative">
                        <div className="absolute inset-[-30px] bg-[#D4AF37]/10 blur-3xl rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
                        <div className="w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden flex items-center justify-center relative z-10">
                            <img
                                src={logoPath}
                                alt="Healy Academy"
                                className="w-full h-full object-contain opacity-100 md:opacity-60 md:group-hover:opacity-90 transition-all duration-700 drop-shadow-xl mix-blend-screen"
                                style={{ clipPath: 'circle(50%)' }}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        </div>
                        <div className="hidden w-24 h-24 rounded-full border border-[#D4AF37]/20 bg-black/40 backdrop-blur-md flex items-center justify-center relative z-10">
                            <Award className="w-12 h-12 text-[#D4AF37]/30" />
                        </div>
                    </div>
                </div>

                {/* Login Card - Ultra Compact & Responsive */}
                {/* Login Card - Guaranteed Visibility with Inline 5% Transparency */}
                {/* Login Card - SPLIT VIEW: Solid Black Mobile / Premium Faded Desktop */}
                {/* Login Card - V2.1 Smart Hover & Toggle */}
                {/* Login Card - Clean Universal Glass View (Matched to Epic) */}
                <div
                    className="group/card border-2 border-[#D4AF37] md:border-white/[0.05] rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-[0_0_100px_rgba(0,0,0,1)] transition-all duration-700 ease-out bg-black glass-effect"
                    style={{
                        backgroundColor: settings.login_card_color ? `${settings.login_card_color}${Math.round((settings.login_card_opacity || 0.6) * 255).toString(16).padStart(2, '0')}` : undefined
                    }}
                >

                    {/* Header - Inside Card */}
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-black text-white tracking-[0.3em] uppercase mb-1">
                            {settings.academy_name || 'Healy Gymnastic'}
                        </h1>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 bg-[#D4AF37]/30"></div>
                            <span className="text-[#D4AF37] text-[9px] font-black uppercase tracking-[0.7em] opacity-80">
                                Academy
                            </span>
                            <div className="h-[1px] w-8 bg-[#D4AF37]/30"></div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-rose-400 text-[10px] font-black p-3 rounded-2xl mb-5 bg-rose-500/10 border border-rose-500/10 text-center uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        {/* Access ID Field */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-white uppercase tracking-[0.2em] ml-6">
                                Access ID
                            </label>
                            <input
                                type="email"
                                required
                                dir="ltr"
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full px-8 py-3.5 bg-black/40 border-2 border-[#D4AF37] md:border md:border-[#D4AF37]/30 rounded-2xl focus:border-[#D4AF37] outline-none transition-all text-white text-sm font-bold shadow-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Secret Key Field */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-white uppercase tracking-[0.2em] ml-6">
                                Secret Key
                            </label>
                            <input
                                type="password"
                                required
                                dir="ltr"
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full px-8 py-3.5 bg-black/40 border-2 border-[#D4AF37] md:border md:border-[#D4AF37]/30 rounded-2xl focus:border-[#D4AF37] outline-none transition-all text-white text-sm font-bold shadow-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Black & Gold Premium Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative py-3 md:py-3.5 mt-1 rounded-full font-black text-[11px] uppercase tracking-[0.5em] bg-black text-[#D4AF37] border border-[#D4AF37]/40 shadow-xl hover:bg-[#D4AF37]/5 transition-all active:scale-[0.98] group/btn overflow-hidden"
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
                            className="flex items-center gap-3 px-6 py-2 rounded-full bg-white/[0.05] border border-white/20 text-white hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all text-[9px] font-black uppercase tracking-[0.3em]"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                        </button>

                        {/* Copyright Footer */}
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">
                            © 2026 Healy Academy
                        </span>

                        {/* Diagnostic Trace - Temporary for Troubleshooting */}
                        <div className="fixed bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/5 text-[5px] text-white/20 font-mono z-[9999] pointer-events-none flex gap-2">
                            <span>ACADEMY: {settings.academy_name?.substring(0, 8) || 'NULL'}</span>
                            <span>BG: {settings.login_bg_url ? 'CUSTOM' : 'SYSTEM'}</span>
                        </div>
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
                /* Universal Glass Effect */
                .glass-effect {
                    background-color: var(--card-bg, rgba(0, 0, 0, 0.6)) !important;
                    backdrop-filter: blur(40px) !important;
                    opacity: 1 !important;
                    border-color: rgba(212, 175, 55, 0.2) !important;
                    transition: all 0.7s ease-out;
                }

                @media (min-width: 1024px) {
                    .glass-effect {
                        opacity: 0.95 !important;
                    }
                }

                @media (hover: hover) {
                    .glass-effect:hover, .glass-effect:focus-within {
                        opacity: 1 !important;
                        background-color: rgba(0, 0, 0, 0.8) !important;
                        border-color: rgba(212, 175, 55, 0.5) !important;
                    }
                }
                
                /* For all devices (including touch): make solid when typing/focused */
                .glass-effect:focus-within {
                    opacity: 1 !important;
                    background-color: #000000 !important;
                    backdrop-filter: none !important;
                    border-color: #D4AF37 !important;
                }
                input {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-color: #D4AF37 !important;
                }
                /* Removed hardcoded media queries in favor of state-based logic */
                @media (min-width: 768px) {
                    input {
                        border-color: #D4AF374d !important;
                    }
                }
                input:focus {
                    border-color: #D4AF37 !important;
                    box-shadow: none !important;
                }
                input:invalid, input:focus:invalid, input:hover:invalid {
                    box-shadow: none !important;
                    border-color: #D4AF37 !important;
                    outline: none !important;
                }
            `}</style>
        </div>
    );
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Globe, Sparkles, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

export default function EpicLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { updateSettings, settings } = useTheme();

    const logoPath = "/logo.png";
    const bgPath = "/Tom Roberton Images _ Balance-and-Form _ 2.jpg";

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
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-cairo">

            {/* Dynamic Background with Natural Scaling */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 transition-transform duration-1000"
                    style={{ backgroundImage: `url('${bgPath}')` }}
                ></div>

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            </div>

            <div className="w-full max-w-md relative z-10 group/page">

                {/* Prominent Logo - Faded as requested */}
                <div className="flex justify-center mb-8 relative group">
                    <div className="relative">
                        <div className="absolute inset-[-30px] bg-[#D4AF37]/10 blur-3xl rounded-full opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
                        <div className="w-36 h-36 rounded-full overflow-hidden flex items-center justify-center relative z-10">
                            <img
                                src={logoPath}
                                alt="Logo"
                                className="w-full h-full object-contain opacity-90 md:opacity-60 md:group-hover:opacity-90 transition-all duration-700 drop-shadow-xl mix-blend-screen"
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

                {/* Login Card - High Contrast Design */}
                <div className="group/card bg-zinc-950/90 md:bg-black/40 hover:bg-black/60 backdrop-blur-3xl border border-[#D4AF37]/30 md:border-white/[0.05] hover:border-[#D4AF37]/50 rounded-[3rem] p-8 md:px-12 md:py-8 shadow-[0_0_50px_rgba(0,0,0,1)] md:shadow-none hover:shadow-[0_50px_140px_rgba(0,0,0,0.9)] transition-all duration-700 ease-out">

                    {/* Header - Inside Card */}
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-black text-white tracking-[0.3em] uppercase mb-1">
                            Epic Gymnastic
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
                            <label className="block text-[10px] font-black text-white md:text-white/30 uppercase tracking-[0.2em] ml-6">
                                Access ID
                            </label>
                            <input
                                type="email"
                                required
                                dir="ltr"
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full px-8 py-3.5 bg-white/[0.03] border border-[#D4AF37] md:border-[#D4AF37]/30 rounded-2xl focus:border-[#D4AF37] outline-none transition-all text-white text-sm font-bold shadow-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Secret Key Field */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-white md:text-white/30 uppercase tracking-[0.2em] ml-6">
                                Secret Key
                            </label>
                            <input
                                type="password"
                                required
                                dir="ltr"
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full px-8 py-3.5 bg-white/[0.03] border border-[#D4AF37] md:border-[#D4AF37]/30 rounded-2xl focus:border-[#D4AF37] outline-none transition-all text-white text-sm font-bold shadow-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Black & Gold Premium Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative py-3.5 mt-2 rounded-full font-black text-[11px] uppercase tracking-[0.5em] bg-black text-[#D4AF37] border border-[#D4AF37]/40 shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_40px_rgba(212,175,55,0.1)] hover:bg-[#D4AF37]/5 transition-all active:scale-[0.98] group/btn overflow-hidden"
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
                    <div className="mt-7 flex flex-col items-center gap-4">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-3 px-8 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:border-[#D4AF37]/40 transition-all text-[10px] font-black uppercase tracking-[0.3em]"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                        </button>

                        {/* Copyright Footer */}
                        <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">
                            © 2026 Epic Gymnastic Academy
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
                input {
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border-color: #D4AF374d !important;
                }
                input:focus {
                    border-color: #D4AF3799 !important;
                    box-shadow: none !important;
                }
                input:invalid, input:focus:invalid, input:hover:invalid {
                    box-shadow: none !important;
                    border-color: #D4AF374d !important;
                    outline: none !important;
                }
            `}</style>
        </div>
    );
}

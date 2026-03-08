import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Globe, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/app');
            }
        };
        checkSession();
    }, [navigate]);

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
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
        document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    };

    return (
        <div className="relative min-h-screen w-full font-cairo bg-black overflow-hidden flex items-center justify-center select-none">
            {/* Background Image Layer */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/Tom Roberton Images _ Balance-and-Form _ 2.jpg"
                    alt="Background"
                    className="w-full h-full object-cover opacity-80"
                />
            </div>

            {/* Login Card Layer */}
            <div className="relative z-10 w-[420px]">
                <div className="bg-[#0a0a0a] rounded-[3rem] px-10 py-12 w-full flex flex-col justify-center border border-white/[0.02] shadow-2xl relative">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="font-black text-white text-2xl tracking-[0.1em] uppercase mb-2 drop-shadow-md">
                            ACADEMY SYSTEM
                        </h1>
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] w-8 bg-[#D4AF37]/40"></div>
                            <span className="font-black uppercase tracking-[0.4em] text-[#D4AF37] opacity-90 text-[10px]">
                                ACADEMY
                            </span>
                            <div className="h-[1px] w-8 bg-[#D4AF37]/40"></div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-rose-400 text-[10px] font-black p-3 rounded-2xl mb-5 bg-rose-500/10 border border-rose-500/10 text-center uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="w-full relative flex flex-col gap-6" noValidate>

                        {/* Email Input */}
                        <div className="relative z-10 space-y-2">
                            <label className="block font-black uppercase tracking-[0.3em] text-white/50 text-[10px]">
                                EMAIL ADDRESS
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full bg-[#151515] border border-white/5 rounded-2xl h-14 px-6 font-bold text-white tracking-widest focus:outline-none focus:border-[#D4AF37]/30 transition-colors shadow-inner"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Relative Container for Password & Overlapping Badge */}
                        <div className="relative w-full z-10 mt-2">
                            {/* Password Label */}
                            <label className="block font-black uppercase tracking-[0.3em] text-white/50 text-[10px] mb-2">
                                PASSWORD
                            </label>

                            {/* Center Overlapping Logo (Placed exactly to overlap the two inputs) */}
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                <img
                                    src="/logo.png"
                                    alt="Academy Badge"
                                    className="w-[100px] h-[100px] object-contain rounded-full shadow-2xl drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
                                />
                            </div>

                            {/* Password Input */}
                            <input
                                type="password"
                                required
                                className="w-full bg-[#151515] border border-white/5 rounded-2xl h-14 px-6 font-bold text-white tracking-widest focus:outline-none focus:border-[#D4AF37]/30 transition-colors shadow-inner"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 mt-8 rounded-full font-black uppercase tracking-[0.4em] text-[#D4AF37] bg-[#050505] border border-[#D4AF37]/20 hover:bg-[#111] hover:border-[#D4AF37]/40 transition-colors flex items-center justify-center gap-2 shadow-xl"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    LOGIN
                                    <Sparkles className="w-3 h-3 opacity-60" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer / Switch Lang */}
                    <div className="mt-8 flex flex-col items-center gap-5 w-full">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                toggleLanguage();
                            }}
                            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-white/60 font-black uppercase tracking-[0.25em] text-[9px] bg-[#111] border border-white/5 hover:bg-[#151515] hover:text-white transition-colors"
                        >
                            <Globe className="w-3 h-3" />
                            {i18n.language === 'en' ? 'SWITCH TO ARABIC' : 'SWITCH TO ENGLISH'}
                        </button>
                        <span className="font-black uppercase tracking-[0.3em] text-white/10 text-[8px]">
                            © 2026 ACADEMY SYSTEM
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
}

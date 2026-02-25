import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Loader2, User, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'coach'>('coach'); // Default to coach
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Sign up with auto-confirm (no email verification needed)
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role, // Add role to metadata
                    },
                    emailRedirectTo: undefined, // Disable email confirmation
                },
            });

            if (signUpError) throw signUpError;

            // 2. If signup successful, automatically sign in
            if (data.user) {
                // 2.5 Create a profile record (CRITICAL: Dashboard depends on this)
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: data.user.id,
                    full_name: fullName,
                    email: email,
                    role: role,
                });

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // We don't throw here to avoid blocking sign-in, 
                    // but the user might have empty dashboard until fixed
                }

                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;

                // 3. If role is coach, create a record in the coaches table
                if (role === 'coach') {
                    const { error: coachError } = await supabase.from('coaches').insert({
                        id: data.user.id,
                        full_name: fullName,
                        specialty: 'Gymnastics Coach', // Default
                        pt_rate: 0,
                    });
                    if (coachError) console.error('Error creating coach record:', coachError);
                }

                // Navigate to dashboard
                navigate('/');
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to register');
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
        <div className="min-h-screen flex items-center justify-center bg-black font-cairo p-4 relative overflow-hidden">
            {/* Background Cinematic Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>

            <div className="w-full max-w-lg relative z-10">
                {/* Logo Section */}
                <div className="mb-12 text-center animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="relative inline-block group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="relative h-24 w-auto mx-auto drop-shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-transform hover:scale-105 duration-500"
                        />
                    </div>
                </div>

                {/* Register Card */}
                <div className="glass-card rounded-[3rem] border border-white/10 shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-700">
                    <div className="p-10 md:p-14">
                        <div className="mb-10 text-center">
                            <h1 className="text-4xl font-black text-white uppercase tracking-tighter premium-gradient-text">
                                {t('common.register') || 'Create Account'}
                            </h1>
                            <p className="text-white/30 mt-3 text-xs font-black uppercase tracking-[0.3em]">
                                Join the Academy Elite
                            </p>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 text-rose-400 text-xs font-black p-4 rounded-2xl mb-8 border border-rose-500/20 text-center uppercase tracking-widest animate-in shake duration-500">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-4">
                                    Full Name
                                </label>
                                <div className="flex items-center group bg-white/5 border border-white/10 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all overflow-hidden">
                                    <div className="pl-6 pr-2 py-4 flex-shrink-0">
                                        <User className="w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-transparent border-none outline-none py-4 pr-8 text-white placeholder-white/10 font-bold text-lg tracking-tight"
                                        placeholder="Full Name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-4">
                                    Email Address
                                </label>
                                <div className="flex items-center group bg-white/5 border border-white/10 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all overflow-hidden">
                                    <div className="pl-6 pr-2 py-4 flex-shrink-0">
                                        <Mail className="w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        dir="ltr"
                                        className="w-full bg-transparent border-none outline-none py-4 pr-8 text-white placeholder-white/10 font-bold text-lg tracking-tight text-left"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-4">
                                    Password
                                </label>
                                <div className="flex items-center group bg-white/5 border border-white/10 rounded-[2rem] focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary/50 transition-all overflow-hidden">
                                    <div className="pl-6 pr-2 py-4 flex-shrink-0">
                                        <Lock className="w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        dir="ltr"
                                        className="w-full bg-transparent border-none outline-none py-4 pr-8 text-white placeholder-white/10 font-bold text-lg tracking-tight text-left"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-4">
                                    Account Role
                                </label>
                                <div className="relative group/role">
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as 'admin' | 'coach')}
                                        className="w-full px-8 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-bold text-lg tracking-tight appearance-none cursor-pointer pr-16"
                                    >
                                        <option value="coach" className="bg-slate-900">Coach / مدرب</option>
                                        <option value="admin" className="bg-slate-900">Admin / مدير</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none opacity-40 group-hover/role:opacity-100 transition-opacity">
                                        <ChevronDown className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative group overflow-hidden mt-6"
                            >
                                <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100"></div>
                                <div className="relative bg-primary hover:bg-primary/90 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg uppercase tracking-widest">
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <span>Create Account</span>
                                    )}
                                </div>
                            </button>
                        </form>

                        <div className="mt-10 flex flex-col items-center gap-6">
                            <Link to="/login" className="text-[10px] font-black text-white/40 hover:text-primary uppercase tracking-[0.3em] transition-colors">
                                Already have an account? <span className="text-primary underline">Log In</span>
                            </Link>

                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
                            >
                                <Globe className="w-4 h-4" />
                                {i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

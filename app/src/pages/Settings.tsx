import React, { useState, useEffect } from 'react';
import {
    User,
    Settings as SettingsIcon,
    Moon,
    Sun,
    Bell,
    Shield,
    LogOut,
    ChevronRight,
    Camera,
    Check,
    Save,
    Globe,
    CreditCard,
    Plus,
    Trash2,
    Palette,
    Menu,
    X,
    Layout,
    LayoutDashboard,
    Type,
    Maximize,
    Box,
    RefreshCw,
    Building2,
    Loader2,
    CheckCircle2,
    Sparkles,
    Zap,
    ShieldCheck,
    AlertTriangle,
    Lock as LockIcon,
    Key as KeyIcon,
    Search,
    Edit2,
    Upload,
    Calendar,
    Clock,
    ArrowRight,
    ChevronDown
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionPlans, useAddPlan, useDeletePlan, useUpdatePlan } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { useTheme, applySettingsToRoot, defaultSettings, GymSettings } from '../context/ThemeContext';
import { useOutletContext } from 'react-router-dom';

export default function Settings() {
    const { currency, setCurrency } = useCurrency();
    const { settings, updateSettings, resetToDefaults } = useTheme();
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishProgress, setPublishProgress] = useState(0);
    const [publishStep, setPublishStep] = useState('');
    const { t, i18n } = useTranslation();
    const context = useOutletContext<{ role: string }>() || { role: null };
    const role = context.role?.toLowerCase()?.trim();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Draft state for local preview before saving
    const [draftSettings, setDraftSettings] = useState<GymSettings>(settings);

    // Sync draft with global settings when they change (initial load or external update)
    useEffect(() => {
        setDraftSettings(settings);
    }, [settings]);

    // Live Preview Effect: Apply draft settings to root in real-time
    useEffect(() => {
        applySettingsToRoot(draftSettings);
    }, [draftSettings]);

    const handleSaveTheme = async () => {
        setIsPublishing(true);
        setPublishProgress(10);
        setPublishStep(t('settings.initializingEngine'));

        await new Promise(r => setTimeout(r, 800));
        setPublishProgress(40);
        setPublishStep(t('settings.optimizingVariables'));

        await new Promise(r => setTimeout(r, 600));
        setPublishProgress(70);
        setPublishStep(t('settings.syncingDatabase'));

        try {
            // Filter out gym-wide settings to prevent unauthorized update attempts by non-admins
            // This prevents the "403 Forbidden" error when Coaches save their theme
            const { academy_name, gym_phone, gym_address, logo_url, ...themeOnlySettings } = draftSettings;

            await updateSettings(themeOnlySettings);
            setPublishProgress(100);
            setPublishStep(t('settings.publishSuccess'));
            await new Promise(r => setTimeout(r, 1200));
        } catch (error) {
            toast.error('Publishing failed. Check connection.');
        } finally {
            setIsPublishing(false);
            setPublishProgress(0);
        }
    };

    const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'academy'>(
        role === 'admin' ? 'academy' : 'appearance'
    );
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [userData, setUserData] = useState({
        full_name: '',
        email: ''
    });
    const [initialEmail, setInitialEmail] = useState('');

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error('Error fetching profile:', profileError);
                }

                setUserData({
                    full_name: profile?.full_name || '',
                    email: user.email || ''
                });
                setInitialEmail(user.email || '');
            }
        };
        fetchProfile();
    }, []);

    const themes = [
        { id: 'elite', name: 'Elite Red', primary: '#A30000', secondary: '#0B120F', bg: '#0B120F', accent: '#A30000', surface: 'rgba(21, 31, 28, 0.8)', hover: '#A3000080', input: '#070D0B', font: 'Cairo' },
        { id: 'midnight', name: 'Midnight', primary: '#818cf8', secondary: '#1e293b', bg: '#0f172a', accent: '#c084fc', surface: 'rgba(30, 41, 59, 0.7)', hover: '#818cf880', input: '#0f172a' },
        { id: 'noguchi', name: 'Noguchi Pink', primary: '#ff096c', secondary: '#192731', bg: '#192731', accent: '#ff096c', surface: 'rgba(42, 56, 67, 0.7)', hover: '#ff096c80', input: '#111d26' },
        { id: 'obsidian', name: 'Obsidian', primary: '#a78bfa', secondary: '#18181b', bg: '#000000', accent: '#a78bfa', surface: 'rgba(24, 24, 27, 0.7)', hover: '#a78bfa80', input: '#09090b' },
        { id: 'emerald', name: 'Emerald', primary: '#34d399', secondary: '#1e3a2f', bg: '#0a1f1a', accent: '#2dd4bf', surface: 'rgba(6, 78, 59, 0.7)', hover: '#34d39980', input: '#061a15' },
        { id: 'crimson', name: 'Crimson', primary: '#fb7185', secondary: '#3f1d28', bg: '#1a0a0f', accent: '#f43f5e', surface: 'rgba(76, 5, 25, 0.7)', hover: '#fb718580', input: '#14070a' },
        { id: 'amber', name: 'Amber', primary: '#fbbf24', secondary: '#3f2f1d', bg: '#1a140a', accent: '#f59e0b', surface: 'rgba(6, 26, 3, 0.7)', hover: '#fbbf2480', input: '#140c06' },
        { id: 'deepsea', name: 'Ocean', primary: '#22d3ee', secondary: '#1e3a3f', bg: '#0a1a1f', accent: '#06b6d4', surface: 'rgba(22, 78, 99, 0.7)', hover: '#22d3ee80', input: '#07151a' },
        { id: 'royal', name: 'Royal', primary: '#c084fc', secondary: '#2e1f3f', bg: '#14091a', accent: '#a855f7', surface: 'rgba(59, 7, 100, 0.7)', hover: '#c084fc80', input: '#0e0514' },
        { id: 'sunset', name: 'Sunset', primary: '#f43f5e', secondary: '#4c0519', bg: '#23020b', accent: '#f59e0b', surface: 'rgba(76, 5, 25, 0.7)', hover: '#f43f5e80', input: '#1a0209' },
        { id: 'forest', name: 'Forest', primary: '#84cc16', secondary: '#14532d', bg: '#052e16', accent: '#34d399', surface: 'rgba(20, 83, 45, 0.7)', hover: '#84cc1680', input: '#042211' },
        { id: 'lavender', name: 'Lavender', primary: '#d8b4fe', secondary: '#4c1d95', bg: '#2e1065', accent: '#818cf8', surface: 'rgba(76, 29, 149, 0.7)', hover: '#d8b4fe80', input: '#210b4a' },
        { id: 'coffee', name: 'Coffee', primary: '#d4a373', secondary: '#281b15', bg: '#1a0f0a', accent: '#faedcd', surface: 'rgba(40, 27, 21, 0.7)', hover: '#d4a37380', input: '#1a110d' },
        { id: 'shoqata', name: 'Shoqata', primary: '#1a2937', secondary: '#e3e4e4', bg: '#e3e4e4', accent: '#344351', surface: 'rgba(187, 189, 190, 0.7)', hover: '#1a293780', input: '#ffffff' },
    ];

    const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'midnight');

    const applyPreset = (theme: typeof themes[0]) => {
        setCurrentTheme(theme.id);
        localStorage.setItem('theme', theme.id);

        setDraftSettings(prev => ({
            ...prev,
            primary_color: theme.primary,
            secondary_color: theme.secondary,
            accent_color: theme.accent || prev.accent_color,
            surface_color: theme.surface || prev.surface_color,
            hover_color: (theme as any).hover || prev.hover_color,
            input_bg_color: (theme as any).input || prev.input_bg_color,
            font_family: (theme as any).font || prev.font_family,
        }));
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateSettings({
                academy_name: draftSettings.academy_name,
                gym_phone: draftSettings.gym_phone,
                gym_address: draftSettings.gym_address,
                logo_url: draftSettings.logo_url
            });
            window.dispatchEvent(new Event('gymProfileUpdated'));
            toast.success(t('common.saveSuccess'));
        } catch (error: any) {
            console.error('Failed to save gym profile:', error);
            toast.error(error.message || 'Failed to save gym profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLoginCustomization = async () => {
        setLoading(true);
        try {
            await updateSettings({
                login_bg_url: draftSettings.login_bg_url,
                login_logo_url: draftSettings.login_logo_url,
                login_card_opacity: draftSettings.login_card_opacity,
                login_card_color: draftSettings.login_card_color,
                academy_name: draftSettings.academy_name
            });
            toast.success("Login page settings saved successfully");
        } catch (error: any) {
            console.error('Failed to save login settings:', error);
            toast.error(error.message || 'Failed to save login settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Session expired or security token invalid. Please log in again.');

            const inputEmail = userData.email.trim().toLowerCase();
            const currentAuthEmail = user.email?.trim().toLowerCase();

            // 2. Update Profile & Sync Email (Trigger-based)
            const isEmailChange = inputEmail && currentAuthEmail && inputEmail !== currentAuthEmail;

            const { error: profileSyncError } = await supabase
                .from('profiles')
                .update({
                    full_name: userData.full_name,
                    ...(isEmailChange ? { email: inputEmail } : {})
                })
                .eq('id', user.id);

            if (profileSyncError) throw profileSyncError;

            if (isEmailChange && role === 'admin') {
                // For admin users, we rely on the database trigger 'on_profile_email_update' 
                // to sync the email to auth.users and auth.identities securely.
                // This bypasses GoTrue's SMTP/domain validation which often fails on custom domains.
                console.log('✅ Email sync triggered via database for admin:', inputEmail);
                toast.success(t('common.saveSuccess', 'Profile and login email updated successfully'));
            } else {
                toast.success(t('common.saveSuccess'));
            }

            window.dispatchEvent(new Event('userProfileUpdated'));
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.message || 'Error updating profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error('Please fill in both password fields');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });
            if (error) throw error;
            toast.success('Password updated successfully');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Error updating password');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            setDraftSettings(prev => ({ ...prev, logo_url: data.publicUrl }));
            toast.success('Logo uploaded successfully');
        } catch (error: any) {
            console.error('Error uploading logo:', error);
            toast.error('Error uploading logo');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Premium Publishing Overlay */}
            {isPublishing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl animate-in fade-in duration-700"></div>
                    <div className="relative glass-card p-10 rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(var(--color-primary),0.1)] max-w-sm w-full text-center animate-in zoom-in slide-in-from-bottom-12 duration-1000 flex flex-col items-center">
                        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-primary/10 rounded-full blur-[40px] animate-pulse scale-75"></div>
                            <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full transform -rotate-90 filter drop-shadow-[0_0_10px_rgba(var(--color-primary),0.2)]">
                                <circle cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/[0.03]" />
                                <circle
                                    cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="6" fill="transparent"
                                    strokeDasharray={540} strokeDashoffset={540 - (540 * publishProgress) / 100}
                                    className="transition-all duration-1000 ease-in-out"
                                    style={{ color: 'var(--color-brand-label)' }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="relative z-10 flex items-center justify-center w-24 h-24">
                                {publishProgress === 100 ? (
                                    <div className="bg-primary/20 p-4 rounded-full border border-primary/30 animate-in zoom-in spin-in-12 duration-700">
                                        <CheckCircle2 className="w-8 h-8 text-primary" />
                                    </div>
                                ) : (
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute w-14 h-14 border-2 border-primary/20 rounded-full animate-ping duration-[2000ms]"></div>
                                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4 w-full">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-[0.4em] animate-pulse" style={{ color: 'var(--color-brand-label)' }}>
                                    {publishProgress === 100 ? 'Update Complete' : 'Optimizing'}
                                </p>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight">
                                    {publishProgress === 100 ? t('settings.publishComplete') : t('settings.publishingDesign')}
                                </h3>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.1em] px-5 py-1.5 bg-white/5 rounded-full border border-white/5">
                                    {publishStep}
                                </p>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3].map((step) => (
                                        <div
                                            key={step}
                                            className={`h-1 rounded-full transition-all duration-500 ${publishProgress >= (step * 33)
                                                ? 'w-6 bg-primary shadow-[0_0_5px_rgba(var(--color-primary),0.5)]'
                                                : 'w-1.5 bg-white/10'}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-3 w-full">
                            <div className="p-4 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col items-center gap-2">
                                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-brand-label)', opacity: 0.6 }} />
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] text-center">{t('settings.encryptionNote')}</span>
                            </div>
                            <div className="p-4 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col items-center gap-2">
                                <Zap className="w-4 h-4" style={{ color: 'var(--color-brand-label)', opacity: 0.6 }} />
                                <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] text-center">{t('settings.syncReadyNote')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-white/5 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-black premium-gradient-text tracking-tighter uppercase leading-[0.9]">{t('settings.title')}</h1>
                    <p className="text-white/40 mt-1 text-[10px] sm:text-xs font-bold tracking-wide uppercase opacity-100">{t('settings.subtitle')}</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-white/5 rounded-xl w-fit group">
                {role === 'admin' && (
                    <button
                        onClick={() => setActiveTab('academy')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'academy' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        {t('settings.academy')}
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('appearance')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'appearance' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    <Palette className="w-3.5 h-3.5" />
                    {t('settings.appearance')}
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    <User className="w-3.5 h-3.5" />
                    {t('settings.profile')}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Appearance & Branding Settings */}
                {activeTab === 'appearance' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                        <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-primary/20 rounded-xl text-primary">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    {t('settings.theme')}
                                </h2>

                                <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-center sm:text-left">
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">{t('settings.baseAppearance')}</h3>
                                        <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider mt-0.5">{t('settings.themeDescription')}</p>
                                    </div>
                                    <div className="flex bg-black/20 p-1 rounded-xl">
                                        <button
                                            onClick={() => setDraftSettings(prev => ({ ...prev, secondary_color: '#F8FAFC', surface_color: '#ffffff', input_bg_color: '#ffffff', search_bg_color: '#f1f5f9', search_text_color: '#0f172a' }))}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${draftSettings.secondary_color === '#F8FAFC' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Sun className="w-3.5 h-3.5" />
                                            {t('settings.light')}
                                        </button>
                                        <button
                                            onClick={() => setDraftSettings(prev => ({ ...prev, secondary_color: '#0E1D21', surface_color: 'rgba(18, 46, 52, 0.7)', input_bg_color: '#0f172a', search_bg_color: 'rgba(255, 255, 255, 0.05)', search_text_color: '#ffffff' }))}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${draftSettings.secondary_color !== '#F8FAFC' ? 'bg-secondary text-primary shadow-lg ring-1 ring-white/10' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Moon className="w-3.5 h-3.5" />
                                            {t('settings.dark')}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                    {themes.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => applyPreset(theme)}
                                            className={`group relative p-3 rounded-2xl border-2 transition-all duration-500 hover:scale-[1.05] active:scale-95 ${currentTheme === theme.id
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                                : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="aspect-video rounded-lg mb-2 overflow-hidden border border-white/10 relative">
                                                <div className="absolute inset-0 flex flex-col">
                                                    <div className="h-full" style={{ backgroundColor: theme.bg }}></div>
                                                    <div className="absolute top-0 right-0 w-1/2 h-full opacity-20" style={{ backgroundColor: theme.primary, clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }}></div>
                                                </div>
                                                <div className="absolute bottom-1.5 left-1.5 w-1 h-1 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                                                <div className="absolute bottom-1.5 left-3.5 w-1 h-1 rounded-full" style={{ backgroundColor: theme.secondary }}></div>
                                                <div className="absolute bottom-1.5 left-5.5 w-1 h-1 rounded-full" style={{ backgroundColor: theme.accent }}></div>
                                            </div>
                                            <span className={`block text-center font-black text-[7px] uppercase tracking-[0.15em] transition-colors ${currentTheme === theme.id ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>
                                                {theme.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium relative overflow-hidden">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-500">
                                    <Palette className="w-5 h-5" />
                                </div>
                                {t('settings.designCustomization')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-10 border-r border-white/5 pr-0 md:pr-12">
                                    {/* Left Column: ALL Colors */}
                                    <div>
                                        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5 pb-2 mb-6">{t('settings.colorsAtmosphere')}</h3>
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Core Identity</span>
                                                </div>
                                                <PremiumColorPicker label={t('settings.primaryColor')} value={draftSettings.primary_color} onChange={(val) => setDraftSettings({ ...draftSettings, primary_color: val })} />
                                                <PremiumColorPicker label={t('settings.backgroundColor')} value={draftSettings.secondary_color} onChange={(val) => setDraftSettings({ ...draftSettings, secondary_color: val })} />
                                                <PremiumColorPicker label={t('settings.accentColor')} value={draftSettings.accent_color} onChange={(val) => setDraftSettings({ ...draftSettings, accent_color: val })} />
                                            </div>

                                            <div className="pt-4 border-t border-white/5 space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1 h-3 bg-white/20 rounded-full"></div>
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Interface Elements</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <PremiumColorPicker label="Brand Text" value={draftSettings.brand_label_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, brand_label_color: val })} />
                                                    <PremiumColorPicker label="Surface" value={draftSettings.surface_color} onChange={(val) => setDraftSettings({ ...draftSettings, surface_color: val })} />
                                                    <PremiumColorPicker label="Input Bg" value={draftSettings.input_bg_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, input_bg_color: val })} />
                                                    <PremiumColorPicker label="Search Bg" value={draftSettings.search_bg_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, search_bg_color: val })} />
                                                    <PremiumColorPicker label="Hover" value={draftSettings.hover_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, hover_color: val })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-10 pl-0 md:pl-4">
                                    {/* Right Column: Typography & Experience */}
                                    <div>
                                        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] border-b border-white/5 pb-2 mb-6">{t('settings.typographyStyle')}</h3>

                                        <div className="space-y-8">
                                            {/* Font Selection */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Type className="w-3 h-3" />
                                                    {t('settings.applicationFont')}
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {['Cairo', 'Inter', 'Outfit', 'Montserrat', 'Alexandria', 'Kanit', 'Poppins', 'Roboto', 'Lexend', 'Playfair Display'].map(font => (
                                                        <button
                                                            key={font}
                                                            onClick={() => setDraftSettings({ ...draftSettings, font_family: font })}
                                                            className={`p-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-transparent ${draftSettings.font_family === font ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'}`}
                                                            style={{ fontFamily: font }}
                                                        >
                                                            {font}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Sliders */}
                                            <div className="grid grid-cols-1 gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <label className="text-[9px] text-white/60 font-black uppercase tracking-widest">{t('settings.fontScale')}</label>
                                                        <span className="text-[9px] text-primary font-bold">{Math.round(draftSettings.font_scale * 100)}%</span>
                                                    </div>
                                                    <input type="range" min="0.8" max="1.2" step="0.05" value={draftSettings.font_scale} onChange={(e) => setDraftSettings({ ...draftSettings, font_scale: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <label className="text-[9px] text-white/60 font-black uppercase tracking-widest">{t('settings.glassIntensity')}</label>
                                                        <span className="text-[9px] text-primary font-bold">{Math.round(draftSettings.glass_opacity * 100)}%</span>
                                                    </div>
                                                    <input type="range" min="0.2" max="0.9" step="0.05" value={draftSettings.glass_opacity} onChange={(e) => setDraftSettings({ ...draftSettings, glass_opacity: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                                                </div>
                                            </div>

                                            {/* Integration Switches */}
                                            <div className="space-y-4 pt-2">
                                                <h4 className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Widgets & Integrations</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <PremiumSwitch label={t('settings.clockIntegration')} checked={draftSettings.clock_position !== 'none'} onChange={(checked) => setDraftSettings({ ...draftSettings, clock_position: checked ? 'header' : 'none' })} />
                                                    <PremiumSwitch label={t('settings.weatherIntegration')} checked={draftSettings.weather_integration || false} onChange={(checked) => setDraftSettings({ ...draftSettings, weather_integration: checked })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 bg-black/20 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
                                <button
                                    onClick={handleSaveTheme}
                                    className="relative group overflow-hidden bg-gradient-to-r from-primary via-accent to-primary bg-size-200 bg-pos-0 hover:bg-pos-100 text-white px-6 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all duration-500 shadow-[0_0_20px_rgba(var(--color-primary),0.2)] hover:shadow-[0_0_40px_rgba(var(--color-primary),0.4)] hover:scale-105 active:scale-95 border border-white/20 min-w-[140px]"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    <Save className="w-4 h-4 relative z-10 drop-shadow-md" />
                                    <span className="relative z-10 drop-shadow-md">SAVE</span>
                                </button>
                                <button
                                    onClick={() => setDraftSettings(defaultSettings)}
                                    className="bg-white/[0.03] hover:bg-white/[0.08] text-white/40 hover:text-white px-6 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:scale-105 active:scale-95 border border-white/5 hover:border-white/20 backdrop-blur-md flex items-center justify-center gap-2 min-w-[120px]"
                                >
                                    RESET
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Academy Settings (Admin Only) */}
                {activeTab === 'academy' && role === 'admin' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                        {/* Currency */}
                        <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium relative overflow-hidden">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-500">
                                    <Globe className="w-5 h-5" />
                                </div>
                                Currency
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                                    <button
                                        key={code}
                                        onClick={() => setCurrency(code)}
                                        className={`p-4 rounded-2xl border transition-all ${currency.code === code ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-white/5'}`}
                                    >
                                        <div className="text-lg mb-1 text-white">{CURRENCIES[code].symbol}</div>
                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/50">{CURRENCIES[code].name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gym Profile */}
                            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium h-fit">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-primary/20 rounded-xl text-primary">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    {t('settings.gymProfile')}
                                </h2>

                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('settings.gymName')}</label>
                                            <input
                                                type="text"
                                                value={draftSettings.academy_name || ''}
                                                onChange={e => setDraftSettings({ ...draftSettings, academy_name: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('common.phone')}</label>
                                            <input
                                                type="text"
                                                value={draftSettings.gym_phone || ''}
                                                onChange={e => setDraftSettings({ ...draftSettings, gym_phone: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('settings.address')}</label>
                                            <input
                                                type="text"
                                                value={draftSettings.gym_address || ''}
                                                onChange={e => setDraftSettings({ ...draftSettings, gym_address: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary/20"
                                    >
                                        {loading ? 'Saving...' : t('common.save')}
                                    </button>
                                </form>
                            </div>

                            {/* Login Page Customization */}
                            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium h-fit">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-500">
                                        <Layout className="w-5 h-5" />
                                    </div>
                                    Login Page Customization
                                </h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Controls Column */}
                                    <div className="space-y-6">
                                        {/* Login Background */}
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Login Background</label>
                                            <div className="relative group/upload h-32 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                                {draftSettings.login_bg_url ? (
                                                    <img src={draftSettings.login_bg_url} alt="Login Background" className="w-full h-full object-cover opacity-60" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                                        <Layout className="w-8 h-8 text-white/10" />
                                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">No Custom Background</span>
                                                    </div>
                                                )}
                                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/upload:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            setUploading(true);
                                                            try {
                                                                const fileExt = file.name.split('.').pop();
                                                                const fileName = `login_bg_${Math.random().toString(36).substring(7)}.${fileExt}`;
                                                                const { data, error } = await supabase.storage.from('logos').upload(fileName, file);
                                                                if (error) throw error;
                                                                const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
                                                                setDraftSettings(prev => ({ ...prev, login_bg_url: publicUrl }));
                                                                toast.success('Background uploaded');
                                                            } catch (err: any) {
                                                                toast.error(err.message || 'Upload failed');
                                                            } finally {
                                                                setUploading(false);
                                                            }
                                                        }}
                                                    />
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Upload className="w-5 h-5 text-white" />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Change Background</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Login Logo */}
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">Login Logo</label>
                                            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                                                    {draftSettings.login_logo_url ? (
                                                        <img src={draftSettings.login_logo_url} alt="Login Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Camera className="w-6 h-6 text-white/20" />
                                                    )}
                                                </div>
                                                <label className="flex-1 cursor-pointer group">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            setUploading(true);
                                                            try {
                                                                const fileExt = file.name.split('.').pop();
                                                                const fileName = `login_logo_${Math.random().toString(36).substring(7)}.${fileExt}`;
                                                                const { data, error } = await supabase.storage.from('logos').upload(fileName, file);
                                                                if (error) throw error;
                                                                const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
                                                                setDraftSettings(prev => ({ ...prev, login_logo_url: publicUrl }));
                                                                toast.success('Logo uploaded');
                                                            } catch (err: any) {
                                                                toast.error(err.message || 'Upload failed');
                                                            } finally {
                                                                setUploading(false);
                                                            }
                                                        }}
                                                    />
                                                    <div className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-center">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">Change Logo</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Card Styles */}
                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <PremiumColorPicker
                                                label="Card Color"
                                                value={draftSettings.login_card_color || '#000000'}
                                                onChange={(val) => setDraftSettings({ ...draftSettings, login_card_color: val })}
                                            />
                                            <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex justify-between">
                                                    <label className="text-[9px] text-white/60 font-black uppercase tracking-widest">Card Opacity</label>
                                                    <span className="text-[9px] text-amber-500 font-bold">{Math.round((draftSettings.login_card_opacity || 0.6) * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0.1"
                                                    max="1"
                                                    step="0.05"
                                                    value={draftSettings.login_card_opacity || 0.6}
                                                    onChange={(e) => setDraftSettings({ ...draftSettings, login_card_opacity: parseFloat(e.target.value) })}
                                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Column */}
                                    <div className="flex flex-col gap-3">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2 text-center lg:text-left">Live Preview</label>
                                        <div className="flex-1 relative min-h-[300px] lg:min-h-0 aspect-[9/16] lg:aspect-auto rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-2xl">
                                            {/* Preview BG */}
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                                                style={{ backgroundImage: `url('${draftSettings.login_bg_url || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg"}?t=${Date.now()}')` }}
                                            >
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
                                            </div>

                                            {/* Preview Content */}
                                            <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                                                {/* Logo */}
                                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex items-center justify-center bg-black/20 backdrop-blur-md border border-white/10 mb-4">
                                                    <img
                                                        src={draftSettings.login_logo_url || "/logo.png"}
                                                        className="w-full h-full object-contain opacity-80"
                                                        style={{ clipPath: 'circle(50%)' }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "/logo.png";
                                                            console.warn("Preview logo failed to load, falling back to default.");
                                                        }}
                                                    />
                                                </div>

                                                {/* Card Preview */}
                                                <div
                                                    className="w-full max-w-[180px] rounded-[1.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-500"
                                                    style={{
                                                        backgroundColor: `${draftSettings.login_card_color || '#000000'}${Math.round((draftSettings.login_card_opacity || 0.6) * 255).toString(16).padStart(2, '0')}`,
                                                        backdropFilter: 'blur(10px)'
                                                    }}
                                                >
                                                    <div className="text-[7px] font-black text-white uppercase tracking-[0.2em] mb-1 truncate leading-tight">
                                                        {draftSettings.academy_name || 'Healy Gymnastic'}
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 mb-3">
                                                        <div className="h-[0.5px] w-4 bg-amber-500/30"></div>
                                                        <span className="text-amber-500 text-[4px] font-black uppercase tracking-[0.4em]">Academy</span>
                                                        <div className="h-[0.5px] w-4 bg-amber-500/30"></div>
                                                    </div>

                                                    <div className="space-y-2 mb-4">
                                                        <div className="h-2 w-full bg-white/5 rounded-md border border-white/5"></div>
                                                        <div className="h-2 w-full bg-white/5 rounded-md border border-white/5"></div>
                                                    </div>

                                                    <div className="h-4 w-full bg-amber-500/10 rounded-full border border-amber-500/20 flex items-center justify-center">
                                                        <span className="text-[4px] text-amber-500 font-black uppercase tracking-widest">Login</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-col items-center gap-1.5">
                                                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[5px] text-white/40 font-black uppercase tracking-widest">
                                                        Language Switcher
                                                    </div>
                                                    <span className="text-[4px] text-white/20 font-black uppercase tracking-widest">© 2026 Healy Academy</span>
                                                </div>
                                            </div>

                                            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/90 text-[8px] font-black text-black shadow-lg backdrop-blur-md">LIVE PREVIEW</div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveLoginCustomization}
                                    disabled={loading}
                                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-amber-500/20 mt-4 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Login Page Design
                                </button>
                            </div>
                        </div>

                        <SubscriptionPlansManager />
                    </div>
                )}

                {/* Profile Settings */}
                {activeTab === 'profile' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-secondary/20 rounded-xl text-primary">
                                        <User className="w-5 h-5" />
                                    </div>
                                    {t('settings.myProfile')}
                                </h2>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('settings.displayName')}</label>
                                        <input
                                            type="text"
                                            value={userData.full_name}
                                            onChange={e => setUserData({ ...userData, full_name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('settings.emailAddress')}</label>
                                        <input
                                            type="email"
                                            value={userData.email}
                                            onChange={e => setUserData({ ...userData, email: e.target.value })}
                                            disabled={role !== 'admin'}
                                            className={`w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none font-bold text-sm ${role !== 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl border border-white/10 font-black uppercase tracking-widest text-[10px]">
                                        {profileLoading ? t('common.saving') : t('settings.updateProfile')}
                                    </button>
                                </form>
                            </div>

                            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                    <div className="p-2.5 bg-rose-500/20 rounded-xl text-rose-400">
                                        <LockIcon className="w-5 h-5" />
                                    </div>
                                    {t('settings.changePassword')}
                                </h2>
                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('settings.newPassword')}</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-2">{t('settings.confirmPassword')}</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white outline-none font-bold text-sm"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl shadow-lg font-black uppercase tracking-widest text-[10px]">
                                        {passwordLoading ? t('common.saving') : t('settings.changePassword')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

// --- Helper Components & Functions ---

function hexToRgba(hex: string) {
    let r = 0, g = 0, b = 0, a = 1;
    if (hex.match(/^#?[0-9a-f]{6}$/i)) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    } else if (hex.match(/^#?[0-9a-f]{8}$/i)) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
        a = Math.round((parseInt(hex.slice(7, 9), 16) / 255) * 100) / 100;
    }
    return { r, g, b, a };
}

function rgbaToHex8(r: number, g: number, b: number, a: number) {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const alphaHex = toHex(Math.round(a * 255));
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
}

function stripAlpha(hex: string) {
    return hex.length === 9 || hex.length === 8 ? hex.slice(0, 7) : hex;
}

function PremiumColorPicker({ label, value, onChange, description }: { label: string; value: string; onChange: (val: string) => void; description?: string }) {
    const [opacity, setOpacity] = useState(hexToRgba(value || '#000000ff').a);
    const [baseColor, setBaseColor] = useState(stripAlpha(value || '#000000'));

    // Sync local state when value prop changes (e.g. via theme preset)
    useEffect(() => {
        const rgba = hexToRgba(value || '#000000ff');
        setOpacity(rgba.a);
        setBaseColor(stripAlpha(value || '#000000'));
    }, [value]);

    const handleBaseChange = (newHex: string) => {
        setBaseColor(newHex);
        const { r: nr, g: ng, b: nb } = hexToRgba(newHex);
        onChange(rgbaToHex8(nr, ng, nb, opacity));
    };
    const handleOpacityChange = (newOpacity: number) => {
        setOpacity(newOpacity / 100);
        const { r: nr, g: ng, b: nb } = hexToRgba(baseColor);
        onChange(rgbaToHex8(nr, ng, nb, newOpacity / 100));
    };
    const { r, g, b } = hexToRgba(baseColor);
    return (
        <div className="group/picker space-y-2.5 p-3 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-primary/30 transition-all shadow-premium-subtle">
            <div className="flex items-center justify-between">
                <label className="text-[8px] text-white/40 font-black uppercase tracking-[0.2em] group-hover/picker:text-primary transition-colors">{label}</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">Alpha</span>
                    <span className="text-[7px] font-black text-primary">{Math.round(opacity * 100)}%</span>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 group-hover/picker:scale-105 transition-transform duration-500">
                    <div className="absolute inset-0" style={{ backgroundImage: 'conic-gradient(#333 0.25turn, #444 0.25turn 0.5turn, #333 0.5turn 0.75turn, #444 0.75turn)', backgroundSize: '8px 8px' }}></div>
                    <div className="absolute inset-0" style={{ backgroundColor: value }}></div>
                    <input type="color" value={baseColor} onChange={(e) => handleBaseChange(e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col gap-0.5">
                        <input type="text" value={baseColor.toUpperCase()} onChange={(e) => { const val = e.target.value; if (val.match(/^#?[0-9a-f]{0,6}$/i)) handleBaseChange(val.startsWith('#') ? val : `#${val}`); }} className="text-xs font-black text-white tracking-[0.15em] font-mono leading-none bg-transparent border-none outline-none focus:text-primary transition-colors w-24" />
                        <div className="text-[6px] text-white/20 font-bold uppercase tracking-widest truncate">RGBA({r}, {g}, {b}, {opacity})</div>
                    </div>
                    <div className="relative group/slider pt-1">
                        <input type="range" min="0" max="100" value={Math.round(opacity * 100)} onChange={(e) => handleOpacityChange(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary group-hover/slider:bg-white/20 transition-all" />
                    </div>
                </div>
            </div>
            {description && <div className="text-[7px] text-white/30 font-bold uppercase tracking-widest border-t border-white/5 pt-2 leading-relaxed">{description}</div>}
        </div>
    );
}

function SubscriptionPlansManager() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const { data: plans, isLoading } = useSubscriptionPlans();
    const addPlanMutation = useAddPlan();
    const deletePlanMutation = useDeletePlan();
    const updatePlanMutation = useUpdatePlan();

    const [newPlan, setNewPlan] = useState({
        name: '',
        duration_months: '' as any,
        price: '' as any,
        sessions_per_week: 3,
        sessions_limit: 0
    });
    const [isAdding, setIsAdding] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<{ id: string, name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number } | null>(null);

    // Auto-calculate sessions_limit for newPlan
    useEffect(() => {
        const duration = parseInt(newPlan.duration_months);
        if (!isNaN(duration) && newPlan.sessions_per_week) {
            const calculated = duration * newPlan.sessions_per_week * 4;
            if (newPlan.sessions_limit !== calculated) {
                setNewPlan(prev => ({
                    ...prev,
                    sessions_limit: calculated
                }));
            }
        }
    }, [newPlan.duration_months, newPlan.sessions_per_week, newPlan.sessions_limit]);

    // Auto-calculate sessions_limit for editingPlan
    useEffect(() => {
        if (editingPlan) {
            const calculated = (editingPlan.duration_months || 0) * (editingPlan.sessions_per_week || 0) * 4;
            if (editingPlan.sessions_limit !== calculated) {
                setEditingPlan(prev => prev ? { ...prev, sessions_limit: calculated } : null);
            }
        }
    }, [editingPlan?.duration_months, editingPlan?.sessions_per_week]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan || !editingPlan.name) return;
        try {
            await updatePlanMutation.mutateAsync(editingPlan);
            toast.success('Plan updated successfully');
            setEditingPlan(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to update plan:', error);
            toast.error(`Error: ${error.message || 'Failed to update plan'}`);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const duration = parseInt(newPlan.duration_months);
        const price = parseFloat(newPlan.price);

        if (!newPlan.name || isNaN(duration) || isNaN(price)) {
            toast.error('Please fill all fields correctly');
            return;
        }

        try {
            await addPlanMutation.mutateAsync({
                ...newPlan,
                duration_months: duration,
                price: price
            });
            toast.success('Plan added successfully');
            setNewPlan({ name: '', duration_months: '' as any, price: '' as any, sessions_per_week: 3, sessions_limit: 0 });
            setIsAdding(false);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to add plan:', error);
            toast.error(`Error: ${error.message || 'Failed to add plan'}`);
        }
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        try {
            await deletePlanMutation.mutateAsync(planToDelete);
            toast.success('Plan deleted');
            setPlanToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to delete plan:', error);
            if (error?.code === '23503' || error?.message?.includes('foreign key constraint') || error?.details?.includes('still referenced')) {
                toast.error(t('settings.planInUseError') || 'Cannot delete: Plan is assigned to students/subscriptions.');
            } else {
                toast.error(`Error: ${error.message || 'Failed to delete plan'}`);
            }
            setPlanToDelete(null);
        }
    };

    return (
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden relative group/manager">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none group-hover/manager:bg-primary/20 transition-all duration-700"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        {t('settings.subscriptionPlans')}
                    </h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1">Elite Training Packages</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`p-3 rounded-2xl transition-all duration-500 shadow-xl ${isAdding ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110 active:scale-95'}`}
                >
                    <Plus className={`w-6 h-6 transition-transform duration-500 ${isAdding ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-10 p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6 animate-in zoom-in slide-in-from-top-4 duration-500 relative z-10 transition-all">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3">{t('settings.planName')}</label>
                        <input
                            type="text"
                            value={newPlan.name}
                            onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 focus:bg-black/60 transition-all font-bold text-sm shadow-inner"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">{t('settings.sessionsPerWeek')}</label>
                            <div className="relative">
                                <select
                                    value={newPlan.sessions_per_week}
                                    onChange={e => setNewPlan({ ...newPlan, sessions_per_week: parseInt(e.target.value) || 3 })}
                                    className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm appearance-none cursor-pointer hover:bg-black/60 shadow-inner"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                        <option key={num} value={num} className="bg-[#0a0a0a] text-white">{num} {t('coaches.sessions')}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">{t('settings.months')}</label>
                            <input
                                type="number"
                                min="1"
                                value={newPlan.duration_months}
                                onChange={e => setNewPlan({ ...newPlan, duration_months: e.target.value })}
                                className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm hover:bg-black/60 shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">Total Sessions</label>
                            <input
                                type="number"
                                value={newPlan.sessions_limit}
                                onChange={e => setNewPlan({ ...newPlan, sessions_limit: parseInt(e.target.value) || 0 })}
                                className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-emerald-400 outline-none focus:border-primary/50 transition-all font-black text-sm hover:bg-black/60 shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">{t('settings.price')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={newPlan.price}
                                    onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                                    className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm pr-16 hover:bg-black/60"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/40 uppercase pointer-events-none">{currency.code}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!newPlan.name || !newPlan.duration_months || !newPlan.price}
                        className="w-full bg-primary text-white py-4.5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/30 group/submit mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {t('settings.saveNewPlan')}
                            <ArrowRight className="w-5 h-5 group-hover/submit:translate-x-1 transition-transform duration-300" />
                        </span>
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {isLoading ? (
                    <div className="col-span-full py-12 text-center text-white/20 animate-pulse uppercase font-black text-[10px] tracking-[0.3em]">{t('settings.loadingPlans')}</div>
                ) : plans?.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-white/20 uppercase font-black text-[10px] tracking-[0.3em] border-2 border-dashed border-white/5 rounded-[2rem]">{t('settings.noPlans')}</div>
                ) : (
                    plans?.map((plan, idx) => (
                        <div key={plan.id} className="group/card relative p-1 transition-all duration-300">
                            {/* Sharp Highlight */}
                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/card:opacity-100 rounded-[2rem] transition-opacity duration-300"></div>

                            <div className="relative h-full bg-[#111] rounded-[1.8rem] border border-white/5 p-6 flex flex-col justify-between group-hover/card:border-primary/50 group-hover/card:bg-[#151515] transition-all duration-300 shadow-2xl overflow-hidden">
                                {/* Sharp Accent */}
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full group-hover/card:bg-primary/30 transition-all duration-500 opacity-20"></div>

                                {editingPlan?.id === plan.id ? (
                                    <form onSubmit={handleUpdate} className="space-y-5 animate-in fade-in zoom-in-95 duration-300 relative z-10 w-full">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.planName')}</label>
                                            <input
                                                type="text"
                                                value={editingPlan?.name || ''}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, name: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px] placeholder:text-white/10 uppercase tracking-tight"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Days</label>
                                                <div className="relative group/select">
                                                    <select
                                                        value={editingPlan?.sessions_per_week || 3}
                                                        onChange={e => editingPlan && setEditingPlan({ ...editingPlan, sessions_per_week: parseInt(e.target.value) })}
                                                        className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px] appearance-none cursor-pointer"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={num} className="bg-black text-white">{num} Sessions</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover/select:text-primary transition-colors pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.months')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingPlan?.duration_months || 1}
                                                    onChange={e => editingPlan && setEditingPlan({ ...editingPlan, duration_months: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Total Sessions</label>
                                            <input
                                                type="number"
                                                value={editingPlan?.sessions_limit || 0}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, sessions_limit: parseInt(e.target.value) || 0 })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-emerald-400 outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.price')} ({currency.code})</label>
                                            <input
                                                type="number"
                                                value={editingPlan?.price || 0}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button type="submit" className="bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">{t('common.save')}</button>
                                            <button type="button" onClick={() => setEditingPlan(null)} className="bg-white/5 text-white/60 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all">{t('common.cancel')}</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="relative mb-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/20 text-primary text-[7.5px] font-black uppercase tracking-[0.2em]">
                                                    Package {idx + 1}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                                                    <button onClick={() => setEditingPlan(plan)} className="p-1.5 text-white/30 hover:text-primary transition-all"><Edit2 className="w-3 h-3" /></button>
                                                    <button onClick={() => setPlanToDelete(plan.id)} className="p-1.5 text-white/30 hover:text-rose-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                            <h3 className="text-[14px] font-black text-white uppercase tracking-tight group-hover/card:text-primary transition-colors leading-snug line-clamp-2">
                                                {plan.name}
                                            </h3>
                                        </div>

                                        <div className="space-y-2.5 mb-8">
                                            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                        <Calendar className="w-3 h-3 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">{t('common.schedule')}</div>
                                                        <div className="text-[12px] font-black text-white uppercase tracking-tighter leading-none truncate">
                                                            {plan.sessions_per_week} <span className="text-[9px] text-white/20 font-bold lowercase">{t('dashboard.day')}s</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0"></div>
                                            </div>

                                            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                        <Clock className="w-3 h-3 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">{t('settings.validity')}</div>
                                                        <div className="text-[12px] font-black text-white uppercase tracking-tighter leading-none truncate">
                                                            {plan.duration_months} <span className="text-[9px] text-white/20 font-bold lowercase">{plan.duration_months === 1 ? t('dashboard.month') : `${t('dashboard.month')}s`}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0"></div>
                                            </div>

                                            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                                                        <Sparkles className="w-3 h-3 text-emerald-500" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Total Limit</div>
                                                        <div className="text-[12px] font-black text-emerald-400 uppercase tracking-tighter leading-none truncate">
                                                            {plan.sessions_limit ? `${plan.sessions_limit} Sessions` : 'Unlimited'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 shrink-0"></div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-5 border-t border-white/5 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] leading-none mb-1">{t('settings.packageValue')}</div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl font-black text-white leading-none tracking-tighter">{plan.price > 0 ? plan.price : 'FREE'}</span>
                                                    {plan.price > 0 && <span className="text-[10px] font-black text-primary uppercase">{currency.code}</span>}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-xl text-primary opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {planToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="glass-card max-w-sm w-full p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(244,63,94,0.15)] relative animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-6 bg-rose-500/10 rounded-full text-rose-500 mb-6 animate-bounce">
                                <AlertTriangle className="w-10 h-10 shadow-lg shadow-rose-500/20" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">{t('settings.deleteConfirmTitle')}</h3>
                            <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed mb-10">{t('settings.deleteConfirmText')}</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setPlanToDelete(null)} className="flex-1 px-6 py-4 rounded-xl bg-white/5 text-white/60 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">{t('common.cancel')}</button>
                                <button onClick={handleDelete} className="flex-1 px-6 py-4 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-rose-500/30 hover:bg-rose-600 transition-all hover:scale-105 active:scale-95">{t('common.delete')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


function PremiumSwitch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
            <div className="flex-1">
                <div className="text-[9px] font-black uppercase tracking-widest text-white mb-0.5 group-hover:text-primary transition-colors">{label}</div>
                {description && <div className="text-[7px] font-bold uppercase tracking-widest text-white/30">{description}</div>}
            </div>
            <div className="relative inline-flex items-center cursor-pointer ml-3 rtl:mr-3 rtl:ml-0">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
                <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:bg-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white/20 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
            </div>
        </label>
    );
}

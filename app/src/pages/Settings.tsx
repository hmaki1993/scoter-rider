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
    ChevronDown,
    Wand2,
    MoveVertical,
    Scissors,
    Circle,
    History,
    Move,
    ZoomIn,
    Droplets,
    MousePointer2,
    Target,
    Pipette
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
import PaletteImportModal from '../components/PaletteImportModal';

export default function Settings() {
    const { currency, setCurrency } = useCurrency();
    const { settings, updateSettings, resetToDefaults, hasLoaded } = useTheme();
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishProgress, setPublishProgress] = useState(0);
    const [publishStep, setPublishStep] = useState('');
    const { t, i18n } = useTranslation();
    const context = useOutletContext<{ role: string }>() || { role: null };
    const role = context.role?.toLowerCase()?.trim();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Palette Import Modal
    const [showPaletteImport, setShowPaletteImport] = useState(false);

    const [draftSettings, setDraftSettings] = useState<GymSettings>(settings);

    // Track if settings have been initialized in this session to prevent accidental resets
    const [hasSynced, setHasSynced] = useState(false);

    // Sync draft with global settings only once on load or after a successful save
    useEffect(() => {
        if (hasLoaded && !hasSynced) {
            setDraftSettings(settings);
            setHasSynced(true);
        }
    }, [hasLoaded, settings, hasSynced]);

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

            // Allow settings to re-sync after save to reflect potential server-side changes
            setHasSynced(false);

            await new Promise(r => setTimeout(r, 1200));
        } catch (error) {
            toast.error('Publishing failed. Check connection.');
        } finally {
            setIsPublishing(false);
            setPublishProgress(0);
        }
    };

    const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'academy' | 'login'>(
        role === 'admin' ? 'academy' : 'appearance'
    );
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [processingMagic, setProcessingMagic] = useState(false);

    const [userData, setUserData] = useState({
        full_name: '',
        email: ''
    });
    const [initialEmail, setInitialEmail] = useState('');

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Logo History & Editor State
    const [logoHistory, setLogoHistory] = useState<{ name: string; url: string; created_at: string }[]>([]);
    const [bgHistory, setBgHistory] = useState<{ name: string; url: string; created_at: string }[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingBgHistory, setIsLoadingBgHistory] = useState(false);
    const [showLogoHistory, setShowLogoHistory] = useState(false);
    const [showBgHistory, setShowBgHistory] = useState(false);
    const [showLogoEditor, setShowLogoEditor] = useState(false);
    const [logoBeingEdited, setLogoBeingEdited] = useState<{ url: string; name: string } | null>(null);
    const [selectedLogos, setSelectedLogos] = useState<string[]>([]);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'destructive' | 'standard';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'standard'
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

    const handlePaletteImport = (palette: { primary: string; secondary: string; accent: string; surface: string; bg: string; input: string }) => {
        setDraftSettings(prev => ({
            ...prev,
            // App theme
            primary_color: palette.primary,
            secondary_color: palette.bg,
            accent_color: palette.accent,
            surface_color: palette.surface,
            input_bg_color: palette.input,
            hover_color: palette.primary + '80',
            // Login page sync
            login_card_color: palette.input,
            login_card_border_color: palette.primary + '40',
            login_accent_color: palette.primary,
            login_text_color: '#ffffff',
        }));
        toast.success('✨ Palette applied across full app + login!', { duration: 2500 });
    };

    const applyMagicTheme = (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;

        // Derive a darker card bg variant
        const cardBg = (theme as any).input || theme.bg;

        setCurrentTheme(theme.id);
        localStorage.setItem('theme', theme.id);
        setDraftSettings(prev => ({
            ...prev,
            // App-wide theme
            primary_color: theme.primary,
            secondary_color: theme.secondary,
            accent_color: theme.accent || prev.accent_color,
            surface_color: theme.surface || prev.surface_color,
            hover_color: (theme as any).hover || prev.hover_color,
            input_bg_color: (theme as any).input || prev.input_bg_color,
            font_family: (theme as any).font || prev.font_family,
            // Login page sync
            login_card_color: cardBg,
            login_card_border_color: theme.primary + '40',
            login_accent_color: theme.primary,
            login_text_color: '#ffffff',
        }));

        toast.success(`✨ ${theme.name} applied across the full app!`, { duration: 2500 });
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
                login_logo_scale: draftSettings.login_logo_scale,
                login_logo_x_offset: draftSettings.login_logo_x_offset,
                login_logo_y_offset: draftSettings.login_logo_y_offset,
                login_bg_blur: draftSettings.login_bg_blur,
                login_bg_brightness: draftSettings.login_bg_brightness,
                login_bg_zoom: draftSettings.login_bg_zoom,
                login_bg_x_offset: draftSettings.login_bg_x_offset,
                login_bg_y_offset: draftSettings.login_bg_y_offset,
                login_card_x_offset: draftSettings.login_card_x_offset,
                login_card_y_offset: draftSettings.login_card_y_offset,
                login_card_border_color: draftSettings.login_card_border_color,
                login_card_scale: draftSettings.login_card_scale,
                login_show_logo: draftSettings.login_show_logo,
                login_text_color: draftSettings.login_text_color,
                login_accent_color: draftSettings.login_accent_color,
                login_logo_opacity: draftSettings.login_logo_opacity,
                academy_name: draftSettings.academy_name,
                logo_url: draftSettings.logo_url
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

            // 1. Compute SHA-256 for deduplication
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `logo_${hashHex.substring(0, 16)}.${fileExt}`; // Fixed name based on hash
            const filePath = `${fileName}`;

            // Check if file already exists
            const { data: existingFiles } = await supabase.storage.from('logos').list('', {
                search: fileName
            });

            let publicUrl = '';

            if (existingFiles && existingFiles.some(f => f.name === fileName)) {
                // Asset already exists, just get URL
                const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
                publicUrl = data.publicUrl;
                toast.success('Using existing asset from library');
            } else {
                // Brand new asset, upload
                const { error: uploadError } = await supabase.storage
                    .from('logos')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
                publicUrl = data.publicUrl;
                toast.success('Logo uploaded and synced');
            }

            // UNIVERSAL SYNC: Master Logo controls everything.
            setDraftSettings(prev => ({
                ...prev,
                logo_url: publicUrl,
                login_logo_url: publicUrl
            }));

            if (showLogoHistory) fetchLogoHistory();
        } catch (error: any) {
            console.error('Error uploading logo:', error);
            toast.error('Error uploading logo');
        } finally {
            setUploading(false);
        }
    };

    const fetchLogoHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase.storage.from('logos').list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            });

            if (error) throw error;

            const history = data
                .filter(file => file.name.startsWith('logo_'))
                .map(file => ({
                    name: file.name,
                    url: supabase.storage.from('logos').getPublicUrl(file.name).data.publicUrl,
                    created_at: (file as any).created_at
                }));

            setLogoHistory(history);
        } catch (err: any) {
            console.error('Error fetching image history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const fetchBgHistory = async () => {
        setIsLoadingBgHistory(true);
        try {
            const { data, error } = await supabase.storage.from('logos').list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            });

            if (error) throw error;

            const bgs = data
                .filter(file => file.name.startsWith('login_bg_'))
                .map(file => ({
                    name: file.name,
                    url: supabase.storage.from('logos').getPublicUrl(file.name).data.publicUrl,
                    created_at: (file as any).created_at
                }));

            setBgHistory(bgs);
        } catch (err: any) {
            console.error('Error fetching background history:', err);
        } finally {
            setIsLoadingBgHistory(false);
        }
    };

    const handleBulkDeleteBgs = async (bgNames: string[]) => {
        if (!bgNames || bgNames.length === 0) return;

        try {
            setUploading(true);
            const { error } = await supabase.storage.from('logos').remove(bgNames);
            if (error) throw error;
            toast.success(`${bgNames.length} background(s) deleted successfully.`);
            fetchBgHistory();
        } catch (err: any) {
            toast.error('Failed to delete backgrounds');
        } finally {
            setUploading(false);
        }
    };

    const handleBulkDeleteLogos = async (logoNames: string[]) => {
        if (!logoNames || logoNames.length === 0) return;

        try {
            setUploading(true); // Re-using uploading state for bulk operations
            const { error } = await supabase.storage.from('logos').remove(logoNames);

            if (error) throw error;

            toast.success(`${logoNames.length} logo(s) deleted successfully.`);
            fetchLogoHistory(); // Refresh the history
        } catch (error: any) {
            console.error('Error deleting logos:', error);
            toast.error(error.message || 'Failed to delete logos.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Palette Import Modal */}
            {showPaletteImport && (
                <PaletteImportModal
                    onClose={() => setShowPaletteImport(false)}
                    onApply={handlePaletteImport}
                />
            )}
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
                {role === 'admin' && (
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'login' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout className="w-3.5 h-3.5" />
                        {t('settings.login')}
                    </button>
                )}
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
                                    <button
                                        onClick={() => setShowPaletteImport(true)}
                                        className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all text-purple-400 text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95"
                                    >
                                        <Pipette className="w-3.5 h-3.5" />
                                        Import Palette
                                    </button>
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
                                                {/* Magic Button overlay on hover */}
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); applyMagicTheme(theme.id); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[7px] font-black uppercase tracking-widest text-black shadow-lg transition-all hover:scale-110 active:scale-95"
                                                        style={{ backgroundColor: theme.primary }}
                                                        title="Apply to full app + login page"
                                                    >
                                                        <Wand2 className="w-2.5 h-2.5" />
                                                        MAGIC
                                                    </button>
                                                </div>
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

                            <SubscriptionPlansManager />
                        </div>
                    </div>
                )}

                {/* Login Page Customization */}
                {activeTab === 'login' && role === 'admin' && (
                    <div className="space-y-8 pb-20">
                        <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium h-fit">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-500">
                                    <Layout className="w-5 h-5" />
                                </div>
                                Login Page Customization
                            </h2>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                {/* Controls Column (Now First) */}
                                <div className="space-y-6 lg:col-span-7">
                                    {/* Login Background */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Login Background</label>
                                            <button
                                                onClick={() => {
                                                    setShowBgHistory(true);
                                                    fetchBgHistory();
                                                }}
                                                className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[8px] font-black text-white/40 hover:text-white"
                                            >
                                                <Clock className="w-3 h-3" />
                                                HISTORY
                                            </button>
                                        </div>
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
                                                            const { error } = await supabase.storage.from('logos').upload(fileName, file);
                                                            if (error) throw error;
                                                            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
                                                            setDraftSettings(prev => ({
                                                                ...prev,
                                                                login_bg_url: publicUrl,
                                                                login_bg_x_offset: 0,
                                                                login_bg_y_offset: 0,
                                                                login_bg_zoom: 1,
                                                                login_bg_blur: 0
                                                            }));
                                                            toast.success('Background uploaded and centered');
                                                        } catch (err: any) {
                                                            toast.error(err.message || 'Upload failed');
                                                        } finally {
                                                            setUploading(false);
                                                        }
                                                    }}
                                                />
                                                <div className="flex flex-col items-center gap-2 group-hover:scale-110 transition-transform">
                                                    {uploading ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <Upload className="w-5 h-5 text-white" />
                                                    )}
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{uploading ? 'Uploading...' : 'Change Background'}</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* SECTION: BRANDING ASSETS */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-4 w-1 bg-amber-500 rounded-full"></div>
                                            <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Branding Identity</span>
                                        </div>

                                        {/* Master Logo Upload Section */}
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group/logo transition-all hover:bg-white/[0.05]">
                                            <div className="flex items-center gap-4">
                                                {/* Minimal Preview */}
                                                <div className="relative w-12 h-12 shrink-0 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center overflow-hidden group-hover/logo:border-primary/50 transition-all">
                                                    {draftSettings.logo_url ? (
                                                        <img src={draftSettings.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                                                    ) : (
                                                        <Camera className="w-5 h-5 text-white/20" />
                                                    )}
                                                    {uploading && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Text Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('settings.masterLogo')}</span>
                                                        <div className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                                            <span className="text-[6px] font-black text-emerald-400 uppercase tracking-tighter">Synced</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[8px] text-white/30 font-bold uppercase tracking-tight truncate mt-0.5">Primary brand identity for all pages</p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* History Button */}
                                                    <button
                                                        onClick={() => {
                                                            setShowLogoHistory(true);
                                                            fetchLogoHistory();
                                                        }}
                                                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group/hist text-white/40 hover:text-white"
                                                        title="Image History"
                                                    >
                                                        <Clock className="w-4 h-4 transition-colors" />
                                                    </button>

                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={() => {
                                                            if (draftSettings.logo_url) {
                                                                setLogoBeingEdited({ url: draftSettings.logo_url, name: 'Current Logo' });
                                                                setShowLogoEditor(true);
                                                            } else {
                                                                toast.error('Upload a logo first to edit');
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group/edit text-white/40 hover:text-white"
                                                        title="Edit Logo (Remove BG / Crop)"
                                                    >
                                                        <Edit2 className="w-4 h-4 transition-colors" />
                                                    </button>

                                                    {/* Simple Action */}
                                                    <label className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: ENVIRONMENT & PERSPECTIVE */}
                                    <div className="space-y-6 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
                                            <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Environment & Perspective</span>
                                        </div>

                                        <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <label className="text-[9px] text-white/60 font-black uppercase tracking-widest block mb-2">Background Control</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Zoom</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((draftSettings.login_bg_zoom || 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.5" max="2.0" step="0.05"
                                                        value={draftSettings.login_bg_zoom ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_bg_zoom: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Brightness</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((draftSettings.login_bg_brightness || 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.2" max="1.5" step="0.05"
                                                        value={draftSettings.login_bg_brightness ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_bg_brightness: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">BG X Offset</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_bg_x_offset || 0}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-50" max="50" step="1"
                                                        value={draftSettings.login_bg_x_offset ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_bg_x_offset: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">BG Y Offset</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_bg_y_offset || 0}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-50" max="50" step="1"
                                                        value={draftSettings.login_bg_y_offset ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_bg_y_offset: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center justify-between gap-4">
                                                <label className="text-[9px] text-white/60 font-black uppercase tracking-widest block">Logo Appearance</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setDraftSettings({ ...draftSettings, login_logo_x_offset: 0, login_logo_y_offset: 0 })}
                                                        className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[7px] font-black text-white/40 hover:text-white"
                                                        title="Center Logo"
                                                    >
                                                        <Target className="w-3 h-3" />
                                                        CENTER
                                                    </button>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{draftSettings.login_show_logo !== false ? 'Visible' : 'Hidden'}</span>
                                                    <PremiumSwitch
                                                        checked={draftSettings.login_show_logo !== false}
                                                        onChange={(val) => setDraftSettings({ ...draftSettings, login_show_logo: val })}
                                                        label=""
                                                    />
                                                </div>
                                            </div>

                                            <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ${draftSettings.login_show_logo === false ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Scale</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((draftSettings.login_logo_scale ?? 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.5" max="2.0" step="0.1"
                                                        value={draftSettings.login_logo_scale ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_logo_scale: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Logo Opacity</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((draftSettings.login_logo_opacity ?? 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={draftSettings.login_logo_opacity ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_logo_opacity: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">X Offset</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_logo_x_offset ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-100" max="100" step="1"
                                                        value={draftSettings.login_logo_x_offset ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_logo_x_offset: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Y Offset (Vertical)</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_logo_y_offset ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-150" max="150" step="1"
                                                        value={draftSettings.login_logo_y_offset ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_logo_y_offset: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[9px] text-white/60 font-black uppercase tracking-widest block">Card Position & Layout</label>
                                                <button
                                                    onClick={() => setDraftSettings({ ...draftSettings, login_card_x_offset: 0, login_card_y_offset: 0 })}
                                                    className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[7px] font-black text-white/40 hover:text-white"
                                                    title="Center Card"
                                                >
                                                    <Target className="w-3 h-3" />
                                                    CENTER
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">V-Offset (Y)</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_card_y_offset || 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-300" max="300" step="1"
                                                        value={draftSettings.login_card_y_offset ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_card_y_offset: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">H-Offset (X)</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_card_x_offset || 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-300" max="300" step="1"
                                                        value={draftSettings.login_card_x_offset ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_card_x_offset: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 col-span-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Card Scale</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((draftSettings.login_card_scale || 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.5" max="1.5" step="0.05"
                                                        value={draftSettings.login_card_scale ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_card_scale: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION: VISUAL THEME & MAGIC */}
                                    <div className="space-y-6 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-4 w-1 bg-emerald-500 rounded-full"></div>
                                            <span className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Visual Theme & Magic</span>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <PremiumColorPicker
                                                    label="Card Color"
                                                    value={draftSettings.login_card_color || '#000000'}
                                                    onChange={(val) => {
                                                        const rgba = hexToRgba(val);
                                                        setDraftSettings({ ...draftSettings, login_card_color: val, login_card_opacity: rgba.a });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <PremiumColorPicker
                                                    label="Border Color"
                                                    value={draftSettings.login_card_border_color || '#ffffff33'}
                                                    onChange={(val) => setDraftSettings({ ...draftSettings, login_card_border_color: val })}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <PremiumColorPicker
                                                    label="Text Color"
                                                    value={draftSettings.login_text_color || '#ffffff'}
                                                    onChange={(val) => setDraftSettings({ ...draftSettings, login_text_color: val })}
                                                    description="Headings & Labels"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <PremiumColorPicker
                                                    label="Accent Color"
                                                    value={draftSettings.login_accent_color || draftSettings.primary_color || '#D4AF37'}
                                                    onChange={(val) => setDraftSettings({ ...draftSettings, login_accent_color: val })}
                                                    description="Buttons & Links"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[9px] text-white/60 font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                                    Magic Styles
                                                </label>
                                                <button
                                                    onClick={async () => {
                                                        setProcessingMagic(true);
                                                        try {
                                                            let primaryMatch = draftSettings.primary_color || '#A30000';
                                                            let secondaryMatch = draftSettings.secondary_color || '#0B120F';

                                                            if (draftSettings.login_logo_url) {
                                                                const colors = await getDominantColors(draftSettings.login_logo_url);
                                                                primaryMatch = colors.primary;
                                                                secondaryMatch = colors.secondary;
                                                            }

                                                            setDraftSettings(prev => ({
                                                                ...prev,
                                                                login_card_color: secondaryMatch,
                                                                login_card_border_color: `${primaryMatch}88`,
                                                                login_accent_color: primaryMatch,
                                                                login_text_color: '#ffffff',
                                                                login_card_opacity: 0.7,
                                                                login_bg_blur: 10,
                                                                login_bg_brightness: 1.0,
                                                                login_bg_zoom: 1.1,
                                                                login_bg_x_offset: 0,
                                                                login_bg_y_offset: 0,
                                                                login_card_x_offset: 0,
                                                                login_card_y_offset: 0,
                                                                login_logo_scale: 1.0,
                                                                login_logo_opacity: 0.8,
                                                                login_logo_x_offset: 0,
                                                                login_logo_y_offset: 0
                                                            }));
                                                            toast.success(draftSettings.login_logo_url ? "Design matched to your logo colors!" : "Design matched to brand colors!");
                                                        } catch (err) {
                                                            console.error("Magic Match Error:", err);
                                                            toast.error("Failed to extract logo colors");
                                                        } finally {
                                                            setProcessingMagic(false);
                                                        }
                                                    }}
                                                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-all flex items-center gap-1.5 group"
                                                >
                                                    <Wand2 className="w-3 h-3 text-amber-500 group-hover:rotate-12 transition-transform" />
                                                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{processingMagic ? 'Matching...' : 'Auto Match'}</span>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Opacity</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((draftSettings.login_card_opacity ?? 0.6) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={draftSettings.login_card_opacity ?? 0.6}
                                                        onChange={(e) => {
                                                            const newOpacity = parseFloat(e.target.value);
                                                            const currentHex = draftSettings.login_card_color || '#000000';
                                                            const { r, g, b } = hexToRgba(currentHex);
                                                            const newColor = rgbaToHex8(r, g, b, newOpacity);
                                                            setDraftSettings({ ...draftSettings, login_card_opacity: newOpacity, login_card_color: newColor });
                                                        }}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">BG Blur</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{draftSettings.login_bg_blur ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="20" step="1"
                                                        value={draftSettings.login_bg_blur ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, login_bg_blur: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Column (Sticky and Compact) */}
                                <div className="flex flex-col gap-3 lg:col-span-5 sticky top-32 lg:sticky lg:top-32 h-fit z-30 self-start">
                                    <div className="flex items-center justify-between ml-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Live Screen Preview</label>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Pixel Perfect</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 relative aspect-[14/10] w-full rounded-[2.5rem] overflow-hidden border-4 border-white/5 bg-black shadow-2xl">
                                        <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                                            <div
                                                className="w-[1200px] h-[900px] shrink-0 bg-black rounded-[3rem] overflow-hidden relative shadow-2xl"
                                                style={{ transform: 'scale(0.38)', transformOrigin: 'center center' }}
                                            >
                                                <div
                                                    className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-black transition-all duration-700"
                                                    style={{
                                                        backgroundImage: `url('${draftSettings.login_bg_url || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg"}')`,
                                                        filter: `blur(${draftSettings.login_bg_blur ?? 0}px) brightness(${draftSettings.login_bg_brightness ?? 1.0})`,
                                                        transform: `translate(${draftSettings.login_bg_x_offset ?? 0}%, ${draftSettings.login_bg_y_offset ?? 0}%) scale(${draftSettings.login_bg_zoom ?? 1.0})`,
                                                        opacity: 0.8
                                                    }}
                                                ></div>

                                                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>

                                                <div
                                                    className="absolute inset-0 flex flex-col items-center justify-center"
                                                    style={{ transform: `translate(${draftSettings.login_card_x_offset || 0}px, ${draftSettings.login_card_y_offset || 0}px)` }}
                                                >
                                                    {draftSettings.login_show_logo !== false && (
                                                        <div className="flex justify-center mb-8">
                                                            <div
                                                                className="w-36 h-36 flex items-center justify-center"
                                                                style={{ transform: `scale(${draftSettings.login_logo_scale || 1.0}) translate(${draftSettings.login_logo_x_offset || 0}px, ${draftSettings.login_logo_y_offset || 0}px)` }}
                                                            >
                                                                <img
                                                                    src={draftSettings.login_logo_url || "/logo.png"}
                                                                    className="w-full h-full object-contain"
                                                                    style={{ opacity: draftSettings.login_logo_opacity ?? 0.8 }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div
                                                        className="w-[448px] rounded-[3rem] p-10 border-2 shadow-2xl transition-all duration-500 bg-black/60 backdrop-blur-[40px]"
                                                        style={{
                                                            backgroundColor: draftSettings.login_card_color ? `${stripAlpha(draftSettings.login_card_color)}${Math.round((draftSettings.login_card_opacity || 0.6) * 255).toString(16).padStart(2, '0')}` : undefined,
                                                            borderColor: draftSettings.login_card_border_color || '#D4AF374d',
                                                            transform: `scale(${draftSettings.login_card_scale || 1.0})`
                                                        }}
                                                    >
                                                        <div
                                                            className="text-[20px] font-black uppercase tracking-[0.3em] mb-1 text-center truncate"
                                                            style={{ color: draftSettings.login_text_color || '#ffffff' }}
                                                        >
                                                            {draftSettings.academy_name || 'Academy System'}
                                                        </div>
                                                        <div className="flex items-center justify-center gap-4 mb-6">
                                                            <div className="h-[1px] w-8 opacity-30" style={{ backgroundColor: draftSettings.login_accent_color || '#D4AF37' }}></div>
                                                            <span className="text-[9px] font-black uppercase tracking-[0.7em]" style={{ color: draftSettings.login_accent_color || '#D4AF37' }}>Academy</span>
                                                            <div className="h-[1px] w-8 opacity-30" style={{ backgroundColor: draftSettings.login_accent_color || '#D4AF37' }}></div>
                                                        </div>

                                                        <div className="space-y-4 mb-8">
                                                            <div className="h-12 w-full bg-black/40 rounded-2xl border opacity-30" style={{ borderColor: draftSettings.login_accent_color || '#D4AF37' }}></div>
                                                            <div className="h-12 w-full bg-black/40 rounded-2xl border opacity-30" style={{ borderColor: draftSettings.login_accent_color || '#D4AF37' }}></div>
                                                        </div>

                                                        <div
                                                            className="h-12 w-full bg-black border rounded-full flex items-center justify-center"
                                                            style={{ borderColor: `${draftSettings.login_accent_color || '#D4AF37'}66` }}
                                                        >
                                                            <span className="text-[11px] font-black uppercase tracking-[0.5em]" style={{ color: draftSettings.login_accent_color || '#D4AF37' }}>Login</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 flex flex-col items-center gap-3 opacity-40">
                                                        <div className="px-6 py-2 rounded-full border border-white/20 text-[9px] text-white font-black uppercase tracking-[0.3em]">Language Switcher</div>
                                                        <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em]">© 2026 {draftSettings.academy_name || 'Academy System'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500/90 text-[8px] font-black text-black z-20">LIVE</div>
                                    </div>
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
                )}
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

            {/* Logo Advanced Suite Modals */}
            <LogoHistoryModal
                isOpen={showLogoHistory}
                onClose={() => setShowLogoHistory(false)}
                history={logoHistory}
                isLoading={isLoadingHistory}
                onSelect={(url: string) => {
                    setDraftSettings(prev => ({
                        ...prev,
                        logo_url: url,
                        login_logo_url: url
                    }));
                    setShowLogoHistory(false);
                    toast.success('Logo selected from history');
                }}
                onDelete={async (name: string) => {
                    try {
                        const { error } = await supabase.storage.from('logos').remove([name]);
                        if (error) throw error;
                        fetchLogoHistory();
                    } catch (err) {
                        toast.error('Failed to delete asset');
                    }
                }}
            />

            <LogoEditorModal
                isOpen={showLogoEditor}
                onClose={() => setShowLogoEditor(false)}
                logo={logoBeingEdited}
                onSave={async (newUrl: string) => {
                    setDraftSettings(prev => ({
                        ...prev,
                        logo_url: newUrl,
                        login_logo_url: newUrl
                    }));
                    setShowLogoEditor(false);
                    toast.success('Logo updated with edits');
                    fetchLogoHistory();
                }}
            />

            <BgHistoryModal
                isOpen={showBgHistory}
                onClose={() => setShowBgHistory(false)}
                history={bgHistory}
                isLoading={isLoadingBgHistory}
                onSelect={(url: string) => {
                    setDraftSettings(prev => ({
                        ...prev,
                        login_bg_url: url
                    }));
                    setShowBgHistory(false);
                    toast.success('Background selected from history');
                }}
                onDelete={async (name: string) => {
                    try {
                        const { error } = await supabase.storage.from('logos').remove([name]);
                        if (error) throw error;
                        fetchBgHistory();
                    } catch (err) {
                        toast.error('Failed to delete background');
                    }
                }}
            />
        </div>
    );
}

// --- Logo Advanced Suite Components ---

function LogoHistoryModal({ isOpen, onClose, history, isLoading, onSelect, onDelete }: any) {
    const [selectedLogos, setSelectedLogos] = React.useState<string[]>([]);
    const [confirmModal, setConfirmModal] = React.useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default', // 'default' or 'destructive'
        onConfirm: () => { }
    });

    React.useEffect(() => {
        if (!isOpen) {
            setSelectedLogos([]); // Clear selection when modal closes
        }
    }, [isOpen]);

    const handleDeleteLogo = async (logoName: string) => {
        await onDelete(logoName);
        setSelectedLogos(prev => prev.filter(name => name !== logoName));
    };

    const handleBulkDeleteLogos = async (logoNames: string[]) => {
        for (const name of logoNames) {
            await onDelete(name);
        }
        setSelectedLogos([]);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative glass-card w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Logo Library</h3>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Manage previously uploaded assets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Syncing Storage...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[2rem]">
                            <Upload className="w-8 h-8 text-white/10" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No images found in library</span>
                        </div>
                    ) : (
                        <>
                            {/* Selection Toolbar */}
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            if (selectedLogos.length === history.length) setSelectedLogos([]);
                                            else setSelectedLogos(history.map((h: any) => h.name));
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                    >
                                        {selectedLogos.length === history.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">|</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{selectedLogos.length} Selected</span>
                                </div>

                                {selectedLogos.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Bulk Delete',
                                                message: `Are you sure you want to delete ${selectedLogos.length} assets? This cannot be undone.`,
                                                type: 'destructive',
                                                onConfirm: () => {
                                                    handleBulkDeleteLogos(selectedLogos);
                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                }
                                            });
                                        }}
                                        className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all animate-in slide-in-from-right-4"
                                    >
                                        Delete Selected
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {history.map((item: any) => {
                                    const isSelected = selectedLogos.includes(item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() => {
                                                if (isSelected) setSelectedLogos(prev => prev.filter(n => n !== item.name));
                                                else setSelectedLogos(prev => [...prev, item.name]);
                                            }}
                                            className={`group/item relative aspect-square rounded-3xl bg-black/40 border transition-all duration-300 overflow-hidden cursor-pointer ${isSelected ? 'border-primary ring-4 ring-primary/20 shadow-2xl scale-[0.98]' : 'border-white/5 hover:border-white/20 hover:bg-black/60 shadow-xl'}`}
                                        >
                                            {/* Selection Indicator */}
                                            <div className={`absolute top-3 right-3 z-20 w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${isSelected ? 'bg-primary border-primary scale-110' : 'bg-black/40 border-white/20 scale-100'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>

                                            <div className="absolute inset-0 p-4 flex items-center justify-center" style={{
                                                backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                                                backgroundSize: '16px 16px',
                                                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                                backgroundColor: '#1a1a1a'
                                            }}>
                                                <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform duration-500 pointer-events-none drop-shadow-2xl" />
                                            </div>

                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-4 backdrop-blur-sm z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelect(item.url);
                                                    }}
                                                    className="w-full py-2.5 rounded-xl bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                                                >
                                                    Apply Logo
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Delete Asset',
                                                            message: 'Are you sure you want to delete this image? It will be permanently removed from storage.',
                                                            type: 'destructive',
                                                            onConfirm: () => {
                                                                handleDeleteLogo(item.name);
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        });
                                                    }}
                                                    className="w-full py-2 rounded-xl bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    Delete
                                                </button>
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 transform translate-y-4 group-hover/item:translate-y-0 transition-transform duration-300 z-10">
                                                <div className="text-[6px] text-white/40 font-bold uppercase tracking-tighter truncate bg-black/40 px-2 py-1 rounded-full border border-white/5 backdrop-blur-md">
                                                    {item.name}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-center">
                    <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Master Logo sync is enabled globally</p>
                </div>
            </div>
            <PremiumConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
            />
        </div>
    );
}

function BgHistoryModal({ isOpen, onClose, history, isLoading, onSelect, onDelete }: any) {
    const [selectedBgs, setSelectedBgs] = React.useState<string[]>([]);
    const [confirmModal, setConfirmModal] = React.useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default', // 'default' or 'destructive'
        onConfirm: () => { }
    });

    React.useEffect(() => {
        if (!isOpen) {
            setSelectedBgs([]);
        }
    }, [isOpen]);

    const handleDeleteBg = async (bgName: string) => {
        await onDelete(bgName);
        setSelectedBgs(prev => prev.filter(name => name !== bgName));
    };

    const handleBulkDeleteBgs = async (bgNames: string[]) => {
        for (const name of bgNames) {
            await onDelete(name);
        }
        setSelectedBgs([]);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative glass-card w-full max-w-2xl max-h-[85vh] overflow-hidden border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Background Library</h3>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Manage login page environments</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Loading History...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[2rem]">
                            <Layout className="w-8 h-8 text-white/10" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No backgrounds in library</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            if (selectedBgs.length === history.length) setSelectedBgs([]);
                                            else setSelectedBgs(history.map((h: any) => h.name));
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
                                    >
                                        {selectedBgs.length === history.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">|</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{selectedBgs.length} Selected</span>
                                </div>

                                {selectedBgs.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Bulk Delete',
                                                message: `Are you sure you want to delete ${selectedBgs.length} backgrounds? This cannot be undone.`,
                                                type: 'destructive',
                                                onConfirm: () => {
                                                    handleBulkDeleteBgs(selectedBgs);
                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                }
                                            });
                                        }}
                                        className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all animate-in slide-in-from-right-4"
                                    >
                                        Delete Selected
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {history.map((item: any) => {
                                    const isSelected = selectedBgs.includes(item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() => {
                                                if (isSelected) setSelectedBgs(prev => prev.filter(n => n !== item.name));
                                                else setSelectedBgs(prev => [...prev, item.name]);
                                            }}
                                            className={`group/item relative aspect-video rounded-3xl bg-black/40 border transition-all duration-300 overflow-hidden cursor-pointer ${isSelected ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-2xl scale-[0.98]' : 'border-white/5 hover:border-white/20 hover:bg-black/60 shadow-xl'}`}
                                        >
                                            <div className={`absolute top-3 right-3 z-20 w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 scale-110' : 'bg-black/40 border-white/20 scale-100'}`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>

                                            <div className="absolute inset-0">
                                                <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500 pointer-events-none opacity-60" />
                                            </div>

                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-4 backdrop-blur-sm z-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelect(item.url);
                                                    }}
                                                    className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
                                                >
                                                    Set Background
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Delete Asset',
                                                            message: 'Are you sure you want to delete this background? It will be permanently removed from storage.',
                                                            type: 'destructive',
                                                            onConfirm: () => {
                                                                handleDeleteBg(item.name);
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        });
                                                    }}
                                                    className="w-full py-2 rounded-xl bg-rose-500/10 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    Delete
                                                </button>
                                            </div>

                                            <div className="absolute bottom-2 left-2 right-2 transform translate-y-4 group-hover/item:translate-y-0 transition-transform duration-300 z-10">
                                                <div className="text-[6px] text-white/40 font-bold uppercase tracking-tighter truncate bg-black/40 px-2 py-1 rounded-full border border-white/5 backdrop-blur-md">
                                                    {item.name}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-center">
                    <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Backgrounds prefix: login_bg_</p>
                </div>
            </div>
            <PremiumConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
            />
        </div>
    );
}

function LogoEditorModal({ isOpen, onClose, logo, onSave }: any) {
    const [canvasState, setCanvasState] = useState({
        isCircle: false,
        isRemovingBg: false,
        sensitivity: 30,
        zoom: 1,
        pan: { x: 0, y: 0 },
        feathering: 0,
        targetColor: null as { r: number, g: number, b: number } | null
    });
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const originalImgRef = React.useRef<HTMLImageElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isPickingColor, setIsPickingColor] = useState(false);

    // Initial Image Loading
    React.useEffect(() => {
        if (!isOpen || !logo) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = logo.url;
        img.onload = () => {
            originalImgRef.current = img;
            updateProcessedImage();
        };
    }, [isOpen, logo?.url]);

    // Update Processed Buffer (Pixel Manipulation)
    const updateProcessedImage = () => {
        const img = originalImgRef.current;
        if (!img) return;

        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }

        const buffer = offscreenCanvasRef.current;
        const ctx = buffer.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        buffer.width = 1200;
        buffer.height = 1200;

        ctx.clearRect(0, 0, buffer.width, buffer.height);

        // Draw centered original
        const imgAspect = img.height / img.width;
        const drawWidth = 800;
        const drawHeight = drawWidth * imgAspect;
        ctx.drawImage(img, (buffer.width - drawWidth) / 2, (buffer.height - drawHeight) / 2, drawWidth, drawHeight);

        // Background Removal Engine (Pixel-by-pixel manipulation)
        if (canvasState.isRemovingBg) {
            const imageData = ctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = imageData.data;
            const sens = canvasState.sensitivity;
            const feather = canvasState.feathering;
            const matchR = canvasState.targetColor?.r ?? 255;
            const matchG = canvasState.targetColor?.g ?? 255;
            const matchB = canvasState.targetColor?.b ?? 255;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue; // Skip transparency

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const dist = Math.sqrt(
                    Math.pow(r - matchR, 2) +
                    Math.pow(g - matchG, 2) +
                    Math.pow(b - matchB, 2)
                );

                if (dist < sens * 2) {
                    const threshold = sens * 2;
                    if (feather > 0) {
                        const softEdge = feather * 2;
                        const alpha = Math.max(0, Math.min(1, (dist - (threshold - softEdge)) / softEdge));
                        data[i + 3] = data[i + 3] * alpha;
                    } else {
                        data[i + 3] = 0;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

        draw();
    };

    // Draw Final Render (Fast Transformations Only)
    const draw = () => {
        const canvas = canvasRef.current;
        const buffer = offscreenCanvasRef.current;
        if (!canvas || !buffer) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1200;
        canvas.height = 1200;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Position & Zoom
        ctx.translate(canvas.width / 2 + canvasState.pan.x, canvas.height / 2 + canvasState.pan.y);
        ctx.scale(canvasState.zoom, canvasState.zoom);

        // Draw the processed buffer
        ctx.drawImage(buffer, -buffer.width / 2, -buffer.height / 2);
        ctx.restore();

        // 3. Shape Masks (Applied after transformations)
        if (canvasState.isCircle) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 400, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

    // Trigger Heavy Processing when Cleanup Settings change
    React.useEffect(() => {
        if (isOpen && originalImgRef.current) {
            updateProcessedImage();
        }
    }, [canvasState.isRemovingBg, canvasState.sensitivity, canvasState.feathering, canvasState.targetColor]);

    // Trigger Fast Render when Transformations change
    React.useEffect(() => {
        if (isOpen && offscreenCanvasRef.current) {
            draw();
        }
    }, [canvasState.zoom, canvasState.pan, canvasState.isCircle]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPickingColor) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || isPickingColor) return;
        setCanvasState(prev => ({
            ...prev,
            pan: {
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            }
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!isPickingColor || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            setCanvasState(prev => ({
                ...prev,
                targetColor: { r: pixel[0], g: pixel[1], b: pixel[2] }
            }));
            setIsPickingColor(false);
        } catch (err) {
            console.error("Color pick error:", err);
            toast.error("Could not pick color from this region");
        }
    };

    if (!isOpen || !logo) return null;

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsProcessing(true);
        try {
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create blob');

            const fileName = `edited_logo_${Math.random().toString(36).substring(7)}.png`;
            const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, blob);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
            onSave(data.publicUrl);
        } catch (err: any) {
            toast.error('Failed to save: ' + (err.message || 'unknown error'));
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose}></div>
            <div className="relative glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden border border-white/10 rounded-[3rem] shadow-premium flex flex-col scale-in-center">
                <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-tight">Advanced Logo Refiner</h3>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] mt-0.5 italic">Magic erasure • Shape masks • Identity sync</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all group">
                        <X className="w-6 h-6 text-white/40 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Viewport Area */}
                    <div className="flex-1 bg-black/60 p-8 md:p-12 flex items-center justify-center relative overflow-hidden group">
                        {/* Designer Grid */}
                        <div className="absolute inset-0 opacity-10" style={{
                            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}></div>

                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                            {isProcessing && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[2rem]">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">Refining...</span>
                                    </div>
                                </div>
                            )}
                            <div
                                className={`relative p-8 border border-white/5 bg-white/[0.02] rounded-[2rem] shadow-inner transition-all duration-500 overflow-hidden ${isPickingColor ? 'cursor-crosshair' : 'cursor-move'}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onClick={handleCanvasClick}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-lg"
                                    style={{
                                        filter: 'drop-shadow(0 0 60px rgba(0,0,0,0.8))',
                                        backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                                        backgroundSize: '20px 20px',
                                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                        backgroundColor: '#1a1a1a'
                                    }}
                                />

                                {isPickingColor && (
                                    <div className="absolute top-4 left-4 right-4 p-3 bg-primary rounded-xl text-white text-[9px] font-black uppercase tracking-widest text-center shadow-xl animate-bounce">
                                        Click a color to remove it
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Designer Sidebar */}
                    <div className="w-full lg:w-[360px] bg-white/[0.02] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                            <section className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                        AI-Enhanced Cleaning
                                    </h4>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setCanvasState(prev => {
                                                const isTurningOff = prev.isRemovingBg;
                                                return {
                                                    ...prev,
                                                    isRemovingBg: !prev.isRemovingBg,
                                                    sensitivity: isTurningOff ? 30 : prev.sensitivity,
                                                    feathering: isTurningOff ? 0 : prev.feathering,
                                                    targetColor: isTurningOff ? null : prev.targetColor
                                                };
                                            })}
                                            className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${canvasState.isRemovingBg ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg transition-colors ${canvasState.isRemovingBg ? 'bg-white/20' : 'bg-primary/20'}`}>
                                                    <Scissors className={`w-4 h-4 ${canvasState.isRemovingBg ? 'text-white' : 'text-primary'}`} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={`block text-xs font-black uppercase tracking-widest transition-colors ${canvasState.isRemovingBg ? 'text-white' : 'text-white/80'}`}>Magic Eraser</span>
                                                    <span className={`block text-[7px] font-bold uppercase transition-colors ${canvasState.isRemovingBg ? 'text-white/60' : 'text-white/30'}`}>Remove White Backgrounds</span>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full relative transition-all ${canvasState.isRemovingBg ? 'bg-white/30' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${canvasState.isRemovingBg ? 'left-5 shadow-lg' : 'left-1'}`}></div>
                                            </div>
                                        </button>

                                        {canvasState.isRemovingBg && (
                                            <div className="p-5 bg-black/40 rounded-[2rem] border border-white/5 space-y-5 animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => setIsPickingColor(!isPickingColor)}
                                                        className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isPickingColor ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                    >
                                                        <MousePointer2 className="w-3 h-3" />
                                                        {isPickingColor ? 'Selecting...' : 'Select Color'}
                                                    </button>
                                                    {canvasState.targetColor && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: `rgb(${canvasState.targetColor.r}, ${canvasState.targetColor.g}, ${canvasState.targetColor.b})` }}></div>
                                                            <button onClick={() => setCanvasState(prev => ({ ...prev, targetColor: null }))} className="text-white/20 hover:text-rose-500"><X className="w-3 h-3" /></button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                        <span className="text-white/40">Tolerance</span>
                                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.sensitivity}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="1" max="100" value={canvasState.sensitivity}
                                                        onChange={(e) => setCanvasState(prev => ({ ...prev, sensitivity: parseInt(e.target.value) }))}
                                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                        <span className="text-white/40">Smooth Edges</span>
                                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.feathering}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="100" value={canvasState.feathering}
                                                        onChange={(e) => setCanvasState(prev => ({ ...prev, feathering: parseInt(e.target.value) }))}
                                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <Maximize className="w-3 h-3 text-primary" />
                                        Identity Geometry
                                    </h4>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setCanvasState(prev => ({
                                                ...prev,
                                                isCircle: !prev.isCircle,
                                                zoom: 1,
                                                pan: { x: 0, y: 0 }
                                            }))}
                                            className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${canvasState.isCircle ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg transition-colors ${canvasState.isCircle ? 'bg-white/20' : 'bg-primary/20'}`}>
                                                    <Circle className={`w-4 h-4 ${canvasState.isCircle ? 'text-white' : 'text-primary'}`} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={`block text-xs font-black uppercase tracking-widest transition-colors ${canvasState.isCircle ? 'text-white' : 'text-white/80'}`}>Circle Mask</span>
                                                    <span className={`block text-[7px] font-bold uppercase transition-colors ${canvasState.isCircle ? 'text-white/60' : 'text-white/30'}`}>Circular frame mask</span>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full relative transition-all ${canvasState.isCircle ? 'bg-white/30' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${canvasState.isCircle ? 'left-5 shadow-lg' : 'left-1'}`}></div>
                                            </div>
                                        </button>

                                        <div className="p-5 bg-black/40 rounded-[2rem] border border-white/5 space-y-5">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                    <span className="text-white/40">Scale / Zoom</span>
                                                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{Math.round(canvasState.zoom * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0.1" max="3" step="0.01" value={canvasState.zoom}
                                                    onChange={(e) => setCanvasState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>

                                            <div className="flex items-center justify-center gap-4">
                                                <button
                                                    onClick={() => setCanvasState(prev => ({ ...prev, pan: { x: 0, y: 0 }, zoom: 1 }))}
                                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all"
                                                >
                                                    Reset Transform
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 md:p-8 border-t border-white/5 bg-black/40 space-y-4">
                            <button
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="w-full py-5 rounded-[2.5rem] bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 group disabled:opacity-50"
                            >
                                <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Save To Library
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-[2rem] bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all text-center"
                            >
                                Exit Studio
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Helper Components & Functions ---

/**

 * Extracts dominant colors from an image URL using canvas

 */

const getDominantColors = (url: string): Promise<{ primary: string; secondary: string }> => {

    return new Promise((resolve) => {

        const img = new Image();

        img.crossOrigin = "Anonymous";

        img.src = url;



        img.onload = () => {

            const canvas = document.createElement('canvas');

            const ctx = canvas.getContext('2d');

            if (!ctx) {

                resolve({ primary: '#A30000', secondary: '#0B120F' });

                return;

            }



            canvas.width = img.width;

            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);



            try {

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                const colors: Record<string, number> = {};



                // Sample pixels (every 10th for performance)

                for (let i = 0; i < imageData.length; i += 40) {

                    const r = imageData[i];

                    const g = imageData[i + 1];

                    const b = imageData[i + 2];

                    const a = imageData[i + 3];



                    if (a < 128) continue; // Skip transparent



                    // Group similar colors by rounding

                    const key = `${Math.floor(r / 15) * 15},${Math.floor(g / 15) * 15},${Math.floor(b / 15) * 15}`;

                    colors[key] = (colors[key] || 0) + 1;

                }



                const sortedColors = Object.entries(colors)

                    .sort((a, b) => b[1] - a[1])

                    .map(c => c[0].split(',').map(Number));



                if (sortedColors.length === 0) {

                    resolve({ primary: '#A30000', secondary: '#0B120F' });

                    return;

                }



                const toHex = (rgb: number[]) => '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');



                const primary = toHex(sortedColors[0]);

                // Find a secondary color that is different enough

                let secondary = sortedColors[1] ? animateColor(sortedColors[1], 0.2) : animateColor(sortedColors[0], 0.1);



                resolve({

                    primary: primary,

                    secondary: toHex(secondary)

                });

            } catch (e) {

                console.error("Color extraction failed:", e);

                resolve({ primary: '#A30000', secondary: '#0B120F' });

            }

        };



        img.onerror = () => {

            resolve({ primary: '#A30000', secondary: '#0B120F' });

        };

    });

};



/**

 * Adjusts brightness/saturation of a color for UI use

 */

const animateColor = (rgb: number[], factor: number): number[] => {

    return rgb.map(c => Math.max(0, Math.min(255, Math.floor(c * factor))));

};



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



function PremiumConfirmModal({ isOpen, onClose, title, message, onConfirm, type = 'standard' }: any) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}></div>
            <div className="relative glass-card max-w-md w-full p-8 rounded-[3rem] border border-white/10 shadow-premium scale-in-center overflow-hidden">
                {/* Visual Flair */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${type === 'destructive' ? 'bg-rose-500' : 'bg-primary'}`}></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-2xl mb-6 ${type === 'destructive' ? 'bg-rose-500/20 text-rose-500' : 'bg-primary/20 text-primary'}`}>
                        {type === 'destructive' ? <AlertTriangle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                    </div>

                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{title}</h3>
                    <p className="text-white/40 font-bold uppercase text-[9px] tracking-[0.2em] leading-relaxed mb-8">{message}</p>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 border border-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all hover:scale-105 active:scale-95 ${type === 'destructive' ? 'bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-600' : 'bg-primary text-white shadow-primary/30 hover:bg-primary-hover'}`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
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

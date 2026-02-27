import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    User, Settings as SettingsIcon, Moon, Sun, Bell, Shield, LogOut, ChevronRight, Camera,
    Check, Save, Globe, CreditCard, Plus, Trash2, Palette, Menu, X, Layout, LayoutDashboard,
    Type, Maximize, Minimize, Box, RefreshCw, Building2, Loader2, CheckCircle2, Sparkles,
    Zap, ShieldCheck, AlertTriangle, Lock as LockIcon, Key as KeyIcon, Search, Edit2,
    Upload, Calendar, Clock, ArrowRight, ChevronDown, Wand2, MoveVertical, Scissors,
    Circle, History, Move, ZoomIn, Droplets, MousePointer2, Target, Pipette, Monitor, Smartphone, Award
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCurrency, CURRENCIES, CurrencyCode } from '../../context/CurrencyContext';
import { useTheme, applySettingsToRoot, defaultSettings, GymSettings } from '../../context/ThemeContext';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Modularized Components & Utils
import { LoginRenderer } from './components/LoginRenderer';
import { stripAlpha, toSafeHex, hexToRgba, rgbaToHex8, getDominantColors, lum } from './utils';
import { PremiumConfirmModal, PremiumSwitch, PremiumColorPicker } from './components/SharedUI';
import { FullScreenPreview } from './components/FullScreenPreview';
import { LogoHistoryModal, BgHistoryModal, LogoEditorModal } from './components/Modals';
import { SubscriptionPlansManager } from './components/SubscriptionPlansManager';
import PaletteImportModal from '../../components/PaletteImportModal';





export default function Settings() {
    const { currency, setCurrency } = useCurrency();
    const role = 'admin';
    const { settings, updateSettings, resetToDefaults, hasLoaded } = useTheme();
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishProgress, setPublishProgress] = useState(0);
    const [publishStep, setPublishStep] = useState('');
    const { t, i18n } = useTranslation();
    const context = useOutletContext<{ role: string }>() || { role: null };
    // const role = context.role?.toLowerCase()?.trim(); // Commented out to avoid collision with hardcoded admin role for verification
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Palette Import Modal
    const [showPaletteImport, setShowPaletteImport] = useState(false);

    const [draftSettings, setDraftSettings] = useState<GymSettings>(settings);

    // Track if settings have been initialized in this session to prevent accidental resets
    const [hasSynced, setHasSynced] = useState(false);

    // Secret Section Visibility (Easter Egg)
    const [secretClicks, setSecretClicks] = useState(0);
    const [isSecretRevealed, setIsSecretRevealed] = useState(true);
    const [designMode, setDesignMode] = useState<'desktop' | 'mobile'>('desktop');
    const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'academy' | 'login'>('login');
    const [previewScale, setPreviewScale] = useState(0.2);
    const previewParentRef = useRef<HTMLDivElement>(null);
    const [processingMagic, setProcessingMagic] = useState(false);

    // Dynamic Preview Scaling Logic
    useEffect(() => {
        const updateScale = () => {
            if (previewParentRef.current) {
                const { width, height } = previewParentRef.current.getBoundingClientRect();
                const targetW = designMode === 'mobile' ? 390 : 1920;
                const targetH = designMode === 'mobile' ? 844 : 1080;
                const s = Math.min(width / targetW, height / targetH) * 0.98;
                setPreviewScale(s);
            }
        };
        const timer = setTimeout(updateScale, 100);
        window.addEventListener('resize', updateScale);
        return () => {
            window.removeEventListener('resize', updateScale);
            clearTimeout(timer);
        };
    }, [designMode, activeTab]);
    const [isMiniPreview, setIsMiniPreview] = useState(false);
    const [showFullPreview, setShowFullPreview] = useState(false);
    const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (secretClicks > 0) {
            const timer = setTimeout(() => setSecretClicks(0), 2000);
            return () => clearTimeout(timer);
        }
    }, [secretClicks]);

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isMiniPreview) return;
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - previewPos.x, y: clientY - previewPos.y });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            setPreviewPos({
                x: clientX - dragStart.x,
                y: clientY - dragStart.y
            });
        };

        const handleUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, dragStart]);

    const handleSecretTrigger = () => {
        const next = secretClicks + 1;
        if (next >= 5) {
            setSecretClicks(0);
            const newState = !isSecretRevealed;
            setIsSecretRevealed(newState);

            if (newState) {
                setActiveTab('login');
                toast.success('🤫 Access Granted: Login Designer Revealed', {
                    duration: 3000,
                    position: 'bottom-center',
                    style: { background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                });
            } else {
                if (activeTab === 'login') setActiveTab('appearance');
                toast.success('🔒 Access Restricted: Login Designer Hidden', {
                    duration: 3000,
                    position: 'bottom-center',
                    style: { background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
                });
            }
        } else {
            setSecretClicks(next);
        }
    };

    // Sync draft with global settings only once on load or after a successful save
    useEffect(() => {
        if (hasLoaded && !hasSynced) {
            // Sanitize settings to ensure NO legacy rgba strings leak into color inputs
            const sanitized: any = { ...settings };
            const colorKeys = [
                'primary_color', 'secondary_color', 'accent_color', 'surface_color',
                'hover_color', 'hover_border_color', 'input_bg_color',
                'text_color_base', 'text_color_muted',
                'login_card_color', 'login_card_border_color', 'login_accent_color', 'login_text_color',
                'login_mobile_card_color', 'login_mobile_card_border_color', 'login_mobile_accent_color', 'login_mobile_text_color'
            ];

            colorKeys.forEach(key => {
                if (sanitized[key]) {
                    sanitized[key] = toSafeHex(sanitized[key]);
                }
            });

            setDraftSettings(sanitized);
            setHasSynced(true);
        }
    }, [hasLoaded, settings, hasSynced]);

    // Helper to get the correct setting key based on design mode (Desktop vs Mobile)
    const getLoginKey = (key: string): keyof GymSettings => {
        if (designMode === 'mobile') {
            const mobileKey = `login_mobile_${key.replace('login_', '')}` as keyof GymSettings;
            return mobileKey;
        }
        return key as keyof GymSettings;
    };

    const previewSettings = useMemo(() => {
        if (designMode === 'desktop') return draftSettings;
        return {
            ...draftSettings,
            login_bg_url: draftSettings.login_mobile_bg_url || draftSettings.login_bg_url,
            login_logo_url: draftSettings.login_mobile_logo_url || draftSettings.login_logo_url || draftSettings.logo_url,
            login_card_opacity: draftSettings.login_mobile_card_opacity ?? draftSettings.login_card_opacity,
            login_card_color: draftSettings.login_mobile_card_color || draftSettings.login_card_color,
            login_card_border_color: draftSettings.login_mobile_card_border_color || draftSettings.login_card_border_color,
            login_card_scale: draftSettings.login_mobile_card_scale ?? draftSettings.login_card_scale,
            login_show_logo: draftSettings.login_mobile_show_logo ?? draftSettings.login_show_logo,
            login_text_color: draftSettings.login_mobile_text_color || draftSettings.login_text_color,
            login_accent_color: draftSettings.login_mobile_accent_color || draftSettings.login_accent_color,
            login_logo_opacity: draftSettings.login_mobile_logo_opacity ?? draftSettings.login_logo_opacity,
            login_logo_scale: draftSettings.login_mobile_logo_scale ?? draftSettings.login_logo_scale,
            login_logo_x_offset: draftSettings.login_mobile_logo_x_offset ?? draftSettings.login_logo_x_offset,
            login_logo_y_offset: draftSettings.login_mobile_logo_y_offset ?? draftSettings.login_logo_y_offset ?? -220,
            login_bg_blur: draftSettings.login_mobile_bg_blur ?? draftSettings.login_bg_blur,
            login_bg_brightness: draftSettings.login_mobile_bg_brightness ?? draftSettings.login_bg_brightness,
            login_bg_zoom: draftSettings.login_mobile_bg_zoom ?? draftSettings.login_bg_zoom,
            login_bg_x_offset: draftSettings.login_mobile_bg_x_offset ?? draftSettings.login_bg_x_offset,
            login_bg_y_offset: draftSettings.login_mobile_bg_y_offset ?? draftSettings.login_bg_y_offset,
            login_bg_fit: draftSettings.login_mobile_bg_fit || draftSettings.login_bg_fit,
            login_bg_opacity: draftSettings.login_mobile_bg_opacity ?? draftSettings.login_bg_opacity,
            login_card_x_offset: draftSettings.login_mobile_card_x_offset ?? draftSettings.login_card_x_offset,
            login_card_y_offset: draftSettings.login_mobile_card_y_offset ?? draftSettings.login_card_y_offset,
            login_card_width: draftSettings.login_mobile_card_width ?? draftSettings.login_card_width,
            login_card_height: draftSettings.login_mobile_card_height ?? draftSettings.login_card_height,
            academy_name: draftSettings.academy_name,
        };
    }, [draftSettings, designMode]);


    // Live Preview Effect: Apply draft settings to root in real-time
    useEffect(() => {
        applySettingsToRoot(draftSettings);
    }, [draftSettings]);

    const publishThemeSettings = async (settingsToSave: Partial<GymSettings>) => {
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
            const { academy_name, gym_phone, gym_address, logo_url, ...themeOnlySettings } = settingsToSave as any;

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

    const handleSaveTheme = async () => {
        await publishThemeSettings(draftSettings);
    };

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
        { id: 'elite', name: 'Elite Red', primary: '#A30000', secondary: '#0B120F', bg: '#0B120F', accent: '#A30000', surface: '#151f1ccc', hover: '#A3000080', input: '#070D0B', font: 'Cairo' },
        { id: 'midnight', name: 'Midnight', primary: '#818cf8', secondary: '#1e293b', bg: '#0f172a', accent: '#c084fc', surface: '#1e293bb3', hover: '#818cf880', input: '#0f172a' },
        { id: 'noguchi', name: 'Noguchi Pink', primary: '#ff096c', secondary: '#192731', bg: '#192731', accent: '#ff096c', surface: '#2a3843b3', hover: '#ff096c80', input: '#111d26' },
        { id: 'obsidian', name: 'Obsidian', primary: '#a78bfa', secondary: '#18181b', bg: '#000000', accent: '#a78bfa', surface: '#18181bb3', hover: '#a78bfa80', input: '#09090b' },
        { id: 'emerald', name: 'Emerald', primary: '#34d399', secondary: '#1e3a2f', bg: '#0a1f1a', accent: '#2dd4bf', surface: '#064e3bb3', hover: '#34d39980', input: '#061a15' },
        { id: 'crimson', name: 'Crimson', primary: '#fb7185', secondary: '#3f1d28', bg: '#1a0a0f', accent: '#f43f5e', surface: '#4c0519b3', hover: '#fb718580', input: '#14070a' },
        { id: 'amber', name: 'Amber', primary: '#fbbf24', secondary: '#3f2f1d', bg: '#1a140a', accent: '#f59e0b', surface: '#061a03b3', hover: '#fbbf2480', input: '#140c06' },
        { id: 'deepsea', name: 'Ocean', primary: '#22d3ee', secondary: '#1e3a3f', bg: '#0a1a1f', accent: '#06b6d4', surface: '#164e63b3', hover: '#22d3ee80', input: '#07151a' },
        { id: 'royal', name: 'Royal', primary: '#c084fc', secondary: '#2e1f3f', bg: '#14091a', accent: '#a855f7', surface: '#3b0764b3', hover: '#c084fc80', input: '#0e0514' },
        { id: 'sunset', name: 'Sunset', primary: '#f43f5e', secondary: '#4c0519', bg: '#23020b', accent: '#f59e0b', surface: '#4c0519b3', hover: '#f43f5e80', input: '#1a0209' },
        { id: 'forest', name: 'Forest', primary: '#84cc16', secondary: '#14532d', bg: '#052e16', accent: '#34d399', surface: '#14532db3', hover: '#84cc1680', input: '#042211' },
        { id: 'lavender', name: 'Lavender', primary: '#d8b4fe', secondary: '#4c1d95', bg: '#2e1065', accent: '#818cf8', surface: '#4c1d95b3', hover: '#d8b4fe80', input: '#210b4a' },
        { id: 'coffee', name: 'Coffee', primary: '#d4a373', secondary: '#281b15', bg: '#1a0f0a', accent: '#faedcd', surface: '#281b15b3', hover: '#d4a37380', input: '#1a110d' },
        { id: 'shoqata', name: 'Shoqata', primary: '#1a2937', secondary: '#e3e4e4', bg: '#e3e4e4', accent: '#344351', surface: '#bbbdbeb3', hover: '#1a293780', input: '#ffffff' },
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
            hover_color: (theme as any).hover || theme.primary + '33',
            hover_border_color: theme.primary + '66',
            input_bg_color: (theme as any).input || prev.input_bg_color,
            text_color_base: (theme as any).text_base || (lum(theme.bg) > 0.6 ? '#0f172a' : '#f8fafc'),
            text_color_muted: (theme as any).text_muted || (lum(theme.bg) > 0.6 ? '#0f172a99' : '#ffffff99'),
            font_family: (theme as any).font || prev.font_family,
        }));
    };

    const handlePaletteImport = async (palette: { primary: string; secondary: string; accent: string; surface: string; bg: string; input: string; text_base: string; text_muted: string; hover: string; hover_border: string }) => {
        const newSettings = {
            ...draftSettings,
            // App theme (Login page sync removed per user request to decouple)
            primary_color: palette.primary,
            secondary_color: palette.bg,
            accent_color: palette.accent,
            surface_color: palette.surface,
            input_bg_color: palette.input,
            text_color_base: palette.text_base,
            text_color_muted: palette.text_muted,
            hover_color: palette.hover,
            hover_border_color: palette.hover_border,
        };

        setDraftSettings(newSettings);
        await publishThemeSettings(newSettings);
        toast.success('✨ Palette applied & saved!', { duration: 2500 });
    };

    const applyMagicTheme = (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;

        setCurrentTheme(theme.id);
        localStorage.setItem('theme', theme.id);
        setDraftSettings(prev => ({
            ...prev,
            // App-wide theme (Login page sync removed per user request to decouple)
            primary_color: theme.primary,
            secondary_color: theme.secondary,
            accent_color: theme.accent || prev.accent_color,
            surface_color: theme.surface || prev.surface_color,
            hover_color: (theme as any).hover || theme.primary + '33',
            hover_border_color: theme.primary + '66',
            input_bg_color: (theme as any).input || prev.input_bg_color,
            text_color_base: (theme as any).text_base || (lum(theme.bg) > 0.6 ? '#0f172a' : '#f8fafc'),
            text_color_muted: (theme as any).text_muted || (lum(theme.bg) > 0.6 ? '#0f172a99' : '#ffffff99'),
            font_family: (theme as any).font || prev.font_family,
        }));

        toast.success(`✨ ${theme.name} applied to app!`, { duration: 2500 });
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateSettings({
                academy_name: draftSettings.academy_name,
                gym_phone: draftSettings.gym_phone,
                gym_address: draftSettings.gym_address,
                logo_url: draftSettings.logo_url,
                login_logo_url: draftSettings.login_logo_url,
                login_mobile_logo_url: draftSettings.login_mobile_logo_url
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
            // Find all login_ and login_mobile_ keys to save
            const loginKeys = Object.keys(draftSettings).filter(key =>
                key.startsWith('login_') || key.startsWith('login_mobile_')
            );

            const payload: any = {
                academy_name: draftSettings.academy_name,
                logo_url: draftSettings.logo_url
            };

            loginKeys.forEach(key => {
                payload[key] = draftSettings[key as keyof GymSettings];
            });

            await updateSettings(payload);
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
                login_logo_url: publicUrl,
                login_mobile_logo_url: publicUrl
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Dynamic Branded Backdrop */}
                    <div className="absolute inset-0 bg-black animate-in fade-in duration-1000">
                        <div
                            className="absolute inset-0 opacity-40 blur-[120px] scale-150 transition-all duration-1000"
                            style={{
                                background: `radial-gradient(circle at center, ${draftSettings.primary_color}, transparent 60%)`
                            }}
                        />
                        <div className="absolute inset-0 backdrop-blur-[60px] bg-black/40" />
                    </div>

                    {/* Centered Premium Card */}
                    <div className="relative glass-card px-8 py-10 rounded-[3.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-sm w-full text-center animate-in zoom-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
                        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full blur-[30px] animate-pulse scale-90"
                                style={{ backgroundColor: `${draftSettings.primary_color}33` }}
                            />
                            <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/[0.05]" />
                                <circle
                                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="5" fill="transparent"
                                    strokeDasharray={553} strokeDashoffset={553 - (553 * publishProgress) / 100}
                                    className="transition-all duration-700 ease-out"
                                    style={{ color: draftSettings.primary_color }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="relative z-10 flex items-center justify-center w-20 h-20">
                                {publishProgress === 100 ? (
                                    <div className="bg-green-500/20 p-4 rounded-full border border-green-500/30 animate-in zoom-in spin-in-12 duration-500">
                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                    </div>
                                ) : (
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute w-12 h-12 border-2 rounded-full animate-ping duration-[1500ms]"
                                            style={{ borderColor: `${draftSettings.primary_color}44` }}
                                        />
                                        <Sparkles className="w-8 h-8 animate-pulse shadow-primary" style={{ color: draftSettings.primary_color }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 w-full">
                            <div className="space-y-1">
                                <p className="text-[7px] font-black uppercase tracking-[0.5em] animate-pulse"
                                    style={{ color: draftSettings.primary_color }}>
                                    {publishProgress === 100 ? 'SUCCESS' : 'PUBLISHING'}
                                </p>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                    {publishProgress === 100 ? t('settings.publishComplete') : t('settings.publishingDesign')}
                                </h3>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-4 py-1.5 bg-white/[0.03] rounded-full border border-white/[0.05]">
                                    {publishStep}
                                </p>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map((step) => (
                                        <div
                                            key={step}
                                            className={`h-1 rounded-full transition-all duration-700 ${publishProgress >= (step * 33)
                                                ? 'w-8 shadow-[0_0_10px_rgba(var(--color-primary),0.3)]'
                                                : 'w-2 bg-white/10'}`}
                                            style={{ backgroundColor: publishProgress >= (step * 33) ? draftSettings.primary_color : undefined }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Note Blocks: Integrated cleaner */}
                        <div className="mt-8 grid grid-cols-2 gap-2 w-full">
                            <div className="p-3 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 opacity-40" style={{ color: draftSettings.primary_color }} />
                                <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] text-center leading-relaxed">
                                    {t('settings.encryptionNote')}
                                </span>
                            </div>
                            <div className="p-3 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 opacity-40" style={{ color: draftSettings.primary_color }} />
                                <span className="text-[6px] font-black text-white/20 uppercase tracking-[0.2em] text-center leading-relaxed">
                                    {t('settings.syncReadyNote')}
                                </span>
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

            {/* Tab Navigation (Optimized for Mobile Visibility - Wrapping instead of Scrolling) */}
            <div className="flex flex-wrap items-center justify-center p-1.5 bg-white/5 rounded-[1.5rem] w-full gap-1.5 mb-6 group transition-all duration-500">
                {role === 'admin' && (
                    <button
                        onClick={() => {
                            setActiveTab('academy');
                            handleSecretTrigger();
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'academy' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        {t('settings.academy')}
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('appearance')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'appearance' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    <Palette className="w-3.5 h-3.5" />
                    {t('settings.appearance')}
                </button>
                {role === 'admin' && isSecretRevealed && (
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'login' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout className="w-3.5 h-3.5" />
                        {t('settings.login')}
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'profile' ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105 ring-1 ring-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
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
                                            onClick={() => setDraftSettings(prev => ({
                                                ...prev,
                                                secondary_color: '#F8FAFC',
                                                surface_color: '#ffffff',
                                                input_bg_color: '#ffffff',
                                                search_bg_color: '#f1f5f9',
                                                search_text_color: '#0f172a',
                                                text_color_base: '#0f172a',
                                                text_color_muted: 'rgba(15, 23, 42, 0.6)',
                                                hover_color: prev.primary_color + '22',
                                                hover_border_color: prev.primary_color + '44'
                                            }))}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${draftSettings.secondary_color === '#F8FAFC' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Sun className="w-3.5 h-3.5" />
                                            {t('settings.light')}
                                        </button>
                                        <button
                                            onClick={() => setDraftSettings(prev => ({
                                                ...prev,
                                                secondary_color: '#0E1D21',
                                                surface_color: 'rgba(18, 46, 52, 0.7)',
                                                input_bg_color: '#0f172a',
                                                search_bg_color: 'rgba(255, 255, 255, 0.05)',
                                                search_text_color: '#ffffff',
                                                text_color_base: '#f8fafc',
                                                text_color_muted: 'rgba(255, 255, 255, 0.6)',
                                                hover_color: prev.primary_color + '33',
                                                hover_border_color: prev.primary_color + '66'
                                            }))}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${draftSettings.secondary_color !== '#F8FAFC' ? 'bg-secondary text-primary shadow-lg ring-1 ring-white/10' : 'text-white/40 hover:text-white'}`}
                                        >
                                            <Moon className="w-3.5 h-3.5" />
                                            {t('settings.dark')}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                    {themes.map(theme => (
                                        <div
                                            key={theme.id}
                                            onClick={() => applyPreset(theme)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    applyPreset(theme);
                                                }
                                            }}
                                            className={`group relative p-3 rounded-2xl border-2 transition-all duration-500 hover:scale-[1.05] active:scale-95 cursor-pointer outline-none ${currentTheme === theme.id
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
                                        </div>
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
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Interface Branding</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <PremiumColorPicker label="Text Base" value={draftSettings.text_color_base || ''} onChange={(val) => setDraftSettings({ ...draftSettings, text_color_base: val })} />
                                                    <PremiumColorPicker label="Text Muted" value={draftSettings.text_color_muted || ''} onChange={(val) => setDraftSettings({ ...draftSettings, text_color_muted: val })} />
                                                    <PremiumColorPicker label="Surface" value={draftSettings.surface_color} onChange={(val) => setDraftSettings({ ...draftSettings, surface_color: val })} />
                                                    <PremiumColorPicker label="Input Bg" value={draftSettings.input_bg_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, input_bg_color: val })} />
                                                    <PremiumColorPicker label="Hover Color" value={draftSettings.hover_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, hover_color: val })} />
                                                    <PremiumColorPicker label="Hover Border" value={draftSettings.hover_border_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, hover_border_color: val })} />
                                                    <PremiumColorPicker label="Search Bg" value={draftSettings.search_bg_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, search_bg_color: val })} />
                                                    <PremiumColorPicker label="Brand Label" value={draftSettings.brand_label_color || ''} onChange={(val) => setDraftSettings({ ...draftSettings, brand_label_color: val })} />
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

                                            {/* Font Scaling */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest flex items-center gap-2">
                                                    <Type className="w-3 h-3" />
                                                    {t('settings.fontScale')}
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { label: 'Standard', scale: 1.0 },
                                                        { label: 'Large', scale: 1.15 },
                                                        { label: 'Huge', scale: 1.3 },
                                                        { label: 'XXL', scale: 1.5 }
                                                    ].map(({ label, scale }) => (
                                                        <button
                                                            key={label}
                                                            onClick={() => setDraftSettings({ ...draftSettings, font_scale: scale })}
                                                            className={`p-3 rounded-xl transition-all border ${draftSettings.font_scale === scale ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                                                        >
                                                            <div className="text-[10px] font-black uppercase tracking-widest">{label}</div>
                                                            <div className="text-[8px] font-bold opacity-60 mt-0.5">{Math.round(scale * 100)}%</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Experience Sliders */}
                                            <div className="grid grid-cols-1 gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <label className="text-[9px] text-white/60 font-black uppercase tracking-widest">Fine Tuning</label>
                                                        <span className="text-[9px] text-primary font-bold">{Math.round((draftSettings.font_scale || 1) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0.8"
                                                        max="1.6"
                                                        step="0.05"
                                                        value={draftSettings.font_scale || 1}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, font_scale: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
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

                            <SubscriptionPlansManager
                                showFullPreview={showFullPreview}
                                setShowFullPreview={setShowFullPreview}
                                previewSettings={previewSettings}
                                designMode={designMode}
                            />
                        </div>
                    </div>
                )}

                {/* Login Page Customization */}
                {activeTab === 'login' && (role === 'admin' || isSecretRevealed) && (
                    <div className="space-y-8 pb-20">
                        <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium h-fit">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-500">
                                        <Layout className="w-5 h-5" />
                                    </div>
                                    Login Page Customization
                                </h2>
                                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                                    <button
                                        onClick={() => setDesignMode('desktop')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${designMode === 'desktop' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Monitor className="w-3 h-3" />
                                        Desktop
                                    </button>
                                    <button
                                        onClick={() => setDesignMode('mobile')}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${designMode === 'mobile' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Smartphone className="w-3 h-3" />
                                        Mobile
                                    </button>
                                    <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullPreview(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 border border-primary/20"
                                        title="View Full Screen (1:1)"
                                    >
                                        <Maximize className="w-3 h-3" />
                                        Full Screen
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                {/* Live Preview Column */}
                                <div
                                    className={`flex flex-col gap-3 lg:col-span-5 lg:sticky lg:top-32 h-fit z-50 self-start transition-all duration-300 
                                        ${designMode === 'mobile' ? 'order-2' : 'order-1 lg:order-2'} 
                                        ${isMiniPreview && designMode === 'mobile' ? 'fixed z-[100] ring-2 ring-primary/30 backdrop-blur-md rounded-[3rem] p-1 shadow-2xl overflow-hidden' : 'relative'}`}
                                    style={isMiniPreview && designMode === 'mobile' ? {
                                        bottom: '24px',
                                        right: '24px',
                                        width: '140px',
                                        transform: `translate(${previewPos.x}px, ${previewPos.y}px)`,
                                        opacity: 1,
                                        cursor: isDragging ? 'grabbing' : 'grab'
                                    } : {}}
                                    onMouseDown={handleDragStart}
                                    onTouchStart={handleDragStart}
                                >
                                    <div className="flex items-center justify-between ml-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Live Screen Preview</label>
                                                {isMiniPreview && designMode === 'mobile' && <span className="text-[7px] font-bold text-primary/60 uppercase">Hold & Drag to move</span>}
                                            </div>
                                            {/* Mini Toggle - Mobile Design Mode Only */}
                                            {designMode === 'mobile' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMiniPreview(!isMiniPreview);
                                                        if (isMiniPreview) setPreviewPos({ x: 0, y: 0 });
                                                    }}
                                                    className="lg:hidden p-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white pointer-events-auto"
                                                    title={isMiniPreview ? "Maximize Preview" : "Minimize Preview"}
                                                >
                                                    {isMiniPreview ? <Box className="w-2.5 h-2.5" /> : <Minimize className="w-2.5 h-2.5" />}
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[7px] font-black text-emerald-500/80 uppercase tracking-widest">Pixel Perfect</span>
                                        </div>
                                    </div>

                                    <div className={`flex-1 relative transition-all duration-500 ${designMode === 'mobile' ? 'aspect-[9/19.5] w-full max-w-[280px] mx-auto border-[12px] border-zinc-900 ring-4 ring-white/5' : 'aspect-video w-full border-4 border-white/5'} ${isMiniPreview && designMode === 'mobile' ? '!max-w-full !border-[6px] !ring-2 !rounded-[1.5rem]' : ''} rounded-[2.5rem] overflow-hidden bg-black shadow-2xl`}>
                                        {/* ... (Existing Preview Content remains the same) */}
                                        {/* Mobile Device Aesthetics */}
                                        {designMode === 'mobile' && (
                                            <>
                                                {/* Notch */}
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-900 rounded-b-2xl z-[60] flex items-center justify-center gap-1.5">
                                                    <div className="w-8 h-1 bg-white/10 rounded-full"></div>
                                                    <div className="w-1 h-1 bg-white/10 rounded-full"></div>
                                                </div>
                                                {/* Status Bar */}
                                                <div className="absolute top-1.5 left-0 right-0 px-6 flex justify-between items-center z-50 pointer-events-none opacity-40">
                                                    <span className="text-[8px] font-black text-white">9:41</span>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2.5 h-1.5 bg-white rounded-[1px]"></div>
                                                        <div className="w-2 h-2 rounded-full border border-white"></div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" ref={previewParentRef}>
                                            <div
                                                className={`${designMode === 'mobile' ? 'w-[390px] h-[844px]' : 'w-[1920px] h-[1080px]'} shrink-0 bg-[#020617] overflow-hidden absolute top-1/2 left-1/2 shadow-2xl transition-all duration-500`}
                                                style={{
                                                    transform: `translate(-50%, -50%) scale(${previewScale})`,
                                                    transformOrigin: 'center center'
                                                }}
                                            >
                                                {/* Preview Background */}
                                                <div
                                                    className="absolute inset-0 bg-no-repeat bg-black transition-all duration-1000"
                                                    style={{
                                                        backgroundImage: `url('${previewSettings.login_bg_url || "/Tom Roberton Images _ Balance-and-Form _ 2.jpg"}')`,
                                                        backgroundSize: (previewSettings.login_bg_fit === 'fill') ? '100% 100%' : (previewSettings.login_bg_fit as string || 'cover'),
                                                        backgroundPosition: 'center',
                                                        filter: `blur(${previewSettings.login_bg_blur ?? 0}px) brightness(${previewSettings.login_bg_brightness ?? 1.0})`,
                                                        transform: `scale(${previewSettings.login_bg_zoom ?? 1.0}) translate(${previewSettings.login_bg_x_offset ?? 0}%, ${previewSettings.login_bg_y_offset ?? 0}%)`,
                                                        opacity: (previewSettings.login_bg_opacity as number) ?? 0.8
                                                    }}
                                                ></div>

                                                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/90"></div>
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>

                                                <div
                                                    className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-500 ease-out"
                                                    style={{
                                                        transformOrigin: 'center center',
                                                    }}
                                                >
                                                    {/* Content inside fluid scale */}
                                                    <LoginRenderer
                                                        activeSettings={previewSettings}
                                                        designMode={designMode}
                                                        t={t}
                                                        i18n={i18n}
                                                        isPreview={true}
                                                    />
                                                </div>
                                                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-amber-500 text-[10px] font-black text-black z-[70] shadow-xl">LIVE</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Full Screen Preview Portal */}
                                    <FullScreenPreview
                                        show={showFullPreview}
                                        onClose={() => setShowFullPreview(false)}
                                        previewSettings={previewSettings}
                                        designMode={designMode}
                                    />
                                </div>


                                {/* Controls Column */}
                                <div className={`space-y-6 lg:col-span-7 transition-all duration-300 ${designMode === 'mobile' ? 'order-1 lg:order-1' : 'order-2 lg:order-1'}`}>
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
                                                                [getLoginKey('login_bg_url')]: publicUrl,
                                                                [getLoginKey('login_bg_x_offset')]: 0,
                                                                [getLoginKey('login_bg_y_offset')]: 0,
                                                                [getLoginKey('login_bg_zoom')]: 1,
                                                                [getLoginKey('login_bg_blur')]: 0
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
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[9px] text-white/60 font-black uppercase tracking-widest block">Background Control</label>
                                                <button
                                                    onClick={() => setDraftSettings({
                                                        ...draftSettings,
                                                        [getLoginKey('login_bg_x_offset')]: 0,
                                                        [getLoginKey('login_bg_y_offset')]: 0
                                                    })}
                                                    className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[7px] font-black text-white/40 hover:text-white"
                                                    title="Center Background"
                                                >
                                                    <Target className="w-3 h-3" />
                                                    CENTER
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Zoom</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((Number(draftSettings[getLoginKey('login_bg_zoom')]) || 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.5" max="2.0" step="0.05"
                                                        value={Number(draftSettings[getLoginKey('login_bg_zoom')]) ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_bg_zoom')]: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Brightness</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((Number(draftSettings[getLoginKey('login_bg_brightness')]) || 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.2" max="1.5" step="0.05"
                                                        value={Number(draftSettings[getLoginKey('login_bg_brightness')]) ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_bg_brightness')]: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">BG Opacity</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((Number(draftSettings[getLoginKey('login_bg_opacity')]) || 0.8) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.01"
                                                        value={Number(draftSettings[getLoginKey('login_bg_opacity')]) ?? 0.8}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_bg_opacity')]: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 overflow-hidden">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Fit Mode</span>
                                                    </div>
                                                    <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                                                        {(['cover', 'contain', 'fill'] as const).map((mode) => (
                                                            <button
                                                                key={mode}
                                                                onClick={() => setDraftSettings({ ...draftSettings, [getLoginKey('login_bg_fit')]: mode })}
                                                                className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${(draftSettings[getLoginKey('login_bg_fit')] || 'cover') === mode
                                                                    ? 'bg-amber-500 text-black shadow-lg'
                                                                    : 'text-white/40 hover:text-white hover:bg-white/5'
                                                                    }`}
                                                            >
                                                                {mode}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">BG X Offset</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_bg_x_offset')]) || 0}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-50" max="50" step="1"
                                                        value={Number(draftSettings[getLoginKey('login_bg_x_offset')]) ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_bg_x_offset')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">BG Y Offset</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_bg_y_offset')]) || 0}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-50" max="50" step="1"
                                                        value={Number(draftSettings[getLoginKey('login_bg_y_offset')]) ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_bg_y_offset')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                <label className="text-[9px] text-white/60 font-black uppercase tracking-widest block">Logo Appearance</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setDraftSettings({
                                                            ...draftSettings,
                                                            [getLoginKey('login_logo_x_offset')]: 0,
                                                            [getLoginKey('login_logo_y_offset')]: 0
                                                        })}
                                                        className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[7px] font-black text-white/40 hover:text-white"
                                                        title="Center Logo"
                                                    >
                                                        <Target className="w-3 h-3" />
                                                        CENTER
                                                    </button>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">{draftSettings[getLoginKey('login_show_logo')] !== false ? 'Visible' : 'Hidden'}</span>
                                                    <PremiumSwitch
                                                        checked={draftSettings[getLoginKey('login_show_logo')] !== false}
                                                        onChange={(val) => setDraftSettings({ ...draftSettings, [getLoginKey('login_show_logo')]: val })}
                                                        label=""
                                                    />
                                                </div>
                                            </div>

                                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-500 ${draftSettings[getLoginKey('login_show_logo')] === false ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'}`}>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Scale</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((Number(draftSettings[getLoginKey('login_logo_scale')]) ?? 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.5" max="2.0" step="0.1"
                                                        value={Number(draftSettings[getLoginKey('login_logo_scale')]) ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_logo_scale')]: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Logo Opacity</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((Number(draftSettings[getLoginKey('login_logo_opacity')]) ?? 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.05"
                                                        value={Number(draftSettings[getLoginKey('login_logo_opacity')]) ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_logo_opacity')]: parseFloat(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">X Offset</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_logo_x_offset')]) ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-800" max="800" step="5"
                                                        value={Number(draftSettings[getLoginKey('login_logo_x_offset')]) ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_logo_x_offset')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Y Offset (Vertical)</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_logo_y_offset')]) ?? 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-600" max="600" step="5"
                                                        value={Number(draftSettings[getLoginKey('login_logo_y_offset')]) ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_logo_y_offset')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
                                                <label className="text-[9px] text-white/60 font-black uppercase tracking-widest block">Card Position & Layout</label>
                                                <button
                                                    onClick={() => setDraftSettings({
                                                        ...draftSettings,
                                                        [getLoginKey('login_card_x_offset')]: 0,
                                                        [getLoginKey('login_card_y_offset')]: 0
                                                    })}
                                                    className="p-1 px-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[7px] font-black text-white/40 hover:text-white"
                                                    title="Center Card"
                                                >
                                                    <Target className="w-3 h-3" />
                                                    CENTER
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">V-Offset (Y)</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_card_y_offset')]) || 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-600" max="600" step="1"
                                                        value={Number(draftSettings[getLoginKey('login_card_y_offset')]) ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_card_y_offset')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">H-Offset (X)</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_card_x_offset')]) || 0}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="-800" max="800" step="1"
                                                        value={Number(draftSettings[getLoginKey('login_card_x_offset')]) ?? 0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_card_x_offset')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Card Width</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_card_width')]) || (designMode === 'mobile' ? 340 : 448)}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="200" max="1440" step="5"
                                                        value={Number(draftSettings[getLoginKey('login_card_width')]) || (designMode === 'mobile' ? 340 : 448)}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_card_width')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Card Height</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Number(draftSettings[getLoginKey('login_card_height')]) || (designMode === 'mobile' ? 500 : 600)}px</span>
                                                    </div>
                                                    <input
                                                        type="range" min="200" max="1200" step="5"
                                                        value={Number(draftSettings[getLoginKey('login_card_height')]) || (designMode === 'mobile' ? 500 : 600)}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_card_height')]: parseInt(e.target.value) })}
                                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-[8px] text-white/40 uppercase font-bold">Card Scale</span>
                                                        <span className="text-[8px] text-amber-500 font-bold">{Math.round((Number(draftSettings[getLoginKey('login_card_scale')]) || 1.0) * 100)}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0.5" max="1.5" step="0.05"
                                                        value={Number(draftSettings[getLoginKey('login_card_scale')]) ?? 1.0}
                                                        onChange={(e) => setDraftSettings({ ...draftSettings, [getLoginKey('login_card_scale')]: parseFloat(e.target.value) })}
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

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="w-full">
                                                <PremiumColorPicker
                                                    label="Card Color"
                                                    value={String(draftSettings[getLoginKey('login_card_color')]) || '#000000'}
                                                    onChange={(val) => {
                                                        const rgba = hexToRgba(val);
                                                        setDraftSettings({
                                                            ...draftSettings,
                                                            [getLoginKey('login_card_color')]: val,
                                                            [getLoginKey('login_card_opacity')]: rgba.a
                                                        });
                                                    }}
                                                />
                                            </div>
                                            <div className="w-full">
                                                <PremiumColorPicker
                                                    label="Border Color"
                                                    value={String(draftSettings[getLoginKey('login_card_border_color')]) || '#ffffff33'}
                                                    onChange={(val) => setDraftSettings({ ...draftSettings, [getLoginKey('login_card_border_color')]: val })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="w-full">
                                                <PremiumColorPicker
                                                    label="Text Color"
                                                    value={String(draftSettings[getLoginKey('login_text_color')]) || '#ffffff'}
                                                    onChange={(val) => setDraftSettings({ ...draftSettings, [getLoginKey('login_text_color')]: val })}
                                                    description="Headings & Labels"
                                                />
                                            </div>
                                            <div className="w-full">
                                                <PremiumColorPicker
                                                    label="Accent Color"
                                                    value={String(draftSettings[getLoginKey('login_accent_color')]) || draftSettings.primary_color || '#D4AF37'}
                                                    onChange={(val) => setDraftSettings({ ...draftSettings, [getLoginKey('login_accent_color')]: val })}
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
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            </div>
                        </div >
                        <button
                            onClick={handleSaveLoginCustomization}
                            disabled={loading}
                            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-amber-500/20 mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Login Page Design
                        </button>
                    </div >
                )
                }
                {
                    activeTab === 'profile' && (
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
                    )
                }
            </div >

            {/* Logo Advanced Suite Modals */}
            < LogoHistoryModal
                isOpen={showLogoHistory}
                onClose={() => setShowLogoHistory(false)}
                history={logoHistory}
                isLoading={isLoadingHistory}
                onSelect={(url: string) => {
                    setDraftSettings(prev => ({
                        ...prev,
                        logo_url: url,
                        login_logo_url: url,
                        login_mobile_logo_url: url
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

            < LogoEditorModal
                isOpen={showLogoEditor}
                onClose={() => setShowLogoEditor(false)}
                logo={logoBeingEdited}
                onSave={async (newUrl: string) => {
                    setDraftSettings(prev => ({
                        ...prev,
                        logo_url: newUrl,
                        login_logo_url: newUrl,
                        login_mobile_logo_url: newUrl
                    }));
                    setShowLogoEditor(false);
                    toast.success('Logo updated with edits');
                    fetchLogoHistory();
                }}
            />

            < BgHistoryModal
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
        </div >
    );
}










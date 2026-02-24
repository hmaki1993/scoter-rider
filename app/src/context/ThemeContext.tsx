import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface GymSettings {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_family: string;
    font_scale: number;
    border_radius: string;
    glass_opacity: number;
    surface_color: string;
    search_icon_color?: string;
    search_bg_color?: string;
    search_border_color?: string;
    search_text_color?: string;
    hover_color?: string;
    hover_border_color?: string;
    input_bg_color?: string;
    clock_position?: 'dashboard' | 'header' | 'none';
    clock_integration?: boolean;
    weather_integration?: boolean;
    language?: string;
    premium_badge_color?: string;
    brand_label_color?: string;
    academy_name?: string;
    logo_url?: string;
    gym_address?: string;
    gym_phone?: string;
    login_bg_url?: string;
    login_logo_url?: string;
    login_card_opacity?: number;
    login_card_color?: string;
    login_logo_scale?: number;
    login_logo_x_offset?: number;
    login_logo_y_offset?: number;
    login_bg_blur?: number;
    login_bg_brightness?: number;
    login_bg_zoom?: number;
    login_bg_x_offset?: number;
    login_bg_y_offset?: number;
    login_card_x_offset?: number;
    login_card_y_offset?: number;
    login_card_border_color?: string;
    login_card_scale?: number;
    login_show_logo?: boolean;
    login_text_color?: string;
    login_accent_color?: string;
}

export const applySettingsToRoot = (settings: GymSettings) => {
    console.log('Applying theme settings to root:', settings);
    const root = document.documentElement;

    // Helper to calculate luminance
    const getLuminance = (hex: string) => {
        try {
            if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
                console.warn('Invalid hex color provided to getLuminance:', hex);
                return 0; // Default to dark luminance
            }
            const c = hex.substring(1);
            const rgb = parseInt(c, 16);
            if (isNaN(rgb)) {
                console.warn('Could not parse hex color:', hex);
                return 0;
            }
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;

            const uR = r / 255;
            const uG = g / 255;
            const uB = b / 255;

            // sRGB luminance
            const lum = 0.2126 * (uR <= 0.03928 ? uR / 12.92 : Math.pow((uR + 0.055) / 1.055, 2.4)) +
                0.7152 * (uG <= 0.03928 ? uG / 12.92 : Math.pow((uG + 0.055) / 1.055, 2.4)) +
                0.0722 * (uB <= 0.03928 ? uB / 12.92 : Math.pow((uB + 0.055) / 1.055, 2.4));

            return lum;
        } catch (e) {
            console.error('Error calculating luminance:', e);
            return 0;
        }
    };

    // Colors
    root.style.setProperty('--color-primary', settings.primary_color);
    root.style.setProperty('--color-secondary', settings.secondary_color);
    root.style.setProperty('--color-background', settings.secondary_color);
    root.style.setProperty('--color-accent', settings.accent_color || '#34d399');
    root.style.setProperty('--color-surface', settings.surface_color || 'rgba(18, 46, 52, 0.7)');
    root.style.setProperty('--color-hover', settings.hover_color || 'rgba(16, 185, 129, 0.8)');
    root.style.setProperty('--color-hover-border', settings.hover_border_color || 'rgba(16, 185, 129, 0.3)');
    root.style.setProperty('--color-input-bg', settings.input_bg_color || '#0f172a');
    root.style.setProperty('--color-premium-badge', settings.premium_badge_color || settings.primary_color || '#A30000');
    root.style.setProperty('--color-brand-label', settings.brand_label_color || settings.primary_color || '#A30000');

    // Dynamic Text Colors based on background luminance
    const bgLuminance = getLuminance(settings.secondary_color);
    const isLightMode = bgLuminance > 0.6; // Slightly higher threshold for "True" light mode

    if (isLightMode) {
        // Light Mode Text - Deep contrast
        root.style.setProperty('--color-text-base', '#0a0a0f'); // Near black for sharp readability
        root.style.setProperty('--color-text-muted', '#475569'); // Slate 600 - darker than before
        root.style.setProperty('--color-surface-border', 'rgba(0, 0, 0, 0.15)');
        root.style.setProperty('--is-light-mode', '1');
        root.style.setProperty('color-scheme', 'light');
    } else {
        // Dark Mode Text
        root.style.setProperty('--color-text-base', '#f8fafc'); // Slate 50
        root.style.setProperty('--color-text-muted', 'rgba(255, 255, 255, 0.6)');
        root.style.setProperty('--color-surface-border', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--is-light-mode', '0');
        root.style.setProperty('color-scheme', 'dark');
    }

    // Search Specifics
    root.style.setProperty('--color-search-icon', settings.search_icon_color || 'rgba(255, 255, 255, 0.4)');
    root.style.setProperty('--color-search-bg', settings.search_bg_color || 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--color-search-border', settings.search_border_color || 'rgba(255, 255, 255, 0.1)');
    root.style.setProperty('--color-search-text', settings.search_text_color || '#ffffff');
    root.style.setProperty('--color-search-placeholder', settings.search_text_color ? `${settings.search_text_color}40` : 'rgba(255, 255, 255, 0.2)');

    // Fonts
    if (settings.font_family !== 'Cairo') {
        root.style.setProperty('font-family', `"${settings.font_family}", sans-serif`);
    } else {
        root.style.removeProperty('font-family');
    }

    // Scale
    root.style.setProperty('font-size', `${settings.font_scale * 100}%`);

    // Styles
    root.style.setProperty('--radius', settings.border_radius || '1.5rem');

    // Adjust glass opacity for light mode to ensure transparency isn't too overpowering
    const baseOpacity = settings.glass_opacity ?? 0.6;
    const finalOpacity = isLightMode ? Math.min(baseOpacity, 0.4) : baseOpacity;
    root.style.setProperty('--glass-opacity', finalOpacity.toString());
};

interface ThemeContextType {
    settings: GymSettings;
    updateSettings: (newSettings: Partial<GymSettings>) => Promise<void>;
    isLoading: boolean;
    resetToDefaults: () => Promise<void>;
    userProfile: { id: string; email: string; full_name: string | null; role: string | null; avatar_url: string | null } | null;
}

export const defaultSettings: GymSettings = {
    primary_color: '#A30000',
    secondary_color: '#0B120F',
    accent_color: '#A30000',
    font_family: 'Cairo',
    font_scale: 1,
    border_radius: '1.5rem',
    glass_opacity: 0.6,
    surface_color: 'rgba(21, 31, 28, 0.8)',
    search_icon_color: 'rgba(255, 255, 255, 0.4)',
    search_bg_color: 'rgba(255, 255, 255, 0.03)',
    search_border_color: 'rgba(255, 255, 255, 0.08)',
    search_text_color: '#ffffff',
    hover_color: 'rgba(163, 0, 0, 0.4)',
    hover_border_color: 'rgba(163, 0, 0, 0.2)',
    input_bg_color: '#070D0B',
    clock_position: 'dashboard',
    clock_integration: true,
    weather_integration: true,
    language: 'en',
    premium_badge_color: '#A30000',
    brand_label_color: '#A30000',
    academy_name: 'Healy Academy',
    gym_address: 'Cairo, Egypt',
    gym_phone: '+20 123 456 7890',
    login_bg_url: '/Tom Roberton Images _ Balance-and-Form _ 2.jpg',
    login_logo_url: '/logo.png',
    login_card_opacity: 0.6,
    login_card_color: '#000000',
    login_show_logo: true,
    login_text_color: '#ffffff',
    login_accent_color: '#D4AF37'
};

// Keys that are shared across the entire gym
export const GYM_WIDE_KEYS: (keyof GymSettings)[] = [
    'academy_name', 'logo_url', 'gym_address', 'gym_phone',
    'login_bg_url', 'login_logo_url', 'login_card_opacity', 'login_card_color',
    'login_logo_scale', 'login_logo_x_offset', 'login_logo_y_offset',
    'login_bg_blur', 'login_bg_brightness', 'login_bg_zoom',
    'login_bg_x_offset', 'login_bg_y_offset',
    'login_card_x_offset', 'login_card_y_offset',
    'login_card_border_color', 'login_card_scale', 'login_show_logo',
    'login_text_color', 'login_accent_color'
];

// Keys that can be customized per user
export const USER_SPECIFIC_KEYS: (keyof GymSettings)[] = [
    'primary_color', 'secondary_color', 'accent_color', 'font_family',
    'font_scale', 'border_radius', 'glass_opacity', 'surface_color',
    'search_icon_color', 'search_bg_color', 'search_border_color', 'search_text_color',
    'hover_color', 'hover_border_color', 'input_bg_color', 'clock_position',
    'clock_integration', 'weather_integration', 'language', 'premium_badge_color',
    'brand_label_color'
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<GymSettings>(defaultSettings);
    const hasPossibleSession = typeof window !== 'undefined' &&
        Object.keys(localStorage).some(key => key.includes('auth-token'));
    const [isLoading, setIsLoading] = useState(hasPossibleSession);
    const [userProfile, setUserProfile] = useState<ThemeContextType['userProfile']>(null);

    const { i18n } = useTranslation();

    useEffect(() => {
        applySettingsToRoot(settings);
    }, [settings]);

    useEffect(() => {
        if (settings.academy_name) {
            document.title = settings.academy_name;
        }
    }, [settings.academy_name]);

    useEffect(() => {
        // Only force change if it's different and we are NOT in the middle of a manual switch
        // This prevents the "auto-revert" behavior on login page
        if (settings.language && i18n.language !== settings.language) {
            console.log('🌍 ThemeContext: Syncing i18n language to settings:', settings.language);
            i18n.changeLanguage(settings.language);
            document.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
        }
    }, [settings.language]); // Removed i18n from deps to avoid loop/aggressive sync

    useEffect(() => {
        // 1. Auth State Listener: Critical for Privacy
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 ThemeContext: Auth Event:', event);
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
                fetchSettings();
            } else if (event === 'SIGNED_OUT') {
                console.log('🔐 ThemeContext: User signed out, keeping global settings and clearing profile...');
                setUserProfile(null);
                // Re-fetch to ensure we show the global gym settings for unauthenticated users
                fetchSettings();
            }
        });

        // 2. Initial Fetch
        fetchSettings();

        // 3. Keep profile synced if updated elsewhere
        const handleProfileUpdate = () => {
            fetchSettings();
        };
        window.addEventListener('userProfileUpdated', handleProfileUpdate);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('userProfileUpdated', handleProfileUpdate);
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            console.log('📥 LOADING SETTINGS FOR USER:', user?.id, user?.email);

            // 1. Get Global Defaults
            const { data: globalData, error: globalError } = await supabase
                .from('gym_settings')
                .select('*')
                .maybeSingle();

            if (globalError) {
                console.error('📥 Global settings fetch error:', globalError);
            }

            let finalSettings = { ...defaultSettings };
            if (globalData) {
                console.log('📥 Loaded global defaults from gym_settings');
                // Filter out nulls from globalData
                const filteredGlobal = Object.fromEntries(
                    Object.entries(globalData).filter(([_, v]) => v !== null)
                );
                finalSettings = { ...finalSettings, ...filteredGlobal };
            }

            // 2. Overlay User Personal Settings & Fetch Profile
            if (user) {
                // PRELIMINARY PROFILE: Only set for clear Admins to prevent flickering. 
                // Others must wait for DB confirmation to ensure they haven't been deleted.
                const email = user.email?.toLowerCase() || '';
                const isAdminEmail = email.startsWith('admin@') || email.startsWith('amin@');
                const tempRole = isAdminEmail ? 'admin' : null;

                console.log('🛡️ ThemeContext: Preliminary check', { email, tempRole, existingProfile: userProfile?.role });

                if (tempRole) {
                    if (!userProfile || userProfile.id !== user.id) {
                        console.log('🛡️ ThemeContext: Setting preliminary admin profile');
                        setUserProfile({
                            id: user.id,
                            email: user.email || '',
                            full_name: user.user_metadata?.full_name || null,
                            role: tempRole,
                            avatar_url: null
                        });
                    }
                } else if (userProfile && userProfile.id !== user.id) {
                    // Reset if the user ID changed (e.g., login after logout without full reload)
                    console.log('🛡️ ThemeContext: User ID changed, resetting profile for new fetch...');
                    setUserProfile(null);
                }

                // Fetch user settings, profile, and coach record in parallel
                const [userSettingsRes, profileRes, coachRes] = await Promise.all([
                    supabase
                        .from('user_settings')
                        .select('*')
                        .eq('user_id', user.id)
                        .maybeSingle(),
                    supabase
                        .from('profiles')
                        .select('full_name, role, avatar_url')
                        .eq('id', user.id)
                        .maybeSingle(),
                    supabase
                        .from('coaches')
                        .select('id')
                        .eq('profile_id', user.id)
                        .maybeSingle()
                ]);

                if (userSettingsRes.error) console.warn('📥 User settings fetch error:', userSettingsRes.error);
                if (profileRes.error) console.warn('📥 User profile fetch error:', profileRes.error);

                if (userSettingsRes.data) {
                    console.log('📥 Found user personal settings:', userSettingsRes.data);
                    // Filter out nulls AND only include user-specific keys to prevent overwriting gym-wide settings
                    const filteredUser = Object.fromEntries(
                        Object.entries(userSettingsRes.data).filter(([key, v]) =>
                            v !== null && USER_SPECIFIC_KEYS.includes(key as keyof GymSettings)
                        )
                    );
                    finalSettings = { ...finalSettings, ...filteredUser };
                }

                // 🛡️ DEEP SANITY CHECK: 
                // A coach must have a record in both 'profiles' AND 'coaches' tables.
                const isCoach = profileRes.data?.role?.toLowerCase() === 'coach';
                const hasCoachRecord = !!coachRes.data;
                const isUnauthorizedGhost = isCoach && !hasCoachRecord;

                if (profileRes.data && !isUnauthorizedGhost) {
                    console.log('🛡️ ThemeContext: Found valid user profile:', profileRes.data);
                    setUserProfile({
                        id: user.id,
                        email: user.email || '',
                        ...profileRes.data
                    });
                } else if (isAdminEmail) {
                    // 🛡️ ADMIN FALLBACK: If they have an admin email but no profile record, 
                    // allow them to stay logged in as an admin to fix the issue.
                    console.warn('🛡️ ThemeContext: Admin profile missing in DB, using fallback.');
                    setUserProfile({
                        id: user.id,
                        email: user.email || '',
                        full_name: user.user_metadata?.full_name || 'Administrator',
                        role: 'admin',
                        avatar_url: null
                    });
                } else {
                    // 🛡️ SECURITY LOCK: Either profile is missing, or it's a "Ghost" coach profile without a record.
                    const reason = isUnauthorizedGhost ? 'Ghost Profile detected' : 'Profile missing';
                    console.error(`🛡️ ThemeContext: SECURITY LOCK (${reason}) - User logged in but unauthorized. Signing out...`);

                    // Delay sign out slightly to prevent infinite loops during transition
                    setTimeout(async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) {
                            await supabase.auth.signOut();
                            toast.error(isUnauthorizedGhost ? 'Account inactive or deleted.' : 'Session expired or deleted.');
                            window.location.href = '/login';
                        }
                    }, 1500);

                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }

            console.log('📥 FINAL SETTINGS LOADED:', finalSettings);
            setSettings(finalSettings);

            // 3. Setup Realtime for GLOBAL GYM SETTINGS (Always active)
            const gymChannelId = 'global_gym_settings';
            supabase.removeChannel(supabase.channel(gymChannelId));

            supabase
                .channel(gymChannelId)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'gym_settings'
                    },
                    (payload) => {
                        console.log('🔔 Realtime update for global gym settings');
                        // Filter payload to only include keys we care about
                        const newGymSettings = payload.new as any;
                        const filteredGym = Object.fromEntries(
                            Object.entries(newGymSettings).filter(([key]) =>
                                GYM_WIDE_KEYS.includes(key as any)
                            )
                        );
                        setSettings(prev => ({ ...prev, ...filteredGym }));
                    }
                )
                .subscribe();

            // 4. Setup Realtime for THIS USER specifically
            if (user) {
                console.log('🔔 Subscribing to realtime updates for user:', user.id);
                const channelId = `user_settings_${user.id}`;
                supabase.removeChannel(supabase.channel(channelId)); // Cleanup previous if exists

                supabase
                    .channel(channelId)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'user_settings',
                            filter: `user_id=eq.${user.id}`
                        },
                        (payload) => {
                            console.log('🔔 Realtime update for current user:', user.id);
                            setSettings(prev => ({ ...prev, ...(payload.new as any) }));
                        }
                    )
                    .subscribe();
            }

        } catch (error) {
            console.error('Error fetching theme settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<GymSettings>) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, ...newSettings }));

        try {
            const { data: { user } } = await supabase.auth.getUser();

            // If no user, we still update the local state (session-only) but skip DB save
            if (!user) {
                console.log('💾 ThemeContext: No user for persistence, update is session-only.');
                return;
            }

            // Build gym_settings payload
            const gymPayload: any = {};
            let hasGymUpdates = false;
            GYM_WIDE_KEYS.forEach(key => {
                if (key in newSettings) {
                    gymPayload[key] = newSettings[key];
                    hasGymUpdates = true;
                }
            });

            // Build user_settings payload
            const userPayload: any = { user_id: user.id };
            let hasUserUpdates = false;
            USER_SPECIFIC_KEYS.forEach(key => {
                if (key in newSettings) {
                    userPayload[key] = newSettings[key];
                    hasUserUpdates = true;
                }
            });

            // Save gym-wide settings if any
            if (hasGymUpdates) {
                console.log('💾 SAVING GYM SETTINGS:', gymPayload);

                // Fetch the existing gym_settings row to get its ID
                const { data: existingGym, error: fetchError } = await supabase
                    .from('gym_settings')
                    .select('id')
                    .limit(1)
                    .maybeSingle();

                if (fetchError) {
                    console.error('💾 Failed to fetch gym_settings:', fetchError);
                    throw fetchError;
                }

                if (existingGym) {
                    // Update existing row
                    gymPayload.id = existingGym.id;
                    const { error: gymError } = await supabase
                        .from('gym_settings')
                        .upsert(gymPayload);

                    if (gymError) {
                        console.error('💾 GYM SETTINGS SAVE FAILED:', gymError);
                        throw gymError;
                    }
                    console.log('💾 GYM SETTINGS SAVED SUCCESSFULLY');
                } else {
                    console.error('💾 No gym_settings row found in database');
                    throw new Error('Gym settings not initialized');
                }
            }

            // Save user-specific settings if any
            if (hasUserUpdates) {
                console.log('💾 SAVING USER SETTINGS FOR:', user.id, user.email);
                console.log('💾 USER PAYLOAD:', userPayload);

                const { error: userError } = await supabase
                    .from('user_settings')
                    .upsert(userPayload);

                if (userError) {
                    console.error('💾 USER SETTINGS SAVE FAILED:', userError);
                    throw userError;
                }
                console.log('💾 USER SETTINGS SAVED SUCCESSFULLY');
            }

            toast.success('Settings saved successfully');
        } catch (error: any) {
            console.error('Error updating theme:', error);
            const msg = error.message || '';
            if (msg.includes('column') || msg.includes('does not exist')) {
                toast.error('Database sync error. Please run the provided SQL scripts in Supabase Editor.');
            } else {
                toast.error(`Update failed: ${msg || 'Unknown error'}`);
            }
            fetchSettings(); // Revert to server state on failure
        }
    };

    const resetToDefaults = async () => {
        await updateSettings(defaultSettings);
    };

    return (
        <ThemeContext.Provider value={{ settings, updateSettings, isLoading, resetToDefaults, userProfile }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

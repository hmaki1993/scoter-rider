import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
    LayoutDashboard,
    Users,
    UserCircle,
    Calendar,
    Wallet,
    Settings,
    Video,
    Menu,
    X,
    LogOut,
    Wrench,
    Building2,
    Bell,
    ChevronDown,
    MessageSquare,
    Globe,
    UserPlus,
    ExternalLink,
    ClipboardCheck,
    Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import PremiumClock from '../components/PremiumClock';
import WalkieTalkie from '../components/WalkieTalkie';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const { settings, updateSettings, userProfile } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Derived states from unified userProfile
    const userId = userProfile?.id || null; // Wait, I didn't add id to userProfile in ThemeContext. I should.
    const role = userProfile?.role || null;
    const fullName = userProfile?.full_name || null;
    const userEmail = userProfile?.email || null; // I should add email too.
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userStatus, setUserStatus] = useState<'online' | 'busy'>('online');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';

    // Real notifications state
    const [notifications, setNotifications] = useState<{
        id: string;
        title: string;
        message: string;
        created_at: string;
        type: 'student' | 'payment' | 'schedule' | 'coach' | 'check_in' | 'check_out' | 'attendance_absence' | 'pt_subscription';
        is_read: boolean;
        user_id?: string;
        related_coach_id?: string;
        related_student_id?: string;
        target_role?: string;
    }[]>([]);

    // Track processed IDs to prevent duplicate toasts/state updates
    // This persists across renders and isn't affected by fresh closures or StrictMode double-invokes
    const processedIds = useRef(new Set<string>());
    const processedToasts = useRef(new Set<string>());

    useEffect(() => {
        // Fetch initial notifications
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get role from profile to filter target_role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const userRole = profile?.role?.toLowerCase().trim();

            let query = supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .order('created_at', { ascending: false })
                .limit(20);

            const { data } = await query;
            if (data) {
                setNotifications(data);
                // Mark initial loaded IDs as processed so we don't toast them if a race condition happens
                data.forEach((n: any) => processedIds.current.add(n.id));
            }
        };

        fetchNotifications();

        // Subscribe to realtime notifications
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                async (payload) => {
                    console.log('🔔 Notification Realtime Payload:', payload);
                    const newNote = payload.new as any;

                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        console.warn('🔔 Notification Realtime: No user found');
                        return;
                    }


                    // Filter Out Self-Referential Broadcasts
                    // If this is a check-in/out message about THIS user, ignore it (they get a personal confirmation)
                    const isSelfBroadcast = newNote.related_coach_id && newNote.related_coach_id === user.id;
                    if (isSelfBroadcast && !newNote.user_id) {
                        console.log('🔔 Notification: Ignoring self-broadcast', newNote);
                        return;
                    }

                    // Only add if it's for this user OR global
                    // Note: target_role filtering happens in the render filter
                    if (!newNote.user_id || newNote.user_id === user.id) {
                        if (processedIds.current.has(newNote.id)) {
                            console.log('🔔 Notification: Already processed', newNote.id);
                            return;
                        }

                        // Show Toast for EVERY new notification insertion
                        // Check for similar toasts recently shown to prevent 2-for-1 (Broadcast + Personal)
                        const isDuplicate = Array.from(processedToasts.current).some(msg =>
                            msg === newNote.message || msg.includes(newNote.message) || newNote.message.includes(msg)
                        );

                        if (!isDuplicate) {
                            processedToasts.current.add(newNote.message);
                            // Clear from memory after 10 seconds to allow same action later
                            setTimeout(() => processedToasts.current.delete(newNote.message), 10000);

                            toast.success(`${newNote.message}`, {
                                icon: '🔔',
                                duration: 5000,
                                style: {
                                    backdropFilter: 'blur(25px)',
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.7)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    padding: '16px 24px',
                                    borderRadius: '24px'
                                }
                            });
                        }

                        setNotifications(prev => {
                            if (prev.some(n => n.id === newNote.id)) return prev;
                            const updated = [newNote, ...prev];
                            return updated.slice(0, 50); // Keep it clean
                        });
                    } else {
                        console.log('🔔 Notification: Ignore (Targeted to another user)', newNote.user_id);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    const deletedId = (payload.old as any).id;
                    if (deletedId) {
                        setNotifications(prev => prev.filter(n => n.id !== deletedId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (userProfile?.avatar_url) {
            setAvatarUrl(userProfile.avatar_url);
        } else if (userId) {
            // If avatar is missing in profile, try fetching from coaches table (linked by profile_id)
            const fetchCoachAvatar = async () => {
                const { data: coachData } = await supabase
                    .from('coaches')
                    .select('avatar_url')
                    .eq('profile_id', userId)
                    .maybeSingle();
                setAvatarUrl(coachData?.avatar_url || null);
            };
            fetchCoachAvatar();
        }
    }, [userProfile, userId]);

    useEffect(() => {
        const fetchStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserStatus(user.user_metadata?.status || 'online');
        };
        fetchStatus();

        const handleProfileUpdate = () => {
            // No need to fetch from localStorage anymore, ThemeContext handles it
        };

        // Debugging: Monitor Role
        console.log('🛡️ DashboardLayout: Render check', { role, userId, userEmail, fullName });

        if (role) console.log('Current User Role:', role);

        // Also refresh user profile on event
        window.addEventListener('gymProfileUpdated', handleProfileUpdate);
        return () => {
            window.removeEventListener('gymProfileUpdated', handleProfileUpdate);
        };
    }, []);


    useEffect(() => {
        const handleClickOutside = () => {
            setNotificationsOpen(false);
            setProfileOpen(false);
            // Don't close logo modal on outside click here, the modal backdrop will handle it
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Prevent background scrolling when mobile sidebar is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [sidebarOpen]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleStatusChange = async (status: 'online' | 'busy') => {
        const { error } = await supabase.auth.updateUser({
            data: { status }
        });
        if (!error) {
            setUserStatus(status);
        }
    };

    const allNavItems = [
        { to: '/app', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner'] },
        { to: '/app/students', icon: Users, label: t('common.students'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/app/coaches', icon: UserCircle, label: t('common.coaches'), roles: ['admin', 'head_coach'] },
        { to: '/app/schedule', icon: Calendar, label: t('common.schedule'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/app/finance', icon: Wallet, label: t('common.finance'), roles: ['admin'] },
        { to: '/app/evaluations', icon: ClipboardCheck, label: t('common.evaluations', 'Evaluations'), roles: ['admin', 'head_coach'] },
        { to: '/app/my-work', icon: UserCircle, label: t('dashboard.myWork', 'My Work'), roles: ['head_coach'] },
        { to: '/app/communications', icon: MessageSquare, label: t('common.communications', 'Communications'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner'] },
        { to: '/app/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception', 'cleaner'] },
        { to: '/app/admin/cameras', icon: Video, label: t('common.cameras'), roles: ['admin'] },
        { to: '/app/ai-training', icon: Activity, label: t('common.aiTraining', 'AI Training'), roles: ['admin', 'head_coach', 'coach'] },
    ];

    const normalizedRole = role?.toLowerCase().trim().replace(/\s+/g, '_');

    const navItems = allNavItems.filter(item => {
        if (!normalizedRole) return false; // Show nothing while loading to avoid flickering
        return item.roles.includes(normalizedRole);
    });

    // Filter notifications based on role and user_id
    const filteredNotifications = notifications.filter(note => {
        if (!normalizedRole || !userId) return false;

        // 1. User-specific override: Only the specific user sees these
        if (note.user_id) {
            const isMatch = note.user_id === userId;
            if (!isMatch) console.log('🔔 Notification Filter: user_id mismatch', { noteUser: note.user_id, currentUserId: userId });
            return isMatch;
        }

        // 🛑 STRICT PRIVACY: Head Coach never sees financial alerts
        if (normalizedRole === 'head_coach' && (note.type === 'payment' || note.type === 'pt_subscription')) {
            console.log('🔔 Notification Filter: STRICT BLOCK (Head Coach / Financial)', note.type);
            return false;
        }

        // 2. Target Role Filtering
        if (note.target_role) {
            if (normalizedRole === 'admin') return true; // Admin sees all role-targeted notes

            const target = note.target_role.toLowerCase().trim();

            // Handle consolidated roles (reception / receptionist)
            if (target === 'reception' && (normalizedRole === 'reception' || normalizedRole === 'receptionist')) {
                return true;
            }

            // Handle joint staff roles (Admin, Head Coach, Receptionist)
            if (target === 'admin_head_reception') {
                return ['admin', 'head_coach', 'reception', 'receptionist'].includes(normalizedRole);
            }

            if (target === normalizedRole) return true;

            // Special case for shared roles
            if (target === 'admin_reception' && (normalizedRole === 'admin' || normalizedRole === 'reception' || normalizedRole === 'receptionist')) {
                return true;
            }

            if (target === 'admin_head_reception' && (normalizedRole === 'admin' || normalizedRole === 'head_coach' || normalizedRole === 'reception' || normalizedRole === 'receptionist')) {
                return true;
            }

            console.log('🔔 Notification Filter: target_role mismatch', { target, normalizedRole });
            return false;
        }

        // 3. Global Notification Type Filtering (for notes without a target_role)
        if (normalizedRole === 'admin') return true; // Admin sees all global notes

        if (normalizedRole === 'head_coach') {
            const allowedTypes: string[] = ['coach', 'check_in', 'check_out', 'attendance_absence', 'student'];
            return allowedTypes.includes(note.type);
        }

        if (normalizedRole === 'coach') {
            const allowedTypes: string[] = ['student', 'schedule', 'pt_subscription', 'check_in', 'check_out', 'attendance_absence'];
            return allowedTypes.includes(note.type);
        }

        if (normalizedRole === 'reception' || normalizedRole === 'receptionist') {
            const allowedTypes: string[] = ['payment', 'student', 'check_in', 'check_out', 'attendance_absence', 'pt_subscription'];
            return allowedTypes.includes(note.type);
        }

        return true; // Fallback for general types
    });

    const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

    const handleClearAllNotifications = async () => {
        if (!filteredNotifications.length) return;

        const oldNotifications = [...notifications];

        // Optimistic update: Clear the current view entirely
        const idsToClear = filteredNotifications.map(n => n.id);
        setNotifications(prev => prev.filter(n => !idsToClear.includes(n.id)));

        try {
            console.log('🗑️ Clearing all relevant notifications for role:', normalizedRole);

            let query = supabase.from('notifications').delete();

            // Use the explicit list of IDs we want to clear.
            // This guarantees we delete exactly what the user sees, instead of guessing types/roles.
            query = query.in('id', idsToClear);

            // Safety check: ensure we only delete things targeted to us or global
            // This prevents role filters from accidentally deleting other roles' private notes
            // UPDATE: For 'Clear All', if the user sees it (in idsToClear), they should be able to delete it.
            // Especially for Admin who sees everything.
            if (normalizedRole !== 'admin') {
                query = query.or(`user_id.eq.${userId},user_id.is.null,target_role.eq.${normalizedRole}`);
            }

            const { error, count } = await query;

            if (error) throw error;
            console.log('✅ Successfully cleared notifications from DB. Count:', count);
            toast.success(t('common.notificationsCleared') || 'Notifications cleared');
        } catch (error: any) {
            console.error('Error clearing notifications:', error);
            setNotifications(oldNotifications);
            toast.error(`Failed to clear: ${error.message}`);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    return (
        <div className="min-h-screen flex bg-background font-cairo">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 w-72 transition-transform duration-300 transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-[110%]' : '-translate-x-full'}`}>
                <div className="h-full glass-card flex flex-col m-2.5 rounded-[2.25rem] overflow-hidden border border-surface-border shadow-premium relative">
                    {/* Sidebar Header - Academy Branding */}
                    <div className="pt-3 pb-1 text-center">
                        <button
                            onClick={() => setIsLogoModalOpen(true)}
                            className="relative group inline-block focus:outline-none z-10"
                        >
                            <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none"></div>
                            <img
                                src={settings.logo_url || "/logo.png"}
                                alt="Logo"
                                className="relative z-10 h-18 w-18 object-contain rounded-full shadow-2xl transition-all hover:scale-105 duration-500 mx-auto cursor-pointer mix-blend-screen"
                                style={{ clipPath: 'circle(50%)' }}
                            />
                        </button>
                    </div>

                    <div className="space-y-0 text-center px-4">
                        <h2 className="text-[12px] font-black tracking-[0.15em] uppercase text-white leading-tight">
                            {settings.academy_name}
                        </h2>
                    </div>

                    <div className="mt-1.5 w-1/4 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mx-auto"></div>

                    {/* User Profile Card - Premium Glassmorphism */}
                    <div className="px-4 mt-1.5 mb-1.5">
                        <div className="p-3 rounded-[1.75rem] bg-white/[0.02] border border-white/5 shadow-xl backdrop-blur-md relative overflow-hidden group/profile sidebar-3d-item">
                            <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 blur-xl rounded-full -mr-6 -mt-6 group-hover/profile:bg-primary/10 transition-all duration-700"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="relative flex-shrink-0">
                                    <button
                                        onClick={() => setIsAvatarModalOpen(true)}
                                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent p-[1px] shadow-xl hover:scale-105 transition-all duration-500 group/avatar relative"
                                    >
                                        <div className="w-full h-full rounded-xl bg-[#0E1D21] flex items-center justify-center overflow-hidden relative z-10 border border-white/5 text-[11px] font-black text-white">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (fullName || role || 'E')[0]}
                                        </div>
                                    </button>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={`text-[7px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${userStatus === 'online' ? 'text-emerald-400' : userStatus === 'away' ? 'text-orange-400' : 'text-white/20'}`}>
                                        {userStatus || 'offline'}
                                    </p>
                                    <h3 className="font-extrabold text-white tracking-tight text-[11px] truncate leading-tight">
                                        {fullName || t('common.adminRole')}
                                    </h3>
                                    <p className="text-[8px] text-primary/70 font-black uppercase tracking-widest mt-0.5">{t(`roles.${role || 'admin'}`)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 px-3 space-y-1 py-1 overflow-hidden scroll-smooth" style={{ perspective: '800px' }}>
                        <div className="text-[7px] font-black text-white/20 uppercase tracking-[0.4em] px-4 mb-2">Navigation</div>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center px-4 py-2 text-[12px] font-black rounded-xl transition-all duration-500 group relative sidebar-3d-item ${isActive
                                        ? 'bg-gradient-to-r from-primary via-primary/90 to-accent text-white shadow-lg sidebar-3d-item-active'
                                        : 'text-white/40 hover:bg-white/[0.04] hover:text-white hover:translate-x-1 border border-transparent hover:border-white/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-current'} transition-transform group-hover:scale-110 group-hover:rotate-3 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                                    <span className="relative z-10 uppercase tracking-widest leading-none mt-0.5">{t(item.label)}</span>
                                    {isActive && (
                                        <div className="absolute inset-y-1.5 right-1.5 w-1 bg-white/30 rounded-full blur-[2px] animate-pulse" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>


                    {/* Sidebar Footer - Actions Tray */}
                    <div className="p-1.5 mx-3 mb-2 rounded-[1.75rem] bg-black/40 border border-white/5 flex items-center gap-1.5 flex-shrink-0 relative overflow-hidden sidebar-3d-item">
                        <button
                            onClick={() => {
                                const newLang = i18n.language === 'en' ? 'ar' : 'en';
                                i18n.changeLanguage(newLang);
                                document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
                                updateSettings({ language: newLang });
                            }}
                            className="w-9 h-9 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 flex-shrink-0 group relative z-10"
                        >
                            <Globe className="w-4 h-4 transition-transform group-hover:rotate-[360deg] duration-1000" />
                        </button>

                        <div className="h-5 w-px bg-white/5"></div>

                        <button
                            onClick={handleLogout}
                            className="flex-1 h-9 flex items-center justify-center px-2 text-[10px] font-black text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-500 group border border-transparent hover:border-rose-500/10 uppercase tracking-[0.2em] whitespace-nowrap relative z-10"
                        >
                            <LogOut className={`w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                            <span>{t('common.logout')}</span>
                        </button>
                    </div>
                </div>
                <div className="px-8 pb-3 text-center">
                    <span className="text-[6px] font-black text-[#D4AF37]/30 uppercase tracking-[0.5em] block cursor-default">
                        {settings.academy_name} Ecosystem • {new Date().getFullYear()}
                    </span>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-500 ${isRtl ? 'lg:mr-72' : 'lg:ml-72'}`}>
                {/* Header - Branding */}
                {!location.pathname.includes('/communications') && (
                    <header className="relative h-16 flex items-center justify-between px-6 bg-background/50 backdrop-blur-3xl sticky top-0 z-30 w-full border-b border-surface-border">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden w-10 h-10 flex items-center justify-center text-white/70 bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-95 border border-white/5 shadow-sm hover:shadow-premium"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-6">
                            {/* Quick Action Hub */}
                            <div className="flex items-center gap-1.5 sm:gap-4 md:p-2 md:bg-text-base/5 md:border md:border-surface-border md:rounded-[2rem] md:shadow-inner md:backdrop-blur-md">
                                {settings.clock_position === 'header' && (
                                    <div className="hidden md:flex items-center gap-3">
                                        <PremiumClock className="!bg-transparent !border-none !shadow-none !px-2" />
                                        {role === 'admin' && <div className="h-6 w-px bg-white/10 mx-1"></div>}
                                        <div className="flex flex-col items-center px-1">
                                            <span className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40" style={{ color: 'var(--color-brand-label)' }}>System</span>
                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                                        </div>
                                    </div>
                                )}

                                {role === 'admin' && (
                                    <a
                                        href="/registration"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative group/reg flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/40 transition-all duration-500 shadow-lg shadow-emerald-500/5 hover:bg-emerald-500/10 active:scale-95"
                                        title={t('common.registrationPage')}
                                    >
                                        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl opacity-0 group-hover/reg:opacity-100 transition-opacity duration-700"></div>
                                        <UserPlus className="w-5 h-5 text-emerald-400 group-hover/reg:scale-110 transition-transform duration-500 relative z-10" />
                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0E1D21] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse z-20"></span>
                                    </a>
                                )}

                                <div className="hidden md:block h-8 w-px bg-surface-border mx-2"></div>

                                <div className="relative" style={{ perspective: '1000px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative sidebar-3d-item ${notificationsOpen ? 'bg-primary/20 text-primary shadow-[inset_0_0_15px_rgba(var(--primary-rgb),0.3)] border border-primary/20 sidebar-3d-item-active' : 'text-white/70 bg-white/5 hover:bg-white/10 border border-white/5 shadow-sm hover:shadow-premium'}`}
                                    >
                                        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border-2 border-background">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {userId && <WalkieTalkie role={normalizedRole || 'coach'} userId={userId || ''} />}
                            </div>

                            <div className="relative" style={{ perspective: '1000px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
                                    className={`flex items-center justify-center sm:justify-start gap-0 sm:gap-3 p-0 sm:pl-4 sm:pr-2 sm:py-2 rounded-full transition-all group w-10 h-10 sm:w-auto sm:h-auto sidebar-3d-item ${profileOpen ? 'bg-white/10 shadow-inner ring-1 ring-white/20 sidebar-3d-item-active' : 'bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/5 shadow-sm hover:shadow-premium'}`}
                                >
                                    <div className="hidden sm:flex flex-col items-end leading-none gap-1 mr-1">
                                        <p className="text-[13px] font-black text-white tracking-tight">
                                            {fullName || 'Elite User'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`w-2 h-2 rounded-full ${userStatus === 'online' ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse shadow-[0_0_10px_currentColor]`}></span>
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{role ? t(`roles.${role}`) : t('common.adminRole')}</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAvatarModalOpen(true);
                                            }}
                                            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent p-[1px] group-hover:scale-110 transition-transform duration-500 relative cursor-pointer"
                                        >
                                            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden border border-white/5">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-white font-black text-xs">
                                                        {(fullName || role)?.[0]?.toUpperCase() || 'A'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#122E34] border-2 border-white/10 flex items-center justify-center p-0.5 shadow-lg group-hover:bg-primary transition-colors duration-500">
                                            <ChevronDown className={`w-full h-full text-white/60 transition-all duration-500 ${profileOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <main className={`flex-1 ${location.pathname.includes('/communications') ? 'p-0 overflow-hidden' : 'p-4 sm:p-6'}`}>
                    <Outlet context={{ role, fullName, userId }} />

                </main>
            </div >

            {/* Avatar Lightbox Modal */}
            {
                isAvatarModalOpen && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-500"
                        onClick={() => setIsAvatarModalOpen(false)}
                    >
                        <div className="relative max-w-2xl max-h-[80vh] w-full flex items-center justify-center px-4">
                            <div className="relative group/lightbox">
                                {/* Premium Glow around image */}
                                <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-[3rem] blur-3xl opacity-50 group-hover/lightbox:opacity-100 transition-opacity duration-1000"></div>

                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Profile"
                                        className="relative z-10 max-w-full max-h-[70vh] object-contain rounded-[3rem] shadow-2xl border-2 border-white/20 animate-in zoom-in-95 duration-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <div className="relative z-10 w-64 h-64 bg-background rounded-[3rem] border-2 border-white/20 flex items-center justify-center shadow-2xl animate-in zoom-in-95 duration-500">
                                        <span className="text-white font-black text-8xl uppercase">
                                            {(fullName || role)?.[0] || 'A'}
                                        </span>
                                    </div>
                                )}

                                {/* Info card in lightbox */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 bg-white/10 backdrop-blur-3xl border border-white/20 px-8 py-4 rounded-[2rem] shadow-2xl text-center min-w-[240px] animate-in slide-in-from-bottom-4 duration-700 delay-200">
                                    <h3 className="text-white font-black text-xl tracking-tight leading-none mb-1">{fullName}</h3>
                                    <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em]">{t(`roles.${role}`)}</p>
                                </div>

                                <button
                                    onClick={() => setIsAvatarModalOpen(false)}
                                    className="absolute -top-12 right-0 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-sm border border-white/10 scale-90 hover:scale-100 active:scale-95 duration-300"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Logo Lightbox Modal */}
            {
                isLogoModalOpen && (
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
                        onClick={() => setIsLogoModalOpen(false)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                            <img
                                src={settings.logo_url || "/logo.png"}
                                alt="Academy Logo"
                                className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <button
                                onClick={() => setIsLogoModalOpen(false)}
                                className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )
            }
            {/* UI Portals - Move outside of transform containers for fixed positioning stability */}
            {
                notificationsOpen && (
                    <div
                        className="fixed top-16 right-4 sm:right-6 md:right-10 w-[92vw] sm:w-[480px] md:w-96 bg-[#0E1D21]/95 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 flex flex-col max-h-[85vh] sidebar-3d-item"
                        style={{ transform: 'translateZ(100px)' }}
                    >
                        <div className="p-6 md:p-10 border-b border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent flex-shrink-0">
                            <h3 className="font-black text-white uppercase tracking-tighter text-xl md:text-2xl flex items-center gap-3">
                                <div className="w-2 h-8 bg-primary rounded-full blur-[2px] animate-pulse"></div>
                                {t('common.notifications') || t('common.recentActivity')}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                            {filteredNotifications.length === 0 ? (
                                <div className="p-10 md:p-12 text-center text-white/10 font-black uppercase tracking-[0.3em] text-[10px]">
                                    {t('common.noNotifications')}
                                </div>
                            ) : (
                                filteredNotifications.map(note => {
                                    let Icon = Bell;
                                    let color = 'text-white';

                                    if (note.type === 'student') { Icon = Users; color = 'text-primary'; }
                                    else if (note.type === 'payment') { Icon = Wallet; color = 'text-emerald-400'; }
                                    else if (note.type === 'schedule') { Icon = Calendar; color = 'text-accent'; }
                                    else if (note.type === 'coach') { Icon = UserCircle; color = 'text-purple-400'; }
                                    else if (note.type === 'check_in') { Icon = Calendar; color = 'text-green-400'; }
                                    else if (note.type === 'check_out') { Icon = Calendar; color = 'text-rose-500'; }
                                    else if (note.type === 'attendance_absence') { Icon = Calendar; color = 'text-red-400'; }
                                    else if (note.type === 'pt_subscription') { Icon = Wallet; color = 'text-amber-400'; }

                                    const timeAgo = (dateStr: string) => {
                                        const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000 / 60;
                                        if (diff < 60) return `${Math.floor(diff)}${t('common.minutesAgoShort')}`;
                                        if (diff < 1440) return `${Math.floor(diff / 60)}${t('common.hoursAgoShort')}`;
                                        return `${Math.floor(diff / 1440)}${t('common.daysAgoShort')}`;
                                    };

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => handleMarkAsRead(note.id)}
                                            className={`p-6 border-b border-white/[0.05] hover:bg-white/[0.08] transition-all group cursor-pointer relative ${!note.is_read ? 'bg-primary/5' : ''}`}
                                        >
                                            {!note.is_read && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.6)]"></div>
                                            )}
                                            <div className="flex gap-5">
                                                <div className={`w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 shadow-inner ${color} group-hover:scale-110 transition-transform duration-500 border border-white/5`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <h4 className={`font-black tracking-tight text-[13px] ${!note.is_read ? 'text-white' : 'text-white/60'}`}>{note.title}</h4>
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full">{timeAgo(note.created_at)}</span>
                                                    </div>
                                                    <p className={`text-xs leading-relaxed line-clamp-2 font-medium transition-colors ${!note.is_read ? 'text-white/80' : 'text-white/40'}`}>
                                                        {note.message}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-5 bg-white/[0.03] border-t border-white/10 flex-shrink-0">
                            {filteredNotifications.length > 0 && (
                                <button
                                    onClick={handleClearAllNotifications}
                                    className="w-full py-4 rounded-[2rem] bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-red-500/10 group/btn"
                                >
                                    <span className="group-hover:scale-105 transition-transform inline-block">{t('common.notificationsClearAll')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                )
            }

            {
                profileOpen && (
                    <div
                        className="fixed top-16 right-4 sm:right-6 md:right-10 w-[92vw] sm:w-80 bg-[#122E34]/95 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3rem] border border-white/30 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden z-[100] animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 sidebar-3d-item max-h-[85vh] overflow-y-auto"
                        style={{ transform: 'translateZ(110px)' }}
                    >
                        <div className="p-6 md:p-8 space-y-3 md:space-y-4 border-b border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent">
                            <p className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.4em] ml-2">{t('common.setStatus')}</p>
                            <div className="grid grid-cols-2 gap-2 md:gap-3">
                                <button
                                    onClick={() => handleStatusChange('online')}
                                    className={`flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${userStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10 scale-105' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
                                >
                                    <span className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${userStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                                    {t('common.onlineLabel')}
                                </button>
                                <button
                                    onClick={() => handleStatusChange('busy')}
                                    className={`flex items-center justify-center gap-2 md:gap-3 py-3 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${userStatus === 'busy' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10 scale-105' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
                                >
                                    <span className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full ${userStatus === 'busy' ? 'bg-orange-400 animate-pulse' : 'bg-white/20'}`}></span>
                                    {t('common.busyLabel')}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 md:p-5 space-y-1.5 md:space-y-2">
                            <button
                                onClick={() => { navigate('/app/settings'); setProfileOpen(false); }}
                                className="flex items-center w-full px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-white/50 hover:text-white hover:bg-white/10 rounded-xl md:rounded-2xl transition-all group/item uppercase tracking-[0.15em] md:tracking-[0.2em] gap-4 md:gap-5 border border-transparent hover:border-white/10"
                            >
                                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl bg-white/5 group-hover/item:bg-primary/20 group-hover/item:text-primary transition-all border border-white/5 group-hover/item:border-primary/30 shadow-lg">
                                    <Settings className="w-4 h-4 md:w-5 md:h-5 group-hover/item:rotate-90 transition-transform duration-700" />
                                </div>
                                {t('common.settings')}
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] font-black text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl md:rounded-2xl transition-all group/logout uppercase tracking-[0.15em] md:tracking-[0.2em] gap-4 md:gap-5 border border-transparent hover:border-rose-500/20"
                            >
                                <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl bg-rose-500/10 group-hover/logout:bg-rose-500/20 transition-all border border-rose-500/10 group-hover/logout:border-rose-500/30 text-rose-500 shadow-lg shadow-rose-500/5">
                                    <LogOut className="w-4 h-4 md:w-5 md:h-5 group-hover/logout:-translate-x-1 transition-transform" />
                                </div>
                                {t('common.logout')}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Users, Wallet, RotateCcw, Trash2, TrendingUp, ChevronRight, Globe, CheckCircle, XCircle, Clock, Calendar, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import GroupsList from '../components/GroupsList';
import ConfirmModal from '../components/ConfirmModal';
import GroupFormModal from '../components/GroupFormModal';
import PremiumCalendarModal from '../components/PremiumCalendarModal';
import PageHeader from '../components/PageHeader';

export default function PersonalDashboard() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const { role } = useOutletContext<{ role: string }>();

    if (role === 'admin') {
        return <Navigate to="/" replace />;
    }
    const [coachId, setCoachId] = useState<string | null>(null);
    const [salary, setSalary] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0); // From PT

    // PT & Groups State
    const [savedSessions, setSavedSessions] = useState<any[]>([]);
    const [ptSubscriptions, setPtSubscriptions] = useState<any[]>([]);
    const [ptRate, setPtRate] = useState(0);

    // Action State
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [subToClear, setSubToClear] = useState<string | null>(null);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [subToReset, setSubToReset] = useState<any>(null);

    // Groups State
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);

    // Premium History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedSub, setSelectedSub] = useState<any>(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        initializePersonalDashboard();
    }, []);

    const initializePersonalDashboard = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Identify User (Coach or Staff)
            // Check Coaches
            const { data: coachData } = await supabase
                .from('coaches')
                .select('id, salary, pt_rate')
                .eq('profile_id', user.id)
                .maybeSingle();

            if (coachData) {
                setCoachId(coachData.id);
                setSalary(Number(coachData.salary) || 0);
                setPtRate(Number(coachData.pt_rate) || 0);

                // Fetch PT Data if applicable
                if (role !== 'reception') {
                    await Promise.all([
                        fetchPersonalPTData(coachData.id, Number(coachData.pt_rate) || 0),
                        fetchPersonalHistory(coachData.id)
                    ]);
                }
            } else {
                // Check Staff (Reception case)
                const { data: staffData } = await supabase
                    .from('staff')
                    .select('id, salary')
                    .eq('profile_id', user.id)
                    .maybeSingle();

                if (staffData) {
                    setSalary(Number(staffData.salary) || 0);
                }
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPersonalPTData = async (id: string, rate: number) => {
        try {
            const startOfMonth = format(new Date(), 'yyyy-MM-01');

            // 1. Calculate PT Earnings
            const { data: sessionsData } = await supabase
                .from('pt_sessions')
                .select('sessions_count')
                .eq('coach_id', id)
                .gte('date', startOfMonth);

            const totalSessions = sessionsData?.reduce((sum, s) => sum + (s.sessions_count || 1), 0) || 0;
            setTotalEarnings(totalSessions * rate);

            // 2. Get Subscriptions
            const { data } = await supabase
                .from('pt_subscriptions')
                .select('*, students(id, full_name), coaches(full_name)')
                .eq('coach_id', id)
                .order('status', { ascending: true });

            if (data) setPtSubscriptions(data);

        } catch (error) {
            console.error('Error fetching PT data:', error);
        }
    };

    const fetchPersonalHistory = async (id: string) => {
        const { data } = await supabase
            .from('pt_sessions')
            .select('*')
            .eq('coach_id', id)
            .order('created_at', { ascending: false })
            .limit(100);
        setSavedSessions(data || []);
    };

    // --- Actions (Duplicated from HeadCoachDashboard logic) ---
    const handleRecordSession = async (sub: any) => {
        if (!coachId || recordingId) return;
        if (sub.sessions_remaining <= 0) return toast.error('No sessions remaining');

        setRecordingId(sub.id);
        const loadingToast = toast.loading('Recording session...');
        try {
            const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
            const displayName = studentData?.full_name || sub.student_name;
            const now = new Date();

            // 1. Insert Session
            const { error: sessionError } = await supabase.from('pt_sessions').insert({
                coach_id: coachId,
                subscription_id: sub.id,
                student_name: displayName,
                date: format(now, 'yyyy-MM-dd'),
                sessions_count: 1
            });
            if (sessionError) throw sessionError;

            // 2. Decrement
            const { error: updateError } = await supabase.from('pt_subscriptions')
                .update({
                    sessions_remaining: sub.sessions_remaining - 1,
                    status: sub.sessions_remaining - 1 === 0 ? 'expired' : 'active'
                })
                .eq('id', sub.id);
            if (updateError) throw updateError;

            toast.success('Session Recorded!', { id: loadingToast });
            fetchPersonalPTData(coachId, ptRate);
            fetchPersonalHistory(coachId);
        } catch (error) {
            console.error('Record failed:', error);
            toast.error('Failed to record session', { id: loadingToast });
        } finally {
            setRecordingId(null);
        }
    };

    const handleResetSession = async (sub: any) => {
        setSubToReset(sub);
        setShowResetModal(true);
    };

    const confirmResetSession = async () => {
        if (!coachId || recordingId || !subToReset) return;
        const sub = subToReset;

        // Find the most recent session for THIS specific subscription in the last 24h
        const recentSession = savedSessions.find(s =>
            s.subscription_id === sub.id &&
            (new Date().getTime() - new Date(s.created_at).getTime()) < (24 * 60 * 60 * 1000)
        );

        if (!recentSession) {
            return toast.error('No recent record found to reset');
        }

        setRecordingId(sub.id);
        const loadingToast = toast.loading('Resetting record...');
        try {
            // 1. Delete the specific session
            const { error: deleteError } = await supabase
                .from('pt_sessions')
                .delete()
                .eq('id', recentSession.id);

            if (deleteError) throw deleteError;

            // 2. Refund the session and set status back to active
            const newRemaining = sub.sessions_remaining + 1;
            const { error: subError } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_remaining: newRemaining,
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);

            if (subError) throw subError;

            // 3. Refresh data
            await Promise.all([
                fetchPersonalPTData(coachId, ptRate),
                fetchPersonalHistory(coachId)
            ]);
            toast.success('Session reset successfully', { id: loadingToast });
        } catch (error) {
            console.error('Reset failed:', error);
            toast.error('Reset failed', { id: loadingToast });
        } finally {
            setRecordingId(null);
            setShowResetModal(false);
            setSubToReset(null);
        }
    };

    const handleClearSessions = async () => {
        if (!subToClear) return;
        try {
            await supabase.from('pt_subscriptions')
                .update({ sessions_remaining: 0, status: 'expired' })
                .eq('id', subToClear);
            toast.success('Sessions Cleared');
            setShowClearModal(false);
            setSubToClear(null);
            if (coachId) fetchPersonalPTData(coachId, ptRate);
        } catch (error) {
            toast.error('Error clearing sessions');
        }
    };

    const handleClearHistory = async () => {
        if (!coachId) return;
        try {
            await supabase.from('pt_sessions').delete().eq('coach_id', coachId);
            toast.success('History Log Cleared');
            setShowClearHistoryModal(false);
            fetchPersonalHistory(coachId);
        } catch (error) {
            toast.error('Error clearing history');
        }
    };


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title={t('dashboard.personalTitle', 'My Activity')}
                subtitle={t('dashboard.personalSubtitle', 'Personal Workspace & Financial Status')}
            >
                <div className="flex items-center gap-3 px-6 py-3 bg-black/20 border border-white/5 rounded-full shadow-inner backdrop-blur-xl shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{format(new Date(), 'dd MMMM yyyy')}</span>
                </div>
            </PageHeader>

            {/* Earnings Widget (Common for Everyone) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mb-12">
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group bg-white/[0.02]">
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl transition-all duration-700"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Financial Status</h2>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-2">Personal Earnings</p>
                        </div>
                        <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center py-4 relative z-10">
                        {isLoading ? (
                            <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                        ) : (
                            <>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-6xl font-black text-amber-500 tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">{(salary + totalEarnings).toLocaleString()}</h3>
                                    <span className="text-xs font-black text-white/20 uppercase tracking-[0.3em]">{currency.code}</span>
                                </div>
                                {role !== 'reception' && (
                                    <div className="flex gap-8 mt-8 p-4 px-8 bg-black/20 rounded-[1.5rem] border border-white/5">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5 italic">Base Salary</p>
                                            <p className="text-sm font-black text-white/80 tracking-tight">{salary.toLocaleString()} <span className="text-[9px] opacity-40">{currency.code}</span></p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10"></div>
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5 italic">PT Earnings</p>
                                            <p className="text-sm font-black text-accent tracking-tight">{totalEarnings.toLocaleString()} <span className="text-[9px] opacity-40">{currency.code}</span></p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Coach Specific Sections (Groups & PT) */}
            {isLoading ? (
                <div className="py-20 flex justify-center">
                    <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
            ) : role !== 'reception' && !coachId ? (
                <div className="glass-card p-12 rounded-[2.5rem] border border-white/10 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/20">
                        <Users className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">No Coach Profile Found</h3>
                    <p className="text-white/40 font-bold">Please contact the administrator to link your account to a coach profile.</p>
                </div>
            ) : null}
            {role !== 'reception' && coachId && (
                <>
                    {/* My Groups Section */}
                    <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-premium">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-3">
                            <div className="p-2.5 bg-accent/20 rounded-xl text-accent"><Users className="w-5 h-5" /></div>
                            {t('dashboard.myGroups', 'My Groups')}
                        </h2>
                        <GroupsList
                            coachId={coachId}
                            onEdit={(role === 'admin' || role === 'head_coach') ? (group) => {
                                setEditingGroup(group);
                                setShowGroupForm(true);
                            } : undefined}
                        />
                    </div>

                    {/* My PT Students Section */}
                    <div className="glass-card p-6 sm:p-7 rounded-[2.5rem] border border-white/10 shadow-premium relative bg-gradient-to-br from-white/[0.02] to-transparent">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-5 flex items-center gap-2.5">
                            <div className="p-2 bg-gradient-to-br from-accent to-primary rounded-xl text-white shadow-lg"><Users className="w-4 h-4" /></div>
                            My PT Students
                        </h2>

                        {ptSubscriptions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {ptSubscriptions.map((subscription) => (
                                    <div
                                        key={subscription.id}
                                        onClick={() => {
                                            setSelectedSub(subscription);
                                            setShowHistoryModal(true);
                                        }}
                                        className="glass-card p-4.5 rounded-[1.8rem] border border-white/10 hover:border-accent/40 transition-all duration-700 group hover:scale-[1.01] relative overflow-hidden flex flex-col h-full bg-[#0a0c10]/40 cursor-pointer"
                                    >
                                        {/* Premium Card Hover Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2rem]"></div>
                                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                        <div className="relative z-10 flex flex-col h-full">
                                            {/* Student Info & Actions */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="absolute -inset-1 bg-gradient-to-br from-accent to-primary rounded-xl blur opacity-20 group-hover:opacity-50 transition-opacity"></div>
                                                        <div className="relative w-10 h-10 rounded-xl bg-[#0a0c10] border border-white/10 flex items-center justify-center text-white font-black text-lg shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                            {(subscription.students?.full_name || subscription.student_name || 'S')?.[0]}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-black text-white text-base tracking-tight group-hover:text-accent transition-colors leading-tight whitespace-nowrap overflow-hidden pr-4" style={{ maskImage: 'linear-gradient(to right, black calc(100% - 30px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 30px), transparent 100%)' }}>
                                                                {subscription.students?.full_name || subscription.student_name || 'Unknown'}
                                                            </h3>
                                                            {subscription.student_phone && (
                                                                <a
                                                                    href={`tel:${subscription.student_phone}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="p-1 px-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-accent transition-all flex items-center justify-center shrink-0"
                                                                    title={subscription.student_phone}
                                                                >
                                                                    <Phone className="w-3 h-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em] mt-0.5 flex items-center gap-1.5">
                                                            <span className="w-1 h-1 rounded-full bg-accent/50"></span>
                                                            PT Student
                                                        </p>
                                                    </div>
                                                </div>

                                                {(() => {
                                                    const recentSession = savedSessions.find(s => {
                                                        const isMatch = s.subscription_id === subscription.id;
                                                        const sDate = new Date(s.created_at);
                                                        const hoursAgo = (new Date().getTime() - sDate.getTime()) / (1000 * 60 * 60);
                                                        return isMatch && hoursAgo < 24;
                                                    });
                                                    const isRecentlyRecorded = !!recentSession;
                                                    const isLoading = recordingId === subscription.id;

                                                    return (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => isRecentlyRecorded ? handleResetSession(subscription) : handleRecordSession(subscription)}
                                                                disabled={isLoading || (subscription.sessions_remaining <= 0 && !isRecentlyRecorded)}
                                                                className={`p-1.5 rounded-lg transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/record relative border
                                                                    ${isRecentlyRecorded
                                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20 shadow-emerald-500/10'
                                                                        : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary hover:text-white shadow-primary/10'}`}
                                                                title={isRecentlyRecorded ? "Reset Session" : "Record Session"}
                                                            >
                                                                {isLoading ? (
                                                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                ) : isRecentlyRecorded ? (
                                                                    <RotateCcw className="w-3 h-3 transition-transform group-hover/record:rotate-[-45deg]" />
                                                                ) : (
                                                                    <CheckCircle className="w-3 h-3 transition-transform group-hover/record:scale-110" />
                                                                )}
                                                                {isRecentlyRecorded && (
                                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0a0c10] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                                )}
                                                            </button>
                                                            {!isRecentlyRecorded && subscription.sessions_remaining > 0 && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSubToClear(subscription.id);
                                                                        setShowClearModal(true);
                                                                    }}
                                                                    className="p-1.5 rounded-lg bg-white/5 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 border border-white/5 transition-all"
                                                                    title="Clear All Sessions"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Progress Section */}
                                            <div className="flex-1 space-y-4">
                                                {/* Data Boxes - Vertical stack for narrow cards */}
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                            <TrendingUp className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[7.5px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">{t('pt.sessionsRemaining')}</p>
                                                            <p className="text-lg font-black text-accent leading-none">{subscription.sessions_remaining}</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                                                            <div className="text-[8px] font-bold">{currency.symbol}</div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[7.5px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Rate</p>
                                                            <p className="text-base font-black text-white leading-none">{ptRate}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-1.5 p-3 bg-gradient-to-br from-white/5 to-transparent rounded-[1.2rem] border border-white/5">
                                                    <div className="flex items-center justify-between px-0.5">
                                                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">{t('pt.progress')}</span>
                                                        <span className="text-[8px] font-black text-accent px-1.5 py-0.5 bg-accent/10 rounded-lg">
                                                            {subscription.sessions_remaining}/{subscription.sessions_total}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-[#0a0c10] rounded-full overflow-hidden border border-white/5 p-0.5">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-1000 rounded-full"
                                                            style={{ width: `${(subscription.sessions_remaining / subscription.sessions_total) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer: Expiry & Status */}
                                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
                                                    <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] whitespace-nowrap">{t('students.expiry')}:</p>
                                                    <p className="text-[9px] font-bold text-white/80 whitespace-nowrap">{format(new Date(subscription.expiry_date), 'dd MMM yy')}</p>
                                                </div>

                                                {(() => {
                                                    const isExpired = new Date(subscription.expiry_date) < new Date() || subscription.status === 'expired' || subscription.sessions_remaining <= 0;
                                                    return isExpired ? (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-lg shrink-0">
                                                            <div className="w-1 h-1 rounded-full bg-rose-500 animate-ping"></div>
                                                            <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest leading-none">{t('pt.expired')}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-lg shrink-0">
                                                            <div className="w-1 h-1 rounded-full bg-accent animate-pulse"></div>
                                                            <span className="text-[7px] font-black text-accent uppercase tracking-widest leading-none">{t('pt.active')}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/20"><Users className="w-12 h-12" /></div>
                                <p className="text-white/40 font-black uppercase tracking-widest text-sm">No PT Students Yet</p>
                            </div>
                        )}
                    </div>

                    {/* History Log */}
                    <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-premium">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-500"><RotateCcw className="w-5 h-5" /></div>
                                Session History
                            </h2>
                            {savedSessions.length > 0 && (
                                <button
                                    onClick={() => setShowClearHistoryModal(true)}
                                    className="px-4 py-2 bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-white/40 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-white/5 hover:border-rose-500/20"
                                >
                                    Clear Log
                                </button>
                            )}
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {savedSessions.map((session) => (
                                <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-xs">
                                            PT
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white uppercase text-sm">{session.student_name}</h4>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                                {format(new Date(session.created_at), 'MMM dd, yyyy • hh:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResetSession(session)}
                                        className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-colors"
                                        title="Refund Session"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {savedSessions.length === 0 && (
                                <div className="text-center py-8 text-white/20 font-bold uppercase tracking-widest text-xs">
                                    No history records found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modals */}
            <ConfirmModal
                isOpen={showClearModal}
                onClose={() => setShowClearModal(false)}
                onConfirm={handleClearSessions}
                title="Clear All Sessions"
                message="Are you sure you want to clear all remaining sessions for this student? This cannot be undone."
            />
            <ConfirmModal
                isOpen={showClearHistoryModal}
                onClose={() => setShowClearHistoryModal(false)}
                onConfirm={handleClearHistory}
                title="Clear History Log"
                message="Are you sure you want to delete your entire session history? This strictly removes the log entries, not the actual subscription usage. This action cannot be undone."
            />
            <ConfirmModal
                isOpen={showResetModal}
                onClose={() => { setShowResetModal(false); setSubToReset(null); }}
                onConfirm={confirmResetSession}
                title="Refund Session"
                message={`Are you sure you want to refund the most recent session for ${subToReset?.students?.full_name || subToReset?.student_name || 'this student'}?`}
            />
            {showGroupForm && (
                <GroupFormModal
                    onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
                    initialData={editingGroup}
                    onSuccess={() => {
                        setShowGroupForm(false);
                        setEditingGroup(null);
                        // Refresh logic if GroupsList doesn't auto-refresh (it uses realtime subs usually)
                    }}
                />
            )}

            {showHistoryModal && selectedSub && (
                <PremiumCalendarModal
                    subscriptionId={selectedSub.id}
                    studentName={selectedSub.students?.full_name || selectedSub.student_name || 'Student'}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setSelectedSub(null);
                    }}
                />
            )}
        </div>
    );
}

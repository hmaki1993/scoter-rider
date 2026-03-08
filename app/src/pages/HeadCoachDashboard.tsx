import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, User, Plus, Users, Wallet, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import GroupsList from '../components/GroupsList';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupFormModal from '../components/GroupFormModal'; // Need this to create groups
import AddStudentForm from '../components/AddStudentForm'; // Need this to add students
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from '../components/ConfirmModal';
import { RotateCcw, Trash2, TrendingUp, ChevronRight, Globe, Activity, ArrowUpRight } from 'lucide-react';
import FinancialProgressChart from '../components/FinancialProgressChart';
import PerformanceAnalyticsCard from '../components/PerformanceAnalyticsCard';
import { useFinancialTrends } from '../hooks/useData';
import PageHeader from '../components/PageHeader';

export default function HeadCoachDashboard() {
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    const { currency } = useCurrency();
    const { role, fullName } = useOutletContext<{ role: string, fullName: string }>() || { role: null, fullName: null };
    const navigate = useNavigate();

    // Check-in State
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime] = useState(new Date());
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [coachId, setCoachId] = useState<string | null>(null);
    const [savedSessions, setSavedSessions] = useState<any[]>([]);
    const { data: financialTrends } = useFinancialTrends();

    // Modals
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);


    // setInterval removed as PremiumClock handles it.
    // currentTime is kept static for the date display.

    useEffect(() => {
        let interval: any;
        if (isCheckedIn) {
            interval = setInterval(() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const startTime = localStorage.getItem(`checkInStart_${today}`);
                if (startTime) {
                    const params = JSON.parse(startTime);
                    const now = new Date().getTime();
                    setElapsedTime(Math.floor((now - params.timestamp) / 1000));
                }
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isCheckedIn]);

    useEffect(() => {
        const initializeDashboard = async () => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Fetch Coach Data
                    const { data: coachData } = await supabase
                        .from('coaches')
                        .select('id, pt_rate, salary')
                        .eq('profile_id', user.id)
                        .single();

                    if (coachData) {
                        setCoachId(coachData.id);

                        // Sync Attendance: Priority to OPEN sessions
                        let { data: attendance } = await supabase
                            .from('coach_attendance')
                            .select('*')
                            .eq('coach_id', coachData.id)
                            .is('check_out_time', null)
                            .maybeSingle();

                        if (!attendance) {
                            // If no active session, get latest closed record
                            const { data: latest } = await supabase
                                .from('coach_attendance')
                                .select('*')
                                .eq('coach_id', coachData.id)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            attendance = latest;
                        }

                        if (attendance) {
                            const start = new Date(attendance.check_in_time);

                            // Scenario A: Still checked in (no check_out_time) - Restore active session
                            if (!attendance.check_out_time) {
                                setIsCheckedIn(true);
                                setCheckInTime(format(start, 'HH:mm:ss'));
                                setElapsedTime(Math.floor((new Date().getTime() - start.getTime()) / 1000));

                                // Ensure local storage is in sync for the timer
                                localStorage.setItem(`checkInStart_${format(new Date(), 'yyyy-MM-dd')}`, JSON.stringify({
                                    timestamp: start.getTime(),
                                    recordId: attendance.id
                                }));
                            }
                            // Scenario B: Checked out TODAY - Show daily summary
                            else if (attendance.date === todayStr) {
                                setIsCheckedIn(false);
                                const end = new Date(attendance.check_out_time);
                                setDailyTotalSeconds(Math.floor((end.getTime() - start.getTime()) / 1000));
                            }
                            // Scenario C: Checked out on a previous day - Reset (default state)
                            else {
                                setIsCheckedIn(false);
                                setDailyTotalSeconds(0);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Initialization failed:', err);
            }
        };

        initializeDashboard();
    }, []);

    const handleCheckIn = async () => {
        if (!coachId) return toast.error(t('common.error'));
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        try {
            const { data, error } = await supabase
                .from('coach_attendance')
                .upsert({
                    coach_id: coachId,
                    date: todayStr,
                    check_in_time: now.toISOString(),
                    check_out_time: null, // Clear check-out time if re-checking in same day
                    status: 'present'
                }, { onConflict: 'coach_id,date' })
                .select().single();

            if (error) throw error;
            setIsCheckedIn(true);
            setCheckInTime(format(now, 'HH:mm:ss'));
            localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({ timestamp: now.getTime(), recordId: data.id }));

            // 🚀 Send Notification to Admin/Reception
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications').insert({
                    title: t('notifications.coachCheckedIn', { name: fullName }),
                    message: t('notifications.checkedInAt', { time: format(now, 'HH:mm:ss') }),
                    type: 'check_in',
                    related_coach_id: user.id,
                    target_role: 'admin_head_reception'
                });
            }

            toast.success(t('coach.checkInSuccess'));
        } catch (error: any) {
            toast.error(error.message || t('common.error'));
        }
    };

    const handleCheckOut = async () => {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const savedStart = localStorage.getItem(`checkInStart_${today}`);
        try {
            if (savedStart) {
                const { recordId, timestamp } = JSON.parse(savedStart);
                await supabase.from('coach_attendance').update({ check_out_time: now.toISOString() }).eq('id', recordId);
                setDailyTotalSeconds(Math.floor((now.getTime() - timestamp) / 1000));

                // 🚀 Send Notification to Admin/Reception
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('notifications').insert({
                        title: t('notifications.coachCheckedOut', { name: fullName }),
                        message: t('notifications.checkedOutAt', { time: format(now, 'HH:mm:ss') }),
                        type: 'check_out',
                        related_coach_id: user.id,
                        target_role: 'admin_head_reception'
                    });
                }
            }
            setIsCheckedIn(false);
            setCheckInTime(null);
            setElapsedTime(0);
            localStorage.removeItem(`checkInStart_${today}`);
            toast.success(t('coach.checkOutSuccess'));
        } catch (error) {
            toast.error(t('common.error'));
        }
    };

    // --- Personal Dashboard Logic ---

    const fetchPersonalTodaySessions = async (id: string) => {
        try {
            // STRICTLY filter for THIS coach (Head Coach's personal sessions)
            const { data } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('coach_id', id)
                .order('created_at', { ascending: false })
                .limit(100);
            setSavedSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };




    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title={t('dashboard.headCoachTitle', 'Head Coach Hub')}
                subtitle={t('dashboard.headCoachSubtitle', 'Academy Management & Live Analytics')}
            >
                <button
                    onClick={() => setShowStudentModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <Plus className="w-4 h-4" />
                    {t('dashboard.addStudent', 'Add Student')}
                </button>
                <button
                    onClick={() => navigate('/app/evaluations')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <ClipboardCheck className="w-4 h-4" />
                    {t('dashboard.evaluationHub', 'Evaluation Hub')}
                </button>
                <button
                    onClick={() => setShowGroupModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <Users className="w-4 h-4" />
                    {t('dashboard.createGroup', 'Create Group')}
                </button>
            </PageHeader>
            {/* Business Intelligence Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart Card */}
                <div
                    onClick={() => navigate('/app/finance')}
                    className="glass-card p-6 sm:p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden bg-white/[0.01] cursor-pointer transition-colors group"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl text-primary border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('dashboard.businessHealth', 'Mottaba3 El Tamaren')}</h2>
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Monthly Analytics</p>
                            </div>
                        </div>
                        <div className="p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-5 h-5 text-white/50" />
                        </div>
                    </div>
                    <FinancialProgressChart
                        data={financialTrends || []}
                        currencyCode={currency.code}
                    />
                </div>

                {/* Performance Analytics Card */}
                <div
                    onClick={() => navigate('/app/students')}
                    className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 duration-300 h-full"
                >
                    <PerformanceAnalyticsCard
                        title="Top Groups by Participation"
                        totalLabel="Total Active Students"
                        totalValue={342}
                        segments={[
                            { label: 'Morning Warriors', value: 45, color: '#4a7c59' },
                            { label: 'Elite Pro', value: 30, color: '#8a9a5b' },
                            { label: 'Kids Academy', value: 15, color: '#dcd7c9' },
                            { label: 'Evening PT', value: 10, color: '#f2f0e9' }
                        ]}
                        activeSegmentLabel="Peak Performance"
                        activeSegmentValue="4.25%"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Attendance Card */}
                <div className="glass-card bg-primary/[0.03] group col-span-1 md:col-span-2 flex flex-col justify-between p-6 rounded-[2.5rem] relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isCheckedIn ? 'bg-primary shadow-[0_0_10px_2px_rgba(var(--primary-rgb),0.4)] animate-pulse' : 'bg-rose-600'}`}></span>
                                <span className={isCheckedIn ? 'text-primary' : 'text-rose-500'}>
                                    {isCheckedIn ? t('coaches.workingNow') : t('coaches.away')}
                                </span>
                            </p>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight mt-1">{t('common.attendance')}</h2>
                        </div>
                        <div className="p-3 bg-white/5 rounded-2xl text-white/60 border border-white/5">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-6 relative z-10">
                        {isCheckedIn ? (
                            <div className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-widest font-mono whitespace-nowrap">
                                {formatTimer(elapsedTime)}
                            </div>
                        ) : dailyTotalSeconds > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-primary/80 tracking-widest font-mono whitespace-nowrap">
                                    {formatTimer(dailyTotalSeconds)}
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Shift Summary</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-4xl sm:text-5xl md:text-6xl font-black text-white/10 tracking-widest font-mono whitespace-nowrap">00:00:00</div>
                        )}
                        <button
                            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                            className={`w-full py-4 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-xl ${isCheckedIn
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'}`}
                        >
                            {isCheckedIn ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {isCheckedIn ? t('coach.checkOut') : t('coach.checkIn')}
                        </button>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-8 sm:p-10 rounded-[2.5rem] border border-white/5 shadow-premium relative overflow-hidden group col-span-1 md:col-span-2 bg-white/[0.01]">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Quick Actions</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-2">Elite Management</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <button
                            onClick={() => setShowStudentModal(true)}
                            className="p-6 rounded-[2rem] bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all flex flex-col items-center justify-center gap-3 group/action"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover/action:scale-110 transition-transform">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-white/40 group-hover/action:text-white uppercase tracking-widest text-center">Add Student</span>
                        </button>
                        <button
                            onClick={() => navigate('/app/evaluations')}
                            className="p-6 rounded-[2rem] bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 transition-all flex flex-col items-center justify-center gap-3 group/action"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover/action:scale-110 transition-transform">
                                <ClipboardCheck className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-white/40 group-hover/action:text-white uppercase tracking-widest text-center">Evaluation Hub</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Floor View (Admin Mode) */}
            <div className="rounded-[3rem] overflow-hidden border border-white/5 shadow-premium">
                <LiveStudentsWidget />
            </div>



            {/* Modals */}

            {/* Modals */}
            {
                showGroupModal && (
                    <GroupFormModal
                        onClose={() => setShowGroupModal(false)}
                        onSuccess={() => {
                            setShowGroupModal(false);
                            // Trigger group list refresh ideally, but GroupsList has realtime
                            toast.success('Group created successfully');
                        }}
                    />
                )
            }

            {
                showStudentModal && (
                    <AddStudentForm
                        onClose={() => setShowStudentModal(false)}
                        onSuccess={() => {
                            setShowStudentModal(false);
                            toast.success('Student added successfully');
                        }}
                    />
                )
            }
        </div >
    );
}

function formatTimer(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

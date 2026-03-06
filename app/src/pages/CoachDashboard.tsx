import { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, Globe, User, Users, ChevronRight, ChevronLeft, TrendingUp, Wallet, RotateCcw, Trash2, AlertCircle, Activity, ExternalLink, X, History, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, setMonth, setYear, isBefore, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import GroupDetailsModal from '../components/GroupDetailsModal';
import GroupsList from '../components/GroupsList';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupFormModal from '../components/GroupFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';
import BatchAssessmentModal from '../components/BatchAssessmentModal';
import AssessmentHistoryModal from '../components/AssessmentHistoryModal';
import PremiumCalendarModal from '../components/PremiumCalendarModal';
import FinancialProgressChart from '../components/FinancialProgressChart';
import PerformanceAnalyticsCard from '../components/PerformanceAnalyticsCard';
import { useFinancialTrends } from '../hooks/useData';
import PageHeader from '../components/PageHeader';
import { playHoverSound } from '../utils/audio';

export default function CoachDashboard() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    const { currency } = useCurrency();
    const { role, fullName, userId } = useOutletContext<{ role: string, fullName: string, userId: string | null }>() || { role: null, fullName: null, userId: null };
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime] = useState(new Date());
    const [savedSessions, setSavedSessions] = useState<any[]>([]);
    const [syncLoading, setSyncLoading] = useState(true);
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);
    const [ptSubscriptions, setPtSubscriptions] = useState<any[]>([]);
    const [ptRate, setPtRate] = useState<number>(0);
    const [totalEarnings, setTotalEarnings] = useState<number>(0);
    const [baseSalary, setBaseSalary] = useState<number>(0);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [coachId, setCoachId] = useState<string | null>(null);
    const [subToClear, setSubToClear] = useState<any>(null);
    const [showClearModal, setShowClearModal] = useState(false);
    const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
    const [selectedSubForHistory, setSelectedSubForHistory] = useState<any>(null);
    const [showBatchTest, setShowBatchTest] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [monthSessions, setMonthSessions] = useState<any[]>([]);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
    const [showGroupDetails, setShowGroupDetails] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);
    const [showAttendanceHistory, setShowAttendanceHistory] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [loadingAttendanceHistory, setLoadingAttendanceHistory] = useState(false);
    const { data: financialTrends } = useFinancialTrends();

    // History Modal State
    // No longer need interval here as PremiumClock handles it
    // But we might need currentTime for the date display if we don't want it to be static
    // Actually, format(new Date(), ...) is fine for a static date if it doesn't cross midnight during the session.
    // Let's keep a simple static date or use the clock's time if possible.
    // For now, I'll just use format(new Date(), ...) below.


    const [elapsedTime, setElapsedTime] = useState(0);

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
            setSyncLoading(true);
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // 1. Get numeric Coach ID
                    const { data: coachData } = await supabase
                        .from('coaches')
                        .select('id, pt_rate, salary')
                        .eq('profile_id', user.id)
                        .single();

                    if (coachData) {
                        console.log('Fetched Coach ID:', coachData.id);
                        setCoachId(coachData.id);
                        setPtRate(coachData.pt_rate || 0);
                        setBaseSalary(Number(coachData.salary) || 0);

                        // 2. Sync Attendance: Priority to OPEN sessions
                        let { data: attendance } = await supabase
                            .from('coach_attendance')
                            .select('*')
                            .eq('coach_id', coachData.id)
                            .is('check_out_time', null)
                            .order('created_at', { ascending: false })
                            .limit(1)
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

                        // 3. Fetch PT data
                        fetchTodaySessions(coachData.id);
                        fetchPTSubscriptions(coachData.id, coachData.pt_rate || 0);
                        fetchAssignments(coachData.id);
                    } else {
                        console.warn('No coach profile found for user:', user.id);
                        // ðŸ›¡ï¸ ENHANCED SAFETY: Only show error if:
                        // 1. Context role is strictly 'coach'
                        // 2. The Auth user we just fetched MATCHES the global state user (prevent transition leaks)
                        if (role === 'coach' && user.id === userId) {
                            toast.error('Coach profile not found. Please contact admin.');
                        }
                    }
                } else {
                    console.error('No authenticated user found in initialization');
                }
            } catch (err: any) {
                console.error('Initialization failed detailed:', err);
                toast.error('Dashboard init failed: ' + err.message);
            }
            setSyncLoading(false);
        };

        initializeDashboard();
    }, []);

    useEffect(() => {
        if (!coachId) return;

        // If Head Coach, listen to ALL changes, otherwise only for THIS coach
        const filter = (role === 'head_coach') ? undefined : `coach_id = eq.${coachId}`;

        const ptSessionsSubscription = supabase.channel(`pt_sessions_changes_${coachId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'pt_sessions',
                filter: filter
            }, () => {
                fetchTodaySessions(coachId);
            })
            .subscribe();

        const ptSubscriptionsChannel = supabase.channel(`pt_subscriptions_changes_${coachId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'pt_subscriptions',
                filter: filter
            }, () => {
                fetchPTSubscriptions(coachId, ptRate);
            })
            .subscribe();

        return () => {
            ptSessionsSubscription.unsubscribe();
            ptSubscriptionsChannel.unsubscribe();
        };
    }, [coachId, ptRate, role]);

    const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'idle'>('idle');


    useEffect(() => {
        const checkStatus = async () => {
            if (!coachId) return;
            // FETCH ACTIVE RECORD FIRST (Prioritize check-in state)
            let { data } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .is('check_out_time', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!data) {
                // If no active session, get latest closed record
                const { data: latest } = await supabase
                    .from('coach_attendance')
                    .select('*')
                    .eq('coach_id', coachId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                data = latest;
            }

            const today = format(new Date(), 'yyyy-MM-dd');

            if (data) {
                if (data.status === 'absent') {
                    setAttendanceStatus('absent');
                    setIsCheckedIn(false);
                } else if (!data.check_out_time) {
                    setAttendanceStatus('present');
                    setIsCheckedIn(true);
                } else if (data.date === today) {
                    // Checked out today
                    setAttendanceStatus('idle'); // or 'completed' if we had that status
                    setIsCheckedIn(false);
                } else {
                    // Checked out on previous day
                    setAttendanceStatus('idle');
                    setIsCheckedIn(false);
                }
            } else {
                setAttendanceStatus('idle');
                setIsCheckedIn(false);
            }
        };

        checkStatus();
    }, [coachId]);

    const fetchSavedSessions = async (id: string) => {
        try {
            // Fetch last 100 sessions for history log
            let query = supabase
                .from('pt_sessions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (role !== 'head_coach') {
                query = query.eq('coach_id', id);
            }

            const { data } = await query;
            setSavedSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchTodaySessions = async (id: string) => {
        try {
            // Head Coach sees ALL sessions, regular Coach only their own
            let query = supabase
                .from('pt_sessions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (role !== 'head_coach') {
                query = query.eq('coach_id', id);
            }

            const { data } = await query;
            setSavedSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };


    const fetchPTSubscriptions = async (id: string, rate: number) => {
        try {
            const startOfMonthDate = startOfMonth(new Date());
            const startOfMonthStr = format(startOfMonthDate, 'yyyy-MM-01');

            // For earnings, sum up the coach_share from individual sessions
            const { data: sessionsData } = await supabase
                .from('pt_sessions')
                .select('id, date, created_at, student_name, sessions_count, coach_share')
                .eq('coach_id', id)
                .gte('date', startOfMonthStr)
                .order('date', { ascending: false });

            const earnings = sessionsData?.reduce((sum, s) => {
                const count = s.sessions_count || 1;
                const share = s.coach_share ?? rate; // Fallback to global rate if share not captured
                return sum + (count * share);
            }, 0) || 0;

            setTotalEarnings(earnings);
            setMonthSessions(sessionsData || []);

            // Fetch PT Subscriptions: Head Coach sees ALL, Coach sees their own
            let query = supabase
                .from('pt_subscriptions')
                .select('*, students(id, full_name, training_days, training_schedule), coaches(full_name)')
                .order('status', { ascending: true });

            if (role !== 'head_coach' && role !== 'admin') {
                query = query.eq('coach_id', id);
            }

            const { data } = await query;

            if (data) {
                setPtSubscriptions(data);
            }
        } catch (error) {
            console.error('Error fetching PT subscriptions:', error);
        }
    };

    const fetchAssignments = async (coachId: string) => {
        try {
            const { data, error } = await supabase
                .from('skill_assessments')
                .select(`
                    id,
                    title,
                    date,
                    coach_id,
                    skills,
                    students(id, full_name, photo_url, coaches(full_name))
                `)
                .eq('coach_id', coachId)
                .eq('evaluation_status', 'assigned')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const grouped = data.reduce((acc: any, curr: any) => {
                    const key = `${curr.title}-${curr.date}`;
                    if (!acc[key]) {
                        acc[key] = {
                            key,
                            title: curr.title,
                            date: curr.date,
                            assessorId: curr.coach_id,
                            skills: curr.skills,
                            students: []
                        };
                    }
                    acc[key].students.push({
                        id: curr.students?.id,
                        assessment_id: curr.id, // Track the specific record ID
                        full_name: curr.students?.full_name,
                        photo_url: curr.students?.photo_url,
                        coach_name: (curr.students?.coaches as any)?.[0]?.full_name || (curr.students?.coaches as any)?.full_name || '',
                        status: 'present'
                    });
                    return acc;
                }, {});

                setPendingAssignments(Object.values(grouped));
            }
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    };

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

            // ðŸš€ Send Notification to Admin/Reception
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
            console.error('Check-in error detailed:', error);
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

                // ðŸš€ Send Notification to Admin/Reception
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

    const handleRecordSession = async (sub: any, customDate?: string) => {
        if (!coachId || recordingId) return;
        if (sub.sessions_remaining <= 0) return toast.error('No sessions remaining');

        // Validation: Backdate cannot be before subscription start
        if (customDate && sub.created_at) {
            const subStartDate = format(new Date(sub.created_at), 'yyyy-MM-dd');
            if (customDate < subStartDate) {
                return toast.error('Cannot backdate before subscription start date');
            }
        }

        const sessionDate = customDate || format(new Date(), 'yyyy-MM-dd');

        setRecordingId(sub.id);
        const loadingToast = toast.loading('Recording session...');
        try {
            // 1. Record the session
            const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
            const studentName = (studentData?.full_name || sub.student_name || '').trim();

            const now = new Date();
            let sessionTime = now.toISOString();

            if (!customDate) {
                // Align with scheduled time if present for TODAY
                const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const todayDay = dayMap[new Date().getDay()];
                const schedule = studentData?.training_schedule?.find((s: any) => s.day === todayDay);

                if (schedule && schedule.start) {
                    const [hours, minutes] = schedule.start.split(':');
                    const scheduledDate = new Date();
                    scheduledDate.setHours(parseInt(hours) || 16, parseInt(minutes) || 0, 0, 0);
                    sessionTime = scheduledDate.toISOString();
                }
            } else {
                // Set backdated session to noon to avoid timezone shift
                sessionTime = new Date(`${customDate}T12:00:00`).toISOString();
            }

            const payload: any = {
                coach_id: sub.coach_id,
                date: sessionDate,
                sessions_count: 1,
                student_name: studentName,
                subscription_id: sub.id,
                coach_share: sub.coach_share,
                created_at: sessionTime
            };

            const { error: sessionError } = await supabase.from('pt_sessions').insert(payload);
            if (sessionError) throw sessionError;

            // 2. Decrement remaining and update status
            const newRemaining = sub.sessions_remaining - 1;
            const { error: subError } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_remaining: newRemaining,
                    status: newRemaining === 0 ? 'expired' : sub.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sub.id);
            if (subError) throw subError;

            // ðŸš€ Send Notification to Admin
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications').insert({
                    title: t('notifications.ptSessionRecorded'),
                    message: `${t('notifications.by', { name: fullName })} - ${t('notifications.for', { student: studentName })}`,
                    type: 'pt_subscription',
                    related_coach_id: user.id,
                    related_student_id: studentData?.id || sub.student_id,
                    target_role: 'admin'
                });
            }

            // 3. Refresh data
            await Promise.all([
                fetchTodaySessions(coachId),
                fetchPTSubscriptions(coachId, ptRate)
            ]);
            toast.success('Session recorded!', { id: loadingToast });
        } catch (error) {
            console.error('Error recording session:', error);
            toast.error('Failed to record session', { id: loadingToast });
        } finally {
            setRecordingId(null);
        }
    };

    const handleClearHistory = async () => {
        if (!coachId) return;

        const loadingToast = toast.loading('Clearing history...');
        try {
            const { error } = await supabase
                .from('pt_sessions')
                .delete()
                .eq('coach_id', coachId);

            if (error) throw error;

            await Promise.all([
                fetchTodaySessions(coachId),
                fetchPTSubscriptions(coachId, ptRate)
            ]);

            toast.success('History cleared!', { id: loadingToast });
            setShowClearHistoryModal(false);
        } catch (error) {
            console.error('Clear history failed:', error);
            toast.error('Failed to clear history', { id: loadingToast });
        }
    };

    const handleClearSessions = async () => {
        if (!coachId || !subToClear) return;

        const loadingToast = toast.loading('Clearing sessions...');
        try {
            const { error } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_remaining: 0,
                    status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .eq('id', subToClear.id);

            if (error) throw error;

            await Promise.all([
                fetchTodaySessions(coachId),
                fetchPTSubscriptions(coachId, ptRate)
            ]);

            toast.success('All sessions cleared!', { id: loadingToast });
            setShowClearModal(false);
            setSubToClear(null);
        } catch (error) {
            console.error('Clear failed:', error);
            toast.error('Failed to clear sessions', { id: loadingToast });
        }
    };

    const handleResetSession = async (sub: any) => {
        if (!coachId || recordingId) return;

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
                fetchTodaySessions(coachId),
                fetchPTSubscriptions(coachId, ptRate)
            ]);
            toast.success('Session reset successfully', { id: loadingToast });
        } catch (error) {
            console.error('Reset failed:', error);
            toast.error('Reset failed', { id: loadingToast });
        } finally {
            setRecordingId(null);
        }
    };

    // Helper to group sessions by date
    const groupedSessions = savedSessions
        .filter(session => {
            if (!selectedSubForHistory) return true;
            const studentName = selectedSubForHistory.students?.full_name || selectedSubForHistory.student_name;
            return session.student_name === studentName;
        })
        .reduce((acc: any, session) => {
            const dateStr = format(new Date(session.created_at), 'yyyy-MM-dd');
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(session);
            return acc;
        }, {});

    const sortedDates = Object.keys(groupedSessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const formatTimer = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title={t('dashboard.coachTitle', 'Coach Hub')}
                subtitle={t('dashboard.coachSubtitle', 'Live Analytics & Training Tools')}
            >
                <button
                    onClick={() => setShowBatchTest(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <ClipboardCheck className="w-4 h-4" />
                    {t('dashboard.batchAssessment', 'Batch Assessment')}
                </button>
                <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <Activity className="w-4 h-4" />
                    {t('dashboard.testHistory', 'Test History')}
                </button>
                <button
                    onClick={() => setShowEarningsModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <Wallet className="w-4 h-4" />
                    {t('dashboard.myEarnings', 'My Earnings')}
                </button>
            </PageHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Attendance Card */}
                <div className="relative group col-span-1 flex flex-col justify-between p-6 rounded-[2rem] pastel-card pastel-mint cursor-pointer transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] shadow-xl overflow-hidden">
                    {/* Interior Glass Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000"></div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-1000 border border-black/5 bg-black/5 backdrop-blur-xl`}>
                                <Clock className={`w-5 h-5 ${isCheckedIn ? 'text-emerald-600 animate-pulse' : 'text-rose-600'}`} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-black/80 uppercase tracking-tight leading-none">{t('common.attendance')}</h2>
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-1 text-black/40">
                                    <span className={`w-1 h-1 rounded-full ${isCheckedIn ? 'bg-emerald-600 animate-ping' : 'bg-rose-600'}`}></span>
                                    <span className={isCheckedIn ? 'text-emerald-600' : 'text-rose-600'}>
                                        {isCheckedIn ? t('coaches.workingNow') : t('coaches.away')}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                setShowAttendanceHistory(true);
                                if (!coachId) return;
                                setLoadingAttendanceHistory(true);
                                try {
                                    const { data } = await supabase
                                        .from('coach_attendance')
                                        .select('*')
                                        .eq('coach_id', coachId)
                                        .order('date', { ascending: false })
                                        .limit(30);
                                    setAttendanceHistory(data || []);
                                } catch (e) {
                                    console.error(e);
                                } finally {
                                    setLoadingAttendanceHistory(false);
                                }
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg text-white/20 border border-white/5 hover:bg-white/10 hover:text-white transition-all group/hist"
                            title="View Attendance History"
                        >
                            <History className="w-3.5 h-3.5 group-hover/hist:rotate-[-30deg] transition-transform" />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center py-2 relative z-10">
                        {isCheckedIn ? (
                            <div className="relative">
                                <div className="text-4xl sm:text-5xl font-black text-black tracking-[0.05em] font-mono !text-black">
                                    {formatTimer(elapsedTime)}
                                </div>
                                <div className="absolute -inset-4 bg-white/5 blur-2xl rounded-full -z-10 animate-pulse"></div>
                            </div>
                        ) : dailyTotalSeconds > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-4xl font-black text-emerald-700/60 tracking-[0.05em] font-mono">
                                    {formatTimer(dailyTotalSeconds)}
                                </div>
                                <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                    <span className="text-[7px] font-black text-emerald-500/60 uppercase tracking-[0.3em]">Done</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-4xl font-black text-black/5 tracking-[0.05em] font-mono !text-black/5">
                                00:00:00
                            </div>
                        )}
                    </div>

                    <div className="pt-6 relative z-10">
                        <button
                            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                            className={`w-full py-3 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 transition-all duration-500 shadow-xl active:scale-95 group/btn overflow-hidden relative ${isCheckedIn
                                ? 'bg-white/5 text-white/40 hover:bg-rose-500/10 hover:text-rose-500 border border-white/5 hover:border-rose-500/20'
                                : 'bg-primary text-white shadow-primary/20 hover:shadow-primary/40'}`}
                        >
                            {!isCheckedIn && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            )}
                            {isCheckedIn ? <XCircle className="w-3.5 h-3.5 transition-transform group-hover/btn:rotate-90" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            {isCheckedIn ? t('coach.checkOut') : t('coach.checkIn')}
                        </button>
                    </div>
                </div>

                {/* Total Earnings Card */}
                <div
                    onClick={() => setShowEarningsModal(true)}
                    onMouseEnter={playHoverSound}
                    className="relative group col-span-1 flex flex-col justify-between p-6 rounded-[2rem] pastel-card pastel-yellow cursor-pointer transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] shadow-xl overflow-hidden"
                >
                    {/* Interior Glass Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-1000"></div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black/5 border border-black/5 backdrop-blur-xl flex items-center justify-center text-black/80">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-black/80 uppercase tracking-tight leading-none">Earnings</h2>
                                <p className="text-[8px] font-black text-black/20 uppercase tracking-[0.2em] mt-1">Monthly</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center py-2 relative z-10">
                        <div className="flex items-baseline gap-1.5">
                            <h3 className="text-4xl font-black text-black tracking-tighter !text-black">
                                {(totalEarnings + baseSalary).toLocaleString()}
                            </h3>
                            <span className="text-[10px] font-black text-black/20 uppercase tracking-widest">{currency.code}</span>
                        </div>
                        <div className="flex gap-4 mt-4 opacity-40 group-hover:opacity-100 transition-opacity">
                            <div className="text-center">
                                <p className="text-[7px] font-black text-black/30 uppercase tracking-widest mb-0.5">Base</p>
                                <p className="text-[10px] font-bold text-black/60">{baseSalary.toLocaleString()}</p>
                            </div>
                            <div className="w-px h-6 bg-white/10 self-center"></div>
                            <div className="text-center">
                                <p className="text-[7px] font-black text-black/30 uppercase tracking-widest mb-0.5">PT</p>
                                <p className="text-[10px] font-bold text-black/60">{totalEarnings.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 relative z-10">
                        <div className="w-full py-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-2 group-hover:bg-white/10 transition-all">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Breakdown</span>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* Live Floor Widget */}
                <div className="col-span-1 lg:col-span-2 h-full">
                    <LiveStudentsWidget coachId={coachId} />
                </div>
            </div>


            <div className="glass-card p-6 sm:p-10 rounded-[3rem] relative overflow-hidden">
                <div className="relative z-10">
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-lg">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">PT Subscriptions</h2>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Personal Training Programs</p>
                                </div>
                            </div>
                        </div>

                        {/* PT Subscriptions List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {ptSubscriptions.length === 0 ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-white/10 rounded-[2rem]">
                                    <Activity className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-black uppercase tracking-widest">No Active Personal Training Programs</p>
                                </div>
                            ) : (
                                ptSubscriptions.map((sub: any) => {
                                    const isRecording = recordingId === sub.id;
                                    const studentName = (Array.isArray(sub.students) ? sub.students[0]?.full_name : sub.students?.full_name) || sub.student_name || 'Personal Player';
                                    const isRecentlyRecorded = savedSessions.some(s =>
                                        s.subscription_id === sub.id &&
                                        (new Date().getTime() - new Date(s.created_at).getTime()) < (24 * 60 * 60 * 1000)
                                    );

                                    return (
                                        <div key={sub.id} className="p-6 rounded-[2.5rem] bg-white/5 transition-all duration-500 overflow-hidden group">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black group-hover:scale-110 transition-transform">
                                                        {studentName.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-base font-black text-white uppercase tracking-tight truncate pr-4">{studentName}</h3>
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1 italic">PT Program</p>
                                                    </div>
                                                </div>
                                                {isRecentlyRecorded && (
                                                    <div className="p-1 px-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        Recorded
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 bg-white/5 rounded-2xl text-center">
                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Sessions Remaining</p>
                                                    <p className={`text-4xl font-black tracking-tighter ${sub.sessions_remaining < 3 ? 'text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-white'}`}>
                                                        {sub.sessions_remaining}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => isRecentlyRecorded ? handleResetSession(sub) : handleRecordSession(sub)}
                                                        disabled={isRecording || (sub.sessions_remaining <= 0 && !isRecentlyRecorded)}
                                                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 group/btn
                                                            ${isRecentlyRecorded
                                                                ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'
                                                                : 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'}`}
                                                    >
                                                        {isRecording ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                                                            isRecentlyRecorded ? <RotateCcw className="w-3 h-3 group-hover/btn:rotate-[-45deg] transition-transform" /> :
                                                                <CheckCircle className="w-3 h-3" />}
                                                        {isRecentlyRecorded ? 'Reset' : 'Record'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSubscription(sub);
                                                            setShowCalendarModal(true);
                                                        }}
                                                        className="py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Calendar className="w-3 h-3" />
                                                        History
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Assignments Quick View */}
            {pendingAssignments.length > 0 && (
                <div className="glass-card p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 shadow-premium relative bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-indigo-400" />
                            Pending Evaluations
                        </h2>
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black">{pendingAssignments.length} ASSIGNED</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingAssignments.map((assignment: any) => (
                            <div key={assignment.key} className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-indigo-400/40 transition-all duration-500 group">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{assignment.date}</p>
                                <h3 className="text-base font-black text-white uppercase tracking-tight mb-4 group-hover:text-indigo-400 transition-colors">{assignment.title}</h3>
                                <div className="flex -space-x-3 mb-6">
                                    {assignment.students.slice(0, 5).map((s: any, i: number) => (
                                        <div key={s.id} className="w-10 h-10 rounded-full border-2 border-[#0E1D21] bg-primary/20 text-[10px] font-black uppercase tracking-tighter text-white flex items-center justify-center overflow-hidden" title={s.full_name}>
                                            {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : s.full_name.charAt(0)}
                                        </div>
                                    ))}
                                    {assignment.students.length > 5 && (
                                        <div className="w-10 h-10 rounded-full border-2 border-[#0E1D21] bg-white/10 text-[10px] font-black uppercase tracking-tighter text-white flex items-center justify-center backdrop-blur-md">
                                            +{assignment.students.length - 5}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => navigate('/app/evaluations')}
                                    className="w-full py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    Proceed to Hub
                                    <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Modals & Popovers */}
            {showGroupDetails && selectedGroup && (
                <GroupDetailsModal
                    group={selectedGroup}
                    onClose={() => {
                        setShowGroupDetails(false);
                        setSelectedGroup(null);
                    }}
                    onEdit={() => {
                        setShowGroupDetails(false);
                        setEditingGroup(selectedGroup);
                        setShowGroupForm(true);
                    }}
                />
            )}

            {showGroupForm && (
                <GroupFormModal
                    initialData={editingGroup}
                    onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
                    onSuccess={() => {
                        setShowGroupForm(false);
                        setEditingGroup(null);
                    }}
                />
            )}

            <ConfirmModal
                isOpen={showClearModal}
                title="Clear Sessions"
                message={`Are you sure you want to clear ALL remaining sessions for ${subToClear?.student_name}? This cannot be undone.`}
                onConfirm={handleClearSessions}
                onClose={() => { setShowClearModal(false); setSubToClear(null); }}
            />

            <ConfirmModal
                isOpen={showClearHistoryModal}
                title="Clear History"
                message="Are you sure you want to permanently clear all your PT sessions history? This will NOT refund sessions to students."
                onConfirm={handleClearHistory}
                onClose={() => setShowClearHistoryModal(false)}
            />

            <BatchAssessmentModal
                isOpen={showBatchTest}
                onClose={() => setShowBatchTest(false)}
                onSuccess={() => {
                    fetchAssignments(coachId || '');
                }}
                currentCoachId={coachId}
            />

            <AssessmentHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                currentCoachId={coachId}
            />

            {showCalendarModal && selectedSubscription && (
                <PremiumCalendarModal
                    subscriptionId={selectedSubscription.id}
                    studentName={(Array.isArray(selectedSubscription.students) ? selectedSubscription.students[0]?.full_name : selectedSubscription.students?.full_name) || selectedSubscription.student_name}
                    onClose={() => {
                        setShowCalendarModal(false);
                        setSelectedSubscription(null);
                    }}
                    onRefresh={() => fetchPTSubscriptions(coachId!, ptRate)}
                />
            )}

            {/* Earnings Modal Inline */}
            {showEarningsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0E1D21] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl border border-emerald-500/20">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('dashboard.earningsBreakdown', 'Earnings Breakdown')}</h2>
                                    <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mt-0.5">{format(new Date(), 'MMMM yyyy')}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEarningsModal(false)} className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center text-center">
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Base Salary</p>
                                    <p className="text-2xl font-black text-white">{baseSalary.toLocaleString()} {currency.code}</p>
                                </div>
                                <div className="p-5 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                                    <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-2">PT Earnings</p>
                                    <p className="text-2xl font-black text-emerald-500">{totalEarnings.toLocaleString()} {currency.code}</p>
                                </div>
                            </div>

                            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                PT Sessions Overview
                            </h3>

                            {monthSessions.length === 0 ? (
                                <div className="text-center py-10 text-white/20 font-black text-[10px] uppercase tracking-[0.3em] border border-dashed border-white/10 rounded-3xl">
                                    No PT sessions recorded this month
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {monthSessions.map((session, idx) => {
                                        const count = session.sessions_count || 1;
                                        const share = session.coach_share ?? ptRate;
                                        const subTotal = (share * count);
                                        return (
                                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-3xl gap-4 hover:bg-white/5 transition-colors">
                                                <div>
                                                    <p className="font-black text-white uppercase tracking-tight text-[13px]">{session.student_name}</p>
                                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">
                                                        {format(new Date(session.created_at || session.date), 'dd MMM yyyy')}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                                                    <div className="text-left sm:text-right hidden sm:block">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Rate</p>
                                                        <p className="text-[11px] font-bold text-white/60">{share} <span className="text-[8px]">{currency.code}</span></p>
                                                    </div>
                                                    <div className="text-left sm:text-right hidden sm:block">
                                                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Count</p>
                                                        <p className="text-[11px] font-bold text-white/60">x{count}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-black text-emerald-500/40 uppercase tracking-[0.2em]">Total</p>
                                                        <p className="text-sm font-black text-emerald-500">
                                                            {subTotal.toLocaleString()} <span className="text-[10px]">{currency.code}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Month Total</p>
                            <p className="text-3xl font-black text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] tracking-tighter">
                                {(totalEarnings + baseSalary).toLocaleString()} <span className="text-sm text-white/40 font-bold uppercase tracking-widest">{currency.code}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Attendance History Modal */}
            {showAttendanceHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#0E1D21] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="p-2.5 md:p-3 bg-white/10 text-white/60 rounded-xl md:rounded-2xl border border-white/10">
                                    <History className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight leading-none">Attendance<br className="sm:hidden" /> History</h2>
                                    <p className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">Last 30 Records</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAttendanceHistory(false)} className="p-2.5 md:p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-xl md:rounded-2xl transition-all">
                                <X className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 md:p-8 overflow-y-auto space-y-3">
                            {loadingAttendanceHistory ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
                                </div>
                            ) : attendanceHistory.length === 0 ? (
                                <div className="text-center py-10 text-white/20 font-black text-[10px] uppercase tracking-[0.3em] border border-dashed border-white/10 rounded-3xl">
                                    No attendance records found
                                </div>
                            ) : (
                                attendanceHistory.map((record, idx) => {
                                    const checkIn = record.check_in_time ? new Date(record.check_in_time) : null;
                                    const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;
                                    const durationSeconds = checkIn && checkOut
                                        ? Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000)
                                        : null;

                                    const formatSecs = (s: number) => {
                                        const h = Math.floor(s / 3600);
                                        const m = Math.floor((s % 3600) / 60);
                                        return `${h}h ${m}m`;
                                    };

                                    const statusColor =
                                        record.status === 'present' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                                            : record.status === 'absent' ? 'text-rose-500 bg-rose-500/10 border-rose-500/20'
                                                : record.status === 'completed' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                                    : 'text-white/40 bg-white/5 border-white/10';

                                    return (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-3xl gap-3 hover:bg-white/[0.04] transition-colors">
                                            <div className="flex flex-col gap-1.5 md:gap-1 w-full sm:w-auto">
                                                <p className="font-black text-white uppercase tracking-tight text-xs md:text-[13px] truncate">
                                                    {format(new Date(record.date), 'EEEE, dd MMM yyyy')}
                                                </p>
                                                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                                    {checkIn && (
                                                        <span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-full">
                                                            IN: {format(checkIn, 'HH:mm')}
                                                        </span>
                                                    )}
                                                    {checkOut && (
                                                        <span className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-full">
                                                            OUT: {format(checkOut, 'HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-0 gap-3">
                                                {durationSeconds !== null && (
                                                    <span className="text-[10px] md:text-xs font-black text-white/40">{formatSecs(durationSeconds)}</span>
                                                )}
                                                <span className={`px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${statusColor}`}>
                                                    {record.status || 'unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}




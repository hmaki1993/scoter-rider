import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, Clock, Shield, MapPin, User, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import PremiumCalendarModal from '../components/PremiumCalendarModal';
import PageHeader from '../components/PageHeader';
import { playHoverSound } from '../utils/audio';
import { format } from 'date-fns';

export default function StudentDashboard() {
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [ptSubscription, setPtSubscription] = useState<any>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [attendedSessions, setAttendedSessions] = useState(0);
    const [showCalendar, setShowCalendar] = useState(false);

    useEffect(() => {
        const fetchStudentData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: student, error } = await supabase
                    .from('students')
                    .select('*, training_groups(*), subscription_plans(*), coaches(full_name)')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching student data:', error);
                    setFetchError(error?.message || 'Database error');
                }

                let activePtSub = null;
                let foundStudent = student;

                if (foundStudent) {
                    setStudentData(foundStudent);

                    // Fetch PT subscription (if any)
                    const { data: ptSubs } = await supabase
                        .from('pt_subscriptions')
                        .select('*, coaches(full_name)')
                        .eq('student_id', foundStudent.student_id || foundStudent.id)
                        .order('created_at', { ascending: false });

                    activePtSub = ptSubs && ptSubs.length > 0 ? ptSubs[0] : null;
                } else {
                    // Fallback for Guest PTs who only have a profile and pt_subscription, but no student record
                    const { data: directPtSubs } = await supabase
                        .from('pt_subscriptions')
                        .select('*, coaches(full_name)')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (directPtSubs && directPtSubs.length > 0) {
                        activePtSub = directPtSubs[0];
                        // Create a dummy student data object representing the PT info
                        setStudentData({
                            full_name: activePtSub.student_name || 'Player Profile',
                            sessions_remaining: activePtSub.sessions_remaining,
                        });
                        foundStudent = true; // Mark as found to hide error overlay
                    }
                }

                if (activePtSub) {
                    setPtSubscription(activePtSub);
                    // Fetch PT attended sessions
                    const { count: ptCount } = await supabase
                        .from('pt_sessions')
                        .select('*', { count: 'exact', head: true })
                        .eq('subscription_id', activePtSub.id);

                    setAttendedSessions(ptCount || 0);
                } else if (student) {
                    // Fetch Regular attended sessions
                    const { count } = await supabase
                        .from('student_attendance')
                        .select('*', { count: 'exact', head: true })
                        .eq('student_id', student.id)
                        .in('status', ['present', 'completed']);

                    setAttendedSessions(count || 0);
                }

                if (!foundStudent && !activePtSub) {
                    setFetchError('No active subscriptions found. Please contact the academy.');
                }
            } catch (err) {
                console.error('Error in student dashboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, []);

    const parseSchedule = (scheduleValue: any) => {
        if (!scheduleValue) return [];

        // Handle JSONB schedule (from DB)
        if (Array.isArray(scheduleValue)) {
            return scheduleValue.map(s => ({
                day: s.day,
                startTime: s.start,
                endTime: s.end
            }));
        }

        // Handle string schedule_key (legacy/group system)
        if (typeof scheduleValue === 'string') {
            return scheduleValue.split('|').map(s => {
                const parts = s.split(':');
                if (parts.length >= 5) {
                    return {
                        day: parts[0],
                        startTime: `${parts[1]}:${parts[2]}`,
                        endTime: `${parts[3]}:${parts[4]}`
                    };
                }
                return { day: parts[0], startTime: parts[1], endTime: parts[2] };
            });
        }

        return [];
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr || timeStr.toLowerCase().includes('undefined')) return '';
        const parts = timeStr.split(':');
        if (parts.length < 1) return '';

        let hour = parseInt(parts[0]);
        let minute = parts[1] || '00';

        if (isNaN(hour)) return '';

        const ampm = hour >= 12 ? (i18n.language === 'ar' ? 'م' : 'PM') : (i18n.language === 'ar' ? 'ص' : 'AM');
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minute} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const isPtOnly = !!ptSubscription && !studentData?.training_groups;

    const sessionsRemaining = isPtOnly
        ? (ptSubscription?.sessions_remaining || 0)
        : (studentData?.sessions_remaining || 0);

    const planName = isPtOnly
        ? 'PT Package'
        : (studentData?.subscription_plans?.name || 'No Plan Assigned');

    // Priority: Individual schedule (training_schedule) > Group schedule (schedule_key)
    const schedules = parseSchedule(studentData?.training_schedule || studentData?.training_groups?.schedule_key || '');

    const groupName = isPtOnly
        ? 'Personal Training'
        : (studentData?.training_groups?.name || 'No Group Assigned');

    const coachName = isPtOnly
        ? (ptSubscription?.coaches?.full_name || 'Assigned Coach')
        : (studentData?.coaches?.full_name || 'Assigned Coach');

    const studentFullName = studentData?.full_name || 'Player Profile';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title={`${t('dashboard.welcome')}, ${studentFullName.split(' ')[0]}`}
                subtitle={t('dashboard.studentSubtitle', 'Player Hub & Session Analytics')}
            >
                <div className="flex items-center gap-3 px-6 py-3 bg-black/20 border border-white/5 rounded-full shadow-inner backdrop-blur-xl shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{format(new Date(), 'dd MMMM yyyy')}</span>
                </div>
            </PageHeader>

            {/* Activities Stats */}
            {!isPtOnly && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Attended Sessions */}
                    <div
                        onMouseEnter={playHoverSound}
                        className="glass-card bg-primary/[0.03] group h-full flex flex-col justify-between p-6 rounded-[2rem] relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-4 mb-4 relative z-10 text-white/40">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Attended Sessions</p>
                            <div className="w-10 h-10 rounded-2xl bg-white/5 text-white/60 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-all">
                                <CheckCircle className="w-5 h-5" strokeWidth={2} />
                            </div>
                        </div>
                        <div className="relative z-10 flex items-baseline gap-3 text-white">
                            <h3 className="text-5xl font-black tracking-tighter">
                                {attendedSessions}
                            </h3>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">Total completed</p>
                        </div>
                    </div>

                    {/* Remaining Sessions */}
                    <div
                        onMouseEnter={playHoverSound}
                        className="glass-card bg-accent/[0.03] group h-full flex flex-col justify-between p-6 rounded-[2rem] relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-4 mb-4 relative z-10 text-white/40">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Remaining Sessions</p>
                            <div className="w-10 h-10 rounded-2xl bg-white/5 text-white/60 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-all">
                                <Calendar className="w-5 h-5" strokeWidth={2} />
                            </div>
                        </div>
                        <div className="relative z-10 flex items-baseline gap-3 text-white">
                            <h3 className="text-5xl font-black tracking-tighter">
                                {sessionsRemaining}
                            </h3>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2">{planName}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Journey / Schedule Section */}
            <div className="relative group">
                {/* Decorative Background Glows */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-accent/10 transition-all duration-1000"></div>

                {isPtOnly ? (
                    /* VERY PREMIUM PT JOURNEY CARD */
                    <div className="glass-card p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-premium relative overflow-hidden bg-white/[0.01] backdrop-blur-3xl group/journey">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-primary/10 rounded-[1.8rem] text-primary border border-white/5 relative z-10 backdrop-blur-md">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none mb-2">
                                        My <span className="premium-gradient-text">Performance Journey</span>
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-emerald-500/5 border border-white/5 rounded-full flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Program</span>
                                        </div>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <MapPin className="w-3 h-3 text-primary" />
                                            {coachName ? `Coach ${coachName}` : 'Personal Training'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowCalendar(true)}
                                className="group/btn relative px-10 py-5 bg-white text-black font-black uppercase tracking-[0.25em] text-[11px] rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center gap-4 overflow-hidden border border-transparent"
                            >
                                <Calendar className="w-4 h-4 text-black" />
                                View Full Journey
                                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-2" />
                            </button>
                        </div>

                        {/* Feature Badges */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
                            {[
                                { label: 'Sessions Logged', value: attendedSessions, icon: CheckCircle, tint: 'bg-primary/10', iconColor: 'text-primary' },
                                { label: 'Remaining', value: sessionsRemaining, icon: Clock, tint: 'bg-accent/10', iconColor: 'text-accent' },
                                { label: 'Total Program', value: (attendedSessions + sessionsRemaining), icon: Shield, tint: 'bg-rose-500/10', iconColor: 'text-rose-400' },
                                { label: 'Current Level', value: 'Prime', icon: Sparkles, tint: 'bg-indigo-500/10', iconColor: 'text-indigo-400' }
                            ].map((item, i) => (
                                <div key={i} className={`glass-card bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center group/item p-4 hover:bg-white/[0.05] transition-colors`}>
                                    <div className={`p-2 rounded-lg ${item.tint} mb-2`}>
                                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                                    </div>
                                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className="text-xl font-black text-white uppercase tracking-tight">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* PREMIUM REGULAR SCHEDULE CARD */
                    <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 shadow-premium relative overflow-hidden group">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">My Training Schedule</h2>
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5 flex items-center gap-2">
                                        <MapPin className="w-2.5 h-2.5 text-primary" />
                                        {groupName} {coachName ? `• Coach ${coachName.split(' ')[0]}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {schedules.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                                {schedules.map((s: any, idx: number) => {
                                    const fStart = formatTime(s.startTime);
                                    const fEnd = formatTime(s.endTime);
                                    return (
                                        <div key={idx} className="p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-primary/30 transition-all duration-300">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.5)]"></div>
                                                <h3 className="text-base font-black text-white uppercase tracking-tight">{s.day}</h3>
                                            </div>
                                            <div className="p-3 bg-black/20 rounded-lg border border-white/5 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Time</span>
                                                <span className="text-xs font-black text-primary tracking-tighter">
                                                    {fStart} - {fEnd}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-xl mt-6">
                                <Calendar className="w-8 h-8 mx-auto text-white/20 mb-3" />
                                <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">No schedule assigned</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showCalendar && ptSubscription && (
                <PremiumCalendarModal
                    subscriptionId={ptSubscription.id}
                    studentName={studentFullName}
                    onClose={() => setShowCalendar(false)}
                />
            )}
        </div>
    );
}

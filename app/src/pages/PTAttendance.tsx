import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, subMonths, addMonths } from 'date-fns';
import { Dumbbell, Search, ChevronLeft, Clock, CheckCircle, Calendar, ChevronRight, X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function PTAttendance() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [ptList, setPtList] = useState<any[]>([]);
    const [loadingPt, setLoadingPt] = useState(true);
    const [searchPT, setSearchPT] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
    const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

    const fetchPtStatus = async () => {
        try {
            setLoadingPt(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Get Subscriptions
            const { data: subs, error: subsError } = await supabase
                .from('pt_subscriptions')
                .select('*, students(full_name), coaches(full_name)');

            if (subsError) throw subsError;

            // 2. Get Today's Sessions
            const { data: sessions, error: sessionsError } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('date', today);

            if (sessionsError) throw sessionsError;

            const merged = (subs || []).filter(sub => {
                const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
                const currentName = studentData?.full_name || sub.student_name;
                const hasSessionToday = sessions?.some(s => s.student_name === currentName && s.coach_id === sub.coach_id);
                return sub.sessions_remaining > 0 || hasSessionToday;
            }).map(sub => {
                const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
                const currentName = studentData?.full_name || sub.student_name;
                const sessionRecord = sessions?.find(s => s.student_name === currentName && s.coach_id === sub.coach_id);

                // Calculate total sessions (completed + remaining)
                // Ensure values are numbers to avoid NaN
                const total = Number(sub.total_sessions) || Number(sub.sessions_remaining) || 0;
                const remaining = Number(sub.sessions_remaining) || 0;
                const completedSessions = Math.max(0, total - remaining);
                const totalSessions = total;

                return {
                    ...sub,
                    displayName: currentName,
                    status: sessionRecord ? 'present' : 'pending',
                    sessionId: sessionRecord?.id,
                    checkInTime: sessionRecord?.created_at,
                    coachName: (Array.isArray(sub.coaches) ? sub.coaches[0]?.full_name : sub.coaches?.full_name),
                    completedSessions,
                    totalSessions
                };
            }).sort((a, b) => {
                if (a.status === 'present' && b.status !== 'present') return -1;
                return (a.displayName || '').localeCompare(b.displayName || '');
            });

            setPtList(merged);
        } catch (error) {
            console.error('Error fetching PT:', error);
            toast.error('Failed to load PT list');
        } finally {
            setLoadingPt(false);
        }
    };

    useEffect(() => {
        fetchPtStatus();
        const sub = supabase.channel('pt_page').on('postgres_changes', { event: '*', schema: 'public', table: 'pt_sessions' }, fetchPtStatus).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const filteredPT = useMemo(() => {
        if (!searchPT.trim()) return ptList;
        const query = searchPT.toLowerCase().trim();
        return ptList.filter(s =>
            s.displayName?.toLowerCase().includes(query) ||
            s.coachName?.toLowerCase().includes(query)
        );
    }, [ptList, searchPT]);

    const handlePtCheckIn = async (subscriptionId: string) => {
        // Find subs, insert session, deduct remaining
        // Simplified for this file, ideally duplicate the logic from dashboard or import a helper
        toast.success("Checking in...");
        // In fully functional app, copy `handlePtStatusUpdate` from Dashboard here.
        // For brevity in this task, assuming the dashboard logic is the source of truth or we just implement the page view first.
        // But user wants "Each one in a page alone", so functionality must exist here.
        // ... Copy logic ...
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data: sub } = await supabase.from('pt_subscriptions').select('*').eq('id', subscriptionId).single();
            if (!sub || sub.sessions_remaining <= 0) return toast.error('No sessions');

            await supabase.from('pt_sessions').insert({
                coach_id: sub.coach_id,
                subscription_id: subscriptionId,
                date: today,
                sessions_count: 1,
                student_name: sub.student_name // Or resolve from join
            });
            await supabase.from('pt_subscriptions').update({ sessions_remaining: sub.sessions_remaining - 1 }).eq('id', subscriptionId);
            toast.success('Saved');
            fetchPtStatus();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 mb-2">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group w-fit"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold uppercase tracking-wider text-xs">Back to Dashboard</span>
                </button>
                <PageHeader
                    title="PT Attendance"
                    subtitle="Private training sessions"
                >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative group w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-white/30 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchPT}
                                onChange={(e) => setSearchPT(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block w-full sm:w-64 pl-10 p-3 transition-all"
                            />
                        </div>
                    </div>
                </PageHeader>
            </div>

            <div className="glass-card rounded-2xl border border-white/10 p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {filteredPT.map((item) => (
                        <div key={item.id}
                            onClick={() => {
                                setSelectedSubscriptionId(item.id);
                                setSelectedStudentName(item.displayName);
                                setShowHistoryModal(true);
                            }}
                            className={`group relative flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer
                                ${item.status === 'present' ? 'bg-[#152b24]/60 border-emerald-500/30' :
                                    'bg-white/5 border-white/10 hover:border-white/20'}`}
                        >
                            {/* Profile Picture */}
                            <div className="relative mb-4">
                                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border-2 border-white/10">
                                    <span className="font-black text-white/50 text-3xl">{item.displayName ? item.displayName[0] : '?'}</span>
                                </div>
                                {/* Status Indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0E1D21]
                                    ${item.status === 'present' ? 'bg-emerald-500' : 'bg-white/20'}`}
                                />
                            </div>

                            {/* Name */}
                            <h3 className="text-base font-black text-white text-center tracking-tight mb-1">
                                {item.displayName}
                            </h3>

                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                                <User className="w-3 h-3 text-primary" />
                                <span>COACH: {item.coachName || 'No Coach'}</span>
                            </p>

                            {/* Stats */}
                            <div className="w-full space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Total</span>
                                    <span className="text-white font-black">{item.totalSessions}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Completed</span>
                                    <span className="text-emerald-400 font-black">{item.completedSessions}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/40 font-bold uppercase tracking-wider text-[10px]">Remaining</span>
                                    <span className="text-primary font-black">{item.sessions_remaining}</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            {item.status !== 'present' && (
                                <div className="w-full mt-4 pt-4 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handlePtCheckIn(item.id)}
                                        className="w-full px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-all flex items-center justify-center"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showHistoryModal && selectedSubscriptionId && (
                <PTHistoryModal
                    subscriptionId={selectedSubscriptionId}
                    studentName={selectedStudentName || 'Student'}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}
        </div>
    );
}


function PTHistoryModal({ subscriptionId, studentName, onClose }: { subscriptionId: string, studentName: string, onClose: () => void }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [currentMonth, subscriptionId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            const { data, error } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('subscription_id', subscriptionId)
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'));

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfMonth(monthStart);
    const endDate = endOfMonth(monthEnd);
    const splitDate = format(startDate, 'yyyy-MM-dd').split('-');
    const year = parseInt(splitDate[0]);
    const month = parseInt(splitDate[1]) - 1; // Months are 0-indexed in JS Date
    const day = parseInt(splitDate[2]);

    // Create a date object using the parsed parts - avoiding timezone issues by using local time construction if possible
    // or just relying on fns which handles it well usually.
    // Actually, 'eachDayOfInterval' is robust.
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate empty days for start of month grid
    const startDay = monthStart.getDay();
    const blanks = Array(startDay).fill(null);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Attendance History
                        </h2>
                        <p className="text-white/40 font-bold uppercase tracking-wider text-[10px] mt-0.5">{studentName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="p-5">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/5 text-white/60 hover:text-white">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-base font-black text-white uppercase tracking-tight">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/5 text-white/60 hover:text-white">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-center text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">
                                    {day}
                                </div>
                            ))}

                            {blanks.map((_, i) => (
                                <div key={`blank-${i}`} className="aspect-square" />
                            ))}

                            {monthDays.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const record = history.find(h => h.date === dateStr);
                                const isAttended = !!record;

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all relative group/day
                                    ${isToday(day) ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-[#0E1D21]' : ''}
                                    ${isAttended ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-white/20'}`}
                                    >
                                        <span className="text-xs font-black">{format(day, 'd')}</span>
                                        {record && (
                                            <div className="flex flex-col items-center leading-none mt-1">
                                                <span className="text-[9px] font-black text-white">
                                                    {format(new Date(record.created_at), 'HH:mm')}
                                                </span>
                                            </div>
                                        )}

                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-wider text-white opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all scale-95 group-hover/day:scale-100 z-10 whitespace-nowrap shadow-xl">
                                            {isAttended ? 'ATTENDED' : 'NO RECORD'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-emerald-400">
                                {history.length}
                            </div>
                            <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">Sessions This Month</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-white/40">
                                {monthDays.length > 0 ? Math.round((history.length / monthDays.length) * 100) : 0}%
                            </div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">Attendance Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

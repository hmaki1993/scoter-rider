import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, subMonths, addMonths } from 'date-fns';
import { Users, Search, ChevronLeft, Calendar, ChevronRight, X, XCircle, CheckCircle, Clock, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext'; // Assuming this provides generic user info if needed
import ImageLightbox from '../components/ImageLightbox';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function StaffAttendance() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { role: rawRole } = useOutletContext<{ role: string }>() || { role: null };
    const contextRole = (rawRole || '').toLowerCase().trim();

    const [coachesList, setCoachesList] = useState<any[]>([]);
    const [loadingCoaches, setLoadingCoaches] = useState(true);
    const [searchStaff, setSearchStaff] = useState('');

    // History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [ptAttendance, setPtAttendance] = useState<any[]>([]);
    const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const fetchCoachesStatus = async () => {
        try {
            setLoadingCoaches(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Get all coaches
            const { data: coaches, error: coachesError } = await supabase
                .from('coaches')
                .select('id, full_name, avatar_url, role')
                .order('full_name');

            if (coachesError) throw coachesError;

            // 2. Get today's attendance
            const { data: attendance, error: attendanceError } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('date', today);

            if (attendanceError) throw attendanceError;

            // 3. Merge data
            const merged = (coaches || [])
                .filter(coach => {
                    const coachRole = (coach.role || '').toLowerCase().trim();

                    // Always hide Admin from Staff Attendance list
                    if (coachRole === 'admin') return false;

                    if (contextRole === 'head_coach') {
                        return coachRole !== 'reception' && coachRole !== 'receptionist' && coachRole !== 'cleaner';
                    }
                    return true;
                })
                .map(coach => {
                    // Filter attendance records for this coach
                    const coachRecords = attendance?.filter(a => a.coach_id === coach.id) || [];

                    // Prioritize ACTIVE record (no check_out_time)
                    // If none, sort by created_at/id to get the latest one
                    let record = coachRecords.find(a => !a.check_out_time);

                    if (!record && coachRecords.length > 0) {
                        // No active record, take the last one (latest)
                        // Assuming newer records have higher IDs or later timestamps
                        // Since we didn't sort the fetch, let's sort locally or assume order
                        // Ideally checking IDs or check_in_time is safer
                        record = coachRecords.sort((a, b) => new Date(b.created_at || b.check_in_time).getTime() - new Date(a.created_at || a.check_in_time).getTime())[0];
                    }

                    let status = 'pending';
                    if (record) {
                        if (record.status === 'absent') status = 'absent';
                        else if (record.check_out_time) status = 'completed';
                        else status = 'present';
                    }

                    // Calculate total time:
                    // If active: Sum of ALL completed sessions today + current session elapsed (handled by LiveTimer)
                    // If not active: Sum of ALL completed sessions today
                    let totalMinutes = 0;
                    coachRecords.forEach(r => {
                        if (r.check_in_time && r.check_out_time) {
                            const checkIn = new Date(r.check_in_time);
                            const checkOut = new Date(r.check_out_time);
                            totalMinutes += Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
                        }
                    });

                    // For the ACTIVE record, totalMinutes passed to LiveTimer should be the sum of PREVIOUS sessions
                    // LiveTimer adds the current session's elapsed time to this initialMinutes

                    return {
                        ...coach,
                        status,
                        attendanceId: record?.id,
                        checkInTime: record?.check_in_time,
                        checkOutTime: record?.check_out_time,
                        totalMinutes
                    };
                });

            setCoachesList(merged);
        } catch (error) {
            console.error('Error fetching coaches:', error);
            toast.error('Failed to load staff list');
        } finally {
            setLoadingCoaches(false);
        }
    };

    useEffect(() => {
        fetchCoachesStatus();
        const sub = supabase
            .channel('staff_attendance_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_attendance' }, () => {
                fetchCoachesStatus();
            })
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const filteredCoaches = useMemo(() => {
        if (!searchStaff.trim()) return coachesList;
        const query = searchStaff.toLowerCase().trim();
        return coachesList.filter(c =>
            c.full_name?.toLowerCase().includes(query)
        );
    }, [coachesList, searchStaff]);

    // Handle marking staff as absent (reception can only mark absent, not present)
    const handleMarkAbsent = async (coachId: string) => {
        if (processingIds.has(coachId)) return;

        const today = format(new Date(), 'yyyy-MM-dd');
        setProcessingIds(prev => new Set(prev).add(coachId));

        try {
            const { data: existing, error: fetchError } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .eq('date', today)
                .maybeSingle();

            if (fetchError) throw fetchError;

            const payload: any = {
                coach_id: coachId,
                date: today,
                status: 'absent',
                check_in_time: null,
                check_out_time: null
            };

            let saveError;
            if (existing) {
                const { error } = await supabase
                    .from('coach_attendance')
                    .update(payload)
                    .eq('id', existing.id);
                saveError = error;
            } else {
                const { error } = await supabase
                    .from('coach_attendance')
                    .insert(payload);
                saveError = error;
            }

            if (saveError) throw saveError;

            // Local success toast removed to allow global notification system to take over
            // toast.success(t('common.saved'));
        } catch (e: any) {
            console.error('Error marking absent:', e);
            toast.error(e.message || 'Error marking absent');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(coachId);
                return next;
            });
        }
    };

    // Handle marking staff as present (only for cleaners)
    const handleMarkPresent = async (coachId: string) => {
        if (processingIds.has(coachId)) return;

        const today = format(new Date(), 'yyyy-MM-dd');
        setProcessingIds(prev => new Set(prev).add(coachId));

        try {
            const { data: existing, error: fetchError } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .eq('date', today)
                .maybeSingle();

            if (fetchError) throw fetchError;

            const payload: any = {
                coach_id: coachId,
                date: today,
                status: 'present',
                check_in_time: new Date().toISOString(),
                check_out_time: null
            };

            let saveError;
            if (existing) {
                const { error } = await supabase
                    .from('coach_attendance')
                    .update(payload)
                    .eq('id', existing.id);
                saveError = error;
            } else {
                const { error } = await supabase
                    .from('coach_attendance')
                    .insert(payload);
                saveError = error;
            }

            if (saveError) throw saveError;

            // Local success toast removed to allow global notification system to take over
            // toast.success(t('common.saved'));
        } catch (e: any) {
            console.error('Error marking present:', e);
            toast.error(e.message || 'Error marking present');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(coachId);
                return next;
            });
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-2">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group w-fit"
                >
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold uppercase tracking-wider text-xs">Back to Dashboard</span>
                </button>
                <PageHeader
                    title="Staff Attendance"
                    subtitle="Monitor coaches and staff presence"
                >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative group w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-white/30 group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchStaff}
                                onChange={(e) => setSearchStaff(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary block w-full sm:w-64 pl-10 p-3 transition-all"
                            />
                        </div>
                    </div>
                </PageHeader>
            </div>

            {/* Staff Cards Grid */}
            <div className="glass-card rounded-2xl border border-white/10 p-6">
                {loadingCoaches ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCoaches.map((coach) => (
                            <div key={coach.id}
                                onClick={() => {
                                    setSelectedCoachId(coach.id);
                                    setShowHistoryModal(true);
                                }}
                                className={`group relative flex flex-col p-5 rounded-[2.5rem] border transition-all duration-700 hover:scale-[1.02] cursor-pointer overflow-hidden aspect-[1/1.3]
                                    ${coach.status === 'present'
                                        ? 'bg-gradient-to-br from-[#102a20] via-[#0a1612] to-[#050b09] border-emerald-500/20 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.3)]'
                                        : coach.status === 'absent'
                                            ? 'bg-gradient-to-br from-[#2a1010] via-[#160a0a] to-[#0b0505] border-rose-500/20 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.3)]'
                                            : 'glass-card border-white/5 hover:border-white/10 shadow-2xl shadow-black/40'}`}
                            >
                                {/* Background Decorative Layer */}
                                <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px] opacity-10 transition-all duration-1000
                                    ${coach.status === 'present' ? 'bg-emerald-500 group-hover:opacity-30' :
                                        coach.status === 'absent' ? 'bg-rose-500 group-hover:opacity-30' :
                                            'bg-white/5 group-hover:opacity-10'}`} />

                                {/* Header: Identity Information */}
                                <div className="relative z-10 flex flex-col items-center text-center gap-0.5 mb-4">
                                    <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase truncate max-w-full drop-shadow-lg">
                                        {coach.full_name}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1 h-1 rounded-full ${coach.status === 'present' ? 'bg-emerald-500' : coach.status === 'absent' ? 'bg-rose-500' : 'bg-white/20'}`} />
                                        <span className="text-[7.5px] font-black text-white/30 uppercase tracking-[0.25em]">{coach.role || 'Staff Member'}</span>
                                    </div>
                                </div>

                                {/* Center: Large Avatar & Status Indicator */}
                                <div className="relative z-10 flex flex-col items-center justify-center mb-6">
                                    <div className={`relative w-32 h-32 rounded-3xl p-1 border transition-all duration-700
                                        ${coach.status === 'present' ? 'border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-105' :
                                            coach.status === 'absent' ? 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]' :
                                                'border-white/10 bg-white/[0.02]'}`}>

                                        <div className="w-full h-full rounded-2xl overflow-hidden bg-black/40 border border-white/5">
                                            {coach.avatar_url ? (
                                                <img
                                                    src={coach.avatar_url}
                                                    alt=""
                                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEnlargedImage(coach.avatar_url);
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="font-black text-white/5 text-4xl italic">{coach.full_name[0]}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Activity Pulse for Active Coaches */}
                                        {coach.status === 'present' && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40 backdrop-blur-md">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer: Structured Information Grid - 3 Columns */}
                                <div className="relative z-10 grid grid-cols-3 gap-px bg-white/[0.08] border border-white/5 rounded-2xl overflow-hidden mt-auto shadow-inner">
                                    {/* Checked In Time */}
                                    <div className="flex flex-col items-center justify-center p-1.5 py-3 bg-[#0a0a0a]/40 backdrop-blur-sm group-hover:bg-[#0a0a0a]/10 transition-colors">
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">In</span>
                                        <span className={`text-[10px] font-black tracking-tight ${coach.checkInTime ? 'text-white' : 'text-white/10'}`}>
                                            {coach.checkInTime ? format(new Date(coach.checkInTime), 'HH:mm') : '--:--'}
                                        </span>
                                    </div>

                                    {/* Checked Out Time */}
                                    <div className="flex flex-col items-center justify-center p-1.5 py-3 bg-[#0a0a0a]/50 backdrop-blur-sm group-hover:bg-[#0a0a0a]/15 transition-colors">
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">Out</span>
                                        <span className={`text-[10px] font-black tracking-tight ${coach.checkOutTime ? 'text-white' : 'text-white/10'}`}>
                                            {coach.checkOutTime ? format(new Date(coach.checkOutTime), 'HH:mm') : '--:--'}
                                        </span>
                                    </div>

                                    {/* Duration / Total Time */}
                                    <div className="flex flex-col items-center justify-center p-1.5 py-3 bg-[#0a0a0a]/60 backdrop-blur-sm group-hover:bg-[#0a0a0a]/20 transition-colors">
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">Time</span>
                                        {coach.status === 'present' && coach.checkInTime ? (
                                            <div className="text-[10px] text-emerald-400 font-black">
                                                <LiveTimer startTime={coach.checkInTime} initialMinutes={coach.totalMinutes} />
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-black text-primary/80 tracking-tight">
                                                {coach.totalMinutes > 0
                                                    ? `${Math.floor(coach.totalMinutes / 60)}h ${coach.totalMinutes % 60}m`
                                                    : '0h 00m'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Absolute Overlays for Management Actions */}
                                {(() => {
                                    const isAdminOrHead = contextRole === 'admin' || contextRole === 'head_coach';
                                    const isReception = contextRole === 'reception' || contextRole === 'receptionist';

                                    if (isAdminOrHead) {
                                        return (
                                            <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500 sm:translate-y-4 sm:group-hover:translate-y-0 z-30" onClick={(e) => e.stopPropagation()}>
                                                {coach.status !== 'present' && (
                                                    <button
                                                        onClick={() => handleMarkPresent(coach.id)}
                                                        disabled={processingIds.has(coach.id)}
                                                        className={`px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-emerald-500 text-emerald-950 text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 ${processingIds.has(coach.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {processingIds.has(coach.id) ? (
                                                            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-emerald-950/30 border-t-emerald-950 rounded-full animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{processingIds.has(coach.id) ? '...' : 'In'}</span>
                                                    </button>
                                                )}
                                                {coach.status !== 'absent' && (
                                                    <button
                                                        onClick={() => handleMarkAbsent(coach.id)}
                                                        disabled={processingIds.has(coach.id)}
                                                        className={`px-3 py-2 sm:px-4 sm:py-2 rounded-full bg-rose-500 text-rose-950 text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-2xl shadow-rose-500/40 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 ${processingIds.has(coach.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {processingIds.has(coach.id) ? (
                                                            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-rose-950/30 border-t-rose-950 rounded-full animate-spin" />
                                                        ) : (
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{processingIds.has(coach.id) ? '...' : 'Absent'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    } else if (isReception) {
                                        return (
                                            <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-500 sm:translate-y-4 sm:group-hover:translate-y-0 z-30" onClick={(e) => e.stopPropagation()}>
                                                {coach.status !== 'absent' && coach.status !== 'completed' && (
                                                    <button
                                                        onClick={() => handleMarkAbsent(coach.id)}
                                                        disabled={processingIds.has(coach.id)}
                                                        className={`px-5 py-2 sm:px-6 sm:py-2 rounded-full bg-rose-500 text-rose-950 text-[8px] sm:text-[9px] font-black uppercase tracking-widest shadow-2xl shadow-rose-500/40 hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 ${processingIds.has(coach.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {processingIds.has(coach.id) ? (
                                                            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-rose-950/30 border-t-rose-950 rounded-full animate-spin" />
                                                        ) : (
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{processingIds.has(coach.id) ? '...' : 'Mark Absent'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Attendance History Modal */}
            {
                showHistoryModal && selectedCoachId && (
                    <StaffAttendanceHistoryModal
                        coachId={selectedCoachId}
                        onClose={() => {
                            setShowHistoryModal(false);
                            setSelectedCoachId(null);
                        }}
                    />
                )
            }

            {/* Image Lightbox Modal */}
            <ImageLightbox
                imageUrl={enlargedImage}
                onClose={() => setEnlargedImage(null)}
            />
        </div >
    );
}

// Live Timer Component
// Live Timer Component
function LiveTimer({ startTime, initialMinutes = 0 }: { startTime: string; initialMinutes?: number }) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        const calculateElapsed = () => {
            const start = new Date(startTime).getTime();
            const now = new Date().getTime();
            const diffMs = now - start;
            return Math.max(0, Math.floor(diffMs / 1000));
        };

        setElapsedSeconds(calculateElapsed());

        const interval = setInterval(() => {
            setElapsedSeconds(calculateElapsed());
        }, 1000); // 1s update

        return () => clearInterval(interval);
    }, [startTime]);

    const totalSeconds = (initialMinutes * 60) + elapsedSeconds;

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return (
        <span className="text-[9.5px] font-black text-emerald-400 whitespace-nowrap leading-none">
            {h > 0 ? `${h}h ` : ''}{m}m {s}s
        </span>
    );
}

// Staff Attendance History Modal Component
function StaffAttendanceHistoryModal({ coachId, onClose }: { coachId: string, onClose: () => void }) {
    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [coachName, setCoachName] = useState('');

    useEffect(() => {
        fetchHistory();
        fetchCoachName();
    }, [coachId, currentMonth]);

    const fetchCoachName = async () => {
        const { data } = await supabase.from('coaches').select('full_name').eq('id', coachId).single();
        if (data) setCoachName(data.full_name);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            const { data, error } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'));

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getRecordForDay = (day: Date) => {
        return history.find(h => isSameDay(new Date(h.date), day));
    };

    const totalMinutes = useMemo(() => {
        return history.reduce((acc, record) => {
            if (record.check_in_time && record.check_out_time) {
                const diffMs = new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime();
                return acc + Math.max(0, Math.floor(diffMs / 1000 / 60));
            }
            return acc;
        }, 0);
    }, [history]);

    const formatDutyTime = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            {t('reception.attendanceHistory') || 'Attendance History'}
                        </h2>
                        <p className="text-white/40 font-bold uppercase tracking-wider text-[10px] mt-0.5">{coachName || 'Loading...'}</p>
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
                            {/* Empty cells for padding */}
                            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            {monthDays.map((day) => {
                                const record = getRecordForDay(day);
                                const status = record?.status || 'none';
                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all relative group/day
                                    ${isToday(day) ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-[#0E1D21]' : ''}
                                    ${status === 'present' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                status === 'absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                                    'bg-white/5 border-white/5 text-white/20 hover:border-white/10'}`}
                                    >
                                        <span className="text-xs font-black">{format(day, 'd')}</span>
                                        {record && (
                                            <div className="flex flex-col items-center leading-none mt-1">
                                                {record.check_in_time && (
                                                    <span className="text-[9px] font-black text-emerald-400/90 flex items-center gap-0.5">
                                                        <LogIn className="w-2 h-2" />
                                                        {format(new Date(record.check_in_time), 'HH:mm')}
                                                    </span>
                                                )}
                                                {record.check_out_time && (
                                                    <span className="text-[9px] font-black text-rose-400/90 flex items-center gap-0.5">
                                                        <LogOut className="w-2 h-2" />
                                                        {format(new Date(record.check_out_time), 'HH:mm')}
                                                    </span>
                                                )}
                                                {!record.check_in_time && !record.check_out_time && status !== 'none' && (
                                                    <div className="w-1 h-1 rounded-full bg-current mt-1" />
                                                )}
                                            </div>
                                        )}

                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-wider text-white opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all scale-95 group-hover/day:scale-100 z-10 whitespace-nowrap shadow-xl">
                                            {status === 'none' ? 'No Record' : status.toUpperCase()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-emerald-400">
                                {history.filter(h => h.status === 'present').length}
                            </div>
                            <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">Present</div>
                        </div>
                        <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-rose-400">
                                {history.filter(h => h.status === 'absent').length}
                            </div>
                            <div className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest mt-0.5">Absent</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-white/40">
                                {monthDays.length > 0 ? Math.round((history.filter(h => h.status === 'present').length / monthDays.length) * 100) : 0}%
                            </div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">Rate</div>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-primary whitespace-nowrap">
                                {formatDutyTime(totalMinutes)}
                            </div>
                            <div className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-0.5">Duty</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Users, Activity, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Student {
    id: string;
    full_name: string;
    coach_id?: string;
    training_groups?: { name: string };
}

interface Group {
    id: string;
    name: string;
    schedule_key: string;
    coaches?: { id: string, full_name: string };
    students: Student[];
}

interface AttendanceRecord {
    student_id: string;
    check_in_time: string;
    students?: {
        full_name: string;
        coach_id: string;
        training_groups: { name: string }[];
    };
}

export default function LiveStudentsWidget({ coachId }: { coachId?: string | null }) {
    const { t } = useTranslation();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeGroups, setActiveGroups] = useState<Group[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (coachId === null) return; // Wait for coach ID if we're in coach mode

        const today = format(new Date(), 'yyyy-MM-dd');

        // 1. Fetch current check-ins (filtered strictly by coach if needed)
        let attendanceQuery = supabase
            .from('student_attendance')
            .select(`
                student_id, 
                check_in_time,
                students!inner (
                    full_name,
                    coach_id,
                    training_groups ( name )
                )
            `)
            .eq('date', today)
            .is('check_out_time', null);

        if (coachId) {
            attendanceQuery = attendanceQuery.eq('students.coach_id', coachId);
        }

        const { data: attendanceData } = await attendanceQuery;
        setAttendance((attendanceData as any[]) || []);

        // 2. Fetch groups with students
        let groupsQuery = supabase
            .from('training_groups')
            .select(`
                *,
                coaches(id, full_name, role),
                students!inner(id, full_name, coach_id)
            `);

        if (coachId) {
            groupsQuery = groupsQuery.eq('coach_id', coachId);
        }

        const { data: groupsData } = await groupsQuery;

        if (groupsData) {
            const currentDay = format(currentTime, 'eeee').toLowerCase(); // e.g. 'monday'
            const timeStr = format(currentTime, 'HH:mm');

            const active = (groupsData as any[]).filter((group) => {
                // Filter out non-coaching roles
                const coachRole = group.coaches?.role?.toLowerCase().trim();
                if (coachRole === 'reception' || coachRole === 'receptionist' || coachRole === 'cleaner') return false;

                if (!group.schedule_key) return false;
                const sessions = group.schedule_key.split('|');
                return sessions.some((s: string) => {
                    const parts = s.split(':');
                    if (parts.length < 3) return false;

                    // Robust day matching (supports 'mon', 'monday', etc)
                    const dayTag = parts[0].toLowerCase();
                    if (!currentDay.startsWith(dayTag) && !dayTag.startsWith(currentDay.substring(0, 3))) return false;

                    const startTime = `${parts[1]}:${parts[2]}`;
                    // Default to 1 hour if no end time in key
                    let endTime = parts.length >= 5 ? `${parts[3]}:${parts[4]}` : `${(parseInt(parts[1]) + 1).toString().padStart(2, '0')}:${parts[2]}`;

                    return timeStr >= startTime && timeStr <= endTime;
                });
            });

            setActiveGroups(active);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        const channel = supabase.channel('live_floor_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'training_groups' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
            .subscribe();

        const timer = setInterval(() => setCurrentTime(new Date()), 60000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(timer);
        };
    }, [coachId]);

    // Re-check schedule when minute changes
    useEffect(() => {
        fetchData();
    }, [currentTime.getMinutes()]);

    const otherCheckedIn = attendance.filter(record =>
        !activeGroups.some(group => group.students.some(s => s.id === record.student_id))
    );

    const presentInActiveGroupsCount = activeGroups.reduce((acc, g) =>
        acc + g.students.filter(s => attendance.some(a => a.student_id === s.id)).length, 0
    );

    return (
        <div className="relative group flex flex-col h-full p-6 rounded-[2rem] glass-card backdrop-blur-3xl border border-surface-border shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700">
            {/* Interior Glass Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-1000`}></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 relative shrink-0 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Activity className="w-5 h-5 relative z-10" />
                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-black text-base uppercase tracking-tight leading-none flex items-center gap-2">
                            {t('dashboard.liveFloor', 'Live Floor')}
                            <span className="flex h-1.5 w-1.5 relative shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 ${activeGroups.length === 0 ? 'hidden' : ''}`}></span>
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${activeGroups.length === 0 ? 'bg-white/20' : 'bg-emerald-500'}`}></span>
                            </span>
                        </h2>
                        <p className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mt-1">
                            {presentInActiveGroupsCount} {t('dashboard.gymnastsOnFloor', 'Gymnasts')}
                        </p>
                    </div>
                </div>
            </div>

            {/* List of Active Groups */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 relative z-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 opacity-30">
                        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Syncing...</span>
                    </div>
                ) : activeGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center grayscale opacity-30 border border-dashed border-surface-border rounded-2xl">
                        <Users className="w-8 h-8 mb-4" />
                        <p className="font-black uppercase tracking-widest text-[9px]">{t('dashboard.noSessionsNow', 'No active sessions')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeGroups.map((group) => (
                            <div key={group.id} className="relative">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-emerald-500/50 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                                        <div>
                                            <h3 className="font-black text-base uppercase tracking-tight text-[11px]">
                                                {group.name}
                                            </h3>
                                        </div>
                                    </div>
                                    <span className="text-[7px] font-black text-muted uppercase tracking-tighter">
                                        {group.students.filter(s => attendance.some(a => a.student_id === s.id)).length}/{group.students.length} IN
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-3 border-l border-surface-border">
                                    {group.students?.sort((a, b) => {
                                        const aP = attendance.some(att => att.student_id === a.id);
                                        const bP = attendance.some(att => att.student_id === b.id);
                                        return (aP === bP) ? 0 : aP ? -1 : 1;
                                    }).slice(0, 4).map((student) => {
                                        const record = attendance.find(a => a.student_id === student.id);
                                        const isPresent = !!record;

                                        return (
                                            <div key={student.id} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${isPresent ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-surface-border/10 border-surface-border opacity-40'}`}>
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[9px] flex-shrink-0 ${isPresent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-border/20 text-muted'}`}>
                                                    {student.full_name?.charAt(0) || '?'}
                                                </div>
                                                <p className={`text-[9px] font-bold truncate ${isPresent ? 'text-base' : 'text-muted'}`}>
                                                    {student.full_name}
                                                </p>
                                            </div>
                                        );
                                    })}
                                    {group.students.length > 4 && (
                                        <div className="p-2 rounded-xl bg-surface-border/10 border border-surface-border flex items-center justify-center">
                                            <span className="text-[7px] font-black text-muted uppercase tracking-widest">+{group.students.length - 4} More</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Decorative Background Effects */}
            <div className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-opacity duration-1000 bg-emerald-500/5 opacity-30`}></div>
        </div >
    );
}


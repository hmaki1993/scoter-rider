import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, subMonths, addMonths } from 'date-fns';
import { Users, User, Search, ChevronLeft, Calendar, CheckCircle, XCircle, ChevronRight, X, MessageSquare, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import AddManualStudentModal from '../components/AddManualStudentModal';
import PageHeader from '../components/PageHeader';
import toast from 'react-hot-toast';

export default function StudentAttendance() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { role: rawRole } = useOutletContext<{ role: string }>() || { role: null };
    const userRole = (rawRole || '').toLowerCase().trim();
    const isReception = userRole === 'reception' || userRole === 'receptionist';

    const [todaysClasses, setTodaysClasses] = useState<any[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [searchGymnast, setSearchGymnast] = useState('');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
    const [showManualModal, setShowManualModal] = useState(false);
    const [activeCoachName, setActiveCoachName] = useState<string>('');

    // --- Fetch Logic ---
    const fetchTodaysClasses = async () => {
        try {
            setLoadingClasses(true);
            const todayIdx = new Date().getDay(); // 0 = Sunday
            const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const todayDay = dayMap[todayIdx];
            const dateStr = format(new Date(), 'yyyy-MM-dd');

            // 1. Fetch Students (Include Groups)
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select(`
                    *,
                    coaches(full_name, avatar_url),
                    subscription_plans(name, sessions_limit),
                    training_groups(
                        *,
                        coaches(full_name, avatar_url)
                    )
                `)
                .eq('is_active', true); // Only active students

            if (studentsError) throw studentsError;

            // 2. Fetch Attendance
            const { data: attendance, error: attendanceError } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('date', dateStr);

            if (attendanceError) throw attendanceError;

            // 3. Merge & Filter
            const merged = (students || [])
                .map(student => {
                    const record = attendance?.find(a => a.student_id === student.id);

                    // Filter out PT students
                    const type = student.training_type?.toLowerCase() || '';
                    if (type.includes('pt') || type.includes('personal training')) return null;

                    const plan = (student as any).subscription_plans;

                    // CHECK 1: Group Logic Priority
                    let scheduledStart = '';
                    let displayCoach = '';
                    let coachAvatar = '';
                    let shouldShow = false;

                    if (student.training_groups) {
                        const group = student.training_groups;
                        const scheduleKey = group.schedule_key?.toLowerCase() || '';

                        // Rigorous day matching
                        const scheduleParts = scheduleKey.split('|').map((p: string) => p.trim());
                        const todayPart = scheduleParts.find((p: string) => {
                            const dayTag = p.split(':')[0];
                            return dayTag === todayDay || dayTag === (dayMap[todayIdx] === 'sun' ? 'sunday' :
                                dayMap[todayIdx] === 'mon' ? 'monday' :
                                    dayMap[todayIdx] === 'tue' ? 'tuesday' :
                                        dayMap[todayIdx] === 'wed' ? 'wednesday' :
                                            dayMap[todayIdx] === 'thu' ? 'thursday' :
                                                dayMap[todayIdx] === 'fri' ? 'friday' : 'saturday');
                        });

                        if (todayPart) {
                            shouldShow = true;
                            const timeMatch = todayPart.split(':').map((s: string) => s.trim());
                            if (timeMatch.length >= 3) {
                                scheduledStart = `${timeMatch[1]}:${timeMatch[2]}`;
                            }
                        }

                        // Use Group Coach (even if not scheduled today, for name context)
                        displayCoach = group.coaches?.full_name || 'Group Coach';
                        coachAvatar = group.coaches?.avatar_url || '';
                    } else {
                        // CHECK 2: Individual Logic (Fallback - ONLY if no group)
                        const hasIndividualDay = student.training_days?.includes(todayDay);
                        if (hasIndividualDay) {
                            shouldShow = true;
                            const todaySchedule = student.training_schedule?.find((s: any) => s.day === todayDay);
                            scheduledStart = todaySchedule?.start || '';
                            displayCoach = student.coaches?.full_name || 'Unassigned';
                            coachAvatar = student.coaches?.avatar_url || '';
                        }
                    }

                    // FINAL CHECK: If they have an attendance record for today, ALWAYS show them
                    if (record) {
                        shouldShow = true;
                        // Fill gaps if needed
                        if (!displayCoach) {
                            displayCoach = student.training_groups?.coaches?.full_name || student.coaches?.full_name || 'Unknown';
                            coachAvatar = student.training_groups?.coaches?.avatar_url || student.coaches?.avatar_url || '';
                        }
                    }

                    if (!shouldShow) return null;

                    let status = 'pending';
                    if (record) {
                        if (record.check_out_time) status = 'completed';
                        else if (record.status === 'absent') status = 'absent';
                        else status = 'present';
                    }

                    return {
                        ...student,
                        displayCoach,
                        coachAvatar,
                        groupName: student.training_groups?.name || '',
                        scheduledStart, // Now strictly from Group if applicable
                        status,
                        checkInTime: record?.check_in_time,
                        checkOutTime: record?.check_out_time,
                        originalStatus: record?.status,
                        sessionsLimit: plan?.sessions_limit || 0
                    };
                })
                .filter(Boolean) // Remove nulls (students who shouldn't show)
                .sort((a: any, b: any) => {
                    if (a.scheduledStart !== b.scheduledStart) return (a.scheduledStart || '').localeCompare(b.scheduledStart || '');
                    return a.full_name.localeCompare(b.full_name);
                });

            setTodaysClasses(merged);
        } catch (error) {
            console.error('Error fetching classes:', error);
            toast.error('Failed to load attendance');
        } finally {
            setLoadingClasses(false);
        }
    };

    useEffect(() => {
        fetchTodaysClasses();
        // Subscribe to changes
        const sub = supabase
            .channel('student_attendance_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => fetchTodaysClasses())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'training_groups' }, () => fetchTodaysClasses())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchTodaysClasses())
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const filteredGymnasts = useMemo(() => {
        if (!searchGymnast.trim()) return todaysClasses;
        const query = searchGymnast.toLowerCase().trim();
        return todaysClasses.filter(s => {
            return s.full_name?.toLowerCase().includes(query) ||
                s.displayCoach?.toLowerCase().includes(query);
        });
    }, [todaysClasses, searchGymnast]);

    const groupedGymnasts = useMemo(() => {
        const groups: { [key: string]: { sectionName: string, coachName: string, avatar: string, students: any[] } } = {};
        filteredGymnasts.forEach(s => {
            const isIndividual = !s.groupName;
            const sectionName = isIndividual ? `Individual Training - ${s.displayCoach}` : s.groupName;
            const coach = s.displayCoach || 'No Coach';

            if (!groups[sectionName]) {
                groups[sectionName] = {
                    sectionName: isIndividual ? 'Individual Training' : sectionName,
                    coachName: coach,
                    avatar: s.coachAvatar || '',
                    students: []
                };
            }
            groups[sectionName].students.push(s);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.sectionName === 'Individual Training') return 1;
            if (b.sectionName === 'Individual Training') return -1;
            return a.sectionName.localeCompare(b.sectionName);
        });
    }, [filteredGymnasts]);

    // Handle Status Update with Optimistic UI
    const handleStatusUpdate = async (studentId: string, newStatus: string) => {
        const student = todaysClasses.find(s => s.id === studentId);
        const currentStatus = student?.status;

        // Toggle logic: If clicking the same status, go back to pending (unless it's 'completed')
        const finalStatus = (currentStatus === newStatus && newStatus !== 'completed') ? 'pending' : newStatus;

        // Optimistic Update including session count
        const previousClasses = [...todaysClasses];
        setTodaysClasses(prev => prev.map(s => {
            if (s.id !== studentId) return s;

            let sessions_remaining = s.sessions_remaining;
            const isBecomingPresent = (finalStatus === 'present' || finalStatus === 'completed') && (s.status !== 'present' && s.status !== 'completed');
            const isRevertingFromPresent = (finalStatus === 'pending' || finalStatus === 'absent') && (s.status === 'present' || s.status === 'completed');

            if (isBecomingPresent && sessions_remaining != null && sessions_remaining > 0) {
                sessions_remaining -= 1;
            } else if (isRevertingFromPresent && sessions_remaining != null) {
                sessions_remaining += 1;
            }

            return { ...s, status: finalStatus, sessions_remaining };
        }));

        try {
            // Guard: If it's a mock student, skip the database call (Optimistic UI only)
            if (studentId.toString().startsWith('mock-')) {
                console.log('Skipping DB update for mock student:', studentId);
                return;
            }

            const today = format(new Date(), 'yyyy-MM-dd');
            const targetStatus = finalStatus;

            // Check existing
            const { data: existing } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('student_id', studentId)
                .eq('date', today)
                .maybeSingle();

            const payload: any = {
                student_id: studentId,
                date: today,
                status: targetStatus === 'completed'
                    ? (existing?.status === 'absent' ? 'absent' : 'present')
                    : targetStatus
            };

            if (targetStatus === 'present') {
                if (!existing || !existing.check_in_time) {
                    payload.check_in_time = new Date().toISOString();
                }
                payload.check_out_time = null;
            } else if (targetStatus === 'completed') {
                if (!existing?.check_in_time) payload.check_in_time = new Date().toISOString(); // Auto check-in if missed
                payload.check_out_time = new Date().toISOString();
            } else if (targetStatus === 'pending') {
                // Delete record for pending
                const { error: delError } = await supabase
                    .from('student_attendance')
                    .delete()
                    .eq('student_id', studentId)
                    .eq('date', today);

                if (delError) throw delError;
                toast.success(t('common.saved'));
                return;
            } else if (targetStatus === 'absent') {
                payload.check_in_time = null;
                payload.check_out_time = null;
            }


            // --- Session Counting Logic ---
            const willBePresent = (targetStatus === 'present' || targetStatus === 'completed');
            const wasPresent = (existing?.status === 'present' || (existing?.status === 'absent' && existing?.check_out_time)); // Legacy check

            // Refined Check: If we are moving to a present/completed state from anything else
            if (willBePresent && (!existing || existing.status === 'absent' || (!existing.status && !existing.check_in_time))) {
                // Fetch the student's current sessions_remaining to ensure accuracy
                const { data: studentData } = await supabase
                    .from('students')
                    .select('sessions_remaining')
                    .eq('id', studentId)
                    .single();

                if (studentData && studentData.sessions_remaining !== null && studentData.sessions_remaining > 0) {
                    await supabase
                        .from('students')
                        .update({ sessions_remaining: studentData.sessions_remaining - 1 })
                        .eq('id', studentId);
                }
            } else if ((targetStatus === 'pending' || targetStatus === 'absent') && (existing?.status === 'present' || existing?.check_in_time)) {
                // UNDO logic: If we are going from present/completed back to pending/absent, increment sessions
                const { data: studentData } = await supabase
                    .from('students')
                    .select('sessions_remaining')
                    .eq('id', studentId)
                    .single();

                if (studentData && studentData.sessions_remaining !== null) {
                    await supabase
                        .from('students')
                        .update({ sessions_remaining: studentData.sessions_remaining + 1 })
                        .eq('id', studentId);
                }
            }

            const { error } = await supabase
                .from('student_attendance')
                .upsert(existing ? { ...existing, ...payload } : payload);

            if (error) throw error;
            toast.success(t('common.saved'));
        } catch (err) {
            console.error(err);
            toast.error('Error updating status');
        }
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

    return (
        <div className="p-3 sm:p-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
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
                    title="Student Attendance"
                    subtitle="Manage daily gymnast check-ins"
                >
                    <div className="flex items-center w-full sm:w-auto">
                        <div className="relative group flex items-center w-full">
                            <div className="absolute left-3 sm:-left-10 w-10 h-10 flex items-center justify-center pointer-events-none group-focus-within:bg-primary/10 rounded-full transition-all duration-500">
                                <Search className="h-4 w-4 text-white/20 group-focus-within:text-primary group-focus-within:scale-110 transition-all" />
                            </div>
                            <input
                                type="text"
                                placeholder={i18n.language === 'ar' ? 'بحث...' : 'SEARCH...'}
                                value={searchGymnast}
                                onChange={(e) => setSearchGymnast(e.target.value)}
                                className="bg-white/[0.03] border-b border-white/10 text-white text-base font-black rounded-none focus:ring-0 focus:border-primary block w-full sm:w-72 px-10 sm:px-4 py-3 transition-all placeholder:text-white/10 text-center tracking-[0.2em] uppercase"
                            />
                        </div>
                    </div>
                </PageHeader>
            </div>

            {/* Attendance Sections */}
            <div className="space-y-8 sm:space-y-12">
                {loadingClasses ? (
                    <div className="glass-card rounded-2xl border border-white/10 p-20 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : groupedGymnasts.length === 0 ? (
                    <div className="glass-card rounded-2xl border border-white/10 p-20 text-center text-white/30 font-medium">
                        No students found for today.
                    </div>
                ) : (
                    groupedGymnasts.map(({ sectionName, coachName, avatar, students }) => (
                        <div key={sectionName} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Group Header Section */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                    <div className="relative group/coach shrink-0">
                                        <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-lg opacity-0 group-hover/coach:opacity-100 transition-opacity"></div>
                                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl relative overflow-hidden">
                                            {avatar ? (
                                                <img src={avatar} alt={coachName} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none mb-1 truncate">
                                            {sectionName}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            <div className="flex items-center gap-2 bg-primary/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-primary/20 shadow-lg shadow-primary/5">
                                                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary animate-pulse" />
                                                <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest truncate max-w-[80px] sm:max-w-none">{coachName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                                <span className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.15em] sm:tracking-[0.2em] whitespace-nowrap">
                                                    {students.length} {i18n.language === 'ar' ? 'لاعب' : 'Athletes'}
                                                </span>
                                                <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-primary/40 shrink-0"></div>
                                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.15em] sm:tracking-[0.2em] whitespace-nowrap">
                                                    {students.filter((s: any) => s.status === 'present' || s.status === 'completed').length} Present
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setActiveCoachName(coachName);
                                        setShowManualModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/30 transition-all group/addbtn"
                                >
                                    <Plus className="w-3.5 h-3.5 text-white/40 group-hover/addbtn:text-primary" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest group-hover/addbtn:text-white">
                                        {i18n.language === 'ar' ? 'إضافة لاعب' : 'Add Member'}
                                    </span>
                                </button>
                            </div>

                            {/* Students Grid Under Coach */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {students.map((student) => (
                                    <div key={student.id}
                                        onClick={() => {
                                            setSelectedStudentId(student.id);
                                            setSelectedStudentName(student.full_name);
                                            setShowHistoryModal(true);
                                        }}
                                        className={`group relative flex flex-col p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border transition-all duration-500 cursor-pointer backdrop-blur-md overflow-hidden
                                            ${student.status === 'present' ? 'bg-[#0E1D21]/90 border-emerald-500/40 shadow-[0_20px_40px_rgba(16,185,129,0.1)]' :
                                                student.status === 'completed' ? 'bg-white/5 border-white/5 opacity-50 grayscale-[0.5]' :
                                                    student.status === 'absent' ? 'bg-[#0E1D21]/90 border-rose-500/40 opacity-80' :
                                                        'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1'}`}
                                    >
                                        {/* Status Glow Indicator */}
                                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] transition-opacity duration-1000 
                                            ${student.status === 'present' ? 'bg-emerald-500/20 opacity-100' :
                                                student.status === 'absent' ? 'bg-rose-500/10 opacity-100' : 'bg-transparent opacity-0'}`} />

                                        {/* Row 1: Time & Basic Info */}
                                        <div className="flex items-start justify-between relative z-10 mb-6">
                                            <div className="flex flex-col gap-1.5">
                                                <div className={`px-2.5 py-1.4 rounded-lg border text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 w-fit
                                                     ${student.status === 'present' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                        student.status === 'absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                                            'bg-white/5 border-white/5 text-white/80'}`}>
                                                    <Calendar className="w-3 h-3 opacity-30" />
                                                    <span>{formatTime(student.scheduledStart) || '--:--'}</span>
                                                </div>
                                                {student.groupName && (
                                                    <div className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest w-fit">
                                                        {student.groupName}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sessions Left Mini Badge */}
                                            <div className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tighter
                                                ${student.sessions_remaining <= 2 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                                {student.sessions_remaining ?? 0} Left
                                            </div>
                                        </div>

                                        {/* Row 2: Name */}
                                        <div className="relative z-10 mb-5">
                                            <h3 className="text-lg font-black text-white leading-tight tracking-tight mb-0.5 group-hover:text-primary transition-colors">
                                                {student.full_name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 opacity-40">
                                                <Users className="w-2.5 h-2.5" />
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                                                    {student.training_type || 'GYMNAST'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 2.2: Weekly Schedule Badges */}
                                        <div className="flex items-center gap-1 mb-6 relative z-10">
                                            {['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'].map((day) => {
                                                const fullDayMap: { [key: string]: string } = {
                                                    'sun': 'sunday', 'mon': 'monday', 'tue': 'tuesday',
                                                    'wed': 'wednesday', 'thu': 'thursday', 'fri': 'friday', 'sat': 'saturday'
                                                };
                                                const fullDayName = fullDayMap[day];
                                                const scheduleKey = student.training_groups?.schedule_key || '';
                                                const isActive = student.training_days?.includes(day) ||
                                                    (typeof scheduleKey === 'string' && (
                                                        scheduleKey.toLowerCase().includes(day) ||
                                                        scheduleKey.toLowerCase().includes(fullDayName)
                                                    ));

                                                const dayLabels: { [key: string]: string } = {
                                                    sat: 'S', sun: 'S', mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F'
                                                };
                                                // Unique identification for Sat vs Sun, Tue vs Thu
                                                const uniqueLabels: { [key: string]: string } = {
                                                    sat: 'Sa', sun: 'Su', mon: 'M', tue: 'Tu', wed: 'W', thu: 'Th', fri: 'F'
                                                };
                                                return (
                                                    <div
                                                        key={day}
                                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-[8px] sm:text-[9px] font-black uppercase transition-all duration-500
                                                            ${isActive
                                                                ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)] scale-105 sm:scale-110 z-10'
                                                                : 'bg-white/5 text-white/10 border border-white/5'}`}
                                                        title={day}
                                                    >
                                                        {uniqueLabels[day]}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Row 3: Actions row with improved organization */}
                                        <div className="mt-auto pt-5 border-t border-white/[0.04] flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                {student.status === 'completed' ? (
                                                    <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl 
                                                        ${student.originalStatus === 'absent'
                                                            ? 'bg-rose-500/5 border-rose-500/10'
                                                            : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                                                        {student.originalStatus === 'absent' ? (
                                                            <XCircle className="w-3.5 h-3.5 text-rose-500/50" />
                                                        ) : (
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500/50" />
                                                        )}
                                                        <span className={`text-[8px] font-black uppercase tracking-widest 
                                                            ${student.originalStatus === 'absent' ? 'text-rose-500/40' : 'text-emerald-500/40'}`}>
                                                            Done
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 w-full justify-between">
                                                        <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-full">
                                                            {/* Present Button - Always visible for authorized roles */}
                                                            <button
                                                                onClick={() => handleStatusUpdate(student.id, 'present')}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
                                                                    ${student.status === 'present'
                                                                        ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                                                        : 'text-emerald-500/40 hover:text-emerald-400'}`}
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>

                                                            {/* Absent Button - Always visible */}
                                                            <button
                                                                onClick={() => handleStatusUpdate(student.id, 'absent')}
                                                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
                                                                    ${student.status === 'absent'
                                                                        ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                                                                        : 'text-rose-500/40 hover:text-rose-400'}`}
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        {/* Check Out Action - Always visible for authorized roles */}
                                                        {(student.status === 'present' || student.status === 'absent') && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(student.id, 'completed')}
                                                                className="px-4 h-9 rounded-full bg-white text-black font-black uppercase text-[8px] tracking-[0.2em] hover:bg-primary hover:text-white transition-all shadow-lg shadow-black/20 flex items-center gap-2 active:scale-95"
                                                            >
                                                                <span>Done</span>
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showHistoryModal && selectedStudentId && (
                <StudentHistoryModal
                    studentId={selectedStudentId}
                    studentName={selectedStudentName || 'Student'}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}

            {showManualModal && (
                <AddManualStudentModal
                    coachName={activeCoachName}
                    excludeIds={todaysClasses.map(s => s.id)}
                    onClose={() => setShowManualModal(false)}
                    onSuccess={fetchTodaysClasses}
                />
            )}
        </div>
    );
}

function StudentHistoryModal({ studentId, studentName, onClose }: { studentId: string, studentName: string, onClose: () => void }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [currentMonth, studentId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            const { data, error } = await supabase
                .from('student_attendance') // Changed from 'class_attendance' to 'student_attendance'
                .select('*')
                .eq('student_id', studentId)
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
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const blanks = Array(startDay).fill(null);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
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
                                let statusClass = 'bg-white/5 border-white/5 text-white/20';
                                let statusText = 'NO RECORD';

                                if (record) {
                                    if (record.status === 'present' || record.status === 'completed') {
                                        statusClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                        statusText = 'PRESENT';
                                    } else if (record.status === 'absent') {
                                        statusClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
                                        statusText = 'ABSENT';
                                    }
                                }

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all relative group/day
                                    ${isToday(day) ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-[#0E1D21]' : ''}
                                    ${statusClass}`}
                                    >
                                        <span className="text-xs font-black">{format(day, 'd')}</span>
                                        {record && (
                                            <div className="flex flex-col items-center leading-none mt-1">
                                                {record.status === 'absent' ? (
                                                    <XCircle className="w-3 h-3" />
                                                ) : (
                                                    <span className="text-[9px] font-black text-white">
                                                        {record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : ''}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-wider text-white opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all scale-95 group-hover/day:scale-100 z-10 whitespace-nowrap shadow-xl">
                                            {statusText}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-emerald-400">
                                {history.filter(h => h.status === 'present' || h.status === 'completed').length}
                            </div>
                            <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">Present</div>
                        </div>
                        <div className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl text-center">
                            <div className="text-xl font-black text-rose-400">
                                {history.filter(h => h.status === 'absent').length}
                            </div>
                            <div className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest mt-0.5">Absent</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


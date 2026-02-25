import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { X, Send, FileText, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

interface MonthlyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: {
        id: number;
        full_name: string;
        contact_number?: string;
        parent_contact?: string;
    };
    currentUserRole: string; // 'admin' | 'head_coach'
    items?: any;
}

export default function MonthlyReportModal({ isOpen, onClose, student, currentUserRole }: MonthlyReportModalProps) {
    const { t } = useTranslation();
    const { settings } = useTheme();
    const academyName = settings.academy_name || 'Academy System';
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
    const [monthlyAssessments, setMonthlyAssessments] = useState<any[]>([]);
    const [evaluations, setEvaluations] = useState({
        technical: '',
        behavior: '',
        notes: ''
    });

    // Fetch attendance stats when month or student changes
    useEffect(() => {
        if (isOpen && student?.id) {
            calculateAttendanceStats();
        }
    }, [isOpen, student, selectedMonth]);

    const calculateAttendanceStats = async () => {
        setCalculating(true);
        try {
            const date = new Date(selectedMonth);
            const startStr = startOfMonth(date).toISOString();
            const endStr = endOfMonth(date).toISOString();

            // Fetch attendance records for this student in this month
            const { data, error } = await supabase
                .from('student_attendance')
                .select('status, date')
                .eq('student_id', student.id)
                .gte('date', startStr)
                .lte('date', endStr);

            if (error) throw error;

            const present = data?.filter(r => r.status === 'present' || r.status === 'completed').length || 0;
            const absent = data?.filter(r => r.status === 'absent').length || 0;

            setStats({
                present,
                absent,
                total: present + absent
            });
            setAttendanceRecords(data || []);

            // Fetch assessments for this student in this month
            const { data: assessData, error: assessError } = await supabase
                .from('skill_assessments')
                .select('*')
                .eq('student_id', student.id)
                .gte('date', startStr)
                .lte('date', endStr)
                .order('date', { ascending: true });

            if (assessError) throw assessError;
            setMonthlyAssessments(assessData || []);

        } catch (error) {
            console.error('Error calculating stats:', error);
            toast.error('Failed to calculate attendance');
        } finally {
            setCalculating(false);
        }
    };

    const handleSendReport = async () => {
        if (!stats.total && !evaluations.technical) {
            toast.error('Please add some data to the report');
            return;
        }

        setLoading(true);
        try {
            // 1. Save Report to Database
            const { error: saveError } = await supabase
                .from('monthly_reports')
                .insert({
                    student_id: student.id,
                    month_year: selectedMonth,
                    attendance_count: stats.present,
                    absence_count: stats.absent,
                    technical_evaluation: evaluations.technical,
                    behavior_evaluation: evaluations.behavior,
                    is_sent: true
                });

            if (saveError) throw saveError;

            // 2. Prepare WhatsApp Message
            const monthName = format(new Date(selectedMonth), 'MMMM yyyy');

            const message = `
*${academyName} - Monthly Report* 🤸‍♂️
----------------------------------
📅 *Month:* ${monthName}
👤 *Gymnast:* ${student.full_name}

📊 *Attendance Summary:*
✅ Present: ${stats.present} sessions
${attendanceRecords.filter(r => r.status === 'present' || r.status === 'completed').length > 0 ? `📅 Dates: ${attendanceRecords.filter(r => r.status === 'present' || r.status === 'completed').map(r => format(new Date(r.date), 'dd/MM')).join(', ')}` : ''}

❌ Absent: ${stats.absent} sessions
${attendanceRecords.filter(r => r.status === 'absent').length > 0 ? `📅 Dates: ${attendanceRecords.filter(r => r.status === 'absent').map(r => format(new Date(r.date), 'dd/MM')).join(', ')}` : ''}
----------------------------------

🏆 *Technical Evaluation:*
${evaluations.technical || 'Excellent progress this month.'}

${monthlyAssessments.length > 0 ? `📊 *Assessment Results:*
${monthlyAssessments.map(a => {
                const skillList = Array.isArray(a.skills)
                    ? a.skills.map((s: any) => `  - ${s.name}: ${s.score}/${s.max_score}`).join('\n')
                    : '';
                return `*${a.title.toUpperCase()}*\n${skillList}\n*Total: ${a.total_score}*`;
            }).join('\n\n')}
` : ''}
📝 *Coach Notes:*
${evaluations.behavior || 'Great attitude and focus!'}

----------------------------------
*Best Regards,*
*${academyName} Team* 🏅
            `.trim();

            // Prioritize the specific "WhatsApp for Reports" field (parent_contact)
            let phoneNumber = student.parent_contact;

            // Fallback to primary contact if parent contact is empty
            if (!phoneNumber || phoneNumber.trim() === '') {
                phoneNumber = student.contact_number;
            }

            // Clean phone number (remove all non-numeric characters)
            const cleanNumber = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';

            console.log('📱 Sending Report - Raw:', phoneNumber, 'Clean:', cleanNumber);

            if (!cleanNumber || cleanNumber.length < 8) {
                toast.error('No valid WhatsApp number found (Check "WhatsApp for Reports" field)');
                return;
            }

            // Ensure country code (default to Kuwait 965 if missing and length is 8)
            let finalNumber = cleanNumber;
            if (finalNumber.length === 8) {
                finalNumber = '965' + finalNumber;
            }

            const codedMsg = encodeURIComponent(message);
            const waUrl = `https://wa.me/${finalNumber}?text=${codedMsg}`;

            // Open WhatsApp
            window.open(waUrl, '_blank');

            toast.success('Report saved & WhatsApp opened!');
            onClose();

        } catch (error) {
            console.error('Error sending report:', error);
            toast.error('Failed to save report');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Premium Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-6 sm:px-10 pt-8 sm:pt-10 pb-4 sm:pb-6 flex items-center justify-between border-b border-white/5 bg-[#0E1D21]/50">
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-lg flex-shrink-0">
                            <FileText className="w-5 h-5 sm:w-7 sm:h-7" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-xl font-black text-white uppercase tracking-[0.2em] mb-1 truncate">
                                Monthly Report
                            </h2>
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary truncate max-w-[120px] sm:max-w-none">{student?.full_name}</span>
                                <div className="hidden xs:block w-1 h-1 rounded-full bg-white/20"></div>
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">
                                    {format(new Date(selectedMonth), 'MMMM yyyy')}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/10 active:scale-90 flex-shrink-0 ml-4"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                <div className="relative z-10 p-6 sm:p-10 space-y-8 sm:space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Configuration & Analytics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Month Selector */}
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 ml-1">Select Month</h3>
                            <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 focus-within:border-primary/30 transition-all hover:bg-white/[0.05] cursor-pointer group">
                                <Calendar className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors flex-shrink-0" />
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-black text-white/80 cursor-pointer text-left"
                                />
                            </div>
                        </div>

                        {/* Attendance High-Density Analytics */}
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 ml-1">Attendance Stats</h3>
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                                {calculating ? (
                                    <div className="w-full flex items-center justify-center gap-3 py-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Calculating...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 text-center">
                                            <div className="text-xl sm:text-2xl font-black text-white/80 leading-none mb-1">{stats.total}</div>
                                            <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-white/10">Sessions</div>
                                        </div>
                                        <div className="w-px h-6 sm:h-8 bg-white/5"></div>
                                        <div className="flex-1 text-center">
                                            <div className="text-xl sm:text-2xl font-black text-emerald-500 leading-none mb-1">{stats.present}</div>
                                            <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-emerald-500/20">Present</div>
                                        </div>
                                        <div className="w-px h-6 sm:h-8 bg-white/5"></div>
                                        <div className="flex-1 text-center">
                                            <div className="text-xl sm:text-2xl font-black text-rose-500 leading-none mb-1">{stats.absent}</div>
                                            <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-rose-500/20">Absent</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Spatiotemporal Matrix (Attendance Dates) */}
                    {!calculating && stats.total > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 ml-1">Attendance Record</h3>
                            <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none"></div>

                                {/* Present List */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-emerald-500/60 mb-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Presence</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {attendanceRecords.filter(r => r.status === 'present' || r.status === 'completed').length > 0 ? (
                                            attendanceRecords.filter(r => r.status === 'present' || r.status === 'completed').map((r, i) => (
                                                <span key={i} className="px-3 py-1.5 rounded-xl bg-emerald-500/5 text-emerald-500/80 text-[10px] font-black border border-emerald-500/10 shadow-sm">
                                                    {format(new Date(r.date), 'dd/MM')}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[9px] font-black text-white/10 italic">No attendance recorded</span>
                                        )}
                                    </div>
                                </div>

                                {/* Absent List */}
                                <div className="space-y-3 pt-6 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/5 sm:pl-8">
                                    <div className="flex items-center gap-2 text-rose-500/60 mb-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Absence</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {attendanceRecords.filter(r => r.status === 'absent').length > 0 ? (
                                            attendanceRecords.filter(r => r.status === 'absent').map((r, i) => (
                                                <span key={i} className="px-3 py-1.5 rounded-xl bg-rose-500/5 text-rose-500/80 text-[10px] font-black border border-rose-500/10 shadow-sm">
                                                    {format(new Date(r.date), 'dd/MM')}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[9px] font-black text-white/10 italic">No absence recorded</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Integrated Evaluations Output */}
                    <div className="space-y-8 pb-10">
                        {monthlyAssessments.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 ml-1">Test Scores</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {monthlyAssessments.map(a => (
                                        <div key={a.id} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 transition-all hover:bg-white/5 group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/[0.02] blur-2xl rounded-full"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[11px] font-black text-white uppercase tracking-wider">{a.title}</span>
                                                <span className="text-[14px] font-black text-primary shadow-primary/20">{a.total_score} <span className="text-[8px] text-white/20">PTS</span></span>
                                            </div>
                                            <div className="space-y-2">
                                                {Array.isArray(a.skills) && a.skills.slice(0, 3).map((s: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between">
                                                        <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">{s.name}</span>
                                                        <span className="text-[10px] font-black text-white/70">{s.score}/{s.max_score}</span>
                                                    </div>
                                                ))}
                                                {a.skills?.length > 3 && <p className="text-[8px] text-white/20 uppercase tracking-widest font-black text-center pt-2 italic">+{a.skills.length - 3} More metrics</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Technical Narrative */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/30 ml-1">Technical Evaluation</h3>
                            <textarea
                                value={evaluations.technical}
                                onChange={(e) => setEvaluations({ ...evaluations, technical: e.target.value })}
                                className="w-full h-32 bg-white/[0.03] border border-white/5 rounded-3xl p-6 text-sm font-medium text-white/80 focus:border-emerald-500/30 outline-none transition-all resize-none placeholder:text-white/5 hover:bg-white/[0.05]"
                            />
                        </div>

                        {/* Behavior & Mental Toughness */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/30 ml-1">Behavior & Focus</h3>
                            <textarea
                                value={evaluations.behavior}
                                onChange={(e) => setEvaluations({ ...evaluations, behavior: e.target.value })}
                                className="w-full h-24 bg-white/[0.03] border border-white/5 rounded-3xl p-6 text-sm font-medium text-white/80 focus:border-blue-500/30 outline-none transition-all resize-none placeholder:text-white/5 hover:bg-white/[0.05]"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Section - Single Mega Action */}
                <div className="relative z-10 p-5 sm:p-10 border-t border-white/5 flex items-center justify-between gap-4 sm:gap-8 bg-[#0E1D21]/50">
                    <button
                        onClick={onClose}
                        className="px-4 sm:px-8 py-4 text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleSendReport}
                        disabled={loading || calculating}
                        className="flex-1 py-4 sm:py-5 rounded-2xl sm:rounded-3xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all duration-500 shadow-[0_20px_40px_rgba(16,185,129,0.2)] active:scale-95 flex items-center justify-center gap-2 sm:gap-4 group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
                        )}
                        <span className="font-black uppercase tracking-[0.15em] sm:tracking-[0.4em] text-[9px] sm:text-[10px] group-hover:tracking-[0.3em] sm:group-hover:tracking-[0.6em] transition-all duration-500 whitespace-nowrap">
                            Send Report
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

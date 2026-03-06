import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ClipboardCheck,
    History,
    FileText,
    LayoutDashboard,
    Search,
    Plus,
    Filter,
    Users,
    TrendingUp,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import BatchAssessmentModal from '../components/BatchAssessmentModal';
import AssessmentHistoryModal from '../components/AssessmentHistoryModal';
import BatchAssessmentDetailsModal from '../components/BatchAssessmentDetailsModal';
import MonthlyReportModal from '../components/MonthlyReportModal';
import PageHeader from '../components/PageHeader';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function Evaluations() {
    const { t } = useTranslation();
    const { userProfile } = useTheme();
    const [activeTab, setActiveTab] = useState<'live' | 'history' | 'reports'>('live');
    const [stats, setStats] = useState({
        totalThisMonth: 0,
        completionRate: 0,
        pendingAssignments: 0
    });
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);

    // Details Modal State
    const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

    // Reporting Desk State
    const [reportingData, setReportingData] = useState<any[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportSearch, setReportSearch] = useState('');
    const [selectedStudentForReport, setSelectedStudentForReport] = useState<any | null>(null);
    const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
    const [selectedBatchKeys, setSelectedBatchKeys] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        fetchStats();
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'reports') fetchReportingData();
        if (userProfile?.id) fetchCurrentCoachId();
    }, [activeTab, userProfile]);

    // Cleanup selection when switching tabs
    useEffect(() => {
        setSelectedBatchKeys([]);
        setIsSelectMode(false);
        setShowBulkConfirm(false);
    }, [activeTab]);

    const fetchCurrentCoachId = async () => {
        if (!userProfile?.id) return;
        const { data } = await supabase.from('coaches').select('id').eq('profile_id', userProfile.id).single();
        if (data) setCurrentCoachId(data.id);
    };

    const fetchStats = async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data, count } = await supabase
            .from('skill_assessments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfMonth.toISOString());

        const { data: completed } = await supabase
            .from('skill_assessments')
            .select('*', { count: 'exact', head: true })
            .eq('evaluation_status', 'completed')
            .gte('created_at', startOfMonth.toISOString());

        const { data: pending } = await supabase
            .from('skill_assessments')
            .select('*', { count: 'exact', head: true })
            .eq('evaluation_status', 'assigned');

        setStats({
            totalThisMonth: count || 0,
            completionRate: count ? Math.round(((completed as any) || 0) / count * 100) : 0,
            pendingAssignments: (pending as any) || 0
        });
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        // We group by title and date for a "Batch" view in history
        const { data, error } = await supabase
            .from('skill_assessments')
            .select(`
                *,
                students(full_name),
                coaches:coach_id(full_name)
            `)
            .order('created_at', { ascending: false });

        if (data) {
            // Group the individual records into batches
            const batches: any[] = [];
            const processed = new Set();

            data.forEach(record => {
                const key = `${record.title}-${record.date}-${record.coach_id}`;
                if (!processed.has(key)) {
                    processed.add(key);
                    const batchRecords = data.filter(r =>
                        r.title === record.title &&
                        r.date === record.date &&
                        r.coach_id === record.coach_id
                    );

                    const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
                    batches.push({
                        id: record.id, // Just for key
                        key: key, // Added explicit key for selection
                        title: record.title,
                        date: record.date,
                        coach_name: record.coaches?.full_name && !isUUID(record.coaches.full_name) ? record.coaches.full_name : 'System',
                        student_count: batchRecords.length,
                        avg_score: Math.round(batchRecords.reduce((acc, r) => acc + (r.total_score || 0), 0) / batchRecords.length),
                        records: batchRecords,
                        status: record.evaluation_status
                    });
                }
            });
            setHistory(batches);
        }
        setLoadingHistory(false);
    };

    const handleBulkDelete = async () => {
        if (selectedBatchKeys.length === 0) return;

        setIsBulkDeleting(true);
        const toastId = toast.loading(`Deleting ${selectedBatchKeys.length} batches...`);
        try {
            const batchesToDelete = history.filter(h => selectedBatchKeys.includes(h.key));

            for (const batch of batchesToDelete) {
                const { error } = await supabase
                    .from('skill_assessments')
                    .delete()
                    .eq('title', batch.title)
                    .eq('date', batch.date);
                if (error) throw error;
            }

            toast.success('Bulk deletion completed', { id: toastId });
            setSelectedBatchKeys([]);
            setIsSelectMode(false);
            setShowBulkConfirm(false);
            fetchHistory();
            fetchStats();
        } catch (err) {
            console.error('Bulk delete error:', err);
            toast.error('Failed to complete some deletions', { id: toastId });
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const toggleSelection = (key: string) => {
        setSelectedBatchKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const selectAll = () => {
        if (selectedBatchKeys.length === history.length) {
            setSelectedBatchKeys([]);
        } else {
            setSelectedBatchKeys(history.map(h => h.key));
        }
    };

    const handleViewDetails = (batch: any) => {
        // Need to format for BatchAssessmentDetailsModal
        const formattedBatch = {
            batchId: batch.id,
            title: batch.title,
            date: batch.date,
            coach_name: batch.coach_name,
            assessments: batch.records.map((r: any) => ({
                id: r.id,
                total_score: r.total_score,
                skills: r.skills,
                status: r.status,
                evaluation_status: r.evaluation_status,
                students: r.students
            }))
        };
        setSelectedBatch(formattedBatch);
    };

    const fetchReportingData = async () => {
        setLoadingReports(true);
        try {
            const start = startOfMonth(new Date());
            const end = endOfMonth(new Date());

            // 1. Fetch Students
            const { data: studentsData } = await supabase
                .from('students')
                .select('id, full_name, contact_number, parent_contact, training_groups(name)')
                .order('full_name');

            if (!studentsData) return;

            // 2. Fetch latest assessments for these students
            const { data: assessorsData } = await supabase
                .from('skill_assessments')
                .select('*')
                .in('student_id', studentsData.map(s => s.id))
                .order('created_at', { ascending: false });

            // 3. Fetch attendance for current month
            const { data: attendanceData } = await supabase
                .from('attendance')
                .select('*')
                .in('student_id', studentsData.map(s => s.id))
                .gte('date', start.toISOString())
                .lte('date', end.toISOString());

            const processedReporting = studentsData.map(student => {
                const studentAssessments = assessorsData?.filter(a => a.student_id === student.id) || [];
                const latestTest = studentAssessments[0];
                const studentAttendance = attendanceData?.filter(at => at.student_id === student.id) || [];
                const presentCount = studentAttendance.filter(at => at.status === 'present').length;
                const totalSessions = studentAttendance.length;

                return {
                    ...student,
                    latestTest: latestTest ? {
                        title: latestTest.title,
                        score: latestTest.total_score,
                        date: latestTest.date
                    } : null,
                    attendance: {
                        present: presentCount,
                        total: totalSessions,
                        ratio: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0
                    }
                };
            });

            setReportingData(processedReporting);
        } catch (err) {
            console.error('Error fetching reporting desk data:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <PageHeader
                title={t('evaluations.title', 'Evaluation Hub')}
                subtitle={t('evaluations.subtitle', 'Master Control for Assessments & Reports')}
            >
                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="px-3 sm:px-6 py-3 sm:py-4 glass-card rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 flex flex-col items-center min-w-0 flex-1 sm:min-w-[120px]">
                        <span className="text-lg sm:text-2xl font-black text-white">{stats.totalThisMonth}</span>
                        <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Evaluations</span>
                    </div>
                    <div className="px-3 sm:px-6 py-3 sm:py-4 glass-card rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 flex flex-col items-center min-w-0 flex-1 sm:min-w-[120px]">
                        <span className="text-lg sm:text-2xl font-black text-emerald-400">{stats.completionRate}%</span>
                        <span className="text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Success</span>
                    </div>
                </div>
            </PageHeader>

            {/* Tab Navigation */}
            <div className="flex flex-col md:flex-row gap-4 items-center md:items-center justify-between">
                <div className="w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-white/[0.03] border border-white/5 rounded-[1.5rem] sm:rounded-[2rem]">
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Assessment Desk
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Test History
                        </button>
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                        >
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Reporting Desk
                        </button>
                    </div>
                </div>

                {activeTab === 'history' && history.length > 0 && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setIsSelectMode(!isSelectMode);
                                if (isSelectMode) setSelectedBatchKeys([]);
                            }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${isSelectMode ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                        >
                            <TrendingUp className={`w-4 h-4 ${isSelectMode ? 'text-black' : 'text-primary'}`} />
                            {isSelectMode ? 'Cancel' : 'Bulk Manage'}
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'live' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* New Assessment Card */}
                        <div
                            onClick={() => setShowBatchModal(true)}
                            className="group relative overflow-hidden rounded-[3rem] aspect-[2/1] sm:aspect-square lg:aspect-video bg-gradient-to-br from-primary/10 to-accent/10 border border-white/10 hover:border-primary/40 transition-all duration-500 cursor-pointer flex flex-col items-center justify-center text-center p-6 sm:p-8"
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"></div>
                            <div className="relative z-10 space-y-4">
                                <div className="w-16 h-16 rounded-[2rem] bg-primary/20 flex items-center justify-center mx-auto border border-primary/30 group-hover:scale-110 transition-transform duration-500">
                                    <Plus className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase italic">Draft New Test</h3>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Start a private or group session</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Mini-List */}
                        <div className="lg:col-span-2 glass-card rounded-[3rem] border border-white/5 p-8 flex flex-col">
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" />
                                Recent Performance
                            </h3>
                            <div className="flex-1 flex flex-col justify-center items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-5 h-5 text-white/10" />
                                </div>
                                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
                                    Live floor data syncing...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {loadingHistory ? (
                            <div className="h-64 flex flex-col items-center justify-center animate-pulse">
                                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                                <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest italic">Decoding History...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="glass-card rounded-[3rem] border border-white/5 p-12 flex flex-col items-center justify-center text-center">
                                <History className="w-12 h-12 text-white/5 mb-4" />
                                <h3 className="text-sm font-black text-white/20 uppercase tracking-widest italic">No records found</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {history.map((batch, idx) => (
                                    <div
                                        key={batch.key}
                                        onClick={() => {
                                            if (isSelectMode) {
                                                toggleSelection(batch.key);
                                            } else {
                                                handleViewDetails(batch);
                                            }
                                        }}
                                        className={`glass-card rounded-[2.5rem] border p-6 transition-all duration-300 group cursor-pointer relative overflow-hidden ${selectedBatchKeys.includes(batch.key) ? 'bg-primary/5 border-primary/50' : 'border-white/5 hover:border-primary/30'}`}
                                    >
                                        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 transition-colors ${selectedBatchKeys.includes(batch.key) ? 'bg-primary/20' : 'bg-primary/5 group-hover:bg-primary/10'}`} />

                                        <div className="flex items-start justify-between relative z-10 mb-4">
                                            <div className="flex items-center gap-4">
                                                {isSelectMode && (
                                                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${selectedBatchKeys.includes(batch.key) ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/20'}`}>
                                                        {selectedBatchKeys.includes(batch.key) && <ClipboardCheck className="w-4 h-4" />}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-lg font-black text-white uppercase italic leading-tight group-hover:text-primary transition-colors">{batch.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Calendar className="w-3 h-3 text-white/20" />
                                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter">
                                                            {format(new Date(batch.date), 'MMMM dd, yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {!isSelectMode && (
                                                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${batch.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    {batch.status}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 xs:gap-4 pt-4 border-t border-white/5 relative z-10">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Athletes</span>
                                                <span className="text-sm font-black text-white/80">{batch.student_count}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Avg Score</span>
                                                <span className="text-sm font-black text-primary">{batch.avg_score}</span>
                                            </div>
                                            <div className="flex flex-col col-span-2 xs:col-span-1 border-t xs:border-t-0 border-white/5 pt-2 xs:pt-0">
                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">By</span>
                                                <span className="text-sm font-black text-white/80 truncate">{batch.coach_name.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative flex-1 w-full max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                <input
                                    type="text"
                                    value={reportSearch}
                                    onChange={(e) => setReportSearch(e.target.value)}
                                    placeholder=""
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-primary/50 outline-none"
                                />
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                                <Filter className="w-3 h-3 text-white/40" />
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sort: Alphabetical</span>
                            </div>
                        </div>

                        {loadingReports ? (
                            <div className="h-64 flex flex-col items-center justify-center animate-pulse">
                                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                                <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest italic">Scanning Records...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {reportingData.filter(s => s.full_name.toLowerCase().includes(reportSearch.toLowerCase())).map((student) => (
                                    <div
                                        key={student.id}
                                        className="glass-card rounded-[2rem] sm:rounded-[2.5rem] border border-white/5 p-4 sm:p-6 flex flex-col xs:flex-row items-center justify-between group hover:border-white/10 transition-all gap-4"
                                    >
                                        <div className="flex items-center gap-4 w-full xs:w-auto">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                                {student.photo_url ? (
                                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-6 h-6 text-white/20" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm sm:text-base font-black text-white uppercase italic leading-tight truncate">{student.full_name}</h3>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${student.attendance.ratio >= 80 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-amber-400'}`} />
                                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                                                            {student.attendance.ratio}% Attend.
                                                        </span>
                                                    </div>
                                                    <div className="w-px h-2 bg-white/5" />
                                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                                                        {student.latestTest ? `${student.latestTest.score} pts` : 'No Recent Test'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedStudentForReport(student)}
                                            className="w-full xs:w-auto px-5 py-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary transition-all hover:text-white font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 group/btn"
                                        >
                                            <FileText className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                            Build Report
                                            <ArrowRight className="w-3 h-3 hidden xs:block opacity-0 -ml-1 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <BatchAssessmentModal
                isOpen={showBatchModal}
                onClose={() => setShowBatchModal(false)}
                onSuccess={() => {
                    fetchStats();
                    if (activeTab === 'history') fetchHistory();
                    toast.success('Assessment created successfully');
                }}
                currentCoachId={currentCoachId}
            />

            {selectedBatch && (
                <BatchAssessmentDetailsModal
                    isOpen={!!selectedBatch}
                    onClose={() => setSelectedBatch(null)}
                    batchId={selectedBatch.key}
                    title={selectedBatch.title}
                    date={selectedBatch.date}
                    responsibleCoach={selectedBatch.responsible_coach}
                    assessingCoach={selectedBatch.assessing_coach}
                />
            )}

            {selectedStudentForReport && (
                <MonthlyReportModal
                    isOpen={!!selectedStudentForReport}
                    onClose={() => setSelectedStudentForReport(null)}
                    student={selectedStudentForReport}
                    currentUserRole={userProfile?.role || 'head_coach'}
                />
            )}

            {/* Custom Bulk Delete Confirmation Modal */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => !isBulkDeleting && setShowBulkConfirm(false)} />
                    <div className="relative w-full max-w-xs bg-[#16292E] border border-white/10 rounded-[2rem] shadow-[0_0_100px_rgba(239,68,68,0.2)] p-6 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>

                        <h3 className="text-xl font-black text-white text-center uppercase tracking-tight">Bulk Delete?</h3>
                        <p className="text-white/40 text-center text-[11px] mt-2.5 leading-relaxed px-2">
                            Permanently delete <span className="text-white font-bold underline decoration-red-500 decoration-1 italic">{selectedBatchKeys.length} assessment batches</span>?
                        </p>

                        <div className="flex gap-3 mt-6">
                            <button
                                disabled={isBulkDeleting}
                                onClick={() => setShowBulkConfirm(false)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all rounded-xl font-black uppercase tracking-[0.2em] text-[9px] border border-white/5 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white transition-all rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_30_rgba(239,68,68,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isBulkDeleting ? (
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Floating Premium Bulk Action Bar */}
            {isSelectMode && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-500 fill-mode-forwards px-4 w-full sm:max-w-lg">
                    <div className="glass-card bg-[#16292E]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(139,92,246,0.1)] flex flex-col xs:flex-row items-center justify-between gap-3 sm:gap-6">
                        <div className="flex items-center gap-4 pl-0 xs:pl-4">
                            <div className="flex flex-col items-center xs:items-start">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Selected</span>
                                <span className="text-lg sm:text-xl font-black text-white italic leading-tight">{selectedBatchKeys.length} Batches</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 w-full xs:w-auto">
                            <button
                                onClick={selectAll}
                                className="flex-1 xs:flex-none px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[9px] sm:text-[10px] truncate"
                            >
                                {selectedBatchKeys.length === history.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <button
                                onClick={() => setShowBulkConfirm(true)}
                                disabled={selectedBatchKeys.length === 0}
                                className="flex-1 xs:flex-none px-4 sm:px-8 py-3 sm:py-3.5 rounded-2xl bg-red-500 text-white hover:bg-red-600 shadow-[0_15px_30px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[9px] sm:text-[11px] flex items-center justify-center gap-2 active:scale-95 group truncate"
                            >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:animate-bounce shrink-0" />
                                DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

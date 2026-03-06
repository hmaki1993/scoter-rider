import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { debounce } from 'lodash';
import { supabase } from '../lib/supabase';
import { Plus, Search, X, Smile, Edit, Trash2, TrendingUp, User as UserIcon, Calendar, RefreshCw, Users, FileSpreadsheet, Filter, ChevronDown, Check, FileText, UserPlus } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import AddStudentForm from '../components/AddStudentForm';
import AddPTSubscriptionForm from '../components/AddPTSubscriptionForm';
import RenewSubscriptionForm from '../components/RenewSubscriptionForm';
import RenewPTSubscriptionForm from '../components/RenewPTSubscriptionForm';
import GroupDetailsModal from '../components/GroupDetailsModal';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';
import ImportStudentsModal from '../components/ImportStudentsModal';
import { useTranslation } from 'react-i18next';
import { useStudents, useCoaches, useGroups } from '../hooks/useData';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import GymnastProfileModal from '../components/GymnastProfileModal';
import PremiumCheckbox from '../components/PremiumCheckbox';
import MonthlyReportModal from '../components/MonthlyReportModal';
import PremiumCalendarModal from '../components/PremiumCalendarModal';

interface Student {
    id: number;
    full_name: string;
    age: number;
    contact_number: string;
    parent_contact: string;
    subscription_expiry: string;
    is_active: boolean;
    created_at: string;
    coach_id?: string | null;
    subscription_plan_id?: string | null;
    coaches?: {
        full_name: string;
    };
    subscription_plans?: {
        name: string;
        price: number;
    };
    training_groups?: {
        name: string;
    };
    sessions_remaining?: number | null;
}

const StudentRow = memo(({
    student,
    index,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onRenew,
    onToggleStatus,
    currency,
    t,
    subscriptionStatus,
    onViewProfile,
    role,
    onGenerateReport,
    sessionsRemaining
}: any) => {
    return (
        <tr className={`group border-b border-white/[0.02] last:border-0 transition-all duration-300 ${isSelected ? 'bg-primary/10' : 'hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent'}`}>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex items-center justify-center">
                    <PremiumCheckbox
                        checked={isSelected}
                        onChange={() => onSelect(student.id)}
                    />
                </div>
            </td>
            <td className="px-3 sm:px-5 py-4 sm:py-8 text-center">
                <span className="text-white/30 font-black text-sm">{index + 1}</span>
            </td>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex items-center gap-3">
                    <div
                        className="relative cursor-pointer"
                        onClick={() => onViewProfile(student)}
                    >
                        <div className="absolute -inset-2 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                        <div className={`relative w-10 h-10 rounded-xl bg-[#0a0c10] border border-white/10 flex items-center justify-center text-primary font-black text-base shadow-2xl shadow-black/50 group-hover:scale-105 transition-transform duration-500 ${!student.is_active && 'opacity-40 grayscale'}`}>
                            {student.full_name?.[0] || '?'}
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div
                                className={`font-black text-white text-lg group-hover:text-primary transition-colors duration-300 cursor-pointer ${!student.is_active && 'opacity-40'}`}
                                onClick={() => onViewProfile(student)}
                            >
                                {student.full_name || <span className="text-white/20 italic font-medium">{t('common.unknown')}</span>}
                            </div>
                            {!student.is_active && (
                                <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[8px] font-black text-red-500 uppercase tracking-wider">
                                    {t('common.inactive')}
                                </span>
                            )}
                        </div>
                        <div className={`text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2 ${!student.is_active && 'opacity-40'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
                            ID: {String(student.id).slice(0, 8)}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
                <button
                    onClick={() => onToggleStatus(student.id, student.is_active)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.15em] border transition-all duration-300 ${!student.is_active ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' : `${subscriptionStatus.color} hover:shadow-[0_0_15px_-3px_currentColor]`} hover:scale-105 cursor-pointer relative overflow-hidden group/status`}
                >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/status:translate-x-[100%] transition-transform duration-700"></div>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${student.is_active && subscriptionStatus.label === t('students.active') ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]' : 'bg-current'}`}></span>
                    {!student.is_active ? t('common.inactive') : subscriptionStatus.label}
                </button>
            </td>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-colors">
                        <span className="text-[10px] font-black text-primary">
                            {student.coaches?.full_name?.charAt(0) || '?'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                            {student.coaches?.full_name || <span className="text-white/20 text-xs uppercase tracking-wider">{t('common.notAssigned')}</span>}
                        </span>
                        {student.training_groups?.name && (
                            <span className="text-[10px] font-black text-accent uppercase tracking-wider mt-0.5">
                                {student.training_groups.name}
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex flex-col gap-2">
                    <span className="text-white font-black text-sm tracking-wide">
                        {student.subscription_plans?.name || <span className="text-white/20 italic font-medium">No Plan Assigned</span>}
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {student.sessions_remaining !== null && (
                            <div className="flex items-center gap-2 self-start px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.1)] group-hover:bg-emerald-500/20 transition-all duration-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                    {student.sessions_remaining} Sessions Left
                                </span>
                            </div>
                        )}
                        {student.subscription_plans?.price !== undefined && role !== 'head_coach' && (
                            <div className="flex items-center gap-2 self-start px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.1)] group-hover:bg-amber-500/20 transition-all duration-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                    {student.subscription_plans.price} {currency.code}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-2 sm:px-4 py-3 sm:py-4">
                <div className="flex flex-col">
                    <span className="text-white font-mono text-sm tracking-widest font-bold">
                        {format(new Date(student.created_at), 'dd MMM yyyy')}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1 h-1 rounded-full bg-primary/50"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                            {format(new Date(student.created_at), 'hh:mm a')}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    {(() => {
                        const isExpired = subscriptionStatus.label !== t('students.active');
                        return isExpired && (
                            <button
                                onClick={() => onRenew(student)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all duration-300"
                                title="Renew Subscription"
                            >
                                <RefreshCw className="w-4 h-4 group-hover/renew:rotate-180 transition-transform duration-500" />
                            </button>
                        );
                    })()}
                    {(role === 'admin' || role === 'head_coach') && (
                        <button
                            onClick={() => onGenerateReport(student)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-500 transition-all duration-300"
                            title={t('students.generateReport')}
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onEdit(student)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary transition-all duration-300"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(student.id)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all duration-300"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

export default function Students() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const navigate = useNavigate();
    const location = useLocation();
    const { role, userId } = useOutletContext<{ role: string, userId: string }>() || { role: null, userId: null };
    const { data: studentsData, isLoading: loading, refetch } = useStudents();
    const students = studentsData || [];

    const [showAddModal, setShowAddModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const [showPTModal, setShowPTModal] = useState(false);
    const [ptSubscriptions, setPtSubscriptions] = useState<any[]>([]);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [showPTRenewModal, setShowPTRenewModal] = useState(false);
    const [studentToRenew, setStudentToRenew] = useState<Student | null>(null);
    const [ptToDelete, setPtToDelete] = useState<any>(null);
    const [ptToEdit, setPtToEdit] = useState<any>(null);
    const [ptToRenew, setPtToRenew] = useState<any>(null);
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

    // Premium History Modal State
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedSub, setSelectedSub] = useState<any>(null);

    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [viewingProfileStudent, setViewingProfileStudent] = useState<Student | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [studentForReport, setStudentForReport] = useState<any>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const { data: coachesData } = useCoaches();
    const { data: groupsData } = useGroups();
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        coachId: 'all',
        groupId: 'all'
    });

    // Low-level debounced search to avoid heavy processing on every character
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const updateSearch = useCallback(
        debounce((val: string) => setDebouncedSearch(val), 100),
        []
    );

    useEffect(() => {
        updateSearch(searchTerm);
    }, [searchTerm, updateSearch]);

    // Fast Indexing: Pre-calculate search strings when students change
    const indexedStudents = useMemo(() => {
        return students.map(s => ({
            ...s,
            _searchIndex: `${s.full_name} ${s.id} ${s.coaches?.full_name || ''} ${s.contact_number || ''} ${s.parent_contact || ''}`.toLowerCase()
        }));
    }, [students]);

    const filteredStudents = useMemo(() => {
        let result = indexedStudents;

        // Search filter
        if (debouncedSearch.trim()) {
            const lowTerm = debouncedSearch.toLowerCase();
            result = result.filter(s => s._searchIndex.includes(lowTerm));
        }

        // Status filter
        if (filters.status !== 'all') {
            if (filters.status === 'active') result = result.filter(s => s.is_active);
            else if (filters.status === 'inactive') result = result.filter(s => !s.is_active);
            else if (filters.status === 'expiring') {
                result = result.filter(s => {
                    if (!s.subscription_expiry) return false;
                    const days = differenceInDays(new Date(s.subscription_expiry), new Date());
                    return days >= 0 && days <= 7;
                });
            }
        }

        // Coach filter
        if (filters.coachId !== 'all') {
            result = result.filter(s => s.coach_id === filters.coachId);
        }

        // Group filter
        if (filters.groupId !== 'all') {
            result = result.filter(s => s.group_id === Number(filters.groupId));
        }

        return result;
    }, [indexedStudents, debouncedSearch, filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.status !== 'all') count++;
        if (filters.coachId !== 'all') count++;
        if (filters.groupId !== 'all') count++;
        return count;
    }, [filters]);

    const handleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id));
        }
    };

    const handleSelectStudent = (id: number) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(studentId => studentId !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (!selectedStudentIds.length) return;
        setShowBulkDeleteModal(true);
    };

    const confirmBulkDelete = async () => {
        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .in('id', selectedStudentIds);

            if (error) throw error;

            toast.success(t('common.deleteSuccess'));
            setSelectedStudentIds([]);
            setShowBulkDeleteModal(false);
            refetch();
        } catch (error) {
            console.error('Error deleting students:', error);
            toast.error(t('common.deleteError'));
        }
    };

    const fetchPTSubscriptions = async () => {
        console.log('🔄 Fetching PT Subscriptions. Role:', role, 'UserID:', userId);
        let query = supabase
            .from('pt_subscriptions')
            .select(`
                *,
                students(id, full_name, email),
                coaches(id, full_name)
            `)
            .order('status', { ascending: true })
            .order('created_at', { ascending: false });

        // Filter for regular coaches (not admin/head_coach)
        if (role === 'coach' && userId) {
            console.log('🔍 Filtering for Coach. Fetching coach ID...');
            // first get the coach id for this user
            const { data: coachData, error: coachError } = await supabase
                .from('coaches')
                .select('id')
                .eq('profile_id', userId)
                .single();

            if (coachError) console.error('❌ Error fetching coach ID:', coachError);

            if (coachData) {
                console.log('✅ Found Coach ID:', coachData.id);
                query = query.eq('coach_id', coachData.id);
            } else {
                console.warn('⚠️ No coach record found for this user despite role=coach');
                // If they are a 'coach' role but have no coach record, show nothing safety
                setPtSubscriptions([]);
                return;
            }
        }

        const { data, error } = await query;
        console.log('📊 PT Subscriptions Result:', { count: data?.length, error });

        if (error) {
            console.error('Error fetching PT subscriptions:', error);
        } else {
            setPtSubscriptions(data || []);
        }
    };

    useEffect(() => {
        if (role) {
            fetchPTSubscriptions();
        }

        // Handle auto-open student profile from state (used by Search)
        const openStudentId = (location as any).state?.openStudentId;
        if (openStudentId && students.length > 0) {
            const student = students.find((s: any) => s.id === openStudentId);
            if (student) {
                setViewingProfileStudent(student);
                // Clear state so it doesn't reopen on every refresh/navigation
                window.history.replaceState({}, document.title);
            }
        }

        const channel = supabase
            .channel('pt_subscriptions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_subscriptions' }, () => {
                fetchPTSubscriptions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [role, userId]);

    const handleDeletePT = async () => {
        if (!ptToDelete) return;

        const { error } = await supabase
            .from('pt_subscriptions')
            .delete()
            .eq('id', ptToDelete.id);

        if (error) {
            console.error('Error deleting PT:', error);
            toast.error(t('common.deleteError'));
        } else {
            toast.success(t('common.deleteSuccess'));
            fetchPTSubscriptions();
            setPtToDelete(null);
        }
    };

    const getSubscriptionStatus = (expiryDate: string | null, sessionsRemaining: number | null = null) => {
        if (sessionsRemaining === 0) return { label: t('students.outOfSessions') || 'OUT OF SESSIONS', color: 'bg-red-500/10 border-red-500/20 text-red-500' };
        if (!expiryDate) return { label: t('common.unknown'), color: 'bg-white/5 text-white/30 border-white/10' };
        const date = new Date(expiryDate);
        if (isNaN(date.getTime())) return { label: t('common.invalid'), color: 'bg-red-500/10 text-red-500 border-red-500/20' };
        const daysLeft = differenceInDays(date, new Date());
        if (daysLeft < 0) return { label: t('students.expired'), color: 'bg-red-500/10 border-red-500/20 text-red-500' };
        if (daysLeft <= 3) return { label: t('students.expiringSoon'), color: 'bg-orange-500/10 border-orange-500/20 text-orange-500' };
        if (daysLeft <= 7) return { label: t('common.daysLeft', { count: daysLeft }), color: 'bg-amber-500/10 border-amber-500/20 text-amber-500' };
        return { label: t('students.active'), color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' };
    };

    const handleDelete = async () => {
        if (!idToDelete) return;
        const { error } = await supabase.from('students').delete().eq('id', idToDelete);
        if (error) {
            console.error('Error deleting:', error);
            toast.error(t('common.deleteError'));
        } else {
            toast.success(t('common.deleteSuccess'));
            refetch();
            setIdToDelete(null);
        }
    };

    const toggleStudentStatus = async (studentId: number, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('students')
                .update({ is_active: !currentStatus })
                .eq('id', studentId);
            if (error) throw error;
            refetch();
        } catch (error) {
            console.error('Error toggling student status:', error);
            toast.error(t('common.updateError'));
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title="Gymnasts"
                subtitle={t('students.subtitle')}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-premium flex items-center justify-between group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">{t('dashboard.totalStudents')}</p>
                        <h3 className="text-4xl font-black text-white">{students.length}</h3>
                    </div>
                    <div className="relative z-10 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <Smile className="w-8 h-8" />
                    </div>
                </div>
            </div>

            {/* PT Subscriptions Section */}
            <div className="glass-card p-6 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 shadow-premium relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-accent/5 to-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-6">
                        <div className="flex items-center gap-4 md:gap-5">
                            <div className="p-3 md:p-5 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-xl md:rounded-[1.5rem] shadow-lg shadow-primary/30 relative group">
                                <div className="absolute inset-0 bg-white/20 rounded-xl md:rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight flex flex-wrap items-center gap-2 md:gap-3">
                                    {t('pt.title')}
                                    <span className="px-2 md:px-3 py-0.5 md:py-1 bg-accent/20 text-accent text-[8px] md:text-xs rounded-full border border-accent/30 font-black uppercase tracking-wider">
                                        {t('common.premium')}
                                    </span>
                                </h2>
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1 md:mt-2 opacity-60" style={{ color: 'var(--color-brand-label)' }}>
                                    {t('pt.subtitle')}
                                </p>
                            </div>
                        </div>
                        {role === 'admin' && (
                            <button
                                onClick={() => setShowPTModal(true)}
                                className="group/btn bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 md:gap-3 font-black uppercase tracking-widest text-[10px] md:text-sm relative overflow-hidden w-full md:w-auto"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                <Plus className="w-4 h-4 md:w-5 md:h-5 relative z-10" />
                                <span className="relative z-10">{t('pt.addSubscription')}</span>
                            </button>
                        )}
                    </div>

                    {ptSubscriptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ptSubscriptions.map((subscription) => (
                                <div
                                    key={subscription.id}
                                    onClick={() => {
                                        setSelectedSub(subscription);
                                        setShowHistoryModal(true);
                                    }}
                                    className="glass-card p-5 rounded-[2.25rem] border border-white/10 hover:border-primary/40 transition-all duration-700 group hover:scale-[1.01] relative overflow-hidden flex flex-col h-full bg-[#0a0c10]/40 cursor-pointer"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2.25rem]"></div>
                                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                    <div className="absolute top-2 right-4 flex gap-1.5 z-20" onClick={(e) => e.stopPropagation()}>
                                        {/* Create Portal: Admin/Coach, if guest/student has email but no user_id */}
                                        {(role === 'admin' || role === 'head_coach' || role === 'coach') && subscription.student_email && !subscription.user_id && (
                                            <button
                                                onClick={() => navigate('/register', {
                                                    state: {
                                                        prefill: {
                                                            email: subscription.student_email,
                                                            full_name: subscription.student_name || subscription.students?.full_name,
                                                            student_id: subscription.student_id,
                                                            pt_id: subscription.id,
                                                            role: 'student'
                                                        }
                                                    }
                                                })}
                                                className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg border border-primary/20 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-primary/10"
                                                title="Create Portal Access"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* Renew: Admin only */}
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => {
                                                    setPtToRenew(subscription);
                                                    setShowPTRenewModal(true);
                                                }}
                                                className="p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg border border-accent/20 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-accent/10"
                                                title={t('pt.renewSubscription')}
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* Edit: Admin + Head Coach */}
                                        {(role === 'admin' || role === 'head_coach') && (
                                            <button
                                                onClick={() => setPtToEdit(subscription)}
                                                className="p-2 bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary rounded-lg border border-white/5 transition-all hover:scale-110 active:scale-90"
                                                title={t('common.edit')}
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {/* Delete: Admin only */}
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => setPtToDelete(subscription)}
                                                className="p-2 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-500 rounded-lg border border-white/5 transition-all hover:scale-110 active:scale-90"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-center mt-6 md:mt-10 mb-4 md:mb-6">
                                            <div className="flex items-center gap-2 md:gap-3.5 min-w-0 flex-1">
                                                <div className="relative shrink-0">
                                                    <div className="absolute -inset-1 bg-gradient-to-br from-primary to-accent rounded-lg blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                    <div className="relative w-10 h-10 md:w-14 md:h-14 rounded-lg bg-[#0a0c10] border border-white/10 flex items-center justify-center text-white font-black text-base md:text-xl shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                                        {(subscription.students?.full_name || subscription.student_name || 'S')?.[0]}
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5 min-w-0 flex-1">
                                                    <h3 className="font-black text-white text-sm md:text-lg tracking-tight group-hover:text-primary transition-colors leading-tight truncate mt-1" title={subscription.students?.full_name || subscription.student_name || t('common.unknown')}>
                                                        {subscription.students?.full_name || subscription.student_name || t('common.unknown')}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="px-1.5 md:px-2 py-0.5 rounded-md text-[6px] md:text-[7px] font-black uppercase tracking-[0.08em] md:tracking-[0.12em] border transition-all duration-300 whitespace-nowrap"
                                                            style={!(subscription.student_name && !subscription.students) ? {
                                                                color: 'var(--color-brand-label)',
                                                                backgroundColor: 'color-mix(in srgb, var(--color-brand-label), transparent 92%)',
                                                                borderColor: 'color-mix(in srgb, var(--color-brand-label), transparent 85%)'
                                                            } : {
                                                                color: '#f59e0b',
                                                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                                                borderColor: 'rgba(245, 158, 11, 0.15)'
                                                            }}
                                                        >
                                                            {subscription.student_name && !subscription.students ? t('pt.guestStudent') : t('pt.academyStudent')}
                                                        </span>
                                                        {subscription.student_email && (
                                                            <span className="text-[7px] font-black text-white/30 truncate max-w-[100px]" title={subscription.student_email}>
                                                                {subscription.student_email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3 md:space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="p-2.5 md:p-3.5 bg-white/[0.03] rounded-xl md:rounded-[1.75rem] border border-white/5 flex items-center gap-2 md:gap-2.5 hover:bg-white/[0.05] transition-colors group/meta">
                                                    <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover/meta:scale-105 transition-transform">
                                                        <UserIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[6px] md:text-[7px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] mb-0.5 opacity-30 leading-none">{t('dashboard.coachName')}</p>
                                                        <p className="text-[10px] md:text-[12px] font-black text-white truncate leading-none">{subscription.coaches?.full_name || t('common.unknown')}</p>
                                                    </div>
                                                </div>
                                                <div className="p-2.5 md:p-3.5 bg-white/[0.03] rounded-xl md:rounded-[1.75rem] border border-white/5 flex items-center gap-2 md:gap-2.5 hover:bg-white/[0.05] transition-colors group/meta">
                                                    <div className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/meta:scale-105 transition-transform">
                                                        <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[6px] md:text-[7px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] mb-0.5 opacity-30 leading-none">{t('students.expiry')}</p>
                                                        <p className="text-[10px] md:text-[12px] font-black text-white truncate leading-none">{format(new Date(subscription.expiry_date), 'dd MMM yyyy')}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2.5 md:space-y-3.5 p-3 md:p-4.5 bg-gradient-to-br from-white/[0.04] to-transparent rounded-xl md:rounded-[1.75rem] border border-white/5 relative overflow-hidden group/progress">
                                                <div className="flex items-center justify-between relative z-10">
                                                    <span className="text-[7px] md:text-[8px] font-black text-white/30 uppercase tracking-[0.12em] md:tracking-[0.18em]">{t('pt.progress')}</span>
                                                    <span className="text-[8px] md:text-[9px] font-black text-primary px-1.5 md:px-2 py-0.5 bg-primary/10 rounded-md border border-primary/20">
                                                        {Math.round((subscription.sessions_remaining / subscription.sessions_total) * 100)}%
                                                    </span>
                                                </div>

                                                <div className="relative h-2 md:h-2.5 bg-[#0a0c10] rounded-full overflow-hidden border border-white/[0.06] p-0.5 shadow-inner">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary via-accent to-primary background-animate transition-all duration-1000 rounded-full relative"
                                                        style={{ width: `${(subscription.sessions_remaining / subscription.sessions_total) * 100}%` }}
                                                    >
                                                        <div className="absolute inset-x-0 top-0 h-[30%] bg-white/20 blur-[1px] rounded-full mx-1"></div>
                                                        <div className="absolute inset-0 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] animate-pulse"></div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between mt-2 md:mt-3 relative z-10">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[6.5px] md:text-[7.5px] font-black text-white/20 uppercase tracking-[0.08em] md:tracking-[0.12em]">{t('pt.sessionsRemaining')}</span>
                                                        <div className="flex items-baseline gap-0.5 md:gap-1">
                                                            <span className="text-base md:text-lg font-black text-primary tracking-tighter">{subscription.sessions_remaining}</span>
                                                            <span className="text-[7px] md:text-[8px] font-bold text-primary/40 uppercase">Left</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right space-y-0.5">
                                                        <span className="text-[6.5px] md:text-[7.5px] font-black text-white/20 uppercase tracking-[0.08em] md:tracking-[0.12em]">{t('pt.sessionsTotal')}</span>
                                                        <div className="flex items-baseline justify-end gap-0.5 md:gap-1">
                                                            <span className="text-base md:text-lg font-black text-white/60 tracking-tighter">{subscription.sessions_total}</span>
                                                            <span className="text-[7px] md:text-[8px] font-bold text-white/20 uppercase">Total</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 md:mt-6 pt-3 md:pt-5 border-t border-white/5 flex items-end justify-between gap-2 md:gap-3">
                                            {role !== 'head_coach' && (
                                                <div className="space-y-0.5">
                                                    <p className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.12em] md:tracking-[0.18em]">{t('common.price')}</p>
                                                    <div className="flex items-baseline gap-0.5 md:gap-1">
                                                        <span className="text-base md:text-xl font-black text-white tracking-tighter leading-none">{subscription.total_price?.toLocaleString()}</span>
                                                        <span className="text-[8px] md:text-[9px] font-bold text-white/30 uppercase tracking-wider md:tracking-widest">{currency.code}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex-1 max-w-[110px] md:max-w-[130px]">
                                                {(() => {
                                                    const isExpired = new Date(subscription.expiry_date) < new Date() || subscription.status === 'expired' || subscription.sessions_remaining <= 0;
                                                    if (isExpired) {
                                                        return (
                                                            <div className="group/status flex items-center gap-1.5 md:gap-2.5 p-2 md:p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg md:rounded-xl hover:bg-rose-500/20 transition-all cursor-help" title={t('pt.renewalRequired')}>
                                                                <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10 relative">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping absolute"></div>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 relative z-10"></div>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[7px] md:text-[8px] font-black text-rose-500 uppercase tracking-wide md:tracking-wider truncate leading-tight">
                                                                        {(subscription.sessions_remaining <= 0 || subscription.status === 'expired') ? t('pt.outOfSessions') : t('pt.expired')}
                                                                    </p>
                                                                    <p className="text-[6px] md:text-[7px] font-black text-rose-400/30 uppercase mt-0.5 truncate hidden md:block">{t('pt.renewalRequired')}</p>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    return (
                                                        <div className="flex items-center gap-1.5 md:gap-2.5 p-2 md:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg md:rounded-xl transition-all">
                                                            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10 relative">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse absolute"></div>
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative z-10"></div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[7px] md:text-[8px] font-black text-emerald-500 uppercase tracking-wide md:tracking-wider leading-tight">{t('pt.active')}</p>
                                                                <p className="text-[6px] md:text-[6.5px] font-black text-emerald-400/30 uppercase mt-0.5 truncate hidden md:block">Active</p>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                                <TrendingUp className="w-12 h-12 text-white/20" />
                            </div>
                            <p className="text-white/40 font-black uppercase tracking-widest text-sm">No Active PT Subscriptions</p>
                            <p className="text-white/20 text-xs mt-2">{t('pt.addSubscription')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Students Table */}
            <div className="glass-card rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-premium">
                <div className="flex flex-col md:flex-row p-4 sm:p-6 md:p-8 border-b border-white/5 gap-4 sm:gap-6 bg-white/[0.02] items-center">
                    <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto justify-center md:justify-start">
                        <div className="p-2 sm:p-3 text-white/50">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">Gymnasts</h3>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                                {selectedStudentIds.length > 0 ? (
                                    <span className="text-primary animate-pulse">{selectedStudentIds.length} Selected</span>
                                ) : (
                                    <span>{filteredStudents.length} Gymnasts</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Search Bar - Full Width on Mobile */}
                    <div className="w-full md:flex-1 md:max-w-[400px] md:mx-auto relative group order-2 md:order-none">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors duration-300" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-full py-3.5 sm:py-4 pr-12 text-base text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all duration-300 shadow-inner"
                            style={{ paddingLeft: '50px' }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-4 flex items-center text-white/20 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Actions Group - Grid on Mobile */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full md:w-auto order-3 md:order-none">
                        {selectedStudentIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="col-span-2 px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl border border-rose-500/20 flex items-center justify-center gap-2 transition-all animate-in fade-in slide-in-from-left-4"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-wider">{t('finance.bulkDelete')}</span>
                            </button>
                        )}

                        {/* Filter Toggle Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 group/filter ${showFilters ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : 'bg-white/[0.03] border-white/5 text-white/40 hover:text-white hover:border-white/20'}`}
                        >
                            <Filter className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showFilters ? 'animate-pulse' : 'group-hover/filter:rotate-12 transition-transform'}`} />
                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{t('students.filter')}</span>
                            {activeFilterCount > 0 && (
                                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-black animate-in zoom-in duration-300">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-gradient-to-r from-[#622347] to-[#8B3A62] hover:from-[#622347]/90 hover:to-[#8B3A62]/90 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-lg shadow-[#622347]/20 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 font-black uppercase tracking-widest text-[9px]"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Import
                        </button>

                        <button
                            onClick={() => {
                                setEditingStudent(null);
                                setShowAddModal(true);
                            }}
                            className="col-span-2 sm:col-span-1 bg-primary hover:bg-primary/90 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 font-black uppercase tracking-widest text-[10px] sm:text-xs"
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Add Gymnast
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                {showFilters && (
                    <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="glass-card p-6 rounded-[2rem] border border-white/10 shadow-xl flex flex-wrap items-end gap-6 bg-white/[0.02]">
                            {/* Status Filter */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">{t('common.status')}</label>
                                <div className="flex items-center p-1 bg-[#0a0c10] rounded-xl border border-white/5">
                                    {[
                                        { id: 'all', label: t('students.allStatus') },
                                        { id: 'active', label: t('students.activeOnly') },
                                        { id: 'inactive', label: t('students.inactiveOnly') },
                                        { id: 'expiring', label: t('students.expiringOnly') }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setFilters(prev => ({ ...prev, status: opt.id }))}
                                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${filters.status === opt.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Coach Filter */}
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">{t('students.assignedCoach')}</label>
                                <div className="relative group/select">
                                    <select
                                        value={filters.coachId}
                                        onChange={(e) => setFilters(prev => ({ ...prev, coachId: e.target.value }))}
                                        className="w-full bg-[#0a0c10] border border-white/5 rounded-xl py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">{t('students.allCoaches')}</option>
                                        {coachesData?.map((coach: any) => (
                                            <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-hover/select:text-primary transition-colors pointer-events-none" />
                                </div>
                            </div>

                            {/* Group Filter */}
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">{t('dashboard.allGroups')}</label>
                                <div className="relative group/select">
                                    <select
                                        value={filters.groupId}
                                        onChange={(e) => setFilters(prev => ({ ...prev, groupId: e.target.value }))}
                                        className="w-full bg-[#0a0c10] border border-white/5 rounded-xl py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">{t('students.allGroups')}</option>
                                        {groupsData?.map((group: any) => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-hover/select:text-primary transition-colors pointer-events-none" />
                                </div>
                            </div>

                            {/* Clear All */}
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={() => setFilters({ status: 'all', coachId: 'all', groupId: 'all' })}
                                    className="px-4 py-2.5 text-rose-500/60 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors group/clear ml-auto"
                                >
                                    <X className="w-3.5 h-3.5 group-hover/clear:rotate-90 transition-transform" />
                                    {t('students.clearFilters')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0a0c10] text-white/40 font-black text-[8px] uppercase tracking-[0.15em] border-b border-white/5 sticky top-0 z-10 backdrop-blur-xl">
                                <th className="px-2 sm:px-4 py-3 sm:py-4 w-10 sm:w-12">
                                    <div className="flex items-center justify-center">
                                        <PremiumCheckbox
                                            checked={filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length}
                                            onChange={handleSelectAll}
                                        />
                                    </div>
                                </th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 text-center w-10 sm:w-12">#</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4">{t('common.name')}</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4">{t('students.status')}</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4">{t('students.assignedCoach')}</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4">{t('students.plan')}</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4">{t('students.joinDate')}</th>
                                <th className="px-2 sm:px-4 py-3 sm:py-4 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-20 text-center">
                                        <div className="flex flex-col items-center gap-5">
                                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-white/20 font-black uppercase tracking-widest text-[10px] animate-pulse">{t('common.loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-20 text-center">
                                        <div className="flex flex-col items-center gap-5 grayscale opacity-30">
                                            <Users className="w-12 h-12 text-white" />
                                            <p className="text-white font-black uppercase tracking-widest text-xs">{t('common.noResults')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <StudentRow
                                        key={student.id}
                                        student={student}
                                        index={index}
                                        isSelected={selectedStudentIds.includes(student.id)}
                                        onSelect={handleSelectStudent}
                                        onEdit={(s: Student) => {
                                            setEditingStudent(s);
                                            setShowAddModal(true);
                                        }}
                                        onDelete={setIdToDelete}
                                        onRenew={(s: Student) => {
                                            setStudentToRenew(s);
                                            setShowRenewModal(true);
                                        }}
                                        onToggleStatus={toggleStudentStatus}
                                        currency={currency}
                                        t={t}
                                        subscriptionStatus={getSubscriptionStatus(student.subscription_expiry, student.sessions_remaining)}
                                        onViewProfile={setViewingProfileStudent}
                                        role={role}
                                        onGenerateReport={(s: any) => {
                                            setStudentForReport(s);
                                            setShowReportModal(true);
                                        }}
                                        sessionsRemaining={student.sessions_remaining}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden p-4 sm:p-6 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                            <span className="text-white/20 font-black uppercase tracking-widest text-[10px]">{t('common.loading')}</span>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center grayscale opacity-30">
                            <Users className="w-12 h-12 text-white mx-auto mb-4" />
                            <p className="text-white font-black uppercase tracking-widest text-xs">{t('common.noResults')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredStudents.map((student) => {
                                const subscriptionStatus = getSubscriptionStatus(student.subscription_expiry, student.sessions_remaining);
                                return (
                                    <div
                                        key={student.id}
                                        className={`glass-card p-5 rounded-2xl border border-white/10 hover:border-primary/30 transition-all duration-300 relative overflow-hidden ${selectedStudentIds.includes(student.id) ? 'bg-primary/5 border-primary/40' : 'bg-white/[0.02]'}`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div
                                                className="flex items-start gap-4 flex-1 cursor-pointer"
                                                onClick={() => setViewingProfileStudent(student)}
                                            >
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-xl bg-[#0a0c10] border border-white/10 flex items-center justify-center text-primary font-black text-lg ${!student.is_active && 'opacity-40 grayscale'}`}>
                                                        {student.full_name?.[0] || '?'}
                                                    </div>
                                                    <div className="absolute -top-1 -right-1">
                                                        <PremiumCheckbox
                                                            checked={selectedStudentIds.includes(student.id)}
                                                            onChange={() => handleSelectStudent(student.id)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 pr-2 flex-1">
                                                    <h3 className={`font-black text-white text-lg leading-tight ${!student.is_active && 'opacity-40'} whitespace-nowrap overflow-hidden`}
                                                        style={{
                                                            maskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)',
                                                            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 40px), transparent 100%)'
                                                        }}>
                                                        {student.full_name}
                                                    </h3>
                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">ID: {String(student.id).slice(0, 8)}</p>

                                                    <div className="mt-3 space-y-2">
                                                        {/* Coach & Group */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                                <span className="text-[8px] font-black text-primary">{student.coaches?.full_name?.charAt(0) || '?'}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-white/70">{student.coaches?.full_name || t('common.notAssigned')}</span>
                                                            {student.training_groups?.name && (
                                                                <span className="px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded text-[8px] font-black text-accent uppercase">{student.training_groups.name}</span>
                                                            )}
                                                        </div>

                                                        {/* Plan Info */}
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="text-[10px] font-bold text-white/40">{student.subscription_plans?.name || 'No Plan'}</span>
                                                            {student.sessions_remaining !== null && (
                                                                <span className="text-[10px] font-black text-emerald-400 uppercase">{student.sessions_remaining} Sessions Left</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                        <div className="mt-6 pt-5 border-t border-white/[0.04] flex flex-col gap-5">
                                            {/* Row 1: Info & Status */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">Added</span>
                                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.1em]">
                                                        {format(new Date(student.created_at), 'dd MMM yyyy')}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => toggleStudentStatus(student.id, student.is_active)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm whitespace-nowrap ${!student.is_active
                                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/10'
                                                        : subscriptionStatus.label === t('students.active')
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10'
                                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10'
                                                        }`}
                                                >
                                                    {!student.is_active ? t('common.inactive') : subscriptionStatus.label}
                                                </button>
                                            </div>

                                            {/* Row 2: Action Buttons - Full Width Spreading */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => { setEditingStudent(student); setShowAddModal(true); }}
                                                    className="flex-1 h-11 rounded-xl bg-white/[0.03] hover:bg-primary/10 text-primary/60 hover:text-primary border border-white/5 hover:border-primary/20 flex items-center justify-center transition-all duration-300 active:scale-95"
                                                    title={t('common.edit')}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {(role === 'admin' || role === 'head_coach') && (
                                                    <button
                                                        onClick={() => { setStudentForReport(student); setShowReportModal(true); }}
                                                        className="flex-1 h-11 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 text-emerald-500/60 hover:text-emerald-500 border border-white/5 hover:border-emerald-500/20 flex items-center justify-center transition-all duration-300 active:scale-95"
                                                        title={t('students.generateReport')}
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {subscriptionStatus.label !== t('students.active') && (
                                                    <button
                                                        onClick={() => { setStudentToRenew(student); setShowRenewModal(true); }}
                                                        className="flex-1 h-11 rounded-xl bg-accent/5 hover:bg-accent/10 text-accent border border-accent/10 hover:border-accent/20 flex items-center justify-center transition-all duration-300 active:scale-95"
                                                        title={t('students.renew')}
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setIdToDelete(student.id)}
                                                    className="flex-1 h-11 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 text-rose-500/60 hover:text-rose-500 border border-rose-500/10 hover:border-rose-500/30 flex items-center justify-center transition-all duration-300 active:scale-95"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {
                showAddModal && (
                    <AddStudentForm
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingStudent(null);
                        }}
                        initialData={editingStudent}
                        onSuccess={() => {
                            setShowAddModal(false);
                            setEditingStudent(null);
                            refetch();
                        }}
                    />
                )
            }

            {
                (showPTModal || ptToEdit) && (
                    <AddPTSubscriptionForm
                        editData={ptToEdit}
                        role={role}
                        onClose={() => {
                            setShowPTModal(false);
                            setPtToEdit(null);
                        }}
                        onSuccess={() => {
                            setShowPTModal(false);
                            setPtToEdit(null);
                            fetchPTSubscriptions();
                        }}
                    />
                )
            }

            {
                showPTRenewModal && ptToRenew && (
                    <RenewPTSubscriptionForm
                        subscription={ptToRenew}
                        role={role}
                        onClose={() => {
                            setShowPTRenewModal(false);
                            setPtToRenew(null);
                        }}
                        onSuccess={() => {
                            setShowPTRenewModal(false);
                            setPtToRenew(null);
                            fetchPTSubscriptions();
                        }}
                    />
                )
            }

            {
                showRenewModal && studentToRenew && (
                    <RenewSubscriptionForm
                        student={studentToRenew}
                        onClose={() => {
                            setShowRenewModal(false);
                            setStudentToRenew(null);
                        }}
                        onSuccess={() => {
                            setShowRenewModal(false);
                            setStudentToRenew(null);
                            refetch();
                        }}
                    />
                )
            }

            {
                idToDelete && (
                    <ConfirmModal
                        isOpen={!!idToDelete}
                        onClose={() => setIdToDelete(null)}
                        onConfirm={handleDelete}
                        title={t('students.deleteConfirm')}
                        message={t('students.deleteWarning')}
                    />
                )
            }

            {
                ptToDelete && (
                    <ConfirmModal
                        isOpen={!!ptToDelete}
                        onClose={() => setPtToDelete(null)}
                        onConfirm={handleDeletePT}
                        title="Delete PT Subscription"
                        message={`Are you sure you want to delete the PT subscription for ${ptToDelete.students?.full_name || ptToDelete.student_name || 'this student'}? This action cannot be undone.`}
                    />
                )
            }

            <ConfirmModal
                isOpen={showBulkDeleteModal}
                onClose={() => setShowBulkDeleteModal(false)}
                onConfirm={confirmBulkDelete}
                title={t('common.deleteSelected')}
                message={t('common.confirmDeleteSelectedMessage', { count: selectedStudentIds.length })}
                type="danger"
            />

            <ImportStudentsModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={() => refetch()}
            />

            {
                viewingProfileStudent && (
                    <GymnastProfileModal
                        student={viewingProfileStudent}
                        onClose={() => setViewingProfileStudent(null)}
                    />
                )
            }
            {
                studentForReport && (
                    <MonthlyReportModal
                        isOpen={showReportModal}
                        onClose={() => {
                            setShowReportModal(false);
                            setStudentForReport(null);
                        }}
                        student={studentForReport}
                        currentUserRole={role}
                    />
                )
            }
            {
                showHistoryModal && selectedSub && (
                    <PremiumCalendarModal
                        subscriptionId={selectedSub.id}
                        studentName={selectedSub.students?.full_name || selectedSub.student_name || 'Student'}
                        onClose={() => {
                            setShowHistoryModal(false);
                            setSelectedSub(null);
                        }}
                    />
                )
            }
        </div>
    );
}

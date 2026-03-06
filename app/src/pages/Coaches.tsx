import { useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Filter, Mail, Phone, MapPin, Medal, DollarSign, Clock, Edit, Trash2, X, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import AddCoachForm from '../components/AddCoachForm';
import ConfirmModal from '../components/ConfirmModal';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
import Payroll from '../components/Payroll';
import { useTranslation } from 'react-i18next';
import ImageLightbox from '../components/ImageLightbox';
import { useCoaches } from '../hooks/useData';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';
import { useOutletContext, useLocation } from 'react-router-dom';

interface Coach {
    id: string;
    profile_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    specialty: string;
    pt_rate: number;
    avatar_url?: string;
    image_pos_x?: number;
    image_pos_y?: number;
    role?: string;
    profiles?: { role: string };
    admin_only_info?: boolean; // Type hint
}

interface CoachCardProps {
    coach: Coach;
    role: string | null;
    t: any;
    currency: any;
    onEdit: () => void;
    onDelete: () => void;
    onAttendance: () => void;
    onManualAttendance?: () => void;
    onEnlargeImage?: (url: string) => void;
    isPremium?: boolean;
    isCompact?: boolean;
}

const CoachCard = memo(({ coach, role, t, currency, onEdit, onDelete, onAttendance, onManualAttendance, onEnlargeImage, isPremium, isCompact }: CoachCardProps) => {
    const isWorking = (coach as any).attendance_status === 'working';
    const isDone = (coach as any).attendance_status === 'done';
    const coachRole = coach.role?.toLowerCase().trim();
    const isHeadCoach = coachRole === 'head_coach' || coachRole === 'admin';

    // LIVE TIMER LOGIC
    const [liveSeconds, setLiveSeconds] = useState((coach as any).daily_total_seconds || 0);

    useEffect(() => {
        setLiveSeconds((coach as any).daily_total_seconds || 0);
    }, [(coach as any).daily_total_seconds]);

    useEffect(() => {
        if (!isWorking) return;
        const interval = setInterval(() => {
            setLiveSeconds((prev: number) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isWorking]);

    return (
        <div className={`glass-card rounded-[1.5rem] md:rounded-[2rem] border transition-all duration-700 relative overflow-hidden group 
            ${isHeadCoach
                ? 'p-5 border-primary/30 bg-primary/5 hover:border-primary/50 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.2)]'
                : isCompact
                    ? 'p-3 border-white/5 bg-white/[0.01] hover:border-white/10'
                    : 'p-4 border-white/10 bg-white/[0.02] hover:border-white/30 shadow-premium'
            } hover:scale-[1.02] hover:-translate-y-1`}>
            {/* Premium Glow Effect for Head Coach */}
            {isHeadCoach && (
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[1.5rem] md:rounded-[2rem] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Header Row: Badge & Top Actions */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-2">
                        {/* Status Badge */}
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all duration-500
                            ${isWorking ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                isDone ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-white/5 text-white/40 border-white/5'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isWorking ? 'bg-emerald-400 animate-pulse' : isDone ? 'bg-blue-400' : 'bg-white/20'}`}></span>
                            {isWorking ? t('coaches.live') : isDone ? t('coaches.completed') : t('coaches.away')}
                        </div>
                        {/* Premium Badge */}
                        {isPremium && (
                            <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                EXECUTIVE
                            </span>
                        )}
                    </div>
                </div>

                {/* Main Content: Avatar & Name */}
                <div className={`flex flex-col items-center text-center ${isHeadCoach ? 'gap-3 mb-4' : 'gap-4 mb-4'}`}>
                    {/* Avatar */}
                    <div className="relative shrink-0 group/avatar cursor-zoom-in" onClick={() => onEnlargeImage?.(coach.avatar_url!)}>
                        {/* Gold Ribbon for Head Coach */}
                        {isHeadCoach && (
                            <div className="absolute -top-2 -left-2 z-30 bg-gradient-to-r from-amber-400 to-primary text-black text-[9px] font-black px-3 py-1 rounded-full shadow-lg shadow-amber-500/20 uppercase tracking-[0.2em] transform -rotate-12 border border-amber-200/50">
                                LEADER
                            </div>
                        )}

                        <div className={`absolute -inset-4 bg-gradient-to-tr from-primary/40 to-accent/40 rounded-full blur-2xl opacity-0 ${isHeadCoach ? 'opacity-30' : 'group-hover/avatar:opacity-100'} transition-all duration-500`}></div>

                        {coach.avatar_url ? (
                            <div className={`relative ${isHeadCoach ? 'w-20 h-20' : 'w-14 h-14'} p-[1px] bg-gradient-to-tr from-primary/40 to-transparent rounded-[1.5rem] overflow-hidden shadow-2xl group-hover/avatar:scale-105 transition-all duration-500`}>
                                <img
                                    src={coach.avatar_url}
                                    alt={coach.full_name}
                                    className="w-full h-full rounded-[1.4rem] object-cover"
                                    style={{ objectPosition: `${coach.image_pos_x ?? 50}% ${coach.image_pos_y ?? 50}%` }}
                                />
                            </div>
                        ) : (
                            <div className={`relative ${isHeadCoach ? 'w-20 h-20' : 'w-14 h-14'} rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 shadow-inner group-hover/avatar:text-primary transition-colors`}>
                                <Medal className={`${isHeadCoach ? 'w-8 h-8' : 'w-6 h-6'}`} />
                            </div>
                        )}
                        {isWorking && (
                            <div className={`absolute -bottom-1 -right-1 ${isHeadCoach ? 'w-6 h-6' : 'w-3.5 h-3.5'} bg-emerald-500 border-2 border-[#0a0c10] rounded-full animate-pulse z-40 shadow-[0_0_15px_rgba(16,185,129,0.5)]`}></div>
                        )}
                    </div>

                    {/* Name & Role */}
                    <div className="w-full">
                        <h3 className={`${isHeadCoach ? 'text-xl mb-2' : 'text-base mb-1'} font-black text-white tracking-tighter leading-tight group-hover:text-primary transition-colors`} title={coach.full_name}>
                            {coach.full_name}
                        </h3>
                        <div className="flex flex-col items-center gap-1">
                            {coach.role && (
                                <p className={`${isHeadCoach ? 'text-[11px] px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary' : 'text-[9px] text-white/40'} font-black uppercase tracking-[0.3em]`}>
                                    {t(`roles.${coach.role}`)}
                                </p>
                            )}
                            {coach.specialty && !['reception', 'cleaner'].includes(coachRole || '') && (
                                <p className={`${isHeadCoach ? 'text-[10px]' : 'text-[9px]'} font-bold uppercase tracking-wider text-white/20 mt-1`}>
                                    {coach.specialty}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Optimized Footer: Row 1 (Metrics) & Row 2 (Full Width Actions) */}
                <div className="mt-auto space-y-4">
                    {/* Metrics / Info Rows */}
                    <div className="grid grid-cols-1 gap-1.5">
                        {/* Worked Time */}
                        {(coach as any).daily_total_seconds > 0 && (
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40 bg-white/[0.02] p-2 rounded-lg border border-white/[0.02]">
                                <Clock className="w-2.5 h-2.5 text-primary" />
                                <span>
                                    {Math.floor(liveSeconds / 3600)}h {Math.floor((liveSeconds % 3600) / 60)}m
                                </span>
                                {isWorking && <span className="text-emerald-500 ml-auto animate-pulse">{liveSeconds % 60}s</span>}
                            </div>
                        )}

                        {/* PT Stats (Admin/Coach only) */}
                        {!['reception', 'cleaner'].includes(coachRole || '') && (
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40 bg-white/[0.02] p-2 rounded-lg border border-white/[0.02]">
                                <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-white/20">SESSIONS:</span>
                                    <span className="text-white font-bold">{(coach as any).pt_sessions_today || 0}</span>
                                </div>
                                {role === 'admin' && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-primary font-bold">{coach.pt_rate}</span>
                                        <span className="text-[7px] text-primary/50">{currency.code}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Full-Width Action Row */}
                    <div className="flex items-center gap-2">
                        {['admin', 'reception', 'receptionist'].includes(role || '') && (
                            <button
                                onClick={onAttendance}
                                className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-primary/20 text-white border border-white/10 hover:border-primary/20 flex items-center justify-center gap-2 transition-all duration-300 active:scale-95"
                                title={t('coaches.viewAttendance')}
                            >
                                <Clock className="w-4 h-4" />
                            </button>
                        )}

                        {role === 'admin' && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-300 active:scale-95"
                                    title={t('common.edit')}
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                    className="flex-1 h-11 rounded-xl bg-rose-500/5 hover:bg-rose-500/15 text-rose-500/60 hover:text-rose-500 border border-rose-500/10 hover:border-rose-500/30 flex items-center justify-center transition-all duration-300 active:scale-95"
                                    title={t('common.delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        {coachRole === 'cleaner' && onManualAttendance && (
                            <button
                                onClick={onManualAttendance}
                                className="flex-1 h-11 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10 flex items-center justify-center gap-2 transition-all duration-300 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Premium Corner Accent (restored but subtle) */}
            {isPremium && (
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none opacity-50">
                    <div className="absolute top-[8px] right-[-24px] w-[80px] h-4 bg-primary/10 rotate-45"></div>
                </div>
            )}
        </div>
    );
});

export default function Coaches() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const location = useLocation();
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const { data: coachesData, isLoading: loading, refetch } = useCoaches();
    const [searchQuery, setSearchQuery] = useState('');
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // Handle initial search query from dashboard search
    useEffect(() => {
        const query = (location.state as any)?.query;
        if (query) {
            setSearchQuery(query);
            // Clear state so it doesn't filter on every navigation
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Filter coaches based on current user role and search query
    const coaches = (coachesData || []).filter(coach => {
        const cRole = coach.role || (coach as any).profiles?.role;
        const normalizedRole = cRole?.toLowerCase().trim();

        // 1. Hide Admin completely from the grid (per user request)
        if (normalizedRole === 'admin') {
            return false;
        }

        // 2. Role-based view filtering (Head Coach cannot see support staff)
        if (role === 'head_coach') {
            if (['reception', 'receptionist', 'cleaner'].includes(normalizedRole || '')) {
                return false;
            }
        }

        // 3. Search filtering
        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            return coach.full_name?.toLowerCase().includes(searchLower) ||
                normalizedRole?.includes(searchLower) ||
                (coach.specialty && coach.specialty.toLowerCase().includes(searchLower));
        }

        return true;
    });

    const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Attendance Modal State
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedCoachForAttendance, setSelectedCoachForAttendance] = useState<Coach | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    // Manual Attendance (Cleaner)
    const [showManualAttendance, setShowManualAttendance] = useState(false);
    const [selectedCoachForManual, setSelectedCoachForManual] = useState<Coach | null>(null);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [coachToDelete, setCoachToDelete] = useState<string | null>(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchAttendance = async (coachId: string) => {
        setLoadingAttendance(true);
        try {
            const { data, error } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setAttendanceLogs(data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            toast.error(t('common.error'));
        } finally {
            setLoadingAttendance(false);
        }
    };

    const confirmDelete = (id: string) => {
        setCoachToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!coachToDelete) return;

        const coach = coaches.find(c => c.id === coachToDelete);
        const profileId = coach?.profile_id || (coach as any).profiles?.id || coach?.id;

        const deleteToast = toast.loading(t('common.deleting', 'Processing deletion...'));
        console.log('🛡️ Protection: Starting full deletion for coach:', { coachId: coachToDelete, profileId });

        try {
            if (!profileId) {
                // Fallback for coaches without profile_id (shouldn't happen with new logic)
                const { error: coachDeleteError } = await supabase.from('coaches').delete().eq('id', coachToDelete);
                if (coachDeleteError) throw coachDeleteError;
            } else {
                // Use RPC for full cleanup (Auth + Profile + Coach)
                const { error: rpcError } = await supabase.rpc('delete_user_by_id', {
                    target_user_id: profileId
                });
                if (rpcError) throw rpcError;
            }

            toast.success(t('common.deleteSuccess', 'Staff member deleted completely'), { id: deleteToast });
            refetch();
        } catch (error: any) {
            console.error('🛡️ Protection: Deletion sequence failed:', error);
            toast.error(t('common.deleteError', `Deletion failed: ${error.message || 'Unknown error'}`), { id: deleteToast });
        } finally {
            setShowDeleteModal(false);
            setCoachToDelete(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <PageHeader
                title={t('coaches.title')}
                subtitle={t('coaches.subtitle')}
            >
                <div className="relative group w-full sm:w-80">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all font-bold tracking-wide"
                        placeholder="Search coaches..."
                    />
                </div>

                {role?.toLowerCase().trim() === 'admin' && (
                    <button
                        onClick={() => {
                            setEditingCoach(null);
                            setShowAddModal(true);
                        }}
                        className="group flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary/50 text-primary hover:text-white px-6 py-3.5 rounded-xl shadow-lg transition-all active:scale-95 w-full sm:w-auto"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        <span className="font-extrabold uppercase tracking-widest text-xs">{t('dashboard.addCoach')}</span>
                    </button>
                )}
            </PageHeader>


            {/* Premium Staff Sections */}
            <div className="space-y-16">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-6">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{t('common.loading')}</p>
                    </div>
                ) : (
                    <>
                        {/* 1. Head Coaches / Leadership Section */}
                        {coaches.some(c => ['head_coach', 'admin'].includes(c.role?.toLowerCase() || '')) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                                    <h2 className="text-xs font-black text-primary uppercase tracking-[0.5em]">{t('roles.head_coach')}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {coaches
                                        .filter(c => ['head_coach', 'admin'].includes(c.role?.toLowerCase() || ''))
                                        .map(coach => (
                                            <CoachCard
                                                key={coach.id}
                                                coach={coach}
                                                isPremium={true}
                                                role={role}
                                                t={t}
                                                currency={currency}
                                                onEdit={() => { setEditingCoach(coach); setShowAddModal(true); }}
                                                onDelete={() => confirmDelete(coach.id)}
                                                onAttendance={() => { setSelectedCoachForAttendance(coach); setShowAttendanceModal(true); fetchAttendance(coach.id); }}
                                                onEnlargeImage={(url) => setEnlargedImage(url)}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Regular Coaches Section */}
                        {coaches.some(c => c.role?.toLowerCase() === 'coach') && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    <h2 className="text-xs font-black text-white/40 uppercase tracking-[0.5em]">{t('roles.coach')}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {coaches
                                        .filter(c => c.role?.toLowerCase() === 'coach')
                                        .map(coach => (
                                            <CoachCard
                                                key={coach.id}
                                                coach={coach}
                                                role={role}
                                                t={t}
                                                currency={currency}
                                                onEdit={() => { setEditingCoach(coach); setShowAddModal(true); }}
                                                onDelete={() => confirmDelete(coach.id)}
                                                onAttendance={() => { setSelectedCoachForAttendance(coach); setShowAttendanceModal(true); fetchAttendance(coach.id); }}
                                                onEnlargeImage={(url) => setEnlargedImage(url)}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Support Staff Section (Receptionist, Cleaner) */}
                        {coaches.some(c => ['receptionist', 'reception', 'cleaner'].includes(c.role?.toLowerCase() || '')) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                    <h2 className="text-xs font-black text-white/20 uppercase tracking-[0.5em]">{t('coaches.supportStaff', 'Support Staff')}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 opacity-80 hover:opacity-100 transition-opacity duration-500">
                                    {coaches
                                        .filter(c => ['receptionist', 'reception', 'cleaner'].includes(c.role?.toLowerCase() || ''))
                                        .map(coach => (
                                            <CoachCard
                                                key={coach.id}
                                                coach={coach}
                                                isCompact={true}
                                                role={role}
                                                t={t}
                                                currency={currency}
                                                onEdit={() => { setEditingCoach(coach); setShowAddModal(true); }}
                                                onDelete={() => confirmDelete(coach.id)}
                                                onAttendance={() => { setSelectedCoachForAttendance(coach); setShowAttendanceModal(true); fetchAttendance(coach.id); }}
                                                onManualAttendance={() => { setSelectedCoachForManual(coach); setShowManualAttendance(true); }}
                                                onEnlargeImage={(url) => setEnlargedImage(url)}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>


            {
                role?.toLowerCase().trim() === 'admin' && (
                    <Payroll
                        refreshTrigger={refreshTrigger}
                        onViewAttendance={(coachId: string) => {
                            const coach = coaches.find(c => c.id === coachId);
                            if (coach) {
                                setSelectedCoachForAttendance(coach);
                                setShowAttendanceModal(true);
                                fetchAttendance(coachId);
                            }
                        }}
                    />
                )
            }

            {/* Add/Edit Modal */}
            {
                showAddModal && (
                    <AddCoachForm
                        initialData={editingCoach ? {
                            ...editingCoach,
                            role: editingCoach.profiles?.role || 'coach'
                        } : null}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingCoach(null);
                        }}
                        onSuccess={refetch}
                    />
                )
            }

            {/* Attendance Modal */}
            {
                showAttendanceModal && selectedCoachForAttendance && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="glass-card rounded-[2.5rem] md:rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-white/20 overflow-hidden">
                            <div className="p-6 md:p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">{selectedCoachForAttendance.full_name}</h2>
                                    <p className="text-primary text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mt-1">{t('coaches.attendanceHistory')}</p>
                                </div>
                                <button onClick={() => setShowAttendanceModal(false)} className="p-3 md:p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                                    <X className="w-5 h-5 md:w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                                {loadingAttendance ? (
                                    <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest animate-pulse">{t('common.loading')}</div>
                                ) : attendanceLogs.length === 0 ? (
                                    <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest italic">
                                        {t('common.noResults')}
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile view (Cards) */}
                                        <div className="md:hidden space-y-4">
                                            {attendanceLogs.map((log: any) => {
                                                const start = new Date(log.check_in_time);
                                                const end = log.check_out_time ? new Date(log.check_out_time) : null;
                                                const duration = end ? ((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2) + ' HR' : '-';

                                                return (
                                                    <div key={log.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-black text-white/80">{log.date}</span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${end ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                                                {duration}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                                                            <div className="space-y-1">
                                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{t('coaches.checkIn')}</span>
                                                                <p className="text-sm font-mono font-black text-white/60">
                                                                    {log.status === 'absent' ? <span className="text-rose-400">ABSENT</span> : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                            {selectedCoachForAttendance.role !== 'cleaner' && (
                                                                <div className="space-y-1">
                                                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{t('coaches.checkOut')}</span>
                                                                    <p className="text-sm font-mono font-black text-white/60">
                                                                        {end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Desktop view (Table) */}
                                        <table className="hidden md:table w-full text-left">
                                            <thead className="bg-white/5 text-white/30 font-black text-[10px] uppercase tracking-[0.2em]">
                                                <tr>
                                                    <th className="px-6 py-4 rounded-l-2xl">{t('common.date')}</th>
                                                    <th className="px-6 py-4">{t('coaches.checkIn')}</th>
                                                    {selectedCoachForAttendance.role !== 'cleaner' && <th className="px-6 py-4">{t('coaches.checkOut')}</th>}
                                                    <th className="px-6 py-4 rounded-r-2xl text-right">{t('coaches.duration')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {attendanceLogs.map((log: any) => {
                                                    const start = new Date(log.check_in_time);
                                                    const end = log.check_out_time ? new Date(log.check_out_time) : null;
                                                    const duration = end ? ((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2) + ' HR' : '-';

                                                    return (
                                                        <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                                            <td className="px-6 py-6 font-bold text-white/70">{log.date}</td>
                                                            <td className="px-6 py-6 font-black font-mono text-sm text-white/50">
                                                                {log.status === 'absent' ? <span className="text-rose-400">ABSENT</span> : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </td>
                                                            {selectedCoachForAttendance.role !== 'cleaner' && (
                                                                <td className="px-6 py-6 font-black font-mono text-sm text-white/50">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                            )}
                                                            <td className={`px-6 py-6 font-black text-right text-sm ${end ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                                {duration}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={t('common.deleteConfirmTitle', 'Delete Coach')}
                message={t('common.deleteConfirm', 'Are you sure to delete this coach? This action cannot be undone.')}
            />

            {showManualAttendance && selectedCoachForManual && (
                <ManualAttendanceModal
                    coach={selectedCoachForManual}
                    onClose={() => setShowManualAttendance(false)}
                    onSuccess={() => {
                        refetch();
                        toast.success(t('common.saved'));
                    }}
                />
            )}

            <ImageLightbox
                imageUrl={enlargedImage}
                onClose={() => setEnlargedImage(null)}
            />
        </div >
    );
}


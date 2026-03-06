import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, User, Users, Trophy, Download, FileText, Edit2, Check, RotateCcw, Plus, Trash2, Layers, ChevronDown, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import BatchAssessmentDetailsModal from './BatchAssessmentDetailsModal';
import { useTheme } from '../context/ThemeContext';

interface AssessmentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCoachId?: string | null;
}

export default function AssessmentHistoryModal({ isOpen, onClose, currentCoachId }: AssessmentHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const [batchToDelete, setBatchToDelete] = useState<any>(null);
    const [coachFilter, setCoachFilter] = useState<string>('all');
    const [coachesList, setCoachesList] = useState<any[]>([]);
    const [selectedBatchKeys, setSelectedBatchKeys] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const { userProfile } = useTheme();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    const normalizedRole = userProfile?.role?.toLowerCase().trim() || '';
    const canDelete = normalizedRole.includes('admin') || normalizedRole.includes('head') || normalizedRole.includes('master');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
            fetchCoaches();
        }
    }, [isOpen]);

    const fetchCoaches = async () => {
        const { data } = await supabase.from('coaches').select('id, full_name, role').order('full_name');
        if (data) {
            const filtered = data.filter((c: any) => {
                const role = (c.role || '').toLowerCase();
                const name = (c.full_name || '').toLowerCase();
                const forbidden = ['admin', 'reception', 'cleaner', 'reciption'];
                return !forbidden.some(f => role.includes(f) || name.includes(f));
            });
            setCoachesList(filtered);

            // If the user is a coach (not admin), lock the filter to their ID
            if (!canDelete && userProfile?.id) {
                setCoachFilter(userProfile.id);
            }
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Fetch assessments with:
            // 1. Assessing Coach (from coach_id)
            // 2. Responsible Coach (from students -> coaches)
            let query = supabase
                .from('skill_assessments')
                .select(`
id,
    title,
    date,
    coach_id,
    total_score,
    coaches(full_name),
    students(
        coaches(full_name)
    )
        `)
                .order('date', { ascending: false });

            if (currentCoachId) {
                query = query.eq('coach_id', currentCoachId);
            } else if (!canDelete && userProfile?.id) {
                // Security: Regular coaches can only see their own assessments
                query = query.eq('coach_id', userProfile.id);
            }

            const { data, error } = await query;

            console.log('History fetch result:', { data, error, currentCoachId });

            if (error) throw error;

            if (data) {
                const grouped = data.reduce((acc: any, curr: any) => {
                    const key = `${curr.title}-${curr.date}`;
                    if (!acc[key]) {
                        acc[key] = {
                            key,
                            title: curr.title,
                            date: curr.date,
                            // Assessing Coach (who did the test)
                            assessing_coach: curr.coaches?.full_name,
                            assessing_coach_id: curr.coach_id,
                            // Responsible Coach (assigned to student)
                            responsible_coach: curr.students?.coaches?.full_name,
                            count: 0,
                            total_score_sum: 0,
                            ids: []
                        };
                    }
                    acc[key].count++;
                    acc[key].total_score_sum += (curr.total_score || 0);
                    acc[key].ids.push(curr.id);
                    return acc;
                }, {});

                setHistory(Object.values(grouped));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item =>
        coachFilter === 'all' || item.assessing_coach_id === coachFilter
    );

    const handleDeleteBatch = async () => {
        if (!batchToDelete) return;

        const toastId = toast.loading('Deleting batch assessment...');
        try {
            const { error } = await supabase
                .from('skill_assessments')
                .delete()
                .eq('title', batchToDelete.title)
                .eq('date', batchToDelete.date);

            if (error) throw error;

            toast.success('Deleted', { id: toastId });
            setBatchToDelete(null);
            setSelectedBatchKeys(prev => prev.filter(k => k !== batchToDelete.key));
            fetchHistory();
        } catch (err) {
            console.error('Error deleting batch:', err);
            toast.error('Failed to delete assessment batch', { id: toastId });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedBatchKeys.length === 0) return;

        setIsBulkDeleting(true);
        const toastId = toast.loading(`Deleting ${selectedBatchKeys.length} batches...`);
        try {
            // We need to delete by title and date combinations because our key is composite in the grouping
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
        if (selectedBatchKeys.length === filteredHistory.length) {
            setSelectedBatchKeys([]);
        } else {
            setSelectedBatchKeys(filteredHistory.map(h => h.key));
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
                <div className="relative w-full max-w-[440px] bg-black/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700">
                    {/* Dynamic Glass Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                    {/* Header Section */}
                    <div className="relative z-10 p-7 border-b border-white/10 bg-black/20">
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                                        <Trophy className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span>Assessments</span>
                                        <div className="flex items-center gap-4 mt-1.5">
                                            <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-white/40">
                                                <Layers className="w-3.5 h-3.5" />
                                                {filteredHistory.length}
                                            </span>
                                            <div className="relative group/filter flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all cursor-pointer" onClick={() => canDelete && setIsFilterOpen(!isFilterOpen)}>
                                                <Users className={`w-3.5 h-3.5 ${isFilterOpen ? 'text-primary' : 'text-white/40'} transition-colors`} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                                    {coachFilter === 'all' ? 'All' : (coachesList.find(c => c.id === coachFilter)?.full_name.split(' ')[0] || 'Filter')}
                                                </span>
                                                {canDelete && <ChevronDown className={`w-3 h-3 text-white/20 transition-transform duration-500 ${isFilterOpen ? 'rotate-180 text-primary' : ''}`} />}

                                                {/* Premium Dropdown Menu */}
                                                {isFilterOpen && canDelete && (
                                                    <>
                                                        <div className="fixed inset-0 z-[120]" onClick={(e) => { e.stopPropagation(); setIsFilterOpen(false); }} />
                                                        <div className={`absolute top-full mt-2 w-48 bg-[#0E1D21]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[130] animate-in fade-in zoom-in-95 duration-300 origin-top ${isRtl ? 'left-0' : 'right-0'}`}>
                                                            <div className="p-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setCoachFilter('all'); setIsFilterOpen(false); }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${coachFilter === 'all' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                                                                >
                                                                    <Layers className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">All Coaches</span>
                                                                </button>
                                                                <div className="h-px bg-white/5 my-1" />
                                                                {coachesList.map(c => (
                                                                    <button
                                                                        key={c.id}
                                                                        onClick={(e) => { e.stopPropagation(); setCoachFilter(c.id); setIsFilterOpen(false); }}
                                                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${coachFilter === c.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                                                                    >
                                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${coachFilter === c.id ? 'bg-primary/10 text-primary' : 'bg-white/5 text-white/40'}`}>
                                                                            {c.full_name[0]}
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{c.full_name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </h2>
                            </div>

                            <div className="flex items-center gap-3">
                                {canDelete && filteredHistory.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setIsSelectMode(!isSelectMode);
                                            if (isSelectMode) setSelectedBatchKeys([]);
                                        }}
                                        className={`p-3 rounded-xl transition-all border ${isSelectMode ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6 text-white/60" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 px-6 pb-2 max-h-[60vh] overflow-y-auto custom-scrollbar pt-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Fetching...</p>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="text-center py-16 opacity-20">
                                <Layers className="w-12 h-12 text-white mx-auto mb-4" />
                                <p className="text-[10px] text-white font-black uppercase tracking-[0.3em]">{t('common.noRecordsFound', 'No Records Found')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {filteredHistory.map((batch: any, idx: number) => {
                                    const avgScore = batch.total_score_sum / batch.count;
                                    const isExcellent = avgScore >= 16;

                                    return (
                                        <div
                                            key={batch.key}
                                            onClick={() => {
                                                if (isSelectMode) {
                                                    toggleSelection(batch.key);
                                                } else {
                                                    setSelectedBatch(batch);
                                                }
                                            }}
                                            className={`group/item relative bg-white/[0.02] hover:bg-white/[0.04] border rounded-2xl p-4 transition-all duration-300 cursor-pointer overflow-hidden ${selectedBatchKeys.includes(batch.key) ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="relative z-10 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    {isSelectMode ? (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); toggleSelection(batch.key); }}
                                                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${selectedBatchKeys.includes(batch.key) ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-white/20 hover:border-primary/50'}`}
                                                        >
                                                            {selectedBatchKeys.includes(batch.key) ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-white/10" />}
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-[12px] text-white/20 group-hover/item:text-primary transition-all shrink-0">
                                                            {String(idx + 1).padStart(2, '0')}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                                                        <h3 className="text-base font-black text-white/90 group-hover/item:text-white transition-colors uppercase tracking-tight truncate">
                                                            {batch.title}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2.5 mt-1 text-white/40">
                                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                                                <Calendar className="w-3 h-3" />
                                                                {format(new Date(batch.date), 'MMM dd, yy')}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary/60 whitespace-nowrap">
                                                                <Users className="w-3 h-3" />
                                                                {batch.count}
                                                            </span>
                                                            {batch.assessing_coach && (
                                                                <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-tighter truncate max-w-[80px]">
                                                                    @{batch.assessing_coach.split(' ')[0]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    {!isSelectMode && (
                                                        <>
                                                            <div className="flex flex-col items-center">
                                                                <span className={`text-xl font-black tracking-tighter ${isExcellent ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'text-white/80 group-hover/item:text-primary'}`}>
                                                                    {avgScore.toFixed(1)}
                                                                </span>
                                                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em]">Score</span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                {canDelete && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setBatchToDelete(batch); }}
                                                                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all border border-white/5"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                    <Eye className="w-4 h-4 text-primary" />
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Action Footer */}
                    <div className="relative z-10 px-8 py-6">
                        {isSelectMode ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={selectAll}
                                    className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all font-black uppercase tracking-[0.2em] text-[10px]"
                                >
                                    {selectedBatchKeys.length === filteredHistory.length ? 'Deselect All' : 'Select All'}
                                </button>
                                <button
                                    onClick={() => setShowBulkConfirm(true)}
                                    disabled={selectedBatchKeys.length === 0}
                                    className="flex-[2] py-3.5 rounded-2xl bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_15px_30px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete ({selectedBatchKeys.length})
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-3.5 rounded-2xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_15px_30px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden"
                            >
                                <span className="font-black uppercase tracking-[0.4em] text-[11px]">
                                    {t('common.dismiss')}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {batchToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setBatchToDelete(null)} />
                    <div className="relative w-full max-w-xs bg-[#16292E] border border-white/10 rounded-[2rem] shadow-[0_0_100px_rgba(239,68,68,0.2)] p-6 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>

                        <h3 className="text-xl font-black text-white text-center uppercase tracking-tight">Delete?</h3>
                        <p className="text-white/40 text-center text-[11px] mt-2.5 leading-relaxed px-2">
                            Permanently delete <span className="text-white font-bold underline decoration-red-500 decoration-1 italic">"{batchToDelete.title}"</span>?
                        </p>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setBatchToDelete(null)}
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all rounded-xl font-black uppercase tracking-[0.2em] text-[9px] border border-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteBatch}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white transition-all rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_30px_rgba(239,68,68,0.3)] active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all rounded-xl font-black uppercase tracking-[0.2em] text-[10px] border border-white/5 disabled:opacity-50"
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
        </>
    );
}

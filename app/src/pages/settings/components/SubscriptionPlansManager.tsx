import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, ChevronDown, ArrowRight, Calendar, Clock, Sparkles, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCurrency } from '../../../context/CurrencyContext';
import { useSubscriptionPlans, useAddPlan, useDeletePlan, useUpdatePlan } from '../../../hooks/useData';
import { FullScreenPreview } from './FullScreenPreview';

interface SubscriptionPlansManagerProps {
    showFullPreview: boolean;
    setShowFullPreview: (show: boolean) => void;
    previewSettings: any;
    designMode: 'desktop' | 'mobile';
}

export function SubscriptionPlansManager({
    showFullPreview,
    setShowFullPreview,
    previewSettings,
    designMode
}: SubscriptionPlansManagerProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const { data: plans, isLoading } = useSubscriptionPlans();
    const addPlanMutation = useAddPlan();
    const deletePlanMutation = useDeletePlan();
    const updatePlanMutation = useUpdatePlan();

    const [newPlan, setNewPlan] = useState({
        name: '',
        duration_months: '' as any,
        price: '' as any,
        sessions_per_week: 3,
        sessions_limit: 0
    });
    const [isAdding, setIsAdding] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [editingPlan, setEditingPlan] = useState<{ id: string, name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number } | null>(null);

    // Auto-calculate sessions_limit for newPlan
    useEffect(() => {
        const duration = parseInt(newPlan.duration_months);
        if (!isNaN(duration) && newPlan.sessions_per_week) {
            const calculated = duration * newPlan.sessions_per_week * 4;
            if (newPlan.sessions_limit !== calculated) {
                setNewPlan(prev => ({
                    ...prev,
                    sessions_limit: calculated
                }));
            }
        }
    }, [newPlan.duration_months, newPlan.sessions_per_week, newPlan.sessions_limit]);

    // Auto-calculate sessions_limit for editingPlan
    useEffect(() => {
        if (editingPlan) {
            const calculated = (editingPlan.duration_months || 0) * (editingPlan.sessions_per_week || 0) * 4;
            if (editingPlan.sessions_limit !== calculated) {
                setEditingPlan(prev => prev ? { ...prev, sessions_limit: calculated } : null);
            }
        }
    }, [editingPlan?.duration_months, editingPlan?.sessions_per_week]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan || !editingPlan.name) return;
        try {
            await updatePlanMutation.mutateAsync(editingPlan);
            toast.success('Plan updated successfully');
            setEditingPlan(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to update plan:', error);
            toast.error(`Error: ${error.message || 'Failed to update plan'}`);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const duration = parseInt(newPlan.duration_months);
        const price = parseFloat(newPlan.price);

        if (!newPlan.name || isNaN(duration) || isNaN(price)) {
            toast.error('Please fill all fields correctly');
            return;
        }

        try {
            await addPlanMutation.mutateAsync({
                ...newPlan,
                duration_months: duration,
                price: price
            });
            toast.success('Plan added successfully');
            setNewPlan({ name: '', duration_months: '' as any, price: '' as any, sessions_per_week: 3, sessions_limit: 0 });
            setIsAdding(false);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to add plan:', error);
            toast.error(`Error: ${error.message || 'Failed to add plan'}`);
        }
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        try {
            await deletePlanMutation.mutateAsync(planToDelete);
            toast.success('Plan deleted');
            setPlanToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to delete plan:', error);
            if (error?.code === '23503' || error?.message?.includes('foreign key constraint') || error?.details?.includes('still referenced')) {
                toast.error(t('settings.planInUseError') || 'Cannot delete: Plan is assigned to students/subscriptions.');
            } else {
                toast.error(`Error: ${error.message || 'Failed to delete plan'}`);
            }
            setPlanToDelete(null);
        }
    };

    return (
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden relative group/manager">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none group-hover/manager:bg-primary/20 transition-all duration-700"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        {t('settings.subscriptionPlans')}
                    </h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] ml-1">Elite Training Packages</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`p-3 rounded-2xl transition-all duration-500 shadow-xl ${isAdding ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30' : 'bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110 active:scale-95'}`}
                >
                    <Plus className={`w-6 h-6 transition-transform duration-500 ${isAdding ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-10 p-6 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6 animate-in zoom-in slide-in-from-top-4 duration-500 relative z-10 transition-all">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3">{t('settings.planName')}</label>
                        <input
                            type="text"
                            value={newPlan.name}
                            onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 focus:bg-black/60 transition-all font-bold text-sm shadow-inner"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">{t('settings.sessionsPerWeek')}</label>
                            <div className="relative">
                                <select
                                    value={newPlan.sessions_per_week}
                                    onChange={e => setNewPlan({ ...newPlan, sessions_per_week: parseInt(e.target.value) || 3 })}
                                    className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm appearance-none cursor-pointer hover:bg-black/60 shadow-inner"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => (
                                        <option key={num} value={num} className="bg-[#0a0a0a] text-white">{num} {t('coaches.sessions')}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">{t('settings.months')}</label>
                            <input
                                type="number"
                                min="1"
                                value={newPlan.duration_months}
                                onChange={e => setNewPlan({ ...newPlan, duration_months: e.target.value })}
                                className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm hover:bg-black/60 shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">Total Sessions</label>
                            <input
                                type="number"
                                value={newPlan.sessions_limit}
                                onChange={e => setNewPlan({ ...newPlan, sessions_limit: parseInt(e.target.value) || 0 })}
                                className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-emerald-400 outline-none focus:border-primary/50 transition-all font-black text-sm hover:bg-black/60 shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 ml-3 whitespace-nowrap">{t('settings.price')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={newPlan.price}
                                    onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                                    className="w-full px-5 py-4.5 rounded-2xl border border-white/10 bg-black/40 text-white outline-none focus:border-primary/50 transition-all font-bold text-sm pr-16 hover:bg-black/60"
                                />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/40 uppercase pointer-events-none">{currency.code}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!newPlan.name || !newPlan.duration_months || !newPlan.price}
                        className="w-full bg-primary text-white py-4.5 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-primary/30 group/submit mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {t('settings.saveNewPlan')}
                            <ArrowRight className="w-5 h-5 group-hover/submit:translate-x-1 transition-transform duration-300" />
                        </span>
                    </button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {isLoading ? (
                    <div className="col-span-full py-12 text-center text-white/20 animate-pulse uppercase font-black text-[10px] tracking-[0.3em]">{t('settings.loadingPlans')}</div>
                ) : plans?.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-white/20 uppercase font-black text-[10px] tracking-[0.3em] border-2 border-dashed border-white/5 rounded-[2rem]">{t('settings.noPlans')}</div>
                ) : (
                    plans?.map((plan, idx) => (
                        <div key={plan.id} className="group/card relative p-1 transition-all duration-300">
                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/card:opacity-100 rounded-[2rem] transition-opacity duration-300"></div>
                            <div className="relative h-full bg-[#111] rounded-[1.8rem] border border-white/5 p-6 flex flex-col justify-between group-hover/card:border-primary/50 group-hover/card:bg-[#151515] transition-all duration-300 shadow-2xl overflow-hidden">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full group-hover/card:bg-primary/30 transition-all duration-500 opacity-20"></div>

                                {editingPlan?.id === plan.id ? (
                                    <form onSubmit={handleUpdate} className="space-y-5 animate-in fade-in zoom-in-95 duration-300 relative z-10 w-full">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.planName')}</label>
                                            <input
                                                type="text"
                                                value={editingPlan?.name || ''}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, name: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px] placeholder:text-white/10 uppercase tracking-tight"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Days</label>
                                                <div className="relative group/select">
                                                    <select
                                                        value={editingPlan?.sessions_per_week || 3}
                                                        onChange={e => editingPlan && setEditingPlan({ ...editingPlan, sessions_per_week: parseInt(e.target.value) })}
                                                        className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px] appearance-none cursor-pointer"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={num} className="bg-black text-white">{num} Sessions</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover/select:text-primary transition-colors pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.months')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingPlan?.duration_months || 1}
                                                    onChange={e => editingPlan && setEditingPlan({ ...editingPlan, duration_months: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">Total Sessions</label>
                                            <input
                                                type="number"
                                                value={editingPlan?.sessions_limit || 0}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, sessions_limit: parseInt(e.target.value) || 0 })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-emerald-400 outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-1">{t('settings.price')} ({currency.code})</label>
                                            <input
                                                type="number"
                                                value={editingPlan?.price || 0}
                                                onChange={e => editingPlan && setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-5 py-3.5 rounded-2xl border border-white/5 bg-black/40 text-white outline-none focus:border-primary/40 transition-all font-black text-[13px]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button type="submit" className="bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">{t('common.save')}</button>
                                            <button type="button" onClick={() => setEditingPlan(null)} className="bg-white/5 text-white/60 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all">{t('common.cancel')}</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="relative mb-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="px-2 py-0.5 rounded bg-primary/20 border border-primary/20 text-primary text-[7.5px] font-black uppercase tracking-[0.2em]">
                                                    Package {idx + 1}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                                                    <button onClick={() => setEditingPlan(plan as any)} className="p-1.5 text-white/30 hover:text-primary transition-all"><Edit2 className="w-3 h-3" /></button>
                                                    <button onClick={() => setPlanToDelete(plan.id)} className="p-1.5 text-white/30 hover:text-rose-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </div>
                                            <h3 className="text-[14px] font-black text-white uppercase tracking-tight group-hover/card:text-primary transition-colors leading-snug line-clamp-2">
                                                {plan.name}
                                            </h3>
                                        </div>

                                        <div className="space-y-2.5 mb-8">
                                            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                        <Calendar className="w-3 h-3 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">{t('common.schedule')}</div>
                                                        <div className="text-[12px] font-black text-white uppercase tracking-tighter leading-none truncate">
                                                            {plan.sessions_per_week} <span className="text-[9px] text-white/20 font-bold lowercase">{t('dashboard.day')}s</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0"></div>
                                            </div>

                                            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                        <Clock className="w-3 h-3 text-primary" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">{t('settings.validity')}</div>
                                                        <div className="text-[12px] font-black text-white uppercase tracking-tighter leading-none truncate">
                                                            {plan.duration_months} <span className="text-[9px] text-white/20 font-bold lowercase">{plan.duration_months === 1 ? t('dashboard.month') : `${t('dashboard.month')}s`}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0"></div>
                                            </div>

                                            <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-2xl border border-white/5 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                                                        <Sparkles className="w-3 h-3 text-emerald-500" />
                                                    </div>
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] leading-none">Total Limit</div>
                                                        <div className="text-[12px] font-black text-emerald-400 uppercase tracking-tighter leading-none truncate">
                                                            {plan.sessions_limit ? `${plan.sessions_limit} Sessions` : 'Unlimited'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 shrink-0"></div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-5 border-t border-white/5 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] leading-none mb-1">{t('settings.packageValue')}</div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl font-black text-white leading-none tracking-tighter">{plan.price > 0 ? plan.price : 'FREE'}</span>
                                                    {plan.price > 0 && <span className="text-[10px] font-black text-primary uppercase">{currency.code}</span>}
                                                </div>
                                            </div>
                                            <div className="p-2 bg-primary/10 rounded-xl text-primary opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {planToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="glass-card max-w-sm w-full p-10 rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(244,63,94,0.15)] relative animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-6 bg-rose-500/10 rounded-full text-rose-500 mb-6 animate-bounce">
                                <AlertTriangle className="w-10 h-10 shadow-lg shadow-rose-500/20" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">{t('settings.deleteConfirmTitle')}</h3>
                            <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed mb-10">{t('settings.deleteConfirmText')}</p>
                            <div className="flex gap-4 w-full">
                                <button onClick={() => setPlanToDelete(null)} className="flex-1 px-6 py-4 rounded-xl bg-white/5 text-white/60 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">{t('common.cancel')}</button>
                                <button onClick={handleDelete} className="flex-1 px-6 py-4 rounded-xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-rose-500/30 hover:bg-rose-600 transition-all hover:scale-105 active:scale-95">{t('common.delete')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <FullScreenPreview
                show={showFullPreview}
                onClose={() => setShowFullPreview(false)}
                previewSettings={previewSettings}
                designMode={designMode}
            />
        </div>
    );
}

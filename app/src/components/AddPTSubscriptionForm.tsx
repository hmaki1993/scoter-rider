import { useState, useEffect } from 'react';
import { X, User, Calendar, DollarSign, TrendingUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { format, addMonths } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../context/CurrencyContext';
import PremiumSelect from './PremiumSelect';

interface AddPTSubscriptionFormProps {
    onClose: () => void;
    onSuccess: () => void;
    editData?: any;
    role?: string;
}

interface Coach {
    id: string;
    full_name: string;
    pt_rate: number;
    role: string;
    profile_id: string;
}

interface Student {
    id: string;
    full_name: string;
}

export default function AddPTSubscriptionForm({ onClose, onSuccess, editData, role }: AddPTSubscriptionFormProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    const [isGuest, setIsGuest] = useState(editData ? !editData.student_id : false);
    const [formData, setFormData] = useState({
        student_id: editData?.student_id?.toString() || '',
        student_name: editData?.student_name || '',
        coach_id: editData?.coach_id || '',
        sessions_total: editData?.sessions_total || '',
        start_date: editData?.start_date || format(new Date(), 'yyyy-MM-dd'),
        expiry_date: editData?.expiry_date || format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
        price: editData?.total_price || '',
        coach_share: editData?.coach_share || '',
        student_phone: editData?.student_phone || ''
    });

    const selectedCoach = coaches.find(c => c.id === formData.coach_id);
    const pricePerSession = selectedCoach?.pt_rate || 0;

    useEffect(() => {
        fetchCoaches();
        fetchStudents();
    }, []);

    // Sync coach_share with coach selection if not editing and not manually changed
    useEffect(() => {
        if (selectedCoach && !editData && !formData.coach_share) {
            setFormData(prev => ({ ...prev, coach_share: selectedCoach.pt_rate }));
        }
    }, [selectedCoach, editData]);

    const fetchCoaches = async () => {
        const { data, error } = await supabase
            .from('coaches')
            .select(`
                id, 
                full_name, 
                pt_rate,
                profile_id,
                profiles:profile_id (role)
            `)
            .order('full_name');

        if (error) {
            console.error('Error fetching coaches:', error);
        } else {
            const enrichedCoaches = (data || []).map((c: any) => ({
                ...c,
                role: c.profiles?.role
            })).filter((c: any) => c.role !== 'reception' && c.role !== 'cleaner');

            setCoaches(enrichedCoaches);
        }
    };

    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('id, full_name')
            .order('full_name');

        if (error) {
            console.error('Error fetching students:', error);
        } else {
            setStudents(data || []);
        }
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate: requires coach AND (student_id OR (isGuest AND student_name))
        const hasStudent = isGuest ? !!formData.student_name.trim() : !!formData.student_id;

        if (!hasStudent || !formData.coach_id) {
            toast.error(t('common.fillRequired'));
            return;
        }

        if (formData.sessions_total < 1) {
            toast.error('Number of sessions must be at least 1');
            return;
        }

        setLoading(true);

        try {
            const totalSessions = Number(formData.sessions_total);
            const totalPrice = Number(formData.price);

            const payload = {
                student_id: isGuest ? null : formData.student_id,
                student_name: isGuest ? formData.student_name : null,
                coach_id: formData.coach_id,
                sessions_total: totalSessions,
                sessions_remaining: editData?.id ? (editData.sessions_remaining + (totalSessions - editData.sessions_total)) : totalSessions,
                start_date: formData.start_date,
                expiry_date: formData.expiry_date,
                total_price: totalPrice,
                price_per_session: totalPrice / totalSessions,
                coach_share: Number(formData.coach_share) || 0,
                student_phone: formData.student_phone,
                status: 'active'
            };

            if (editData?.id) {
                const { error } = await supabase
                    .from('pt_subscriptions')
                    .update(payload)
                    .eq('id', editData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('pt_subscriptions')
                    .insert(payload);
                if (error) throw error;
            }

            // Record payment for PT Subscription
            try {
                const currentPrice = Number(formData.price);
                const previousPrice = Number(editData?.total_price || 0);
                const priceDifference = currentPrice - previousPrice;

                // Handle both new subscriptions and price updates for existing ones
                if (!editData?.id || priceDifference !== 0) {
                    const amountToRecord = editData?.id ? priceDifference : currentPrice;

                    const { data: { user } } = await supabase.auth.getUser();

                    const paymentData: any = {
                        amount: amountToRecord,
                        payment_date: format(new Date(), 'yyyy-MM-dd'),
                        payment_method: 'cash',
                        notes: editData?.id
                            ? `PT Adjustment - ${isGuest ? formData.student_name : (students.find(s => s.id === formData.student_id)?.full_name)} (${previousPrice} -> ${currentPrice})`
                            : `PT Subscription - ${isGuest ? formData.student_name : (students.find(s => s.id === formData.student_id)?.full_name)} (Coach ${selectedCoach?.full_name})`,
                        created_by: user?.id
                    };

                    if (!isGuest && formData.student_id) {
                        paymentData.student_id = formData.student_id;
                    }

                    const { error: paymentError } = await supabase.from('payments').insert(paymentData);

                    if (paymentError) {
                        console.error('PT Payment record failed:', paymentError);
                        toast.error('Subscription saved but finance entry failed.');
                    } else {
                        console.log('PT Finance entry recorded successfully:', amountToRecord);
                        queryClient.invalidateQueries({ queryKey: ['payments'] });
                        queryClient.invalidateQueries({ queryKey: ['refunds'] });
                        queryClient.invalidateQueries({ queryKey: ['expenses'] });
                    }
                }
            } catch (payErr) {
                console.error('Payment record processing failed:', payErr);
            }

            // Invalidate queries to update Revenue UI and PT lists
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });

            toast.success(t('common.saveSuccess'));
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error with PT subscription:', error);
            toast.error(error.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-2xl bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                {t('pt.title')}
                            </h2>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                {t('pt.subtitle')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Compact Form Body */}
                <form onSubmit={handleSubmit} className="relative z-10 px-8 py-4 space-y-4 flex-1">

                    {/* Mode Toggle & Student Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">{t('pt.clientType')}</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsGuest(!isGuest);
                                    setFormData(prev => ({ ...prev, student_id: '', student_name: '', student_phone: '' }));
                                }}
                                className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                            >
                                {isGuest ? t('common.guest') : t('pt.academyStudent')}
                            </button>
                        </div>

                        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                            {isGuest ? (
                                <div className="space-y-2 group/field">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('pt.athleteName')}</label>
                                    <input
                                        type="text"
                                        value={formData.student_name}
                                        onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                                        className="w-full px-5 py-2.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                                        required
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2 group/field">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('pt.selectAthlete')}</label>
                                    <PremiumSelect
                                        required
                                        value={formData.student_id}
                                        onChange={val => setFormData({ ...formData, student_id: val })}
                                        options={[
                                            { value: "", label: t('pt.chooseAthlete') },
                                            ...students.map(s => ({ value: s.id, label: s.full_name }))
                                        ]}
                                        placeholder={t('pt.selectAthlete')}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Phone */}
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('pt.personNumber')}</label>
                                <input
                                    type="tel"
                                    value={formData.student_phone}
                                    onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                                    className="w-full px-5 py-2.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white text-[10px] font-bold"
                                />
                            </div>

                            {/* Coach Selection */}
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('pt.selectCoach')}</label>
                                <PremiumSelect
                                    required
                                    value={formData.coach_id}
                                    onChange={val => setFormData({ ...formData, coach_id: val })}
                                    options={[
                                        { value: "", label: t('pt.chooseCoach') },
                                        ...coaches.map(c => ({ value: c.id, label: c.full_name }))
                                    ]}
                                    placeholder={t('pt.selectCoach')}
                                />
                            </div>

                            {/* Sessions Count */}
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('pt.sessionCount')}</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.sessions_total}
                                    onChange={(e) => setFormData({ ...formData, sessions_total: e.target.value })}
                                    className="w-full px-5 py-2.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white text-[10px] font-bold"
                                    required
                                />
                            </div>

                            {/* Start Date */}
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.startDate')}</label>
                                <input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full px-5 py-2.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest text-center"
                                    required
                                />
                            </div>
                        </div>

                        {/* Investment / Price - Compact & No Overlap */}
                        {role !== 'head_coach' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 group/field">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('pt.totalPrice')}</label>
                                    <div className="relative p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group-focus-within/field:bg-white/[0.03] transition-all">
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="bg-transparent border-none outline-none text-2xl font-black text-white flex-1 min-w-0 tracking-tighter focus:ring-0"
                                            required
                                        />
                                        <div className="flex flex-col items-end flex-shrink-0 ml-4">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{currency.code}</span>
                                            {selectedCoach && (
                                                <span className="text-[7px] font-black text-primary/40 uppercase tracking-widest whitespace-nowrap">
                                                    {selectedCoach.pt_rate} / Sess
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 group/field">
                                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Coach Share (per session)</label>
                                    <div className="relative p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group-focus-within/field:bg-white/[0.03] transition-all">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={formData.coach_share}
                                            onChange={(e) => setFormData({ ...formData, coach_share: e.target.value })}
                                            className="bg-transparent border-none outline-none text-2xl font-black text-primary flex-1 min-w-0 tracking-tighter focus:ring-0"
                                            required
                                        />
                                        <div className="flex flex-col items-end flex-shrink-0 ml-4">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{currency.code}</span>
                                            <span className="text-[7px] font-black text-primary/40 uppercase tracking-widest whitespace-nowrap">Payout</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer Section - Single Premium Button */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        Discard
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                {editData ? t('pt.saveChanges') : t('pt.saveSubscription')}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { X, Save, UserPlus, Upload, ChevronDown } from 'lucide-react';
import { parseISO, addMonths, format } from 'date-fns';
import toast from 'react-hot-toast';
import { sendToN8n } from '../services/n8nService';
import PremiumSelect from './PremiumSelect';

const COUNTRIES = [
    { code: 'KW', dial_code: '+965', flag: '🇰🇼', name: 'Kuwait' },
    { code: 'SA', dial_code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
    { code: 'AE', dial_code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: 'QA', dial_code: '+974', flag: '🇶🇦', name: 'Qatar' },
    { code: 'BH', dial_code: '+973', flag: '🇧🇭', name: 'Bahrain' },
    { code: 'OM', dial_code: '+968', flag: '🇴🇲', name: 'Oman' },
    { code: 'EG', dial_code: '+20', flag: '🇪🇬', name: 'Egypt' },
    { code: 'US', dial_code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: 'UK', dial_code: '+44', flag: '🇬🇧', name: 'UK' },
];

import { useSubscriptionPlans, useCoaches, useGroups } from '../hooks/useData';
import { useCurrency } from '../context/CurrencyContext';

interface AddStudentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AddStudentForm({ onClose, onSuccess, initialData }: AddStudentFormProps) {
    const { t, i18n } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const { data: plansData, isLoading: isLoadingPlans } = useSubscriptionPlans();
    const plans = plansData || [];

    const normalizeDay = (day: string) => {
        const map: { [key: string]: string } = {
            'saturday': 'sat', 'sunday': 'sun', 'monday': 'mon',
            'tuesday': 'tue', 'wednesday': 'wed', 'thursday': 'thu', 'friday': 'fri'
        };
        const d = day.toLowerCase();
        return map[d] || d.substring(0, 3);
    };

    const normalizeTime = (time: string) => {
        if (!time) return '16:00';
        if (time === '00' || time === '24') return '00:00';
        if (/^\d{1,2}$/.test(time)) return `${time.padStart(2, '0')}:00`;
        return time;
    };

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        father_name: initialData?.father_name || '',
        mother_name: initialData?.mother_name || '',
        email: initialData?.email || '',
        address: initialData?.address || '',
        birth_date: initialData?.birth_date || '',
        gender: initialData?.gender || 'male',
        training_type: initialData?.training_type || '',
        contact_number: initialData?.contact_number || '',
        country_code_student: '+965',
        parent_contact: initialData?.parent_contact || '',
        country_code_parent: '+965',
        subscription_type: initialData?.subscription_plan_id || '', // Correctly map plan ID
        subscription_start: initialData?.subscription_start || format(new Date(), 'yyyy-MM-dd'),
        subscription_expiry: initialData?.subscription_expiry || '', // Manual expiry date
        training_days: initialData?.training_days?.map(normalizeDay) || [],
        training_schedule: initialData?.training_schedule?.map((s: any) => ({
            ...s,
            day: normalizeDay(s.day),
            start: normalizeTime(s.start),
            end: normalizeTime(s.end)
        })) || [],
        coach_id: initialData?.coach_id || '',
        training_group_id: initialData?.training_group_id || '',
        notes: initialData?.notes || ''
    });

    // Update subscription_type when plans are loaded
    useEffect(() => {
        if (plans.length > 0 && (!formData.subscription_type || formData.subscription_type === '') && !initialData) {
            setFormData(prev => ({ ...prev, subscription_type: plans[0].id }));
        }
    }, [plans, initialData]);


    // Auto-calculate expiry date when plan or start date changes
    useEffect(() => {
        if (formData.subscription_start && formData.subscription_type && plans.length > 0) {
            const calculatedExpiry = calculateExpiry(formData.subscription_start, formData.subscription_type);
            // Always update to calculated expiry when plan or start date changes
            // User can manually edit after if needed
            setFormData(prev => ({ ...prev, subscription_expiry: calculatedExpiry }));
        }
    }, [formData.subscription_start, formData.subscription_type, plans]);

    const { data: coaches } = useCoaches();
    const { data: groups } = useGroups();

    const daysOfWeek = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

    const handleGroupChange = (groupId: string) => {
        const group = groups?.find(g => g.id === groupId);
        if (group) {
            const scheduleKey = group.schedule_key || '';
            const parts = scheduleKey.split('|');
            const trainingDays: string[] = [];
            const trainingSchedule: any[] = [];

            parts.forEach((part: string) => {
                const subParts = part.split(':');
                if (subParts.length >= 1) {
                    const day = normalizeDay(subParts[0]);
                    trainingDays.push(day);

                    if (subParts.length >= 3) {
                        trainingSchedule.push({
                            day,
                            start: normalizeTime(`${subParts[1]}:${subParts[2]}`),
                            end: subParts.length >= 5 ? normalizeTime(`${subParts[3]}:${subParts[4]}`) : '18:00'
                        });
                    } else {
                        trainingSchedule.push({ day, start: '16:00', end: '18:00' });
                    }
                }
            });

            setFormData(prev => ({
                ...prev,
                training_group_id: groupId,
                coach_id: group.coach_id || prev.coach_id,
                training_days: trainingDays.length > 0 ? trainingDays : prev.training_days,
                training_schedule: trainingSchedule.length > 0 ? trainingSchedule : prev.training_schedule
            }));
        } else {
            setFormData(prev => ({ ...prev, training_group_id: '' }));
        }
    };

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const isAlreadyActive = prev.training_days.includes(day);
            if (isAlreadyActive) {
                return {
                    ...prev,
                    training_days: prev.training_days.filter((d: string) => d !== day),
                    training_schedule: prev.training_schedule.filter((s: any) => s.day !== day)
                };
            } else {
                return {
                    ...prev,
                    training_days: [...prev.training_days, day],
                    training_schedule: [...prev.training_schedule, { day, start: '16:00', end: '18:00' }]
                };
            }
        });
    };

    const updateTime = (day: string, type: 'start' | 'end', value: string) => {
        setFormData(prev => ({
            ...prev,
            training_schedule: prev.training_schedule.map((s: any) =>
                s.day === day ? { ...s, [type]: value } : s
            )
        }));
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };


    const calculateExpiry = (start: string, planId: string) => {
        if (!start || !plans || plans.length === 0) return format(addMonths(new Date(), 1), 'yyyy-MM-dd');

        const date = parseISO(start);
        const plan = plans.find(p => p.id === planId) || plans[0];

        if (!plan) return format(addMonths(date, 1), 'yyyy-MM-dd');

        const monthsToAdd = plan.duration_months || 1;
        return format(addMonths(date, monthsToAdd), 'yyyy-MM-dd');
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
        setLoading(true);

        try {
            if (plans.length === 0) {
                toast.error("No subscription plans found. Please create a plan first.");
                setLoading(false);
                return;
            }

            // Use manual expiry date from form (already calculated by useEffect or manually edited)
            // Ensure we don't send empty string - fallback to calculated expiry
            const expiry = (formData.subscription_expiry && formData.subscription_expiry.trim() !== '')
                ? formData.subscription_expiry
                : calculateExpiry(formData.subscription_start, formData.subscription_type);

            // 1. Determine Group (Auto-Grouping Logic Disabled)
            const trainingGroupId = null;

            const studentData = {
                full_name: formData.full_name,
                father_name: formData.father_name,
                mother_name: formData.mother_name,
                email: formData.email,
                address: formData.address,
                birth_date: formData.birth_date && formData.birth_date.trim() !== '' ? formData.birth_date : null,
                gender: formData.gender,
                training_type: formData.training_type,
                age: calculateAge(formData.birth_date),
                contact_number: `${formData.country_code_student} ${formData.contact_number}`,
                parent_contact: `${formData.country_code_parent} ${formData.parent_contact}`,
                subscription_expiry: expiry && expiry.trim() !== '' ? expiry : null,
                training_days: formData.training_days,
                training_schedule: formData.training_schedule,
                coach_id: formData.coach_id && formData.coach_id.trim() !== '' ? formData.coach_id : null,
                subscription_plan_id: formData.subscription_type && formData.subscription_type.trim() !== '' ? formData.subscription_type : null,
                sessions_remaining: plans.find(p => p.id === formData.subscription_type)?.sessions_limit || null,
                notes: formData.notes,
                training_group_id: formData.training_group_id && formData.training_group_id.trim() !== '' ? formData.training_group_id : null // Assign to Training Group
            };

            let error;
            let studentId = initialData?.id;

            if (initialData) {
                // Check if the plan was changed to calculate financial differences
                if (initialData.subscription_plan_id !== formData.subscription_type) {
                    try {
                        const oldPlan = plans.find(p => String(p.id) === String(initialData.subscription_plan_id));
                        const newPlan = plans.find(p => String(p.id) === String(formData.subscription_type));

                        const oldPrice = oldPlan ? Number(oldPlan.price) : 0;
                        const newPrice = newPlan ? Number(newPlan.price) : 0;
                        const difference = newPrice - oldPrice;

                        const { data: { user } } = await supabase.auth.getUser();
                        const today = format(new Date(), 'yyyy-MM-dd');

                        if (difference > 0) {
                            // Upgrade or newly added plan - charge the difference
                            await supabase.from('payments').insert({
                                student_id: initialData.id,
                                amount: difference,
                                payment_method: 'cash',
                                notes: `Plan Update (${oldPlan?.name || 'No Plan'} -> ${newPlan?.name || 'No Plan'})`,
                                payment_date: today,
                                created_by: user?.id
                            });
                        } else if (difference < 0) {
                            // Downgrade or removed plan - log as negative payment (correction)
                            // This ensures it shows up in Finance list and reduces revenue
                            await supabase.from('payments').insert({
                                student_id: initialData.id,
                                amount: difference, // This is already negative
                                payment_method: 'cash',
                                notes: `Plan Downgrade Adjustment (${oldPlan?.name || 'No Plan'} -> ${newPlan?.name || 'No Plan'})`,
                                payment_date: today,
                                created_by: user?.id
                            });
                        }

                        // Invalidate Finance queries so UI refreshes
                        queryClient.invalidateQueries({ queryKey: ['payments'] });
                        queryClient.invalidateQueries({ queryKey: ['refunds'] });
                        queryClient.invalidateQueries({ queryKey: ['expenses'] });
                    } catch (financeErr) {
                        console.error('Failed to log plan change in Finance:', financeErr);
                    }
                }

                // Update existing student
                ({ error } = await supabase
                    .from('students')
                    .update(studentData)
                    .eq('id', initialData.id));
            } else {
                // Insert new student and get the ID
                const { data, error: insertError } = await supabase
                    .from('students')
                    .insert([studentData])
                    .select('id')
                    .single();
                error = insertError;
                studentId = data?.id;

                // Record initial payment for new student
                if (studentId && formData.subscription_type) {
                    const selectedPlan = plans.find(p => p.id === formData.subscription_type);
                    if (selectedPlan && selectedPlan.price > 0) {
                        try {
                            const { error: paymentError } = await supabase.from('payments').insert({
                                student_id: studentId,
                                amount: Number(selectedPlan.price),
                                payment_date: formData.subscription_start || format(new Date(), 'yyyy-MM-dd'),
                                payment_method: 'cash', // Default to cash
                                notes: `New Registration - ${selectedPlan.name}`
                            });

                            if (paymentError) {
                                console.error('Initial payment record failed:', paymentError);
                                toast.error('Gymnast added but payment record failed. Please add it manually in Finance.');
                            } else {
                                console.log('Initial payment recorded successfully');
                            }
                        } catch (payErr) {
                            console.error('Payment insertion error:', payErr);
                            toast.error('Payment record failed due to a system error.');
                        }
                    }
                }
            }

            if (error) throw error;

            // Handle training schedule and auto-create training sessions
            if (studentId && formData.training_schedule.length > 0) {
                // First, clear existing schedule for updates, or just insert for new students
                if (initialData) {
                    await supabase.from('student_training_schedule').delete().eq('student_id', studentId);
                }

                const trainingInserts = formData.training_schedule.map((s: any) => ({
                    student_id: studentId,
                    day_of_week: s.day,
                    start_time: s.start,
                    end_time: s.end
                }));

                const { error: trainingError } = await supabase
                    .from('student_training_schedule')
                    .insert(trainingInserts);

                if (trainingError) throw trainingError;

                // --- AUTO-CREATE CLASS LOGIC ---
                if (formData.coach_id) {
                    const dayMapping: { [key: string]: string } = {
                        'sat': 'Saturday',
                        'sun': 'Sunday',
                        'mon': 'Monday',
                        'tue': 'Tuesday',
                        'wed': 'Wednesday',
                        'thu': 'Thursday',
                        'fri': 'Friday'
                    };

                    for (const schedule of formData.training_schedule) {
                        const { day, start, end } = schedule as { day: string, start: string, end: string };
                        const fullDayName = dayMapping[day];

                        // Check if session exists using Full Day Name
                        const { data: sessions } = await supabase
                            .from('training_sessions')
                            .select('id')
                            .eq('coach_id', formData.coach_id)
                            .eq('day_of_week', fullDayName)
                            .eq('start_time', start)
                            .eq('end_time', end)
                            .limit(1);

                        // If NOT exists, create it
                        if (!sessions || sessions.length === 0) {
                            await supabase
                                .from('training_sessions')
                                .insert([{
                                    coach_id: formData.coach_id,
                                    day_of_week: fullDayName,
                                    start_time: start,
                                    end_time: end,
                                    title: 'Group Training', // Default Title
                                    capacity: 20             // Default Capacity
                                }]);
                        }
                    }

                }
            }

            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            if (formData.coach_id) queryClient.invalidateQueries({ queryKey: ['training_groups'] }); // Invalidate groups too

            toast.success(initialData ? 'Gymnast updated successfully' : 'Gymnast added successfully', {
                icon: '🎉',
                style: {
                    borderRadius: '20px',
                    background: '#10B981',
                    color: '#fff',
                },
            });

            // 6. Trigger n8n Automation for new registrations
            if (!initialData && studentId) {
                try {
                    const selectedPlan = plans.find(p => p.id === formData.subscription_type);
                    const fullPhone = `${formData.country_code_parent} ${formData.parent_contact}`;
                    sendToN8n('new_student_registration', {
                        student_id: studentId,
                        student_name: formData.full_name,
                        parent_phone: fullPhone,
                        email: formData.email,
                        subscription_plan: selectedPlan?.name || 'N/A',
                        registration_date: new Date().toISOString(),
                        source: 'admin_dashboard'
                    });
                } catch (n8nErr) {
                    console.error('Failed to trigger n8n automation:', n8nErr);
                }
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving gymnast:', error);
            const msg = (error as any).message || 'Unknown error';
            toast.error(`Error saving gymnast: ${msg}`);
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

            <div className="w-full max-w-[500px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-5 sm:px-8 pt-8 sm:pt-10 pb-5 sm:pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                {initialData ? 'Edit Gymnast' : t('dashboard.addStudent', 'New Athlete')}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/5 active:scale-90"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Body */}
                <form onSubmit={handleSubmit} className="relative z-10 px-5 sm:px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {/* Name Field */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.fullName', 'Full Name')}</label>
                        <input
                            required
                            type="text"
                            className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs tracking-wide font-bold"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    {/* Birth Date & Age */}
                    <div className="space-y-2 group/field">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 group-focus-within/field:text-primary transition-colors">{t('students.birthDate', 'Birth Date')}</label>
                            {formData.birth_date && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">
                                    {calculateAge(formData.birth_date)} {i18n.language === 'ar' ? 'سنة' : 'Years Old'}
                                </span>
                            )}
                        </div>
                        <input
                            required
                            type="date"
                            className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold uppercase tracking-widest"
                            value={formData.birth_date}
                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                        />
                    </div>

                    {/* Gender Toggle */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">Gender</label>
                        <div className="flex bg-white/[0.02] rounded-2xl p-1.5 border border-white/5 relative">
                            {['male', 'female'].map(g => (
                                <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })}
                                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 relative z-10 ${formData.gender === g ? 'text-white' : 'text-white/20 hover:text-white/40'}`}>
                                    {g}
                                </button>
                            ))}
                            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-500 ease-out shadow-lg ${formData.gender === 'male' ? 'left-1.5 bg-blue-600/20 border border-blue-500/30' : 'left-[calc(50%+3px)] bg-pink-600/20 border border-pink-500/30'}`}></div>
                        </div>
                    </div>

                    {/* Training Type */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Program</label>
                        <PremiumSelect
                            required
                            value={formData.training_type}
                            onChange={val => setFormData({ ...formData, training_type: val })}
                            options={[
                                { value: "Artistic Gymnastics", label: "Artistic Gymnastics" },
                                { value: "Rhythmic Gymnastics", label: "Rhythmic Gymnastics" },
                                { value: "Parkour", label: "Parkour" },
                                { value: "Fitness", label: "Fitness" }
                            ]}
                            placeholder="Sport Program"
                            fallbackRole="Program"
                        />
                    </div>

                    {/* Training Group Selector */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Training Group</label>
                        <PremiumSelect
                            value={formData.training_group_id}
                            onChange={val => handleGroupChange(val)}
                            options={[
                                { value: "", label: "None (Individual)" },
                                ...(groups || []).map(group => ({
                                    value: group.id,
                                    label: group.name
                                }))
                            ]}
                            placeholder="Training Group"
                            fallbackRole="Group"
                        />
                        <p className="text-[8px] text-white/20 uppercase tracking-widest ml-1">Selecting a group auto-fills schedule and coach</p>
                    </div>

                    {/* Primary Guardian & Phone */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Primary Guardian</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                                value={formData.father_name}
                                onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">{t('common.phoneNumber', "Phone Number")}</label>
                            <div className="flex gap-3 relative">
                                <div className="relative group/dropdown">
                                    <button type="button" className="h-full pl-4 pr-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-2 hover:border-primary/40 transition-all min-w-[90px]">
                                        <span className="text-lg filter drop-shadow-lg">{COUNTRIES.find(c => c.dial_code === formData.country_code_student)?.flag}</span>
                                        <ChevronDown className="w-3 h-3 text-white/20 group-hover/dropdown:text-primary transition-colors" />
                                    </button>
                                    <div className="absolute top-[110%] left-0 w-64 bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden hidden group-hover/dropdown:block shadow-2xl max-h-48 overflow-y-auto custom-scrollbar z-50">
                                        {COUNTRIES.map(c => (
                                            <button key={c.code} type="button" onClick={() => setFormData({ ...formData, country_code_student: c.dial_code })} className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-all text-left border-b border-white/5 last:border-0 group/item">
                                                <span className="text-xl">{c.flag}</span>
                                                <span className="text-[10px] font-bold text-white/40 group-hover/item:text-white flex-1 uppercase tracking-wider">{c.name}</span>
                                                <span className="text-[9px] font-black text-primary">{c.dial_code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <input
                                    required
                                    type="tel"
                                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold tracking-wide"
                                    value={formData.contact_number}
                                    onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Secondary Guardian & WhatsApp */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Secondary Guardian</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                                value={formData.mother_name}
                                onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 ml-1 group-focus-within/field:text-emerald-300 transition-colors">WhatsApp for Reports</label>
                            <div className="flex gap-3 relative">
                                <div className="relative group/dropdown">
                                    <button type="button" className="h-full pl-4 pr-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-2 hover:border-emerald-500/40 transition-all min-w-[90px]">
                                        <span className="text-lg filter drop-shadow-lg">{COUNTRIES.find(c => c.dial_code === formData.country_code_parent)?.flag}</span>
                                        <ChevronDown className="w-3 h-3 text-white/20 group-hover/dropdown:text-emerald-400 transition-colors" />
                                    </button>
                                    <div className="absolute top-[110%] left-0 w-64 bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden hidden group-hover/dropdown:block shadow-2xl max-h-48 overflow-y-auto custom-scrollbar z-50">
                                        {COUNTRIES.map(c => (
                                            <button key={c.code} type="button" onClick={() => setFormData({ ...formData, country_code_parent: c.dial_code })} className="flex items-center gap-3 w-full px-5 py-3 hover:bg-emerald-500/10 transition-all text-left border-b border-white/5 last:border-0 group/item">
                                                <span className="text-xl">{c.flag}</span>
                                                <span className="text-[10px] font-bold text-white/40 group-hover/item:text-white flex-1 uppercase tracking-wider">{c.name}</span>
                                                <span className="text-[9px] font-black text-emerald-500">{c.dial_code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <input
                                    type="tel"
                                    className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-emerald-500/40 outline-none transition-all text-white placeholder:text-white/10 text-sm font-bold tracking-wide"
                                    value={formData.parent_contact}
                                    onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Email & Address */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2 group/field text-sm">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Email Address</label>
                            <input
                                type="email"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 group/field text-sm">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Physical Address</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-[10px] font-bold"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Attendance Cycle */}
                    <div className="space-y-6 pt-6 border-t border-white/[0.05]">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">
                            {t('students.trainingDays', 'Attendance Cycle')}
                        </label>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-wrap gap-2">
                                {daysOfWeek.map(day => {
                                    const isActive = formData.training_days.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isActive
                                                ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/5'
                                                : 'bg-white/[0.02] border-white/5 text-white/20 hover:bg-white/[0.05] hover:border-white/10'
                                                }`}
                                        >
                                            {t(`students.days.${day.toLowerCase()}`)}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Time Inputs for Active Days */}
                            <div className="grid grid-cols-1 gap-3 mt-2">
                                {formData.training_schedule.map((schedule: any) => (
                                    <div
                                        key={schedule.day}
                                        className="px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-row items-center justify-between gap-3 animate-in zoom-in-95 duration-500"
                                    >
                                        <span className="text-[10px] font-black uppercase text-accent tracking-[0.3em] min-w-[50px]">
                                            {t(`students.days.${schedule.day.toLowerCase()}`)}
                                        </span>
                                        <div className="flex items-center gap-2 flex-1 justify-end">
                                            <input
                                                type="time"
                                                value={schedule.start}
                                                onChange={(e) => updateTime(schedule.day, 'start', e.target.value)}
                                                className="w-full max-w-[100px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:border-primary/40 transition-all outline-none [color-scheme:dark]"
                                            />
                                            <span className="text-white/10 text-[8px] font-black">-</span>
                                            <input
                                                type="time"
                                                value={schedule.end}
                                                onChange={(e) => updateTime(schedule.day, 'end', e.target.value)}
                                                className="w-full max-w-[100px] bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white focus:border-primary/40 transition-all outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Subscription & Coach */}
                    <div className="space-y-6 pt-6 border-t border-white/[0.05]">
                        <div className="flex items-center gap-2 ml-1 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"></div>
                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">
                                Subscription Details
                            </h3>
                        </div>

                        <div className="space-y-3 group/field">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 group-focus-within/field:text-primary transition-colors">Plan Type</label>
                                {plans.find(p => p.id === formData.subscription_type)?.sessions_limit && (
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20 mr-2">
                                        {plans.find(p => p.id === formData.subscription_type)?.sessions_limit} Sessions
                                    </span>
                                )}
                                {plans.find(p => p.id === formData.subscription_type)?.price > 0 && (
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                                        {plans.find(p => p.id === formData.subscription_type)?.price} {currency.code}
                                    </span>
                                )}
                            </div>
                            <PremiumSelect
                                value={formData.subscription_type}
                                onChange={val => setFormData({ ...formData, subscription_type: val })}
                                options={[
                                    { value: "", label: "Select Plan" },
                                    ...plans.map(plan => ({
                                        value: plan.id,
                                        label: plan.name
                                    }))
                                ]}
                                placeholder="Subscription Plan"
                                fallbackRole="Plan"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest"
                                    value={formData.subscription_start}
                                    onChange={e => setFormData({ ...formData, subscription_start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Expiry Date</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white [color-scheme:dark] text-[10px] font-bold tracking-widest"
                                    value={formData.subscription_expiry}
                                    onChange={e => setFormData({ ...formData, subscription_expiry: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Assigned Coach</label>
                            <PremiumSelect
                                value={formData.coach_id}
                                onChange={val => setFormData({ ...formData, coach_id: val })}
                                options={[
                                    { value: "", label: t('students.selectCoach') },
                                    ...(coaches?.filter(c => c.role !== 'reception' && c.role !== 'cleaner') || []).map(coach => ({
                                        value: coach.id,
                                        label: `${coach.full_name} (${t(`roles.${coach.role}`)})`
                                    }))
                                ]}
                                fallbackRole="Coach"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Additional Notes</label>
                        <textarea
                            placeholder=""
                            className="w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-[2rem] focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-xs min-h-[100px] resize-none"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>

                </form>

                {/* Footer Section - Single Premium Button */}
                <div className="relative z-10 px-5 sm:px-8 py-6 sm:py-8 border-t border-white/5 flex-shrink-0 flex items-center justify-between gap-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 whitespace-nowrap"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e)}
                        disabled={loading}
                        className="flex-1 py-4 rounded-full bg-black text-primary border border-primary/40 shadow-xl hover:bg-primary/5 transition-all active:scale-[0.98] flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.5em] text-[11px]">
                                {initialData ? 'Update Profile' : 'Confirm Registration'}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

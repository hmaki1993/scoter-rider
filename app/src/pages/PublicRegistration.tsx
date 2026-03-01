import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, MapPin, TrendingUp, ChevronDown, CheckCircle, Clock, ChevronRight, Globe, AlertCircle, Trash2, UserPlus, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme, GymSettings } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { format, parseISO, addMonths } from 'date-fns';
import { sendToN8n } from '../services/n8nService';

import { COUNTRIES } from '../constants/countries';
import { formatDynamicPhone } from '../utils/phoneUtils';

// Premium Select Component for a high-end feel
function PremiumSelect({
    label,
    value,
    options,
    onChange,
    placeholder = "Select an option",
    secondaryColor,
    primaryColor,
    accentColor,
    textColor,
    textColorMuted,
    icon: Icon
}: {
    label: string,
    value: string,
    options: { id: string, name: string }[],
    onChange: (val: string) => void,
    placeholder?: string,
    secondaryColor: string,
    primaryColor: string,
    accentColor: string,
    textColor: string,
    textColorMuted: string,
    icon?: any
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === value);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = () => setIsOpen(false);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isOpen]);

    return (
        <div className="group relative" onClick={(e) => e.stopPropagation()}>
            <label className="text-[10px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] mb-3 ml-6 block">
                {label}
            </label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`input-mind flex items-center justify-between text-left transition-all duration-300 ${isOpen ? 'ring-2' : ''}`}
                    style={{
                        borderColor: isOpen ? primaryColor : 'rgba(255, 255, 255, 0.05)',
                        '--focus-shadow': `${primaryColor}33`
                    } as any}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: isOpen ? primaryColor : textColorMuted }} />}
                        <span className={`truncate ${!selectedOption ? 'opacity-40' : ''}`}>
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} style={{ color: primaryColor }} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div
                        className="absolute top-[110%] left-0 w-full backdrop-blur-2xl border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 duration-300 max-h-64 overflow-y-auto no-scrollbar"
                        style={{ backgroundColor: `${secondaryColor}f2` }}
                    >
                        {options.length === 0 ? (
                            <div className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center" style={{ color: textColorMuted }}>
                                No options available
                            </div>
                        ) : (
                            options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(opt.id);
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center justify-between w-full px-6 py-4 hover:bg-white/[0.03] transition-all text-left border-b border-white/[0.03] last:border-0 group/opt"
                                >
                                    <span className={`text-xs font-bold tracking-wide transition-colors ${value === opt.id ? 'text-white' : ''}`} style={{ color: value === opt.id ? textColor : textColorMuted }}>
                                        {opt.name}
                                    </span>
                                    {value === opt.id && (
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PublicRegistration() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [coaches, setCoaches] = useState<{ id: string, full_name: string }[]>([]);
    const [plans, setPlans] = useState<{ id: string, name: string, price: number, duration_months: number }[]>([]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const { settings } = useTheme();

    // Detect viewport on mount and resize
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper to pick the correct setting based on current viewport
    const getSetting = useMemo(() => {
        return function <K extends keyof GymSettings>(key: K): GymSettings[K] {
            if (isMobile) {
                const mobileKey = `login_mobile_${(key as string).replace('login_', '')}` as K;
                // Fallback to desktop setting if mobile one is explicitly null/empty
                return (settings[mobileKey] ?? settings[key]) as GymSettings[K];
            }
            return settings[key];
        };
    }, [isMobile, settings]);

    // Theme Helpers for dynamic UI - Synced with Login Design
    const primaryColor = (getSetting('login_accent_color') as string) || settings.primary_color || '#D4AF37';
    const secondaryColor = (getSetting('login_card_color') as string) || settings.secondary_color || '#000000';
    const accentColor = (getSetting('login_accent_color') as string) || settings.primary_color || '#D4AF37';
    const surfaceColor = 'rgba(255, 255, 255, 0.05)';
    const textColor = (getSetting('login_text_color') as string) || '#ffffff';
    const textColorMuted = 'rgba(255, 255, 255, 0.6)';
    const logoUrl = settings.logo_url || (getSetting('login_logo_url') as string) || '/logo.png';

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        father_name: '',
        mother_name: '',
        training_type: '',
        birth_date: '',
        gender: 'male',
        country_code_student: '+965',
        contact_number: '',       // Student Phone
        country_code_parent: '+965',
        parent_contact: '',       // Parent Phone Whatsapp
        email: '',
        address: '',
        coach_id: '',
        subscription_type: '',
        training_days: [] as string[],
        training_schedule: [] as { day: string, start: string, end: string }[],
    });

    useEffect(() => {
        const fetchData = async () => {
            const [coachesRes, plansRes] = await Promise.all([
                supabase.from('coaches').select('id, full_name, specialty').order('full_name'),
                supabase.from('subscription_plans').select('*')
            ]);
            if (coachesRes.data) setCoaches(coachesRes.data);
            if (plansRes.data) setPlans(plansRes.data);
        };
        fetchData();
    }, []);

    // Helper: Toggle Days
    const toggleDay = (day: string) => {
        setFormData(prev => {
            const isAlreadyActive = prev.training_days.includes(day);
            if (isAlreadyActive) {
                return {
                    ...prev,
                    training_days: prev.training_days.filter(d => d !== day),
                    training_schedule: prev.training_schedule.filter(s => s.day !== day)
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

    // Helper: Update Time
    const updateTime = (day: string, type: 'start' | 'end', value: string) => {
        setFormData(prev => ({
            ...prev,
            training_schedule: prev.training_schedule.map(s =>
                s.day === day ? { ...s, [type]: value } : s
            )
        }));
    };

    const daysOfWeek = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.full_name || !formData.father_name || !formData.mother_name || !formData.birth_date || !formData.parent_contact || !formData.subscription_type) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            // 1. Calculate Schema Fields
            const birth = new Date(formData.birth_date);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

            const selectedPlan = plans.find(p => p.id === formData.subscription_type);
            const joinDateStr = new Date().toISOString(); // Now
            const expiryDate = selectedPlan
                ? format(addMonths(new Date(), selectedPlan.duration_months), 'yyyy-MM-dd')
                : null;

            // 2. Determine Group (Auto-Grouping Logic Disabled)
            const trainingGroupId = null;

            // 3. Insert Student
            const { data: student, error: studentError } = await supabase
                .from('students')
                .insert({
                    full_name: formData.full_name,
                    father_name: formData.father_name,
                    mother_name: formData.mother_name,
                    birth_date: formData.birth_date,
                    age: age,
                    parent_contact: `${formData.country_code_parent} ${formData.parent_contact}`,
                    contact_number: `${formData.country_code_student} ${formData.contact_number}`, // Student phone
                    email: formData.email,
                    address: formData.address,
                    coach_id: formData.coach_id || null,
                    training_group_id: trainingGroupId,
                    subscription_plan_id: formData.subscription_type,
                    subscription_expiry: expiryDate,
                    training_days: formData.training_days,
                    training_schedule: formData.training_schedule,
                    is_active: true,
                    gender: formData.gender,
                    training_type: formData.training_type, // Added missing field
                })
                .select('id')
                .single();

            if (studentError) throw studentError;
            const studentId = student.id;

            // 4. Record Payment
            if (selectedPlan && selectedPlan.price > 0) {
                const { error: paymentError } = await supabase.from('payments').insert({
                    student_id: studentId,
                    amount: Number(selectedPlan.price),
                    payment_date: format(new Date(), 'yyyy-MM-dd'),
                    payment_method: 'cash',
                    notes: `New Registration - ${selectedPlan.name}`
                });

                if (paymentError) {
                    console.error('Registration payment record failed:', paymentError);
                } else {
                    console.log('Public registration payment recorded successfully');
                }
            }

            // 5. Insert Training Schedule Rows & Sessions
            if (formData.training_schedule.length > 0) {
                const trainingInserts = formData.training_schedule.map(s => ({
                    student_id: studentId,
                    day_of_week: s.day,
                    start_time: s.start,
                    end_time: s.end
                }));
                await supabase.from('student_training_schedule').insert(trainingInserts);

                // Auto-create sessions if coach assigned
                if (formData.coach_id) {
                    const fullDayMap: { [key: string]: string } = {
                        'sat': 'Saturday', 'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday'
                    };
                    for (const schedule of formData.training_schedule) {
                        const fullDayName = fullDayMap[schedule.day];
                        const { data: existingSessions } = await supabase
                            .from('training_sessions')
                            .select('id')
                            .eq('coach_id', formData.coach_id)
                            .eq('day_of_week', fullDayName)
                            .eq('start_time', schedule.start)
                            .eq('end_time', schedule.end)
                            .limit(1);

                        if (!existingSessions || existingSessions.length === 0) {
                            await supabase.from('training_sessions').insert([{
                                coach_id: formData.coach_id,
                                day_of_week: fullDayName,
                                start_time: schedule.start,
                                end_time: schedule.end,
                                title: 'Group Training',
                                capacity: 20
                            }]);
                        }
                    }
                }
            }

            // Success Animation
            setSuccess(true);
            toast.success('Registration Successful!');

            // 6. Trigger n8n Automation (Welcome Message)
            try {
                const fullPhone = `${formData.country_code_parent} ${formData.parent_contact}`;
                sendToN8n('new_student_registration', {
                    student_id: studentId,
                    student_name: formData.full_name,
                    parent_phone: fullPhone,
                    email: formData.email,
                    subscription_plan: selectedPlan?.name || 'N/A',
                    registration_date: new Date().toISOString()
                });
            } catch (n8nErr) {
                console.error('Failed to trigger n8n automation:', n8nErr);
            }

            // Reset form
            setTimeout(() => {
                setSuccess(false);
                setFormData({
                    full_name: '',
                    father_name: '',
                    mother_name: '',
                    training_type: '',
                    birth_date: '',
                    gender: 'male',
                    country_code_student: '+965',
                    country_code_parent: '+965',
                    contact_number: '',
                    parent_contact: '',
                    email: '',
                    address: '',
                    coach_id: '',
                    subscription_type: '',
                    training_days: [],
                    training_schedule: [],
                });
                window.scrollTo(0, 0);
            }, 4000);

        } catch (error: any) {
            console.error('Registration error:', error);

            // Refined error messaging for RLS/Permission issues
            if (error.code === '42501' || error.status === 401 || error.message?.includes('permission denied')) {
                toast.error('Database Permission Error. Please contact admin to enable public registration.');
            } else if (error.code === 'PGRST116') {
                toast.error('Registration partially failed (ID retrieval). Please check student records.');
            } else {
                toast.error('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: secondaryColor }}>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] animate-pulse" style={{ backgroundColor: `${primaryColor}33` }}></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] animate-pulse delay-1000" style={{ backgroundColor: `${accentColor}33` }}></div>
                </div>
                <div className="z-10 text-center animate-in zoom-in-95 duration-700">
                    <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce" style={{ background: `linear-gradient(to br, ${primaryColor}, ${accentColor})`, boxShadow: `0 20px 50px ${primaryColor}4d` }}>
                        <CheckCircle className="w-16 h-16 text-white" />
                    </div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 premium-gradient-text-mind" style={{ color: textColor }}>
                        Welcome to the Family!
                    </h1>
                    <p className="text-xl font-medium tracking-widest uppercase" style={{ color: `${textColor}99` }}>
                        Registration Complete
                    </p>
                </div>

                <style>{`
                    .premium-gradient-text-mind {
                        background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-cairo" style={{ backgroundColor: secondaryColor }}>

            {/* Background Effects - Premium Atmosphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%]" style={{ backgroundColor: secondaryColor }}></div>

                <div className="absolute top-[10%] right-[10%] w-[60%] h-[60%] rounded-full blur-[180px] animate-pulse" style={{ backgroundColor: `${primaryColor}26` }}></div>
                <div className="absolute bottom-[20%] left-[5%] w-[50%] h-[50%] rounded-full blur-[150px] transition-all duration-1000" style={{ backgroundColor: `${accentColor}26` }}></div>

                {/* Subtle Moving Particles Overlay */}
                <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            {/* Back to App Button */}
            <div className="fixed top-3 left-3 md:top-6 md:left-6 z-50">
                <a
                    href="/"
                    className="group flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                    <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/70 group-hover:text-white transition-colors" />
                    <span className="text-[10px] md:text-xs font-black text-white/70 group-hover:text-white uppercase tracking-wider transition-colors">
                        Back to App
                    </span>
                </a>
            </div>

            {/* Header / Logo */}
            <div className="relative z-10 mb-12 text-center scale-90 md:scale-100">
                <div className="flex justify-center mb-8 relative">
                    <div className="absolute -inset-10 rounded-full blur-[60px] animate-pulse" style={{ backgroundColor: `${primaryColor}33` }}></div>
                    <img src={logoUrl} alt="Logo" className="relative h-32 w-auto object-contain drop-shadow-2xl brightness-110" />
                </div>
                <h2 className="text-5xl font-black uppercase tracking-tight premium-gradient-text-mind leading-tight" style={{ color: textColor }}>
                    Join The Legacy
                </h2>
                <div className="h-1 w-24 mx-auto mt-4 opacity-50" style={{ background: `linear-gradient(to r, transparent, ${primaryColor}66, transparent)` }}></div>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-4xl relative z-10 mb-20">
                <div className="relative p-[1px] rounded-[3.5rem] bg-gradient-to-br from-white/10 via-transparent to-white/5 shadow-2xl">
                    <div className="backdrop-blur-3xl rounded-[3.4rem] p-8 md:p-14 overflow-hidden border border-white/5 shadow-inner" style={{ backgroundColor: `${secondaryColor}b3` }}>
                        {/* Internal Decorative Glows */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ backgroundColor: primaryColor }}></div>

                        <form onSubmit={handleSubmit} className="space-y-12 relative z-10">

                            {/* Section: Personal Info */}
                            <div className="space-y-8">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 ml-2" style={{ color: `${textColor}80` }}>
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}><User className="w-4 h-4" /></div>
                                    Personal Identity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="group">
                                        <label className="text-[10px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] mb-3 ml-6 block group-focus-within:text-[#677E8A] transition-colors">Gymnast Name</label>
                                        <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-mind" required placeholder="" />
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between items-center mb-3 ml-6 mr-6">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] block" style={{ color: `${textColor}40` }}>Born On</label>
                                            {formData.birth_date && (
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-right-4" style={{ color: primaryColor }}>
                                                    {(() => {
                                                        const birth = new Date(formData.birth_date);
                                                        const now = new Date();
                                                        let age = now.getFullYear() - birth.getFullYear();
                                                        const m = now.getMonth() - birth.getMonth();
                                                        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
                                                        return age >= 0 ? `${age} YR OLD` : '';
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                        <input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className="input-mind calendar-picker-indicator-white" required />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] mb-3 ml-6 block">Legacy of (Father)</label>
                                        <input type="text" value={formData.father_name} onChange={e => setFormData({ ...formData, father_name: e.target.value })} className="input-mind" required placeholder="" />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] mb-3 ml-6 block">Heart of (Mother)</label>
                                        <input type="text" value={formData.mother_name} onChange={e => setFormData({ ...formData, mother_name: e.target.value })} className="input-mind" required placeholder="" />
                                    </div>
                                    <div className="group md:col-span-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-6 block" style={{ color: `${textColor}40` }}>Gender Identity</label>
                                        <div className="flex rounded-[2rem] p-2 border border-white/5" style={{ backgroundColor: `${secondaryColor}80` }}>
                                            {['male', 'female'].map(g => (
                                                <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })}
                                                    className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${formData.gender === g ? 'text-white shadow-2xl scale-[1.02]' : 'text-[#677E8A]/50 hover:text-white hover:bg-white/5'}`}
                                                    style={formData.gender === g ? { backgroundColor: `${primaryColor}33`, borderColor: `${primaryColor}4d` } : {}}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Contact Info */}
                            <div className="space-y-8 pt-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 ml-2" style={{ color: `${textColor}80` }}>
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}><Phone className="w-4 h-4" /></div>
                                    Connectivity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="group z-30">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-6 block" style={{ color: `${textColor}40` }}>{t('common.phone')}</label>
                                        <div className="flex gap-3 relative">
                                            <div className="relative group/dropdown">
                                                <button type="button" className="h-full pl-4 pr-3 border border-[#677E8A]/15 rounded-[2rem] flex items-center gap-2 transition-all min-w-[110px]" style={{ backgroundColor: secondaryColor }}>
                                                    <span className="text-xl filter drop-shadow-lg">{COUNTRIES.find(c => c.dial_code === formData.country_code_student)?.flag}</span>
                                                    <span className="text-xs font-black text-white tracking-widest">{COUNTRIES.find(c => c.dial_code === formData.country_code_student)?.dial_code}</span>
                                                    <ChevronDown className="w-3 h-3 transition-colors" style={{ color: `${textColorMuted}` }} />
                                                </button>
                                                <div className="absolute top-[110%] left-0 w-64 backdrop-blur-xl border border-[#677E8A]/20 rounded-2xl overflow-hidden hidden group-hover/dropdown:block shadow-2xl max-h-64 overflow-y-auto no-scrollbar z-50" style={{ backgroundColor: `${secondaryColor}f2` }}>
                                                    {COUNTRIES.map(c => (
                                                        <button key={c.code} type="button" onClick={() => setFormData({ ...formData, country_code_student: c.dial_code })} className="flex items-center gap-3 w-full px-5 py-4 hover:bg-[#D4AF37]/10 transition-all text-left border-b border-white/5 last:border-0 group/item">
                                                            <span className="text-xl">{c.flag}</span>
                                                            <span className="text-xs font-bold text-[#ABAFB5] group-hover/item:text-white flex-1 uppercase tracking-wider">{c.name}</span>
                                                            <span className="text-[10px] font-black text-[#D4AF37]">{c.dial_code}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input type="tel" value={formData.contact_number} onChange={e => {
                                                const { code, number } = formatDynamicPhone(e.target.value, formData.country_code_student);
                                                setFormData({ ...formData, contact_number: number, country_code_student: code });
                                            }} className="input-mind flex-1" placeholder="" required />
                                        </div>
                                    </div>

                                    <div className="group z-20">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-6 block flex items-center gap-2" style={{ color: accentColor }}>
                                            {t('common.reportsPhone')}
                                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></span>
                                        </label>
                                        <div className="flex gap-3 relative">
                                            <div className="relative group/dropdown">
                                                <button type="button" className="h-full pl-4 pr-3 border border-[#677E8A]/15 rounded-[2rem] flex items-center gap-2 hover:border-emerald-500/50 transition-all min-w-[110px]" style={{ backgroundColor: secondaryColor }}>
                                                    <span className="text-xl filter drop-shadow-lg">{COUNTRIES.find(c => c.dial_code === formData.country_code_parent)?.flag}</span>
                                                    <span className="text-xs font-black text-white tracking-widest">{COUNTRIES.find(c => c.dial_code === formData.country_code_parent)?.dial_code}</span>
                                                    <ChevronDown className="w-3 h-3 transition-colors" style={{ color: `${textColorMuted}` }} />
                                                </button>
                                                <div className="absolute top-[110%] left-0 w-64 backdrop-blur-xl border border-[#677E8A]/20 rounded-2xl overflow-hidden hidden group-hover/dropdown:block shadow-2xl max-h-64 overflow-y-auto no-scrollbar z-50" style={{ backgroundColor: `${secondaryColor}f2` }}>
                                                    {COUNTRIES.map(c => (
                                                        <button key={c.code} type="button" onClick={() => setFormData({ ...formData, country_code_parent: c.dial_code })} className="flex items-center gap-3 w-full px-5 py-4 hover:bg-emerald-500/10 transition-all text-left border-b border-white/5 last:border-0 group/item">
                                                            <span className="text-xl">{c.flag}</span>
                                                            <span className="text-xs font-bold text-[#ABAFB5] group-hover/item:text-white flex-1 uppercase tracking-wider">{c.name}</span>
                                                            <span className="text-[10px] font-black" style={{ color: accentColor }}>{c.dial_code}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input type="tel" value={formData.parent_contact} onChange={e => {
                                                const { code, number } = formatDynamicPhone(e.target.value, formData.country_code_parent);
                                                setFormData({ ...formData, parent_contact: number, country_code_parent: code });
                                            }} className="input-mind flex-1" style={{ '--focus-border': accentColor, '--focus-shadow': `${accentColor}1a` } as any} placeholder="" required />
                                        </div>
                                    </div>

                                    <div className="group md:col-span-2 z-10">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-6 block" style={{ color: `${textColor}40` }}>Physical Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: primaryColor }} />
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-mind pl-16" placeholder="" />
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Section: Training & Subscription */}
                            <div className="space-y-8 pt-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] flex items-center gap-3 ml-2" style={{ color: `${textColor}80` }}>
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}1a`, color: primaryColor }}><TrendingUp className="w-4 h-4" /></div>
                                    Elite Program
                                </h3>

                                <div className="space-y-6">
                                    <label className="text-[10px] font-black text-[#ABAFB5]/40 uppercase tracking-[0.2em] ml-6 block">Training Cadence</label>
                                    <div className="flex flex-wrap gap-3">
                                        {daysOfWeek.map(day => (
                                            <button key={day} type="button" onClick={() => toggleDay(day)}
                                                className={`flex-1 min-w-[4rem] py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 ${formData.training_days.includes(day)
                                                    ? 'text-white shadow-xl scale-[1.05]'
                                                    : 'border-white/5 text-[#677E8A]/40 hover:bg-white/5 hover:border-white/10'}`}
                                                style={formData.training_days.includes(day) ? { backgroundColor: `${primaryColor}33`, borderColor: `${primaryColor}66` } : { backgroundColor: `${secondaryColor}4d` }}>
                                                {day}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Time Selectors */}
                                    {formData.training_schedule.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 animate-in fade-in zoom-in-95 duration-700">
                                            {formData.training_schedule.map(schedule => (
                                                <div key={schedule.day} className="p-6 border border-[#677E8A]/10 rounded-[2rem] flex items-center gap-6 group/item" style={{ backgroundColor: `${secondaryColor}66` }}>
                                                    <span className="text-[10px] font-black uppercase w-14 group-focus-within/item:text-white transition-colors" style={{ color: primaryColor }}>{schedule.day}</span>
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <input type="time" value={schedule.start} onChange={e => updateTime(schedule.day, 'start', e.target.value)} className="w-full border border-white/5 rounded-xl py-2 px-3 text-[10px] font-black text-white outline-none transition-all" style={{ backgroundColor: `${secondaryColor}33`, '--focus-border': primaryColor } as any} />
                                                        <input type="time" value={schedule.end} onChange={e => updateTime(schedule.day, 'end', e.target.value)} className="w-full border border-white/5 rounded-xl py-2 px-3 text-[10px] font-black text-white outline-none transition-all" style={{ backgroundColor: `${secondaryColor}33`, '--focus-border': primaryColor } as any} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                                    <PremiumSelect
                                        label="Discipline"
                                        value={formData.training_type}
                                        placeholder="Select Discipline"
                                        options={[
                                            { id: "Artistic Gymnastics", name: "Artistic Gymnastics" },
                                            { id: "Rhythmic Gymnastics", name: "Rhythmic Gymnastics" },
                                            { id: "Parkour", name: "Parkour" },
                                            { id: "Fitness", name: "Fitness" }
                                        ]}
                                        onChange={(val) => setFormData({ ...formData, training_type: val })}
                                        secondaryColor={secondaryColor}
                                        primaryColor={primaryColor}
                                        accentColor={accentColor}
                                        textColor={textColor}
                                        textColorMuted={textColorMuted}
                                        icon={TrendingUp}
                                    />
                                    <PremiumSelect
                                        label="Membership Tier"
                                        value={formData.subscription_type}
                                        placeholder="Select Membership"
                                        options={plans.map(p => ({ id: p.id, name: p.name }))}
                                        onChange={(val) => setFormData({ ...formData, subscription_type: val })}
                                        secondaryColor={secondaryColor}
                                        primaryColor={primaryColor}
                                        accentColor={accentColor}
                                        textColor={textColor}
                                        textColorMuted={textColorMuted}
                                        icon={CheckCircle}
                                    />
                                    <div className="md:col-span-2">
                                        <PremiumSelect
                                            label="Guided By (Coach Picker)"
                                            value={formData.coach_id}
                                            placeholder="Assign a Coach (Optional)"
                                            options={coaches.map(c => ({ id: c.id, name: `Coach / ${c.full_name}` }))}
                                            onChange={(val) => setFormData({ ...formData, coach_id: val })}
                                            secondaryColor={secondaryColor}
                                            primaryColor={primaryColor}
                                            accentColor={accentColor}
                                            textColor={textColor}
                                            textColorMuted={textColorMuted}
                                            icon={Users}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full max-w-sm mx-auto block group relative overflow-hidden text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.4em] border border-white/10 transition-all hover:scale-[1.05] active:scale-[0.98] mt-12 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                                style={{ background: `linear-gradient(to br, ${primaryColor}, ${accentColor})`, boxShadow: `0 15px 40px ${primaryColor}4d` }}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    {loading ? (
                                        <Clock className="w-6 h-6 animate-spin" />
                                    ) : (
                                        'Initiate Membership'
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000"></div>
                            </button>

                        </form>
                    </div>
                </div>
            </div>

            <footer className="relative z-10 text-center pb-12">
                <p className="text-[10px] font-black text-[#ABAFB5]/20 uppercase tracking-[0.5em]">Powered by Academy Systems • Excellence since day one</p>
            </footer>

            <style>{`
                .premium-gradient-text-mind {
                    background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .input-mind {
                    width: 100%;
                    padding: 0.875rem 1.75rem;
                    background: ${secondaryColor}cc;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2rem;
                    color: ${textColor};
                    font-size: 1rem;
                    font-weight: 800;
                    outline: none;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
                }
                .input-mind:focus {
                    background: ${secondaryColor};
                    border-color: var(--focus-border, ${primaryColor});
                    box-shadow: 0 0 40px var(--focus-shadow, ${primaryColor}33), inset 0 2px 4px rgba(0,0,0,0.3);
                    transform: translateY(-2px);
                }
                .input-mind::placeholder {
                    color: ${textColorMuted};
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 0.8rem;
                }
                .calendar-picker-indicator-white::-webkit-calendar-picker-indicator {
                    filter: invert(1) brightness(0.6) sepia(1) saturate(5) hue-rotate(10deg) saturate(2);
                    cursor: pointer;
                    opacity: 0.5;
                }
                .calendar-picker-indicator-white::-webkit-calendar-picker-indicator:hover {
                    opacity: 1;
                }
                select.input-mind {
                    cursor: pointer;
                }
                @media (max-width: 768px) {
                    .input-mind {
                        padding: 0.75rem 1.25rem;
                        font-size: 0.9rem;
                    }
                }
            `}</style>
        </div>
    );
}

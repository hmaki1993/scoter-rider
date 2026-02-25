import { useState } from 'react';
import { Users, DollarSign, Medal, Calendar, TrendingUp, TrendingDown, Clock, Scale, ArrowUpRight, UserPlus, Sparkles, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useOutletContext, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '../hooks/useData';

import CoachDashboard from './CoachDashboard';
import HeadCoachDashboard from './HeadCoachDashboard';
import ReceptionDashboard from './ReceptionDashboard';
import CleanerDashboard from './CleanerDashboard';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupsList from '../components/GroupsList';
import BatchAssessmentModal from '../components/BatchAssessmentModal';
import AssessmentHistoryModal from '../components/AssessmentHistoryModal';
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { settings } = useTheme(); // Init hook
    const { role, fullName, userId } = useOutletContext<{ role: string, fullName: string, userId: string | null }>() || { role: null, fullName: null, userId: null };
    const { formatPrice } = useCurrency();
    const [showBatchTest, setShowBatchTest] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const { data: stats, isLoading: loading } = useDashboardStats();

    // Show loading while role is being determined
    if (!role) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Show Head Coach Dashboard
    if (role === 'head_coach') {
        return <HeadCoachDashboard />;
    }

    // Show Coach Dashboard for coaches only
    if (role === 'coach') {
        return <CoachDashboard />;
    }

    // Show Reception Dashboard
    if (role === 'reception' || role === 'receptionist') {
        return <ReceptionDashboard role={role} />;
    }

    // Show Cleaner Dashboard
    if (role === 'cleaner') {
        return <CleanerDashboard />;
    }

    // If Admin or any other role, continue to show the main admin dashboard stats below

    // Default stats to avoid undefined errors during loading
    const displayStats = stats || {
        totalStudents: 0,
        activeCoaches: 0,
        totalGroups: 0,
        monthlyRevenue: 0,
        recentActivity: []
    };

    const statCards = [
        {
            label: t('dashboard.totalStudents'),
            value: displayStats.totalStudents,
            icon: Users,
            color: 'bg-blue-500',
            trend: '+12% from last month',
            trendColor: 'text-emerald-400'
        },
        {
            label: t('dashboard.monthlyRevenue'),
            value: formatPrice(displayStats.monthlyRevenue),
            icon: TrendingUp,
            color: 'bg-emerald-500',
            trend: '+5% from last month',
            trendColor: 'text-emerald-400'
        },
        {
            label: t('dashboard.trainingGroups'),
            value: displayStats.totalGroups,
            icon: Scale,
            color: 'bg-purple-500',
            trend: 'Optimized',
            trendColor: 'text-purple-400'
        },
        {
            label: t('dashboard.activeCoaches'),
            value: displayStats.activeCoaches,
            icon: Medal,
            color: 'bg-orange-500',
            trend: 'Active Now',
            trendColor: 'text-orange-400',
            isLive: true
        }
    ];

    console.log('Dashboard Render. Role:', role, 'FullName:', fullName, 'Stats:', stats, 'Loading:', loading);
    console.log('Is Reception?', role === 'reception');

    return (
        <div className="space-y-10">

            {/* Premium Welcome Header */}
            <div className="relative group p-8 rounded-[3rem] bg-white/[0.02] border border-white/5 backdrop-blur-md overflow-hidden mb-10 transition-all hover:border-white/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 animate-in fade-in slide-in-from-left duration-700">
                    <div className="text-center sm:text-left">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-2">{t('common.today') || 'Today'}</p>
                        <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-4 mt-1 sm:mt-0">
                            <span className="text-white/40 font-medium lowercase italic">welcome,</span>
                            <span className="premium-gradient-text">{fullName || (role ? t(`roles.${role}`) : 'Admin')}</span>
                        </h1>
                    </div>

                    {/* Compact Date & Clock Widget */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-0">
                        <button
                            onClick={() => navigate('/app/evaluations')}
                            className="flex items-center gap-2 px-4 sm:px-6 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5 group/eval"
                        >
                            <ClipboardCheck className="w-4 h-4 group-hover/eval:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Evaluations Hub</span>
                        </button>

                        <div className="flex items-center gap-2 sm:gap-4 p-2 bg-white/5 border border-white/10 rounded-full shadow-inner backdrop-blur-xl">
                            {settings.clock_position === 'dashboard' && (
                                <PremiumClock className="!bg-transparent !border-none !shadow-none !p-0 !backdrop-blur-none" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Balanced & Elite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="glass-card p-7 rounded-[2.5rem] border border-white/10 shadow-premium group hover:scale-[1.03] transition-all duration-500 hover:border-primary/30 relative overflow-hidden bg-white/[0.02]">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color}/10 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50`}></div>

                        <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 truncate flex-1">{stat.label}</p>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 backdrop-blur-xl transition-all duration-500 border border-white/10 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-white/10 group-hover:border-white/20">
                                <stat.icon
                                    className={`w-4 h-4 ${stat.color.replace('bg-', 'text-')} drop-shadow-[0_0_12px_currentColor]`}
                                    strokeWidth={1.5}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 relative z-10">
                            <h3 className="text-4xl font-black text-white tracking-tighter">
                                {loading ? (
                                    <div className="h-10 w-24 bg-white/5 animate-pulse rounded-xl"></div>
                                ) : (
                                    stat.value
                                )}
                            </h3>
                            <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] ${stat.trendColor || 'text-white/40'} mt-2`}>
                                {stat.isLive ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]"></span>
                                        {stat.trend}
                                    </span>
                                ) : (
                                    <>
                                        <ArrowUpRight className="w-3 h-3 opacity-50" />
                                        {stat.trend}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Groups Section */}
            <div className="glass-card p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/10 shadow-premium relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl text-accent border border-white/10 shadow-lg">
                            <Users className="w-6 h-6 drop-shadow-[0_0_8px_currentColor]" strokeWidth={1.5} />
                        </div>
                        {t('dashboard.trainingGroups', 'Training Groups')}
                    </h2>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowHistory(true)}
                            className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            History
                        </button>
                    </div>
                </div>
                <GroupsList showAll={true} />
            </div>

            {/* Live Floor & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Floor Widget */}
                <div className="lg:col-span-1 h-full min-h-[500px]">
                    <LiveStudentsWidget />
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            {t('dashboard.newJoiners')}
                        </h3>
                        <button
                            onClick={() => navigate('/app/students')}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                        >
                            {t('dashboard.viewAll')}
                        </button>
                    </div>

                    <div className="p-8 space-y-4">
                        {loading ? (
                            <p className="text-white/20 text-sm font-black uppercase tracking-widest text-center py-10">{t('common.loading')}</p>
                        ) : displayStats.recentActivity.length === 0 ? (
                            <p className="text-white/20 text-sm font-black uppercase tracking-widest text-center py-10">{t('dashboard.noRecentActivity')}</p>
                        ) : (
                            displayStats.recentActivity.map((student: any) => (
                                <div key={student.id} className="flex items-start gap-4 p-5 bg-white/[0.02] rounded-3xl border border-white/5 hover:bg-white/5 transition-all duration-300 group">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:scale-110 transition-transform flex-shrink-0 mt-1">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-white group-hover:text-primary transition-colors text-lg uppercase tracking-tight leading-tight mb-3 whitespace-nowrap overflow-hidden pr-4" style={{ maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)' }}>{student.full_name}</p>
                                        <div className="flex items-center justify-start gap-3">
                                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest flex-shrink-0">{t('dashboard.joined', { date: format(new Date(student.created_at), 'MMM dd') })}</p>
                                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">{t('students.active')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <BatchAssessmentModal
                isOpen={showBatchTest}
                onClose={() => setShowBatchTest(false)}
                onSuccess={() => {
                    // Refetch data/stats if needed
                }}
                currentCoachId={null} // Pass null for admin to allow selecting any group
            />

            <AssessmentHistoryModal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                currentCoachId={null}
            />
        </div>
    );
}

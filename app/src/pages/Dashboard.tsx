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
import StudentDashboard from './StudentDashboard';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupsList from '../components/GroupsList';
import BatchAssessmentModal from '../components/BatchAssessmentModal';
import AssessmentHistoryModal from '../components/AssessmentHistoryModal';
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';
import FinancialProgressChart from '../components/FinancialProgressChart';
import PerformanceAnalyticsCard from '../components/PerformanceAnalyticsCard';
import { useFinancialTrends } from '../hooks/useData';
import { Activity } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { playHoverSound } from '../utils/audio';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { settings } = useTheme(); // Init hook
    const { role, fullName, userId } = useOutletContext<{ role: string, fullName: string, userId: string | null }>() || { role: null, fullName: null, userId: null };
    const { formatPrice } = useCurrency();
    const [showBatchTest, setShowBatchTest] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const { data: stats, isLoading: loading } = useDashboardStats();
    const { data: financialTrends } = useFinancialTrends();
    const { currency } = useCurrency();

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

    // Show Student Dashboard
    if (role === 'student') {
        return <StudentDashboard />;
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
            pastel: 'pastel-mint',
            trend: '+12% from last month',
            path: '/app/students'
        },
        {
            label: t('dashboard.monthlyRevenue'),
            value: formatPrice(displayStats.monthlyRevenue),
            icon: DollarSign,
            pastel: 'pastel-yellow',
            trend: '+5% from last month',
            path: '/app/finance'
        },
        {
            label: t('dashboard.trainingGroups'),
            value: displayStats.totalGroups,
            icon: Scale,
            pastel: 'pastel-coral',
            trend: 'Optimized',
            path: '/app/schedule'
        },
        {
            label: t('dashboard.activeCoaches'),
            value: displayStats.activeCoaches,
            icon: Medal,
            pastel: 'pastel-blue',
            trend: 'Active Now',
            isLive: true,
            path: '/app/coaches'
        }
    ];

    console.log('Dashboard Render. Role:', role, 'FullName:', fullName, 'Stats:', stats, 'Loading:', loading);
    console.log('Is Reception?', role === 'reception');

    return (
        <div className="space-y-10">
            <PageHeader
                title={t('dashboard.title', 'Dashboard')}
                titleSuffix={
                    <div className="ml-4 border-l border-surface-border pl-4 py-1 flex flex-col gap-0.5 min-w-0 self-end mb-1">
                        <p className="text-[8px] font-black text-muted uppercase tracking-[0.3em] leading-none">{t('common.today', 'TODAY')}</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl md:text-2xl font-medium text-muted arctic italic leading-none">{t('dashboard.welcome', 'Welcome back')},</span>
                            <span className="text-xl md:text-2xl font-black text-base uppercase tracking-tighter leading-none pr-1">
                                <span className="premium-gradient-text">
                                    {fullName?.split(' ')[0] || (role ? t(`roles.${role}`) : 'Admin')}
                                </span>
                            </span>
                        </div>
                    </div>
                }
                subtitle={t('dashboard.subtitle', 'Academy Overview & Live Analytics')}
            >
                <button
                    onClick={() => setShowBatchTest(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <ClipboardCheck className="w-4 h-4" />
                    {t('dashboard.batchAssessment', 'Batch Assessment')}
                </button>
                <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <Activity className="w-4 h-4" />
                    {t('dashboard.testHistory', 'Test History')}
                </button>
            </PageHeader>

            {/* Stats Grid - Balanced & Elite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        onClick={() => stat.path && navigate(stat.path)}
                        onMouseEnter={playHoverSound}
                        className={`pastel-card ${stat.pastel} group h-full flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xl`}
                    >
                        <div className="flex items-center justify-between gap-4 mb-6 relative z-10 text-black/40">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] truncate flex-1">{stat.label}</p>
                            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 backdrop-blur-xl transition-all duration-500 border border-black/5 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6">
                                <stat.icon
                                    className="w-4 h-4 text-black/80"
                                    strokeWidth={2}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 relative z-10">
                            <div className="flex items-baseline justify-between mb-1">
                                <h3 className="text-4xl font-black text-black tracking-tighter !text-black">
                                    {loading ? (
                                        <div className="h-10 w-24 bg-black/5 animate-pulse rounded-xl"></div>
                                    ) : (
                                        stat.value
                                    )}
                                </h3>
                                <ArrowUpRight className="w-5 h-5 text-black/10 group-hover:text-black/30 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                            </div>
                            <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mt-2`}>
                                {stat.isLive ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shadow-[0_0_8px_rgba(5,150,105,0.4)]"></span>
                                        {stat.trend}
                                    </span>
                                ) : (
                                    <>
                                        {stat.trend}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Business Intelligence Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart Card */}
                <div
                    onClick={() => navigate('/app/finance')}
                    className="glass-card p-6 sm:p-10 rounded-[3rem] relative overflow-hidden cursor-pointer hover:bg-surface-border/30 transition-colors group"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 backdrop-blur-md rounded-2xl text-primary border border-primary/20 shadow-lg group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-base uppercase tracking-tight">{t('dashboard.businessHealth', 'Mottaba3 El Tamaren')}</h2>
                                <p className="text-[9px] font-black text-muted uppercase tracking-[0.4em] mt-1">Monthly Analytics</p>
                            </div>
                        </div>
                        <div className="p-2 bg-surface-border/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-5 h-5 text-muted" />
                        </div>
                    </div>
                    <FinancialProgressChart
                        data={financialTrends || []}
                        currencyCode={currency.code}
                    />
                </div>

                {/* Performance Analytics Card */}
                <div
                    onClick={() => navigate('/app/students')}
                    className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 duration-300 h-full"
                >
                    <PerformanceAnalyticsCard
                        title="Top Groups by Participation"
                        totalLabel="Total Active Students"
                        totalValue={displayStats.totalStudents}
                        segments={[
                            { label: 'Morning Warriors', value: 45, color: '#4a7c59' },
                            { label: 'Elite Pro', value: 30, color: '#8a9a5b' },
                            { label: 'Kids Academy', value: 15, color: '#dcd7c9' },
                            { label: 'Evening PT', value: 10, color: '#f2f0e9' }
                        ]}
                        activeSegmentLabel="Peak Performance"
                        activeSegmentValue="4.25%"
                    />
                </div>
            </div>


            {/* Live Floor & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Floor Widget */}
                <div className="lg:col-span-1 h-full min-h-[500px]">
                    <LiveStudentsWidget />
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 glass-card rounded-[2.5rem] overflow-hidden">
                    <div className="p-8 border-b border-surface-border flex items-center justify-between">
                        <h3 className="text-xl font-black text-base uppercase tracking-tight flex items-center gap-3">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            {t('dashboard.newJoiners')}
                        </h3>
                        <button
                            onClick={() => navigate('/app/students')}
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-base transition-colors"
                        >
                            {t('dashboard.viewAll')}
                        </button>
                    </div>

                    <div className="p-8 space-y-4">
                        {loading ? (
                            <p className="text-muted text-sm font-black uppercase tracking-widest text-center py-10">{t('common.loading')}</p>
                        ) : displayStats.recentActivity.length === 0 ? (
                            <p className="text-muted text-sm font-black uppercase tracking-widest text-center py-10">{t('dashboard.noRecentActivity')}</p>
                        ) : (
                            displayStats.recentActivity.map((student: any) => (
                                <div key={student.id} className="flex items-start gap-4 p-5 bg-surface-border/10 rounded-3xl border border-surface-border hover:bg-surface-border/20 transition-all duration-300 group overflow-hidden">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:scale-110 transition-transform flex-shrink-0 mt-1">
                                        {student.full_name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-base group-hover:text-primary transition-colors text-lg uppercase tracking-tight leading-tight mb-3 whitespace-nowrap overflow-hidden pr-4" style={{ maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)' }}>{student.full_name}</p>
                                        <div className="flex items-center justify-between gap-3 w-full">
                                            <p className="text-[10px] text-muted font-black uppercase tracking-widest truncate">{t('dashboard.joined', { date: format(new Date(student.created_at), 'MMM dd') })}</p>
                                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 shrink-0">{t('students.active')}</span>
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

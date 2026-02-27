import { useState } from 'react';
import { Plus, Wallet, Calendar, TrendingUp, DollarSign, Receipt, Dumbbell, RefreshCw, Trash2, ArrowLeft, History } from 'lucide-react';
import AddPaymentForm from '../components/AddPaymentForm';
import AddRefundForm from '../components/AddRefundForm';
import AddExpenseForm from '../components/AddExpenseForm';
import { format, startOfMonth, endOfMonth, addMonths, isSameMonth, parseISO } from 'date-fns';
import { usePayments, useMonthlyPayroll, useRefunds, useExpenses, useAddRefund, useAddExpense } from '../hooks/useData';
import { useTranslation } from 'react-i18next';
import FinanceDetailModal from '../components/FinanceDetailModal';
import FinanceTrashModal from '../components/FinanceTrashModal';
import ConfirmModal from '../components/ConfirmModal';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PremiumCheckbox from '../components/PremiumCheckbox';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes: string;
    created_at: string;
    students: {
        full_name: string;
    }
}

export default function Finance() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const { data: paymentsData, isLoading: loading, refetch } = usePayments();
    const { data: refundsData } = useRefunds();
    const { data: expensesData } = useExpenses();
    const addRefundMutation = useAddRefund();
    const addExpenseMutation = useAddExpense();

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteIds, setDeleteIds] = useState<string[]>([]);
    const [deleteTable, setDeleteTable] = useState<string | null>(null);

    const handleDeleteTransaction = (id: string, table: string) => {
        setDeleteIds([id]);
        setDeleteTable(table);
        setConfirmDelete(true);
    };

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) return;
        setDeleteIds(selectedItems);
        setDeleteTable('payments'); // Bulk delete currently optimized for payments list
        setConfirmDelete(true);
    };

    const confirmDeleteTransaction = async () => {
        if (deleteIds.length === 0 || !deleteTable) return;
        const toastId = toast.loading(deleteIds.length > 1 ? `Deleting ${deleteIds.length} transactions...` : 'Deleting transaction...');
        try {
            // 1. Fetch the data before deleting (to save in history)
            const { data: records, error: fetchError } = await supabase
                .from(deleteTable)
                .select('*')
                .in('id', deleteIds);

            if (fetchError) throw fetchError;

            // 2. Insert into history manually (Fallback for when triggers fail)
            if (records && records.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                const historyEntries = records.map(record => ({
                    table_name: deleteTable,
                    row_id: record.id,
                    row_data: record,
                    action: 'DELETE',
                    created_by: user?.id
                }));

                const { error: historyError } = await supabase
                    .from('finance_history')
                    .insert(historyEntries);

                // If this fails, the table might not exist. We'll try to create it if possible, 
                // but for now we just log the error and proceed or show a warning.
                if (historyError) {
                    console.error('History logging failed:', historyError);
                    toast.error('Save to Recycle Bin failed. Please run the SQL command provided.', { id: toastId });
                    return; // Stop here if we can't backup the data
                }
            }

            // 3. Perform the actual delete
            const { error: deleteError } = await supabase.from(deleteTable).delete().in('id', deleteIds);
            if (deleteError) throw deleteError;

            toast.success(deleteIds.length > 1 ? `Deleted ${deleteIds.length} items to Trash` : 'Deleted and moved to Trash', { id: toastId });
            setSelectedItems([]);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['refunds'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        } catch (error: any) {
            toast.error(error.message || 'Delete failed', { id: toastId });
        } finally {
            setConfirmDelete(false);
            setDeleteIds([]);
            setDeleteTable(null);
        }
    };

    const [selectedDate, setSelectedDate] = useState(new Date());

    const currentMonthStr = format(selectedDate, 'yyyy-MM');
    const { data: payrollData, isLoading: payrollLoading } = useMonthlyPayroll(currentMonthStr);

    const payments = (paymentsData as Payment[]) || [];
    const refunds = (refundsData as any[]) || [];
    const expenses = (expensesData as any[]) || [];

    // Overall stats (Lifetime)
    const lifetimePayments = payments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);
    const lifetimeRefundsTotal = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalRevenue = lifetimePayments - lifetimeRefundsTotal;

    // Period Filtering Logic
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const monthlyPayments = payments
        .filter(p => {
            const d = parseISO(p.payment_date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    const monthlyRevenueTotal = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const monthlyRefunds = refunds.filter(r => {
        const d = parseISO(r.refund_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalMonthlyRefunds = monthlyRefunds.reduce((sum, r) => sum + Number(r.amount), 0);

    // Net Monthly Revenue (Payments - Refunds)
    const monthlyRevenue = monthlyRevenueTotal - totalMonthlyRefunds;

    const monthlyGeneralExpenses = expenses.filter(e => {
        const d = parseISO(e.expense_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalMonthlyGeneralExpenses = monthlyGeneralExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Separate PT earnings from base salaries
    const monthlyBaseSalaries = payrollData?.payrollData?.reduce((sum, coach) => sum + Number(coach.salary), 0) || 0;
    const monthlyPTEarnings = payrollData?.payrollData?.reduce((sum, coach) => {
        return sum + (Number((coach as any).pt_earnings) || 0);
    }, 0) || 0;
    const monthlyPayroll = payrollData?.totalPayroll || 0; // Total (Salaries + PT)

    // Note: totalMonthlyRefunds is already subtracted from monthlyRevenue
    const monthlyExpenses = monthlyBaseSalaries + monthlyPTEarnings + totalMonthlyGeneralExpenses;
    const netProfit = monthlyRevenue - monthlyExpenses;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Modal State
    const [detailType, setDetailType] = useState<'revenue' | 'income' | 'expenses' | 'profit' | 'refunds' | 'general_expenses' | 'pt_sessions' | null>(null);

    const getModalData = () => {
        switch (detailType) {
            case 'revenue': return payments;
            case 'income': return monthlyPayments;
            case 'expenses': return payrollData?.payrollData || [];
            case 'pt_sessions': return payrollData?.payrollData || [];
            case 'refunds': return monthlyRefunds;
            case 'general_expenses': return monthlyGeneralExpenses;
            case 'profit': return { revenue: monthlyRevenue, expenses: monthlyExpenses, profit: netProfit };
            default: return null;
        }
    };

    const getModalTitle = () => {
        switch (detailType) {
            case 'revenue': return t('finance.totalRevenue');
            case 'income': return t('finance.monthlyRevenue');
            case 'expenses': return t('finance.salaries');
            case 'pt_sessions': return t('finance.ptEarnings');
            case 'refunds': return t('finance.refunds');
            case 'general_expenses': return t('finance.expenses');
            case 'profit': return t('finance.netProfitSummary');
            default: return '';
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-12 border-b border-white/5 pb-8 md:pb-12">
                <div className="max-w-2xl text-center lg:text-left flex-shrink-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4 animate-in slide-in-from-left duration-500">
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-brand-label)' }}>{t('finance.title')}</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-3">
                        {t('finance.titlePart1')} <span className="premium-gradient-text">{t('finance.titlePart2')}</span>
                    </h1>
                    <p className="text-white/40 text-[9px] sm:text-xs font-bold tracking-wide uppercase max-w-xl mx-auto lg:mx-0">
                        {t('finance.subtitle')}
                    </p>
                </div>

                <div className="flex flex-col items-center lg:items-end gap-6 md:gap-8 w-full">
                    {/* Premium Utility Bar */}
                    <div className="flex items-center gap-4 bg-white/[0.03] p-1.5 md:p-2 rounded-2xl md:rounded-[2.5rem] border border-white/[0.05] shadow-2xl w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl md:rounded-2xl border border-white/5 flex-1 sm:flex-initial shadow-inner">
                            <button
                                onClick={() => setSelectedDate(prev => addMonths(prev, -1))}
                                className="w-9 h-9 md:w-12 md:h-12 bg-white/[0.01] hover:bg-white/10 text-white/20 hover:text-white rounded-lg md:rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 border border-white/[0.02] hover:border-white/10"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <div className="flex flex-col items-center px-4 md:px-8 min-w-[120px] md:min-w-[170px] flex-1">
                                <span className="text-[8px] font-black uppercase tracking-[0.4em] mb-1 text-primary animate-pulse">{t('finance.period')}</span>
                                <span className="text-sm md:text-base font-black text-white uppercase tracking-tighter text-center leading-none">
                                    {format(selectedDate, 'MMMM yyyy')}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
                                className="w-9 h-9 md:w-12 md:h-12 bg-white/[0.01] hover:bg-white/10 text-white/20 hover:text-white rounded-lg md:rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 border border-white/[0.02] hover:border-white/10"
                            >
                                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 pr-2 border-l border-white/10 pl-4">
                            <button
                                onClick={() => setShowTrashModal(true)}
                                className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-white/[0.03] hover:bg-rose-500/10 flex items-center justify-center text-white/20 hover:text-rose-400 transition-all active:scale-90 border border-white/[0.05] group"
                                title={t('finance.history')}
                            >
                                <History className="w-5 h-5 md:w-6 md:h-6 group-hover:-rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 w-full">
                        <button
                            onClick={async () => {
                                // Add check for PT sessions if needed
                                setShowAddModal(true);
                            }}
                            className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <div className="p-1 bg-white/20 rounded-md group-hover:rotate-90 transition-transform duration-500 relative z-10">
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </div>
                            <span className="relative z-10">{t('finance.addPayment')}</span>
                        </button>
                        <button
                            onClick={() => setShowRefundModal(true)}
                            className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-500 text-white rounded-xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-rose-500/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <div className="p-1 bg-white/20 rounded-md group-hover:rotate-12 transition-transform duration-500 relative z-10">
                                <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </div>
                            <span className="relative z-10">{t('finance.addRefund')}</span>
                        </button>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-500 text-white rounded-xl font-black uppercase tracking-widest text-[8px] sm:text-[9px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <div className="p-1 bg-white/20 rounded-md group-hover:-rotate-12 transition-transform duration-500 relative z-10">
                                <Receipt className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            </div>
                            <span className="relative z-10">{t('finance.addExpense')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Total Revenue */}
                <button onClick={() => setDetailType('revenue')} className="text-left w-full glass-card p-4 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-primary/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-primary transition-colors whitespace-normal break-words leading-tight">{t('finance.totalRevenue')}</p>
                        <div className="p-1.5 bg-primary/20 rounded-lg text-primary shadow-inner">
                            <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tighter">{totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Monthly Income */}
                <button onClick={() => setDetailType('income')} className="text-left w-full glass-card p-4 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-indigo-400/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-indigo-400 transition-colors whitespace-normal break-words leading-tight">{t('finance.monthlyRevenue')}</p>
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400 shadow-inner">
                            <Calendar className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tighter">{monthlyRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Base Salaries */}
                <button onClick={() => setDetailType('expenses')} className="text-left w-full glass-card p-4 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-orange-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-orange-400 transition-colors whitespace-normal break-words leading-tight">{t('finance.salaries')}</p>
                        <div className="p-1.5 bg-orange-500/20 rounded-lg text-orange-400 shadow-inner">
                            <Wallet className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-orange-400 tracking-tighter">
                            {payrollLoading ? '...' : monthlyBaseSalaries.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* PT Sessions */}
                <button onClick={() => setDetailType('pt_sessions')} className="text-left w-full glass-card p-4 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-purple-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-purple-400 transition-colors whitespace-normal break-words leading-tight">{t('finance.ptEarnings')}</p>
                        <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400 shadow-inner">
                            <Dumbbell className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-purple-400 tracking-tighter">
                            {payrollLoading ? '...' : monthlyPTEarnings.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Monthly Refunds */}
                <button onClick={() => setDetailType('refunds')} className="text-left w-full glass-card p-4 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-rose-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-rose-400 transition-colors whitespace-normal break-words leading-tight">{t('finance.refunds')}</p>
                        <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-400 shadow-inner">
                            <DollarSign className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-rose-400 tracking-tighter">
                            {totalMonthlyRefunds.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Monthly Expenses */}
                <button onClick={() => setDetailType('general_expenses')} className="text-left w-full glass-card p-4 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-amber-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-amber-400 transition-colors whitespace-normal break-words leading-tight">{t('finance.expenses')}</p>
                        <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400 shadow-inner">
                            <Receipt className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-amber-400 tracking-tighter">
                            {totalMonthlyGeneralExpenses.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-3 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Net Profit */}
                <button onClick={() => setDetailType('profit')} className="col-span-2 text-left w-full glass-card p-5 rounded-[2.5rem] border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-emerald-400/30">
                    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-colors ${netProfit >= 0 ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-orange-500/5 group-hover:bg-orange-500/10'}`}></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${netProfit >= 0 ? 'text-white/60 group-hover:text-emerald-400' : 'text-white/60 group-hover:text-orange-400'}`}>{t('finance.netProfit')}</p>
                        <div className={`p-2 rounded-xl shadow-inner ${netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className={`text-4xl sm:text-5xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {payrollLoading ? '...' : netProfit.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                        <div className="flex items-center gap-2 md:gap-3 text-[9px] font-black uppercase tracking-[0.3em]">
                            {netProfit >= 0 ? (
                                <span className="text-emerald-400 flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {t('finance.profitable')}</span>
                            ) : (
                                <span className="text-orange-400 flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> {t('finance.deficit')}</span>
                            )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>
            </div>

            <FinanceDetailModal
                isOpen={!!detailType}
                onClose={() => setDetailType(null)}
                type={detailType}
                title={getModalTitle()}
                data={getModalData()}
                onDelete={handleDeleteTransaction}
            />
            {/* Recent Transactions List */}
            <div className="glass-card rounded-2xl md:rounded-[3rem] overflow-hidden border border-white/10 shadow-premium mt-8 md:mt-12 bg-white/[0.01]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 md:px-8 py-5 md:py-6 bg-white/[0.02] border-b border-white/5 gap-4">
                    <h2 className="text-base md:text-lg font-black text-white uppercase tracking-tight flex items-center gap-3 md:gap-4">
                        {t('finance.recentTransactions')}
                        {selectedItems.length > 0 && (
                            <span className="text-[9px] md:text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/20">
                                {selectedItems.length} {t('common.selected')}
                            </span>
                        )}
                    </h2>
                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('finance.bulkDelete')}
                        </button>
                    )}
                </div>

                {/* Mobile Transaction List: Premium Card Layout */}
                <div className="md:hidden space-y-4 p-4">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('common.loading')}</p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="p-20 text-center text-white/10 font-black uppercase tracking-[0.3em] italic text-xs">
                            {t('common.noResults')}
                        </div>
                    ) : (
                        payments.map((payment) => {
                            const isPT = payment.notes?.toLowerCase().includes('pt');
                            const isSelected = selectedItems.includes(payment.id);
                            return (
                                <div
                                    key={payment.id}
                                    className={`glass-card p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-4 ${isSelected ? 'bg-primary/5 border-primary/40' : 'bg-white/[0.02] border-white/10'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-primary font-black text-lg shadow-inner">
                                                    {payment.students?.full_name?.[0] || (payment.notes?.split(' - ')[1]?.trim()?.[0] || 'G')}
                                                </div>
                                                <div className="absolute -top-1 -right-1">
                                                    <PremiumCheckbox
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setSelectedItems(prev =>
                                                                prev.includes(payment.id)
                                                                    ? prev.filter(id => id !== payment.id)
                                                                    : [...prev, payment.id]
                                                            );
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-white text-base truncate tracking-tight">{payment.students?.full_name || (payment.notes?.split(' - ')[1]?.split(' (')[0]?.trim() || t('common.guest'))}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${!isPT ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                                                        {isPT ? t('pt.title') : t('common.student')}
                                                    </span>
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                                                        {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className={`text-xl font-black tracking-tighter ${Number(payment.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {Number(payment.amount) > 0 ? '+' : ''}{Number(payment.amount).toLocaleString()}
                                            </span>
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{currency.code}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[8px] font-black text-white/40 uppercase tracking-widest">
                                                {(payment.payment_method || 'Cash').replace('_', ' ')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTransaction(payment.id, 'payments');
                                            }}
                                            className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 active:scale-90 transition-transform"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-visible">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#0a0c10] backdrop-blur-md">
                                <th className="px-4 py-4 w-12 text-center">
                                    <PremiumCheckbox
                                        checked={payments.length > 0 && selectedItems.length === payments.length}
                                        onChange={() => {
                                            if (selectedItems.length === payments.length) {
                                                setSelectedItems([]);
                                            } else {
                                                setSelectedItems(payments.map(p => p.id));
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">{t('common.student')}</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">{t('common.role')}</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">{t('common.date')}</th>
                                <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">{t('common.method')}</th>
                                <th className="px-4 py-4 text-right text-[9px] font-black uppercase tracking-widest text-white/20">{t('common.amount')}</th>
                                <th className="px-4 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-20 text-center"><div className="flex flex-col items-center gap-4"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div><p className="text-[9px] font-black uppercase tracking-widest text-white/20">{t('common.loading')}</p></div></td></tr>
                            ) : payments.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-20 text-center text-white/10 font-black uppercase tracking-[0.3em] italic text-xs">{t('common.noResults')}</td></tr>
                            ) : (
                                payments.map((payment) => {
                                    const isPT = payment.notes?.toLowerCase().includes('pt');
                                    const isSelected = selectedItems.includes(payment.id);
                                    return (
                                        <tr key={payment.id} className={`group hover:bg-white/[0.04] transition-all duration-500 ${isSelected ? 'bg-primary/5' : ''}`}>
                                            <td className="px-4 py-2 text-center">
                                                <PremiumCheckbox
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        setSelectedItems(prev =>
                                                            prev.includes(payment.id)
                                                                ? prev.filter(id => id !== payment.id)
                                                                : [...prev, payment.id]
                                                        );
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary group-hover:scale-105 transition-all duration-500 shadow-inner shrink-0">
                                                        {payment.students?.full_name?.[0] || (payment.notes?.split(' - ')[1]?.trim()?.[0] || 'G')}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-black text-white text-xs tracking-tight truncate group-hover:text-primary transition-colors">
                                                            {payment.students?.full_name || (payment.notes?.split(' - ')[1]?.split(' (')[0]?.trim() || t('common.guest'))}
                                                        </div>
                                                        <div
                                                            className="text-[8px] font-black uppercase tracking-[0.1em] truncate"
                                                            style={{ color: payment.students?.full_name ? 'var(--color-brand-label)' : '#f59e0b' }}
                                                        >
                                                            {payment.students?.full_name ? t('pt.academyStudent') : t('pt.guestStudent')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.1em] border transition-all duration-500 ${!isPT ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20' : ''}`}
                                                    style={isPT ? {
                                                        color: 'var(--color-brand-label)',
                                                        backgroundColor: 'color-mix(in srgb, var(--color-brand-label), transparent 90%)',
                                                        borderColor: 'color-mix(in srgb, var(--color-brand-label), transparent 80%)'
                                                    } : {}}
                                                >
                                                    {isPT ? t('pt.title') : t('common.student')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="text-white/40 font-black text-[10px] tracking-wider uppercase">
                                                    {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 text-[8px] font-black uppercase tracking-widest text-white/30 border border-white/5 group-hover:border-primary/30 group-hover:text-primary transition-all duration-500 shadow-inner">
                                                    {(payment.payment_method || 'Cash').replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex flex-col items-end group-hover:scale-105 transition-transform duration-500 origin-right">
                                                    <span className={`text-lg font-black tracking-tighter ${Number(payment.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {Number(payment.amount) > 0 ? '+' : ''}{Number(payment.amount).toLocaleString()}
                                                    </span>
                                                    <span className="text-[7px] font-black text-white/10 uppercase tracking-[0.3em]">{currency.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <button
                                                    onClick={() => handleDeleteTransaction(payment.id, 'payments')}
                                                    className="p-2 text-white/20 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {
                showAddModal && (
                    <AddPaymentForm
                        onClose={() => setShowAddModal(false)}
                        onSuccess={refetch}
                    />
                )
            }
            {
                showRefundModal && (
                    <AddRefundForm
                        onClose={() => setShowRefundModal(false)}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['refunds'] });
                        }}
                        onAdd={async (refund) => {
                            await addRefundMutation.mutateAsync(refund);
                        }}
                    />
                )
            }
            {
                showExpenseModal && (
                    <AddExpenseForm
                        onClose={() => setShowExpenseModal(false)}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        }}
                        onAdd={async (expense) => {
                            await addExpenseMutation.mutateAsync(expense);
                        }}
                    />
                )
            }
            {
                showTrashModal && (
                    <FinanceTrashModal
                        isOpen={showTrashModal}
                        onClose={() => setShowTrashModal(false)}
                        onRestore={() => {
                            refetch();
                            queryClient.invalidateQueries({ queryKey: ['refunds'] });
                            queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        }}
                    />
                )
            }

            <ConfirmModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={confirmDeleteTransaction}
                title={t('common.delete')}
                message={t('common.deleteConfirm')}
                type="danger"
            />
        </div >
    );
}

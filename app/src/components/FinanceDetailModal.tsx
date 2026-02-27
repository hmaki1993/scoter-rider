import { useState } from 'react';
import { X, TrendingUp, Calendar, Wallet, AlertTriangle, DollarSign, Receipt, Dumbbell, Trash2, ArrowLeft, User, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../context/CurrencyContext';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes: string;
    students: {
        full_name: string;
    };
}

interface PayrollEntry {
    coach_id?: string;
    coach_name: string;
    salary: number;
    total_earnings: number;
    total_pt_sessions: number;
    pt_rate: number;
    pt_earnings?: number;
    pt_sessions?: Array<{
        id: string;
        student_name: string;
        sessions_count: number;
        coach_share: number;
        date: string;
        created_at: string;
    }>;
}

interface Refund {
    id: string;
    amount: number;
    refund_date: string;
    reason?: string;
    students: {
        full_name: string;
    };
}

interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    expense_date: string;
}

interface ProfitData {
    revenue: number;
    expenses: number;
    profit: number;
}

interface FinanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'revenue' | 'income' | 'expenses' | 'profit' | 'refunds' | 'general_expenses' | 'pt_sessions' | null;
    title: string;
    data: Payment[] | PayrollEntry[] | Refund[] | Expense[] | ProfitData | null;
    onDelete?: (id: string, table: string) => void;
}

export default function FinanceDetailModal({ isOpen, onClose, type, title, data, onDelete }: FinanceDetailModalProps) {
    const { currency } = useCurrency();
    const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

    if (!isOpen || !type || !data) return null;

    const selectedCoach = type === 'pt_sessions' ? (data as PayrollEntry[]).find(p => p.coach_id === selectedCoachId) : null;

    const renderContent = () => {
        switch (type) {
            case 'revenue':
            case 'income':
                const payments = data as Payment[];
                return (
                    <div className="space-y-3 sm:space-y-6">
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Gymnast</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Method</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        {onDelete && <th className="px-6 py-4 w-12"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payments.length === 0 ? (
                                        <tr><td colSpan={onDelete ? 6 : 5} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No records found</td></tr>
                                    ) : (
                                        payments.map((p) => {
                                            const isPT = p.notes?.toLowerCase().includes('pt');
                                            return (
                                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary font-black text-sm group-hover:scale-110 transition-transform">
                                                                {p.students?.full_name?.[0] || (p.notes?.split(' - ')[1]?.trim()?.[0] || 'G')}
                                                            </div>
                                                            <div className="font-bold text-white group-hover:text-primary transition-colors">{p.students?.full_name || (p.notes?.split(' - ')[1]?.split(' (')[0]?.trim() || 'Guest Gymnast')}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${isPT ? 'bg-primary/10 text-primary border-primary/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                            {isPT ? 'Personal Training' : 'Gymnast'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-white/60 text-xs font-mono">{format(new Date(p.payment_date), 'MMM dd, yyyy')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest border border-white/5">{p.payment_method.replace('_', ' ')}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black tracking-tight text-xl">
                                                        <span className={Number(p.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                                            {Number(p.amount) > 0 ? '+' : ''}{Number(p.amount).toLocaleString()}
                                                        </span> <span className="text-[10px] text-white/10 uppercase tracking-widest">{currency.code}</span>
                                                    </td>
                                                    {onDelete && (
                                                        <td className="px-6 py-4">
                                                            <button
                                                                onClick={() => onDelete(p.id, 'payments')}
                                                                className="p-2 bg-white/5 hover:bg-rose-500/10 text-white/20 hover:text-rose-400 rounded-lg transition-all active:scale-95"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: Premium Cards */}
                        <div className="md:hidden space-y-3 sm:space-y-4">
                            {payments.length === 0 ? (
                                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No records found</div>
                            ) : (
                                payments.map((p) => {
                                    const isPT = p.notes?.toLowerCase().includes('pt');
                                    return (
                                        <div key={p.id} className="glass-card p-4 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3 sm:space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary font-black text-lg">
                                                        {p.students?.full_name?.[0] || (p.notes?.split(' - ')[1]?.trim()?.[0] || 'G')}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-white text-xs sm:text-sm">{p.students?.full_name || (p.notes?.split(' - ')[1]?.split(' (')[0]?.trim() || 'Guest Gymnast')}</h3>
                                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${isPT ? 'bg-primary/10 text-primary border-primary/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                            {isPT ? 'Personal Training' : 'Gymnast'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg sm:text-xl font-black tracking-tighter ${Number(p.amount) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {Number(p.amount) > 0 ? '+' : ''}{Number(p.amount).toLocaleString()}
                                                    </p>
                                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{currency.code}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-widest">{format(new Date(p.payment_date), 'dd MMM yyyy')}</span>
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-[7px] sm:text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5">{p.payment_method.replace('_', ' ')}</span>
                                                </div>
                                                {onDelete && (
                                                    <button onClick={() => onDelete(p.id, 'payments')} className="p-1.5 sm:p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 active:scale-95 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );

            case 'expenses':
                const payroll = data as PayrollEntry[];
                return (
                    <div className="space-y-3 sm:space-y-6">
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Coach</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-right">Base Salary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {payroll.length === 0 ? (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No payroll records</td></tr>
                                    ) : (
                                        payroll.map((p, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div className="font-bold text-white group-hover:text-orange-400 transition-colors">{p.coach_name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg bg-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest border border-white/5">Staff Member</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-orange-400 tracking-tight text-xl">
                                                    -{p.salary.toLocaleString()} <span className="text-[10px] text-white/10 uppercase tracking-widest">{currency.code}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: Premium Cards */}
                        <div className="md:hidden space-y-3 sm:space-y-4">
                            {payroll.length === 0 ? (
                                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No payroll records</div>
                            ) : (
                                payroll.map((p, i) => (
                                    <div key={i} className="glass-card p-4 sm:p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3 sm:space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-xs sm:text-sm">{p.coach_name}</p>
                                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Base Salary</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg sm:text-xl font-black text-orange-400 tracking-tighter">-{p.salary.toLocaleString()}</p>
                                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{currency.code}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 'pt_sessions':
                const ptPayroll = data as PayrollEntry[];

                if (selectedCoach) {
                    return (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setSelectedCoachId(null)}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to Coaches
                                </button>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{selectedCoach.coach_name}</p>
                                    <p className="text-sm font-black text-purple-400">Total: {selectedCoach.pt_earnings?.toLocaleString()} {currency.code}</p>
                                </div>
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4">Student</th>
                                            <th className="px-6 py-4 text-center">Date</th>
                                            <th className="px-6 py-4 text-center">Sessions</th>
                                            <th className="px-6 py-4 text-right">Earnings</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(selectedCoach.pt_sessions || []).map((s) => (
                                            <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-all">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div className="font-bold text-white text-sm">{s.student_name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-white/60 text-[10px] font-mono">{format(new Date(s.date), 'dd MMM yyyy')}</div>
                                                    <div className="text-[8px] text-white/20 font-black uppercase tracking-widest">{format(new Date(s.created_at), 'hh:mm a')}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center text-white/60 font-bold">{s.sessions_count}</td>
                                                <td className="px-6 py-4 text-right font-black text-purple-400 tracking-tight">
                                                    +{(s.sessions_count * (s.coach_share || selectedCoach.pt_rate || 0)).toLocaleString()} <span className="text-[9px] text-white/20">{currency.code}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View: High-End Cards */}
                            <div className="md:hidden space-y-4">
                                {(selectedCoach.pt_sessions || []).map((s) => (
                                    <div key={s.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4 relative overflow-hidden group active:scale-[0.98] transition-all">
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white uppercase tracking-tight">{s.student_name}</p>
                                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{format(new Date(s.date), 'EEEE')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-purple-400 tracking-tighter">+{(s.sessions_count * (s.coach_share || selectedCoach.pt_rate || 0)).toLocaleString()} <span className="text-[9px] text-white/20">{currency.code}</span></p>
                                                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{s.sessions_count} {s.sessions_count === 1 ? 'Session' : 'Sessions'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3 h-3 text-white/20" />
                                                <span className="text-[10px] font-black text-white/60 font-mono tracking-tight">{format(new Date(s.date), 'dd MMM yyyy')}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{format(new Date(s.created_at), 'hh:mm a')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="space-y-4">
                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Coach</th>
                                        <th className="px-6 py-4 text-center">PT Sessions</th>
                                        <th className="px-6 py-4 text-center">Rate/Session</th>
                                        <th className="px-6 py-4 text-right">Total Earnings</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {ptPayroll.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No PT sessions</td></tr>
                                    ) : (
                                        ptPayroll.map((p, i) => {
                                            const ptEarnings = p.pt_earnings ?? (p.total_pt_sessions * (p.pt_rate || 0));
                                            if (ptEarnings === 0) return null;
                                            return (
                                                <tr
                                                    key={i}
                                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                                    onClick={() => setSelectedCoachId(p.coach_id || null)}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{p.coach_name}</span>
                                                            <span className="text-[8px] font-black text-purple-500/40 uppercase tracking-widest group-hover:opacity-100 transition-opacity">Click to view breakdown →</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-white/60 font-bold">{p.total_pt_sessions}</td>
                                                    <td className="px-6 py-4 text-center text-white/40 text-xs font-mono">{(p.pt_rate || 0).toLocaleString()} {currency.code}</td>
                                                    <td className="px-6 py-4 text-right font-black text-purple-400 tracking-tight">
                                                        {ptEarnings.toLocaleString()} <span className="text-[9px] text-white/20">{currency.code}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: High-End Cards */}
                        <div className="md:hidden space-y-3">
                            {ptPayroll.length === 0 ? (
                                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No PT sessions</div>
                            ) : (
                                ptPayroll.map((p, i) => {
                                    const ptEarnings = p.pt_earnings ?? (p.total_pt_sessions * (p.pt_rate || 0));
                                    if (ptEarnings === 0) return null;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedCoachId(p.coach_id || null)}
                                            className="w-full text-left p-5 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden group active:scale-[0.98] transition-all"
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                                        <Dumbbell className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white uppercase tracking-tight">{p.coach_name}</p>
                                                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest animate-pulse">View Breakdown →</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-purple-400 tracking-tighter">{ptEarnings.toLocaleString()} <span className="text-[9px] text-white/20">{currency.code}</span></p>
                                                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{p.total_pt_sessions} Sessions</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Rate per Session:</span>
                                                    <span className="text-[10px] font-black text-white/60 font-mono tracking-tight">{(p.pt_rate || 0).toLocaleString()} {currency.code}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );

            case 'refunds':
                const refunds = data as Refund[];
                return (
                    <div className="space-y-6">
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Student</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Reason</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        {onDelete && <th className="px-6 py-4 w-12"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {refunds.length === 0 ? (
                                        <tr><td colSpan={onDelete ? 5 : 4} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No refunds</td></tr>
                                    ) : (
                                        refunds.map((r) => (
                                            <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-white group-hover:text-rose-400 transition-colors">
                                                    {r.students?.full_name || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 text-white/60 text-xs font-mono">{format(new Date(r.refund_date), 'MMM dd, yyyy')}</td>
                                                <td className="px-6 py-4 text-white/40 text-xs">{r.reason || 'No reason provided'}</td>
                                                <td className="px-6 py-4 text-right font-black text-rose-400 tracking-tight">
                                                    -{Number(r.amount).toLocaleString()} <span className="text-[9px] text-white/20">{currency.code}</span>
                                                </td>
                                                {onDelete && (
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => onDelete(r.id, 'refunds')}
                                                            className="p-2 bg-white/5 hover:bg-rose-500/10 text-white/20 hover:text-rose-400 rounded-lg transition-all active:scale-95"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: Premium Cards */}
                        <div className="md:hidden space-y-4">
                            {refunds.length === 0 ? (
                                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No refunds</div>
                            ) : (
                                refunds.map((r) => (
                                    <div key={r.id} className="glass-card p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                                                    <RefreshCw className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-sm">{r.students?.full_name || 'Unknown'}</p>
                                                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{format(new Date(r.refund_date), 'dd MMM yyyy')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-rose-400 tracking-tighter">-{Number(r.amount).toLocaleString()}</p>
                                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{currency.code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <p className="text-[9px] font-bold text-white/40 italic truncate max-w-[200px]">{r.reason || 'No reason provided'}</p>
                                            {onDelete && (
                                                <button onClick={() => onDelete(r.id, 'refunds')} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 active:scale-95 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 'general_expenses':
                const expenses = data as Expense[];
                const categoryLabels: Record<string, string> = {
                    rent: 'Rent',
                    equipment: 'Equipment',
                    utilities: 'Utilities',
                    salaries: 'Salaries',
                    other: 'Other'
                };
                return (
                    <div className="space-y-6">
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-6">CATEGORY</th>
                                        <th className="px-6 py-6">DATE</th>
                                        <th className="px-6 py-6 text-right">AMOUNT</th>
                                        {onDelete && <th className="px-6 py-4 w-12"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {expenses.length === 0 ? (
                                        <tr><td colSpan={onDelete ? 5 : 4} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No expenses</td></tr>
                                    ) : (
                                        expenses.map((e) => (
                                            <tr key={e.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-white group-hover:text-orange-400 transition-colors">
                                                    {e.description}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-wider border border-orange-500/20">
                                                        {categoryLabels[e.category] || e.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-white/60 text-xs font-mono">{format(new Date(e.expense_date), 'MMM dd, yyyy')}</td>
                                                <td className="px-6 py-4 text-right font-black text-orange-400 tracking-tight text-xl">
                                                    -{Number(e.amount).toLocaleString()} <span className="text-[10px] text-white/10 uppercase tracking-widest">{currency.code}</span>
                                                </td>
                                                {onDelete && (
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => onDelete(e.id, 'expenses')}
                                                            className="p-2 bg-white/5 hover:bg-rose-500/10 text-white/20 hover:text-rose-400 rounded-lg transition-all active:scale-95"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: Premium Cards */}
                        <div className="md:hidden space-y-4">
                            {expenses.length === 0 ? (
                                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No expenses</div>
                            ) : (
                                expenses.map((e) => (
                                    <div key={e.id} className="glass-card p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                                                    <Receipt className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-sm truncate max-w-[150px]">{e.description}</p>
                                                    <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                        {categoryLabels[e.category] || e.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-orange-400 tracking-tighter">-{Number(e.amount).toLocaleString()}</p>
                                                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{currency.code}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{format(new Date(e.expense_date), 'dd MMM yyyy')}</span>
                                            {onDelete && (
                                                <button onClick={() => onDelete(e.id, 'expenses')} className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 active:scale-95 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 'profit':
                const profitData = data as ProfitData;
                const isProfitable = profitData.profit >= 0;
                return (
                    <div className="space-y-4 sm:space-y-8 py-2 sm:py-4">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-4 sm:p-6 rounded-2xl bg-emerald-500/5 border border-white/10 text-center group hover:border-emerald-500/30 transition-all">
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-emerald-400/60 mb-1 sm:mb-2 text-center">Revenue</p>
                                <p className="text-xl sm:text-3xl font-black text-white tracking-tighter text-center">{profitData.revenue.toLocaleString()} <span className="text-[8px] sm:text-[10px] text-white/10 italic">{currency.code}</span></p>
                            </div>
                            <div className="p-4 sm:p-6 rounded-2xl bg-rose-500/5 border border-white/10 text-center group hover:border-rose-500/30 transition-all">
                                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-rose-400/60 mb-1 sm:mb-2 text-center">Expenses</p>
                                <p className="text-xl sm:text-3xl font-black text-white tracking-tighter text-center">{profitData.expenses.toLocaleString()} <span className="text-[8px] sm:text-[10px] text-white/10 italic">{currency.code}</span></p>
                            </div>
                        </div>

                        <div className="relative pt-2 sm:pt-6 flex flex-col items-center justify-center">
                            <div className={`p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border-2 ${isProfitable ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'bg-orange-500/20 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.2)]'} transition-all duration-500`}>
                                <div className="text-center">
                                    <p className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] mb-1 sm:mb-2 ${isProfitable ? 'text-emerald-300' : 'text-orange-300'}`}>Net Profit</p>
                                    <p className={`text-4xl sm:text-5xl font-black tracking-tighter ${isProfitable ? 'text-white' : 'text-white'}`}>
                                        {isProfitable ? '+' : ''}{profitData.profit.toLocaleString()}
                                    </p>
                                    <p className="text-[8px] sm:text-[10px] font-black text-white/40 mt-1 sm:mt-2 uppercase tracking-widest">{currency.code}</p>
                                </div>
                            </div>
                            {isProfitable ? (
                                <div className="mt-4 sm:mt-6 flex items-center gap-2 text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-bounce">
                                    <TrendingUp className="w-4 h-4" /> Excellent Performance
                                </div>
                            ) : (
                                <div className="mt-4 sm:mt-6 flex items-center gap-2 text-orange-400 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-bounce">
                                    <AlertTriangle className="w-4 h-4" /> Action Needed
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Header */}
                <div className="p-5 sm:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${type === 'expenses' ? 'bg-orange-500/20 text-orange-400' :
                            type === 'profit' ? 'bg-emerald-500/20 text-emerald-400' :
                                type === 'refunds' ? 'bg-rose-500/20 text-rose-400' :
                                    type === 'general_expenses' ? 'bg-orange-500/20 text-orange-400' :
                                        type === 'pt_sessions' ? 'bg-purple-500/20 text-purple-400' :
                                            'bg-primary/20 text-primary'
                            }`}>
                            {type === 'expenses' ? <Wallet className="w-5 h-5 sm:w-6 sm:h-6" /> :
                                type === 'profit' ? <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /> :
                                    type === 'refunds' ? <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" /> :
                                        type === 'general_expenses' ? <Receipt className="w-5 h-5 sm:w-6 sm:h-6" /> :
                                            type === 'pt_sessions' ? <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" /> :
                                                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter leading-tight">{title}</h2>
                            <p className="text-[7px] sm:text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Institutional Records</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl sm:rounded-2xl transition-all"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

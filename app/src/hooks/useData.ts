import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

// --- Students Hooks ---
export function useStudents() {
    return useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*, coaches ( full_name ), subscription_plans ( name, price, sessions_limit ), training_groups ( name )')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('Error fetching students:', error);
                throw error;
            }
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// --- Coaches Hooks ---
export function useCoaches() {
    return useQuery({
        queryKey: ['coaches'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];

            // Get coaches with roles
            const { data: coaches, error: coachesError } = await supabase
                .from('coaches')
                .select('id, full_name, email, phone, specialty, avatar_url, image_pos_x, image_pos_y, pt_rate, salary, role, created_at, profile_id, profiles(role)')
                .order('created_at', { ascending: false });

            if (coachesError) {
                console.error('Error fetching coaches:', coachesError);
                throw coachesError;
            }

            // Get today's attendance for status
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('coach_attendance')
                .select('coach_id, check_in_time, check_out_time, pt_sessions_count')
                .eq('date', today);

            if (attendanceError) console.error('Error fetching attendance status:', attendanceError);

            // Get today's PT sessions
            const { data: ptSessionsData, error: ptError } = await supabase
                .from('pt_sessions')
                .select('coach_id, sessions_count, student_name')
                .eq('date', today);

            if (ptError) console.error('Error fetching PT sessions:', ptError);

            // Safety check for map
            if (!coaches) return [];

            // Merge everything
            const enrichedCoaches = coaches?.map(coach => {
                const dayAttendance = attendanceData?.find(a => a.coach_id === coach.id);
                const coachPTs = ptSessionsData?.filter(s => s.coach_id === coach.id) || [];

                // Aggregated PT Sessions (from both tables)
                const totalSessions = (dayAttendance?.pt_sessions_count || 0) +
                    coachPTs.reduce((acc, curr) => acc + (curr.sessions_count || 0), 0);

                const studentNames = coachPTs.map(s => s.student_name).join(', ');

                // Determine Status and Calculate Duration
                let status = 'away';
                let dailyTotalSeconds = 0;

                if (dayAttendance) {
                    const start = new Date(dayAttendance.check_in_time);
                    if (dayAttendance.check_in_time && !dayAttendance.check_out_time) {
                        status = 'working';
                        dailyTotalSeconds = Math.floor((new Date().getTime() - start.getTime()) / 1000);
                    } else if (dayAttendance.check_out_time) {
                        status = 'done';
                        const end = new Date(dayAttendance.check_out_time);
                        dailyTotalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
                    }
                }

                return {
                    ...coach,
                    role: coach.role || (coach as any).profiles?.role,
                    pt_sessions_today: totalSessions,
                    pt_student_name: studentNames,
                    attendance_status: status,
                    check_in_time: dayAttendance?.check_in_time,
                    check_out_time: dayAttendance?.check_out_time,
                    daily_total_seconds: dailyTotalSeconds
                };
            });

            // --- 🛡️ ABSOLUTE UI DEDUPLICATION REGISTRY (v15) ---
            const uniqueList: any[] = [];
            const seenIds = new Set();
            const seenEmails = new Set();
            const seenProfileIds = new Set();
            const seenNames = new Set(); // Final fuzzy shield

            // Sort so we process those with profiles or check-ins first
            const sortedCoaches = [...enrichedCoaches].sort((a, b) => {
                if (a.profile_id && !b.profile_id) return -1;
                if (!a.profile_id && b.profile_id) return 1;
                if (a.attendance_status === 'working' && b.attendance_status !== 'working') return -1;
                return 0;
            });

            sortedCoaches.forEach(coach => {
                const email = coach.email?.toLowerCase().trim();
                const profileId = coach.profile_id;
                const name = coach.full_name?.toLowerCase().trim();

                const isDuplicate =
                    seenIds.has(coach.id) ||
                    (email && seenEmails.has(email)) ||
                    (profileId && seenProfileIds.has(profileId)) ||
                    (name && (!profileId || !email) && seenNames.has(name)); // Aggressive orphan block

                if (!isDuplicate) {
                    uniqueList.push(coach);
                    seenIds.add(coach.id);
                    if (email) seenEmails.add(email);
                    if (profileId) seenProfileIds.add(profileId);
                    if (name) seenNames.add(name);
                }
            });

            return uniqueList;
        },
        staleTime: 1000 * 30, // 30 seconds for live status
    });
}


// --- Finance Hooks ---
export function usePayments() {
    return useQuery({
        queryKey: ['payments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payments')
                .select('*, students(full_name)')
                .order('payment_date', { ascending: false });
            if (error) throw error;
            return data;
        },
    });
}

// --- Subscription Plans Hook ---
export function useSubscriptionPlans() {
    return useQuery({
        queryKey: ['subscription_plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('duration_months', { ascending: true });
            if (error) {
                console.error('Error fetching subscription plans:', error);
                throw error;
            }
            return data;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours (plans change rarely)
    });
}

export function useAddPlan() {
    return useMutation({
        mutationFn: async (plan: { name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number }) => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .insert([plan])
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    });
}

export function useDeletePlan() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('subscription_plans')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    });
}

export function useUpdatePlan() {
    return useMutation({
        mutationFn: async (plan: { id: string, name: string, duration_months: number, price: number, sessions_per_week: number, sessions_limit?: number }) => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .update({
                    name: plan.name,
                    duration_months: plan.duration_months,
                    price: plan.price,
                    sessions_per_week: plan.sessions_per_week,
                    sessions_limit: plan.sessions_limit
                })
                .eq('id', plan.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    });
}

// --- Dashboard Hooks ---
export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const startOfMonthDate = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

            const [students, coaches, payments, refunds, groups, recent] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('coaches').select('*', { count: 'exact', head: true }),
                supabase.from('payments').select('amount').gte('payment_date', startOfMonthDate),
                supabase.from('refunds').select('amount').gte('refund_date', startOfMonthDate),
                supabase.from('training_groups').select('*', { count: 'exact', head: true }),
                supabase.from('students').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5)
            ]);

            const monthlyPaymentsTotal = (payments.data || []).reduce((acc, curr) => acc + Number(curr.amount), 0);
            const monthlyRefundsTotal = (refunds.data || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

            return {
                totalStudents: students.count || 0,
                activeCoaches: coaches.count || 0,
                totalGroups: groups.count || 0,
                monthlyRevenue: monthlyPaymentsTotal - monthlyRefundsTotal,
                recentActivity: recent.data || []
            };
        }
    });
}

// --- AI Context Hook ---
export function useGymData() {
    const { data: students } = useStudents();
    const { data: coaches } = useCoaches();
    const { data: payments } = usePayments();

    return {
        students: students || [],
        coaches: coaches || [],
        payments: payments || [],
        timestamp: new Date().toISOString()
    };
}

// --- Payroll Hook ---
export function useMonthlyPayroll(month: string) {
    return useQuery({
        queryKey: ['payroll', month],
        queryFn: async () => {
            // 1. Get all coaches
            const { data: coaches, error: coachError } = await supabase
                .from('coaches')
                .select('id, full_name, pt_rate, salary, role');

            if (coachError) throw coachError;

            // Filter out admins from payroll
            const filteredCoaches = (coaches || []).filter(c => c.role !== 'admin');

            // 2. Get attendance and PT sessions for the selected month
            const startOfMonth = `${month}-01`;
            const lastDay = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();
            const endOfMonth = `${month}-${lastDay}`;

            const [attendanceRes, sessionsRes] = await Promise.all([
                supabase
                    .from('coach_attendance')
                    .select('coach_id, check_in_time, check_out_time, pt_sessions_count')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth),
                supabase
                    .from('pt_sessions')
                    .select('id, coach_id, sessions_count, coach_share, student_name, date, created_at')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
            ]);

            if (attendanceRes.error) throw attendanceRes.error;
            if (sessionsRes.error) throw sessionsRes.error;

            // 3. Aggregate data
            let totalPayroll = 0;
            const stats = filteredCoaches.map(coach => {
                const coachAttendance = attendanceRes.data?.filter(a => a.coach_id === coach.id) || [];
                const coachSessions = sessionsRes.data?.filter(s => s.coach_id === coach.id) || [];

                // Calculate total work hours
                let totalSeconds = 0;
                coachAttendance.forEach(record => {
                    if (record.check_in_time && record.check_out_time) {
                        const start = new Date(record.check_in_time).getTime();
                        const end = new Date(record.check_out_time).getTime();
                        totalSeconds += Math.max(0, (end - start) / 1000);
                    }
                });
                const totalHours = Number((totalSeconds / 3600).toFixed(1));

                // Calculate total PT sessions and earnings (using individual session shares)
                const totalSessions = coachSessions.reduce((sum, s) => sum + (Number(s.sessions_count ?? 1)), 0);

                const ptEarnings = coachSessions.reduce((sum, s) => {
                    const sessionCount = Number(s.sessions_count ?? 1);
                    const sessionShare = s.coach_share ?? coach.pt_rate ?? 0;
                    return sum + (sessionCount * sessionShare);
                }, 0);

                const salary = coach.salary || 0;
                const totalEarnings = ptEarnings + salary;

                totalPayroll += totalEarnings;

                return {
                    coach_id: coach.id,
                    coach_name: coach.full_name,
                    role: coach.role,
                    pt_rate: coach.pt_rate || 0,
                    salary: salary,
                    total_pt_sessions: totalSessions,
                    pt_earnings: ptEarnings,
                    pt_sessions: coachSessions, // ADDED: include raw sessions
                    total_hours: totalHours,
                    total_earnings: totalEarnings
                };
            });

            return {
                totalPayroll,
                payrollData: stats
            };
        },
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    });
}

export function useGroups() {
    return useQuery({
        queryKey: ['groups'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('training_groups')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

// --- Refunds Hooks ---
export function useRefunds() {
    return useQuery({
        queryKey: ['refunds'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('refunds')
                .select('*, students ( full_name )')
                .order('refund_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useAddRefund() {
    return useMutation({
        mutationFn: async (refund: { student_id: string; amount: number; reason?: string; refund_date: string }) => {
            const { data: { user } } = await supabase.auth.getUser();

            // Get student name for notification
            const { data: studentData } = await supabase
                .from('students')
                .select('full_name')
                .eq('id', refund.student_id)
                .single();

            const { data, error } = await supabase
                .from('refunds')
                .insert([{ ...refund, created_by: user?.id }])
                .select()
                .single();
            if (error) throw error;

            // Create notification for admin
            if (studentData) {
                await supabase.from('notifications').insert({
                    type: 'payment',
                    title: 'Refund Issued',
                    message: `Refund: ${refund.amount.toFixed(2)} to ${studentData.full_name}`,
                    user_id: null,
                    is_read: false
                });
            }

            return data;
        },
    });
}

export function useDeleteRefund() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('refunds')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
    });
}

// --- Expenses Hooks ---
export function useExpenses() {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useAddExpense() {
    return useMutation({
        mutationFn: async (expense: { description: string; amount: number; category: string; expense_date: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('expenses')
                .insert([{ ...expense, created_by: user?.id }])
                .select()
                .single();
            if (error) throw error;

            // Create notification for admin
            await supabase.from('notifications').insert({
                type: 'payment',
                title: 'Expense Recorded',
                message: `Expense: ${expense.amount.toFixed(2)} - ${expense.description}`,
                user_id: null,
                is_read: false
            });

            return data;
        },
    });
}

export function useDeleteExpense() {
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
    });
}
// --- Financial Trends Hook ---
export function useFinancialTrends() {
    return useQuery({
        queryKey: ['financialTrends'],
        queryFn: async () => {
            const today = new Date();
            const last6Months = Array.from({ length: 6 }, (_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                return format(date, 'yyyy-MM');
            }).reverse();

            // Fetch all data for the last 6 months
            const startDate = `${last6Months[0]}-01`;

            const [payments, refunds, expenses, students, ptSessions] = await Promise.all([
                supabase.from('payments').select('amount, payment_date').gte('payment_date', startDate),
                supabase.from('refunds').select('amount, refund_date').gte('refund_date', startDate),
                supabase.from('expenses').select('amount, expense_date').gte('expense_date', startDate),
                supabase.from('students').select('created_at').gte('created_at', startDate),
                supabase.from('pt_sessions').select('sessions_count, date').gte('date', startDate)
            ]);

            // Group by month
            const trends = last6Months.map(month => {
                const monthPayments = (payments.data || [])
                    .filter(p => p.payment_date.startsWith(month))
                    .reduce((sum, p) => sum + Number(p.amount), 0);

                const monthRefunds = (refunds.data || [])
                    .filter(r => r.refund_date.startsWith(month))
                    .reduce((sum, r) => sum + Number(r.amount), 0);

                const monthExpenses = (expenses.data || [])
                    .filter(e => e.expense_date.startsWith(month))
                    .reduce((sum, e) => sum + Number(e.amount), 0);

                const newStudents = (students.data || [])
                    .filter(s => s.created_at.startsWith(month)).length;

                const ptCount = (ptSessions.data || [])
                    .filter(s => s.date.startsWith(month))
                    .reduce((sum, s) => sum + Number(s.sessions_count || 1), 0);

                const revenue = monthPayments - monthRefunds;
                const profit = revenue - monthExpenses;

                return {
                    month: format(new Date(month + '-01'), 'MMM'),
                    revenue,
                    expenses: monthExpenses,
                    profit,
                    students: newStudents,
                    ptSessions: ptCount
                };
            });

            return trends;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

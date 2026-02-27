import React, { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Edit2, Plus, Trash2, UserPlus } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { addMonths, format } from 'date-fns';

interface ImportStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface CSVRow {
    Name: string;
    Phone: string;
    'Date of Birth'?: string;
    Gender?: string;
    Coach?: string;
    'Subscription Plan'?: string;
    'Subscription Type'?: string;
    'Start Date'?: string;
    Notes?: string;
}

interface ParsedStudent {
    full_name: string;
    phone: string;
    date_of_birth?: string;
    gender?: string;
    coach_name?: string;
    subscription_plan_id?: string;
    subscription_type?: string;
    subscription_start?: string;
    notes?: string;
    errors: string[];
}

export default function ImportStudentsModal({ isOpen, onClose, onSuccess }: ImportStudentsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState(false);
    const [importMode, setImportMode] = useState<'csv' | 'grid'>('csv');
    const [plans, setPlans] = useState<any[]>([]);
    const [gridRows, setGridRows] = useState<ParsedStudent[]>([
        { full_name: '', phone: '', date_of_birth: '', subscription_plan_id: '', errors: [] }
    ]);

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
        }
    }, [isOpen]);

    const fetchPlans = async () => {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .order('name');
        if (!error && data) {
            setPlans(data);
        }
    };

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.csv')) {
                toast.error('Please select a CSV file');
                return;
            }
            setFile(selectedFile);
            parseCSV(selectedFile);
        }
    };

    const parseCSV = (file: File) => {
        Papa.parse<CSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Filter out completely empty rows (all fields are empty or whitespace)
                const nonEmptyRows = results.data.filter(row => {
                    return Object.values(row).some(value => value && value.trim() !== '');
                });

                if (nonEmptyRows.length === 0) {
                    toast.error('CSV file is empty or contains no valid data');
                    setFile(null);
                    return;
                }

                const validated = nonEmptyRows.map((row, index) => validateRow(row, index));
                setParsedData(validated);
                setPreview(true);
            },
            error: (error) => {
                toast.error(`Error parsing CSV: ${error.message}`);
            }
        });
    };

    const addGridRow = () => {
        setGridRows([...gridRows, { full_name: '', phone: '', date_of_birth: '', subscription_plan_id: '', errors: [] }]);
    };

    const removeGridRow = (index: number) => {
        if (gridRows.length > 1) {
            setGridRows(gridRows.filter((_, i) => i !== index));
        }
    };

    const updateGridRow = (index: number, field: keyof ParsedStudent, value: string) => {
        const newRows = [...gridRows];
        newRows[index] = { ...newRows[index], [field]: value };
        setGridRows(newRows);
    };

    const handleGridImport = () => {
        // Filter out completely empty rows
        const filledRows = gridRows.filter(row =>
            row.full_name.trim() !== '' ||
            row.phone.trim() !== '' ||
            row.date_of_birth !== '' ||
            row.subscription_plan_id !== ''
        );

        if (filledRows.length === 0) {
            toast.error('Please enter at least one student');
            return;
        }

        const data: ParsedStudent[] = filledRows.map((row, index) => {
            return validateRow({
                Name: row.full_name,
                Phone: row.phone,
                'Date of Birth': row.date_of_birth,
                'Subscription Plan': row.subscription_plan_id
            }, index);
        });

        setParsedData(data);
        setPreview(true);
    };

    const validateRow = (row: CSVRow, index: number): ParsedStudent => {
        const errors: string[] = [];

        // Required fields
        if (!row.Name?.trim()) errors.push('Name is required');
        // Phone is now optional for bulk text import to support manual entry more easily

        // Phone validation (Optional, no strict formatting required)
        const phone = row.Phone?.trim();

        // Date validation
        const dateOfBirth = row['Date of Birth']?.trim();
        if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
            errors.push('Date of Birth should be YYYY-MM-DD format');
        }

        const startDate = row['Start Date']?.trim();
        if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            errors.push('Start Date should be YYYY-MM-DD format');
        }

        // Gender validation
        const gender = row.Gender?.toLowerCase().trim();
        if (gender && !['male', 'female'].includes(gender)) {
            errors.push('Gender should be "male" or "female"');
        }

        // Subscription type validation
        const subType = row['Subscription Type']?.toLowerCase().trim();
        if (subType && !['monthly', '3months', '6months', 'yearly'].includes(subType)) {
            errors.push('Invalid subscription type');
        }

        return {
            full_name: row.Name?.trim() || '',
            phone: phone || '',
            date_of_birth: dateOfBirth,
            gender: gender,
            coach_name: row.Coach?.trim(),
            subscription_plan_id: row['Subscription Plan'],
            subscription_type: subType,
            subscription_start: startDate,
            notes: row.Notes?.trim(),
            errors
        };
    };

    const handleImport = async () => {
        const validRows = parsedData.filter(row => row.errors.length === 0);

        if (validRows.length === 0) {
            toast.error('No valid rows to import');
            return;
        }

        setImporting(true);
        let successCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get all coaches for matching
            const { data: coaches } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'coach');

            // Get all existing students to check for duplicates
            const { data: existingStudents } = await supabase
                .from('students')
                .select('full_name, contact_number, parent_contact');

            for (const student of validRows) {
                try {
                    // Check for duplicates based on name and phone
                    const isDuplicate = existingStudents?.some(existing =>
                        existing.full_name?.toLowerCase().trim() === student.full_name?.toLowerCase().trim() &&
                        existing.contact_number?.trim() === student.phone?.trim()
                    );

                    if (isDuplicate) {
                        console.log(`Skipping duplicate: ${student.full_name} (${student.phone})`);
                        duplicateCount++;
                        continue; // Skip this student
                    }

                    // Match coach by name if provided
                    let coachId = null;
                    if (student.coach_name && coaches) {
                        const coach = coaches.find(c =>
                            c.full_name?.toLowerCase() === student.coach_name?.toLowerCase()
                        );
                        coachId = coach?.id;
                    }

                    // Find plan if selected
                    let planObj = null;
                    if (student.subscription_plan_id) {
                        // The plan ID might be a string (UUID) or a number depending on the schema
                        planObj = plans.find(p => String(p.id) === String(student.subscription_plan_id));
                    }

                    // Insert student
                    const { data: insertedStudent, error: insertError } = await supabase
                        .from('students')
                        .insert({
                            full_name: student.full_name,
                            contact_number: student.phone || '',
                            birth_date: student.date_of_birth || null,
                            gender: student.gender || 'male',
                            coach_id: coachId,
                            subscription_plan_id: student.subscription_plan_id?.trim() || null,
                            subscription_expiry: planObj ? format(addMonths(new Date(), planObj.duration_months || 1), 'yyyy-MM-dd') : null,
                            sessions_remaining: planObj ? planObj.sessions_limit : null,
                            notes: student.notes || null,
                            status: 'active',
                            is_active: true,
                            age: student.date_of_birth ? (() => {
                                const today = new Date();
                                const birth = new Date(student.date_of_birth);
                                let age = today.getFullYear() - birth.getFullYear();
                                const m = today.getMonth() - birth.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                                    age--;
                                }
                                return age;
                            })() : null
                        })
                        .select('id')
                        .single();

                    if (insertError) throw insertError;

                    // If a plan was selected, grab the plan price and automatically log a finance payment
                    if (planObj && insertedStudent) {
                        // We safely use 'plan?.price' assuming it has a valid number
                        if (planObj.price) {
                            const { error: financeError } = await supabase
                                .from('payments')
                                .insert({
                                    student_id: insertedStudent.id,
                                    amount: Number(planObj.price),
                                    payment_method: 'cash',
                                    notes: `Auto-generated payment from Quick Entry for Plan: ${planObj.name}`,
                                    payment_date: format(new Date(), 'yyyy-MM-dd')
                                });

                            if (financeError) {
                                console.error('Error logging finance:', financeError);
                                // We don't throw here to avoid failing the whole import if just finance fails
                            }
                        }
                    }
                    if (insertError) throw insertError;
                    successCount++;
                } catch (err) {
                    console.error('Error importing student:', err);
                    errorCount++;
                }
            }

            // Show results
            if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} student(s)`);
            }
            if (duplicateCount > 0) {
                toast(`Skipped ${duplicateCount} duplicate(s)`, { icon: 'ℹ️' });
            }
            if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} student(s)`);
            }

            if (successCount > 0) {
                onSuccess();
                handleClose();
            }
        } catch (error: any) {
            console.error('Import error:', error);
            toast.error(error.message || 'Error importing students');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setGridRows([{ full_name: '', phone: '', date_of_birth: '', subscription_plan_id: '', errors: [] }]);
        setParsedData([]);
        setPreview(false);
        setImportMode('csv');
        onClose();
    };

    const validCount = parsedData.filter(row => row.errors.length === 0).length;
    const errorCount = parsedData.filter(row => row.errors.length > 0).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Premium Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={handleClose}
            />

            <div className="relative w-full max-w-5xl bg-black/60 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-10 pt-10 pb-6 flex items-center justify-between border-b border-white/5 bg-[#0E1D21]/50">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                            <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] mb-1">
                                Import Students
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                Select CSV file to upload
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white transition-all border border-white/10 active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative z-10 p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {!preview ? (
                        /* Mode Selection & Input */
                        <div className="space-y-10">
                            {/* Tab Switcher */}
                            <div className="flex p-1.5 bg-white/5 rounded-2xl w-fit mx-auto gap-1">
                                <button
                                    onClick={() => setImportMode('csv')}
                                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'csv' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    CSV Upload
                                </button>
                                <button
                                    onClick={() => setImportMode('grid')}
                                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    Quick Entry
                                </button>
                            </div>

                            {importMode === 'csv' ? (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="csv-upload"
                                        />
                                        <label
                                            htmlFor="csv-upload"
                                            className="cursor-pointer block border-2 border-dashed border-white/10 rounded-[3rem] p-16 text-center hover:border-primary/40 hover:bg-white/[0.02] transition-all duration-700 relative overflow-hidden group/label"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover/label:opacity-100 transition-opacity"></div>
                                            <Upload className="w-16 h-16 text-white/10 mx-auto mb-6 group-hover/label:text-primary/60 group-hover/label:scale-110 transition-all duration-700" />
                                            <p className="text-xl font-black text-white/80 mb-2 uppercase tracking-widest">
                                                {file ? file.name : 'Upload CSV'}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                                                Select CSV File
                                            </p>
                                        </label>
                                    </div>

                                    {/* Requirements */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
                                            <div className="flex items-center gap-3 text-primary/60">
                                                <AlertCircle className="w-4 h-4" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Required Fields</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Name</span>
                                                    <span className="text-[9px] font-bold text-white/20 italic">Full Name</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Phone</span>
                                                    <span className="text-[9px] font-bold text-white/20 italic">Optional</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">Optional Fields</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {['Birth Date', 'Gender', 'Coach', 'Subscription', 'Notes'].map((tag) => (
                                                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/40">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-medium text-white/20 leading-relaxed pt-2">
                                                Optional fields help create a more complete profile.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-8 rounded-[3rem] bg-white/[0.02] border border-white/10">
                                        <div className="flex items-center justify-between mb-8 px-2 border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <Edit2 className="w-5 h-5 text-primary" />
                                                <div>
                                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Quick Entry Grid</h3>
                                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Add students individually</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={addGridRow}
                                                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-primary/20"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Row
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Header Row */}
                                            <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_auto] gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/30 hidden md:grid">
                                                <div>Full Name <span className="text-rose-500">*</span></div>
                                                <div>WhatsApp Number</div>
                                                <div>Birth Date</div>
                                                <div>Plan</div>
                                                <div className="w-10"></div>
                                            </div>

                                            {/* Data Rows */}
                                            {gridRows.map((row, index) => (
                                                <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1.5fr_auto] gap-4 bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-3xl border border-white/5 transition-colors items-start">
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">Full Name <span className="text-rose-500">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={row.full_name}
                                                            onChange={(e) => updateGridRow(index, 'full_name', e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                                                            placeholder=""
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">WhatsApp Number</label>
                                                        <input
                                                            type="text"
                                                            value={row.phone}
                                                            onChange={(e) => updateGridRow(index, 'phone', e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors font-mono tracking-wider"
                                                            placeholder=""
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">Birth Date</label>
                                                        <input
                                                            type="date"
                                                            value={row.date_of_birth || ''}
                                                            onChange={(e) => updateGridRow(index, 'date_of_birth', e.target.value)}
                                                            className={`w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark] ${!row.date_of_birth ? 'text-transparent' : 'text-white'}`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">Plan</label>
                                                        <div className="relative">
                                                            <select
                                                                value={row.subscription_plan_id || ''}
                                                                onChange={(e) => updateGridRow(index, 'subscription_plan_id', e.target.value)}
                                                                className={`w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none pr-10 ${!row.subscription_plan_id ? 'text-transparent' : 'text-white'}`}
                                                            >
                                                                <option value="" className="bg-[#0E1D21] text-white/50" disabled></option>
                                                                {plans.map(plan => (
                                                                    <option key={plan.id} value={plan.id} className="bg-[#0E1D21] text-white">
                                                                        {plan.name} - {plan.price} LE
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex md:items-end h-full">
                                                        <button
                                                            onClick={() => removeGridRow(index)}
                                                            className={`p-3 rounded-xl border transition-all h-[46px] w-full md:w-[46px] flex items-center justify-center ${gridRows.length > 1 ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 border-rose-500/20 hover:border-rose-500/40' : 'bg-white/5 text-white/20 border-white/10 cursor-not-allowed opacity-50'}`}
                                                            disabled={gridRows.length <= 1}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            <span className="md:hidden ml-2 text-[10px] font-black uppercase tracking-widest">Remove</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-8 flex justify-end">
                                            <button
                                                onClick={handleGridImport}
                                                className="px-8 py-4 rounded-2xl bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-[0_10px_20px_rgba(var(--primary-rgb),0.2)] flex items-center gap-3 group"
                                            >
                                                Preview Import
                                                <UserPlus className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Preview Section */
                        <div className="space-y-10 animate-in fade-in duration-700">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-8">
                                <div className="p-8 rounded-[2.5rem] bg-emerald-500/[0.02] border border-emerald-500/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.05] blur-3xl rounded-full"></div>
                                    <div className="flex items-center gap-3 mb-4 text-emerald-500/60">
                                        <CheckCircle className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Valid Entries</span>
                                    </div>
                                    <p className="text-4xl font-black text-white leading-none">{validCount}</p>
                                </div>
                                <div className="p-8 rounded-[2.5rem] bg-rose-500/[0.02] border border-rose-500/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.05] blur-3xl rounded-full"></div>
                                    <div className="flex items-center gap-3 mb-4 text-rose-500/60">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Invalid Entries</span>
                                    </div>
                                    <p className="text-4xl font-black text-white leading-none">{errorCount}</p>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="rounded-[2.5rem] bg-white/[0.01] border border-white/5 overflow-hidden">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-white/[0.03]">
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">ID</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Gymnast Name</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Phone Number</th>
                                            <th className="px-8 py-5 text-left text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {parsedData.map((row, index) => (
                                            <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-5 text-[11px] font-black text-white/30">{index + 1}</td>
                                                <td className="px-8 py-5">
                                                    <div className="text-[13px] font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-wider">{row.full_name}</div>
                                                    <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{row.coach_name || 'Unassigned'}</div>
                                                </td>
                                                <td className="px-8 py-5 text-[11px] font-black text-white/60 font-mono tracking-tighter">{row.phone}</td>
                                                <td className="px-8 py-5">
                                                    {row.errors.length === 0 ? (
                                                        <span className="inline-flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                                                            Ready
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-2 text-rose-500 text-[9px] font-black uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20">
                                                                Invalid Data
                                                            </span>
                                                            <div className="pl-4 text-[8px] font-bold text-rose-500/60 uppercase tracking-widest">
                                                                {row.errors[0]}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="relative z-10 px-10 py-10 border-t border-white/5 bg-[#0E1D21]/50 flex items-center justify-between gap-8">
                    <button
                        onClick={handleClose}
                        className="px-8 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-500 active:scale-95"
                    >
                        Cancel
                    </button>

                    {preview && (
                        <button
                            onClick={handleImport}
                            disabled={importing || validCount === 0}
                            className="flex-1 py-5 rounded-3xl bg-primary text-white hover:bg-primary/90 transition-all duration-500 shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] active:scale-95 flex items-center justify-center gap-4 group/btn disabled:opacity-30 disabled:pointer-events-none"
                        >
                            {importing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                            )}
                            <span className="font-black uppercase tracking-[0.4em] text-[10px]">
                                {importing ? 'Processing...' : `Import ${validCount} Students`}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

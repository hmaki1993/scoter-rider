import React, { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Edit2, Plus, Trash2, UserPlus, ChevronDown, ArrowLeft, Camera, ScanLine, Users } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { addMonths, format } from 'date-fns';
import { formatDynamicPhone } from '../utils/phoneUtils';
import { processImageWithGemini } from '../services/aiService';

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
    coach_id?: string;
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
    const [importMode, setImportMode] = useState<'csv' | 'grid' | 'scan'>('csv');
    const [isScanning, setIsScanning] = useState(false);

    // Bulk Input State
    const [bulkText, setBulkText] = useState('');
    const [bulkCoachId, setBulkCoachId] = useState('');
    const [bulkPlanId, setBulkPlanId] = useState('');
    const [plans, setPlans] = useState<any[]>([]);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [gridRows, setGridRows] = useState<ParsedStudent[]>([
        { full_name: '', phone: '', date_of_birth: '', subscription_plan_id: '', coach_id: '', errors: [] }
    ]);

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
            fetchCoaches();
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

    const fetchCoaches = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('role', ['coach', 'head_coach'])
            .order('full_name');
        if (!error && data) {
            setCoaches(data);
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
        setGridRows([...gridRows, { full_name: '', phone: '', date_of_birth: '', subscription_plan_id: '', coach_id: '', errors: [] }]);
    };

    const removeGridRow = (index: number) => {
        if (gridRows.length > 1) {
            setGridRows(gridRows.filter((_, i) => i !== index));
        }
    };

    const handleBulkAdd = () => {
        if (!bulkText.trim()) return;

        // Split by actual newlines or escaped newlines (e.g. from pasted raw text)
        const names = bulkText.split(/\r?\n|\\n/).map(r => r.trim()).filter(r => r.length > 0);

        if (names.length === 0) return;

        const newRows: ParsedStudent[] = names.map(name => ({
            full_name: name,
            phone: '',
            date_of_birth: '',
            gender: 'male',
            subscription_plan_id: bulkPlanId,
            coach_id: bulkCoachId,
            coach_name: '',
            errors: []
        }));

        // If the grid only has one empty row, replace it. Otherwise append.
        if (gridRows.length === 1 && !gridRows[0].full_name && !gridRows[0].phone) {
            setGridRows(newRows);
        } else {
            setGridRows([...gridRows, ...newRows]);
        }

        setBulkText('');
        toast.success(`Added ${newRows.length} students!`);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Ensure it's an image
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload a valid image file (JPEG, PNG).');
            return;
        }

        setIsScanning(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const base64Image = event.target?.result as string;
                const extractedStudents = await processImageWithGemini(base64Image);

                if (extractedStudents && extractedStudents.length > 0) {
                    console.log("Raw AI Extracted Data:", extractedStudents);

                    const formattedRows: ParsedStudent[] = extractedStudents.map(student => {
                        const { code, number } = formatDynamicPhone(student.phone || '', '+965');

                        // Try to find coach_id by matching coach_name
                        let coachId = '';
                        if (student.coach_name) {
                            const rawName = student.coach_name;
                            const cleanExtractedName = rawName.replace(/^(coach|couch|كابتن|مدرب|ك|c\.\?)\s+/i, '').trim().toLowerCase();
                            console.log(`Processing coach => Raw: "${rawName}", Cleaned: "${cleanExtractedName}"`);

                            const matchedCoach = coaches.find(c => {
                                const dbName = c.full_name?.toLowerCase().trim() || '';
                                return dbName.includes(cleanExtractedName) || cleanExtractedName.includes(dbName) || dbName === cleanExtractedName;
                            });

                            if (matchedCoach) {
                                console.log(`  Matched System Coach => "${matchedCoach.full_name}" (ID: ${matchedCoach.id})`);
                                coachId = matchedCoach.id;
                            } else {
                                console.warn(`  Failed to match coach in system => Cleaned name: "${cleanExtractedName}"`);
                            }
                        }

                        // Try to find subscription plan by matching plan_name
                        let planId = '';
                        if (student.plan_name) {
                            const rawPlan = student.plan_name;
                            const cleanExtractPlan = rawPlan.replace(/\\s+/g, ' ').trim().toLowerCase();
                            console.log(`Processing plan => Raw: "${rawPlan}", Cleaned: "${cleanExtractPlan}"`);

                            // Try to extract numbers (English or Arabic formats)
                            // convert Arabic numerals to English for easier matching
                            let normalizedPlanName = cleanExtractPlan.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
                            const extractNumber = normalizedPlanName.match(/\\d+/)?.[0];

                            const matchedPlan = plans.find(p => {
                                const dbName = p.name?.toLowerCase().trim() || '';

                                // Exact or includes match
                                if (dbName.includes(normalizedPlanName) || normalizedPlanName.includes(dbName) || dbName === normalizedPlanName) {
                                    return true;
                                }

                                // Number match (e.g., if DB has "8 classes" and AI extracted "8" or "8 حصه")
                                if (extractNumber) {
                                    // Look for this number standing alone or with a space in the dbName to prevent "8" matching "18"
                                    const regex = new RegExp(`(^|\\D)${extractNumber}(\\D|$)`);
                                    if (regex.test(dbName)) {
                                        return true;
                                    }
                                }

                                return false;
                            });

                            if (matchedPlan) {
                                console.log(`  Matched System Plan => "${matchedPlan.name}" (ID: ${matchedPlan.id})`);
                                planId = matchedPlan.id;
                            } else {
                                console.warn(`  Failed to match plan in system => Cleaned name: "${cleanExtractPlan}"`);
                            }
                        }

                        return {
                            full_name: student.full_name || '',
                            phone: number ? `${code} ${number}`.trim() : '',
                            date_of_birth: student.date_of_birth || '',
                            gender: student.gender || 'male',
                            subscription_plan_id: planId,
                            coach_id: coachId,
                            coach_name: student.coach_name || '',
                            errors: []
                        };

                    });

                    setGridRows(formattedRows);
                    setImportMode('grid');
                    toast.success(`Successfully scanned ${formattedRows.length} students! Review them before importing.`);
                } else {
                    toast.error('No student data found in the image.');
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to analyze image. Please check API Key or try again.');
            } finally {
                setIsScanning(false);
            }
        };

        reader.readAsDataURL(file);
    };

    const PremiumSelect = ({
        value,
        options,
        onChange,
        placeholder,
        label
    }: {
        value: string;
        options: { id: string; name: string }[];
        onChange: (id: string) => void;
        placeholder: string;
        label: string;
    }) => {
        const [isSelectOpen, setIsSelectOpen] = useState(false);
        const dropdownRef = React.useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                    setIsSelectOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const selectedOption = options.find(opt => opt.id === value);

        return (
            <div className="relative w-full" ref={dropdownRef}>
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">
                    {label}
                </label>
                <button
                    type="button"
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                    className={`w-full !bg-transparent border border-white/10 rounded-2xl px-4 py-3 text-sm flex items-center justify-between transition-all hover:bg-white/5 active:scale-95 ${!value ? 'text-white/30' : 'text-white'}`}
                >
                    <span className="truncate">{selectedOption ? selectedOption.name : placeholder}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSelectOpen ? 'rotate-180 text-primary' : 'text-white/20'}`} />
                </button>

                {isSelectOpen && (
                    <div className="absolute z-[100] top-full mt-2 w-full bg-[#0A1619]/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top overflow-hidden max-h-[150px] overflow-y-auto custom-scrollbar">
                        {options.map(option => (
                            <div
                                key={option.id}
                                onClick={() => {
                                    onChange(option.id);
                                    setIsSelectOpen(false);
                                }}
                                className={`px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer mb-1 last:mb-0 flex items-center justify-between group ${value === option.id ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                            >
                                <span className="font-medium truncate">{option.name}</span>
                                {value === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const updateGridRow = (index: number, field: keyof ParsedStudent, value: string) => {
        const newRows = [...gridRows];

        if (field === 'phone') {
            const { code, number } = formatDynamicPhone(value, '');
            if (number === '') {
                newRows[index] = { ...newRows[index], [field]: '' };
            } else {
                newRows[index] = { ...newRows[index], [field]: `${code} ${number}`.trim() };
            }
        } else {
            newRows[index] = { ...newRows[index], [field]: value };
        }

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
            return {
                ...validateRow({
                    Name: row.full_name,
                    Phone: row.phone,
                    'Date of Birth': row.date_of_birth,
                    'Subscription Plan': row.subscription_plan_id
                }, index),
                coach_id: row.coach_id,
                // If ID is selected, we can find the name as well for preview
                coach_name: coaches.find(c => c.id === row.coach_id)?.full_name
            };
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

                    // Match coach (prioritize ID from Grid, then match by name for CSV)
                    let coachId = student.coach_id || null;
                    if (!coachId && student.coach_name && coaches) {
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
                            parent_contact: student.phone || '',
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
        setGridRows([{ full_name: '', phone: '', date_of_birth: '', subscription_plan_id: '', coach_id: '', errors: [] }]);
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

            <div className="relative w-full max-w-4xl bg-[#0A1619]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700">
                {/* Dynamic Premium Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[120px] rounded-full animate-pulse duration-[10s]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[100px] rounded-full animate-pulse duration-[8s] delay-1000" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                </div>

                {/* Header Section */}
                <div className="relative z-10 px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg group">
                            <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-[0.2em]">
                                Import Students
                            </h2>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mt-0.5">
                                Select CSV or Quick Entry
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-500 transition-all border border-white/10 active:scale-90"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="relative z-10 p-4 sm:p-8 space-y-6 sm:space-y-8 max-h-[65vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {!preview ? (
                        /* Mode Selection & Input */
                        <div className="space-y-8">
                            {/* Tab Switcher */}
                            <div className="flex flex-wrap sm:flex-nowrap justify-center p-1 bg-white/5 rounded-2xl w-full sm:w-fit mx-auto gap-1 border border-white/5">
                                <button
                                    onClick={() => setImportMode('csv')}
                                    className={`flex-1 sm:flex-none px-2 sm:px-8 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${importMode === 'csv' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    CSV Upload
                                </button>
                                <button
                                    onClick={() => setImportMode('grid')}
                                    className={`flex-1 sm:flex-none px-2 sm:px-8 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${importMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    Quick Entry
                                </button>
                                <button
                                    onClick={() => setImportMode('scan')}
                                    className={`flex-1 sm:flex-none px-2 sm:px-8 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${importMode === 'scan' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                >
                                    Scan AI
                                </button>
                            </div>

                            {importMode === 'csv' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                            className="cursor-pointer block border-2 border-dashed border-white/10 rounded-[2rem] p-6 sm:p-10 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-700 relative overflow-hidden group/label w-full"
                                        >
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1),transparent)] opacity-0 group-hover/label:opacity-100 transition-opacity"></div>
                                            <Upload className="w-12 h-12 text-white/10 mx-auto mb-4 group-hover/label:text-primary group-hover/label:scale-110 transition-all duration-700" />
                                            <p className="text-sm sm:text-lg font-black text-white/80 mb-1 uppercase tracking-widest break-words px-2">
                                                {file ? file.name : 'Upload CSV'}
                                            </p>
                                            <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest sm:tracking-[0.3em] text-white/20 px-2">
                                                Drag and drop or click to browse
                                            </p>
                                        </label>
                                    </div>

                                    {/* Requirements */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                            <div className="flex items-center gap-3 text-primary/60">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <h3 className="text-[9px] font-black uppercase tracking-[0.3em]">Required Fields</h3>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Name</span>
                                                    <span className="text-[9px] font-bold text-white/20 italic">Full Name (Required)</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Phone / Birth / Gender</span>
                                                    <span className="text-[9px] font-bold text-white/20 italic">Optional</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-1">Optional Fields</h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['Birth Date', 'Gender', 'Coach', 'Subscription', 'Notes'].map((tag) => (
                                                    <span key={tag} className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[7px] font-black uppercase tracking-widest text-white/40">
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
                            ) : importMode === 'scan' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="image-upload"
                                            disabled={isScanning}
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className={`cursor-pointer block border-2 border-dashed rounded-[2rem] p-6 sm:p-10 text-center transition-all duration-700 relative overflow-hidden group/label w-full ${isScanning ? 'border-primary/50 bg-primary/[0.05] cursor-wait' : 'border-white/10 hover:border-primary/40 hover:bg-primary/[0.02]'}`}
                                        >
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1),transparent)] opacity-0 group-hover/label:opacity-100 transition-opacity"></div>

                                            {isScanning ? (
                                                <div className="flex flex-col items-center justify-center space-y-4">
                                                    <div className="relative">
                                                        <ScanLine className="w-12 h-12 text-primary animate-pulse" />
                                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                                                    </div>
                                                    <p className="text-lg font-black text-white/80 uppercase tracking-widest animate-pulse">
                                                        Analyzing Image... 🧠
                                                    </p>
                                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60">
                                                        Our AI is reading the student list
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Camera className="w-12 h-12 text-white/10 mx-auto mb-4 group-hover/label:text-primary group-hover/label:scale-110 transition-all duration-700" />
                                                    <p className="text-sm sm:text-lg font-black text-white/80 mb-1 uppercase tracking-widest md:tracking-[0.2em] break-words">
                                                        Take Photo / Upload Image
                                                    </p>
                                                    <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest sm:tracking-[0.3em] text-white/20 px-2">
                                                        Tap here to open your camera or gallery
                                                    </p>
                                                </>
                                            )}
                                        </label>
                                    </div>

                                    {/* Scan Info */}
                                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 text-primary/60">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em]">AI Scanner Beta</h3>
                                        </div>
                                        <p className="text-[10px] font-medium text-white/40 leading-relaxed max-w-xl">
                                            Take a clear photo of a handwritten or printed list containing student names, phone numbers, and even birth dates or gender.
                                            Our AI will automatically extract this information and pre-fill the Quick Entry Grid for you to review and import.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 relative overflow-hidden">

                                        {/* Mass Quick Add Header */}
                                        <div className="mb-8 pt-2">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Mass Quick Add</h3>
                                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Paste a list of names and assign them instantly</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                                <div className="md:col-span-6">
                                                    <textarea
                                                        value={bulkText}
                                                        onChange={(e) => setBulkText(e.target.value)}
                                                        placeholder="Paste list of names here...&#10;Ahmed Magdy&#10;Mohamed Ali&#10;Omar Khaled..."
                                                        className="w-full h-[120px] bg-white/[0.01] border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-all custom-scrollbar resize-none placeholder:text-white/20"
                                                    />
                                                </div>

                                                <div className="md:col-span-6 flex flex-col justify-between gap-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <PremiumSelect
                                                            value={bulkPlanId}
                                                            options={plans.map(p => ({ id: p.id, name: p.name }))}
                                                            onChange={setBulkPlanId}
                                                            placeholder="Assign Plan (Optional)"
                                                            label="Default Plan"
                                                        />
                                                        <PremiumSelect
                                                            value={bulkCoachId}
                                                            options={coaches.map(c => ({ id: c.id, name: c.full_name || 'Unnamed' }))}
                                                            onChange={setBulkCoachId}
                                                            placeholder="Assign Coach (Optional)"
                                                            label="Default Coach"
                                                        />
                                                    </div>

                                                    <button
                                                        onClick={handleBulkAdd}
                                                        disabled={!bulkText.trim()}
                                                        className="w-full py-3.5 bg-white/5 hover:bg-primary/20 hover:text-primary hover:border-primary/50 text-white/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        Add to Grid
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-6 px-1 border-t border-b border-white/5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                    <Edit2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Quick Entry Grid</h3>
                                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Review and edit students</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={addGridRow}
                                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Row
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Header Row - Aligned precisely with text inside inputs */}
                                            <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1fr_auto] gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                                                <div className="pl-4">Full Name <span className="text-rose-500">*</span></div>
                                                <div className="text-left">Phone</div>
                                                <div className="pl-4">Birth Date</div>
                                                <div className="text-center pl-6">Plan</div>
                                                <div className="text-center">Coach</div>
                                                <div className="w-10"></div>
                                            </div>

                                            {/* Data Rows */}
                                            {gridRows.map((row, index) => (
                                                <div key={index} className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_0.8fr_1fr_1fr_auto] gap-4 bg-white/[0.01] hover:bg-white/[0.03] p-4 rounded-3xl border border-white/5 transition-all items-start mb-2 last:mb-0">
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">Full Name <span className="text-rose-500">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={row.full_name}
                                                            onChange={(e) => updateGridRow(index, 'full_name', e.target.value)}
                                                            className="w-full !bg-transparent border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                                                            placeholder=""
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">Phone</label>
                                                        <input
                                                            type="text"
                                                            value={row.phone}
                                                            onChange={(e) => updateGridRow(index, 'phone', e.target.value)}
                                                            className="w-full !bg-transparent border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-mono tracking-wider shadow-inner placeholder:text-white/20"
                                                            placeholder=""
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5 block md:hidden">Birth</label>
                                                        <input
                                                            type="date"
                                                            value={row.date_of_birth || ''}
                                                            onChange={(e) => updateGridRow(index, 'date_of_birth', e.target.value)}
                                                            className={`w-full !bg-transparent border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-all [color-scheme:dark] shadow-inner ${!row.date_of_birth ? 'text-white/0' : 'text-white'}`}
                                                        />
                                                    </div>
                                                    <PremiumSelect
                                                        label="Plan"
                                                        value={row.subscription_plan_id || ''}
                                                        placeholder=""
                                                        options={plans.map(p => ({ id: p.id, name: p.name }))}
                                                        onChange={(id) => updateGridRow(index, 'subscription_plan_id', id)}
                                                    />
                                                    <PremiumSelect
                                                        label="Coach"
                                                        value={row.coach_id || ''}
                                                        placeholder=""
                                                        options={coaches.map(c => ({ id: c.id, name: c.full_name }))}
                                                        onChange={(id) => updateGridRow(index, 'coach_id', id)}
                                                    />
                                                    <div className="flex flex-col md:flex-row gap-2 justify-end items-end h-[46px]">
                                                        <button
                                                            onClick={addGridRow}
                                                            className="flex-1 md:flex-none p-3 block md:hidden rounded-xl border border-white/10 hover:border-primary/50 text-white/40 hover:text-primary transition-all active:scale-95 flex items-center justify-center bg-white/5"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            <span className="md:hidden ml-2 text-[10px] font-black uppercase tracking-widest">Add Below</span>
                                                        </button>
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
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-3xl bg-emerald-500/[0.03] border border-emerald-500/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.05] blur-3xl rounded-full group-hover:bg-emerald-500/[0.1] transition-colors"></div>
                                    <div className="flex items-center gap-3 mb-3 text-emerald-500/60">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Valid Entries</span>
                                    </div>
                                    <p className="text-3xl font-black text-white leading-none">{validCount}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-rose-500/[0.03] border border-rose-500/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/[0.05] blur-3xl rounded-full group-hover:bg-rose-500/[0.1] transition-colors"></div>
                                    <div className="flex items-center gap-3 mb-3 text-rose-500/60">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Invalid Entries</span>
                                    </div>
                                    <p className="text-3xl font-black text-white leading-none">{errorCount}</p>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden">
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full border-collapse">
                                        <thead className="sticky top-0 z-20">
                                            <tr className="bg-[#0E1D21] border-b border-white/5">
                                                <th className="px-6 py-4 text-left text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">ID</th>
                                                <th className="px-6 py-4 text-left text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Gymnast Name</th>
                                                <th className="px-6 py-4 text-left text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Phone Number</th>
                                                <th className="px-6 py-4 text-right text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {parsedData.map((row, index) => (
                                                <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4 text-[10px] font-black text-white/20 font-mono">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs font-black text-white/80 group-hover:text-primary transition-colors tracking-tight uppercase">{row.full_name}</div>
                                                        <div className="text-[7px] font-bold text-white/10 uppercase tracking-widest mt-0.5">{row.coach_name || 'Unassigned'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-[10px] font-black text-white/40 font-mono tracking-tighter">{row.phone}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {row.errors.length === 0 ? (
                                                            <span className="inline-flex items-center gap-1.5 text-emerald-500 text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                                                                Ready
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="inline-flex items-center gap-1.5 text-rose-500 text-[8px] font-black uppercase tracking-widest bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 shadow-lg shadow-rose-500/5">
                                                                    Invalid
                                                                </span>
                                                                <div className="text-[7px] font-bold text-rose-500/40 uppercase tracking-widest">
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
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="relative z-10 px-8 py-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleClose}
                            className="px-6 py-3 text-[8px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-all duration-300 active:scale-95"
                        >
                            Cancel
                        </button>
                        {preview && (
                            <button
                                onClick={() => setPreview(false)}
                                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 active:scale-95 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Back
                            </button>
                        )}
                    </div>

                    {preview && (
                        <button
                            onClick={handleImport}
                            disabled={importing || validCount === 0}
                            className="flex-1 py-4 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all duration-500 shadow-[0_15px_30px_rgba(var(--primary-rgb),0.3)] active:scale-95 flex items-center justify-center gap-3 group/btn disabled:opacity-30 disabled:pointer-events-none"
                        >
                            {importing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Upload className="w-3.5 h-3.5 group-hover:-translate-y-1 transition-transform" />
                            )}
                            <span className="font-black uppercase tracking-[0.4em] text-[9px]">
                                {importing ? 'Processing...' : `Import ${validCount} Students`}
                            </span>
                        </button>
                    )}
                </div>
            </div >
        </div >
    );
}

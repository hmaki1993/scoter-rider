import { useState, useEffect } from 'react';
import { X, Plus, Save, Settings, Trash2, Calendar, Users, ChevronRight, ArrowLeft, CheckSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import SkillsManagerModal from './SkillsManagerModal';
import { useTheme } from '../context/ThemeContext';
import PremiumSelect from './PremiumSelect';

interface BatchAssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentCoachId?: string | null;
    initialAssignment?: {
        title: string;
        assessorId: string;
        students: any[];
        skills: any[];
    } | null;
}

export default function BatchAssessmentModal({ isOpen, onClose, onSuccess, currentCoachId, initialAssignment }: BatchAssessmentModalProps) {
    const { userProfile } = useTheme();
    const [step, setStep] = useState(1); // 1: Setup, 2: Skills, 3: Grading
    const [title, setTitle] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [groups, setGroups] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [availableSkills, setAvailableSkills] = useState<any[]>([]);
    const [selectedSkills, setSelectedSkills] = useState<any[]>([]); // { skill_id, name, max_score }
    const [scores, setScores] = useState<Record<string, Record<string, number>>>({}); // studentId -> skillId -> score
    const [loading, setLoading] = useState(false);
    const [showSkillsManager, setShowSkillsManager] = useState(false);
    const [assessorId, setAssessorId] = useState(currentCoachId || '');
    const [coaches, setCoaches] = useState<any[]>([]);

    // Bulk Selection State
    const [isBulkSelecting, setIsBulkSelecting] = useState(false);
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

    // Mixed Group Mode State
    const [isMixedMode, setIsMixedMode] = useState(false);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [coachFilter, setCoachFilter] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchGroups();
            fetchSkills();
            fetchCoaches();
            fetchAllStudents();

            if (initialAssignment) {
                setTitle(initialAssignment.title);
                setAssessorId(initialAssignment.assessorId);
                setStudents(initialAssignment.students);
                setSelectedSkills(initialAssignment.skills);
                setStep(3); // Go straight to grading
            } else {
                resetForm();
            }
        }
    }, [isOpen, initialAssignment]);

    // Re-fetch skills when manager closes
    useEffect(() => {
        if (!showSkillsManager) fetchSkills();
    }, [showSkillsManager]);

    const resetForm = () => {
        setStep(1);
        setTitle('');
        setSelectedGroupId('');
        setStudents([]);
        setSelectedSkills([]);
        setScores({});
        setAssessorId(currentCoachId || '');
        setIsMixedMode(false);
        setSelectedStudentIds([]);
        setStudentSearch('');
    };

    const fetchCoaches = async () => {
        const { data } = await supabase.from('coaches').select('id, profile_id, full_name, role').order('full_name');
        if (data) {
            const filtered = data.filter((c: any) => {
                const role = (c.role || '').toLowerCase();
                const name = (c.full_name || '').toLowerCase();
                const forbidden = ['admin', 'reception', 'cleaner', 'reciption'];

                // If this is the current coach, ALWAYS keep them regardless of filters
                if (c.id === currentCoachId) return true;

                // Only include coaches with a valid profile_id (linked to a user)
                return c.profile_id && !forbidden.some(f => role.includes(f) || name.includes(f));
            });
            setCoaches(filtered);
        }
    };

    const fetchGroups = async () => {
        let query = supabase.from('training_groups').select('*, coaches(full_name)');

        const normalizedRole = userProfile?.role?.toLowerCase().trim() || '';
        const isAdmin = normalizedRole.includes('admin') || normalizedRole.includes('head') || normalizedRole.includes('master');

        if (currentCoachId && !isAdmin) {
            query = query.eq('coach_id', currentCoachId);
        }
        const { data } = await query;
        if (data) setGroups(data);
    };

    const fetchAllStudents = async () => {
        const { data } = await supabase
            .from('students')
            .select(`
id,
    full_name,
    training_groups(name),
    coaches(full_name)
        `)
            .order('full_name');
        if (data) setAllStudents(data);
    };

    const fetchSkills = async () => {
        const { data } = await supabase.from('defined_skills').select('*').order('name');
        if (data) setAvailableSkills(data);
    };

    const handleGroupSelect = async (groupId: string) => {
        setIsMixedMode(false);
        setSelectedGroupId(groupId);
        console.log('🔍 Fetching students for group:', groupId);

        // Fetch students in this group
        const { data, error } = await supabase
            .from('students')
            .select('id, full_name, coaches(full_name)')
            .eq('training_group_id', groupId);

        console.log('📊 Query result:', { data, error, count: data?.length });
        if (error) console.error('❌ Error fetching students:', error);

        if (data) {
            const studentList = data.map(s => ({
                id: s.id,
                assessment_id: null,
                full_name: s.full_name,
                coach_name: (s.coaches as any)?.[0]?.full_name || (s.coaches as any)?.full_name || '',
                status: 'present'
            }));
            console.log('✅ Setting students:', studentList);
            setStudents(studentList);
        } else {
            console.warn('⚠️ No data returned from query');
        }
    };

    const addSkillRow = () => {
        setSelectedSkills([...selectedSkills, { skill_id: '', name: '', max_score: 10 }]);
    };

    const updateSkillRow = (index: number, field: string, value: any) => {
        const newSkills = [...selectedSkills];
        if (field === 'skill_id') {
            const skill = availableSkills.find(s => s.id === parseInt(value));
            newSkills[index] = {
                ...newSkills[index],
                skill_id: value,
                name: skill?.name || '',
                max_score: skill?.max_score || 10
            };
        } else {
            newSkills[index] = { ...newSkills[index], [field]: value };
        }
        setSelectedSkills(newSkills);
    };

    const removeSkillRow = (index: number) => {
        setSelectedSkills(selectedSkills.filter((_, i) => i !== index));
    };

    const handleScoreChange = (studentId: string, skillId: string, value: string, maxScore: number) => {
        const numValue = parseFloat(value);
        if (numValue > maxScore) {
            toast.error(`Max score is ${maxScore}`);
            return;
        }
        setScores(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [skillId]: isNaN(numValue) ? 0 : numValue
            }
        }));
    };

    const toggleStudentStatus = (studentId: string) => {
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s
        ));
    };

    const calculateTotal = (studentId: string) => {
        const studentScores = scores[studentId] || {};
        return Object.values(studentScores).reduce((a, b) => a + (b || 0), 0);
    };

    const handleSave = async (evaluationStatus: 'completed' | 'assigned' = 'completed') => {
        if (!title.trim() || selectedSkills.length === 0 || students.length === 0) return;
        setLoading(true);
        const toastId = toast.loading(evaluationStatus === 'assigned' ? 'Assigning assessment...' : 'Saving assessments...');

        try {
            const inserts = students.map(student => {
                const studentScores = scores[student.id] || {};
                const isAbsent = student.status === 'absent';

                const skillsPayload = selectedSkills.map(skill => ({
                    skill_id: skill.skill_id,
                    name: skill.name,
                    max_score: skill.max_score,
                    score: isAbsent ? 0 : (studentScores[skill.skill_id] || 0)
                }));
                const totalScore = isAbsent ? 0 : skillsPayload.reduce((acc, curr) => acc + curr.score, 0);

                // Determine coach_id:
                // 1. assessorId (selected from dropdown, which is c.id)
                // 2. currentCoachId (if logged in as coach)
                // 3. null (if admin and no selection)
                const finalCoachId = assessorId || currentCoachId || null;

                const payload: any = {
                    student_id: student.id,
                    coach_id: finalCoachId,
                    title,
                    date: new Date().toISOString().split('T')[0],
                    skills: skillsPayload,
                    total_score: evaluationStatus === 'assigned' ? null : totalScore,
                    status: student.status,
                    evaluation_status: evaluationStatus
                };

                if (student.assessment_id) {
                    payload.id = student.assessment_id;
                }

                return payload;
            });

            console.log('Upserting assessments:', inserts);

            const { error } = await supabase.from('skill_assessments').upsert(inserts);
            if (error) throw error;

            toast.success('Saved', { id: toastId });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save assessments', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-[#0E1D21] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[70vh] max-h-[90vh]">

                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">Batch Assessment <span className="text-[8px] text-primary/40">DEBUG_V2</span></h2>
                        <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-widest mt-1">Step {step}: {step === 1 ? 'Setup' : step === 2 ? 'Define Test' : 'Enter Grades'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {step === 1 && (
                    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Assessment Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-white focus:border-primary/50 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5 block">Assessing Coach</label>
                                <div className="mt-1">
                                    <PremiumSelect
                                        value={assessorId}
                                        onChange={(val) => setAssessorId(val)}
                                        options={coaches.map(c => ({
                                            value: c.id,
                                            label: c.full_name || `Coach (${c.id.substring(0, 4)})`
                                        }))}
                                        placeholder="Select Coach"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Select Group</label>
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4">
                                {/* Mixed Group Option */}
                                <div
                                    onClick={() => {
                                        setIsMixedMode(true);
                                        setSelectedGroupId('mixed');
                                        setStudents([]);
                                    }}
                                    className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isMixedMode ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10'}`}
                                >
                                    <div className="font-bold flex items-center gap-2 text-[11px] sm:text-base">
                                        <Users className="w-3.5 h-3.5 text-amber-500" />
                                        Mixed
                                    </div>
                                    <div className="text-[7px] sm:text-[9px] opacity-60 uppercase tracking-tighter mt-1 truncate">
                                        Manual Selection
                                    </div>
                                </div>

                                {groups.map(group => (
                                    <div
                                        key={group.id}
                                        onClick={() => handleGroupSelect(group.id)}
                                        className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${selectedGroupId === group.id ? 'bg-primary/20 border-primary text-white shadow-[0_0_20px_rgba(139,92,246,0.15)]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10'}`}
                                    >
                                        <div className="font-bold text-[11px] sm:text-base truncate">{group.name}</div>
                                        <div className="text-[7px] sm:text-xs opacity-60 flex justify-between">
                                            <span>{group.level || 'General'}</span>
                                            <span className="text-primary/80 font-black uppercase tracking-wider hidden xs:block">{group.coaches?.full_name?.split(' ')[0] || ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Manual Student Selector */}
                            {isMixedMode && (
                                <div className="mt-4 p-4 sm:p-6 bg-black/40 border border-white/10 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-500">Pick Athletes</div>
                                        <div className="text-[9px] sm:text-[10px] font-black text-white/40">{selectedStudentIds.length} Selected</div>
                                    </div>

                                    <div className="flex flex-col xs:flex-row gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={studentSearch}
                                                onChange={(e) => setStudentSearch(e.target.value)}
                                                style={{ paddingLeft: '40px' }}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 py-2 sm:py-2.5 text-[11px] text-white focus:border-amber-500/50 outline-none"
                                            />
                                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                            {studentSearch && (
                                                <button
                                                    onClick={() => setStudentSearch('')}
                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="min-w-[140px]">
                                            <PremiumSelect
                                                value={coachFilter}
                                                onChange={(val) => setCoachFilter(val)}
                                                options={[
                                                    { value: '', label: 'All Coaches' },
                                                    ...coaches.map(c => ({
                                                        value: c.id,
                                                        label: c.full_name || `Coach (${c.id.substring(0, 4)})`
                                                    }))
                                                ]}
                                                placeholder="Coaches"
                                            />
                                        </div>
                                    </div>

                                    <div className="max-h-[180px] sm:max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-1.5">
                                        {allStudents.filter(s => {
                                            const matchesSearch = s.full_name.toLowerCase().includes(studentSearch.toLowerCase());
                                            const matchesCoach = !coachFilter || s.coaches?.full_name === coachFilter;
                                            return matchesSearch && matchesCoach;
                                        }).map(student => (
                                            <div
                                                key={student.id}
                                                onClick={() => {
                                                    setSelectedStudentIds(prev =>
                                                        prev.includes(student.id)
                                                            ? prev.filter(id => id !== student.id)
                                                            : [...prev, student.id]
                                                    );
                                                }}
                                                className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedStudentIds.includes(student.id) ? 'bg-amber-500/10 border-amber-500/30 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedStudentIds.includes(student.id) ? 'bg-amber-500' : 'bg-white/10'}`} />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] sm:text-xs font-bold truncate">{student.full_name}</span>
                                                        <span className="text-[8px] sm:text-[9px] text-white/20 font-medium truncate">@{((student.coaches?.full_name || 'N/A').split(' ')[0] || '').toLowerCase()}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[8px] uppercase font-black opacity-30 shrink-0 ml-2">{student.training_groups?.name || 'N/A'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                )}

                {/* Step 2: Define Skills */}
                {step === 2 && (
                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        <div className="p-8 flex-1 overflow-y-auto flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Test Skills</h3>
                                <button
                                    onClick={() => setShowSkillsManager(true)}
                                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <Settings className="w-3 h-3" />
                                    Manage Skills
                                </button>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-4">
                                {selectedSkills.map((row, index) => (
                                    <div key={index} className="flex gap-2 sm:gap-3 items-start animate-in fade-in slide-in-from-left-4 duration-300">
                                        <div className="flex-1 min-w-0">
                                            <PremiumSelect
                                                value={row.skill_id}
                                                onChange={(val) => updateSkillRow(index, 'skill_id', val)}
                                                options={availableSkills
                                                    .filter(s => !selectedSkills.some((r, i) => i !== index && String(r.skill_id) === String(s.id)))
                                                    .map(s => ({
                                                        value: String(s.id),
                                                        label: `${s.name} (Max ${s.max_score})`
                                                    }))}
                                                placeholder="Select Skill"
                                            />
                                        </div>
                                        <div className="w-16 sm:w-24 shrink-0 relative">
                                            <div className="w-full bg-white/5 border border-white/10 rounded-xl px-2 sm:px-4 py-3 text-[10px] sm:text-sm text-white/50 text-center">
                                                Max: {row.max_score}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeSkillRow(index)}
                                            className="p-3 hover:bg-rose-500/20 text-white/20 hover:text-rose-500 rounded-xl transition-colors shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setIsBulkSelecting(true)}
                                        className="w-full py-3 sm:py-3 bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary/20 hover:text-white transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        Select Multiple
                                    </button>
                                    <button
                                        onClick={addSkillRow}
                                        className="w-full py-3 sm:py-3 border border-dashed border-white/10 rounded-xl text-white/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Single Row
                                    </button>
                                </div>
                            </div>

                        </div>
                        {/* Bulk Selection Overlay */}
                        {isBulkSelecting && (
                            <div className="absolute inset-0 z-20 bg-[#0E1D21] flex flex-col p-8 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-6 p-1">
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4 text-primary" />
                                        Select Skills
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setIsBulkSelecting(false);
                                            setTempSelectedIds([]);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white/60" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20 sm:pb-4">
                                    {availableSkills.filter(s => !selectedSkills.some(sel => String(sel.skill_id) === String(s.id))).length === 0 ? (
                                        <div className="text-center py-12 text-white/20 text-sm">
                                            All available skills selected
                                        </div>
                                    ) : (
                                        availableSkills
                                            .filter(s => !selectedSkills.some(sel => String(sel.skill_id) === String(s.id)))
                                            .map(skill => (
                                                <div
                                                    key={skill.id}
                                                    onClick={() => {
                                                        if (tempSelectedIds.includes(skill.id)) {
                                                            setTempSelectedIds(prev => prev.filter(id => id !== skill.id));
                                                        } else {
                                                            setTempSelectedIds(prev => [...prev, skill.id]);
                                                        }
                                                    }}
                                                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${tempSelectedIds.includes(skill.id)
                                                        ? 'bg-primary/20 border-primary text-white'
                                                        : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <span className="font-bold text-sm">{skill.name}</span>
                                                    <span className="text-xs opacity-50 bg-black/20 px-2 py-1 rounded">Max: {skill.max_score}</span>
                                                </div>
                                            ))
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button
                                        onClick={() => {
                                            setIsBulkSelecting(false);
                                            setTempSelectedIds([]);
                                        }}
                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newSkills = tempSelectedIds.map(id => {
                                                const skill = availableSkills.find(s => s.id === id);
                                                return {
                                                    skill_id: id,
                                                    name: skill?.name || '',
                                                    max_score: skill?.max_score || 10
                                                };
                                            });
                                            setSelectedSkills(prev => [...prev, ...newSkills]);
                                            setIsBulkSelecting(false);
                                            setTempSelectedIds([]);
                                            toast.success(`${newSkills.length} skills added`);
                                        }}
                                        disabled={tempSelectedIds.length === 0}
                                        className="bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add {tempSelectedIds.length} Skills
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Grading Grid */}
                {step === 3 && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-x-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/5 text-white/50 text-[10px] uppercase font-black tracking-widest sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="p-3 sm:p-4 border-b border-white/10 min-w-[120px] sm:min-w-[200px] sticky left-0 bg-[#0E1D21] z-20">Gymnast</th>
                                        {selectedSkills.map((skill, i) => (
                                            <th key={i} className="p-4 border-b border-white/10 text-center min-w-[120px]">
                                                {skill.name} <span className="opacity-50 text-[9px]">({skill.max_score})</span>
                                            </th>
                                        ))}
                                        <th className="p-4 border-b border-white/10 text-center min-w-[100px] text-primary">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.map(student => {
                                        const studentScores = scores[student.id] || {};
                                        const total = student.status === 'absent' ? 0 : selectedSkills.reduce((acc, skill) => acc + (studentScores[skill.skill_id] || 0), 0);
                                        const isAbsent = student.status === 'absent';

                                        return (
                                            <tr key={student.id} className={`hover:bg-white/[0.02] transition-colors ${isAbsent ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="p-2 sm:p-4 sticky left-0 bg-[#0E1D21] z-10 flex items-center gap-1.5 sm:gap-3 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.3)] min-w-[120px] sm:min-w-0">
                                                    <div className={`hidden xs:flex w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${isAbsent ? 'from-red-500/20 to-red-900/20 border-red-500/30' : 'from-white/10 to-white/5 border-white/10'} border items-center justify-center shrink-0`}>
                                                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-col xs:flex-row xs:items-center gap-0.5 xs:gap-2 min-w-0">
                                                            <span className="font-bold text-[11px] sm:text-sm text-white truncate">
                                                                {student.full_name}
                                                            </span>
                                                            {(student as any).coach_name && (
                                                                <span className="text-[8px] sm:text-[10px] text-white/30 font-medium whitespace-nowrap bg-white/5 px-1 sm:px-1.5 py-0.5 rounded w-fit capitalize">
                                                                    @{((student as any).coach_name.split(' ')[0] || '').toLowerCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleStudentStatus(student.id);
                                                            }}
                                                            className={`text-[7px] sm:text-[9px] uppercase tracking-widest font-black cursor-pointer transition-colors mt-1 inline-block px-1 sm:px-1.5 py-0.5 rounded border ${isAbsent ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}
                                                        >
                                                            {isAbsent ? 'ABSENT' : 'PRESENT'}
                                                        </div>
                                                    </div>
                                                </td>
                                                {selectedSkills.map((skill, i) => (
                                                    <td key={i} className="p-2 sm:p-4 text-center">
                                                        <input
                                                            type="number"
                                                            disabled={isAbsent}
                                                            value={studentScores[skill.skill_id] || ''}
                                                            onChange={(e) => handleScoreChange(student.id, skill.skill_id, e.target.value, skill.max_score)}
                                                            className="w-12 sm:w-16 bg-white/5 border border-white/20 rounded-lg px-1 sm:px-2 py-2 sm:py-2 text-[12px] sm:text-sm text-white focus:border-primary/50 outline-none text-center disabled:opacity-20 disabled:cursor-not-allowed placeholder-white/5"
                                                            max={skill.max_score}
                                                            min="0"
                                                            inputMode="numeric"
                                                            placeholder={isAbsent ? '-' : '0'}
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-4 text-center">
                                                    <span className="text-primary font-black text-lg">{total}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-4 sm:p-6 border-t border-white/10 bg-black/20 flex flex-col sm:flex-row justify-between gap-4 shrink-0">
                    <div className="flex justify-between items-center sm:block">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 active:scale-95"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        ) : <div />}

                        <div className="sm:hidden text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                            Step {step} / 3
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {step === 2 && !initialAssignment && (
                            <button
                                onClick={() => handleSave('assigned')}
                                disabled={loading || !title || students.length === 0 || selectedSkills.length === 0}
                                className={`w-full sm:w-auto px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center justify-center gap-2 border ${assessorId && assessorId !== currentCoachId
                                    ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-400'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                {assessorId && assessorId !== currentCoachId ? 'Send to Coach Now' : 'Assign to Coach'}
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={() => {
                                    if (step === 1) {
                                        if (!title) return toast.error('Please enter a title');
                                        if (!selectedGroupId) return toast.error('Please select a group');

                                        if (isMixedMode) {
                                            if (selectedStudentIds.length === 0) return toast.error('Please select at least one student');
                                            const picked = allStudents
                                                .filter(s => selectedStudentIds.includes(s.id))
                                                .map(s => ({
                                                    id: s.id,
                                                    assessment_id: null,
                                                    full_name: s.full_name,
                                                    coach_name: (s.coaches as any)?.[0]?.full_name || (s.coaches as any)?.full_name || '',
                                                    status: 'present'
                                                }));
                                            setStudents(picked);
                                        }
                                    }
                                    if (step === 2 && selectedSkills.length === 0) return toast.error('Please add at least one skill');
                                    if (step === 2 && selectedSkills.some(s => !s.skill_id)) return toast.error('Select a skill for all rows');

                                    if (step === 2 && assessorId !== currentCoachId && currentCoachId) {
                                        setAssessorId(currentCoachId);
                                    }

                                    setStep(step + 1);
                                }}
                                className={`w-full sm:w-auto ${assessorId && assessorId !== currentCoachId
                                    ? 'bg-white/5 text-white/40 border border-white/10'
                                    : 'bg-white text-black hover:bg-white/90'
                                    } px-6 sm:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center justify-center gap-2 transition-all`}
                            >
                                {step === 2 ? (assessorId && assessorId !== currentCoachId ? 'Grade Myself Instead' : 'Proceed to Grading') : 'Next Step'}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSave()}
                                disabled={loading}
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Saving...' : 'Finish & Save'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <SkillsManagerModal
                isOpen={showSkillsManager}
                onClose={() => setShowSkillsManager(false)}
            />
        </div>
    );
}

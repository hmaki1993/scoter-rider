import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, UserPlus, ChevronDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageLightbox from './ImageLightbox';
import PremiumSelect from './PremiumSelect';

interface AddCoachFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        id: string;
        profile_id?: string;
        full_name: string;
        email?: string;
        phone?: string;
        role?: string;
        specialty: string;
        pt_rate: number;
        salary?: number;
        avatar_url?: string;
        image_pos_x?: number;
        image_pos_y?: number;
    } | null;
}

export default function AddCoachForm({ onClose, onSuccess, initialData }: AddCoachFormProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        password: '',
        role: initialData?.role || 'coach',
        specialty: initialData?.specialty || '',
        pt_rate: initialData?.pt_rate?.toString() || '',
        salary: initialData?.salary?.toString() || '',
        avatar_url: initialData?.avatar_url || '',
        image_pos_x: initialData?.image_pos_x ?? 50,
        image_pos_y: initialData?.image_pos_y ?? 50
    });
    const [uploading, setUploading] = useState(false);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = e.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('coaches')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('coaches')
                .getPublicUrl(filePath);

            setFormData((prev: any) => ({ ...prev, avatar_url: data.publicUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error uploading image');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let profileId = initialData?.profile_id || null;

            // 1. AUTOMATIC ACCOUNT CREATION
            if (!initialData && formData.email && formData.password) {
                try {
                    const { data: newUserId, error: createError } = await supabase.rpc('create_new_user', {
                        email: formData.email.toLowerCase().trim(),
                        password: formData.password,
                        user_metadata: {
                            full_name: formData.full_name,
                            role: formData.role
                        }
                    });

                    if (createError) {
                        console.error('Account creation failed:', createError);
                        throw new Error('Failed to create login account: ' + createError.message);
                    }

                    if (newUserId) {
                        profileId = newUserId;
                    }
                } catch (err: any) {
                    toast.error(err.message);
                    setLoading(false);
                    return; // Stop if we can't create the login
                }
            }

            // CRITICAL: Ensure we have a profileId.
            // If editing, we use existing. If new, we MUST have one from the RPC above.
            if (!profileId) {
                toast.error('Could not determine Login ID. Please ensure the email is unique.');
                setLoading(false);
                return;
            }

            // 2. Ensure Profile exists (Shadow Profile or Real Profile)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: profileId,
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.role
                }, { onConflict: 'id' });

            if (profileError) {
                console.warn('Could not create/update profile:', profileError);
            }

            const coachData: any = {
                full_name: formData.full_name.trim(),
                email: formData.email.toLowerCase().trim(),
                phone: formData.phone.trim(),
                specialty: formData.specialty,
                role: formData.role,
                pt_rate: parseFloat(formData.pt_rate) || 0,
                salary: parseFloat(formData.salary) || 0,
                avatar_url: formData.avatar_url,
                image_pos_x: formData.image_pos_x,
                image_pos_y: formData.image_pos_y
            };

            if (profileId) {
                coachData.profile_id = profileId;
            }

            let error;

            if (initialData) {
                // Update existing coach record in DB
                const { error: updateError } = await supabase
                    .from('coaches')
                    .update(coachData)
                    .eq('id', initialData.id);
                error = updateError;
            } else {
                // Create or Update coach record in DB
                // We target 'profile_id' as the anchor because it's the source of truth for the account.
                const { error: upsertError } = await supabase
                    .from('coaches')
                    .upsert([coachData], {
                        onConflict: 'profile_id',
                        ignoreDuplicates: false
                    });
                error = upsertError;


            }

            if (error) throw error;
            toast.success(initialData ? t('common.saveSuccess') : 'Coach added successfully (Login active)');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Submit Error:', error);
            toast.error(error.message || 'Error saving coach');
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

            <div className="w-full max-w-[400px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative flex flex-col max-h-[90vh]">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg leading-tight">
                                {initialData ? 'Edit Staff Member' : 'New Staff Member'}
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
                <form onSubmit={handleSubmit} className="relative z-10 px-8 py-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {/* Full Name */}
                    <div className="space-y-2 group/field">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Full Name</label>
                        <input
                            required
                            type="text"
                            className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-sm tracking-wide font-bold"
                            value={formData.full_name}
                            onChange={(e) => {
                                const newName = e.target.value;
                                const emailName = newName.toLowerCase().replace(/\s+/g, '');
                                setFormData(prev => ({
                                    ...prev,
                                    full_name: newName,
                                    email: prev.email === '' || prev.email.includes(`${prev.full_name.toLowerCase().replace(/\s+/g, '')}@epic.com`)
                                        ? (emailName ? `${emailName}@epic.com` : '')
                                        : prev.email
                                }));
                            }}
                        />
                    </div>

                    {/* Profile Image - Compact & Centered */}
                    <div className="p-4 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4">
                        <div className="flex gap-4 items-center">
                            <div className="relative w-20 h-20 flex-shrink-0 group/img">
                                <div className="w-full h-full rounded-[1.5rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                    {formData.avatar_url ? (
                                        <img
                                            src={formData.avatar_url}
                                            className="w-full h-full object-cover relative z-10 transition-all duration-300 group-hover/img:scale-105 cursor-zoom-in"
                                            style={{ objectPosition: `${formData.image_pos_x}% ${formData.image_pos_y}%` }}
                                            alt="Preview"
                                            onClick={() => setEnlargedImage(formData.avatar_url)}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/10 font-black text-xl">?</div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                {/* Remove Image Button (Outside) */}
                                {formData.avatar_url && !uploading && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, avatar_url: '', image_pos_x: 50, image_pos_y: 50 }))}
                                        className="absolute -top-2 -right-2 z-30 p-1.5 bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-full hover:bg-rose-500 hover:border-rose-500 transition-all duration-300 shadow-xl active:scale-95 group-hover/img:scale-110"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1">
                                <label className="block w-full">
                                    <div className="w-full py-3 bg-white/[0.03] border border-white/5 rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] text-white/40 hover:bg-white/[0.08] hover:text-white hover:border-white/10 cursor-pointer transition-all text-center">
                                        {uploading ? 'Uploading...' : 'Upload Image'}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                                </label>
                            </div>
                        </div>

                        {/* Sliders */}
                        {formData.avatar_url && (
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                <div className="space-y-1">
                                    <label className="text-[7px] font-black uppercase tracking-widest text-white/10 ml-1">Axis X</label>
                                    <input type="range" min="0" max="100" value={formData.image_pos_x} onChange={(e) => setFormData((prev: any) => ({ ...prev, image_pos_x: parseInt(e.target.value) }))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[7px] font-black uppercase tracking-widest text-white/10 ml-1">Axis Y</label>
                                    <input type="range" min="0" max="100" value={formData.image_pos_y} onChange={(e) => setFormData((prev: any) => ({ ...prev, image_pos_y: parseInt(e.target.value) }))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Specialization */}
                    {!['reception', 'cleaner'].includes(formData.role) && (
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Program</label>
                            <PremiumSelect
                                required
                                value={formData.specialty}
                                onChange={val => setFormData({ ...formData, specialty: val })}
                                options={[
                                    { value: "Artistic Gymnastics (Boys)", label: "Artistic Gymnastics (Boys)" },
                                    { value: "Artistic Gymnastics (Girls)", label: "Artistic Gymnastics (Girls)" },
                                    { value: "Artistic Gymnastics (Mixed)", label: "Artistic Gymnastics (Mixed)" },
                                    { value: "Rhythmic Gymnastics", label: "Rhythmic Gymnastics" }
                                ]}
                                placeholder="Discipline"
                            />
                        </div>
                    )}

                    {/* Email & Password Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Email Address</label>
                            <input
                                required
                                type="email"
                                className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-sm font-bold tracking-wide"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Password</label>
                            <input
                                required={!initialData}
                                type="password"
                                className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-sm font-bold"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder={initialData ? "••••••" : ""}
                            />
                        </div>
                    </div>

                    {/* Role & Phone Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Role</label>
                            <PremiumSelect
                                required
                                value={formData.role}
                                onChange={val => setFormData({ ...formData, role: val })}
                                options={[
                                    { value: "coach", label: t('roles.coach') },
                                    { value: "head_coach", label: t('roles.head_coach') },
                                    { value: "admin", label: t('roles.admin') },
                                    { value: "reception", label: t('roles.reception') },
                                    { value: "cleaner", label: t('roles.cleaner') }
                                ]}
                            />
                        </div>

                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Phone Number</label>
                            <input
                                required
                                type="tel"
                                className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white placeholder:text-white/10 text-sm font-bold tracking-wide"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {!['reception', 'cleaner'].includes(formData.role) && (
                            <div className="space-y-2 group/field">
                                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors">Session Rate</label>
                                <input
                                    required
                                    type="number"
                                    className="w-full px-5 py-3 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white text-[10px] font-bold"
                                    value={formData.pt_rate}
                                    onChange={e => setFormData({ ...formData, pt_rate: e.target.value })}
                                />
                            </div>
                        )}
                        <div className="space-y-2 group/field">
                            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 ml-1 group-focus-within/field:text-primary transition-colors whitespace-nowrap">Monthly Salary</label>
                            <input
                                required
                                type="number"
                                className="w-full px-8 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl focus:border-primary/40 outline-none transition-all text-white text-sm font-bold"
                                value={formData.salary}
                                onChange={e => setFormData({ ...formData, salary: e.target.value })}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer Section - Single Premium Button */}
                <div className="relative z-10 px-8 py-8 border-t border-white/5 flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center group/btn overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Processing...</span>
                        ) : (
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] group-hover:tracking-[0.5em] transition-all duration-500">
                                {initialData ? 'Save Changes' : 'Add Staff Member'}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <ImageLightbox
                imageUrl={enlargedImage}
                onClose={() => setEnlargedImage(null)}
            />
        </div>
    );
}


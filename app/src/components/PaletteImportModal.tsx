import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Wand2, Check, RefreshCw, Pipette, Sparkles, ChevronRight, Trash2, Clock, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ExtractedColor {
    hex: string;
    count: number;
    role?: 'primary' | 'secondary' | 'accent' | 'surface' | 'bg' | 'input';
}

interface SavedPalette {
    id: string;
    name: string;
    createdAt: number;
    colors: { primary: string; secondary: string; accent: string; surface: string; bg: string; input: string };
    imageThumb?: string; // small base64 thumbnail
}

interface PaletteImportModalProps {
    onClose: () => void;
    onApply: (palette: { primary: string; secondary: string; accent: string; surface: string; bg: string; input: string }) => void;
}

// ─── Color Extraction ────────────────────────────────────────────────────────
function extractDominantColors(img: HTMLImageElement, count = 8): ExtractedColor[] {
    const canvas = document.createElement('canvas');
    const ratio = Math.min(200 / img.width, 200 / img.height, 1);
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const colorMap = new Map<string, number>();
    for (let i = 0; i < data.length; i += 12) {
        const r = Math.round(data[i] / 24) * 24;
        const g = Math.round(data[i + 1] / 24) * 24;
        const b = Math.round(data[i + 2] / 24) * 24;
        if (data[i + 3] < 128) continue;
        const hex = `#${Math.min(r, 255).toString(16).padStart(2, '0')}${Math.min(g, 255).toString(16).padStart(2, '0')}${Math.min(b, 255).toString(16).padStart(2, '0')}`;
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }
    return [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
        .map(([hex, count]) => ({ hex, count }))
        .filter(c => { const r = parseInt(c.hex.slice(1, 3), 16), g = parseInt(c.hex.slice(3, 5), 16), b = parseInt(c.hex.slice(5, 7), 16), br = (r * 299 + g * 587 + b * 114) / 1000; return br > 15 && br < 245; })
        .slice(0, count);
}

function getThumbnail(img: HTMLImageElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = 80; canvas.height = 40;
    canvas.getContext('2d')!.drawImage(img, 0, 0, 80, 40);
    return canvas.toDataURL('image/jpeg', 0.6);
}

function luminance(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function autoAssignRoles(colors: ExtractedColor[]): Record<string, ExtractedColor['role']> {
    const byLum = [...colors].sort((a, b) => luminance(a.hex) - luminance(b.hex));
    const bySat = [...colors].sort((a, b) => {
        const sat = (hex: string) => { const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, bv = parseInt(hex.slice(5, 7), 16) / 255, mx = Math.max(r, g, bv), mn = Math.min(r, g, bv); return mx === 0 ? 0 : (mx - mn) / mx; };
        return sat(b.hex) - sat(a.hex);
    });
    const out: Record<string, ExtractedColor['role']> = {};
    const used = new Set<string>();
    const pick = (c?: ExtractedColor, role?: ExtractedColor['role']) => { if (c && !used.has(c.hex)) { out[c.hex] = role; used.add(c.hex); } };
    pick(byLum[0], 'bg'); pick(byLum[1], 'secondary'); pick(byLum[2], 'surface');
    pick(bySat[0], 'primary'); pick(bySat[1] || bySat[0], 'accent');
    colors.forEach(c => { if (!used.has(c.hex)) { out[c.hex] = 'input'; used.add(c.hex); } });
    return out;
}

const ROLES: { role: ExtractedColor['role']; label: string }[] = [
    { role: 'primary', label: 'Primary' },
    { role: 'accent', label: 'Accent' },
    { role: 'bg', label: 'Background' },
    { role: 'secondary', label: 'Secondary' },
    { role: 'surface', label: 'Surface' },
    { role: 'input', label: 'Input BG' },
];

const STORAGE_KEY = 'healy_saved_palettes';

function loadSaved(): SavedPalette[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function savePalettes(list: SavedPalette[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── Component ────────────────────────────────────────────────────────────────
type View = 'saved' | 'new';

export default function PaletteImportModal({ onClose, onApply }: PaletteImportModalProps) {
    const [view, setView] = useState<View>('saved');
    const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageThumb, setImageThumb] = useState<string | null>(null);
    const [colors, setColors] = useState<ExtractedColor[]>([]);
    const [assignments, setAssignments] = useState<Record<string, ExtractedColor['role']>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeRole, setActiveRole] = useState<ExtractedColor['role'] | null>(null);
    const [paletteName, setPaletteName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loaded = loadSaved();
        setSavedPalettes(loaded);
        // If no saved palettes, go straight to new
        if (loaded.length === 0) setView('new');
    }, []);

    const processImage = useCallback((src: string, img: HTMLImageElement) => {
        const ex = extractDominantColors(img, 8);
        const thumb = getThumbnail(img);
        setImageThumb(thumb);
        setColors(ex);
        setAssignments(autoAssignRoles(ex));
        setIsExtracting(false);
    }, []);

    const loadImage = useCallback((src: string) => {
        setColors([]); setAssignments({}); setActiveRole(null);
        setIsExtracting(true); setImageUrl(src);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => processImage(src, img);
        img.onerror = () => { toast.error('Cannot load image'); setIsExtracting(false); };
        img.src = src;
    }, [processImage]);

    const handleFile = (f: File) => { const r = new FileReader(); r.onload = e => loadImage(e.target?.result as string); r.readAsDataURL(f); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFile(f); };
    const getHex = (role: ExtractedColor['role']) => Object.entries(assignments).find(([, r]) => r === role)?.[0] || '#1a1a2e';

    const currentPalette = () => ({
        primary: getHex('primary'), secondary: getHex('secondary'),
        accent: getHex('accent'), surface: getHex('surface'),
        bg: getHex('bg'), input: getHex('input'),
    });

    const renamePalette = (id: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        const updated = savedPalettes.map(p => p.id === id ? { ...p, name: trimmed } : p);
        setSavedPalettes(updated);
        savePalettes(updated);
        setEditingId(null);
    };

    const handleApply = (palette = currentPalette()) => {
        onApply(palette);
        onClose();
    };

    const handleSaveAndApply = () => {
        const palette = currentPalette();
        const name = paletteName.trim() || `Custom ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        const newEntry: SavedPalette = { id: Date.now().toString(), name, createdAt: Date.now(), colors: palette, imageThumb: imageThumb || undefined };
        const updated = [newEntry, ...savedPalettes].slice(0, 12); // keep max 12
        setSavedPalettes(updated);
        savePalettes(updated);
        onApply(palette);
        toast.success(`✨ "${name}" saved & applied!`, { duration: 2500 });
        onClose();
    };

    const deletePalette = (id: string) => {
        const updated = savedPalettes.filter(p => p.id !== id);
        setSavedPalettes(updated);
        savePalettes(updated);
        toast.success('Palette deleted');
    };

    const hasPalette = !isExtracting && colors.length > 0;
    const primaryHex = getHex('primary');
    const accentHex = getHex('accent');

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            {/* Full-viewport panel */}
            <div className="absolute inset-0 bg-[#06060e] flex flex-col animate-in slide-in-from-bottom-4 duration-400">

                {/* Top gradient stripe */}
                <div className="h-0.5 w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 flex-shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                            <Pipette className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.25em]">Import Palette</h2>
                            <p className="text-[8px] text-white/20 mt-0.5 uppercase tracking-widest">from any image</p>
                        </div>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                        <button
                            onClick={() => setView('saved')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${view === 'saved' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                        >
                            <Clock className="w-3 h-3" />
                            Saved ({savedPalettes.length})
                        </button>
                        <button
                            onClick={() => setView('new')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${view === 'new' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                        >
                            <Plus className="w-3 h-3" />
                            Import New
                        </button>
                    </div>

                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white transition-all">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* ── SAVED VIEW ── */}
                {view === 'saved' && (
                    <div className="flex-1 overflow-y-auto p-8">
                        {savedPalettes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Clock className="w-7 h-7 text-white/15" />
                                </div>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No saved palettes yet</p>
                                <button onClick={() => setView('new')} className="px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-400 text-[8px] font-black uppercase tracking-widest hover:bg-purple-500/25 transition-all">
                                    Import your first palette →
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-min">
                                {savedPalettes.map(p => (
                                    <div key={p.id} className="group bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/15 transition-all duration-300 hover:bg-white/[0.05]">
                                        {/* Color preview strip */}
                                        <div className="h-16 flex relative overflow-hidden">
                                            {p.imageThumb && (
                                                <img src={p.imageThumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                                            )}
                                            {Object.values(p.colors).map((hex, i) => (
                                                <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
                                            ))}
                                        </div>

                                        <div className="p-3 space-y-2">
                                            {/* Inline editable name */}
                                            {editingId === p.id ? (
                                                <input
                                                    autoFocus
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onBlur={() => renamePalette(p.id, editingName)}
                                                    onKeyDown={e => { if (e.key === 'Enter') renamePalette(p.id, editingName); if (e.key === 'Escape') setEditingId(null); }}
                                                    className="w-full bg-white/10 border border-purple-500/40 rounded-lg px-2 py-1 text-[8px] font-black text-white uppercase tracking-widest outline-none"
                                                />
                                            ) : (
                                                <p
                                                    className="text-[8px] font-black text-white/60 uppercase tracking-widest truncate cursor-pointer hover:text-white/90 transition-colors group/name flex items-center gap-1"
                                                    onClick={() => { setEditingId(p.id); setEditingName(p.name); }}
                                                    title="Click to rename"
                                                >
                                                    {p.name}
                                                    <span className="opacity-0 group-hover/name:opacity-40 text-[8px]">✏️</span>
                                                </p>
                                            )}
                                            <p className="text-[7px] text-white/20 uppercase tracking-widest">
                                                {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                            </p>
                                            <div className="flex gap-1 pt-1">
                                                <button
                                                    onClick={() => handleApply(p.colors)}
                                                    className="flex-1 py-1.5 rounded-xl text-[7px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95"
                                                    style={{ backgroundColor: p.colors.primary, color: luminance(p.colors.primary) > 0.4 ? '#000' : '#fff' }}
                                                >
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    Apply
                                                </button>
                                                <button
                                                    onClick={() => deletePalette(p.id)}
                                                    className="w-7 h-7 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center text-red-400/50 hover:text-red-400 transition-all"
                                                    title="Delete palette"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* + Import New card */}
                                <button
                                    onClick={() => setView('new')}
                                    className="border-2 border-dashed border-white/[0.06] rounded-2xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 min-h-[130px] text-white/20 hover:text-purple-400"
                                >
                                    <div className="w-8 h-8 rounded-xl border border-current flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-[7px] font-black uppercase tracking-widest">Import New</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── NEW IMPORT VIEW ── */}
                {view === 'new' && (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            {/* Drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current?.click()}
                                className={`relative cursor-pointer overflow-hidden transition-all duration-300 flex-shrink-0 ${isDragging ? 'ring-2 ring-inset ring-purple-400' : ''}`}
                                style={{ height: imageUrl ? 200 : 180 }}
                            >
                                {imageUrl ? (
                                    <>
                                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#06060e] via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 transition-all">
                                            <RefreshCw className="w-3.5 h-3.5 text-white/60" />
                                            <span className="text-[8px] font-black text-white/60 uppercase tracking-widest whitespace-nowrap">Change Image</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className={`h-full flex flex-col items-center justify-center gap-3 border-b transition-colors ${isDragging ? 'border-purple-400 bg-purple-500/5 border-dashed' : 'border-white/[0.06] bg-white/[0.01]'}`}>
                                        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                            <Upload className="w-6 h-6 text-white/20" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Drop image or click to browse</p>
                                            <p className="text-[8px] text-white/15 uppercase tracking-widest">Pinterest · Behance · Figma · Anything</p>
                                        </div>
                                    </div>
                                )}
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                            </div>

                            {isExtracting && (
                                <div className="flex items-center justify-center gap-3 py-16">
                                    <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Analysing…</span>
                                </div>
                            )}

                            {hasPalette && (
                                <div className="px-8 py-6 space-y-8">
                                    {/* Color swatches */}
                                    <div>
                                        <p className="text-[7px] font-black text-white/15 uppercase tracking-[0.3em] mb-4">Extracted Colors — tap role then tap color to assign</p>
                                        <div className="flex gap-2">
                                            {colors.map(c => {
                                                const r = assignments[c.hex];
                                                return (
                                                    <button
                                                        key={c.hex}
                                                        onClick={() => { if (activeRole) { setAssignments(prev => { const u = { ...prev }; Object.keys(u).forEach(k => { if (u[k] === activeRole) delete u[k]; }); u[c.hex] = activeRole; return u; }); setActiveRole(null); } }}
                                                        className={`relative flex-1 aspect-square rounded-2xl border-2 transition-all duration-200 shadow-md ${activeRole ? 'hover:scale-110 hover:border-white/40 cursor-pointer' : 'cursor-default'} ${activeRole && r === activeRole ? 'border-white scale-110 ring-2 ring-purple-400' : 'border-white/10'}`}
                                                        style={{ backgroundColor: c.hex }}
                                                        title={c.hex}
                                                    >
                                                        {r && <span className="absolute -top-1.5 -right-1.5 text-[5px] font-black uppercase bg-black/80 text-white/60 px-1 py-0.5 rounded-full tracking-widest border border-white/10">{r.slice(0, 3)}</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {activeRole && <p className="mt-2 text-[8px] font-black text-purple-400 uppercase tracking-widest animate-pulse">↑ Pick a color for {activeRole}</p>}
                                    </div>

                                    {/* Role list */}
                                    <div className="space-y-2">
                                        {ROLES.map(({ role, label }) => {
                                            const hex = getHex(role);
                                            const isActive = activeRole === role;
                                            return (
                                                <button key={role} onClick={() => setActiveRole(isActive ? null : role)}
                                                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all duration-200 text-left ${isActive ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'}`}
                                                >
                                                    <div className="w-9 h-9 rounded-xl border border-white/10 flex-shrink-0" style={{ backgroundColor: hex }} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-purple-400' : 'text-white/50'}`}>{label}</span>
                                                            {isActive && <span className="text-[6px] font-black text-purple-400/70 uppercase tracking-widest animate-pulse">← select color above</span>}
                                                        </div>
                                                        <code className="text-[7px] text-white/20 font-mono">{hex}</code>
                                                    </div>
                                                    <ChevronRight className={`w-3 h-3 transition-all ${isActive ? 'text-purple-400 rotate-90' : 'text-white/15'}`} />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Preview */}
                                    <div>
                                        <p className="text-[7px] font-black text-white/15 uppercase tracking-[0.3em] mb-3">Preview</p>
                                        <div className="h-6 rounded-xl overflow-hidden flex border border-white/5">
                                            {ROLES.map(({ role, label }) => (
                                                <div key={role} className="flex-1" style={{ backgroundColor: getHex(role) }} title={label} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name input */}
                                    <div>
                                        <p className="text-[7px] font-black text-white/15 uppercase tracking-[0.3em] mb-3">Palette Name (optional)</p>
                                        <input
                                            type="text"
                                            value={paletteName}
                                            onChange={e => setPaletteName(e.target.value)}
                                            placeholder="e.g. Ocean Night, Warm Coffee…"
                                            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-[10px] font-bold placeholder:text-white/15 outline-none focus:border-purple-500/40 transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sticky footer */}
                        {hasPalette && (
                            <div className="flex-shrink-0 px-8 py-5 border-t border-white/[0.06] space-y-2">
                                <button
                                    onClick={handleSaveAndApply}
                                    className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl"
                                    style={{ background: `linear-gradient(135deg, ${primaryHex}, ${accentHex})`, color: luminance(primaryHex) > 0.4 ? '#000' : '#fff' }}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Save &amp; Apply to Full App
                                </button>
                                <button
                                    onClick={() => handleApply()}
                                    className="w-full h-9 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 text-white/30 hover:text-white/60 transition-all"
                                >
                                    Apply only (don't save)
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

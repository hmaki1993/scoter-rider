import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Check, RefreshCw, Pipette, Sparkles, ChevronRight, Trash2, Clock, Plus, ArrowLeft, Pencil, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'primary' | 'secondary' | 'accent' | 'surface' | 'bg' | 'input' | 'text_base' | 'text_muted' | 'hover' | 'hover_border';

interface ExtractedColor { hex: string; count: number; }

interface RolePalette { primary: string; secondary: string; accent: string; surface: string; bg: string; input: string; text_base: string; text_muted: string; hover: string; hover_border: string; }

interface SavedPalette {
    id: string;
    name: string;
    createdAt: number;
    colors: RolePalette;
    extractedColors: string[];   // full set for re-editing
    imageThumb?: string;
}

interface Props { onClose: () => void; onApply: (p: RolePalette) => void; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractColors(img: HTMLImageElement, n = 8): ExtractedColor[] {
    const c = document.createElement('canvas');
    const r = Math.min(200 / img.width, 200 / img.height, 1);
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, c.width, c.height);
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const map = new Map<string, number>();
    for (let i = 0; i < data.length; i += 12) {
        const rr = Math.round(data[i] / 24) * 24, gg = Math.round(data[i + 1] / 24) * 24, bb = Math.round(data[i + 2] / 24) * 24;
        if (data[i + 3] < 128) continue;
        const h = `#${Math.min(rr, 255).toString(16).padStart(2, '0')}${Math.min(gg, 255).toString(16).padStart(2, '0')}${Math.min(bb, 255).toString(16).padStart(2, '0')}`;
        map.set(h, (map.get(h) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
        .map(([hex, count]) => ({ hex, count }))
        .filter(({ hex }) => { const rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16), br = (rr * 299 + gg * 587 + bb * 114) / 1000; return br > 15 && br < 245; })
        .slice(0, n);
}

function thumb(img: HTMLImageElement): string {
    const c = document.createElement('canvas'); c.width = 80; c.height = 40;
    c.getContext('2d')!.drawImage(img, 0, 0, 80, 40); return c.toDataURL('image/jpeg', 0.6);
}

function lum(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function autoRoles(colors: ExtractedColor[]): Record<Role, string> {
    const byLum = [...colors].sort((a, b) => lum(a.hex) - lum(b.hex));
    const bySat = [...colors].sort((a, b) => {
        const s = (h: string) => { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, bv = parseInt(h.slice(5, 7), 16) / 255, mx = Math.max(r, g, bv), mn = Math.min(r, g, bv); return mx === 0 ? 0 : (mx - mn) / mx; };
        return s(b.hex) - s(a.hex);
    });

    // Default fallback
    const def = colors[0]?.hex || '#1a1a2e';
    const out: Record<Role, string> = {
        primary: def, accent: def, bg: def, secondary: def, surface: def, input: def,
        text_base: '#f8fafc', text_muted: 'rgba(255, 255, 255, 0.6)',
        hover: def + '33', hover_border: def + '66'
    };

    const used = new Set<number>();
    const pick = (list: ExtractedColor[], role: Role, idx: number) => {
        if (list[idx]) {
            out[role] = list[idx].hex;
            used.add(idx);
        }
    };

    pick(byLum, 'bg', 0);
    pick(byLum, 'secondary', 1);
    pick(byLum, 'surface', 2);
    pick(bySat, 'primary', 0);
    pick(bySat, 'accent', 1);

    // Fill 'input' with something distinct if possible
    const unused = colors.find((c, i) => !used.has(i));
    if (unused) out['input'] = unused.hex;
    else out['input'] = out['surface'];

    // Text colors based on background luminance
    const isBgLight = lum(out.bg) > 0.6;
    out.text_base = isBgLight ? '#06060e' : '#f8fafc';
    out.text_muted = isBgLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';

    // Hover colors based on primary (glow effect)
    out.hover = out.primary + '33'; // 20% opacity
    out.hover_border = out.primary + '66'; // 40% opacity

    return out;
}

const ROLES: { role: Role; label: string }[] = [
    { role: 'primary', label: 'Primary' }, { role: 'accent', label: 'Accent' },
    { role: 'bg', label: 'Background' }, { role: 'secondary', label: 'Secondary' },
    { role: 'surface', label: 'Surface' }, { role: 'input', label: 'Input BG' },
    { role: 'text_base', label: 'Text Base' }, { role: 'text_muted', label: 'Text Muted' },
    { role: 'hover', label: 'Hover Glow' }, { role: 'hover_border', label: 'Hover Border' },
];

const SK = 'healy_saved_palettes';
const load = (): SavedPalette[] => { try { return JSON.parse(localStorage.getItem(SK) || '[]'); } catch { return []; } };
const persist = (list: SavedPalette[]) => localStorage.setItem(SK, JSON.stringify(list));

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Shared color editor used in both "new" and "edit" views */
function ColorEditor({ colors, assignments, onAssign, activeRole, onSetActive, paletteName, onSetName, onSaveApply, onApplyOnly, onReset, saveLabel = 'Save & Apply' }: {
    colors: string[];
    assignments: Record<Role, string>;
    onAssign: (hex: string, role: Role) => void;
    activeRole: Role | null;
    onSetActive: (r: Role | null) => void;
    paletteName: string;
    onSetName: (n: string) => void;
    onSaveApply: () => void;
    onApplyOnly: () => void;
    onReset?: () => void;
    saveLabel?: string;
}) {
    const getHex = (role: Role) => assignments[role] || '#1a1a2e';
    const primaryHex = getHex('primary');
    const accentHex = getHex('accent');

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto grid grid-cols-[1fr_340px] min-h-0">

                {/* ── LEFT: Controls ── */}
                <div className="overflow-y-auto px-6 py-5 space-y-5 border-r border-white/[0.04]">
                    {/* Swatches */}
                    <div>
                        <p className="text-[6px] font-black text-white/15 uppercase tracking-[0.3em] mb-3">
                            {activeRole
                                ? <span className="text-purple-400 animate-pulse">↑ Tap a color to assign as <strong>{activeRole.toUpperCase()}</strong></span>
                                : '① Select a role below  ② tap a color above'}
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                            {colors.map((hex, i) => {
                                const roles = ROLES.filter(r => assignments[r.role] === hex);
                                const isTarget = activeRole && assignments[activeRole] === hex;
                                return (
                                    <button key={i}
                                        onClick={() => { if (activeRole) { onAssign(hex, activeRole); onSetActive(null); } }}
                                        className={`relative flex-shrink-0 w-10 h-10 rounded-xl border-2 transition-all duration-200 shadow-md
                                            ${activeRole ? 'hover:scale-110 cursor-pointer hover:border-white/40' : 'cursor-default'}
                                            ${isTarget ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-white/10'}`}
                                        style={{ backgroundColor: hex }} title={hex}
                                    >
                                        {roles.length > 0 && (
                                            <div className="absolute -top-1.5 -right-1.5 flex flex-col gap-0.5 items-end">
                                                {roles.map(r => (
                                                    <span key={r.role} className="text-[4.5px] font-black uppercase bg-black/90 text-white/90 px-1 py-0.5 rounded-[3px] border border-white/10 shadow-sm leading-none whitespace-nowrap">
                                                        {r.role.slice(0, 3)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Role grid */}
                    <div className="grid grid-cols-2 gap-1.5">
                        {ROLES.map(({ role, label }) => {
                            const hex = getHex(role), isActive = activeRole === role;
                            return (
                                <button key={role} onClick={() => onSetActive(isActive ? null : role)}
                                    className={`group/role relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200 text-left overflow-hidden
                                        ${isActive
                                            ? 'border-purple-500/40 bg-purple-500/10 shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)]'
                                            : 'border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10'}`}
                                >
                                    <div className="w-5 h-5 rounded-md border border-white/10 flex-shrink-0" style={{ backgroundColor: hex }} />
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-[9px] font-black uppercase tracking-widest truncate block ${isActive ? 'text-purple-400' : 'text-white/40'}`}>{label}</span>
                                        <code className={`text-[7.5px] font-mono truncate block ${isActive ? 'text-purple-400/60' : 'text-white/10'}`}>{hex}</code>
                                    </div>

                                    {/* Manual Selection Pipette */}
                                    <label className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer transition-all active:scale-95 z-10 shrink-0 group-hover/role:opacity-100 opacity-0"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Pick Custom Color"
                                    >
                                        <Pipette className={`w-3 h-3 ${isActive ? 'text-purple-400' : 'text-white/30'}`} />
                                        <input
                                            type="color"
                                            className="sr-only"
                                            value={hex.startsWith('#') && hex.length === 7 ? hex : '#7c3aed'}
                                            onChange={(e) => {
                                                onAssign(e.target.value, role);
                                                onSetActive(null);
                                            }}
                                        />
                                    </label>

                                    {isActive && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-purple-500/60" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Name */}
                    <div>
                        <p className="text-[6px] font-black text-white/15 uppercase tracking-[0.3em] mb-2">Palette Name</p>
                        <input type="text" value={paletteName} onChange={e => onSetName(e.target.value)}
                            placeholder="e.g. Ocean Night…"
                            className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-white text-[11px] font-bold outline-none focus:border-purple-500/40 transition-all placeholder:text-white/30"
                            style={{ color: lum(getHex('input')) > 0.4 ? '#000' : '#fff' }}
                        />
                    </div>
                </div>

                {/* ── RIGHT: Live App Preview ── */}
                <div className="overflow-y-auto px-5 py-5 space-y-3">
                    <p className="text-[6px] font-black text-white/15 uppercase tracking-[0.3em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                        {activeRole
                            ? <span className="text-purple-400 animate-pulse">Highlighting elements affected by: {activeRole.toUpperCase()}</span>
                            : 'Live Preview · Updates in real-time'}
                    </p>

                    {/* App mockup */}
                    <div className={`rounded-2xl overflow-hidden border transition-all duration-500 shadow-2xl ${activeRole === 'bg' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black animate-pulse' : 'border-white/10'}`}
                        style={{ backgroundColor: getHex('bg') }}>

                        {/* Top bar */}
                        <div className={`px-3 py-2 flex items-center justify-between border-b transition-all duration-300 ${activeRole === 'surface' ? 'border-purple-500 bg-purple-500/10 animate-pulse' : 'border-white/5'}`}
                            style={{ backgroundColor: getHex('surface') }}>
                            <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-md transition-all duration-300 ${activeRole === 'primary' ? 'ring-2 ring-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`} style={{ backgroundColor: getHex('primary') }} />
                                <div className="space-y-0.5">
                                    <div className={`h-1.5 w-14 rounded-full transition-all duration-300 ${activeRole === 'primary' ? 'opacity-100 scale-x-105' : 'opacity-60'}`} style={{ backgroundColor: getHex('primary') }} />
                                    <div className={`h-1 w-8 rounded-full transition-all duration-300 ${activeRole === 'text_muted' ? 'ring-1 ring-white scale-x-110 shadow-[0_0_5px_rgba(255,255,255,0.3)]' : ''}`} style={{ backgroundColor: getHex('text_muted') }} />
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-300 ${activeRole === 'input' ? 'border-purple-500 ring-2 ring-purple-500/50 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'border-white/10'}`} style={{ backgroundColor: getHex('input') }}>
                                    <div className="w-2 h-0.5 rounded-full" style={{ backgroundColor: getHex('secondary') }} />
                                </div>
                                <div className={`w-5 h-5 rounded-full transition-all duration-300 ${activeRole === 'accent' ? 'ring-2 ring-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`} style={{ backgroundColor: getHex('accent') }} />
                            </div>
                        </div>

                        {/* Sidebar + content */}
                        <div className="flex" style={{ minHeight: 160 }}>
                            {/* Sidebar */}
                            <div className={`w-16 flex-shrink-0 border-r py-2 space-y-1 px-2 transition-all duration-300 ${activeRole === 'surface' ? 'border-purple-500/30' : 'border-white/5'}`} style={{ backgroundColor: getHex('surface') }}>
                                {[0.8, 0.5, 0.4, 0.4, 0.3].map((op, i) => (
                                    <div key={i} className={`h-5 rounded-lg flex items-center gap-1.5 px-1.5 transition-all duration-300 ${activeRole === 'primary' && i === 0 ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
                                        style={{ backgroundColor: i === 0 ? `${getHex('primary')}33` : 'transparent' }}>
                                        <div className={`w-2 h-2 rounded-sm flex-shrink-0 transition-all duration-300 ${activeRole === 'primary' ? 'scale-110 shadow-[0_0_5px_rgba(255,255,255,0.3)]' : ''}`} style={{ backgroundColor: getHex('primary'), opacity: op }} />
                                        <div className={`h-1 rounded-full flex-1 transition-all duration-300 ${activeRole === 'text_muted' ? 'ring-1 ring-white/30 scale-x-105' : ''}`} style={{ backgroundColor: getHex('text_muted'), opacity: op * 0.6 }} />
                                    </div>
                                ))}
                            </div>

                            {/* Main area */}
                            <div className="flex-1 p-3 space-y-2" style={{ backgroundColor: getHex('bg') }}>
                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(['primary', 'secondary', 'accent'] as Role[]).map((role, i) => (
                                        <div key={role} className={`rounded-xl p-2 border relative overflow-hidden transition-all duration-300 ${activeRole === role ? 'border-purple-500 ring-1 ring-purple-500/30 scale-105 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/5'}`} style={{ backgroundColor: getHex('surface') }}>
                                            <div className="text-[4px] font-black uppercase opacity-50 mb-1" style={{ color: getHex(role) }}>{role}</div>
                                            <div className="text-[6px] font-black text-white/70">
                                                {i === 0 ? '247' : i === 1 ? '18' : '96%'}
                                            </div>
                                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 ${activeRole === role ? 'h-1 opacity-100' : 'opacity-60'}`} style={{ backgroundColor: getHex(role) }} />
                                        </div>
                                    ))}
                                </div>

                                {/* Card */}
                                {/* Card with Hover effect representation */}
                                <div className={`rounded-xl p-2.5 border transition-all duration-300 
                                    ${activeRole === 'surface' ? 'border-purple-500/30 bg-purple-500/5' : ''}
                                    ${activeRole === 'hover' ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-black scale-[1.02] shadow-[0_0_20px_rgba(168,85,247,0.3)]' : ''}
                                    ${activeRole === 'hover_border' ? 'border-purple-500 scale-[1.02] shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/5'}`}
                                    style={{
                                        backgroundColor: activeRole === 'hover' ? getHex('hover') : getHex('surface'),
                                        borderColor: activeRole === 'hover_border' ? getHex('hover_border') : undefined
                                    }}>
                                    <div className={`h-1.5 w-16 rounded-full mb-1.5 transition-all duration-300 ${activeRole === 'text_base' ? 'ring-1 ring-white scale-x-110 shadow-[0_0_5px_rgba(255,255,255,0.3)]' : 'opacity-80'}`} style={{ backgroundColor: getHex('text_base') }} />
                                    <div className={`h-1 w-24 rounded-full mb-1 transition-all duration-300 ${activeRole === 'text_muted' ? 'ring-1 ring-white/40 shadow-[0_0_5px_rgba(255,255,255,0.2)]' : 'opacity-40'}`} style={{ backgroundColor: getHex('text_muted') }} />
                                    <div className={`h-1 w-20 rounded-full mb-3 transition-all duration-300 ${activeRole === 'text_muted' ? 'opacity-60' : 'opacity-25'}`} style={{ backgroundColor: getHex('text_muted') }} />
                                    {/* Input */}
                                    <div className={`h-5 rounded-lg border px-2 flex items-center mb-2 transition-all duration-300 ${activeRole === 'input' ? 'border-purple-500 ring-1 ring-purple-500/30 scale-105 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-white/5'}`} style={{ backgroundColor: getHex('input') }}>
                                        <div className={`h-1 w-10 rounded-full transition-all duration-300 ${activeRole === 'text_muted' ? 'opacity-60' : 'opacity-30'}`} style={{ backgroundColor: getHex('text_muted') }} />
                                    </div>
                                    {/* Button */}
                                    <div className={`h-5 rounded-lg flex items-center justify-center gap-1 transition-all duration-300 ${activeRole === 'primary' || activeRole === 'accent' ? 'scale-105 shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-1 ring-white/20' : ''}`} style={{ background: `linear-gradient(135deg, ${getHex('primary')}, ${getHex('accent')})` }}>
                                        <div className="h-1 w-8 rounded-full opacity-80" style={{ backgroundColor: lum(getHex('primary')) > 0.4 ? '#000' : '#fff' }} />
                                    </div>
                                </div>

                                {/* Bottom: accent badge */}
                                <div className="flex items-center gap-2">
                                    <div className={`h-4 rounded-full px-2 flex items-center transition-all duration-300 ${activeRole === 'accent' ? 'ring-2 ring-purple-500/50 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : ''}`} style={{ backgroundColor: `${getHex('accent')}33`, border: `1px solid ${getHex('accent')}44` }}>
                                        <div className="h-0.5 w-6 rounded-full" style={{ backgroundColor: getHex('accent') }} />
                                    </div>
                                    <div className={`h-1 w-10 rounded-full transition-all duration-300 ${activeRole === 'text_muted' ? 'opacity-60' : 'opacity-20'}`} style={{ backgroundColor: getHex('text_muted') }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role legend */}
                    <div className="grid grid-cols-2 gap-1 pt-1">
                        {ROLES.map(({ role, label }) => (
                            <div key={role} className={`flex items-center gap-1.5 p-1 rounded-md transition-all cursor-pointer hover:bg-white/[0.03] ${activeRole === role ? 'bg-white/[0.05] ring-1 ring-white/10' : ''}`} onClick={() => onSetActive(role)}>
                                <div className={`w-2 h-2 rounded-sm flex-shrink-0 border transition-all ${activeRole === role ? 'scale-125 border-white ring-2 ring-white/20' : 'border-white/10'}`} style={{ backgroundColor: getHex(role) }} />
                                <span className={`text-[6px] font-bold uppercase tracking-widest transition-all ${activeRole === role ? 'text-white' : 'text-white/30'}`}>{label}</span>
                                <code className={`text-[5px] font-mono ml-auto transition-all ${activeRole === role ? 'text-white/60' : 'text-white/15'}`}>{getHex(role)}</code>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-8 py-5 border-t border-white/[0.04] space-y-3 bg-black/20 backdrop-blur-md">
                <div className="flex gap-2">
                    <button onClick={onSaveApply}
                        className="flex-[2] h-11 rounded-xl font-black text-[9px] uppercase tracking-[0.25em] flex items-center justify-center gap-2.5 transition-all hover:brightness-110 active:scale-95 shadow-lg group"
                        style={{ background: `linear-gradient(135deg,${primaryHex},${accentHex})`, color: lum(primaryHex) > 0.4 ? '#000' : '#fff' }}
                    >
                        <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                        {saveLabel}
                    </button>
                    <button onClick={onApplyOnly}
                        className="flex-1 h-11 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] font-black text-[8px] uppercase tracking-widest flex items-center justify-center text-white/40 hover:text-white transition-all">
                        Apply Fast
                    </button>
                    {onReset && (
                        <button onClick={onReset}
                            title="Reset to auto-detected colors"
                            className="w-11 h-11 rounded-xl bg-white/[0.02] hover:bg-orange-500/10 border border-white/[0.04] hover:border-orange-500/30 flex items-center justify-center text-white/20 hover:text-orange-400 transition-all group/reset">
                            <RotateCcw className="w-4 h-4 group-hover/reset:-rotate-180 transition-transform duration-500" />
                        </button>
                    )}
                </div>
                <p className="text-center text-[6px] text-white/10 uppercase tracking-widest">Premium Theme Engine · By Healy</p>
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
type View = 'saved' | 'new' | 'edit';

export default function PaletteImportModal({ onClose, onApply }: Props) {
    const [view, setView] = useState<View>('saved');
    const [saved, setSaved] = useState<SavedPalette[]>([]);

    // New import state
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageThumb, setImageThumb] = useState<string | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [assignments, setAssignments] = useState<Record<Role, string>>({
        primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
        surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e',
        text_base: '#f8fafc', text_muted: 'rgba(255, 255, 255, 0.6)'
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeRole, setActiveRole] = useState<Role | null>(null);
    const [paletteName, setPaletteName] = useState('');

    // Edit state
    const [editTarget, setEditTarget] = useState<SavedPalette | null>(null);
    const [editColors, setEditColors] = useState<string[]>([]);
    const [editAssignments, setEditAssignments] = useState<Record<Role, string>>({
        primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
        surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e',
        text_base: '#f8fafc', text_muted: 'rgba(255, 255, 255, 0.6)',
        hover: '#1a1a2e33', hover_border: '#1a1a2e66'
    });
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [editName, setEditName] = useState('');

    // Inline rename
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renamingVal, setRenamingVal] = useState('');

    // Stores the original auto-detected assignments so the user can reset
    const initialAssignmentsRef = useRef<Record<Role, string>>({
        primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
        surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e',
        text_base: '#f8fafc', text_muted: 'rgba(255, 255, 255, 0.6)',
        hover: '#1a1a2e33', hover_border: '#1a1a2e66'
    });

    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const ls = load();
        setSaved(ls);
        if (ls.length === 0) setView('new');
    }, []);

    // ── New import ──
    const loadImage = useCallback((src: string) => {
        setColors([]); setAssignments({
            primary: '#1a1a2e', secondary: '#1a1a2e', accent: '#1a1a2e',
            surface: '#1a1a2e', bg: '#1a1a2e', input: '#1a1a2e',
            text_base: '#f8fafc', text_muted: 'rgba(255, 255, 255, 0.6)',
            hover: '#1a1a2e33', hover_border: '#1a1a2e66'
        }); setActiveRole(null);
        setIsExtracting(true); setImageUrl(src);
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => {
            const ex = extractColors(img, 8);
            setImageThumb(thumb(img));
            setColors(ex.map(c => c.hex));
            const autoAsgn = autoRoles(ex);
            initialAssignmentsRef.current = autoAsgn;  // store for reset
            setAssignments(autoAsgn);
            setIsExtracting(false);
        };
        img.onerror = () => { toast.error('Cannot load image'); setIsExtracting(false); };
        img.src = src;
    }, []);

    const handleFile = (f: File) => { const r = new FileReader(); r.onload = e => loadImage(e.target?.result as string); r.readAsDataURL(f); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFile(f); };

    const buildPalette = (asgn: Record<Role, string>): RolePalette => ({
        primary: asgn.primary, secondary: asgn.secondary,
        accent: asgn.accent, surface: asgn.surface,
        bg: asgn.bg, input: asgn.input,
        text_base: asgn.text_base, text_muted: asgn.text_muted,
        hover: asgn.hover, hover_border: asgn.hover_border
    });

    const assign = (hex: string, role: Role, current: Record<Role, string>, set: (v: Record<Role, string>) => void) => {
        set({ ...current, [role]: hex });
    };

    // ── Save ops ──
    const doSaveNew = () => {
        const palette = buildPalette(assignments);
        const name = paletteName.trim() || `Custom ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        const entry: SavedPalette = { id: Date.now().toString(), name, createdAt: Date.now(), colors: palette, extractedColors: colors, imageThumb: imageThumb || undefined };
        const updated = [entry, ...saved].slice(0, 12);
        setSaved(updated); persist(updated);
        onApply(palette);
        toast.success(`✨ "${name}" saved & applied!`, { duration: 2500 });
        onClose();
    };

    const doUpdateEdit = () => {
        if (!editTarget) return;
        const palette = buildPalette(editAssignments);
        const name = editName.trim() || editTarget.name;
        const updated = saved.map(p => p.id === editTarget.id ? { ...p, name, colors: palette, extractedColors: editColors } : p);
        setSaved(updated); persist(updated);
        onApply(palette);
        toast.success(`✨ "${name}" updated & applied!`, { duration: 2500 });
        onClose();
    };

    const deletePalette = (id: string) => {
        const updated = saved.filter(p => p.id !== id);
        setSaved(updated); persist(updated);
        toast.success('Deleted');
    };

    const openEdit = (p: SavedPalette) => {
        setEditTarget(p);
        setEditColors((p.extractedColors?.length ? p.extractedColors : Object.values(p.colors)));

        const asgn = { ...p.colors };
        initialAssignmentsRef.current = { ...asgn }; // Store for reset

        setEditAssignments(asgn);
        setEditName(p.name);
        setEditRole(null);
        setView('edit');
    };

    const renameInList = (id: string, name: string) => {
        const trimmed = name.trim(); if (!trimmed) return;
        const updated = saved.map(p => p.id === id ? { ...p, name: trimmed } : p);
        setSaved(updated); persist(updated); setRenamingId(null);
    };

    const hasPalette = !isExtracting && colors.length > 0;

    // Common header
    const Header = ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.04] bg-white/[0.01] backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-3">
                {onBack ? (
                    <button onClick={onBack} className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] flex items-center justify-center text-white/40 hover:text-white transition-all group">
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                ) : (
                    <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                            <Pipette className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                )}
                <div className="flex flex-col">
                    <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none">{title}</h2>
                    {subtitle && <p className="text-[7px] text-white/20 mt-1 uppercase tracking-widest font-bold">{subtitle}</p>}
                </div>
            </div>
            {!onBack && (
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/[0.04] gap-0.5">
                    {(['saved', 'new'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[7px] font-black uppercase tracking-widest transition-all duration-300 ${view === v ? 'bg-white/10 text-white shadow-sm' : 'text-white/20 hover:text-white'}`}>
                            {v === 'saved' ? <Clock className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {v === 'saved' ? `Vault (${saved.length})` : 'New Import'}
                        </button>
                    ))}
                </div>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/20 flex items-center justify-center text-white/20 hover:text-red-400 transition-all">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[200] bg-[#06060e] flex flex-col animate-in slide-in-from-bottom-4 duration-400 h-screen w-screen overflow-hidden">
            {/* Backdrop blur effect */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none" />

            {/* Content Container (relative to stack above) */}
            <div className="relative flex-1 flex flex-col min-h-0">

                {/* Accent stripe */}
                <div className="h-0.5 w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 flex-shrink-0" />

                {/* ══ SAVED VIEW ══ */}
                {view === 'saved' && (
                    <>
                        <Header title="Import Palette" subtitle="from any image" />
                        <div className="flex-1 overflow-y-auto p-8">
                            {saved.length === 0 ? (
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
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 auto-rows-min">
                                    {saved.map(p => (
                                        <div key={p.id} className="group bg-white/[0.02] rounded-xl border border-white/[0.04] overflow-hidden hover:border-purple-500/20 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
                                            onClick={() => openEdit(p)}>
                                            {/* Color strip */}
                                            <div className="h-14 flex relative overflow-hidden bg-black/20">
                                                {p.imageThumb && <img src={p.imageThumb} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 transition-all duration-500" />}
                                                <div className="absolute inset-0 flex">
                                                    {Object.values(p.colors).map((hex, i) => (
                                                        <div key={i} className="flex-1 h-full shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]" style={{ backgroundColor: hex }} />
                                                    ))}
                                                </div>
                                                {/* Edit icon overlay */}
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-900/40 backdrop-blur-[2px] flex items-center justify-center">
                                                    <Pencil className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            </div>
                                            <div className="p-2.5 space-y-1.5">
                                                {/* Inline rename */}
                                                {renamingId === p.id ? (
                                                    <input autoFocus value={renamingVal} onChange={e => setRenamingVal(e.target.value)}
                                                        onBlur={() => renameInList(p.id, renamingVal)}
                                                        onKeyDown={e => { if (e.key === 'Enter') renameInList(p.id, renamingVal); if (e.key === 'Escape') setRenamingId(null); }}
                                                        className="w-full bg-white/10 border border-purple-500/40 rounded px-1.5 py-0.5 text-[7px] font-black text-white uppercase outline-none" />
                                                ) : (
                                                    <p className="text-[7px] font-black text-white/50 uppercase tracking-widest truncate group-hover:text-purple-400 transition-colors"
                                                        onDoubleClick={e => { e.stopPropagation(); setRenamingId(p.id); setRenamingVal(p.name); }}>{p.name}</p>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[6px] text-white/10 font-bold uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                                    <button onClick={e => { e.stopPropagation(); deletePalette(p.id); }}
                                                        className="w-5 h-5 rounded-lg bg-red-500/0 hover:bg-red-500/20 flex items-center justify-center text-red-500/0 group-hover:text-red-500/40 hover:text-red-500 transition-all">
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* + New card */}
                                    <button onClick={() => setView('new')}
                                        className="h-24 border border-dashed border-white/[0.04] rounded-xl hover:border-purple-500/30 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-1.5 text-white/15 hover:text-purple-400">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="text-[6px] font-black uppercase tracking-[0.2em]">New Import</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ══ NEW IMPORT VIEW ══ */}
                {view === 'new' && (
                    <>
                        <Header title="Import New Palette" subtitle="upload an image to extract colors" />
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Drop zone fills all space when no image */}
                            {!imageUrl && !isExtracting && (
                                <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`flex-1 cursor-pointer flex flex-col items-center justify-center gap-4 transition-all border-b ${isDragging ? 'border-purple-400 bg-purple-500/5 border-dashed' : 'border-white/[0.04] hover:bg-white/[0.01]'}`}>
                                    <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                                        <Upload className="w-9 h-9 text-white/15" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-sm font-black text-white/30 uppercase tracking-widest">Drop image or click to browse</p>
                                        <p className="text-[9px] text-white/15 uppercase tracking-widest">Pinterest · Behance · Figma · Anything</p>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                                </div>
                            )}

                            {/* Image loaded → compact pill header */}
                            {imageUrl && (
                                <>
                                    <div className="flex-shrink-0 mx-8 mb-4 flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-2 pr-3 group">
                                        {/* Thumbnail */}
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/10" />
                                        </div>
                                        {/* Color swatches inline */}
                                        <div className="flex-1 flex gap-1">
                                            {colors.slice(0, 8).map((hex, i) => (
                                                <div key={i} className="flex-1 h-8 rounded-lg border border-white/5 shadow-sm" style={{ backgroundColor: hex }} />
                                            ))}
                                        </div>
                                        {/* Replace button */}
                                        <button onClick={() => fileRef.current?.click()}
                                            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] hover:border-purple-500/30 transition-all group/btn">
                                            <RefreshCw className="w-3 h-3 text-white/30 group-hover/btn:text-purple-400 group-hover/btn:rotate-180 transition-all duration-500" />
                                            <span className="text-[7px] font-black text-white/30 group-hover/btn:text-purple-400 uppercase tracking-widest transition-colors">Swap</span>
                                        </button>
                                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                                    </div>

                                    {isExtracting ? (
                                        <div className="flex-1 flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Analysing…</span>
                                        </div>
                                    ) : hasPalette && (
                                        <ColorEditor
                                            colors={colors} assignments={assignments}
                                            onAssign={(hex, role) => assign(hex, role, assignments, setAssignments)}
                                            activeRole={activeRole} onSetActive={setActiveRole}
                                            paletteName={paletteName} onSetName={setPaletteName}
                                            onSaveApply={doSaveNew}
                                            onApplyOnly={() => { onApply(buildPalette(assignments)); onClose(); }}
                                            onReset={() => setAssignments({ ...initialAssignmentsRef.current })}
                                        />
                                    )}
                                </>
                            )}

                            {isExtracting && !imageUrl && (
                                <div className="flex-1 flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Analysing…</span>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ══ EDIT VIEW ══ */}
                {view === 'edit' && editTarget && (
                    <>
                        <Header title={`Edit — ${editTarget.name}`} subtitle="adjust color roles then save" onBack={() => setView('saved')} />
                        <ColorEditor
                            colors={editColors} assignments={editAssignments}
                            onAssign={(hex, role) => assign(hex, role, editAssignments, setEditAssignments)}
                            activeRole={editRole} onSetActive={setEditRole}
                            paletteName={editName} onSetName={setEditName}
                            onSaveApply={doUpdateEdit}
                            onApplyOnly={() => { onApply(buildPalette(editAssignments)); onClose(); }}
                            onReset={() => setEditAssignments({ ...initialAssignmentsRef.current })}
                            saveLabel="Update & Apply"
                        />
                    </>
                )}

            </div>
        </div>
    );
}

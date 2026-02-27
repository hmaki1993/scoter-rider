import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { hexToRgba, stripAlpha, rgbaToHex8 } from '../utils';

export function PremiumConfirmModal({ isOpen, onClose, title, message, onConfirm, type = 'standard' }: any) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}></div>
            <div className="relative glass-card max-w-md w-full p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/10 shadow-premium animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Visual Flair */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${type === 'destructive' ? 'bg-rose-500' : 'bg-primary'}`}></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-2xl mb-6 ${type === 'destructive' ? 'bg-rose-500/20 text-rose-500' : 'bg-primary/20 text-primary'}`}>
                        {type === 'destructive' ? <AlertTriangle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter mb-2">{title}</h3>
                    <p className="text-white/40 font-bold uppercase text-[8px] sm:text-[9px] tracking-[0.2em] leading-relaxed mb-8">{message}</p>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 text-white/40 font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-white/10 border border-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-3.5 sm:px-6 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] shadow-2xl transition-all hover:scale-105 active:scale-95 ${type === 'destructive' ? 'bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-600' : 'bg-primary text-white shadow-primary/30 hover:bg-primary-hover'}`}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function PremiumSwitch({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
            <div className="flex-1">
                <div className="text-[9px] font-black uppercase tracking-widest text-white mb-0.5 group-hover:text-primary transition-colors">{label}</div>
                {description && <div className="text-[7px] font-bold uppercase tracking-widest text-white/30">{description}</div>}
            </div>
            <div className="relative inline-flex items-center cursor-pointer ml-3 rtl:mr-3 rtl:ml-0">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
                <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:bg-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white/20 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
            </div>
        </label>
    );
}

export function PremiumColorPicker({ label, value, onChange, description }: { label: string; value: string; onChange: (val: string) => void; description?: string }) {
    const [opacity, setOpacity] = useState(hexToRgba(value || '#000000ff').a);
    const [baseColor, setBaseColor] = useState(stripAlpha(value || '#000000'));
    const [inputValue, setInputValue] = useState(stripAlpha(value || '#000000').toUpperCase());

    useEffect(() => {
        const rgba = hexToRgba(value || '#000000ff');
        setOpacity(rgba.a);
        setBaseColor(stripAlpha(value || '#000000'));
        setInputValue(stripAlpha(value || '#000000').toUpperCase());
    }, [value]);

    const handleBaseChange = (newHex: string) => {
        setBaseColor(newHex);
        const { r: nr, g: ng, b: nb } = hexToRgba(newHex);
        onChange(rgbaToHex8(nr, ng, nb, opacity));
    };

    const handleOpacityChange = (newOpacity: number) => {
        setOpacity(newOpacity / 100);
        const { r: nr, g: ng, b: nb } = hexToRgba(baseColor);
        onChange(rgbaToHex8(nr, ng, nb, newOpacity / 100));
    };

    const commitInputChange = () => {
        let val = inputValue.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
            handleBaseChange(val);
        } else {
            // Revert on invalid
            setInputValue(baseColor.toUpperCase());
        }
    };

    const { r, g, b } = hexToRgba(baseColor);
    return (
        <div className="group/picker space-y-2.5 p-3 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-primary/30 transition-all shadow-premium-subtle">
            <div className="flex items-center justify-between">
                <label className="text-[8px] text-white/40 font-black uppercase tracking-[0.2em] group-hover/picker:text-primary transition-colors">{label}</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    <span className="text-[6px] font-black text-white/20 uppercase tracking-widest">Alpha</span>
                    <span className="text-[7px] font-black text-primary">{Math.round(opacity * 100)}%</span>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 group-hover/picker:scale-105 transition-transform duration-500">
                    <div className="absolute inset-0" style={{ backgroundImage: 'conic-gradient(#333 0.25turn, #444 0.25turn 0.5turn, #333 0.5turn 0.75turn, #444 0.75turn)', backgroundSize: '8px 8px' }}></div>
                    <div className="absolute inset-0" style={{ backgroundColor: value }}></div>
                    <input type="color" value={baseColor} onChange={(e) => handleBaseChange(e.target.value)} className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col gap-0.5">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                            onBlur={commitInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                }
                            }}
                            className="text-xs font-black text-white tracking-[0.15em] font-mono leading-none bg-transparent border-none outline-none focus:text-primary transition-colors w-24"
                        />
                        <div className="text-[6px] text-white/20 font-bold uppercase tracking-widest truncate">RGBA({r}, {g}, {b}, {opacity})</div>
                    </div>
                    <div className="relative group/slider pt-1">
                        <input type="range" min="0" max="100" value={Math.round(opacity * 100)} onChange={(e) => handleOpacityChange(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary group-hover/slider:bg-white/20 transition-all" />
                    </div>
                </div>
            </div>
            {description && <div className="text-[7px] text-white/30 font-bold uppercase tracking-widest border-t border-white/5 pt-2 leading-relaxed">{description}</div>}
        </div>
    );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string | React.ReactNode;
}

interface ModernSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    fallbackRole?: string;
    className?: string;
    required?: boolean;
}

export default function ModernSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    fallbackRole = "Option",
    className = "",
    required = false
}: ModernSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // UUID Detection Helper (Robust)
    const isUUID = (str: any) => {
        if (!str) return false;
        const s = String(str).trim();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(s) || (s.length > 20 && (s.match(/-/g) || []).length >= 4);
    };

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative group/select ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full px-5 py-3.5 bg-white/[0.03] border rounded-2xl outline-none
                    flex items-center justify-start text-left relative transition-all duration-300
                    ${isOpen
                        ? 'border-primary/40 bg-white/[0.08] shadow-[0_0_30px_rgba(var(--primary-rgb,255,255,255),0.15)]'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.05]'}
                `}
            >
                <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="flex items-center gap-2 w-full">
                        <span className={`text-[11px] sm:text-xs font-bold truncate ${selectedOption ? 'text-white' : 'text-white/20'}`}>
                            {selectedOption &&
                                selectedOption.label &&
                                !isUUID(selectedOption.label)
                                ? selectedOption.label
                                : (selectedOption ? `👤 ${fallbackRole}` : placeholder)}
                        </span>
                    </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 ml-2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-white/20'}`} />
            </button>

            {/* Hidden Input for Form Validation/Submission - ABSOLUTELY CONCEALED */}
            <input
                type="text"
                value={value}
                onChange={() => { }}
                readOnly
                required={required}
                aria-hidden="true"
                tabIndex={-1}
                style={{
                    position: 'absolute',
                    opacity: 0,
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                    inset: 0,
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    visibility: 'hidden'
                }}
            />

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-[110] top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0f]/95 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 py-2 origin-top">
                    {/* Inner Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/[0.05] to-transparent pointer-events-none"></div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar relative z-10">
                        {options.map((option) => {
                            const isSelected = String(value) === String(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                                        w-full px-5 py-3 text-left transition-all duration-300 flex items-center justify-between group/opt
                                        ${isSelected
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                                        }
                                    `}
                                >
                                    <span className={`text-xs font-bold tracking-wide transition-all duration-300 ${isSelected ? 'translate-x-1' : 'group-hover/opt:translate-x-1'}`}>
                                        {option.label && !isUUID(option.label) ? option.label : `${fallbackRole} (${String(option.value).substring(0, 4)})`}
                                    </span>
                                    {isSelected && (
                                        <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in duration-300" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

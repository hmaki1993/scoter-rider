import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string | React.ReactNode;
}

interface PremiumSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    required?: boolean;
}

export default function PremiumSelect({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    className = "",
    required = false
}: PremiumSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

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
                    w-full px-5 py-3 bg-black/40 border rounded-2xl outline-none
                    flex items-center justify-start text-left relative
                    ${isOpen ? 'border-primary/40 bg-black' : 'border-white/5 hover:border-white/20'}
                `}
            >
                <span className={`text-[10px] font-bold ${selectedOption ? 'text-white' : 'text-white/20'}`}>
                    {selectedOption &&
                        selectedOption.label &&
                        !isUUID(selectedOption.label) &&
                        String(selectedOption.label).trim() !== String(selectedOption.value).trim()
                        ? selectedOption.label
                        : (selectedOption ? 'Coach' : placeholder)}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 absolute right-5 top-1/2 -translate-y-1/2 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-white/20'}`} />
            </button>

            {/* Hidden Input for Form Validation/Submission */}
            <input
                type="text"
                value={value}
                onChange={() => { }}
                readOnly
                required={required}
                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                tabIndex={-1}
            />

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-[110] top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0f]/90 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 py-2 origin-top">
                    {/* Inner Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-transparent pointer-events-none"></div>

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
                                        w-full px-5 py-2.5 text-left transition-all duration-300 flex items-center justify-between group/opt
                                        ${isSelected
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-white/40 hover:bg-white/5 hover:text-white'
                                        }
                                    `}
                                >
                                    <span className={`text-xs font-bold tracking-wide transition-all duration-300 ${isSelected ? 'translate-x-1' : 'group-hover/opt:translate-x-1'}`}>
                                        {option.label && !isUUID(option.label) ? option.label : `Coach (${String(option.value).substring(0, 4)})`}
                                    </span>
                                    {isSelected && (
                                        <Check className="w-3 h-3 text-primary animate-in zoom-in duration-300" />
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

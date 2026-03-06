import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface PremiumClockProps {
    className?: string;
}

export default function PremiumClock({ className = "" }: PremiumClockProps) {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = format(time, 'HH');
    const minutes = format(time, 'mm');
    const seconds = format(time, 'ss');
    const amPm = format(time, 'aaa');

    return (
        <div className={`inline-flex items-center gap-4 ${className}`}>
            {/* Time Section */}
            <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-light text-white tracking-tight leading-none">
                    {hours}
                </span>
                <span className="text-primary/40 font-thin text-2xl leading-none animate-pulse">:</span>
                <span className="text-3xl font-light text-white tracking-tight leading-none">
                    {minutes}
                </span>
                <div className="flex flex-col ml-1">
                    <span className="text-[9px] font-black text-primary/80 uppercase tracking-[0.2em] leading-none mb-0.5">
                        {amPm}
                    </span>
                    <span className="text-[8px] font-medium text-white/20 tracking-tighter leading-none">
                        {seconds}s
                    </span>
                </div>
            </div>

            {/* Elegant Separator */}
            <div className="w-px h-8 bg-white/10" />

            {/* Date Section */}
            <div className="flex flex-col justify-center">
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-[0.2em] leading-none mb-1">
                    {format(time, 'EEEE')}
                </span>
                <span className="text-[9px] font-medium text-white/30 uppercase tracking-widest leading-none">
                    {format(time, 'MMM dd, yyyy')}
                </span>
            </div>
        </div>
    );
}

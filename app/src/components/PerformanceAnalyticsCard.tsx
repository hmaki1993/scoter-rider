import React from 'react';

interface Segment {
    label: string;
    value: number;
    color: string;
}

interface PerformanceAnalyticsCardProps {
    title: string;
    totalLabel: string;
    totalValue: string | number;
    segments: Segment[];
    activeSegmentLabel?: string;
    activeSegmentValue?: string | number;
}

export default function PerformanceAnalyticsCard({
    title,
    totalLabel,
    totalValue,
    segments,
    activeSegmentLabel,
    activeSegmentValue
}: PerformanceAnalyticsCardProps) {

    // Half-donut SVG Logic
    const size = 300;
    const radius = 120;
    const strokeWidth = 35;
    const center = size / 2;
    const circumference = Math.PI * radius; // Semi-circle circumference

    let currentOffset = 0;
    const totalSegmentsValue = segments.reduce((sum, s) => sum + s.value, 0);

    return (
        <div className="bg-surface-border/10 backdrop-blur-3xl rounded-[2.5rem] p-8 h-full flex flex-col justify-between border border-surface-border relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <h3 className="text-xl font-black text-base tracking-tight">{title}</h3>
                <div className="flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-current"></div>)}
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">{totalLabel}</p>
                <h2 className="text-5xl font-black text-base tracking-tighter mb-4">{totalValue}</h2>

                {/* Arc Visualization */}
                <div className="relative w-full max-w-[280px] aspect-[2/1] mt-4">
                    <svg viewBox={`0 0 ${size} ${size / 2}`} className="w-full h-full overflow-visible">
                        {/* Background Arc */}
                        <path
                            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                            fill="none"
                            stroke="currentColor"
                            strokeOpacity="0.05"
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                        />

                        {/* Segment Arcs */}
                        {segments.map((segment, i) => {
                            const segmentLength = (segment.value / totalSegmentsValue) * circumference;
                            const dashArray = `${segmentLength} ${circumference * 2}`;
                            const dashOffset = -currentOffset;
                            currentOffset += segmentLength;

                            return (
                                <path
                                    key={i}
                                    d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            );
                        })}

                        {/* Pointer / Active Badge Overlay */}
                        {(activeSegmentLabel || activeSegmentValue) && (
                            <foreignObject x={center - 60} y={center - 70} width="120" height="60">
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="bg-surface-border/20 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-surface-border flex flex-col items-center">
                                        <span className="text-[11px] font-black text-base">{activeSegmentValue}</span>
                                        <span className="text-[8px] font-black text-muted uppercase tracking-tighter">{activeSegmentLabel}</span>
                                    </div>
                                </div>
                            </foreignObject>
                        )}
                    </svg>
                </div>
            </div>

            {/* Bottom dots etc. */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 opacity-10">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-current"></div>)}
            </div>
        </div>
    );
}

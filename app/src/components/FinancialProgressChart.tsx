import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FinancialData {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    students: number;
    ptSessions: number;
}

interface FinancialProgressChartProps {
    data: FinancialData[];
    currencyCode: string;
}

export default function FinancialProgressChart({ data, currencyCode }: FinancialProgressChartProps) {
    const { t } = useTranslation();

    if (!data || data.length === 0) {
        return (
            <div className="h-48 flex flex-col items-center justify-center text-muted border-2 border-dashed border-surface-border rounded-[2rem] bg-surface-border/10">
                <Activity className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-[9px] font-black uppercase tracking-widest text-muted">Loading Trends...</p>
            </div>
        );
    }

    const maxProfit = Math.max(...data.map(d => Math.abs(d.profit)), 1000);

    // SVG Drawing helpers (Compact)
    const width = 1000;
    const height = 300;
    const paddingX = 40;
    const paddingY = 40;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const getX = (index: number) => paddingX + (index * (chartWidth / (data.length - 1)));
    const getY = (value: number) => {
        const zeroY = paddingY + chartHeight * 0.7; // Lower baseline for growth focus
        const scale = (chartHeight * 0.6) / maxProfit;
        return zeroY - (value * scale);
    };

    const profitPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.profit)}`).join(' ');

    const currentProfit = data[data.length - 1].profit;
    const previousProfit = data[data.length - 2]?.profit || 0;
    const profitGrowth = previousProfit !== 0 ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100 : 100;

    return (
        <div className="space-y-4">
            {/* Minimal Header */}
            <div className="flex items-end justify-between px-2">
                <div>
                    <h3 className="text-3xl font-black text-base tracking-tighter">
                        {currentProfit.toLocaleString()} <span className="text-xs opacity-30 font-bold">{currencyCode}</span>
                    </h3>
                    <p className="text-[9px] font-black text-muted uppercase tracking-widest mt-0.5">Monthly Yield</p>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${profitGrowth >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {profitGrowth >= 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                    {Math.abs(profitGrowth).toFixed(1)}%
                </div>
            </div>

            {/* Neutral Chart Container */}
            <div className="relative h-[220px] w-full overflow-hidden p-6 group mt-4">
                {/* Decorative Elements */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 opacity-20">
                    {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-current"></div>)}
                </div>

                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    {/* Horizontal Grid Lines */}
                    {[0, 0.5, 1].map((p) => {
                        const y = paddingY + (chartHeight * p);
                        return (
                            <line
                                key={p}
                                x1={paddingX}
                                y1={y}
                                x2={width - paddingX}
                                y2={y}
                                stroke="#000"
                                strokeWidth="0.5"
                                strokeOpacity="0.03"
                            />
                        );
                    })}

                    {/* Smooth Line */}
                    <path
                        d={profitPath}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-chart-draw"
                    />

                    {/* Active Point Interaction */}
                    {data.map((d, i) => (
                        <g key={i} className="group/point">
                            <circle
                                cx={getX(i)}
                                cy={getY(d.profit)}
                                r="4"
                                fill="var(--color-primary)"
                                className="transition-all group-hover/point:r-6 cursor-pointer"
                            />
                            {i === data.length - 1 && (
                                <g>
                                    <circle cx={getX(i)} cy={getY(d.profit)} r="8" fill="var(--color-primary)" fillOpacity="0.15" className="animate-pulse" />
                                    {/* Final Point Value Badge (Always visible on last) */}
                                    <rect x={getX(i) - 35} y={getY(d.profit) - 35} width="70" height="24" rx="12" fill="var(--color-primary)" />
                                    <text x={getX(i)} y={getY(d.profit) - 19} fill="white" textAnchor="middle" className="text-[10px] font-black tracking-tight">{d.profit.toLocaleString()}</text>
                                </g>
                            )}
                            <text
                                x={getX(i)}
                                y={height - 5}
                                fill="currentColor"
                                fillOpacity="0.4"
                                textAnchor="middle"
                                className="text-[10px] font-black uppercase tracking-widest"
                            >
                                {d.month.substring(0, 3)}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes chart-draw {
                    from { stroke-dasharray: 0 2000; }
                    to { stroke-dasharray: 2000 0; }
                }
                .animate-chart-draw {
                    animation: chart-draw 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
            `}} />
        </div>
    );
}

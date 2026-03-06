import { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    subtitle?: string;
    titleSuffix?: ReactNode;
    children?: ReactNode; // Right-side actions
}

export default function PageHeader({ title, subtitle, titleSuffix, children }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-surface-border pb-6 mb-2">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-black text-base uppercase tracking-tighter">
                        <span className="premium-gradient-text !from-current !to-current/70">
                            {title}
                        </span>
                        <span className="text-primary">.</span>
                    </h1>
                    {titleSuffix && (
                        <div className="flex items-center">
                            {titleSuffix}
                        </div>
                    )}
                </div>
                {subtitle && (
                    <p className="text-muted text-[9px] font-black tracking-[0.2em] uppercase flex items-center gap-2">
                        <span className="w-4 h-[1px] bg-primary/50 inline-block"></span>
                        {subtitle}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3 flex-wrap">
                    {children}
                </div>
            )}
        </div>
    );
}

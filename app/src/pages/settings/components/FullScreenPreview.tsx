import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layout, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoginRenderer } from './LoginRenderer';

interface FullScreenPreviewProps {
    show: boolean;
    onClose: () => void;
    previewSettings: any;
    designMode: 'desktop' | 'mobile';
}

export const FullScreenPreview: React.FC<FullScreenPreviewProps> = ({
    show,
    onClose,
    previewSettings,
    designMode
}) => {
    const { t, i18n } = useTranslation();

    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [show]);

    if (!show) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col overflow-hidden">
            {/* Minimal Header Controls */}
            <div className="absolute top-6 left-6 z-[1001] flex items-center gap-4 bg-black/40 backdrop-blur-md p-2 pl-4 pr-4 rounded-2xl border border-white/5 shadow-2xl group transition-all hover:bg-black/60">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        {designMode === 'desktop' ? (
                            <Monitor className="w-4 h-4 text-[#D4AF37]" />
                        ) : (
                            <Layout className="w-4 h-4 text-[#D4AF37]" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Full Screen Preview</span>
                    </div>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-tight">Pixel-Perfect 1:1 Rendering</span>
                </div>
            </div>

            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-[1001] bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase text-white/70 hover:text-white flex items-center gap-2 border border-white/5 transition-all hover:bg-rose-500/20 hover:border-rose-500/20"
            >
                <X className="w-4 h-4" />
                Exit Preview
            </button>

            {/* Rendering Engine Stage */}
            <div className="flex-1 w-full h-full relative p-0 overflow-hidden">
                <LoginRenderer
                    activeSettings={previewSettings}
                    designMode={designMode}
                    t={t}
                    i18n={i18n}
                    isPreview={true}
                    isFullScreen={true}
                />
            </div>
        </div>,
        document.body
    );
};

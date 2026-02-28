import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    History, X, Loader2, Upload, Check, Wand2,
    Sparkles, Scissors, Circle, Maximize,
    MousePointer2, Layout
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { PremiumConfirmModal } from './SharedUI';

export function LogoHistoryModal({ isOpen, onClose, history, isLoading, onSelect, onDelete }: any) {
    const [selectedLogos, setSelectedLogos] = useState<string[]>([]);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (!isOpen) {
            setSelectedLogos([]);
        }
    }, [isOpen]);

    const handleDeleteLogo = async (logoName: string) => {
        await onDelete(logoName);
        setSelectedLogos(prev => prev.filter(name => name !== logoName));
    };

    const handleBulkDeleteLogos = async (logoNames: string[]) => {
        for (const name of logoNames) {
            await onDelete(name);
        }
        setSelectedLogos([]);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative glass-card w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] overflow-hidden border-0 sm:border sm:border-white/10 sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Logo Library</h3>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Manage previously uploaded assets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Syncing Storage...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[2rem]">
                            <Upload className="w-8 h-8 text-white/10" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No images found in library</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6 px-2 sticky top-0 z-10 bg-black/20 backdrop-blur-sm py-2 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            if (selectedLogos.length === history.length) setSelectedLogos([]);
                                            else setSelectedLogos(history.map((h: any) => h.name));
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                    >
                                        {selectedLogos.length === history.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">|</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{selectedLogos.length} Selected</span>
                                </div>

                                {selectedLogos.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Bulk Delete',
                                                message: `Are you sure you want to delete ${selectedLogos.length} assets? This cannot be undone.`,
                                                type: 'destructive',
                                                onConfirm: () => {
                                                    handleBulkDeleteLogos(selectedLogos);
                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                }
                                            });
                                        }}
                                        className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                                {history.map((item: any) => {
                                    const isSelected = selectedLogos.includes(item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            className={`group/item relative aspect-square rounded-2xl sm:rounded-3xl bg-black/40 border transition-all duration-300 overflow-hidden cursor-pointer ${isSelected ? 'border-primary ring-4 ring-primary/20 shadow-2xl scale-[0.98]' : 'border-white/5 hover:border-white/20 hover:bg-black/60 shadow-xl'}`}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSelected) setSelectedLogos(prev => prev.filter(n => n !== item.name));
                                                    else setSelectedLogos(prev => [...prev, item.name]);
                                                }}
                                                className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-30 w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${isSelected ? 'bg-primary border-primary scale-110 shadow-lg' : 'bg-black/40 border-white/20 scale-100'}`}
                                            >
                                                {isSelected && <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" />}
                                            </div>

                                            <div
                                                className="absolute inset-0 p-3 sm:p-4 flex items-center justify-center"
                                                onClick={() => onSelect(item.url)}
                                                style={{
                                                    backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                                                    backgroundSize: '16px 16px',
                                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                                    backgroundColor: '#1a1a1a'
                                                }}
                                            >
                                                <img src={item.url} alt={item.name} className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform duration-500 pointer-events-none drop-shadow-2xl" />
                                            </div>

                                            {/* Action Overlay: Bottom-weighted for visibility */}
                                            <div className="absolute inset-0 sm:bg-black/80 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-all duration-300 flex flex-col justify-end z-10">
                                                <div className="p-1.5 sm:p-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent sm:from-transparent backdrop-blur-[2px] sm:backdrop-blur-sm flex flex-col gap-1 sm:gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelect(item.url);
                                                        }}
                                                        className="w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-primary text-white text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg order-1"
                                                    >
                                                        Select
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Delete Asset',
                                                                message: 'Delete this image permanently?',
                                                                type: 'destructive',
                                                                onConfirm: () => {
                                                                    handleDeleteLogo(item.name);
                                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                }
                                                            });
                                                        }}
                                                        className="w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-rose-500/20 text-rose-500 text-[8px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all order-2"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-center">
                    <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Master Logo sync is enabled globally</p>
                </div>
            </div>
            <PremiumConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
            />
        </div>,
        document.body
    );
}

export function BgHistoryModal({ isOpen, onClose, history, isLoading, onSelect, onDelete }: any) {
    const [selectedBgs, setSelectedBgs] = useState<string[]>([]);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (!isOpen) {
            setSelectedBgs([]);
        }
    }, [isOpen]);

    const handleDeleteBg = async (bgName: string) => {
        await onDelete(bgName);
        setSelectedBgs(prev => prev.filter(name => name !== bgName));
    };

    const handleBulkDeleteBgs = async (bgNames: string[]) => {
        for (const name of bgNames) {
            await onDelete(name);
        }
        setSelectedBgs([]);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative glass-card w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[85vh] overflow-hidden border-0 sm:border sm:border-white/10 sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Background Library</h3>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Manage login page environments</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Loading History...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[2rem]">
                            <Layout className="w-8 h-8 text-white/10" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No backgrounds in library</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6 px-2 sticky top-0 z-10 bg-black/20 backdrop-blur-sm py-2 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            if (selectedBgs.length === history.length) setSelectedBgs([]);
                                            else setSelectedBgs(history.map((h: any) => h.name));
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
                                    >
                                        {selectedBgs.length === history.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">|</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{selectedBgs.length} Selected</span>
                                </div>

                                {selectedBgs.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Bulk Delete',
                                                message: `Are you sure you want to delete ${selectedBgs.length} backgrounds? This cannot be undone.`,
                                                type: 'destructive',
                                                onConfirm: () => {
                                                    handleBulkDeleteBgs(selectedBgs);
                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                }
                                            });
                                        }}
                                        className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {history.map((item: any) => {
                                    const isSelected = selectedBgs.includes(item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            className={`group/item relative aspect-video rounded-2xl sm:rounded-3xl bg-black/40 border transition-all duration-300 overflow-hidden cursor-pointer ${isSelected ? 'border-amber-500 ring-4 ring-amber-500/20 shadow-2xl scale-[0.98]' : 'border-white/5 hover:border-white/20 hover:bg-black/60 shadow-xl'}`}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSelected) setSelectedBgs(prev => prev.filter(n => n !== item.name));
                                                    else setSelectedBgs(prev => [...prev, item.name]);
                                                }}
                                                className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-30 w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${isSelected ? 'bg-amber-500 border-amber-500 scale-110 shadow-lg' : 'bg-black/40 border-white/20 scale-100'}`}
                                            >
                                                {isSelected && <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" />}
                                            </div>

                                            <div className="absolute inset-0" onClick={() => onSelect(item.url)}>
                                                <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500 pointer-events-none opacity-60" />
                                            </div>

                                            {/* Action Overlay for Backgrounds */}
                                            <div className="absolute inset-0 sm:bg-black/80 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-all duration-300 flex flex-col justify-end z-10">
                                                <div className="p-3 sm:p-4 bg-gradient-to-t from-black/90 to-transparent sm:from-transparent backdrop-blur-[2px] sm:backdrop-blur-sm flex flex-col sm:flex-row gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelect(item.url);
                                                        }}
                                                        className="flex-1 py-2 sm:py-2 rounded-xl bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg order-1"
                                                    >
                                                        Select
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Delete Asset',
                                                                message: 'Delete this background permanently?',
                                                                type: 'destructive',
                                                                onConfirm: () => {
                                                                    handleDeleteBg(item.name);
                                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                }
                                                            });
                                                        }}
                                                        className="flex-1 py-2 sm:py-2 rounded-xl bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all order-2"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-center">
                    <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Backgrounds prefix: login_bg_</p>
                </div>
            </div>
            <PremiumConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
            />
        </div>,
        document.body
    );
}

export function LogoEditorModal({ isOpen, onClose, logo, onSave }: any) {
    const [canvasState, setCanvasState] = useState({
        isCircle: false,
        isRemovingBg: false,
        sensitivity: 30,
        zoom: 1,
        pan: { x: 0, y: 0 },
        feathering: 0,
        targetColor: null as { r: number, g: number, b: number } | null
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalImgRef = useRef<HTMLImageElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isPickingColor, setIsPickingColor] = useState(false);

    useEffect(() => {
        if (!isOpen || !logo) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = logo.url;
        img.onload = () => {
            originalImgRef.current = img;
            updateProcessedImage();
        };
    }, [isOpen, logo?.url]);

    const updateProcessedImage = () => {
        const img = originalImgRef.current;
        if (!img) return;

        if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
        }

        const buffer = offscreenCanvasRef.current;
        const ctx = buffer.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        buffer.width = 1200;
        buffer.height = 1200;

        ctx.clearRect(0, 0, buffer.width, buffer.height);

        const imgAspect = img.height / img.width;
        const drawWidth = 800;
        const drawHeight = drawWidth * imgAspect;
        ctx.drawImage(img, (buffer.width - drawWidth) / 2, (buffer.height - drawHeight) / 2, drawWidth, drawHeight);

        if (canvasState.isRemovingBg) {
            const imageData = ctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = imageData.data;
            const sens = canvasState.sensitivity;
            const feather = canvasState.feathering;
            const matchR = canvasState.targetColor?.r ?? 255;
            const matchG = canvasState.targetColor?.g ?? 255;
            const matchB = canvasState.targetColor?.b ?? 255;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue;

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const dist = Math.sqrt(
                    Math.pow(r - matchR, 2) +
                    Math.pow(g - matchG, 2) +
                    Math.pow(b - matchB, 2)
                );

                if (dist < sens * 2) {
                    const threshold = sens * 2;
                    if (feather > 0) {
                        const softEdge = feather * 2;
                        const alpha = Math.max(0, Math.min(1, (dist - (threshold - softEdge)) / softEdge));
                        data[i + 3] = data[i + 3] * alpha;
                    } else {
                        data[i + 3] = 0;
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }

        draw();
    };

    const draw = () => {
        const canvas = canvasRef.current;
        const buffer = offscreenCanvasRef.current;
        if (!canvas || !buffer) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1200;
        canvas.height = 1200;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2 + canvasState.pan.x, canvas.height / 2 + canvasState.pan.y);
        ctx.scale(canvasState.zoom, canvasState.zoom);
        ctx.drawImage(buffer, -buffer.width / 2, -buffer.height / 2);
        ctx.restore();

        if (canvasState.isCircle) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 400, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

    useEffect(() => {
        if (isOpen && originalImgRef.current) {
            updateProcessedImage();
        }
    }, [canvasState.isRemovingBg, canvasState.sensitivity, canvasState.feathering, canvasState.targetColor]);

    useEffect(() => {
        if (isOpen && offscreenCanvasRef.current) {
            draw();
        }
    }, [canvasState.zoom, canvasState.pan, canvasState.isCircle]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isPickingColor) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - canvasState.pan.x, y: e.clientY - canvasState.pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || isPickingColor) return;
        setCanvasState(prev => ({
            ...prev,
            pan: {
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            }
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!isPickingColor || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            setCanvasState(prev => ({
                ...prev,
                targetColor: { r: pixel[0], g: pixel[1], b: pixel[2] }
            }));
            setIsPickingColor(false);
        } catch (err) {
            console.error("Color pick error:", err);
            toast.error("Could not pick color from this region");
        }
    };

    const handleSave = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsProcessing(true);
        try {
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create blob');

            const fileName = `edited_logo_${Math.random().toString(36).substring(7)}.png`;
            const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, blob);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
            onSave(data.publicUrl);
        } catch (err: any) {
            toast.error('Failed to save: ' + (err.message || 'unknown error'));
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen || !logo) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 lg:p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose}></div>
            <div className="relative glass-card w-full h-full lg:h-auto lg:max-w-5xl lg:max-h-[90vh] overflow-hidden border-0 lg:border lg:border-white/10 lg:rounded-[3rem] shadow-premium flex flex-col animate-in zoom-in-95 duration-500">
                {/* Header and UI content for LogoEditorModal */}
                {/* ... (rest of the content from SettingsContainer.tsx) */}
                <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02] sticky top-0 z-20 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/10">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-tight">Advanced Logo Refiner</h3>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] mt-0.5 italic">Magic erasure • Shape masks • Identity sync</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
                        <X className="w-6 h-6 text-white/40 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                    </button>
                </div>
                {/* ... (full body content) ... */}
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    <div className="flex-1 bg-black/60 p-4 md:p-12 flex items-center justify-center relative overflow-hidden group min-h-[35vh] lg:min-h-0">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                        <div className="relative z-10 w-full h-full flex items-center justify-center">
                            {isProcessing && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[2rem]">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest animate-pulse">Refining...</span>
                                    </div>
                                </div>
                            )}
                            <div className={`relative p-2 sm:p-4 md:p-8 border border-white/5 bg-white/[0.02] rounded-[2rem] shadow-inner transition-all duration-500 overflow-hidden ${isPickingColor ? 'cursor-crosshair' : 'cursor-move'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleCanvasClick}>
                                <canvas ref={canvasRef} className="max-w-full max-h-[30vh] sm:max-h-[50vh] lg:max-h-[60vh] object-contain shadow-2xl rounded-lg" style={{ filter: 'drop-shadow(0 0 60px rgba(0,0,0,0.8))', backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', backgroundColor: '#1a1a1a' }} />
                                {isPickingColor && <div className="absolute top-4 left-4 right-4 p-3 bg-primary rounded-xl text-white text-[9px] font-black uppercase tracking-widest text-center shadow-xl animate-bounce">Click a color to remove it</div>}
                            </div>
                        </div>
                    </div>
                    <div className="w-full lg:w-[360px] bg-white/[0.02] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col overflow-y-auto">
                        <div className="flex-1 p-6 md:p-8 space-y-8 custom-scrollbar">
                            <section className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                                        AI-Enhanced Cleaning
                                    </h4>
                                    <div className="space-y-3">
                                        <button onClick={() => setCanvasState(prev => ({ ...prev, isRemovingBg: !prev.isRemovingBg, sensitivity: prev.isRemovingBg ? 30 : prev.sensitivity, feathering: prev.isRemovingBg ? 0 : prev.feathering, targetColor: prev.isRemovingBg ? null : prev.targetColor }))} className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${canvasState.isRemovingBg ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg transition-colors ${canvasState.isRemovingBg ? 'bg-white/20' : 'bg-primary/20'}`}>
                                                    <Scissors className={`w-4 h-4 ${canvasState.isRemovingBg ? 'text-white' : 'text-primary'}`} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={`block text-xs font-black uppercase tracking-widest transition-colors ${canvasState.isRemovingBg ? 'text-white' : 'text-white/80'}`}>Magic Eraser</span>
                                                    <span className={`block text-[7px] font-bold uppercase transition-colors ${canvasState.isRemovingBg ? 'text-white/60' : 'text-white/30'}`}>Remove White Backgrounds</span>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full relative transition-all ${canvasState.isRemovingBg ? 'bg-white/30' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${canvasState.isRemovingBg ? 'left-5 shadow-lg' : 'left-1'}`}></div>
                                            </div>
                                        </button>
                                        {canvasState.isRemovingBg && (
                                            <div className="p-5 bg-black/40 rounded-[2rem] border border-white/5 space-y-5 animate-in zoom-in-95 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <button onClick={() => setIsPickingColor(!isPickingColor)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isPickingColor ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                                                        <MousePointer2 className="w-3 h-3" />
                                                        {isPickingColor ? 'Selecting...' : 'Select Color'}
                                                    </button>
                                                    {canvasState.targetColor && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: `rgb(${canvasState.targetColor.r}, ${canvasState.targetColor.g}, ${canvasState.targetColor.b})` }}></div>
                                                            <button onClick={() => setCanvasState(prev => ({ ...prev, targetColor: null }))} className="text-white/20 hover:text-rose-500"><X className="w-3 h-3" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                        <span className="text-white/40">Tolerance</span>
                                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.sensitivity}%</span>
                                                    </div>
                                                    <input type="range" min="1" max="100" value={canvasState.sensitivity} onChange={(e) => setCanvasState(prev => ({ ...prev, sensitivity: parseInt(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                        <span className="text-white/40">Smooth Edges</span>
                                                        <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.feathering}%</span>
                                                    </div>
                                                    <input type="range" min="0" max="100" value={canvasState.feathering} onChange={(e) => setCanvasState(prev => ({ ...prev, feathering: parseInt(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <Maximize className="w-3 h-3 text-primary" />
                                        Identity Geometry
                                    </h4>
                                    <div className="space-y-3">
                                        <button onClick={() => setCanvasState(prev => ({ ...prev, isCircle: !prev.isCircle, zoom: 1, pan: { x: 0, y: 0 } }))} className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${canvasState.isCircle ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg transition-colors ${canvasState.isCircle ? 'bg-white/20' : 'bg-primary/20'}`}>
                                                    <Circle className={`w-4 h-4 ${canvasState.isCircle ? 'text-white' : 'text-primary'}`} />
                                                </div>
                                                <div className="text-left">
                                                    <span className={`block text-xs font-black uppercase tracking-widest transition-colors ${canvasState.isCircle ? 'text-white' : 'text-white/80'}`}>Circle Mask</span>
                                                    <span className={`block text-[7px] font-bold uppercase transition-colors ${canvasState.isCircle ? 'text-white/60' : 'text-white/30'}`}>Circular frame mask</span>
                                                </div>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full relative transition-all ${canvasState.isCircle ? 'bg-white/30' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${canvasState.isCircle ? 'left-5 shadow-lg' : 'left-1'}`}></div>
                                            </div>
                                        </button>
                                        <div className="p-5 bg-black/40 rounded-[2rem] border border-white/5 space-y-5">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                    <span className="text-white/40">Scale / Zoom</span>
                                                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{Math.round(canvasState.zoom * 100)}%</span>
                                                </div>
                                                <input type="range" min="0.1" max="3" step="0.01" value={canvasState.zoom} onChange={(e) => setCanvasState(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                            </div>
                                            <div className="flex items-center justify-center gap-4">
                                                <button onClick={() => setCanvasState(prev => ({ ...prev, pan: { x: 0, y: 0 }, zoom: 1 }))} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all">Reset Transform</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-black/40 space-y-4">
                            <button onClick={handleSave} disabled={isProcessing} className="w-full py-5 rounded-[2.5rem] bg-emerald-500 text-white text-[11px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 group disabled:opacity-50">Save & Apply Identity</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

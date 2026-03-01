import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    History, X, Loader2, Upload, Check, Wand2,
    Sparkles, Scissors, Circle, Maximize,
    MousePointer2, Layout, Eye, Sparkle,
    MoreVertical, Trash2, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { PremiumConfirmModal } from './SharedUI';

export function MediaLibraryModal({ isOpen, onClose, history, isLoading, onSelectLogo, onSelectBg, onEdit, onDelete, onUpload }: any) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: () => { }
    });

    useEffect(() => {
        if (!isOpen) {
            setSelectedItems([]);
            setMenuOpen(null);
        }
    }, [isOpen]);

    // Close menu on click away or scroll
    useEffect(() => {
        const closeMenu = () => setMenuOpen(null);
        window.addEventListener('click', closeMenu);
        window.addEventListener('scroll', closeMenu, true);
        return () => {
            window.removeEventListener('click', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, []);

    const handleDelete = async (name: string) => {
        await onDelete(name);
        setSelectedItems(prev => prev.filter(n => n !== name));
    };

    const handleBulkDelete = async (names: string[]) => {
        for (const name of names) {
            await onDelete(name);
        }
        setSelectedItems([]);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="relative glass-card w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[85vh] overflow-hidden border-0 sm:border sm:border-white/10 sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl text-primary">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">Media Library</h3>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Unified Assets Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-95 border border-primary/20 disabled:opacity-50"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span className="text-[10px] font-black uppercase tracking-widest">Upload New</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={async (e) => {
                                console.log('MediaLibrary: File input change detected');
                                const file = e.target.files?.[0];
                                if (file) {
                                    console.log('MediaLibrary: Selected file:', file.name, file.size);
                                    setIsUploading(true);
                                    try {
                                        await onUpload(file);
                                    } catch (err) {
                                        console.error('MediaLibrary: Upload callback error:', err);
                                    } finally {
                                        setIsUploading(false);
                                        if (e.target) e.target.value = '';
                                        console.log('MediaLibrary: Upload cycle complete');
                                    }
                                } else {
                                    console.log('MediaLibrary: No file selected');
                                }
                            }}
                        />
                        <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95">
                            <X className="w-5 h-5 text-white/40" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Syncing Library...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 rounded-[2rem]">
                            <Upload className="w-8 h-8 text-white/10" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No assets in library</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-6 px-2 sticky top-0 z-10 bg-black/20 backdrop-blur-sm py-2 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            if (selectedItems.length === history.length) setSelectedItems([]);
                                            else setSelectedItems(history.map((h: any) => h.name));
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                    >
                                        {selectedItems.length === history.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">|</span>
                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{selectedItems.length} Selected</span>
                                </div>

                                {selectedItems.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: 'Bulk Delete',
                                                message: `Are you sure you want to delete ${selectedItems.length} assets? This cannot be undone.`,
                                                type: 'destructive',
                                                onConfirm: () => {
                                                    handleBulkDelete(selectedItems);
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

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {history.map((item: any) => {
                                    const isSelected = selectedItems.includes(item.name);
                                    const isMenuOpen = menuOpen === item.name;
                                    return (
                                        <div
                                            key={item.name}
                                            className={`group/item relative aspect-square rounded-3xl bg-black/40 border transition-all duration-500 hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)] ${isSelected ? 'border-primary ring-4 ring-primary/20 scale-[0.98]' : 'border-white/5 hover:border-white/20 hover:bg-black/60 shadow-xl'}`}
                                        >
                                            {/* Selection Checkmark - Move to Left */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isSelected) setSelectedItems(prev => prev.filter(n => n !== item.name));
                                                    else setSelectedItems(prev => [...prev, item.name]);
                                                }}
                                                className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center cursor-pointer ${isSelected ? 'bg-primary border-primary scale-110 shadow-lg' : 'bg-black/40 border-white/20 scale-100 opacity-0 group-hover/item:opacity-100'}`}
                                            >
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>

                                            {/* Premium Dropdown Trigger */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpen(isMenuOpen ? null : item.name);
                                                }}
                                                className={`absolute top-3 right-3 z-40 p-2 rounded-xl transition-all duration-300 backdrop-blur-md border shadow-xl ${isMenuOpen ? 'bg-primary border-primary text-white scale-110' : 'bg-black/40 border-white/10 text-white/50 hover:text-white hover:border-white/30 opacity-0 group-hover/item:opacity-100 scale-90 group-hover/item:scale-100'}`}
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            <div
                                                className="absolute inset-0 p-4 flex items-center justify-center pointer-events-none"
                                                style={{
                                                    backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                                                    backgroundSize: '16px 16px',
                                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                                    backgroundColor: '#1a1a1a'
                                                }}
                                            >
                                                <img src={item.url} alt={item.name} className="max-w-[75%] max-h-[75%] object-contain group-hover/item:scale-110 transition-transform duration-700 pointer-events-none drop-shadow-2xl" />
                                            </div>

                                            {/* Premium Glass Dropdown */}
                                            {isMenuOpen && (
                                                <div
                                                    className="absolute top-14 right-3 z-[100] w-48 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 animate-in zoom-in-95 fade-in slide-in-from-top-2 duration-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            onSelectLogo(item.url);
                                                            onClose();
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/20 text-white/70 hover:text-primary transition-all group/btn"
                                                    >
                                                        <div className="p-2 rounded-lg bg-white/5 group-hover/btn:bg-primary/20 transition-colors">
                                                            <Sparkles className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Set as Logo</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            onSelectBg(item.url);
                                                            onClose();
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amber-500/20 text-white/70 hover:text-amber-500 transition-all group/btn"
                                                    >
                                                        <div className="p-2 rounded-lg bg-white/5 group-hover/btn:bg-amber-500/20 transition-colors">
                                                            <Layout className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Set as Background</span>
                                                    </button>

                                                    <div className="h-px bg-white/5 my-1.5 mx-2" />

                                                    <button
                                                        onClick={() => onEdit(item)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all group/btn"
                                                    >
                                                        <div className="p-2 rounded-lg bg-white/5 group-hover/btn:bg-white/10 transition-colors">
                                                            <Wand2 className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Edit Image</span>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                title: 'Delete Asset',
                                                                message: 'Delete this asset permanently?',
                                                                type: 'destructive',
                                                                onConfirm: () => {
                                                                    handleDelete(item.name);
                                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                }
                                                            });
                                                        }}
                                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-500 transition-all group/btn"
                                                    >
                                                        <div className="p-2 rounded-lg bg-white/5 group-hover/btn:bg-rose-500/20 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-center">
                    <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Assign any asset as Logo or Background instantly</p>
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
        feathering: 10,
        targetColor: null as { r: number, g: number, b: number } | null,
        bgColor: 'transparent',
        isContiguous: true,
        erosion: 0,
        showMask: true,
        shadowBlur: 0,
        shadowOpacity: 0.5,
        shadowColor: '#000000'
    });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const originalImgRef = useRef<HTMLImageElement | null>(null);
    const aiResultRef = useRef<HTMLImageElement | null>(null); // Stores the AI-removed result
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAIRemoving, setIsAIRemoving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [drawTick, setDrawTick] = useState(0);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isPickingColor, setIsPickingColor] = useState(false);

    useEffect(() => {
        if (!isOpen || !logo) return;
        // Reset AI result when new logo is loaded
        aiResultRef.current = null;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = logo.url;
        img.onload = () => {
            originalImgRef.current = img;
            updateProcessedImage();
        };
    }, [isOpen, logo?.url]);

    const updateProcessedImage = () => {
        // Use AI result if available, otherwise use the original image
        const sourceImg = aiResultRef.current ?? originalImgRef.current;
        if (!sourceImg) return;

        if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement('canvas');
        if (!processedCanvasRef.current) processedCanvasRef.current = document.createElement('canvas');
        const buffer = offscreenCanvasRef.current;
        const ctx = buffer.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        buffer.width = 1200;
        buffer.height = 1200;
        ctx.clearRect(0, 0, buffer.width, buffer.height);

        const imgAspect = sourceImg.height / sourceImg.width;
        const drawWidth = 800;
        const drawHeight = drawWidth * imgAspect;
        ctx.drawImage(sourceImg, (buffer.width - drawWidth) / 2, (buffer.height - drawHeight) / 2, drawWidth, drawHeight);

        if (canvasState.isRemovingBg && !aiResultRef.current) {
            // Only do manual removal if there's no AI result
            const imageData = ctx.getImageData(0, 0, buffer.width, buffer.height);
            const data = imageData.data;
            const w = imageData.width;
            const h = imageData.height;
            const sens = canvasState.sensitivity;
            const eros = canvasState.erosion;
            const matchR = canvasState.targetColor?.r ?? 255;
            const matchG = canvasState.targetColor?.g ?? 255;
            const matchB = canvasState.targetColor?.b ?? 255;
            const threshold = sens * 2.5;

            // Save a clean copy BEFORE modification for mask preview
            const originalPixels = new Uint8ClampedArray(data);

            const getColorDist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
                const rMean = (r1 + r2) / 2;
                const dr = r1 - r2;
                const dg = g1 - g2;
                const db = b1 - b2;
                return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
            };

            if (canvasState.isContiguous) {
                const visited = new Uint8Array(w * h);
                const stack: [number, number][] = [];
                for (let x = 0; x < w; x++) { stack.push([x, 0]); stack.push([x, h - 1]); }
                for (let y = 0; y < h; y++) { stack.push([0, y]); stack.push([w - 1, y]); }

                while (stack.length > 0) {
                    const [x, y] = stack.pop()!;
                    const idx = y * w + x;
                    if (visited[idx]) continue;
                    visited[idx] = 1;
                    const p = idx * 4;
                    const dist = getColorDist(data[p], data[p + 1], data[p + 2], matchR, matchG, matchB);
                    if (dist < threshold) {
                        data[p + 3] = 0;
                        if (x > 0) stack.push([x - 1, y]);
                        if (x < w - 1) stack.push([x + 1, y]);
                        if (y > 0) stack.push([x, y - 1]);
                        if (y < h - 1) stack.push([x, y + 1]);
                    }
                }
            } else {
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] === 0) continue;
                    const dist = getColorDist(data[i], data[i + 1], data[i + 2], matchR, matchG, matchB);
                    if (dist < threshold) data[i + 3] = 0;
                }
            }

            // ALPHA EROSION
            if (eros > 0) {
                const tempData = new Uint8ClampedArray(data);
                for (let y = eros; y < h - eros; y++) {
                    for (let x = eros; x < w - eros; x++) {
                        const i = (y * w + x) * 4;
                        if (tempData[i + 3] === 0) continue;
                        let shouldErode = false;
                        for (let dy = -eros; dy <= eros && !shouldErode; dy++) {
                            for (let dx = -eros; dx <= eros && !shouldErode; dx++) {
                                if (tempData[((y + dy) * w + (x + dx)) * 4 + 3] === 0) shouldErode = true;
                            }
                        }
                        if (shouldErode) data[i + 3] = 0;
                    }
                }
            }

            // MASK PREVIEW using clean copy
            if (canvasState.showMask) {
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] === 0) {
                        // Was removed -> show in red
                        data[i] = 255;
                        data[i + 1] = 0;
                        data[i + 2] = 0;
                        data[i + 3] = 150;
                    } else {
                        // Kept -> show original
                        data[i] = originalPixels[i];
                        data[i + 1] = originalPixels[i + 1];
                        data[i + 2] = originalPixels[i + 2];
                        data[i + 3] = originalPixels[i + 3];
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }

        const processedCanvas = processedCanvasRef.current;
        const processedCtx = processedCanvas?.getContext('2d', { willReadFrequently: true });
        if (processedCanvas && processedCtx) {
            processedCanvas.width = buffer.width;
            processedCanvas.height = buffer.height;
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);

            const feather = canvasState.feathering;
            if (feather > 0) {
                processedCtx.filter = `blur(${feather}px)`;
                processedCtx.drawImage(buffer, 0, 0);
                processedCtx.filter = 'none';
            } else {
                processedCtx.drawImage(buffer, 0, 0);
            }
        }

        draw();
    };

    const handleAIRemove = async () => {
        if (!originalImgRef.current || isAIRemoving) return;

        setIsAIRemoving(true);
        const loadingToast = toast.loading('✨ Removing background with remove.bg AI...', {
            style: {
                background: '#1e1e2f',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
            }
        });

        try {
            // Step 1: Fetch the original image as a blob
            const imgResponse = await fetch(originalImgRef.current.src);
            if (!imgResponse.ok) throw new Error('Failed to fetch logo image');
            const imageBlob = await imgResponse.blob();

            // Step 2: Send to our Supabase Edge Function (which calls remove.bg server-side)
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
            const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const formData = new FormData();
            formData.append('image_file', imageBlob, 'logo.png');

            const response = await fetch(`${SUPABASE_URL}/functions/v1/remove-bg`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errData.error ?? `API error ${response.status}`);
            }

            // Step 3: Get clean transparent PNG back
            const resultBlob = await response.blob();

            // Load the result blob as an image
            const url = URL.createObjectURL(resultBlob);
            const aiImg = new Image();
            aiImg.src = url;
            await new Promise<void>((resolve, reject) => {
                aiImg.onload = () => resolve();
                aiImg.onerror = reject;
            });

            // Store the AI result separately — do NOT overwrite the original
            aiResultRef.current = aiImg;

            // Now directly render the AI result to processedCanvasRef
            if (!processedCanvasRef.current) processedCanvasRef.current = document.createElement('canvas');
            const pc = processedCanvasRef.current;
            const pCtx = pc.getContext('2d', { willReadFrequently: true });
            if (pc && pCtx) {
                pc.width = 1200;
                pc.height = 1200;
                pCtx.clearRect(0, 0, pc.width, pc.height);

                // Center the AI result
                const aspect = aiImg.height / aiImg.width;
                const drawW = 800;
                const drawH = drawW * aspect;
                pCtx.drawImage(aiImg, (pc.width - drawW) / 2, (pc.height - drawH) / 2, drawW, drawH);

                // === POST-AI CLEANUP PASSES ===
                const imageData = pCtx.getImageData(0, 0, pc.width, pc.height);
                const data = imageData.data;
                const w = pc.width;
                const h = pc.height;

                // PASS 1: Kill near-invisible pixels
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 15) data[i + 3] = 0;
                }

                // PASS 2: White Matte Despill (Professional Defringe)
                // The AI model composites the logo over a white background internally.
                // This means edge pixels are contaminated with white: pixel = logo + white*(1-a)
                // We REVERSE this: logo_color = (pixel - white*(1-alpha)) / alpha
                for (let i = 0; i < data.length; i += 4) {
                    const a = data[i + 3];
                    if (a === 0 || a === 255) continue; // skip fully transparent or fully opaque
                    const fa = a / 255; // normalized alpha 0..1
                    // Background assumed white (255, 255, 255)
                    // Despill: true_color = (composited - bg * (1 - fa)) / fa
                    data[i] = Math.max(0, Math.min(255, (data[i] - 255 * (1 - fa)) / fa));
                    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 255 * (1 - fa)) / fa));
                    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 255 * (1 - fa)) / fa));
                }

                if (canvasState.erosion > 0) {
                    const eros = canvasState.erosion;
                    const tempData = new Uint8ClampedArray(data);
                    for (let y = eros; y < h - eros; y++) {
                        for (let x = eros; x < w - eros; x++) {
                            const i = (y * w + x) * 4;
                            if (tempData[i + 3] === 0) continue;
                            let shouldErode = false;
                            for (let dy = -eros; dy <= eros && !shouldErode; dy++) {
                                for (let dx = -eros; dx <= eros && !shouldErode; dx++) {
                                    if (tempData[((y + dy) * w + (x + dx)) * 4 + 3] === 0) shouldErode = true;
                                }
                            }
                            if (shouldErode) data[i + 3] = 0;
                        }
                    }
                }

                pCtx.putImageData(imageData, 0, 0);
            }

            // Also copy to offscreenCanvasRef so feathering pipeline works
            if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement('canvas');
            const buf = offscreenCanvasRef.current;
            const bufCtx = buf.getContext('2d', { willReadFrequently: true });
            if (buf && bufCtx) {
                buf.width = pc.width;
                buf.height = pc.height;
                bufCtx.clearRect(0, 0, buf.width, buf.height);
                bufCtx.drawImage(pc, 0, 0);
            }

            // Trigger a redraw
            draw();
            setDrawTick(t => t + 1);

            toast.success('✨ Background removed by AI!', { id: loadingToast });
        } catch (error) {
            console.error('[AI Remove Error]', error);
            toast.error('AI removal failed. Please try manual mode.', { id: loadingToast });
        } finally {
            setIsAIRemoving(false);
        }
    };

    const draw = () => {
        const canvas = canvasRef.current; // This is the visible canvas
        const processedCanvas = processedCanvasRef.current; // This holds the processed image data
        if (!canvas || !processedCanvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1200;
        canvas.height = 1200;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background if not transparent
        if (canvasState.bgColor !== 'transparent') {
            ctx.fillStyle = canvasState.bgColor.replace('#primary', '#6366f1');
            if (canvasState.isCircle) {
                ctx.beginPath();
                ctx.arc(canvas.width / 2, canvas.height / 2, 400, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        ctx.save();
        ctx.translate(canvas.width / 2 + canvasState.pan.x, canvas.height / 2 + canvasState.pan.y);
        ctx.scale(canvasState.zoom, canvasState.zoom);

        // APPLY STUDIO SHADOWS
        if (canvasState.shadowBlur > 0) {
            ctx.shadowBlur = canvasState.shadowBlur;
            // Convert hex to rgba for shadowColor
            const r = parseInt(canvasState.shadowColor.slice(1, 3), 16);
            const g = parseInt(canvasState.shadowColor.slice(3, 5), 16);
            const b = parseInt(canvasState.shadowColor.slice(5, 7), 16);
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${canvasState.shadowOpacity})`;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4; // A slight offset for a more natural shadow
        }

        ctx.drawImage(processedCanvas, -processedCanvas.width / 2, -processedCanvas.height / 2);
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
            // Reset AI result on setting changes so manual controls work
            aiResultRef.current = null;
            updateProcessedImage();
        }
    }, [canvasState.isRemovingBg, canvasState.sensitivity, canvasState.feathering, canvasState.targetColor, canvasState.isContiguous, canvasState.erosion, canvasState.showMask]);

    useEffect(() => {
        if (isOpen) draw();
    }, [canvasState.zoom, canvasState.pan, canvasState.isCircle, canvasState.bgColor, canvasState.shadowBlur, canvasState.shadowOpacity, canvasState.shadowColor, drawTick]);

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

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isPickingColor || e.touches.length !== 1) return;
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - canvasState.pan.x, y: touch.clientY - canvasState.pan.y });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || isPickingColor || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setCanvasState(prev => ({
            ...prev,
            pan: {
                x: touch.clientX - dragStart.x,
                y: touch.clientY - dragStart.y
            }
        }));
    };

    const handleTouchEnd = () => {
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
                            <div className={`relative p-2 sm:p-4 md:p-8 border border-white/5 bg-white/[0.02] rounded-[2rem] shadow-inner transition-all duration-500 overflow-hidden ${isPickingColor ? 'cursor-crosshair' : 'cursor-move'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={handleCanvasClick}>
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
                                                <div className="space-y-4">
                                                    <button
                                                        onClick={handleAIRemove}
                                                        disabled={isAIRemoving}
                                                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${isAIRemoving ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30 hover:border-indigo-400 hover:scale-[1.02]'}`}
                                                    >
                                                        {isAIRemoving && (
                                                            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
                                                        )}
                                                        <div className="flex items-center gap-3 relative z-10">
                                                            <div className={`p-2 rounded-xl ${isAIRemoving ? 'bg-indigo-500/40 animate-spin' : 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20'}`}>
                                                                {isAIRemoving ? <Loader2 className="w-4 h-4 text-white" /> : <Sparkle className="w-4 h-4 text-white" />}
                                                            </div>
                                                            <div className="text-left">
                                                                <span className="block text-[10px] font-black uppercase tracking-widest text-white">✨ Magic AI Remove</span>
                                                                <span className="block text-[7px] font-bold text-white/40 uppercase tracking-wider">World-Class (remove.bg quality)</span>
                                                            </div>
                                                        </div>
                                                        {!isAIRemoving && <Check className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />}
                                                    </button>

                                                    <div className="h-px bg-white/5 my-2" />
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            onClick={() => setCanvasState(prev => ({ ...prev, isContiguous: !prev.isContiguous }))}
                                                            className={`flex-1 mr-2 p-3 rounded-xl border transition-all flex items-center justify-between group ${canvasState.isContiguous ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/10'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <MousePointer2 className={`w-3 h-3 ${canvasState.isContiguous ? 'text-indigo-400' : 'text-white/20'}`} />
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Contiguous</span>
                                                            </div>
                                                            <div className={`w-6 h-3 rounded-full relative transition-all ${canvasState.isContiguous ? 'bg-indigo-500/40' : 'bg-white/10'}`}>
                                                                <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${canvasState.isContiguous ? 'left-3.5 shadow-lg' : 'left-0.5'}`}></div>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => setCanvasState(prev => ({ ...prev, showMask: !prev.showMask }))}
                                                            className={`flex-1 p-3 rounded-xl border transition-all flex items-center justify-between group ${canvasState.showMask ? 'bg-rose-500/20 border-rose-500/30' : 'bg-white/5 border-white/10'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Eye className={`w-3 h-3 ${canvasState.showMask ? 'text-rose-400' : 'text-white/20'}`} />
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Show Mask</span>
                                                            </div>
                                                            <div className={`w-6 h-3 rounded-full relative transition-all ${canvasState.showMask ? 'bg-rose-500/40' : 'bg-white/10'}`}>
                                                                <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${canvasState.showMask ? 'left-3.5 shadow-lg' : 'left-0.5'}`}></div>
                                                            </div>
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                            <span className="text-white/40">Tolerance (Color Range)</span>
                                                            <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.sensitivity}%</span>
                                                        </div>
                                                        <input type="range" min="1" max="100" value={canvasState.sensitivity} onChange={(e) => setCanvasState(prev => ({ ...prev, sensitivity: parseInt(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                                <span className="text-white/40">Smooth Edges</span>
                                                                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.feathering}%</span>
                                                            </div>
                                                            <input type="range" min="0" max="100" value={canvasState.feathering} onChange={(e) => setCanvasState(prev => ({ ...prev, feathering: parseInt(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                                <span className="text-white/40">Edge Erosion</span>
                                                                <span className="text-[#00f2fe] bg-[#00f2fe]/10 px-2 py-0.5 rounded-full">{canvasState.erosion}px</span>
                                                            </div>
                                                            <input type="range" min="0" max="5" step="1" value={canvasState.erosion} onChange={(e) => setCanvasState(prev => ({ ...prev, erosion: parseInt(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#00f2fe]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                        <Layout className="w-3 h-3 text-primary" />
                                        Studio Effects
                                    </h4>
                                    <div className="p-5 bg-black/40 rounded-[2rem] border border-white/5 space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                <span className="text-white/40">Drop Shadow Strength</span>
                                                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{canvasState.shadowBlur}px</span>
                                            </div>
                                            <input type="range" min="0" max="50" step="1" value={canvasState.shadowBlur} onChange={(e) => setCanvasState(prev => ({ ...prev, shadowBlur: parseInt(e.target.value) }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                        </div>

                                        <div className="space-y-4">
                                            <span className="block text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Background Presets</span>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    'transparent', '#ffffff', '#000000',
                                                    'linear-gradient(135deg, #1e1e2f 0%, #111119 100%)',
                                                    'linear-gradient(45deg, #primary 0%, #3b82f6 100%)',
                                                    'linear-gradient(to right, #00f2fe 0%, #4facfe 100%)',
                                                    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                    '#10b981'
                                                ].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setCanvasState(prev => ({ ...prev, bgColor: color }))}
                                                        className={`aspect-square rounded-xl border-2 transition-all ${canvasState.bgColor === color ? 'border-primary scale-110 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
                                                        style={{
                                                            background: color === 'transparent' ? 'none' : color.replace('#primary', '#6366f1'),
                                                            backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)' : color.includes('gradient') ? color.replace('#primary', '#6366f1') : 'none',
                                                            backgroundColor: color === 'transparent' ? 'transparent' : color.includes('gradient') ? 'transparent' : color,
                                                            backgroundSize: color === 'transparent' ? '8px 8px' : 'cover'
                                                        }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={canvasState.bgColor.startsWith('#') ? canvasState.bgColor : '#ffffff'}
                                                onChange={(e) => setCanvasState(prev => ({ ...prev, bgColor: e.target.value }))}
                                                className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                                            />
                                            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Custom Color</span>
                                        </div>
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
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                    <span className="text-white/40">Horizontal Position</span>
                                                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{Math.round(canvasState.pan.x)}px</span>
                                                </div>
                                                <input type="range" min="-600" max="600" step="1" value={canvasState.pan.x} onChange={(e) => setCanvasState(prev => ({ ...prev, pan: { ...prev.pan, x: parseInt(e.target.value) } }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                                    <span className="text-white/40">Vertical Position</span>
                                                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">{Math.round(canvasState.pan.y)}px</span>
                                                </div>
                                                <input type="range" min="-600" max="600" step="1" value={canvasState.pan.y} onChange={(e) => setCanvasState(prev => ({ ...prev, pan: { ...prev.pan, y: parseInt(e.target.value) } }))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />
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

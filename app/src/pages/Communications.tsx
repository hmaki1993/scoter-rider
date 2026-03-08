import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
// Agora types removed as they are now managed in CallContext
import {
    MessageSquare, Search, Phone, Video, MoreVertical, Send,
    Paperclip, Mic, Image as ImageIcon, X, Check, CheckCheck,
    PhoneCall, PhoneOff, PhoneMissed, Volume2, VolumeX,
    Camera, Users, Plus, ArrowLeft, Smile, Play, Pause,
    Loader2, Download, MicOff, VideoOff, Reply, Pin, Trash2,
    Archive, CheckSquare, Minimize2, Maximize2, RotateCcw, Type, Pencil, Crop,
    ArrowDownLeft, ArrowUpRight, UserPlus, Settings, ChevronLeft, Lock, LayoutDashboard
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useCall } from '../context/CallContext';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { playRecordStartSound, playMessageSentSound, playTypingTick } from '../utils/sounds';

// AGORA_APP_ID removed as it is now managed in CallContext

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
    id: string;
    full_name: string;
    role: string;
    avatar_url?: string;
    last_seen?: string;
    is_in_chat?: boolean;
}

interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content?: string;
    type: 'text' | 'image' | 'voice' | 'video' | 'call_event';
    media_url?: string;
    media_duration?: number;
    call_status?: string;
    call_duration?: number;
    call_type?: 'audio' | 'video';
    caller_id?: string;
    created_at: string;
    sender?: Profile;
    reply_to_id?: string;
    groupCount?: number;
    reply_to?: Message;
    is_pinned?: boolean;
    is_deleted?: boolean;
    deleted_for_users?: string[];
    delivered_at?: string;
    read_at?: string;
}

interface Conversation {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    avatar_url?: string;
    otherUser?: Profile;
    lastMessage?: Message;
    unreadCount: number;
    updated_at: string;
    is_hidden?: boolean;
    cleared_at?: string;
}

// ─── Voice Note Player Component ───────────────────────────────────────────────
const VoiceNotePlayer = ({ url, duration, sender, isOwn }: { url: string; duration?: number; sender?: Profile; isOwn: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef(0);
    const requestRef = useRef<number>();

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const [waveform, setWaveform] = useState<number[]>(() =>
        new Array(35).fill(0).map(() => 20 + Math.random() * 30)
    ); // Default to randomized heights for a "sound indicator" look

    // Fetch and decode audio to generate real waveform
    useEffect(() => {
        let isAborted = false;
        const bars = 35;

        async function analyzeAudio() {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                if (isAborted) return;

                const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
                const audioCtx = new AudioContextClass();
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                if (isAborted) return;

                const rawData = audioBuffer.getChannelData(0); // Get first channel
                const blockSize = Math.floor(rawData.length / bars);
                const heights = [];

                for (let i = 0; i < bars; i++) {
                    const start = i * blockSize;
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[start + j]);
                    }
                    // Calculate RMS-like value and scale to 30-100 range
                    const rms = sum / blockSize;
                    const scaled = Math.min(100, Math.max(30, rms * 800));
                    heights.push(scaled);
                }

                setWaveform(heights);
                audioCtx.close();
            } catch (err) {
                console.error("Waveform error:", err);
                // Fallback to varied bars if analysis fails
                setWaveform(new Array(bars).fill(0).map(() => 25 + Math.random() * 25));
            }
        }

        analyzeAudio();
        return () => { isAborted = true; };
    }, [url]);

    // Smooth progress update loop
    const updateProgress = useCallback(() => {
        if (!audioRef.current || isDragging) return;
        const audio = audioRef.current;
        if (!audio.duration || isNaN(audio.duration)) {
            requestRef.current = requestAnimationFrame(updateProgress);
            return;
        }
        const currentProgress = (audio.currentTime / audio.duration) * 100;
        progressRef.current = currentProgress;
        setProgress(currentProgress);
        setCurrentTime(audio.currentTime);
        if (isPlaying) {
            requestRef.current = requestAnimationFrame(updateProgress);
        }
    }, [isPlaying, isDragging]);

    useEffect(() => {
        if (isPlaying && !isDragging) {
            requestRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, isDragging, updateProgress]);

    const handleScrub = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const container = document.getElementById(`waveform-${url}`);
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newProgress = ratio * 100;
        setProgress(newProgress);
        if (audioRef.current && audioRef.current.duration) {
            setCurrentTime(ratio * audioRef.current.duration);
        }
    };

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent | TouchEvent) => handleScrub(e);
        const onEnd = () => {
            setIsDragging(false);
            if (audioRef.current && audioRef.current.duration) {
                audioRef.current.currentTime = (progress / 100) * audioRef.current.duration;
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging, progress]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onEnd = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };
        audio.addEventListener('ended', onEnd);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        return () => {
            audio.removeEventListener('ended', onEnd);
            audio.removeEventListener('play', () => setIsPlaying(true));
            audio.removeEventListener('pause', () => setIsPlaying(false));
        };
    }, []);

    return (
        <div className="flex items-center gap-2.5 min-w-[220px] max-w-[280px] select-none relative pb-4">
            <audio ref={audioRef} src={url} preload="metadata" />

            <button
                onClick={togglePlay}
                className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 flex-shrink-0 border border-white/10"
            >
                {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 text-white/90 fill-current" />
                ) : (
                    <Play className="w-3.5 h-3.5 text-white/90 fill-current ml-0.5" />
                )}
            </button>

            <div
                id={`waveform-${url}`}
                className="flex-1 h-8 flex items-center justify-between cursor-pointer relative group touch-none"
                onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); handleScrub(e); }}
                onTouchStart={(e) => { e.stopPropagation(); setIsDragging(true); handleScrub(e); }}
            >
                {waveform.map((h, i) => {
                    const barProgress = (i / (waveform.length - 1)) * 100;
                    const isActive = progress >= barProgress;
                    return (
                        <div
                            key={i}
                            className={`w-[2px] rounded-full transition-colors duration-200`}
                            style={{
                                height: `${h}%`,
                                backgroundColor: isActive ? 'var(--primary, #60a5fa)' : 'rgba(255,255,255,0.12)'
                            }}
                        />
                    );
                })}

                <div
                    className={`absolute top-1/2 w-2.5 h-2.5 bg-blue-400 rounded-full shadow-md z-10 transition-transform active:scale-150 ${isDragging ? 'scale-150' : 'group-hover:scale-125'}`}
                    style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                />

                <div className="absolute -bottom-3.5 left-0">
                    <span className="text-[10px] text-white/30 font-bold tracking-tight">
                        {formatTime(currentTime)}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── Message Bubble Component ───────────────────────────────────────────────────
const MessageBubble = ({
    msg, isOwn, currentUserId, onReply, onPin, isSelected, isSelectionMode, onSelect, onImageClick
}: {
    msg: Message; isOwn: boolean; currentUserId?: string;
    onReply?: (msg: Message) => void;
    onPin?: (msg: Message) => void;
    isSelected?: boolean;
    isSelectionMode?: boolean;
    onSelect?: (id: string) => void;
    onImageClick?: (url: string) => void;
}) => {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPressActive = useRef(false);
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const groupCountSuffix = msg.groupCount && msg.groupCount > 1 ? ` (${msg.groupCount})` : '';

    const handleStart = (clientX: number) => {
        startX.current = clientX;
        setIsDragging(true);
        isLongPressActive.current = false;

        // Long press for selection
        if (!isSelectionMode) {
            pressTimer.current = setTimeout(() => {
                onSelect?.(msg.id);
                isLongPressActive.current = true;
            }, 500);
        }
    };

    const handleMove = (clientX: number) => {
        if (!isDragging) return;
        const delta = clientX - startX.current;
        if (Math.abs(delta) > 10 && pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        // Limit drag to left (max -60px)
        const newX = Math.max(-60, Math.min(delta, 0));
        setDragX(newX);
    };

    const handleEnd = () => {
        if (pressTimer.current) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        if (dragX < -50) onReply?.(msg);
        setDragX(0);
        setIsDragging(false);
    };

    const handleClick = () => {
        if (isLongPressActive.current) return;
        if (isSelectionMode) onSelect?.(msg.id);
    };

    if (msg.type === 'call_event') {
        const isMissed = msg.call_status === 'missed';
        const isCaller = msg.caller_id === currentUserId;
        const callType = msg.call_type || 'audio';

        let label = '';
        if (isMissed) {
            label = isCaller ? (callType === 'video' ? 'Outgoing Video' : 'Outgoing Voice') : 'Missed Call';
        } else {
            label = isCaller
                ? (callType === 'video' ? 'Outgoing Video' : 'Outgoing Voice')
                : (callType === 'video' ? 'Incoming Video' : 'Incoming Voice');
        }

        const StatusIcon = isMissed
            ? (isCaller ? (callType === 'video' ? Video : Phone) : PhoneMissed)
            : (isCaller ? (callType === 'video' ? Video : Phone) : (callType === 'video' ? Video : PhoneCall));

        return (
            <div
                className={`flex items-center justify-center my-3 gap-3 group/call ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick={handleClick}
                onMouseDown={e => handleStart(e.clientX)}
                onMouseMove={e => handleMove(e.clientX)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={e => handleStart(e.touches[0].clientX)}
                onTouchMove={e => handleMove(e.touches[0].clientX)}
                onTouchEnd={handleEnd}
            >
                {isSelectionMode && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                )}

                <div
                    className={`
                        flex items-center gap-3 px-4 py-2 rounded-full
                        bg-white/[0.05] border border-white/10 backdrop-blur-md transition-all
                        hover:bg-white/[0.08] active:scale-95
                        ${isMissed && !isCaller ? 'border-red-500/20 bg-red-500/5' : ''}
                        ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-black' : ''}
                    `}
                    style={{ transform: `translateX(${dragX}px)` }}
                >
                    <div className={`
                        w-7 h-7 rounded-full flex items-center justify-center
                        ${isMissed && !isCaller ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/50'}
                    `}>
                        <StatusIcon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex flex-col leading-none">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-white">
                                {label}{groupCountSuffix}
                            </span>
                            {isCaller ? (
                                <ArrowUpRight className="w-3 h-3 text-primary" />
                            ) : (
                                <ArrowDownLeft className={`w-3 h-3 ${isMissed ? 'text-red-400' : 'text-emerald-400'}`} />
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[8px] font-black uppercase tracking-wider text-white/30">
                            <span>{timeStr}</span>
                            {msg.call_duration && (
                                <>
                                    <span>•</span>
                                    <span>{Math.floor(msg.call_duration / 60)}:{String(msg.call_duration % 60).padStart(2, '0')}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const bubbleRadius = isOwn
        ? 'rounded-2xl rounded-br-sm'
        : 'rounded-2xl rounded-bl-sm';

    return (
        <div
            className={`flex items-end gap-2 mb-4 transition-all duration-300 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
            onClick={handleClick}
            onMouseDown={e => handleStart(e.clientX)}
            onMouseMove={e => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={e => handleStart(e.touches[0].clientX)}
            onTouchMove={e => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
        >
            {/* Selection Checkbox */}
            {isSelectionMode && (
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mb-4 ${isSelected ? 'bg-primary border-primary' : 'border-white/20'}`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
            )}

            {/* Avatar - Hide for voice notes since it's rendered inside the VoiceNotePlayer */}
            <div className="w-7 h-7 flex-shrink-0">
                {!isOwn && msg.type !== 'voice' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-sm">
                        {msg.sender?.avatar_url ? (
                            <img src={msg.sender.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (msg.sender?.full_name?.[0] || '?')}
                    </div>
                )}
            </div>
            {/* Bubble */}
            <div className={`relative max-w-[75%] group ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>

                {/* Reply Preview */}
                {msg.reply_to && (
                    <div className={`mb-1 p-2 rounded-xl text-[11px] border-l-4 bg-white/5 border-primary/50 max-w-[200px] truncate ${isOwn ? 'mr-1' : 'ml-1'}`}>
                        <p className="font-black text-primary uppercase text-[8px] mb-0.5 tracking-widest">Replying to</p>
                        <p className="text-white/60 italic truncate">
                            {msg.reply_to.type === 'text' ? msg.reply_to.content : `[${msg.reply_to.type}] icon`}
                        </p>
                    </div>
                )}

                <div
                    className="relative flex items-center group/bubble transition-transform"
                    style={{ transform: `translateX(${dragX}px)` }}
                >
                    {/* Swipe Reply Icon Behind */}
                    <div
                        className="absolute left-full ml-4 opacity-0 transition-opacity flex items-center justify-center"
                        style={{ opacity: Math.abs(dragX) / 60 }}
                    >
                        <Reply className="w-5 h-5 text-primary" />
                    </div>

                    {/* Hover Actions */}
                    <div className={`
                        absolute top-1/2 -translate-y-1/2 flex items-center gap-1 transition-all opacity-0 group-hover/bubble:opacity-100 z-10
                        ${isOwn ? 'right-full mr-2 flex-row-reverse' : 'left-full ml-2'}
                    `}>
                        <button
                            onClick={() => onReply?.(msg)}
                            className="w-7 h-7 rounded-full bg-white/10 text-white/40 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-all"
                            title="Reply"
                        >
                            <Reply className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {msg.type === 'text' && (
                        <div className={`px-4 py-2.5 text-sm leading-normal font-medium shadow-lg relative break-words [overflow-wrap:anywhere] break-all transition-all duration-300 ${isOwn
                            ? 'bg-gradient-to-br from-primary to-accent text-white'
                            : 'bg-white/[0.06] text-white border border-white/10'
                            } ${bubbleRadius}`}>
                            {msg.content}
                            {msg.is_pinned && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg transform rotate-12">
                                    <Pin className="w-2 h-2 text-white fill-current" />
                                </div>
                            )}
                        </div>
                    )}
                    {msg.type === 'image' && msg.media_url && (
                        <div
                            className={`overflow-hidden shadow-xl max-w-[260px] relative transition-all duration-300 cursor-pointer ${bubbleRadius}`}
                            onClick={(e) => {
                                if (isSelectionMode) return;
                                e.stopPropagation();
                                onImageClick?.(msg.media_url!);
                            }}
                        >
                            <img src={msg.media_url} alt="Shared image" className="w-full h-auto object-cover block transition-transform duration-500" loading="lazy" />
                            {msg.is_pinned && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-yellow-500/80 backdrop-blur-md flex items-center justify-center shadow-lg">
                                    <Pin className="w-3 h-3 text-white fill-current" />
                                </div>
                            )}
                        </div>
                    )}
                    {msg.type === 'voice' && msg.media_url && (
                        <div className={`px-3 py-2 relative text-white transition-all duration-300 backdrop-blur-xl border shadow-lg ${isOwn ? 'bg-primary/[0.08] border-primary/10' : 'bg-white/[0.05] border-white/8'} ${bubbleRadius}`}>
                            <VoiceNotePlayer
                                url={msg.media_url}
                                duration={msg.media_duration}
                                sender={msg.sender}
                                isOwn={isOwn}
                            />
                            {/* Inner Bubble Timestamp */}
                            <div className="absolute bottom-1 right-2 flex items-center gap-1">
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">{timeStr}</span>
                                {isOwn && (
                                    <div className="flex items-center">
                                        {msg.read_at ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                        ) : msg.delivered_at ? (
                                            <CheckCheck className="w-3.5 h-3.5 text-white/40" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5 text-white/40" />
                                        )}
                                    </div>
                                )}
                            </div>
                            {msg.is_pinned && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
                                    <Pin className="w-2 h-2 text-white fill-current" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Hide global timestamp for voice messages since it's rendered inside the bubble */}
                {msg.type !== 'voice' && (
                    <span className={`text-[9px] text-white/20 font-black uppercase tracking-widest mt-1 animate-premium-in ${isOwn ? 'flex items-center gap-1.5 ml-auto' : 'mr-auto'}`}>
                        {timeStr}
                        {isOwn && (
                            <div className="flex items-center">
                                {msg.read_at ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                                ) : msg.delivered_at ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-white/40" />
                                ) : (
                                    <Check className="w-3.5 h-3.5 text-white/40" />
                                )}
                            </div>
                        )}
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteConfirmationModal = ({
    count,
    onCancel,
    onDeleteForMe,
    onDeleteForEveryone,
    canDeleteForEveryone
}: {
    count: number;
    onCancel: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
    canDeleteForEveryone: boolean;
}) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40">
            <div className="absolute inset-0" onClick={onCancel} />
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                        <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Delete {count} {count === 1 ? 'Message' : 'Messages'}?</h3>
                    <p className="text-white/40 text-sm mb-6">Choose how you want to remove these messages.</p>

                    <div className="flex flex-col gap-2 w-full">
                        <button
                            onClick={onDeleteForMe}
                            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all active:scale-95"
                        >
                            Delete for Me
                        </button>
                        {canDeleteForEveryone && (
                            <button
                                onClick={onDeleteForEveryone}
                                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all active:scale-95"
                            >
                                Delete for Everyone
                            </button>
                        )}
                        <button
                            onClick={onCancel}
                            className="w-full py-3 mt-1 text-white/40 hover:text-white font-medium transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};



// ─── Voice Recorder Component ──────────────────────────────────────────────────
// ─── Voice Recorder Component ──────────────────────────────────────────────────
const VoiceRecorder = ({ onRecordingComplete, onRecordingStateChange, portalTarget }: { onRecordingComplete: (blob: Blob, duration: number) => void; onRecordingStateChange?: (isRecording: boolean) => void; portalTarget?: HTMLElement | null }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [dragOffsetY, setDragOffsetY] = useState(0);
    const [isCancellingMode, setIsCancellingMode] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [showLockUI, setShowLockUI] = useState(false);
    const durationRef = useRef(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startXRef = useRef<number | null>(null);
    const startYRef = useRef<number | null>(null);
    const isCancelledRef = useRef(false);
    const isLockedRef = useRef(false);
    const isStopRequestedRef = useRef(false);

    // Audio visualization refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Maximum distance user can drag before triggering action
    const CANCEL_THRESHOLD = -120;
    const LOCK_THRESHOLD = -60;

    const startTimeRef = useRef<number | null>(null);

    const stopRecording = useCallback((e?: React.MouseEvent | React.TouchEvent | Event) => {
        if (e && 'cancelable' in e && e.cancelable) e.preventDefault();

        setIsRecording(curr => {
            if (!curr) return false;

            console.log('Stopping recording, isCancelled:', isCancelledRef.current);
            isStopRequestedRef.current = true;

            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                console.log('Stopping mediaRecorder');
                mediaRecorderRef.current.stop();
            }

            const cleanup = () => {
                setIsRecording(false);
                onRecordingStateChange?.(false);
                setRecordingTime(0);
                setDragOffset(0);
                setDragOffsetY(0);
                setIsCancellingMode(false);
                isCancelledRef.current = false;
                setIsLocked(false);
                isLockedRef.current = false;
                setShowLockUI(false);
            };

            if (isCancelledRef.current) {
                // Give time for the CSS animation of the trash can "eating" the mic
                setTimeout(cleanup, 300);
            } else {
                cleanup();
            }
            startXRef.current = null;
            startYRef.current = null;
            return false;
        });
    }, [onRecordingStateChange]);

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (startXRef.current === null || startYRef.current === null || isLockedRef.current) return;

        const newOffsetX = clientX - startXRef.current;
        const newOffsetY = clientY - startYRef.current;

        // Swipe up to lock
        if (newOffsetY < -10 && Math.abs(newOffsetX) < 30) {
            setDragOffsetY(newOffsetY);
            setShowLockUI(true);
            if (newOffsetY <= LOCK_THRESHOLD) {
                isLockedRef.current = true;
                setIsLocked(true);
                if ('vibrate' in navigator) navigator.vibrate(50);
                setDragOffsetY(0);
                setDragOffset(0);
                setTimeout(() => setShowLockUI(false), 800);
            }
        }
        // Swipe left to cancel
        else if (newOffsetX < 0 && Math.abs(newOffsetY) < 30) {
            setDragOffset(newOffsetX);

            // Highlight the trash can if close to the threshold
            if (newOffsetX <= CANCEL_THRESHOLD + 20) {
                if (!isCancellingMode) {
                    if ('vibrate' in navigator) navigator.vibrate(50);
                }
                setIsCancellingMode(true);
            } else {
                setIsCancellingMode(false);
            }

            // Check if cancelled
            if (newOffsetX <= CANCEL_THRESHOLD) {
                isCancelledRef.current = true;
                if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]); // stronger vibration for trash

                // Animate trash eating by dropping the mic into it
                stopRecording();
            }
        }
    }, [isCancellingMode, stopRecording]);

    useEffect(() => {
        if (!isRecording) return;

        const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
        const onMouseUp = () => { if (!isLockedRef.current) stopRecording(); };
        const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        const onTouchEnd = () => { if (!isLockedRef.current) stopRecording(); };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [isRecording, handleDragMove, stopRecording]);

    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        handleDragMove(clientX, clientY);
    };

    const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
        if (e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startXRef.current = clientX;
        startYRef.current = clientY;
        isCancelledRef.current = false;
        isLockedRef.current = false;
        isStopRequestedRef.current = false;
        setIsLocked(false);
        setIsRecording(true); // Set true immediately to register window event listeners
        onRecordingStateChange?.(true);
        setShowLockUI(true);
        setDragOffset(0);
        setDragOffsetY(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (isStopRequestedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            // Audio Visualization Setup
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioCtx = new AudioContextClass();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            analyser.fftSize = 64; // Smaller for fewer bars
            source.connect(analyser);

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                console.log('Recorder stopped. Chunks count:', chunksRef.current.length);
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

                // Calculate final duration
                const finalDuration = startTimeRef.current
                    ? Math.round((Date.now() - startTimeRef.current) / 1000)
                    : durationRef.current;

                // Get exact milliseconds for accurate discard check
                const exactDurationMs = startTimeRef.current
                    ? Date.now() - startTimeRef.current
                    : finalDuration * 1000;

                console.log('Blob size:', blob.size, 'Final Duration:', finalDuration);
                stream.getTracks().forEach(t => t.stop());

                // Only complete recording if not cancelled AND duration is >= 1 second (1000ms)
                if (!isCancelledRef.current && exactDurationMs >= 1000 && chunksRef.current.length > 0) {
                    onRecordingComplete(blob, Math.max(1, finalDuration));
                } else {
                    console.log('Recording discarded:', {
                        isCancelled: isCancelledRef.current,
                        exactDurationMs,
                        chunks: chunksRef.current.length
                    });
                }
                durationRef.current = 0;
                startTimeRef.current = null;
            };

            recorder.start(100);
            mediaRecorderRef.current = recorder;

            playRecordStartSound();
            setRecordingTime(0);
            durationRef.current = 0;
            startTimeRef.current = Date.now();

            timerRef.current = setInterval(() => {
                durationRef.current += 1;
                setRecordingTime(prev => prev + 1);
            }, 1000);

            // Draw Waveform (Scrolling Bars like WhatsApp)
            const barWidth = 2.5;
            const gap = 2;
            const step = barWidth + gap;

            // To be safe with canvas width 80
            const maxBars = Math.ceil(80 / step) + 1;
            const history = new Array(maxBars).fill(0);

            let lastTime = performance.now();
            let scrollOffset = 0;
            const scrollSpeed = 25; // pixels per second

            const draw = (time: number) => {
                if (!canvasRef.current || !analyserRef.current) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const dt = (time - lastTime) / 1000;
                lastTime = time;

                // Move forward but clamp max dt to avoid jumps when the tab is inactive
                if (dt > 0 && dt < 0.1) {
                    scrollOffset += scrollSpeed * dt;
                }

                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const currentVolume = (sum / bufferLength) / 255.0;

                // When offset reaches a full step, we "commit" the bar and slide the array
                if (scrollOffset >= step) {
                    scrollOffset -= step;
                    history.push(currentVolume);
                    history.shift();
                } else {
                    // Update the head (rightmost bar) to the maximum volume hit during its "entry" phase
                    history[history.length - 1] = Math.max(history[history.length - 1], currentVolume);
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ef4444'; // Red matching mic

                for (let i = 0; i < history.length; i++) {
                    const volume = history[i];
                    // Enhance lower volumes slightly so it's not totally flat, curve the high end
                    const boostedVolume = Math.min(1, volume * 1.5 + 0.1);
                    const height = Math.max(2.5, boostedVolume * (canvas.height - 4));

                    // x position: i is index. 0 is oldest (leftmost), max is newest (rightmost)
                    const x = i * step - scrollOffset;
                    const y = (canvas.height - height) / 2;

                    ctx.beginPath();
                    if (ctx.roundRect) {
                        ctx.roundRect(x, y, barWidth, height, barWidth / 2);
                    } else {
                        ctx.rect(x, y, barWidth, height);
                    }
                    ctx.fill();
                }

                animationFrameRef.current = requestAnimationFrame(draw);
            };
            animationFrameRef.current = requestAnimationFrame(draw);

            if ('vibrate' in navigator) navigator.vibrate(50);
        } catch (err) {
            console.error('Mic error:', err);
            toast.error('Microphone access denied');
            setIsRecording(false);
            onRecordingStateChange?.(false);
        }
    };



    return (
        <div className="relative flex items-center h-full">
            {isRecording && portalTarget && createPortal(
                <div className="absolute inset-0 z-50 flex items-center px-3 rounded-full animate-premium-in bg-transparent justify-between">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        {!isLocked && (
                            <>
                                <div className="relative">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                </div>
                                <span className="text-white font-mono text-sm min-w-[45px] tabular-nums tracking-wider">
                                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pr-2 flex-1 justify-end min-w-0">
                        {isLocked ? (
                            <>
                                <button
                                    onClick={() => {
                                        isCancelledRef.current = true;
                                        stopRecording();
                                    }}
                                    className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2.5 flex-shrink-0 mr-1">
                                    <div className="relative">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                    </div>
                                    <span className="text-white font-mono text-sm min-w-[45px] tabular-nums tracking-wider">
                                        {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                    className="text-white/40 font-semibold tracking-wider text-[10px] sm:text-xs uppercase flex items-center gap-1.5 whitespace-nowrap overflow-hidden transition-all duration-300"
                                    style={{
                                        opacity: Math.max(0, 1 - Math.abs(dragOffset) / 60),
                                        transform: `translateX(${dragOffset * 0.2}px)`
                                    }}
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse opacity-70 flex-shrink-0" />
                                    <span className="truncate">slide to cancel</span>
                                </span>
                            </div>
                        )}
                        <div className="h-6 w-[80px] flex items-center overflow-hidden flex-shrink-0">
                            <canvas ref={canvasRef} width="80" height="20" className="opacity-90" />
                        </div>
                    </div>
                </div>,
                portalTarget
            )}

            {/* Trash Bin that appears when actively swiping near X threshold */}
            {isRecording && !isLocked && Math.abs(dragOffset) > 20 && (
                <div
                    className={`absolute right-full mr-4 z-[100] text-red-500 transition-all duration-300 ease-out flex items-center justify-center pointer-events-none`}
                    style={{
                        transform: `scale(${isCancelledRef.current ? 1.5 : (Math.abs(dragOffset) / Math.abs(CANCEL_THRESHOLD))})`,
                        opacity: isCancelledRef.current ? 1 : Math.min(1, Math.abs(dragOffset) / 40 - 0.5),
                        left: -Math.abs(CANCEL_THRESHOLD) - 10
                    }}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCancelledRef.current ? 'bg-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-white/5'}`}>
                        <Trash2 className={`w-6 h-6 ${isCancelledRef.current ? 'animate-bounce fill-red-500/20' : ''}`} />
                    </div>
                </div>
            )}

            {/* Swipe to lock animation container */}
            {isRecording && showLockUI && !isCancelledRef.current && !isLocked && (
                <div
                    className="absolute bottom-[100%] left-0 w-full flex justify-center pb-4 pointer-events-none transition-all duration-300 z-[100]"
                    style={{
                        opacity: dragOffsetY < -10 ? Math.max(0, 1 - (Math.abs(dragOffsetY) / Math.abs(LOCK_THRESHOLD))) : 0,
                    }}
                >
                    <div
                        className="bg-[#1a1c1e] backdrop-blur-md border border-white/10 rounded-full p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 transition-transform duration-75"
                        style={{
                            transform: `translateY(${Math.min(0, dragOffsetY + 20)}px)`
                        }}
                    >
                        <Lock className="w-4 h-4 text-white/50 animate-bounce" />
                        <div className="flex flex-col gap-1.5 opacity-50">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse delay-75" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse delay-150" />
                        </div>
                    </div>
                </div>
            )}

            {isLocked ? (
                <button
                    type="button"
                    onClick={stopRecording}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all hover:scale-110 active:scale-95 z-50 animate-in fade-in zoom-in-50"
                    title="Send Voice Note"
                >
                    <Send className="w-4 h-4 ml-0.5" />
                </button>
            ) : (
                <button
                    type="button"
                    onMouseDown={startRecording}
                    onTouchStart={startRecording}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0 border touch-none z-50 relative
                        ${isRecording
                            ? (isCancelledRef.current
                                ? 'duration-300 scale-0 opacity-0 rotate-180 bg-red-500 text-white border-red-500' // Trash eating animation
                                : (isCancellingMode
                                    ? 'duration-75 bg-red-500 text-white border-red-600 scale-[1.25] shadow-[0_0_25px_rgba(239,68,68,0.6)] animate-pulse' // Danger zone
                                    : 'duration-75 bg-[#991b1b] text-[#fca5a5] border-[#dc2626] scale-[1.15] shadow-[0_0_15px_rgba(220,38,38,0.4)]')) // Safe zone
                            : 'duration-300 bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10' // Idle
                        }`}
                    style={isRecording && !isCancelledRef.current ? { transform: `translate(${dragOffset}px, ${dragOffsetY}px) scale(${isCancellingMode ? 1.25 : 1.15})` } : (isCancelledRef.current ? { transform: `translate(${CANCEL_THRESHOLD}px, 0px) scale(0) rotate(-45deg)` } : {})}
                    title="Hold to record, slide left to cancel, slide up to lock"
                >
                    <Mic className="w-5 h-5 flex-shrink-0" />
                </button>
            )}
        </div>
    );
};

// ─── Image Editor Utilities ────────────────────────────────────────────────────
const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<Blob> => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (error) => reject(error));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No 2d context');

    const rotRad = (rotation * Math.PI) / 180;
    const { width: bWidth, height: bHeight } = {
        width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
        height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height)
    };

    canvas.width = bWidth;
    canvas.height = bHeight;

    ctx.translate(bWidth / 2, bHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob((file) => resolve(file!), 'image/jpeg', 0.95);
    });
};

// ─── Custom Draggable Crop Tool ─────────────────────────────────────────────────
type CropRect = { x: number; y: number; w: number; h: number };
type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

const MIN_CROP = 40;

const ImageEditorModal = ({
    image, onCancel, onSave, isProcessing
}: {
    image: string; onCancel: () => void; onSave: (blob: Blob) => void; isProcessing: boolean
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const drawCanvasRef = useRef<HTMLCanvasElement>(null);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
    const [mode, setMode] = useState<'crop' | 'draw'>('crop');
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushColor, setBrushColor] = useState('#FFDD00');
    const [brushSize, setBrushSize] = useState(4);
    const [caption, setCaption] = useState('');
    const [drawHistory, setDrawHistory] = useState<ImageData[]>([]);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{
        handle: DragHandle;
        startX: number; startY: number;
        origRect: CropRect;
    } | null>(null);

    const handleImgLoad = () => {
        setImgLoaded(true);
        if (!imgRef.current) return;
        const width = imgRef.current.clientWidth;
        const height = imgRef.current.clientHeight;
        const size = Math.min(width, height) * 0.8;
        setCropRect({ x: (width - size) / 2, y: (height - size) / 2, w: size, h: size });
        // Init draw canvas
        if (drawCanvasRef.current) {
            drawCanvasRef.current.width = width;
            drawCanvasRef.current.height = height;
        }
    };

    const getClient = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    };

    const getCanvasPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const client = getClient(e);

        // Account for scaling between internal canvas size and layout size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (client.x - rect.left) * scaleX,
            y: (client.y - rect.top) * scaleY
        };
    };

    // ── Drawing manual listeners for passive event issue ──
    useEffect(() => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;

        const handleTouchStart = (e: TouchEvent) => {
            if (mode !== 'draw') return;
            e.preventDefault();
            saveHistory();
            const pos = getCanvasPos(e);
            if (!pos) return;
            lastPos.current = pos;
            setIsDrawing(true);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
                ctx.fillStyle = brushColor;
                ctx.fill();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (mode !== 'draw' || !isDrawing || !lastPos.current) return;
            e.preventDefault();
            const pos = getCanvasPos(e);
            if (!pos) return;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            lastPos.current = pos;
        };

        const handleTouchEnd = () => {
            setIsDrawing(false);
            lastPos.current = null;
        };

        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [mode, isDrawing, brushColor, brushSize, drawHistory]);

    // ── Crop drag handlers ──
    const onPointerDown = (handle: DragHandle) => (e: React.MouseEvent | React.TouchEvent) => {
        if (mode !== 'crop') return;
        e.stopPropagation();
        const { x, y } = getClient(e);
        dragRef.current = { handle, startX: x, startY: y, origRect: { ...cropRect } };
    };

    const onCropPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dragRef.current || !imgRef.current) return;
        const { x, y } = getClient(e);
        const dx = x - dragRef.current.startX;
        const dy = y - dragRef.current.startY;
        const orig = dragRef.current.origRect;
        const maxW = imgRef.current.clientWidth;
        const maxH = imgRef.current.clientHeight;
        const handle = dragRef.current.handle;
        setCropRect(prev => {
            let { x: cx, y: cy, w: cw, h: ch } = prev;
            const h = handle;
            if (h === 'move') {
                cx = Math.max(0, Math.min(maxW - orig.w, orig.x + dx));
                cy = Math.max(0, Math.min(maxH - orig.h, orig.y + dy));
                cw = orig.w; ch = orig.h;
            } else {
                let nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;
                if (h === 'e' || h === 'ne' || h === 'se') nw = Math.max(MIN_CROP, orig.w + dx);
                if (h === 'w' || h === 'nw' || h === 'sw') { nx = orig.x + dx; nw = Math.max(MIN_CROP, orig.w - dx); }
                if (h === 's' || h === 'se' || h === 'sw') nh = Math.max(MIN_CROP, orig.h + dy);
                if (h === 'n' || h === 'nw' || h === 'ne') { ny = orig.y + dy; nh = Math.max(MIN_CROP, orig.h - dy); }
                if (nx < 0) { nw += nx; nx = 0; }
                if (ny < 0) { nh += ny; ny = 0; }
                if (nx + nw > maxW) nw = maxW - nx;
                if (ny + nh > maxH) nh = maxH - ny;
                if (nw < MIN_CROP) { nw = MIN_CROP; if (h?.includes('w')) nx = orig.x + orig.w - MIN_CROP; }
                if (nh < MIN_CROP) { nh = MIN_CROP; if (h?.includes('n')) ny = orig.y + orig.h - MIN_CROP; }
                [cx, cy, cw, ch] = [nx, ny, nw, nh];
            }
            return { x: cx, y: cy, w: cw, h: ch };
        });
    };

    const onCropPointerUp = () => { dragRef.current = null; };



    const saveHistory = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        setDrawHistory(prev => [...prev.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    const onDrawStart = (e: React.MouseEvent) => {
        if (mode !== 'draw') return;
        saveHistory();
        const pos = getCanvasPos(e);
        if (!pos) return;
        lastPos.current = pos;
        setIsDrawing(true);
        // Draw a dot for single tap
        const canvas = drawCanvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (ctx) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = brushColor;
            ctx.fill();
        }
    };

    const onDrawMove = (e: React.MouseEvent) => {
        if (!isDrawing || mode !== 'draw' || !lastPos.current) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        const canvas = drawCanvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        lastPos.current = pos;
    };

    const onDrawEnd = () => { setIsDrawing(false); lastPos.current = null; };

    const handleUndo = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas || drawHistory.length === 0) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const prev = drawHistory[drawHistory.length - 1];
        ctx.putImageData(prev, 0, 0);
        setDrawHistory(h => h.slice(0, -1));
    };

    const clearDrawing = () => {
        const canvas = drawCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        saveHistory();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // ── Save & send ──
    const handleSave = async () => {
        if (!imgRef.current) return;
        try {
            const imgEl = imgRef.current;
            const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
            const scaleY = imgEl.naturalHeight / imgEl.clientHeight;

            // Step 1: Crop the image
            const cropW = Math.round(cropRect.w * scaleX);
            const cropH = Math.round(cropRect.h * scaleY);

            // Caption height (if any)
            const fontSize = Math.max(20, Math.round(cropW * 0.04));
            const captionPadding = caption.trim() ? fontSize * 2 : 0;

            const canvas = document.createElement('canvas');
            canvas.width = cropW;
            canvas.height = cropH + captionPadding;
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

            // Draw cropped image
            ctx.drawImage(imgEl, cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY, 0, 0, cropW, cropH);

            // Step 2: Bake drawing annotations (scale from client px to natural px)
            const drawCanvas = drawCanvasRef.current;
            if (drawCanvas) {
                ctx.save();
                ctx.scale(scaleX, scaleY);
                ctx.translate(-cropRect.x, -cropRect.y);
                ctx.drawImage(drawCanvas, 0, 0);
                ctx.restore();
            }

            // Step 3: Bake caption
            if (caption.trim() && captionPadding > 0) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, cropH, cropW, captionPadding);
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${fontSize} px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(caption.trim(), cropW / 2, cropH + captionPadding / 2, cropW - 20);
            }

            canvas.toBlob(blob => blob && onSave(blob), 'image/jpeg', 0.95);
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const hClass = "absolute w-6 h-6 bg-white border-2 border-primary rounded-full z-20 shadow-lg active:scale-125 transition-transform touch-none";
    const COLORS = ['#FFDD00', '#FF3B30', '#34C759', '#007AFF', '#FF9F0A', '#FFFFFF', '#000000', '#AF52DE'];

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-black overflow-hidden select-none"
            onMouseMove={mode === 'crop' ? onCropPointerMove : undefined}
            onTouchMove={mode === 'crop' ? onCropPointerMove : undefined}
            onMouseUp={onCropPointerUp} onTouchEnd={mode === 'crop' ? onCropPointerUp : onDrawEnd}
            onMouseLeave={onCropPointerUp}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a0a] border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setMode('crop')}
                            className={`px - 3 py - 1.5 rounded - lg text - [11px] font - black uppercase tracking - widest transition - all ${mode === 'crop' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'} `}
                        >
                            ✂️ Crop
                        </button>
                        <button
                            onClick={() => setMode('draw')}
                            className={`px - 3 py - 1.5 rounded - lg text - [11px] font - black uppercase tracking - widest transition - all ${mode === 'draw' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'} `}
                        >
                            ✏️ Draw
                        </button>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Draw toolbar — only visible in draw mode */}
            {mode === 'draw' && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#111] border-b border-white/5 overflow-x-auto flex-shrink-0">
                    {/* Color swatches */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setBrushColor(c)}
                                className="w-6 h-6 rounded-full border-2 transition-all active:scale-90 flex-shrink-0"
                                style={{ backgroundColor: c, borderColor: brushColor === c ? '#fff' : 'transparent', transform: brushColor === c ? 'scale(1.2)' : undefined }}
                            />
                        ))}
                    </div>
                    <div className="w-px h-6 bg-white/10 flex-shrink-0" />
                    {/* Brush sizes */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {[2, 4, 8, 14].map(s => (
                            <button
                                key={s}
                                onClick={() => setBrushSize(s)}
                                className={`flex items - center justify - center w - 8 h - 8 rounded - full transition - all ${brushSize === s ? 'bg-primary/20 border border-primary' : 'bg-white/5 border border-white/10'} `}
                            >
                                <div className="rounded-full bg-white" style={{ width: s, height: s }} />
                            </button>
                        ))}
                    </div>
                    <div className="w-px h-6 bg-white/10 flex-shrink-0" />
                    {/* Undo / Clear */}
                    <button onClick={handleUndo} disabled={drawHistory.length === 0} className="px-3 h-8 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white disabled:opacity-30 transition-all flex-shrink-0">
                        ↩ Undo
                    </button>
                    <button onClick={clearDrawing} className="px-3 h-8 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all flex-shrink-0">
                        🗑 Clear
                    </button>
                </div>
            )}

            {/* Editing Canvas */}
            <div className="flex-1 relative flex items-center justify-center bg-[#050505] p-4 min-h-0">
                <div ref={containerRef} className="relative inline-block leading-[0] shadow-2xl">
                    <img
                        ref={imgRef}
                        src={image}
                        onLoad={handleImgLoad}
                        crossOrigin="anonymous"
                        className="max-w-full max-h-[65vh] block object-contain"
                        draggable={false}
                    />

                    {/* Drawing canvas overlay */}
                    {imgLoaded && (
                        <canvas
                            ref={drawCanvasRef}
                            className="absolute inset-0 w-full h-full"
                            style={{
                                cursor: mode === 'draw' ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='${brushSize / 2}' fill='${encodeURIComponent(brushColor)}'/></svg>") 12 12, crosshair` : 'default',
                                pointerEvents: mode === 'draw' ? 'auto' : 'none',
                                zIndex: mode === 'draw' ? 30 : 5,
                            }}
                            onMouseDown={onDrawStart}
                            onMouseMove={onDrawMove}
                            onMouseUp={onDrawEnd}
                            onMouseLeave={onDrawEnd}
                        />
                    )}

                    {/* Crop UI */}
                    {imgLoaded && mode === 'crop' && (
                        <div
                            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move z-10"
                            style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
                            onMouseDown={onPointerDown('move')} onTouchStart={onPointerDown('move')}
                        >
                            <div className="absolute inset-0 pointer-events-none opacity-30">
                                <div className="absolute left-1/3 w-px h-full bg-white" />
                                <div className="absolute left-2/3 w-px h-full bg-white" />
                                <div className="absolute top-1/3 h-px w-full bg-white" />
                                <div className="absolute top-2/3 h-px w-full bg-white" />
                            </div>
                            <div className={`${hClass} -top - 3 - left - 3 cursor - nw - resize`} onMouseDown={onPointerDown('nw')} onTouchStart={onPointerDown('nw')} />
                            <div className={`${hClass} -top - 3 - right - 3 cursor - ne - resize`} onMouseDown={onPointerDown('ne')} onTouchStart={onPointerDown('ne')} />
                            <div className={`${hClass} -bottom - 3 - left - 3 cursor - sw - resize`} onMouseDown={onPointerDown('sw')} onTouchStart={onPointerDown('sw')} />
                            <div className={`${hClass} -bottom - 3 - right - 3 cursor - se - resize`} onMouseDown={onPointerDown('se')} onTouchStart={onPointerDown('se')} />
                            <div className={`${hClass} -top - 3 left - 1 / 2 - translate - x - 1 / 2 cursor - n - resize`} onMouseDown={onPointerDown('n')} onTouchStart={onPointerDown('n')} />
                            <div className={`${hClass} -bottom - 3 left - 1 / 2 - translate - x - 1 / 2 cursor - s - resize`} onMouseDown={onPointerDown('s')} onTouchStart={onPointerDown('s')} />
                            <div className={`${hClass} top - 1 / 2 - left - 3 - translate - y - 1 / 2 cursor - w - resize`} onMouseDown={onPointerDown('w')} onTouchStart={onPointerDown('w')} />
                            <div className={`${hClass} top - 1 / 2 - right - 3 - translate - y - 1 / 2 cursor - e - resize`} onMouseDown={onPointerDown('e')} onTouchStart={onPointerDown('e')} />
                        </div>
                    )}
                </div>
            </div>

            {/* Caption input */}
            <div className="flex-shrink-0 px-4 py-3 bg-[#0a0a0a] border-t border-white/5">
                <input
                    type="text"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Caption..."
                    maxLength={120}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-medium focus:outline-none focus:border-primary/40 transition-all"
                />
            </div>

            {/* Action Buttons */}
            <div className="p-4 pt-2 bg-[#0a0a0a] flex-shrink-0">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={onCancel} className="flex-1 h-12 rounded-2xl bg-white/5 text-white/50 font-black uppercase tracking-tight border border-white/5 text-sm hover:bg-white/10 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isProcessing} className="flex-[2] h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-tight shadow-xl shadow-primary/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all">
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /><span>Send</span></>}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ─── Image Viewer Modal (Full Screen) ──────────────────────────────────────────
const ImageViewerModal = ({ url, onClose, onEdit }: { url: string; onClose: () => void; onEdit?: (url: string) => void }) => {
    const [zoom, setZoom] = useState(1);
    const [panning, setPanning] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(1, Math.min(5, prev + delta)));
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        lastPos.current = { x: clientX, y: clientY };
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || zoom === 1) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const dx = clientX - lastPos.current.x;
        const dy = clientY - lastPos.current.y;
        setPanning(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPos.current = { x: clientX, y: clientY };
    };

    // Proper blob-based download — works on mobile too
    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            const resp = await fetch(url, { mode: 'cors' });
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `image_${Date.now()}.jpg`;
            a.click();
            URL.revokeObjectURL(blobUrl);
        } catch {
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
        setIsDownloading(false);
    };

    return (
        <div className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-2xl flex flex-col p-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
                        <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-black">Multimedia View</h3>
                        <p className="text-white/20 text-[9px] uppercase font-black tracking-widest">Pinch to zoom • Drag to pan</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Edit / Crop Button */}
                    {onEdit && (
                        <button
                            onClick={() => { onClose(); onEdit(url); }}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Edit & Crop"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    )}
                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all disabled:opacity-50"
                        title="Save to device"
                    >
                        {isDownloading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-5 h-5" />}
                    </button>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all shadow-xl active:scale-95">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div
                className="flex-1 relative flex items-center justify-center overflow-hidden cursor-move"
                onWheel={handleWheel}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={() => setIsDragging(false)}
            >
                <img
                    src={url}
                    alt="Full view"
                    crossOrigin="anonymous"
                    className="max-w-full max-h-full object-contain shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-transform duration-75 select-none"
                    style={{
                        transform: `scale(${zoom}) translate(${panning.x / zoom}px, ${panning.y / zoom}px)`,
                        pointerEvents: 'none'
                    }}
                />
            </div>

            <div className="flex justify-center p-4 z-10">
                <div className="flex items-center gap-8 bg-white/5 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl">
                    <button onClick={() => { setZoom(1); setPanning({ x: 0, y: 0 }); }} className="text-white/40 hover:text-white"><RotateCcw className="w-4 h-4" /></button>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Zoom</span>
                        <div className="w-32 h-1.5 bg-white/10 rounded-full relative">
                            <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${((zoom - 1) / 4) * 100}% ` }} />
                        </div>
                        <span className="text-[11px] font-black text-white min-w-[30px]">{Math.round(zoom * 100)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Communications Page ──────────────────────────────────────────────────
export default function Communications() {
    const { settings, userProfile } = useTheme();
    const navigate = useNavigate();
    const currentUserId = userProfile?.id;

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [allUsers, setAllUsers] = useState<Profile[]>([]);
    const [text, setText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [presenceState, setPresenceState] = useState<Record<string, any>>({});
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [isSendingVoice, setIsSendingVoice] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [longPressConvoId, setLongPressConvoId] = useState<string | null>(null);
    const [longPressActive, setLongPressActive] = useState<string | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [pendingImages, setPendingImages] = useState<string[]>([]);
    const [imageToView, setImageToView] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'settings'>('chats');
    const [callLogs, setCallLogs] = useState<Message[]>([]);
    const [editingImage, setEditingImage] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    // Ringtone settings (persisted in localStorage)
    const PRESET_RINGTONES = [
        { id: 'classic', label: 'Classic Phone', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
        { id: 'modern', label: 'Modern Ring', url: 'https://assets.mixkit.co/active_storage/sfx/918/918-preview.mp3' },
        { id: 'soft', label: 'Soft Bell', url: 'https://assets.mixkit.co/active_storage/sfx/1352/1352-preview.mp3' },
        { id: 'digital', label: 'Digital', url: 'https://assets.mixkit.co/active_storage/sfx/1353/1353-preview.mp3' },
        { id: 'chime', label: 'Chime', url: 'https://assets.mixkit.co/active_storage/sfx/956/956-preview.mp3' },
    ];
    const [ringtoneUrl, setRingtoneUrl] = useState<string>(
        () => localStorage.getItem('healy_ringtone_url') || 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
    );
    const [ringtonePreviewAudio, setRingtonePreviewAudio] = useState<HTMLAudioElement | null>(null);
    const ringtoneFileRef = useRef<HTMLInputElement>(null);

    // ─── Global Call State (persists across pages via CallContext) ──────────────
    const {
        activeCall,
        incomingCall,
        callStatus,
        callDuration,
        isMuted,
        isCameraOff,
        isCallMinimized,
        initiateCall: globalInitiateCall,
        acceptCall: globalAcceptCall,
        rejectCall: globalRejectCall,
        hangupCall: globalHangupCall,
        toggleMute: globalToggleMute,
        toggleCamera: globalToggleCamera,
        setIsCallMinimized,
        setIncomingCall,
    } = useCall();

    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isLocalVideoMain, setIsLocalVideoMain] = useState(false);


    // Group consecutive call events
    const groupedMessages = useMemo(() => {
        const result: Message[] = [];
        messages.forEach((msg) => {
            const prev = result[result.length - 1];
            if (
                prev &&
                prev.type === 'call_event' &&
                msg.type === 'call_event' &&
                prev.caller_id === msg.caller_id &&
                prev.call_status === msg.call_status &&
                prev.call_type === msg.call_type
            ) {
                // Same type of call event from same person, group it
                prev.groupCount = (prev.groupCount || 1) + 1;
                // Keep the latest timestamp for the group
                prev.created_at = msg.created_at;
            } else {
                result.push({ ...msg, groupCount: 1 });
            }
        });
        return result;
    }, [messages]);


    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const clearedAtRef = useRef<string | null>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const attachMenuRef = useRef<HTMLDivElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const attachToggleRef = useRef<HTMLButtonElement>(null);
    const emojiToggleRef = useRef<HTMLButtonElement>(null);
    const pillRef = useRef<HTMLDivElement>(null); // Initial load: Fetch contacts and initial communications

    // Close emoji picker when clicking outside
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handler = (e: MouseEvent) => {
            const isToggleClick = emojiToggleRef.current && emojiToggleRef.current.contains(e.target as Node);
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node) && !isToggleClick) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showEmojiPicker]);

    // Close attach menu when clicking outside
    useEffect(() => {
        if (!showAttachMenu) return;
        const handler = (e: MouseEvent) => {
            const isToggleClick = attachToggleRef.current && attachToggleRef.current.contains(e.target as Node);
            if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node) && !isToggleClick) {
                setShowAttachMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showAttachMenu]);

    // ─── Presence Section Tracking ───────────────────────────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const setInChat = async (status: boolean) => {
            await supabase
                .from('profiles')
                .update({
                    is_in_chat: status,
                    last_seen: new Date().toISOString()
                })
                .eq('id', currentUserId);
        };

        setInChat(true);

        // Update when tab becomes visible again
        const handleVisibilityChange = () => {
            if (activeCall) return; // Stay "in chat" if a call is active even if hidden
            setInChat(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', () => {
            if (!activeCall) setInChat(false);
        });

        return () => {
            setInChat(false);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', () => setInChat(false));
        };
    }, [currentUserId, activeCall]);

    // ─── Auto-resize textarea ───────────────────────────────────────────────────
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)} px`;
    }, [text]);

    // ─── Selection Actions ────────────────────────────────────────────────────────
    const toggleMessageSelection = (id: string) => {
        const next = new Set(selectedMessageIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedMessageIds(next);
    };

    const handleDeleteClick = () => {
        if (selectedMessageIds.size === 0) return;
        setShowDeleteModal(true);
    };

    const deleteForMe = async () => {
        try {
            const ids = Array.from(selectedMessageIds);

            // Get current messages to update their arrays
            const msgsToUpdate = messages.filter(m => selectedMessageIds.has(m.id));

            for (const msg of msgsToUpdate) {
                const currentDeleted = msg.deleted_for_users || [];
                const updatedDeleted = [...new Set([...currentDeleted, currentUserId])];

                const { error } = await supabase
                    .from('messages')
                    .update({ deleted_for_users: updatedDeleted })
                    .eq('id', msg.id);

                if (error) throw error;
            }

            setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
            setSelectedMessageIds(new Set());
            setShowDeleteModal(false);
            toast.success('Deleted for you');
        } catch (err) {
            toast.error('Failed to delete messages');
        }
    };

    const deleteForEveryone = async () => {
        try {
            const ids = Array.from(selectedMessageIds);
            const { error } = await supabase
                .from('messages')
                .update({ is_deleted: true })
                .in('id', ids);

            if (error) throw error;

            setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
            setSelectedMessageIds(new Set());
            setShowDeleteModal(false);
            toast.success('Deleted for everyone');
        } catch (err) {
            toast.error('Failed to delete messages');
        }
    };


    const deleteSelectedMessages = async () => {
        // This is now replaced by handleDeleteClick and the modal choices
        handleDeleteClick();
    };

    const togglePinForSelected = async () => {
        if (selectedMessageIds.size === 0) return;
        const firstId = Array.from(selectedMessageIds)[0];
        const firstMsg = messages.find(m => m.id === firstId);
        if (!firstMsg) return;

        const nextState = !firstMsg.is_pinned;
        try {
            const { error } = await supabase.from('messages').update({ is_pinned: nextState }).in('id', Array.from(selectedMessageIds));
            if (error) throw error;

            setMessages(prev => prev.map(m => selectedMessageIds.has(m.id) ? { ...m, is_pinned: nextState } : m));
            toast.success(nextState ? 'Messages pinned' : 'Messages unpinned');
        } catch (err) {
            toast.error('Failed to update pin state');
        }
    };

    const handleForwardMessages = async (targetConvoId: string) => {
        if (selectedMessageIds.size === 0) return;
        setIsSending(true);
        try {
            const selectedMsgs = messages.filter(m => selectedMessageIds.has(m.id))
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const newMessages = selectedMsgs.map(m => ({
                conversation_id: targetConvoId,
                sender_id: currentUserId,
                content: m.content,
                type: m.type,
                media_url: m.media_url,
                media_duration: m.media_duration,
                reply_to_id: null,
            }));

            const { error } = await supabase.from('messages').insert(newMessages);
            if (error) throw error;

            toast.success(`Forwarded to conversation`);
            setSelectedMessageIds(new Set());
            setShowForwardModal(false);
        } catch (err) {
            toast.error('Failed to forward messages');
        } finally {
            setIsSending(false);
        }
    };

    // ─── Click outside to close menu ───────────────────────────────────────────────
    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        if (menuOpenId) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [menuOpenId]);



    const markAsRead = useCallback(async (convoId: string) => {
        if (!currentUserId) return;
        try {
            // 1. Update conversation participant's last_read_at
            const { error: partError } = await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .eq('user_id', currentUserId);
            if (partError) throw partError;

            // 2. Update message read_at for all messages in the conversation not sent by current user
            const { error: msgError } = await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .neq('sender_id', currentUserId)
                .is('read_at', null);

            if (msgError) console.error('Failed to update message read status:', msgError);

            setConversations(prev => prev.map(c => c.id === convoId ? { ...c, unreadCount: 0 } : c));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, [currentUserId]);

    const markMessagesAsDelivered = useCallback(async (convoId: string) => {
        if (!currentUserId) return;
        try {
            const { error } = await supabase
                .from('messages')
                .update({ delivered_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .neq('sender_id', currentUserId)
                .is('delivered_at', null);
            if (error) console.error('Failed to mark messages as delivered:', error);
        } catch (err) {
            console.error('Failed to mark as delivered:', err);
        }
    }, [currentUserId]);





    // ─── Load conversations ──────────────────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!currentUserId) return;

        // Step 1: Get all conversation IDs for this user
        const { data: participations, error: pErr } = await supabase
            .from('conversation_participants')
            .select('conversation_id, last_read_at, is_hidden, cleared_at')
            .eq('user_id', currentUserId);

        if (pErr) {
            console.error('[loadConversations] Error fetching participations:', pErr);
            return;
        }
        if (!participations?.length) return;
        const convoIds = participations.map(p => p.conversation_id);

        // Step 2: Get all conversations (flat, no joins)
        const { data: convos, error: cErr } = await supabase
            .from('conversations')
            .select('id, type, name, avatar_url, updated_at, created_by')
            .in('id', convoIds)
            .order('updated_at', { ascending: false });

        if (cErr) {
            console.error('[loadConversations] Error fetching conversations:', cErr);
            return;
        }
        if (!convos?.length) return;

        // Step 3: Get all participants for these conversations (flat)
        const { data: allParticipants } = await supabase
            .from('conversation_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', convoIds);

        // Step 4: Get profile details for all participant user IDs
        const allUserIds = [...new Set((allParticipants || []).map(p => p.user_id))];
        const [profilesRes, coachesRes] = await Promise.all([
            supabase.from('profiles').select('id, full_name, role, avatar_url, last_seen, is_in_chat').in('id', allUserIds),
            supabase.from('coaches').select('profile_id, avatar_url').in('profile_id', allUserIds)
        ]);

        if (profilesRes.error) {
            console.error('[loadConversations] Error fetching profiles:', profilesRes.error);
        }

        const coachAvatarMap: Record<string, string> = {};
        (coachesRes.data || []).forEach(c => { if (c.avatar_url) coachAvatarMap[c.profile_id] = c.avatar_url; });

        const profileMap: Record<string, Profile> = {};
        (profilesRes.data || []).forEach(p => {
            profileMap[p.id] = {
                ...p,
                avatar_url: p.avatar_url || coachAvatarMap[p.id]
            };
        });

        // Step 5: Get last message per conversation (flat)
        const { data: lastMsgs } = await supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, type, media_url, media_duration, call_status, call_duration, call_type, caller_id, created_at')
            .in('conversation_id', convoIds)
            .order('created_at', { ascending: false })
            .limit(convoIds.length * 2);

        // Step 6: Count unread messages per conversation
        const { data: unreadMsgs } = await supabase
            .from('messages')
            .select('conversation_id, id, created_at')
            .in('conversation_id', convoIds)
            .neq('sender_id', currentUserId)
            .gt('created_at', new Date(Date.now() - 86400000 * 7).toISOString());

        // Step 7: Assemble everything in JavaScript with de-duplication
        const seenDirectUsers = new Set<string>();
        const uniqueEnriched = (convos || []).map(c => {
            const myParticipation = (participations || []).find(p => p.conversation_id === c.id);
            if (myParticipation?.is_hidden) return null;

            const myParticipantsForConvo = (allParticipants || []).filter(p => p.conversation_id === c.id);
            const otherParticipant = myParticipantsForConvo.find(p => p.user_id !== currentUserId);
            const otherUser = otherParticipant ? profileMap[otherParticipant.user_id] : undefined;

            // De-duplicate direct chats: show only the most recent one with each person
            if (c.type === 'direct' && otherUser) {
                if (seenDirectUsers.has(otherUser.id)) return null;
                seenDirectUsers.add(otherUser.id);
            }

            const lastMsg = (lastMsgs || []).find(m => {
                if (m.conversation_id !== c.id) return false;
                if (myParticipation?.cleared_at && new Date(m.created_at) <= new Date(myParticipation.cleared_at)) return false;
                return true;
            });

            const unread = (unreadMsgs || []).filter(m => {
                if (m.conversation_id !== c.id) return false;
                if (myParticipation?.cleared_at && new Date(m.created_at) <= new Date(myParticipation.cleared_at)) return false;
                if (myParticipation?.last_read_at && new Date(m.created_at) <= new Date(myParticipation.last_read_at)) return false;
                return true;
            }).length;

            return {
                id: c.id,
                type: c.type as 'direct' | 'group',
                name: c.name,
                avatar_url: c.avatar_url,
                otherUser,
                lastMessage: lastMsg as Message | undefined,
                unreadCount: unread,
                updated_at: c.updated_at,
                is_hidden: myParticipation?.is_hidden,
                cleared_at: myParticipation?.cleared_at
            } as Conversation;
        }).filter((c): c is Conversation => c !== null);

        setConversations(uniqueEnriched);
    }, [currentUserId]);

    // ─── Load messages ────────────────────────────────────────────────────────────
    const loadMessages = useCallback(async (convoId: string) => {
        if (!currentUserId) return;

        // Fetch cleared_at directly from DB — always the source of truth
        const { data: participation } = await supabase
            .from('conversation_participants')
            .select('cleared_at')
            .eq('conversation_id', convoId)
            .eq('user_id', currentUserId)
            .maybeSingle();

        const clearedAt = participation?.cleared_at;
        clearedAtRef.current = clearedAt || null;

        let query = supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, type, media_url, media_duration, call_status, call_duration, call_type, caller_id, created_at, is_deleted, reply_to_id, is_pinned, deleted_for_users, delivered_at, read_at')
            .eq('conversation_id', convoId);

        if (clearedAt) {
            query = query.gt('created_at', clearedAt);
        }

        const { data: msgs, error } = await query
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) { toast.error('Failed to load messages'); return; }

        if (msgs) {
            // Fetch senders and reply messages
            const senderIds = [...new Set(msgs.map(m => m.sender_id))];
            const replyIds = [...new Set(msgs.filter(m => m.reply_to_id).map(m => m.reply_to_id))];

            const [sendersRes, repliesRes, coachesRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, role, avatar_url, last_seen, is_in_chat').in('id', senderIds),
                replyIds.length > 0
                    ? supabase.from('messages').select('id, content, type, media_url, sender_id').in('id', replyIds)
                    : Promise.resolve({ data: [], error: null }),
                supabase.from('coaches').select('profile_id, avatar_url').in('profile_id', senderIds)
            ]);

            const coachAvatarMap: Record<string, string> = {};
            (coachesRes.data || []).forEach(c => { if (c.avatar_url) coachAvatarMap[c.profile_id] = c.avatar_url; });

            const senderMap: Record<string, Profile> = {};
            (sendersRes.data || []).forEach(s => {
                senderMap[s.id] = {
                    ...s,
                    avatar_url: s.avatar_url || coachAvatarMap[s.id]
                };
            });

            const replyMap: Record<string, Message> = {};
            (repliesRes.data || []).forEach(r => replyMap[r.id] = r as Message);

            const enrichedMsgs = msgs
                .filter(m => !m.is_deleted && !(m.deleted_for_users || []).includes(currentUserId || ''))
                .filter(m => !clearedAtRef.current || new Date(m.created_at) > new Date(clearedAtRef.current))
                .map(m => ({
                    ...m,
                    sender: senderMap[m.sender_id],
                    reply_to: m.reply_to_id ? replyMap[m.reply_to_id] : undefined
                }));

            setMessages(enrichedMsgs as Message[]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }

        // Mark as delivered and read
        markMessagesAsDelivered(convoId);
        markAsRead(convoId);
    }, [currentUserId, markAsRead, markMessagesAsDelivered]);

    const togglePinMessage = async (msgId: string, isPinned: boolean) => {
        const { error } = await supabase.from('messages').update({ is_pinned: !isPinned }).eq('id', msgId);
        if (error) toast.error('Failed to update pin');
        else if (activeConvo) loadMessages(activeConvo.id);
    };

    const deleteConversation = async (convoId: string) => {
        const { error } = await supabase
            .from('conversation_participants')
            .update({ is_hidden: true })
            .eq('conversation_id', convoId)
            .eq('user_id', currentUserId);

        if (error) toast.error('Failed to hide chat');
        else {
            setConversations(prev => prev.filter(c => c.id !== convoId));
            if (activeConvo?.id === convoId) {
                setActiveConvo(null);
                setMessages([]);
            }
        }
    };

    const clearConversation = async (convoId: string) => {
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('conversation_participants')
            .update({ cleared_at: now, last_read_at: now })
            .eq('conversation_id', convoId)
            .eq('user_id', currentUserId);

        if (error) toast.error('Failed to clear chat');
        else {
            clearedAtRef.current = now;
            setConversations(prev => prev.map(c => c.id === convoId ? {
                ...c,
                cleared_at: now,
                unreadCount: 0,
                lastMessage: undefined
            } : c));
            if (activeConvo?.id === convoId) {
                setMessages([]);
                setActiveConvo(prev => prev ? { ...prev, cleared_at: now, unreadCount: 0, lastMessage: undefined } : null);
            }
        }
    };


    // ─── Load all users for new chat ──────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            let query = supabase
                .from('profiles')
                .select('id, full_name, role, avatar_url, last_seen, is_in_chat')
                .neq('id', currentUserId || '');

            // Privacy: Students can only see coaches and admins
            if (userProfile?.role === 'student') {
                query = query.in('role', ['admin', 'head_coach', 'coach']);
            }

            const { data: profiles } = await query;

            if (!profiles) return;

            const userIds = profiles.map(p => p.id);
            const { data: coaches } = await supabase
                .from('coaches')
                .select('profile_id, avatar_url')
                .in('profile_id', userIds);

            const coachAvatarMap: Record<string, string> = {};
            (coaches || []).forEach(c => { if (c.avatar_url) coachAvatarMap[c.profile_id] = c.avatar_url; });

            const enriched = profiles.map(p => ({
                ...p,
                avatar_url: p.avatar_url || coachAvatarMap[p.id]
            }));

            setAllUsers(enriched);
        };
        if (currentUserId) load();
    }, [currentUserId]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    useEffect(() => {
        if (!activeConvo?.id) return;
        loadMessages(activeConvo.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConvo?.id]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // ─── Realtime subscriptions ────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeConvo) return;

        const channel = supabase
            .channel(`messages:${activeConvo.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvo.id}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Filter out messages that are older than cleared_at (if it exists)
                        // Use the REF to avoid stale closure issues
                        if (clearedAtRef.current && new Date(payload.new.created_at) <= new Date(clearedAtRef.current)) {
                            return;
                        }

                        const [profileRes, coachRes] = await Promise.all([
                            supabase.from('profiles').select('*').eq('id', payload.new.sender_id).single(),
                            supabase.from('coaches').select('avatar_url').eq('profile_id', payload.new.sender_id).maybeSingle()
                        ]);
                        const sender = profileRes.data ? {
                            ...profileRes.data,
                            avatar_url: profileRes.data.avatar_url || coachRes.data?.avatar_url
                        } : null;
                        const newMsg = { ...payload.new, sender } as Message;
                        setMessages(prev => [...prev, newMsg]);
                        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

                        // If message is from someone else, mark as delivered since we just received it
                        if (payload.new.sender_id !== currentUserId) {
                            supabase.from('messages').update({ delivered_at: new Date().toISOString() }).eq('id', payload.new.id).then();
                            // If we are currently active in this tab, mark as read too
                            if (document.visibilityState === 'visible') {
                                supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', payload.new.id).then();
                                markAsRead(activeConvo.id);
                            }
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                    // loadConversations is handled by the global listener now
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeConvo]);

    // Global Message Listener (updates sidebar for ALL chats instantly)
    useEffect(() => {
        if (!currentUserId) return;
        const channel = supabase
            .channel('global-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
                () => { loadConversations(); }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, loadConversations]);

    // Supabase Presence (Instant online/offline)
    useEffect(() => {
        if (!currentUserId) return;
        const channel = supabase.channel('global-presence', {
            config: { presence: { key: currentUserId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                setPresenceState(channel.presenceState());
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: currentUserId
                    });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId]);



    // ─── Profile changes subscription ─────────────────────────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel('public_profiles_presence')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    const updatedProfile = payload.new as Profile;

                    // Update in conversations
                    setConversations(prev => prev.map(c => {
                        if (c.otherUser?.id === updatedProfile.id) {
                            return { ...c, otherUser: { ...c.otherUser, ...updatedProfile } };
                        }
                        return c;
                    }));

                    // Update active conversation if it matches
                    if (activeConvo?.otherUser?.id === updatedProfile.id) {
                        setActiveConvo(prev => prev ? {
                            ...prev,
                            otherUser: { ...prev.otherUser, ...updatedProfile }
                        } : null);
                    }

                    // Update in messages sender info
                    setMessages(prev => prev.map(m => {
                        if (m.sender_id === updatedProfile.id) {
                            return { ...m, sender: { ...m.sender, ...updatedProfile } };
                        }
                        return m;
                    }));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, activeConvo?.otherUser?.id]);

    // ─── Send text message (and pending images) ────────────────────────────────────
    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        const hasText = text.trim().length > 0;
        const hasImages = pendingImages.length > 0;

        if (!activeConvo || !currentUserId || (!hasText && !hasImages)) return;

        setIsSending(true);

        // Send media first if any exist
        if (hasImages) {
            try {
                // Convert base64 data URLs back to Blobs for uploading
                const mediaBlobs = await Promise.all(pendingImages.map(async (dataUrl) => {
                    const res = await fetch(dataUrl);
                    return await res.blob();
                }));

                // Clear the preview immediately for better UX
                const mediaToSend = [...mediaBlobs];
                setPendingImages([]);

                await sendMedia(mediaToSend);
            } catch (err) {
                console.error("Failed to process media for sending:", err);
                toast.error("Failed to send some media.");
            }
        }

        // Send text message if any exists
        if (hasText) {
            const content = text.trim();
            const msgReplyToId = replyTo?.id;
            setText('');
            setReplyTo(null);

            // Reset textarea height after sending
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }

            const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                content,
                type: 'text',
                reply_to_id: msgReplyToId
            });

            if (msgError) {
                console.error('[sendMessage] Insert failed:', msgError);
                toast.error(`Failed to send: ${msgError.message}`);
                setIsSending(false);
                return;
            }

            // Use upsert-style update that any participant can do
            const { error: convError } = await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', activeConvo.id);

            if (convError) {
                console.warn('[sendMessage] Could not update conversation timestamp:', convError.message);
            }

            playMessageSentSound();
            loadConversations();
        }

        setIsSending(false);
    };

    // ─── Send media ───────────────────────────────────────────────────────────────
    const sendMedia = async (files: (Blob | File)[]) => {
        if (!activeConvo || !currentUserId || files.length === 0) return;
        setIsUploading(true);
        try {
            const uploadedMedia: { url: string; size: number; type: string }[] = [];

            for (const file of files) {
                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');
                const isAudio = file.type.startsWith('audio/');

                let finalFile: Blob | File = file;
                let ext = 'bin';

                if (isImage) {
                    finalFile = await imageCompression(file as File, { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true });
                    ext = 'jpg';
                } else if (isVideo) {
                    ext = 'mp4';
                } else if (isAudio) {
                    ext = 'mp3';
                }

                const path = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

                const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, finalFile, {
                    upsert: true,
                    contentType: file.type
                });
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

                let msgType = 'image';
                if (isVideo) msgType = 'video';
                else if (isAudio) msgType = 'audio';

                uploadedMedia.push({ url: publicUrl, size: finalFile.size, type: msgType });
            }

            const messagesToInsert = uploadedMedia.map(({ url, size, type }) => ({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                type: type,
                media_url: url,
                media_size: size
            }));

            await supabase.from('messages').insert(messagesToInsert);
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
            loadConversations();
            setPendingImages([]);
        } catch (err) {
            console.error('Send media error:', err);
            toast.error('Failed to send media');
        }
        setIsUploading(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const readFiles = files.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });

        const results = await Promise.all(readFiles);
        setPendingImages(prev => [...prev, ...results]);
    };

    // ─── Send voice note ───────────────────────────────────────────────────────────
    const sendVoiceNote = async (blob: Blob, duration: number) => {
        if (!activeConvo || !currentUserId) return;
        setIsSendingVoice(true);
        try {
            const fileName = `voice_${Date.now()}.webm`;
            const path = `${currentUserId}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, blob, {
                contentType: 'audio/webm',
                upsert: true
            });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

            await supabase.from('messages').insert({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                type: 'voice',
                media_url: publicUrl,
                media_duration: duration
            });

            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
            playMessageSentSound();
            loadConversations();

            // Animation for "Sending..." feedback
            setTimeout(() => setIsSendingVoice(false), 800);
        } catch (err) {
            console.error('Send voice note error:', err);
            toast.error('Failed to send voice note');
            setIsSendingVoice(false);
        }
    };

    // ─── Start a new conversation ──────────────────────────────────────────────────
    const startConversation = async (otherUser: Profile) => {
        if (!currentUserId) return;

        // Check if conversation already exists
        const existing = conversations.find(c => c.type === 'direct' && c.otherUser?.id === otherUser.id);
        if (existing) { setActiveConvo(existing); setShowNewChat(false); return; }

        // Pre-generate the UUID client-side to avoid the RLS conflict
        // that happens when chaining .select() after .insert() on conversations
        // (SELECT policy requires conversation_participants to exist, which they don't yet)
        const newConvoId = crypto.randomUUID();
        const now = new Date().toISOString();

        const { error: insertError } = await supabase
            .from('conversations')
            .insert({ id: newConvoId, type: 'direct', created_by: currentUserId, updated_at: now });

        if (insertError) { toast.error('Failed to start conversation: ' + insertError.message); return; }

        const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert([
                { conversation_id: newConvoId, user_id: currentUserId },
                { conversation_id: newConvoId, user_id: otherUser.id }
            ]);

        if (participantsError) { toast.error('Failed to add participants'); return; }

        const newConvo: Conversation = {
            id: newConvoId,
            type: 'direct',
            otherUser,
            unreadCount: 0,
            updated_at: now
        };

        setConversations(prev => [newConvo, ...prev]);
        setActiveConvo(newConvo);
        setShowNewChat(false);
        toast.success(`Chat started with ${otherUser.full_name}!`);
    };



    const filteredUsers = allUsers.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredConvos = conversations.filter(c => {
        const name = c.type === 'direct' ? c.otherUser?.full_name : c.name;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // ─── Viewport Lock ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalOverscroll = document.body.style.overscrollBehavior;

        // Force body to be non-scrollable and no-bounce
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        document.documentElement.style.overscrollBehavior = 'none';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.overscrollBehavior = originalOverscroll;
            document.documentElement.style.overscrollBehavior = originalOverscroll;
        };
    }, []);

    // ─── Fetch Call History ──────────────────────────────────────────────────────
    const fetchCalls = useCallback(async () => {
        if (!currentUserId) return;
        try {
            // Get all conversation IDs first
            const { data: participations } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', currentUserId);

            if (!participations?.length) return;
            const convoIds = participations.map(p => p.conversation_id);

            const { data, error } = await supabase
                .from('messages')
                .select(`
                    id, conversation_id, sender_id, type, content, 
                    call_status, call_duration, call_type, caller_id, 
                    created_at,
                    sender:profiles(id, full_name, avatar_url, role)
                `)
                .in('conversation_id', convoIds)
                .eq('type', 'call_event')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Enhance with conversation info (specifically other user)
            const enhancedLogs = (data || []).map(log => {
                const convo = conversations.find(c => c.id === log.conversation_id);
                return { ...log, conversation: convo };
            });

            setCallLogs(enhancedLogs as any);
        } catch (err) {
            console.error('Failed to fetch call history:', err);
        }
    }, [currentUserId, conversations]);

    const deleteCallLog = async (logId: string) => {
        try {
            const { data: msg } = await supabase.from('messages').select('deleted_for_users').eq('id', logId).single();
            const currentDeleted = msg?.deleted_for_users || [];
            const updatedDeleted = [...new Set([...currentDeleted, currentUserId])];

            const { error } = await supabase
                .from('messages')
                .update({ deleted_for_users: updatedDeleted })
                .eq('id', logId);

            if (error) throw error;
            setCallLogs(prev => prev.filter(l => l.id !== logId));
            toast.success('Call record removed');
        } catch (err) {
            console.error('Failed to delete call log:', err);
            toast.error('Failed to remove call record');
        }
    };

    useEffect(() => {
        if (activeTab === 'calls') {
            fetchCalls();
        }
    }, [activeTab, fetchCalls]);

    // ─── Render Sidebar ──────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background z-0 touch-none h-full" style={{ overscrollBehavior: 'none' }}>
            <div className="flex-1 flex overflow-hidden touch-auto h-full">


                {/* ── Image Viewer Overlay ── */}
                {imageToView && pendingImages.length === 0 && (
                    <ImageViewerModal
                        url={imageToView}
                        onClose={() => setImageToView(null)}
                        onEdit={(imgUrl) => {
                            setImageToView(null);
                            // Pre-load the URL into the editor (treated as pending image)
                            setPendingImages(prev => [...prev, imgUrl]);
                        }}
                    />
                )}



                {/* ─────────────── LEFT: Conversation List & Portal ─────────────── */}
                <div className={`
                    w-full md:w-80 lg:w-96 flex-shrink-0 
                    border-r border-white/5 flex-col h-full min-h-0
                    ${activeConvo ? 'hidden md:flex' : 'flex'}
                `}>
                    {/* Panel header */}
                    <div className="p-5 border-b border-white/5 safe-area-pt-large flex flex-col items-center">
                        <div className="w-full flex items-center mb-4 md:mb-8 transition-all gap-4">
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('openMobileSidebar'))}
                                className="md:hidden group/back w-11 h-11 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center transition-all duration-500 hover:bg-primary/10 hover:border-primary/20 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] backdrop-blur-3xl"
                                title="Back to Dashboard"
                            >
                                <LayoutDashboard className="w-4 h-4 text-white/40 group-hover/back:text-primary group-hover/back:drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)] transition-all duration-500" />
                            </button>

                            <div className="leading-relaxed flex-1">
                                <h1 className="text-white font-black text-xl tracking-tight">
                                    {settings.academy_name} Chat
                                </h1>
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest leading-none mt-1 hidden md:block">{activeTab}</p>
                            </div>
                        </div>



                        {activeTab !== 'settings' && (
                            <div className="w-full flex items-center gap-3 group/search">
                                <Search className="w-4 h-4 text-white/30 group-focus-within/search:text-primary transition-colors shrink-0" />
                                <div className="relative flex-1">
                                    <input
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder=""
                                        className="w-full px-4 py-2.5 !bg-white/[0.04] border border-white/5 rounded-xl text-sm text-white placeholder:text-white/20 font-medium focus:outline-none focus:border-primary/30 transition-all !shadow-none ring-0"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Logic */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'chats' ? (
                            showNewChat ? (
                                // New Chat: Show all users
                                <div className="flex flex-col h-full">
                                    {/* Premium Header */}
                                    <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5">
                                        <button
                                            onClick={() => setShowNewChat(false)}
                                            className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <div>
                                            <p className="text-[11px] font-black uppercase text-white/70 tracking-widest leading-none">New Chat</p>
                                            <p className="text-[8px] font-black uppercase text-white/20 tracking-[0.2em] mt-0.5">{filteredUsers.length} people available</p>
                                        </div>
                                    </div>

                                    {/* User Cards */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                                        {filteredUsers.map(user => {
                                            const lastSeenDate = user.last_seen ? new Date(user.last_seen) : null;
                                            const isRecentlyActive = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime()) < 6000;
                                            const isActuallyOnline = presenceState[user.id] !== undefined;
                                            const isOnline = isActuallyOnline || (user.is_in_chat && isRecentlyActive);
                                            const isAway = !isActuallyOnline && (!user.is_in_chat && isRecentlyActive);

                                            const roleColor = {
                                                admin: 'from-rose-500 to-pink-600',
                                                head_coach: 'from-violet-500 to-purple-600',
                                                coach: 'from-blue-500 to-indigo-600',
                                                student: 'from-emerald-500 to-teal-600',
                                                reception: 'from-amber-500 to-orange-600',
                                                receptionist: 'from-amber-500 to-orange-600',
                                                cleaner: 'from-slate-400 to-slate-600',
                                            }[user.role?.toLowerCase()] || 'from-primary to-accent';

                                            const roleBadgeColor = {
                                                admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                                                head_coach: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                                                coach: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                                student: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                                reception: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                receptionist: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                                cleaner: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                                            }[user.role?.toLowerCase()] || 'bg-primary/10 text-primary border-primary/20';

                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => startConversation(user)}
                                                    className="w-full flex items-center gap-3 px-3 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all duration-200 group cursor-pointer active:scale-[0.98]"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => e.key === 'Enter' && startConversation(user)}
                                                >
                                                    {/* Avatar */}
                                                    <div className="relative flex-shrink-0">
                                                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center font-black text-white text-sm shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-200`}>
                                                            {user.avatar_url
                                                                ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                                                                : user.full_name[0].toUpperCase()
                                                            }
                                                        </div>
                                                        {/* Online indicator */}
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0E0E11] ${isOnline ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse' :
                                                            isAway ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]' :
                                                                'bg-white/10'
                                                            }`} />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="text-white/90 font-black text-sm leading-tight truncate group-hover:text-white transition-colors">{user.full_name}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${roleBadgeColor}`}>
                                                                {user.role?.replace('_', ' ')}
                                                            </span>
                                                            {isOnline && <span className="text-emerald-400 text-[8px] font-black uppercase tracking-wide">• Online</span>}
                                                            {isAway && <span className="text-amber-400 text-[8px] font-black uppercase tracking-wide">• Away</span>}
                                                        </div>
                                                    </div>

                                                    {/* Arrow */}
                                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                // Conversation list
                                filteredConvos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                            <MessageSquare className="w-7 h-7 text-white/20" />
                                        </div>
                                        <div>
                                            <p className="text-white/40 font-black text-sm">No conversations yet</p>
                                            <p className="text-white/20 text-xs mt-1">Click + to start a new chat</p>
                                        </div>
                                    </div>
                                ) : (
                                    filteredConvos.map((convo, idx) => {
                                        const name = convo.type === 'direct' ? convo.otherUser?.full_name : convo.name;
                                        const lastText = convo.lastMessage?.type === 'text'
                                            ? convo.lastMessage.content
                                            : convo.lastMessage?.type === 'image' ? '📷 Photo'
                                                : convo.lastMessage?.type === 'voice' ? '🎤 Voice note'
                                                    : convo.lastMessage?.type === 'call_event' ? '📞 Call'
                                                        : '';
                                        const isActive = activeConvo?.id === convo.id;
                                        const isTopItem = idx < 2;

                                        const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent) => {
                                            longPressTimerRef.current = setTimeout(() => {
                                                setLongPressActive(null);
                                                setLongPressConvoId(convo.id);
                                            }, 600);
                                            setLongPressActive(convo.id);
                                        };

                                        const handleLongPressEnd = () => {
                                            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                                            setLongPressActive(null);
                                        };

                                        return (
                                            <div
                                                key={convo.id}
                                                onClick={() => setActiveConvo(convo)}
                                                onMouseDown={handleLongPressStart}
                                                onMouseUp={handleLongPressEnd}
                                                onMouseLeave={handleLongPressEnd}
                                                onTouchStart={handleLongPressStart}
                                                onTouchEnd={handleLongPressEnd}
                                                className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 select-none cursor-pointer ${isActive ? 'bg-primary/10 border-r-2 border-primary' : 'hover:bg-white/[0.03]'} ${menuOpenId === convo.id ? 'z-50 relative' : ''} ${longPressActive === convo.id ? 'scale-[0.97] bg-red-500/10' : ''}`}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => e.key === 'Enter' && setActiveConvo(convo)}
                                            >
                                                {/* Avatar */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-white text-base shadow-lg overflow-hidden">
                                                        {convo.otherUser?.avatar_url
                                                            ? <img src={convo.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                                            : (name || 'U')[0]
                                                        }
                                                    </div>
                                                </div>
                                                {/* Info */}
                                                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                                                    {(() => {
                                                        const prof = convo.otherUser;
                                                        if (!prof) return null;
                                                        const lastSeenDate = prof.last_seen ? new Date(prof.last_seen) : null;
                                                        const isRecentlyActive = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime()) < 6000;
                                                        const isActuallyOnline = presenceState[prof.id] !== undefined;
                                                        const isOnline = isActuallyOnline || (prof.is_in_chat && isRecentlyActive);
                                                        const isAway = !isActuallyOnline && (!prof.is_in_chat && isRecentlyActive);

                                                        if (isOnline) return <p className="text-emerald-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]">Online</p>;
                                                        if (isAway) return <p className="text-amber-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]">Away</p>;
                                                        return <p className="text-white/10 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Offline</p>;
                                                    })()}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-white font-black text-sm truncate flex-1 min-w-0">{name}</p>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <span className="text-white/25 text-[9px] font-bold">
                                                                {convo.lastMessage ? new Date(convo.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </span>
                                                            {convo.unreadCount > 0 && (
                                                                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center flex-shrink-0 animate-in fade-in zoom-in duration-300">
                                                                    {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                                                                </span>
                                                            )}
                                                            {/* Premium Options Menu */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMenuOpenId(menuOpenId === convo.id ? null : convo.id);
                                                                    }}
                                                                    className={`p-1.5 rounded-xl hover:bg-white/10 transition-all shadow-lg ${menuOpenId === convo.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                                {menuOpenId === convo.id && (
                                                                    <div className={`absolute right-0 ${isTopItem ? 'top-full mt-2 origin-top-right' : 'bottom-full mb-2 origin-bottom-right'} bg-[#1A1D21]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-2 min-w-[190px] backdrop-blur-2xl animate-premium-in`}>
                                                                        <div className="px-3 py-2 border-b border-white/5 mb-1.5">
                                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Chat Actions</p>
                                                                        </div>
                                                                        {/* Audio Call */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                globalInitiateCall('audio', convo.otherUser as any, convo.id);
                                                                                setMenuOpenId(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-[11px] font-bold tracking-wide text-white/70 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-all group/item"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover/item:bg-emerald-500/20 transition-all">
                                                                                <Phone className="w-4 h-4" />
                                                                            </div>
                                                                            Audio Call
                                                                        </button>
                                                                        {/* Video Call */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                globalInitiateCall('video', convo.otherUser as any, convo.id);
                                                                                setMenuOpenId(null);
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-[11px] font-bold tracking-wide text-white/70 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-all group/item"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover/item:bg-indigo-500/20 transition-all">
                                                                                <Video className="w-4 h-4" />
                                                                            </div>
                                                                            Video Call
                                                                        </button>
                                                                        {/* Mark as Read */}
                                                                        {convo.unreadCount > 0 && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); markAsRead(convo.id); setMenuOpenId(null); }}
                                                                                className="w-full text-left px-3 py-2 text-[11px] font-bold tracking-wide text-white/70 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-all group/item"
                                                                            >
                                                                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover/item:bg-primary/20 transition-all">
                                                                                    <Check className="w-4 h-4" />
                                                                                </div>
                                                                                Mark as Read
                                                                            </button>
                                                                        )}
                                                                        <div className="h-px bg-white/5 my-1.5 mx-2" />
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setSelectedMessageIds(new Set([convo.lastMessage?.id].filter(Boolean) as string[])); }}
                                                                            className="w-full text-left px-3 py-2 text-[11px] font-bold tracking-wide text-white/50 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-all group/item"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-white/10 transition-all">
                                                                                <CheckSquare className="w-4 h-4" />
                                                                            </div>
                                                                            Select Messages
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); clearConversation(convo.id); setMenuOpenId(null); }}
                                                                            className="w-full text-left px-3 py-2 text-[11px] font-bold tracking-wide text-white/50 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-all group/item"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-white/10 transition-all">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </div>
                                                                            Clear History
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); setMenuOpenId(null); }}
                                                                            className="w-full text-left px-3 py-2 text-[11px] font-bold tracking-wide text-red-400/50 hover:text-red-400 hover:bg-red-400/5 rounded-xl flex items-center gap-3 transition-all group/item"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-red-400/10 text-red-400/70 flex items-center justify-center group-hover/item:bg-red-400/20 transition-all">
                                                                                <Archive className="w-4 h-4" />
                                                                            </div>
                                                                            Hide Chat
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                                        <p className="text-white/35 text-xs truncate flex-1 min-w-0">{lastText}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )
                            )
                        ) : activeTab === 'calls' ? (
                            <div className="flex flex-col h-full">
                                {callLogs.length === 0 ? (
                                    <div className="flex flex-col h-full items-center justify-center p-8 opacity-40 text-center gap-4">
                                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Phone className="w-8 h-8 text-white/20" />
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm uppercase tracking-widest">No Recent Calls</p>
                                            <p className="text-white/30 text-[10px] uppercase font-bold tracking-tighter mt-1">Your call history will be listed here</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                        {callLogs.map(log => {
                                            const otherUser = log.sender_id === currentUserId
                                                ? (log as any).conversation?.otherUser
                                                : log.sender;

                                            if (!otherUser) return null;

                                            const isOutgoing = log.caller_id === currentUserId;
                                            const isMissed = log.call_status === 'missed';
                                            const callDate = new Date(log.created_at);
                                            const isToday = callDate.toDateString() === new Date().toDateString();

                                            return (
                                                <div
                                                    key={log.id}
                                                    onClick={() => {
                                                        const convo = (log as any).conversation;
                                                        if (convo) {
                                                            setActiveConvo(convo);
                                                            setActiveTab('chats');
                                                        }
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] rounded-2xl transition-all group cursor-pointer relative overflow-hidden"
                                                >
                                                    <div className="relative shrink-0">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden shadow-lg border border-white/5">
                                                            {otherUser.avatar_url
                                                                ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                                                : <span className="text-white font-black text-xs">{otherUser.full_name[0]}</span>
                                                            }
                                                        </div>
                                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center ${isMissed ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                                            {isOutgoing ? (
                                                                <ArrowUpRight className="w-2.5 h-2.5 text-white" />
                                                            ) : (
                                                                <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-white font-bold text-[13px] truncate">{otherUser.full_name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-white/20 text-[10px] font-black uppercase tracking-tighter shrink-0">
                                                                    {isToday ? callDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : callDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isMissed ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                {isMissed ? (
                                                                    <PhoneMissed className="w-2.5 h-2.5" />
                                                                ) : log.call_type === 'video' ? (
                                                                    <Video className="w-2.5 h-2.5" />
                                                                ) : (
                                                                    <Phone className="w-2.5 h-2.5" />
                                                                )}
                                                                <span>{isMissed ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                                                                {isMissed ? (
                                                                    <PhoneMissed className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                                                ) : isOutgoing ? (
                                                                    <ArrowUpRight className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                                                ) : (
                                                                    <ArrowDownLeft className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                                                )}
                                                            </div>
                                                            {log.call_duration && !isMissed && (
                                                                <span className="text-white/20 text-[10px] lowercase font-bold shrink-0">• {Math.floor(log.call_duration / 60)}m {log.call_duration % 60}s</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 md:transform md:translate-x-2 md:group-hover:translate-x-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteCallLog(log.id);
                                                            }}
                                                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-400/10 hover:border-rose-400/20 flex items-center justify-center transition-all"
                                                            title="Delete history"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                        <div className="h-4 w-[1px] bg-white/5 mx-0.5 hidden md:block" />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const convo = (log as any).conversation;
                                                                if (convo) {
                                                                    setActiveConvo(convo);
                                                                    globalInitiateCall('audio', convo.otherUser as any, convo.id);
                                                                }
                                                            }}
                                                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-primary hover:bg-primary/10 hover:border-primary/20 flex items-center justify-center transition-all"
                                                            title="Voice call"
                                                        >
                                                            <Phone className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const convo = (log as any).conversation;
                                                                if (convo) {
                                                                    setActiveConvo(convo);
                                                                    globalInitiateCall('video', convo.otherUser as any, convo.id);
                                                                }
                                                            }}
                                                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-primary hover:bg-primary/10 hover:border-primary/20 flex items-center justify-center transition-all"
                                                            title="Video call"
                                                        >
                                                            <Video className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // ─── Settings Tab: Ringtone Picker ─────────────────────────
                            <div className="flex flex-col h-full overflow-y-auto p-4 gap-5">
                                {/* Header */}
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <Volume2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-[13px] uppercase tracking-widest">Ringtone</p>
                                        <p className="text-white/30 text-[9px] uppercase font-bold tracking-tighter">Pick from presets or your device</p>
                                    </div>
                                </div>

                                {/* Preset Ringtones */}
                                <div className="space-y-2">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] px-1">Presets</p>
                                    {PRESET_RINGTONES.map(preset => {
                                        const isActive = ringtoneUrl === preset.url;
                                        return (
                                            <div
                                                key={preset.id}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all cursor-pointer ${isActive
                                                    ? 'bg-primary/10 border-primary/30'
                                                    : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.06]'
                                                    }`}
                                                onClick={() => {
                                                    ringtonePreviewAudio?.pause();
                                                    setRingtonePreviewAudio(null);
                                                    setRingtoneUrl(preset.url);
                                                    localStorage.setItem('healy_ringtone_url', preset.url);
                                                    toast.success('Ringtone changed!');
                                                }}
                                            >
                                                <span className={`text-sm flex-1 font-bold text-left ${isActive ? 'text-primary' : 'text-white/70'}`}>{preset.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (ringtonePreviewAudio) {
                                                                ringtonePreviewAudio.pause();
                                                                ringtonePreviewAudio.currentTime = 0;
                                                                setRingtonePreviewAudio(null);
                                                            } else {
                                                                const a = new Audio(preset.url);
                                                                a.play().catch(() => { });
                                                                a.onended = () => setRingtonePreviewAudio(null);
                                                                setRingtonePreviewAudio(a);
                                                            }
                                                        }}
                                                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary/20 transition-all"
                                                    >
                                                        <Play className="w-3 h-3 text-white/60" />
                                                    </button>
                                                    {isActive && <Check className="w-4 h-4 text-primary" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Upload from Device */}
                                <div className="space-y-2">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] px-1">From your device</p>
                                    <button
                                        onClick={() => ringtoneFileRef.current?.click()}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-white/20 text-white/40 hover:text-white hover:border-primary/40 hover:bg-primary/5 transition-all"
                                    >
                                        <Mic className="w-4 h-4" />
                                        <span className="text-sm font-bold">Upload Custom Ringtone (MP3 / M4A)</span>
                                    </button>
                                    <input
                                        ref={ringtoneFileRef}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const url = URL.createObjectURL(file);
                                            setRingtoneUrl(url);
                                            localStorage.setItem('healy_ringtone_url', url);
                                            toast.success(`"${file.name}" set as ringtone!`);
                                        }}
                                    />
                                </div>

                                {/* Current Ringtone + Preview */}
                                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mb-3">Current Ringtone</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-white/70 text-xs font-bold truncate flex-1">
                                            {PRESET_RINGTONES.find(p => p.url === ringtoneUrl)?.label ?? 'Custom File'}
                                        </p>
                                        <button
                                            onClick={() => {
                                                if (ringtonePreviewAudio) {
                                                    ringtonePreviewAudio.pause();
                                                    setRingtonePreviewAudio(null);
                                                } else {
                                                    const a = new Audio(ringtoneUrl);
                                                    a.play().catch(() => toast.error('Cannot preview — tap the screen first'));
                                                    setTimeout(() => { a.pause(); a.currentTime = 0; setRingtonePreviewAudio(null); }, 4000);
                                                    a.onended = () => setRingtonePreviewAudio(null);
                                                    setRingtonePreviewAudio(a);
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${ringtonePreviewAudio
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                                                }`}
                                        >
                                            {ringtonePreviewAudio
                                                ? <><Pause className="w-3 h-3" /> Stop</>
                                                : <><Play className="w-3 h-3" /> Preview</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </div>

                        )}
                    </div>

                    {/* Desktop Bottom Navigation Container */}
                    <div className="hidden md:block p-4 border-t border-white/5 bg-background/20 relative">
                        {/* FAB: New Chat (Desktop Bottom-Right) */}
                        {!showNewChat && activeTab === 'chats' && (
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="absolute -top-12 right-4 w-12 h-12 rounded-full bg-primary/20 backdrop-blur-xl text-primary shadow-2xl flex items-center justify-center active:scale-90 hover:bg-primary/30 transition-all z-50 animate-premium-in border border-white/10"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        )}

                        <div className="flex items-center justify-around w-full h-14 bg-black/20 backdrop-blur-3xl border border-white/5 rounded-2xl px-2 shadow-xl">
                            <button
                                onClick={() => { setActiveTab('chats'); setShowNewChat(false); }}
                                className={`flex items-center justify-center transition-all w-full h-10 rounded-xl ${activeTab === 'chats' ? 'text-primary bg-primary/10' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
                                title="Chats"
                            >
                                <div className="relative">
                                    <MessageSquare className={`w-[18px] h-[18px] transition-transform ${activeTab === 'chats' ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'group-hover:scale-110'}`} />
                                    {conversations.some(c => c.unreadCount > 0) && (
                                        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full border border-[#0E0E11]" />
                                    )}
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('calls')}
                                className={`flex items-center justify-center transition-all w-full h-10 rounded-xl ${activeTab === 'calls' ? 'text-primary bg-primary/10' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
                                title="Recent Calls"
                            >
                                <Phone className={`w-[18px] h-[18px] transition-transform ${activeTab === 'calls' ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'group-hover:scale-110'}`} />
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`flex items-center justify-center transition-all w-full h-10 rounded-xl ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
                                title="Settings"
                            >
                                <Settings className={`w-[18px] h-[18px] transition-transform ${activeTab === 'settings' ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'group-hover:scale-110'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ─────────────── CENTER: Chat Window ─────────────── */}
                {activeConvo ? (
                    <div className="flex-1 flex flex-col min-w-0 bg-background">

                        {/* Chat header */}
                        <div className={`sticky top-0 z-20 flex items-center justify-between px-5 border-b border-white/5 transition-all duration-300 bg-background/50 backdrop-blur-xl flex-shrink-0 safe-area-h-header`}>
                            {/* LEFT: Contact Info */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveConvo(null)}
                                    className="md:hidden w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all mr-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-white text-sm overflow-hidden shadow-lg">
                                        {activeConvo.otherUser?.avatar_url
                                            ? <img src={activeConvo.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                            : (activeConvo.otherUser?.full_name || 'G')[0]
                                        }
                                    </div>
                                </div>
                                <div className="block">
                                    {(() => {
                                        const prof = activeConvo.otherUser;
                                        if (!prof) return null;
                                        const lastSeenDate = prof.last_seen ? new Date(prof.last_seen) : null;
                                        const now = new Date();
                                        const isRecentlyActive = lastSeenDate && (now.getTime() - lastSeenDate.getTime()) < 6000;
                                        const isActuallyOnline = presenceState[prof.id] !== undefined;

                                        if (isActuallyOnline || (prof.is_in_chat && isRecentlyActive)) {
                                            return (
                                                <div className="flex items-center gap-1.5 animate-in fade-in duration-300">
                                                    <div className="relative w-2 h-2">
                                                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20 duration-500" />
                                                        <div className="relative w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)]" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">Online</span>
                                                </div>
                                            );
                                        }
                                        if (!isActuallyOnline && !prof.is_in_chat && isRecentlyActive) {
                                            return <p className="text-amber-400 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Away</p>;
                                        }
                                        if (lastSeenDate) {
                                            const timeStr = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            const isToday = lastSeenDate.toDateString() === now.toDateString();
                                            return <p className="text-white/30 text-[9px] font-black uppercase tracking-widest leading-none mb-1">
                                                Last seen {isToday ? timeStr : lastSeenDate.toLocaleDateString()}
                                            </p>;
                                        }
                                        return <p className="text-white/20 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Offline</p>;
                                    })()}
                                    <p className="text-white font-black text-sm">
                                        {activeConvo.type === 'direct' ? activeConvo.otherUser?.full_name : activeConvo.name}
                                    </p>
                                </div>
                            </div>

                            {/* Selection Actions Overlay */}
                            {selectedMessageIds.size > 0 && (
                                <div className="absolute inset-0 bg-background z-20 flex items-center justify-between px-4 md:px-6 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedMessageIds(new Set())}
                                            className="w-10 h-10 rounded-full hover:bg-white/5 text-white/50 hover:text-white transition-all flex items-center justify-center"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-white font-black text-sm leading-none">{selectedMessageIds.size}</span>
                                            <span className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">Selected</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <button
                                            onClick={() => setShowForwardModal(true)}
                                            className="w-10 h-10 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all flex items-center justify-center group"
                                            title="Forward"
                                        >
                                            <Reply className="w-5 h-5 group-hover:scale-110 transition-transform -scale-x-100" />
                                        </button>
                                        <button
                                            onClick={togglePinForSelected}
                                            className="w-10 h-10 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all flex items-center justify-center group"
                                            title="Toggle Pin"
                                        >
                                            <Pin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button
                                            onClick={deleteSelectedMessages}
                                            className="w-10 h-10 rounded-xl hover:bg-white/5 text-red-500 hover:text-red-400 transition-all flex items-center justify-center group"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </button>

                                        <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block" />

                                        <button
                                            onClick={() => {
                                                const allIds = new Set(messages.map(m => m.id));
                                                setSelectedMessageIds(allIds);
                                            }}
                                            className="px-4 py-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all hidden md:block"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* RIGHT: Call Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => globalInitiateCall('audio', activeConvo.otherUser as any, activeConvo.id)}
                                    className="w-9 h-9 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-primary/15 hover:border-primary/20 flex items-center justify-center transition-all"
                                >
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => globalInitiateCall('video', activeConvo.otherUser as any, activeConvo.id)}
                                    className="w-9 h-9 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-primary/15 hover:border-primary/20 flex items-center justify-center transition-all"
                                >
                                    <Video className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Conditional Rendering: Media Preview vs Messages Area */}
                        {pendingImages.length > 0 ? (
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0F1115] animate-in fade-in duration-200">
                                {/* Top Tools Bar */}
                                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-background/50 backdrop-blur-md flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => { setPendingImages([]); setImageToView(null); }}
                                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button type="button" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all group" title="Undo (Coming Soon)">
                                            <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
                                        </button>
                                        <button type="button" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-all group" title="Crop (Coming Soon)">
                                            <Crop className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>
                                        <div className="w-px h-6 bg-white/10 mx-1" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentImg = imageToView || pendingImages[pendingImages.length - 1];
                                                const next = pendingImages.filter(img => img !== currentImg);
                                                setPendingImages(next);
                                                setImageToView(null);
                                            }}
                                            className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all group mt-0"
                                            title="Delete Media"
                                        >
                                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                {/* Main Preview */}
                                <div className="flex-1 flex items-center justify-center p-6 min-h-0 relative">
                                    {(() => {
                                        const url = imageToView || pendingImages[pendingImages.length - 1];
                                        if (!url) return null;

                                        const isVideo = url.startsWith('data:video/');
                                        const isAudio = url.startsWith('data:audio/');

                                        if (isVideo) {
                                            return (
                                                <video
                                                    src={url}
                                                    controls
                                                    className="max-w-full max-h-full rounded-2xl object-contain drop-shadow-2xl ring-1 ring-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                                                />
                                            );
                                        }

                                        if (isAudio) {
                                            return (
                                                <div className="flex flex-col items-center gap-6 p-8 w-full max-w-sm bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl animate-premium-up">
                                                    <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-2xl animate-pulse">
                                                        <Volume2 className="w-10 h-10 text-amber-500" />
                                                    </div>
                                                    <div className="w-full space-y-4 text-center">
                                                        <p className="text-white font-black text-lg tracking-tight">Audio Preview</p>
                                                        <audio src={url} controls className="w-full h-10 filter invert brightness-100 opacity-80" />
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <img
                                                src={url}
                                                alt="Preview"
                                                className="max-w-full max-h-full rounded-2xl object-contain drop-shadow-2xl ring-1 ring-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                                            />
                                        );
                                    })()}
                                </div>

                                {/* Thumbnails Gallery */}
                                <div className="flex-shrink-0 p-4 border-t border-white/5 bg-background/50 backdrop-blur-md">
                                    <div className="max-w-3xl mx-auto flex gap-3 overflow-x-auto pb-2 scrollbar-none items-center justify-center px-2">
                                        {pendingImages.map((imgUrl, idx) => {
                                            const isSelected = (imageToView || pendingImages[pendingImages.length - 1]) === imgUrl;
                                            const isVideo = imgUrl.startsWith('data:video/');
                                            const isAudio = imgUrl.startsWith('data:audio/');

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => setImageToView(imgUrl)}
                                                    className={`relative w-16 h-16 shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${isSelected ? 'border-primary scale-110 shadow-lg shadow-primary/20 z-10' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                                                >
                                                    {isVideo ? (
                                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center relative">
                                                            <video src={imgUrl} className="w-full h-full object-cover opacity-50" />
                                                            <Play className="w-5 h-5 text-white/40 absolute" strokeWidth={3} />
                                                        </div>
                                                    ) : isAudio ? (
                                                        <div className="w-full h-full bg-amber-500/10 flex items-center justify-center">
                                                            <Volume2 className="w-6 h-6 text-amber-500/40" />
                                                        </div>
                                                    ) : (
                                                        <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                                    )}
                                                    {isSelected && <div className="absolute inset-0 bg-primary/10 transition-colors pointer-events-none" />}
                                                </div>
                                            );
                                        })}
                                        {/* Add More Button */}
                                        <button
                                            type="button"
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 bg-white/5 hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-white/50 hover:text-primary transition-all group"
                                        >
                                            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-40">
                                        <MessageSquare className="w-10 h-10 text-white/20" />
                                        <p className="text-white/30 font-bold text-sm">Start the conversation!</p>
                                    </div>
                                )}
                                {groupedMessages.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        isOwn={msg.sender_id === currentUserId}
                                        currentUserId={currentUserId || undefined}
                                        onReply={setReplyTo}
                                        onPin={m => togglePinMessage(m.id, !!m.is_pinned)}
                                        isSelected={selectedMessageIds.has(msg.id)}
                                        isSelectionMode={selectedMessageIds.size > 0}
                                        onSelect={toggleMessageSelection}
                                        onImageClick={setImageToView}
                                    />
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        {/* Forward Modal */}
                        {showForwardModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForwardModal(false)} />
                                <div className="relative bg-[#0F1115] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden animate-premium-up shadow-2xl">
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                        <h3 className="text-lg font-black text-white px-2">Forward to...</h3>
                                        <button onClick={() => setShowForwardModal(false)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-thin">
                                        {conversations.map(convo => {
                                            const otherUser = convo.otherUser;
                                            const name = convo.type === 'direct' ? otherUser?.full_name : convo.name;
                                            if (!name) return null;
                                            return (
                                                <button
                                                    key={convo.id}
                                                    onClick={() => handleForwardMessages(convo.id)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-black text-white">
                                                        {(name || '?')[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold truncate">{name}</p>
                                                        <p className="text-white/30 text-[10px] uppercase tracking-widest">{convo.type === 'direct' ? (otherUser?.role || 'User') : 'Group'}</p>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                        <Send className="w-3.5 h-3.5 text-primary" />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Delete Confirmation Modal */}
                        {showDeleteModal && (
                            <DeleteConfirmationModal
                                count={selectedMessageIds.size}
                                onCancel={() => setShowDeleteModal(false)}
                                onDeleteForMe={deleteForMe}
                                onDeleteForEveryone={deleteForEveryone}
                                canDeleteForEveryone={Array.from(selectedMessageIds).every(id => {
                                    const m = messages.find(msg => msg.id === id);
                                    return m?.sender_id === currentUserId && !!currentUserId;
                                })}
                            />
                        )}

                        {/* Input bar - Minimal & Glassy */}
                        <div className="flex-shrink-0 p-4 bg-transparent backdrop-blur-3xl" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
                            {/* Reply Preview */}
                            {replyTo && (
                                <div className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group animate-premium-up shadow-2xl backdrop-blur-3xl mx-2 max-w-5xl md:mx-auto">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-1 h-8 rounded-full bg-primary" />
                                        <div className="min-w-0">
                                            <p className="text-primary font-black text-[10px] uppercase tracking-widest leading-none mb-1">Replying to {replyTo.sender?.full_name}</p>
                                            <p className="text-white/50 text-xs truncate">
                                                {replyTo.type === 'text' ? replyTo.content : `[${replyTo.type}]`}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Main Input Form */}
                            <form onSubmit={sendMessage} className="max-w-5xl mx-auto flex items-end gap-3 px-2">
                                <div className="flex items-center gap-1.5 pb-1">
                                    {/* Specialized File Inputs */}
                                    <input
                                        ref={galleryInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        multiple // Allows selecting multiple photos/videos
                                        className="hidden"
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (!files.length) return;

                                            const readFiles = files.map(file => {
                                                return new Promise<string>((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onload = () => resolve(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                });
                                            });

                                            const results = await Promise.all(readFiles);
                                            setPendingImages(prev => [...prev, ...results]);
                                            e.target.value = '';
                                            setShowAttachMenu(false);
                                            // Ensure we scroll to the bottom to see the preview
                                            setTimeout(() => {
                                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                            }, 100);
                                        }}
                                    />
                                    <input
                                        ref={cameraInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        capture="environment" // Hint to mobile devices to use back camera
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                setPendingImages(prev => [...prev, reader.result as string]);
                                            };
                                            reader.readAsDataURL(file);

                                            e.target.value = '';
                                            setShowAttachMenu(false);
                                        }}
                                    />
                                    <input
                                        ref={documentInputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            // Handle document (todo depending on pendingImage type support)
                                            e.target.value = '';
                                            setShowAttachMenu(false);
                                            toast.success('Document selected (preview not yet implemented for docs)');
                                        }}
                                    />
                                    <input
                                        ref={audioInputRef}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (!files.length) return;

                                            const readFiles = files.map(file => {
                                                return new Promise<string>((resolve) => {
                                                    const reader = new FileReader();
                                                    reader.onload = () => resolve(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                });
                                            });

                                            const results = await Promise.all(readFiles);
                                            setPendingImages(prev => [...prev, ...results]);
                                            e.target.value = '';
                                            setShowAttachMenu(false);
                                            toast.success('Audio file added to preview');

                                            // Ensure we scroll to the bottom
                                            setTimeout(() => {
                                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                            }, 100);
                                        }}
                                    />
                                    {/* No padding on the left anymore, replaced by spacing in the pill */}
                                </div>


                                {/* Text input container - Single layer pill - Glassy */}
                                <div ref={pillRef} className="flex-1 min-w-0 relative bg-white/[0.03] border border-white/5 rounded-full focus-within:border-primary/30 focus-within:bg-white/[0.05] transition-all shadow-inner flex items-center min-h-[44px]">

                                    {isSendingVoice && (
                                        <div className="flex-1 flex items-center gap-3 px-4 animate-premium-in">
                                            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse" />
                                            <span className="text-white/80 font-bold text-xs uppercase tracking-widest">Sending Voice Note...</span>
                                        </div>
                                    )}

                                    {!isVoiceRecording && !isSendingVoice && (
                                        <>
                                            {/* Emoji Picker Popover */}
                                            {showEmojiPicker && (
                                                <div ref={emojiPickerRef} className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                                                    <Picker
                                                        data={data}
                                                        onEmojiSelect={(emoji: any) => {
                                                            setText(prev => prev + emoji.native);
                                                            setShowEmojiPicker(false);
                                                            textareaRef.current?.focus();
                                                        }}
                                                        theme="dark"
                                                        previewPosition="none"
                                                        skinTonePosition="none"
                                                        maxFrequentRows={1}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center pl-2">
                                                <button
                                                    ref={emojiToggleRef}
                                                    type="button"
                                                    onClick={() => setShowEmojiPicker(prev => !prev)}
                                                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 hover:scale-110 active:scale-95 ${showEmojiPicker
                                                        ? 'text-primary bg-primary/10'
                                                        : 'text-white/40 hover:text-white hover:bg-white/10'
                                                        }`}
                                                    title="Emojis"
                                                >
                                                    <Smile className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <textarea
                                                ref={textareaRef}
                                                value={text}
                                                onChange={e => {
                                                    setText(e.target.value);
                                                    if (e.target.value.length > text.length) {
                                                        playTypingTick();
                                                    }
                                                }}
                                                placeholder="type a message"
                                                rows={1}
                                                className="flex-1 min-w-0 px-2 py-3 !bg-transparent text-sm text-white placeholder:text-white/40 font-bold !outline-none transition-all resize-none overflow-hidden placeholder:whitespace-nowrap !border-none !ring-0 !shadow-none h-11 flex items-center translate-y-0.5"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (text.trim() || pendingImages.length > 0) {
                                                            sendMessage();
                                                        }
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center gap-0.5 pr-2 relative">
                                                {/* Attach Menu Popup */}
                                                {showAttachMenu && (
                                                    <div
                                                        ref={attachMenuRef}
                                                        className="absolute bottom-12 right-0 bg-[#252525] border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 z-50 animate-premium-in w-[240px]"
                                                    >
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => documentInputRef.current?.click()}
                                                                className="flex flex-col items-center gap-2 group"
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                                    <Type className="w-5 h-5" />
                                                                </div>
                                                                <span className="text-xs text-white/70 group-hover:text-white transition-colors">Document</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => cameraInputRef.current?.click()}
                                                                className="flex flex-col items-center gap-2 group"
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                                                    <Camera className="w-5 h-5" />
                                                                </div>
                                                                <span className="text-xs text-white/70 group-hover:text-white transition-colors">Camera</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => galleryInputRef.current?.click()}
                                                                className="flex flex-col items-center gap-2 group"
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all">
                                                                    <ImageIcon className="w-5 h-5" />
                                                                </div>
                                                                <span className="text-xs text-white/70 group-hover:text-white transition-colors">Gallery</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => audioInputRef.current?.click()}
                                                                className="flex flex-col items-center gap-2 group"
                                                            >
                                                                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                                                    <Phone className="w-5 h-5" /> {/* Using Phone as audio icon fallback, but could use Mic if preferred */}
                                                                </div>
                                                                <span className="text-xs text-white/70 group-hover:text-white transition-colors">Audio</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center">
                                                    <button
                                                        ref={attachToggleRef}
                                                        type="button"
                                                        onClick={() => setShowAttachMenu(prev => !prev)}
                                                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 hover:scale-110 active:scale-95 ${showAttachMenu
                                                            ? 'bg-primary/20 text-primary rotate-45'
                                                            : 'text-white/40 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        title="Attach"
                                                    >
                                                        <Plus className="w-5 h-5 transition-transform" />
                                                    </button>
                                                    {!text.trim() && pendingImages.length === 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => cameraInputRef.current?.click()}
                                                            className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 hover:scale-110 active:scale-95 animate-premium-in"
                                                            title="Take photo"
                                                        >
                                                            <Camera className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* External Dynamic Button (Send or Record) - Back OUTSIDE the pill */}
                                <div className="flex-shrink-0">
                                    {text.trim() || pendingImages.length > 0 ? (
                                        <button
                                            type="submit"
                                            disabled={isSending}
                                            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:from-white/5 disabled:to-white/5 disabled:border-white/5 disabled:text-white/10 text-white flex items-center justify-center transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-90 flex-shrink-0 border border-white/10 group hover:scale-110 animate-premium-in"
                                        >
                                            {isSending ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            )}
                                        </button>
                                    ) : (
                                        <VoiceRecorder
                                            onRecordingComplete={sendVoiceNote}
                                            onRecordingStateChange={setIsVoiceRecording}
                                            portalTarget={pillRef.current}
                                        />
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                                <MessageSquare className="w-10 h-10 text-white/15" />
                            </div>
                            <div>
                                <h3 className="text-white/40 font-black text-lg">Select a conversation</h3>
                                <p className="text-white/20 text-sm mt-1">Choose a chat on the left to start messaging</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Long-Press Delete Modal ─────────────────────────────────────── */}
            {
                longPressConvoId && (() => {
                    const lpc = conversations.find(c => c.id === longPressConvoId);
                    if (!lpc) return null;
                    const lpName = lpc.type === 'direct' ? lpc.otherUser?.full_name : lpc.name;
                    return (
                        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" onClick={() => setLongPressConvoId(null)}>
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                            <div
                                className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-[#141920] border border-white/10 rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden animate-premium-in"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="px-6 pt-6 pb-4 flex items-center gap-4 border-b border-white/5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-white text-xl shadow-lg overflow-hidden flex-shrink-0">
                                        {lpc.otherUser?.avatar_url
                                            ? <img src={lpc.otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                            : (lpName || 'U')[0]
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">Conversation</p>
                                        <p className="text-white font-black text-base">{lpName}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="p-3 space-y-1.5">
                                    <button
                                        onClick={() => { clearConversation(longPressConvoId); setLongPressConvoId(null); }}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white/5 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition-all flex-shrink-0">
                                            <Trash2 className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-bold text-sm">Clear History</p>
                                            <p className="text-white/30 text-xs">Remove messages — chat stays</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { deleteConversation(longPressConvoId); setLongPressConvoId(null); }}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-red-500/5 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:bg-red-500/20 transition-all flex-shrink-0">
                                            <Archive className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-red-400 font-bold text-sm">Hide Chat</p>
                                            <p className="text-white/30 text-xs">Remove from list completely</p>
                                        </div>
                                    </button>
                                </div>

                                {/* Cancel */}
                                <div className="px-3 pb-3">
                                    <button
                                        onClick={() => setLongPressConvoId(null)}
                                        className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/8 text-white/50 hover:text-white font-bold text-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            }
            {/* ── Mobile Navigation & FAB ─────────────────────────────────────── */}
            {!activeConvo && (
                <>
                    {/* FAB: New Chat */}
                    {!showNewChat && activeTab === 'chats' && (
                        <button
                            onClick={() => setShowNewChat(true)}
                            className="md:hidden fixed bottom-24 right-6 w-11 h-11 rounded-full bg-primary/20 backdrop-blur-xl text-primary shadow-lg flex items-center justify-center active:scale-90 hover:bg-primary/30 transition-all z-50 animate-premium-in border border-white/10"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    )}

                    {/* Fixed Mobile Bottom Nav */}
                    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-14 bg-black/20 backdrop-blur-3xl border border-white/5 rounded-2xl flex items-center justify-around px-4 z-[100] shadow-2xl safe-area-pb">
                        <button
                            onClick={() => { setActiveTab('chats'); setShowNewChat(false); }}
                            className={`flex items-center justify-center transition-all w-12 h-10 rounded-xl ${activeTab === 'chats' ? 'text-primary bg-primary/10' : 'text-white/30 hover:bg-white/5 active:bg-white/10'}`}
                        >
                            <div className="relative">
                                <MessageSquare className={`w-[18px] h-[18px] ${activeTab === 'chats' ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : ''}`} />
                                {conversations.some(c => c.unreadCount > 0) && (
                                    <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full border border-[#0E0E11]" />
                                )}
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('calls')}
                            className={`flex items-center justify-center transition-all w-12 h-10 rounded-xl ${activeTab === 'calls' ? 'text-primary bg-primary/10' : 'text-white/30 hover:bg-white/5 active:bg-white/10'}`}
                        >
                            <Phone className={`w-[18px] h-[18px] ${activeTab === 'calls' ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : ''}`} />
                        </button>

                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`flex items-center justify-center transition-all w-12 h-10 rounded-xl ${activeTab === 'settings' ? 'text-primary bg-primary/10' : 'text-white/30 hover:bg-white/5 active:bg-white/10'}`}
                        >
                            <Settings className={`w-[18px] h-[18px] ${activeTab === 'settings' ? 'scale-110 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : ''}`} />
                        </button>
                    </nav>
                </>
            )}
        </div >
    );
};


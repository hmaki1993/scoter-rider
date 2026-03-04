import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IRemoteVideoTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng';
import Cropper from 'react-easy-crop';
import {
    MessageSquare, Search, Phone, Video, MoreVertical, Send,
    Paperclip, Mic, Image as ImageIcon, X, Check, CheckCheck,
    PhoneCall, PhoneOff, PhoneMissed, Volume2, VolumeX,
    Camera, Users, Plus, ArrowLeft, Smile, Play, Pause,
    Loader2, Download, MicOff, VideoOff, Reply, Pin, Trash2,
    Archive, CheckSquare, Minimize2, Maximize2, RotateCcw, Type, Pencil,
    ArrowDownLeft, ArrowUpRight, UserPlus, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string;

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
const VoiceNotePlayer = ({ url, duration }: { url: string; duration?: number }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

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

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => {
            setCurrentTime(audio.currentTime);
            setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        };
        const onEnd = () => setIsPlaying(false);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnd);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('ended', onEnd);
        };
    }, []);

    return (
        <div className="flex items-center gap-3 min-w-[200px]">
            <audio ref={audioRef} src={url} preload="metadata" />
            <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"
            >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1">
                <div
                    className="h-1 bg-white/20 rounded-full cursor-pointer relative"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        if (audioRef.current) audioRef.current.currentTime = ratio * audioRef.current.duration;
                    }}
                >
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] opacity-60 mt-0.5 block">{formatTime(currentTime)} / {formatTime(duration || 0)}</span>
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

            {/* Avatar */}
            <div className="w-7 h-7 flex-shrink-0">
                {!isOwn && (
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
                        <div className={`px-4 py-3 relative text-white transition-all duration-300 ${isOwn ? 'bg-gradient-to-br from-primary to-accent' : 'bg-white/[0.06] border border-white/10'} ${bubbleRadius}`}>
                            <VoiceNotePlayer url={msg.media_url} duration={msg.media_duration} />
                            {msg.is_pinned && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg">
                                    <Pin className="w-2 h-2 text-white fill-current" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <span className={`text-[9px] text-white/20 font-black uppercase tracking-widest mt-1 animate-premium-in ${isOwn ? 'flex items-center gap-1.5 ml-auto' : 'mr-auto'}`}>
                    {timeStr}
                    {isOwn && <CheckCheck className="w-3.5 h-3.5 text-primary/40" />}
                </span>
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

// ─── Incoming Call Modal ───────────────────────────────────────────────────────
const IncomingCallModal = ({
    callerName, callType, onAccept, onReject
}: { callerName: string; callType: 'audio' | 'video'; onAccept: () => void; onReject: () => void }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl w-72 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-2xl font-semibold text-white">
                    {callerName[0]}
                </div>
                <div className="text-center">
                    <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Incoming {callType} call</p>
                    <h3 className="text-white text-xl font-bold mt-1">{callerName}</h3>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onReject} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
                        <PhoneOff className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={onAccept} className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
                        <Phone className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Active Call Modal ─────────────────────────────────────────────────────────
const ActiveCallModal = ({
    callType, otherUserName, duration, onHangup, isMuted, toggleMute, isCameraOff, toggleCamera, otherUserAvatar,
    facingMode, toggleFacingMode, isLocalVideoMain, setIsLocalVideoMain, onMinimize
}: {
    callType: 'audio' | 'video';
    otherUserName: string;
    duration: number;
    onHangup: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    isCameraOff: boolean;
    toggleCamera: () => void;
    otherUserAvatar?: string;
    facingMode: 'user' | 'environment';
    toggleFacingMode: () => void;
    isLocalVideoMain: boolean;
    setIsLocalVideoMain: (val: boolean) => void;
    onMinimize?: () => void;
}) => {
    const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const [pos, setPos] = useState({ x: 24, y: 24 }); // Initial position from top-right
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const dragInitialPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isLocalVideoMain) return;
        setIsDragging(true);
        hasMovedRef.current = false;
        dragInitialPos.current = { x: e.clientX, y: e.clientY };
        dragStartPos.current = { x: e.clientX + pos.x, y: e.clientY - pos.y };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        // Only mark as moved if drag distance is more than 5px to avoid accidental drag triggers on simple click
        const dx = Math.abs(e.clientX - dragInitialPos.current.x);
        const dy = Math.abs(e.clientY - dragInitialPos.current.y);
        if (dx > 5 || dy > 5) {
            hasMovedRef.current = true;
        }

        setPos({
            x: dragStartPos.current.x - e.clientX,
            y: e.clientY - dragStartPos.current.y
        });
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden animate-in fade-in duration-500 bg-black">
            {/* Background Layer: Remote Video or Avatar */}
            <div
                className={`absolute inset-0 transition-opacity duration-700 ${isLocalVideoMain ? 'opacity-20' : 'opacity-100'}`}
                onClick={() => isLocalVideoMain && setIsLocalVideoMain(false)}
            >
                {callType === 'video' ? (
                    <div id="agora-remote-video" className="w-full h-full">
                        {!isLocalVideoMain && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60 z-10">
                                <div className="w-12 h-12 border-2 border-white/10 border-t-white rounded-full animate-spin mb-4" />
                                <div className="text-white/40 text-sm">Connecting...</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                        {otherUserAvatar ? (
                            <img src={otherUserAvatar} alt="" className="w-full h-full object-cover opacity-20 blur-3xl scale-125" />
                        ) : (
                            <div className="w-full h-full bg-zinc-900" />
                        )}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60 pointer-events-none" />
            </div>

            {/* Local Video - Floating Panel (Draggable) */}
            {callType === 'video' && (
                <div
                    onMouseDown={handleMouseDown}
                    style={!isLocalVideoMain ? {
                        position: 'absolute',
                        top: `${pos.y}px`,
                        right: `${pos.x}px`,
                        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                        transition: isDragging ? 'none' : 'all 0.4s ease-out'
                    } : {}}
                    className={`absolute z-[200] cursor-grab active:cursor-grabbing touch-none select-none ${isLocalVideoMain
                        ? 'inset-0'
                        : 'w-32 h-44 md:w-40 md:h-52 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 ring-1 ring-white/5'
                        }`}
                    onClick={(e) => {
                        if (hasMovedRef.current) {
                            e.stopPropagation();
                            return;
                        }
                        if (!isLocalVideoMain) setIsLocalVideoMain(true);
                    }}
                >
                    <div id="agora-local-video" className="w-full h-full relative">
                        {/* Drag overlay to catch events even if video captures them */}
                        <div className="absolute inset-0 z-10 pointer-events-auto" />

                        {isLocalVideoMain && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsLocalVideoMain(false);
                                }}
                                className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all active:scale-95"
                                title="Exit full screen"
                            >
                                <Minimize2 className="w-5 h-5" />
                            </button>
                        )}
                        {isCameraOff && (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <VideoOff className="w-6 h-6 text-white/10" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Overlay - Minimal for better focus */}
            <div className={`relative z-20 flex flex-col items-center justify-between h-full py-16 md:py-24 px-6 w-full max-w-lg transition-opacity duration-500 ${isLocalVideoMain ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Simplified Header for active calls */}
                <div className="text-center">
                    {callType === 'audio' && (
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-zinc-800 border-2 border-white/5 flex items-center justify-center shadow-2xl overflow-hidden ring-4 ring-white/[0.02]">
                                {otherUserAvatar ? (
                                    <img src={otherUserAvatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-white/10 tracking-tighter">{otherUserName[0]}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Bar - Matched to Reference Image */}
                <div className="absolute bottom-12 left-0 right-0 flex items-end justify-between px-4 sm:px-10">
                    {/* Left Actions */}
                    <div className="flex items-center gap-2 sm:gap-4 py-2">
                        <button
                            onClick={onMinimize}
                            className="w-9 h-9 rounded-full bg-zinc-900/40 hover:bg-zinc-800/60 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-md"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>
                        <button className="w-9 h-9 rounded-full bg-zinc-900/40 hover:bg-zinc-800/60 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-md">
                            <UserPlus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Center Controls */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 sm:gap-5">
                            <button
                                onClick={toggleMute}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/10 ${isMuted ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                            >
                                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>

                            {callType === 'video' && (
                                <button
                                    onClick={toggleCamera}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/10 ${isCameraOff ? 'bg-red-500/80 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                >
                                    {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                </button>
                            )}

                            <button
                                onClick={onHangup}
                                className="w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform active:scale-95 backdrop-blur-md border border-white/10"
                            >
                                <PhoneOff className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Duration Timer below controls */}
                        <div className="text-white/40 text-[11px] font-medium tabular-nums tracking-[0.2em]">
                            {/* Adding leading zeros for the image style: HH:MM:SS:CC (approx) */}
                            00:{formatDuration(duration)}:00
                        </div>
                    </div>
                    {/* Right Actions */}
                    <div className="flex items-center gap-2 sm:gap-4 py-2">
                        <button
                            onClick={() => setIsLocalVideoMain(!isLocalVideoMain)}
                            className="w-9 h-9 rounded-full bg-zinc-900/40 hover:bg-zinc-800/60 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-md"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button className="w-9 h-9 rounded-full bg-zinc-900/40 hover:bg-zinc-800/60 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-md">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Voice Recorder Component ──────────────────────────────────────────────────
const VoiceRecorder = ({ onRecordingComplete }: { onRecordingComplete: (blob: Blob, duration: number) => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            chunksRef.current = [];
            recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
                onRecordingComplete(blob, dur);
                stream.getTracks().forEach(t => t.stop());
            };
            recorder.start(100);
            mediaRecorderRef.current = recorder;
            startTimeRef.current = Date.now();
            setIsRecording(true);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } catch {
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        setDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    if (isRecording) {
        return (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-500 text-xs font-medium tabular-nums">
                    {String(Math.floor(duration / 60)).padStart(2, '0')}:{String(duration % 60).padStart(2, '0')}
                </span>
                <button onClick={stopRecording} className="ml-1 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all">
                    <Check className="w-3 h-3" />
                </button>
                <button onClick={() => { mediaRecorderRef.current?.stop(); setIsRecording(false); setDuration(0); }} className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-white/40 transition-all">
                    <X className="w-3 h-3" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={startRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="Record voice note"
        >
            <Mic className="w-5 h-5" />
        </button>
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
    const ctx = canvas.getContext('2d');
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

// ─── Image Editor Modal ────────────────────────────────────────────────────────
const ImageEditorModal = ({
    image, onCancel, onSave, isProcessing
}: {
    image: string; onCancel: () => void; onSave: (blob: Blob) => void; isProcessing: boolean
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [mode, setMode] = useState<'crop' | 'draw'>('crop');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        try {
            const blob = await getCroppedImg(image, croppedAreaPixels, rotation);
            // In a real scenario, we could also merge the drawing canvas here.
            // For now, let's keep it simple with cropping as requested.
            onSave(blob);
        } catch (e) {
            toast.error('Failed to process image');
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col bg-black">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-white text-sm font-semibold">Edit Image</h3>
                        <p className="text-white/30 text-[10px] uppercase font-medium tracking-wide">Crop and refine before sending</p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 text-white/40 hover:text-white transition-all">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 relative bg-[#050505]">
                {mode === 'crop' ? (
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={undefined}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center p-10">
                        <div className="relative max-w-full max-h-full">
                            <img src={image} alt="Drawing preview" className="max-w-full max-h-full rounded-lg shadow-2xl" />
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full cursor-crosshair"
                                onMouseDown={() => setIsDrawing(true)}
                                onMouseUp={() => setIsDrawing(false)}
                            // Simplified drawing logic would go here
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-md">
                <div className="max-w-md mx-auto flex flex-col gap-6">
                    <div className="flex items-center justify-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Zoom</span>
                            <input
                                type="range"
                                min={1} max={3} step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-32 accent-primary transition-all"
                            />
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Rotation</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setRotation(r => r - 90)} className="text-white/40 hover:text-white"><RotateCcw className="w-4 h-4" /></button>
                                <span className="text-xs font-black text-white w-8 text-center">{rotation}°</span>
                                <button onClick={() => setRotation(r => r + 90)} className="text-white/40 hover:text-white"><RotateCcw className="w-4 h-4 scale-x-[-1]" /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-8 py-4 rounded-[1.5rem] bg-white/5 text-white/60 font-black uppercase tracking-tighter hover:bg-white/10 transition-all border border-white/5 active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="flex-[2] px-8 py-4 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-tighter hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Send Image</span>
                                    <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Image Viewer Modal (Full Screen) ──────────────────────────────────────────
const ImageViewerModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
    const [zoom, setZoom] = useState(1);
    const [panning, setPanning] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
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
                    <a
                        href={url}
                        download
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                        title="Download"
                    >
                        <Download className="w-5 h-5" />
                    </a>
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
                    className="max-w-full max-h-full object-contain shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-transform duration-75 select-none"
                    style={{
                        transform: `scale(${zoom}) translate(${panning.x / zoom}px, ${panning.y / zoom}px)`,
                        pointerEvents: 'none'
                    }}
                />
            </div>

            <div className="flex justify-center p-6 z-10">
                <div className="flex items-center gap-8 bg-white/5 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl">
                    <button onClick={() => { setZoom(1); setPanning({ x: 0, y: 0 }); }} className="text-white/40 hover:text-white"><RotateCcw className="w-4 h-4" /></button>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Zoom</span>
                        <div className="w-32 h-1.5 bg-white/10 rounded-full relative">
                            <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${((zoom - 1) / 4) * 100}%` }} />
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
    const { userProfile } = useTheme();
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
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [longPressConvoId, setLongPressConvoId] = useState<string | null>(null);
    const [longPressActive, setLongPressActive] = useState<string | null>(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [imageToView, setImageToView] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Call state
    const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video'; otherUser: Profile; channelId: string; conversationId: string } | null>(null);
    const [incomingCall, setIncomingCall] = useState<{ callId: string; type: 'audio' | 'video'; caller: Profile; channelId: string; conversationId: string } | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isLocalVideoMain, setIsLocalVideoMain] = useState(false);
    const [isCallMinimized, setIsCallMinimized] = useState(false);

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

    const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioRef = useRef<ILocalAudioTrack | null>(null);
    const localVideoRef = useRef<ILocalVideoTrack | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const activeCallRef = useRef<{ type: 'audio' | 'video'; otherUser: Profile; channelId: string; conversationId: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const clearedAtRef = useRef<string | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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
            setInChat(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', () => setInChat(false));

        return () => {
            setInChat(false);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', () => setInChat(false));
        };
    }, [currentUserId]);

    // ─── Auto-resize textarea ───────────────────────────────────────────────────
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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

    // ─── Agora RTC Actions ────────────────────────────────────────────────────────
    const fetchAgoraToken = async (channelName: string) => {
        try {
            const { data, error } = await supabase.functions.invoke('agora-token', {
                body: { channelName, userAccount: currentUserId }
            });
            if (error) throw error;
            return data.token;
        } catch (err) {
            console.error('Error fetching Agora token:', err);
            return null;
        }
    };

    const joinAgoraChannel = async (channelId: string, callType: 'audio' | 'video') => {
        // Clear any existing timer and reset duration
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallDuration(0);

        try {
            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            agoraClientRef.current = client;

            // Start timer immediately so user sees responsiveness
            callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                if (mediaType === 'video') {
                    const remoteEl = document.getElementById('agora-remote-video');
                    if (remoteEl) user.videoTrack?.play(remoteEl);
                }
                if (mediaType === 'audio') {
                    user.audioTrack?.play();
                }
            });

            client.on('user-unpublished', (user, mediaType) => {
                if (mediaType === 'video') {
                    user.videoTrack?.stop();
                }
            });

            client.on('user-left', () => {
                hangupCall(false);
                toast('Call ended — other user left', { icon: '📞' });
            });

            const token = await fetchAgoraToken(channelId);
            if (!token) {
                toast.error('Failed to get security token for call');
                // Cleanup on failure
                if (callTimerRef.current) clearInterval(callTimerRef.current);
                setCallDuration(0);
                setActiveCall(null);
                activeCallRef.current = null;
                return;
            }

            await client.join(AGORA_APP_ID, channelId, token, currentUserId || undefined);

            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            localAudioRef.current = audioTrack;

            if (callType === 'video') {
                try {
                    const videoTrack = await AgoraRTC.createCameraVideoTrack();
                    localVideoRef.current = videoTrack;
                    await client.publish([audioTrack, videoTrack]);
                    const localEl = document.getElementById('agora-local-video');
                    if (localEl) videoTrack.play(localEl);
                } catch (videoErr: any) {
                    console.error('Camera access failed:', videoErr);
                    // Handle missing camera device gracefully
                    if (videoErr.name === 'NotFoundError' || videoErr.message?.includes('DEVICE_NOT_FOUND')) {
                        toast.error('No camera detected. Switching to audio call.', { icon: '📷' });
                        await client.publish([audioTrack]);
                    } else {
                        throw videoErr;
                    }
                }
            } else {
                await client.publish([audioTrack]);
            }
        } catch (err: any) {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setCallDuration(0);
            setActiveCall(null);
            activeCallRef.current = null;
            toast.error('Failed to join call: ' + (err?.message || 'Unknown error'));
        }
    };

    const leaveAgoraChannel = async () => {
        try {
            localAudioRef.current?.stop();
            localAudioRef.current?.close();
            localAudioRef.current = null;
            localVideoRef.current?.stop();
            localVideoRef.current?.close();
            localVideoRef.current = null;
            if (agoraClientRef.current) {
                await agoraClientRef.current.leave();
                agoraClientRef.current = null;
            }
        } catch (err) {
            console.error('Agora leave error:', err);
        }
    };

    const hangupCall = async (isInitiator = false) => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        const dur = callDuration;
        const callSnapshot = activeCallRef.current || activeCall;

        await leaveAgoraChannel();

        setActiveCall(null);
        activeCallRef.current = null;
        setCallDuration(0);
        setIsMuted(false);
        setIsCameraOff(false);
        setFacingMode('user');
        setIsLocalVideoMain(false);

        if (callSnapshot && isInitiator) {
            // Check if WE were the caller by checking if we still have an activeConvo.otherUser
            // set in initiateCall. Actually, a better way: 
            // In initiating: we set activeCall.conversationId.
            // Let's use the call_record to be certain who the caller was.
            const { data: callRec } = await supabase.from('call_records')
                .select('caller_id')
                .eq('agora_channel_id', callSnapshot.channelId)
                .single();

            await supabase.from('call_records')
                .update({ status: 'ended', ended_at: new Date().toISOString() })
                .eq('agora_channel_id', callSnapshot.channelId);

            // Always insert a message to record the call event
            await supabase.from('messages').insert({
                conversation_id: callSnapshot.conversationId,
                sender_id: currentUserId,
                type: 'call_event',
                call_status: dur > 0 ? 'answered' : 'missed',
                call_duration: dur > 0 ? dur : undefined,
                call_type: callSnapshot.type,
                caller_id: callRec?.caller_id // Now correctly identify the original caller
            });
        }
    };

    const initiateCall = async (callType: 'audio' | 'video') => {
        if (!activeConvo || !currentUserId || !activeConvo.otherUser) return;
        const channelId = `call_${activeConvo.id}_${Date.now()}`;

        const { error } = await supabase.from('call_records').insert({
            conversation_id: activeConvo.id,
            caller_id: currentUserId,
            call_type: callType,
            status: 'ringing',
            agora_channel_id: channelId
        });

        if (error) { toast.error('Failed to start call'); return; }

        setActiveCall({ type: callType, otherUser: activeConvo.otherUser, channelId, conversationId: activeConvo.id });
        activeCallRef.current = { type: callType, otherUser: activeConvo.otherUser, channelId, conversationId: activeConvo.id };
        toast(`Calling ${activeConvo.otherUser.full_name}...`, { icon: callType === 'video' ? '🎥' : '📞' });

        await joinAgoraChannel(channelId, callType);
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        const call = incomingCall;

        await supabase.from('call_records')
            .update({ status: 'answered' })
            .eq('id', call.callId);

        setActiveCall({ type: call.type, otherUser: call.caller, channelId: call.channelId, conversationId: call.conversationId });
        activeCallRef.current = { type: call.type, otherUser: call.caller, channelId: call.channelId, conversationId: call.conversationId };
        setIncomingCall(null);

        await joinAgoraChannel(call.channelId, call.type);
    };

    const rejectCall = async () => {
        if (!incomingCall) return;

        await supabase.from('call_records')
            .update({ status: 'rejected' })
            .eq('id', incomingCall.callId);

        await supabase.from('messages').insert({
            conversation_id: incomingCall.conversationId,
            sender_id: currentUserId,
            type: 'call_event',
            call_status: 'missed',
            call_type: incomingCall.type,
            caller_id: incomingCall.caller.id
        });
        setIncomingCall(null);
    };

    const markAsRead = async (convoId: string) => {
        try {
            const { error } = await supabase
                .from('conversation_participants')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', convoId)
                .eq('user_id', currentUserId);
            if (error) throw error;
            setConversations(prev => prev.map(c => c.id === convoId ? { ...c, unreadCount: 0 } : c));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleToggleMute = async () => {
        if (localAudioRef.current) {
            const newMuted = !isMuted;
            await localAudioRef.current.setMuted(newMuted);
            setIsMuted(newMuted);
        }
    };

    const handleToggleCamera = async () => {
        if (localVideoRef.current) {
            const newOff = !isCameraOff;
            await localVideoRef.current.setMuted(newOff);
            setIsCameraOff(newOff);
        }
    };

    const handleToggleFacingMode = async () => {
        if (localVideoRef.current && agoraClientRef.current) {
            const newMode = facingMode === 'user' ? 'environment' : 'user';

            try {
                // Create new track with new facing mode first
                const newTrack = await AgoraRTC.createCameraVideoTrack({
                    facingMode: newMode
                });

                // Unpublish old track and publish new one
                await agoraClientRef.current.unpublish([localVideoRef.current]);

                // Stop and close old track
                localVideoRef.current.stop();
                localVideoRef.current.close();

                await agoraClientRef.current.publish([newTrack]);

                // Play in the local element
                const localEl = document.getElementById('agora-local-video');
                if (localEl) newTrack.play(localEl);

                localVideoRef.current = newTrack;
                setFacingMode(newMode);
                toast.success(`Switched to ${newMode === 'user' ? 'front' : 'back'} camera`);
            } catch (err) {
                console.error('Failed to switch camera:', err);
                toast.error('Could not switch camera. Device may not support multiple cameras.');
            }
        }
    };

    // ─── Load conversations ──────────────────────────────────────────────────────
    const loadConversations = useCallback(async () => {
        if (!currentUserId) return;

        // Step 1: Get all conversation IDs for this user
        const { data: participations, error: pErr } = await supabase
            .from('conversation_participants')
            .select('conversation_id, last_read_at, is_hidden, cleared_at')
            .eq('user_id', currentUserId);

        if (pErr || !participations?.length) return;
        const convoIds = participations.map(p => p.conversation_id);

        // Step 2: Get all conversations (flat, no joins)
        const { data: convos, error: cErr } = await supabase
            .from('conversations')
            .select('id, type, name, avatar_url, updated_at, created_by')
            .in('id', convoIds)
            .order('updated_at', { ascending: false });

        if (cErr || !convos?.length) return;

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
            .select('id, conversation_id, sender_id, content, type, media_url, media_duration, call_status, call_duration, call_type, caller_id, created_at, is_deleted, reply_to_id, is_pinned, deleted_for_users')
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

        // Mark as read
        await supabase
            .from('conversation_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', convoId)
            .eq('user_id', currentUserId);
    }, [currentUserId]);

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
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, role, avatar_url, last_seen, is_in_chat')
                .neq('id', currentUserId || '');

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
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
                    } else if (payload.eventType === 'DELETE') {
                        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
                    }
                    loadConversations();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeConvo, loadConversations]);

    // ─── Incoming call subscription ────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel(`calls:${currentUserId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_records' },
                async (payload) => {
                    const call = payload.new as any;
                    if (call.caller_id === currentUserId) return;

                    // Check if we're in the conversation
                    const { data: isParticipant } = await supabase
                        .from('conversation_participants')
                        .select('id')
                        .eq('conversation_id', call.conversation_id)
                        .eq('user_id', currentUserId)
                        .maybeSingle();

                    if (!isParticipant) return;

                    const [profileRes, coachRes] = await Promise.all([
                        supabase.from('profiles').select('*').eq('id', call.caller_id).single(),
                        supabase.from('coaches').select('avatar_url').eq('profile_id', call.caller_id).maybeSingle()
                    ]);
                    const caller = profileRes.data ? {
                        ...profileRes.data,
                        avatar_url: profileRes.data.avatar_url || coachRes.data?.avatar_url
                    } : null;
                    if (caller) {
                        setIncomingCall({
                            callId: call.id,
                            type: call.call_type,
                            caller,
                            channelId: call.agora_channel_id,
                            conversationId: call.conversation_id
                        });
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_records' },
                (payload) => {
                    const call = payload.new as any;
                    if (call.status === 'ended' || call.status === 'rejected') {
                        setIncomingCall(null);
                        if (activeCall) hangupCall(false);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, activeCall]);

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

    // ─── Send text message ─────────────────────────────────────────────────────────
    const sendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim() || !activeConvo || !currentUserId) return;
        setIsSending(true);
        const content = text.trim();
        const msgReplyToId = replyTo?.id;
        setText('');
        setReplyTo(null);

        // Reset textarea height after sending
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await supabase.from('messages').insert({
            conversation_id: activeConvo.id,
            sender_id: currentUserId,
            content,
            type: 'text',
            reply_to_id: msgReplyToId
        });

        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
        loadConversations();
        setIsSending(false);
    };

    // ─── Send image ────────────────────────────────────────────────────────────────
    const sendImage = async (file: Blob | File) => {
        if (!activeConvo || !currentUserId) return;
        setIsUploading(true);
        try {
            // Compress image if it's a File (raw upload)
            let finalImage: Blob | File = file;
            if (file instanceof File) {
                finalImage = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1280, useWebWorker: true });
            }

            const ext = 'jpg';
            const path = `${currentUserId}/${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage.from('chat-media').upload(path, finalImage, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

            await supabase.from('messages').insert({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                type: 'image',
                media_url: publicUrl,
                media_size: finalImage.size
            });
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
            loadConversations();
            setPendingImage(null);
        } catch (err) {
            toast.error('Failed to send image');
        }
        setIsUploading(false);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPendingImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    // ─── Send voice note ───────────────────────────────────────────────────────────
    const sendVoiceNote = async (blob: Blob, duration: number) => {
        if (!activeConvo || !currentUserId) return;
        setIsUploading(true);
        try {
            const path = `${currentUserId}/voice_${Date.now()}.webm`;
            const { error } = await supabase.storage.from('chat-media').upload(path, blob, { contentType: 'audio/webm', upsert: true });
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
            await supabase.from('messages').insert({
                conversation_id: activeConvo.id,
                sender_id: currentUserId,
                type: 'voice',
                media_url: publicUrl,
                media_duration: duration
            });
            await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo.id);
            loadConversations();
        } catch {
            toast.error('Failed to send voice note');
        }
        setIsUploading(false);
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

    // ─── Render ────────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="h-screen flex overflow-hidden bg-background">

                {/* ── Image Editor Overlay ── */}
                {pendingImage && (
                    <ImageEditorModal
                        image={pendingImage}
                        onCancel={() => setPendingImage(null)}
                        onSave={sendImage}
                        isProcessing={isUploading}
                    />
                )}

                {/* ── Image Viewer Overlay ── */}
                {imageToView && (
                    <ImageViewerModal
                        url={imageToView}
                        onClose={() => setImageToView(null)}
                    />
                )}

                {/* ── Incoming Call Overlay ── */}
                {incomingCall && (
                    <IncomingCallModal
                        callerName={incomingCall.caller.full_name}
                        callType={incomingCall.type}
                        onAccept={acceptCall}
                        onReject={rejectCall}
                    />
                )}

                {/* ── Active Call Overlay ── */}
                {activeCall && !isCallMinimized && (
                    <ActiveCallModal
                        callType={activeCall.type}
                        otherUserName={activeCall.otherUser.full_name}
                        otherUserAvatar={activeCall.otherUser.avatar_url}
                        duration={callDuration}
                        onHangup={() => hangupCall(true)}
                        onMinimize={() => {
                            setIsCallMinimized(true);
                            // If we have an active call, ensure the chat for that user is open
                            const relatedConvo = conversations.find(c => c.id === activeCall.conversationId);
                            if (relatedConvo) setActiveConvo(relatedConvo);
                        }}
                        isMuted={isMuted}
                        toggleMute={handleToggleMute}
                        isCameraOff={isCameraOff}
                        toggleCamera={handleToggleCamera}
                        facingMode={facingMode}
                        toggleFacingMode={handleToggleFacingMode}
                        isLocalVideoMain={isLocalVideoMain}
                        setIsLocalVideoMain={setIsLocalVideoMain}
                    />
                )}

                {/* ── Minimized Call Bubble ── */}
                {activeCall && isCallMinimized && (
                    <div className="fixed bottom-24 right-6 z-[10000] flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="relative group p-1 bg-white/[0.03] backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent p-0.5 relative overflow-hidden">
                                    {activeCall.otherUser.avatar_url ? (
                                        <img src={activeCall.otherUser.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-lg font-bold text-white">
                                            {activeCall.otherUser.full_name[0]}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => setIsCallMinimized(false)}>
                                        <Maximize2 className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-[#1A1D21] rounded-full animate-pulse shadow-lg" />
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="px-2.5 py-1 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-full shadow-lg">
                                <span className="text-[10px] font-black text-white/90 tabular-nums tracking-wider uppercase">
                                    {String(Math.floor(callDuration / 60)).padStart(2, '0')}:{String(callDuration % 60).padStart(2, '0')}
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleToggleMute}
                                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 border backdrop-blur-md ${isMuted
                                        ? 'bg-red-500/20 border-red-500/40 text-red-500'
                                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                    onClick={() => hangupCall(true)}
                                    className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 border border-white/10"
                                >
                                    <PhoneOff className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─────────────── LEFT: Conversation List ─────────────── */}
                <div className={`
        w-full md:w-80 lg:w-96 flex-shrink-0 
        border-r border-white/5 flex flex-col
        ${activeConvo ? 'hidden md:flex' : 'flex'}
      `}>
                    {/* Panel header */}
                    <div className="p-5 border-b border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-white font-black text-lg tracking-tight">Messages</h1>
                                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Communication Center</p>
                            </div>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/20 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder=""
                                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/5 rounded-xl text-sm text-white placeholder:text-white/20 font-medium focus:outline-none focus:border-primary/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {showNewChat ? (
                            // New Chat: Show all users
                            <div>
                                <div className="px-4 py-2 flex items-center gap-2">
                                    <button onClick={() => setShowNewChat(false)} className="text-white/40 hover:text-white transition-all">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Start new chat</span>
                                </div>
                                {filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => startConversation(user)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-all group cursor-pointer"
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && startConversation(user)}
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-white text-sm flex-shrink-0 shadow-lg">
                                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover rounded-full" alt="" /> : user.full_name[0]}
                                        </div>
                                        <div className="text-left">
                                            {(() => {
                                                const lastSeenDate = user.last_seen ? new Date(user.last_seen) : null;
                                                const isRecentlyActive = lastSeenDate && (new Date().getTime() - lastSeenDate.getTime()) < 6000;
                                                const isOnline = user.is_in_chat && isRecentlyActive;
                                                const isAway = !user.is_in_chat && isRecentlyActive;

                                                if (isOnline) return <p className="text-emerald-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Online</p>;
                                                if (isAway) return <p className="text-amber-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Away</p>;
                                                return <p className="text-white/20 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Offline</p>;
                                            })()}
                                            <p className="text-white font-black text-sm">{user.full_name}</p>
                                            <p className="text-primary/60 text-[9px] font-black uppercase tracking-widest">{user.role}</p>
                                        </div>
                                    </div>
                                ))}
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
                                                    const isOnline = prof.is_in_chat && isRecentlyActive;
                                                    const isAway = !prof.is_in_chat && isRecentlyActive;

                                                    if (isOnline) return <p className="text-emerald-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Online</p>;
                                                    if (isAway) return <p className="text-amber-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Away</p>;
                                                    return <p className="text-white/20 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Offline</p>;
                                                })()}
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-white font-black text-sm truncate flex-1 min-w-0">{name}</p>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-white/25 text-[9px] font-bold">
                                                            {convo.lastMessage ? new Date(convo.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
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
                                                                            setActiveConvo(convo);
                                                                            initiateCall('audio');
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
                                                                            setActiveConvo(convo);
                                                                            initiateCall('video');
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
                                                    {convo.unreadCount > 0 && (
                                                        <span className="min-w-[20px] h-5 px-1.5 bg-primary rounded-full text-[10px] font-black text-white flex items-center justify-center flex-shrink-0">
                                                            {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </div>

                {/* ─────────────── CENTER: Chat Window ─────────────── */}
                {activeConvo ? (
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* Chat header */}
                        <div className={`sticky top-0 z-20 h-16 flex items-center justify-between px-5 border-b border-white/5 transition-all duration-300 bg-background/50 backdrop-blur-xl flex-shrink-0`}>
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
                                <div className="hidden sm:block">
                                    {(() => {
                                        const prof = activeConvo.otherUser;
                                        if (!prof) return null;
                                        const lastSeenDate = prof.last_seen ? new Date(prof.last_seen) : null;
                                        const now = new Date();
                                        const isRecentlyActive = lastSeenDate && (now.getTime() - lastSeenDate.getTime()) < 6000;

                                        if (prof.is_in_chat && isRecentlyActive) {
                                            return <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Online</p>;
                                        }
                                        if (isRecentlyActive) {
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
                                <div className="absolute inset-0 bg-[#0E1D21] z-20 flex items-center justify-between px-4 md:px-6 animate-in fade-in duration-200">
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
                                    onClick={() => initiateCall('audio')}
                                    className="w-9 h-9 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-primary/15 hover:border-primary/20 flex items-center justify-center transition-all"
                                >
                                    <Phone className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => initiateCall('video')}
                                    className="w-9 h-9 rounded-full bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-primary/15 hover:border-primary/20 flex items-center justify-center transition-all"
                                >
                                    <Video className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-0.5">
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

                        {/* Input bar */}
                        <div className="sticky bottom-0 z-20 flex-shrink-0 p-4 pb-6 bg-gradient-to-t from-[#0E1D21] via-[#0E1D21]/95 to-transparent backdrop-blur-3xl">
                            {/* Reply Preview */}
                            {replyTo && (
                                <div className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between group animate-premium-up shadow-2xl backdrop-blur-3xl">
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
                            <form onSubmit={sendMessage} className="max-w-5xl mx-auto flex items-end gap-3 px-2">
                                <div className="flex items-center gap-1.5 pb-1">
                                    {/* File input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => e.target.files?.[0] && sendImage(e.target.files[0])}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 border border-white/5 bg-white/5"
                                    >
                                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                                    </button>

                                    {/* Voice recorder */}
                                    <VoiceRecorder onRecordingComplete={sendVoiceNote} />
                                </div>

                                {/* Text input container - Single layer pill */}
                                <div className="flex-1 bg-white/[0.06] border border-white/10 rounded-[1.8rem] focus-within:border-primary/50 focus-within:bg-white/[0.08] transition-all">
                                    <textarea
                                        ref={textareaRef}
                                        value={text}
                                        onChange={e => setText(e.target.value)}
                                        placeholder="Message..."
                                        rows={1}
                                        className="w-full px-6 py-4 !bg-transparent text-sm text-white placeholder:text-white/20 font-medium !outline-none transition-all resize-none overflow-hidden !border-none !ring-0 !shadow-none"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage(e as any);
                                            }
                                        }}
                                    />
                                </div>

                                {/* External Send Button */}
                                <button
                                    type="submit"
                                    disabled={!text.trim() || isSending}
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:from-white/5 disabled:to-white/5 disabled:border-white/5 disabled:text-white/10 text-white flex items-center justify-center transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-90 flex-shrink-0 border border-white/10 group mb-0.5"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    // Empty state
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
        </>
    );
}

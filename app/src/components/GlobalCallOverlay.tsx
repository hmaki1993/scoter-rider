import { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff, Minimize2, Maximize2 } from 'lucide-react';

// ─── Global Call Overlay ─ renders over ALL pages ────────────────────────────
export default function GlobalCallOverlay() {
    const {
        activeCall,
        incomingCall,
        callStatus,
        callDuration,
        isMuted,
        isCameraOff,
        isCallMinimized,
        acceptCall,
        rejectCall,
        hangupCall,
        toggleMute,
        toggleCamera,
        setIsCallMinimized,
        realtimeStatus,
        pushReady,
        sendTestPush,
    } = useCall();

    const localVideoRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLDivElement>(null);

    const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ─── Diagnostic Footer ────────────────────────────────────────────────────
    const renderDiagnostic = () => {
        if (activeCall) return null;
        return (
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                    <div className={`w-2 h-2 rounded-full ${realtimeStatus === 'SUBSCRIBED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter">
                        RT: {realtimeStatus}
                    </span>
                    <div className="w-[1px] h-3 bg-white/10 mx-1" />
                    <div className={`w-2 h-2 rounded-full ${pushReady ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-tighter">
                        Push: {pushReady ? 'Ready' : 'Off'}
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        sendTestPush();
                    }}
                    className={`pointer-events-auto px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${pushReady
                        ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:bg-blue-500'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                        }`}
                >
                    Test Push Alert
                </button>
            </div>
        );
    };

    // ─── Incoming Call Notification ───────────────────────────────────────────
    if (incomingCall && !activeCall) {
        const caller = incomingCall.caller;
        return (
            <>
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-6 p-8 w-[320px] rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="absolute -inset-3 rounded-full border-2 border-emerald-400/30 animate-ping" />
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                                {caller?.avatar_url
                                    ? <img src={caller.avatar_url} className="w-full h-full object-cover" alt="" />
                                    : <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-3xl">{caller?.full_name?.[0] || 'G'}</div>
                                }
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Incoming {incomingCall?.type} call</p>
                            <p className="text-white font-black text-xl">{caller?.full_name || 'Generic User'}</p>
                            <p className="text-white/30 text-xs font-bold mt-0.5">{caller?.role}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-8 mt-2">
                            {/* Reject */}
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={rejectCall}
                                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all active:scale-95 hover:scale-105"
                                >
                                    <PhoneOff className="w-7 h-7" />
                                </button>
                                <span className="text-white/30 text-[9px] font-black uppercase tracking-wider">Decline</span>
                            </div>

                            {/* Accept */}
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={acceptCall}
                                    className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.5)] transition-all active:scale-95 hover:scale-105 animate-pulse"
                                >
                                    {incomingCall.type === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                                </button>
                                <span className="text-white/30 text-[9px] font-black uppercase tracking-wider">Accept</span>
                            </div>
                        </div>
                    </div>
                </div>
                {renderDiagnostic()}
            </>
        );
    }

    // ─── Active Call UI ───────────────────────────────────────────────────────
    if (!activeCall) return renderDiagnostic();

    const otherUser = activeCall.otherUser;
    const isConnected = callStatus === 'connected';
    const isVideo = activeCall.type === 'video';

    // Minimized floating pill
    if (isCallMinimized) {
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#1a1d21]/90 border border-white/10 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10">
                    {otherUser?.avatar_url
                        ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xs">{otherUser?.full_name?.[0] || 'G'}</div>
                    }
                </div>
                <div className="flex flex-col">
                    <span className="text-white text-xs font-black leading-none">{otherUser?.full_name || 'Generic User'}</span>
                    <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                        {isConnected ? fmt(callDuration) : callStatus}
                    </span>
                </div>
                <div className="flex items-center gap-2 ml-1">
                    <button
                        onClick={() => setIsCallMinimized(false)}
                        className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                        <Maximize2 className="w-3 h-3 text-white/60" />
                    </button>
                    <button
                        onClick={() => hangupCall(true)}
                        className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                    >
                        <PhoneOff className="w-3 h-3 text-white" />
                    </button>
                </div>
            </div>
        );
    }

    // Full call UI
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
            {/* Video container (video calls) */}
            {isVideo && (
                <div className="absolute inset-0">
                    <div id="agora-remote-video" className="w-full h-full" />
                    <div
                        id="agora-local-video"
                        className="absolute bottom-24 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
                    />
                </div>
            )}

            {/* Avatar overlay (audio / pre-connect) */}
            {(!isVideo || !isConnected) && (
                <div className="flex flex-col items-center gap-4 z-10">
                    <div className="relative">
                        {!isConnected && <div className="absolute -inset-4 rounded-full border border-white/10 animate-ping" />}
                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl">
                            {otherUser?.avatar_url
                                ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
                                : <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-4xl">{otherUser?.full_name?.[0] || 'G'}</div>
                            }
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-white font-black text-2xl">{otherUser?.full_name || 'Generic User'}</p>
                        <p className="text-white/40 text-sm font-bold mt-1">
                            {isConnected ? fmt(callDuration) : callStatus === 'ringing' ? 'Ringing...' : 'Calling...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Timer for connected video calls */}
            {isVideo && isConnected && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-xl">
                    <span className="text-white text-sm font-black tabular-nums">{fmt(callDuration)}</span>
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4">
                {/* Minimize */}
                <button
                    onClick={() => setIsCallMinimized(true)}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all backdrop-blur-md"
                >
                    <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {/* Mute */}
                <button
                    onClick={toggleMute}
                    className={`rounded-full flex items-center justify-center border transition-all backdrop-blur-md w-10 h-10 ${isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* End call */}
                <button
                    onClick={() => hangupCall(true)}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all active:scale-95"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>

                {/* Camera (video only) */}
                {isVideo && (
                    <button
                        onClick={toggleCamera}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all backdrop-blur-md ${isCameraOff ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                            }`}
                    >
                        {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>
                )}
            </div>
        </div>
    );
}

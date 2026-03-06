import { useState, useRef, useEffect } from 'react';
import { Mic, Radio, Volume2, VolumeX, Loader2, Users, X, CheckSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { playHoverSound } from '../utils/audio';

export default function WalkieTalkie({ role, userId }: { role: string; userId: string }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isIncoming, setIsIncoming] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const audioContext = useRef<AudioContext | null>(null);
    const holdTimer = useRef<any>(null);
    const mouseDownTime = useRef<number>(0);
    const isHolding = useRef(false);
    const recordButtonRef = useRef<HTMLButtonElement>(null);
    const wakeLock = useRef<any>(null);
    const gainNode = useRef<GainNode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ELITE: Authentic Motorola MDC-1200 Style Chirp Synthesis
    const playBeep = (type: 'start' | 'end', force: boolean = false) => {
        try {
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContext.current.state === 'suspended') audioContext.current.resume();

            const now = audioContext.current.currentTime;

            // ELITE: Triple Boost for "Forced" broadcasts
            const beepGain = force ? 1.5 : 0.3;

            if (type === 'start') {
                // Motorola MDC-1200 Approximation (3 quick tones)
                const tones = [1562, 1041, 1562];
                const duration = 0.03; // 30ms per tone

                tones.forEach((freq, i) => {
                    const osc = audioContext.current!.createOscillator();
                    const gain = audioContext.current!.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + (i * duration));

                    gain.gain.setValueAtTime(beepGain, now + (i * duration));
                    gain.gain.exponentialRampToValueAtTime(0.01, now + (i * duration) + duration);

                    osc.connect(gain);
                    gain.connect(audioContext.current!.destination);

                    osc.start(now + (i * duration));
                    osc.stop(now + (i * duration) + duration);
                });

                // Add a quick noise burst at the very start for that "click"
                const buffer = audioContext.current.createBuffer(1, audioContext.current.sampleRate * 0.05, audioContext.current.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

                const noise = audioContext.current.createBufferSource();
                noise.buffer = buffer;
                const noiseGain = audioContext.current.createGain();
                noiseGain.gain.setValueAtTime(force ? 0.3 : 0.1, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                noise.connect(noiseGain);
                noiseGain.connect(audioContext.current.destination);
                noise.start(now);
            } else {
                // End Squelch (kshhh effect)
                const osc = audioContext.current.createOscillator();
                const gain = audioContext.current.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1000, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(beepGain / 3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.connect(gain);
                gain.connect(audioContext.current.destination);
                osc.start(now);
                osc.stop(now + 0.1);

                // Longer noise tail for squelch
                const buffer = audioContext.current.createBuffer(1, audioContext.current.sampleRate * 0.15, audioContext.current.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

                const noise = audioContext.current.createBufferSource();
                noise.buffer = buffer;
                const noiseGain = audioContext.current.createGain();
                const filter = audioContext.current.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2000;

                noiseGain.gain.setValueAtTime(force ? 0.2 : 0.05, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(audioContext.current.destination);
                noise.start(now);
            }

        } catch (err) {
            console.warn('Police chirp failed:', err);
        }
    };

    // ELITE: Professional Notification Chime Synthesis
    const playNotificationSound = (force: boolean = false) => {
        try {
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContext.current.state === 'suspended') audioContext.current.resume();

            const now = audioContext.current.currentTime;

            // Dual-tone harmonic chime (A5 + C#6)
            // If forced, use higher, piercing frequencies (D6 + F#6)
            const freq1 = force ? 1174.66 : 880;
            const freq2 = force ? 1479.98 : 1100;

            [freq1, freq2].forEach((freq, i) => {
                const osc = audioContext.current!.createOscillator();
                const gain = audioContext.current!.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(force ? 0.6 : 0.15, now + 0.05); // Rapid fade in
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2); // Long fade out

                osc.connect(gain);
                gain.connect(audioContext.current!.destination);

                osc.start(now);
                osc.stop(now + 1.5);
            });
        } catch (err) {
            console.warn('Notification sound failed:', err);
        }
    };

    const startRecording = async () => {
        if (role !== 'admin') return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) audioChunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                await uploadBroadcast(audioBlob);
            };

            playBeep('start');
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Recording error:', err);
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        setIsRecording(false); // Force state reset immediately for UI responsiveness
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            try {
                mediaRecorder.current.stop();
                mediaRecorder.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                playBeep('end');
            } catch (err) {
                console.error('Error stopping recorder:', err);
            }
        }
    };

    const handlePressStart = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (role !== 'admin') return;

        // Prevent synthetic mouse events on touch devices
        if (e.type === 'touchstart') {
            try {
                if (typeof e.preventDefault === 'function') e.preventDefault();
            } catch (err) {
                console.warn('Could not preventDefault on touchstart:', err);
            }
        }

        mouseDownTime.current = Date.now();
        isHolding.current = true;

        if (holdTimer.current) clearTimeout(holdTimer.current);

        holdTimer.current = setTimeout(() => {
            if (isHolding.current && !isRecording) {
                startRecording();
            }
        }, 250);
    };

    const handlePressEnd = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!isHolding.current) return;
        isHolding.current = false;

        const pressDuration = Date.now() - mouseDownTime.current;

        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }

        if (isRecording) {
            // If we were in PTT mode (long press), stop now
            if (pressDuration >= 250) {
                stopRecording();
            }
        } else if (pressDuration < 250) {
            // If it was a short tap and we weren't recording, start toggle mode
            startRecording();
        }
    };

    const handleToggle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        // This is only for the "Stop" action in toggle mode 
        // OR if the user just taps the button.
        if (role !== 'admin') return;

        // If we are already recording and it's a tap, stop it
        if (isRecording && (Date.now() - mouseDownTime.current < 250)) {
            stopRecording();
        }
    };

    const [showRecipients, setShowRecipients] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Fetch users when opening the recipients modal
    const handleOpenRecipients = async () => {
        console.log('👥 handleOpenRecipients clicked', { showRecipients, availableUsersCount: availableUsers.length });
        if (showRecipients) {
            setShowRecipients(false);
            return;
        }

        setShowRecipients(true);
        if (availableUsers.length > 0) return;

        setIsLoadingUsers(true);
        try {
            console.log('🔄 Fetching users...');
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('role', ['admin', 'head_coach', 'coach', 'reception'])
                .neq('id', userId) // Exclude self
                .order('role', { ascending: true })
                .order('full_name', { ascending: true });

            console.log('✅ Users fetched:', { data, error });

            if (error) throw error;
            setAvailableUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error('Failed to load users');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowRecipients(false);
            }
        };

        if (showRecipients) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showRecipients]);

    const toggleUserSelection = (id: string) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    const toggleAllUsers = () => {
        if (selectedUserIds.length === availableUsers.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(availableUsers.map(u => u.id));
        }
    };

    const uploadBroadcast = async (blob: Blob) => {
        setIsUploading(true);
        const fileName = `${userId}_${Date.now()}.webm`;

        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('walkie-talkie')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('walkie-talkie')
                .getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('voice_broadcasts')
                .insert({
                    sender_id: userId,
                    audio_url: publicUrl,
                    target_users: selectedUserIds.length > 0 ? selectedUserIds : null, // Null means everyone
                    expires_at: new Date(Date.now() + 60000).toISOString() // Expire in 1 min
                });

            if (dbError) throw dbError;
            // toast.success('Broadcast sent!');
        } catch (err: any) {
            console.error('Broadcast error:', err);
            toast.error('Failed to send broadcast');
        } finally {
            setIsUploading(false);
        }
    };

    // Native touch handling to bypass passive listener restrictions
    useEffect(() => {
        const btn = recordButtonRef.current;
        if (!btn || role !== 'admin') return;

        const onTouchStart = (e: TouchEvent) => {
            handlePressStart(e);
        };

        const onTouchEnd = (e: TouchEvent) => {
            // Prevent scrolling/zooming while talking
            if (typeof e.preventDefault === 'function') e.preventDefault();
            handlePressEnd(e);
            handleToggle(e);
        };

        // Explicitly set passive: false to allow preventDefault()
        btn.addEventListener('touchstart', onTouchStart, { passive: false });
        btn.addEventListener('touchend', onTouchEnd, { passive: false });

        return () => {
            btn.removeEventListener('touchstart', onTouchStart);
            btn.removeEventListener('touchend', onTouchEnd);
        };
    }, [role, isRecording]); // Re-attach if state changes to ensure fresh closures

    // Global Listener for Coaches
    useEffect(() => {
        const channel = supabase
            .channel('voice-broadcasts-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'voice_broadcasts' },
                async (payload) => {
                    const newBroadcast = payload.new as any;
                    console.log('📡 WalkieTalkie: Received broadcast:', newBroadcast);

                    if (newBroadcast.sender_id !== userId) {
                        // 1. Critical Targeting Check
                        const isTargeted = newBroadcast.target_users && Array.isArray(newBroadcast.target_users) && newBroadcast.target_users.length > 0;
                        const includesMe = isTargeted && newBroadcast.target_users.includes(userId);

                        // 🛑 Logic: 
                        // - If it's targeted specifically to me -> ALWAYS play (override mute).
                        // - If it's a "Broadcast to All" -> Only play if NOT muted.
                        // - If it's targeted to OTHERS -> Ignore.

                        const shouldPlay = includesMe || (!isTargeted && !isMuted);

                        if (!shouldPlay) {
                            console.log('📡 WalkieTalkie: Broadcast ignored (muted or not targeted)', { isTargeted, includesMe, isMuted });
                            return;
                        }

                        setIsIncoming(true);

                        // ELITE: Sensory Feedback (Vibration) for Targeted Messages
                        if (includesMe && 'vibrate' in navigator) {
                            navigator.vibrate([100, 50, 100, 50, 300]); // SOS-like pattern for attention
                        }

                        playNotificationSound(includesMe); // Play chime (forced boost if targeted)
                        setTimeout(() => playBeep('start', includesMe), 500); // Wait for chime to resonate before radio chirp

                        try {
                            // ELITE: Use Web Audio API for Volume Boosting
                            if (!audioContext.current) {
                                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                            }
                            if (audioContext.current.state === 'suspended') {
                                await audioContext.current.resume();
                            }

                            const response = await fetch(newBroadcast.audio_url);
                            const arrayBuffer = await response.arrayBuffer();
                            const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);

                            const source = audioContext.current.createBufferSource();
                            source.buffer = audioBuffer;

                            // Create Gain Node for Volume Boost
                            const boost = audioContext.current.createGain();

                            // ULTRA-FORCED: Massive digital gain (15x) for targeted messages
                            const gainFactor = includesMe ? 15.0 : 3.0;
                            boost.gain.value = gainFactor;

                            console.log(`📡 WalkieTalkie: Playing with Ultra-Forced gain: ${gainFactor}`);

                            source.connect(boost);
                            boost.connect(audioContext.current.destination);

                            source.start(0);
                            source.onended = () => {
                                setIsIncoming(false);
                                playBeep('end', includesMe);
                            };

                        } catch (e: any) {
                            console.error('🚫 WalkieTalkie: Elite Playback failed:', e);

                            // Fallback to standard audio if Web Audio fails
                            const audio = new Audio(newBroadcast.audio_url);
                            audio.crossOrigin = "anonymous";
                            audio.play().catch(err => console.error('Fallback blocked:', err));
                            audio.onended = () => {
                                setIsIncoming(false);
                                playBeep('end');
                            };

                            toast((t) => (
                                <span className="flex items-center gap-2">
                                    🎙️ Walkie Talkie
                                    <button
                                        onClick={() => {
                                            audio.play();
                                            toast.dismiss(t.id);
                                        }}
                                        className="bg-primary text-black px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Listen
                                    </button>
                                </span>
                            ), { duration: 10000, className: 'premium-toast-vibrant' });
                        }
                    }
                }
            )
            .subscribe();

        // ELITE: WakeLock Implementation to stay alive in background
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock.current = await (navigator as any).wakeLock.request('screen');
                    console.log('🛡️ WalkieTalkie: WakeLock active');
                } catch (err: any) {
                    console.warn('WakeLock failed:', err.message);
                }
            }
        };

        requestWakeLock();

        return () => {
            supabase.removeChannel(channel);
            if (wakeLock.current) {
                wakeLock.current.release();
                wakeLock.current = null;
            }
        };
    }, [isMuted, userId]);

    return (
        <div ref={containerRef} onMouseLeave={() => setShowRecipients(false)} className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Recipients Selection - ADMIN ONLY */}
            {role === 'admin' && (
                <>
                    <button
                        onClick={handleOpenRecipients}
                        className={`relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all sidebar-3d-item ${showRecipients || selectedUserIds.length > 0
                            ? 'bg-amber-500/10 border border-amber-500/50 text-amber-500 sidebar-3d-item-active'
                            : 'text-white/40 hover:text-white hover:bg-white/10'
                            }`}
                        onMouseEnter={playHoverSound}
                        title="Select who receives this message"
                    >
                        <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        {selectedUserIds.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black border-2 border-[#122E34] shadow-lg">
                                {selectedUserIds.length}
                            </span>
                        )}
                    </button>

                    {showRecipients && (
                        <div className="fixed sm:absolute top-24 sm:top-12 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-0 w-[calc(100vw-2rem)] sm:w-64 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <span className="text-xs font-bold text-white/80">Select Recipients</span>
                                <button
                                    onClick={() => setShowRecipients(false)}
                                    className="text-white/40 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {isLoadingUsers ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={toggleAllUsers}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${selectedUserIds.length === availableUsers.length && availableUsers.length > 0
                                                ? 'bg-amber-500/20 text-amber-500' // Changed to amber for better contrast
                                                : 'hover:bg-white/5 text-white/60'
                                                }`}
                                            onMouseEnter={playHoverSound}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUserIds.length === availableUsers.length && availableUsers.length > 0
                                                ? 'bg-amber-500 border-amber-500'
                                                : 'border-white/20'
                                                }`}>
                                                {selectedUserIds.length === availableUsers.length && availableUsers.length > 0 && <CheckSquare className="w-3 h-3 text-black" />}
                                            </div>
                                            Broadcast to All ({availableUsers.length})
                                        </button>

                                        <div className="h-px bg-white/10 my-1 mx-2" />

                                        {availableUsers.map(user => (
                                            <button
                                                key={user.id}
                                                onClick={() => toggleUserSelection(user.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${selectedUserIds.includes(user.id)
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'hover:bg-white/5 text-white/60'
                                                    }`}
                                                onMouseEnter={playHoverSound}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUserIds.includes(user.id)
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-white/20'
                                                    }`}>
                                                    {selectedUserIds.includes(user.id) && <CheckSquare className="w-3 h-3 text-black" />}
                                                </div>
                                                <div className="flex flex-col items-start px-1">
                                                    <span className="text-xs">{user.full_name}</span>
                                                    <span className="text-[9px] uppercase opacity-50">{user.role.replace('_', ' ')}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
            {/* Broadcast Button - ADMIN ONLY */}
            {role === 'admin' && (
                <button
                    ref={recordButtonRef}
                    onMouseDown={handlePressStart}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onClick={(e) => {
                        if ((Date.now() - mouseDownTime.current) < 50) return;
                        handleToggle(e);
                    }}
                    className={`relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all duration-300 sidebar-3d-item ${isRecording
                        ? 'bg-red-500/20 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110 sidebar-3d-item-active'
                        : 'text-white/70 hover:border-primary/50 hover:bg-white/10'
                        }`}
                    onMouseEnter={playHoverSound}
                    title={isRecording ? "Click to Stop" : "Broadcasting Mic (Hold to Talk)"}
                >
                    {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : isRecording ? (
                        <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                    ) : (
                        <Mic className="w-4 h-4" />
                    )}
                </button>
            )}

            {/* Speaker Button - ALL AUTHORIZED ROLES */}
            {role !== 'admin' && (
                <button
                    onClick={() => {
                        setIsMuted(!isMuted);
                        if (audioContext.current?.state === 'suspended') {
                            audioContext.current.resume();
                        }
                    }}
                    className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500 sidebar-3d-item ${isMuted
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 sidebar-3d-item-active'
                        : isIncoming
                            ? 'bg-primary border-primary text-white animate-pulse shadow-[0_0_25px_rgba(var(--primary-rgb),0.6)] scale-110 sidebar-3d-item-active'
                            : 'text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                    onMouseEnter={playHoverSound}
                    title={isIncoming ? "Admin is Speaking... (Click to Stop)" : "Hoki Toki Speaker (Mute/Unmute)"}
                >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isIncoming && !isMuted && (
                        <span className="absolute -inset-1.5 bg-primary/30 rounded-full animate-ping"></span>
                    )}
                </button>
            )}
        </div>
    );
}

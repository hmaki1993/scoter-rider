import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string;
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// Helper function for VAPID key
function urlBase64ToUint8Array(base64String: string) {
    try {
        // Super aggressive cleaning: remove anything that isn't a Base64URL character
        // This handles cases where a '=' might have been accidentally included at the start
        const cleaned = base64String.trim()
            .replace(/^["'](.+)["']$/, '$1') // Remove quotes
            .replace(/^=/, '');              // Remove accidental leading '='

        const padding = '='.repeat((4 - cleaned.length % 4) % 4);
        const base64 = (cleaned + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (err) {
        console.error('[Call] VAPID Key decoding failed. Value:', base64String);
        throw new Error('Invalid VAPID Public Key format. Make sure it is a valid Base64URL string.');
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CallProfile {
    id: string;
    full_name: string;
    role?: string;
    avatar_url?: string;
    last_seen?: string;
}

export interface ActiveCallInfo {
    type: 'audio' | 'video';
    otherUser: CallProfile;
    channelId: string;
    conversationId: string;
}

export interface IncomingCallInfo {
    callId: string;
    type: 'audio' | 'video';
    caller: CallProfile;
    channelId: string;
    conversationId: string;
}

interface CallContextType {
    activeCall: ActiveCallInfo | null;
    incomingCall: IncomingCallInfo | null;
    callStatus: 'calling' | 'ringing' | 'connected' | null;
    callDuration: number;
    isMuted: boolean;
    isCameraOff: boolean;
    isCallMinimized: boolean;

    initiateCall: (callType: 'audio' | 'video', otherUser: CallProfile, conversationId: string) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => Promise<void>;
    hangupCall: (isInitiator?: boolean) => Promise<void>;
    toggleMute: () => Promise<void>;
    toggleCamera: () => Promise<void>;
    setIsCallMinimized: (v: boolean) => void;

    // For Communications.tsx to set incoming calls
    setIncomingCall: (call: IncomingCallInfo | null) => void;

    // Diagnostic & Testing
    realtimeStatus: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'INITIAL';
    pushReady: boolean;
    sendTestPush: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children, currentUserId }: { children: React.ReactNode; currentUserId?: string }) {
    const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
    const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
    const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isCallMinimized, setIsCallMinimized] = useState(false);
    const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'INITIAL'>('INITIAL');
    const [pushReady, setPushReady] = useState(false);

    const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
    const localAudioRef = useRef<ILocalAudioTrack | null>(null);
    const localVideoRef = useRef<ILocalVideoTrack | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const ringingAudioRef = useRef<HTMLAudioElement | null>(null);
    const incomingRingtoneRef = useRef<HTMLAudioElement | null>(null);
    const activeCallRef = useRef<ActiveCallInfo | null>(null);
    const callDurationRef = useRef(0);
    const wakeLockRef = useRef<any>(null);

    // Web AudioContext refs for "keep-alive" oscillator (silent audio)
    const audioCtxRef = useRef<AudioContext | null>(null);
    const silentOscRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const swKeepaliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pinnedAudioRef = useRef<HTMLAudioElement | null>(null);

    // ─── Notification Permission Check ────────────────────────────────────────
    useEffect(() => {
        // Warning for HTTP testing on mobile (192.168.x.x)
        const isSecureOrLocalhost = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
        if (!isSecureOrLocalhost) {
            console.warn('[Call] Insecure origin detected. Service Workers and Push Notifications are blocked by mobile browsers.');
            toast.error('أنت بتستخدم رابط HTTP مش آمن. الإشعارات ومكالمات الخلفية مش هتشتغل على الموبايل غير لو استخدمت HTTPS.', { duration: 6000 });
            return;
        }

        if ('Notification' in window && Notification.permission !== 'granted') {
            const hasAsked = localStorage.getItem('healy_notif_asked');
            if (!hasAsked) {
                Notification.requestPermission();
                localStorage.setItem('healy_notif_asked', 'true');
            } else if (Notification.permission === 'denied') {
                console.warn('[Call] Notifications are blocked.');
                toast.error('علشان يوصلك رنّة لما الموبايل يكون مقفول، لازم توافق على الإشعارات من إعدادات المتصفح.');
            }
        }
    }, []);


    // ─── Service Worker Notification Helpers ───────────────────────────────────
    // Sending messages to the SW so it can show a persistent "Call in Progress"
    // notification. The persistent notification keeps the SW alive, which in turn
    // prevents the browser from fully suspending the tab when the screen is off.
    const notifySwCallStarted = useCallback((callerName: string, callType: string) => {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
        navigator.serviceWorker.controller.postMessage({
            type: 'CALL_STARTED',
            callerName,
            callType
        });
        // Also run periodic fetch-based keepalive pings (backup for SW keepalive)
        if (swKeepaliveIntervalRef.current) clearInterval(swKeepaliveIntervalRef.current);
        swKeepaliveIntervalRef.current = setInterval(() => {
            // Fetch a local SW keepalive endpoint. This prevents Android from
            // killing the SW process when the tab is backgrounded.
            fetch('/__sw_keepalive', { method: 'GET', cache: 'no-store' }).catch(() => { });
        }, 8000);
        console.log('[Call] SW notified of call start');
    }, []);

    const notifySwCallEnded = useCallback(() => {
        if (swKeepaliveIntervalRef.current) {
            clearInterval(swKeepaliveIntervalRef.current);
            swKeepaliveIntervalRef.current = null;
        }
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
        navigator.serviceWorker.controller.postMessage({ type: 'CALL_ENDED' });
        console.log('[Call] SW notified of call end');
    }, []);


    const startSilentAudio = useCallback(() => {
        try {
            // 1. Web Audio oscillator ("keep-alive" heartbeat)
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') return;
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioCtxRef.current = ctx;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();

            silentOscRef.current = osc;
            gainNodeRef.current = gain;

            // 2. Physical "Pinned" Audio (Industrial-grade for Android Background)
            if (!pinnedAudioRef.current) {
                const audio = new Audio();
                // 5-second silent MP3 (Properly formatted for better browser compatibility)
                audio.src = 'data:audio/mp3;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAZGFzaABUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzbzZtcDQxAFRTU0UAAAAPAAADTGF2ZjYwLjMuMTAwAAAAAAAAAAAAAAD/80MUAAAAAANIAAAAAExYdmY2MC4zLjEwMAD/80MUZAAAAANIAAAAAExYdmY2MC4zLjEwMAD/80MUlAAAAANIAAAAAExYdmY2MC4zLjEwMAD/80MU5AAAAANIAAAAAExYdmY2MC4zLjEwMAD/80MVAfAAAAANIAAAAAExYdmY2MC4zLjEwMA==';
                audio.loop = true;
                audio.volume = 0.01;
                audio.play().catch(err => console.warn('[Call] Pinned audio blocked:', err));
                pinnedAudioRef.current = audio;
            }

            // 3. Media Session Metadata (Critical for Android/iOS lock screen)
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Active Voice Call',
                    artist: 'Healy System',
                    album: 'Communications',
                    artwork: [{ src: '/logo.png', sizes: '512x512', type: 'image/png' }]
                });
                navigator.mediaSession.playbackState = 'playing';
            }

            console.log('[Call] Industrial persistence (WebAudio + Pinned + MediaSession) started');
        } catch (err) {
            console.error('[Call] Persistent sessions failed:', err);
        }
    }, []);

    const stopSilentAudio = useCallback(() => {
        try {
            silentOscRef.current?.stop();
            silentOscRef.current?.disconnect();
            gainNodeRef.current?.disconnect();
            audioCtxRef.current?.close();

            if (pinnedAudioRef.current) {
                pinnedAudioRef.current.pause();
                pinnedAudioRef.current.src = "";
                pinnedAudioRef.current = null;
            }
        } catch (_) { }
        silentOscRef.current = null;
        gainNodeRef.current = null;
        audioCtxRef.current = null;
    }, []);

    // Resume AudioContext if the browser suspended it (common on mobile background)
    const resumeAudioContext = useCallback(async () => {
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state === 'suspended') {
            try {
                await ctx.resume();
                console.log('[Call] AudioContext resumed from suspended state');
            } catch (e) {
                console.warn('[Call] Failed to resume AudioContext:', e);
            }
        }
    }, []);

    // ─── MediaSession Management ───────────────────────────────────────────────
    const updateMediaSession = useCallback((otherUser?: CallProfile) => {
        if ('mediaSession' in navigator && otherUser) {
            const nav = navigator as any;
            nav.mediaSession.metadata = new (window as any).MediaMetadata({
                title: `Call with ${otherUser.full_name}`,
                artist: 'Healy Communications',
                album: 'Active Call',
                artwork: otherUser.avatar_url ? [{ src: otherUser.avatar_url, sizes: '512x512', type: 'image/png' }] : []
            });
            nav.mediaSession.playbackState = 'playing';

            // Set empty handlers to keep the session alive and prevent other media from hijacking
            const actions = ['play', 'pause', 'stop', 'previoustrack', 'nexttrack'];
            actions.forEach(action => {
                try { nav.mediaSession.setActionHandler(action, () => { console.log(`[MediaSession] Action: ${action}`); }); } catch (e) { }
            });
        }
    }, []);

    const clearMediaSession = useCallback(() => {
        if ('mediaSession' in navigator) {
            const nav = navigator as any;
            nav.mediaSession.metadata = null;
            nav.mediaSession.playbackState = 'none';
        }
    }, []);

    // Sync activeCallRef
    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

    // ─── Wake Lock Management ──────────────────────────────────────────────────
    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('[Call] Wake Lock active');
                wakeLockRef.current.addEventListener('release', () => {
                    console.log('[Call] Wake Lock released');
                });
            }
        } catch (err) {
            console.error('[Call] Wake Lock failed:', err);
        }
    }, []);

    // ─── Push Notification Setup ────────────────────────────────────────────────
    useEffect(() => {
        if (!currentUserId || !VAPID_PUBLIC_KEY) return;

        async function setupPushNotifications() {
            try {
                if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                    console.warn('[Call] Push notifications not supported in this browser.');
                    return;
                }

                console.log('[Call] Setting up push notifications...');
                if (!VAPID_PUBLIC_KEY) {
                    console.error('[Call] VITE_VAPID_PUBLIC_KEY is missing!');
                    return;
                }

                const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
                const registration = await navigator.serviceWorker.register('/sw.js');

                // Wait for service worker to be ready
                await navigator.serviceWorker.ready;

                // Request permission
                if (Notification.permission === 'default') {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') return;
                } else if (Notification.permission === 'denied') {
                    return;
                }

                // Subscribe or get existing
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: applicationServerKey
                    });
                }

                // Save to database
                const { error: updateError } = await supabase.from('profiles').update({
                    push_subscription: JSON.parse(JSON.stringify(subscription))
                }).eq('id', currentUserId);

                if (updateError) {
                    console.error('[Call] Failed to save subscription to DB:', updateError);
                    toast.error('فشل في حفظ اشتراك الإشعارات في قاعدة البيانات');
                } else {
                    console.log('[Call] Push subscription successful and saved.');
                    setPushReady(true);
                }

            } catch (err: any) {
                console.error('[Call] Failed to setup push notifications:', err);
                setPushReady(false);
                if (err.message?.includes('registration failed')) {
                    toast.error('فشل تسجيل الـ Service Worker - تأكد من استخدام HTTPS');
                } else {
                    toast.error('خطأ في إعداد الإشعارات: ' + (err.message || 'Unknown error'));
                }
            }
        }

        setupPushNotifications();
    }, [currentUserId]);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    // ─── Visibility Change: Aggressive Audio Recovery ───────────────────────
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (!activeCallRef.current) return;

            if (document.visibilityState === 'visible') {
                console.log('[Call] Resuming from background - re-pinking session...');
                await requestWakeLock();
                await resumeAudioContext();

                // Re-play remote tracks
                const client = agoraClientRef.current;
                if (client) {
                    client.remoteUsers.forEach(user => {
                        if (user.audioTrack) {
                            try {
                                user.audioTrack.stop();
                                user.audioTrack.play();
                                console.log('[Call] Re-playing remote audio for:', user.uid);
                            } catch (e) {
                                console.warn('[Call] Failed to re-play remote audio:', e);
                            }
                        }
                    });
                }

                // Re-play pinned audio
                if (pinnedAudioRef.current && pinnedAudioRef.current.paused) {
                    pinnedAudioRef.current.play().catch(() => { });
                }

                // Force mic state refresh
                if (localAudioRef.current && !isMuted) {
                    try {
                        const isEnabled = localAudioRef.current.enabled;
                        if (!isEnabled) {
                            await localAudioRef.current.setEnabled(true);
                        }
                    } catch (e) {
                        console.warn('[Call] Failed to refresh mic state:', e);
                    }
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [activeCall, requestWakeLock, resumeAudioContext, isMuted]);

    // ─── Background Heartbeat ───────────────────────────────────────────────
    useEffect(() => {
        if (!activeCall) return;

        heartbeatIntervalRef.current = setInterval(async () => {
            const ctx = audioCtxRef.current;
            if (ctx && ctx.state === 'suspended') {
                await resumeAudioContext();
            }

            if (pinnedAudioRef.current && pinnedAudioRef.current.paused) {
                pinnedAudioRef.current.play().catch(() => { });
            }

            if (!wakeLockRef.current && 'wakeLock' in navigator) {
                requestWakeLock();
            }
        }, 10000);

        return () => {
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        };
    }, [activeCall, resumeAudioContext, requestWakeLock]);

    // ─── Call Timer Management ────────────────────────────────────────────────
    useEffect(() => {
        if (callStatus === 'connected') {
            if (!callTimerRef.current) {
                callTimerRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);
            }
        } else {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
            if (callStatus === null) {
                setCallDuration(0);
            }
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [callStatus]);

    // Keep callDurationRef in sync
    useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

    // ─── Stop all audio helpers ───────────────────────────────────────────────
    const stopAllAudio = useCallback(() => {
        if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
        if (ringingAudioRef.current) { ringingAudioRef.current.pause(); ringingAudioRef.current.currentTime = 0; ringingAudioRef.current = null; }
        if (incomingRingtoneRef.current) { incomingRingtoneRef.current.pause(); incomingRingtoneRef.current.currentTime = 0; incomingRingtoneRef.current = null; }
    }, []);

    // ─── Fetch Agora Token ────────────────────────────────────────────────────
    const fetchAgoraToken = async (channelName: string) => {
        try {
            const { data, error } = await supabase.functions.invoke('agora-token', {
                body: { channelName, userAccount: currentUserId }
            });
            if (error) throw error;
            return data.token as string;
        } catch (err) {
            console.error('[Call] Error fetching Agora token:', err);
            return null;
        }
    };

    // ─── Join Agora Channel ───────────────────────────────────────────────────
    const joinAgoraChannel = async (channelId: string, callType: 'audio' | 'video') => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallDuration(0);

        try {
            const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            agoraClientRef.current = client;

            client.on('user-published', async (user, mediaType) => {
                await client.subscribe(user, mediaType);
                setCallStatus('connected');
                stopAllAudio();
                if (mediaType === 'video') {
                    const remoteEl = document.getElementById('agora-remote-video');
                    if (remoteEl) user.videoTrack?.play(remoteEl);
                }
                if (mediaType === 'audio') user.audioTrack?.play();
            });

            client.on('user-unpublished', (user, mediaType) => {
                if (mediaType === 'video') user.videoTrack?.stop();
            });

            client.on('user-left', () => {
                hangupCall(false);
                toast('Call ended — other user left', { icon: '📞' });
            });

            const token = await fetchAgoraToken(channelId);
            if (!token) {
                toast.error('Failed to get security token for call');
                setActiveCall(null); activeCallRef.current = null;
                if (callTimerRef.current) clearInterval(callTimerRef.current);
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
                    if (videoErr.name === 'NotFoundError' || videoErr.message?.includes('DEVICE_NOT_FOUND')) {
                        toast.error('No camera detected. Switching to audio call.', { icon: '📷' });
                        await client.publish([audioTrack]);
                    } else throw videoErr;
                }
            } else {
                await client.publish([audioTrack]);
            }
        } catch (err: any) {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setCallDuration(0); setActiveCall(null); activeCallRef.current = null;
            toast.error('Failed to join call: ' + (err?.message || 'Unknown error'));
        }
    };

    // ─── Leave Agora Channel ──────────────────────────────────────────────────
    const leaveAgoraChannel = async () => {
        try {
            localAudioRef.current?.stop(); localAudioRef.current?.close(); localAudioRef.current = null;
            localVideoRef.current?.stop(); localVideoRef.current?.close(); localVideoRef.current = null;
            if (agoraClientRef.current) { await agoraClientRef.current.leave(); agoraClientRef.current = null; }
        } catch (err) { console.error('[Call] Agora leave error:', err); }
    };

    // ─── Initiate Call ────────────────────────────────────────────────────────
    const initiateCall = async (callType: 'audio' | 'video', otherUser: CallProfile, conversationId: string) => {
        if (!currentUserId) return;

        // CRITICAL: startSilentAudio MUST be called before any awaits to ensure 
        // the AudioContext is unlocked by the user's direct click/gesture.
        startSilentAudio();

        const channelId = `call_${conversationId}_${Date.now()}`;

        const { error } = await supabase.from('call_records').insert({
            conversation_id: conversationId,
            caller_id: currentUserId,
            call_type: callType,
            status: 'ringing',
            agora_channel_id: channelId
        });

        if (error) { toast.error('Failed to start call'); return; }

        const info: ActiveCallInfo = { type: callType, otherUser, channelId, conversationId };
        setActiveCall(info);
        activeCallRef.current = info;
        setIsCallMinimized(false);

        const ringtoneUrl = localStorage.getItem('healy_ringtone_url') || 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';

        const isOnline = otherUser?.last_seen && (Date.now() - new Date(otherUser.last_seen).getTime() < 120000);
        const initialStatus = isOnline ? 'ringing' : 'calling';
        setCallStatus(initialStatus);

        // 4s on / 2s off ringing cycle
        const startRingingCycle = () => {
            const playAndSchedule = () => {
                if (!activeCallRef.current) return;
                if (!ringingAudioRef.current) {
                    ringingAudioRef.current = new Audio(ringtoneUrl);
                    ringingAudioRef.current.loop = false;
                }
                ringingAudioRef.current.play().catch(() => { });
                ringTimeoutRef.current = setTimeout(() => {
                    if (ringingAudioRef.current) { ringingAudioRef.current.pause(); ringingAudioRef.current.currentTime = 0; }
                    if (activeCallRef.current) ringTimeoutRef.current = setTimeout(playAndSchedule, 2000);
                }, 4000);
            };
            playAndSchedule();
        };
        startRingingCycle();

        toast(`${initialStatus === 'ringing' ? 'Ringing' : 'Calling'} ${otherUser.full_name}...`, { icon: callType === 'video' ? '🎥' : '📞' });

        // Trigger background push notification for receiver
        supabase.functions.invoke('send-call-push', {
            body: {
                action: 'incoming',
                call_type: callType,
                caller_id: currentUserId,
                receiver_id: otherUser.id,
                conversation_id: conversationId
            }
        }).catch(err => console.error('[Call] Failed to send push:', err));

        await joinAgoraChannel(channelId, callType);
        await requestWakeLock();
        startSilentAudio();
        updateMediaSession(otherUser);

        // Notify SW to show persistent "Call in Progress" notification.
        // If the SW isn't controlling the tab yet, we'll try again in a moment.
        if (navigator.serviceWorker.controller) {
            notifySwCallStarted(otherUser.full_name, callType);
        } else {
            console.warn('[Call] SW not ready for notification, retrying...');
            setTimeout(() => notifySwCallStarted(otherUser.full_name, callType), 1000);
        }
    };

    // ─── Test Push Notification ──────────────────────────────────────────────
    const sendTestPush = async () => {
        if (!currentUserId) return;
        toast.loading('Sending test push...', { id: 'test-push' });
        try {
            const { error } = await supabase.functions.invoke('send-call-push', {
                body: {
                    action: 'incoming',
                    call_type: 'audio',
                    caller_id: currentUserId,
                    receiver_id: currentUserId,
                    conversation_id: 'test-convo'
                }
            });
            if (error) throw error;
            toast.success('Test push sent! Lock your screen now.', { id: 'test-push' });
        } catch (err: any) {
            console.error('[Call] Test push failed:', err);
            toast.error('Test push failed: ' + (err.message || 'Unknown error'), { id: 'test-push' });
        }
    };
    // ─── Accept Call ──────────────────────────────────────────────────────────
    const acceptCall = async () => {
        if (!incomingCall) return;
        const call = incomingCall;

        // CRITICAL: startSilentAudio MUST be called before any awaits to ensure 
        // the AudioContext is unlocked by the user's direct click/gesture.
        startSilentAudio();

        await supabase.from('call_records').update({ status: 'answered' }).eq('id', call.callId);

        const info: ActiveCallInfo = { type: call.type, otherUser: call.caller, channelId: call.channelId, conversationId: call.conversationId };
        setActiveCall(info);
        activeCallRef.current = info;
        setCallStatus('connected');
        setIncomingCall(null);
        setIsCallMinimized(false);
        stopAllAudio();

        await joinAgoraChannel(call.channelId, call.type);
        await requestWakeLock();
        startSilentAudio();
        updateMediaSession(call.caller);

        // Notify SW to show persistent "Call in Progress" notification
        if (navigator.serviceWorker.controller) {
            notifySwCallStarted(call.caller.full_name, call.type);
        } else {
            console.warn('[Call] SW not ready for notification, retrying...');
            setTimeout(() => notifySwCallStarted(call.caller.full_name, call.type), 1000);
        }
    };

    // ─── Reject Call ──────────────────────────────────────────────────────────
    const rejectCall = async () => {
        if (!incomingCall) return;
        await supabase.from('call_records').update({ status: 'rejected' }).eq('id', incomingCall.callId);
        await supabase.from('messages').insert({
            conversation_id: incomingCall.conversationId,
            sender_id: currentUserId,
            type: 'call_event',
            call_status: 'missed',
            call_type: incomingCall.type,
            caller_id: incomingCall.caller.id
        });
        stopAllAudio();
        setIncomingCall(null);
    };

    // ─── Hang Up ──────────────────────────────────────────────────────────────
    const hangupCall = useCallback(async (isInitiator = false) => {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        const dur = callDurationRef.current;
        const callSnapshot = activeCallRef.current;

        stopAllAudio();
        setCallStatus(null);
        await releaseWakeLock();
        stopSilentAudio();
        clearMediaSession();
        notifySwCallEnded(); // Clear SW persistent notification + stop keepalive pings
        await leaveAgoraChannel();

        setActiveCall(null);
        activeCallRef.current = null;
        setCallDuration(0);
        setIsMuted(false);
        setIsCameraOff(false);

        if (callSnapshot && isInitiator) {
            const { data: callRec } = await supabase.from('call_records')
                .select('caller_id')
                .eq('agora_channel_id', callSnapshot.channelId)
                .single();

            await supabase.from('call_records')
                .update({ status: 'ended', ended_at: new Date().toISOString() })
                .eq('agora_channel_id', callSnapshot.channelId);

            await supabase.from('messages').insert({
                conversation_id: callSnapshot.conversationId,
                sender_id: currentUserId,
                type: 'call_event',
                call_status: dur > 0 ? 'answered' : 'missed',
                call_duration: dur > 0 ? dur : undefined,
                call_type: callSnapshot.type,
                caller_id: callRec?.caller_id
            });

            // If missed/ended, tell receiver to clear the push notification
            if (dur === 0) {
                supabase.functions.invoke('send-call-push', {
                    body: {
                        action: 'ended',
                        receiver_id: callSnapshot.otherUser.id
                    }
                }).catch(err => console.error('[Call] Failed to clear push:', err));
            }
        }
    }, [currentUserId, stopAllAudio]);

    // ─── Toggle Mute ─────────────────────────────────────────────────────────
    const toggleMute = async () => {
        if (localAudioRef.current) {
            const newMuted = !isMuted;
            await localAudioRef.current.setMuted(newMuted);
            setIsMuted(newMuted);
        }
    };

    // ─── Toggle Camera ────────────────────────────────────────────────────────
    const toggleCamera = async () => {
        if (localVideoRef.current) {
            const newOff = !isCameraOff;
            await localVideoRef.current.setMuted(newOff);
            setIsCameraOff(newOff);
        }
    };

    // ─── Incoming Call Subscription ───────────────────────────────────────────
    useEffect(() => {
        if (!currentUserId) return;

        const channel = supabase
            .channel(`global-calls:${currentUserId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_records' },
                async (payload) => {
                    console.log('[CallContext] Incoming call event:', payload);
                    const call = payload.new as any;
                    if (call.caller_id === currentUserId) return;

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

                    const caller: CallProfile | null = profileRes.data ? {
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

                        // Play incoming ringtone
                        const ringtoneUrl = localStorage.getItem('healy_ringtone_url') || 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';
                        if (!incomingRingtoneRef.current) {
                            incomingRingtoneRef.current = new Audio(ringtoneUrl);
                            incomingRingtoneRef.current.loop = true;
                        }
                        incomingRingtoneRef.current.play().catch(() => { });
                    }
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_records' },
                (payload) => {
                    const call = payload.new as any;
                    if (call.status === 'ended' || call.status === 'rejected') {
                        setIncomingCall(null);
                        stopAllAudio();
                        if (activeCallRef.current) hangupCall(false);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[CallContext] Realtime status for user ${currentUserId}:`, status);
                setRealtimeStatus(status as any);
                if (status === 'CHANNEL_ERROR') {
                    console.error('[CallContext] Realtime channel error. Calls will not ring!');
                }
            });

        return () => {
            console.log('[CallContext] Cleaning up realtime channel');
            supabase.removeChannel(channel);
        };
    }, [currentUserId, hangupCall, stopAllAudio]);

    // ─── Service Worker Message Listener ──────────────────────────────────────
    // Listens for actions from background notifications (Answer/Decline/Focus)
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const handleMessage = (event: MessageEvent) => {
            const { type } = event.data;
            console.log('[CallContext] Message from SW:', type);

            switch (type) {
                case 'ACCEPT_CALL_ACTION':
                    acceptCall();
                    break;
                case 'REJECT_CALL_ACTION':
                    rejectCall();
                    break;
                case 'FOCUS_CALL':
                    setIsCallMinimized(false);
                    break;
                default:
                    break;
            }
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);
        return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }, [acceptCall, rejectCall]);


    return (
        <CallContext.Provider value={{
            activeCall,
            incomingCall,
            callStatus,
            callDuration,
            isMuted,
            isCameraOff,
            isCallMinimized,
            initiateCall,
            acceptCall,
            rejectCall,
            hangupCall,
            toggleMute,
            toggleCamera,
            setIsCallMinimized,
            setIncomingCall,
            realtimeStatus,
            pushReady,
            sendTestPush,
        }}>
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const ctx = useContext(CallContext);
    if (!ctx) throw new Error('useCall must be used within a CallProvider');
    return ctx;
}

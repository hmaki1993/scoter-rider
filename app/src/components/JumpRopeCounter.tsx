import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useTranslation } from 'react-i18next';
import '../styles/JumpRope.css';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

const JumpRopeCounter = () => {
    const { t } = useTranslation();
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Core State ---
    const [jumpCount, setJumpCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<'initializing' | 'live' | 'error'>('initializing');
    const [displayStatus, setDisplayStatus] = useState<'READY' | 'JUMPING'>('READY');
    const [movementPct, setMovementPct] = useState(0);
    const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [workoutDuration, setWorkoutDuration] = useState<number>(0);
    const [jpm, setJpm] = useState(0);
    const [workTime, setWorkTime] = useState(0);
    const [restTime, setRestTime] = useState(0);
    const [intensityStatus, setIntensityStatus] = useState<'WORKING' | 'RESTING'>('RESTING');
    const [customMins, setCustomMins] = useState('');
    const [customSecs, setCustomSecs] = useState('');

    // Refs for non-passive wheel listeners
    const minsInputRef = useRef<HTMLInputElement>(null);
    const secsInputRef = useRef<HTMLInputElement>(null);

    // --- Detection Refs (Optimized for Speed) ---
    const jumpCountRef = useRef(0);
    const jumpStatusRef = useRef<'standing' | 'jumping'>('standing');
    const baselineY = useRef<number | null>(null);
    const bodyHeightRef = useRef<number>(200);
    const peakY = useRef<number>(0);
    const valleyY = useRef<number>(0);
    const cooldownRef = useRef(false);
    const lastNoseY = useRef<number>(0);
    const lastNoseX = useRef<number>(0);
    const lastShoulderWidth = useRef<number>(0);
    const lastDisplacementRef = useRef<number>(0);
    const emaSmoothY = useRef<number | null>(null);
    const isStableRef = useRef<boolean>(false);
    const stabilityStartRef = useRef<number | null>(null);
    const trackingLossStartRef = useRef<number | null>(null);
    const [setupStatus, setSetupStatus] = useState<'MOVING' | 'STEP_BACK' | 'READY'>('MOVING');
    const velocityRef = useRef<number>(0);
    const lastFrameTime = useRef<number>(Date.now());
    const isTimerStartedRef = useRef(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityTimeRef = useRef<number>(0);
    const workTimeRef = useRef(0);
    const restTimeRef = useRef(0);
    const timerRemainingRef = useRef<number | null>(null);
    const isTimerActiveRef = useRef(false);

    const handleVideoLoad = () => {
        setIsLoading(false);
        setError(null);
        setAiStatus('live');
    };

    const handleCameraError = (err: any) => {
        console.error("Webcam Error:", err);
        setError("Camera failed to start. Please check permissions.");
        setIsLoading(false);
        setAiStatus('error');
    };

    const onResults = useCallback((results: any) => {
        if (!canvasRef.current || !results.poseLandmarks) return;

        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;

        const W = canvasRef.current.width;
        const H = canvasRef.current.height;
        const now = Date.now();
        const deltaTime = (now - lastFrameTime.current) / 1000;
        if (deltaTime < 0.001) return;
        lastFrameTime.current = now;

        canvasCtx.clearRect(0, 0, W, H);

        const nose = results.poseLandmarks[0];
        const lShoulder = results.poseLandmarks[11];
        const rShoulder = results.poseLandmarks[12];
        const lHip = results.poseLandmarks[23];
        const rHip = results.poseLandmarks[24];
        const lAnkle = results.poseLandmarks[27];
        const rAnkle = results.poseLandmarks[28];

        if (!nose || !lShoulder || !rShoulder) return;

        // --- STABILITY & FULL BODY & PROXIMITY GUARD ---
        const isFullBody = !!(lAnkle && rAnkle);
        const hasAura = !!(lShoulder || rShoulder || lHip || rHip);
        const noseY = nose.y * H;
        const noseX = nose.x * W;
        const shoulderW = Math.abs(lShoulder.x - rShoulder.x) * W;

        const frameVelocityY = Math.abs(lastNoseY.current - noseY) / deltaTime;
        const frameVelocityX = Math.abs(lastNoseX.current - noseX) / deltaTime;
        const scaleVelocity = (shoulderW - lastShoulderWidth.current) / deltaTime;

        // Balanced Pro-Level thresholds: 38% coverage or 180px/s forward speed
        const isTooClose = shoulderW > (W * 0.38);
        const isApproaching = scaleVelocity > 180;
        const isCurrentlyMoving = frameVelocityY > 400 || frameVelocityX > 200 || isApproaching;

        lastNoseY.current = noseY;
        lastNoseX.current = noseX;
        lastShoulderWidth.current = shoulderW;

        // --- STABLE PERSISTENCE LOGIC ---
        if (isStableRef.current) {
            // Balanced Approach Guard: Needs 0.6s persistent proximity to reset
            if (isTooClose || isApproaching) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 600) {
                    isStableRef.current = false;
                    stabilityStartRef.current = null;
                    peakY.current = 0;
                    setSetupStatus('STEP_BACK');
                    return;
                }
            } else {
                trackingLossStartRef.current = null;
                setSetupStatus('READY');
            }

            const essentialTrackingLost = !hasAura || (!lAnkle && !rAnkle);
            const massiveLateralMovement = frameVelocityX > 500;

            if (essentialTrackingLost || massiveLateralMovement) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 1200) {
                    isStableRef.current = false;
                    stabilityStartRef.current = null;
                    setSetupStatus(!isFullBody ? 'STEP_BACK' : 'MOVING');
                    return;
                }
            }
        } else {
            // Setup Mode
            if (isCurrentlyMoving || !isFullBody || isTooClose) {
                stabilityStartRef.current = null;
                setSetupStatus(isTooClose || !isFullBody ? 'STEP_BACK' : 'MOVING');
                baselineY.current = noseY;
                setMovementPct(0);
                return;
            }

            if (stabilityStartRef.current === null) {
                stabilityStartRef.current = now;
            } else if (now - stabilityStartRef.current > 1500) {
                isStableRef.current = true;
                setSetupStatus('READY');
            }
            baselineY.current = noseY;
            return;
        }

        if (baselineY.current === null) {
            baselineY.current = noseY;
            return;
        }

        // --- NOSE PEAK DETECTION (The Core) ---
        const bodyH = Math.abs(((lAnkle?.y ?? rAnkle?.y ?? 0) - nose.y) * H);
        bodyHeightRef.current = Math.max(100, bodyH);

        // EMA Smoothing
        if (emaSmoothY.current === null) emaSmoothY.current = noseY;
        emaSmoothY.current = emaSmoothY.current * 0.4 + noseY * 0.6;
        const smoothY = emaSmoothY.current;

        // Relative Movement
        const displacement = baselineY.current - smoothY;
        const velocity = (lastDisplacementRef.current - displacement) / deltaTime; // Frame velocity
        velocityRef.current = velocityRef.current * 0.3 + (displacement - lastDisplacementRef.current) / deltaTime * 0.7;
        lastDisplacementRef.current = displacement;

        const jumpMinThreshold = Math.max(12, bodyHeightRef.current * 0.025);
        const pct = Math.max(0, Math.min(100, (displacement / (bodyHeightRef.current * 0.10)) * 100));
        setMovementPct(Math.round(pct));

        // Visual Feedback
        canvasCtx.beginPath();
        canvasCtx.arc(nose.x * W, nose.y * H, 8, 0, 2 * Math.PI);
        canvasCtx.fillStyle = jumpStatusRef.current === 'jumping' ? '#00f2fe' : '#4affc4';
        canvasCtx.fill();
        canvasCtx.strokeStyle = 'white';
        canvasCtx.stroke();

        if (baselineY.current !== null) {
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, baselineY.current - jumpMinThreshold);
            canvasCtx.lineTo(W, baselineY.current - jumpMinThreshold);
            canvasCtx.strokeStyle = jumpStatusRef.current === 'jumping' ? '#00f2fe' : 'rgba(255, 255, 255, 0.2)';
            canvasCtx.setLineDash([10, 5]);
            canvasCtx.stroke();
            canvasCtx.setLineDash([]);
        }

        // State Machine
        if (jumpStatusRef.current === 'standing') {
            if (displacement > jumpMinThreshold && velocityRef.current > 40) {
                jumpStatusRef.current = 'jumping';
                peakY.current = displacement;
                setDisplayStatus('JUMPING');
            } else if (Math.abs(velocityRef.current) < 15 && baselineY.current !== null) {
                baselineY.current = baselineY.current * 0.95 + smoothY * 0.05;
            }
        } else {
            if (displacement > peakY.current) peakY.current = displacement;

            if ((velocityRef.current < -30 || displacement < jumpMinThreshold * 0.5) && !cooldownRef.current) {
                // Success! Block if user is already pushing forward for real
                if (peakY.current > jumpMinThreshold && scaleVelocity < 100) {
                    jumpCountRef.current += 1;
                    setJumpCount(jumpCountRef.current);
                    if ('vibrate' in navigator) navigator.vibrate(50);

                    // Auto-start timer on first jump if duration is set
                    const now = Date.now();
                    if (timerRemainingRef.current !== null && !isTimerStartedRef.current) {
                        isTimerStartedRef.current = true;
                        setIsTimerActive(true);
                        isTimerActiveRef.current = true;
                    }
                    lastActivityTimeRef.current = now;
                }

                // CRITICAL FIX: Reset status ONLY after valid landing detection
                jumpStatusRef.current = 'standing';
                setDisplayStatus('READY');
                peakY.current = 0;
                cooldownRef.current = true;
                setTimeout(() => { cooldownRef.current = false; }, 120);
            }
        }
    }, []); // STABLE CALLBACK - NO RE-INITIALIZATION

    useEffect(() => {
        let active = true;
        let pose: any = null;

        const setupPose = async () => {
            try {
                const mpPose = await import('@mediapipe/pose');
                const PoseConstructor = mpPose.Pose || (mpPose as any).default?.Pose || (window as any).Pose;
                if (!PoseConstructor) throw new Error("Pose constructor not found.");

                pose = new PoseConstructor({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`,
                });

                pose.setOptions({
                    modelComplexity: 0, // Faster detection for speed skipping
                    smoothLandmarks: false, // ZERO LAG
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                pose.onResults(onResults);

                const loop = async () => {
                    const video = webcamRef.current?.video;
                    if (video && video.readyState === 4 && pose) {
                        try { await pose.send({ image: video }); } catch { /* ignore */ }
                    }
                    if (active) requestAnimationFrame(loop);
                };
                loop();
            } catch (err: any) {
                console.error("Pose Setup Error:", err);
                setError(`AI Engine failed: ${err.message || 'Unknown error'}`);
                setIsLoading(false);
                setAiStatus('error');
            }
        };

        setupPose();
        return () => {
            active = false;
            if (pose?.close) pose.close();
        };
    }, [onResults]); // Added onResults to dependency array

    useEffect(() => {
        // Universal timer interval - handles both Countdown and Free Mode
        const interval = setInterval(() => {
            const now = Date.now();

            // Only update stats if session is active (either timer is active or we are in free mode with jumps)
            const isSessionRunning = isTimerActiveRef.current || (timerRemainingRef.current === null && jumpCountRef.current > 0);

            if (isSessionRunning) {
                const isWorking = lastActivityTimeRef.current > 0 && (now - lastActivityTimeRef.current) < 4000;

                if (isWorking) {
                    workTimeRef.current += 1;
                    setWorkTime(workTimeRef.current);
                    setIntensityStatus('WORKING');
                } else {
                    restTimeRef.current += 1;
                    setRestTime(restTimeRef.current);
                    setIntensityStatus('RESTING');
                }

                // Handle Countdown
                if (timerRemainingRef.current !== null) {
                    const nextValue = Math.max(0, timerRemainingRef.current - 1);
                    timerRemainingRef.current = nextValue;
                    setTimerRemaining(nextValue);

                    if (nextValue === 0) {
                        setIsTimerActive(false);
                        isTimerActiveRef.current = false;
                        const activeMinutes = (workTimeRef.current || 1) / 60;
                        setJpm(Math.round(jumpCountRef.current / activeMinutes) || 0);
                        setShowSummary(true);
                    }
                } else {
                    // Free Mode JPM update every 2 seconds
                    if (workTimeRef.current % 2 === 0) {
                        const activeMinutes = (workTimeRef.current || 1) / 60;
                        setJpm(Math.round(jumpCountRef.current / activeMinutes) || 0);
                    }
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []); // One stable interval for the component lifetime

    const handleSetDuration = (mins: number) => {
        const secs = mins * 60;
        setWorkoutDuration(secs);
        setTimerRemaining(secs);
        timerRemainingRef.current = secs;
        resetCounter();
    };

    const resetCounter = () => {
        jumpCountRef.current = 0;
        setJumpCount(0);
        baselineY.current = null;
        emaSmoothY.current = null;
        jumpStatusRef.current = 'standing';
        setDisplayStatus('READY');
        setMovementPct(0);
        velocityRef.current = 0;
        lastDisplacementRef.current = 0;
        isStableRef.current = false;
        stabilityStartRef.current = null;
        setSetupStatus('MOVING');
        isTimerStartedRef.current = false;
        setIsTimerActive(false);
        isTimerActiveRef.current = false;
        setShowSummary(false);
        setWorkTime(0);
        setRestTime(0);
        workTimeRef.current = 0;
        restTimeRef.current = 0;
        lastActivityTimeRef.current = 0;
        setIntensityStatus('RESTING');
        setCustomSecs('');
        timerRemainingRef.current = null;
    };

    // Robust Wheel-to-Adjust Logic (Non-passive)
    useEffect(() => {
        const handleMinsWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1 : -1;
            setCustomMins(prev => {
                const current = parseInt(prev || '0');
                const newValue = Math.max(0, Math.min(99, current + delta));
                return newValue.toString().padStart(2, '0');
            });
        };

        const handleSecsWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1 : -1;
            setCustomSecs(prev => {
                const current = parseInt(prev || '0');
                const newValue = (current + delta + 60) % 60;
                return newValue.toString().padStart(2, '0');
            });
        };

        const minsEl = minsInputRef.current;
        const secsEl = secsInputRef.current;

        if (minsEl) minsEl.addEventListener('wheel', handleMinsWheel, { passive: false });
        if (secsEl) secsEl.addEventListener('wheel', handleSecsWheel, { passive: false });

        return () => {
            if (minsEl) minsEl.removeEventListener('wheel', handleMinsWheel);
            if (secsEl) secsEl.removeEventListener('wheel', handleSecsWheel);
        };
    }, []);

    return (
        <div className="jump-counter-container animate-in fade-in duration-700">
            <div className="header-minimal">
                <h1 className="title-gradient">{t('jumpCounter.title')}</h1>
                <p>{t('jumpCounter.subtitle')}</p>
            </div>

            <div className="video-wrapper">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-rose-400">
                        <span className="text-4xl mb-4">⚠️</span>
                        <p className="font-bold">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-white/10 rounded-xl text-white text-sm"
                        >
                            Refresh Page
                        </button>
                    </div>
                ) : (
                    <>
                        <Webcam
                            ref={webcamRef}
                            className="video-feed"
                            mirrored={true}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            onUserMedia={handleVideoLoad}
                            onUserMediaError={handleCameraError}
                            videoConstraints={{
                                facingMode: "user",
                                width: { min: 480, ideal: 640 },
                                height: { min: 360, ideal: 480 },
                                frameRate: { min: 24, ideal: 30 }
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="overlay-canvas"
                            width={640}
                            height={480}
                        />
                        {!isLoading && (
                            <div className="absolute top-4 right-4 z-20">
                                <div className={`status-pill ${displayStatus === 'JUMPING' ? 'working-pill animate-pulse' : 'resting-pill'}`}>
                                    {displayStatus}
                                </div>
                            </div>
                        )}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-white/60 font-bold uppercase tracking-widest text-xs">Initializing AI...</p>
                                </div>
                            </div>
                        )}
                        {!isLoading && setupStatus !== 'READY' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                <div className="text-center translate-y-8">
                                    <p className="text-cyan-400 font-black text-2xl uppercase italic animate-pulse">
                                        {setupStatus === 'MOVING' ? 'Set up Phone...' : 'Step Back...'}
                                    </p>
                                    <p className="text-white/50 text-xs mt-2 uppercase tracking-widest font-bold">
                                        Wait for camera to stabilize
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Digital Timer Control */}
            {!isTimerActive && !isTimerStartedRef.current && !showSummary && (
                <div className="flex flex-col items-center w-full gap-4">
                    <div className="timer-digital-container animate-in slide-in-from-bottom-4 duration-500">
                        <div className="clock-group">
                            <div className="clock-input-wrapper">
                                <input
                                    ref={minsInputRef}
                                    type="number"
                                    placeholder="00"
                                    className="clock-field"
                                    value={customMins}
                                    onChange={(e) => setCustomMins(e.target.value.slice(0, 2))}
                                />
                                <span className="clock-label">{t('jumpCounter.min')}</span>
                            </div>
                            <span className="clock-sep">:</span>
                            <div className="clock-input-wrapper">
                                <input
                                    ref={secsInputRef}
                                    type="number"
                                    placeholder="00"
                                    className="clock-field"
                                    value={customSecs}
                                    onChange={(e) => setCustomSecs(e.target.value.slice(0, 2))}
                                />
                                <span className="clock-label">{t('jumpCounter.sec')}</span>
                            </div>
                            <button
                                onClick={() => {
                                    const m = parseInt(customMins || '0');
                                    const s = parseInt(customSecs || '0');
                                    const total = (m * 60) + s;
                                    if (total > 0) {
                                        setWorkoutDuration(total);
                                        setTimerRemaining(total);
                                        timerRemainingRef.current = total;
                                        resetCounter();
                                    }
                                }}
                                className="btn-set-compact"
                            >
                                {t('jumpCounter.set')}
                            </button>
                        </div>

                        <div className="w-full h-px bg-white/5 mx-auto my-1"></div>

                        <button
                            onClick={() => {
                                setWorkoutDuration(0);
                                setTimerRemaining(null);
                                timerRemainingRef.current = null;
                                resetCounter();
                                setCustomMins('');
                                setCustomSecs('');
                            }}
                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${workoutDuration === 0
                                ? 'bg-white/10 border-white/20 text-white shadow-inner'
                                : 'bg-transparent border-white/5 text-white/30 hover:bg-white/5'
                                }`}
                        >
                            {t('jumpCounter.freeMode')}
                        </button>
                    </div>

                    {timerRemaining !== null && !isTimerStartedRef.current && (
                        <div className="timer-ready-badge animate-pulse">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f2ff]"></span>
                            {t('jumpCounter.readyBadge')}
                        </div>
                    )}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{jumpCount}</span>
                    <span className="stat-label">{t('jumpCounter.totalJumps')}</span>
                </div>
                {timerRemaining !== null && (
                    <div className={`stat-card relative ${timerRemaining < 60 && isTimerActive ? 'border-rose-500/50' : ''}`}>
                        <div className={`absolute top-2 right-2 ${intensityStatus === 'WORKING' ? 'working-pill animate-pulse' : 'resting-pill'} !text-[7px]`}>
                            {intensityStatus}
                        </div>
                        <span className={`stat-value ${timerRemaining < 60 && isTimerActive ? 'text-rose-400' : 'text-cyan-400'}`}>
                            {Math.floor(timerRemaining / 60)}:{String(timerRemaining % 60).padStart(2, '0')}
                        </span>
                        <span className="stat-label">{t('jumpCounter.time')}</span>
                    </div>
                )}
                <div className="stat-card relative overflow-hidden">
                    <div
                        className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${movementPct > 70 ? 'bg-cyan-400' : 'bg-white/10'}`}
                        style={{ width: `${movementPct}%` }}
                    />
                    <span className="stat-value text-base">{jpm}</span>
                    <span className="stat-label">{t('jumpCounter.jpmIntensity')}</span>
                </div>
            </div>

            {/* Completion Summary Modal */}
            {showSummary && (
                <div className="summary-overlay">
                    <div className="summary-card">
                        <div className="summary-header">
                            <span className="summary-icon">🏆</span>
                            <h3>{t('jumpCounter.summaryTitle')}</h3>
                        </div>
                        <div className="summary-stats">
                            <div className="summary-stat-item">
                                <span className="label">{t('jumpCounter.totalJumps')}</span>
                                <span className="value text-cyan-400">{jumpCount}</span>
                            </div>
                            <div className="summary-stat-item">
                                <span className="label">{t('jumpCounter.jpmIntensity')}</span>
                                <span className="value text-amber-400">{jpm}</span>
                            </div>
                            <div className="summary-stat-item">
                                <span className="label">{t('jumpCounter.time')}</span>
                                <span className="value text-white text-sm">
                                    <span className="text-rose-400">{Math.floor(workTime / 60)}m</span> / <span className="text-blue-400">{Math.floor(restTime / 60)}m</span>
                                </span>
                            </div>
                        </div>
                        <p className="summary-quote">
                            {jumpCount > 100 ? t('jumpCounter.summaryQuoteHigh') : t('jumpCounter.summaryQuoteLow')}
                        </p>
                        <button onClick={resetCounter} className="summary-btn">
                            {t('jumpCounter.startNew')}
                        </button>
                    </div>
                </div>
            )}



            <div className="instructions-glassy animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
                <div className="instruction-item">
                    <span className="instruction-num">1</span>
                    <p className="instruction-text">{t('jumpCounter.instruction1')}</p>
                </div>
                <div className="instruction-item">
                    <span className="instruction-num">2</span>
                    <p className="instruction-text">{t('jumpCounter.instruction2')}</p>
                </div>
                <div className="instruction-item">
                    <span className="instruction-num">3</span>
                    <p className="instruction-text">{t('jumpCounter.instruction3')}</p>
                </div>
            </div>

            <div className="w-full flex justify-center">
                <button
                    className="btn-minimal btn-secondary-minimal px-8 !text-[8px] uppercase tracking-[0.3em] !opacity-30 hover:!opacity-100"
                    onClick={resetCounter}
                >
                    {t('jumpCounter.resetCount')}
                </button>
            </div>
        </div>
    );
};

export default JumpRopeCounter;

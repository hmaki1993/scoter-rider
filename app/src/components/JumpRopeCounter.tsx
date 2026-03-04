import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import '../styles/JumpRope.css';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

const JumpRopeCounter: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Core State ---
    const [jumpCount, setJumpCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiStatus, setAiStatus] = useState<'initializing' | 'live' | 'error'>('initializing');
    const [displayStatus, setDisplayStatus] = useState<'READY' | 'JUMPING'>('READY');
    const [movementPct, setMovementPct] = useState(0);

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

        // Detection: Too close (shoulders take up >40% of screen) or moving forward fast
        const isTooClose = shoulderW > (W * 0.40);
        const isApproaching = scaleVelocity > 150; // Rapidly getting larger in frame
        const isCurrentlyMoving = frameVelocityY > 300 || frameVelocityX > 150 || isApproaching;

        lastNoseY.current = noseY;
        lastNoseX.current = noseX;
        lastShoulderWidth.current = shoulderW;

        // --- STABLE PERSISTENCE LOGIC ---
        if (isStableRef.current) {
            // Stability Lock Protection
            const essentialTrackingLost = !hasAura || (!lAnkle && !rAnkle);
            const massiveLateralMovement = frameVelocityX > 400;

            if (essentialTrackingLost || massiveLateralMovement || isTooClose || isApproaching) {
                if (trackingLossStartRef.current === null) {
                    trackingLossStartRef.current = now;
                } else if (now - trackingLossStartRef.current > 1000) {
                    isStableRef.current = false;
                    stabilityStartRef.current = null;
                    setSetupStatus(isTooClose || !isFullBody ? 'STEP_BACK' : 'MOVING');
                    return;
                }
            } else {
                trackingLossStartRef.current = null;
                setSetupStatus('READY');
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
                if (peakY.current > jumpMinThreshold) {
                    jumpCountRef.current += 1;
                    setJumpCount(jumpCountRef.current);
                    if ('vibrate' in navigator) navigator.vibrate(50);
                }
                jumpStatusRef.current = 'standing';
                setDisplayStatus('READY');
                peakY.current = 0;
                cooldownRef.current = true;
                setTimeout(() => { cooldownRef.current = false; }, 120);
            }
        }
    }, []);

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
    }, [onResults]);

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
    };

    return (
        <div className="jump-counter-container">
            <div className="header-text">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    AI Jump Counter
                </h2>
                <p className="text-gray-400 text-sm">Stand 2-3 meters away · Head to toes visible</p>
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
                            className="webcam-feed"
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
                            className="pose-canvas"
                            width={640}
                            height={480}
                        />
                        {!isLoading && (
                            <div className={`jump-indicator status-${displayStatus === 'JUMPING' ? 'jumping' : 'standing'}`}>
                                {displayStatus}
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

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{jumpCount}</span>
                    <span className="stat-label">Total Jumps</span>
                </div>
                <div className="stat-card relative overflow-hidden">
                    <div
                        className={`absolute bottom-0 left-0 h-1.5 transition-all duration-75 rounded-full ${movementPct > 70 ? 'bg-cyan-400' : 'bg-primary'}`}
                        style={{ width: `${movementPct}%` }}
                    />
                    <span className="stat-value text-sm">{aiStatus === 'error' ? 'Err' : displayStatus}</span>
                    <span className="stat-label">Status</span>
                </div>
            </div>

            <div className="w-full bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Sensitivity Meter</p>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-75 ${movementPct > 70 ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'bg-primary'}`}
                        style={{ width: `${movementPct}%` }}
                    />
                </div>
                <p className="text-[9px] text-white/20 mt-1">Movement is detected when the bar fills</p>
            </div>

            <div className="controls-bar">
                <button className="reset-btn" onClick={resetCounter}>
                    Reset Count
                </button>
            </div>
        </div>
    );
};

export default JumpRopeCounter;

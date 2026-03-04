import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '../styles/JumpRope.css';

const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';

const JumpRopeCounter: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [jumpCount, setJumpCount] = useState(0);
    const [jumpStatus, setJumpStatus] = useState<'standing' | 'jumping'>('standing');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sensitivity, setSensitivity] = useState(25); // Lower = easier to count
    const [currentDiff, setCurrentDiff] = useState(0);

    // AI Variables
    const jumpBaseline = useRef<number | null>(null);
    const lastY = useRef<number>(0);

    const handleVideoLoad = () => {
        setIsLoading(false);
        setError(null);
    };

    const handleCameraError = (err: any) => {
        console.error("Webcam Error:", err);
        setError("Camera failed to start. Please check permissions.");
        setIsLoading(false);
    };

    useEffect(() => {
        let active = true;
        let pose: any = null;

        const setupPose = async () => {
            try {
                // Handle Vite/MediaPipe import quirks
                const mpPose = await import('@mediapipe/pose');
                const PoseConstructor = mpPose.Pose || (mpPose as any).default?.Pose || (window as any).Pose;

                if (!PoseConstructor) {
                    throw new Error("Pose constructor not found. Library might not be loaded correctly.");
                }

                pose = new PoseConstructor({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_POSE_VERSION}/${file}`,
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                pose.onResults(onResults);

                const startDetection = async () => {
                    if (webcamRef.current && webcamRef.current.video && pose) {
                        const video = webcamRef.current.video;
                        if (video.readyState === 4) {
                            try {
                                await pose.send({ image: video });
                            } catch (e) {
                                console.error("AI Send Error:", e);
                            }
                        }
                    }
                    if (active) requestAnimationFrame(startDetection);
                };

                startDetection();
            } catch (err: any) {
                console.error("Pose Setup Error:", err);
                setError(`AI Engine failed: ${err.message || "Unknown error"}`);
                setIsLoading(false);
            }
        };

        setupPose();

        return () => {
            active = false;
            if (pose && typeof pose.close === 'function') pose.close();
        };
    }, []);

    const onResults = (results: any) => {
        if (!canvasRef.current || !results.poseLandmarks) return;

        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        canvasCtx.clearRect(0, 0, width, height);

        // Draw Landmarks (Visual only)
        for (const landmark of results.poseLandmarks) {
            canvasCtx.beginPath();
            canvasCtx.arc(
                landmark.x * width,
                landmark.y * height,
                3, 0, 2 * Math.PI
            );
            canvasCtx.fillStyle = '#00f2fe';
            canvasCtx.fill();
        }

        // --- Jump Detection Logic ---
        const leftHip = results.poseLandmarks[23];
        const rightHip = results.poseLandmarks[24];
        const nose = results.poseLandmarks[0];
        const leftAnkle = results.poseLandmarks[27];
        const rightAnkle = results.poseLandmarks[28];

        if (leftHip && rightHip && nose && (leftAnkle || rightAnkle)) {
            const midHipY = (leftHip.y + rightHip.y) / 2 * height;
            const ankleY = (leftAnkle && rightAnkle)
                ? (leftAnkle.y + rightAnkle.y) / 2 * height
                : (leftAnkle?.y || rightAnkle?.y) * height;

            // Calculate apparent body height in pixels
            const bodyHeightPx = Math.abs(ankleY - (nose.y * height));

            // Dynamic threshold: 8% of body height is a good jump indicator
            // We use sensitivity as a "fine-tuning" offset
            const dynamicThreshold = (bodyHeightPx * 0.08) * (30 / sensitivity);

            if (jumpBaseline.current === null) {
                jumpBaseline.current = midHipY;
            }

            const diff = jumpBaseline.current - midHipY;
            // Store normalized diff for the movement bar (0 to 1 range)
            setCurrentDiff(Math.max(0, diff / dynamicThreshold * sensitivity));

            // Detect Jump Start
            if (diff > dynamicThreshold && jumpStatus === 'standing') {
                setJumpStatus('jumping');
            }
            // Detect Jump End (Landing) with Hysteresis
            else if (diff < (dynamicThreshold * 0.3) && jumpStatus === 'jumping') {
                setJumpStatus('standing');
                setJumpCount((prev: number) => prev + 1);

                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
            }

            // Adaptive Baseline: Drift slowly when the user is relatively stationary
            if (Math.abs(diff) < dynamicThreshold * 0.5) {
                // Slower drift (0.02) for more stability
                jumpBaseline.current = (jumpBaseline.current * 0.98) + (midHipY * 0.02);
            }

            // Emergency Baseline Reset: If user is far from baseline for too long while "standing"
            // it means the baseline is likely invalid.
            if (jumpStatus === 'standing' && Math.abs(diff) > bodyHeightPx * 0.3) {
                jumpBaseline.current = midHipY;
            }

            lastY.current = midHipY;
        }
    };

    const resetCounter = () => {
        setJumpCount(0);
        jumpBaseline.current = null;
    };

    return (
        <div className="jump-counter-container">
            <div className="header-text">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    AI Jump Counter
                </h2>
                <p className="text-gray-400 text-sm">Stand 2-3 meters away for best accuracy</p>
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
                                width: { ideal: 640 },
                                height: { ideal: 480 }
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="pose-canvas"
                            width={640}
                            height={480}
                        />
                        {!isLoading && (
                            <div className={`jump-indicator status-${jumpStatus}`}>
                                {jumpStatus === 'jumping' ? 'JUMPING' : 'READY'}
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
                        className="absolute bottom-0 left-0 h-1 bg-primary/40 transition-all duration-100"
                        style={{ width: `${Math.min(100, (currentDiff / sensitivity) * 100)}%` }}
                    />
                    <span className="stat-value">{isLoading ? '--' : error ? 'Error' : 'Live'}</span>
                    <span className="stat-label">AI Status</span>
                </div>
            </div>

            <div className="sensitivity-controls w-full bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sensitivity</span>
                    <span className="text-xs font-black text-primary">{sensitivity}px</span>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setSensitivity(s => Math.max(10, s - 5))}
                        className="flex-1 py-2 bg-white/5 rounded-xl text-[10px] font-bold uppercase hover:bg-white/10 transition-colors"
                    >
                        Higher Sensitivity
                    </button>
                    <button
                        onClick={() => setSensitivity(s => Math.min(60, s + 5))}
                        className="flex-1 py-2 bg-white/5 rounded-xl text-[10px] font-bold uppercase hover:bg-white/10 transition-colors"
                    >
                        Lower Sensitivity
                    </button>
                </div>
                <p className="text-[9px] text-white/20 mt-2 text-center">Decrease px if jumps aren't counting. Increase px if counting false jumps.</p>
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

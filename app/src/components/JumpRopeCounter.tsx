import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Pose, PoseConfig, Results } from '@mediapipe/pose';
import * as tf from '@tensorflow/tfjs';
import '../styles/JumpRope.css';

const JumpRopeCounter: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [jumpCount, setJumpCount] = useState(0);
    const [jumpStatus, setJumpStatus] = useState<'standing' | 'jumping'>('standing');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AI Variables
    const jumpBaseline = useRef<number | null>(null);
    const jumpThreshold = 30; // Min pixels to trigger a jump
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
        let pose: Pose | null = null;

        const setupPose = async () => {
            try {
                pose = new Pose({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                } as any);

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
            } catch (err) {
                console.error("Pose Setup Error:", err);
                setError("AI Engine failed to load. Please refresh.");
            }
        };

        setupPose();

        return () => {
            active = false;
            if (pose) pose.close();
        };
    }, []);

    const onResults = (results: Results) => {
        if (!canvasRef.current || !results.poseLandmarks) return;

        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;

        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Draw Landmarks (Visual only)
        for (const landmark of results.poseLandmarks) {
            canvasCtx.beginPath();
            canvasCtx.arc(
                landmark.x * canvasRef.current.width,
                landmark.y * canvasRef.current.height,
                4, 0, 2 * Math.PI
            );
            canvasCtx.fillStyle = '#00f2fe';
            canvasCtx.fill();
        }

        // --- Jump Detection Logic ---
        const leftHip = results.poseLandmarks[23];
        const rightHip = results.poseLandmarks[24];

        if (leftHip && rightHip) {
            const midHipY = (leftHip.y + rightHip.y) / 2 * canvasRef.current.height;

            if (jumpBaseline.current === null) {
                jumpBaseline.current = midHipY;
            }

            const diff = jumpBaseline.current - midHipY;

            if (diff > jumpThreshold && jumpStatus === 'standing') {
                setJumpStatus('jumping');
            } else if (diff < (jumpThreshold / 2) && jumpStatus === 'jumping') {
                setJumpStatus('standing');
                setJumpCount(prev => prev + 1);

                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
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
                <div className="stat-card">
                    <span className="stat-value">{isLoading ? '--' : error ? 'Error' : 'Live'}</span>
                    <span className="stat-label">AI Status</span>
                </div>
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

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

    // AI Variables
    const jumpBaseline = useRef<number | null>(null);
    const jumpThreshold = 30; // Min pixels to trigger a jump
    const lastY = useRef<number>(0);

    useEffect(() => {
        const pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            },
        });

        const poseOptions: PoseConfig = {
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        };

        pose.setOptions(poseOptions);
        pose.onResults(onResults);

        let videoElement: HTMLVideoElement | null = null;

        const initCamera = async () => {
            if (webcamRef.current && webcamRef.current.video) {
                videoElement = webcamRef.current.video;
                setIsLoading(false);

                const renderLoop = async () => {
                    if (videoElement && videoElement.readyState === 4) {
                        await pose.send({ image: videoElement });
                    }
                    requestAnimationFrame(renderLoop);
                };
                renderLoop();
            }
        };

        initCamera();

        return () => {
            pose.close();
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
        // Landmark 24 (Right Hip) or 23 (Left Hip)
        const leftHip = results.poseLandmarks[23];
        const rightHip = results.poseLandmarks[24];
        const midHipY = (leftHip.y + rightHip.y) / 2 * canvasRef.current.height;

        if (jumpBaseline.current === null) {
            jumpBaseline.current = midHipY;
        }

        // Analyze movement
        const diff = jumpBaseline.current - midHipY; // Positive = Going up

        if (diff > jumpThreshold && jumpStatus === 'standing') {
            setJumpStatus('jumping');
        } else if (diff < (jumpThreshold / 2) && jumpStatus === 'jumping') {
            setJumpStatus('standing');
            setJumpCount(prev => prev + 1);

            // Haptic/Audio Feedback (Optional)
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }

        lastY.current = midHipY;
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
                <Webcam
                    ref={webcamRef}
                    className="webcam-feed"
                    mirrored={true}
                    screenshotFormat="image/jpeg"
                />
                <canvas
                    ref={canvasRef}
                    className="pose-canvas"
                    width={640}
                    height={480}
                />
                <div className={`jump-indicator status-${jumpStatus}`}>
                    {jumpStatus === 'jumping' ? 'JUMPING' : 'READY'}
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{jumpCount}</span>
                    <span className="stat-label">Total Jumps</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{isLoading ? '--' : 'Live'}</span>
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

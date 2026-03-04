import React, { Suspense } from 'react';
import JumpRopeCounter from '../components/JumpRopeCounter';

const AITraining: React.FC = () => {
    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#050505]">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                            AI <span className="text-primary">TRAINING</span>
                        </h1>
                        <p className="text-white/40 text-sm mt-2 uppercase tracking-[0.2em] font-bold">
                            Computer Vision Performance Tracking
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <Suspense fallback={
                        <div className="w-full h-[400px] bg-white/5 rounded-3xl animate-pulse flex items-center justify-center">
                            <span className="text-white/20 font-bold">Loading AI Engine...</span>
                        </div>
                    }>
                        <JumpRopeCounter />
                    </Suspense>
                </div>

                <div className="mt-12 p-6 rounded-3xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">How to use</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                            <p className="text-white/60 text-sm">Place your device on a stable surface at waist height.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                            <p className="text-white/60 text-sm">Stand 2-3 meters back so your whole body is visible.</p>
                        </div>
                        <div className="space-y-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                            <p className="text-white/60 text-sm">Start jumping! The AI will automatically detect and count each rep.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AITraining;

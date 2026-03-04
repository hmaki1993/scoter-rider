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


            </div>
        </div>
    );
};

export default AITraining;

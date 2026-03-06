import React, { Suspense } from 'react';
import JumpRopeCounter from '../components/JumpRopeCounter';
import PageHeader from '../components/PageHeader';

const AITraining: React.FC = () => {
    return (
        <div className="p-4 md:p-8 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <PageHeader
                        title="Performance Tracker"
                        subtitle="Advanced Performance Monitoring"
                    />
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <Suspense fallback={
                        <div className="w-full h-[400px] bg-white/5 rounded-3xl animate-pulse flex items-center justify-center">
                            <span className="text-white/20 font-bold uppercase tracking-widest text-xs">Initializing Tracker Engine...</span>
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

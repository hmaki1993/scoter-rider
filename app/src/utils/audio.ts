/**
 * Premium UI Sound System
 * Generates subtle, elegant interaction sounds using the Web Audio API. 
 */

class SoundEngine {
    private ctx: AudioContext | null = null;
    private lastPlayTime: number = 0;
    private readonly MIN_GATE_TIME = 50; // Throttle sound playback

    private init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Synthesizes a premium "Mechanical Click" 
     * Inspired by high-end camera shutters and mechanical switches.
     */
    public playHover() {
        const now = Date.now();
        if (now - this.lastPlayTime < this.MIN_GATE_TIME) return;
        this.lastPlayTime = now;

        try {
            this.init();
            if (!this.ctx) return;

            const t = this.ctx.currentTime;

            // --- Component 1: The Sharp Attack (Transient) ---
            const attackOsc = this.ctx.createOscillator();
            const attackGain = this.ctx.createGain();
            attackOsc.type = 'sine';
            attackOsc.frequency.setValueAtTime(2500, t);
            attackOsc.frequency.exponentialRampToValueAtTime(1200, t + 0.01);

            attackGain.gain.setValueAtTime(0, t);
            attackGain.gain.linearRampToValueAtTime(0.4, t + 0.002); // Further boosted
            attackGain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);

            attackOsc.connect(attackGain);
            attackGain.connect(this.ctx.destination);

            // --- Component 2: Mechanical Body (The "Thud") ---
            const bodyOsc = this.ctx.createOscillator();
            const bodyGain = this.ctx.createGain();
            bodyOsc.type = 'triangle';
            bodyOsc.frequency.setValueAtTime(180, t);
            bodyOsc.frequency.linearRampToValueAtTime(120, t + 0.04);

            bodyGain.gain.setValueAtTime(0, t + 0.005);
            bodyGain.gain.linearRampToValueAtTime(0.25, t + 0.01); // Further boosted
            bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            bodyOsc.connect(bodyGain);
            bodyGain.connect(this.ctx.destination);

            // --- Component 3: Metallic Resonance (The "Spring") ---
            const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < output.length; i++) output[i] = Math.random() * 2 - 1;

            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(4500, t);
            filter.Q.value = 5;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0, t + 0.002);
            noiseGain.gain.linearRampToValueAtTime(0.15, t + 0.008); // Further boosted
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            // Start all components
            attackOsc.start(t);
            attackOsc.stop(t + 0.04);

            bodyOsc.start(t + 0.005);
            bodyOsc.stop(t + 0.07);

            noise.start(t + 0.002);
            noise.stop(t + 0.07);

        } catch (e) {
            console.debug('Audio interaction prevented', e);
        }
    }
}

export const playHoverSound = () => {
    if (typeof window === 'undefined') return;

    // Singleton instance
    if (!(window as any).__healySoundEngine) {
        (window as any).__healySoundEngine = new SoundEngine();
    }
    (window as any).__healySoundEngine.playHover();
};

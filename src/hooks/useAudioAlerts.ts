import { useRef } from 'react';
import { registerPlugin } from '@capacitor/core';

// ── Global Audio Singleton ───────────────────────────────────────────
let globalAudioCtx: AudioContext | null = null;
let globalActiveAudio: HTMLAudioElement | null = null;
let globalToneInterval: any = null;
let globalToneIntervalLock = false;

export const playTone = (
  type: string, 
  customTones: { name: string; data: string }[] = [],
  audioCtxRef?: React.MutableRefObject<AudioContext | null>,
  activeAudioRef?: React.MutableRefObject<HTMLAudioElement | null>,
  isLoop: boolean = false
) => {
  try {
    if (globalToneInterval) {
      clearInterval(globalToneInterval);
      globalToneInterval = null;
    }
    if (globalAudioCtx) {
      globalAudioCtx.close().catch(() => {});
      globalAudioCtx = null;
    }
    if (audioCtxRef?.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (globalActiveAudio) {
      globalActiveAudio.pause();
      globalActiveAudio.src = "";
      globalActiveAudio = null;
    }
    if (activeAudioRef?.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.src = "";
      activeAudioRef.current = null;
    }

    const custom = customTones.find(t => t.name === type);
    if (custom) {
      const audio = new Audio(custom.data);
      audio.volume = 0.5;
      audio.loop = false;
      globalActiveAudio = audio;
      if (activeAudioRef) activeAudioRef.current = audio;
      
      let playCount = 0;
      audio.onended = () => {
         playCount++;
         if (isLoop && playCount < 3) {
            audio.play().catch(()=>{});
         } else {
            stopTone();
         }
      };
      
      audio.play().catch(e => console.warn('Custom audio playback failed', e));
      return;
    }

    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    globalAudioCtx = ctx;
    if (audioCtxRef) audioCtxRef.current = ctx;

    let sequenceCount = 0;
    const playSequence = () => {
      if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
        if (globalToneInterval) { clearInterval(globalToneInterval); globalToneInterval = null; }
        return;
      }
      
      if (sequenceCount >= 3) {
        stopTone();
        return;
      }

      const now = globalAudioCtx.currentTime;
      const playBeep = (freq: number, startTime: number, duration: number, vol = 0.1, wave: 'sine'|'square'|'sawtooth'|'triangle' = 'sine') => {
        const osc = globalAudioCtx!.createOscillator();
        const gain = globalAudioCtx!.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(globalAudioCtx!.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      switch(type) {
        case 'Radar':
          playBeep(880, now, 0.5, 0.15);
          playBeep(440, now + 0.5, 0.5, 0.1);
          break;
        case 'Cyber':
          playBeep(1200, now, 0.1, 0.1, 'square');
          playBeep(800, now + 0.15, 0.1, 0.1, 'square');
          playBeep(1600, now + 0.3, 0.2, 0.1, 'square');
          break;
        case 'Alarm':
          for(let i=0; i<3; i++) {
            playBeep(500, now + i*0.4, 0.2, 0.2, 'sawtooth');
            playBeep(800, now + i*0.4 + 0.2, 0.2, 0.2, 'sawtooth');
          }
          break;
        default: // 'Digital'
          playBeep(2000, now, 0.05);
          playBeep(2500, now + 0.1, 0.05);
      }
      
      sequenceCount++;
    };
    
    playSequence();
    
    if (isLoop) {
      globalToneInterval = setInterval(playSequence, 3000);
    } else {
      setTimeout(() => {
        if (globalAudioCtx === ctx) {
          ctx.close().catch(() => {});
          globalAudioCtx = null;
        }
      }, 2500);
    }
  } catch(err) { console.error('Audio failed', err); }
};

export const stopTone = () => {
  globalToneIntervalLock = false; 
  
  if (globalToneInterval) {
    clearInterval(globalToneInterval);
    globalToneInterval = null;
  }
  if (globalAudioCtx) {
    if (globalAudioCtx.state === 'running') {
       globalAudioCtx.suspend().catch(() => {});
    }
    globalAudioCtx.close().catch(() => {});
    globalAudioCtx = null;
  }
  if (globalActiveAudio) {
    globalActiveAudio.pause();
    globalActiveAudio.src = "";
    globalActiveAudio = null;
  }
  
  try {
    registerPlugin<any>('AlarmPlugin').stopAlarm().catch(() => {});
  } catch (e) { /* ignore */ }
};

export function useAudioAlerts() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const triggerAlarm = (tone: string, customTones: any[]) => {
    if (globalToneIntervalLock) return;
    globalToneIntervalLock = true;

    playTone(tone || 'Digital', customTones, audioCtxRef, activeAudioRef, true);

    registerPlugin<any>('AlarmPlugin').startVibration().catch(() => {
      if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 800, 500, 400, 200, 400, 200, 800, 500, 400, 200, 400, 200, 800]);
    });

    setTimeout(() => stopTone(), 10000);
  };

  const triggerWarning = () => {
    playTone('Digital');
    import('@capacitor/haptics').then(({ Haptics }) => Haptics.vibrate()).catch(() => {
      if (navigator.vibrate) navigator.vibrate(200);
    });
  };

  return { triggerAlarm, triggerWarning, playTone, stopTone, audioCtxRef, activeAudioRef };
}

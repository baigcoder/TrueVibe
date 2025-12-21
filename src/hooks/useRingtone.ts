import { useRef, useCallback } from 'react';

/**
 * Professional ringtone generator using Web Audio API.
 * Creates premium-quality incoming call and dial tones.
 */

type AudioState = {
    context: AudioContext;
    oscillators: OscillatorNode[];
    gainNode: GainNode;
    intervalId?: ReturnType<typeof setInterval>;
};

export function useRingtone() {
    const ringtoneState = useRef<AudioState | null>(null);
    const dialToneState = useRef<AudioState | null>(null);

    /**
     * Create an AudioContext safely
     */
    const createAudioContext = useCallback((): AudioContext => {
        const AudioContextClass = window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        return new AudioContextClass();
    }, []);

    /**
     * Play professional incoming call ringtone
     * Creates a modern, pleasant two-tone ringtone pattern
     */
    const playRingtone = useCallback(() => {
        try {
            // Stop any existing ringtone
            stopRingtone();

            const context = createAudioContext();
            const masterGain = context.createGain();
            masterGain.connect(context.destination);
            masterGain.gain.value = 0;

            // Modern ringtone frequencies (pleasant chord)
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - Major chord
            const oscillators: OscillatorNode[] = [];

            frequencies.forEach((freq) => {
                const osc = context.createOscillator();
                const oscGain = context.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;
                oscGain.gain.value = 0.15; // Balanced volume per oscillator

                osc.connect(oscGain);
                oscGain.connect(masterGain);
                osc.start();
                oscillators.push(osc);
            });

            // Create the ring pattern: ring-ring ... ring-ring
            let ringPhase = 0;
            const ringPattern = () => {
                const now = context.currentTime;

                switch (ringPhase % 4) {
                    case 0: // First ring ON
                        masterGain.gain.setTargetAtTime(0.4, now, 0.05);
                        break;
                    case 1: // Short pause
                        masterGain.gain.setTargetAtTime(0, now, 0.05);
                        break;
                    case 2: // Second ring ON
                        masterGain.gain.setTargetAtTime(0.4, now, 0.05);
                        break;
                    case 3: // Long pause
                        masterGain.gain.setTargetAtTime(0, now, 0.05);
                        break;
                }
                ringPhase++;
            };

            // Start pattern immediately
            ringPattern();
            const intervalId = setInterval(ringPattern, 300);

            ringtoneState.current = {
                context,
                oscillators,
                gainNode: masterGain,
                intervalId,
            };

            console.log('🔔 Ringtone started');
        } catch (error) {
            console.error('[Ringtone] Failed to play:', error);
        }
    }, [createAudioContext]);

    /**
     * Stop the incoming call ringtone
     */
    const stopRingtone = useCallback(() => {
        if (ringtoneState.current) {
            const { context, oscillators, gainNode, intervalId } = ringtoneState.current;

            if (intervalId) clearInterval(intervalId);

            // Fade out gracefully
            gainNode.gain.setTargetAtTime(0, context.currentTime, 0.1);

            setTimeout(() => {
                oscillators.forEach(osc => {
                    try { osc.stop(); } catch { }
                });
                context.close();
            }, 200);

            ringtoneState.current = null;
            console.log('🔕 Ringtone stopped');
        }
    }, []);

    /**
     * Play professional outgoing dial tone
     * Creates the classic North American ringback tone
     */
    const playDialTone = useCallback(() => {
        try {
            stopDialTone();

            const context = createAudioContext();
            const masterGain = context.createGain();
            masterGain.connect(context.destination);
            masterGain.gain.value = 0;

            // North American ringback frequencies (440 Hz + 480 Hz)
            const frequencies = [440, 480];
            const oscillators: OscillatorNode[] = [];

            frequencies.forEach((freq) => {
                const osc = context.createOscillator();
                const oscGain = context.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;
                oscGain.gain.value = 0.12;

                osc.connect(oscGain);
                oscGain.connect(masterGain);
                osc.start();
                oscillators.push(osc);
            });

            // Ringback pattern: 2 seconds ON, 4 seconds OFF
            let isOn = false;
            const toggleTone = () => {
                const now = context.currentTime;
                isOn = !isOn;
                masterGain.gain.setTargetAtTime(isOn ? 0.25 : 0, now, 0.02);
            };

            // Start with tone ON
            toggleTone();

            // 2s on, 4s off pattern timing
            let phase = 0;
            const intervalId = setInterval(() => {
                phase++;
                if (phase === 1) {
                    // After 2s, turn off
                    toggleTone();
                } else if (phase === 3) {
                    // After 4s more, turn on again
                    toggleTone();
                    phase = 0;
                }
            }, 1000);

            dialToneState.current = {
                context,
                oscillators,
                gainNode: masterGain,
                intervalId,
            };

            console.log('📞 Dial tone started');
        } catch (error) {
            console.error('[DialTone] Failed to play:', error);
        }
    }, [createAudioContext]);

    /**
     * Stop the outgoing dial tone
     */
    const stopDialTone = useCallback(() => {
        if (dialToneState.current) {
            const { context, oscillators, gainNode, intervalId } = dialToneState.current;

            if (intervalId) clearInterval(intervalId);

            gainNode.gain.setTargetAtTime(0, context.currentTime, 0.1);

            setTimeout(() => {
                oscillators.forEach(osc => {
                    try { osc.stop(); } catch { }
                });
                context.close();
            }, 200);

            dialToneState.current = null;
            console.log('📞 Dial tone stopped');
        }
    }, []);

    /**
     * Play call connected sound (brief confirmation beep)
     */
    const playConnectedSound = useCallback(() => {
        try {
            const context = createAudioContext();
            const osc = context.createOscillator();
            const gain = context.createGain();

            osc.connect(gain);
            gain.connect(context.destination);

            osc.type = 'sine';
            osc.frequency.value = 880; // A5 - pleasant confirmation tone
            gain.gain.value = 0.2;

            osc.start();
            gain.gain.setTargetAtTime(0, context.currentTime + 0.15, 0.05);

            setTimeout(() => {
                osc.stop();
                context.close();
            }, 300);

            console.log('✅ Connected sound played');
        } catch (error) {
            console.error('[Connected] Failed to play:', error);
        }
    }, [createAudioContext]);

    /**
     * Play call ended sound (descending two-tone)
     */
    const playEndedSound = useCallback(() => {
        try {
            const context = createAudioContext();
            const osc = context.createOscillator();
            const gain = context.createGain();

            osc.connect(gain);
            gain.connect(context.destination);

            osc.type = 'sine';
            osc.frequency.value = 600;
            gain.gain.value = 0.15;

            osc.start();

            // Descending tone
            osc.frequency.setTargetAtTime(400, context.currentTime + 0.1, 0.05);
            gain.gain.setTargetAtTime(0, context.currentTime + 0.25, 0.05);

            setTimeout(() => {
                osc.stop();
                context.close();
            }, 400);

            console.log('📵 Ended sound played');
        } catch (error) {
            console.error('[Ended] Failed to play:', error);
        }
    }, [createAudioContext]);

    /**
     * Stop all sounds
     */
    const stopAll = useCallback(() => {
        stopRingtone();
        stopDialTone();
    }, [stopRingtone, stopDialTone]);

    return {
        playRingtone,
        stopRingtone,
        playDialTone,
        stopDialTone,
        playConnectedSound,
        playEndedSound,
        stopAll,
    };
}

export default useRingtone;

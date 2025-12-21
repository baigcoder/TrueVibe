import { useCallback, useRef } from 'react';

// Create a notification sound using Web Audio API
export function useNotificationSound() {
    const audioContextRef = useRef<AudioContext | null>(null);

    const playNotificationSound = useCallback(() => {
        try {
            // Create or reuse AudioContext
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;

            // Resume context if suspended (required for autoplay policy)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;

            // --- GEN Z / CYBERPUNK VIBE SOUND DESIGN ---
            // A clean, high-tech "blip-ping" with a textural resonant tail.

            // 1. Transient Click (The Initial "Pop")
            const click = ctx.createOscillator();
            const clickGain = ctx.createGain();
            click.type = 'square';
            click.frequency.setValueAtTime(2400, now);
            clickGain.gain.setValueAtTime(0.08, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
            click.connect(clickGain);
            clickGain.connect(ctx.destination);
            click.start(now);
            click.stop(now + 0.01);

            // 2. Primary High-Tech Tone (High frequency ping)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(1760, now); // A6
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1); // Drop to A5
            gain1.gain.setValueAtTime(0.12, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.25);

            // 3. Resonant "Vibe" Shadow (Framer/Vercel-style clean blip)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(440, now + 0.02); // Lower A4
            osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.08); // Rise up

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.Q.setValueAtTime(10, now);
            filter.frequency.exponentialRampToValueAtTime(4000, now + 0.1);

            gain2.gain.setValueAtTime(0.0, now);
            gain2.gain.linearRampToValueAtTime(0.08, now + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc2.connect(filter);
            filter.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.02);
            osc2.stop(now + 0.15);

            // 4. Subtle Digital Grain (Ultra-short bursts)
            [0.12, 0.18].forEach(startTime => {
                const grain = ctx.createOscillator();
                const grainGain = ctx.createGain();
                grain.type = 'sine';
                grain.frequency.setValueAtTime(3520, now + startTime);
                grainGain.gain.setValueAtTime(0.03, now + startTime);
                grainGain.gain.exponentialRampToValueAtTime(0.001, now + startTime + 0.02);
                grain.connect(grainGain);
                grainGain.connect(ctx.destination);
                grain.start(now + startTime);
                grain.stop(now + startTime + 0.02);
            });

        } catch (error) {
            console.warn('Failed to play notification sound:', error);
        }
    }, []);

    return { playNotificationSound };
}

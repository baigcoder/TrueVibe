// Notification sound utility
// Uses Web Audio API as fallback when audio file isn't available

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (!audioContext && typeof window !== 'undefined') {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            return null;
        }
    }
    return audioContext;
}

// Play a simple notification beep using Web Audio API
export function playNotificationBeep(): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
        // Resume context if suspended (required for mobile)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Pleasant notification sound - two quick tones
        oscillator.frequency.value = 880; // A5 note
        oscillator.type = 'sine';

        // Fade in and out for a softer sound
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);

        // Second beep (slightly higher)
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();

            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.frequency.value = 1047; // C6 note
            osc2.type = 'sine';

            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.2);
        }, 120);
    } catch (err) {
        console.warn('Failed to play notification sound:', err);
    }
}

// Try to play an audio file, fallback to beep
export async function playNotificationSound(): Promise<void> {
    // First try to play the audio file
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        await audio.play();
        return;
    } catch {
        // Fallback to Web Audio API beep
        playNotificationBeep();
    }
}

// Hook for managing audio alert preferences and playback

import { useState, useEffect, useRef } from 'react';

const AUDIO_ALERT_KEY = 'jeffboard-audio-alerts-enabled';

/**
 * Hook to manage audio alert preferences
 * Stores preference in localStorage and provides playback function
 *
 * @returns Object with enabled state, toggle function, and play function
 */
export function useAudioAlert() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(AUDIO_ALERT_KEY);
    return stored !== null ? stored === 'true' : true; // Default: enabled
  });

  // Reuse a single AudioContext across plays to avoid creating many instances
  const audioContextRef = useRef<AudioContext | null>(null);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  // Persist preference changes to localStorage
  useEffect(() => {
    localStorage.setItem(AUDIO_ALERT_KEY, enabled.toString());
  }, [enabled]);

  const toggle = () => {
    setEnabled((prev) => !prev);
  };

  const play = () => {
    if (!enabled) return;

    try {
      // Lazily create AudioContext on first play (requires user gesture)
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Resume if suspended (browsers suspend until user interaction)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';

      // Fade in/out for a subtle ping
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (error) {
      console.error('Failed to play audio alert:', error);
    }
  };

  return { enabled, toggle, play };
}

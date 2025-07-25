import { useEffect, useRef } from 'react';

interface RingtonePlayerProps {
  isPlaying: boolean;
}

export function RingtonePlayer({ isPlaying }: RingtonePlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (isPlaying) {
      startRingtone();
    } else {
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [isPlaying]);

  const startRingtone = () => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for tone
      oscillatorRef.current = audioContextRef.current.createOscillator();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      // Connect nodes
      oscillatorRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Set frequency (ring tone frequency)
      oscillatorRef.current.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      
      // Set volume
      gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      
      // Create ring pattern: beep for 1s, silence for 0.5s
      const createRingPattern = () => {
        if (!audioContextRef.current || !gainNodeRef.current) return;
        
        const currentTime = audioContextRef.current.currentTime;
        
        // Ring on
        gainNodeRef.current.gain.setValueAtTime(0.1, currentTime);
        gainNodeRef.current.gain.setValueAtTime(0.1, currentTime + 1);
        
        // Ring off
        gainNodeRef.current.gain.setValueAtTime(0, currentTime + 1);
        gainNodeRef.current.gain.setValueAtTime(0, currentTime + 1.5);
        
        // Schedule next ring
        setTimeout(createRingPattern, 1500);
      };
      
      // Start oscillator
      oscillatorRef.current.start();
      
      // Start ring pattern
      createRingPattern();
      
    } catch (error) {
      console.log('Could not create ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (error) {
        console.log('Error stopping oscillator:', error);
      }
      oscillatorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (error) {
        console.log('Error closing audio context:', error);
      }
      audioContextRef.current = null;
    }

    gainNodeRef.current = null;
  };

  return null; // This component doesn't render anything
}
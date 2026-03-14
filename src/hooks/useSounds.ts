/**
 * LingoFriends - useSounds Hook
 * 
 * React convenience hook for playing sound effects.
 * Handles preloading and provides memoized callbacks.
 * 
 * @module hooks/useSounds
 * @see docs/phase-2-world-expansion/task-2.0-2-sound-system.md
 */

import { useCallback, useEffect, useState } from 'react';
import { SoundManager, SoundId } from '../services/soundManager';

/**
 * Hook return type
 */
interface UseSoundsReturn {
  /** Play reward chime (correct answer) */
  playReward: () => Promise<void>;
  /** Play celebration fanfare (lesson complete) */
  playCelebrate: () => Promise<void>;
  /** Play penalty bonk (wrong answer) */
  playPenalty: () => Promise<void>;
  /** Play skip whoosh */
  playSkip: () => Promise<void>;
  /** Play UI tap/click */
  playTap: () => Promise<void>;
  /** Play level up chime */
  playLevelup: () => Promise<void>;
  /** Play NPC greeting chirp */
  playNpcGreet: () => Promise<void>;
  /** Start playing footstep loop */
  startFootsteps: () => Promise<void>;
  /** Stop playing footstep loop */
  stopFootsteps: () => void;
  /** Toggle mute state */
  toggleMute: () => boolean;
  /** Whether sound is currently muted */
  isMuted: boolean;
  /** Whether sound manager is ready */
  isReady: boolean;
  /** Unlock audio context (call from user gesture handler) */
  unlock: () => Promise<void>;
}

/**
 * React hook for sound effects.
 * 
 * Provides convenient callbacks for all game sounds.
 * Handles preloading on first use.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { playReward, playPenalty, isMuted, toggleMute } = useSounds();
 *   
 *   const handleCorrect = () => {
 *     playReward();
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleCorrect}>Correct!</button>
 *       <button onClick={toggleMute}>
 *         {isMuted ? '🔇' : '🔊'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSounds(): UseSoundsReturn {
  const [isMuted, setIsMuted] = useState(() => SoundManager.isMuted());
  const [isReady, setIsReady] = useState(() => SoundManager.isReady());
  
  // Preload sounds on mount
  useEffect(() => {
    SoundManager.preload();
    
    // Check if already ready (context was unlocked previously)
    if (SoundManager.isReady()) {
      setIsReady(true);
    }
    
    // On unmount: stop any looping sounds (footsteps most importantly).
    // Without this, navigating away mid-walk leaves footsteps looping forever.
    return () => {
      SoundManager.stop('footstep');
    };
  }, []);
  
  // Play callbacks - memoized for stable references
  const playReward = useCallback(async () => {
    await SoundManager.play('reward');
  }, []);
  
  const playCelebrate = useCallback(async () => {
    await SoundManager.play('celebrate');
  }, []);
  
  const playPenalty = useCallback(async () => {
    await SoundManager.play('penalty');
  }, []);
  
  const playSkip = useCallback(async () => {
    await SoundManager.play('skip');
  }, []);
  
  const playTap = useCallback(async () => {
    await SoundManager.play('tap');
  }, []);
  
  const playLevelup = useCallback(async () => {
    await SoundManager.play('levelup');
  }, []);
  
  const playNpcGreet = useCallback(async () => {
    await SoundManager.play('npcGreet');
  }, []);
  
  const startFootsteps = useCallback(async () => {
    await SoundManager.play('footstep');
  }, []);
  
  const stopFootsteps = useCallback(() => {
    SoundManager.stop('footstep');
  }, []);
  
  // Mute toggle
  const toggleMute = useCallback(() => {
    const newMuted = SoundManager.toggleMute();
    setIsMuted(newMuted);
    return newMuted;
  }, []);
  
  // Unlock audio context (for iOS Safari)
  const unlock = useCallback(async () => {
    await SoundManager.unlock();
    setIsReady(true);
  }, []);
  
  return {
    playReward,
    playCelebrate,
    playPenalty,
    playSkip,
    playTap,
    playLevelup,
    playNpcGreet,
    startFootsteps,
    stopFootsteps,
    toggleMute,
    isMuted,
    isReady,
    unlock,
  };
}

export default useSounds;
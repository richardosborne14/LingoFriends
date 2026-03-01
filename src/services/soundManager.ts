/**
 * LingoFriends - Sound Manager
 * 
 * Centralised audio management using Web Audio API.
 * Handles preloading, playback, and global volume/mute control.
 * 
 * Features:
 * - Preloads all audio assets at app init
 * - Simple `play(soundId)` API for one-shot sounds
 * - Loop support for continuous sounds (footsteps)
 * - Global mute toggle with localStorage persistence
 * - Volume control
 * - iOS Safari compatible (requires user gesture to unlock)
 * 
 * @module services/soundManager
 * @see docs/phase-2-world-expansion/task-2.0-2-sound-system.md
 */

// ============================================================================
// TYPES
// ============================================================================

/** All available sound IDs */
export type SoundId = 
  | 'reward'     // Ba-ding chime for correct answers
  | 'celebrate'  // Fanfare for lesson completion
  | 'penalty'    // Soft bonk for wrong answers
  | 'footstep'   // Single grass footstep (looped)
  | 'skip'       // Whoosh for skip action
  | 'tap'        // Soft UI click
  | 'levelup'    // Ascending chime for level up
  | 'npcGreet';  // Friendly chirp for NPC greetings

/** Configuration for each sound */
interface SoundConfig {
  /** Path to audio file in public/sounds/ */
  src: string;
  /** Volume multiplier (0-1) */
  volume: number;
  /** Whether this sound should loop (e.g., footsteps) */
  loop: boolean;
}

/** Internal sound state */
interface SoundState {
  /** Decoded audio buffer */
  buffer: AudioBuffer | null;
  /** Load promise for lazy loading */
  loadPromise: Promise<void> | null;
  /** Whether sound is currently playing */
  isPlaying: boolean;
}

// ============================================================================
// SOUND MANIFEST
// ============================================================================

/** All sounds with their configurations */
const SOUND_MANIFEST: Record<SoundId, SoundConfig> = {
  reward: {
    src: '/sounds/reward.mp3',
    volume: 0.8,
    loop: false,
  },
  celebrate: {
    src: '/sounds/celebrate.mp3',
    volume: 0.7,
    loop: false,
  },
  penalty: {
    src: '/sounds/penalty.mp3',
    volume: 0.5,
    loop: false,
  },
  footstep: {
    src: '/sounds/footstep.mp3',
    volume: 0.3,
    loop: true,
  },
  skip: {
    src: '/sounds/skip.mp3',
    volume: 0.5,
    loop: false,
  },
  tap: {
    src: '/sounds/tap.mp3',
    volume: 0.4,
    loop: false,
  },
  levelup: {
    src: '/sounds/levelup.mp3',
    volume: 0.8,
    loop: false,
  },
  npcGreet: {
    src: '/sounds/npc-greet.mp3',
    volume: 0.6,
    loop: false,
  },
};

// ============================================================================
// SOUND MANAGER CLASS
// ============================================================================

/**
 * Sound Manager Singleton
 * 
 * Manages all audio playback in the app using Web Audio API.
 * This provides lower latency and better control than HTML5 Audio elements.
 */
class SoundManagerClass {
  /** Web Audio API context */
  private audioContext: AudioContext | null = null;
  
  /** Decoded audio buffers indexed by sound ID */
  private sounds: Map<SoundId, SoundState> = new Map();
  
  /** Active source nodes for stopping loops */
  private activeSources: Map<SoundId, AudioBufferSourceNode[]> = new Map();
  
  /** Master gain node for volume control */
  private masterGain: GainNode | null = null;
  
  /** Global mute state */
  private muted: boolean = false;
  
  /** Whether audio context has been unlocked (iOS Safari) */
  private unlocked: boolean = false;
  
  /** Whether preloading has started */
  private preloadStarted: boolean = false;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the audio context.
   * Must be called after a user gesture on iOS Safari.
   */
  private async initContext(): Promise<void> {
    if (this.audioContext) return;
    
    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    
    // Create master gain node
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    
    // Set initial volume
    this.masterGain.gain.value = this.muted ? 0 : 1;
    
    console.log('[SoundManager] Audio context initialized');
  }

  /**
   * Unlock audio context for iOS Safari.
   * Must be called from a user gesture handler.
   */
  async unlock(): Promise<void> {
    if (this.unlocked) return;
    
    try {
      await this.initContext();
      
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.unlocked = true;
      console.log('[SoundManager] Audio context unlocked');
    } catch (error) {
      console.warn('[SoundManager] Failed to unlock audio context:', error);
    }
  }

  /**
   * Preload all sounds.
   * Call this at app startup to ensure sounds are ready.
   * 
   * @param ids - Optional subset of sounds to preload (defaults to all)
   */
  async preload(ids?: SoundId[]): Promise<void> {
    if (this.audioContext) {
      // Already initialized, just load sounds
      await this.loadSounds(ids);
      return;
    }
    
    // Defer initialization until first user gesture
    this.preloadStarted = true;
    
    // Load sounds in background - actual loading happens after unlock
    const soundsToLoad = ids || (Object.keys(SOUND_MANIFEST) as SoundId[]);
    
    for (const id of soundsToLoad) {
      if (!this.sounds.has(id)) {
        this.sounds.set(id, {
          buffer: null,
          loadPromise: null,
          isPlaying: false,
        });
      }
    }
  }

  /**
   * Load sounds into buffers.
   * Called automatically on first playback if not preloaded.
   */
  private async loadSounds(ids?: SoundId[]): Promise<void> {
    await this.initContext();
    
    const soundsToLoad = ids || (Object.keys(SOUND_MANIFEST) as SoundId[]);
    
    const loadPromises = soundsToLoad.map(async (id) => {
      const config = SOUND_MANIFEST[id];
      
      // Skip if already loaded
      if (this.sounds.get(id)?.buffer) return;
      
      // Initialize sound state if needed
      if (!this.sounds.has(id)) {
        this.sounds.set(id, {
          buffer: null,
          loadPromise: null,
          isPlaying: false,
        });
      }
      
      const state = this.sounds.get(id)!;
      
      // Start loading if not already
      if (!state.loadPromise) {
        state.loadPromise = this.loadSound(id, config.src);
      }
      
      await state.loadPromise;
    });
    
    await Promise.all(loadPromises);
  }

  /**
   * Load a single sound file.
   */
  private async loadSound(id: SoundId, src: string): Promise<void> {
    try {
      const response = await fetch(src);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${src}: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      const state = this.sounds.get(id);
      if (state) {
        state.buffer = audioBuffer;
      }
      
      console.log(`[SoundManager] Loaded: ${id}`);
    } catch (error) {
      console.warn(`[SoundManager] Failed to load ${id}:`, error);
      // Keep buffer as null - play will skip silently
    }
  }

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  /**
   * Play a sound once.
   * Silently fails if sound not loaded or muted.
   * 
   * @param id - Sound ID to play
   */
  async play(id: SoundId): Promise<void> {
    // Skip if muted
    if (this.muted) return;
    
    // Ensure context is ready
    if (!this.audioContext || !this.unlocked) {
      console.log(`[SoundManager] Skipping ${id} - context not ready`);
      return;
    }
    
    // Ensure sound is loaded
    const state = this.sounds.get(id);
    if (!state?.buffer) {
      // Try to load on-demand
      const config = SOUND_MANIFEST[id];
      if (!config) {
        console.warn(`[SoundManager] Unknown sound: ${id}`);
        return;
      }
      
      await this.loadSounds([id]);
      
      const loadedState = this.sounds.get(id);
      if (!loadedState?.buffer) {
        console.warn(`[SoundManager] Failed to load ${id}`);
        return;
      }
      this.playFromBuffer(id, loadedState.buffer, config.volume);
    } else {
      this.playFromBuffer(id, state.buffer, SOUND_MANIFEST[id].volume);
    }
  }

  /**
   * Play a looping sound (e.g., footsteps).
   * Call stop() to stop the loop.
   * 
   * @param id - Sound ID to play in a loop
   */
  async playLoop(id: SoundId): Promise<void> {
    if (this.muted) return;
    
    // For loops, we need to handle overlapping
    // Footsteps should play repeatedly while walking
    const config = SOUND_MANIFEST[id];
    if (!config) {
      console.warn(`[SoundManager] Unknown sound: ${id}`);
      return;
    }
    
    // Skip if already playing
    const state = this.sounds.get(id);
    if (state?.isPlaying) return;
    
    await this.play(id);
  }

  /**
   * Stop a looping sound.
   * 
   * @param id - Sound ID to stop
   */
  stop(id: SoundId): void {
    const sources = this.activeSources.get(id);
    if (sources) {
      for (const source of sources) {
        try {
          source.stop();
          source.disconnect();
        } catch {
          // Source may have already stopped
        }
      }
      this.activeSources.delete(id);
    }
    
    const state = this.sounds.get(id);
    if (state) {
      state.isPlaying = false;
    }
  }

  /**
   * Internal: Play from buffer.
   */
  private playFromBuffer(
    id: SoundId,
    buffer: AudioBuffer,
    volume: number
  ): void {
    if (!this.audioContext || !this.masterGain || this.muted) return;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = SOUND_MANIFEST[id].loop;
    
    // Create gain node for this sound
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    
    // Connect: source -> gain -> master -> destination
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Track for stopping
    if (!this.activeSources.has(id)) {
      this.activeSources.set(id, []);
    }
    this.activeSources.get(id)!.push(source);
    
    // Mark as playing
    const state = this.sounds.get(id);
    if (state) {
      state.isPlaying = true;
    }
    
    // Clean up when done
    source.onended = () => {
      // Remove from active sources
      const sources = this.activeSources.get(id);
      if (sources) {
        const index = sources.indexOf(source);
        if (index >= 0) {
          sources.splice(index, 1);
        }
        if (sources.length === 0) {
          this.activeSources.delete(id);
        }
      }
      
      // Mark as stopped (for loops)
      const currentState = this.sounds.get(id);
      if (currentState) {
        currentState.isPlaying = false;
      }
    };
    
    source.start(0);
  }

  // ============================================================================
  // VOLUME & MUTE
  // ============================================================================

  /**
   * Set global mute state.
   * Persists to localStorage.
   * 
   * @param muted - Whether to mute all sounds
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    
    // Update master gain
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
    
    // Persist to localStorage
    try {
      localStorage.setItem('sound-muted', String(muted));
    } catch {
      // localStorage may not be available
    }
    
    console.log(`[SoundManager] Muted: ${muted}`);
  }

  /**
   * Get current mute state.
   * Also checks localStorage on first call.
   */
  isMuted(): boolean {
    // Load from localStorage on first call
    if (this.muted === false) {
      try {
        const stored = localStorage.getItem('sound-muted');
        if (stored === 'true') {
          this.muted = true;
        }
      } catch {
        // localStorage may not be available
      }
    }
    
    return this.muted;
  }

  /**
   * Toggle mute state.
   * Convenience method.
   */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Set global volume.
   * 
   * @param volume - Volume level (0-1)
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      const clamped = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.value = clamped;
    }
  }

  /**
   * Get current volume.
   */
  getVolume(): number {
    return this.masterGain?.gain.value ?? 1;
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Check if sound manager is ready.
   */
  isReady(): boolean {
    return this.unlocked && this.audioContext?.state === 'running';
  }

  /**
   * Check if a specific sound is loaded.
   */
  isLoaded(id: SoundId): boolean {
    return this.sounds.get(id)?.buffer !== null;
  }

  /**
   * Get list of loaded sounds.
   */
  getLoadedSounds(): SoundId[] {
    const loaded: SoundId[] = [];
    for (const [id, state] of this.sounds) {
      if (state.buffer) {
        loaded.push(id);
      }
    }
    return loaded;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of SoundManager */
export const SoundManager = new SoundManagerClass();

export default SoundManager;
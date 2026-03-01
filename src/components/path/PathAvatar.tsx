/**
 * PathAvatar Component
 * 
 * A small Three.js canvas that renders the 3D avatar on the lesson path.
 * Uses the same AvatarBuilder as the garden renderer for consistency.
 * 
 * Features:
 * - Idle breathing animation (subtle Y-axis oscillation)
 * - Eye blink animation (every 3-6 seconds)
 * - Lightweight canvas (56px × 56px)
 * - Reuses AvatarBuilder geometry for consistent look
 * 
 * @module PathAvatar
 * @see docs/phase-2-world-expansion/task-2.0-9-3d-avatar-lesson-path.md
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { buildAvatar, DEFAULT_AVATAR } from '../../renderer/AvatarBuilder';
import type { AvatarOptions } from '../../renderer/types';

/**
 * Props for PathAvatar component
 */
export interface PathAvatarProps {
  /** Avatar customization options */
  options?: Partial<AvatarOptions>;
  /** Size in pixels (default: 56) */
  size?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * PathAvatar - 3D avatar thumbnail for lesson path
 * 
 * Renders a compact 3D avatar using the same buildAvatar() function
 * as the garden renderer. Includes idle breathing and eye blink animations.
 * 
 * @param options - Avatar customization (partial, uses defaults for missing fields)
 * @param size - Canvas size in pixels
 * @param className - Optional CSS class
 * 
 * @example
 * <PathAvatar
 *   options={{
 *     gender: 'girl',
 *     shirtColor: 0xFF69B4,
 *     hairColor: 0xDDB800
 *   }}
 *   size={64}
 * />
 */
export const PathAvatar: React.FC<PathAvatarProps> = ({
  options,
  size = 56,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const avatarRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock | null>(null);
  
  // Blink state
  const blinkStateRef = useRef({
    nextBlinkTime: 2 + Math.random() * 3,
    isBlinking: false,
    blinkStartTime: 0,
  });

  // Merge options with defaults
  const avatarOptions = useMemo<AvatarOptions>(() => {
    return { ...DEFAULT_AVATAR, ...options };
  }, [options]);

  // Create renderer, scene, and camera once
  const setupScene = useCallback(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // Transparent background
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    
    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Orthographic camera for isometric view (same angle as garden)
    const frustum = 1.2; // Smaller frustum for close-up avatar
    const aspect = 1; // Square canvas
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect / 2,
      frustum * aspect / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      100
    );
    
    // Isometric camera angle (matching GardenRenderer)
    const angle = Math.PI / 4; // 45 degrees
    const elevation = Math.PI / 6; // 30 degrees from horizontal
    const distance = 4;
    
    camera.position.set(
      distance * Math.cos(elevation) * Math.sin(angle),
      distance * Math.sin(elevation),
      distance * Math.cos(elevation) * Math.cos(angle)
    );
    camera.lookAt(0, 0.5, 0); // Look at upper body
    cameraRef.current = camera;
    
    // Lighting - bright and friendly
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    scene.add(ambientLight);
    
    const keyLight = new THREE.DirectionalLight(0xFFF4E0, 1.0);
    keyLight.position.set(3, 5, 2);
    scene.add(keyLight);
    
    const fillLight = new THREE.DirectionalLight(0x88AACC, 0.3);
    fillLight.position.set(-2, 3, -2);
    scene.add(fillLight);
    
    // Clock for animations
    clockRef.current = new THREE.Clock();
  }, [size]);

  // Create avatar when options change
  const createAvatar = useCallback(() => {
    if (!sceneRef.current) return;
    
    // Remove old avatar if exists
    if (avatarRef.current) {
      sceneRef.current.remove(avatarRef.current);
      avatarRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
    
    // Build new avatar
    const avatar = buildAvatar(avatarOptions);
    avatar.position.set(0, 0, 0);
    avatar.rotation.y = Math.PI / 6; // Slight turn for better face visibility
    
    sceneRef.current.add(avatar);
    avatarRef.current = avatar;
  }, [avatarOptions]);

  // Animation loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !clockRef.current || !avatarRef.current) {
      return;
    }
    
    frameIdRef.current = requestAnimationFrame(animate);
    
    const elapsed = clockRef.current.getElapsedTime();
    const avatar = avatarRef.current;
    const blinkState = blinkStateRef.current;
    
    // ===== IDLE BREATHING =====
    // Subtle Y-axis breathing animation
    const breathY = Math.sin(elapsed * 1.5) * 0.015;
    avatar.position.y = breathY;
    
    // ===== EYE BLINK =====
    const blinkDuration = 0.12; // 120ms blink
    
    if (!blinkState.isBlinking && elapsed >= blinkState.nextBlinkTime) {
      // Start a blink
      blinkState.isBlinking = true;
      blinkState.blinkStartTime = elapsed;
    }
    
    if (blinkState.isBlinking) {
      const blinkProgress = elapsed - blinkState.blinkStartTime;
      // Scale eyes to 0 on Y axis during blink
      const eyeScaleY = blinkProgress < blinkDuration ? 0.1 : 1.0;
      
      // Apply to eye parts (named in AvatarBuilder)
      const eyeNames = ['eye_left', 'eye_right'];
      eyeNames.forEach((name) => {
        const eye = avatar.getObjectByName(name);
        if (eye) {
          eye.scale.y = eyeScaleY;
        }
      });
      
      // Blink finished
      if (blinkProgress >= blinkDuration) {
        blinkState.isBlinking = false;
        // Schedule next blink in 3-6 seconds
        blinkState.nextBlinkTime = elapsed + 3 + Math.random() * 3;
      }
    }
    
    // Render
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);

  // Setup on mount
  useEffect(() => {
    setupScene();
    createAvatar();
    animate();
    
    // Cleanup
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [setupScene, createAvatar, animate]);

  // Re-create avatar when options change
  useEffect(() => {
    createAvatar();
  }, [createAvatar]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'block',
      }}
    />
  );
};

export default PathAvatar;
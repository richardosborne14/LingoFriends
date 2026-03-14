/**
 * FlowTestHarness - Test the complete seed → lesson → reward → tree growth flow
 * 
 * This component provides a unified interface to test the ENTIRE learning cycle:
 * 1. Plant a seed (create a new learning tree in the garden)
 * 2. Start a lesson on that tree
 * 3. Complete the lesson and see rewards
 * 4. Watch the tree grow as SunDrops accumulate
 * 
 * It integrates with the 3D garden renderer and shows learning trees
 * that grow through 15 stages based on earned SunDrops.
 * 
 * ONLY FOR DEVELOPMENT - Should be gated in production.
 * 
 * @module components/dev/FlowTestHarness
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

// Types
import type { UserTree, TreeStatus } from '../../types/game';
import { TreeStatus as TS } from '../../types/game';

// Renderer
import { 
  makeLearningTree, 
  calculateGrowthStage, 
  getGrowthStageLabel,
  GROWTH_THRESHOLDS,
  SKILL_PATH_COLORS,
} from '../../renderer/objects/learningTrees';
import { gridToWorld, GRID_SIZE, TILE_WIDTH } from '../../renderer/gridUtils';

// ============================================================================
// MOCK DATA
// ============================================================================

const SKILL_PATHS = [
  { id: 'spanish-greetings', name: 'Spanish Greetings', icon: '🇪🇸', lessons: 8 },
  { id: 'spanish-numbers', name: 'Spanish Numbers', icon: '🔢', lessons: 6 },
  { id: 'french-basics', name: 'French Basics', icon: '🇫🇷', lessons: 10 },
  { id: 'german-greetings', name: 'German Greetings', icon: '🇩🇪', lessons: 7 },
  { id: 'spanish-colors', name: 'Spanish Colors', icon: '🌈', lessons: 5 },
  { id: 'spanish-food', name: 'Spanish Food', icon: '🌮', lessons: 9 },
];

// Grid positions for learning trees (path tiles around the edge)
const TREE_POSITIONS = [
  { gx: 1, gz: 1 }, { gx: 3, gz: 1 }, { gx: 5, gz: 1 }, { gx: 7, gz: 1 },
  { gx: 9, gz: 1 }, { gx: 11, gz: 1 },
  { gx: 1, gz: 10 }, { gx: 3, gz: 10 }, { gx: 5, gz: 10 }, { gx: 7, gz: 10 },
  { gx: 9, gz: 10 }, { gx: 11, gz: 10 },
];

// ============================================================================
// MINI 3D GARDEN RENDERER
// ============================================================================

/**
 * Simple 3D garden renderer for testing learning trees.
 * Renders a grid with learning trees that can be clicked.
 */
class MiniGardenRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private treeGroups: Map<string, THREE.Group> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private canvas: HTMLCanvasElement;
  private onTreeClick?: (treeId: string) => void;
  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor(canvas: HTMLCanvasElement, onTreeClick?: (treeId: string) => void) {
    this.canvas = canvas;
    this.onTreeClick = onTreeClick;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x4A7C59); // Garden green

    // Isometric camera
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const frustum = 8;
    this.camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 100
    );
    this.camera.position.set(12, 12, 12);
    this.camera.lookAt(0, 0, 0);

    // WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Lighting
    this.setupLighting();

    // Ground tiles
    this.createGround();

    // Event listeners
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting = (): void => {
    // Bright ambient light for visibility
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.8);
    this.scene.add(ambient);

    // Bright sun light from above
    const sun = new THREE.DirectionalLight(0xFFFFEE, 1.2);
    sun.position.set(8, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    this.scene.add(sun);

    // Warm fill light from the side
    const fill = new THREE.DirectionalLight(0xFFEEDD, 0.6);
    fill.position.set(-5, 8, 5);
    this.scene.add(fill);

    // Hemisphere light for natural sky/ground colors
    const hemi = new THREE.HemisphereLight(0x88CCFF, 0x44AA44, 0.4);
    this.scene.add(hemi);
  };

  private createGround = (): void => {
    // Create tile grid
    const tileGeometry = new THREE.BoxGeometry(TILE_WIDTH, 0.1, TILE_WIDTH);
    
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gz = 0; gz < GRID_SIZE; gz++) {
        const isPath = this.isPathTile(gx, gz);
        const tileMaterial = new THREE.MeshLambertMaterial({
          color: isPath ? 0xC4A76C : 0x5D8A4A, // Path: tan, Grass: green
        });
        
        const tile = new THREE.Mesh(tileGeometry, tileMaterial);
        const { x, z } = gridToWorld(gx, gz);
        tile.position.set(x, 0, z);
        tile.receiveShadow = true;
        tile.userData = { gx, gz, isPath };
        this.scene.add(tile);
      }
    }
  };

  private isPathTile = (gx: number, gz: number): boolean => {
    // Path tiles form a cross pattern through the garden
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerZ = Math.floor(GRID_SIZE / 2);
    return gx === centerX || gz === centerZ;
  };

  private handleClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Check intersection with tree groups
    const treeMeshes: THREE.Object3D[] = [];
    this.treeGroups.forEach((group) => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          treeMeshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(treeMeshes, false);
    
    if (intersects.length > 0) {
      // Find the parent tree group
      let parent = intersects[0].object.parent;
      while (parent && !parent.userData.type) {
        parent = parent.parent;
      }
      if (parent?.userData.treeId && this.onTreeClick) {
        this.onTreeClick(parent.userData.treeId);
      }
    }
  };

  private handleResize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const aspect = width / height;
    const frustum = 8;

    this.camera.left = -frustum * aspect;
    this.camera.right = frustum * aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Add or update a learning tree in the garden.
   */
  updateTree = (tree: UserTree): void => {
    const { gx, gz } = tree.gridPosition;
    
    // Remove existing tree if present
    const existingGroup = this.treeGroups.get(tree.id);
    if (existingGroup) {
      this.scene.remove(existingGroup);
    }

    // Create new tree
    const treeGroup = makeLearningTree({
      gx,
      gz,
      growthStage: tree.growthStage,
      health: tree.health,
      skillPathId: tree.skillPathId,
      status: tree.status as TreeStatus,
      isDead: tree.health <= 0,
    });

    // Store tree ID for click detection
    treeGroup.userData = { ...treeGroup.userData, treeId: tree.id };
    
    this.scene.add(treeGroup);
    this.treeGroups.set(tree.id, treeGroup);
  };

  /**
   * Remove a tree from the garden.
   */
  removeTree = (treeId: string): void => {
    const group = this.treeGroups.get(treeId);
    if (group) {
      this.scene.remove(group);
      this.treeGroups.delete(treeId);
    }
  };

  /**
   * Start the animation loop.
   */
  animate = (): void => {
    const animateLoop = () => {
      this.animationId = requestAnimationFrame(animateLoop);
      this.renderer.render(this.scene, this.camera);
    };
    animateLoop();
  };

  /**
   * Clean up resources.
   */
  dispose = (): void => {
    cancelAnimationFrame(this.animationId);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface FlowState {
  seeds: number;
  gems: number;
  trees: UserTree[];
  selectedTreeId: string | null;
}

type TestPhase = 'menu' | 'garden' | 'planting' | 'lesson' | 'complete';

export const FlowTestHarness: React.FC = () => {
  // State
  const [phase, setPhase] = useState<TestPhase>('menu');
  const [flowState, setFlowState] = useState<FlowState>({
    seeds: 3,
    gems: 0,
    trees: [],
    selectedTreeId: null,
  });
  
  // Lesson state
  const [lessonProgress, setLessonProgress] = useState(0);
  const [lessonScore, setLessonScore] = useState(0);
  const [sunDropsEarned, setSunDropsEarned] = useState(0);
  
  // Track when lesson is completing
  const lessonCompletingRef = useRef(false);
  
  // 3D garden
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MiniGardenRenderer | null>(null);
  
  // Keep a ref of trees so the renderer can access current state
  const treesRef = useRef<UserTree[]>(flowState.trees);
  
  // Update trees ref whenever trees change
  useEffect(() => {
    treesRef.current = flowState.trees;
  }, [flowState.trees]);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Initialize 3D renderer when entering garden phase
  useEffect(() => {
    // Only run in garden phase
    if (phase !== 'garden') return;
    
    console.log('[FlowTestHarness] Garden phase entered, waiting for canvas...');
    
    // Poll for canvas to be available (React might not have rendered it yet)
    let cancelled = false;
    const pollForCanvas = () => {
      if (cancelled) return;
      
      const canvas = canvasRef.current;
      if (!canvas) {
        console.log('[FlowTestHarness] Canvas not available yet, retrying...');
        requestAnimationFrame(pollForCanvas);
        return;
      }
      
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      console.log('[FlowTestHarness] Canvas found:', width, 'x', height);
      
      if (width === 0 || height === 0) {
        console.log('[FlowTestHarness] Canvas has no dimensions yet, retrying...');
        requestAnimationFrame(pollForCanvas);
        return;
      }
      
      console.log('[FlowTestHarness] Creating renderer...');
      
      rendererRef.current = new MiniGardenRenderer(
        canvas,
        (treeId) => {
          console.log('[FlowTestHarness] Tree clicked:', treeId);
          setFlowState(prev => ({ ...prev, selectedTreeId: treeId }));
        }
      );
      rendererRef.current.animate();
      
      // Add any trees that are already in state
      const currentTrees = treesRef.current;
      console.log('[FlowTestHarness] Trees to render on init:', currentTrees.length);
      currentTrees.forEach(tree => {
        console.log('[FlowTestHarness] Adding tree on init:', tree.id, tree.name);
        rendererRef.current?.updateTree(tree);
      });
    };
    
    // Start polling
    pollForCanvas();

    return () => {
      cancelled = true;
      console.log('[FlowTestHarness] Disposing renderer');
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [phase]);

  // Separate effect to add/update trees - runs after renderer AND trees are ready
  useEffect(() => {
    console.log('[FlowTestHarness] Trees effect:', flowState.trees.length, 'trees, phase:', phase, 'renderer:', !!rendererRef.current);
    
    // Only run if we have both renderer and trees
    if (!rendererRef.current || phase !== 'garden') return;
    
    console.log('[FlowTestHarness] Updating', flowState.trees.length, 'trees in renderer');
    flowState.trees.forEach(tree => {
      console.log('[FlowTestHarness] Updating tree:', tree.id, tree.name, 'stage:', tree.growthStage);
      rendererRef.current?.updateTree(tree);
    });
  }, [flowState.trees, phase]);

  // ==========================================
  // HANDLERS
  // ==========================================

  /**
   * Plant a seed to create a new learning tree.
   */
  const plantSeed = useCallback((skillPathId: string) => {
    if (flowState.seeds <= 0 || flowState.trees.length >= TREE_POSITIONS.length) {
      return;
    }

    const skillPath = SKILL_PATHS.find(p => p.id === skillPathId);
    if (!skillPath) return;

    const position = TREE_POSITIONS[flowState.trees.length];
    
    const newTree: UserTree = {
      id: `tree-${Date.now()}`,
      userId: 'test-user',
      skillPathId,
      name: skillPath.name,
      icon: skillPath.icon,
      gridPosition: position,
      position: { x: position.gx, y: position.gz }, // Legacy
      sunDropsEarned: 0,
      growthStage: 0,
      sunDropsTotal: 0, // Legacy
      health: 100,
      status: TS.SEED,
      bufferDays: 0,
      lastRefreshDate: new Date().toISOString(),
      lessonsCompleted: 0,
      lessonsTotal: skillPath.lessons,
      decorations: [],
      giftsReceived: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setFlowState(prev => ({
      ...prev,
      seeds: prev.seeds - 1,
      trees: [...prev.trees, newTree],
    }));

    setPhase('garden');
  }, [flowState.seeds, flowState.trees.length]);

  /**
   * Start a lesson on a selected tree.
   */
  const startLesson = useCallback(() => {
    if (!flowState.selectedTreeId) return;
    lessonCompletingRef.current = false; // Reset completion flag
    setPhase('lesson');
    setLessonProgress(0);
    setLessonScore(0);
    setSunDropsEarned(0);
  }, [flowState.selectedTreeId]);

  /**
   * Complete a lesson step (simplified for testing).
   */
  const completeStep = useCallback((correct: boolean) => {
    // Prevent double-completion
    if (lessonCompletingRef.current) return;
    
    const pointsEarned = correct ? Math.floor(Math.random() * 3) + 2 : 0;
    
    setLessonProgress(prev => prev + 1);
    setLessonScore(prev => prev + pointsEarned);
    setSunDropsEarned(prev => {
      const newTotal = prev + pointsEarned;
      return newTotal;
    });
  }, []);

  /**
   * Effect to check if lesson is complete after state updates
   */
  useEffect(() => {
    if (lessonProgress >= 5 && !lessonCompletingRef.current) {
      lessonCompletingRef.current = true;
      
      // Get the current values at the time of completion
      const currentScore = lessonScore;
      const currentDrops = sunDropsEarned;
      
      const tree = flowState.trees.find(t => t.id === flowState.selectedTreeId);
      if (!tree) {
        setPhase('garden');
        return;
      }

      // Update tree with earned SunDrops
      const newSunDropsEarned = tree.sunDropsEarned + currentDrops;
      const newGrowthStage = calculateGrowthStage(newSunDropsEarned);
      const newLessonsCompleted = Math.min(tree.lessonsCompleted + 1, tree.lessonsTotal);
      
      // Check if path is complete
      const pathComplete = newLessonsCompleted >= tree.lessonsTotal;

      // Update tree
      setFlowState(prev => ({
        ...prev,
        trees: prev.trees.map(t =>
          t.id === tree.id
            ? {
                ...t,
                sunDropsEarned: newSunDropsEarned,
                growthStage: newGrowthStage,
                lessonsCompleted: newLessonsCompleted,
                status: newGrowthStage >= 14 ? TS.BLOOMED : TS.GROWING,
                lastLessonDate: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
        gems: prev.gems + Math.floor(currentScore / 3),
        seeds: pathComplete ? prev.seeds + 2 : prev.seeds,
      }));

      setPhase('complete');
    }
  }, [lessonProgress, lessonScore, sunDropsEarned, flowState.trees, flowState.selectedTreeId]);

  /**
   * Complete the lesson manually (unused now, but kept for reference)
   */
  const completeLesson = useCallback(() => {
    // This is now handled by the useEffect above
  }, []);

  /**
   * Quick-add SunDrops to test growth stages.
   */
  const addSunDrops = useCallback((amount: number) => {
    const tree = flowState.trees.find(t => t.id === flowState.selectedTreeId);
    if (!tree) return;

    const newSunDrops = tree.sunDropsEarned + amount;
    const newGrowthStage = calculateGrowthStage(newSunDrops);

    setFlowState(prev => ({
      ...prev,
      trees: prev.trees.map(t =>
        t.id === tree.id
          ? {
              ...t,
              sunDropsEarned: newSunDrops,
              growthStage: newGrowthStage,
              status: newGrowthStage >= 14 ? TS.BLOOMED : TS.GROWING,
            }
          : t
      ),
    }));
  }, [flowState.trees, flowState.selectedTreeId]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const renderMenu = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2" style={{ fontFamily: "'Lilita One', sans-serif", color: '#047857' }}>
          🌳 Flow Test Harness
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Test the complete seed → lesson → reward cycle
        </p>

        {/* Current State */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-6">
          <h2 className="font-bold text-lg mb-3">📊 Current State</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl">🌱</div>
              <div className="font-bold text-xl text-green-600">{flowState.seeds}</div>
              <div className="text-xs text-gray-500">Seeds</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl">💎</div>
              <div className="font-bold text-xl text-purple-600">{flowState.gems}</div>
              <div className="text-xs text-gray-500">Gems</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-2xl">🌳</div>
              <div className="font-bold text-xl text-amber-600">{flowState.trees.length}</div>
              <div className="text-xs text-gray-500">Trees</div>
            </div>
          </div>
        </div>

        {/* Start Flow */}
        {flowState.trees.length === 0 ? (
          <button
            onClick={() => setPhase('planting')}
            className="w-full p-6 bg-green-500 text-white rounded-2xl shadow-lg hover:bg-green-600 transition text-xl font-medium"
          >
            🌱 Plant Your First Seed
          </button>
        ) : (
          <button
            onClick={() => setPhase('garden')}
            className="w-full p-6 bg-blue-500 text-white rounded-2xl shadow-lg hover:bg-blue-600 transition text-xl font-medium"
          >
            🌳 Go to Garden
          </button>
        )}

        {/* Quick Actions */}
        <div className="mt-6 bg-yellow-50 rounded-xl p-4">
          <h2 className="font-bold mb-3">⚡ Quick Test Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFlowState(prev => ({ ...prev, seeds: prev.seeds + 5 }))}
              className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition"
            >
              +5 🌱 Seeds
            </button>
            <button
              onClick={() => setFlowState(prev => ({ ...prev, gems: prev.gems + 50 }))}
              className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition"
            >
              +50 💎 Gems
            </button>
          </div>
        </div>

        {/* Growth Stages Reference */}
        <div className="mt-6 bg-white rounded-xl p-4 shadow">
          <h3 className="font-bold mb-2">📈 Growth Stages (SunDrops needed)</h3>
          <div className="grid grid-cols-5 gap-1 text-xs">
            {GROWTH_THRESHOLDS.map((threshold, stage) => (
              <div key={stage} className="text-center p-1 bg-gray-50 rounded">
                <div className="font-medium">{stage}</div>
                <div className="text-gray-500">{threshold}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlanting = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setPhase('menu')}
          className="mb-4 px-4 py-2 bg-white rounded-lg shadow text-gray-600 hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-center mb-6">🌱 Plant a Seed</h2>

        <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🌱</div>
            <div className="text-lg font-medium">Seeds Available: {flowState.seeds}</div>
          </div>
        </div>

        <h3 className="font-bold mb-3">Choose a skill path:</h3>
        <div className="space-y-2">
          {SKILL_PATHS.map(path => (
            <button
              key={path.id}
              onClick={() => plantSeed(path.id)}
              disabled={flowState.seeds <= 0}
              className={`w-full p-4 rounded-xl text-left transition ${
                flowState.seeds > 0
                  ? 'bg-white shadow hover:shadow-md'
                  : 'bg-gray-100 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{path.icon}</span>
                <div>
                  <div className="font-medium">{path.name}</div>
                  <div className="text-sm text-gray-500">{path.lessons} lessons</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderGarden = () => {
    const selectedTree = flowState.trees.find(t => t.id === flowState.selectedTreeId);
    
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-md p-3 flex items-center justify-between shrink-0">
          <button
            onClick={() => setPhase('menu')}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            ← Menu
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm">🌱 {flowState.seeds}</span>
            <span className="text-sm">💎 {flowState.gems}</span>
          </div>
        </div>

        {/* 3D Garden */}
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <canvas
            ref={canvasRef}
            style={{ 
              display: 'block',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              background: '#4A7C59',
            }}
          />
          
          {/* Selected Tree Info */}
          {selectedTree && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{selectedTree.icon}</span>
                <div>
                  <div className="font-bold">{selectedTree.name}</div>
                  <div className="text-sm text-gray-500">
                    {getGrowthStageLabel(selectedTree.growthStage)} • Stage {selectedTree.growthStage}/14
                  </div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>SunDrops</span>
                    <span>{selectedTree.sunDropsEarned} / 900</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${(selectedTree.sunDropsEarned / 900) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Lessons</span>
                    <span>{selectedTree.lessonsCompleted} / {selectedTree.lessonsTotal}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(selectedTree.lessonsCompleted / selectedTree.lessonsTotal) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Health</span>
                    <span>{selectedTree.health}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        selectedTree.health > 50 ? 'bg-green-500' : selectedTree.health > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedTree.health}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={startLesson}
                  className="flex-1 py-3 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition"
                >
                  📚 Start Lesson
                </button>
                <button
                  onClick={() => addSunDrops(50)}
                  className="px-4 py-3 bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 transition"
                >
                  +50 ☀️
                </button>
                <button
                  onClick={() => addSunDrops(100)}
                  className="px-4 py-3 bg-amber-100 text-amber-700 rounded-full font-medium hover:bg-amber-200 transition"
                >
                  +100 ☀️
                </button>
              </div>
            </div>
          )}

          {/* No tree selected */}
          {!selectedTree && flowState.trees.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 rounded-xl p-4 text-center">
              <p className="text-gray-600">Tap a tree to start a lesson</p>
            </div>
          )}

          {/* No trees yet */}
          {flowState.trees.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <button
                onClick={() => setPhase('planting')}
                className="px-6 py-4 bg-green-500 text-white rounded-2xl shadow-lg text-xl font-medium"
              >
                🌱 Plant Your First Seed
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLesson = () => {
    const tree = flowState.trees.find(t => t.id === flowState.selectedTreeId);
    if (!tree) return null;

    const steps = 5;
    const progress = (lessonProgress / steps) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] p-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tree.icon}</span>
              <span className="font-bold">{tree.name}</span>
            </div>
            <div className="text-amber-500 font-bold">☀️ {sunDropsEarned}</div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl p-4 shadow mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{lessonProgress} / {steps}</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Mock Lesson Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-center">
              Activity {lessonProgress + 1}
            </h2>
            <p className="text-gray-600 text-center mb-6">
              This is a simplified lesson for testing the flow.
              Click "Correct" or "Wrong" to simulate answers.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => completeStep(true)}
                className="py-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
              >
                ✓ Correct
              </button>
              <button
                onClick={() => completeStep(false)}
                className="py-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition"
              >
                ✗ Wrong
              </button>
            </div>
          </div>

          {/* SunDrops so far */}
          <div className="mt-6 text-center">
            <div className="inline-block bg-amber-100 text-amber-700 px-4 py-2 rounded-full">
              Earned this lesson: ☀️ {sunDropsEarned}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComplete = () => {
    const tree = flowState.trees.find(t => t.id === flowState.selectedTreeId);
    if (!tree) return null;

    const pathComplete = tree.lessonsCompleted >= tree.lessonsTotal;
    const gemsEarned = Math.floor(lessonScore / 3);

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] to-[#dcfce7] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl mb-4"
          >
            {pathComplete ? '🎉' : '⭐'}
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">
            {pathComplete ? 'Path Complete!' : 'Lesson Complete!'}
          </h2>

          <p className="text-gray-600 mb-6">
            {pathComplete
              ? `You've mastered ${tree.name}!`
              : `Great work on ${tree.name}!`}
          </p>

          {/* Rewards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-amber-50 rounded-xl p-3">
              <div className="text-2xl">☀️</div>
              <div className="font-bold text-amber-600">+{sunDropsEarned}</div>
              <div className="text-xs text-gray-500">SunDrops</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-3">
              <div className="text-2xl">💎</div>
              <div className="font-bold text-purple-600">+{gemsEarned}</div>
              <div className="text-xs text-gray-500">Gems</div>
            </div>
            {pathComplete && (
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-2xl">🌱</div>
                <div className="font-bold text-green-600">+2</div>
                <div className="text-xs text-gray-500">Seeds</div>
              </div>
            )}
          </div>

          {/* Tree Growth */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-600 mb-2">Tree Growth</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm">Stage {tree.growthStage}</span>
              <span className="text-gray-400">→</span>
              <span className="font-bold">{getGrowthStageLabel(tree.growthStage)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {tree.sunDropsEarned} / 900 SunDrops
            </div>
          </div>

          <button
            onClick={() => setPhase('garden')}
            className="w-full py-4 bg-green-500 text-white rounded-full font-medium hover:bg-green-600 transition"
          >
            🌳 Back to Garden
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <AnimatePresence mode="wait">
      {phase === 'menu' && (
        <motion.div
          key="menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderMenu()}
        </motion.div>
      )}

      {phase === 'planting' && (
        <motion.div
          key="planting"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {renderPlanting()}
        </motion.div>
      )}

      {phase === 'garden' && (
        <motion.div
          key="garden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {renderGarden()}
        </motion.div>
      )}

      {phase === 'lesson' && (
        <motion.div
          key="lesson"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {renderLesson()}
        </motion.div>
      )}

      {phase === 'complete' && (
        <motion.div
          key="complete"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          {renderComplete()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FlowTestHarness;
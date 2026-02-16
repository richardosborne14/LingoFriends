/**
 * SeedInventory Component
 * 
 * Displays the user's seed count and provides a button to plant seeds.
 * Seeds are earned by completing skill paths and can be used to start
 * new learning paths (plant new trees).
 * 
 * Features:
 * - Shows seed count with animated icon
 * - "Plant Seed" button enabled when seeds > 0 and space available
 * - Opens SeedPicker modal for path selection
 * - Kid-friendly design with visual feedback
 * 
 * @module components/shared/SeedInventory
 * @see docs/phase-1.1/task-1-1-13-seed-earning.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getSeedCount,
  getAvailableSkillPaths,
  plantSeed,
  canPlantTree,
  type AvailableSkillPath,
} from '../../services/seedService';

// ============================================
// TYPES
// ============================================

/**
 * Props for SeedInventory component.
 */
export interface SeedInventoryProps {
  /** User ID for seed operations */
  userId: string;
  /** Current seed count (optional - will fetch if not provided) */
  initialSeedCount?: number;
  /** Callback when a seed is planted */
  onSeedPlanted?: (treeId: string, skillPathId: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show the plant button */
  showPlantButton?: boolean;
  /** Maximum trees allowed in garden (default: 8) */
  maxTrees?: number;
}

/**
 * Animation variants for the seed icon.
 */
const seedIconVariants = {
  idle: {
    scale: 1,
    rotate: 0,
  },
  hover: {
    scale: 1.1,
    rotate: [0, -5, 5, -5, 0],
    transition: {
      rotate: {
        repeat: Infinity,
        duration: 0.5,
      },
    },
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * SeedInventory - Displays seed count and planting UI.
 * 
 * @example
 * <SeedInventory
 *   userId={currentUser.id}
 *   onSeedPlanted={(treeId, pathId) => refreshGarden()}
 * />
 */
export const SeedInventory: React.FC<SeedInventoryProps> = ({
  userId,
  initialSeedCount = 0,
  onSeedPlanted,
  className = '',
  showPlantButton = true,
  maxTrees = 8,
}) => {
  // State
  const [seedCount, setSeedCount] = useState(initialSeedCount);
  const [availablePaths, setAvailablePaths] = useState<AvailableSkillPath[]>([]);
  const [canPlant, setCanPlant] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPath, setSelectedPath] = useState<AvailableSkillPath | null>(null);
  const [isPlanting, setIsPlanting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load seed count and available paths
  useEffect(() => {
    async function loadSeedData() {
      if (!userId) return;
      
      try {
        const [count, paths, hasSpace] = await Promise.all([
          getSeedCount(userId),
          getAvailableSkillPaths(userId),
          canPlantTree(userId, maxTrees),
        ]);
        
        setSeedCount(count);
        setAvailablePaths(paths);
        setCanPlant(hasSpace && count > 0);
      } catch (err) {
        console.error('[SeedInventory] Failed to load seed data:', err);
      }
    }
    
    loadSeedData();
  }, [userId, maxTrees]);

  // Handle planting a seed
  const handlePlantSeed = useCallback(async (path: AvailableSkillPath) => {
    if (!userId || isPlanting) return;
    
    setIsPlanting(true);
    setError(null);
    
    try {
      const result = await plantSeed(userId, path.id, { x: 0, y: 0 });
      
      if (result.success) {
        setSeedCount(result.remainingSeeds);
        setShowPicker(false);
        setSelectedPath(null);
        
        // Update available paths
        setAvailablePaths(prev => prev.filter(p => p.id !== path.id));
        
        // Notify parent
        if (result.tree && onSeedPlanted) {
          onSeedPlanted(result.tree.id, path.id);
        }
      } else {
        setError(result.error || 'Failed to plant seed');
      }
    } catch (err) {
      console.error('[SeedInventory] Plant seed error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsPlanting(false);
    }
  }, [userId, isPlanting, onSeedPlanted]);

  return (
    <div className={`seed-inventory ${className}`}>
      {/* Seed count display */}
      <motion.div
        className="seed-count-display"
        initial={false}
        animate={{ scale: seedCount > 0 ? [1, 1.05, 1] : 1 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, #D1FAE5, #6EE7B7)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <motion.span
          variants={seedIconVariants}
          initial="idle"
          whileHover="hover"
          style={{ fontSize: '1.25rem' }}
        >
          🌱
        </motion.span>
        <span
          style={{
            fontFamily: "'Lilita One', sans-serif",
            fontSize: '1.125rem',
            color: '#065F46',
          }}
        >
          {seedCount}
        </span>
      </motion.div>

      {/* Plant seed button */}
      {showPlantButton && (
        <motion.button
          className="plant-seed-btn"
          disabled={!canPlant || seedCount === 0}
          onClick={() => setShowPicker(true)}
          whileHover={canPlant && seedCount > 0 ? { scale: 1.02 } : {}}
          whileTap={canPlant && seedCount > 0 ? { scale: 0.98 } : {}}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontFamily: "'Lilita One', sans-serif",
            fontSize: '0.875rem',
            cursor: canPlant && seedCount > 0 ? 'pointer' : 'not-allowed',
            opacity: canPlant && seedCount > 0 ? 1 : 0.5,
            background: canPlant && seedCount > 0
              ? 'linear-gradient(135deg, #34D399, #10B981)'
              : '#D1D5DB',
            color: '#fff',
            boxShadow: canPlant && seedCount > 0
              ? '0 2px 0 #047857'
              : 'none',
          }}
        >
          Plant Seed
        </motion.button>
      )}

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: '#FEE2E2',
              color: '#DC2626',
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seed picker modal */}
      <AnimatePresence>
        {showPicker && (
          <SeedPicker
            paths={availablePaths}
            seedsAvailable={seedCount}
            onSelect={(path) => {
              setSelectedPath(path);
              handlePlantSeed(path);
            }}
            onClose={() => setShowPicker(false)}
            isPlanting={isPlanting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// SEED PICKER MODAL
// ============================================

/**
 * Props for SeedPicker modal.
 */
interface SeedPickerProps {
  paths: AvailableSkillPath[];
  seedsAvailable: number;
  onSelect: (path: AvailableSkillPath) => void;
  onClose: () => void;
  isPlanting: boolean;
}

/**
 * SeedPicker - Modal for selecting a skill path to plant.
 */
const SeedPicker: React.FC<SeedPickerProps> = ({
  paths,
  seedsAvailable,
  onSelect,
  onClose,
  isPlanting,
}) => {
  // Group paths by category
  const pathsByCategory = paths.reduce((acc, path) => {
    if (!acc[path.category]) {
      acc[path.category] = [];
    }
    acc[path.category].push(path);
    return acc;
  }, {} as Record<string, AvailableSkillPath[]>);

  return (
    <motion.div
      className="seed-picker-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <motion.div
        className="seed-picker"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '1rem',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}
          >
            🌱
          </motion.div>
          <h2
            style={{
              fontFamily: "'Lilita One', sans-serif",
              fontSize: '1.5rem',
              color: '#047857',
              margin: 0,
            }}
          >
            Plant a New Skill Path
          </h2>
          <p
            style={{
              color: '#6B7280',
              fontSize: '0.875rem',
              marginTop: '0.25rem',
            }}
          >
            {seedsAvailable} seed{seedsAvailable !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* No seeds message */}
        {seedsAvailable === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: '#FEF3C7',
              borderRadius: '0.5rem',
              color: '#92400E',
            }}
          >
            <p style={{ margin: 0 }}>
              No seeds available! Complete a skill path to earn more.
            </p>
          </div>
        )}

        {/* No paths message */}
        {seedsAvailable > 0 && paths.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: '#DBEAFE',
              borderRadius: '0.5rem',
              color: '#1E40AF',
            }}
          >
            <p style={{ margin: 0 }}>
              You already have all skill paths! Check back later for new content.
            </p>
          </div>
        )}

        {/* Paths list by category */}
        {seedsAvailable > 0 && paths.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(pathsByCategory).map(([category, categoryPaths]) => (
              <div key={category}>
                <h3
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.5rem',
                  }}
                >
                  {category}
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {categoryPaths.map((path) => (
                    <motion.button
                      key={path.id}
                      onClick={() => onSelect(path)}
                      disabled={isPlanting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.75rem',
                        border: '2px solid #E5E7EB',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                        {path.icon}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lilita One', sans-serif",
                          fontSize: '0.875rem',
                          color: '#374151',
                          marginBottom: '0.125rem',
                        }}
                      >
                        {path.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#9CA3AF',
                        }}
                      >
                        {path.lessonCount} lessons
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={onClose}
          disabled={isPlanting}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: '#F3F4F6',
            color: '#6B7280',
            fontFamily: "'Lilita One', sans-serif",
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {isPlanting ? 'Planting...' : 'Cancel'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default SeedInventory;
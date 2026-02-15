/**
 * MiniTree Component
 * 
 * A small SVG-based tree visualization that displays tree health
 * across 5 distinct visual stages. Used in the Path View to show
 * the health of completed lessons.
 * 
 * Health Stages:
 * - 0%: Empty plot/seed
 * - 1-30%: Bare branches, brown coloring
 * - 31-60%: Some leaves, yellowing
 * - 61-85%: Healthy, full leaves
 * - 86-100%: Full bloom, pink blossoms
 * 
 * @module MiniTree
 */

import React from 'react';

/**
 * Props for the MiniTree component
 */
export interface MiniTreeProps {
  /** Tree health percentage (0-100) */
  health: number;
  /** Size in pixels (default: 80) */
  size?: number;
  /** Whether to show the pot (default: true) */
  showPot?: boolean;
}

/**
 * MiniTree Component
 * 
 * Renders a small tree SVG that changes appearance based on health.
 * The tree has 5 visual stages from empty plot to full bloom.
 * 
 * @param props - Component props
 * @param props.health - Health percentage (0-100)
 * @param props.size - Size in pixels (default: 80)
 * @param props.showPot - Whether to show the pot (default: true)
 * @returns SVG element representing the tree
 * 
 * @example
 * // Healthy tree
 * <MiniTree health={90} size={60} />
 * 
 * @example
 * // Struggling tree without pot
 * <MiniTree health={25} size={40} showPot={false} />
 */
export const MiniTree: React.FC<MiniTreeProps> = ({
  health,
  size = 80,
  showPot = true,
}) => {
  // Clamp health to valid range
  const clampedHealth = Math.max(0, Math.min(100, health));
  
  // Determine stage based on health
  // Stage 0: 0% (empty/seed)
  // Stage 1: 1-30% (bare branches)
  // Stage 2: 31-60% (some leaves, yellowing)
  // Stage 3: 61-85% (healthy, full leaves)
  // Stage 4: 86-100% (full bloom, pink blossoms)
  let stage: number;
  if (clampedHealth === 0) {
    stage = 0;
  } else if (clampedHealth < 31) {
    stage = 1;
  } else if (clampedHealth < 61) {
    stage = 2;
  } else if (clampedHealth < 86) {
    stage = 3;
  } else {
    stage = 4;
  }

  // Leaf colors for each stage (getting progressively healthier)
  const leafColors = [
    '#D4B896', // Stage 0: Dirt/empty
    '#E8C07A', // Stage 1: Brown/bare
    '#FFD4A8', // Stage 2: Yellowing
    '#FFB7C5', // Stage 3: Light green/pink
    '#FF91A4', // Stage 4: Pink blossoms
  ];
  
  // Leaf opacity for each stage
  const leafOpacities = [0.3, 0.4, 0.6, 0.8, 0.95];
  
  const leafColor = leafColors[stage];
  const leafOpacity = leafOpacities[stage];
  
  // Height of the SVG (extra height for pot if shown)
  const viewBoxHeight = showPot ? 92 : 75;
  const height = showPot ? size * 1.15 : size;

  return (
    <svg
      viewBox={`0 0 80 ${viewBoxHeight}`}
      width={size}
      height={height}
      role="img"
      aria-label={`Tree at ${clampedHealth}% health`}
    >
      {/* Pot - only shown if showPot is true */}
      {showPot && (
        <>
          {/* Pot body */}
          <path
            d="M28 76 L32 88 L48 88 L52 76 Z"
            fill="#C2855A"
          />
          {/* Pot rim */}
          <rect
            x={25}
            y={72}
            width={30}
            height={6}
            rx={3}
            fill="#A66B42"
          />
        </>
      )}

      {/* Tree trunk - only shown if stage 1 or higher */}
      {stage >= 1 && (
        <line
          x1="40"
          y1={showPot ? 72 : 85}
          x2="40"
          y2={stage <= 1 ? 58 : 30}
          stroke="#8B7355"
          strokeWidth={stage <= 1 ? 3 : 5}
          strokeLinecap="round"
        />
      )}

      {/* Branches - only shown if stage 2 or higher */}
      {stage >= 2 && (
        <>
          <line
            x1="40"
            y1="45"
            x2="25"
            y2="35"
            stroke="#7D6040"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="40"
            y1="40"
            x2="58"
            y2="30"
            stroke="#7D6040"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="40"
            y1="35"
            x2="22"
            y2="22"
            stroke="#7D6040"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="40"
            y1="30"
            x2="56"
            y2="18"
            stroke="#7D6040"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Leaves/foliage - circles that change based on stage */}
      {stage >= 1 && (
        <>
          {/* Central/main foliage */}
          <circle
            cx={40}
            cy={stage <= 1 ? 52 : 25}
            r={stage <= 1 ? 8 : 12}
            fill={leafColor}
            opacity={leafOpacity}
          />
          
          {/* Additional foliage for stages 2+ */}
          {stage >= 2 && (
            <>
              <circle cx={25} cy={30} r={11} fill={leafColor} opacity={leafOpacity} />
              <circle cx={58} cy={25} r={10} fill={leafColor} opacity={leafOpacity} />
              <circle cx={22} cy={17} r={10} fill={leafColor} opacity={leafOpacity} />
              <circle cx={56} cy={13} r={9} fill={leafColor} opacity={leafOpacity} />
              <circle cx={40} cy={18} r={11} fill={leafColor} opacity={leafOpacity} />
            </>
          )}
        </>
      )}

      {/* Empty plot indicator - shown when stage is 0 */}
      {stage === 0 && (
        <ellipse
          cx={40}
          cy={68}
          rx={5}
          ry={3.5}
          fill="#A67C52"
          opacity={0.6}
        />
      )}
    </svg>
  );
};

export default MiniTree;
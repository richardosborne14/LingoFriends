/**
 * FriendGifts Component
 * 
 * Displays the user's gift inbox - pending gifts received from friends.
 * Shows gift details, sender info, and allows applying or declining gifts.
 * 
 * Part of the social features in Task 1.1.11 (Gift System).
 * 
 * @module FriendGifts
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserTree, GiftType } from '../../types/game';
import { 
  GIFT_CONFIGS, 
  getPendingGifts, 
  applyGift, 
  declineGift,
  formatGiftDate,
  type GiftWithSender 
} from '../../services/giftService';

// ============================================
// TYPES
// ============================================

/**
 * Props for FriendGifts component.
 */
export interface FriendGiftsProps {
  /** Current user's ID */
  userId: string;
  /** User's trees (for applying gifts) */
  trees: UserTree[];
  /** Callback when gifts are updated */
  onRefresh?: () => void;
  /** Optional: Whether to show compact view */
  compact?: boolean;
}

/**
 * Props for the apply gift modal.
 */
interface ApplyGiftModalProps {
  gift: GiftWithSender;
  trees: UserTree[];
  onApply: (treeId: string) => void;
  onClose: () => void;
  isApplying: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

import type { Variants } from 'framer-motion';

const listVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Modal for selecting which tree to apply a gift to.
 */
const ApplyGiftModal: React.FC<ApplyGiftModalProps> = ({
  gift,
  trees,
  onApply,
  onClose,
  isApplying,
}) => {
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const config = GIFT_CONFIGS[gift.type];
  
  return (
    <motion.div
      variants={modalVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <motion.div
        className="max-w-[320px] w-full rounded-2xl p-5 shadow-xl"
        style={{ backgroundColor: '#fff' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h3 
          className="text-center text-lg font-bold mb-4"
          style={{ 
            fontFamily: "'Lilita One', sans-serif",
            color: '#334155',
          }}
        >
          Apply Gift to Tree
        </h3>
        
        {/* Gift info */}
        <div 
          className="flex items-center gap-3 p-3 rounded-xl mb-4"
          style={{ backgroundColor: '#F8FAFC' }}
        >
          <span className="text-4xl">{config?.emoji}</span>
          <div>
            <div className="font-bold text-sm" style={{ color: '#334155' }}>
              {config?.name}
            </div>
            {config?.bufferDays ? (
              <div className="text-xs" style={{ color: '#10B981' }}>
                +{config.bufferDays} days protection
              </div>
            ) : (
              <div className="text-xs" style={{ color: '#64748B' }}>
                Decoration
              </div>
            )}
          </div>
        </div>
        
        {/* Tree selection */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#475569' }}
          >
            Select a tree:
          </label>
          
          {trees.length === 0 ? (
            <div 
              className="text-center py-4 rounded-xl text-sm"
              style={{ 
                color: '#64748B',
                backgroundColor: '#F8FAFC',
              }}
            >
              <span className="text-2xl block mb-2">🌳</span>
              No trees yet!
              <br />
              <span className="text-xs">
                Start a skill path to grow a tree.
              </span>
            </div>
          ) : (
            <div 
              className="max-h-[150px] overflow-y-auto rounded-xl border"
              style={{ borderColor: '#E2E8F0' }}
            >
              {trees.map((tree, index) => (
                <button
                  key={tree.id}
                  onClick={() => setSelectedTreeId(tree.id)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                  style={{
                    backgroundColor: selectedTreeId === tree.id 
                      ? '#F0F9FF'
                      : 'transparent',
                    borderBottom: index < trees.length - 1 
                      ? '1px solid #E2E8F0' 
                      : 'none',
                  }}
                >
                  <span className="text-2xl">{tree.icon || '🌳'}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: '#334155' }}>
                      {tree.name}
                    </div>
                    <div className="text-xs" style={{ color: '#64748B' }}>
                      Health: {tree.health}%
                    </div>
                  </div>
                  {selectedTreeId === tree.id && (
                    <span className="text-sky-500">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            disabled={isApplying}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm"
            style={{
              backgroundColor: '#F1F5F9',
              color: '#64748B',
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => selectedTreeId && onApply(selectedTreeId)}
            disabled={!selectedTreeId || isApplying}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm"
            style={{
              background: selectedTreeId && !isApplying
                ? 'linear-gradient(135deg, #34D399, #10B981)'
                : '#E2E8F0',
              color: selectedTreeId && !isApplying ? '#fff' : '#94A3B8',
              boxShadow: selectedTreeId && !isApplying 
                ? '0 4px 0 #047857'
                : 'none',
            }}
          >
            {isApplying ? 'Applying...' : 'Apply Gift'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Single gift card component.
 */
const GiftCard: React.FC<{
  gift: GiftWithSender;
  onApply: () => void;
  onDecline: () => void;
}> = ({ gift, onApply, onDecline }) => {
  const config = GIFT_CONFIGS[gift.type];
  
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl p-4"
      style={{ 
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Gift emoji */}
        <span className="text-4xl">{config?.emoji || '🎁'}</span>
        
        {/* Gift info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: '#334155' }}>
            {config?.name || 'Gift'}
          </div>
          <div className="text-xs" style={{ color: '#64748B' }}>
            From {gift.fromUserName}
          </div>
          <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
            {formatGiftDate(gift.sentAt)}
          </div>
          
          {/* Message if present */}
          {gift.message && (
            <div 
              className="mt-2 text-xs italic px-2 py-1 rounded"
              style={{ 
                color: '#475569',
                backgroundColor: 'rgba(0,0,0,0.03)',
              }}
            >
              "{gift.message}"
            </div>
          )}
          
          {/* Effect badge */}
          {config?.bufferDays ? (
            <div 
              className="mt-2 text-xs px-2 py-1 rounded-full inline-block"
              style={{ 
                backgroundColor: '#DCFCE7', // green-100
                color: '#16A34A', // green-600
              }}
            >
              🌿 +{config.bufferDays} days protection
            </div>
          ) : config?.isDecoration ? (
            <div 
              className="mt-2 text-xs px-2 py-1 rounded-full inline-block"
              style={{ 
                backgroundColor: '#FDF4FF', // fuchsia-50
                color: '#A855F7', // fuchsia-500
              }}
            >
              ✨ Decoration
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onApply}
          className="flex-1 py-2 px-3 rounded-lg font-medium text-xs"
          style={{
            background: 'linear-gradient(135deg, #34D399, #10B981)',
            color: '#fff',
          }}
        >
          Apply
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onDecline}
          className="py-2 px-3 rounded-lg font-medium text-xs"
          style={{
            backgroundColor: '#F1F5F9',
            color: '#64748B',
          }}
        >
          ✕
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * FriendGifts - Gift inbox showing received gifts.
 * 
 * @example
 * <FriendGifts
 *   userId={currentUser.id}
 *   trees={userTrees}
 *   onRefresh={() => refetchGifts()}
 * />
 */
export const FriendGifts: React.FC<FriendGiftsProps> = ({
  userId,
  trees,
  onRefresh,
  compact = false,
}) => {
  // State
  const [gifts, setGifts] = useState<GiftWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<GiftWithSender | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  
  // Load gifts on mount
  useEffect(() => {
    loadGifts();
  }, [userId]);
  
  const loadGifts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const pendingGifts = await getPendingGifts(userId);
      setGifts(pendingGifts);
    } catch (err) {
      console.error('[FriendGifts] Failed to load gifts:', err);
      setError('Could not load gifts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle apply gift
  const handleApply = async (treeId: string) => {
    if (!selectedGift) return;
    
    setIsApplying(true);
    try {
      await applyGift(selectedGift.id, treeId);
      setSelectedGift(null);
      loadGifts();
      onRefresh?.();
    } catch (err) {
      console.error('[FriendGifts] Failed to apply gift:', err);
      setError('Failed to apply gift. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };
  
  // Handle decline gift
  const handleDecline = async (giftId: string) => {
    if (!confirm('Decline this gift? It will be removed.')) return;
    
    try {
      await declineGift(giftId);
      loadGifts();
      onRefresh?.();
    } catch (err) {
      console.error('[FriendGifts] Failed to decline gift:', err);
      setError('Failed to decline gift. Please try again.');
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🎁</div>
        <div className="text-sm" style={{ color: '#64748B' }}>
          Loading gifts...
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div 
        className="text-center py-8 rounded-xl p-4"
        style={{ backgroundColor: '#FEF2F2' }}
      >
        <div className="text-4xl mb-2">😕</div>
        <div className="text-sm" style={{ color: '#DC2626' }}>
          {error}
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={loadGifts}
          className="mt-3 py-2 px-4 rounded-lg font-medium text-sm"
          style={{
            backgroundColor: '#fff',
            color: '#DC2626',
            border: '1px solid #DC2626',
          }}
        >
          Try Again
        </motion.button>
      </div>
    );
  }
  
  // Empty state
  if (gifts.length === 0) {
    return (
      <div 
        className="text-center py-8 rounded-xl"
        style={{ backgroundColor: '#F8FAFC' }}
      >
        <span className="text-4xl">📭</span>
        <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
          No gifts yet
        </p>
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          Keep learning to earn gifts for friends!
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <h3 
            className="font-bold"
            style={{ 
              fontFamily: "'Lilita One', sans-serif",
              fontSize: '1.25rem',
              color: '#334155',
            }}
          >
            🎁 Gifts from Friends ({gifts.length})
          </h3>
        </div>
      )}
      
      {/* Gift list */}
      <motion.div
        variants={listVariants}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        <AnimatePresence>
          {gifts.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              onApply={() => setSelectedGift(gift)}
              onDecline={() => handleDecline(gift.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      
      {/* Apply modal */}
      <AnimatePresence>
        {selectedGift && (
          <ApplyGiftModal
            gift={selectedGift}
            trees={trees}
            onApply={handleApply}
            onClose={() => setSelectedGift(null)}
            isApplying={isApplying}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default FriendGifts;
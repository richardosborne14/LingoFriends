/**
 * SendGift Component
 * 
 * Modal for sending a gift to a friend.
 * Shows the gift, allows friend selection, and optional message.
 * 
 * Part of the social features in Task 1.1.11 (Gift System).
 * 
 * @module SendGift
 * @see docs/phase-1.1/task-1-1-11-gift-system.md
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GiftItem, GiftType } from '../../types/game';
import { 
  GIFT_CONFIGS, 
  getGiftEmoji, 
  getGiftName,
  getFriends,
  sendGift,
  type FriendInfo 
} from '../../services/giftService';

// ============================================
// TYPES
// ============================================

/**
 * Props for SendGift component.
 */
export interface SendGiftProps {
  /** The gift to send */
  gift: GiftItem;
  /** Current user's ID */
  userId: string;
  /** Callback when gift is sent successfully */
  onSent: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

import type { Variants } from 'framer-motion';

const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, y: 20, scale: 0.95 },
};

const itemVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
};

// ============================================
// COMPONENT
// ============================================

/**
 * SendGift - Modal for sending a gift to a friend.
 * 
 * @example
 * <SendGift
 *   gift={selectedGift}
 *   userId={currentUser.id}
 *   onSent={() => {
 *     showToast('Gift sent!');
 *     setShowSendModal(false);
 *   }}
 *   onCancel={() => setShowSendModal(false)}
 * />
 */
export const SendGift: React.FC<SendGiftProps> = ({
  gift,
  userId,
  onSent,
  onCancel,
}) => {
  // State
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gift config
  const config = GIFT_CONFIGS[gift.type];
  
  // Load friends on mount
  useEffect(() => {
    async function loadFriends() {
      setIsLoading(true);
      try {
        const friendList = await getFriends(userId);
        setFriends(friendList);
      } catch (err) {
        console.error('[SendGift] Failed to load friends:', err);
        setError('Could not load friends. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadFriends();
  }, [userId]);
  
  // Handle send
  const handleSend = async () => {
    if (!selectedFriendId) return;
    
    setIsSending(true);
    setError(null);
    
    try {
      await sendGift(userId, selectedFriendId, gift.id, message || undefined);
      onSent();
    } catch (err) {
      console.error('[SendGift] Failed to send gift:', err);
      setError('Failed to send gift. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  // Get selected friend name
  const selectedFriend = friends.find(f => f.id === selectedFriendId);
  
  return (
    <motion.div
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <motion.div
        variants={modalVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="max-w-[320px] w-full rounded-2xl p-5 shadow-xl"
        style={{ backgroundColor: '#fff' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <h3 
          className="text-center text-xl font-bold mb-4"
          style={{ 
            fontFamily: "'Lilita One', sans-serif",
            color: '#334155', // slate-700
          }}
        >
          Send Gift to Friend
        </h3>
        
        {/* Gift Preview */}
        <div 
          className="flex items-center gap-3 p-3 rounded-xl mb-4"
          style={{ backgroundColor: '#F8FAFC' }} // slate-50
        >
          <span className="text-4xl">{config?.emoji || '🎁'}</span>
          <div>
            <div className="font-bold text-sm" style={{ color: '#334155' }}>
              {config?.name || 'Gift'}
            </div>
            <div className="text-xs" style={{ color: '#64748B' }}>
              {config?.description}
            </div>
          </div>
        </div>
        
        {/* Friends List */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#475569' }} // slate-600
          >
            Select a friend:
          </label>
          
          {isLoading ? (
            <div className="text-center py-4 text-sm" style={{ color: '#64748B' }}>
              Loading friends...
            </div>
          ) : friends.length === 0 ? (
            <div 
              className="text-center py-4 rounded-xl text-sm"
              style={{ 
                color: '#64748B',
                backgroundColor: '#F8FAFC',
              }}
            >
              <span className="text-2xl block mb-2"> 👥</span>
              No friends yet!
              <br />
              <span className="text-xs">
                Add friends to send them gifts.
              </span>
            </div>
          ) : (
            <div 
              className="max-h-[150px] overflow-y-auto rounded-xl border"
              style={{ borderColor: '#E2E8F0' }} // slate-200
            >
              {friends.map((friend, index) => (
                <motion.button
                  key={friend.id}
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedFriendId(friend.id)}
                  className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                  style={{
                    backgroundColor: selectedFriendId === friend.id 
                      ? '#F0F9FF' // sky-50
                      : 'transparent',
                    borderBottom: index < friends.length - 1 
                      ? '1px solid #E2E8F0' 
                      : 'none',
                  }}
                >
                  <span className="text-2xl">
                    {friend.avatar || '👤'}
                  </span>
                  <span 
                    className="font-medium text-sm"
                    style={{ color: '#334155' }}
                  >
                    {friend.username}
                  </span>
                  {selectedFriendId === friend.id && (
                    <span className="ml-auto text-sky-500">✓</span>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
        
        {/* Optional Message */}
        <div className="mb-4">
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: '#475569' }}
          >
            Add a message (optional):
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write something nice..."
            maxLength={100}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
            style={{ 
              borderColor: '#E2E8F0',
              color: '#334155',
            }}
          />
          <div 
            className="text-right text-xs mt-1"
            style={{ color: '#94A3B8' }}
          >
            {message.length}/100
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div 
            className="mb-4 p-3 rounded-xl text-sm text-center"
            style={{ 
              backgroundColor: '#FEF2F2', // red-50
              color: '#DC2626', // red-600
            }}
          >
            {error}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            disabled={isSending}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm"
            style={{
              backgroundColor: '#F1F5F9', // slate-100
              color: '#64748B', // slate-500
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSend}
            disabled={!selectedFriendId || isSending}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm"
            style={{
              background: selectedFriendId && !isSending
                ? 'linear-gradient(135deg, #34D399, #10B981)' // green-400 to green-500
                : '#E2E8F0', // slate-200 (disabled)
              color: selectedFriendId && !isSending ? '#fff' : '#94A3B8',
              boxShadow: selectedFriendId && !isSending 
                ? '0 4px 0 #047857' // green-700
                : 'none',
            }}
          >
            {isSending ? 'Sending...' : 'Send Gift 💌'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SendGift;
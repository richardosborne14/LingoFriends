# Task 1.1.11: Gift System

**Status:** Not Started
**Phase:** C (Social & Rewards)
**Dependencies:** Task 1.1.7 (Pocketbase Schema), Task 1.1.8 (Garden State)
**Estimated Time:** 5-6 hours

---

## Objective

Implement the gift system that allows players to earn and send gifts to friends. Gifts help trees stay healthy and add a social layer to the garden experience.

---

## Deliverables

### Files to Create
- `src/services/giftService.ts` — Gift creation, sending, receiving
- `src/components/social/GiftUnlock.tsx` — Gift unlock animation
- `src/components/social/SendGift.tsx` — Gift sending modal
- `src/components/social/FriendGifts.tsx` — Inbox of received gifts

---

## Gift Types & Effects

| Gift | Effect | Unlock Condition |
|------|--------|------------------|
| 💧 Water Drop | +10 days buffer on tree health | Complete any lesson |
| ✨ Sparkle | Cosmetic + 5 days buffer | Earn 20+ Sun Drops in lesson |
| 🌱 Seed | Start a new skill path | Complete all lessons in a path |
| 🎀 Ribbon | Tree decoration | Complete 3 lessons same day |
| 🌸 Golden Flower | Rare decoration + 15 days buffer | Get 3 stars on lesson |

---

## Gift Service

### Interface

```typescript
// src/services/giftService.ts

import type { GiftType, GiftItem } from '@/types/game';

interface GiftService {
  // Unlock
  checkGiftUnlock(result: LessonResult): GiftType | null;
  
  // Sending
  sendGift(toUserId: string, giftType: GiftType, treeId?: string): Promise<GiftItem>;
  getAvailableGifts(userId: string): Promise<GiftItem[]>;
  
  // Receiving
  getPendingGifts(userId: string): Promise<GiftItem[]>;
  applyGift(giftId: string, treeId: string): Promise<void>;
  declineGift(giftId: string): Promise<void>;
}
```

### Implementation

```typescript
// src/services/giftService.ts

import { pocketbaseService } from './pocketbaseService';
import type { GiftType, GiftItem, LessonResult } from '@/types/game';

/** Gift unlock rules */
const GIFT_UNLOCK_RULES: Array<{
  type: GiftType;
  condition: (result: LessonResult) => boolean;
}> = [
  {
    type: 'golden_flower',
    condition: (r) => r.stars === 3,
  },
  {
    type: 'sparkle',
    condition: (r) => r.sunDropsEarned >= 20,
  },
  {
    type: 'ribbon',
    condition: (r) => true, // Every lesson gives ribbon chance
  },
  {
    type: 'water_drop',
    condition: (r) => true, // Every lesson gives water drop
  },
];

/** Gift effects on tree health */
export const GIFT_EFFECTS: Record<GiftType, { bufferDays: number; isDecoration: boolean }> = {
  water_drop: { bufferDays: 10, isDecoration: false },
  sparkle: { bufferDays: 5, isDecoration: false },
  seed: { bufferDays: 0, isDecoration: false },
  ribbon: { bufferDays: 0, isDecoration: true },
  golden_flower: { bufferDays: 15, isDecoration: true },
};

/**
 * Check if a lesson result unlocks a gift.
 * Returns the highest-tier gift unlocked.
 */
export function checkGiftUnlock(result: LessonResult): GiftType | null {
  for (const rule of GIFT_UNLOCK_RULES) {
    if (rule.condition(result)) {
      return rule.type;
    }
  }
  return null;
}

/**
 * Create a gift in user's inventory.
 */
export async function createGift(userId: string, type: GiftType): Promise<GiftItem> {
  const gift = await pocketbaseService.create('gifts', {
    type,
    fromUser: userId, // Creator is also initial owner
    toUser: null,
    unlockedAt: new Date().toISOString(),
    sentAt: null,
    appliedAt: null,
  });
  
  return gift;
}

/**
 * Send a gift to a friend.
 */
export async function sendGift(
  fromUserId: string,
  toUserId: string,
  giftId: string,
  message?: string
): Promise<GiftItem> {
  const gift = await pocketbaseService.update('gifts', giftId, {
    fromUser: fromUserId,
    toUser: toUserId,
    sentAt: new Date().toISOString(),
    message: message || '',
  });
  
  return gift;
}

/**
 * Get gifts available to send.
 */
export async function getAvailableGifts(userId: string): Promise<GiftItem[]> {
  const gifts = await pocketbaseService.getList('gifts', {
    filter: `fromUser = "${userId}" && sentAt = null`,
  });
  
  return gifts;
}

/**
 * Get pending gifts received.
 */
export async function getPendingGifts(userId: string): Promise<GiftItem[]> {
  const gifts = await pocketbaseService.getList('gifts', {
    filter: `toUser = "${userId}" && appliedAt = null`,
  });
  
  return gifts;
}

/**
 * Apply a gift to a tree.
 */
export async function applyGift(giftId: string, treeId: string): Promise<void> {
  const gift = await pocketbaseService.get('gifts', giftId);
  
  // Update gift
  await pocketbaseService.update('gifts', giftId, {
    appliedAt: new Date().toISOString(),
    toItem: treeId,
  });
  
  // If decoration, add to tree
  if (GIFT_EFFECTS[gift.type as GiftType]?.isDecoration) {
    const tree = await pocketbaseService.get('user_trees', treeId);
    await pocketbaseService.update('user_trees', treeId, {
      decorations: [...(tree.decorations || []), giftId],
    });
  }
}

/**
 * Decline a gift (delete it).
 */
export async function declineGift(giftId: string): Promise<void> {
  await pocketbaseService.delete('gifts', giftId);
}
```

---

## GiftUnlock Component

```typescript
// src/components/social/GiftUnlock.tsx

import { motion, AnimatePresence } from 'framer-motion';
import type { GiftType } from '@/types/game';
import { GIFT_EFFECTS } from '@/services/giftService';

interface GiftUnlockProps {
  giftType: GiftType;
  onDismiss: () => void;
}

const GIFT_INFO: Record<GiftType, { name: string; description: string; emoji: string }> = {
  water_drop: {
    name: 'Water Drop',
    description: 'Keep a friend\'s tree alive!',
    emoji: '💧',
  },
  sparkle: {
    name: 'Sparkle',
    description: 'Add some magic to a tree!',
    emoji: '✨',
  },
  seed: {
    name: 'Seed',
    description: 'Start a new skill path!',
    emoji: '🌱',
  },
  ribbon: {
    name: 'Ribbon',
    description: 'Decorate your tree!',
    emoji: '🎀',
  },
  golden_flower: {
    name: 'Golden Flower',
    description: 'A rare gift for a special friend!',
    emoji: '🌸',
  },
};

export function GiftUnlock({ giftType, onDismiss }: GiftUnlockProps) {
  const info = GIFT_INFO[giftType];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="gift-unlock-overlay"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="gift-unlock-card"
      >
        <div className="gift-unlock-header">
          🎁 Gift Unlocked!
        </div>
        
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="gift-unlock-emoji"
        >
          {info.emoji}
        </motion.div>
        
        <h2 className="gift-unlock-name">{info.name}</h2>
        <p className="gift-unlock-description">{info.description}</p>
        
        <div className="gift-unlock-actions">
          <button onClick={onDismiss} className="btn-secondary">
            Keep for Later
          </button>
          <button onClick={onDismiss} className="btn-primary">
            Send to Friend 💌
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## SendGift Component

```typescript
// src/components/social/SendGift.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { GiftItem, Friend } from '@/types/game';

interface SendGiftProps {
  gift: GiftItem;
  friends: Friend[];
  onSend: (friendId: string, message?: string) => void;
  onCancel: () => void;
}

export function SendGift({ gift, friends, onSend, onCancel }: SendGiftProps) {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  return (
    <div className="send-gift-modal">
      <h3>Send Gift to Friend</h3>
      
      <div className="gift-preview">
        <span className="gift-emoji">{getGiftEmoji(gift.type)}</span>
        <span className="gift-name">{getGiftName(gift.type)}</span>
      </div>
      
      <div className="friends-list">
        {friends.map(friend => (
          <button
            key={friend.id}
            className={`friend-option ${selectedFriend === friend.id ? 'selected' : ''}`}
            onClick={() => setSelectedFriend(friend.id)}
          >
            <span className="friend-avatar">{friend.avatar}</span>
            <span className="friend-name">{friend.username}</span>
          </button>
        ))}
      </div>
      
      <textarea
        placeholder="Add a message (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={100}
      />
      
      <div className="actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => selectedFriend && onSend(selectedFriend, message)}
          disabled={!selectedFriend}
          className="btn-primary"
        >
          Send Gift 💌
        </button>
      </div>
    </div>
  );
}
```

---

## FriendGifts Component

```typescript
// src/components/social/FriendGifts.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GiftItem, UserTree } from '@/types/game';
import { applyGift, declineGift } from '@/services/giftService';

interface FriendGiftsProps {
  gifts: GiftItem[];
  trees: UserTree[];
  onRefresh: () => void;
}

export function FriendGifts({ gifts, trees, onRefresh }: FriendGiftsProps) {
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  
  const handleApplyGift = async (treeId: string) => {
    if (!selectedGift) return;
    
    await applyGift(selectedGift.id, treeId);
    setSelectedGift(null);
    onRefresh();
  };
  
  if (gifts.length === 0) {
    return (
      <div className="no-gifts">
        <span className="empty-icon">📭</span>
        <p>No gifts yet. Keep learning to earn gifts for friends!</p>
      </div>
    );
  }
  
  return (
    <div className="friend-gifts">
      <h3>🎁 Gifts from Friends ({gifts.length})</h3>
      
      <div className="gifts-grid">
        {gifts.map(gift => (
          <motion.div
            key={gift.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gift-card"
          >
            <span className="gift-emoji">{getGiftEmoji(gift.type)}</span>
            <span className="gift-from">From {gift.fromUserName}</span>
            <span className="gift-date">{formatDate(gift.sentAt)}</span>
            
            <div className="gift-actions">
              <button
                onClick={() => setSelectedGift(gift)}
                className="btn-primary btn-small"
              >
                Apply
              </button>
              <button
                onClick={() => handleDecline(gift.id)}
                className="btn-secondary btn-small"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      
      <AnimatePresence>
        {selectedGift && (
          <ApplyGiftModal
            gift={selectedGift}
            trees={trees}
            onApply={handleApplyGift}
            onClose={() => setSelectedGift(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
  
  async function handleDecline(giftId: string) {
    if (confirm('Decline this gift?')) {
      await declineGift(giftId);
      onRefresh();
    }
  }
}
```

---

## Integration with Lesson Complete

```typescript
// In LessonComplete.tsx

import { GiftUnlock } from '@/components/social/GiftUnlock';
import { checkGiftUnlock, createGift } from '@/services/giftService';
import type { LessonResult } from '@/types/game';

function LessonComplete({ sunDropsEarned, sunDropsMax, stars, ... }: Props) {
  const [unlockedGift, setUnlockedGift] = useState<GiftType | null>(null);
  
  useEffect(() => {
    const result: LessonResult = { sunDropsEarned, sunDropsMax, stars };
    const gift = checkGiftUnlock(result);
    
    if (gift) {
      // Create gift in user's inventory
      createGift(userId, gift);
      setUnlockedGift(gift);
    }
  }, [sunDropsEarned, sunDropsMax, stars]);
  
  return (
    <div className="lesson-complete">
      {/* ... existing content ... */}
      
      <AnimatePresence>
        {unlockedGift && (
          <GiftUnlock
            giftType={unlockedGift}
            onDismiss={() => setUnlockedGift(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Testing Checklist

### Gift Unlocking
- [ ] Water drop unlocks on any lesson completion
- [ ] Sparkle unlocks on 20+ Sun Drops
- [ ] Ribbon unlocks on 3 lessons same day
- [ ] Golden flower unlocks on 3 stars
- [ ] Only highest-tier gift unlocked

### Gift Sending
- [ ] Can select friend to send to
- [ ] Can add optional message
- [ ] Gift removed from inventory after sending
- [ ] Gift appears in friend's inbox

### Gift Receiving
- [ ] Pending gifts appear in inbox
- [ ] Can apply gift to tree
- [ ] Applied gift effects tree health
- [ ] Can decline gift
- [ ] Notifications for new gifts

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Gifts unlock correctly | [ ] |
| Sending flow works | [ ] |
| Receiving flow works | [ ] |
| Applying gift affects tree | [ ] |
| UI is kid-friendly | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 10 (Gift System)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 10 (Gift System)
- `src/types/game.ts` — GiftType enum

---

## Notes for Implementation

1. Add notification when new gift received
2. Consider gift expiration (30 days?)
3. Add spam protection for gifts
4. Track gift statistics for analytics
5. Consider limiting gifts per day
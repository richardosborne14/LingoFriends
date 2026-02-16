# Task 1.1.11: Gift System (Rebalanced Reward Economy)

## Overview

The gift system has been **significantly redesigned** to create a more balanced and motivating reward economy. The key changes are:

1. **Gifts are now primarily from friends**, not automatic lesson rewards
2. **Gems** are the new earnable currency from lessons and streaks
3. **Decorations** are purchased with gems in the shop
4. **Seeds** are earned only from pathway completion (×2 for sharing)

## Currencies

### SunDrops (Existing)
- **Purpose**: Tree growth and maintenance currency
- **Cannot be spent**: Automatically applied to tree health
- **Earned from**: Lesson completion
- **Function**: Makes trees grow, maintains tree health

### Gems (NEW)
- **Purpose**: Shop currency for decorations and avatar items
- **Earned from**: Lesson performance and streaks
- **Spent in**: Garden Shop
- **Formula**: `floor(accuracy% / 20)` base gems per lesson
  - 100% accuracy = 5 gems
  - 80% accuracy = 4 gems
  - 60% accuracy = 3 gems

#### Streak Multipliers
| Streak | Multiplier |
|--------|------------|
| 3+ days | ×1.5 |
| 7+ days | ×2 |
| 14+ days | ×3 |
| 30+ days | Bonus achievement + Golden Flower chance |

#### Streak Achievements
- **3-day streak**: +5 gems
- **7-day streak**: +15 gems + Decoration
- **14-day streak**: +30 gems + Decoration
- **30-day streak**: +100 gems + Golden Flower

## Gift Types (Rebalanced)

### Friend Gifts (Sent Between Users)

| Gift | Buffer Days | How to Get |
|------|-------------|------------|
| 💧 Water Drop | 1 day | Friend gift (easy to send) |
| ✨ Sparkle | 3 days | Friend gift (uncommon) |

### Achievement/Shop Rewards

| Gift | Buffer Days | How to Get |
|------|-------------|------------|
| 🎀 Decoration | 5 days | Shop purchase (15-30 gems) |
| 🌸 Golden Flower | 10 days | Rare achievement reward |
| 🌱 Seed | 0 days | Pathway completion ×2 |

## Key Changes from Original Design

### What Changed
1. **Water Drop**: 10 days → **1 day** buffer
2. **Sparkle**: 5 days → **3 days** buffer
3. **Ribbon**: **REMOVED** → replaced by **Decoration** (shop item)
4. **Golden Flower**: 15 days → **10 days** buffer (still rare)
5. **Gifts no longer auto-unlock from lessons** - earned through achievements or friends

### Why the Changes?
- Original rewards were too generous for easy actions
- Kids were getting too many days of tree protection passively
- Want to encourage **social interaction** (sending gifts to friends)
- Want to create **meaningful choices** (spending gems in shop)
- Seeds should be **special** - only from completing pathways

## Shop Categories

### Tree Care (Affects Health)
- **Watering Can**: 🚿 15 gems, +5 days health
- **Sun Lamp**: 💡 20 gems, +5 days health
- **Magic Fertilizer**: ✨ 25 gems, +5 days health
- **Rainbow Pot**: 🌈 30 gems, +5 days health

### Garden Decorations (Cosmetic)
- **Butterfly**: 🦋 15 gems
- **Stepping Stone**: 🪨 10 gems
- **Flower Bed**: 🌷 20 gems
- **Garden Gnome**: 🗿 25 gems
- **Birdhouse**: 🏠 30 gems
- **Garden Pond**: 55 gems
- **Fountain**: ⛲ 80 gems

### Avatar Items
- **Party Hat**: 🎉 30 gems
- **Animal Avatars**: 🦊🐱🦉 50 gems each
- **Golden Crown**: 👑 100 gems

## Seed Mechanics (Pathway Completion)

### Earning Seeds
- Complete any learning pathway → **Earn 2 Seeds**
- Seeds are the only way to start new trees/paths
- Encourages pathway completion and exploration

### Sharing Seeds
- Give 1 seed to a friend who needs motivation
- Seeds become social currency for helping friends
- Creates positive peer pressure to complete pathways

## Technical Implementation

### Files Created/Modified

#### `src/services/gemService.ts` (NEW)
- `calculateGemEarning()` - Base gems from accuracy
- `getStreakMultiplier()` - Streak bonus calculation
- `getStreakAchievement()` - Achievement rewards
- `getGemBalance()` - Get user's gem count
- `addGems()` - Add gems to balance
- `spendGems()` - Spend gems on purchase
- `purchaseItem()` - Buy from shop
- `SHOP_CATALOGUE` - All purchasable items

#### `src/services/giftService.ts` (MODIFIED)
- Removed automatic gift drops from lessons
- Updated `GIFT_CONFIGS` with new buffer days
- Added achievement-based gift unlocking
- Renamed `ribbon` → `decoration`

#### `src/services/treeHealthService.ts` (MODIFIED)
- Updated `GIFT_BUFFER_DAYS` with rebalanced values
- Water Drop: 1, Sparkle: 3, Decoration: 5, Golden Flower: 10

#### `src/types/game.ts` (MODIFIED)
- Updated `GiftType` enum: removed `RIBBON`, added `DECORATION`

#### `src/types/pocketbase.ts` (MODIFIED)
- Added `gems: number` to `ProfileRecord`
- Added `seeds: number` to `ProfileRecord`

## Database Schema Changes

### profiles collection
```javascript
{
  // ... existing fields
  gems: number,    // Gem currency balance
  seeds: number,   // Seeds earned from pathways
}
```

## Testing Checklist

- [ ] Gem earning calculation with accuracy
- [ ] Streak multiplier applies correctly
- [ ] Streak achievements trigger at milestones
- [ ] Shop items can be purchased with gems
- [ ] Insufficient gems prevents purchase
- [ ] Gift buffer days are correct (1, 3, 5, 10)
- [ ] Seeds are awarded ×2 on pathway completion
- [ ] Seeds can be shared with friends

## Future Enhancements (Not in Scope)

- Gem gambling games (not kid-appropriate)
- Trading gems between users
- Limited-time shop items
- Seasonal decorations

## References

- `src/services/gemService.ts` - Gem currency system
- `src/services/giftService.ts` - Gift sending/receiving
- `src/services/treeHealthService.ts` - Health calculation with buffer days
- `docs/phase-1.1/task-1-1-17-garden-shop-ui.md` - Shop UI design
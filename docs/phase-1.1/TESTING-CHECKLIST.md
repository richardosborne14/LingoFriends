# LingoFriends Manual Testing Checklist

## Phase 1.1 Visual Testing Guide

This document provides step-by-step instructions for manually testing the LingoFriends application features implemented up to Task 1.1.11.

---

## Prerequisites

Before testing, ensure:
1. The development server is running: `npm run dev`
2. You have a test user account logged in
3. The app is accessible at `http://localhost:5173` (or similar)

---

## Test 1: Gift System - Gift Unlock Logic

### Test 1.1: Water Drop (Default Gift)
**Setup:** Complete a lesson with any score.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete any lesson with 1-2 stars, <20 Sun Drops | Gift card appears showing 💧 Water Drop |
| 2 | Check gift description | Says "Keep a friend's tree alive!" |
| 3 | Click "Send to Friend 💌" | GiftUnlock modal opens |
| 4 | Click "Awesome!" or "Keep for Later" | Modal closes, returns to lesson complete |

**Pass/Fail:** X Pass ☐ Fail

---

### Test 1.2: Sparkle Gift (20+ Sun Drops)
**Setup:** Complete a lesson earning 20+ Sun Drops.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete a lesson with 20+ Sun Drops (but <3 stars) | Gift card shows ✨ Sparkle |
| 2 | Check gift description | Says "Add some sparkle to a tree!" |
| 3 | Verify rarity styling | Blue/cool color scheme (uncommon) |

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.3: Ribbon Gift (3+ Lessons Same Day)
**Setup:** Complete 3 lessons in one session.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete 3rd lesson of the day | Gift card shows 🎀 Ribbon |
| 2 | Check gift description | Says "Decorate your tree!" |
| 3 | Verify "Decoration for your tree" badge | Shows decoration indicator |

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.4: Golden Flower (3 Stars)
**Setup:** Complete a lesson with perfect score (3 stars, 100% Sun Drops).

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete lesson with all answers correct | Gift card shows 🌸 Golden Flower |
| 2 | Check gift description | Says "A rare and special gift!" |
| 3 | Verify rarity styling | Gold/amber color scheme (legendary) |
| 4 | Check for "Adds 15 days of protection" badge | Shows buffer indicator |

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.5: Seed Gift (Path Complete)
**Setup:** Complete the final lesson in a skill path.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete final lesson of a skill path | Gift card shows 🌱 Seed |
| 2 | Check gift description | Says "Start a new skill path!" |
| 3 | Check for "Add to your garden" option | Shows seed-specific action |

**Pass/Fail:** ☐ Pass ☐ Fail

---

### Test 1.6: Gift Priority System
**Setup:** Trigger multiple gift conditions at once.

| Condition | Expected Gift | Reason |
|-----------|--------------|--------|
| 3 stars + 20+ Sun Drops | 🌸 Golden Flower | Highest priority |
| 20+ Sun Drops + 3 lessons | ✨ Sparkle | Higher priority than ribbon |
| 3 lessons + <20 Sun Drops | 🎀 Ribbon | Higher priority than water drop |
| Path complete + 2 stars | 🌱 Seed | Path complete has priority 3 |

**Test:** Complete a perfect lesson (3 stars, 25/25 Sun Drops, 3rd lesson of day, path complete)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete lesson meeting all conditions | Shows 🌸 Golden Flower (highest priority) |

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test 2: GiftUnlock Modal Component

### Test 2.1: Modal Appearance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Send to Friend" button on gift card | Modal opens with animation |
| 2 | Check gift emoji animation | Bounces up and down |
| 3 | Check modal styling | Rounded corners, colored border based on rarity |
| 4 | Verify button text | Shows "Keep for Later" and optionally "Send to Friend" |

**Pass/Fail:** ☐ Pass ☐ Fail

### Test 2.2: Modal Dismissal
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click outside the modal | Modal closes |
| 2 | Press Escape key | Modal closes |
| 3 | Click "Keep for Later" button | Modal closes |

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test 3: LessonComplete Screen Integration

### Test 3.1: Basic Lesson Completion
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete a lesson | Trophy animation plays |
| 2 | Check Sun Drops counter | Shows "X/Y Sun Drops" |
| 3 | Check star rating | Shows 1-3 stars with correct opacity |
| 4 | Check gift card appears | Shows unlocked gift |

**Pass/Fail:** ☐ Pass ☐ Fail

### Test 3.2: Navigation Buttons
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Back to Path" button | Navigates to path view |
| 2 | Complete another lesson | |
| 3 | Click "Replay 🔄" button | Restarts the lesson |

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test 4: Visual Design Checks

### Test 4.1: Kid-Friendly Color Scheme
| Element | Expected Colors | Actual |
|---------|----------------|--------|
| Trophy | 🏆 Gold emoji | ☐ Correct |
| Sun Drops | Amber/orange (#B45309) | ☐ Correct |
| Stars | Yellow ⭐ | ☐ Correct |
| Gift card background | Pink-to-blue gradient | ☐ Correct |
| Primary buttons | Pink gradient with shadow | ☐ Correct |
| Secondary buttons | Green/orange gradients | ☐ Correct |

### Test 4.2: Animation Quality
| Animation | Expected Behavior | Pass? |
|-----------|------------------|-------|
| Trophy entrance | Scale from 0 with rotation | ☐ |
| Gift card entrance | Fade in + slide up (0.4s delay) | ☐ |
| Gift emoji bounce | Continuous bounce, 2s interval | ☐ |
| Button tap | Scale down to 0.95/0.98 | ☐ |
| Modal entrance | Scale + rotate (spring) | ☐ |

### Test 4.3: Typography
| Element | Font | Pass? |
|---------|------|-------|
| "Lesson Done!" title | Lilita One | ☐ |
| Body text | System default | ☐ |
| Gift names | Bold | ☐ |
| Gift descriptions | Small, muted | ☐ |

---

## Test 5: Responsive Design

### Test 5.1: Mobile View (375px width)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to 375px | Elements stack vertically |
| 2 | Check gift card width | Fits within viewport with padding |
| 3 | Check button placement | Full width or stacked |
| 4 | Check modal sizing | Doesn't overflow screen |

**Pass/Fail:** ☐ Pass ☐ Fail

### Test 5.2: Tablet View (768px width)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize browser to 768px | Content centered with good spacing |
| 2 | Check text readability | All text clearly visible |

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test 6: Error Handling

### Test 6.1: No User ID
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Complete lesson without userId prop | "Send to Friend" button still works |
| 2 | Click "Send to Friend" | Modal shows but "canSend" is false |
| 3 | Check button state | Shows "Awesome!" as primary action |

**Pass/Fail:** ☐ Pass ☐ Fail

### Test 6.2: Unknown Gift Type
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Pass invalid gift type (manually) | Component doesn't crash |
| 2 | Check error handling | Console shows error, modal doesn't render |

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test 7: Accessibility

### Test 7.1: Screen Reader
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Use screen reader to navigate | All interactive elements announced |
| 2 | Check gift names | Announced correctly |
| 3 | Check button labels | Clear purpose announced |

**Pass/Fail:** ☐ Pass ☐ Fail

### Test 7.2: Keyboard Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab through elements | Focus visible on all buttons |
| 2 | Press Enter on buttons | Actions trigger correctly |
| 3 | Press Escape on modal | Modal closes |

**Pass/Fail:** ☐ Pass ☐ Fail

---

## Test Results Summary

### Gift System Tests
- Test 1.1 (Water Drop): ☐ Pass ☐ Fail
- Test 1.2 (Sparkle): ☐ Pass ☐ Fail
- Test 1.3 (Ribbon): ☐ Pass ☐ Fail
- Test 1.4 (Golden Flower): ☐ Pass ☐ Fail
- Test 1.5 (Seed): ☐ Pass ☐ Fail
- Test 1.6 (Priority): ☐ Pass ☐ Fail

### Component Tests
- Test 2.1 (Modal Appearance): ☐ Pass ☐ Fail
- Test 2.2 (Modal Dismissal): ☐ Pass ☐ Fail
- Test 3.1 (LessonComplete): ☐ Pass ☐ Fail
- Test 3.2 (Navigation): ☐ Pass ☐ Fail

### Visual Tests
- Test 4.1 (Colors): ☐ Pass ☐ Fail
- Test 4.2 (Animations): ☐ Pass ☐ Fail
- Test 4.3 (Typography): ☐ Pass ☐ Fail

### Responsive Tests
- Test 5.1 (Mobile): ☐ Pass ☐ Fail
- Test 5.2 (Tablet): ☐ Pass ☐ Fail

### Error Handling Tests
- Test 6.1 (No User ID): ☐ Pass ☐ Fail
- Test 6.2 (Unknown Gift): ☐ Pass ☐ Fail

### Accessibility Tests
- Test 7.1 (Screen Reader): ☐ Pass ☐ Fail
- Test 7.2 (Keyboard): ☐ Pass ☐ Fail

---

## Overall Status

**Total Tests:** __
**Passed:** __
**Failed:** __
**Pass Rate: __%**

### Issues Found:
1. 
2. 
3. 

### Notes:
- 
- 

---

## Quick Test Script

For a quick verification, run through these steps:

1. **Start the app** → `npm run dev`
2. **Complete a basic lesson** → Should see 💧 Water Drop
3. **Click "Send to Friend"** → Modal opens with animation
4. **Dismiss modal** → Returns to lesson complete screen
5. **Click "Back to Path"** → Navigates away
6. **Resize browser** → UI remains functional

If all quick tests pass, the core gift system is working correctly!
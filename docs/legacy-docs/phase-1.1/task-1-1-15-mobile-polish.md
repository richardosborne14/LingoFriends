# Task 1.1.15: Mobile Controls & Polish

**Status:** Not Started
**Phase:** D (Polish)
**Dependencies:** Task 1.1.14 (PixiJS Upgrade)
**Estimated Time:** 4-5 hours

---

## Objective

Optimize the app for mobile devices with touch controls, responsive layouts, and performance improvements. Ensure the game feels smooth and native-like on phones and tablets.

---

## Deliverables

### Files to Create
- `src/hooks/useTouchGestures.ts` — Touch gesture handling hook
- `src/utils/responsive.ts` — Responsive sizing utilities
- `src/components/shared/MobileNav.tsx` — Mobile-optimized navigation

### Files to Modify
- `src/components/garden/GardenWorld.tsx` — Add touch controls
- `src/styles/main.css` — Mobile-specific styles
- `index.html` — Viewport and PWA meta tags

---

## Touch Gestures

### Garden Controls

| Gesture | Action |
|---------|--------|
| Tap | Select tree/decoration |
| Double-tap | Open tree panel |
| Pinch | Zoom in/out |
| Pan (2 fingers) | Scroll garden |
| Long-press | Show context menu |

### Lesson Controls

| Gesture | Action |
|---------|--------|
| Swipe left | Next activity |
| Swipe right | Previous activity |
| Tap answer | Select answer |
| Long-press help | Show hint |

---

## Touch Gesture Hook

```typescript
// src/hooks/useTouchGestures.ts

import { useCallback, useRef } from 'react';

interface TouchGestures {
  onSingleTap: (x: number, y: number) => void;
  onDoubleTap: (x: number, y: number) => void;
  onLongPress: (x: number, y: number) => void;
  onPinch: (scale: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
}

interface TouchState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastDistance: number;
  startTime: number;
  tapCount: number;
  longPressTimer: NodeJS.Timeout | null;
}

export function useTouchGestures(handlers: TouchGestures) {
  const stateRef = useRef<TouchState>({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastDistance: 0,
    startTime: 0,
    tapCount: 0,
    longPressTimer: null,
  });
  
  const DOUBLE_TAP_DELAY = 300;
  const LONG_PRESS_DELAY = 500;
  const TAP_MOVEMENT_THRESHOLD = 10;
  
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;
    const touch = e.touches[0];
    
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.lastX = touch.clientX;
    state.lastY = touch.clientY;
    state.startTime = Date.now();
    
    // Handle pinch start
    if (e.touches.length === 2) {
      state.lastDistance = getTouchDistance(e.touches);
    }
    
    // Setup long press timer
    state.longPressTimer = setTimeout(() => {
      handlers.onLongPress(state.startX, state.startY);
    }, LONG_PRESS_DELAY);
  }, [handlers]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;
    const touch = e.touches[0];
    
    // Cancel long press if moved
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > TAP_MOVEMENT_THRESHOLD && state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    
    // Handle pinch
    if (e.touches.length === 2) {
      const currentDistance = getTouchDistance(e.touches);
      if (state.lastDistance > 0) {
        const scale = currentDistance / state.lastDistance;
        handlers.onPinch(scale);
      }
      state.lastDistance = currentDistance;
    } else {
      // Handle pan
      const deltaX = touch.clientX - state.lastX;
      const deltaY = touch.clientY - state.lastY;
      handlers.onPan(deltaX, deltaY);
      
      state.lastX = touch.clientX;
      state.lastY = touch.clientY;
    }
  }, [handlers]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const state = stateRef.current;
    
    // Cancel long press
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    
    // Handle tap
    const touch = e.changedTouches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - state.startTime;
    
    if (distance < TAP_MOVEMENT_THRESHOLD && duration < 200) {
      state.tapCount++;
      
      // Check for double tap
      if (state.tapCount === 1) {
        setTimeout(() => {
          if (state.tapCount === 1) {
            handlers.onSingleTap(state.startX, state.startY);
          }
          state.tapCount = 0;
        }, DOUBLE_TAP_DELAY);
      } else if (state.tapCount === 2) {
        handlers.onDoubleTap(state.startX, state.startY);
        state.tapCount = 0;
      }
    }
  }, [handlers]);
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
```

---

## Responsive Utilities

```typescript
// src/utils/responsive.ts

/** Breakpoints matching Tailwind defaults */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** Check if current viewport is mobile */
export function isMobile(): boolean {
  return window.innerWidth < BREAKPOINTS.md;
}

/** Check if current viewport is tablet */
export function isTablet(): boolean {
  const width = window.innerWidth;
  return width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
}

/** Get current breakpoint */
export function getBreakpoint(): keyof typeof BREAKPOINTS {
  const width = window.innerWidth;
  if (width < BREAKPOINTS.sm) return 'sm';
  if (width < BREAKPOINTS.md) return 'md';
  if (width < BREAKPOINTS.lg) return 'lg';
  if (width < BREAKPOINTS.xl) return 'xl';
  return '2xl';
}

/** Scale factor for PixiJS canvas */
export function getCanvasScale(): number {
  const width = window.innerWidth;
  if (width < 400) return 0.5;
  if (width < 600) return 0.75;
  if (width < 800) return 0.9;
  return 1;
}

/** Font size scaling for mobile */
export function getScaledFontSize(baseSize: number): number {
  if (isMobile()) return baseSize * 0.85;
  return baseSize;
}

/** Touch target size (minimum 44px for accessibility) */
export function getTouchTargetSize(): number {
  return Math.max(44, window.innerWidth * 0.1);
}

/** Hook for responsive values */
import { useState, useEffect } from 'react';

export function useResponsive<T>(values: Partial<Record<keyof typeof BREAKPOINTS, T>>): T {
  const [value, setValue] = useState<T>(() => {
    const bp = getBreakpoint();
    return values[bp] ?? values.md ?? values.sm!;
  });
  
  useEffect(() => {
    const handleResize = () => {
      const bp = getBreakpoint();
      // Walk down from current breakpoint to find a value
      const breakpointOrder: Array<keyof typeof BREAKPOINTS> = ['2xl', 'xl', 'lg', 'md', 'sm'];
      const currentIndex = breakpointOrder.indexOf(bp);
      
      for (let i = currentIndex; i < breakpointOrder.length; i++) {
        if (values[breakpointOrder[i]] !== undefined) {
          setValue(values[breakpointOrder[i]]!);
          return;
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [values]);
  
  return value;
}
```

---

## Mobile Navigation

```typescript
// src/components/shared/MobileNav.tsx

import { motion } from 'framer-motion';
import { useState } from 'react';

interface MobileNavProps {
  currentView: 'garden' | 'path' | 'lesson';
  sunDrops: number;
  streak: number;
  onGarden: () => void;
  onProfile: () => void;
}

export function MobileNav({ currentView, sunDrops, streak, onGarden, onProfile }: MobileNavProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <>
      {/* Top Header */}
      <header className="mobile-header">
        <div className="header-left">
          <span className="logo">🌳 LingoFriends</span>
        </div>
        <div className="header-right">
          <span className="streak">🔥 {streak}</span>
          <span className="sundrops">☀️ {sunDrops}</span>
          <button
            className="menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            ☰
          </button>
        </div>
      </header>
      
      {/* Bottom Tab Bar */}
      <nav className="mobile-tab-bar">
        <button
          className={`tab-item ${currentView === 'garden' ? 'active' : ''}`}
          onClick={onGarden}
        >
          <span className="tab-icon">🌳</span>
          <span className="tab-label">Garden</span>
        </button>
        
        <button
          className={`tab-item ${currentView === 'path' ? 'active' : ''}`}
          disabled
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-label">Path</span>
        </button>
        
        <button
          className="tab-item"
          onClick={onProfile}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">Profile</span>
        </button>
      </nav>
      
      {/* Slide-out Menu */}
      <motion.div
        className="mobile-menu-overlay"
        initial={{ opacity: 0, pointerEvents: 'none' }}
        animate={{ opacity: showMenu ? 1 : 0, pointerEvents: showMenu ? 'auto' : 'none' }}
        onClick={() => setShowMenu(false)}
      >
        <motion.div
          className="mobile-menu"
          initial={{ x: '100%' }}
          animate={{ x: showMenu ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="menu-close" onClick={() => setShowMenu(false)}>
            ✕
          </button>
          
          <div className="menu-items">
            <button onClick={() => { onProfile(); setShowMenu(false); }}>
              👤 Profile
            </button>
            <button onClick={() => setShowMenu(false)}>
              ⚙️ Settings
            </button>
            <button onClick={() => setShowMenu(false)}>
              ❓ Help
            </button>
            <button onClick={() => setShowMenu(false)} className="logout-btn">
              🚪 Log Out
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
```

---

## Mobile CSS

```css
/* src/styles/mobile.css */

/* Mobile Header */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--color-surface);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
}

.mobile-header .logo {
  font-size: 18px;
  font-weight: bold;
}

.mobile-header .header-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mobile-header .streak,
.mobile-header .sundrops {
  font-size: 16px;
}

/* Bottom Tab Bar */
.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--color-surface);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.mobile-tab-bar .tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  min-width: 64px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  transition: color 0.2s;
}

.mobile-tab-bar .tab-item.active {
  color: var(--color-primary);
}

.mobile-tab-bar .tab-item:disabled {
  opacity: 0.5;
}

.mobile-tab-bar .tab-icon {
  font-size: 24px;
}

.mobile-tab-bar .tab-label {
  font-size: 12px;
}

/* Safe Area Insets */
@supports (padding: env(safe-area-inset-bottom)) {
  .mobile-tab-bar {
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
  
  .mobile-header {
    padding-top: env(safe-area-inset-top);
  }
}

/* Touch Targets */
button,
[role="button"],
input,
select,
textarea {
  min-height: 44px;
  min-width: 44px;
}

/* Scroll Behavior */
.garden-world-container {
  touch-action: pan-x pan-y;
  overscroll-behavior: none;
}

/* Disable text selection on interactive elements */
button,
.tab-item,
.decoration-card,
.tree-button {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Mobile Menu */
.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 260px;
  background: var(--color-surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.mobile-menu .menu-items button {
  width: 100%;
  text-align: left;
  padding: 16px;
  font-size: 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
}

.mobile-menu .menu-items button:active {
  background: var(--color-background);
}

.mobile-menu .logout-btn {
  color: var(--color-error);
  margin-top: auto;
}
```

---

## Viewport Configuration

```html
<!-- Add to index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#87CEEB">
<meta name="mobile-web-app-capable" content="yes">

<!-- Prevent zoom on input focus (iOS) -->
<style>
  input, select, textarea {
    font-size: 16px;
  }
</style>
```

---

## Testing Checklist

### Touch Gestures
- [ ] Single tap selects item
- [ ] Double tap opens panel
- [ ] Long press shows context menu
- [ ] Pinch zooms garden
- [ ] Pan scrolls garden

### Responsive Layout
- [ ] Header fits on small screens
- [ ] Tab bar accessible
- [ ] Touch targets are 44px minimum
- [ ] Text readable at all sizes
- [ ] No horizontal scroll

### Performance
- [ ] 60fps on mid-range devices
- [ ] No jank on scroll
- [ ] Smooth animations
- [ ] Quick app startup

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Touch gestures work | [ ] |
| Responsive on all sizes | [ ] |
| 60fps on mobile | [ ] |
| Native app feel | [ ] |
| Safe area handling | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 2 (Mobile First)
- Apple Human Interface Guidelines — Touch targets
- Material Design — Touch interactions

---

## Notes for Implementation

1. Test on actual devices, not just simulator
2. Consider haptic feedback for gestures
3. Add loading states for slow connections
4. Test on low-end Android devices
5. Consider PWA for home screen install
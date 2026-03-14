# Task 1.1.16: Tutorial Flow & Testing

**Status:** Not Started
**Phase:** D (Polish)
**Dependencies:** All Phase A, B, C tasks
**Estimated Time:** 4-5 hours

---

## Objective

Implement a first-time user tutorial that guides kids through the garden, trees, lessons, and gifts. Create end-to-end tests for the critical user flows. This is the final polish task before the Phase 1.1 release.

---

## Deliverables

### Files to Create
- `src/components/tutorial/TutorialManager.tsx` — Tutorial state machine
- `src/components/tutorial/TutorialStep.tsx` — Individual step component
- `src/components/tutorial/TutorialOverlay.tsx` — Spotlight and tooltip
- `e2e/garden.spec.ts` — E2E tests for garden flows
- `e2e/lesson.spec.ts` — E2E tests for lesson flows

### Files to Modify
- `src/hooks/useAuth.tsx` — Track tutorial completion
- `src/components/garden/GardenWorld.tsx` — Add tutorial hooks

---

## Tutorial Flow

### Steps (Ordered)

| Step | Location | Teaches | Action |
|------|----------|---------|--------|
| 1 | Garden | "This is your garden!" | Highlight garden area |
| 2 | Garden | "Trees grow as you learn" | Highlight first tree |
| 3 | Lesson | "Tap a tree to start learning" | Prompt tap |
| 4 | Path | "Choose a lesson" | Highlight lesson |
| 5 | Lesson | "Answer questions to earn Sun Drops" | Complete activity |
| 6 | Complete | "Great job! You earned ☀️5" | Show reward |
| 7 | Garden | "Your tree grew!" | Show tree change |
| 8 | Gifts | "Gifts help your friends' trees" | Show gift |
| 9 | Done | "You're ready to explore!" | Complete |

---

## Tutorial Manager

```typescript
// src/components/tutorial/TutorialManager.tsx

import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type TutorialStep = 
  | 'welcome'
  | 'garden_intro'
  | 'tree_intro'
  | 'tap_tree'
  | 'choose_lesson'
  | 'complete_activity'
  | 'show_reward'
  | 'show_tree_growth'
  | 'gifts_intro'
  | 'complete';

interface TutorialContextValue {
  isActive: boolean;
  currentStep: TutorialStep;
  nextStep: () => void;
  skipTutorial: () => void;
  completeStep: (step: TutorialStep) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const TUTORIAL_ORDER: TutorialStep[] = [
  'welcome',
  'garden_intro',
  'tree_intro',
  'tap_tree',
  'choose_lesson',
  'complete_activity',
  'show_reward',
  'show_tree_growth',
  'gifts_intro',
  'complete',
];

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<Set<TutorialStep>>(new Set());
  
  // Check if user needs tutorial
  useEffect(() => {
    const needsTutorial = !localStorage.getItem('tutorial_complete');
    if (needsTutorial) {
      setIsActive(true);
    }
  }, []);
  
  const nextStep = () => {
    const currentIndex = TUTORIAL_ORDER.indexOf(currentStep);
    if (currentIndex < TUTORIAL_ORDER.length - 1) {
      setCurrentStep(TUTORIAL_ORDER[currentIndex + 1]);
    }
  };
  
  const skipTutorial = () => {
    setIsActive(false);
    localStorage.setItem('tutorial_complete', 'true');
    // Save to profile
    pocketbaseService.updateProfile({ tutorialComplete: true });
  };
  
  const completeStep = (step: TutorialStep) => {
    setCompletedSteps(prev => new Set(prev).add(step));
    
    if (step === 'complete') {
      setIsActive(false);
      localStorage.setItem('tutorial_complete', 'true');
      pocketbaseService.updateProfile({ tutorialComplete: true });
    } else {
      nextStep();
    }
  };
  
  return (
    <TutorialContext.Provider value={{ isActive, currentStep, nextStep, skipTutorial, completeStep }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}
```

---

## Tutorial Overlay

```typescript
// src/components/tutorial/TutorialOverlay.tsx

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface TutorialOverlayProps {
  targetRect: DOMRect | null;
  title: string;
  description: string;
  children?: ReactNode;
  onDismiss: () => void;
  showSkip?: boolean;
}

export function TutorialOverlay({
  targetRect,
  title,
  description,
  children,
  onDismiss,
  showSkip = true,
}: TutorialOverlayProps) {
  // Calculate spotlight position
  const spotlightStyle = targetRect ? {
    left: targetRect.left - 8,
    top: targetRect.top - 8,
    width: targetRect.width + 16,
    height: targetRect.height + 16,
  } : null;
  
  // Calculate tooltip position
  const tooltipStyle = targetRect ? {
    left: targetRect.left + targetRect.width / 2,
    top: targetRect.bottom + 16,
  } : { left: '50%', top: '50%' };
  
  return (
    <motion.div
      className="tutorial-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Darkened background */}
      <div className="tutorial-backdrop" onClick={onDismiss} />
      
      {/* Spotlight cutout */}
      {spotlightStyle && (
        <div className="tutorial-spotlight" style={spotlightStyle} />
      )}
      
      {/* Tooltip */}
      <motion.div
        className="tutorial-tooltip"
        style={tooltipStyle}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="tutorial-title">{title}</h3>
        <p className="tutorial-description">{description}</p>
        
        {children}
        
        <div className="tutorial-actions">
          {showSkip && (
            <button className="btn-skip" onClick={onDismiss}>
              Skip Tutorial
            </button>
          )}
          <button className="btn-next" onClick={onDismiss}>
            Got it!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## Tutorial Step Component

```typescript
// src/components/tutorial/TutorialStep.tsx

import { useEffect, useRef } from 'react';
import { useTutorial, TutorialStep as StepType } from './TutorialManager';
import { TutorialOverlay } from './TutorialOverlay';

interface TutorialStepProps {
  step: StepType;
  targetSelector: string;
  title: string;
  description: string;
}

export function TutorialStep({ step, targetSelector, title, description }: TutorialStepProps) {
  const { isActive, currentStep, nextStep, skipTutorial } = useTutorial();
  const targetRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (isActive && currentStep === step) {
      targetRef.current = document.querySelector(targetSelector);
      
      // Scroll into view if needed
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep, step, targetSelector]);
  
  if (!isActive || currentStep !== step) {
    return null;
  }
  
  const targetRect = targetRef.current?.getBoundingClientRect() ?? null;
  
  return (
    <TutorialOverlay
      targetRect={targetRect}
      title={title}
      description={description}
      onDismiss={nextStep}
    />
  );
}
```

---

## Tutorial Integration

```typescript
// In App.tsx or top-level component

import { TutorialProvider, useTutorial } from '@/components/tutorial/TutorialManager';
import { TutorialStep } from '@/components/tutorial/TutorialStep';

function App() {
  return (
    <TutorialProvider>
      <MainApp />
    </TutorialProvider>
  );
}

function MainApp() {
  return (
    <>
      {/* Main app content */}
      <GardenWorld />
      <PathView />
      <LessonView />
      
      {/* Tutorial steps */}
      <TutorialStep
        step="garden_intro"
        targetSelector=".garden-world"
        title="Welcome to Your Garden! 🌳"
        description="This is your learning garden. Each tree represents a skill you're learning."
      />
      
      <TutorialStep
        step="tree_intro"
        targetSelector=".garden-tree:first-child"
        title="This is Your First Tree! 🌲"
        description="Tap on the tree to see your learning path and start lessons."
      />
      
      <TutorialStep
        step="tap_tree"
        targetSelector=".garden-tree:first-child"
        title="Tap the Tree! 👆"
        description="Tap the tree to open its learning path."
      />
      
      {/* ... more steps ... */}
    </>
  );
}
```

---

## E2E Tests (Playwright)

```typescript
// e2e/garden.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Garden Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and go to garden
    await page.goto('/');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/garden');
  });
  
  test('garden displays trees', async ({ page }) => {
    // Should see at least one tree
    const trees = page.locator('.garden-tree');
    await expect(trees).toHaveCount(1, { timeout: 5000 });
  });
  
  test('tap tree opens path', async ({ page }) => {
    // Tap tree
    await page.click('.garden-tree:first-child');
    
    // Path view should appear
    await expect(page.locator('.path-view')).toBeVisible();
    
    // Should see lessons
    const lessons = page.locator('.lesson-item');
    await expect(lessons.first()).toBeVisible();
  });
  
  test('tap lesson starts lesson', async ({ page }) => {
    await page.click('.garden-tree:first-child');
    await page.click('.lesson-item:first-child');
    
    // Lesson view should appear
    await expect(page.locator('.lesson-view')).toBeVisible();
    await expect(page.locator('.activity-view')).toBeVisible();
  });
});

test.describe('Sun Drops', () => {
  test('earning Sun Drops updates counter', async ({ page }) => {
    // Complete an activity
    await page.goto('/garden');
    await page.click('.garden-tree:first-child');
    await page.click('.lesson-item:first-child');
    
    // Answer a question correctly
    const sunDropsBefore = await page.locator('.sundrop-counter').textContent();
    
    await page.click('[data-correct="true"]'); // Correct answer
    
    // Should see Sun Drop burst animation
    await expect(page.locator('.sundrop-burst')).toBeVisible();
    
    // Counter should increase
    const sunDropsAfter = await page.locator('.sundrop-counter').textContent();
    expect(parseInt(sunDropsAfter || '0')).toBeGreaterThan(parseInt(sunDropsBefore || '0'));
  });
});
```

```typescript
// e2e/lesson.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Lesson Flow', () => {
  test('complete lesson shows result', async ({ page }) => {
    await page.goto('/');
    // Login...
    
    // Start lesson
    await page.click('.garden-tree:first-child');
    await page.click('.lesson-item:first-child');
    
    // Complete all activities
    const activities = page.locator('.activity-view');
    const count = await activities.count();
    
    for (let i = 0; i < count; i++) {
      // Answer correctly
      await page.click('[data-correct="true"]');
      await page.click('.btn-next');
      await page.waitForTimeout(500);
    }
    
    // Should show completion screen
    await expect(page.locator('.lesson-complete')).toBeVisible();
    await expect(page.locator('.stars-earned')).toBeVisible();
    await expect(page.locator('.sundrops-earned')).toBeVisible();
  });
  
  test('help button shows hint', async ({ page }) => {
    await page.goto('/');
    // Login and start lesson...
    
    // Check for help button
    const helpButton = page.locator('.btn-help');
    await expect(helpButton).toBeVisible();
    
    // Tap help should show hint
    await helpButton.click();
    await expect(page.locator('.hint-text')).toBeVisible();
  });
  
  test('retry activity reduces Sun Drops', async ({ page }) => {
    await page.goto('/');
    // Login and start lesson...
    
    // Answer incorrectly
    await page.click('[data-correct="false"]');
    
    // Should be able to retry
    await expect(page.locator('.btn-retry')).toBeVisible();
    
    const sunDropsBefore = await page.locator('.activity-sundrops').textContent();
    
    // Retry
    await page.click('.btn-retry');
    
    // Sun Drops value should be lower
    const sunDropsAfter = await page.locator('.activity-sundrops').textContent();
    expect(parseInt(sunDropsAfter || '0')).toBeLessThan(parseInt(sunDropsBefore || '0'));
  });
});
```

---

## Testing Checklist

### Tutorial
- [ ] Tutorial starts for new users
- [ ] Each step appears in order
- [ ] Spotlight highlights correct element
- [ ] Tooltip is visible and readable
- [ ] Skip tutorial works
- [ ] Tutorial completion saved
- [ ] Tutorial doesn't appear for returning users

### E2E Critical Paths
- [ ] Login flow
- [ ] Garden displays trees
- [ ] Tree tap opens path
- [ ] Lesson start works
- [ ] Activity completion works
- [ ] Sun Drops earned correctly
- [ ] Tree health updates
- [ ] Gift sending works

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| Tutorial complete for new users | [ ] |
| Tutorial skippable | [ ] |
| E2E tests pass | [ ] |
| No critical bugs | [ ] |
| Mobile tutorial works | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 12 (Onboarding)
- `src/components/onboarding/` — Existing onboarding components
- `docs/phase-1/task-6-onboarding-screens.md` — Original onboarding

---

## Notes for Implementation

1. Consider storing tutorial progress for resume
2. A/B test tutorial vs. no tutorial
3. Add analytics for tutorial completion
4. Localize tutorial text
5. Add sound effects for tutorial steps
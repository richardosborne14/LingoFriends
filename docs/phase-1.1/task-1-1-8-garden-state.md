# Task 1.1.8: Garden State Management

**Status:** ✅ Complete
**Phase:** B (Growth & Decay)
**Dependencies:** Task 1.1.7 (Pocketbase Schema Updates)
**Estimated Time:** 4-5 hours
**Completed:** 2026-02-15

---

## Objective

Create the React context and hooks for managing the entire garden state. This includes fetching/syncing trees, handling Sun Drop transactions, and providing real-time updates to all components.

---

## Deliverables

### Files to Create
- `src/hooks/useGarden.tsx` — Main garden state hook
- `src/hooks/useSunDrops.tsx` — Sun Drop transactions hook
- `src/hooks/useLesson.tsx` — Lesson state machine hook
- `src/contexts/GardenContext.tsx` — Garden context provider

---

## useGarden Hook

### Purpose
Central state management for the user's garden. Fetches trees, manages positions, handles tree creation and deletion.

### Interface

```typescript
interface UseGardenReturn {
  // State
  trees: UserTree[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshGarden: () => Promise<void>;
  createTree: (skillPathId: string, position: { x: number; y: number }) => Promise<UserTree>;
  updateTreePosition: (treeId: string, position: { x: number; y: number }) => Promise<void>;
  
  // Selectors
  getTreeBySkillPath: (skillPathId: string) => UserTree | undefined;
  getCurrentTree: () => UserTree | undefined;
}

function useGarden(): UseGardenReturn;
```

### Implementation

```typescript
// src/hooks/useGarden.tsx

import { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '@/services/pocketbaseService';
import type { UserTree, SkillPath } from '@/types/game';

export function useGarden(): UseGardenReturn {
  const [trees, setTrees] = useState<UserTree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch trees on mount
  useEffect(() => {
    refreshGarden();
    
    // Subscribe to real-time updates
    const unsubscribe = pocketbaseService.subscribe('user_trees', (e) => {
      if (e.action === 'create') {
        setTrees(prev => [...prev, e.record]);
      } else if (e.action === 'update') {
        setTrees(prev => prev.map(t => t.id === e.record.id ? e.record : t));
      } else if (e.action === 'delete') {
        setTrees(prev => prev.filter(t => t.id !== e.record.id));
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  const refreshGarden = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedTrees = await pocketbaseService.getUserTrees();
      setTrees(fetchedTrees);
    } catch (err) {
      setError('Failed to load garden');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const createTree = useCallback(async (skillPathId: string, position: { x: number; y: number }) => {
    const tree = await pocketbaseService.createTree({
      skillPathId,
      position,
      status: 'seed',
      health: 100,
      sunDropsTotal: 0,
      lessonsCompleted: 0,
    });
    return tree;
  }, []);
  
  // ... other methods
}
```

---

## useSunDrops Hook

### Purpose
Manages Sun Drop earning, spending, and daily cap tracking.

### Interface

```typescript
interface UseSunDropsReturn {
  // State
  balance: number;
  dailyEarned: number;
  dailyCap: number;
  remainingAllowance: number;
  isCapReached: boolean;
  
  // Actions
  earnSunDrops: (amount: number) => Promise<void>;
  spendSunDrops: (amount: number) => Promise<boolean>;
  checkDailyCap: () => Promise<void>;
  
  // Calculations
  calculateActivityReward: (base: number, isRetry: boolean, usedHelp: boolean, wrongAttempts: number) => number;
}

function useSunDrops(): UseSunDropsReturn;
```

### Implementation

```typescript
// src/hooks/useSunDrops.tsx

import { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '@/services/pocketbaseService';
import { 
  calculateEarned, 
  isDailyCapReached, 
  remainingDailyAllowance 
} from '@/services/sunDropService';

const DAILY_CAP = 50;

export function useSunDrops(): UseSunDropsReturn {
  const [balance, setBalance] = useState(0);
  const [dailyEarned, setDailyEarned] = useState(0);
  
  // Fetch initial state
  useEffect(() => {
    loadSunDropState();
  }, []);
  
  const earnSunDrops = useCallback(async (amount: number) => {
    // Check daily cap
    if (dailyEarned + amount > DAILY_CAP) {
      amount = DAILY_CAP - dailyEarned;
    }
    
    if (amount <= 0) return;
    
    // Update in Pocketbase
    await pocketbaseService.updateProfile({
      sunDrops: balance + amount,
    });
    
    // Update daily progress
    await pocketbaseService.updateDailyProgress({
      sunDropsEarned: dailyEarned + amount,
    });
    
    setBalance(prev => prev + amount);
    setDailyEarned(prev => prev + amount);
  }, [balance, dailyEarned]);
  
  const calculateActivityReward = useCallback((base: number, isRetry: boolean, usedHelp: boolean, wrongAttempts: number) => {
    const earned = calculateEarned(base, isRetry, usedHelp, wrongAttempts);
    const remaining = remainingDailyAllowance(dailyEarned);
    return Math.min(earned, remaining);
  }, [dailyEarned]);
  
  // ... other methods
}
```

---

## useLesson Hook

### Purpose
State machine for managing the full lesson flow: loading, playing steps, tracking progress, completion.

### Interface

```typescript
interface UseLessonReturn {
  // State
  lessonPlan: LessonPlan | null;
  currentStep: number;
  sunDropsEarned: number;
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Lesson Data
  currentStepData: LessonStep | null;
  progress: { current: number; total: number };
  
  // Actions
  loadLesson: (lessonId: string) => Promise<void>;
  submitActivity: (correct: boolean, sunDrops: number) => void;
  goToNextStep: () => void;
  retryLesson: () => void;
  completeLesson: () => Promise<LessonResult>;
}

function useLesson(): UseLessonReturn;
```

### State Machine

```
┌─────────────┐
│   IDLE      │
└──────┬──────┘
       │ loadLesson()
       ▼
┌─────────────┐
│  LOADING    │
└──────┬──────┘
       │ lesson loaded
       ▼
┌─────────────┐
│  PLAYING    │◄──────────────┐
│  (step N)   │               │
└──────┬──────┘               │
       │ submitActivity()     │
       ▼                      │
┌─────────────┐               │
│  FEEDBACK   │               │
│  (burst)    │               │
└──────┬──────┘               │
       │ goToNextStep()       │
       ▼                      │
   ┌───────┐  more steps  ────┘
   │ done? │
   └───┬───┘
       │ all complete
       ▼
┌─────────────┐
│  COMPLETE   │
└─────────────┘
```

### Implementation

```typescript
// src/hooks/useLesson.tsx

import { useState, useCallback } from 'react';
import { generateLesson } from '@/services/lessonGenerator';
import type { LessonPlan, LessonStep, LessonResult } from '@/types/game';

type LessonState = 'idle' | 'loading' | 'playing' | 'feedback' | 'complete';

export function useLesson(): UseLessonReturn {
  const [state, setState] = useState<LessonState>('idle');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [sunDropsEarned, setSunDropsEarned] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const loadLesson = useCallback(async (lessonId: string) => {
    try {
      setState('loading');
      setError(null);
      
      const plan = await generateLesson(lessonId);
      setLessonPlan(plan);
      setCurrentStep(0);
      setSunDropsEarned(0);
      setState('playing');
    } catch (err) {
      setError('Failed to load lesson');
      setState('idle');
    }
  }, []);
  
  const submitActivity = useCallback((correct: boolean, sunDrops: number) => {
    if (correct) {
      setSunDropsEarned(prev => prev + sunDrops);
    }
    setState('feedback');
  }, []);
  
  const goToNextStep = useCallback(() => {
    if (!lessonPlan) return;
    
    if (currentStep + 1 >= lessonPlan.steps.length) {
      setState('complete');
    } else {
      setCurrentStep(prev => prev + 1);
      setState('playing');
    }
  }, [lessonPlan, currentStep]);
  
  const completeLesson = useCallback(async (): Promise<LessonResult> => {
    const result: LessonResult = {
      lessonId: lessonPlan!.id,
      sunDropsEarned,
      sunDropsMax: lessonPlan!.totalSunDrops,
      stars: calculateStars(sunDropsEarned, lessonPlan!.totalSunDrops),
      completedAt: new Date(),
    };
    
    // Save to Pocketbase
    await pocketbaseService.completeLesson(result);
    
    return result;
  }, [lessonPlan, sunDropsEarned]);
  
  // ... other methods
}
```

---

## GardenContext

### Purpose
Provides garden state to the entire app. Wraps the app at the root level.

### Interface

```typescript
// src/contexts/GardenContext.tsx

interface GardenContextValue {
  trees: UserTree[];
  sunDrops: number;
  dailyEarned: number;
  isLoading: boolean;
  error: string | null;
  
  // Tree actions
  createTree: (skillPathId: string, position: { x: number; y: number }) => Promise<UserTree>;
  
  // Sun Drop actions
  earnSunDrops: (amount: number) => Promise<void>;
  calculateReward: (base: number, isRetry: boolean, usedHelp: boolean, wrongAttempts: number) => number;
  
  // Refresh
  refresh: () => Promise<void>;
}

const GardenContext = createContext<GardenContextValue | null>(null);

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const garden = useGarden();
  const sunDrops = useSunDrops();
  
  return (
    <GardenContext.Provider value={{ ...garden, ...sunDrops }}>
      {children}
    </GardenContext.Provider>
  );
}

export function useGardenContext() {
  const context = useContext(GardenContext);
  if (!context) {
    throw new Error('useGardenContext must be used within GardenProvider');
  }
  return context;
}
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        GardenProvider                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  useGarden  │  │ useSunDrops │  │     useLesson       │  │
│  │             │  │             │  │                     │  │
│  │ - trees[]   │  │ - balance   │  │ - lessonPlan        │  │
│  │ - positions │  │ - dailyCap  │  │ - currentStep       │  │
│  │ - health    │  │ - earn()    │  │ - sunDropsEarned    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                          ▼                                   │
│               ┌─────────────────────┐                        │
│               │  Pocketbase Service │                        │
│               │  (API calls)        │                        │
│               └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### useGarden
- [ ] Fetches trees on mount
- [ ] Creates new tree with correct defaults
- [ ] Updates tree positions
- [ ] Subscribes to real-time updates
- [ ] Handles errors gracefully

### useSunDrops
- [ ] Loads initial balance and daily progress
- [ ] Earns Sun Drops correctly
- [ ] Respects daily cap
- [ ] Calculates activity rewards correctly
- [ ] Updates daily progress on earn

### useLesson
- [ ] Loads lesson plan from generator
- [ ] Advances through steps
- [ ] Tracks Sun Drops earned
- [ ] Calculates stars on completion
- [ ] Saves progress to Pocketbase

### GardenContext
- [ ] Provides values to children
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Refresh works correctly

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| All hooks functional | [ ] |
| Context provides state | [ ] |
| Real-time updates work | [ ] |
| Sun Drop calculations accurate | [ ] |
| Lesson state machine correct | [ ] |

---

## Reference

- **GAME_DESIGN.md** — Section 3 (Sun Drops), Section 5 (Data Model)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 4 (Hooks)
- `src/hooks/useAuth.tsx` — Existing auth hook pattern

---

## Notes for Implementation

1. Install real-time subscriptions after Pocketbase schema is live
2. Mock data for initial development before generators are ready
3. Consider caching strategy for offline support
4. Add error boundaries around garden-dependent components
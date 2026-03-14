# Task 1.1.4: Path View (Lesson Select)

**Status:** ✅ Complete
**Phase:** A (Core Mechanics)
**Dependencies:** Task 1.1.3 (Lesson View Container)
**Estimated Time:** 3-4 hours
**Completed:** 2026-02-15

---

## Objective

Build the Path view — a winding trail showing all lessons in a skill path. Users can see their progress, which lessons are complete (with stars and health), which is current, and which are locked. This is the "level select" screen.

---

## Deliverables

### Files to Create
- `src/components/path/PathView.tsx` — Main path container
- `src/components/path/LessonNode.tsx` — Individual lesson circle
- `src/components/path/PathHeader.tsx` — Skill path title and progress

### Files to Create (Shared)
- `src/components/shared/MiniTree.tsx` — Small tree for health display

---

## Visual Design

The path is a **top-to-bottom winding trail**:

```
┌────────────────────────────────────────┐
│                  ⚽                     │
│            Sports Talk                 │
│         2 of 4 lessons complete        │
├────────────────────────────────────────┤
│                                        │
│        🥊                              │
│        ●──────  ⭐⭐                    │
│       Boxing      (85% healthy)        │
│           │                            │
│           │                            │
│            ───────●──────               │
│                 🏋️                      │
│                Gym                     │
│              ⭐⭐⭐                       │
│                                        │
│                    ●                   │
│                   ⚽                    │
│              [Avatar bouncing]         │
│                Match Day               │
│                                        │
│                   🔒                   │
│                   🏆                   │
│               Champion                 │
│               🎯 Goal!                 │
│                                        │
└────────────────────────────────────────┘
```

---

## Component Specifications

### 1. PathView.tsx

**Props:**
```typescript
interface PathViewProps {
  skillPath: SkillPath;
  userTree: UserTree;
  avatar: PlayerAvatar;
  onStartLesson: (lesson: SkillPathLesson) => void;
  onBack: () => void;
}
```

**Behavior:**
- Display winding SVG path connecting nodes
- Position lesson nodes along the path
- Show avatar bouncing on current lesson node
- Lock nodes that aren't unlocked yet

**Key Features:**
- Scrollable if path is tall
- Animated path segments (solid for complete, dashed for incomplete)
- Smooth camera follow when scrolling

---

### 2. LessonNode.tsx

**Props:**
```typescript
interface LessonNodeProps {
  lesson: SkillPathLesson;
  health?: number;           // For completed lessons
  isCurrent: boolean;
  isLocked: boolean;
  isGoal: boolean;           // Last lesson
  position: { x: number; y: number };
  avatar?: PlayerAvatar;     // Shows on current node
  onClick: () => void;
}
```

**States:**
| Status | Appearance |
|--------|------------|
| Completed | Green background, stars below, mini tree with health % |
| Current | Gold/amber background, pulsing ring, avatar bouncing |
| Locked | Grey background, padlock icon |
| Needs Refresh | Completed but health <50%, water drop badge |

**Visual Elements:**
- Circle with icon
- Stars (for completed)
- Mini tree health indicator
- Water drop badge (if thirsty)
- Goal marker (for final lesson)
- Pulsing animation on current

---

### 3. PathHeader.tsx

**Props:**
```typescript
interface PathHeaderProps {
  skillPath: SkillPath;
  completedCount: number;
  totalCount: number;
  onBack: () => void;
}
```

**Behavior:**
- Back button to garden
- Skill path icon and name
- Progress text: "X of Y lessons complete"

---

### 4. MiniTree.tsx (Shared)

**Props:**
```typescript
interface MiniTreeProps {
  health: number;    // 0-100
  size?: number;     // Default: 80
  showPot?: boolean; // Default: true
}
```

**Visual States:**
| Health | Appearance |
|--------|------------|
| 0% | Empty plot or seed |
| 1-30% | Bare branches, brown |
| 31-60% | Some leaves, yellowing |
| 61-85% | Healthy, full leaves |
| 86-100% | Full bloom, pink blossoms |

**Implementation:**
- SVG-based for scalability
- 5 distinct visual stages
- Color gradients based on health

**Reference:** See prototype `MiniTree` component

---

## Path Layout Algorithm

The path uses a fixed layout with positions calculated for each lesson:

```typescript
// Positions are percentage-based for responsiveness
const POSITIONS = [
  { x: 40, y: 12 },  // First lesson (top)
  { x: 65, y: 35 },  // Second
  { x: 35, y: 58 },  // Third
  { x: 55, y: 82 },  // Final lesson (bottom = goal)
];

// Path connects with curved segments
// Each segment is either:
// - Solid green (completed)
// - Dashed grey (incomplete)
```

---

## Animation Specifications

| Element | Animation | Duration |
|---------|-----------|----------|
| Node appear | Scale from 0 to 1 with spring | 300ms staggered |
| Current node ring | Pulse scale 1 to 1.6 | 1.5s infinite |
| Avatar on current | Bounce y: [0, -6, 0] | 1.5s infinite |
| Completed segment | Draw stroke | 400ms |
| Water drop badge | Bounce scale | 2s infinite |

---

## Testing Checklist

- [x] All lesson nodes render correctly
- [x] Completed nodes show stars and health
- [x] Current node has avatar and pulsing ring
- [x] Locked nodes show padlock
- [x] Path curve connects all nodes
- [x] Completed segments are solid green
- [x] Incomplete segments are dashed grey
- [x] Clicking current lesson starts it
- [x] Clicking completed lesson shows refresh option (if health low)
- [x] Clicking locked lesson does nothing
- [x] Back button returns to garden
- [x] Mini tree displays all 5 health stages correctly

---

## Confidence Criteria

| Requirement | Status |
|-------------|--------|
| PathView displays skill path | ✅ |
| LessonNode states work correctly | ✅ |
| Avatar animation on current | ✅ |
| Path segments render correctly | ✅ |
| MiniTree health visualization | ✅ |

---

## Reference

- **GAME_DESIGN.md** — Section 8 (Path View)
- **CLINE_GAME_IMPLEMENTATION.md** — Step 7 Phase A
- **prototype-v4-final.jsx** — Components: `PathView`, lesson node rendering

---

## Notes for Future Tasks

- `PathView` receives data from `useGarden` hook (Task 1.1.8)
- Refresh lesson functionality (Task 1.1.10)
- Sound effects for node clicks (Phase D)
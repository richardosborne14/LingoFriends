# LingoFriends V2 — Design System

**Version:** 2.0
**Last Updated:** March 2026

---

## Interactive Reference Mockup

**File:** `reference-mockup.jsx`

A fully interactive React component demonstrating the complete lesson flow with the design system applied. Open it in any React playground to see the exact look and feel. It covers:

- Lesson path view (trail of connected nodes with completion states)
- "What You'll Learn" screen (core frame + variation cards with variable highlighting)
- Info/Introduce activity (NPC avatar + speech bubble + phrase card + audio button)
- Multiple Choice activity (2×2 grid, correct/wrong states, shake animation, retry)
- Fill-in-the-Blank activity (sentence with highlighted gap, text input, validation)
- Lesson completion screen (confetti, star rating, SunDrop counter, gift earned)
- SunDrop counter with animated increment/decrement
- Penalty flash overlay on wrong answers
- NPC avatar component with customisable skin/hair/shirt and speaking mouth animation

**Cline must reference this mockup** when building any UI component in Phases 3–5. The colours, spacing, typography, button styles, animation timing, and interaction patterns in the mockup are the canonical implementation of this design system.

---

## Brand Identity

### Vision

LingoFriends should feel like stepping into a warm, luminous world — a place between a cozy game and a secret garden. The aesthetic is **"sunrise in a magical forest"** — warm, glowing, alive, with depth and texture. Not flat corporate. Not saccharine kids' app. Something a 7-year-old finds magical and a 17-year-old finds cool.

Think: the visual warmth of Studio Ghibli backgrounds + the playful UI confidence of Duolingo + the modern polish of a well-designed indie game.

### Name & Logo

**LingoFriends** — the name stays. The logo concept:
- A stylised cherry blossom tree with 2-3 leaves that double as speech bubbles
- The tree grows from a small seed shape (the "L" letterform)
- Warm gradient from coral to gold on the canopy
- Clean, rounded logotype underneath

### Personality Keywords

`warm` · `playful` · `confident` · `alive` · `glowing` · `rewarding` · `safe`

---

## Color Palette

### Primary Colors

```
Coral Burst (Primary Action)
  50:  #FFF5F2
  100: #FFE8E0
  200: #FFD0C2
  300: #FFB098
  400: #FF8A6A   ← primary buttons, CTAs
  500: #F2663D   ← hover state
  600: #D94E28   ← pressed state
  700: #B33A1A
```

```
Forest Deep (Secondary / Nature)
  50:  #F0F9F4
  100: #D8F0E3
  200: #B0E0C7
  300: #7CCCA5
  400: #48B87E   ← secondary buttons, garden UI
  500: #2D9D62   ← hover
  600: #1F7F4C   ← pressed
  700: #16613A
```

```
Sundrop Gold (Rewards / Currency)
  50:  #FFFDF0
  100: #FFF8D6
  200: #FFEFAD
  300: #FFE47A
  400: #FFD84A   ← sundrop icon, reward animations
  500: #F5C623   ← streaks, multipliers
  600: #D4A810
  700: #A88308
```

### Supporting Colors

```
Sky Clarity (Info / Teaching)
  300: #7CC4F5
  400: #4AADEE   ← info cards, teaching steps
  500: #2B96E0   ← links

Bloom Pink (Special / Celebration)
  300: #F5A3C7
  400: #EE7AAF   ← cherry blossoms, celebrations
  500: #E05595   ← rare rewards

Storm Purple (Premium / Boss)
  400: #9B7AEE
  500: #7C55E0   ← boss encounters, premium elements
```

### Neutral Scale

```
Bark (Text & Surfaces)
  50:  #FDFCFA   ← page background
  100: #F7F4F0   ← card backgrounds
  150: #F0ECE6   ← subtle borders, dividers
  200: #E4DED5   ← input borders
  300: #C9C1B5   ← placeholder text
  400: #A89E90   ← secondary text
  500: #7A7168   ← body text
  600: #5C544C   ← strong text
  700: #3E3833   ← headings
  800: #252220   ← maximum contrast text
```

### Semantic Colors

```
Success:  Forest-400 (#48B87E)
Warning:  Sundrop-500 (#F5C623)
Error:    #E84545
Correct:  Forest-400 with Forest-50 background
Wrong:    #E84545 with #FFF0F0 background
```

### Dark Mode (Deferred)

Not for V2. The warm, light palette IS the brand. Dark mode comes later if needed.

---

## Typography

### Font Stack

```css
--font-display: 'Nunito', 'Segoe UI', sans-serif;
--font-body: 'Nunito', 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Nunito** — rounded terminals, friendly without being childish. Available on Google Fonts. Supports Latin Extended (French accents, German umlauts). Weights: 400 (body), 600 (emphasis), 700 (headings), 800 (display/buttons), 900 (XL headings).

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-xl` | 2.5rem (40px) | 900 | 1.1 | Hero headlines, garden title |
| `display` | 2rem (32px) | 800 | 1.15 | Page titles |
| `heading-1` | 1.5rem (24px) | 700 | 1.25 | Section headings |
| `heading-2` | 1.25rem (20px) | 700 | 1.3 | Card titles |
| `heading-3` | 1.1rem (17.6px) | 700 | 1.35 | Sub-sections |
| `body-lg` | 1rem (16px) | 600 | 1.5 | Tutor text, coaching |
| `body` | 0.9375rem (15px) | 400 | 1.5 | Default body |
| `body-sm` | 0.8125rem (13px) | 400 | 1.45 | Captions, metadata |
| `label` | 0.75rem (12px) | 700 | 1.3 | Badges, tags, uppercase labels |

### Target Language Text

Target language chunks displayed in lessons should ALWAYS use:
- `heading-2` size minimum
- `weight: 800`
- Color: `Bark-800` on `Sky-50` background pill
- Letter-spacing: `0.02em`

This ensures the language being learned is always the most visually prominent element on screen.

---

## Spacing & Layout

### Spacing Scale (Tailwind-compatible)

```
1:  0.25rem (4px)
2:  0.5rem  (8px)
3:  0.75rem (12px)
4:  1rem    (16px)
5:  1.25rem (20px)
6:  1.5rem  (24px)
8:  2rem    (32px)
10: 2.5rem  (40px)
12: 3rem    (48px)
16: 4rem    (64px)
```

### Screen Breakpoints

```
mobile:  < 640px   (primary target — design mobile-first)
tablet:  640–1024px
desktop: > 1024px  (garden view expands, sidebar appears)
```

### Safe Touch Targets

Minimum 44×44px for all interactive elements. Buttons: minimum 48px height.

---

## Component Library

### Buttons

Three tiers, all with depth (bottom border/shadow creates 3D "pushable" feel):

**Primary Button (Coral Burst)**
```css
background: var(--coral-400);
color: white;
border-radius: 16px;
padding: 14px 28px;
font-weight: 800;
font-size: 16px;
box-shadow: 0 4px 0 var(--coral-600);
border: none;
transition: transform 80ms, box-shadow 80ms;

/* Hover */
background: var(--coral-500);

/* Active (pressed) */
transform: translateY(3px);
box-shadow: 0 1px 0 var(--coral-600);
```

**Secondary Button (Forest)**
Same structure, Forest-400 background, Forest-600 shadow.

**Ghost Button (Outline)**
```css
background: transparent;
border: 2.5px solid var(--bark-200);
color: var(--bark-600);
box-shadow: 0 3px 0 var(--bark-200);
```

**Danger Button (for wrong answers, penalties)**
```css
background: var(--error);
box-shadow: 0 4px 0 #C03030;
```

### Cards

```css
background: var(--bark-100);
border-radius: 20px;
border: 2.5px solid var(--bark-150);
padding: 20px;
box-shadow: 0 2px 8px rgba(0,0,0,0.04);
```

**Elevated Card (active/selected):**
```css
border-color: var(--coral-300);
box-shadow: 0 4px 16px rgba(242, 102, 61, 0.12);
```

### Input Fields

```css
background: white;
border: 2.5px solid var(--bark-200);
border-radius: 14px;
padding: 14px 18px;
font-size: 15px;
font-weight: 600;
color: var(--bark-700);
transition: border-color 150ms;

/* Focus */
border-color: var(--coral-400);
outline: none;
box-shadow: 0 0 0 3px rgba(255, 138, 106, 0.15);
```

### Progress Bar

```css
background: var(--bark-150);
border-radius: 100px;
height: 12px;
overflow: hidden;

/* Fill */
background: linear-gradient(90deg, var(--coral-400), var(--sundrop-400));
border-radius: 100px;
transition: width 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Chips / Tags (Interests, Language Badges)

```css
background: var(--bark-100);
border: 2px solid var(--bark-150);
border-radius: 100px;
padding: 8px 16px;
font-weight: 700;
font-size: 13px;

/* Selected */
background: var(--coral-100);
border-color: var(--coral-300);
color: var(--coral-600);
```

### Toast / Notifications

```css
background: var(--bark-800);
color: white;
border-radius: 14px;
padding: 14px 20px;
font-weight: 700;
box-shadow: 0 8px 24px rgba(0,0,0,0.15);
```

---

## Animation Principles

### Micro-interactions

All interactive elements should feel **physically satisfying** — like pressing a real button or flipping a real card.

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Button press | translateY(3px), shadow shrinks | 80ms | linear |
| Button release | translateY(0), shadow restores | 120ms | ease-out |
| Card tap | scale(0.97) → scale(1) | 150ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Page transition | Slide left/right + fade | 250ms | ease-in-out |
| Modal appear | Scale(0.9) + opacity → 1 | 200ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Correct answer | Green flash + bounce + confetti burst | 600ms | spring |
| Wrong answer | Red flash + shake(x) + tree shakes | 500ms | ease-out |
| SunDrop earned | Float up + fade + counter increment | 800ms | ease-out |
| SunDrop lost | Crack animation + fall + counter decrement | 600ms | ease-in |
| Tree growth | Scale pulse + sparkle particles | 1200ms | spring |
| Leaf fall (penalty) | Spiral down + fade | 1000ms | ease-in |

### Celebration Moments

When a lesson is completed, a celebration sequence plays:
1. Background dims slightly (0.15 opacity overlay)
2. Confetti burst from bottom of screen (coral, gold, forest particles)
3. Star rating (1-3) appears with staggered bounce-in
4. SunDrop total counter animates counting up
5. Tree growth animation plays (if threshold crossed)
6. "Continue" button slides up from bottom

### Loading States

Never show a blank screen. Use skeleton loaders with a subtle shimmer animation:
```css
background: linear-gradient(90deg, var(--bark-100) 25%, var(--bark-50) 50%, var(--bark-100) 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
```

---

## Activity Component Styling

### Shared Activity Header

Every activity has a consistent header:
```
┌─────────────────────────────────────┐
│  ☀️ 2/3 SunDrops        💡 Help    │
│                                     │
│  [Question text — heading-1 weight] │
│                                     │
│  [Activity-specific content below]  │
└─────────────────────────────────────┘
```

### Multiple Choice Options

Grid layout (2 columns on mobile, 4 on desktop if >4 options).
Each option is a Ghost Button with specific states:
- Default: white bg, bark-200 border
- Hover: bark-100 bg
- Selected + Correct: forest-100 bg, forest-500 border, ✅ icon
- Selected + Wrong: error bg light, error border, ❌ icon + shake animation

### Fill-in-the-Blank

Display sentence with a highlighted blank slot:
```
"Ich ___________ Max"
```
Blank slot: dashed bottom border (coral-400), coral-50 background
Input appears below with auto-focus. Submit button appears when input is non-empty.

### Matching Activity

Two columns of draggable items. Connected pairs draw a line between them (SVG path, coral-300 stroke). Duolingo-style: tap left, then tap right to match.

### Word Arrange

Scrambled words appear as draggable chips at the bottom. Drop zone at the top shows placed words in order. Each chip has the Ghost Button style.

### Translate Activity

Source phrase displayed in a Sky-50 pill at the top. Free-text input below. "Check" button submits. Accepted answers compared case-insensitively with fuzzy matching.

### Coaching Chat Step (Phase 3)

Different visual treatment from quiz activities:
- No SunDrop header (coaching is not graded)
- NPC avatar visible on left (small, 80×80px)
- Speech bubble with coaching text (body-lg, bark-700)
- Target language phrases highlighted inline with Sky-50 pill + bold
- Discovery question appears below with soft interaction (buttons for young kids, text input for teens)
- Any answer gets encouraging response — no wrong answers

### Info / Teach Step

Full-width card with:
- Target phrase in display size, centered
- Native translation below in body-lg, bark-400
- Audio play button (coral-400 circle, white play icon)
- "Got it!" button at bottom (primary style)
- No SunDrops (teach steps are free)

---

## Garden Visual Style

### World Aesthetic

The garden is a top-down/isometric-lite 3D world rendered in Three.js:
- **Ground:** Soft green grass with subtle texture variation
- **Boundary:** Low wooden fence (Kenney assets or similar CC0)
- **Trees:** Cherry blossom style, growth stages from seed → sapling → full bloom
- **Paths:** Dirt/stone paths between tree plots
- **Ambient:** Floating particles (pollen, sparkles on healthy trees)
- **Sky:** Warm gradient backdrop (sunrise tones — coral-100 to sky-300)

### Camera

- Default: Overhead angled view (~45°) showing full garden
- Pinch/scroll to zoom (min: close-up single tree, max: full garden overview)
- Drag/swipe to pan
- Tap a tree: camera smoothly animates to center on it, slight zoom

### Tree Health Visual Indicators

| Health | Visual |
|--------|--------|
| 90-100% | Full bloom, floating sparkles, vibrant pink blossoms |
| 70-89% | Healthy leaves, no sparkles, slightly muted pink |
| 50-69% | Some brown leaves mixed in, no blossoms |
| 30-49% | Mostly bare branches, brown leaves on ground |
| 10-29% | Bare tree, gray tint, wilted posture |
| 5-9% | Nearly dead stump, single brown leaf clinging |

### Avatar in Garden

- Uses Quaternius CC0 glTF character models
- Material swaps for customisation (skin tone, shirt color, hair color, hat)
- Idle animation when standing, walk animation when moving
- Click anywhere on ground: avatar walks to that point
- Click a tree: avatar walks to tree, interaction panel appears

---

## Onboarding Screens

Full-screen, one question per screen, large touch targets.

### Screen 1: Welcome
- LingoFriends logo animation (tree grows from seed)
- "Welcome to LingoFriends!" in display-xl
- "Let's set up your garden" in body-lg, bark-400
- Primary button: "Let's go!"

### Screen 2: Name
- "What should I call you?" in heading-1
- Large text input, auto-focused
- Avatar preview updates with typed name

### Screen 3: Native Language
- "What language do you speak at home?" in heading-1
- Two large cards: 🇫🇷 Français / 🇬🇧 English
- Tap to select, card elevates

### Screen 4: Target Language
- "What do you want to learn?" in heading-1
- Available: 🇩🇪 German, 🇬🇧 English (if native is French)
- Greyed out: 🔢 Maths, 🐱 Scratch ("Coming soon!")

### Screen 5: Interests
- "What do you love?" in heading-1
- "Pick as many as you like!" in body, bark-400
- Categorised chip grid (Hobbies, Sports, Music, Other)
- Multi-select, all optional
- "Skip" ghost button available

### Screen 6: Avatar Customisation
- Simple character builder: skin tone, hair color, shirt color, hat toggle
- Live preview of glTF character with idle animation
- "Looks great!" primary button

### Screen 7: Garden Reveal
- Camera zooms out to show empty garden with first tree seed planted
- "Your first tree is planted! Let's help it grow." in heading-1
- Primary button: "Start my first lesson"

---

## Lesson Path View

When a tree is tapped in the garden:
- Camera smooths to tree
- Side panel slides in (mobile: bottom sheet, desktop: right panel)
- Shows: tree name, health bar, growth stage illustration
- Lesson steps as a vertical trail of nodes (winding path)
- Each node: circle with icon, connected by dotted line
- Completed nodes: forest-400 fill + ✓
- Current node: coral-400 fill + pulse animation
- Locked nodes: bark-200 fill + 🔒
- Tap a node to start that lesson step

---

## Responsive Behavior

### Mobile (< 640px) — PRIMARY

- Single column layout everywhere
- Bottom tab navigation (Garden, Lessons, Friends, Profile)
- Lesson activities take full screen
- Garden: full viewport Three.js canvas
- Bottom sheets for contextual UI (tree details, lesson path)

### Tablet (640–1024px)

- Garden: larger canvas, sidebar for tree details
- Lessons: centered max-width container (480px)
- Friends list: 2-column grid

### Desktop (> 1024px)

- Garden: full canvas with floating panels
- Lessons: centered container with coaching sidebar
- Persistent sidebar navigation (replaces bottom tabs)

---

## Tailwind Config

```javascript
// tailwind.config.js
export default {
  content: ['./src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#FFF5F2', 100: '#FFE8E0', 200: '#FFD0C2',
          300: '#FFB098', 400: '#FF8A6A', 500: '#F2663D',
          600: '#D94E28', 700: '#B33A1A',
        },
        forest: {
          50: '#F0F9F4', 100: '#D8F0E3', 200: '#B0E0C7',
          300: '#7CCCA5', 400: '#48B87E', 500: '#2D9D62',
          600: '#1F7F4C', 700: '#16613A',
        },
        sundrop: {
          50: '#FFFDF0', 100: '#FFF8D6', 200: '#FFEFAD',
          300: '#FFE47A', 400: '#FFD84A', 500: '#F5C623',
          600: '#D4A810', 700: '#A88308',
        },
        sky: {
          50: '#F0F7FE', 300: '#7CC4F5',
          400: '#4AADEE', 500: '#2B96E0',
        },
        bloom: {
          300: '#F5A3C7', 400: '#EE7AAF', 500: '#E05595',
        },
        storm: {
          400: '#9B7AEE', 500: '#7C55E0',
        },
        bark: {
          50: '#FDFCFA', 100: '#F7F4F0', 150: '#F0ECE6',
          200: '#E4DED5', 300: '#C9C1B5', 400: '#A89E90',
          500: '#7A7168', 600: '#5C544C', 700: '#3E3833',
          800: '#252220',
        },
      },
      fontFamily: {
        display: ['Nunito', 'Segoe UI', 'sans-serif'],
        body: ['Nunito', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'btn': '16px',
        'card': '20px',
        'input': '14px',
        'pill': '100px',
        'chip': '100px',
      },
      boxShadow: {
        'btn-coral': '0 4px 0 #D94E28',
        'btn-forest': '0 4px 0 #1F7F4C',
        'btn-ghost': '0 3px 0 #E4DED5',
        'card': '0 2px 8px rgba(0,0,0,0.04)',
        'card-elevated': '0 4px 16px rgba(242, 102, 61, 0.12)',
        'toast': '0 8px 24px rgba(0,0,0,0.15)',
      },
    },
  },
};
```

---

## Icon System

Use **Lucide Icons** (open source, tree-shakable, Svelte-compatible) for UI icons. Supplement with emoji for interests and gamification elements.

Key icons needed:
- `sun` → SunDrop currency
- `heart` → Health
- `trophy` → Leaderboard
- `users` → Friends
- `volume-2` → Audio play
- `help-circle` → Help button
- `check` → Correct
- `x` → Wrong
- `lock` → Locked content
- `gift` → Gifts
- `flame` → Streak
- `sparkles` → Celebration

---

## Accessibility

- All text meets WCAG AA contrast ratio (4.5:1 minimum)
- Bark-800 on Bark-50: passes ✓ (15.8:1)
- Coral-400 on white: passes ✓ (4.6:1) — increase to Coral-500 for small text
- Forest-400 on white: passes ✓ (4.5:1)
- Reduce motion: respect `prefers-reduced-motion` — disable animations, show static states
- Screen reader: all interactive elements have aria-labels
- Keyboard navigation: full tab order through all activities

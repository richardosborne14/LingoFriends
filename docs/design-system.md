# LingoFriends Design System

**Version:** 1.0  
**Last Updated:** April 2026  
**Inspired by:** Duolingo's playful, gamified aesthetic

---

## Overview

This design system defines the visual language for LingoFriends, a kid-friendly language learning app. Our design goals are:

- **Playful & Inviting** - Bright colors, rounded shapes, friendly typography
- **Clear & Accessible** - Easy to read, easy to tap, high contrast
- **Encouraging** - Positive feedback, celebration moments, no stress
- **Consistent** - Unified look across all screens and components

---

## Quick Reference

```
Primary (Green):   #58CC02  - Success, progress, main actions
Secondary (Blue):  #1CB0F6  - Links, secondary actions
Accent (Orange):   #FF9600  - XP, highlights, rewards
Streak (Red):      #FF4B4B  - Hearts, streaks, warnings
Purple:            #CE82FF  - Premium, special content

Font:              Nunito (400, 500, 600, 700, 800)
Base spacing:      8px
Border radius:     12-24px (very rounded)
Min touch target:  44x44px
```

---

## Color Palette

### Primary Colors

Our primary palette is inspired by Duolingo's signature greens and blues.

#### Primary Green
The main brand color. Used for success states, progress, and primary actions.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#f0fdf4` | Backgrounds |
| `primary-100` | `#dcfce7` | Hover states |
| `primary-200` | `#bbf7d0` | Borders |
| `primary-300` | `#86efac` | Light accents |
| `primary-400` | `#4ade80` | Hover |
| `primary-500` | `#58CC02` | **Main green** |
| `primary-600` | `#4CAF00` | Pressed state |
| `primary-700` | `#3d8c00` | Dark accent |
| `primary-800` | `#326e00` | Very dark |
| `primary-900` | `#285500` | Darkest |

#### Secondary Blue
Used for links, secondary actions, and informational elements.

| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-50` | `#f0f9ff` | Backgrounds |
| `secondary-100` | `#e0f2fe` | Hover states |
| `secondary-200` | `#bae6fd` | Borders |
| `secondary-300` | `#7dd3fc` | Light accents |
| `secondary-400` | `#38bdf8` | Hover |
| `secondary-500` | `#1CB0F6` | **Main blue** |
| `secondary-600` | `#0284c7` | Pressed state |
| `secondary-700` | `#0369a1` | Dark accent |
| `secondary-800` | `#075985` | Very dark |
| `secondary-900` | `#0c4a6e` | Darkest |

### Accent Colors

#### Orange (XP & Rewards)
Used for XP indicators, achievements, and highlighting important information.

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-50` | `#fffbeb` | Backgrounds |
| `accent-500` | `#FF9600` | **Main orange** |
| `accent-600` | `#d97706` | Pressed state |

#### Red (Streak/Hearts)
Used for streaks, hearts, error states, and destructive actions.

| Token | Hex | Usage |
|-------|-----|-------|
| `streak-50` | `#fef2f2` | Error backgrounds |
| `streak-500` | `#FF4B4B` | **Main red** |
| `streak-600` | `#dc2626` | Pressed state |

#### Purple (Premium)
Used for premium features and special content.

| Token | Hex | Usage |
|-------|-----|-------|
| `purple-50` | `#faf5ff` | Backgrounds |
| `purple-500` | `#CE82FF` | **Main purple** |
| `purple-600` | `#9333ea` | Pressed state |

### Surface Colors

Neutral colors for backgrounds, text, and UI elements.

| Token | Hex | Usage |
|-------|-----|-------|
| `surface-50` | `#ffffff` | White, cards |
| `surface-100` | `#fafafa` | Page background |
| `surface-200` | `#f5f5f5` | Subtle backgrounds |
| `surface-300` | `#e5e5e5` | Borders |
| `surface-400` | `#d4d4d4` | Disabled elements |
| `surface-500` | `#a3a3a3` | Placeholder text |
| `surface-600` | `#737373` | Secondary text |
| `surface-700` | `#525252` | Body text |
| `surface-800` | `#262626` | Headings |
| `surface-900` | `#171717` | Darkest text |

### Legacy Colors

For backward compatibility with existing components:

| Token | Hex | Usage |
|-------|-----|-------|
| `paper` | `#fdfbf7` | Old background |
| `ink` | `#2d2d2d` | Old text color |

---

## Typography

### Font Family

**Nunito** is our primary font. It's friendly, rounded, and highly readable - perfect for kids.

```css
font-family: 'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Loaded from Google Fonts with weights: 400, 500, 600, 700, 800

### Font Weights

| Weight | Name | Usage |
|--------|------|-------|
| 400 | Regular | Body text |
| 500 | Medium | Emphasized text |
| 600 | Semibold | Subheadings |
| 700 | Bold | Headings, buttons |
| 800 | Extrabold | Hero text, numbers |

### Type Scale

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, labels |
| `text-sm` | 14px | 20px | Secondary text |
| `text-base` | 16px | 24px | Body text (minimum!) |
| `text-lg` | 18px | 28px | Large body |
| `text-xl` | 20px | 28px | Subheadings |
| `text-2xl` | 24px | 32px | Section headings |
| `text-3xl` | 30px | 36px | Page headings |
| `text-4xl` | 36px | 40px | Hero headings |
| `text-5xl` | 48px | 1 | Display |
| `text-6xl` | 60px | 1 | Jumbo display |

### Readability Rules

1. **Minimum body text: 16px** - Kids need larger text
2. **Line height: 1.5** - Generous spacing for readability
3. **Max line length: 65-75 characters** - Prevents eye strain
4. **Contrast: WCAG AA minimum** - 4.5:1 for normal text

---

## Spacing

### Base Unit

Our spacing system uses an **8px base unit**. All spacing values are multiples of 8px for visual consistency.

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `0` | 0 | 0px | No spacing |
| `px` | 1px | 1px | Borders |
| `0.5` | 0.125rem | 2px | Micro spacing |
| `1` | 0.25rem | 4px | Tight spacing |
| `2` | 0.5rem | **8px** | Base unit |
| `3` | 0.75rem | 12px | Small gaps |
| `4` | 1rem | **16px** | 2x base |
| `5` | 1.25rem | 20px | Medium gaps |
| `6` | 1.5rem | **24px** | 3x base |
| `8` | 2rem | **32px** | 4x base |
| `10` | 2.5rem | 40px | Large gaps |
| `11` | 2.75rem | **44px** | Min touch target |
| `12` | 3rem | **48px** | 6x base |
| `16` | 4rem | 64px | Section spacing |
| `20` | 5rem | 80px | Large sections |
| `24` | 6rem | 96px | Hero spacing |

### Common Patterns

```
Button padding:    px-6 py-3     (24px horizontal, 12px vertical)
Card padding:      p-6           (24px all sides)
Input padding:     px-4 py-3     (16px horizontal, 12px vertical)
Section gap:       gap-6 or gap-8 (24px or 32px)
Inline gap:        gap-2 or gap-3 (8px or 12px)
```

---

## Border Radius

We use **very rounded corners** for a friendly, approachable feel.

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0 | Sharp corners (rare) |
| `rounded-sm` | 4px | Subtle rounding |
| `rounded` | 8px | Default |
| `rounded-md` | 8px | Same as default |
| `rounded-lg` | 12px | Cards, containers |
| `rounded-xl` | 16px | Buttons, inputs |
| `rounded-2xl` | 20px | Large cards |
| `rounded-3xl` | 24px | Hero cards |
| `rounded-4xl` | 32px | Chunky buttons |
| `rounded-full` | 9999px | Pills, avatars |

### Guidelines

- **Buttons:** `rounded-2xl` (20px) minimum
- **Cards:** `rounded-3xl` (24px)
- **Inputs:** `rounded-xl` (16px)
- **Avatars/Icons:** `rounded-full`
- **Pills/Badges:** `rounded-full`

---

## Shadows

Shadows add depth and help elements "pop" without being harsh.

| Token | Effect | Usage |
|-------|--------|-------|
| `shadow-sm` | Subtle lift | Hover states |
| `shadow` | Default | Cards |
| `shadow-md` | Medium | Dropdowns |
| `shadow-lg` | Large | Modals |
| `shadow-xl` | Extra large | Featured content |
| `shadow-button` | 3D effect | Primary buttons |
| `shadow-button-hover` | Pressed | Button active state |
| `shadow-card` | Floating | Card components |
| `shadow-card-hover` | Lift effect | Card hover |
| `shadow-glow-primary` | Green glow | Success highlights |
| `shadow-glow-secondary` | Blue glow | Focus states |
| `shadow-glow-accent` | Orange glow | XP highlights |

### Button Shadow Example

```html
<!-- 3D button effect -->
<button class="shadow-button hover:shadow-button-hover active:shadow-button-hover">
  Click Me!
</button>
```

---

## Touch Targets

**Minimum touch target: 44x44px** (WCAG requirement)

This is critical for kids who may have less precise motor control.

```html
<!-- Good: Large tap target -->
<button class="min-h-11 min-w-11 p-3">🎯</button>

<!-- Bad: Too small -->
<button class="p-1">🎯</button>
```

### Interactive Element Minimums

| Element | Min Height | Min Width |
|---------|-----------|-----------|
| Buttons | 44px | 120px |
| Icon buttons | 44px | 44px |
| Form inputs | 44px | - |
| Checkboxes | 24px + padding | 24px + padding |
| Links (inline) | 44px line-height | - |

---

## Animations

Animations make the app feel alive and responsive. We use Framer Motion for complex animations and CSS for simple transitions.

### Built-in Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `animate-spin` | 1s | Loading spinners |
| `animate-ping` | 1s | Notification dots |
| `animate-pulse` | 2s | Loading skeletons |
| `animate-bounce` | 1s | Attention-getting |
| `animate-wiggle` | 0.5s | Playful emphasis |
| `animate-pop` | 0.3s | Element appearance |
| `animate-shake` | 0.5s | Error feedback |
| `animate-float` | 3s | Gentle floating |
| `animate-celebrate` | 0.6s | Success moments |
| `animate-slide-up` | 0.3s | Content entry |
| `animate-fade-in` | 0.2s | Subtle appearance |
| `animate-heartbeat` | 1.5s | Hearts, streaks |

### Transition Timing

| Duration | Use Case |
|----------|----------|
| 75ms | Instant feedback |
| 150ms | Micro-interactions |
| 200ms | Standard transitions |
| 300ms | Page transitions |
| 500ms | Complex animations |

### Animation Guidelines

1. **Keep it snappy** - Kids expect immediate feedback
2. **Use sparingly** - Too much animation is distracting
3. **Respect motion preferences** - Support `prefers-reduced-motion`
4. **Celebrate wins** - Use `animate-celebrate` for achievements

### Framer Motion Examples

```tsx
import { motion } from 'framer-motion';

// Button press animation
<motion.button
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.02 }}
>
  Click Me!
</motion.button>

// Success celebration
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: "spring", stiffness: 500, damping: 30 }}
>
  🎉 Great job!
</motion.div>

// Staggered list
<motion.ul>
  {items.map((item, i) => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.1 }}
    >
      {item.text}
    </motion.li>
  ))}
</motion.ul>
```

---

## Component Patterns

### Buttons

Use the pre-defined button classes from `main.css`:

```html
<!-- Primary - Main actions -->
<button class="btn-primary">Start Learning</button>

<!-- Secondary - Secondary actions -->
<button class="btn-secondary">Learn More</button>

<!-- Accent - Rewards/XP -->
<button class="btn-accent">Claim Reward</button>

<!-- Ghost - Subtle actions -->
<button class="btn-ghost">Cancel</button>

<!-- Danger - Destructive actions -->
<button class="btn-danger">Delete</button>
```

### Cards

```html
<div class="card">
  <h3 class="text-xl font-bold mb-2">Card Title</h3>
  <p class="text-surface-600">Card content goes here.</p>
</div>
```

### Form Inputs

```html
<input 
  type="text" 
  class="input"
  placeholder="Enter your name..."
/>
```

### Badges

```html
<span class="badge-primary">New</span>
<span class="badge-secondary">Info</span>
<span class="badge-accent">+50 XP</span>
```

### Progress Bars

```html
<div class="progress-bar">
  <div 
    class="progress-bar-fill bg-primary-500" 
    style="width: 65%"
  ></div>
</div>
```

---

## Z-Index Scale

Consistent layering prevents z-index wars.

| Token | Value | Usage |
|-------|-------|-------|
| `z-0` | 0 | Base content |
| `z-10` | 10 | Floating elements |
| `z-20` | 20 | Sticky headers |
| `z-30` | 30 | Dropdowns |
| `z-40` | 40 | Fixed navigation |
| `z-50` | 50 | Modals, overlays |
| `z-60` | 60 | Toast notifications |
| `z-70` | 70 | Tooltips |
| `z-80` | 80 | Confetti/celebrations |

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```html
<!-- Mobile: single column, Desktop: two columns -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

---

## Accessibility Checklist

- [ ] All interactive elements have 44x44px minimum touch targets
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus states are visible and use `ring-2`
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Form inputs have associated labels
- [ ] Images have alt text
- [ ] Interactive elements are keyboard accessible
- [ ] Error messages are clear and helpful

---

## Do's and Don'ts

### Do ✅
- Use bright, saturated colors
- Round all corners generously
- Make buttons chunky and tappable
- Celebrate achievements visually
- Use emoji for personality
- Keep text large and readable
- Use plenty of whitespace

### Don't ❌
- Use small text (below 16px for body)
- Create tiny tap targets
- Use harsh or corporate colors
- Overwhelm with animations
- Use complex gradients or textures
- Clutter the interface
- Make error messages scary

---

## File References

- **Tailwind Config:** `tailwind.config.js`
- **Global CSS:** `src/styles/main.css`
- **PostCSS Config:** `postcss.config.js`
- **UI Components:** `components/ui/` (to be created)

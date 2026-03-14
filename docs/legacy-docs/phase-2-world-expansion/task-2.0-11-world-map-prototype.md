# Task 2.0.11: World Map Prototype & Multiplayer Scope

**Status:** 🔲 Not started  
**Phase:** 2.0 — Wave 3  
**Dependencies:** 2.0.8 (Garden World Overhaul)  
**Estimated Time:** 4–6 hours  
**Priority:** Medium — teaser for future phase, builds excitement

---

## Problem Statement

The multiplayer world — servers, friend gardens, WebRTC voice chat, collaborative lessons — is a major future feature. But users need to see that the world has ambition beyond their individual garden. A "coming soon" world map teaser creates excitement and signals the vision.

---

## Objectives

1. Build a static "World Map" view accessible from the garden (button or map icon in header)
2. Show the user's garden as a labelled tile on the map
3. Show placeholder friend gardens as locked/foggy tiles with "Coming soon" labels
4. Show a "Server" concept (e.g., "Richard's World") as a title
5. No real multiplayer — all dummy data
6. Write a comprehensive scope document for the full multiplayer phase

---

## Implementation

### Step 1 — World Map View Component

**File:** `src/components/world/WorldMapView.tsx` (NEW)

A 2D map view (not Three.js — simple React/CSS) showing the world from above:

```typescript
interface WorldMapViewProps {
  userGarden: {
    name: string;          // User's display name
    avatar: AvatarOptions;
    treesPlanted: number;
    level: number;
  };
  serverName: string;       // e.g., "LingoFriends World"
  onClose: () => void;
}
```

Layout:
```
┌───────────────────────────────────────────┐
│  🌍 LingoFriends World         [Close X] │
│  ─────────────────────────────────────── │
│                                           │
│   ┌─────────┐   ┌ ─ ─ ─ ─ ┐            │
│   │ 🏡 Your │   │ 🔒      │            │
│   │ Garden  │   │ Friend 1 │            │
│   │ ⭐ Lv.3 │   │ Coming   │            │
│   │ 🌳 ×5   │   │ soon!    │            │
│   └─────────┘   └ ─ ─ ─ ─ ┘            │
│                                           │
│   ┌ ─ ─ ─ ─ ┐   ┌ ─ ─ ─ ─ ┐           │
│   │ 🔒      │   │ 🔒      │            │
│   │ Friend 2 │   │ Friend 3 │           │
│   │ Coming   │   │ Coming   │            │
│   │ soon!    │   │ soon!    │            │
│   └ ─ ─ ─ ─ ┘   └ ─ ─ ─ ─ ┘           │
│                                           │
│   ┌─────────────────────────────────┐    │
│   │ 🌐 Invite friends to join your  │    │
│   │    world! (Coming soon)          │    │
│   └─────────────────────────────────┘    │
│                                           │
│   ┌─────────────────────────────────┐    │
│   │ 🎤 Voice chat with friends      │    │
│   │    while you learn (Coming soon) │    │
│   └─────────────────────────────────┘    │
│                                           │
└───────────────────────────────────────────┘
```

### Step 2 — User's Garden Tile (Active)

The user's own garden tile is the only active one:
- Shows their avatar (small 3D canvas or static image)
- Shows level and tree count
- Tapping it returns to the garden view
- Bright, colourful, clearly "yours"

### Step 3 — Friend Garden Tiles (Locked)

3-5 placeholder friend tiles:
- Greyed out / semi-transparent
- Lock icon
- Dashed border
- "Coming soon!" label
- Random placeholder names or "???"

### Step 4 — Feature Preview Cards

At the bottom of the map, show upcoming feature cards:

```typescript
const UPCOMING_FEATURES = [
  {
    icon: '🌐',
    title: t('worldMap.inviteFriends'),
    description: t('worldMap.inviteFriendsDesc'),
  },
  {
    icon: '🎤',
    title: t('worldMap.voiceChat'),
    description: t('worldMap.voiceChatDesc'),
  },
  {
    icon: '👀',
    title: t('worldMap.watchFriends'),
    description: t('worldMap.watchFriendsDesc'),
  },
];
```

### Step 5 — Access from Garden

Add a globe/map icon to the garden header bar:

```typescript
// In garden header or navigation:
<button onClick={() => setShowWorldMap(true)} className="...">
  🌍
</button>
```

### Step 6 — Pocketbase Schema Prep (Lightweight)

Create the data model collections even though they won't be used yet. This ensures the schema is ready when multiplayer development begins:

**File:** `scripts/migrate-world-schema.cjs`

```javascript
// servers
{
  name: 'servers',
  fields: [
    { name: 'name', type: 'text' },
    { name: 'owner_id', type: 'relation', options: { collectionId: 'users' } },
    { name: 'invite_code', type: 'text' },
    { name: 'max_members', type: 'number', options: { default: 10 } },
    { name: 'created', type: 'date' },
  ]
}

// server_members
{
  name: 'server_members',
  fields: [
    { name: 'server_id', type: 'relation', options: { collectionId: 'servers' } },
    { name: 'user_id', type: 'relation', options: { collectionId: 'users' } },
    { name: 'role', type: 'select', options: { values: ['owner', 'member'] } },
    { name: 'garden_x', type: 'number' },  // Position on world map
    { name: 'garden_y', type: 'number' },
    { name: 'joined_at', type: 'date' },
  ]
}
```

---

## Testing Checklist

- [ ] World map accessible from garden via globe icon
- [ ] User's garden tile shows correct name, level, trees
- [ ] Friend tiles show locked/coming soon state
- [ ] Feature preview cards display correctly
- [ ] Tapping user's garden returns to garden view
- [ ] Close button works
- [ ] All text is translated (i18n)
- [ ] Map view scrolls if content overflows on small screens
- [ ] Pocketbase schema migration runs without errors

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/world/WorldMapView.tsx` | World map view component |
| `scripts/migrate-world-schema.cjs` | DB schema for servers (prep) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/garden/GardenWorld3D.tsx` | Add world map button |
| `src/locales/en.json` | Add worldMap translation keys |
| `src/locales/fr.json` | Add worldMap French translations |

---

## Scope Document Reference

The full multiplayer world scope document is at:
**`docs/phase-future/multiplayer-world-scope.md`**

This covers: servers, friend invitations, garden visiting, WebRTC voice, collaborative lessons, and child safety requirements.

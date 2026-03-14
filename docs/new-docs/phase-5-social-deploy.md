# Phase 5: Social & Deploy

**Status:** 🔲 Not started
**Estimated Time:** 12–18 hours
**Dependencies:** Phase 4 complete (full app works locally)
**Output:** Friends, leaderboards, gifts, deployed to Hetzner, Capacitor-ready for mobile

---

## Task 5.1: Friends System (3h)

### What to Do

**Route:** `src/routes/(app)/friends/+page.svelte`

### Add Friend Flow

1. "Add Friend" button → modal with text input
2. Enter friend code (e.g., "LF-A3K7M2")
3. Search: `GET /api/friends/search?code=LF-A3K7M2`
   - Returns: display name + avatar preview (no email, no personal data)
   - If not found: "No user found with that code"
4. Confirm: "Add {name} as a friend?"
5. Send request: `POST /api/friends/request`
6. Creates friendship with `status: 'pending'`

### Friend Requests

- Pending requests show at top of friends page with Accept/Decline buttons
- Accept → `status: 'accepted'`
- Decline → `status: 'rejected'`

### Friends List

- Grid of friend cards (2 columns mobile, 3 desktop)
- Each card shows: avatar, display name, streak, total SunDrops
- Tap friend → view their garden (read-only snapshot — just tree positions + stages, no interaction)

### API Routes

```
GET  /api/friends              → list accepted friends with stats
GET  /api/friends/requests     → list pending incoming requests
GET  /api/friends/search       → search by friend code
POST /api/friends/request      → send friend request
POST /api/friends/accept       → accept request
POST /api/friends/decline      → decline request
POST /api/friends/remove       → remove friend
```

### Acceptance Criteria
- [ ] Can add friend by code
- [ ] Friend requests appear for recipient
- [ ] Accept/decline works
- [ ] Friends list shows real data
- [ ] Friend cards display avatar, name, streak, SunDrops
- [ ] Can remove friends
- [ ] Cannot add yourself
- [ ] Cannot send duplicate requests

---

## Task 5.2: Leaderboard (2h)

### What to Do

**Component:** `src/lib/components/social/Leaderboard.svelte`

Display on the friends page (tab: "Friends" / "Leaderboard"):

```
┌─────────────────────────────────────────┐
│  🏆 Leaderboard                          │
│                                         │
│  This Week                              │  ← Toggle: This Week / All Time
│                                         │
│  🥇  Luna        ☀️ 127  🔥 14          │  ← Gold background
│  🥈  Max         ☀️ 98   🔥 7           │  ← Silver background
│  🥉  Sarah       ☀️ 85   🔥 3           │  ← Bronze background
│  4.  You         ☀️ 42   🔥 7           │  ← Highlighted (coral border)
│  5.  Pierre      ☀️ 31   🔥 2           │
│                                         │
└─────────────────────────────────────────┘
```

**API:** `GET /api/leaderboard?period=week|alltime`

- Returns friends + self, ranked by SunDrops earned in period
- Weekly resets every Monday 00:00 UTC
- All-time uses `profiles.totalSunDrops`
- Current user always highlighted regardless of position

### Acceptance Criteria
- [ ] Leaderboard shows friends ranked by SunDrops
- [ ] Weekly/All Time toggle works
- [ ] Current user is highlighted
- [ ] Top 3 have medal styling
- [ ] Empty state: "Add friends to see the leaderboard!"

---

## Task 5.3: Gift System (2h)

### What to Do

**Earned gifts:** After completing a lesson with 2+ stars, user earns a random gift to send.

**Gift types:**
| Gift | Effect | Visual |
|------|--------|--------|
| Water Drop 💧 | +1 day buffer on recipient's tree | Blue droplet |
| Sparkle ✨ | +3 days buffer on recipient's tree | Gold sparkle |
| Seed 🌱 | +1 available seed for recipient | Green seed |
| Ribbon 🎀 | Decoration on tree (cosmetic only) | Pink ribbon |

**Send gift flow:**
1. Lesson complete → "You earned a gift! 🎁" modal
2. Show gift with description
3. "Send to a friend" → friend picker (list of accepted friends)
4. Select friend → optionally select which tree
5. Confirm → `POST /api/gifts/send`

**Receive gift flow:**
1. On garden load, check for pending gifts: `GET /api/gifts/pending`
2. Show notification: "{Name} sent you a 💧!"
3. Tap to apply → gift effect added to tree
4. Visual celebration (sparkle particles on tree)

### Acceptance Criteria
- [ ] Gift earned after 2+ star lesson completion
- [ ] Can send gift to any friend
- [ ] Recipient sees pending gift notification
- [ ] Applying gift updates tree in DB
- [ ] Buffer days correctly reduce health decay
- [ ] Gift appears in tree's decorations array

---

## Task 5.4: Hetzner Deployment (4h)

### What to Do

**Target:** Hetzner Cloud VPS (CX21 or similar — 2 vCPU, 4GB RAM, 40GB SSD)

### Server Setup (Cline via SSH)

1. **Provision VPS:**
   - Ubuntu 24.04
   - Enable firewall: allow 22, 80, 443

2. **Install dependencies:**
   ```bash
   apt update && apt upgrade -y
   apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
   ```

3. **Docker Compose:**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:16
       environment:
         POSTGRES_DB: lingofriends
         POSTGRES_USER: lingofriends
         POSTGRES_PASSWORD: ${DB_PASSWORD}
       volumes:
         - pgdata:/var/lib/postgresql/data
       restart: always

     app:
       build: .
       environment:
         DATABASE_URL: postgresql://lingofriends:${DB_PASSWORD}@postgres:5432/lingofriends
         ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
         GROQ_API_KEY: ${GROQ_API_KEY}
         GOOGLE_TTS_API_KEY: ${GOOGLE_TTS_API_KEY}
         ORIGIN: https://lingofriends.com
       ports:
         - "3000:3000"
       depends_on:
         - postgres
       restart: always

   volumes:
     pgdata:
   ```

4. **Dockerfile:**
   ```dockerfile
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:20-alpine
   WORKDIR /app
   COPY --from=build /app/build ./build
   COPY --from=build /app/package*.json ./
   COPY --from=build /app/node_modules ./node_modules
   EXPOSE 3000
   CMD ["node", "build"]
   ```

5. **Nginx config:**
   ```nginx
   server {
       listen 80;
       server_name lingofriends.com www.lingofriends.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **SSL:**
   ```bash
   certbot --nginx -d lingofriends.com -d www.lingofriends.com
   ```

7. **DNS records** (Richard sets these):
   ```
   A    lingofriends.com      → [VPS IP]
   A    www.lingofriends.com  → [VPS IP]
   ```

8. **Run migrations on first deploy:**
   ```bash
   docker compose exec app npx drizzle-kit migrate
   docker compose exec app npx tsx src/lib/server/db/seed.ts
   ```

### Acceptance Criteria
- [ ] Docker containers start and stay running
- [ ] App accessible at https://lingofriends.com
- [ ] SSL certificate active (HTTPS enforced)
- [ ] Postgres data persists across container restarts
- [ ] API keys are in environment variables, not in code
- [ ] nginx proxies correctly
- [ ] Health check endpoint responds: `GET /api/health`

---

## Task 5.5: Capacitor Mobile Setup (2h)

### What to Do

```bash
npm install @capacitor/core @capacitor/cli
npx cap init LingoFriends com.lingofriends.app --web-dir build
npx cap add ios
npx cap add android
```

**Configure `capacitor.config.ts`:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lingofriends.app',
  appName: 'LingoFriends',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
};

export default config;
```

**Mobile-specific considerations:**
- Touch targets already ≥ 44px (design system)
- Bottom tab bar already implemented
- Three.js canvas uses `devicePixelRatio` for sharp rendering
- Safe area insets: add `env(safe-area-inset-*)` padding to layout

**Build and sync:**
```bash
npm run build
npx cap sync
npx cap open ios     # Opens Xcode
npx cap open android # Opens Android Studio
```

### Acceptance Criteria
- [ ] `cap sync` succeeds without errors
- [ ] App opens in iOS simulator
- [ ] App opens in Android emulator
- [ ] Three.js garden renders correctly on mobile
- [ ] Touch interactions work (tap, pinch zoom, drag)
- [ ] Bottom tab navigation works
- [ ] Safe area insets respected (no content under notch/home bar)

---

## Task 5.6: Final Integration Testing (2h)

### What to Do

Run through the complete user journey on the deployed server:

1. **Registration:** Create account, get friend code
2. **Onboarding:** Complete all 7 steps
3. **Garden:** See first tree seed, avatar moves around
4. **Tap tree:** Panel opens with lesson trail
5. **Start lesson:** Pre-lesson chat works, lesson generates
6. **Play through:** All activity types work, audio plays
7. **Complete:** Stars, SunDrops, tree growth, celebration
8. **Return to garden:** Tree has grown, health is 100
9. **Add friend:** Search by code, send request
10. **Accept (from other account):** Friend appears in list
11. **Leaderboard:** Both users visible
12. **Send gift:** Earn from lesson, send to friend
13. **Receive gift:** Notification, apply to tree

### Acceptance Criteria
- [ ] All 13 journey steps pass
- [ ] No console errors
- [ ] No 500 responses
- [ ] Page load times < 3 seconds
- [ ] Lesson generation < 5 seconds
- [ ] Mobile layout: no horizontal scroll, no overlapping elements

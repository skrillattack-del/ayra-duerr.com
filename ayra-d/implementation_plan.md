# Progress Dashboard — Full Feature Extension

Replace the current placeholder Progress page (`/dashboard/progress`) with a premium, data-rich analytics dashboard that surfaces the extensive backend data already available (lift tracking, workout instances, XP/leveling, streaks) into a visually stunning, multi-tabbed experience.

## Background

The backend already has:
- **Lift Tracking API** (`/api/lifts`) — UserLift CRUD, SetLog logging with auto 1RM (Brzycki/Epley), PR detection, trend analysis, analytics endpoint with weekly volume, PR progression, rep distributions
- **Workout Instances** (`/api/workouts`) — full workout logs with exercises, sets, duration, timestamps
- **UserStats model** — XP, level, current/longest streak, workouts_completed, messages_sent, etc.
- **XP/Leveling system** — `leveling.ts` on both frontend and backend

The frontend has **none of this surfaced** — the Progress page is a 23-line placeholder with an empty state icon.

---

## Proposed Changes

### Frontend Repository Layer

#### [NEW] [LiftRepository.ts](file:///c:/Users/Matux/OneDrive/Desktop/SIDE-TRACKED/gongafit/FitsiteGonga/src/repositories/LiftRepository.ts)
Frontend repository mirroring the backend lift API:
- `listLifts()` → `GET /api/lifts` — all tracked lifts with stats, trends, best/last sets
- `createLift(data)` → `POST /api/lifts` — start tracking a new exercise
- `getLiftDetail(id)` → `GET /api/lifts/:id` — full lift with set history and all-time PR
- `updateLift(id, data)` → `PATCH /api/lifts/:id` — update working weight, goals
- `deleteLift(id)` → `DELETE /api/lifts/:id` — stop tracking (soft delete)
- `logSet(liftId, data)` → `POST /api/lifts/:id/sets` — log a single set with weight/reps/RPE
- `getHistory(liftId, page, limit)` → `GET /api/lifts/:id/history` — paginated set history
- `getAnalytics(liftId)` → `GET /api/lifts/:id/analytics` — PR progression, weekly volume, rep distribution

#### [NEW] [StatsRepository.ts](file:///c:/Users/Matux/OneDrive/Desktop/SIDE-TRACKED/gongafit/FitsiteGonga/src/repositories/StatsRepository.ts)
Frontend repository for user stats/gamification:
- `getMyStats()` → `GET /api/users/me/stats` — XP, level, streaks, workout counts
- `getWorkoutSummary(period)` → derives from workout instances

> [!NOTE]
> The `/api/users/me/stats` endpoint may need to be added to `userRoutes.ts` if it doesn't exist. We'll check during implementation and add it if needed.

---

### Progress Page — Multi-Tab Dashboard

#### [MODIFY] [page.tsx](file:///c:/Users/Matux/OneDrive/Desktop/SIDE-TRACKED/gongafit/FitsiteGonga/src/app/dashboard/progress/page.tsx)
Replace the 23-line placeholder with a full tabbed Progress Dashboard. The page will use the same tab pattern as the Workouts page (`bg-white p-1.5 rounded-2xl` tab bar with `bg-clean-accent text-white` active state).

**4 Tabs:**

##### Tab 1: Overview
The at-a-glance summary. Features:
- **Hero Stats Row** (4 cards): Current Streak 🔥, Total Workouts, XP Level (with progress bar using `levelProgress()`), Workout Time this week
- **Activity Heatmap**: GitHub-style contribution grid showing workout days over the past 12 weeks, colored by intensity (workout count per day). Uses `clean-accent` with varying opacity levels
- **Recent PRs Feed**: A scrollable list of recent personal records from the lift system, each showing exercise name, weight×reps, estimated 1RM, and date. Marked with a ⚡ icon and accent glow
- **Weekly Volume Sparkline**: Compact bar chart showing total volume (weight × reps) per week for the past 8 weeks, rendered as inline SVG bars

##### Tab 2: Lifts (The Forge)
The lift tracking and analytics powerhouse:
- **Tracked Lifts Grid**: Card for each tracked lift showing exercise name, working weight, trend indicator (↑ up / → stable / ↓ down), last set, best estimated 1RM, and goal progress (if set). Cards are clickable to expand
- **Add Lift Modal**: Exercise picker (reuses the same `ALL_EXERCISES` + `EXERCISE_MAP` from `lib/exercises.ts`) + starting weight/unit + optional goal
- **Lift Detail Drawer** (slide-over panel when a lift is clicked):
  - 1RM Progression Chart — SVG line chart showing estimated 1RM over time from `prProgression` data
  - Weekly Volume Bars — SVG bar chart from `weeklyVolume` data
  - Rep Range Distribution — Donut/ring chart from `repDistribution` data
  - Set History Table — Paginated table of all sets with weight, reps, RPE, PR badge, date
  - Goal Progress — if a goal is set, show a visual progress bar from current → target weight
- **Quick Log**: Inline set logging directly from the lift card — enter weight/reps/RPE, submit, see instant PR detection feedback

##### Tab 3: Body
Body measurements and progress photos (future-ready, with a premium "coming soon" treatment):
- **Body Weight Chart**: Placeholder ready for body weight tracking (model doesn't exist yet)
- **Measurement Tracking**: Placeholder for chest/waist/hips/arms measurements
- **Progress Photos**: Side-by-side comparison slots (placeholder)
- All three sections styled as frosted-glass cards with a "Coming Soon" badge and subtle lock icon, matching the existing Challenges page pattern but less blocky — these should feel aspirational, not locked out

##### Tab 4: Stats
Deep gamification stats:
- **Level Card**: Large level display with XP progress bar, XP-to-next-level counter, animated fill on load
- **Streak Calendar**: Monthly calendar view showing active days, current streak highlighted in accent color, longest streak displayed
- **Achievement Summary**: Count of total achievements earned (from `UserAchievement` model), with badges displayed in a grid
- **Lifetime Stats Grid**: Total workouts, total sets logged, total volume lifted, total workout time, messages sent, squads joined, friends count — all from `UserStats`

---

### Charts — Pure SVG Components (No Library Dependencies)

All charts will be rendered as **pure SVG with React** — no chart library needed. This keeps the bundle lean and matches the app's existing pattern of no heavy third-party UI deps.

#### [NEW] [ProgressCharts.tsx](file:///c:/Users/Matux/OneDrive/Desktop/SIDE-TRACKED/gongafit/FitsiteGonga/src/components/progress/ProgressCharts.tsx)
Reusable chart components:
- `<LineChart>` — SVG line/area chart for 1RM progression (smooth bezier curves, gradient fill, dot markers at data points, tooltip on hover)
- `<BarChart>` — SVG bar chart for weekly volume (rounded tops, clean-accent fill, label below)
- `<RingChart>` — SVG donut for rep distribution (animated arc segments, center label, legend)
- `<HeatmapGrid>` — SVG grid for activity heatmap (12 weeks × 7 days, 5 opacity levels)
- `<SparkBars>` — Compact inline SVG bar sparkline for summary cards

All charts will:
- Use `clean-accent` and `clean-accent-soft` colors from the theme system
- Include Framer Motion `animate` for entrance animations
- Be responsive (use viewBox + percentages)
- Show an empty state when no data is available

---

### CSS Additions

#### [MODIFY] [globals.css](file:///c:/Users/Matux/OneDrive/Desktop/SIDE-TRACKED/gongafit/FitsiteGonga/src/app/globals.css)
Add a small number of progress-specific utilities:
- `.progress-card` — the standard card style used across all progress panels
- `.progress-stat-glow` — subtle glow effect for stat numbers (uses `clean-accent` shadow)
- `.progress-ring-animate` — keyframe for ring chart segment animation
- `.progress-heatmap-cell` — base styles for heatmap cells with 5 intensity levels

---

## Design Language

The Progress Dashboard will match the existing dashboard design system exactly:
- **Cards**: `bg-white rounded-2xl p-5 border border-gray-100 shadow-sm` (all remapped through the compatibility bridge to theme tokens)
- **Tab bar**: Same pill-style tabs as Workouts page
- **Accent colors**: `clean-accent` (theme-aware — hot pink in Cyberpunk, gold in Retro, etc.)
- **Typography**: `font-bold` for headings, `font-semibold` for labels, `text-sm` for body
- **Animations**: Framer Motion for page transitions, stat counter animations, chart entrances
- **Empty states**: Centered icon (opacity-40) + guidance text, consistent with Workouts/Nutrition
- **Responsive**: Desktop grid (3-4 columns) → tablet (2 columns) → mobile (single column stack)

---

## User Review Required

> [!IMPORTANT]
> **Body Measurements tab**: The Prisma schema has no `BodyMeasurement` or `BodyWeight` model. The "Body" tab will be implemented as a polished "Coming Soon" section (similar to the Challenges teaser). Should I also add the backend model + migration for body tracking, or keep it frontend-only for now?

> [!IMPORTANT]
> **Stats endpoint**: The `UserStats` model exists in the schema but I need to verify if there's an existing API endpoint to fetch it. If not, I'll add a simple `GET /api/users/me/stats` route to the backend. Is modifying the backend acceptable?

---

## Open Questions

> [!IMPORTANT]
> **Chart interactions**: The SVG charts will include hover tooltips showing exact values. Should they also support tap-to-inspect on mobile, or is hover-only sufficient?

> [!NOTE]
> **Drag-to-reorder lifts**: The backend supports `display_order` on UserLift and the app already uses `@dnd-kit` for other features. Should the lift cards be drag-reorderable, or is a simpler list sufficient for v1?

---

## Files Summary

| Action | File | Description |
|--------|------|-------------|
| NEW | `src/repositories/LiftRepository.ts` | Frontend API client for lift tracking |
| NEW | `src/repositories/StatsRepository.ts` | Frontend API client for user stats |
| NEW | `src/components/progress/ProgressCharts.tsx` | SVG chart components (Line, Bar, Ring, Heatmap, Spark) |
| MODIFY | `src/app/dashboard/progress/page.tsx` | Full Progress Dashboard (4 tabs, ~600-800 lines) |
| MODIFY | `src/app/globals.css` | Progress-specific CSS utilities |
| MAYBE | `backend/src/routes/userRoutes.ts` | Add stats endpoint if missing |

**No new npm dependencies.** All charts are pure SVG+React. Existing deps used: Framer Motion (animations), Lucide React (icons), `@dnd-kit` (if drag-reorder is approved).

---

## Verification Plan

### Manual Verification
- Run `npm run dev` and navigate to `/dashboard/progress`
- Verify all 4 tabs render and switch correctly
- Verify lift tracking: add a lift, log sets, see charts populate
- Verify responsiveness: check mobile/tablet/desktop breakpoints
- Verify theme compatibility: switch between all 5 themes, ensure all charts and cards respect theme tokens
- Check empty states when no data exists
- Test the lift detail drawer open/close animations

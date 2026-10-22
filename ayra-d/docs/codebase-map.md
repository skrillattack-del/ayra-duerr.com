# FitsiteGonga — Codebase Map

> High-level scan of the `FitsiteGonga` repo. Use this as a quick reference for architecture, data model, API surface, and developer workflow.

---

## 1. Stack & Entry Points

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14 App Router, React 18.2, TypeScript (strict), Tailwind CSS |
| **State / UI** | Zustand (ready), React Hook Form + Zod, Radix UI primitives, Framer Motion, Lucide icons |
| **Backend** | Node.js 20, Express 4, Socket.io 4 |
| **Database** | PostgreSQL 16, Prisma 6.18 ORM |
| **Auth** | JWT access (15 min) + refresh (7 day) tokens, bcrypt password hashing |
| **Storage** | Local disk uploads via `multer`, served through backend media proxy |
| **Testing** | Vitest (unit), Playwright (E2E), Storybook |
| **Tooling** | ESLint, Prettier, PostCSS, GitHub Actions CI |

### Key entry files

- Frontend dev server: `src/app/layout.tsx` → `src/app/page.tsx` (landing/auth) → `src/app/dashboard/layout.tsx` (app shell)
- Backend server: `backend/src/server.ts` → `backend/src/routes/index.ts`
- DB schema: `backend/prisma/schema.prisma`
- Env loading: `backend/src/env.ts` (loads `backend/.env` relative to `__dirname`)

---

## 2. Environment Contract

### Frontend — `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
# Optional:
# NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
# NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### Backend — `backend/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fitsite"
JWT_SECRET="..."          # openssl rand -hex 32
JWT_REFRESH_SECRET="..."  # openssl rand -hex 32
PORT=4000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
# Optional:
# LOCAL_STORAGE_DIR="./uploads"  # defaults to backend/uploads
# CORS_ORIGIN="http://localhost:3000"
```

### Docker Compose — `docker-compose.yml`

- Single service: `postgres:16-alpine`
- Container name: `fitsite_postgres`
- Port: `5432:5432`
- DB/user/pass: `fitsite` / `postgres` / `postgres`
- Volume: `postgres_data`

---

## 3. Domain Model (Prisma)

Generator: `prisma-client-js`. Datasource: PostgreSQL via `DATABASE_URL`.

### Core identity

- `User` — `id`, `email` (unique), `password_hash`, `display_name`, `avatar_url`, `role`, `membership_tier`, `subscription_status`, `trial_ends_at`, `fitness_level`, `goals[]`, timestamps.
- Enums: `Role { CLIENT, TRAINER, ADMIN }`, `MembershipTier { FREE, PAID }`, `SubscriptionStatus { ACTIVE, CANCELLED, PAST_DUE, EXPIRED }`, `FitnessLevel { BEGINNER, INTERMEDIATE, ADVANCED }`.

### Legacy challenge system

- `Challenge` — creator, category/type, goal, dates, participants.
- `ProgressLog` — user progress against a challenge.
- `Achievement` / `UserAchievement` — badge/award system.

### Messaging (Sector 01: The Nexus)

- `Message` — sender, channel/squad/direct recipient, media, threaded replies, soft-delete flags.
- `MessageReaction` — emoji reactions on messages.
- `Channel` — squad-owned or global text channels.

### Squads & social

- `Squad` / `SquadMember` / `SquadInvite` / `SquadChallenge`
- `Friendship` — bidirectional user relationship with status.

### Lift tracking (Sector 02: The Forge)

- `UserLift` — per-user exercise profile (working weight, 1RM, goals).
- `SetLog` — logged sets (weight, reps, RPE, tempo, estimated 1RM, volume).
- `LiftGoal` — target/tracking goals tied to a lift.

### Workout planning & logging

- `WorkoutTemplate` — reusable templates with `exercises` stored as JSON.
- `ScheduledWorkout` — calendar scheduling of templates.
- `WorkoutInstance` — actual logged workout session.
- `ExerciseInstance` / `SetInstance` — nested workout log details.

### Programs

- `Program` — multi-week program template; `user_id` null for public/admin programs.
- `ProgramWeek` / `ProgramWorkout` — weekly schedule referencing workout templates.
- `UserProgram` — user enrollment/status.

### Trainer relationships

- `TrainerClient` — trainer/client link with permission flags.

### Nutrition

- `Meal` — public/admin meals with macros and optional featured date.
- `MealPlan` / `MealPlanEntry` — user meal planning.
- `NutritionLog` — logged meals.

### Shared enums

`WeightUnit { LBS, KG }`, `WorkoutType { PUSH, PULL, LEGS, UPPER, LOWER, FULL_BODY, CARDIO, REST, CUSTOM }`, `WorkoutStatus`, `ProgramStatus`, `ChannelType { GLOBAL, SQUAD, DIRECT, TRAINER, TEXT }`, `SquadRole`, `InviteStatus`, `FriendshipStatus`, `LiftGoalType`, `GoalStatus`, `Tier`, `AchievementCategory`, `Category`, `ChallengeType`, `SquadVisibility`.

---

## 4. API Surface

All backend routes are mounted in `backend/src/routes/index.ts` under `/api`.

### Auth — `POST /api/auth/*`

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users — `/api/users`

- `GET /api/users/me`
- `PATCH /api/users/me`
- `POST /api/users/me/avatar`
- `PUT /api/users/:id/membership` (admin only)

### Workouts — `/api/workouts`

- `GET /api/workouts/templates`
- `POST /api/workouts/templates`
- `GET /api/workouts/templates/:id`
- `PUT /api/workouts/templates/:id`
- `DELETE /api/workouts/templates/:id`
- `GET /api/workouts/schedule`
- `POST /api/workouts/schedule`
- `PATCH /api/workouts/schedule/:id`
- `DELETE /api/workouts/schedule/:id`
- `GET /api/workouts`
- `POST /api/workouts`

### Programs — `/api/programs`

- `GET /api/programs`
- `POST /api/programs`
- `GET /api/programs/my`
- `GET /api/programs/calendar`
- `GET /api/programs/:id`
- `PUT /api/programs/:id`
- `DELETE /api/programs/:id`
- `POST /api/programs/:id/enroll` (paid/admin only)

### Lifts — `/api/lifts`

- `GET /api/lifts`
- `POST /api/lifts`
- `GET /api/lifts/:liftId`
- `PATCH /api/lifts/:liftId`
- `DELETE /api/lifts/:liftId`
- `POST /api/lifts/:liftId/sets`
- `GET /api/lifts/:liftId/history`
- `DELETE /api/lifts/:liftId/sets/:setId`
- `GET /api/lifts/:liftId/analytics`

### Nutrition — `/api/nutrition`

- `GET /api/nutrition/meals`
- `GET /api/nutrition/meals/today`
- `GET /api/nutrition/meals/:id`
- `POST /api/nutrition/meals` (admin)
- `PUT /api/nutrition/meals/:id` (admin)
- `DELETE /api/nutrition/meals/:id` (admin)
- `POST /api/nutrition/log`
- `GET /api/nutrition/log`
- `GET /api/nutrition/summary`

### Messages — `/api/messages`

- `GET /api/messages/global`
- `POST /api/messages`
- `GET /api/messages/:messageId/thread`
- `PATCH /api/messages/:messageId`
- `DELETE /api/messages/:messageId`
- `POST /api/messages/:messageId/reactions`
- `GET /api/messages/squads`
- `POST /api/messages/squads`
- `GET /api/messages/squads/:squadId`
- `POST /api/messages/squads/:squadId/invite`
- `POST /api/messages/squads/:squadId/join`
- `DELETE /api/messages/squads/:squadId/leave`
- `GET /api/messages/direct/:userId`
- `GET /api/messages/conversations`
- `POST /api/messages/upload`

### Squad Channels — `/api/messages/squads/:squadId/channels`

- `GET /` (list channels)
- `POST /` (create channel)
- `GET /channel/:channelId`
- `PATCH /channel/:channelId`
- `DELETE /channel/:channelId`
- `POST /channel/:channelId/messages`
- `POST /channel/:channelId/messages/:messageId/reactions`
- `DELETE /channel/:channelId/messages/:messageId/reactions/:emoji`

### Challenges — `/api/challenges`

- `GET /api/challenges`
- `GET /api/challenges/:id`
- `POST /api/challenges` (trainer/admin)
- `PUT /api/challenges/:id` (trainer/admin)
- `DELETE /api/challenges/:id` (trainer/admin)
- `POST /api/challenges/:id/join`
- `POST /api/challenges/:id/leave`

### Progress — `/api/progress`

- `GET /api/progress`
- `GET /api/progress/:id`
- `POST /api/progress`
- `PUT /api/progress/:id`
- `DELETE /api/progress/:id`

### Storage — `/api/storage`

- `POST /api/storage/upload-url`
- `POST /api/storage/upload-url/progress-photo`
- `PUT /api/storage/upload?key=...`
- `DELETE /api/storage/:key`

### Media proxy

- `GET /api/media/*` — serves files from local storage.

### Admin — `/api/admin`

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/activity`
- `PUT /api/admin/users/:id/role`

### Health / metrics

- `GET /health`
- `GET /metrics`

---

## 5. Auth Flow

1. **Registration / login** — `authRoutes` hashes passwords with bcrypt, issues `accessToken` + `refreshToken` via `authService.generateTokens()`.
2. **Token shape** — `JWTPayload { userId, email, role, membership_tier }`.
3. **Middleware** — `authenticateJWT` reads `Authorization: Bearer <token>` or `accessToken` cookie, verifies with `authService.verifyAccessToken()`, and attaches `req.user`.
   - `requireRole(roles)` — role guard.
   - `requirePaid` — paid or admin only.
   - `requireAdmin` — admin only.
   - `optionalAuth` — attaches user if token is valid, never fails.
4. **Frontend client** — `src/lib/apiClient.ts` reads token from `localStorage`, sends `Authorization` header, includes credentials.
5. **Auth state** — `src/hooks/useAuth.ts` uses `AuthRepository` to load the current user on mount; `logout()` clears state + token.
6. **Socket.io** — `src/lib/socketClient.ts` sends the access token in the handshake `auth.token`.

---

## 6. Frontend Structure

```text
src/app/
  page.tsx              # Landing + auth (login/signup)
  layout.tsx            # Root layout + ToastProvider
  admin/page.tsx        # Admin console
  dashboard/
    layout.tsx          # Sidebar + header shell
    page.tsx            # Dashboard overview
    workouts/page.tsx
    programs/page.tsx
    nutrition/page.tsx
    progress/page.tsx
    community/page.tsx
    challenges/page.tsx
    settings/page.tsx

src/components/
  admin/                # HomepagePeopleEditor
  fitness/              # ActiveLiftTracker, ExercisePicker, LiftTracker, WeekPlanner
  layout/               # AppLayout, AuthLayout, TriSectorSidebar
  messaging/            # GlobalChat, SquadManager
  navigation/           # ChannelList, ServerList
  progress/             # ProgressEntry, ProgressFeed, ProgressInput
  ui/                   # Button, FormField, Input
  AuthContainer.tsx, LoginCard.tsx, SignupCard.tsx, etc.

src/hooks/              # useAuth, useToast, useRealtime, etc.
src/lib/                # apiClient, socketClient, metric-engine, exercises, authFeedback
src/repositories/       # AuthRepository and data repositories
src/controllers/        # Challenge/progress controllers
src/schema/             # Zod schemas
```

### Dashboard navigation

From `dashboard/layout.tsx`: Dashboard, Workouts, Programs, Nutrition, Progress, Community, Challenges, Settings.

---

## 7. Storage & Uploads

- **Backend service**: `backend/src/services/storageService.ts` writes files to local disk.
- **Default directory**: `backend/uploads` (configurable via `LOCAL_STORAGE_DIR`).
- **Public access**: `GET /api/media/<key>` proxies the file with `Cache-Control: private, max-age=3600`.
- **Signed-ish uploads**: `POST /api/storage/upload-url` returns a presigned-style URL; `PUT /api/storage/upload?key=...` accepts the file bytes.
- **Multipart uploads**: avatars (`/api/users/me/avatar`), meals (`/api/nutrition/meals`), and chat media (`/api/messages/upload`) use `multer` directly.

---

## 8. Dev / CI / Test Workflow

### Root scripts (`package.json`)

```bash
npm run setup         # install deps + copy env templates
npm run dev           # Next.js dev server
npm run dev:backend   # backend nodemon dev
npm run dev:all       # frontend + backend concurrently
npm run db:migrate    # prisma migrate dev (in backend)
npm run db:studio     # prisma studio
npm run build         # production Next.js build
npm run lint          # eslint
npm run type-check    # tsc with .env.local
npm run format        # prettier
npm test              # vitest
npm run test:e2e      # playwright
npm run storybook     # storybook dev
```

### Backend scripts (`backend/package.json`)

```bash
npm run dev           # nodemon + ts-node
npm run build         # prisma generate + tsc
npm run start         # prisma migrate deploy + node dist/server.js
npm run seed:admin    # create admin user
npm run db:recover:*  # migration recovery script
```

### CI (`.github/workflows/ci.yml`)

- **Frontend**: `npm ci` → lint → type-check → vitest (`--run`).
- **Backend**: `npm ci` → `npx prisma validate` → `npm run build`.

### Important project conventions

- This is **not** an npm workspace; root orchestrates both projects with `concurrently`.
- Path alias `@/*` maps to `src/*` in both frontend and backend.
- DB naming uses `snake_case` plural tables via `@@map`.
- Discord-inspired terminology is codified in `docs/naming-conventions.md`.

---

## 9. Deployment Notes

- **No provider-specific config** (no `railway.toml`, `vercel.json`, `fly.toml`).
- **Local database**: `docker compose up -d` starts Postgres.
- **Backend container**: `backend/Dockerfile` is a multi-stage Node 20 Alpine build.
  - Builder: `npm ci` → copy `prisma/` → `npm run build`.
  - Runtime: copies `dist/`, `node_modules/`, `package*.json`, `prisma/`; exposes `4000`; runs `npm run start` (`prisma migrate deploy && node dist/server.js`).
- **Production checklist**:
  - Set `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
  - Set `FRONTEND_URL` / `CORS_ORIGIN` for CORS.
  - Configure `LOCAL_STORAGE_DIR` or persistent volume for uploads.
  - Point frontend `NEXT_PUBLIC_API_URL` at the deployed backend.

---

## Known Gaps / Follow-ups

- `README.md` references `TECHNICAL_AUDIT.md`, but that file does not currently exist in the repo.
- The legacy `Challenge`/`Achievement` models coexist with newer workout/lift/program features; verify which flows are still active in the UI.
- Subscription/payment integration is not wired; membership tier is updated manually by admins via `PUT /api/users/:id/membership`.

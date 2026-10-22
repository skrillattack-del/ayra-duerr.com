# FitsiteGonga

Discord-inspired fitness command center built with **Next.js 14 (App Router)** + **Tailwind**, backed by an **Express + Prisma + PostgreSQL** API with **Socket.io** realtime and local disk uploads.

## Features

- Auth flow: sign up / sign in / forgot password / reset password
- Role-aware dashboard: **Free**, **Paid**, and **Admin** tiers
- **Workouts**: build reusable templates, log freestyle or templated sessions, view history
- **Programs**: calendar view of enrolled programs + scheduled workouts
- **Nutrition**: admin posts meal of the day; users view macros and log meals
- **Community**: Discord-style global chat with real-time Socket.io
- **Progress**: track fitness journey (wired through logged workouts)
- **Settings**: update profile, upload avatar
- **Challenges**: coming soon
- Admin console (`/admin`) for user + content management

## Tech stack

- **Frontend**: Next.js, React, TypeScript, Tailwind, Zustand (ready), React Hook Form, Zod, Framer Motion
- **Backend**: Node.js, Express, Prisma, PostgreSQL, JWT, Socket.io, local file storage
- **Tooling**: ESLint, Prettier, Vitest, Playwright, Storybook
- **Deployment**: Bring your own host; local development is the default path

## Quick start (full stack locally)

```bash
# 1. Install dependencies and copy env templates
npm run setup

# 2. Start a local PostgreSQL database (Docker)
docker compose up -d

# 3. Configure backend env
code backend/.env   # or notepad backend/.env
#    - DATABASE_URL defaults to local docker compose Postgres
#    - set JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -hex 32)

# 4. Run migrations
npm run db:migrate

# 5. Start frontend + backend together
npm run dev:all
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Backend health check: `http://localhost:4000/health`

> Uploads for avatars, meal photos, progress photos, and chat media are stored locally under `backend/uploads` by default.

### Manual start (two terminals)

```bash
# Terminal 1 — frontend
npm run dev

# Terminal 2 — backend
cd backend
npm run dev
```

## Environment variables

### Frontend (`cp .env.local.example .env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
# Optional overrides:
# NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
# NEXT_PUBLIC_WS_URL=http://localhost:4000
```

### Backend (`cp backend/.env.example backend/.env`)

See `backend/.env.example` for the full list. The local defaults use Docker Compose Postgres on `localhost:5432`.

### Deployment

No provider-specific deployment config is required. Point `NEXT_PUBLIC_API_URL` at the deployed backend and set backend environment variables for your database, JWT secrets, CORS origin, and optional `LOCAL_STORAGE_DIR`.

## Scripts

```bash
npm run dev           # start Next.js dev server
npm run dev:backend   # start backend dev server only
npm run dev:all       # start frontend + backend together
npm run setup         # install deps and copy env templates
npm run db:migrate    # run Prisma migrations
npm run db:studio     # open Prisma Studio
npm run build         # production build (frontend)
npm run lint          # eslint
npm run type-check    # tsc (loads .env.local)
npm run format        # prettier
npm test              # vitest
npm run knip          # find unused files, exports, and dependencies
npm run test:e2e      # playwright
npm run storybook     # storybook dev server
```

## Repo map

- `src/app/dashboard` - tabbed dashboard (overview, workouts, programs, nutrition, progress, community, challenges, settings)
- `src/components` - UI + feature components
- `src/hooks`, `src/repositories` - data + state layer
- `src/lib` - `apiClient`, `socketClient`, exercise DB
- `backend` - Express API (separate Node project)
- `docs` - architecture + deployment guides
- `e2e` - Playwright tests

## Further reading

- `docs/architecture.md`
- `backend/README.md`

## License

See `LICENSE`.

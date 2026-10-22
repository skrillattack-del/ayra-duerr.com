# FitsiteGonga System Architecture

## Tech Stack Overview

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with Discord-inspired dark theme
- **Components**: Custom Discord-themed component library
- **State Management**: Zustand for global state, React Hook Form for forms
- **Animation**: Framer Motion for smooth transitions
- **Real-time**: Socket.io client for progress/achievement events

### Backend
- **Framework**: Express + Socket.io Node service
- **Database**: Prisma-managed PostgreSQL
- **Authentication**: JWT-based auth with bcrypt password hashing
- **API**: RESTful Express routes consumed via `apiClient`
- **Real-time**: Socket.io channels for challenge progress + achievement notifications
- **Storage**: Local disk uploads served through the backend media proxy

### Development Tools
- **Testing**: Vitest (unit), Playwright (E2E), Testing Library
- **Linting**: ESLint + Prettier
- **Type Safety**: TypeScript with strict mode
- **Documentation**: Storybook for components

## Data Models

### Core Entities

#### Users (backend-managed auth)
```typescript
interface User {
  id: string; // JWT user ID from auth service
  email: string;
  display_name: string;
  avatar_url?: string;
  role: 'client' | 'trainer' | 'admin';
  fitness_level: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  created_at: timestamp;
  updated_at: timestamp;
}
```

#### Challenges
```typescript
interface Challenge {
  id: string;
  name: string;
  description: string;
  category: 'strength' | 'cardio' | 'nutrition' | 'custom';
  type: 'duration' | 'repetition' | 'distance' | 'custom';
  goal_value: number;
  goal_unit: string; // 'minutes', 'miles', 'reps', etc.
  start_date: timestamp;
  end_date: timestamp;
  created_by: string; // trainer user ID
  is_active: boolean;
  participants: string[]; // user IDs
  created_at: timestamp;
}
```

#### User Achievements
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon name
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
  category: 'workout' | 'consistency' | 'milestone' | 'social';
  criteria: {
    challenge_type?: string;
    value?: number;
    unit?: string;
    timeframe?: string;
  };
  created_at: timestamp;
}

interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_date: timestamp;
  progress_value?: number; // for progress-based achievements
}
```

#### Progress Logs
```typescript
interface ProgressLog {
  id: string;
  user_id: string;
  challenge_id: string;
  value: number;
  unit: string;
  notes?: string;
  photo_url?: string;
  logged_at: timestamp;
  created_at: timestamp;
}
```

#### Fitness Goals
```typescript
interface FitnessGoal {
  id: string;
  user_id: string;
  goal_type: 'weight_loss' | 'muscle_gain' | 'endurance' | 'strength' | 'custom';
  target_value: number;
  current_value: number;
  unit: string;
  deadline: timestamp;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  created_at: timestamp;
  updated_at: timestamp;
}
```

## Component Architecture

### Layout Components

#### AppLayout
```typescript
// Main application shell with Discord-style layout
interface AppLayoutProps {
  children: React.ReactNode;
}
```

#### Sidebar
```typescript
// Left sidebar with challenge categories (Discord channel list style)
interface SidebarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  challenges: Challenge[];
}
```

#### ChallengeChannel
```typescript
// Main content area showing active challenge details
interface ChallengeChannelProps {
  challenge: Challenge;
  userProgress: ProgressLog[];
  onLogProgress: (value: number, notes?: string) => void;
}
```

#### ProgressFeed
```typescript
// Chat-like feed showing user progress updates
interface ProgressFeedProps {
  logs: ProgressLog[];
  onReact: (logId: string, reaction: string) => void;
}
```

#### AchievementBadges
```typescript
// Right sidebar showing user achievements (Discord roles style)
interface AchievementBadgesProps {
  achievements: UserAchievement[];
  totalProgress: number;
}
```

### Feature Components

#### ChallengeCard
```typescript
// Individual challenge display card
interface ChallengeCardProps {
  challenge: Challenge;
  userProgress: number;
  onJoin: () => void;
  onLeave: () => void;
}
```

#### ProgressEntry
```typescript
// Individual progress log entry (chat message style)
interface ProgressEntryProps {
  log: ProgressLog;
  user: User;
  onReact: (reaction: string) => void;
  onComment: (comment: string) => void;
}
```

#### GoalButton
```typescript
// Custom control for logging specific goal progress
interface GoalButtonProps {
  goal: FitnessGoal;
  onUpdate: (value: number) => void;
  isActive: boolean;
}
```

## API Routes Structure

### Authentication Routes
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/user` - Get current user

### Challenge Routes
- `GET /api/challenges` - List all challenges
- `POST /api/challenges` - Create new challenge (trainer only)
- `GET /api/challenges/[id]` - Get specific challenge
- `PUT /api/challenges/[id]` - Update challenge
- `DELETE /api/challenges/[id]` - Delete challenge

### Progress Routes
- `GET /api/progress` - Get user's progress logs
- `POST /api/progress` - Log new progress entry
- `PUT /api/progress/[id]` - Update progress entry
- `DELETE /api/progress/[id]` - Delete progress entry

### Achievement Routes
- `GET /api/achievements` - List available achievements
- `GET /api/achievements/user/[userId]` - Get user's achievements
- `POST /api/achievements/check` - Check and award achievements

### Goals Routes
- `GET /api/goals` - Get user's fitness goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/[id]` - Update goal
- `DELETE /api/goals/[id]` - Delete goal

## Runtime & Hosting
- The `backend/` Express app handles REST + Socket.io; configure `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_SOCKET_URL` so the frontend points at the API.
- Environments store `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, and optional `LOCAL_STORAGE_DIR`.
- Migrations: Run `npx prisma migrate deploy` for deployed environments or `npx prisma migrate dev` locally.
- Healthcheck: The backend exposes `/health` in `backend/src/server.ts`.

## Real-time Subscriptions

### Challenge Updates
```typescript
// Connect via Socket.io to listen for challenge events
socket.on('progress:new', handleProgressUpdate)
socket.on('progress:updated', handleProgressUpdate)
socket.on('progress:deleted', handleProgressDeletion)
```

### Achievement Notifications
```typescript
// Socket.io emits achievement awards from the backend
socket.on('achievement:earned', handleAchievementAward)
```

## Database Schema

### Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('client', 'trainer', 'admin')),
  fitness_level TEXT NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  goals TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### challenges
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'nutrition', 'custom')),
  type TEXT NOT NULL CHECK (type IN ('duration', 'repetition', 'distance', 'custom')),
  goal_value INTEGER NOT NULL,
  goal_unit TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  participants UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### achievements
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'legendary')),
  category TEXT NOT NULL CHECK (category IN ('workout', 'consistency', 'milestone', 'social')),
  criteria JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_achievements
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  earned_date TIMESTAMPTZ DEFAULT NOW(),
  progress_value INTEGER,
  UNIQUE(user_id, achievement_id)
);
```

#### progress_logs
```sql
CREATE TABLE progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  challenge_id UUID NOT NULL REFERENCES challenges(id),
  value INTEGER NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  photo_url TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### fitness_goals
```sql
CREATE TABLE fitness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'muscle_gain', 'endurance', 'strength', 'custom')),
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  unit TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security & Permissions

### Access Controls
- All operations go through Express middleware that enforces user ownership, trainer/admin roles, and token validation.
- JWTs are signed with `JWT_SECRET` and refreshed via `/api/auth/refresh`.
- Uploaded files are stored on local disk and served through `/api/media/*`.

### API Security
- JWT tokens for authentication
- Role-based access control enforced server-side
- Input validation with Zod schemas
- Rate limiting on critical endpoints (progress logging) still recommended

## Performance Considerations

### Database Indexing
- Index on `user_id` for all user-related queries
- Index on `challenge_id` for progress lookups
- Composite indexes for common query patterns

### Caching Strategy
- Redis for frequently accessed challenge data
- Client-side caching for user achievements
- CDN for progress photos
### Real-time Optimization
 - Use Socket.io rooms (`challenge:{id}`) so clients only listen to their active challenges
 - Debounced progress updates to prevent spammy broadcasts
 - Socket.io can be scaled with sticky sessions or a shared adapter if traffic grows

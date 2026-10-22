# Naming Conventions for FitsiteGonga

## Overview
This document establishes consistent naming conventions across the FitsiteGonga platform, with Discord-inspired terminology that creates a familiar and engaging user experience.

## Discord-Inspired Terminology Mapping

### Core Concepts
| Discord Term | Fitness Platform Term | Description |
|--------------|----------------------|-------------|
| **Server** | **Client Group** | A collection of users (e.g., "Personal Training Clients", "Group Class Members") |
| **Channel** | **Challenge Category** | Organized sections for different types of challenges |
| **Text Channel** | **Challenge Room** | Specific challenge instances (e.g., "#2-hour-gym-challenge") |
| **Voice Channel** | **Live Session** | Real-time workout sessions or group calls |
| **Roles** | **Achievement Tiers** | User status levels based on fitness achievements |
| **Messages** | **Progress Entries** | Individual progress updates in chat-like format |
| **Reactions** | **Encouragement** | Quick responses to progress updates (👍, 💪, 🔥) |
| **Threads** | **Workout Discussions** | Detailed conversations about specific workouts |
| **Online Status** | **Activity Status** | Current user activity (Working Out, Resting, Planning) |
| **DMs** | **Personal Messages** | Private communication between trainer and client |

### UI Elements
| Discord Element | Fitness Platform Element | Purpose |
|----------------|-------------------------|---------|
| **Server List** | **Client Group List** | Left sidebar showing different client groups |
| **Channel List** | **Challenge List** | Challenge categories and specific challenges |
| **Message Area** | **Progress Feed** | Main content area showing progress updates |
| **Member List** | **Achievement Sidebar** | Right sidebar showing user achievements and stats |
| **Message Input** | **Progress Input** | Form for logging new progress entries |

## Database Naming Conventions

### Table Names
- Use **snake_case** for all table names
- Use **plural** nouns for table names
- Prefix with descriptive context when needed

```sql
-- Core tables
users
challenges
achievements
user_achievements
progress_logs
fitness_goals

-- Junction/relationship tables
challenge_participants
user_roles
progress_reactions

-- Configuration tables
achievement_criteria
challenge_templates
notification_settings
```

### Column Names
- Use **snake_case** for all column names
- Use **descriptive** names that clearly indicate purpose
- Include **units** in column names when applicable

```sql
-- User table columns
id
display_name
avatar_url
fitness_level
created_at
updated_at

-- Challenge table columns
id
name
description
category
goal_value
goal_unit
start_date
end_date
created_by
is_active
participants
created_at

-- Progress log columns
id
user_id
challenge_id
value
unit
notes
photo_url
logged_at
created_at
```

### Index Names
- Use **descriptive** names with table prefix
- Include **purpose** in the name

```sql
-- User indexes
idx_users_email
idx_users_role
idx_users_fitness_level

-- Challenge indexes
idx_challenges_category
idx_challenges_created_by
idx_challenges_active
idx_challenges_date_range

-- Progress indexes
idx_progress_logs_user_id
idx_progress_logs_challenge_id
idx_progress_logs_logged_at
```

## Component Naming Conventions

### React Components
- Use **PascalCase** for component names
- Use **descriptive** names that indicate purpose
- Include **Discord-inspired** prefixes where appropriate

```typescript
// Layout Components
AppLayout
Sidebar
ChallengeChannel
ProgressFeed
AchievementSidebar

// Feature Components
ChallengeCard
ProgressEntry
AchievementBadge
GoalButton
ProgressInput
ChallengeSelector

// Discord-inspired Components
ServerList        // Client group list
ChannelList       // Challenge category list
MessageArea       // Progress feed area
MemberList        // Achievement sidebar
MessageInput      // Progress input form
```

### Component Props Interfaces
- Use **ComponentName + Props** suffix
- Use **descriptive** prop names
- Use **camelCase** for prop names

```typescript
interface ChallengeCardProps {
  challenge: Challenge;
  userProgress: number;
  onJoin: () => void;
  onLeave: () => void;
  isActive: boolean;
}

interface ProgressEntryProps {
  log: ProgressLog;
  user: User;
  onReact: (reaction: string) => void;
  onComment: (comment: string) => void;
  canEdit: boolean;
}
```

### Custom Hooks
- Use **use** prefix
- Use **camelCase** naming
- Use **descriptive** names indicating functionality

```typescript
// Data fetching hooks
useChallenges
useUserProgress
useAchievements
useFitnessGoals

// Real-time hooks
useRealtimeProgress
useRealtimeAchievements
useRealtimeNotifications

// Utility hooks
useProgressValidation
useAchievementCheck
useChallengeFiltering
```

## API Route Naming

### Route Structure
- Use **kebab-case** for route segments
- Use **RESTful** conventions
- Use **plural** nouns for resource routes

```typescript
// Authentication routes
/api/auth/signup
/api/auth/signin
/api/auth/signout
/api/auth/user

// Challenge routes
/api/challenges
/api/challenges/[id]
/api/challenges/[id]/join
/api/challenges/[id]/leave
/api/challenges/[id]/progress

// Progress routes
/api/progress
/api/progress/[id]
/api/progress/user/[userId]

// Achievement routes
/api/achievements
/api/achievements/user/[userId]
/api/achievements/check

// Goal routes
/api/goals
/api/goals/[id]
/api/goals/user/[userId]
```

### HTTP Methods
- **GET** for retrieving data
- **POST** for creating new resources
- **PUT** for updating entire resources
- **PATCH** for partial updates
- **DELETE** for removing resources

## File and Directory Naming

### Directory Structure
```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Auth route group
│   ├── challenges/        # Challenge pages
│   ├── progress/          # Progress pages
│   └── dashboard/         # Main dashboard
├── components/            # Reusable components
│   ├── layout/           # Layout components
│   ├── challenges/       # Challenge-related components
│   ├── progress/         # Progress-related components
│   └── achievements/     # Achievement components
├── lib/                  # Utility libraries
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── utils/                # Helper functions
```

### File Naming
- Use **kebab-case** for file names
- Use **descriptive** names
- Include **file type** in name when needed

```typescript
// Component files
challenge-card.tsx
progress-entry.tsx
achievement-badge.tsx
sidebar.tsx
progress-feed.tsx

// Hook files
use-challenges.ts
use-progress.ts
use-achievements.ts

// Utility files
progress-validation.ts
achievement-checker.ts
challenge-formatter.ts

// Type files
challenge-types.ts
progress-types.ts
achievement-types.ts
```

## CSS Class Naming

### Tailwind CSS Classes
- Use **descriptive** class combinations
- Use **Discord-inspired** color schemes
- Use **consistent** spacing and sizing

```css
/* Discord-inspired colors */
.bg-discord-dark     /* #2f3136 - main background */
.bg-discord-darker   /* #202225 - sidebar background */
.bg-discord-darkest  /* #1e1f22 - channel list background */
.text-discord-light  /* #dcddde - primary text */
.text-discord-muted  /* #72767d - secondary text */

/* Component-specific classes */
.challenge-card
.progress-entry
.achievement-badge
.sidebar-channel
.progress-feed
```

### Custom CSS Classes
- Use **kebab-case** for custom classes
- Use **BEM methodology** for complex components
- Use **descriptive** names

```css
/* BEM naming for complex components */
.challenge-card {
  /* Base styles */
}

.challenge-card__header {
  /* Header styles */
}

.challenge-card__title {
  /* Title styles */
}

.challenge-card--active {
  /* Active state */
}

.challenge-card--completed {
  /* Completed state */
}
```

## Environment Variables

### Naming Convention
- Use **UPPER_SNAKE_CASE**
- Use **descriptive** prefixes
- Include **environment** context

```bash
# Database
DATABASE_URL

# Authentication
JWT_SECRET
JWT_REFRESH_SECRET

# Local storage
LOCAL_STORAGE_DIR

# Frontend integration
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_SOCKET_URL

# Feature flags
ENABLE_REAL_TIME_UPDATES
```

## Constants and Enums

### Naming Convention
- Use **UPPER_SNAKE_CASE** for constants
- Use **PascalCase** for enums
- Use **descriptive** names

```typescript
// Constants
const MAX_PROGRESS_ENTRIES_PER_DAY = 50;
const DEFAULT_CHALLENGE_DURATION_DAYS = 30;
const ACHIEVEMENT_CHECK_INTERVAL_MS = 60000;

// Enums
enum ChallengeCategory {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  NUTRITION = 'nutrition',
  CUSTOM = 'custom'
}

enum AchievementTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  LEGENDARY = 'legendary'
}

enum UserRole {
  CLIENT = 'client',
  TRAINER = 'trainer',
  ADMIN = 'admin'
}
```

## Testing Naming

### Test Files
- Use **kebab-case** with **.test.ts** or **.spec.ts** suffix
- Mirror the **source file** structure
- Use **descriptive** names

```typescript
// Unit tests
challenge-card.test.tsx
progress-entry.test.tsx
achievement-badge.test.tsx

// Integration tests
challenge-api.test.ts
progress-api.test.ts
achievement-api.test.ts

// E2E tests
challenge-creation.spec.ts
progress-logging.spec.ts
achievement-unlock.spec.ts
```

### Test Descriptions
- Use **descriptive** test names
- Use **"should"** statements for behavior
- Include **context** in descriptions

```typescript
describe('ChallengeCard', () => {
  it('should display challenge information correctly', () => {
    // test implementation
  });

  it('should allow joining active challenges', () => {
    // test implementation
  });

  it('should show progress for joined challenges', () => {
    // test implementation
  });
});
```

## Documentation Naming

### Documentation Files
- Use **kebab-case** for file names
- Use **descriptive** names
- Include **file type** in name

```markdown
# Documentation files
discord-ui-analysis.md
architecture.md
naming-conventions.md
api-documentation.md
component-guide.md
deployment-guide.md
```

### Section Headers
- Use **Title Case** for main headers
- Use **Sentence case** for subheaders
- Use **descriptive** names

```markdown
# Main Documentation Title

## Section Header

### Subsection Header

#### Detailed Subsection
```

This naming convention system ensures consistency across the entire FitsiteGonga platform while maintaining the Discord-inspired user experience that makes the fitness tracking feel familiar and engaging.

export interface AdminChallenge {
  id: string
  name: string
  description: string
  goal: number
  progress: number
  unit: string
  xpReward: number
}

export interface LeaderboardEntry {
  rank: number
  player: string
  xp: number
  accent: string
}

export const INITIAL_CHALLENGES: readonly AdminChallenge[] = [
  {
    id: 'neon-night-runner',
    name: 'Neon Night Runner',
    description: 'Run 50 km this week',
    goal: 50,
    progress: 36,
    unit: 'km',
    xpReward: 250,
  },
  {
    id: 'hiit-master',
    name: 'HIIT Master',
    description: 'Complete 15 HIIT workouts',
    goal: 15,
    progress: 11,
    unit: 'workouts',
    xpReward: 400,
  },
  {
    id: 'forge-five',
    name: 'Forge Five',
    description: 'Log five strength sessions',
    goal: 5,
    progress: 3,
    unit: 'sessions',
    xpReward: 325,
  },
]

export const LEADERBOARD: readonly LeaderboardEntry[] = [
  { rank: 1, player: 'NeonNova', xp: 12_540, accent: '#ffd43b' },
  { rank: 2, player: 'ByteBeast', xp: 9_870, accent: '#bdc9d8' },
  { rank: 3, player: 'PixelPulse', xp: 7_230, accent: '#ff8a3d' },
]

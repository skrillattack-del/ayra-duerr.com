import { 
  Dumbbell, 
  Flame, 
  Heart, 
  Moon, 
  Zap 
} from 'lucide-react'

// Workout type definitions matching backend enum
export type WorkoutType = 
  | 'PUSH' | 'PULL' | 'LEGS' | 'UPPER' | 'LOWER' 
  | 'FULL_BODY' | 'CARDIO' | 'REST' | 'CUSTOM'

// Configuration for each workout type - colors and icons
export const WORKOUT_TYPE_CONFIG: Record<WorkoutType, { 
  label: string
  color: string
  bgColor: string
  textColor: string
  icon: typeof Dumbbell
}> = {
  PUSH: { 
    label: 'Push', 
    color: 'bg-red-500', 
    bgColor: 'bg-red-50', 
    textColor: 'text-red-600',
    icon: Zap 
  },
  PULL: { 
    label: 'Pull', 
    color: 'bg-blue-500', 
    bgColor: 'bg-blue-50', 
    textColor: 'text-blue-600',
    icon: Dumbbell 
  },
  LEGS: { 
    label: 'Legs', 
    color: 'bg-purple-500', 
    bgColor: 'bg-purple-50', 
    textColor: 'text-purple-600',
    icon: Flame 
  },
  UPPER: { 
    label: 'Upper', 
    color: 'bg-orange-500', 
    bgColor: 'bg-orange-50', 
    textColor: 'text-orange-600',
    icon: Dumbbell 
  },
  LOWER: { 
    label: 'Lower', 
    color: 'bg-pink-500', 
    bgColor: 'bg-pink-50', 
    textColor: 'text-pink-600',
    icon: Flame 
  },
  FULL_BODY: { 
    label: 'Full Body', 
    color: 'bg-emerald-500', 
    bgColor: 'bg-emerald-50', 
    textColor: 'text-emerald-600',
    icon: Zap 
  },
  CARDIO: { 
    label: 'Cardio', 
    color: 'bg-cyan-500', 
    bgColor: 'bg-cyan-50', 
    textColor: 'text-cyan-600',
    icon: Heart 
  },
  REST: { 
    label: 'Rest', 
    color: 'bg-slate-500', 
    bgColor: 'bg-slate-50', 
    textColor: 'text-slate-600',
    icon: Moon 
  },
  CUSTOM: { 
    label: 'Custom', 
    color: 'bg-yellow-500', 
    bgColor: 'bg-yellow-50', 
    textColor: 'text-yellow-600',
    icon: Dumbbell 
  },
}

// Helper function to get config for a workout type (case-insensitive)
export function getWorkoutTypeConfig(type?: string): typeof WORKOUT_TYPE_CONFIG['PUSH'] {
  const upperType = (type?.toUpperCase() || 'CUSTOM') as WorkoutType
  return WORKOUT_TYPE_CONFIG[upperType] || WORKOUT_TYPE_CONFIG['CUSTOM']
}

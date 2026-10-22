// =============================================================================
// FITSITE GONGA - COMPREHENSIVE EXERCISE DATABASE
// Production-grade exercise registry with full gym coverage
// =============================================================================

// -----------------------------------------------------------------------------
// ENUMS & CONSTANTS
// -----------------------------------------------------------------------------

type MuscleGroup = 
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs' | 'obliques'
  | 'traps' | 'lats' | 'erectors' | 'hip_flexors' | 'adductors' | 'abductors'

type EquipmentType = 
  | 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'smith_machine'
  | 'kettlebell' | 'bodyweight' | 'resistance_band' | 'ez_bar'
  | 'trap_bar' | 'specialty_bar' | 'plate' | 'medicine_ball'

type MovementPattern = 
  | 'push_horizontal' | 'push_vertical' | 'pull_horizontal' | 'pull_vertical'
  | 'squat' | 'hinge' | 'lunge' | 'carry' | 'rotation' | 'isolation'

type ExerciseCategory = 
  | 'compound' | 'isolation' | 'plyometric' | 'isometric' | 'cardio'

type ForceType = 'push' | 'pull' | 'static'

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite'

// -----------------------------------------------------------------------------
// EXERCISE INTERFACE
// -----------------------------------------------------------------------------

export interface Exercise {
  id: string
  name: string
  slug: string
  aliases: string[]
  description: string
  category: ExerciseCategory
  movementPattern: MovementPattern
  forceType: ForceType
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  stabilizers: MuscleGroup[]
  equipment: EquipmentType[]
  equipmentOptional: EquipmentType[]
  trackingType: 'weight_reps' | 'weight_time' | 'reps_only' | 'time_only' | 'distance_time'
  defaultUnit: 'lbs' | 'kg' | 'bodyweight'
  supportsOneRepMax: boolean
  minimumLevel: ExperienceLevel
  injuryRisk: 'low' | 'medium' | 'high'
  requiresSpotter: boolean
  videoUrl?: string
  thumbnailUrl?: string
  instructions: string[]
  tips: string[]
  commonMistakes: string[]
}

// -----------------------------------------------------------------------------
// EXERCISE DATABASE - CHEST
// -----------------------------------------------------------------------------

const CHEST_EXERCISES: Exercise[] = [
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    slug: 'barbell-bench-press',
    aliases: ['flat bench', 'bench press', 'bb bench'],
    description: 'The king of chest exercises. Horizontal pressing movement targeting the pectorals.',
    category: 'compound',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    stabilizers: ['abs', 'lats'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'medium',
    requiresSpotter: true,
    instructions: [
      'Lie flat on bench with feet firmly on the ground',
      'Grip bar slightly wider than shoulder width',
      'Unrack and position bar over chest',
      'Lower bar to mid-chest with controlled tempo',
      'Press bar up to starting position'
    ],
    tips: ['Retract shoulder blades', 'Maintain arch in lower back', 'Keep wrists straight'],
    commonMistakes: ['Bouncing bar off chest', 'Flaring elbows too wide', 'Lifting hips off bench']
  },
  {
    id: 'incline-barbell-bench',
    name: 'Incline Barbell Bench Press',
    slug: 'incline-barbell-bench',
    aliases: ['incline bench', 'incline press', 'incline bb bench'],
    description: 'Upper chest focused pressing movement at 30-45 degree angle.',
    category: 'compound',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    stabilizers: ['abs'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'medium',
    requiresSpotter: true,
    instructions: [
      'Set bench to 30-45 degree angle',
      'Lie back with feet flat on floor',
      'Grip bar slightly wider than shoulder width',
      'Lower bar to upper chest',
      'Press up in slight arc back to start'
    ],
    tips: ['Dont go too steep (reduces chest activation)', 'Keep shoulder blades pinched'],
    commonMistakes: ['Angle too steep', 'Not touching chest', 'Excessive back arch']
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    slug: 'dumbbell-bench-press',
    aliases: ['db bench', 'dumbbell press flat'],
    description: 'Flat pressing with dumbbells for greater range of motion.',
    category: 'compound',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    stabilizers: ['abs', 'biceps'],
    equipment: ['dumbbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Sit on bench with dumbbells on thighs',
      'Kick up dumbbells as you lie back',
      'Press dumbbells up over chest',
      'Lower with control to chest level',
      'Press back up to starting position'
    ],
    tips: ['Dumbbells should touch at top', 'Go deeper than barbell allows'],
    commonMistakes: ['Dumbbells drifting apart', 'Not going deep enough', 'Uneven pressing']
  },
  {
    id: 'cable-chest-fly',
    name: 'Cable Chest Fly',
    slug: 'cable-chest-fly',
    aliases: ['cable fly', 'cable crossover', 'cable pec fly'],
    description: 'Isolation chest exercise with constant cable tension.',
    category: 'isolation',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    stabilizers: ['abs', 'biceps'],
    equipment: ['cable'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Set cables at shoulder height',
      'Grab handles with slight elbow bend',
      'Step forward into split stance',
      'Bring hands together in front of chest',
      'Return with control maintaining elbow angle'
    ],
    tips: ['Keep slight bend in elbows throughout', 'Squeeze chest at contraction'],
    commonMistakes: ['Using too much weight', 'Straightening arms', 'Swinging body']
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    slug: 'machine-chest-press',
    aliases: ['chest press machine', 'seated chest press'],
    description: 'Guided chest pressing for safety and isolation.',
    category: 'compound',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    stabilizers: [],
    equipment: ['machine'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Adjust seat so handles are at chest level',
      'Grip handles and keep back against pad',
      'Press forward until arms are extended',
      'Return with control'
    ],
    tips: ['Dont lock elbows', 'Keep core engaged'],
    commonMistakes: ['Seat too high or low', 'Lifting shoulders']
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    slug: 'push-up',
    aliases: ['pushup', 'press-up'],
    description: 'Fundamental bodyweight chest exercise.',
    category: 'compound',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    stabilizers: ['abs', 'glutes'],
    equipment: ['bodyweight'],
    equipmentOptional: ['resistance_band'],
    trackingType: 'reps_only',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Start in plank position, hands slightly wider than shoulders',
      'Keep body straight from head to heels',
      'Lower chest to floor',
      'Push back up to start'
    ],
    tips: ['Core tight throughout', 'Full range of motion'],
    commonMistakes: ['Sagging hips', 'Flared elbows', 'Partial reps']
  },
  {
    id: 'dip-chest',
    name: 'Chest Dip',
    slug: 'dip-chest',
    aliases: ['parallel bar dip', 'weighted dip chest'],
    description: 'Bodyweight compound for lower chest emphasis.',
    category: 'compound',
    movementPattern: 'push_vertical',
    forceType: 'push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    stabilizers: ['abs'],
    equipment: ['bodyweight'],
    equipmentOptional: ['plate'],
    trackingType: 'weight_reps',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: false,
    instructions: [
      'Grip parallel bars and support your weight',
      'Lean forward slightly for chest emphasis',
      'Lower body until upper arms are parallel',
      'Press back up to starting position'
    ],
    tips: ['Forward lean targets chest more', 'Control the descent'],
    commonMistakes: ['Going too deep', 'Staying too upright', 'Swinging']
  },
]

// -----------------------------------------------------------------------------
// EXERCISE DATABASE - BACK
// -----------------------------------------------------------------------------

const BACK_EXERCISES: Exercise[] = [
  {
    id: 'conventional-deadlift',
    name: 'Conventional Deadlift',
    slug: 'conventional-deadlift',
    aliases: ['deadlift', 'dl', 'barbell deadlift'],
    description: 'The ultimate posterior chain builder. Full body compound lift.',
    category: 'compound',
    movementPattern: 'hinge',
    forceType: 'pull',
    primaryMuscles: ['erectors', 'glutes', 'hamstrings'],
    secondaryMuscles: ['lats', 'traps', 'quads'],
    stabilizers: ['abs', 'forearms'],
    equipment: ['barbell'],
    equipmentOptional: ['trap_bar'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'high',
    requiresSpotter: false,
    instructions: [
      'Stand with feet hip-width, bar over mid-foot',
      'Hinge at hips and grip bar outside knees',
      'Flatten back, chest up, shoulders over bar',
      'Drive through floor, keeping bar close',
      'Lock out hips and knees at top',
      'Return bar to floor with controlled descent'
    ],
    tips: ['Bar should drag up legs', 'Dont round lower back', 'Squeeze glutes at top'],
    commonMistakes: ['Rounding back', 'Bar drifting forward', 'Hyperextending at top', 'Jerking the bar']
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    slug: 'barbell-row',
    aliases: ['bent over row', 'bb row', 'pendlay row'],
    description: 'Fundamental horizontal pulling movement for back thickness.',
    category: 'compound',
    movementPattern: 'pull_horizontal',
    forceType: 'pull',
    primaryMuscles: ['lats', 'traps'],
    secondaryMuscles: ['biceps', 'erectors'],
    stabilizers: ['abs', 'hamstrings'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: false,
    instructions: [
      'Hinge forward to 45-degree angle',
      'Grip bar slightly wider than shoulder width',
      'Pull bar to lower chest/upper abs',
      'Squeeze shoulder blades together',
      'Lower with control'
    ],
    tips: ['Keep back flat', 'Lead with elbows', 'Dont use momentum'],
    commonMistakes: ['Too much body english', 'Not pulling to body', 'Rounding back']
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    slug: 'dumbbell-row',
    aliases: ['db row', 'one arm row', 'single arm row'],
    description: 'Unilateral back exercise for addressing imbalances.',
    category: 'compound',
    movementPattern: 'pull_horizontal',
    forceType: 'pull',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['traps', 'biceps'],
    stabilizers: ['abs', 'erectors'],
    equipment: ['dumbbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Place knee and hand on bench',
      'Keep back flat and parallel to floor',
      'Row dumbbell to hip',
      'Squeeze lat at top',
      'Lower with control'
    ],
    tips: ['Pull to hip, not chest', 'Dont rotate torso', 'Full stretch at bottom'],
    commonMistakes: ['Twisting body', 'Shrugging shoulder', 'Partial range of motion']
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    slug: 'pull-up',
    aliases: ['pullup', 'chin-up', 'chinup'],
    description: 'King of vertical pulling. Bodyweight back builder.',
    category: 'compound',
    movementPattern: 'pull_vertical',
    forceType: 'pull',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'traps'],
    stabilizers: ['abs', 'forearms'],
    equipment: ['bodyweight'],
    equipmentOptional: ['resistance_band', 'plate'],
    trackingType: 'weight_reps',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Grip bar slightly wider than shoulders (overhand)',
      'Hang with arms fully extended',
      'Pull until chin clears bar',
      'Lower with control to full extension'
    ],
    tips: ['Initiate with lats, not arms', 'Keep core tight', 'Full range of motion'],
    commonMistakes: ['Kipping', 'Not going all the way down', 'Excessive swinging']
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    slug: 'lat-pulldown',
    aliases: ['cable pulldown', 'wide grip pulldown'],
    description: 'Machine-based vertical pull for lat development.',
    category: 'compound',
    movementPattern: 'pull_vertical',
    forceType: 'pull',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'traps'],
    stabilizers: ['abs'],
    equipment: ['cable'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Grip bar wider than shoulders',
      'Sit with thighs secured under pads',
      'Pull bar to upper chest',
      'Squeeze lats at bottom',
      'Return with control'
    ],
    tips: ['Lean back slightly', 'Pull elbows to sides', 'Dont swing'],
    commonMistakes: ['Pulling behind neck', 'Using momentum', 'Leaning too far back']
  },
  {
    id: 'cable-row-seated',
    name: 'Seated Cable Row',
    slug: 'cable-row-seated',
    aliases: ['cable row', 'seated row', 'low row'],
    description: 'Horizontal cable pulling for mid-back development.',
    category: 'compound',
    movementPattern: 'pull_horizontal',
    forceType: 'pull',
    primaryMuscles: ['lats', 'traps'],
    secondaryMuscles: ['biceps', 'erectors'],
    stabilizers: ['abs'],
    equipment: ['cable'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Sit with feet on platforms, knees slightly bent',
      'Grip handle with arms extended',
      'Pull handle to lower chest',
      'Squeeze shoulder blades together',
      'Return with control'
    ],
    tips: ['Keep torso stable', 'Dont lean too far forward or back'],
    commonMistakes: ['Excessive body movement', 'Rounding shoulders forward']
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    slug: 'face-pull',
    aliases: ['rope face pull', 'cable face pull'],
    description: 'Rear delt and rotator cuff exercise for shoulder health.',
    category: 'isolation',
    movementPattern: 'pull_horizontal',
    forceType: 'pull',
    primaryMuscles: ['shoulders', 'traps'],
    secondaryMuscles: ['biceps'],
    stabilizers: ['abs'],
    equipment: ['cable'],
    equipmentOptional: ['resistance_band'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Set cable at upper chest/face height',
      'Grip rope with thumbs pointing back',
      'Pull rope towards face, separating ends',
      'Externally rotate shoulders at end',
      'Return with control'
    ],
    tips: ['Pull apart, not just back', 'Squeeze rear delts'],
    commonMistakes: ['Going too heavy', 'Not separating the rope']
  },
]

// -----------------------------------------------------------------------------
// EXERCISE DATABASE - SHOULDERS
// -----------------------------------------------------------------------------

const SHOULDER_EXERCISES: Exercise[] = [
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    slug: 'overhead-press',
    aliases: ['ohp', 'military press', 'barbell shoulder press', 'strict press'],
    description: 'The fundamental vertical pressing movement for shoulder strength.',
    category: 'compound',
    movementPattern: 'push_vertical',
    forceType: 'push',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'traps'],
    stabilizers: ['abs', 'erectors'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: false,
    instructions: [
      'Grip bar at shoulder width, bar resting on front delts',
      'Brace core and squeeze glutes',
      'Press bar straight up overhead',
      'Lock out arms at top',
      'Lower with control to shoulders'
    ],
    tips: ['Keep bar path straight', 'Slight lean back at start is okay', 'Dont overarch back'],
    commonMistakes: ['Excessive back arch', 'Pressing forward', 'Flared elbows']
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    slug: 'dumbbell-shoulder-press',
    aliases: ['db shoulder press', 'seated dumbbell press', 'arnold press base'],
    description: 'Dumbbell overhead pressing for shoulder development.',
    category: 'compound',
    movementPattern: 'push_vertical',
    forceType: 'push',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps'],
    stabilizers: ['abs', 'traps'],
    equipment: ['dumbbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Sit or stand with dumbbells at shoulder height',
      'Palms facing forward',
      'Press dumbbells overhead until arms straight',
      'Lower with control'
    ],
    tips: ['Dont let dumbbells drift forward', 'Keep core tight'],
    commonMistakes: ['Arching back excessively', 'Uneven pressing']
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    slug: 'lateral-raise',
    aliases: ['side raise', 'dumbbell lateral raise', 'side delt raise'],
    description: 'Isolation exercise for side deltoid development.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'push',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['traps'],
    stabilizers: [],
    equipment: ['dumbbell'],
    equipmentOptional: ['cable'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Stand with dumbbells at sides',
      'Raise arms out to sides until parallel',
      'Keep slight bend in elbows',
      'Lower with control'
    ],
    tips: ['Lead with elbows', 'Dont swing', 'Slight forward lean is okay'],
    commonMistakes: ['Going too heavy', 'Using momentum', 'Raising too high']
  },
  {
    id: 'reverse-fly',
    name: 'Reverse Fly',
    slug: 'reverse-fly',
    aliases: ['rear delt fly', 'bent over fly', 'reverse pec deck'],
    description: 'Isolation for posterior deltoids.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['traps'],
    stabilizers: ['erectors'],
    equipment: ['dumbbell'],
    equipmentOptional: ['machine', 'cable'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Bend forward at hips with flat back',
      'Let dumbbells hang below',
      'Raise arms out to sides',
      'Squeeze rear delts at top',
      'Lower with control'
    ],
    tips: ['Keep slight elbow bend', 'Dont lift torso'],
    commonMistakes: ['Using momentum', 'Lifting body', 'Going too heavy']
  },
  {
    id: 'shrug',
    name: 'Barbell Shrug',
    slug: 'shrug',
    aliases: ['shrugs', 'trap shrug', 'dumbbell shrug'],
    description: 'Direct trap isolation exercise.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['traps'],
    secondaryMuscles: [],
    stabilizers: ['forearms'],
    equipment: ['barbell'],
    equipmentOptional: ['dumbbell', 'trap_bar'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Hold bar at arm length',
      'Shrug shoulders straight up',
      'Squeeze at top',
      'Lower with control'
    ],
    tips: ['Straight up and down, no rolling', 'Hold at top'],
    commonMistakes: ['Rolling shoulders', 'Using momentum', 'Bending arms']
  },
]

// -----------------------------------------------------------------------------
// EXERCISE DATABASE - LEGS
// -----------------------------------------------------------------------------

const LEG_EXERCISES: Exercise[] = [
  {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    slug: 'barbell-back-squat',
    aliases: ['squat', 'back squat', 'bb squat', 'high bar squat', 'low bar squat'],
    description: 'The king of leg exercises. Foundational compound movement.',
    category: 'compound',
    movementPattern: 'squat',
    forceType: 'push',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'erectors', 'abs'],
    stabilizers: ['calves'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'high',
    requiresSpotter: true,
    instructions: [
      'Position bar on upper back (high bar) or rear delts (low bar)',
      'Feet shoulder width or slightly wider, toes out 15-30 degrees',
      'Brace core, take breath at top',
      'Descend by breaking at hips and knees',
      'Go to at least parallel (hip crease below knee)',
      'Drive up through heels'
    ],
    tips: ['Knees track over toes', 'Keep chest up', 'Dont let knees cave'],
    commonMistakes: ['Knees caving in', 'Rounding lower back', 'Not hitting depth', 'Heel rising']
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    slug: 'front-squat',
    aliases: ['barbell front squat'],
    description: 'Quad-dominant squat variation with bar in front rack position.',
    category: 'compound',
    movementPattern: 'squat',
    forceType: 'push',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'abs'],
    stabilizers: ['erectors'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: true,
    instructions: [
      'Rest bar on front delts with clean grip or cross arms',
      'Elbows high to keep bar in place',
      'Squat down keeping torso upright',
      'Drive up through quads'
    ],
    tips: ['Elbows stay high', 'More upright torso than back squat'],
    commonMistakes: ['Elbows dropping', 'Leaning too far forward', 'Wrist pain']
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    slug: 'leg-press',
    aliases: ['machine leg press', '45 degree leg press'],
    description: 'Machine-based quad compound with reduced spinal load.',
    category: 'compound',
    movementPattern: 'squat',
    forceType: 'push',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    stabilizers: [],
    equipment: ['machine'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Sit in machine with back flat against pad',
      'Place feet shoulder width on platform',
      'Release safeties and lower weight',
      'Push through heels to extend legs',
      'Dont lock knees at top'
    ],
    tips: ['Foot position changes emphasis', 'Keep lower back flat'],
    commonMistakes: ['Lowering too deep (butt lifts)', 'Locking knees', 'Feet too low on platform']
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    slug: 'romanian-deadlift',
    aliases: ['rdl', 'stiff leg deadlift', 'sldl'],
    description: 'Hip hinge movement for hamstring and glute development.',
    category: 'compound',
    movementPattern: 'hinge',
    forceType: 'pull',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['erectors', 'lats'],
    stabilizers: ['abs'],
    equipment: ['barbell'],
    equipmentOptional: ['dumbbell'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: false,
    instructions: [
      'Stand with bar at hip height',
      'Slight knee bend, push hips back',
      'Lower bar along legs keeping back flat',
      'Feel hamstring stretch',
      'Drive hips forward to return'
    ],
    tips: ['Bar stays close to legs', 'Dont round back', 'Slight knee bend throughout'],
    commonMistakes: ['Rounding back', 'Bending knees too much', 'Not feeling hamstrings']
  },
  {
    id: 'walking-lunge',
    name: 'Walking Lunge',
    slug: 'walking-lunge',
    aliases: ['lunge', 'dumbbell lunge', 'barbell lunge'],
    description: 'Unilateral leg exercise for strength and balance.',
    category: 'compound',
    movementPattern: 'lunge',
    forceType: 'push',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    stabilizers: ['abs', 'hip_flexors'],
    equipment: ['bodyweight'],
    equipmentOptional: ['dumbbell', 'barbell'],
    trackingType: 'weight_reps',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Step forward into lunge position',
      'Lower back knee toward floor',
      'Front knee tracks over toes',
      'Push off front foot to step forward',
      'Repeat with other leg'
    ],
    tips: ['Keep torso upright', 'Controlled descent'],
    commonMistakes: ['Knee going past toes excessively', 'Leaning forward', 'Stepping too short']
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    slug: 'leg-extension',
    aliases: ['quad extension', 'machine leg extension'],
    description: 'Isolation exercise for quadriceps.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'push',
    primaryMuscles: ['quads'],
    secondaryMuscles: [],
    stabilizers: [],
    equipment: ['machine'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Adjust pad to sit just above ankles',
      'Extend legs until straight',
      'Squeeze quads at top',
      'Lower with control'
    ],
    tips: ['Dont lock knees aggressively', 'Control the negative'],
    commonMistakes: ['Swinging weight', 'Lifting hips off seat']
  },
  {
    id: 'leg-curl',
    name: 'Lying Leg Curl',
    slug: 'leg-curl',
    aliases: ['hamstring curl', 'machine leg curl', 'seated leg curl'],
    description: 'Isolation for hamstrings.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['calves'],
    stabilizers: [],
    equipment: ['machine'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Lie face down on machine',
      'Pad just above heels',
      'Curl legs toward glutes',
      'Squeeze at top',
      'Lower with control'
    ],
    tips: ['Dont lift hips', 'Full range of motion'],
    commonMistakes: ['Using momentum', 'Partial reps', 'Lifting hips']
  },
  {
    id: 'calf-raise-standing',
    name: 'Standing Calf Raise',
    slug: 'calf-raise-standing',
    aliases: ['calf raise', 'machine calf raise', 'smith machine calf raise'],
    description: 'Primary calf exercise for gastrocnemius.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'push',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    stabilizers: [],
    equipment: ['machine'],
    equipmentOptional: ['barbell', 'dumbbell', 'smith_machine'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Position shoulders under pads',
      'Balls of feet on platform, heels hanging',
      'Rise up on toes',
      'Squeeze at top',
      'Lower heels below platform level'
    ],
    tips: ['Full range of motion', 'Pause at bottom and top'],
    commonMistakes: ['Bouncing', 'Partial range', 'Bending knees']
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    slug: 'hip-thrust',
    aliases: ['barbell hip thrust', 'glute bridge', 'weighted glute bridge'],
    description: 'Premier glute builder with maximum glute activation.',
    category: 'compound',
    movementPattern: 'hinge',
    forceType: 'push',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings'],
    stabilizers: ['abs'],
    equipment: ['barbell'],
    equipmentOptional: ['dumbbell', 'resistance_band'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Sit with upper back against bench',
      'Roll barbell over hips (use pad)',
      'Feet flat, shoulder width apart',
      'Drive hips up until body is straight',
      'Squeeze glutes hard at top',
      'Lower with control'
    ],
    tips: ['Chin tucked', 'Ribs down', 'Dont hyperextend'],
    commonMistakes: ['Hyperextending back', 'Feet too far out', 'Not squeezing at top']
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat',
    slug: 'hack-squat',
    aliases: ['machine hack squat'],
    description: 'Machine-based squat variation for quad focus.',
    category: 'compound',
    movementPattern: 'squat',
    forceType: 'push',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    stabilizers: [],
    equipment: ['machine'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Position shoulders under pads',
      'Feet shoulder width on platform',
      'Release safeties',
      'Squat down keeping back against pad',
      'Drive up through heels'
    ],
    tips: ['Foot position affects emphasis', 'Dont lock knees'],
    commonMistakes: ['Heels lifting', 'Knees caving', 'Lower back rounding']
  },
]

// -----------------------------------------------------------------------------
// EXERCISE DATABASE - ARMS
// -----------------------------------------------------------------------------

const ARM_EXERCISES: Exercise[] = [
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    slug: 'barbell-curl',
    aliases: ['standing barbell curl', 'bb curl', 'bicep curl'],
    description: 'Classic bicep builder with barbell.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    stabilizers: ['abs'],
    equipment: ['barbell'],
    equipmentOptional: ['ez_bar'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Stand with bar at arms length',
      'Curl bar to shoulders',
      'Keep elbows pinned at sides',
      'Lower with control'
    ],
    tips: ['Dont swing', 'Squeeze at top', 'Full extension at bottom'],
    commonMistakes: ['Swinging body', 'Moving elbows forward', 'Partial reps']
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    slug: 'dumbbell-curl',
    aliases: ['db curl', 'alternating dumbbell curl'],
    description: 'Dumbbell bicep curl for unilateral development.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    stabilizers: [],
    equipment: ['dumbbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Stand or sit with dumbbells at sides',
      'Curl one or both dumbbells',
      'Supinate wrist during curl (optional)',
      'Lower with control'
    ],
    tips: ['Control the weight', 'Can alternate arms'],
    commonMistakes: ['Swinging', 'Using momentum', 'Moving elbows']
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    slug: 'hammer-curl',
    aliases: ['dumbbell hammer curl', 'neutral grip curl'],
    description: 'Neutral grip curl targeting brachialis and forearms.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['biceps', 'forearms'],
    secondaryMuscles: [],
    stabilizers: [],
    equipment: ['dumbbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Hold dumbbells with neutral (hammer) grip',
      'Curl dumbbells keeping neutral grip',
      'Lower with control'
    ],
    tips: ['Builds forearm size', 'Good grip for wrist issues'],
    commonMistakes: ['Rotating wrist', 'Swinging']
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    slug: 'tricep-pushdown',
    aliases: ['cable pushdown', 'rope pushdown', 'v-bar pushdown'],
    description: 'Cable-based tricep isolation.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'push',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    stabilizers: ['abs'],
    equipment: ['cable'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Grip attachment at chest height',
      'Keep elbows pinned at sides',
      'Push down until arms straight',
      'Return with control'
    ],
    tips: ['Dont let elbows drift forward', 'Squeeze at bottom'],
    commonMistakes: ['Elbows moving', 'Leaning into it', 'Going too heavy']
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher',
    slug: 'skull-crusher',
    aliases: ['lying tricep extension', 'ez bar skull crusher', 'french press'],
    description: 'Lying tricep extension for mass building.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'push',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    stabilizers: ['abs'],
    equipment: ['ez_bar'],
    equipmentOptional: ['barbell', 'dumbbell'],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: false,
    instructions: [
      'Lie on bench with bar overhead',
      'Lower bar to forehead (or behind head)',
      'Keep upper arms stationary',
      'Extend arms back to start'
    ],
    tips: ['Control the weight', 'Can lower behind head for more stretch'],
    commonMistakes: ['Elbows flaring', 'Using momentum', 'Going too heavy']
  },
  {
    id: 'close-grip-bench',
    name: 'Close Grip Bench Press',
    slug: 'close-grip-bench',
    aliases: ['cgbp', 'tricep bench press'],
    description: 'Compound tricep builder with barbell.',
    category: 'compound',
    movementPattern: 'push_horizontal',
    forceType: 'push',
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['chest', 'shoulders'],
    stabilizers: ['abs'],
    equipment: ['barbell'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: true,
    instructions: [
      'Grip bar with hands inside shoulder width',
      'Lower bar to lower chest',
      'Keep elbows tucked',
      'Press back up'
    ],
    tips: ['Hands about 12-14 inches apart', 'Elbows stay close to body'],
    commonMistakes: ['Grip too narrow (wrist strain)', 'Flaring elbows']
  },
  {
    id: 'tricep-dip',
    name: 'Tricep Dip',
    slug: 'tricep-dip',
    aliases: ['bench dip', 'dip for triceps'],
    description: 'Bodyweight tricep compound movement.',
    category: 'compound',
    movementPattern: 'push_vertical',
    forceType: 'push',
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['chest', 'shoulders'],
    stabilizers: ['abs'],
    equipment: ['bodyweight'],
    equipmentOptional: ['plate'],
    trackingType: 'weight_reps',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: true,
    minimumLevel: 'intermediate',
    injuryRisk: 'medium',
    requiresSpotter: false,
    instructions: [
      'Support body on parallel bars',
      'Keep torso upright (more tricep focus)',
      'Lower body until upper arms parallel',
      'Press back up to start'
    ],
    tips: ['Stay upright for triceps', 'Dont go too deep'],
    commonMistakes: ['Leaning too far forward', 'Going too deep', 'Flaring elbows']
  },
]

// -----------------------------------------------------------------------------
// EXERCISE DATABASE - CORE
// -----------------------------------------------------------------------------

const CORE_EXERCISES: Exercise[] = [
  {
    id: 'plank',
    name: 'Plank',
    slug: 'plank',
    aliases: ['front plank', 'forearm plank'],
    description: 'Isometric core exercise for stability.',
    category: 'isometric',
    movementPattern: 'isolation',
    forceType: 'static',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'erectors'],
    stabilizers: ['shoulders', 'glutes'],
    equipment: ['bodyweight'],
    equipmentOptional: [],
    trackingType: 'time_only',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Start in push-up position or on forearms',
      'Body forms straight line from head to heels',
      'Hold position for time',
      'Keep core braced throughout'
    ],
    tips: ['Squeeze glutes', 'Dont let hips sag', 'Breathe normally'],
    commonMistakes: ['Hips too high or low', 'Not engaging core', 'Holding breath']
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    slug: 'hanging-leg-raise',
    aliases: ['leg raise', 'hanging knee raise'],
    description: 'Advanced ab exercise from hanging position.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['abs', 'hip_flexors'],
    secondaryMuscles: ['obliques'],
    stabilizers: ['forearms', 'lats'],
    equipment: ['bodyweight'],
    equipmentOptional: [],
    trackingType: 'reps_only',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: false,
    minimumLevel: 'intermediate',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Hang from bar with arms extended',
      'Raise legs until parallel or higher',
      'Control the descent',
      'Minimize swinging'
    ],
    tips: ['Keep back against pad if available', 'Bend knees to make easier'],
    commonMistakes: ['Swinging', 'Using momentum', 'Not controlling descent']
  },
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    slug: 'cable-crunch',
    aliases: ['kneeling cable crunch', 'rope crunch'],
    description: 'Weighted ab crunch with cable resistance.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'pull',
    primaryMuscles: ['abs'],
    secondaryMuscles: [],
    stabilizers: [],
    equipment: ['cable'],
    equipmentOptional: [],
    trackingType: 'weight_reps',
    defaultUnit: 'lbs',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Kneel below cable with rope',
      'Hold rope at neck/shoulders',
      'Crunch down, rounding spine',
      'Return with control'
    ],
    tips: ['Focus on ab contraction', 'Dont just hip hinge'],
    commonMistakes: ['Moving hips instead of abs', 'Going too heavy']
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    slug: 'russian-twist',
    aliases: ['weighted russian twist', 'medicine ball twist'],
    description: 'Rotational core exercise for obliques.',
    category: 'isolation',
    movementPattern: 'rotation',
    forceType: 'pull',
    primaryMuscles: ['obliques'],
    secondaryMuscles: ['abs'],
    stabilizers: ['hip_flexors'],
    equipment: ['bodyweight'],
    equipmentOptional: ['dumbbell', 'medicine_ball', 'plate'],
    trackingType: 'weight_reps',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Sit with knees bent, feet off floor (optional)',
      'Lean back to 45 degrees',
      'Rotate torso side to side',
      'Touch weight to floor each side'
    ],
    tips: ['Move from core, not arms', 'Keep chest up'],
    commonMistakes: ['Moving arms only', 'Rounding back too much']
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    slug: 'dead-bug',
    aliases: ['anti-extension exercise'],
    description: 'Core stability exercise with contralateral limb movement.',
    category: 'isolation',
    movementPattern: 'isolation',
    forceType: 'static',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['hip_flexors'],
    stabilizers: ['erectors'],
    equipment: ['bodyweight'],
    equipmentOptional: [],
    trackingType: 'reps_only',
    defaultUnit: 'bodyweight',
    supportsOneRepMax: false,
    minimumLevel: 'beginner',
    injuryRisk: 'low',
    requiresSpotter: false,
    instructions: [
      'Lie on back with arms up and knees at 90 degrees',
      'Press lower back into floor',
      'Extend opposite arm and leg',
      'Return and repeat other side'
    ],
    tips: ['Keep lower back flat', 'Move slowly'],
    commonMistakes: ['Back arching', 'Moving too fast', 'Losing core tension']
  },
]

// -----------------------------------------------------------------------------
// COMBINED EXERCISE DATABASE
// -----------------------------------------------------------------------------

export const ALL_EXERCISES: Exercise[] = [
  ...CHEST_EXERCISES,
  ...BACK_EXERCISES,
  ...SHOULDER_EXERCISES,
  ...LEG_EXERCISES,
  ...ARM_EXERCISES,
  ...CORE_EXERCISES,
]

export const EXERCISE_MAP = new Map<string, Exercise>(
  ALL_EXERCISES.map(ex => [ex.id, ex])
)

function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return ALL_EXERCISES.filter(
    ex => ex.primaryMuscles.includes(muscle) || ex.secondaryMuscles.includes(muscle)
  )
}

function getExercisesByEquipment(equipment: EquipmentType): Exercise[] {
  return ALL_EXERCISES.filter(ex => ex.equipment.includes(equipment))
}

function getExercisesByMovement(pattern: MovementPattern): Exercise[] {
  return ALL_EXERCISES.filter(ex => ex.movementPattern === pattern)
}

function getOneRepMaxExercises(): Exercise[] {
  return ALL_EXERCISES.filter(ex => ex.supportsOneRepMax)
}

function searchExercises(query: string): Exercise[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  
  return ALL_EXERCISES.filter(ex => 
    ex.name.toLowerCase().includes(q) ||
    ex.slug.includes(q) ||
    ex.aliases.some(alias => alias.toLowerCase().includes(q)) ||
    ex.primaryMuscles.some(m => m.includes(q)) ||
    ex.equipment.some(e => e.includes(q))
  )
}

const MUSCLE_GROUPS: Record<MuscleGroup, { name: string; bodyPart: string }> = {
  chest: { name: 'Chest', bodyPart: 'upper' },
  back: { name: 'Back', bodyPart: 'upper' },
  shoulders: { name: 'Shoulders', bodyPart: 'upper' },
  biceps: { name: 'Biceps', bodyPart: 'upper' },
  triceps: { name: 'Triceps', bodyPart: 'upper' },
  forearms: { name: 'Forearms', bodyPart: 'upper' },
  quads: { name: 'Quadriceps', bodyPart: 'lower' },
  hamstrings: { name: 'Hamstrings', bodyPart: 'lower' },
  glutes: { name: 'Glutes', bodyPart: 'lower' },
  calves: { name: 'Calves', bodyPart: 'lower' },
  abs: { name: 'Abdominals', bodyPart: 'core' },
  obliques: { name: 'Obliques', bodyPart: 'core' },
  traps: { name: 'Trapezius', bodyPart: 'upper' },
  lats: { name: 'Latissimus Dorsi', bodyPart: 'upper' },
  erectors: { name: 'Spinal Erectors', bodyPart: 'core' },
  hip_flexors: { name: 'Hip Flexors', bodyPart: 'lower' },
  adductors: { name: 'Adductors', bodyPart: 'lower' },
  abductors: { name: 'Abductors', bodyPart: 'lower' },
}

const EQUIPMENT_INFO: Record<EquipmentType, { name: string; icon: string }> = {
  barbell: { name: 'Barbell', icon: '🏋️' },
  dumbbell: { name: 'Dumbbell', icon: '💪' },
  cable: { name: 'Cable Machine', icon: '🔗' },
  machine: { name: 'Machine', icon: '⚙️' },
  smith_machine: { name: 'Smith Machine', icon: '📐' },
  kettlebell: { name: 'Kettlebell', icon: '🔔' },
  bodyweight: { name: 'Bodyweight', icon: '🧘' },
  resistance_band: { name: 'Resistance Band', icon: '🎗️' },
  ez_bar: { name: 'EZ Bar', icon: '〰️' },
  trap_bar: { name: 'Trap Bar', icon: '⬡' },
  specialty_bar: { name: 'Specialty Bar', icon: '🔧' },
  plate: { name: 'Weight Plate', icon: '⭕' },
  medicine_ball: { name: 'Medicine Ball', icon: '⚽' },
}

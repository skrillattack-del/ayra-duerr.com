// Backend utility for 1RM calculations (used by liftRoutes)

export function calculateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  
  // Brzycki formula for low reps, Epley for higher
  if (reps <= 6) {
    return Math.round(weight * (36 / (37 - reps)));
  }
  return Math.round(weight * (1 + reps / 30));
}

export function getWeightForReps(oneRepMax: number, targetReps: number): number {
  const percentages: Record<number, number> = {
    1: 100, 2: 95, 3: 93, 4: 90, 5: 87, 6: 85,
    7: 83, 8: 80, 9: 77, 10: 75, 12: 70, 15: 65
  };
  const pct = percentages[targetReps] || (100 - targetReps * 2.5);
  return Math.round(oneRepMax * Math.max(pct, 50) / 100);
}

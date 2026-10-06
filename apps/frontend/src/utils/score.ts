export interface ScoreCriterion {
  id: string;
  scaleMax: number;
  weight: number;
}

export interface ScoreRating {
  criterionId: string;
  rating: number;
}

/**
 * Mirrors the backend score function: `Σ (rating / scaleMax × weight)`, rounded
 * to 2 decimals, and null while any criterion is unrated.
 */
export function calculateScore(
  ratings: ScoreRating[],
  criteria: ScoreCriterion[],
): number | null {
  if (criteria.length === 0) return null;

  const byCriterion = new Map(
    ratings.map((entry) => [entry.criterionId, entry.rating]),
  );

  let total = 0;
  for (const criterion of criteria) {
    const rating = byCriterion.get(criterion.id);
    if (rating === undefined || rating === null || Number.isNaN(rating)) {
      return null;
    }
    total += (rating / criterion.scaleMax) * criterion.weight;
  }

  return Math.round(total * 100) / 100;
}

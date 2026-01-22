import { AggregationMethod } from '../../entities/event.entity';

/**
 * Calculate the mean of an array of numbers.
 */
export function mean(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
}

/**
 * Calculate the trimmed mean of an array of numbers.
 * Removes the highest and lowest values before calculating the mean.
 * Falls back to regular mean if there are fewer than 3 scores.
 */
export function trimmedMean(scores: number[]): number {
  if (scores.length < 3) {
    return mean(scores);
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return mean(trimmed);
}

/**
 * Aggregate scores using the specified method.
 */
export function aggregateScores(
  scores: number[],
  method: AggregationMethod,
): number {
  if (scores.length === 0) {
    return 0;
  }

  switch (method) {
    case AggregationMethod.TRIMMED_MEAN:
      return trimmedMean(scores);
    case AggregationMethod.MEAN:
    default:
      return mean(scores);
  }
}

/**
 * Criterion score data for weighted calculation.
 */
export interface CriterionScoreData {
  criterionId: string;
  aggregatedScore: number;
  weight: number;
}

/**
 * Calculate the weighted score from criterion scores.
 * Formula: sum(score * weight) / sum(weights)
 */
export function calculateWeightedScore(
  criterionScores: CriterionScoreData[],
): number {
  if (criterionScores.length === 0) {
    return 0;
  }

  const totalWeightedScore = criterionScores.reduce(
    (acc, cs) => acc + cs.aggregatedScore * cs.weight,
    0,
  );
  const totalWeight = criterionScores.reduce((acc, cs) => acc + cs.weight, 0);

  if (totalWeight === 0) {
    return 0;
  }

  return totalWeightedScore / totalWeight;
}

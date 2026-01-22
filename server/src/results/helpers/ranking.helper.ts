/**
 * Item with a score for ranking.
 */
export interface RankableItem {
  id: string;
  finalScore: number;
}

/**
 * Item with an assigned rank.
 */
export interface RankedItem extends RankableItem {
  rank: number;
}

/**
 * Assign ranks to items based on their final scores.
 * Items are sorted by score descending (highest first).
 * Ties receive the same rank, and subsequent ranks are skipped.
 *
 * Example: scores [90, 85, 85, 80] -> ranks [1, 2, 2, 4]
 */
export function assignRanks<T extends RankableItem>(
  items: T[],
): (T & { rank: number })[] {
  if (items.length === 0) {
    return [];
  }

  const sorted = [...items].sort((a, b) => b.finalScore - a.finalScore);

  return sorted.map((item, index) => {
    let rank: number;

    if (index === 0) {
      rank = 1;
    } else {
      const previous = sorted[index - 1];
      const previousRank = index;

      if (Math.abs(item.finalScore - previous.finalScore) < 0.0001) {
        const prevResult = sorted
          .slice(0, index)
          .findIndex((i) => Math.abs(i.finalScore - item.finalScore) < 0.0001);
        rank = prevResult + 1;
      } else {
        rank = index + 1;
      }
    }

    return { ...item, rank };
  });
}

/**
 * Team category result for overall ranking calculation.
 */
export interface TeamCategoryResult {
  teamId: string;
  categoryId: string;
  rank: number;
  finalScore: number;
}

/**
 * Team overall result with rank sum and total score.
 */
export interface TeamOverallResult {
  teamId: string;
  rankSum: number;
  totalScore: number;
  rank: number;
}

/**
 * Calculate overall team rankings based on category results.
 * Teams are ranked by sum of category ranks (lower is better).
 * Ties are broken by total combined score (higher is better).
 */
export function calculateOverallRankings(
  categoryResults: TeamCategoryResult[],
): TeamOverallResult[] {
  const teamMap = new Map<
    string,
    { rankSum: number; totalScore: number }
  >();

  for (const result of categoryResults) {
    const existing = teamMap.get(result.teamId) || {
      rankSum: 0,
      totalScore: 0,
    };
    teamMap.set(result.teamId, {
      rankSum: existing.rankSum + result.rank,
      totalScore: existing.totalScore + result.finalScore,
    });
  }

  const teams = Array.from(teamMap.entries()).map(([teamId, data]) => ({
    teamId,
    rankSum: data.rankSum,
    totalScore: data.totalScore,
    finalScore: -data.rankSum + data.totalScore / 10000,
  }));

  const sorted = [...teams].sort((a, b) => {
    if (a.rankSum !== b.rankSum) {
      return a.rankSum - b.rankSum;
    }
    return b.totalScore - a.totalScore;
  });

  const ranked: TeamOverallResult[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const team = sorted[i];
    let rank: number;

    if (i === 0) {
      rank = 1;
    } else {
      const prev = sorted[i - 1];
      if (
        team.rankSum === prev.rankSum &&
        Math.abs(team.totalScore - prev.totalScore) < 0.0001
      ) {
        rank = ranked[i - 1].rank;
      } else {
        rank = i + 1;
      }
    }

    ranked.push({
      teamId: team.teamId,
      rankSum: team.rankSum,
      totalScore: team.totalScore,
      rank,
    });
  }

  return ranked;
}

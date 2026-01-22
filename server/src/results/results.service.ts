import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { Submission } from '../entities/submission.entity';
import { Criterion } from '../entities/criterion.entity';
import { Category } from '../entities/category.entity';
import { Event, AggregationMethod } from '../entities/event.entity';
import { Team } from '../entities/team.entity';
import { Seat } from '../entities/seat.entity';
import {
  CriterionScoreDto,
  SubmissionResultDto,
  CompletionStatus,
  CategoryResultsDto,
  RankedSubmissionResultDto,
  EventResultsDto,
  TeamOverallResultDto,
} from './dto';
import {
  aggregateScores,
  calculateWeightedScore,
  CriterionScoreData,
} from './helpers/aggregation.helper';
import {
  assignRanks,
  calculateOverallRankings,
  TeamCategoryResult,
} from './helpers/ranking.helper';

/**
 * Service for computing results from judge scores.
 * All computations are done on-demand without caching.
 */
@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(Criterion)
    private readonly criterionRepository: Repository<Criterion>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Seat)
    private readonly seatRepository: Repository<Seat>,
  ) {}

  /**
   * Get calculated result for a single submission.
   */
  async getSubmissionResult(submissionId: string): Promise<SubmissionResultDto> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['team', 'category'],
    });

    if (!submission) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    const event = await this.eventRepository.findOne({
      where: { id: submission.category.eventId },
    });

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    const criteria = await this.criterionRepository.find({
      where: { eventId: event.id },
      order: { sortOrder: 'ASC' },
    });

    const scores = await this.scoreRepository.find({
      where: { submissionId },
    });

    const totalJudges = await this.getJudgeCount(event.id);

    return this.buildSubmissionResult(
      submission,
      event,
      criteria,
      scores,
      totalJudges,
    );
  }

  /**
   * Get results for all submissions in a category with rankings.
   */
  async getCategoryResults(categoryId: string): Promise<CategoryResultsDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['event'],
    });

    if (!category) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    const event = category.event;

    const criteria = await this.criterionRepository.find({
      where: { eventId: event.id },
      order: { sortOrder: 'ASC' },
    });

    const submissions = await this.submissionRepository.find({
      where: { categoryId },
      relations: ['team', 'category'],
    });

    const totalJudges = await this.getJudgeCount(event.id);

    const results: SubmissionResultDto[] = [];

    for (const submission of submissions) {
      const scores = await this.scoreRepository.find({
        where: { submissionId: submission.id },
      });

      const result = this.buildSubmissionResult(
        submission,
        event,
        criteria,
        scores,
        totalJudges,
      );
      results.push(result);
    }

    const rankedResults = this.rankSubmissionResults(results);

    return {
      categoryId: category.id,
      categoryName: category.name,
      eventId: event.id,
      aggregationMethod: event.aggregationMethod,
      results: rankedResults,
    };
  }

  /**
   * Get full event results with all categories and overall rankings.
   */
  async getEventResults(eventId: string): Promise<EventResultsDto> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }

    const categories = await this.categoryRepository.find({
      where: { eventId },
      order: { sortOrder: 'ASC' },
    });

    const categoryResults: CategoryResultsDto[] = [];

    for (const category of categories) {
      const result = await this.getCategoryResults(category.id);
      categoryResults.push(result);
    }

    const teams = await this.teamRepository.find({
      where: { eventId },
    });

    const overallRankings = this.calculateOverallTeamRankings(
      categoryResults,
      teams,
    );

    return {
      eventId: event.id,
      eventName: event.name,
      aggregationMethod: event.aggregationMethod,
      categoryResults,
      overallRankings,
    };
  }

  /**
   * Build submission result from scores.
   */
  private buildSubmissionResult(
    submission: Submission,
    event: Event,
    criteria: Criterion[],
    scores: Score[],
    totalJudges: number,
  ): SubmissionResultDto {
    const criterionScores: CriterionScoreDto[] = [];
    const criterionScoreData: CriterionScoreData[] = [];

    for (const criterion of criteria) {
      const criterionScoresRaw = scores
        .filter((s) => s.criterionId === criterion.id)
        .map((s) => Number(s.scoreValue));

      const aggregatedScore = aggregateScores(
        criterionScoresRaw,
        event.aggregationMethod as AggregationMethod,
      );

      criterionScores.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        weight: Number(criterion.weight),
        aggregatedScore,
        judgeCount: criterionScoresRaw.length,
        individualScores: criterionScoresRaw,
      });

      if (criterionScoresRaw.length > 0) {
        criterionScoreData.push({
          criterionId: criterion.id,
          aggregatedScore,
          weight: Number(criterion.weight),
        });
      }
    }

    const finalScore = calculateWeightedScore(criterionScoreData);

    const scoredCriteriaCount = criterionScores.filter(
      (cs) => cs.judgeCount > 0,
    ).length;

    let completionStatus: CompletionStatus;
    if (scoredCriteriaCount === 0) {
      completionStatus = CompletionStatus.NONE;
    } else if (scoredCriteriaCount < criteria.length) {
      completionStatus = CompletionStatus.PARTIAL;
    } else {
      const allComplete = criterionScores.every(
        (cs) => cs.judgeCount >= totalJudges,
      );
      completionStatus = allComplete
        ? CompletionStatus.COMPLETE
        : CompletionStatus.PARTIAL;
    }

    return {
      submissionId: submission.id,
      teamId: submission.team.id,
      teamName: submission.team.name,
      teamNumber: submission.team.teamNumber,
      categoryId: submission.category.id,
      categoryName: submission.category.name,
      criterionScores,
      finalScore,
      completionStatus,
      totalJudges,
      scoredCriteriaCount,
      totalCriteriaCount: criteria.length,
    };
  }

  /**
   * Rank submission results by final score.
   */
  private rankSubmissionResults(
    results: SubmissionResultDto[],
  ): RankedSubmissionResultDto[] {
    const rankableItems = results.map((r) => ({
      ...r,
      id: r.submissionId,
    }));

    const ranked = assignRanks(rankableItems);

    return ranked.map((item) => ({
      submissionId: item.submissionId,
      teamId: item.teamId,
      teamName: item.teamName,
      teamNumber: item.teamNumber,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      criterionScores: item.criterionScores,
      finalScore: item.finalScore,
      completionStatus: item.completionStatus,
      totalJudges: item.totalJudges,
      scoredCriteriaCount: item.scoredCriteriaCount,
      totalCriteriaCount: item.totalCriteriaCount,
      rank: item.rank,
    }));
  }

  /**
   * Calculate overall team rankings from category results.
   */
  private calculateOverallTeamRankings(
    categoryResults: CategoryResultsDto[],
    teams: Team[],
  ): TeamOverallResultDto[] {
    const teamCategoryResults: TeamCategoryResult[] = [];

    for (const category of categoryResults) {
      for (const result of category.results) {
        teamCategoryResults.push({
          teamId: result.teamId,
          categoryId: category.categoryId,
          rank: result.rank,
          finalScore: result.finalScore,
        });
      }
    }

    const overallRankings = calculateOverallRankings(teamCategoryResults);

    const teamMap = new Map(teams.map((t) => [t.id, t]));

    return overallRankings.map((ranking) => {
      const team = teamMap.get(ranking.teamId);
      const categoryRanks = categoryResults.map((cat) => {
        const teamResult = cat.results.find((r) => r.teamId === ranking.teamId);
        return {
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          rank: teamResult?.rank ?? 0,
        };
      });

      return {
        teamId: ranking.teamId,
        teamName: team?.name ?? 'Unknown',
        teamNumber: team?.teamNumber ?? 0,
        rank: ranking.rank,
        rankSum: ranking.rankSum,
        totalScore: ranking.totalScore,
        categoryRanks,
      };
    });
  }

  /**
   * Get total judge count for an event (count of active seats).
   */
  private async getJudgeCount(eventId: string): Promise<number> {
    const count = await this.seatRepository
      .createQueryBuilder('seat')
      .innerJoin('seat.table', 'table')
      .where('table.eventId = :eventId', { eventId })
      .andWhere('table.deletedAt IS NULL')
      .getCount();

    return count;
  }
}

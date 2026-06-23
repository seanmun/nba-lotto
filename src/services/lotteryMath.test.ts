import { describe, it, expect } from 'vitest';
import {
  allocateCombinationCounts,
  oddsPercentageForRank,
  generateAllCombinations,
  assignCombinationsToTeams,
  getLotteryPickCount,
  computeDraw,
  mulberry32,
  TOTAL_COMBINATIONS,
} from './lotteryMath';
import { Team, LotteryCombination } from '../types';

const makeTeams = (count: number): Team[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    email: '',
    emails: [],
    rank: i + 1,
    oddsPercentage: 0,
    combinations: [],
  }));

describe('allocateCombinationCounts', () => {
  it('matches the official NBA distribution for 14 teams', () => {
    expect(allocateCombinationCounts(14)).toEqual([
      140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5,
    ]);
  });

  it('always sums to exactly 1000, for every league size', () => {
    for (let n = 1; n <= 14; n++) {
      const total = allocateCombinationCounts(n).reduce((a, b) => a + b, 0);
      expect(total).toBe(TOTAL_COMBINATIONS);
    }
  });

  it('normalizes small leagues so odds are not left unassigned', () => {
    // Old bug: a 4-team league assigned only 545/1000 combos and showed 14%.
    const counts = allocateCombinationCounts(4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1000);
    // Best-odds teams still beat the worst one.
    expect(counts[0]).toBeGreaterThan(counts[3]);
  });

  it('keeps odds monotonically non-increasing by rank', () => {
    for (let n = 2; n <= 14; n++) {
      const counts = allocateCombinationCounts(n);
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    }
  });
});

describe('oddsPercentageForRank', () => {
  it('produces percentages that sum to ~100', () => {
    for (let n = 1; n <= 14; n++) {
      const total = oddsPercentageForRank(n).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(100, 5);
    }
  });

  it('shows the exact NBA odds for 14 teams', () => {
    expect(oddsPercentageForRank(14)).toEqual([
      14, 14, 14, 12.5, 10.5, 9, 7.5, 6, 4.5, 3, 2, 1.5, 1, 0.5,
    ]);
  });
});

describe('generateAllCombinations', () => {
  it('produces exactly 1000 unique 4-ball combinations', () => {
    const combos = generateAllCombinations();
    expect(combos).toHaveLength(TOTAL_COMBINATIONS);
    const keys = new Set(combos.map((c) => c.balls.join('-')));
    expect(keys.size).toBe(TOTAL_COMBINATIONS);
  });

  it('uses distinct balls between 1 and 14, sorted ascending', () => {
    for (const combo of generateAllCombinations()) {
      expect(combo.balls).toHaveLength(4);
      const sorted = [...combo.balls].sort((a, b) => a - b);
      expect(combo.balls).toEqual(sorted);
      expect(new Set(combo.balls).size).toBe(4);
      expect(combo.balls.every((b) => b >= 1 && b <= 14)).toBe(true);
    }
  });

  it('excludes the 11-12-13-14 combination (NBA drops one of 1001)', () => {
    const combos = generateAllCombinations();
    expect(combos.some((c) => c.balls.join('-') === '11-12-13-14')).toBe(false);
  });
});

describe('assignCombinationsToTeams', () => {
  it('assigns every combination to some team', () => {
    const teams = makeTeams(14);
    const combos = generateAllCombinations();
    assignCombinationsToTeams(teams, combos);
    expect(combos.every((c) => c.teamId !== '')).toBe(true);
  });

  it('gives each team a combo count matching its odds', () => {
    const teams = makeTeams(10);
    const combos = generateAllCombinations();
    assignCombinationsToTeams(teams, combos);
    const expected = allocateCombinationCounts(10);
    teams.forEach((team, i) => {
      expect(team.combinations).toHaveLength(expected[i]);
    });
  });
});

describe('getLotteryPickCount', () => {
  it('draws 4 picks for a normal field', () => {
    expect(getLotteryPickCount(14)).toBe(4);
    expect(getLotteryPickCount(5)).toBe(4);
  });

  it('caps picks below team count so small leagues cannot infinite-loop', () => {
    expect(getLotteryPickCount(4)).toBe(3);
    expect(getLotteryPickCount(3)).toBe(2);
    expect(getLotteryPickCount(2)).toBe(1);
  });
});

describe('computeDraw', () => {
  const setup = (teamCount: number): LotteryCombination[] => {
    const teams = makeTeams(teamCount);
    const combos = generateAllCombinations();
    assignCombinationsToTeams(teams, combos);
    return combos;
  };

  it('is deterministic: same seed yields the same result', () => {
    const combos = setup(14);
    const a = computeDraw(123456, combos, 4);
    const b = computeDraw(123456, combos, 4);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('different seeds generally yield different results', () => {
    const combos = setup(14);
    const a = computeDraw(1, combos, 4).map((c) => c.teamId);
    const b = computeDraw(999999, combos, 4).map((c) => c.teamId);
    expect(a).not.toEqual(b);
  });

  it('returns the requested number of distinct-team winners', () => {
    const combos = setup(14);
    const drawn = computeDraw(42, combos, 4);
    expect(drawn).toHaveLength(4);
    expect(new Set(drawn.map((c) => c.teamId)).size).toBe(4);
  });

  it('terminates for a tiny league instead of looping forever', () => {
    const combos = setup(3);
    const drawn = computeDraw(7, combos, getLotteryPickCount(3));
    expect(drawn).toHaveLength(2);
    expect(new Set(drawn.map((c) => c.teamId)).size).toBe(2);
  });
});

describe('mulberry32', () => {
  it('produces values in [0, 1) and is reproducible', () => {
    const rngA = mulberry32(2024);
    const rngB = mulberry32(2024);
    for (let i = 0; i < 100; i++) {
      const v = rngA();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(v).toBe(rngB());
    }
  });
});

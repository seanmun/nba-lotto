// src/services/lotteryMath.ts
//
// Pure, framework-free lottery math. No Firebase, no React — so it can be
// unit-tested in isolation and re-run by anyone to AUDIT a drawing.
//
// The whole point of this module: given a recorded `seed` and the team/odds
// setup, `computeDraw` reproduces the exact same lottery result every time.
// That is what makes a drawing verifiable instead of "trust the admin's
// browser".

import { LotteryCombination, Team } from '../types';

export const TOTAL_BALLS = 14;
export const BALLS_PER_DRAW = 4;
export const TOTAL_COMBINATIONS = 1000; // NBA uses 1000 of the 1001 possible

// Official NBA lottery odds (percentages) for the 14 lottery teams.
const NBA_ODDS = [14.0, 14.0, 14.0, 12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5];

/** Canonical form for comparing emails — trims and lowercases. */
export const normalizeEmail = (email: string | undefined | null): string =>
  (email || '').trim().toLowerCase();

/**
 * Does this email belong to the team? Compares case-insensitively against the
 * primary email and any co-owner emails, so `Sean@Gmail.com` matches a sign-in
 * as `sean@gmail.com`. The old exact `===` comparison silently failed on any
 * case/whitespace difference, so members couldn't see their own lottery.
 */
export const emailMatchesTeam = (team: Team, email: string): boolean => {
  const target = normalizeEmail(email);
  if (!target) return false;
  if (normalizeEmail(team.email) === target) return true;
  return (team.emails || []).some((e) => normalizeEmail(e) === target);
};

/**
 * Number of picks decided by the lottery draw.
 *
 * The NBA draws the top 4. With fewer than 5 teams you can never draw 4
 * DISTINCT winners (the old code looped forever on the 4th pick), so cap at
 * `teamCount - 1` — the final pick is always the one team left over.
 */
export const getLotteryPickCount = (teamCount: number): number =>
  Math.max(0, Math.min(BALLS_PER_DRAW, teamCount - 1));

/**
 * How many of the 1000 combinations each team is assigned, by rank.
 *
 * This is the single source of truth for odds. The raw NBA percentages only
 * sum to 100 for a full 14-team field; for fewer teams we normalize the slice
 * so the odds still sum to 100% (the old code did not, leaving ~45% of combos
 * unassigned for a 4-team league and showing wildly wrong odds).
 *
 * Returns one integer per team; the array always sums to exactly 1000.
 */
export const allocateCombinationCounts = (teamCount: number): number[] => {
  if (teamCount <= 0) return [];

  const slice = NBA_ODDS.slice(0, teamCount);
  const total = slice.reduce((sum, o) => sum + o, 0);

  // Normalize to 100% and scale to 1000 combinations as exact fractions.
  const exact = slice.map((odds) => (odds / total) * TOTAL_COMBINATIONS);
  const counts = exact.map((v) => Math.floor(v));

  // Hand out the leftover combinations by largest fractional remainder
  // (Hamilton's method). Ties go to the higher-ranked team so the result stays
  // monotonically non-increasing by rank, and the total is exactly 1000.
  let remaining = TOTAL_COMBINATIONS - counts.reduce((sum, c) => sum + c, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; k < remaining; k++) {
    counts[order[k].i] += 1;
  }

  return counts;
};

/** Odds percentage shown to users — exactly matches each team's combo share. */
export const oddsPercentageForRank = (teamCount: number): number[] =>
  allocateCombinationCounts(teamCount).map((count) => count / (TOTAL_COMBINATIONS / 100));

/** Generate all 1000 valid 4-ball combinations in lexicographic order. */
export const generateAllCombinations = (): LotteryCombination[] => {
  const combos: LotteryCombination[] = [];
  let id = 1;

  for (let a = 1; a <= TOTAL_BALLS - 3; a++) {
    for (let b = a + 1; b <= TOTAL_BALLS - 2; b++) {
      for (let c = b + 1; c <= TOTAL_BALLS - 1; c++) {
        for (let d = c + 1; d <= TOTAL_BALLS; d++) {
          if (id <= TOTAL_COMBINATIONS) {
            combos.push({ id, balls: [a, b, c, d], teamId: '' });
            id++;
          }
        }
      }
    }
  }

  return combos;
};

/**
 * Assign every combination to a team based on rank odds. Mutates and returns
 * the combos. Teams are expected ordered by rank (worst record first).
 */
export const assignCombinationsToTeams = (
  teams: Team[],
  combos: LotteryCombination[]
): void => {
  const counts = allocateCombinationCounts(teams.length);
  let index = 0;

  teams.forEach((team, i) => {
    team.combinations = [];
    for (let n = 0; n < counts[i] && index < combos.length; n++) {
      combos[index].teamId = team.id;
      team.combinations.push(combos[index].id.toString());
      index++;
    }
  });
};

/** A cryptographically-random 32-bit seed used to drive (and later verify) a draw. */
export const generateSeed = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
};

/** mulberry32 — a tiny, deterministic, well-distributed PRNG seeded from a uint32. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sameBalls = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((ball, i) => ball === b[i]);

/** Draw 4 distinct balls (sorted ascending) using the supplied PRNG. */
const drawFourBalls = (rng: () => number): number[] => {
  const pool = Array.from({ length: TOTAL_BALLS }, (_, i) => i + 1);
  const balls: number[] = [];
  for (let i = 0; i < BALLS_PER_DRAW; i++) {
    const idx = Math.floor(rng() * pool.length);
    balls.push(pool.splice(idx, 1)[0]);
  }
  return balls.sort((x, y) => x - y);
};

/**
 * Deterministically reproduce a full lottery drawing from a seed.
 *
 * Returns the winning combinations in pick order (1st pick first). Re-running
 * with the same seed + assigned combinations always yields the same result,
 * which is exactly how a verifier can confirm the draw was not tampered with.
 */
export const computeDraw = (
  seed: number,
  combos: LotteryCombination[],
  pickCount: number
): LotteryCombination[] => {
  const rng = mulberry32(seed);
  const drawn: LotteryCombination[] = [];
  const usedTeams = new Set<string>();

  // Bounded loop — pickCount is always < team count, so this terminates well
  // before the guard, which only exists to rule out pathological input.
  let guard = 0;
  while (drawn.length < pickCount && guard < 1_000_000) {
    guard++;
    const balls = drawFourBalls(rng);
    const combo = combos.find((c) => sameBalls(c.balls, balls));
    if (!combo || !combo.teamId) continue; // unassigned (e.g. the excluded combo)
    if (usedTeams.has(combo.teamId)) continue; // team already won — redraw
    usedTeams.add(combo.teamId);
    drawn.push(combo);
  }

  return drawn;
};

import type { Answer, Color, Profile, Scores } from "./types.ts";

const COLORS: ReadonlyArray<Color> = ["R", "Y", "G", "B"];
const MOST_WEIGHT = 2;
const LEAST_WEIGHT = -1;
const SECONDARY_GAP_PCT = 15;

export function score(answers: ReadonlyArray<Answer>): Profile {
  const scores: Scores = { R: 0, Y: 0, G: 0, B: 0 };

  for (const a of answers) {
    if (a.most !== null) scores[a.most] += MOST_WEIGHT;
    if (a.least !== null) scores[a.least] += LEAST_WEIGHT;
  }

  const min = Math.min(...COLORS.map((c) => scores[c]));
  const shifted: Scores = { R: 0, Y: 0, G: 0, B: 0 };
  for (const c of COLORS) shifted[c] = scores[c] - min;

  const total = COLORS.reduce((sum, c) => sum + shifted[c], 0) || 1;
  const percent: Scores = { R: 0, Y: 0, G: 0, B: 0 };
  for (const c of COLORS) percent[c] = Math.round((shifted[c] / total) * 100);

  const sorted = [...COLORS].sort((a, b) => percent[b] - percent[a]);
  const primary = sorted[0]!;
  const secondaryCandidate = sorted[1]!;
  const secondary =
    percent[primary] - percent[secondaryCandidate] <= SECONDARY_GAP_PCT
      ? secondaryCandidate
      : null;

  return {
    scores,
    percent,
    primary,
    secondary,
    completedAt: new Date().toISOString()
  };
}

export function isComplete(answers: ReadonlyArray<Answer>): boolean {
  return answers.every(
    (a) => a.most !== null && a.least !== null && a.most !== a.least
  );
}

/**
 * Offline keyword-overlap grader for Feynman-style explanations.
 * Compares user text against precomputed keyPoints.
 * Not linguistically clever — just stem + whitespace.
 */

const STOP = new Set([
  "the", "a", "an", "of", "and", "or", "to", "in", "on", "at", "for", "with", "by",
  "is", "are", "was", "were", "be", "been", "being", "as", "that", "this", "it",
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "y", "o",
  "en", "por", "para", "con", "sin", "es", "son", "era", "eran", "ser", "que",
  "como", "cuando", "donde", "porque", "pero", "si", "no"
]);

function normalize(s: string): ReadonlyArray<string> {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9áéíóúñü\s]/gi, " ")
    .split(/\s+/)
    .map((w) => stem(w))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Very light stemmer — trims common ES/EN suffixes */
function stem(word: string): string {
  return word
    .replace(/(mente|ción|siones|sión|ando|iendo|amos|emos|imos|ing|ed|ly|es|s|n)$/i, "")
    .toLowerCase();
}

export interface GradeResult {
  readonly coverage: number; // 0..1
  readonly covered: ReadonlyArray<string>; // keyPoints matched
  readonly missing: ReadonlyArray<string>; // keyPoints missed
}

export function gradeExplanation(userText: string, keyPoints: ReadonlyArray<string>): GradeResult {
  if (keyPoints.length === 0) {
    return { coverage: 0, covered: [], missing: [] };
  }

  const userTokens = new Set(normalize(userText));

  const covered: string[] = [];
  const missing: string[] = [];

  for (const point of keyPoints) {
    const pointTokens = normalize(point);
    if (pointTokens.length === 0) continue;
    // A keypoint is "covered" if at least half its content words appear in user text
    const hits = pointTokens.filter((t) => userTokens.has(t)).length;
    const ratio = hits / pointTokens.length;
    if (ratio >= 0.5) {
      covered.push(point);
    } else {
      missing.push(point);
    }
  }

  return {
    coverage: covered.length / keyPoints.length,
    covered,
    missing
  };
}

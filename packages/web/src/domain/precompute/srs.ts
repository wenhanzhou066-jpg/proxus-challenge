/* ────────────────────────────────────────────────────────────
 * Leitner-lite spaced repetition.
 * Storage key: proxus.srs.<materialId>
 * Card ID = question.id (from precomputed MaterialAnalysis)
 * ──────────────────────────────────────────────────────────── */

export interface CardState {
  readonly box: 1 | 2 | 3 | 4 | 5;
  readonly nextDue: string; // ISO
  readonly lastReviewed: string | null; // ISO or null
}

export type Deck = Record<string, CardState>;

const KEY_PREFIX = "proxus.srs.";
const CHANGE_EVENT = "proxus.srs.change";

const INTERVAL_DAYS: Record<CardState["box"], number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30
};

const DAY_MS = 86_400_000;

function key(materialId: string): string {
  return KEY_PREFIX + materialId;
}

export function loadDeck(materialId: string): Deck {
  try {
    const raw = localStorage.getItem(key(materialId));
    return raw === null ? {} : (JSON.parse(raw) as Deck);
  } catch {
    return {};
  }
}

export function saveDeck(materialId: string, deck: Deck): void {
  try {
    localStorage.setItem(key(materialId), JSON.stringify(deck));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { materialId } }));
  } catch {
    // quota — silent
  }
}

export function clearDeck(materialId: string): void {
  localStorage.removeItem(key(materialId));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { materialId } }));
}

/** Nudge card outcome: correct promotes box, wrong resets to box 1 */
export function recordOutcome(
  materialId: string,
  cardId: string,
  correct: boolean,
  now: Date = new Date()
): void {
  const deck = loadDeck(materialId);
  const current = deck[cardId] ?? { box: 1 as const, nextDue: now.toISOString(), lastReviewed: null };
  const nextBox: CardState["box"] = correct
    ? (Math.min(5, current.box + 1) as CardState["box"])
    : 1;
  const nextDue = new Date(now.getTime() + INTERVAL_DAYS[nextBox] * DAY_MS).toISOString();
  const next: CardState = {
    box: nextBox,
    nextDue,
    lastReviewed: now.toISOString()
  };
  saveDeck(materialId, { ...deck, [cardId]: next });
}

/** IDs currently due (nextDue <= now, or never seen) */
export function dueCardIds(materialId: string, allCardIds: ReadonlyArray<string>, now: Date = new Date()): ReadonlyArray<string> {
  const deck = loadDeck(materialId);
  const cutoff = now.getTime();
  return allCardIds.filter((id) => {
    const state = deck[id];
    if (state === undefined) return true;
    return new Date(state.nextDue).getTime() <= cutoff;
  });
}

export function subscribe(listener: (materialId: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ materialId: string }>).detail;
    listener(detail.materialId);
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

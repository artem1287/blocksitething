// Starter library (Section 2.6) — a fixed default for now. Making this user-editable is a
// reasonable later addition, not built in this pass.
export const DEFAULT_SUGGESTIONS: string[] = [
  "Step outside for a two-minute walk.",
  "Refill your water and drink it.",
  "Stretch your neck and shoulders for a minute.",
  "Text one person you haven't talked to in a while.",
  "Write down what you were actually trying to do before this.",
  "Do ten push-ups or squats.",
  "Tidy one small surface near you.",
  "Read a page of whatever book is nearest.",
];

/** Pure so it's testable: caller supplies the randomness (e.g. Math.random()) as `randomValue`
 *  in [0, 1). */
export function pickSuggestion(list: string[], randomValue: number): string {
  if (list.length === 0) return "";
  const index = Math.min(list.length - 1, Math.floor(randomValue * list.length));
  return list[index]!;
}

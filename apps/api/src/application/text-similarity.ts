/**
 * Computes containment similarity between two texts.
 * Returns |intersection| / |shorter_set| where sets are lowercase word sets.
 * Returns 0 if either text is empty.
 */
export function computeTextSimilarity(a: string, b: string): number {
  const toWordSet = (text: string): Set<string> => {
    const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return new Set(words);
  };

  const setA = toWordSet(a);
  const setB = toWordSet(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  for (const word of setA) {
    if (setB.has(word)) intersectionSize++;
  }

  return intersectionSize / Math.min(setA.size, setB.size);
}

/** Threshold for accepting publication proof. */
export const SIMILARITY_THRESHOLD = 0.5;
